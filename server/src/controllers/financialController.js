import { runFinancialAdvisory } from '../services/financialAdvisoryService.js';
import { findAnalysisById } from '../repositories/analysisRepository.js';
import { sendSuccess } from '../utils/responseFormatter.js';

export async function generateFinancialPlan(req, res, next) {
  try {
    const sessionId = req.sessionId;
    const {
      analysisId,
      location,
      businessCategory,
      // New wizard fields
      totalProjectCost,
      requestedLoanAmount,
      ownContribution,
      selectedSchemeId,
      // Shop expense breakdown
      shopRent,
      productMaintenanceCost,
      numberOfLabours,
      labourWagePerPerson,
      otherExpenses,
      // Revenue
      estimatedMonthlyRevenue,
      // Legacy
      ownInvestment,
      isExistingBusiness,
      estimatedMonthlyExpenses,
      assetStatus
    } = req.validatedBody;

    let marketData = null;
    let module1Location = location;
    let module1Category = businessCategory;
    let proposedNiche = '';

    if (analysisId) {
      try {
        const analysis = await findAnalysisById(analysisId);
        if (analysis) {
          module1Location = analysis.input?.location || location;
          module1Category = analysis.input?.businessType || businessCategory;
          proposedNiche = analysis.input?.niche || '';
          marketData = {
            analysisId: String(analysis._id),
            demandScore: analysis.demandScore ?? 50,
            supplyScore: analysis.supplyScore ?? 50,
            opportunityScore: analysis.opportunityScore ?? 50,
            opportunityTier: analysis.opportunityTier || 'Moderate',
            competitorCount: Array.isArray(analysis.competitors) ? analysis.competitors.length : 0
          };
        }
      } catch (err) {
        console.warn('[financialController] Failed to fetch Module 1 analysis (continuing):', err.message);
      }
    }

    const effectiveOwnContribution = ownContribution ?? ownInvestment ?? 0;

    const advisoryInput = {
      entrepreneurName: 'Entrepreneur',
      village: '',
      block: '',
      district: module1Location,
      state: '',
      businessCategory: module1Category,
      proposedBusiness: proposedNiche ? `${module1Category} (${proposedNiche})` : module1Category,
      isExistingBusiness,
      // New wizard fields
      totalProjectCost,
      requestedLoanAmount,
      ownContribution: effectiveOwnContribution,
      availableMargin: effectiveOwnContribution,
      selectedSchemeId,
      // Shop expenses
      shopRent: shopRent || 0,
      productMaintenanceCost: productMaintenanceCost || 0,
      numberOfLabours: numberOfLabours || 0,
      labourWagePerPerson: labourWagePerPerson || 0,
      otherExpenses: otherExpenses || 0,
      // Revenue
      expectedMonthlyRevenue: estimatedMonthlyRevenue || 0,
      expectedMonthlyExpenses: estimatedMonthlyExpenses || 0,
      hasShopOrLand: assetStatus === 'Own Shop' || assetStatus === 'Own Land',
      existingAssets: assetStatus,
      marketData
    };

    const advisoryResult = await runFinancialAdvisory(advisoryInput, sessionId);
    return sendSuccess(res, advisoryResult, 200);
  } catch (error) {
    return next(error);
  }
}
