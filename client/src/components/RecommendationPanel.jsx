import { useState } from 'react';
import { CheckCircle2, ListChecks, Target, TrendingDown, TrendingUp, Zap, Users, BarChart2, DollarSign, ChevronDown, ChevronUp, Lightbulb } from 'lucide-react';

/* ── Insight Card (replaces the old AnalysisBlock) ─────────────────── */
function InsightCard({ icon: Icon, label, text, accentColor, index = 0 }) {
  const [expanded, setExpanded] = useState(false);
  if (!text) return null;

  // Split text into "preview" (first ~130 words) and "rest"
  const words = text.split(' ');
  const PREVIEW_WORDS = 55;
  const hasMore = words.length > PREVIEW_WORDS;
  const previewText = words.slice(0, PREVIEW_WORDS).join(' ');
  const restText = words.slice(PREVIEW_WORDS).join(' ');

  return (
    <div
      className="insight-card animate-in"
      style={{
        animationDelay: `${0.05 + index * 0.08}s`,
        '--card-accent': accentColor,
      }}
    >
      {/* Gradient top border rendered as a pseudo-like element via box-shadow */}
      <div className="insight-card-top-bar" style={{ background: accentColor }} />

      <div className="insight-card-header">
        <div className="insight-icon-pill" style={{ background: `color-mix(in srgb, ${accentColor} 14%, transparent)`, color: accentColor }}>
          <Icon size={15} aria-hidden="true" />
        </div>
        <span className="insight-card-label" style={{ color: accentColor }}>{label}</span>
      </div>

      <p className="insight-body-text">
        {expanded ? text : previewText}
        {!expanded && hasMore && '…'}
      </p>

      {hasMore && (
        <button
          className="read-more-btn"
          style={{ color: accentColor }}
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
        >
          {expanded ? (
            <><ChevronUp size={13} aria-hidden="true" /> Show less</>
          ) : (
            <><ChevronDown size={13} aria-hidden="true" /> Read more</>
          )}
        </button>
      )}
    </div>
  );
}

/* ── RecommendationPanel ────────────────────────────────────────────── */
function RecommendationPanel({
  recommendation,
  summary,
  marketAnalysis,
  demandAnalysis,
  supplyAnalysis,
  opportunityAnalysis,
  audienceInsights,
  competitorInsights,
  pricingAnalysis
}) {
  if (!recommendation) return null;

  const hasNewInsights =
    demandAnalysis ||
    supplyAnalysis ||
    opportunityAnalysis ||
    audienceInsights ||
    competitorInsights ||
    pricingAnalysis;

  const insights = [
    { icon: BarChart2, label: 'Demand Analysis', text: demandAnalysis, accentColor: 'var(--teal)' },
    { icon: TrendingDown, label: 'Supply Analysis', text: supplyAnalysis, accentColor: 'var(--orange)' },
    { icon: Zap, label: 'Opportunity Analysis', text: opportunityAnalysis, accentColor: 'var(--purple)' },
    { icon: Users, label: 'Audience Insights', text: audienceInsights, accentColor: 'var(--blue)' },
    { icon: TrendingUp, label: 'Competitor Insights', text: competitorInsights, accentColor: 'var(--rose)' },
    { icon: DollarSign, label: 'Pricing Analysis', text: pricingAnalysis, accentColor: 'var(--green)' },
  ].filter((item) => !!item.text);

  return (
    <section className="recommendation-layout">
      {/* ── Primary recommendation card ───────────────────────────── */}
      <article className="panel recommendation-panel">
        <div className="panel-heading compact">
          <div>
            <p className="eyebrow">Recommendation</p>
            <h2>{recommendation.decision}</h2>
          </div>
          <CheckCircle2 size={22} aria-hidden="true" style={{ color: 'var(--accent-dim)', opacity: 0.8 }} />
        </div>
        <p className="summary-text">{summary}</p>

        <div className="list-block">
          <h3>
            <ListChecks size={18} aria-hidden="true" />
            Reasoning
          </h3>
          <ul>
            {(recommendation.reasoning || []).map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>

        <div className="list-block">
          <h3>
            <Target size={18} aria-hidden="true" />
            Positioning
          </h3>
          <ul>
            {(recommendation.suggestedPositioning || []).map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </article>

      {/* ── Market entry profile card ────────────────────────────── */}
      <article className="panel market-panel">
        <div className="panel-heading compact">
          <div>
            <p className="eyebrow">Market factors</p>
            <h2>Entry profile</h2>
          </div>
        </div>

        <dl className="factor-list">
          <div>
            <dt>Density</dt>
            <dd>{marketAnalysis?.competitorDensity}</dd>
          </div>
          <div>
            <dt>Entry difficulty</dt>
            <dd>{marketAnalysis?.entryDifficulty}</dd>
          </div>
          <div>
            <dt>Saturation</dt>
            <dd>{marketAnalysis?.marketSaturation}</dd>
          </div>
          <div>
            <dt>Opportunity</dt>
            <dd>{marketAnalysis?.opportunityLevel}</dd>
          </div>
        </dl>
      </article>

      {/* ── AI Signal Interpretation cards ──────────────────────── */}
      {hasNewInsights && (
        <article className="panel ai-insights-panel">
          <div className="panel-heading compact ai-insights-heading">
            <div>
              <p className="eyebrow">AI Analysis</p>
              <h2 className="insights-title">
                Signal Interpretation
              </h2>
            </div>
            <div className="insights-heading-badge">
              <Lightbulb size={16} aria-hidden="true" />
              <span>{insights.length} signals decoded</span>
            </div>
          </div>

          <div className="insights-grid">
            {insights.map((item, idx) => (
              <InsightCard key={item.label} {...item} index={idx} />
            ))}
          </div>
        </article>
      )}
    </section>
  );
}

export default RecommendationPanel;
