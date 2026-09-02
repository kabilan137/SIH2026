// ---------------------------------------------------------------------------
// Opportunity Engine
//
// Combines demand strength and supply (competitive) pressure into a single
// Opportunity Score (0–100).
//
// Formula:
//   opportunityScore = clamp(
//     (demandScore * DEMAND_WEIGHT) - (supplyScore * SUPPLY_WEIGHT) + BASE_OFFSET,
//     0, 100
//   )
//
// Interpretation:
//   High demand + low supply  → high opportunity
//   Low demand  + high supply → low opportunity
//   High demand + high supply → moderate opportunity (contested market)
//   Low demand  + low supply  → low opportunity (no market)
//
// All weights are named constants for easy tuning. NO LLM calls.
// ---------------------------------------------------------------------------

// ---- Configuration --------------------------------------------------------

/**
 * How much the demand score contributes to opportunity.
 * Higher = demand-driven markets are weighted more favourably.
 */
const DEMAND_WEIGHT = 0.65;

/**
 * How much the supply score penalises opportunity.
 * Higher = more competitive markets are penalised harder.
 */
const SUPPLY_WEIGHT = 0.45;

/**
 * Base offset to avoid zero-sum collapse when demand is moderate.
 * Represents the "benefit of the doubt" for markets that are neither
 * fully saturated nor fully empty.
 */
const BASE_OFFSET = 15;

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Calculates the composite opportunity score.
 *
 * @param {object} params
 * @param {number} params.demandScore  – 0-100 (higher = stronger demand)
 * @param {number} params.supplyScore  – 0-100 (higher = more competition)
 * @returns {{ opportunityScore: number, opportunityTier: string }}
 */
export function calculateOpportunityScore({ demandScore = 0, supplyScore = 0 }) {
  const raw =
    demandScore * DEMAND_WEIGHT - supplyScore * SUPPLY_WEIGHT + BASE_OFFSET;

  const opportunityScore = Math.min(100, Math.max(0, Math.round(raw)));

  return {
    opportunityScore,
    opportunityTier: resolveOpportunityTier(opportunityScore)
  };
}

/**
 * Maps an opportunity score to a human-readable tier label.
 * Used by the frontend and embedded in the AI context payload.
 *
 * @param {number} score
 * @returns {string}
 */
function resolveOpportunityTier(score) {
  if (score >= 75) return 'High';
  if (score >= 50) return 'Moderate';
  if (score >= 25) return 'Low';
  return 'Very Low';
}
