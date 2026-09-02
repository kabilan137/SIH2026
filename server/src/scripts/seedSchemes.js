/**
 * seedSchemes.js
 *
 * Seeds the GovernmentScheme collection with prototype scheme data.
 * Run once with: node server/src/scripts/seedSchemes.js
 *
 * Data is labeled as isPrototypeData: true
 * Source: SIH 2026 Problem Statement specifications
 */

import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mongoose from 'mongoose';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '../../../..');

dotenv.config({ path: path.join(projectRoot, '.env') });
dotenv.config({ path: path.join(projectRoot, 'server', '.env') });

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;

if (!MONGO_URI) {
  console.error('❌ MONGO_URI is not set. Cannot seed schemes.');
  process.exit(1);
}

// Inline schema to avoid import issues in standalone script
const governmentSchemeSchema = new mongoose.Schema({
  schemeName: String,
  schemeCode: { type: String, unique: true },
  description: String,
  targetBeneficiaries: String,
  businessCategories: [String],
  minProjectCost: Number,
  maxProjectCost: Number,
  marginPercentage: Number,
  maxLoanAmount: Number,
  interestRate: Number,
  tenureYears: Number,
  moratoriumMonths: Number,
  moratoriumTreatment: String,
  repaymentFrequency: String,
  eligibilityCriteria: [String],
  requiredDocuments: [String],
  geographicEligibility: String,
  ageCriteria: String,
  incomeCriteria: String,
  categoryCriteria: String,
  source: String,
  sourceUrl: String,
  lastUpdated: Date,
  active: Boolean,
  isPrototypeData: Boolean
}, { timestamps: true });

const GovernmentScheme = mongoose.model('GovernmentScheme', governmentSchemeSchema);

const PROTOTYPE_SCHEMES = [
  {
    schemeName: 'Micro Finance Scheme',
    schemeCode: 'MFS',
    description: 'A micro-finance scheme for small entrepreneurs to start or expand a micro-enterprise with project costs up to ₹1.40 lakh. The scheme provides financial support with a beneficiary contribution of approximately 10%, with the agency providing up to 90% funding.',
    targetBeneficiaries: 'Rural and semi-urban micro-entrepreneurs, self-help group members, first-generation entrepreneurs',
    businessCategories: [], // empty = all categories eligible

    // Financial parameters
    minProjectCost: 0,          // INR
    maxProjectCost: 140000,     // ₹1,40,000
    marginPercentage: 10,       // 10% by beneficiary
    maxLoanAmount: 125000,      // ₹1,25,000
    interestRate: 6.5,          // 6.5% per annum
    tenureYears: 3,             // 3 years
    moratoriumMonths: 3,        // 3 months

    moratoriumTreatment: 'repayment_begins_after',
    repaymentFrequency: 'monthly',

    eligibilityCriteria: [
      'Must be an Indian citizen',
      'Age: 18 to 55 years (prototype guideline)',
      'Project cost must not exceed ₹1,40,000',
      'Should not have a defaulter status with any financial institution',
      'Preference to first-generation entrepreneurs, SC/ST/OBC/women beneficiaries',
      'Final eligibility determined by the concerned financing/channelizing agency'
    ],
    requiredDocuments: [
      'Aadhaar Card / Voter ID',
      'Ration Card or Residence proof',
      'Bank account details',
      'Project report (business plan)',
      'Caste/category certificate (if applicable)',
      'Income certificate'
    ],

    geographicEligibility: 'All India — Rural and Semi-Urban areas preferred',
    ageCriteria: '18 to 55 years (prototype)',
    incomeCriteria: 'Below poverty line or low income groups preferred',
    categoryCriteria: 'All categories; preference to SC/ST/OBC/Women/Differently Abled',

    source: 'SIH 2026 Problem Statement (Prototype Data)',
    sourceUrl: '',
    lastUpdated: new Date(),
    active: true,
    isPrototypeData: true
  },
  {
    schemeName: 'Term Loan Scheme',
    schemeCode: 'TLS',
    description: 'A term loan scheme for small and medium entrepreneurs with project costs above ₹1.40 lakh and up to ₹50 lakh. Designed to support entrepreneurs looking to start or expand a business with structured medium-term financing. Beneficiary contributes approximately 10% and the agency finances up to 90%.',
    targetBeneficiaries: 'Rural and semi-urban small entrepreneurs, artisans, small traders, service providers',
    businessCategories: [], // empty = all categories eligible

    // Financial parameters
    minProjectCost: 140001,     // ₹1,40,001 (above Micro Finance ceiling)
    maxProjectCost: 5000000,    // ₹50,00,000
    marginPercentage: 10,       // 10% by beneficiary
    maxLoanAmount: 4500000,     // ₹45,00,000
    interestRate: 8.0,          // 8% per annum
    tenureYears: 7,             // 7 years
    moratoriumMonths: 6,        // 6 months

    moratoriumTreatment: 'repayment_begins_after',
    repaymentFrequency: 'monthly',

    eligibilityCriteria: [
      'Must be an Indian citizen',
      'Age: 18 to 55 years (prototype guideline)',
      'Project cost must be between ₹1,40,001 and ₹50,00,000',
      'Should not have a defaulter status with any financial institution',
      'Viable business plan required',
      'Preference to first-generation entrepreneurs, SC/ST/OBC/women beneficiaries',
      'Final eligibility determined by the concerned financing/channelizing agency'
    ],
    requiredDocuments: [
      'Aadhaar Card / Voter ID',
      'Ration Card or Residence proof',
      'Bank account details',
      'Detailed project report (business plan)',
      'Quotations for equipment/machinery',
      'Caste/category certificate (if applicable)',
      'Income certificate',
      'ITR or financial statements (if available)'
    ],

    geographicEligibility: 'All India — Rural and Semi-Urban areas preferred',
    ageCriteria: '18 to 55 years (prototype)',
    incomeCriteria: 'Low and lower-middle income groups',
    categoryCriteria: 'All categories; preference to SC/ST/OBC/Women/Differently Abled',

    source: 'SIH 2026 Problem Statement (Prototype Data)',
    sourceUrl: '',
    lastUpdated: new Date(),
    active: true,
    isPrototypeData: true
  }
];

async function seedSchemes() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB');

    let seeded = 0;
    let skipped = 0;

    for (const schemeData of PROTOTYPE_SCHEMES) {
      const existing = await GovernmentScheme.findOne({ schemeCode: schemeData.schemeCode });

      if (existing) {
        console.log(`⏭  Scheme "${schemeData.schemeName}" (${schemeData.schemeCode}) already exists — skipping.`);
        skipped++;
        continue;
      }

      await GovernmentScheme.create(schemeData);
      console.log(`✅ Seeded: ${schemeData.schemeName} (${schemeData.schemeCode})`);
      seeded++;
    }

    console.log(`\n📊 Seed complete: ${seeded} seeded, ${skipped} skipped.`);

    // Verify
    const count = await GovernmentScheme.countDocuments({ active: true });
    console.log(`📋 Total active schemes in DB: ${count}`);

    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seed failed:', error.message);
    await mongoose.disconnect();
    process.exit(1);
  }
}

seedSchemes();
