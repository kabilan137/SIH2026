import Analysis from '../models/Analysis.js';
import Competitor from '../models/Competitor.js';
import Search from '../models/Search.js';

/**
 * Persists a full analysis record including all demand/supply/opportunity fields.
 * Preserves the existing structure (search → competitors → analysis).
 */
export async function saveAnalysisRecord({
  input,
  search,
  competitors,
  aiAnalysis,
  rawAiResponse,
  audienceCategories = [],
  demandProfile = null,
  demandScore = null,
  audienceStrength = null,
  demandScoreBreakdown = null,
  topDrivers = null,
  densityBand = null,
  supplyScore = null,
  supplyScoreBreakdown = null,
  opportunityScore = null,
  opportunityTier = null,
  analysisMetadata,
  targetId,
  clerkId
}) {
  const searchDocument = await Search.create({
    ...search,
    status: 'completed',
    completedAt: search.completedAt || new Date()
  });

  try {
    const competitorDocuments = competitors.length
      ? await Competitor.insertMany(
          competitors.map((competitor) => ({
            ...competitor,
            search: searchDocument._id
          })),
          { ordered: true }
        )
      : [];

    // Extract the new AI interpretation fields that now come from Mistral
    const {
      demandAnalysis = null,
      supplyAnalysis = null,
      opportunityAnalysis = null,
      audienceInsights = null,
      competitorInsights = null,
      ...coreAiAnalysis
    } = aiAnalysis;

    const finalPayload = {
      _id: targetId || undefined,
      search: searchDocument._id,
      competitors: competitorDocuments.map((competitor) => competitor._id),
      clerkId,
      input,
      // Core AI fields (overallScore, grade, confidence, summary, etc.)
      ...coreAiAnalysis,
      // Extended AI interpretation fields
      demandAnalysis,
      supplyAnalysis,
      opportunityAnalysis,
      audienceInsights,
      competitorInsights,
      // Demand Signal Engine fields
      audienceCategories,
      demandSignals: demandProfile,
      demandScore,
      audienceStrength,
      demandScoreBreakdown,
      topDrivers,
      densityBand,
      supplyScore,
      supplyScoreBreakdown,
      opportunityScore,
      opportunityTier,
      rawAiResponse,
      analysisMetadata
    };

    // ── Hard boundary guard ─────────────────────────────────────────────────────
    // If clerkId is missing at this point something has broken in the call chain
    // above. Throw immediately instead of writing an ownerless document to Atlas.
    if (!finalPayload.clerkId || typeof finalPayload.clerkId !== 'string' || finalPayload.clerkId.trim() === '') {
      throw new Error(
        `[analysisRepository] saveAnalysisRecord() called with an invalid clerkId: ${JSON.stringify(finalPayload.clerkId)}. ` +
        'Refusing to persist ownerless document to Atlas.'
      );
    }

    // ── Pre-persist audit log ────────────────────────────────────────────────────
    // Verifies in server/Vercel logs that the correct owner ID is being written.
    console.log('=== PERSISTING TO ATLAS WITH OWNER ID ===', {
      clerkId: finalPayload.clerkId,
      targetId: finalPayload._id,
      location: finalPayload.input?.location,
      businessType: finalPayload.input?.businessType
    });

    const analysisDocument = await Analysis.create(finalPayload);

    return findAnalysisById(analysisDocument._id);
  } catch (error) {
    searchDocument.status = 'failed';
    await searchDocument.save().catch(() => undefined);
    throw error;
  }
}

export async function findAnalysisById(id) {
  return Analysis.findById(id).populate('search').populate('competitors').exec();
}
