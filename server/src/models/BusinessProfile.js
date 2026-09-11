import mongoose from 'mongoose';

const businessProfileSchema = new mongoose.Schema(
  {
    sessionId: { type: String, required: true, index: true },

    // Entrepreneur details
    entrepreneurName: { type: String, required: true, trim: true },

    // Detailed location (for Module 2)
    village: { type: String, trim: true, default: '' },
    block: { type: String, trim: true, default: '' },
    district: { type: String, trim: true, default: '' },
    state: { type: String, trim: true, default: '' },
    fullLocationString: { type: String, required: true }, // village, block, district, state

    // Business information
    businessCategory: { type: String, required: true },
    proposedBusiness: { type: String, required: true }, // e.g. "Dairy farm", "Grocery store"
    isExistingBusiness: { type: Boolean, default: false },
    businessExperience: { type: Number, default: 0 }, // in years

    // Financial inputs
    availableMargin: { type: Number, required: true, min: 0 },     // own capital in INR
    desiredLoanAmount: { type: Number, default: null },             // optional desired loan
    estimatedProjectCost: { type: Number, default: null },          // optional user estimate
    expectedMonthlyRevenue: { type: Number, default: null },
    expectedMonthlyExpenses: { type: Number, default: null },
    preferredLoanTenure: { type: Number, default: null },           // in years

    // Optional details
    numberOfEmployees: { type: Number, default: 0 },
    hasShopOrLand: { type: Boolean, default: false },
    existingAssets: { type: String, default: '' },
    expectedRent: { type: Number, default: 0 },                     // monthly rent in INR
    workingCapitalAvailable: { type: Number, default: 0 }
  },
  { timestamps: true }
);

businessProfileSchema.index({ sessionId: 1, createdAt: -1 });

export default mongoose.model('BusinessProfile', businessProfileSchema);
