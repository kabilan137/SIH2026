/**
 * seedSchemes.js
 *
 * Seeds the GovernmentScheme collection with synthetic scheme data
 * modelled on real Government of India schemes.
 *
 * Run with: node server/src/scripts/seedSchemes.js
 *
 * WARNING: This script WIPES the existing GovernmentScheme collection before seeding.
 */

import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mongoose from 'mongoose';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '../../..');

dotenv.config({ path: path.join(projectRoot, '.env') });
dotenv.config({ path: path.join(projectRoot, 'server', '.env') });

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;

if (!MONGO_URI) {
  console.error('❌ MONGO_URI is not set. Cannot seed schemes.');
  process.exit(1);
}

// Inline schema to avoid import issues in standalone script
const schemeSchema = new mongoose.Schema({
  name: String,
  ministry: String,
  implementingAgency: String,
  objective: String,
  targetBeneficiaries: [String],
  sectors: [String],
  locationType: String,
  minProjectCost: Number,
  maxProjectCost: Number,
  minLoanAmount: Number,
  maxLoanAmount: Number,
  subsidy: { available: Boolean, subsidyType: String, percentage: Number },
  beneficiaryContribution: { percentage: Number },
  interestRate: { value: Number, unit: String },
  tenure: { value: Number, unit: String },
  moratorium: { value: Number, unit: String },
  collateralRequired: Boolean,
  eligibility: [String],
  requiredDocuments: [String],
  applicationMethod: String,
  applicationUrl: String,
  benefits: [String],
  suitableBusinessTypes: [String],
  ruralEligible: Boolean,
  categoryBenefits: { SC: String, ST: String, women: String, differentlyAbled: String },
  requiredOwnInvestment: Number,
  repaymentCapacityCriteria: String,
  source: { name: String, url: String, verifiedAt: String },
  active: Boolean,
  lastVerifiedAt: String
}, { timestamps: true });

const GovernmentScheme = mongoose.model('GovernmentScheme', schemeSchema);

const SCHEMES = [
  // ── 1. MUDRA Shishu ──────────────────────────────────────────────────────
  {
    name: 'MUDRA Shishu Loan (PM SVANidhi / Pradhan Mantri MUDRA Yojana)',
    ministry: 'Ministry of Finance',
    implementingAgency: 'Micro Units Development & Refinance Agency Ltd. (MUDRA), Public Sector Banks, MFIs, NBFCs',
    objective: 'Provide collateral-free micro loans up to ₹50,000 to micro-entrepreneurs and self-employed individuals to start or expand very small income-generating activities.',
    targetBeneficiaries: ['Micro-entrepreneurs', 'Self-employed individuals', 'Street vendors', 'Small artisans', 'Women'],
    sectors: ['Manufacturing', 'Services', 'Trading', 'Food Processing'],
    locationType: 'Nationwide',
    minProjectCost: 0,
    maxProjectCost: 60000,
    minLoanAmount: 1000,
    maxLoanAmount: 50000,
    subsidy: { available: false, subsidyType: '', percentage: 0 },
    beneficiaryContribution: { percentage: 10 },
    interestRate: { value: 9.5, unit: 'percent_per_annum' },
    tenure: { value: 5, unit: 'years' },
    moratorium: { value: 3, unit: 'months' },
    collateralRequired: false,
    eligibility: [
      'Indian citizen aged 18 years and above',
      'Non-farm income-generating activity (manufacturing, trading, services)',
      'Not a defaulter with any bank/NBFC',
      'Project cost should not exceed ₹60,000',
      'No minimum income requirement'
    ],
    requiredDocuments: [
      'Aadhaar Card (identity and address proof)',
      'PAN Card',
      'Passport-size photographs (2)',
      'Business address proof (if applicable)',
      'Quotations for equipment/machinery (if applicable)',
      'Caste/community certificate (if applicable)'
    ],
    applicationMethod: 'Through partner banks, MFIs, NBFCs, or online at udyamimitra.in',
    applicationUrl: 'https://www.udyamimitra.in',
    benefits: [
      'Collateral-free loan up to ₹50,000',
      'Low interest rates compared to money lenders',
      'Flexible repayment up to 5 years',
      'Moratorium of 3 months for new businesses',
      'MUDRA card for working capital needs'
    ],
    suitableBusinessTypes: [
      'Street Food Vendor', 'Tea Stall', 'Vegetable Vendor', 'Small Grocery Store',
      'Tailoring', 'Beauty Parlour', 'Barber Shop', 'Mobile Repair', 'Cycle Repair',
      'Pottery', 'Handloom Weaving', 'Agarbatti Making', 'Papad Making'
    ],
    ruralEligible: true,
    categoryBenefits: {
      SC: 'Priority processing; special camps organized by banks for SC beneficiaries',
      ST: 'Priority processing; liaison with tribal cooperative banks',
      women: 'Lower interest rates offered by many partner banks; priority in MUDRA loan fairs',
      differentlyAbled: 'Eligible on par with general category; some states offer additional subsidy'
    },
    requiredOwnInvestment: 5000,
    repaymentCapacityCriteria: 'Monthly revenue of at least 1.5x the EMI required for comfortable repayment',
    source: {
      name: 'MUDRA Official Website',
      url: 'https://www.mudra.org.in',
      verifiedAt: '2026-09-13'
    },
    active: true,
    lastVerifiedAt: '2026-09-13'
  },

  // ── 2. MUDRA Kishor ───────────────────────────────────────────────────────
  {
    name: 'MUDRA Kishor Loan (Pradhan Mantri MUDRA Yojana)',
    ministry: 'Ministry of Finance',
    implementingAgency: 'MUDRA Ltd., Public Sector Banks, Regional Rural Banks, MFIs, NBFCs, SFBs',
    objective: 'Extend credit support of ₹50,001 to ₹5,00,000 to micro enterprises that have graduated from the Shishu stage or need mid-level funding for expansion.',
    targetBeneficiaries: ['Micro-entrepreneurs', 'Growing small businesses', 'Women entrepreneurs', 'Rural traders', 'Artisans'],
    sectors: ['Manufacturing', 'Services', 'Trading', 'Agriculture Allied', 'Food Processing'],
    locationType: 'Nationwide',
    minProjectCost: 50001,
    maxProjectCost: 600000,
    minLoanAmount: 50001,
    maxLoanAmount: 500000,
    subsidy: { available: false, subsidyType: '', percentage: 0 },
    beneficiaryContribution: { percentage: 10 },
    interestRate: { value: 10.5, unit: 'percent_per_annum' },
    tenure: { value: 7, unit: 'years' },
    moratorium: { value: 6, unit: 'months' },
    collateralRequired: false,
    eligibility: [
      'Indian citizen aged 18–65 years',
      'Non-farm income-generating micro enterprise',
      'Viable business plan with demonstrated income potential',
      'Clean credit history; no NPA with any bank',
      'Project cost between ₹50,001 and ₹6,00,000'
    ],
    requiredDocuments: [
      'Aadhaar Card and PAN Card',
      'Bank statements (last 6 months)',
      'Business plan / project report',
      'Proof of business existence (if existing)',
      'Quotations for machinery/equipment',
      'Caste certificate (if applicable)',
      'Rent agreement / shop ownership proof (if applicable)'
    ],
    applicationMethod: 'Through partner banks, RRBs, NBFCs, or at udyamimitra.in',
    applicationUrl: 'https://www.udyamimitra.in',
    benefits: [
      'Loan between ₹50,001 and ₹5,00,000',
      'No collateral required',
      'Repayment period up to 7 years',
      'Moratorium of 6 months on principal',
      'Working capital and term loan components available'
    ],
    suitableBusinessTypes: [
      'Small Restaurant', 'Catering Business', 'Grocery Wholesale', 'Dairy Business',
      'Small Bakery', 'Garment Manufacturing', 'Furniture Making', 'Electronics Repair',
      'Computer Training Center', 'Pharmacy', 'Textile Trading', 'Auto Repair Workshop',
      'Photography Studio', 'Plumbing & Electrical Services', 'Small Hotel / Lodge'
    ],
    ruralEligible: true,
    categoryBenefits: {
      SC: '25% of MUDRA lending target earmarked for SC/ST; preference in govt loan fairs',
      ST: 'Preferential treatment; linkage with tribal cooperative finance corporations',
      women: 'Many banks offer 0.25–0.50% lower interest rates; Mahila Shakti Kendra assistance',
      differentlyAbled: 'Eligible; NHFDC also provides concessional top-up loans'
    },
    requiredOwnInvestment: 50000,
    repaymentCapacityCriteria: 'Net monthly income of at least 2x the monthly EMI; business must be viable',
    source: {
      name: 'MUDRA Official Website',
      url: 'https://www.mudra.org.in',
      verifiedAt: '2026-09-13'
    },
    active: true,
    lastVerifiedAt: '2026-09-13'
  },

  // ── 3. MUDRA Tarun ────────────────────────────────────────────────────────
  {
    name: 'MUDRA Tarun Loan (Pradhan Mantri MUDRA Yojana)',
    ministry: 'Ministry of Finance',
    implementingAgency: 'MUDRA Ltd., Scheduled Commercial Banks, Small Finance Banks, NBFCs',
    objective: 'Provide credit of ₹5,00,001 to ₹10,00,000 to established micro and small enterprises with proven track record for business expansion and modernization.',
    targetBeneficiaries: ['Established micro-entrepreneurs', 'Small business owners', 'Women-owned enterprises', 'Artisans with scale'],
    sectors: ['Manufacturing', 'Services', 'Trading', 'Food Processing', 'Agri-processing'],
    locationType: 'Nationwide',
    minProjectCost: 500001,
    maxProjectCost: 1200000,
    minLoanAmount: 500001,
    maxLoanAmount: 1000000,
    subsidy: { available: false, subsidyType: '', percentage: 0 },
    beneficiaryContribution: { percentage: 10 },
    interestRate: { value: 11.5, unit: 'percent_per_annum' },
    tenure: { value: 7, unit: 'years' },
    moratorium: { value: 6, unit: 'months' },
    collateralRequired: false,
    eligibility: [
      'Indian citizen aged 18–65 years',
      'Established micro/small enterprise with minimum 1 year of operation',
      'Clear repayment history; no NPA or wilful default',
      'Viable expansion plan with projected cash flows',
      'Project cost between ₹5,00,001 and ₹12,00,000'
    ],
    requiredDocuments: [
      'Aadhaar Card and PAN Card',
      'Bank statements (last 12 months)',
      'Detailed project report with financials',
      'ITR or audited accounts (last 2 years if available)',
      'Proof of business registration (GST, trade licence, Udyam certificate)',
      'Quotations for expansion equipment/machinery',
      'Caste certificate (if applicable)'
    ],
    applicationMethod: 'Through scheduled commercial banks and SFBs; apply at udyamimitra.in',
    applicationUrl: 'https://www.udyamimitra.in',
    benefits: [
      'Loan between ₹5,00,001 and ₹10,00,000',
      'No collateral up to ₹10 lakh under CGTMSE guarantee',
      'Longer tenure up to 7 years',
      'Access to bank credit for MSMEs',
      'Helps graduate from informal to formal finance'
    ],
    suitableBusinessTypes: [
      'Medium Restaurant / Dhaba', 'Garment Export Unit', 'Cold Storage', 'Printing Press',
      'Agro-processing Unit', 'Spice Manufacturing', 'Building Materials Trading',
      'Automobile Service Center', 'Educational Institute', 'Fitness Center / Gym',
      'Diagnostic Lab', 'IT Services Firm', 'Logistics / Mini Transport'
    ],
    ruralEligible: true,
    categoryBenefits: {
      SC: 'Priority lending; 18% of Tarun loans targeted for SC/ST borrowers',
      ST: 'Coordination with State Finance Corporations for tribal enterprises',
      women: 'Interest subvention of 2% under Mahila Udyam Nidhi in select states',
      differentlyAbled: 'NHFDC concessional refinance available for PwD entrepreneurs'
    },
    requiredOwnInvestment: 500000,
    repaymentCapacityCriteria: 'DSCR ≥ 1.25; net monthly profit should cover EMI with 25% buffer',
    source: {
      name: 'MUDRA Official Website',
      url: 'https://www.mudra.org.in',
      verifiedAt: '2026-09-13'
    },
    active: true,
    lastVerifiedAt: '2026-09-13'
  },

  // ── 4. PMEGP ──────────────────────────────────────────────────────────────
  {
    name: 'Prime Minister\'s Employment Generation Programme (PMEGP)',
    ministry: 'Ministry of MSME',
    implementingAgency: 'Khadi and Village Industries Commission (KVIC), State KVIB, District Industries Centres (DICs)',
    objective: 'Generate employment opportunities in rural and urban areas by setting up new micro-enterprises and providing margin money (subsidy) to reduce the effective cost of the loan.',
    targetBeneficiaries: ['Unemployed youth', 'Rural entrepreneurs', 'Women', 'SC/ST/OBC', 'Traditional artisans', 'Minorities', 'Ex-servicemen', 'PHC beneficiaries'],
    sectors: ['Manufacturing', 'Services', 'Agriculture Allied', 'Food Processing', 'Textile', 'Wood Products', 'Mineral-based'],
    locationType: 'Nationwide',
    minProjectCost: 100000,
    maxProjectCost: 5000000,
    minLoanAmount: 80000,
    maxLoanAmount: 4500000,
    subsidy: {
      available: true,
      type: 'Margin Money (Capital Subsidy)',
      percentage: 25   // General: 15% Urban, 25% Rural; SC/ST/Women/PHC: 25% Urban, 35% Rural — using 25% as base
    },
    beneficiaryContribution: { percentage: 10 },
    interestRate: { value: 11.0, unit: 'percent_per_annum' },
    tenure: { value: 7, unit: 'years' },
    moratorium: { value: 6, unit: 'months' },
    collateralRequired: false,
    eligibility: [
      'Indian citizen aged 18 years and above',
      'Minimum 8th grade pass for projects above ₹10 lakh (manufacturing) or ₹5 lakh (service)',
      'New unit only (existing businesses not eligible)',
      'No income ceiling for beneficiary',
      'Only one person from a family is eligible',
      'Self-help groups, charitable trusts, co-operative societies also eligible'
    ],
    requiredDocuments: [
      'Aadhaar Card and PAN Card',
      'Educational qualification certificates',
      'Special category certificate (SC/ST/OBC/Women/PHC/Ex-serviceman)',
      'Detailed project report',
      'EDP (Entrepreneurship Development Programme) training certificate',
      'Bank account details',
      'Photographs (2 passport size)'
    ],
    applicationMethod: 'Online via kviconline.gov.in; offline at KVIC/KVIB/DIC offices',
    applicationUrl: 'https://www.kviconline.gov.in/pmegpeportal',
    benefits: [
      'Margin Money (Subsidy): 15–35% of project cost depending on location and category',
      'Urban General: 15% subsidy; Rural General: 25% subsidy',
      'Urban Special (SC/ST/Women/PHC/NE): 25% subsidy; Rural Special: 35% subsidy',
      'No collateral up to ₹10 lakh under CGTMSE',
      'EDP training provided free of cost'
    ],
    suitableBusinessTypes: [
      'Food Processing Unit', 'Bakery / Confectionery', 'Tailoring / Garment Making',
      'Handloom / Poweroom', 'Leather Products', 'Paper Products', 'Wood Products',
      'Agro-processing', 'Pickle / Jam / Juice Making', 'Candle Making',
      'Beauty Parlour / Salon', 'Two-Wheeler Repair Workshop', 'Computer / DTP Centre',
      'Readymade Garments Shop', 'Soap / Detergent Making', 'Papad / Appalam Making',
      'Incense Stick (Agarbatti) Making', 'Mineral Water Plant', 'Ice Cream Making'
    ],
    ruralEligible: true,
    categoryBenefits: {
      SC: '25% subsidy in urban areas (vs 15% for general); 35% in rural areas',
      ST: '25% subsidy in urban areas; 35% in rural areas; priority in tribal districts',
      women: '25% subsidy in urban areas; 35% in rural areas; SHG women also eligible',
      differentlyAbled: '25% subsidy in urban areas; 35% in rural areas (PHC category)'
    },
    requiredOwnInvestment: 100000,
    repaymentCapacityCriteria: 'Business must generate net monthly income ≥ 1.5x EMI after margin money adjustment',
    source: {
      name: 'KVIC PMEGP Portal',
      url: 'https://www.kviconline.gov.in/pmegpeportal',
      verifiedAt: '2026-09-13'
    },
    active: true,
    lastVerifiedAt: '2026-09-13'
  },

  // ── 5. Stand-Up India ─────────────────────────────────────────────────────
  {
    name: 'Stand-Up India Scheme',
    ministry: 'Ministry of Finance, Department of Financial Services',
    implementingAgency: 'Scheduled Commercial Banks (SCBs), SIDBI, NABARD',
    objective: 'Facilitate bank loans between ₹10 lakh and ₹1 crore to at least one SC/ST borrower and one woman borrower per bank branch for setting up Greenfield enterprises in manufacturing, services, trading, or agri-allied sector.',
    targetBeneficiaries: ['SC/ST entrepreneurs', 'Women entrepreneurs'],
    sectors: ['Manufacturing', 'Services', 'Trading', 'Agriculture Allied'],
    locationType: 'Nationwide',
    minProjectCost: 1000000,
    maxProjectCost: 12000000,
    minLoanAmount: 1000000,
    maxLoanAmount: 10000000,
    subsidy: { available: false, subsidyType: '', percentage: 0 },
    beneficiaryContribution: { percentage: 10 },
    interestRate: { value: 9.0, unit: 'percent_per_annum' },
    tenure: { value: 7, unit: 'years' },
    moratorium: { value: 18, unit: 'months' },
    collateralRequired: false,
    eligibility: [
      'SC/ST or Women entrepreneur aged 18 years and above',
      'Greenfield project (first enterprise in manufacturing, services, trading, or agri-allied)',
      'Not in default to any bank or financial institution',
      'In case of non-individual enterprises, 51% shareholding and controlling stake by SC/ST or woman entrepreneur',
      'Composite loan (term loan + working capital) between ₹10 lakh and ₹1 crore'
    ],
    requiredDocuments: [
      'Aadhaar Card and PAN Card',
      'Caste certificate (for SC/ST applicants)',
      'Detailed project report with financial projections',
      'Proof of business address',
      'Bank statements (last 6 months)',
      'Property documents (if any collateral offered)',
      'Udyam Registration certificate (if available)',
      'Partnership deed / memorandum (if applicable)'
    ],
    applicationMethod: 'Apply online at standupmitra.in or directly at bank branch',
    applicationUrl: 'https://www.standupmitra.in',
    benefits: [
      'Composite loan (term + working capital) of ₹10L–₹1Cr',
      'Moratorium of 18 months on principal repayment',
      'RuPay debit card for working capital access',
      'No collateral — CGTMSE guarantee coverage',
      'Handholding support and mentorship through Stand-Up India Connect'
    ],
    suitableBusinessTypes: [
      'Medium Manufacturing Unit', 'Apparel Export House', 'Agri-processing Plant',
      'Engineering Workshop', 'Chemical / Pharmaceutical Unit', 'Plastic Products',
      'Healthcare Clinic', 'Educational Academy', 'IT Solutions Company',
      'Wholesale Trading Business', 'Cold Chain / Logistics', 'Hotel / Guest House'
    ],
    ruralEligible: true,
    categoryBenefits: {
      SC: 'Primary target beneficiary; every SCB branch must give at least 1 loan to SC/ST',
      ST: 'Primary target beneficiary; handholding support through TRIFED and tribal finance corps',
      women: 'Primary target beneficiary; every SCB branch must give at least 1 loan to woman borrower',
      differentlyAbled: 'Eligible if they fall under SC/ST or women category; NHFDC tie-ups'
    },
    requiredOwnInvestment: 1000000,
    repaymentCapacityCriteria: 'DSCR ≥ 1.25; net annual revenue must cover annual repayment + operating costs',
    source: {
      name: 'Stand-Up India Official Portal',
      url: 'https://www.standupmitra.in',
      verifiedAt: '2026-09-13'
    },
    active: true,
    lastVerifiedAt: '2026-09-13'
  },

  // ── 6. NULM SEP-I ─────────────────────────────────────────────────────────
  {
    name: 'National Urban Livelihoods Mission — Self-Employment Programme for Individuals (NULM SEP-I)',
    ministry: 'Ministry of Housing and Urban Affairs',
    implementingAgency: 'State Urban Livelihoods Missions (SULM), Urban Local Bodies (ULBs), Channelizing Banks',
    objective: 'Provide interest-subsidized loans and skill training to urban poor individuals to start micro-enterprises and generate self-employment in urban areas.',
    targetBeneficiaries: ['Urban poor', 'Urban street vendors', 'Urban women', 'Urban homeless', 'Urban SC/ST', 'Urban minorities'],
    sectors: ['Services', 'Trading', 'Manufacturing', 'Food Processing'],
    locationType: 'Urban',
    minProjectCost: 0,
    maxProjectCost: 250000,
    minLoanAmount: 10000,
    maxLoanAmount: 200000,
    subsidy: {
      available: true,
      type: 'Interest Subsidy',
      percentage: 7   // 7% interest subvention — effective rate ~4% on bank rate of ~11%
    },
    beneficiaryContribution: { percentage: 5 },
    interestRate: { value: 7.0, unit: 'percent_per_annum' },
    tenure: { value: 5, unit: 'years' },
    moratorium: { value: 3, unit: 'months' },
    collateralRequired: false,
    eligibility: [
      'Urban poor aged 18 years and above',
      'Residing in urban area (urban local body jurisdiction)',
      'Below Poverty Line (BPL) or marginalised category preferred',
      'Project cost up to ₹2,00,000 for individuals',
      'No default with any bank',
      'SHG member beneficiaries given preference'
    ],
    requiredDocuments: [
      'Aadhaar Card (address must be in urban area)',
      'BPL card or income certificate',
      'Bank passbook / account details',
      'Project report / business plan',
      'Caste certificate (if applicable)',
      'Photographs (2 passport size)'
    ],
    applicationMethod: 'Through Urban Local Bodies (ULBs), SULM offices, or designated banks',
    applicationUrl: 'https://nulm.gov.in',
    benefits: [
      'Loan up to ₹2,00,000 for individuals',
      '7% interest subvention (effective rate significantly lower)',
      'No collateral required',
      'Skill training provided under NULM',
      'SHG formation and group-based credit also available'
    ],
    suitableBusinessTypes: [
      'Street Food Cart', 'Snacks & Beverages', 'Vegetable / Fruit Cart', 'Flower Stall',
      'Mobile Repair & Accessories', 'Small Boutique / Tailoring', 'Hair Salon',
      'Laundry / Ironing Service', 'Domestic Appliance Repair', 'Rickshaw / E-Vehicle',
      'Scrap / Waste Collection & Resale', 'Small Grocery Kiosk'
    ],
    ruralEligible: false,
    categoryBenefits: {
      SC: 'Prioritized in loan fairs; ULBs must ensure minimum 50% SC/ST/Minority coverage',
      ST: 'Priority coverage under NULM tribal special components in ST-dominant urban areas',
      women: 'Preference in loan disbursement; SHG women receive group-based credit up to ₹10L',
      differentlyAbled: 'State governments provide additional subsidy in many cases'
    },
    requiredOwnInvestment: 10000,
    repaymentCapacityCriteria: 'Net daily / monthly earnings must be sufficient to pay EMI; typically ₹500–₹4000/month',
    source: {
      name: 'National Urban Livelihoods Mission (NULM)',
      url: 'https://nulm.gov.in',
      verifiedAt: '2026-09-13'
    },
    active: true,
    lastVerifiedAt: '2026-09-13'
  },

  // ── 7. DAY-NRLM SVEP ──────────────────────────────────────────────────────
  {
    name: 'DAY-NRLM — Start-up Village Entrepreneurship Programme (SVEP)',
    ministry: 'Ministry of Rural Development',
    implementingAgency: 'State Rural Livelihoods Missions (SRLMs), Self-Help Groups, Block Resource Centres (BRC)',
    objective: 'Promote rural entrepreneurship among SHG members by providing concessional loans, enterprise facilitation, and handholding support to set up community enterprises at the village/block level.',
    targetBeneficiaries: ['SHG members', 'Rural poor women', 'Landless rural households', 'Rural SC/ST', 'Rural youth'],
    sectors: ['Agriculture Allied', 'Food Processing', 'Manufacturing', 'Services', 'Trading'],
    locationType: 'Rural',
    minProjectCost: 0,
    maxProjectCost: 150000,
    minLoanAmount: 5000,
    maxLoanAmount: 100000,
    subsidy: {
      available: true,
      type: 'Community Enterprise Fund (Interest Subvention)',
      percentage: 5
    },
    beneficiaryContribution: { percentage: 10 },
    interestRate: { value: 7.0, unit: 'percent_per_annum' },
    tenure: { value: 3, unit: 'years' },
    moratorium: { value: 3, unit: 'months' },
    collateralRequired: false,
    eligibility: [
      'Member of an SHG (Self-Help Group) linked to DAY-NRLM',
      'Household in rural area',
      'Viable micro-enterprise plan prepared with BRC support',
      'Not in default with SHG or bank',
      'Project cost should be up to ₹1,50,000',
      'Income of applicant household should be below poverty line or marginalized'
    ],
    requiredDocuments: [
      'Aadhaar Card',
      'SHG membership certificate / passbook',
      'Bank account (preferably SHG-linked account)',
      'Enterprise plan (prepared with CRP/BRC support)',
      'Caste certificate (if applicable)',
      'BPL card or income certificate'
    ],
    applicationMethod: 'Through SHG / Block Resource Centre (BRC) under SRLM; no direct online portal',
    applicationUrl: 'https://aajeevika.gov.in',
    benefits: [
      'Concessional loan up to ₹1,00,000',
      'Interest subvention reducing effective rate to ~7%',
      'No collateral required (SHG guarantee)',
      'Enterprise facilitation and mentoring by Community Resource Persons (CRP)',
      'Linkage to government markets and e-commerce platforms'
    ],
    suitableBusinessTypes: [
      'Papad / Pickle Making', 'Incense Stick (Agarbatti) Making', 'Candle Making',
      'Dairy Farming (small scale)', 'Poultry (Backyard)', 'Goat Rearing',
      'Vegetable Cultivation', 'Mushroom Cultivation', 'Handloom Weaving',
      'Broom / Basket Making', 'Leaf Plate Making', 'Honey Production',
      'Village Grocery Store', 'Small Flour Mill', 'Tailoring / Embroidery'
    ],
    ruralEligible: true,
    categoryBenefits: {
      SC: 'Dalits prioritized under SVEP; dedicated CRP support; priority in Community Investment Fund',
      ST: 'Tribal SHGs given priority; convergence with TRIFED for marketing support',
      women: 'Programme is primarily women-centric; all SHGs under NRLM are women SHGs',
      differentlyAbled: 'Eligible if SHG member; some states have dedicated SHGs for PwD women'
    },
    requiredOwnInvestment: 10000,
    repaymentCapacityCriteria: 'Enterprise should generate net monthly income ≥ ₹2,000 above household expenses',
    source: {
      name: 'Aajeevika / DAY-NRLM Official Website',
      url: 'https://aajeevika.gov.in',
      verifiedAt: '2026-09-13'
    },
    active: true,
    lastVerifiedAt: '2026-09-13'
  },

  // ── 8. CGTMSE Term Loan (SME) ─────────────────────────────────────────────
  {
    name: 'CGTMSE — Credit Guarantee Scheme for Micro and Small Enterprises (Term Loan)',
    ministry: 'Ministry of MSME',
    implementingAgency: 'Credit Guarantee Fund Trust for Micro and Small Enterprises (CGTMSE), SIDBI, Member Lending Institutions (MLIs)',
    objective: 'Enable collateral-free credit to new and existing micro and small enterprises by providing credit guarantee cover to lending institutions, reducing the credit risk for banks and NBFCs.',
    targetBeneficiaries: ['Micro enterprises', 'Small enterprises', 'Women entrepreneurs', 'First-generation entrepreneurs', 'Startups'],
    sectors: ['Manufacturing', 'Services', 'Retail', 'Trading', 'Technology'],
    locationType: 'Nationwide',
    minProjectCost: 200000,
    maxProjectCost: 25000000,
    minLoanAmount: 100000,
    maxLoanAmount: 20000000,
    subsidy: { available: false, subsidyType: '', percentage: 0 },
    beneficiaryContribution: { percentage: 15 },
    interestRate: { value: 12.0, unit: 'percent_per_annum' },
    tenure: { value: 10, unit: 'years' },
    moratorium: { value: 6, unit: 'months' },
    collateralRequired: false,
    eligibility: [
      'New or existing micro/small enterprise in manufacturing or service sector',
      'Loan up to ₹2 crore (guarantee cover available)',
      'Must obtain loan from a CGTMSE Member Lending Institution (MLI)',
      'No wilful default or NPA status',
      'Business must be non-farm sector activity',
      'Retail trade enterprises eligible up to ₹1 crore'
    ],
    requiredDocuments: [
      'Aadhaar Card and PAN Card',
      'Udyam Registration Certificate',
      'Detailed project report with financial projections',
      'Audited financials (last 2–3 years for existing businesses)',
      'Bank statements (last 12 months)',
      'GST returns (last 4 quarters)',
      'Proof of business premises (rent deed or ownership)',
      'Quotations for capital expenditure'
    ],
    applicationMethod: 'Apply at any Member Lending Institution (MLI) bank branch; CGTMSE guarantee is automatic',
    applicationUrl: 'https://www.cgtmse.in',
    benefits: [
      'Credit guarantee up to 75–85% of loan amount to the bank',
      'No collateral or third-party guarantee required',
      'Loan up to ₹2 crore with guarantee coverage',
      'Tenure up to 10 years for term loans',
      'Enables access to formal bank credit for first-time borrowers'
    ],
    suitableBusinessTypes: [
      'Medium Restaurant / Cloud Kitchen', 'Logistics Company', 'IT Services',
      'Engineering Workshop', 'Plastic / Packaging Unit', 'Metal Fabrication',
      'Furniture Manufacturer', 'Readymade Garments Export', 'Diagnostic Centre',
      'Pharmacy Chain', 'E-commerce Startup', 'Training Institute',
      'Events Management', 'Printing & Publishing House'
    ],
    ruralEligible: true,
    categoryBenefits: {
      SC: 'Guarantee fee reduced by 10 bps for loans to SC/ST-owned enterprises',
      ST: 'Same concessional guarantee fee as SC; priority under tribal sub-plan',
      women: 'Annual guarantee fee of 0.75% (vs 1% for others) for women-owned MSEs',
      differentlyAbled: 'Eligible on par; NHFDC provides concessional refinance to MLIs for PwD borrowers'
    },
    requiredOwnInvestment: 200000,
    repaymentCapacityCriteria: 'DSCR ≥ 1.25 required by most MLIs; net cash accrual must cover annual loan repayment',
    source: {
      name: 'CGTMSE Official Website',
      url: 'https://www.cgtmse.in',
      verifiedAt: '2026-09-13'
    },
    active: true,
    lastVerifiedAt: '2026-09-13'
  }
];

async function seedSchemes() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // Wipe existing schemes to avoid schema conflicts
    const deleteResult = await GovernmentScheme.deleteMany({});
    console.log(`🗑  Wiped ${deleteResult.deletedCount} existing scheme(s) from collection`);

    let seeded = 0;
    for (const schemeData of SCHEMES) {
      await GovernmentScheme.create(schemeData);
      console.log(`✅ Seeded: ${schemeData.name}`);
      seeded++;
    }

    console.log(`\n📊 Seed complete: ${seeded} schemes seeded.`);

    const count = await GovernmentScheme.countDocuments({ active: true });
    console.log(`📋 Total active schemes in DB: ${count}`);

    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seed failed:', error.message);
    console.error(error.stack);
    await mongoose.disconnect();
    process.exit(1);
  }
}

seedSchemes();