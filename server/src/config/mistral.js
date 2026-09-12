import { env } from './env.js';

export const mistralConfig = Object.freeze({
  apiKey: env.mistralApiKey,
  apiUrl: env.mistralApiUrl,
  model: env.mistralModel,
  // Used for the complex market analysis call — requires a large model
  // capable of reliably producing the deeply nested 17-field JSON schema.
  largeModel: env.mistralLargeModel,
  timeoutMs: env.mistralTimeoutMs
});
