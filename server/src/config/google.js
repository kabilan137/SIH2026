import { env } from './env.js';

export const googleConfig = Object.freeze({
  apiKey: env.googleMapsApiKey,
  timeoutMs: env.googleApiTimeoutMs,
  maxCompetitors: Math.min(Math.max(env.googlePlacesMaxCompetitors, 1), 20),
  endpoints: {
    geocode: 'https://maps.googleapis.com/maps/api/geocode/json',
    nearbySearch: 'https://maps.googleapis.com/maps/api/place/nearbysearch/json',
    placeDetails: 'https://maps.googleapis.com/maps/api/place/details/json'
  },
  placeDetailsFields: [
    'name',
    'formatted_address',
    'vicinity',
    'rating',
    'user_ratings_total',
    'reviews',
    'place_id',
    'geometry',
    'types',
    'business_status',
    'formatted_phone_number',
    'website',
    'url',
    'price_level'
  ]
});
