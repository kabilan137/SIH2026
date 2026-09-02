// ---------------------------------------------------------------------------
// Demand Weights Configuration
//
// Central configuration for the Audience Quality Engine.
// Every category that Mistral may generate has a weight, tier, and
// a minimum review count that a place must have to be considered a
// genuine, operating institution.
//
// CALIBRATION HISTORY:
//   v1: Raw Google Places count. Austin=100 everywhere.
//   v2: Threshold=120 volume. Round Rock=100 too.
//   v3: Weighted avg distance. 83→66→59 (PASSED). Still volume-inflated.
//   v4: Quality Engine. FAILED — coworking_space type=X too broad.
//         Google returned: winery, museum, H-E-B, B&Bs as "coworking space".
//   v5: Added searchKeyword override. Problematic types use precise keyword
//       search instead of the overly-liberal Google type filter.
// ---------------------------------------------------------------------------

/**
 * Per-category configuration.
 *
 * weight          – Audience quality points per valid institution (1–10).
 * tier            – 'HIGH' | 'MEDIUM' | 'LOW'
 * minReviews      – Min Google review count to count as real, active institution.
 * maxInstitutions – Hard cap on how many valid institutions contribute.
 *
 * searchKeyword   – When present, overrides the Google Places search:
 *                   INSTEAD of type=<category> (which Google interprets too broadly),
 *                   uses keyword=<searchKeyword> for a more precise text match.
 *
 *                   ROOT CAUSE: type=coworking_space returned H-E-B, wineries,
 *                   RV parks, and museums in Fredericksburg, TX. Google's Place
 *                   Types for some categories are extremely liberal.
 *                   keyword="coworking" only returns places that explicitly identify
 *                   as coworking spaces in their Google Business Profile.
 */
export const CATEGORY_CONFIG = {
  // ── TIER 1: HIGH (weight 8–10) ────────────────────────────────────────────

  university: {
    weight: 10, tier: 'HIGH', minReviews: 10, maxInstitutions: 20
    // type=university is reliable — Google is strict about university classification
  },
  college: {
    weight: 10, tier: 'HIGH', minReviews: 10, maxInstitutions: 20,
    searchKeyword: 'college'
  },
  coworking_space: {
    weight: 8, tier: 'HIGH', minReviews: 10, maxInstitutions: 15,
    // CRITICAL: type=coworking_space is unreliable — returns wineries, museums,
    // grocery stores. Use keyword="coworking" instead: only matches places that
    // explicitly describe themselves as coworking spaces.
    searchKeyword: 'coworking'
  },

  // ── TIER 2: MEDIUM (weight 4–7) ───────────────────────────────────────────

  library: {
    weight: 7, tier: 'MEDIUM', minReviews: 5, maxInstitutions: 15
  },
  book_store: {
    weight: 6, tier: 'MEDIUM', minReviews: 3, maxInstitutions: 15
  },
  shopping_mall: {
    weight: 6, tier: 'MEDIUM', minReviews: 20, maxInstitutions: 10
  },
  transit_station: {
    weight: 5, tier: 'MEDIUM', minReviews: 0, maxInstitutions: 20
  },
  hospital: {
    weight: 5, tier: 'MEDIUM', minReviews: 10, maxInstitutions: 15
  },
  gym: {
    weight: 4, tier: 'MEDIUM', minReviews: 5, maxInstitutions: 20
  },
  movie_theater: {
    weight: 4, tier: 'MEDIUM', minReviews: 10, maxInstitutions: 10
  },

  // ── TIER 3: LOW (weight 1–3) ──────────────────────────────────────────────
  // Broad categories — still relevant but with lower per-place signal quality

  office: {
    weight: 3, tier: 'LOW', minReviews: 5, maxInstitutions: 15,
    // CRITICAL: type=office is not a valid Google Place Type. Use keyword instead
    // to search for corporate spaces and headquarters, avoiding general commercial properties.
    searchKeyword: 'corporate office'
  },
  school: {
    weight: 2, tier: 'LOW', minReviews: 5, maxInstitutions: 20
  },
  park: {
    weight: 2, tier: 'LOW', minReviews: 3, maxInstitutions: 15
  },
  hotel: {
    weight: 2, tier: 'LOW', minReviews: 5, maxInstitutions: 15,
    // CRITICAL: type=hotel is not a valid Google Place Type. Map to official 'lodging' type.
    searchType: 'lodging'
  },
  restaurant: {
    weight: 1, tier: 'LOW', minReviews: 10, maxInstitutions: 20
  },
  cafe: {
    weight: 2, tier: 'LOW', minReviews: 5, maxInstitutions: 20
  },
  bar: {
    weight: 1, tier: 'LOW', minReviews: 10, maxInstitutions: 15
  },
  supermarket: {
    weight: 2, tier: 'LOW', minReviews: 10, maxInstitutions: 10
  },
  convenience_store: {
    weight: 1, tier: 'LOW', minReviews: 5, maxInstitutions: 10
  },

  // ── Default (unknown categories from Mistral) ─────────────────────────────
  _default: { weight: 2, tier: 'LOW', minReviews: 0, maxInstitutions: 15 }
};

/**
 * Distance decay bands.
 *
 * A place 50m away is far more valuable as a demand signal than one 4km away.
 * The decay factor is multiplied into the category weight for each institution.
 *
 *   0–500m    ≈ immediate neighbourhood (full contribution)
 *   500m–1km  ≈ short walk              (10% reduction)
 *   1km–2km   ≈ reasonable walk / bike  (30% reduction)
 *   2km–3km   ≈ bike or short drive     (50% reduction)
 *   3km–5km   ≈ drive or transit        (70% reduction)
 *   >5km      ≈ edge of relevance       (85% reduction)
 */
export const DISTANCE_DECAY_BANDS = [
  { maxMeters: 500,      factor: 1.00 },
  { maxMeters: 1000,     factor: 0.90 },
  { maxMeters: 2000,     factor: 0.70 },
  { maxMeters: 3000,     factor: 0.50 },
  { maxMeters: 5000,     factor: 0.30 },
  { maxMeters: Infinity, factor: 0.15 }
];

/**
 * Half-saturation constant for hyperbolic demand normalization.
 *
 * Formula:  demandScore = audienceStrength / (audienceStrength + K) × 100
 *
 *   K = 100:  score = 50 when strength = 100 (suburban market)
 *   K = 100:  score = 74 when strength = 285 (dense city)
 *   K = 100:  score = 33 when strength = 50  (rural)
 */
export const HALF_SATURATION_K = 100;

/**
 * Demand score → human-readable market density band.
 */
export const DENSITY_BANDS = [
  { min: 81, label: 'Exceptional' },
  { min: 61, label: 'Strong'      },
  { min: 41, label: 'Moderate'    },
  { min: 21, label: 'Weak'        },
  { min: 0,  label: 'Very Weak'   }
];

// ---------------------------------------------------------------------------
// Helper functions
// ---------------------------------------------------------------------------

export function getCategoryConfig(category) {
  return CATEGORY_CONFIG[category] ?? CATEGORY_CONFIG._default;
}

export function getDecayFactor(distanceMeters) {
  if (!Number.isFinite(distanceMeters) || distanceMeters < 0) return 0;
  for (const band of DISTANCE_DECAY_BANDS) {
    if (distanceMeters <= band.maxMeters) return band.factor;
  }
  return DISTANCE_DECAY_BANDS[DISTANCE_DECAY_BANDS.length - 1].factor;
}

export function getDensityBand(score) {
  return DENSITY_BANDS.find((b) => score >= b.min)?.label ?? 'Very Weak';
}
