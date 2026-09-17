import { ArrowLeft, ArrowRight, MessageSquare, MapPin, Store } from 'lucide-react';
import { useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import CompetitorTable from '../components/CompetitorTable.jsx';
import DemandSignalPanel from '../components/DemandSignalPanel.jsx';
import PageLoader from '../components/PageLoader.jsx';
import RecommendationPanel from '../components/RecommendationPanel.jsx';
import ScoreCard from '../components/ScoreCard.jsx';
import StrategicPlaybookPanel from '../components/StrategicPlaybookPanel.jsx';
import LiquidGlass from '../components/LiquidGlass.jsx';
import { useAnalysis } from '../hooks/useAnalysis.js';

function AnalysisResult() {
  const { t } = useTranslation();
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
          {t('analysis.newAnalysis')}
        </LiquidGlass>

        {/* Solid amber CTA — always visible, high contrast */}
        <Link
          to={`/chat?analysisId=${id}`}
          className="cta-ai-button"
          aria-label="Discuss this report with AI"
        >
          <MessageSquare size={16} aria-hidden="true" />
          {t('analysis.discussWithAi')}
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

      {/* ── Financial Structuring & Government Scheme Advisor CTA ───────── */}
      <section className="panel financial-cta-panel animate-in" style={{ marginTop: '2rem', border: '1px solid rgba(245,158,11,0.3)', background: 'linear-gradient(135deg, rgba(245,158,11,0.05) 0%, rgba(15,23,42,0.6) 100%)' }}>
        <div className="panel-heading compact" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <p className="eyebrow" style={{ color: 'var(--amber)' }}>{t('analysis.module2Banner')}</p>
            <h2 style={{ fontSize: '1.35rem', margin: '0.25rem 0' }}>{t('analysis.module2Title')}</h2>
          </div>
        </div>
        <p style={{ color: 'var(--text-muted)', margin: '0.75rem 0 1.5rem 0', fontSize: '0.95rem' }}>
          {t('analysis.module2Desc')}
        </p>
        <Link
          to={`/financial-structuring/${id}`}
          className="cta-ai-button"
          style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, padding: '0.75rem 1.5rem', borderRadius: '8px' }}
        >
          <span>Continue to Financial Planning</span>
          <ArrowRight size={16} aria-hidden="true" />
        </Link>
      </section>
    </div>
  );
}

export default AnalysisResult;
