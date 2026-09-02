import { googleConfig } from '../config/google.js';
import { requireEnv } from '../config/env.js';
import { AppError } from '../utils/AppError.js';

// Strict list of supported types for Google Places Nearby Search (Table A)
const VALID_GOOGLE_PLACE_TYPES = new Set([
  'accounting', 'airport', 'amusement_park', 'aquarium', 'art_gallery', 'atm',
  'bakery', 'bank', 'bar', 'beauty_salon', 'bicycle_store', 'book_store',
  'bowling_alley', 'bus_station', 'cafe', 'campground', 'car_dealer', 'car_rental',
  'car_repair', 'car_wash', 'casino', 'cemetery', 'church', 'city_hall',
  'clothing_store', 'convenience_store', 'courthouse', 'dentist', 'department_store',
  'doctor', 'drugstore', 'electrician', 'electronics_store', 'embassy',
  'fire_station', 'florist', 'funeral_home', 'furniture_store', 'gas_station',
  'gym', 'hair_care', 'hardware_store', 'hindu_temple', 'home_goods_store',
  'hospital', 'insurance_agency', 'jewelry_store', 'laundry', 'lawyer', 'library',
  'light_rail_station', 'liquor_store', 'local_government_office', 'locksmith',
  'lodging', 'meal_delivery', 'meal_takeaway', 'mosque', 'movie_rental',
  'movie_theater', 'moving_company', 'museum', 'night_club', 'painter', 'park',
  'parking', 'pet_store', 'pharmacy', 'physiotherapist', 'plumber', 'police',
  'post_office', 'primary_school', 'real_estate_agency', 'restaurant',
  'roofing_contractor', 'rv_park', 'school', 'secondary_school', 'shoe_store',
  'shopping_mall', 'spa', 'stadium', 'storage', 'store', 'subway_station',
  'supermarket', 'synagogue', 'taxi_stand', 'tourist_attraction', 'train_station',
  'transit_station', 'travel_agency', 'university', 'veterinary_care', 'zoo'
]);

function buildUrl(baseUrl, params) {
  const url = new URL(baseUrl);

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, String(value));
    }
  });

  return url;
}

async function fetchGoogleJson(url, context) {
  const apiKey = requireEnv('GOOGLE_MAPS_API_KEY', googleConfig.apiKey);
  url.searchParams.set('key', apiKey);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), googleConfig.timeoutMs);

  try {
    const response = await fetch(url, { signal: controller.signal });
    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new AppError(502, `${context} request failed.`, {
        statusCode: response.status,
        payload
      });
    }

    return payload;
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new AppError(504, `${context} request timed out.`);
    }

    if (error instanceof AppError) {
      throw error;
    }

    throw new AppError(502, `${context} request failed.`, { cause: error.message });
  } finally {
    clearTimeout(timeout);
  }
}

function assertGoogleStatus(payload, context, allowZeroResults = false) {
  if (payload.status === 'OK') {
    return;
  }

  if (allowZeroResults && payload.status === 'ZERO_RESULTS') {
    return;
  }

  throw new AppError(502, `${context} returned ${payload.status || 'an unknown status'}.`, {
    googleStatus: payload.status,
    errorMessage: payload.error_message
  });
}

export async function geocodeAddress(address) {
  const url = buildUrl(googleConfig.endpoints.geocode, {
    address
  });
  const payload = await fetchGoogleJson(url, 'Google Geocoding');

  assertGoogleStatus(payload, 'Google Geocoding');

  const result = payload.results?.[0];
  const location = result?.geometry?.location;

  if (!Number.isFinite(location?.lat) || !Number.isFinite(location?.lng)) {
    throw new AppError(404, 'Google could not resolve that location to coordinates.');
  }

  return {
    formattedAddress: result.formatted_address,
    placeId: result.place_id,
    coordinates: {
      lat: location.lat,
      lng: location.lng
    },
    raw: result
  };
}

/**
 * Fetches a single page of Google Places Nearby Search results.
 *
 * Supports two search modes:
 *   searchType – use Google's `type` parameter for precise type-filtered results
 *   keyword    – use Google's `keyword` text search (broader, less precise)
 *
 * For demand signal searching we use `searchType` (more precise — only returns
 * places Google has classified as that type, reducing false positives like
 * university departments appearing in a "university" keyword search).
 *
 * @param {object} params
 * @param {{ lat: number, lng: number }} params.coordinates
 * @param {string} [params.keyword]    – text keyword search
 * @param {string} [params.searchType] – Google Place Type (preferred for demand signals)
 * @param {number} params.radius
 * @param {string} [params.pageToken]  – next_page_token from previous page
 */
async function nearbySearchPage({ coordinates, keyword, searchType, radius, pageToken }) {
  let params;

  if (pageToken) {
    // Page token requests must only include pagetoken + key
    params = { pagetoken: pageToken };
  } else if (searchType) {
    // Type-based search: more precise, fewer false positives
    params = {
      location: `${coordinates.lat},${coordinates.lng}`,
      radius,
      type: searchType
    };
  } else {
    // Keyword-based search: broader, used for competitor discovery
    params = {
      location: `${coordinates.lat},${coordinates.lng}`,
      radius,
      keyword
    };
  }

  const url = buildUrl(googleConfig.endpoints.nearbySearch, params);
  const payload = await fetchGoogleJson(url, 'Google Places Nearby Search');

  assertGoogleStatus(payload, 'Google Places Nearby Search', true);

  return {
    results: payload.results || [],
    status: payload.status,
    nextPageToken: payload.next_page_token
  };
}

/**
 * Runs a multi-page Google Places Nearby Search.
 *
 * For demand signals, pass `searchType` to use type-based filtering.
 * For competitor discovery, pass `keyword` to use text search.
 *
 * @param {object} params
 * @param {{ lat: number, lng: number }} params.coordinates
 * @param {string} [params.businessType]  – used as keyword when searchType not provided
 * @param {string} [params.searchType]    – Google Place Type (demand signal searches)
 * @param {string} [params.niche]         – appended to keyword when using keyword mode
 * @param {number} params.radius
 * @param {number} [params.maxPages=2]    – max pages to fetch (each page = up to 20 results)
 */
export async function nearbySearch({
  coordinates,
  businessType,
  searchType,
  niche,
  radius,
  maxPages = 2
}) {
  let resolvedSearchType = searchType;
  let resolvedKeyword;

  // Auto-resolve businessType to searchType if it matches a valid Google Place Type
  if (!resolvedSearchType && businessType) {
    const normalizedType = businessType.toLowerCase().trim().replace(/\s+/g, '_');
    if (VALID_GOOGLE_PLACE_TYPES.has(normalizedType)) {
      resolvedSearchType = normalizedType;
    }
  }

  if (resolvedSearchType) {
    if (VALID_GOOGLE_PLACE_TYPES.has(resolvedSearchType)) {
      resolvedKeyword = undefined;
    } else {
      console.warn(
        `[googlePlacesService] Unrecognized Google Place Type "${resolvedSearchType}". Falling back to keyword search.`
      );
      resolvedKeyword = resolvedSearchType;
      resolvedSearchType = undefined;
    }
  } else {
    resolvedKeyword = [businessType, niche].filter(Boolean).join(' ');
  }

  let allResults = [];
  let lastStatus = 'ZERO_RESULTS';
  let nextPageToken;
  let pagesLoaded = 0;

  while (pagesLoaded < maxPages) {
    const page = await nearbySearchPage({
      coordinates,
      keyword: resolvedKeyword,
      searchType: resolvedSearchType,
      radius,
      pageToken: nextPageToken
    });

    allResults = allResults.concat(page.results);
    lastStatus = page.status;
    nextPageToken = page.nextPageToken;
    pagesLoaded += 1;

    if (!nextPageToken) break;

    // Google Places enforces a 2-second delay before the next page token becomes usable
    if (pagesLoaded < maxPages) {
      await new Promise((resolve) => setTimeout(resolve, 2200));
    }
  }

  return {
    results: allResults,
    status: lastStatus,
    nextPageToken
  };
}

export async function getPlaceDetails(placeId) {
  const url = buildUrl(googleConfig.endpoints.placeDetails, {
    place_id: placeId,
    fields: googleConfig.placeDetailsFields.join(','),
    reviews_sort: 'newest'
  });
  const payload = await fetchGoogleJson(url, 'Google Place Details');

  assertGoogleStatus(payload, 'Google Place Details');

  return {
    result: payload.result,
    status: payload.status
  };
}

export async function getPlacePriceDetails(placeId) {
  const apiKey = requireEnv('GOOGLE_MAPS_API_KEY', googleConfig.apiKey);
  const url = `https://places.googleapis.com/v1/places/${placeId}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), googleConfig.timeoutMs);

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'priceLevel,priceRange'
      },
      signal: controller.signal
    });

    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      console.warn(`[googlePlacesService] New Places Details request failed for ${placeId}:`, payload);
      return null;
    }

    return payload;
  } catch (error) {
    console.warn(`[googlePlacesService] New Places Details request error for ${placeId}:`, error.message);
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

