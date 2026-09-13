import { z } from 'zod';

import { mistralConfig } from '../config/mistral.js';
import { requireEnv } from '../config/env.js';
import { buildMarketAnalysisPrompt, MARKET_ANALYSIS_RESPONSE_SCHEMA } from '../prompts/marketAnalysisPrompt.js';
import { buildChatSystemPrompt, buildGeneralChatSystemPrompt } from '../prompts/chatPrompt.js';
import { AppError } from '../utils/AppError.js';
import { applyServerGrade } from '../utils/scoreCalculator.js';

/**
 * Throws a 503 if Mistral rejects the key (401) or the key lacks permissions (403).
 * This prevents auth failures from being silently swallowed as generic 502 errors.
 */
function throwIfMistralAuthError(response, payload) {
  if (response.status === 401 || response.status === 403) {
    const detail = payload?.detail || payload?.message || 'Mistral API key is invalid or has expired.';
    throw new AppError(503, `Mistral authentication failed: ${detail}`, {
      upstreamStatus: response.status
    });
  }
}

const stringArraySchema = z.array(z.string()).default([]);

const swotAnalysisSchema = z.object({
  strengths: stringArraySchema,
  weaknesses: stringArraySchema,
  opportunities: stringArraySchema,
  threats: stringArraySchema
});

const financialProjectionsSchema = z.object({
  capexRange: z.string().default('N/A'),
  opexRange: z.string().default('N/A'),
  estimatedBreakEven: z.string().default('N/A'),
  description: z.string().default('')
});

const riskAssessmentItemSchema = z.object({
  riskCategory: z.string().default(''),
  riskDescription: z.string().default(''),
  mitigationStrategy: z.string().default('')
});

const marketingPlaybookItemSchema = z.object({
  targetAudience: z.string().default(''),
  channel: z.string().default(''),
  tacticDescription: z.string().default('')
});

const implementationRoadmapItemSchema = z.object({
  phaseName: z.string().default(''),
  timelineEstimate: z.string().default(''),
  keyTasks: stringArraySchema
});

const marketAnalysisResultSchema = z.object({
  overallScore: z.number(),
  grade: z.string(),
  confidence: z.enum(['low', 'medium', 'high']),
  summary: z.string(),

  // Extended AI interpretation fields
  demandAnalysis: z.string().default(''),
  supplyAnalysis: z.string().default(''),
  opportunityAnalysis: z.string().default(''),
  audienceInsights: z.string().default(''),
  competitorInsights: z.string().default(''),
  pricingAnalysis: z.string().default(''),

  // Premium Strategic Playbook fields
  swotAnalysis: swotAnalysisSchema.default({ strengths: [], weaknesses: [], opportunities: [], threats: [] }),
  financialProjections: financialProjectionsSchema.default({ capexRange: 'N/A', opexRange: 'N/A', estimatedBreakEven: 'N/A', description: '' }),
  riskAssessment: z.array(riskAssessmentItemSchema).default([]),
  marketingPlaybook: z.array(marketingPlaybookItemSchema).default([]),
  implementationRoadmap: z.array(implementationRoadmapItemSchema).default([]),

  competitorAssessment: z.array(
    z.object({
      name: z.string(),
      rating: z.number().default(0),
      reviewCount: z.number().default(0),
      threatLevel: z.string(),
      strengths: stringArraySchema,
      weaknesses: stringArraySchema
    })
  ),
  marketAnalysis: z.object({
    competitorDensity: z.string(),
    entryDifficulty: z.string(),
    marketSaturation: z.string(),
    opportunityLevel: z.string()
  }),
  recommendation: z.object({
    decision: z.string(),
    reasoning: stringArraySchema,
    suggestedPositioning: stringArraySchema
  })
});

function extractContent(payload) {
  const choice = payload.choices?.[0];
  const content = choice?.message?.content;

  if (choice?.finish_reason && choice.finish_reason !== 'stop') {
    console.warn(`[Mistral] Response finished with reason '${choice.finish_reason}' (tokens: ${payload.usage?.completion_tokens})`);
  }

  if (typeof content === 'string' && content.trim().length > 0) {
    return content;
  }

  if (Array.isArray(content)) {
    const joined = content.map((part) => part.text || part.content || '').join('');
    if (joined.trim().length > 0) {
      return joined;
    }
  }

  console.error('[Mistral] Empty or missing content in choices:', JSON.stringify(payload?.choices, null, 2));
  throw new AppError(502, 'Mistral returned an empty response.');
}

function repairTruncatedJson(jsonString) {
  if (!jsonString || typeof jsonString !== 'string') return null;
  let str = jsonString.trim();
  str = str.replace(/```(?:json)?\s*([\s\S]*?)\s*```/gi, '$1').trim();
  const firstBrace = str.indexOf('{');
  if (firstBrace === -1) return null;
  str = str.slice(firstBrace);

  try {
    return JSON.parse(str);
  } catch (_e) {
    // Continue to repair
  }

  str = str.replace(/\\$/, '');

  let inString = false;
  let isEscaped = false;
  const stack = [];

  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    if (isEscaped) {
      isEscaped = false;
      continue;
    }
    if (char === '\\') {
      isEscaped = true;
      continue;
    }
    if (char === '"') {
      inString = !inString;
      continue;
    }
    if (!inString) {
      if (char === '{' || char === '[') {
        stack.push(char === '{' ? '}' : ']');
      } else if (char === '}' || char === ']') {
        if (stack.length > 0 && stack[stack.length - 1] === char) {
          stack.pop();
        }
      }
    }
  }

  if (inString) {
    str += '"';
  }

  str = str.replace(/,\s*$/g, '');
  str = str.replace(/:\s*$/g, ': null');
  str = str.replace(/,\s*"[^"]*$/g, '');

  while (stack.length > 0) {
    str += stack.pop();
  }

  try {
    return JSON.parse(str);
  } catch (repairError) {
    console.warn('[Mistral] JSON repair fallback failed:', repairError.message);
    return null;
  }
}

/**
 * Extracts and parses JSON from a raw response string from Mistral.
 * - Removes markdown code fences (```json ... ``` and ``` ... ```).
 * - Trims whitespace.
 * - Extracts the first valid JSON object if extra text surrounds it.
 * - Safely parses JSON using try/catch and JSON repair.
 * - Throws a descriptive error if JSON is malformed.
 *
 * @param {string} rawContent
 * @returns {object} parsed JSON object
 */
export function extractJsonFromMistralResponse(rawContent) {
  if (!rawContent || typeof rawContent !== 'string' || !rawContent.trim()) {
    throw new Error('Mistral response content is empty or invalid.');
  }

  // 1. Trim whitespace and strip markdown code fences
  let cleaned = rawContent.trim();
  cleaned = cleaned.replace(/```(?:json)?\s*([\s\S]*?)\s*```/gi, '$1').trim();

  // 2. Extract first valid JSON object if extra text exists before or after it
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');

  if (firstBrace !== -1 && lastBrace > firstBrace) {
    cleaned = cleaned.slice(firstBrace, lastBrace + 1);
  }

  // 3. Try direct JSON parse
  try {
    return JSON.parse(cleaned);
  } catch (directParseError) {
    // 4. Try JSON repair if response was truncated or slightly malformed
    const repaired = repairTruncatedJson(cleaned);
    if (repaired && typeof repaired === 'object' && repaired !== null) {
      console.info('[Mistral] Successfully repaired malformed or truncated JSON response.');
      return repaired;
    }

    // 5. Throw informative parsing error
    console.error('[Mistral] JSON parsing error:', directParseError.message);
    console.error('[Mistral] Raw response length:', rawContent.length, 'Snippet:', rawContent.slice(0, 200));
    throw new Error(`Mistral did not return parseable JSON: ${rawContent.slice(0, 120)}`);
  }
}

function parseJsonContent(content) {
  return extractJsonFromMistralResponse(content);
}

function normalizeName(value) {
  return value.toLowerCase().replace(/\s+/g, ' ').trim();
}

function reconcileCompetitorAssessment(assessment, competitors) {
  // Bolt: Pre-compute normalized names to avoid O(N*M) string allocations and manipulations in nested loop
  const normalizedCompetitors = competitors.map((competitor) => ({
    normalizedName: normalizeName(competitor.name),
    competitor
  }));
  const knownByName = new Map(normalizedCompetitors.map((c) => [c.normalizedName, c.competitor]));

  return assessment
    .map((item) => {
      const normalized = normalizeName(item.name);
      const match =
        knownByName.get(normalized) ||
        normalizedCompetitors.find((c) => {
          return normalized.includes(c.normalizedName) || c.normalizedName.includes(normalized);
        })?.competitor;

      if (!match) {
        return null;
      }

      const weaknesses = new Set(item.weaknesses || []);
      if (!match.evidence?.reviewsAvailable) {
        weaknesses.add('Reviews were unavailable from Google Places, so sentiment evidence is limited.');
      } else if (!match.evidence?.reviewTextAvailable) {
        weaknesses.add('Review text was unavailable from Google Places, so sentiment detail is limited.');
      }

      return {
        name: match.name,
        rating: Number.isFinite(match.rating) ? match.rating : 0,
        reviewCount: match.reviewCount || 0,
        threatLevel: item.threatLevel,
        strengths: item.strengths || [],
        weaknesses: Array.from(weaknesses)
      };
    })
    .filter(Boolean);
}

function sanitizeRawAiResponse(parsed) {
  const obj = typeof parsed === 'object' && parsed !== null ? parsed : {};

  const formatObjectValue = (item) => {
    if (typeof item === 'string') return item.trim();
    if (typeof item === 'number') return String(item);
    if (typeof item === 'object' && item !== null) {
      const entryStrings = Object.entries(item)
        .map(([k, val]) => {
          if (typeof val === 'string' && val.trim()) return `${k}: ${val.trim()}`;
          if (typeof val === 'number') return `${k}: ${val}`;
          if (Array.isArray(val)) return val.map((v) => String(v)).join(', ');
          return '';
        })
        .filter(Boolean);
      return entryStrings.length > 0 ? entryStrings.join(' | ') : '';
    }
    return '';
  };

  const str = (v, fallback = '') => {
    if (typeof v === 'string') return v.trim();
    if (typeof v === 'number') return String(v);
    if (typeof v === 'object' && v !== null) {
      if (Array.isArray(v)) {
        return v.map((item) => formatObjectValue(item)).filter(Boolean).map((s) => `• ${s}`).join('\n\n');
      }
      const parts = [];
      for (const [_key, val] of Object.entries(v)) {
        if (!val) continue;
        if (typeof val === 'string' && val.trim()) {
          parts.push(val.trim());
        } else if (Array.isArray(val) && val.length > 0) {
          const formattedArray = val
            .map((item) => formatObjectValue(item))
            .filter(Boolean)
            .map((s) => `• ${s}`)
            .join('\n');
          if (formattedArray) parts.push(formattedArray);
        } else if (typeof val === 'object') {
          const nested = str(val);
          if (nested) parts.push(nested);
        }
      }
      if (parts.length > 0) {
        return parts.join('\n\n');
      }
    }
    return fallback;
  };
  const strArray = (arr) => {
    if (Array.isArray(arr)) {
      return arr.map((item) => (typeof item === 'string' ? item.trim() : String(item || ''))).filter(Boolean);
    }
    if (typeof arr === 'string' && arr.trim()) {
      return [arr.trim()];
    }
    return [];
  };

  let overallScore = Number(obj.overallScore);
  if (!Number.isFinite(overallScore)) {
    overallScore = 70;
  }
  overallScore = Math.min(100, Math.max(0, Math.round(overallScore)));

  let grade = typeof obj.grade === 'string' ? obj.grade.toUpperCase().trim() : '';
  if (!['A', 'B', 'C', 'D', 'F'].includes(grade)) {
    if (overallScore >= 90) grade = 'A';
    else if (overallScore >= 80) grade = 'B';
    else if (overallScore >= 70) grade = 'C';
    else if (overallScore >= 60) grade = 'D';
    else grade = 'F';
  }

  let confidence = typeof obj.confidence === 'string' ? obj.confidence.toLowerCase().trim() : 'medium';
  if (!['low', 'medium', 'high'].includes(confidence)) {
    confidence = 'medium';
  }

  const summary = str(obj.summary, 'Market analysis completed successfully.');

  const demandAnalysis = str(obj.demandAnalysis);
  const supplyAnalysis = str(obj.supplyAnalysis);
  const opportunityAnalysis = str(obj.opportunityAnalysis);
  const audienceInsights = str(obj.audienceInsights);
  const competitorInsights = str(obj.competitorInsights);
  const pricingAnalysis = str(obj.pricingAnalysis);

  const swotRaw =
    typeof obj.swotAnalysis === 'object' && obj.swotAnalysis !== null
      ? obj.swotAnalysis
      : typeof obj.swot === 'object' && obj.swot !== null
      ? obj.swot
      : {};

  const swotAnalysis = {
    strengths: strArray(swotRaw.strengths),
    weaknesses: strArray(swotRaw.weaknesses),
    opportunities: strArray(swotRaw.opportunities),
    threats: strArray(swotRaw.threats)
  };

  const finRaw = typeof obj.financialProjections === 'object' && obj.financialProjections !== null ? obj.financialProjections : {};
  const financialProjections = {
    capexRange: str(finRaw.capexRange, 'N/A'),
    opexRange: str(finRaw.opexRange, 'N/A'),
    estimatedBreakEven: str(finRaw.estimatedBreakEven, 'N/A'),
    description: str(finRaw.description, '')
  };

  const riskRaw = Array.isArray(obj.riskAssessment) ? obj.riskAssessment : [];
  const riskAssessment = riskRaw.map((item) => ({
    riskCategory: str(item?.riskCategory, 'General Risk'),
    riskDescription: str(item?.riskDescription, ''),
    mitigationStrategy: str(item?.mitigationStrategy, '')
  }));

  const mktRaw = Array.isArray(obj.marketingPlaybook) ? obj.marketingPlaybook : [];
  const marketingPlaybook = mktRaw.map((item) => ({
    targetAudience: str(item?.targetAudience, 'Local Customers'),
    channel: str(item?.channel, 'Direct Marketing'),
    tacticDescription: str(item?.tacticDescription, '')
  }));

  const roadRaw = Array.isArray(obj.implementationRoadmap) ? obj.implementationRoadmap : [];
  const implementationRoadmap = roadRaw.map((item) => ({
    phaseName: str(item?.phaseName, 'Phase'),
    timelineEstimate: str(item?.timelineEstimate, '1-2 Months'),
    keyTasks: strArray(item?.keyTasks)
  }));

  const compRaw = Array.isArray(obj.competitorAssessment) ? obj.competitorAssessment : [];
  const competitorAssessment = compRaw.map((item) => ({
    name: str(item?.name, 'Competitor'),
    rating: Number.isFinite(Number(item?.rating)) ? Number(item.rating) : 0,
    reviewCount: Number.isFinite(Number(item?.reviewCount)) ? Number(item.reviewCount) : 0,
    threatLevel: str(item?.threatLevel, 'Medium'),
    strengths: strArray(item?.strengths),
    weaknesses: strArray(item?.weaknesses)
  }));

  const mktAnaRaw = typeof obj.marketAnalysis === 'object' && obj.marketAnalysis !== null ? obj.marketAnalysis : {};
  const marketAnalysis = {
    competitorDensity: str(mktAnaRaw.competitorDensity, 'Moderate'),
    entryDifficulty: str(mktAnaRaw.entryDifficulty, 'Moderate'),
    marketSaturation: str(mktAnaRaw.marketSaturation, 'Moderate'),
    opportunityLevel: str(mktAnaRaw.opportunityLevel, 'Moderate')
  };

  const recRaw =
    typeof obj.recommendation === 'object' && obj.recommendation !== null
      ? obj.recommendation
      : typeof obj.recommendations === 'object' && obj.recommendations !== null
      ? obj.recommendations
      : Array.isArray(obj.recommendations)
      ? { decision: 'Proceed with Caution', reasoning: strArray(obj.recommendations), suggestedPositioning: [] }
      : {};

  const recommendation = {
    decision: str(recRaw.decision, 'Proceed with Caution'),
    reasoning: strArray(recRaw.reasoning),
    suggestedPositioning: strArray(recRaw.suggestedPositioning)
  };

  return {
    overallScore,
    grade,
    confidence,
    summary,
    demandAnalysis,
    supplyAnalysis,
    opportunityAnalysis,
    audienceInsights,
    competitorInsights,
    pricingAnalysis,
    swot: swotAnalysis,
    swotAnalysis,
    financialProjections,
    riskAssessment,
    marketingPlaybook,
    implementationRoadmap,
    competitorAssessment,
    marketAnalysis,
    recommendation,
    recommendations: recommendation.reasoning
  };
}

function getFallbackAiAnalysis(competitors = []) {
  const fallbackObj = {
    overallScore: 70,
    grade: 'C',
    confidence: 'low',
    summary: 'AI analysis unavailable.',
    swot: {
      strengths: [],
      weaknesses: [],
      opportunities: [],
      threats: []
    },
    swotAnalysis: {
      strengths: [],
      weaknesses: [],
      opportunities: [],
      threats: []
    },
    recommendations: [],
    recommendation: {
      decision: 'AI Analysis Unavailable',
      reasoning: ['AI service encountered an issue; deterministic demand/supply scores have been preserved.'],
      suggestedPositioning: ['Review local demand signals and competitor table for details.']
    },
    demandAnalysis: 'Demand score was calculated from local institutional signals.',
    supplyAnalysis: 'Supply score was calculated from competitor density and ratings.',
    opportunityAnalysis: 'Opportunity score combines demand and supply metrics.',
    audienceInsights: '',
    competitorInsights: '',
    pricingAnalysis: '',
    financialProjections: { capexRange: 'N/A', opexRange: 'N/A', estimatedBreakEven: 'N/A', description: '' },
    riskAssessment: [],
    marketingPlaybook: [],
    implementationRoadmap: [],
    competitorAssessment: (competitors || []).map((c) => ({
      name: c.name || 'Competitor',
      rating: Number.isFinite(c.rating) ? c.rating : 0,
      reviewCount: c.reviewCount || 0,
      threatLevel: 'Medium',
      strengths: [],
      weaknesses: []
    })),
    marketAnalysis: {
      competitorDensity: 'Moderate',
      entryDifficulty: 'Moderate',
      marketSaturation: 'Moderate',
      opportunityLevel: 'Moderate'
    }
  };

  return sanitizeMarketAnalysis(fallbackObj, competitors);
}

function sanitizeMarketAnalysis(analysis, competitors) {
  const gradedAnalysis = applyServerGrade(analysis);

  return {
    ...gradedAnalysis,
    competitorAssessment: reconcileCompetitorAssessment(gradedAnalysis.competitorAssessment || [], competitors)
  };
}

/**
 * Calls Mistral with full demand + supply + opportunity context.
 * Mistral interprets pre-calculated scores — it does NOT recalculate them.
 *
 * @param {object} params
 * @param {object}   params.input
 * @param {object[]} params.competitors
 * @param {string[]} params.audienceCategories
 * @param {object}   params.demandProfile
 * @param {number}   params.demandScore
 * @param {number}   params.supplyScore
 * @param {number}   params.opportunityScore
 * @param {string}   params.opportunityTier
 */
export async function generateMarketAnalysis({
  input,
  competitors,
  audienceCategories = [],
  demandProfile = null,
  demandScore = null,
  supplyScore = null,
  opportunityScore = null,
  opportunityTier = null
}) {
  const apiKey = requireEnv('MISTRAL_API_KEY', mistralConfig.apiKey);
  const prompt = buildMarketAnalysisPrompt({
    location: input.location,
    businessType: input.businessType,
    niche: input.niche,
    competitors,
    audienceCategories,
    demandProfile,
    demandScore,
    supplyScore,
    opportunityScore,
    opportunityTier
  });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), mistralConfig.timeoutMs);

  let rawContent = '';

  try {
    const response = await fetch(mistralConfig.apiUrl, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: mistralConfig.largeModel,
        temperature: 0.2,
        max_tokens: 8192,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        response_format: {
          type: 'json_object'
        }
      })
    });

    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      throwIfMistralAuthError(response, payload);
      console.warn('[Mistral] Analysis request failed with status:', response.status);
    } else {
      rawContent = extractContent(payload);
    }

    let parsed = null;
    if (rawContent) {
      try {
        parsed = extractJsonFromMistralResponse(rawContent);
      } catch (parseError) {
        console.error('[Mistral] JSON extraction failed:', parseError.message);
        console.error('[Mistral] Raw Mistral Response:', rawContent);
      }
    }

    if (!parsed) {
      console.warn('[Mistral] Returning fallback AI analysis report.');
      const fallbackAnalysis = getFallbackAiAnalysis(competitors);
      return {
        analysis: fallbackAnalysis,
        rawAiResponse: { error: 'Mistral response could not be parsed as JSON', rawText: rawContent },
        metadata: {
          model: payload?.model || mistralConfig.model,
          usage: payload?.usage,
          fallbackUsed: true
        }
      };
    }

    const sanitizedRaw = sanitizeRawAiResponse(parsed);

    let validated;
    try {
      validated = marketAnalysisResultSchema.parse(sanitizedRaw);
    } catch (zodError) {
      console.warn('[Mistral] Zod validation warning (using sanitized response):', zodError.issues);
      validated = sanitizedRaw;
    }

    const analysis = sanitizeMarketAnalysis(validated, competitors);

    return {
      analysis,
      rawAiResponse: parsed,
      metadata: {
        model: payload?.model || mistralConfig.model,
        usage: payload?.usage
      }
    };
  } catch (error) {
    console.error('[Mistral] Error during market analysis execution:', error.message);
    if (rawContent) {
      console.error('[Mistral] Raw Mistral Response was:', rawContent);
    }

    const fallbackAnalysis = getFallbackAiAnalysis(competitors);
    return {
      analysis: fallbackAnalysis,
      rawAiResponse: { error: error.message, rawText: rawContent || null },
      metadata: {
        model: mistralConfig.model,
        fallbackUsed: true
      }
    };
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Sends conversation messages to Mistral, prepended with a system prompt
 * populated with the full report context.
 *
 * @param {object} params
 * @param {object} params.analysis - Fully populated analysis document
 * @param {object[]} params.messages - Conversational history array
 */
export async function generateChatResponse({ analysis, messages, provider = 'mistral', apiKey, model }) {
  const systemPrompt = analysis ? buildChatSystemPrompt(analysis) : buildGeneralChatSystemPrompt();

  if (provider === 'openai') {
    const { generateOpenAIChatResponse } = await import('./openaiService.js');
    return generateOpenAIChatResponse({ systemPrompt, messages, apiKey, model });
  }

  if (provider === 'anthropic') {
    const { generateAnthropicChatResponse } = await import('./anthropicService.js');
    return generateAnthropicChatResponse({ systemPrompt, messages, apiKey, model });
  }

  if (provider === 'gemini') {
    const { generateGeminiChatResponse } = await import('./geminiService.js');
    return generateGeminiChatResponse({ systemPrompt, messages, apiKey, model });
  }

  // Default to Mistral
  const resolvedApiKey = apiKey || requireEnv('MISTRAL_API_KEY', mistralConfig.apiKey);
  const selectedModel = model || mistralConfig.model;

  const conversation = [
    { role: 'system', content: systemPrompt },
    ...messages
  ];

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), mistralConfig.timeoutMs);

  try {
    const response = await fetch(mistralConfig.apiUrl, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${resolvedApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: selectedModel,
        temperature: 0.7,
        messages: conversation
      })
    });

    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      throwIfMistralAuthError(response, payload);
      throw new AppError(502, 'Mistral chat request failed.', {
        statusCode: response.status,
        payload
      });
    }

    const rawContent = extractContent(payload);
    return {
      message: rawContent,
      metadata: {
        model: payload.model || selectedModel,
        usage: payload.usage
      }
    };
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new AppError(504, 'Mistral chat request timed out.');
    }

    if (error instanceof AppError) {
      throw error;
    }

    throw new AppError(502, 'Mistral chat failed.', { cause: error.message });
  } finally {
    clearTimeout(timeout);
  }
}

export async function generateNicheSuggestions({ businessType, location }) {
  const apiKey = requireEnv('MISTRAL_API_KEY', mistralConfig.apiKey);
  
  const prompt = `You are an expert market research strategist. Generate exactly 5 distinct, highly specific, and profitable business niches for a "${businessType}"${location ? ` in "${location}"` : ''}.
CRITICAL RULES:
- Output ONLY valid JSON matching the requested schema.
- Each niche title must be 2 to 4 words long (e.g., "Mobile Pet Spa", "Axe Throwing Lounge").
- NO descriptions, NO numbering, NO punctuation marks at the end, NO introductory text.`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), mistralConfig.timeoutMs);

  try {
    const response = await fetch(mistralConfig.apiUrl, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: mistralConfig.model,
        temperature: 0.5,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'niche_suggestions_response',
            strict: true,
            schema: {
              type: 'object',
              properties: {
                niches: {
                  type: 'array',
                  items: { type: 'string' }
                }
              },
              required: ['niches'],
              additionalProperties: false
            }
          }
        }
      })
    });

    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      throwIfMistralAuthError(response, payload);
      throw new AppError(502, 'Mistral niche suggestions request failed.', {
        statusCode: response.status,
        payload
      });
    }

    const rawContent = extractContent(payload);
    const parsed = parseJsonContent(rawContent);
    
    if (!parsed || !Array.isArray(parsed.niches)) {
      throw new AppError(502, 'Mistral returned an invalid response structure for niche suggestions.');
    }

    // Sanitise every niche — strip markdown bold, leading numbers, quotes,
    // and everything after the first dash / colon / parenthesis (description delimiters).
    function sanitiseNiche(raw) {
      if (!raw || typeof raw !== 'string') return '';
      let s = raw.trim();
      // Strip leading/trailing markdown bold markers
      s = s.replace(/^\*+\s*/g, '').replace(/\*+\s*$/, '');
      // Strip leading numbering: "1.", "1)", "**1.**"
      s = s.replace(/^(\*{0,2}\d+[\.\)]\*{0,2}\s*)/g, '');
      // Strip surrounding quotes
      s = s.replace(/^['"""'']+|['"""'']+$/g, '');
      // Cut everything from the first description delimiter: " – ", " - ", ": ", " ("
      const cutAt = s.search(/\s+[-–—]\s+|\s*:\s+|\s+\(/);
      if (cutAt > 0) s = s.slice(0, cutAt);
      // Final strip of any leftover asterisks
      return s.replace(/\*/g, '').trim();
    }

    return parsed.niches.map(sanitiseNiche).filter(Boolean);
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new AppError(504, 'Mistral niche suggestions request timed out.');
    }

    if (error instanceof AppError) {
      throw error;
    }

    throw new AppError(502, 'Mistral niche suggestions failed.', { cause: error.message });
  } finally {
    clearTimeout(timeout);
  }
}

function formatListItem(item) {
  if (typeof item === 'string') return item;
  if (!item) return '';
  if (typeof item === 'object') {
    const primaryKeys = ['threat', 'risk', 'tip', 'strategy', 'action', 'recommendation', 'advice', 'milestone', 'title', 'point', 'name', 'text', 'detail', 'description'];
    for (const key of primaryKeys) {
      if (typeof item[key] === 'string' && item[key].trim()) {
        const otherParts = Object.entries(item)
          .filter(([k, v]) => k !== key && typeof v === 'string' && v.trim())
          .map(([k, v]) => `${k.charAt(0).toUpperCase() + k.slice(1)}: ${v.trim()}`);
        return otherParts.length > 0 ? `${item[key].trim()} (${otherParts.join(', ')})` : item[key].trim();
      }
    }
    const values = Object.values(item).filter(v => typeof v === 'string' || typeof v === 'number');
    if (values.length > 0) return values.join(' — ');
    return JSON.stringify(item);
  }
  return String(item);
}

/**
 * Generates financial advisory narratives and explanations via Mistral AI.
 */
export async function generateFinancialAdvisory(params) {
  const apiKey = requireEnv('MISTRAL_API_KEY', mistralConfig.apiKey);

  const shopExpenses = params.shopExpenses || {};
  const scheme = params.scheme;

  const prompt = `You are an expert financial advisor and government scheme specialist for Indian small and micro businesses (especially rural and semi-urban entrepreneurs).

BUSINESS PROFILE:
- Location: ${params.location?.full || params.location || 'India'}
- Business Type: ${params.proposedBusiness || params.businessCategory || 'Business'}
- Own Contribution: Rs.${(params.availableMargin || 0).toLocaleString('en-IN')}
- Total Project Cost: Rs.${(params.projectCost || 0).toLocaleString('en-IN')}
- Loan Amount: Rs.${(params.loanAmount || 0).toLocaleString('en-IN')}

SELECTED GOVERNMENT SCHEME:
${scheme ? `- Name: ${scheme.name}
- Interest Rate: ${scheme.interestRate || 0}% per annum
- Tenure: ${scheme.tenureYears || 0} years
- Moratorium: ${scheme.moratoriumMonths || 0} months
- Monthly EMI: Rs.${(scheme.monthlyEMI || 0).toLocaleString('en-IN')}
- Subsidy Available: ${scheme.subsidyAvailable ? 'Yes (' + scheme.subsidyPercentage + '%)' : 'No'}` : '- No scheme selected (Direct bank loan route)'}

MONTHLY SHOP EXPENSES (User Provided):
- Shop Rent: Rs.${(shopExpenses.shopRent || 0).toLocaleString('en-IN')}
- Product / Inventory Maintenance: Rs.${(shopExpenses.productMaintenanceCost || 0).toLocaleString('en-IN')}
- Labour (${shopExpenses.numberOfLabours || 0} workers × Rs.${(shopExpenses.labourWagePerPerson || 0).toLocaleString('en-IN')}/month): Rs.${(shopExpenses.totalLabourCost || 0).toLocaleString('en-IN')}
- Other Expenses: Rs.${(shopExpenses.otherExpenses || 0).toLocaleString('en-IN')}
- TOTAL MONTHLY EXPENSES: Rs.${(shopExpenses.totalMonthly || params.expectedMonthlyExpenses || 0).toLocaleString('en-IN')}

REVENUE & FEASIBILITY:
- Expected Monthly Revenue: Rs.${(params.expectedMonthlyRevenue || 0).toLocaleString('en-IN')}
- Market Demand Level: ${params.demandLevel || 'Unknown'}
- Number of Nearby Competitors: ${params.competitors || 0}
- Feasibility Score: ${params.feasibilityScore}/100 (${params.interpretation})

YOUR TASK:
Provide a comprehensive business advisory covering:
1. Executive summary of viability
2. Scheme explanation (how the selected scheme benefits this business)
3. Revenue improvement strategies (specific, actionable tips for this business type)
4. Threat analysis (both market threats from competition/demand and financial threats from loan/cash flow)
5. A practical 12-month business roadmap with milestones
6. Key financial risks and how to mitigate them
7. Actionable recommendations

Return ONLY a valid JSON object with this exact structure:
{
  "executiveSummary": "2-3 sentence overview of financial viability and scheme fit.",
  "schemeExplanation": "How the chosen scheme helps this business specifically, key benefits and terms explained simply.",
  "revenueTips": [
    "Specific revenue tip 1 for this business type",
    "Specific revenue tip 2",
    "Specific revenue tip 3",
    "Specific revenue tip 4"
  ],
  "threatAnalysis": {
    "marketThreats": ["Market threat 1 based on competitor count and demand", "Market threat 2"],
    "financialThreats": ["Financial threat 1 based on EMI vs revenue", "Financial threat 2"]
  },
  "businessRoadmap": [
    { "month": "Month 1-2", "milestone": "Setup & Launch", "actions": ["Action 1", "Action 2"] },
    { "month": "Month 3-4", "milestone": "Stabilization", "actions": ["Action 1", "Action 2"] },
    { "month": "Month 5-6", "milestone": "Revenue Building", "actions": ["Action 1", "Action 2"] },
    { "month": "Month 7-9", "milestone": "Growth Phase", "actions": ["Action 1", "Action 2"] },
    { "month": "Month 10-12", "milestone": "Consolidation", "actions": ["Action 1", "Action 2"] }
  ],
  "financialAdvice": ["Concrete financial tip 1", "Tip 2", "Tip 3"],
  "riskFactors": ["Risk 1 with mitigation", "Risk 2 with mitigation"],
  "recommendations": ["Actionable recommendation 1", "Recommendation 2", "Recommendation 3"]
}
Note: For threatAnalysis.marketThreats and threatAnalysis.financialThreats, return an array of plain strings (not nested objects).`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), mistralConfig.timeoutMs);

  try {
    const response = await fetch(mistralConfig.apiUrl, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: mistralConfig.largeModel || mistralConfig.model,
        temperature: 0.4,
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' }
      })
    });

    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      throwIfMistralAuthError(response, payload);
      console.warn('[Mistral] Financial advisory request failed with status:', response.status);
    }

    const rawContent = extractContent(payload);
    const parsed = extractJsonFromMistralResponse(rawContent);

    return {
      executiveSummary: typeof parsed?.executiveSummary === 'string' ? parsed.executiveSummary : 'Financial plan generated successfully.',
      schemeExplanation: typeof parsed?.schemeExplanation === 'string' ? parsed.schemeExplanation : 'Scheme guidance evaluated.',
      revenueTips: Array.isArray(parsed?.revenueTips) ? parsed.revenueTips.map(formatListItem) : [],
      threatAnalysis: parsed?.threatAnalysis && typeof parsed.threatAnalysis === 'object' ? {
        marketThreats: Array.isArray(parsed.threatAnalysis.marketThreats) ? parsed.threatAnalysis.marketThreats.map(formatListItem) : [],
        financialThreats: Array.isArray(parsed.threatAnalysis.financialThreats) ? parsed.threatAnalysis.financialThreats.map(formatListItem) : []
      } : { marketThreats: [], financialThreats: [] },
      businessRoadmap: Array.isArray(parsed?.businessRoadmap) ? parsed.businessRoadmap : [],
      financialAdvice: Array.isArray(parsed?.financialAdvice) ? parsed.financialAdvice.map(formatListItem) : [],
      riskFactors: Array.isArray(parsed?.riskFactors) ? parsed.riskFactors.map(formatListItem) : [],
      recommendations: Array.isArray(parsed?.recommendations) ? parsed.recommendations.map(formatListItem) : []
    };
  } catch (error) {
    console.warn('[Mistral] generateFinancialAdvisory failed (using fallback):', error.message);
    return {
      executiveSummary: 'AI analysis is temporarily unavailable. Financial calculations above are complete and accurate.',
      schemeExplanation: 'Government scheme matching completed using deterministic business rules.',
      revenueTips: ['Focus on repeat customers by offering loyalty discounts.', 'Expand product range based on local customer demand.'],
      threatAnalysis: { marketThreats: ['Monitor local competitors pricing.'], financialThreats: ['Ensure EMI is covered by at least 1.5x your monthly net income.'] },
      businessRoadmap: [{ month: 'Month 1-3', milestone: 'Launch & Setup', actions: ['Complete registration', 'Set up shop', 'Apply for scheme loan'] }],
      financialAdvice: ['Maintain a minimum of 2-3 months operating cash reserve.'],
      riskFactors: ['Monitor monthly cash flow against fixed loan EMI commitments.'],
      recommendations: ['Consult local bank branch officers for scheme documentation submission.']
    };
  } finally {
    clearTimeout(timeout);
  }
}
