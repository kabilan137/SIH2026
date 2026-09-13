import mongoose from 'mongoose';

const governmentSchemeSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    ministry: { type: String, default: '' },
    implementingAgency: { type: String, default: '' },
    objective: { type: String, default: '' },

    targetBeneficiaries: { type: [String], default: [] },
    sectors: { type: [String], default: [] },
    locationType: { type: String, default: 'Nationwide' }, // 'Rural', 'Urban', 'Nationwide'

    // Financial parameters
    minProjectCost: { type: Number, default: 0 },        // INR
    maxProjectCost: { type: Number, required: true },     // INR
    minLoanAmount: { type: Number, default: 0 },          // INR
    maxLoanAmount: { type: Number, required: true },       // INR

    subsidy: {
      available: { type: Boolean, default: false },
      subsidyType: { type: String, default: '' },          // e.g. 'Margin Money', 'Capital Subsidy'
      percentage: { type: Number, default: 0 }       // e.g. 15 = 15%
    },

    beneficiaryContribution: {
      percentage: { type: Number, default: 10 }      // e.g. 10 = 10%
    },

    interestRate: {
      value: { type: Number, required: true },        // e.g. 6.5
      unit: { type: String, default: 'percent_per_annum' }
    },

    tenure: {
      value: { type: Number, required: true },        // e.g. 3 (years) or 36 (months)
      unit: { type: String, default: 'years' }        // 'years' | 'months'
    },

    moratorium: {
      value: { type: Number, default: 0 },            // e.g. 3
      unit: { type: String, default: 'months' }       // 'months' | 'years'
    },

    collateralRequired: { type: Boolean, default: false },

    eligibility: { type: [String], default: [] },
    requiredDocuments: { type: [String], default: [] },

    applicationMethod: { type: String, default: 'Online / Through Implementing Agency' },
    applicationUrl: { type: String, default: '' },
    benefits: { type: [String], default: [] },

    // ── Recommendation / matching fields ─────────────────────────────────────
    suitableBusinessTypes: { type: [String], default: [] },
    ruralEligible: { type: Boolean, default: true },

    categoryBenefits: {
      SC: { type: String, default: '' },
      ST: { type: String, default: '' },
      women: { type: String, default: '' },
      differentlyAbled: { type: String, default: '' }
    },

    requiredOwnInvestment: { type: Number, default: 0 },  // absolute INR (0 = no fixed requirement)
    repaymentCapacityCriteria: { type: String, default: '' },

    source: {
      name: { type: String, default: '' },
      url: { type: String, default: '' },
      verifiedAt: { type: String, default: '' }      // ISO date string
    },

    // Status
    active: { type: Boolean, default: true },
    lastVerifiedAt: { type: String, default: '' }     // ISO date string e.g. '2026-09-13'
  },
  { timestamps: true }
);

governmentSchemeSchema.index({ active: 1 });
governmentSchemeSchema.index({ minProjectCost: 1, maxProjectCost: 1 });
governmentSchemeSchema.index({ suitableBusinessTypes: 1 });
governmentSchemeSchema.index({ ruralEligible: 1 });

export default mongoose.model('GovernmentScheme', governmentSchemeSchema);
