/**
 * financialCalculator.js
 *
 * All financial calculations are DETERMINISTIC JavaScript.
 * DO NOT use AI for any calculation here.
 * AI (Mistral) is only used to explain the results — never compute them.
 */

/**
 * Format a number as Indian currency string (e.g. 1000000 → "₹10,00,000")
 * @param {number} amount
 * @returns {string}
 */
export function formatIndianCurrency(amount) {
  if (!Number.isFinite(amount)) return '₹0';
  const abs = Math.abs(Math.round(amount));
  const sign = amount < 0 ? '-' : '';

  const str = String(abs);
  if (str.length <= 3) return `${sign}₹${str}`;

  const last3 = str.slice(-3);
  const rest = str.slice(0, -3);
  const formatted = rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',');
  return `${sign}₹${formatted},${last3}`;
}

/**
 * Calculate project cost and loan amount based on margin and scheme rules.
 *
 * Business rule:
 *   beneficiaryContribution = 10% of projectCost
 *   loanAmount = 90% of projectCost
 *   Therefore: projectCost = availableMargin / marginPercentage
 *
 * @param {number} availableMargin - Entrepreneur's own capital in INR
 * @param {object} scheme - GovernmentScheme document
 * @returns {object}
 */
export function calculateProjectStructure(availableMargin, scheme) {
  if (!Number.isFinite(availableMargin) || availableMargin <= 0) {
    throw new Error('Available margin must be a positive number.');
  }

  const marginFraction = scheme.marginPercentage / 100; // e.g. 0.10
  const loanFraction = 1 - marginFraction;              // e.g. 0.90

  const calculatedProjectCost = availableMargin / marginFraction;
  const calculatedLoanAmount = calculatedProjectCost * loanFraction;

  // Apply scheme maximum loan cap
  const cappedLoanAmount = Math.min(calculatedLoanAmount, scheme.maxLoanAmount);
  const loanCapApplied = cappedLoanAmount < calculatedLoanAmount;

  // If loan is capped, beneficiary must contribute the difference
  const effectiveBeneficiaryContribution = calculatedProjectCost - cappedLoanAmount;

  return {
    availableMargin,
    marginPercentage: scheme.marginPercentage,
    calculatedProjectCost: Math.round(calculatedProjectCost),
    calculatedLoanAmount: Math.round(calculatedLoanAmount),
    cappedLoanAmount: Math.round(cappedLoanAmount),
    loanCapApplied,
    beneficiaryContribution: Math.round(effectiveBeneficiaryContribution),
    schemeName: scheme.schemeName,
    schemeCode: scheme.schemeCode,
    schemeMaxLoan: scheme.maxLoanAmount
  };
}

/**
 * Calculate monthly EMI using standard reducing-balance formula.
 *
 * Formula: EMI = P × r × (1+r)^n / ((1+r)^n - 1)
 * Where:
 *   P = principal (loan amount)
 *   r = monthly interest rate = annualRate / 12 / 100
 *   n = number of monthly installments
 *
 * @param {number} principal - Loan amount in INR
 * @param {number} annualInterestRate - Annual interest rate in % (e.g. 8 for 8%)
 * @param {number} tenureMonths - Total loan tenure in months
 * @returns {object} { monthlyEMI, totalRepayment, totalInterest }
 */
export function calculateEMI(principal, annualInterestRate, tenureMonths) {
  if (!Number.isFinite(principal) || principal <= 0) {
    throw new Error('Principal must be a positive number.');
  }
  if (!Number.isFinite(annualInterestRate) || annualInterestRate < 0) {
    throw new Error('Annual interest rate must be a non-negative number.');
  }
  if (!Number.isFinite(tenureMonths) || tenureMonths <= 0) {
    throw new Error('Tenure must be a positive number of months.');
  }

  // Zero interest edge case
  if (annualInterestRate === 0) {
    const monthlyEMI = principal / tenureMonths;
    return {
      monthlyEMI: Math.round(monthlyEMI * 100) / 100,
      totalRepayment: Math.round(principal),
      totalInterest: 0
    };
  }

  const r = annualInterestRate / 12 / 100; // monthly rate
  const factor = Math.pow(1 + r, tenureMonths);
  const monthlyEMI = (principal * r * factor) / (factor - 1);

  const totalRepayment = monthlyEMI * tenureMonths;
  const totalInterest = totalRepayment - principal;

  return {
    monthlyEMI: Math.round(monthlyEMI * 100) / 100,
    totalRepayment: Math.round(totalRepayment * 100) / 100,
    totalInterest: Math.round(totalInterest * 100) / 100
  };
}

/**
 * Build a full quarterly repayment schedule (amortization table).
 * Moratorium: for moratoriumMonths, no EMI is charged (EMI begins after moratorium).
 *
 * @param {number} principal - Loan amount in INR
 * @param {number} annualInterestRate - Annual interest rate in %
 * @param {number} tenureMonths - Total loan tenure in months (EXCLUDING moratorium)
 * @param {number} moratoriumMonths - Moratorium period in months
 * @param {string} moratoriumTreatment - 'repayment_begins_after' | 'interest_only' | etc.
 * @returns {object} { quarters, totalPrincipal, totalInterest, totalRepayment, monthlyEMI }
 */
export function buildRepaymentSchedule(principal, annualInterestRate, tenureMonths, moratoriumMonths = 0, moratoriumTreatment = 'repayment_begins_after') {
  const { monthlyEMI, totalRepayment, totalInterest } = calculateEMI(principal, annualInterestRate, tenureMonths);

  const r = annualInterestRate / 12 / 100;

  // Build month-by-month schedule
  const months = [];
  let balance = principal;
  let totalMonthIndex = 0;

  // Moratorium phase
  for (let m = 0; m < moratoriumMonths; m++) {
    totalMonthIndex++;
    const interestForMonth = balance * r;

    if (moratoriumTreatment === 'interest_only') {
      months.push({
        monthIndex: totalMonthIndex,
        isMoratorium: true,
        moratoriumNote: 'Interest only',
        emiPaid: Math.round(interestForMonth * 100) / 100,
        interestPaid: Math.round(interestForMonth * 100) / 100,
        principalPaid: 0,
        closingBalance: Math.round(balance * 100) / 100
      });
    } else if (moratoriumTreatment === 'interest_accrued') {
      // Interest gets added to principal
      balance += interestForMonth;
      months.push({
        monthIndex: totalMonthIndex,
        isMoratorium: true,
        moratoriumNote: 'Interest accrued to principal',
        emiPaid: 0,
        interestPaid: 0,
        principalPaid: 0,
        closingBalance: Math.round(balance * 100) / 100
      });
    } else {
      // repayment_begins_after (default) — no payment during moratorium
      months.push({
        monthIndex: totalMonthIndex,
        isMoratorium: true,
        moratoriumNote: 'Repayment deferred — begins after moratorium',
        emiPaid: 0,
        interestPaid: 0,
        principalPaid: 0,
        closingBalance: Math.round(balance * 100) / 100
      });
    }
  }

  // Repayment phase
  for (let m = 0; m < tenureMonths; m++) {
    totalMonthIndex++;
    const interestForMonth = balance * r;
    const principalForMonth = Math.min(monthlyEMI - interestForMonth, balance);
    const actualEMI = interestForMonth + principalForMonth;
    balance = Math.max(0, balance - principalForMonth);

    months.push({
      monthIndex: totalMonthIndex,
      isMoratorium: false,
      emiPaid: Math.round(actualEMI * 100) / 100,
      interestPaid: Math.round(interestForMonth * 100) / 100,
      principalPaid: Math.round(principalForMonth * 100) / 100,
      closingBalance: Math.round(balance * 100) / 100
    });
  }

  // Group months into quarters
  const quarters = [];
  const chunkSize = 3;
  for (let i = 0; i < months.length; i += chunkSize) {
    const chunk = months.slice(i, i + chunkSize);
    const quarterNum = Math.floor(i / chunkSize) + 1;
    const totalEMI = chunk.reduce((s, m) => s + m.emiPaid, 0);
    const totalInterestQ = chunk.reduce((s, m) => s + m.interestPaid, 0);
    const totalPrincipalQ = chunk.reduce((s, m) => s + m.principalPaid, 0);
    const closingBalance = chunk[chunk.length - 1].closingBalance;
    const hasMoratorium = chunk.some(m => m.isMoratorium);

    quarters.push({
      quarterIndex: quarterNum,
      label: `Q${quarterNum} (Month ${i + 1}–${i + chunk.length})`,
      months: chunk,
      totalEMI: Math.round(totalEMI * 100) / 100,
      totalInterest: Math.round(totalInterestQ * 100) / 100,
      totalPrincipal: Math.round(totalPrincipalQ * 100) / 100,
      closingBalance: Math.round(closingBalance * 100) / 100,
      hasMoratorium
    });
  }

  return {
    monthlyEMI: Math.round(monthlyEMI * 100) / 100,
    totalRepayment: Math.round(totalRepayment * 100) / 100,
    totalInterest: Math.round(totalInterest * 100) / 100,
    totalPrincipal: principal,
    moratoriumMonths,
    moratoriumTreatment,
    quarters,
    months
  };
}

/**
 * Estimate a project cost budget breakdown based on business category and total cost.
 * These are labeled "Estimated planning values" — not exact market prices.
 *
 * @param {string} businessCategory - e.g. "Dairy", "Grocery", "Tailoring"
 * @param {number} totalProjectCost - Total project cost in INR
 * @returns {object[]} Array of { category, percentage, amount, note }
 */
export function estimateProjectBudget(businessCategory, totalProjectCost) {
  const categoryLower = (businessCategory || '').toLowerCase();

  // Category-specific budget templates (percentages must add to ~100)
  const templates = {
    dairy: [
      { category: 'Equipment & Machinery', pct: 35, note: 'Milking equipment, storage, cooling' },
      { category: 'Animal / Stock Purchase', pct: 25, note: 'Initial cattle/livestock' },
      { category: 'Infrastructure / Shed', pct: 15, note: 'Shed construction or renovation' },
      { category: 'Working Capital', pct: 10, note: 'Feed, medicine, daily operations' },
      { category: 'Licensing & Setup', pct: 3, note: 'FSSAI, local permits' },
      { category: 'Marketing', pct: 4, note: 'Branding and initial promotion' },
      { category: 'Emergency Reserve', pct: 8, note: '2–3 months operating buffer' }
    ],
    grocery: [
      { category: 'Initial Inventory', pct: 40, note: 'Stock for first 2–3 months' },
      { category: 'Shop Setup & Fixtures', pct: 20, note: 'Shelves, counter, display units' },
      { category: 'Rent Deposit', pct: 12, note: '2–3 months advance rent' },
      { category: 'Equipment', pct: 8, note: 'Weighing scale, billing system' },
      { category: 'Licensing & Setup', pct: 5, note: 'FSSAI, shop license' },
      { category: 'Working Capital', pct: 10, note: 'Daily cash float and reorder' },
      { category: 'Emergency Reserve', pct: 5, note: 'Buffer for first 2 months' }
    ],
    tailoring: [
      { category: 'Sewing Machines & Equipment', pct: 40, note: 'Industrial machines, overlockers' },
      { category: 'Raw Material / Fabric Stock', pct: 20, note: 'Initial fabric and thread inventory' },
      { category: 'Shop Setup', pct: 15, note: 'Interior, display, work area' },
      { category: 'Rent Deposit', pct: 10, note: 'Advance rent' },
      { category: 'Licensing', pct: 3, note: 'Shop license, GST' },
      { category: 'Marketing', pct: 5, note: 'Signage, promotion' },
      { category: 'Emergency Reserve', pct: 7, note: 'Operating buffer' }
    ],
    default: [
      { category: 'Equipment & Machinery', pct: 30, note: 'Primary business equipment' },
      { category: 'Initial Inventory / Stock', pct: 20, note: 'Starting inventory' },
      { category: 'Shop Setup & Infrastructure', pct: 15, note: 'Setup and fixtures' },
      { category: 'Rent Deposit', pct: 8, note: '2–3 months advance rent' },
      { category: 'Working Capital', pct: 12, note: 'Daily operations float' },
      { category: 'Licensing & Setup Costs', pct: 5, note: 'Permits and registration' },
      { category: 'Marketing', pct: 5, note: 'Initial promotion' },
      { category: 'Emergency Reserve', pct: 5, note: 'Contingency buffer' }
    ]
  };

  let template = templates.default;
  if (categoryLower.includes('dairy') || categoryLower.includes('milk')) template = templates.dairy;
  else if (categoryLower.includes('grocery') || categoryLower.includes('kirana') || categoryLower.includes('store')) template = templates.grocery;
  else if (categoryLower.includes('tailor') || categoryLower.includes('stitch') || categoryLower.includes('garment')) template = templates.tailoring;

  return template.map(item => ({
    category: item.category,
    percentage: item.pct,
    amount: Math.round((item.pct / 100) * totalProjectCost),
    note: item.note,
    isEstimate: true
  }));
}

/**
 * Estimate monthly operating costs.
 * All values labeled as estimates — user can override them.
 *
 * @param {string} businessCategory
 * @param {number} projectCost
 * @param {string} location - location string (used for rough tier estimation)
 * @returns {object} Operating cost estimates
 */
export function estimateOperatingCosts(businessCategory, projectCost, location = '') {
  // Simple tier-based estimation
  const isRural = !['city', 'urban', 'metro', 'chennai', 'mumbai', 'delhi', 'bangalore']
    .some(term => location.toLowerCase().includes(term));

  const scaleFactor = isRural ? 0.7 : 1.0;
  const monthlyCostBase = projectCost * 0.04; // ~4% of project cost per month

  return {
    isEstimate: true,
    locationTier: isRural ? 'Rural/Semi-Urban' : 'Urban',
    items: [
      { category: 'Rent', amount: Math.round(monthlyCostBase * 0.30 * scaleFactor), note: 'Estimated monthly rent' },
      { category: 'Labour', amount: Math.round(monthlyCostBase * 0.25 * scaleFactor), note: 'Staff wages (if any)' },
      { category: 'Inventory Replenishment', amount: Math.round(monthlyCostBase * 0.20), note: 'Monthly restocking' },
      { category: 'Electricity & Utilities', amount: Math.round(monthlyCostBase * 0.10 * scaleFactor), note: 'Power, water, internet' },
      { category: 'Transportation', amount: Math.round(monthlyCostBase * 0.08 * scaleFactor), note: 'Logistics and delivery' },
      { category: 'Marketing', amount: Math.round(monthlyCostBase * 0.04), note: 'Promotion and advertising' },
      { category: 'Maintenance', amount: Math.round(monthlyCostBase * 0.03), note: 'Equipment upkeep' }
    ],
    disclaimer: 'These are estimated planning values based on typical business costs in similar locations. Please enter actual values once your business is operational.'
  };
}

/**
 * Calculate overall feasibility score (deterministic).
 * Weights are configurable.
 *
 * @param {object} params
 * @param {number} params.demandScore - 0-100 (from Module 1)
 * @param {number} params.supplyScore - 0-100 (from Module 1, LOWER = less competition)
 * @param {number} params.opportunityScore - 0-100 (from Module 1)
 * @param {number} params.availableMargin - entrepreneur's capital
 * @param {number} params.projectCost - calculated project cost
 * @param {number} params.monthlyEMI - calculated EMI
 * @param {number} params.expectedMonthlyRevenue - entrepreneur's estimate
 * @param {boolean} params.schemeMatched - whether a scheme was found
 * @returns {object} { feasibilityScore, breakdown, interpretation }
 */
export function calculateFeasibilityScore({
  demandScore = 50,
  supplyScore = 50,
  opportunityScore = 50,
  availableMargin = 0,
  projectCost = 0,
  monthlyEMI = 0,
  expectedMonthlyRevenue = 0,
  schemeMatched = false
}) {
  const weights = {
    marketDemand: 0.25,
    competition: 0.20,
    capitalAdequacy: 0.20,
    financialSustainability: 0.20,
    localOpportunity: 0.15
  };

  // Market Demand: use demandScore directly
  const marketDemandScore = Math.min(100, Math.max(0, demandScore ?? 50));

  // Competition: inverse of supplyScore (low supply = low competition = better for entrant)
  // supplyScore 0-100 where higher = more competition
  const competitionScore = Math.min(100, Math.max(0, 100 - (supplyScore ?? 50)));

  // Capital Adequacy: how much own capital relative to project cost
  let capitalAdequacyScore = 50;
  if (projectCost > 0 && availableMargin > 0) {
    const marginRatio = availableMargin / projectCost;
    // 10% margin = 60, 15% = 75, 20%+ = 90+
    capitalAdequacyScore = Math.min(100, Math.round(marginRatio * 500));
    // Bonus if scheme matched
    if (schemeMatched) capitalAdequacyScore = Math.min(100, capitalAdequacyScore + 15);
  }

  // Financial Sustainability: EMI-to-revenue ratio
  let financialSustainabilityScore = 50;
  if (monthlyEMI > 0 && expectedMonthlyRevenue > 0) {
    const emiRatio = monthlyEMI / expectedMonthlyRevenue;
    if (emiRatio <= 0.20) financialSustainabilityScore = 90;
    else if (emiRatio <= 0.30) financialSustainabilityScore = 75;
    else if (emiRatio <= 0.40) financialSustainabilityScore = 60;
    else if (emiRatio <= 0.50) financialSustainabilityScore = 45;
    else financialSustainabilityScore = 30;
  } else if (expectedMonthlyRevenue > 0 && monthlyEMI === 0) {
    financialSustainabilityScore = 70; // no loan, good
  }

  // Local Opportunity
  const localOpportunityScore = Math.min(100, Math.max(0, opportunityScore ?? 50));

  const overallScore = Math.round(
    marketDemandScore * weights.marketDemand +
    competitionScore * weights.competition +
    capitalAdequacyScore * weights.capitalAdequacy +
    financialSustainabilityScore * weights.financialSustainability +
    localOpportunityScore * weights.localOpportunity
  );

  const breakdown = {
    marketDemand: { score: Math.round(marketDemandScore), weight: weights.marketDemand, label: 'Market Demand' },
    competition: { score: Math.round(competitionScore), weight: weights.competition, label: 'Competition Level' },
    capitalAdequacy: { score: Math.round(capitalAdequacyScore), weight: weights.capitalAdequacy, label: 'Capital Adequacy' },
    financialSustainability: { score: Math.round(financialSustainabilityScore), weight: weights.financialSustainability, label: 'Financial Sustainability' },
    localOpportunity: { score: Math.round(localOpportunityScore), weight: weights.localOpportunity, label: 'Local Opportunity' }
  };

  let interpretation;
  if (overallScore >= 75) interpretation = 'Promising';
  else if (overallScore >= 60) interpretation = 'Moderate Opportunity';
  else if (overallScore >= 45) interpretation = 'Requires Further Validation';
  else interpretation = 'High Risk — Needs Review';

  return { feasibilityScore: overallScore, breakdown, interpretation };
}
