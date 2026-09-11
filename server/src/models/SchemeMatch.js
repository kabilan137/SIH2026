import mongoose from 'mongoose';

const matchedSchemeSchema = new mongoose.Schema(
  {
    schemeId: { type: mongoose.Schema.Types.ObjectId, ref: 'GovernmentScheme' },
    schemeName: { type: String },
    schemeCode: { type: String },
    matchScore: { type: Number, min: 0, max: 100 },
    eligibilityStatus: {
      type: String,
      enum: ['Potentially Eligible', 'Requires Verification', 'Not Eligible'],
      default: 'Potentially Eligible'
    },
    reasons: { type: [String], default: [] },

    // Calculated financial structure for this scheme
    calculatedProjectCost: { type: Number },
    beneficiaryContribution: { type: Number },
    calculatedLoanAmount: { type: Number },     // raw calculated (margin / 0.10 × 0.90)
    cappedLoanAmount: { type: Number },          // after applying scheme max loan cap
    loanCapApplied: { type: Boolean, default: false },
    interestRate: { type: Number },
    tenureMonths: { type: Number },
    moratoriumMonths: { type: Number },
    monthlyEMI: { type: Number },
    totalInterest: { type: Number },
    totalRepayment: { type: Number }
  },
  { _id: false }
);

const schemeMatchSchema = new mongoose.Schema(
  {
    sessionId: { type: String, required: true, index: true },
    businessProfileId: { type: mongoose.Schema.Types.ObjectId, ref: 'BusinessProfile' },
    analysisId: { type: mongoose.Schema.Types.ObjectId, ref: 'Analysis', default: null },

    // Input snapshot
    inputSnapshot: {
      location: String,
      businessCategory: String,
      availableMargin: Number,
      estimatedProjectCost: Number,
      desiredLoanAmount: Number
    },

    // Scheme matching results
    matchedSchemes: { type: [matchedSchemeSchema], default: [] },
    selectedScheme: { type: matchedSchemeSchema, default: null },
    noSchemeReason: { type: String, default: null }, // message when no scheme matched

    // Full financial structure
    financialStructure: { type: mongoose.Schema.Types.Mixed, default: null },

    // Quarterly repayment schedule
    repaymentSchedule: { type: mongoose.Schema.Types.Mixed, default: null },

    // Project budget breakdown
    projectBudget: { type: mongoose.Schema.Types.Mixed, default: null },

    // Operating cost estimates
    operatingCostEstimates: { type: mongoose.Schema.Types.Mixed, default: null },

    // AI advisory output
    aiExplanation: { type: mongoose.Schema.Types.Mixed, default: null },

    // Feasibility score (deterministic)
    feasibilityScore: { type: Number, min: 0, max: 100, default: null },
    feasibilityBreakdown: { type: mongoose.Schema.Types.Mixed, default: null },

    // Module 1 market data integrated here
    marketData: { type: mongoose.Schema.Types.Mixed, default: null }
  },
  { timestamps: true }
);

schemeMatchSchema.index({ sessionId: 1, createdAt: -1 });

export default mongoose.model('SchemeMatch', schemeMatchSchema);
