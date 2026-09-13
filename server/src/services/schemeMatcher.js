/**
 * schemeMatcher.js
 *
 * Deterministic scheme matching against the GovernmentScheme collection.
 * DO NOT use AI here — only rule-based logic against the scheme database.
 */

import GovernmentScheme from '../models/GovernmentScheme.js';
import { calculateEMI, buildRepaymentSchedule } from './financialCalculator.js';

/**
 * Load all active schemes from the database.
 */
export async function getActiveSchemes() {
  return GovernmentScheme.find({ active: true }).sort({ minProjectCost: 1 }).lean();
}

/**
 * Score a scheme for a given applicant (0–100).
 */
function scoreScheme(scheme, { businessCategory, isRural, applicantCategory }) {
  let score = 60;

  if (Array.isArray(scheme.suitableBusinessTypes) && scheme.suitableBusinessTypes.length > 0) {
    const businessLower = (businessCategory || '').toLowerCase();
    const matched = scheme.suitableBusinessTypes.some(
      t => t.toLowerCase().includes(businessLower) || businessLower.includes(t.toLowerCase())
    );
    if (matched) score += 20;
  } else {
    score += 10;
  }

  if (isRural && scheme.ruralEligible) score += 10;
  if (!isRural && scheme.locationType === 'Urban') score += 10;
  if (!isRural && scheme.locationType === 'Nationwide') score += 5;

  const cat = (applicantCategory || 'General').toLowerCase();
  const catBenefits = scheme.categoryBenefits || {};
  if (cat === 'sc' && catBenefits.SC) score += 10;
  if (cat === 'st' && catBenefits.ST) score += 10;
  if (cat === 'women' && catBenefits.women) score += 10;
  if (cat === 'obc' && catBenefits.SC) score += 5;
  if (scheme.subsidy?.available) score += 5;

  return Math.min(score, 100);
}

/**
 * Main scheme matching function.
 *
 * @param {object} params
 * @param {number} params.totalProjectCost
 * @param {number} params.requestedLoanAmount
 * @param {number} params.ownContribution
 * @param {string} params.businessCategory
 * @param {string} params.location
 * @param {boolean} params.isRural
 * @param {string} params.applicantCategory  'General' | 'SC' | 'ST' | 'OBC' | 'Women'
 */
export async function matchSchemes({
  totalProjectCost,
  requestedLoanAmount,
  ownContribution,
  businessCategory,
  location,
  isRural,
  applicantCategory
}) {
  const schemes = await getActiveSchemes();

  if (schemes.length === 0) {
    return {
      matchedSchemes: [],
      noSchemeReason: 'No active government schemes are currently available in the database.'
    };
  }

  const eligible = schemes.filter(s => {
    const projectOk = totalProjectCost >= s.minProjectCost && totalProjectCost <= s.maxProjectCost;
    const loanOk = requestedLoanAmount >= s.minLoanAmount && requestedLoanAmount <= s.maxLoanAmount;
    if (s.locationType === 'Rural' && !isRural) return false;
    if (s.locationType === 'Urban' && isRural) return false;
    return projectOk && loanOk;
  });

  if (eligible.length === 0) {
    const maxProjectCost = Math.max(...schemes.map(s => s.maxProjectCost));
    let reason;
    if (totalProjectCost > maxProjectCost) {
      reason = `Project cost of Rs.${(totalProjectCost / 100000).toFixed(2)} lakh exceeds the maximum covered by available schemes (Rs.${(maxProjectCost / 100000).toFixed(2)} lakh).`;
    } else {
      reason = `No scheme found matching project cost Rs.${totalProjectCost.toLocaleString('en-IN')} and loan amount Rs.${requestedLoanAmount.toLocaleString('en-IN')} for the ${isRural ? 'rural' : 'urban'} location type.`;
    }
    return { matchedSchemes: [], noSchemeReason: reason };
  }

  const scored = eligible.map(scheme => {
    const score = scoreScheme(scheme, { businessCategory, isRural, applicantCategory });

    const tenureYears = scheme.tenure?.unit === 'years' ? scheme.tenure.value : (scheme.tenure?.value || 0) / 12;
    const tenureMonths = Math.round(tenureYears * 12);
    const moratoriumMonths = scheme.moratorium?.unit === 'months'
      ? (scheme.moratorium?.value || 0)
      : (scheme.moratorium?.value || 0) * 12;
    const interestRate = scheme.interestRate?.value || 0;

    const cappedLoanAmount = Math.min(requestedLoanAmount, scheme.maxLoanAmount);
    const loanCapApplied = cappedLoanAmount < requestedLoanAmount;

    let emiResult = { monthlyEMI: 0, totalInterest: 0, totalRepayment: cappedLoanAmount };
    try {
      if (tenureMonths > 0 && interestRate > 0) {
        emiResult = calculateEMI(cappedLoanAmount, interestRate, tenureMonths);
      }
    } catch (_) { /* ignore */ }

    const eligibilityStatus = score >= 70 ? 'Potentially Eligible' : 'Requires Verification';

    const reasons = [
      `Project cost of Rs.${totalProjectCost.toLocaleString('en-IN')} is within the scheme range (Rs.${scheme.minProjectCost.toLocaleString('en-IN')} to Rs.${scheme.maxProjectCost.toLocaleString('en-IN')}).`,
      loanCapApplied
        ? `Your requested loan of Rs.${requestedLoanAmount.toLocaleString('en-IN')} has been capped at the scheme maximum of Rs.${scheme.maxLoanAmount.toLocaleString('en-IN')}.`
        : `Your loan of Rs.${cappedLoanAmount.toLocaleString('en-IN')} is within the scheme limit.`
    ];

    const cat = (applicantCategory || 'General').toLowerCase();
    const catBenefits = scheme.categoryBenefits || {};
    if (cat === 'sc' && catBenefits.SC) reasons.push(`SC Benefit: ${catBenefits.SC}`);
    if (cat === 'st' && catBenefits.ST) reasons.push(`ST Benefit: ${catBenefits.ST}`);
    if (cat === 'women' && catBenefits.women) reasons.push(`Women Benefit: ${catBenefits.women}`);
    if (scheme.subsidy?.available) {
      reasons.push(`Subsidy available: ${scheme.subsidy.percentage}% ${scheme.subsidy.subsidyType || 'subsidy'}`);
    }

    return {
      schemeId: scheme._id,
      schemeName: scheme.name,
      ministry: scheme.ministry,
      implementingAgency: scheme.implementingAgency,
      objective: scheme.objective,
      matchScore: score,
      eligibilityStatus,
      reasons,
      scheme,
      totalProjectCost,
      requestedLoanAmount,
      cappedLoanAmount,
      loanCapApplied,
      ownContribution,
      interestRate,
      tenureYears,
      tenureMonths,
      moratoriumMonths,
      monthlyEMI: emiResult.monthlyEMI,
      totalInterest: emiResult.totalInterest,
      totalRepayment: emiResult.totalRepayment
    };
  });

  scored.sort((a, b) => b.matchScore - a.matchScore);

  return { matchedSchemes: scored, noSchemeReason: null };
}

/**
 * Build full financial plan for a selected scheme after user picks it.
 */
export function buildFinancialStructure(scheme, totalProjectCost, requestedLoanAmount, ownContribution) {
  const tenureYears = scheme.tenure?.unit === 'years' ? scheme.tenure.value : (scheme.tenure?.value || 0) / 12;
  const tenureMonths = Math.round(tenureYears * 12);
  const moratoriumMonths = scheme.moratorium?.unit === 'months'
    ? (scheme.moratorium?.value || 0)
    : (scheme.moratorium?.value || 0) * 12;
  const interestRate = scheme.interestRate?.value || 0;

  const cappedLoanAmount = Math.min(requestedLoanAmount, scheme.maxLoanAmount);
  const loanCapApplied = cappedLoanAmount < requestedLoanAmount;

  const emiResult = calculateEMI(cappedLoanAmount, interestRate, tenureMonths);

  const repaymentSchedule = buildRepaymentSchedule(
    cappedLoanAmount, interestRate, tenureMonths, moratoriumMonths, 'repayment_begins_after'
  );

  return {
    schemeName: scheme.name,
    ministry: scheme.ministry,
    totalProjectCost,
    ownContribution,
    requestedLoanAmount,
    cappedLoanAmount,
    loanCapApplied,
    subsidyAvailable: scheme.subsidy?.available || false,
    subsidyPercentage: scheme.subsidy?.percentage || 0,
    subsidyType: scheme.subsidy?.subsidyType || '',
    interestRate,
    tenureYears,
    tenureMonths,
    moratoriumMonths,
    monthlyEMI: emiResult.monthlyEMI,
    totalInterest: emiResult.totalInterest,
    totalRepayment: emiResult.totalRepayment,
    repaymentSchedule,
    disclaimer: 'Final eligibility is subject to scheme-specific conditions and verification by the concerned agency.'
  };
}
