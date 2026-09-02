import AudienceProfile from '../models/AudienceProfile.js';
import { mistralConfig } from '../config/mistral.js';
import { requireEnv } from '../config/env.js';
import { AppError } from '../utils/AppError.js';

// ---------------------------------------------------------------------------
// Audience prompt — isolated, lightweight Mistral call.
// Returns { audienceCategories: string[] } using valid Google Place Types.
// ---------------------------------------------------------------------------

const AUDIENCE_CATEGORIES_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['audienceCategories'],
  properties: {
    audienceCategories: {
      type: 'array',
      items: { type: 'string' },
      minItems: 1,
      maxItems: 8
    }
  }
};

function buildAudiencePrompt(businessType, niche) {
  return `You are a market research analyst specializing in location intelligence.

Task:
Identify the types of nearby venues and places whose presence signals strong customer demand for the following business.

Rules:
- Return ONLY valid Google Place Types (snake_case strings used by the Google Places API).
- Focus on audience sources — the kinds of places where potential customers of this business congregate.
- Do NOT include the business itself or direct competitors.
- Return 4 to 8 categories that are most relevant.
- Output only the JSON object — no explanation.

Examples of valid Google Place Types:
university, library, coworking_space, office, gym, shopping_mall,
hospital, school, transit_station, park, hotel, movie_theater,
corporate_headquarters (use 'establishment' for generic offices)

Business Type: ${businessType}
Niche: ${niche || 'Not specified'}

Return ONLY:
{ "audienceCategories": ["type1", "type2", ...] }`;
}

async function callMistralForAudienceCategories(businessType, niche) {
  const apiKey = requireEnv('MISTRAL_API_KEY', mistralConfig.apiKey);
  const prompt = buildAudiencePrompt(businessType, niche);

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
        temperature: 0.3,
        messages: [{ role: 'user', content: prompt }],
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'audience_categories_response',
            strict: true,
            schema: AUDIENCE_CATEGORIES_SCHEMA
          }
        }
      })
    });

    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new AppError(502, 'Mistral audience category request failed.', {
        statusCode: response.status,
        payload
      });
    }

    const content = payload.choices?.[0]?.message?.content;
    if (!content) {
      throw new AppError(502, 'Mistral returned an empty audience response.');
    }

    let parsed;
    try {
      parsed = typeof content === 'string' ? JSON.parse(content) : content;
    } catch {
      const match = String(content).match(/\{[\s\S]*\}/);
      if (!match) throw new AppError(502, 'Mistral did not return parseable audience JSON.');
      parsed = JSON.parse(match[0]);
    }

    const categories = parsed?.audienceCategories;
    if (!Array.isArray(categories) || categories.length === 0) {
      throw new AppError(502, 'Mistral returned invalid audience categories structure.');
    }

    // Sanitize: lowercase, trim, remove blanks, cap at 8
    return categories
      .map((c) => String(c).toLowerCase().trim())
      .filter((c) => c.length > 0)
      .slice(0, 8);
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new AppError(504, 'Mistral audience category request timed out.');
    }
    if (error instanceof AppError) throw error;
    throw new AppError(502, 'Audience category generation failed.', { cause: error.message });
  } finally {
    clearTimeout(timeout);
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Returns an AudienceProfile document for the given businessType + niche.
 * Checks MongoDB cache first; calls Mistral on cache miss and persists result.
 *
 * @param {string} businessType
 * @param {string|undefined} niche
 * @returns {Promise<{ audienceCategories: string[], cacheHit: boolean }>}
 */
export async function getAudienceProfile(businessType, niche = '') {
  const normalizedType = businessType.toLowerCase().trim();
  const normalizedNiche = (niche || '').toLowerCase().trim();

  // Cache lookup
  const existing = await AudienceProfile.findOne({
    businessType: normalizedType,
    niche: normalizedNiche
  }).exec();

  if (existing) {
    console.info(
      JSON.stringify({
        message: 'AudienceProfile cache hit.',
        businessType: normalizedType,
        niche: normalizedNiche,
        categories: existing.audienceCategories
      })
    );
    return { audienceCategories: existing.audienceCategories, cacheHit: true };
  }

  // Cache miss — generate via Mistral
  console.info(
    JSON.stringify({
      message: 'AudienceProfile cache miss — calling Mistral.',
      businessType: normalizedType,
      niche: normalizedNiche
    })
  );

  const categories = await callMistralForAudienceCategories(normalizedType, normalizedNiche);

  // Persist (upsert in case of concurrent requests)
  await AudienceProfile.findOneAndUpdate(
    { businessType: normalizedType, niche: normalizedNiche },
    {
      $setOnInsert: {
        businessType: normalizedType,
        niche: normalizedNiche,
        audienceCategories: categories,
        generatedBy: 'mistral'
      }
    },
    { upsert: true, new: true }
  ).exec();

  return { audienceCategories: categories, cacheHit: false };
}
