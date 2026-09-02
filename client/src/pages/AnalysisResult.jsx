import { ArrowLeft, MessageSquare, MapPin, Store } from 'lucide-react';
import { useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';

import CompetitorTable from '../components/CompetitorTable.jsx';
import DemandSignalPanel from '../components/DemandSignalPanel.jsx';
import PageLoader from '../components/PageLoader.jsx';
import RecommendationPanel from '../components/RecommendationPanel.jsx';
import ScoreCard from '../components/ScoreCard.jsx';
import StrategicPlaybookPanel from '../components/StrategicPlaybookPanel.jsx';
import LiquidGlass from '../components/LiquidGlass.jsx';
import { useAnalysis } from '../hooks/useAnalysis.js';

function AnalysisResult() {
  const { id } = useParams();
  const { loadAnalysis, state } = useAnalysis();
  const analysisDocument = state.currentAnalysis;

  useEffect(() => {
    if (!analysisDocument || analysisDocument.id !== id) {
      loadAnalysis(id).catch(() => undefined);
    }
  }, [analysisDocument, id, loadAnalysis]);

  if (state.loading && (!analysisDocument || analysisDocument.id !== id)) {
    return <PageLoader label="Loading analysis" />;
  }

  if (state.error && (!analysisDocument || analysisDocument.id !== id)) {
    return <div className="error-banner">{state.error}</div>;
  }

  if (!analysisDocument) {
    return null;
  }

  const {
    analysis,
    competitors,
    input,
    metadata,
    demandScore,
    supplyScore,
    opportunityScore,
    opportunityTier,
    audienceCategories,
    demandSignals
  } = analysisDocument;

  return (
    <div className="result-page">
      {/* ── Top action bar ───────────────────────────────────────────── */}
      <div className="page-actions result-page-actions">
        <LiquidGlass
          tagName={Link}
          to="/dashboard"
          className="secondary-button liquid-glass"
          depth={15}
          blur={8}
          tint={0.06}
          tintColor="#ffffff"
          glint={20}
          hoverParams={{ depth: 22, glint: 35, tint: 0.1 }}
        >
          <ArrowLeft size={16} aria-hidden="true" />
          New analysis
        </LiquidGlass>

        {/* Solid amber CTA — always visible, high contrast */}
        <Link
          to={`/chat?analysisId=${id}`}
          className="cta-ai-button"
          aria-label="Discuss this report with AI"
        >
          <MessageSquare size={16} aria-hidden="true" />
          Discuss report with AI
        </Link>
      </div>

      {/* ── Page hero header ─────────────────────────────────────────── */}
      <section className="result-header-hero" aria-label="Analysis subject">
        <div className="result-header-meta">
          <span className="result-business-badge">
            <Store size={13} aria-hidden="true" />
            {input.businessType}
          </span>
          {input.niche && (
            <span className="result-niche-tag">{input.niche}</span>
          )}
        </div>
        <h1 className="result-location-title">
          <MapPin size={22} className="result-location-pin" aria-hidden="true" />
          {input.location}
        </h1>
      </section>

      {/* ── Score cards — demand, supply, opportunity ─────────────────── */}
      <ScoreCard
        analysis={analysis}
        demandScore={demandScore}
        supplyScore={supplyScore}
        opportunityScore={opportunityScore}
        opportunityTier={opportunityTier}
      />

      {/* ── Evidence warnings ─────────────────────────────────────────── */}
      {metadata?.evidenceWarnings?.length > 0 && (
        <section className="evidence-strip" aria-label="Evidence warnings">
          {metadata.evidenceWarnings.map((warning) => (
            <span key={warning}>{warning}</span>
          ))}
        </section>
      )}

      {/* ── Demand Signal map ─────────────────────────────────────────── */}
      <DemandSignalPanel
        audienceCategories={audienceCategories}
        demandSignals={demandSignals}
        demandScore={demandScore}
      />

      {/* ── Recommendation + AI interpretations ──────────────────────── */}
      <RecommendationPanel
        recommendation={analysis.recommendation}
        summary={analysis.summary}
        marketAnalysis={analysis.marketAnalysis}
        demandAnalysis={analysis.demandAnalysis}
        supplyAnalysis={analysis.supplyAnalysis}
        opportunityAnalysis={analysis.opportunityAnalysis}
        audienceInsights={analysis.audienceInsights}
        competitorInsights={analysis.competitorInsights}
        pricingAnalysis={analysis.pricingAnalysis}
      />

      {/* ── Strategic Business Playbook ───────────────────────────────── */}
      <StrategicPlaybookPanel
        swotAnalysis={analysis.swotAnalysis}
        financialProjections={analysis.financialProjections}
        riskAssessment={analysis.riskAssessment}
        marketingPlaybook={analysis.marketingPlaybook}
        implementationRoadmap={analysis.implementationRoadmap}
      />

      {/* ── Competitor table ──────────────────────────────────────────── */}
      <CompetitorTable competitors={competitors} assessment={analysis.competitorAssessment} />
    </div>
  );
}

export default AnalysisResult;
