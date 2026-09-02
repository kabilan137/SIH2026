/**
 * schemeMatcher.js
 *
 * Deterministic scheme routing and matching.
 * DO NOT use AI here — only rule-based logic against the scheme database.
 */

import GovernmentScheme from '../models/GovernmentScheme.js';
import { calculateProjectStructure, calculateEMI, buildRepaymentSchedule } from './financialCalculator.js';

/**
 * Load all active schemes from the database.
 * @returns {Promise<object[]>}
 */
export async function getActiveSchemes() {
  return GovernmentScheme.find({ active: true }).sort({ minProjectCost: 1 }).lean();
}

/**
 * Route a given project cost to the appropriate scheme.
 * Implements deterministic project-cost-based routing:
 *   projectCost <= 1,40,000        → Micro Finance Scheme
 *   1,40,000 < projectCost <= 50,00,000 → Term Loan Scheme
 *   projectCost > 50,00,000        → No matching scheme
 *
 * @param {number} projectCost - Calculated project cost in INR
 * @param {object[]} schemes - Array of GovernmentScheme documents
 * @returns {{ scheme: object|null, reason: string }}
 */
export function routeScheme(projectCost, schemes) {
  if (!Number.isFinite(projectCost) || projectCost <= 0) {
    return { scheme: null, reason: 'Project cost must be a positive number.' };
  }

  for (const scheme of schemes) {
    if (projectCost >= scheme.minProjectCost && projectCost <= scheme.maxProjectCost) {
      return { scheme, reason: `Project cost of ${projectCost} falls within the ${scheme.schemeName} range.` };
    }
  }

  const maxSchemeProjectCost = Math.max(...schemes.map(s => s.maxProjectCost));
  if (projectCost > maxSchemeProjectCost) {
    return {
      scheme: null,
      reason: `Project cost of ₹${(projectCost / 100000).toFixed(2)} lakh exceeds the maximum project cost (₹${(maxSchemeProjectCost / 100000).toFixed(2)} lakh) covered by the current prototype scheme database. No matching scheme is available.`
    };
  }

  return { scheme: null, reason: 'No matching scheme found for the given project cost.' };
}

/**
 * Full scheme matching for an entrepreneur.
 * Calculates project cost from margin, routes to scheme, calculates EMI and repayment.
 *
 * @param {object} params
 * @param {number} params.availableMargin - Entrepreneur's own capital in INR
 * @param {string} params.businessCategory
 * @param {string} params.location
 * @param {number} [params.expectedMonthlyRevenue]
 * @returns {Promise<object>} Full scheme match result
 */
export async function matchSchemes({ availableMargin, businessCategory, location, expectedMonthlyRevenue }) {
  const schemes = await getActiveSchemes();

  if (schemes.length === 0) {
    return {
      matchedSchemes: [],
      selectedScheme: null,
      noSchemeReason: 'No active government schemes are currently available in the database.',
      financialStructure: null,
      repaymentSchedule: null
    };
  }

  // Step 1: Calculate project cost from available margin using default margin %
  // Use 10% margin (standard for both prototype schemes)
  const standardMarginPct = 10;
  const calculatedProjectCost = availableMargin / (standardMarginPct / 100);

  // Step 2: Route to scheme
  const { scheme, reason } = routeScheme(calculatedProjectCost, schemes);

  if (!scheme) {
    return {
      matchedSchemes: [],
      selectedScheme: null,
      noSchemeReason: reason,
      calculatedProjectCost: Math.round(calculatedProjectCost),
      financialStructure: null,
      repaymentSchedule: null
    };
  }

  // Step 3: Calculate project structure with this scheme
  const projectStructure = calculateProjectStructure(availableMargin, scheme);

  // Step 4: Calculate EMI on the capped loan amount
  const tenureMonths = scheme.tenureYears * 12;
  const emiResult = calculateEMI(projectStructure.cappedLoanAmount, scheme.interestRate, tenureMonths);

  // Step 5: Build repayment schedule
  const repaymentSchedule = buildRepaymentSchedule(
    projectStructure.cappedLoanAmount,
    scheme.interestRate,
    tenureMonths,
    scheme.moratoriumMonths,
    scheme.moratoriumTreatment
  );

  const matchedScheme = {
    schemeId: scheme._id,
    schemeName: scheme.schemeName,
    schemeCode: scheme.schemeCode,
    matchScore: 95, // deterministically high — only schemes in DB can be recommended
    eligibilityStatus: 'Potentially Eligible',
    reasons: [
      `Your estimated project cost of ₹${(projectStructure.calculatedProjectCost / 100000).toFixed(2)} lakh falls within the ${scheme.schemeName} range.`,
      `Maximum project cost under this scheme: ₹${(scheme.maxProjectCost / 100000).toFixed(2)} lakh.`,
      projectStructure.loanCapApplied
        ? `Note: Your calculated loan of ₹${(projectStructure.calculatedLoanAmount / 100000).toFixed(2)} lakh has been capped at the scheme maximum of ₹${(scheme.maxLoanAmount / 100000).toFixed(2)} lakh.`
        : `Your loan of ₹${(projectStructure.cappedLoanAmount / 100000).toFixed(2)} lakh is within the scheme limit.`
    ],
    ...projectStructure,
    interestRate: scheme.interestRate,
    tenureMonths,
    moratoriumMonths: scheme.moratoriumMonths,
    monthlyEMI: emiResult.monthlyEMI,
    totalInterest: emiResult.totalInterest,
    totalRepayment: emiResult.totalRepayment
  };

  const financialStructure = {
    availableMargin,
    calculatedProjectCost: projectStructure.calculatedProjectCost,
    beneficiaryContribution: projectStructure.beneficiaryContribution,
    calculatedLoanAmount: projectStructure.calculatedLoanAmount,
    cappedLoanAmount: projectStructure.cappedLoanAmount,
    loanCapApplied: projectStructure.loanCapApplied,
    schemeName: scheme.schemeName,
    schemeCode: scheme.schemeCode,
    interestRate: scheme.interestRate,
    tenureYears: scheme.tenureYears,
    tenureMonths,
    moratoriumMonths: scheme.moratoriumMonths,
    moratoriumTreatment: scheme.moratoriumTreatment,
    monthlyEMI: emiResult.monthlyEMI,
    totalInterest: emiResult.totalInterest,
    totalRepayment: emiResult.totalRepayment,
    disclaimer: 'Final government eligibility depends on scheme-specific conditions and verification by the concerned agency. These are preliminary estimates for planning purposes only.'
  };

  return {
    matchedSchemes: [matchedScheme],
    selectedScheme: matchedScheme,
    noSchemeReason: null,
    calculatedProjectCost: projectStructure.calculatedProjectCost,
    financialStructure,
    repaymentSchedule
  };
}

/**
 * Quick calculation without DB — used for frontend instant preview.
 * Uses prototype scheme thresholds directly.
 *
 * @param {number} availableMargin
 * @returns {object}
 */
export function quickCalculate(availableMargin) {
  if (!Number.isFinite(availableMargin) || availableMargin <= 0) {
    return { error: 'Available margin must be a positive number.' };
  }

  const marginFraction = 0.10;
  const projectCost = Math.round(availableMargin / marginFraction);
  const calculatedLoan = Math.round(projectCost * 0.90);

  const MICRO_FINANCE_MAX_PROJECT = 140000;
  const TERM_LOAN_MAX_PROJECT = 5000000;
  const MICRO_FINANCE_MAX_LOAN = 125000;
  const TERM_LOAN_MAX_LOAN = 4500000;

  let schemeName, schemeCode, interestRate, tenureYears, moratoriumMonths, maxLoan, cappedLoan, loanCapApplied;

  if (projectCost <= MICRO_FINANCE_MAX_PROJECT) {
    schemeName = 'Micro Finance Scheme';
    schemeCode = 'MFS';
    interestRate = 6.5;
    tenureYears = 3;
    moratoriumMonths = 3;
    maxLoan = MICRO_FINANCE_MAX_LOAN;
  } else if (projectCost <= TERM_LOAN_MAX_PROJECT) {
    schemeName = 'Term Loan Scheme';
    schemeCode = 'TLS';
    interestRate = 8.0;
    tenureYears = 7;
    moratoriumMonths = 6;
    maxLoan = TERM_LOAN_MAX_LOAN;
  } else {
    return {
      projectCost,
      calculatedLoan,
      schemeName: null,
      noSchemeReason: `Project cost of ₹${(projectCost / 100000).toFixed(2)} lakh exceeds the maximum covered by current prototype schemes (₹50 lakh).`
    };
  }

  cappedLoan = Math.min(calculatedLoan, maxLoan);
  loanCapApplied = cappedLoan < calculatedLoan;

  const tenureMonths = tenureYears * 12;
  const emiResult = calculateEMI(cappedLoan, interestRate, tenureMonths);

  return {
    availableMargin,
    projectCost,
    beneficiaryContribution: projectCost - cappedLoan,
    calculatedLoan,
    cappedLoan,
    loanCapApplied,
    schemeName,
    schemeCode,
    interestRate,
    tenureYears,
    tenureMonths,
    moratoriumMonths,
    monthlyEMI: emiResult.monthlyEMI,
    totalInterest: emiResult.totalInterest,
    totalRepayment: emiResult.totalRepayment
  };
}
