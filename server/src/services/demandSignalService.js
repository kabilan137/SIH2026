import { nearbySearch } from './googlePlacesService.js';
import { filterAndCluster } from '../utils/placeRelevanceFilter.js';
import { getCategoryConfig } from '../utils/demandWeights.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Computes the haversine distance in metres between two lat/lng points.
 */
function haversineMeters(lat1, lng1, lat2, lng2) {
  const R = 6_371_000;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Searches Google Places for a single audience category, then filters and
 * clusters results to extract only genuine institution-level demand generators.
 *
 * Key changes from the old "Place Count Engine":
 *   1. Uses type= parameter (not keyword=) for more precise results
 *   2. Applies sub-unit name-pattern rejection (removes departments etc.)
 *   3. Clusters duplicate institutions (UT Austin CS Dept → UT Austin campus)
 *   4. Enforces minReviews threshold (removes ghost/inactive listings)
 *   5. Enforces maxInstitutions cap (prevents broad categories dominating)
 *
 * @param {object} params
 * @param {string} params.category       – Google Place Type (e.g. 'university')
 * @param {{ lat: number, lng: number }} params.coordinates
 * @param {number} params.radius         – search radius in metres
 * @returns {Promise<CategorySignal>}
 */
async function searchCategory({ category, coordinates, radius }) {
  const config = getCategoryConfig(category);

  try {
    // Use searchKeyword override when present (e.g. 'coworking' for coworking_space).
    // These categories have a Google Place Type that is too broadly interpreted —
    // e.g. type=coworking_space returns wineries, museums, RV parks, and grocery
    // stores. keyword="coworking" returns only self-identified coworking spaces.
    //
    // For categories WITHOUT a searchKeyword, use type-based search (more precise
    // than keyword search for well-defined types like university, library, park).
    const searchParams = config.searchKeyword
      ? { coordinates, businessType: config.searchKeyword, niche: '', radius, maxPages: 2 }
      : { coordinates, searchType: config.searchType || category, radius, maxPages: 2 };

    const result = await nearbySearch(searchParams);

    const rawPlaces = result.results || [];

    // Filter sub-units and cluster by institution
    const { validInstitutions, filterStats } = filterAndCluster({
      places: rawPlaces,
      category,
      centerCoords: coordinates,
      distanceFn: haversineMeters,
      minReviews: config.minReviews,
      maxInstitutions: config.maxInstitutions
    });

    // Compute aggregate stats for diagnostics
    const withDistance = validInstitutions.filter((i) => i.distanceMeters != null);
    const closestDistanceMeters = withDistance.length > 0
      ? Math.min(...withDistance.map((i) => i.distanceMeters))
      : null;
    const averageDistanceMeters = withDistance.length > 0
      ? Math.round(withDistance.reduce((s, i) => s + i.distanceMeters, 0) / withDistance.length)
      : null;

    const rated = validInstitutions.filter((i) => i.rating != null);
    const averageRating = rated.length > 0
      ? Number((rated.reduce((s, i) => s + i.rating, 0) / rated.length).toFixed(2))
      : null;

    // Structured diagnostic log per category
    console.info(
      JSON.stringify({
        message: 'Demand signal search result (quality-filtered)',
        category,
        tier: config.tier,
        weight: config.weight,
        rawCount: filterStats.rawCount,
        afterFilter: filterStats.rawCount - filterStats.rejectedSubUnit - filterStats.rejectedLowActivity,
        validInstitutions: filterStats.validCount,
        closestDistanceMeters,
        averageDistanceMeters,
        places: validInstitutions.map(i => i.name)
      })
    );

    // Human-readable terminal log of the places collected
    if (validInstitutions.length > 0) {
      console.log(`\n[Audience Data] Category: ${category} | Valid Places Collected: ${validInstitutions.length}`);
      validInstitutions.forEach(inst => {
        console.log(`  - ${inst.name} (${inst.distanceMeters ? `${inst.distanceMeters}m` : 'N/A'})`);
      });
      console.log('----------------------------------------------------');
    }

    return {
      category,
      tier: config.tier,
      weight: config.weight,
      filterStats,
      validInstitutions,
      validCount: validInstitutions.length,
      closestDistanceMeters,
      averageDistanceMeters,
      averageRating,
      status: result.status,
      error: null
    };
  } catch (error) {
    // Non-fatal: a single category failure must not abort the whole pipeline
    console.warn(
      JSON.stringify({
        message: 'Demand signal search failed for category; skipping.',
        category,
        error: error.message
      })
    );

    return {
      category,
      tier: getCategoryConfig(category).tier,
      weight: getCategoryConfig(category).weight,
      filterStats: { rawCount: 0, rejectedSubUnit: 0, rejectedLowActivity: 0, clustered: 0, validCount: 0 },
      validInstitutions: [],
      validCount: 0,
      closestDistanceMeters: null,
      averageDistanceMeters: null,
      averageRating: null,
      status: 'ERROR',
      error: error.message
    };
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Gathers quality-filtered demand signals for all audience categories.
 *
 * Returns a DemandProfile where each signal contains genuine institution-level
 * data rather than inflated Google Places result counts.
 *
 * @param {object} params
 * @param {{ lat: number, lng: number }} params.coordinates
 * @param {string[]} params.audienceCategories   – Google Place Types from Mistral
 * @param {number}   params.radius               – search radius in metres
 * @returns {Promise<DemandProfile>}
 *
 * @typedef {object} DemandProfile
 * @property {CategorySignal[]} signals
 * @property {number} totalRawCount          – raw Google Places result count (pre-filter)
 * @property {number} totalValidInstitutions – institution-level unique count (post-filter)
 * @property {number} categoriesSearched
 * @property {number} categoriesWithResults  – categories with ≥1 valid institution
 */
export async function gatherDemandSignals({ coordinates, audienceCategories, radius }, onCategoryComplete = () => {}) {
  if (!audienceCategories || audienceCategories.length === 0) {
    return {
      signals: [],
      totalRawCount: 0,
      totalValidInstitutions: 0,
      categoriesSearched: 0,
      categoriesWithResults: 0
    };
  }

  // Bounded concurrency: 3 parallel category searches to avoid rate limits
  const CONCURRENCY = 3;
  const signals = new Array(audienceCategories.length);
  let nextIndex = 0;
  let completedCount = 0;

  async function worker() {
    while (nextIndex < audienceCategories.length) {
      const idx = nextIndex++;
      const category = audienceCategories[idx];
      signals[idx] = await searchCategory({
        category,
        coordinates,
        radius
      });
      completedCount++;
      onCategoryComplete(completedCount, audienceCategories.length, category);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(CONCURRENCY, audienceCategories.length) }, worker)
  );

  const totalRawCount = signals.reduce((s, sig) => s + (sig.filterStats?.rawCount || 0), 0);
  const totalValidInstitutions = signals.reduce((s, sig) => s + (sig.validCount || 0), 0);
  const categoriesWithResults = signals.filter((s) => s.validCount > 0).length;

  // Summary diagnostic log
  console.info(
    JSON.stringify({
      message: 'Demand signal pipeline complete',
      totalRawCount,
      totalValidInstitutions,
      categoriesSearched: signals.length,
      categoriesWithResults,
      perCategory: signals.map((s) => ({
        category: s.category,
        raw: s.filterStats?.rawCount ?? 0,
        valid: s.validCount
      }))
    })
  );

  return {
    signals,
    totalRawCount,
    totalValidInstitutions,
    categoriesSearched: signals.length,
    categoriesWithResults
  };
}
