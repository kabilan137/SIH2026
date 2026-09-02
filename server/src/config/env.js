import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { AppError } from '../utils/AppError.js';

const configDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(configDir, '../../..');

dotenv.config({ path: path.join(projectRoot, '.env') });
dotenv.config({ path: path.join(projectRoot, 'server', '.env') });

function parseInteger(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export const env = Object.freeze({
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInteger(process.env.PORT, 5001),
  clientOrigin: (process.env.CLIENT_ORIGIN || 'http://localhost:5173').replace(/\/$/, ''),
  mongoUri: process.env.MONGO_URI || process.env.MONGODB_URI,
  googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY,
  googleMapsClientApiKey: process.env.GOOGLE_MAPS_CLIENT_API_KEY || process.env.VITE_GOOGLE_MAPS_API_KEY,
  googleMapsMapId: process.env.GOOGLE_MAPS_MAP_ID || 'DEMO_MAP_ID',
  googleApiTimeoutMs: parseInteger(process.env.GOOGLE_API_TIMEOUT_MS, 12000),
  googlePlacesMaxCompetitors: parseInteger(process.env.GOOGLE_PLACES_MAX_COMPETITORS, 10),
  mistralApiKey: process.env.MISTRAL_API_KEY,
  mistralApiUrl: process.env.MISTRAL_API_URL || 'https://api.mistral.ai/v1/chat/completions',
  mistralModel: process.env.MISTRAL_MODEL || 'mistral-large-latest',
  mistralTimeoutMs: parseInteger(process.env.MISTRAL_TIMEOUT_MS, 120000)
});

export function requireEnv(name, value) {
  if (!value) {
    throw new AppError(500, `${name} is not configured on the server.`);
  }

  return value;
}
