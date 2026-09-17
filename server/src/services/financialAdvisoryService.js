/**
 * financialAdvisoryService.js
 *
 * Orchestrates the full Module 2 advisory pipeline (new flow):
 * 1. Scheme matching done separately (Step 1 of wizard)
 * 2. User picks a scheme (Step 2 of wizard)
 * 3. User enters shop expenses (Step 3 of wizard)
 * 4. This service: computes financials + calls Mistral AI
 * 5. Persist to DB
 */

import BusinessProfile from '../models/BusinessProfile.js';
import SchemeMatch from '../models/SchemeMatch.js';
import GovernmentScheme from '../models/GovernmentScheme.js';
import { buildFinancialStructure } from './schemeMatcher.js';
import {
  estimateProjectBudget,
  estimateOperatingCosts,
  calculateFeasibilityScore
} from './financialCalculator.js';
import { generateFinancialAdvisory } from './mistralService.js';

/**
 * Run the full advisory pipeline for an entrepreneur.
 *
 * @param {object} input - Validated input from the frontend
 * @param {string} sessionId - Session ID
 */
export async function runFinancialAdvisory(input, sessionId) {
  const {
    entrepreneurName = 'Entrepreneur',
    village = '',
    block = '',
    district = '',
    state = '',
    businessCategory,
    proposedBusiness,
    isExistingBusiness = false,
    availableMargin,
    // New flow fields
    totalProjectCost,
    requestedLoanAmount,
    ownContribution,
    selectedSchemeId,
    // Shop expense fields
    shopRent = 0,
    productMaintenanceCost = 0,
    numberOfLabours = 0,
    labourWagePerPerson = 0,
    otherExpenses = 0,
    // Legacy fields
    expectedMonthlyRevenue,
    expectedMonthlyExpenses,
    hasShopOrLand = false,
    existingAssets = '',
    // Market data from Module 1
    marketData = null,
    language = 'en'
  } = input;

  const locationParts = [village, block, district, state].filter(Boolean);
  const fullLocationString = locationParts.join(', ') || 'Location not specified';

  // Calculate total monthly expenses from shop expense breakdown
  const totalLabourCost = numberOfLabours * labourWagePerPerson;
  const computedMonthlyExpenses = shopRent + productMaintenanceCost + totalLabourCost + otherExpenses;
  const finalMonthlyExpenses = computedMonthlyExpenses > 0 ? computedMonthlyExpenses : (expectedMonthlyExpenses || 0);

  // ── Step 1: Save Business Profile ─────────────────────────────────────────
  const businessProfile = await BusinessProfile.create({
    sessionId,
    entrepreneurName,
    village,
    block,
    district,
    state,
    fullLocationString,
    businessCategory,
    proposedBusiness,
    isExistingBusiness,
    availableMargin: ownContribution || availableMargin,
    expectedMonthlyRevenue: expectedMonthlyRevenue || null,
    expectedMonthlyExpenses: finalMonthlyExpenses || null,
    hasShopOrLand,
    existingAssets
  });

  // ── Step 2: Load selected scheme & build financial structure ───────────────
  let selectedScheme = null;
  let financialStructure = null;
  let repaymentSchedule = null;
  let schemeResult = { matchedSchemes: [], selectedScheme: null, noSchemeReason: null };

  const effectiveProjectCost = totalProjectCost || (ownContribution || availableMargin || 0) / 0.10;
  const effectiveLoanAmount = requestedLoanAmount || effectiveProjectCost * 0.90;
  const effectiveOwnContribution = ownContribution || availableMargin || 0;

  if (selectedSchemeId) {
    try {
      const schemeDoc = await GovernmentScheme.findById(selectedSchemeId).lean();
      if (schemeDoc) {
        selectedScheme = schemeDoc;
        financialStructure = buildFinancialStructure(
          schemeDoc,
          effectiveProjectCost,
          effectiveLoanAmount,
          effectiveOwnContribution
        );
        repaymentSchedule = financialStructure.repaymentSchedule;
        schemeResult.selectedScheme = {
          schemeId: schemeDoc._id,
          schemeName: schemeDoc.name,
          matchScore: 95,
          eligibilityStatus: 'Potentially Eligible',
          reasons: ['Selected by user based on matched scheme list.'],
          interestRate: schemeDoc.interestRate?.value,
          tenureMonths: financialStructure.tenureMonths,
          moratoriumMonths: financialStructure.moratoriumMonths,
          monthlyEMI: financialStructure.monthlyEMI,
          totalInterest: financialStructure.totalInterest,
          totalRepayment: financialStructure.totalRepayment,
          cappedLoanAmount: financialStructure.cappedLoanAmount
        };
        schemeResult.matchedSchemes = [schemeResult.selectedScheme];
      }
    } catch (err) {
      console.warn('[financialAdvisoryService] Failed to load selected scheme:', err.message);
    }
  }

  // ── Step 3: Project Budget Breakdown ──────────────────────────────────────
  const projectBudget = estimateProjectBudget(proposedBusiness || businessCategory, effectiveProjectCost);

  // ── Step 4: Operating Cost Estimates ──────────────────────────────────────
  // Use user-provided breakdown if available, otherwise estimate
  let operatingCostEstimates;
  if (computedMonthlyExpenses > 0) {
    operatingCostEstimates = {
      shopRent,
      productMaintenanceCost,
      numberOfLabours,
      labourWagePerPerson,
      totalLabourCost,
      otherExpenses,
      totalMonthlyExpenses: finalMonthlyExpenses,
      source: 'user_provided'
    };
  } else {
    operatingCostEstimates = estimateOperatingCosts(
      proposedBusiness || businessCategory,
      effectiveProjectCost,
      fullLocationString
    );
    operatingCostEstimates.source = 'estimated';
  }

  // ── Step 5: Feasibility Score ──────────────────────────────────────────────
  const feasibilityInput = {
    demandScore: marketData?.demandScore ?? 50,
    supplyScore: marketData?.supplyScore ?? 50,
    opportunityScore: marketData?.opportunityScore ?? 50,
    availableMargin: effectiveOwnContribution,
    projectCost: effectiveProjectCost,
    monthlyEMI: financialStructure?.monthlyEMI || 0,
    expectedMonthlyRevenue: expectedMonthlyRevenue || 0,
    schemeMatched: !!selectedScheme
  };
  const { feasibilityScore, breakdown: feasibilityBreakdown, interpretation } = calculateFeasibilityScore(feasibilityInput);

  // ── Step 6: Mistral AI Explanation ────────────────────────────────────────
  let aiExplanation = null;
  try {
    aiExplanation = await generateFinancialAdvisory({
      location: { village, block, district, state, full: fullLocationString },
      businessCategory,
      proposedBusiness,
      availableMargin: effectiveOwnContribution,
      projectCost: effectiveProjectCost,
      loanAmount: financialStructure?.cappedLoanAmount,
      scheme: selectedScheme
        ? {
            name: selectedScheme.name,
            interestRate: selectedScheme.interestRate?.value,
            tenureYears: financialStructure?.tenureYears,
            moratoriumMonths: financialStructure?.moratoriumMonths,
            monthlyEMI: financialStructure?.monthlyEMI,
            subsidyAvailable: selectedScheme.subsidy?.available,
            subsidyPercentage: selectedScheme.subsidy?.percentage
          }
        : null,
      competitors: marketData?.competitorCount || 0,
      demandLevel: marketData?.opportunityTier || 'Unknown',
      feasibilityScore,
      interpretation,
      operatingCosts: operatingCostEstimates,
      shopExpenses: {
        shopRent,
        productMaintenanceCost,
        numberOfLabours,
        labourWagePerPerson,
        totalLabourCost,
        otherExpenses,
        totalMonthly: finalMonthlyExpenses
      },
      expectedMonthlyRevenue,
      expectedMonthlyExpenses: finalMonthlyExpenses,
      language
    });
  } catch (error) {
    console.warn('[financialAdvisoryService] Mistral explanation failed (non-fatal):', error.message);
    const isTa = language === 'ta';
    aiExplanation = {
      executiveSummary: isTa
        ? 'AI பகுப்பாய்வு தற்காலிகமாக கிடைக்கவில்லை. மேலே உள்ள நிதி கணக்கீடுகள் துல்லியமானவை.'
        : 'AI analysis is temporarily unavailable. Financial calculations above are complete and accurate.',
      schemeExplanation: isTa
        ? 'அரசு திட்டப் பொருத்தம் வணிக விதிகளின் அடிப்படையில் துல்லியமாக கணக்கிடப்பட்டுள்ளது.'
        : null,
      financialAdvice: isTa
        ? ['குறைந்தது 2-3 மாதங்களுக்கான அவசர செயல்பாட்டு நிதியை பராமரிக்கவும்.']
        : [],
      riskFactors: isTa
        ? ['மாதாந்திர வருவாய் மற்றும் EMI செலுத்துதலை தொடர்ந்து கண்காணிக்கவும்.']
        : [],
      recommendations: isTa
        ? ['திட்ட ஆவணங்களை சமர்ப்பிக்க அருகிலுள்ள வங்கி கிளையை அணுகவும்.']
        : [],
      businessRoadmap: null,
      revenueTips: isTa
        ? ['வாடிக்கையாளர்களுக்கு சிறப்பு சலுகைகள் வழங்கி மீண்டும் வரவழைக்கவும்.']
        : [],
      threatAnalysis: null
    };
  }

  // ── Step 7: Persist to DB ─────────────────────────────────────────────────
  const schemeMatchDoc = await SchemeMatch.create({
    sessionId,
    businessProfileId: businessProfile._id,
    analysisId: marketData?.analysisId || null,
    inputSnapshot: {
      location: fullLocationString,
      businessCategory,
      availableMargin: effectiveOwnContribution,
      estimatedProjectCost: effectiveProjectCost,
      desiredLoanAmount: effectiveLoanAmount,
      language
    },
    matchedSchemes: schemeResult.matchedSchemes,
    selectedScheme: schemeResult.selectedScheme,
    noSchemeReason: schemeResult.noSchemeReason,
    financialStructure,
    repaymentSchedule,
    projectBudget,
    operatingCostEstimates,
    aiExplanation,
    feasibilityScore,
    feasibilityBreakdown,
    marketData: marketData
      ? {
          analysisId: marketData.analysisId,
          demandScore: marketData.demandScore,
          supplyScore: marketData.supplyScore,
          opportunityScore: marketData.opportunityScore,
          opportunityTier: marketData.opportunityTier,
          competitorCount: marketData.competitorCount
        }
      : null
  });

  return formatAdvisoryResult(schemeMatchDoc, businessProfile, interpretation, {
    shopExpenses: operatingCostEstimates
  });
}

/**
 * Format the advisory result for the frontend.
 */
export function formatAdvisoryResult(schemeMatch, businessProfile, interpretation = null, extras = {}) {
  const doc = typeof schemeMatch.toObject === 'function' ? schemeMatch.toObject() : schemeMatch;
  const profile = typeof businessProfile?.toObject === 'function' ? businessProfile.toObject() : (businessProfile || {});

  return {
    id: String(doc._id),
    businessProfile: {
      id: String(profile._id || ''),
      entrepreneurName: profile.entrepreneurName,
      village: profile.village,
      block: profile.block,
      district: profile.district,
      state: profile.state,
      fullLocationString: profile.fullLocationString,
      businessCategory: profile.businessCategory,
      proposedBusiness: profile.proposedBusiness,
      availableMargin: profile.availableMargin,
      expectedMonthlyRevenue: profile.expectedMonthlyRevenue,
      expectedMonthlyExpenses: profile.expectedMonthlyExpenses
    },
    schemeMatch: {
      selectedScheme: doc.selectedScheme,
      matchedSchemes: doc.matchedSchemes,
      noSchemeReason: doc.noSchemeReason
    },
    financialStructure: doc.financialStructure,
    repaymentSchedule: doc.repaymentSchedule,
    projectBudget: doc.projectBudget,
    operatingCostEstimates: doc.operatingCostEstimates,
    shopExpenses: extras.shopExpenses || null,
    aiExplanation: doc.aiExplanation,
    feasibilityScore: doc.feasibilityScore,
    feasibilityBreakdown: doc.feasibilityBreakdown,
    interpretation: interpretation || 'Requires Further Validation',
    marketData: doc.marketData,
    createdAt: doc.createdAt,
    disclaimer: 'This tool provides preliminary estimates for business planning and scheme discovery. Final loan eligibility and scheme approval are subject to official scheme guidelines and the concerned financing agency.'
  };
}
