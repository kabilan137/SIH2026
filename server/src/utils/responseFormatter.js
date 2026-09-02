function toPlain(document) {
  if (!document) {
    return null;
  }

  return typeof document.toObject === 'function' ? document.toObject() : document;
}

function toId(value) {
  if (!value) {
    return undefined;
  }

  if (typeof value === 'string') {
    return value;
  }

  return String(value._id || value);
}

export function sendSuccess(res, data, statusCode = 200) {
  return res.status(statusCode).json({
    success: true,
    data
  });
}

export function formatCompetitor(document) {
  const competitor = toPlain(document);

  if (!competitor) {
    return null;
  }

  return {
    id: toId(competitor),
    placeId: competitor.placeId,
    name: competitor.name,
    address: competitor.address,
    rating: competitor.rating,
    reviewCount: competitor.reviewCount,
    reviews: competitor.reviews || [],
    location: competitor.location,
    businessCategory: competitor.businessCategory,
    businessStatus: competitor.businessStatus,
    sentimentSummary: competitor.sentimentSummary,
    evidence: competitor.evidence,
    googleMetadata: competitor.googleMetadata
  };
}

export function formatSearch(document) {
  const search = toPlain(document);

  if (!search) {
    return null;
  }

  return {
    id: toId(search),
    location: search.location,
    businessType: search.businessType,
    niche: search.niche,
    radiusMeters: search.radiusMeters,
    coordinates: search.coordinates,
    normalizedLocation: search.normalizedLocation,
    status: search.status,
    requestedAt: search.requestedAt,
    completedAt: search.completedAt
  };
}

export function formatAnalysisDocument(document) {
  const analysis = toPlain(document);

  if (!analysis) {
    return null;
  }

  return {
    id: toId(analysis),
    input: analysis.input,
    search: formatSearch(analysis.search),
    competitors: (analysis.competitors || []).map(formatCompetitor).filter(Boolean),
    analysis: {
      overallScore: analysis.overallScore,
      grade: analysis.grade,
      confidence: analysis.confidence,
      summary: analysis.summary,
      competitorAssessment: analysis.competitorAssessment || [],
      marketAnalysis: analysis.marketAnalysis,
      recommendation: analysis.recommendation,
      // Extended AI interpretation
      demandAnalysis: analysis.demandAnalysis ?? null,
      supplyAnalysis: analysis.supplyAnalysis ?? null,
      opportunityAnalysis: analysis.opportunityAnalysis ?? null,
      audienceInsights: analysis.audienceInsights ?? null,
      competitorInsights: analysis.competitorInsights ?? null,
      pricingAnalysis: analysis.pricingAnalysis ?? null,
      // Premium Strategic Playbook
      swotAnalysis: analysis.swotAnalysis ?? null,
      financialProjections: analysis.financialProjections ?? null,
      riskAssessment: analysis.riskAssessment ?? [],
      marketingPlaybook: analysis.marketingPlaybook ?? [],
      implementationRoadmap: analysis.implementationRoadmap ?? []
    },
    // Demand Signal Engine
    demandScore: analysis.demandScore ?? null,
    audienceStrength: analysis.audienceStrength ?? null,
    demandScoreBreakdown: analysis.demandScoreBreakdown ?? null,
    topDrivers: analysis.topDrivers ?? null,
    densityBand: analysis.densityBand ?? null,
    supplyScore: analysis.supplyScore ?? null,
    supplyScoreBreakdown: analysis.supplyScoreBreakdown ?? null,
    opportunityScore: analysis.opportunityScore ?? null,
    opportunityTier: analysis.opportunityTier ?? null,
    audienceCategories: analysis.audienceCategories || [],
    demandSignals: analysis.demandSignals ?? null,
    metadata: analysis.analysisMetadata,
    createdAt: analysis.createdAt,
    updatedAt: analysis.updatedAt
  };
}

export function formatHistoryItem(document) {
  const analysis = toPlain(document);
  const search = toPlain(analysis.search);

  return {
    id: toId(analysis),
    location: analysis.input?.location || search?.location,
    businessType: analysis.input?.businessType || search?.businessType,
    niche: analysis.input?.niche || search?.niche,
    overallScore: analysis.overallScore,
    grade: analysis.grade,
    confidence: analysis.confidence,
    competitorCount: Array.isArray(analysis.competitors) ? analysis.competitors.length : 0,
    createdAt: analysis.createdAt
  };
}
