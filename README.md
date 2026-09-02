# MarketSense

MarketSense is a MERN application that evaluates whether a location is suitable for opening a business. It discovers nearby competitors through Google Places, enriches competitor records with Place Details, asks Mistral for structured market analysis, and stores the analysis history in MongoDB.

## Architecture

- `client/`: Vite React app with a search workflow, analysis dashboard, competitor table, recommendation panel, and history page.
- `server/`: Express API organized by controllers, routes, validators, services, repositories, Mongoose models, middleware, prompts, and utilities.
- `MongoDB`: stores `searches`, `competitors`, and `analyses`.
- `Google Maps Platform`: server-side Geocoding, Nearby Search, and Place Details calls.
- `Mistral AI`: server-side structured JSON market analysis.

Credentials never leave the backend. The frontend calls only the REST API.

## Prerequisites

- Node.js 20.11 or newer
- MongoDB 7 locally, Atlas, or `docker compose`
- Google Maps Platform API key with Geocoding API and Places API enabled
- Mistral API key

## Setup

```bash
cd market-research
cp .env.example .env
npm install
docker compose up -d mongo
npm run dev
```

The API runs on `http://localhost:5001` and the client runs on `http://localhost:5173`.

## Environment

Set these values in `.env`:

- `MONGO_URI`: MongoDB connection string.
- `GOOGLE_MAPS_API_KEY`: server-side Google Maps key.
- `MISTRAL_API_KEY`: server-side Mistral key.
- `CLIENT_ORIGIN`: allowed frontend origin for CORS.
- `MISTRAL_MODEL`: defaults to `mistral-large-latest`.

## API

### `POST /api/analysis`

Request:

```json
{
  "location": "Downtown Austin, TX",
  "businessType": "coffee shop",
  "niche": "specialty espresso",
  "radius": 3000,
  "maxCompetitors": 10
}
```

Response includes the saved analysis, normalized competitors, score, grade, confidence, market analysis, and recommendation.

### `GET /api/history`

Returns recent saved analyses.

### `GET /api/history/:id`

Returns one saved analysis with competitors.

### `DELETE /api/history/:id`

Deletes the analysis, related competitors, and search record.

## Important Assumptions

- User-entered locations are geocoded before Nearby Search because Nearby Search requires coordinates.
- Google Place Details returns at most a limited review sample. If reviews are missing, the Mistral prompt and saved evidence metadata explicitly preserve that limitation.
- Mistral output is parsed, validated, score-normalized, and competitor assessments are reconciled against API-derived competitor names and metrics.

## Production Notes

- Restrict `GOOGLE_MAPS_API_KEY` to backend IPs or private server environments.
- Use HTTPS and a secret manager for environment variables.
- Put the Express API behind a reverse proxy or managed container service.
- Configure MongoDB backups, indexes, and connection pooling for the deployment target.
- Add authentication before exposing user-specific history in a multi-user deployment.
