import mongoose from 'mongoose';

const governmentSchemeSchema = new mongoose.Schema(
  {
    schemeName: { type: String, required: true, trim: true },
    schemeCode: { type: String, required: true, unique: true, trim: true, uppercase: true },
    description: { type: String, required: true },
    targetBeneficiaries: { type: String, default: '' },

    // Business category matching
    businessCategories: { type: [String], default: [] }, // empty = all categories

    // Financial parameters
    minProjectCost: { type: Number, required: true, default: 0 },         // in INR
    maxProjectCost: { type: Number, required: true },                      // in INR
    marginPercentage: { type: Number, required: true },                    // e.g. 10 = 10%
    maxLoanAmount: { type: Number, required: true },                       // in INR
    interestRate: { type: Number, required: true },                        // annual % e.g. 6.5
    tenureYears: { type: Number, required: true },                         // loan tenure in years
    moratoriumMonths: { type: Number, default: 0 },                        // repayment-free period

    // Moratorium treatment: 'interest_only' | 'interest_accrued' | 'emi_deferred' | 'repayment_begins_after'
    moratoriumTreatment: {
      type: String,
      enum: ['interest_only', 'interest_accrued', 'emi_deferred', 'repayment_begins_after'],
      default: 'repayment_begins_after'
    },

    // Repayment frequency
    repaymentFrequency: {
      type: String,
      enum: ['monthly', 'quarterly', 'half_yearly', 'yearly'],
      default: 'monthly'
    },

    // Eligibility criteria (text descriptions for display)
    eligibilityCriteria: { type: [String], default: [] },
    requiredDocuments: { type: [String], default: [] },

    // Geographic/demographic eligibility
    geographicEligibility: { type: String, default: 'All India' },
    ageCriteria: { type: String, default: '' },
    incomeCriteria: { type: String, default: '' },
    categoryCriteria: { type: String, default: '' }, // SC/ST/OBC/General etc.

    // Source information
    source: { type: String, default: '' },
    sourceUrl: { type: String, default: '' },
    lastUpdated: { type: Date, default: Date.now },

    // Status
    active: { type: Boolean, default: true },
    isPrototypeData: { type: Boolean, default: false }
  },
  { timestamps: true }
);

governmentSchemeSchema.index({ active: 1 });
governmentSchemeSchema.index({ minProjectCost: 1, maxProjectCost: 1 });

export default mongoose.model('GovernmentScheme', governmentSchemeSchema);
