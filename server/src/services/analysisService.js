import { saveAnalysisRecord } from '../repositories/analysisRepository.js';
import { discoverCompetitors } from './competitorService.js';
import { getAudienceProfile } from './audienceProfileService.js';
import { gatherDemandSignals } from './demandSignalService.js';
import { calculateDemandScore } from './demandScoringService.js';
import { calculateSupplyScore } from '../utils/supplyScoreEngine.js';
import { calculateOpportunityScore } from './opportunityEngine.js';
import { generateMarketAnalysis } from './mistralService.js';
import { formatAnalysisDocument } from '../utils/responseFormatter.js';
import { updateJob } from './jobTracker.js';

function buildEvidenceWarnings(competitors) {
  const warnings = [];
  const withoutReviews = competitors.filter((competitor) => !competitor.evidence?.reviewsAvailable).length;
  const withoutReviewText = competitors.filter(
    (competitor) => competitor.evidence?.reviewsAvailable && !competitor.evidence?.reviewTextAvailable
  ).length;

  if (withoutReviews > 0) {
    warnings.push(`${withoutReviews} competitor(s) did not include reviews from Google Places.`);
  }

  if (withoutReviewText > 0) {
    warnings.push(`${withoutReviewText} competitor(s) had ratings but no review text from Google Places.`);
  }

  return warnings;
}

/**
 * Full market analysis pipeline:
 *
 * 1. Discover competitors (supply side)
 * 2. Resolve audience categories (cache or Mistral)
 * 3. Gather demand signals via Google Places
 * 4. Calculate Demand Score (pure JS)
 * 5. Calculate Supply Score (pure JS)
 * 6. Calculate Opportunity Score (pure JS)
 * 7. Send all signals to Mistral for interpretation
 * 8. Persist and return formatted result
 */
export async function createMarketAnalysis(input, jobId, clerkId) {
  const onProgress = (progress, status) => {
    if (jobId) {
      updateJob(jobId, { progress, status });
    }
  };

  onProgress(5, 'Geocoding location and searching competitors...');

  // ── Step 1: Supply-side discovery ─────────────────────────────────────────
  const discovery = await discoverCompetitors(input, onProgress);
  const { competitors } = discovery;

  // ── Step 2: Audience Profile (cache or Mistral) ───────────────────────────
  onProgress(50, 'Resolving target audience categories...');
  let audienceCategories = [];
  let audienceCacheHit = false;

  try {
    const audienceResult = await getAudienceProfile(input.businessType, input.niche);
    audienceCategories = audienceResult.audienceCategories;
    audienceCacheHit = audienceResult.cacheHit;
  } catch (error) {
    // Non-fatal: audience profile failure should not abort the whole analysis
    console.warn(
      JSON.stringify({
        message: 'Audience profile generation failed; continuing without demand signals.',
        error: error.message
      })
    );
  }

  // ── Step 3: Demand Signals ────────────────────────────────────────────────
  let demandProfile = {
    signals: [],
    totalSignalCount: 0,
    categoriesSearched: 0,
    categoriesWithResults: 0
  };

  if (audienceCategories.length > 0) {
    try {
      onProgress(60, 'Gathering local demand signals...');
      demandProfile = await gatherDemandSignals(
        {
          coordinates: discovery.search.coordinates,
          audienceCategories,
          radius: input.radius
        },
        (current, total, categoryName) => {
          const pct = 60 + Math.round((current / total) * 20); // 60% to 80%
          onProgress(pct, `Gathering demand signals for: ${categoryName}...`);
        }
      );
    } catch (error) {
      console.warn(
        JSON.stringify({
          message: 'Demand signal gathering failed; continuing with empty demand profile.',
          error: error.message
        })
      );
    }
  }

  // ── Step 4: Demand Score ──────────────────────────────────────────────────
  onProgress(82, 'Synthesizing market intelligence scores...');
  const {
    demandScore,
    audienceStrength,
    densityBand,
    topDrivers,
    breakdown: demandScoreBreakdown
  } = calculateDemandScore(demandProfile);

  // ── Step 5: Supply Score ──────────────────────────────────────────────────
  const { supplyScore, breakdown: supplyScoreBreakdown } = calculateSupplyScore(competitors);

  // ── Step 6: Opportunity Score ─────────────────────────────────────────────
  const { opportunityScore, opportunityTier } = calculateOpportunityScore({
    demandScore,
    supplyScore
  });

  // ── Step 7: Mistral interpretation ───────────────────────────────────────
  onProgress(85, 'Generating final AI market analysis report...');
  const aiResult = await generateMarketAnalysis({
    input,
    competitors,
    audienceCategories,
    demandProfile,
    demandScore,
    supplyScore,
    opportunityScore,
    opportunityTier
  });

  // ── Step 8: Persist ───────────────────────────────────────────────────────
  onProgress(95, 'Finalizing location report and saving data...');
  const savedAnalysis = await saveAnalysisRecord({
    input,
    search: discovery.search,
    competitors,
    aiAnalysis: aiResult.analysis,
    rawAiResponse: aiResult.rawAiResponse,
    audienceCategories,
    demandProfile,
    demandScore,
    audienceStrength,
    demandScoreBreakdown,
    topDrivers,
    densityBand,
    supplyScore,
    supplyScoreBreakdown,
    opportunityScore,
    opportunityTier,
    analysisMetadata: {
      mistral: aiResult.metadata,
      google: discovery.discoveryMetadata,
      evidenceWarnings: buildEvidenceWarnings(competitors),
      audienceCacheHit
    },
    targetId: jobId,
    clerkId
  });

  onProgress(100, 'Analysis complete!');
  return formatAnalysisDocument(savedAnalysis);
}
