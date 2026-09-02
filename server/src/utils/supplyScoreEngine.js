// ---------------------------------------------------------------------------
// Supply Score Engine
//
// Measures competitive pressure from the supply side.
// Score range: 0–100, where 100 = maximum competitive pressure.
//
// All weights and thresholds are named constants for easy tuning.
// NO LLM calls — purely algorithmic.
// ---------------------------------------------------------------------------

// ---- Configuration --------------------------------------------------------

/** Competitor count that represents "fully saturated" supply. */
const COUNT_SATURATION = 15;

/** Competitor average rating threshold considered "high quality" competition. */
const RATING_HIGH_THRESHOLD = 4.0;

/** Max total review count across all competitors that = full review pressure. */
const REVIEW_SATURATION = 2000;

/** Weight distribution (must sum to 1.0) */
const WEIGHT_COUNT = 0.40;
const WEIGHT_RATING = 0.35;
const WEIGHT_REVIEWS = 0.25;

// ---------------------------------------------------------------------------
// Component scorers (each returns 0–100)
// ---------------------------------------------------------------------------

/**
 * Count pressure: more competitors → higher pressure.
 */
function scoreCountPressure(competitorCount) {
  if (competitorCount <= 0) return 0;
  return Math.min(1, competitorCount / COUNT_SATURATION) * 100;
}

/**
 * Rating pressure: higher average competitor rating → more entrenched, harder to beat.
 * Competitors with no rating are treated as low-threat.
 */
function scoreRatingPressure(competitors) {
  const rated = competitors.filter(
    (c) => Number.isFinite(c.rating) && c.rating !== null
  );
  if (rated.length === 0) return 0;

  const avgRating = rated.reduce((sum, c) => sum + c.rating, 0) / rated.length;

  // Linear scale: 0 rating = 0 pressure, RATING_HIGH_THRESHOLD+ = 100 pressure
  return Math.min(100, Math.max(0, (avgRating / RATING_HIGH_THRESHOLD) * 100));
}

/**
 * Review pressure: high total review volume = deep customer relationships = harder to displace.
 */
function scoreReviewPressure(competitors) {
  const totalReviews = competitors.reduce((sum, c) => sum + (c.reviewCount || 0), 0);
  if (totalReviews <= 0) return 0;
  return Math.min(1, totalReviews / REVIEW_SATURATION) * 100;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Calculates a supply (competitive pressure) score from the competitor list.
 *
 * @param {object[]} competitors – array of enriched competitor objects
 * @returns {{ supplyScore: number, breakdown: SupplyScoreBreakdown }}
 *
 * @typedef {object} SupplyScoreBreakdown
 * @property {number} countPressure  – 0-100
 * @property {number} ratingPressure – 0-100
 * @property {number} reviewPressure – 0-100
 * @property {number} weighted       – final weighted composite (= supplyScore)
 */
export function calculateSupplyScore(competitors = []) {
  if (!Array.isArray(competitors) || competitors.length === 0) {
    return {
      supplyScore: 0,
      breakdown: { countPressure: 0, ratingPressure: 0, reviewPressure: 0, weighted: 0 }
    };
  }

  const countPressure = Math.round(scoreCountPressure(competitors.length));
  const ratingPressure = Math.round(scoreRatingPressure(competitors));
  const reviewPressure = Math.round(scoreReviewPressure(competitors));

  const weighted =
    countPressure * WEIGHT_COUNT +
    ratingPressure * WEIGHT_RATING +
    reviewPressure * WEIGHT_REVIEWS;

  const supplyScore = Math.min(100, Math.max(0, Math.round(weighted)));

  return {
    supplyScore,
    breakdown: { countPressure, ratingPressure, reviewPressure, weighted: supplyScore }
  };
}
