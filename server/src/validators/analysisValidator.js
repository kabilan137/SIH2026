import { z } from 'zod';

import {
  DEFAULT_MAX_COMPETITORS,
  DEFAULT_RADIUS_METERS,
  MAX_COMPETITORS,
  MAX_RADIUS_METERS,
  MIN_RADIUS_METERS
} from '../utils/constants.js';

const optionalTrimmedString = (maxLength) =>
  z.preprocess((value) => {
    if (typeof value !== 'string') {
      return value;
    }

    const trimmed = value.trim();
    return trimmed.length ? trimmed : undefined;
  }, z.string().max(maxLength).optional());

export const analysisRequestSchema = z
  .object({
    location: z.string().trim().min(2).max(180),
    businessType: z.string().trim().min(2).max(100),
    niche: optionalTrimmedString(120),
    radius: z.coerce.number().int().min(MIN_RADIUS_METERS).max(MAX_RADIUS_METERS).default(DEFAULT_RADIUS_METERS),
    maxCompetitors: z.coerce.number().int().min(1).max(MAX_COMPETITORS).default(DEFAULT_MAX_COMPETITORS)
  })
  .strict();

export const chatRequestSchema = z
  .object({
    messages: z
      .array(
        z.object({
          role: z.enum(['user', 'assistant']),
          content: z.string().trim().min(1).max(2000)
        })
      )
      .min(1),
    provider: z.enum(['mistral', 'openai', 'anthropic', 'gemini']).default('mistral'),
    apiKey: z.string().trim().optional(),
    model: z.string().trim().optional()
  })
  .strict();

export const nicheSuggestionsRequestSchema = z
  .object({
    businessType: z.string().trim().min(2).max(100),
    location: z.string().trim().min(2).max(180).optional()
  })
  .strict();


