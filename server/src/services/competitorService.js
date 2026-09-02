import { googleConfig } from '../config/google.js';
import { geocodeAddress, getPlaceDetails, getPlacePriceDetails, nearbySearch } from './googlePlacesService.js';
import { summarizeReviews } from './sentimentService.js';

const PRICE_LEVEL_STRING_TO_NUM = {
  PRICE_LEVEL_FREE: 0,
  PRICE_LEVEL_INEXPENSIVE: 1,
  PRICE_LEVEL_MODERATE: 2,
  PRICE_LEVEL_EXPENSIVE: 3,
  PRICE_LEVEL_VERY_EXPENSIVE: 4
};

const PRICE_LEVEL_ESTIMATED_RANGES = {
  0: { displayString: 'Free', startPrice: { units: '0', currencyCode: 'USD' }, endPrice: { units: '0', currencyCode: 'USD' } },
  1: { displayString: 'Under $10', startPrice: { units: '0', currencyCode: 'USD' }, endPrice: { units: '10', currencyCode: 'USD' } },
  2: { displayString: '$10 - $30', startPrice: { units: '10', currencyCode: 'USD' }, endPrice: { units: '30', currencyCode: 'USD' } },
  3: { displayString: '$30 - $60', startPrice: { units: '30', currencyCode: 'USD' }, endPrice: { units: '60', currencyCode: 'USD' } },
  4: { displayString: 'Over $60', startPrice: { units: '60', currencyCode: 'USD' } }
};

function formatPriceRange(priceRange) {
  if (!priceRange) return null;
  const { startPrice, endPrice } = priceRange;
  const currencySymbol = getCurrencySymbol(startPrice?.currencyCode || endPrice?.currencyCode || 'USD');
  
  const start = startPrice?.units;
  const end = endPrice?.units;
  
  if (start && end) {
    return `${currencySymbol}${start} - ${currencySymbol}${end}`;
  } else if (start) {
    return `Over ${currencySymbol}${start}`;
  } else if (end) {
    return `Under ${currencySymbol}${end}`;
  }
  return null;
}

function getCurrencySymbol(code) {
  switch (code) {
    case 'USD': return '$';
    case 'EUR': return '€';
    case 'GBP': return '£';
    case 'JPY': return '¥';
    case 'INR': return '₹';
    default: return code + ' ';
  }
}

async function mapWithConcurrency(items, concurrency, mapper) {
  const results = [];
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < items.length) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await mapper(items[index], index);
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, worker));
  return results;
}

function normalizeReview(review) {
  return {
    authorName: review.author_name,
    rating: Number.isFinite(review.rating) ? review.rating : null,
    text: review.text || '',
    relativeTimeDescription: review.relative_time_description,
    time: review.time,
    language: review.language,
    translated: review.translated
  };
}

function normalizeCompetitor({ details, newPriceDetails, summary, detailsError }) {
  const source = details || summary;
  const reviews = (details?.reviews || []).map(normalizeReview);
  const location = source.geometry?.location || summary.geometry?.location;
  const types = source.types || summary.types || [];
  const reviewCount = source.user_ratings_total ?? summary.user_ratings_total ?? 0;
  const rating = source.rating ?? summary.rating ?? null;

  let finalPriceLevel = source.price_level;
  let finalPriceRange = null;

  if (newPriceDetails) {
    if (newPriceDetails.priceLevel) {
      finalPriceLevel = PRICE_LEVEL_STRING_TO_NUM[newPriceDetails.priceLevel] ?? finalPriceLevel;
    }
    if (newPriceDetails.priceRange) {
      finalPriceRange = {
        startPrice: newPriceDetails.priceRange.startPrice ? {
          currencyCode: newPriceDetails.priceRange.startPrice.currencyCode,
          units: newPriceDetails.priceRange.startPrice.units,
          nanos: newPriceDetails.priceRange.startPrice.nanos
        } : undefined,
        endPrice: newPriceDetails.priceRange.endPrice ? {
          currencyCode: newPriceDetails.priceRange.endPrice.currencyCode,
          units: newPriceDetails.priceRange.endPrice.units,
          nanos: newPriceDetails.priceRange.endPrice.nanos
        } : undefined,
        displayString: formatPriceRange(newPriceDetails.priceRange)
      };
    }
  }

  if (!finalPriceRange && Number.isFinite(finalPriceLevel)) {
    const fallbackRange = PRICE_LEVEL_ESTIMATED_RANGES[finalPriceLevel];
    if (fallbackRange) {
      finalPriceRange = {
        startPrice: fallbackRange.startPrice,
        endPrice: fallbackRange.endPrice,
        displayString: fallbackRange.displayString
      };
    }
  }

  return {
    placeId: source.place_id || summary.place_id,
    name: source.name || summary.name,
    address: source.formatted_address || source.vicinity || summary.vicinity,
    rating: Number.isFinite(rating) ? rating : null,
    reviewCount: Number.isFinite(reviewCount) ? reviewCount : 0,
    reviews,
    location: location
      ? {
          lat: location.lat,
          lng: location.lng
        }
      : undefined,
    businessStatus: source.business_status || summary.business_status,
    businessCategory: {
      primaryType: types[0],
      types
    },
    sentimentSummary: summarizeReviews(reviews),
    evidence: {
      detailsAvailable: Boolean(details),
      reviewsAvailable: reviews.length > 0,
      reviewTextAvailable: reviews.some((review) => Boolean(review.text?.trim()))
    },
    googleMetadata: {
      website: source.website,
      phoneNumber: source.formatted_phone_number,
      googleMapsUrl: source.url,
      priceLevel: finalPriceLevel,
      priceRange: finalPriceRange
    },
    discoveryError: detailsError
  };
}

export async function discoverCompetitors(input, onProgress = () => {}) {
  onProgress(10, 'Geocoding location and searching competitors...');
  const geocode = await geocodeAddress(input.location);
  const nearby = await nearbySearch({
    coordinates: geocode.coordinates,
    businessType: input.businessType,
    niche: input.niche,
    radius: input.radius
  });

  const maxCompetitors = Math.min(input.maxCompetitors || googleConfig.maxCompetitors, googleConfig.maxCompetitors, 20);
  const summaries = nearby.results.filter((place) => place.place_id).slice(0, maxCompetitors);
  const totalCount = summaries.length;

  if (totalCount === 0) {
    onProgress(45, 'No competitors found. Continuing analysis...');
    return {
      search: {
        location: input.location,
        normalizedLocation: geocode.formattedAddress,
        businessType: input.businessType,
        niche: input.niche,
        radiusMeters: input.radius,
        coordinates: geocode.coordinates,
        completedAt: new Date(),
        metadata: {
          geocodePlaceId: geocode.placeId,
          nearbyStatus: nearby.status,
          nextPageAvailable: Boolean(nearby.nextPageToken)
        }
      },
      competitors: [],
      discoveryMetadata: {
        searchedAt: new Date().toISOString(),
        googleNearbyStatus: nearby.status,
        resultCount: 0
      }
    };
  }

  onProgress(25, `Found ${totalCount} competitors. Enriching competitor details...`);
  let completedCount = 0;

  const detailResults = await mapWithConcurrency(summaries, 4, async (summary) => {
    try {
      const [details, newPriceDetails] = await Promise.all([
        getPlaceDetails(summary.place_id),
        getPlacePriceDetails(summary.place_id)
      ]);
      const normalized = normalizeCompetitor({ details: details.result, newPriceDetails, summary });
      completedCount++;
      const pct = 25 + Math.round((completedCount / totalCount) * 20); // 25% to 45%
      onProgress(pct, `Enriched competitor ${completedCount} of ${totalCount}: ${normalized.name}...`);
      return normalized;
    } catch (error) {
      console.warn(
        JSON.stringify({
          message: 'Place details enrichment failed; falling back to nearby search summary.',
          placeId: summary.place_id,
          error: error.message
        })
      );
      completedCount++;
      const pct = 25 + Math.round((completedCount / totalCount) * 20); // 25% to 45%
      onProgress(pct, `Enriched competitor ${completedCount} of ${totalCount}...`);
      return normalizeCompetitor({ summary, detailsError: error.message });
    }
  });

  return {
    search: {
      location: input.location,
      normalizedLocation: geocode.formattedAddress,
      businessType: input.businessType,
      niche: input.niche,
      radiusMeters: input.radius,
      coordinates: geocode.coordinates,
      completedAt: new Date(),
      metadata: {
        geocodePlaceId: geocode.placeId,
        nearbyStatus: nearby.status,
        nextPageAvailable: Boolean(nearby.nextPageToken)
      }
    },
    competitors: detailResults,
    discoveryMetadata: {
      searchedAt: new Date().toISOString(),
      googleNearbyStatus: nearby.status,
      resultCount: detailResults.length
    }
  };
}
