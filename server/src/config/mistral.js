import { env } from './env.js';

export const mistralConfig = Object.freeze({
  apiKey: env.mistralApiKey,
  apiUrl: env.mistralApiUrl,
  model: env.mistralModel,
  timeoutMs: env.mistralTimeoutMs
});
