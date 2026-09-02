import { z } from 'zod';

import { mistralConfig } from '../config/mistral.js';
import { requireEnv } from '../config/env.js';
import { buildMarketAnalysisPrompt, MARKET_ANALYSIS_RESPONSE_SCHEMA } from '../prompts/marketAnalysisPrompt.js';
import { buildChatSystemPrompt, buildGeneralChatSystemPrompt } from '../prompts/chatPrompt.js';
import { AppError } from '../utils/AppError.js';
import { applyServerGrade } from '../utils/scoreCalculator.js';

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
  const content = payload.choices?.[0]?.message?.content;

  if (typeof content === 'string') {
    return content;
  }

  if (Array.isArray(content)) {
    return content.map((part) => part.text || part.content || '').join('');
  }

  throw new AppError(502, 'Mistral returned an empty response.');
}

function parseJsonContent(content) {
  try {
    return JSON.parse(content);
  } catch (_error) {
    const match = content.match(/\{[\s\S]*\}/);
    if (!match) {
      throw new AppError(502, 'Mistral did not return parseable JSON.');
    }

    try {
      return JSON.parse(match[0]);
    } catch (innerError) {
      throw new AppError(502, 'Mistral returned invalid JSON.', { cause: innerError.message });
    }
  }
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
        temperature: 0.2,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'market_analysis_response',
            strict: true,
            schema: MARKET_ANALYSIS_RESPONSE_SCHEMA
          }
        }
      })
    });

    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new AppError(502, 'Mistral analysis request failed.', {
        statusCode: response.status,
        payload
      });
    }

    const rawContent = extractContent(payload);
    const parsed = parseJsonContent(rawContent);
    const validated = marketAnalysisResultSchema.parse(parsed);
    const analysis = sanitizeMarketAnalysis(validated, competitors);

    return {
      analysis,
      rawAiResponse: parsed,
      metadata: {
        model: payload.model || mistralConfig.model,
        usage: payload.usage
      }
    };
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new AppError(504, 'Mistral analysis request timed out.');
    }

    if (error instanceof AppError) {
      throw error;
    }

    if (error instanceof z.ZodError) {
      throw new AppError(502, 'Mistral returned JSON that did not match the required schema.', {
        issues: error.issues
      });
    }

    throw new AppError(502, 'Mistral analysis failed.', { cause: error.message });
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
  
  const prompt = `You are a professional business consultant and location strategist.
For a target business type of "${businessType}"${location ? ` located in "${location}"` : ''}, suggest 5 highly creative, specific, viable, and profitable business niches.
Your suggestions should be tailored to stand out in the local market, capitalize on recent consumer trends, and minimize direct competition.

Provide your response strictly in JSON format matching this schema:
{
  "niches": ["string", "string", "string", "string", "string"]
}`;

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
        temperature: 0.7,
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

    return parsed.niches;
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

