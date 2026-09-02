import { geocodeAddress } from '../services/googlePlacesService.js';
import { getAudienceProfile } from '../services/audienceProfileService.js';
import { gatherDemandSignals } from '../services/demandSignalService.js';
import { calculateDemandScore } from '../services/demandScoringService.js';
import { HALF_SATURATION_K, CATEGORY_CONFIG } from '../utils/demandWeights.js';
import { sendSuccess } from '../utils/responseFormatter.js';
import { AppError } from '../utils/AppError.js';

/**
 * POST /api/debug/demand
 *
 * Audience Quality Engine — Full Pipeline Diagnostic
 *
 * Returns complete transparency at every stage:
 *   1. Geocoding
 *   2. Audience categories (cache or Mistral)
 *   3. Raw Google Places counts per category
 *   4. Filter stats: sub-unit rejections, low-activity rejections, clustering
 *   5. Valid institutions per category (the real demand generators)
 *   6. Per-institution distance decay contributions
 *   7. Audience strength (weighted sum)
 *   8. Hyperbolic normalization → demand score
 *   9. Top drivers (explainability)
 *   10. Density band label
 *
 * Input:  { location, businessType, niche?, radius? }
 */
export async function debugDemand(req, res, next) {
  try {
    const {
      location,
      businessType,
      niche = '',
      radius = 5000
    } = req.body;

    if (!location || !businessType) {
      throw new AppError(400, 'location and businessType are required.');
    }

    // Step 1: Geocode
    const geocoded = await geocodeAddress(location);

    // Step 2: Audience profile
    const { audienceCategories, cacheHit: audienceCacheHit } = await getAudienceProfile(
      businessType,
      niche
    );

    // Step 3: Gather quality-filtered demand signals
    const demandProfile = await gatherDemandSignals({
      coordinates: geocoded.coordinates,
      audienceCategories,
      radius
    });

    // Step 4: Score
    const {
      demandScore,
      audienceStrength,
      densityBand,
      topDrivers,
      breakdown,
      normalization
    } = calculateDemandScore(demandProfile);

    // Build per-category diagnostic summary
    const categoryDiagnostics = {};
    for (const signal of demandProfile.signals) {
      const catBreakdown = breakdown.perCategory.find((c) => c.category === signal.category);
      categoryDiagnostics[signal.category] = {
        config: {
          weight: signal.weight,
          tier: signal.tier,
          minReviews: CATEGORY_CONFIG[signal.category]?.minReviews ?? 0,
          maxInstitutions: CATEGORY_CONFIG[signal.category]?.maxInstitutions ?? 15
        },
        filterStats: signal.filterStats,
        validInstitutions: signal.validInstitutions,
        contribution: catBreakdown?.contribution ?? 0,
        institutionContributions: catBreakdown?.institutions ?? []
      };
    }

    return sendSuccess(res, {
      // Inputs
      input: { location, businessType, niche, radius },

      // Geocoding
      geocoded: {
        formattedAddress: geocoded.formattedAddress,
        coordinates: geocoded.coordinates
      },

      // Audience categories
      audienceCategories,
      audienceCacheHit,

      // Pipeline summary
      pipelineSummary: {
        totalRawPlaces: demandProfile.totalRawCount,
        totalValidInstitutions: demandProfile.totalValidInstitutions,
        categoriesSearched: demandProfile.categoriesSearched,
        categoriesWithResults: demandProfile.categoriesWithResults
      },

      // Per-category full diagnostic
      categoryDiagnostics,

      // Audience strength computation
      audienceStrength: {
        value: audienceStrength,
        formula: 'Σ (categoryWeight × distanceDecayFactor) per valid institution'
      },

      // Normalization
      normalization: {
        formula: 'audienceStrength / (audienceStrength + K) × 100',
        K: HALF_SATURATION_K,
        audienceStrength,
        demandScore
      },

      // Explainability
      topDrivers,
      densityBand,
      finalDemandScore: demandScore
    });
  } catch (error) {
    return next(error);
  }
}
