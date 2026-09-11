/**
 * financialAdvisoryService.js
 *
 * Orchestrates the full Module 2 advisory pipeline:
 * 1. Scheme matching (deterministic)
 * 2. Financial structure calculation (deterministic)
 * 3. Budget estimation (deterministic)
 * 4. Operating cost estimation (deterministic)
 * 5. Feasibility score (deterministic)
 * 6. AI explanation via Mistral (narrative only — no math)
 * 7. Persist to DB
 */

import BusinessProfile from '../models/BusinessProfile.js';
import SchemeMatch from '../models/SchemeMatch.js';
import { matchSchemes } from './schemeMatcher.js';
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
 * @param {string} sessionId - Session ID (browser UUID replacing Clerk auth)
 * @returns {Promise<object>} Formatted advisory result
 */
export async function runFinancialAdvisory(input, sessionId) {
  const {
    entrepreneurName,
    village = '',
    block = '',
    district = '',
    state = '',
    businessCategory,
    proposedBusiness,
    isExistingBusiness = false,
    availableMargin,
    desiredLoanAmount,
    estimatedProjectCost,
    expectedMonthlyRevenue,
    expectedMonthlyExpenses,
    numberOfEmployees = 0,
    businessExperience = 0,
    hasShopOrLand = false,
    existingAssets = '',
    expectedRent = 0,
    workingCapitalAvailable = 0,
    preferredLoanTenure,
    // Market data from Module 1 (optional — passed when running combined analysis)
    marketData = null
  } = input;

  // Build a full location string
  const locationParts = [village, block, district, state].filter(Boolean);
  const fullLocationString = locationParts.join(', ') || 'Location not specified';

  // ── Step 1: Save Business Profile ──────────────────────────────────────────
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
    availableMargin,
    desiredLoanAmount: desiredLoanAmount || null,
    estimatedProjectCost: estimatedProjectCost || null,
    expectedMonthlyRevenue: expectedMonthlyRevenue || null,
    expectedMonthlyExpenses: expectedMonthlyExpenses || null,
    preferredLoanTenure: preferredLoanTenure || null,
    numberOfEmployees,
    businessExperience,
    hasShopOrLand,
    existingAssets,
    expectedRent,
    workingCapitalAvailable
  });

  // ── Step 2: Scheme Matching (deterministic) ─────────────────────────────────
  const schemeResult = await matchSchemes({
    availableMargin,
    businessCategory,
    location: fullLocationString,
    expectedMonthlyRevenue
  });

  const { financialStructure, selectedScheme, repaymentSchedule } = schemeResult;

  // ── Step 3: Project Budget Breakdown ───────────────────────────────────────
  const projectCostForBudget = financialStructure?.calculatedProjectCost || availableMargin / 0.10;
  const projectBudget = estimateProjectBudget(proposedBusiness || businessCategory, projectCostForBudget);

  // ── Step 4: Operating Cost Estimates ───────────────────────────────────────
  const operatingCostEstimates = estimateOperatingCosts(
    proposedBusiness || businessCategory,
    projectCostForBudget,
    fullLocationString
  );

  // ── Step 5: Feasibility Score (deterministic) ──────────────────────────────
  const feasibilityInput = {
    demandScore: marketData?.demandScore ?? 50,
    supplyScore: marketData?.supplyScore ?? 50,
    opportunityScore: marketData?.opportunityScore ?? 50,
    availableMargin,
    projectCost: financialStructure?.calculatedProjectCost || 0,
    monthlyEMI: financialStructure?.monthlyEMI || 0,
    expectedMonthlyRevenue: expectedMonthlyRevenue || 0,
    schemeMatched: !!selectedScheme
  };
  const { feasibilityScore, breakdown: feasibilityBreakdown, interpretation } = calculateFeasibilityScore(feasibilityInput);

  // ── Step 6: Mistral AI Explanation ─────────────────────────────────────────
  let aiExplanation = null;
  try {
    aiExplanation = await generateFinancialAdvisory({
      location: {
        village,
        block,
        district,
        state,
        full: fullLocationString
      },
      businessCategory,
      proposedBusiness,
      availableMargin,
      projectCost: financialStructure?.calculatedProjectCost,
      loanAmount: financialStructure?.cappedLoanAmount,
      scheme: selectedScheme
        ? {
            name: selectedScheme.schemeName,
            interestRate: selectedScheme.interestRate,
            tenureYears: selectedScheme.tenureMonths / 12,
            moratoriumMonths: selectedScheme.moratoriumMonths,
            monthlyEMI: selectedScheme.monthlyEMI
          }
        : null,
      competitors: marketData?.competitorCount || 0,
      demandLevel: marketData?.opportunityTier || 'Unknown',
      feasibilityScore,
      interpretation,
      operatingCosts: operatingCostEstimates,
      expectedMonthlyRevenue,
      expectedMonthlyExpenses
    });
  } catch (error) {
    console.warn('[financialAdvisoryService] Mistral explanation failed (non-fatal):', error.message);
    aiExplanation = {
      executiveSummary: 'AI analysis is temporarily unavailable. Financial calculations above are complete and accurate.',
      schemeExplanation: null,
      financialAdvice: [],
      riskFactors: [],
      recommendations: [],
      businessBudgetNarrative: null
    };
  }

  // ── Step 7: Persist to DB ──────────────────────────────────────────────────
  const schemeMatchDoc = await SchemeMatch.create({
    sessionId,
    businessProfileId: businessProfile._id,
    analysisId: marketData?.analysisId || null,
    inputSnapshot: {
      location: fullLocationString,
      businessCategory,
      availableMargin,
      estimatedProjectCost: estimatedProjectCost || null,
      desiredLoanAmount: desiredLoanAmount || null
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

  return formatAdvisoryResult(schemeMatchDoc, businessProfile, interpretation);
}

/**
 * Format the advisory result for the frontend.
 */
export function formatAdvisoryResult(schemeMatch, businessProfile, interpretation = null) {
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
    aiExplanation: doc.aiExplanation,
    feasibilityScore: doc.feasibilityScore,
    feasibilityBreakdown: doc.feasibilityBreakdown,
    interpretation: interpretation || 'Requires Further Validation',
    marketData: doc.marketData,
    createdAt: doc.createdAt,
    disclaimer: 'This tool provides preliminary estimates for business planning and scheme discovery. Final loan eligibility, sanction amount, interest treatment, repayment conditions and government scheme approval are subject to the official scheme guidelines and the concerned financing/channelizing agency.'
  };
}
