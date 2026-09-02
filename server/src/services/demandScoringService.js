// ---------------------------------------------------------------------------
// Demand Scoring Engine — Audience Quality Engine
//
// Replaces the old "Place Count" approach with a quality-weighted,
// distance-decayed, logarithmically-normalised scoring model.
//
// Algorithm:
//   1. For each valid institution in each signal category:
//        contribution = categoryWeight × distanceDecayFactor(institution.distanceMeters)
//   2. Sum all contributions → audienceStrength
//   3. Normalize: demandScore = audienceStrength / (audienceStrength + K) × 100
//      [Michaelis–Menten / hyperbolic formula — never hard-saturates at 100]
//   4. Map score → density band (Very Weak / Weak / Moderate / Strong / Exceptional)
//   5. Surface top-N drivers for score explainability
//
// NO LLM calls. Pure algorithmic scoring.
// ---------------------------------------------------------------------------

import {
  getCategoryConfig,
  getDecayFactor,
  getDensityBand,
  HALF_SATURATION_K
} from '../utils/demandWeights.js';

// Maximum number of top drivers to surface for explainability
const TOP_DRIVERS_COUNT = 5;

// ---------------------------------------------------------------------------
// Internal: per-institution weighted contribution
// ---------------------------------------------------------------------------

/**
 * Calculates the audience strength contribution for a single institution.
 *
 * contribution = categoryWeight × distanceDecayFactor
 *
 * Example:
 *   University (weight=10) at 200m (decay=0.90) → 9.0
 *   Park       (weight=2)  at 4km  (decay=0.30) → 0.6
 */
function institutionContribution(distanceMeters, categoryWeight) {
  const decay = getDecayFactor(distanceMeters);
  return categoryWeight * decay;
}

// ---------------------------------------------------------------------------
// Internal: per-category strength aggregator
// ---------------------------------------------------------------------------

/**
 * Calculates the total audience strength contributed by a single signal category.
 *
 * @param {object} signal – enriched CategorySignal from demandSignalService
 * @returns {{ contribution: number, breakdown: object }}
 */
function scoreCategorySignal(signal) {
  const config = getCategoryConfig(signal.category);
  const weight = signal.weight ?? config.weight;

  if (!signal.validInstitutions || signal.validInstitutions.length === 0) {
    return {
      category: signal.category,
      tier: signal.tier ?? config.tier,
      weight,
      validCount: 0,
      contribution: 0,
      institutions: []
    };
  }

  let contribution = 0;
  const institutions = [];

  for (const inst of signal.validInstitutions) {
    const distM = inst.distanceMeters;
    const decay = getDecayFactor(distM);
    const instContrib = weight * decay;
    contribution += instContrib;

    institutions.push({
      name: inst.name,
      distanceMeters: distM,
      decayFactor: decay,
      contribution: Math.round(instContrib * 100) / 100
    });
  }

  return {
    category: signal.category,
    tier: signal.tier ?? config.tier,
    weight,
    validCount: signal.validInstitutions.length,
    contribution: Math.round(contribution * 100) / 100,
    institutions
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Calculates the Audience Quality demand score from a quality-filtered DemandProfile.
 *
 * @param {object} demandProfile – output of gatherDemandSignals()
 * @returns {DemandScoreResult}
 *
 * @typedef {object} DemandScoreResult
 * @property {number}   demandScore        – 0-100 final demand score
 * @property {number}   audienceStrength   – raw weighted sum before normalization
 * @property {string}   densityBand        – "Very Weak" | "Weak" | "Moderate" | "Strong" | "Exceptional"
 * @property {object}   breakdown          – per-category contribution breakdown
 * @property {object[]} topDrivers         – top N categories by contribution (for explainability)
 * @property {object}   normalization      – formula + constants used
 */
export function calculateDemandScore(demandProfile) {
  const empty = {
    demandScore: 0,
    audienceStrength: 0,
    densityBand: 'Very Weak',
    breakdown: { perCategory: [], totalRawCount: 0, totalValidInstitutions: 0 },
    topDrivers: [],
    normalization: { formula: 'strength / (strength + K) × 100', K: HALF_SATURATION_K }
  };

  if (!demandProfile || !demandProfile.signals || demandProfile.signals.length === 0) {
    return empty;
  }

  // Score each category
  const categoryScores = demandProfile.signals.map(scoreCategorySignal);

  // Total audience strength (sum of all category contributions)
  const audienceStrength = categoryScores.reduce((sum, c) => sum + c.contribution, 0);
  const roundedStrength = Math.round(audienceStrength * 10) / 10;

  // Hyperbolic normalization: strength / (strength + K) × 100
  // This never hard-saturates — a strength of K gives score = 50,
  // approaching 100 asymptotically as strength → ∞
  const demandScore = Math.min(
    100,
    Math.max(0, Math.round((audienceStrength / (audienceStrength + HALF_SATURATION_K)) * 100))
  );

  const densityBand = getDensityBand(demandScore);

  // Build top drivers (sorted by contribution descending)
  const topDrivers = [...categoryScores]
    .filter((c) => c.contribution > 0)
    .sort((a, b) => b.contribution - a.contribution)
    .slice(0, TOP_DRIVERS_COUNT)
    .map((c) => ({
      category: c.category,
      tier: c.tier,
      weight: c.weight,
      validInstitutions: c.validCount,
      contribution: c.contribution,
      // percentage of total strength this driver represents
      sharePercent: roundedStrength > 0
        ? Math.round((c.contribution / roundedStrength) * 100)
        : 0
    }));

  return {
    demandScore,
    audienceStrength: roundedStrength,
    densityBand,
    breakdown: {
      perCategory: categoryScores,
      totalRawCount: demandProfile.totalRawCount ?? null,
      totalValidInstitutions: demandProfile.totalValidInstitutions ?? null,
      categoriesSearched: demandProfile.categoriesSearched ?? null,
      categoriesWithResults: demandProfile.categoriesWithResults ?? null
    },
    topDrivers,
    normalization: {
      formula: 'audienceStrength / (audienceStrength + K) × 100',
      K: HALF_SATURATION_K,
      audienceStrength: roundedStrength,
      demandScore
    }
  };
}
