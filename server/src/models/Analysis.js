import mongoose from 'mongoose';

const competitorAssessmentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    rating: { type: Number, default: 0 },
    reviewCount: { type: Number, default: 0 },
    threatLevel: { type: String, required: true },
    strengths: { type: [String], default: [] },
    weaknesses: { type: [String], default: [] }
  },
  { _id: false }
);

const marketAnalysisSchema = new mongoose.Schema(
  {
    competitorDensity: { type: String, required: true },
    entryDifficulty: { type: String, required: true },
    marketSaturation: { type: String, required: true },
    opportunityLevel: { type: String, required: true }
  },
  { _id: false }
);

const recommendationSchema = new mongoose.Schema(
  {
    decision: { type: String, required: true },
    reasoning: { type: [String], default: [] },
    suggestedPositioning: { type: [String], default: [] }
  },
  { _id: false }
);

const analysisSchema = new mongoose.Schema(
  {
    search: { type: mongoose.Schema.Types.ObjectId, ref: 'Search', required: true, index: true },
    competitors: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Competitor' }],
    clerkId: { type: String, required: true, index: true, minlength: 1 },
    input: {
      location: { type: String, required: true },
      businessType: { type: String, required: true },
      niche: String,
      radius: Number,
      maxCompetitors: Number
    },
    overallScore: { type: Number, min: 0, max: 100, required: true },
    grade: { type: String, enum: ['A', 'B', 'C', 'D', 'F'], required: true },
    confidence: { type: String, enum: ['low', 'medium', 'high'], required: true },
    summary: { type: String, required: true },
    competitorAssessment: { type: [competitorAssessmentSchema], default: [] },
    marketAnalysis: { type: marketAnalysisSchema, required: true },
    recommendation: { type: recommendationSchema, required: true },

    // ── Demand Signal Engine fields ────────────────────────────────────────────────────────
    audienceProfile: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AudienceProfile',
      default: null
    },
    audienceCategories: { type: [String], default: [] },
    demandSignals: { type: mongoose.Schema.Types.Mixed, default: null },
    demandScore: { type: Number, min: 0, max: 100, default: null },
    audienceStrength: { type: Number, default: null },
    demandScoreBreakdown: { type: mongoose.Schema.Types.Mixed, default: null },
    topDrivers: { type: mongoose.Schema.Types.Mixed, default: null },
    densityBand: { type: String, default: null },
    supplyScore: { type: Number, min: 0, max: 100, default: null },
    supplyScoreBreakdown: { type: mongoose.Schema.Types.Mixed, default: null },
    opportunityScore: { type: Number, min: 0, max: 100, default: null },
    opportunityTier: { type: String, default: null },

    // ── Extended AI interpretation fields ───────────────────────────────────
    demandAnalysis: { type: String, default: null },
    supplyAnalysis: { type: String, default: null },
    opportunityAnalysis: { type: String, default: null },
    audienceInsights: { type: String, default: null },
    competitorInsights: { type: String, default: null },
    pricingAnalysis: { type: String, default: null },
    
    // ── Premium Strategic Playbook fields ──────────────────────────────
    swotAnalysis: { type: mongoose.Schema.Types.Mixed, default: null },
    financialProjections: { type: mongoose.Schema.Types.Mixed, default: null },
    riskAssessment: { type: mongoose.Schema.Types.Mixed, default: null },
    marketingPlaybook: { type: mongoose.Schema.Types.Mixed, default: null },
    implementationRoadmap: { type: mongoose.Schema.Types.Mixed, default: null },

    rawAiResponse: { type: mongoose.Schema.Types.Mixed },
    analysisMetadata: { type: mongoose.Schema.Types.Mixed }
  },
  { timestamps: true }
);

analysisSchema.index({ createdAt: -1 });
analysisSchema.index({ overallScore: -1 });
// Compound index for efficient per-user history queries: find all docs for a
// clerkId sorted newest-first without a collection scan.
analysisSchema.index({ clerkId: 1, createdAt: -1 });

export default mongoose.model('Analysis', analysisSchema);
