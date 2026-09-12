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
      ownInvestment,
      isExistingBusiness,
      estimatedMonthlyRevenue,
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

    const advisoryInput = {
      entrepreneurName: 'Entrepreneur',
      village: '',
      block: '',
      district: module1Location,
      state: '',
      businessCategory: module1Category,
      proposedBusiness: proposedNiche ? `${module1Category} (${proposedNiche})` : module1Category,
      isExistingBusiness,
      availableMargin: ownInvestment,
      expectedMonthlyRevenue: estimatedMonthlyRevenue,
      expectedMonthlyExpenses: estimatedMonthlyExpenses,
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
