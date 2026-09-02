import { useState } from 'react';
import {
  Grid,
  Milestone,
  DollarSign,
  AlertTriangle,
  Megaphone,
  CheckCircle2,
  Clock,
  ShieldAlert,
  ArrowUpRight,
  Sparkles,
  TrendingUp,
  TrendingDown,
  Target,
  Lightbulb,
  Shield,
  Zap,
  Users,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

/* ── SWOT Box ───────────────────────────────────────────────────────── */
function SwotBox({ letter, title, items = [], variant }) {
  const configs = {
    strengths:    { color: 'var(--green)', bg: 'rgba(46,125,50,0.05)', border: 'rgba(46,125,50,0.18)', icon: TrendingUp },
    weaknesses:   { color: 'var(--red)', bg: 'rgba(198,40,40,0.05)', border: 'rgba(198,40,40,0.18)', icon: TrendingDown },
    opportunities:{ color: 'var(--blue)', bg: 'rgba(37,99,235,0.05)', border: 'rgba(37,99,235,0.18)', icon: Target },
    threats:      { color: 'var(--orange)', bg: 'rgba(234,88,12,0.05)', border: 'rgba(234,88,12,0.18)', icon: Shield },
  };
  const cfg = configs[variant];
  const BoxIcon = cfg.icon;

  return (
    <div
      className={`swot-box swot-${variant}`}
      style={{ '--swot-color': cfg.color, '--swot-bg': cfg.bg, '--swot-border': cfg.border }}
    >
      <div className="swot-box-header">
        <div className="swot-letter-badge" style={{ background: `color-mix(in srgb, ${cfg.color} 14%, transparent)`, color: cfg.color }}>
          <BoxIcon size={14} aria-hidden="true" />
          <span>{letter}</span>
        </div>
        <h3 style={{ color: cfg.color, margin: 0 }}>{title}</h3>
      </div>
      <ul className="swot-items">
        {items.map((item, idx) => (
          <li key={idx} className="swot-item">
            <span className="swot-bullet" style={{ background: cfg.color }} />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ── Risk Item ──────────────────────────────────────────────────────── */
function RiskItem({ risk, index }) {
  const [open, setOpen] = useState(false);

  // Derive severity from common keywords
  function getSeverity(desc = '') {
    const lower = desc.toLowerCase();
    if (lower.includes('high') || lower.includes('significant') || lower.includes('critical') || lower.includes('major')) return 'high';
    if (lower.includes('low') || lower.includes('minor') || lower.includes('unlikely')) return 'low';
    return 'medium';
  }

  const severity = getSeverity(risk.riskDescription);
  const severityConfig = {
    high:   { label: 'High risk', color: 'var(--red)', bg: 'rgba(198,40,40,0.08)', border: 'rgba(198,40,40,0.18)' },
    medium: { label: 'Medium risk', color: 'var(--orange)', bg: 'rgba(234,88,12,0.08)', border: 'rgba(234,88,12,0.18)' },
    low:    { label: 'Low risk', color: 'var(--green)', bg: 'rgba(46,125,50,0.08)', border: 'rgba(46,125,50,0.18)' },
  };
  const cfg = severityConfig[severity];

  return (
    <div className="risk-item-v2 animate-in" style={{ animationDelay: `${index * 0.06}s` }}>
      <div className="risk-item-header-v2">
        <div className="risk-item-left">
          <AlertTriangle size={16} className="risk-warning-icon" aria-hidden="true" style={{ color: cfg.color }} />
          <h4>{risk.riskCategory}</h4>
        </div>
        <span className="risk-severity-badge" style={{ color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.border}` }}>
          {cfg.label}
        </span>
      </div>
      <p className="risk-desc-v2">{risk.riskDescription}</p>
      <button
        className="risk-expand-btn"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        style={{ color: 'var(--green)' }}
      >
        <Shield size={13} aria-hidden="true" />
        {open ? 'Hide mitigation' : 'View mitigation strategy'}
        {open ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
      </button>
      {open && (
        <div className="risk-mitigation-v2 animate-in">
          <p className="mitigation-text">{risk.mitigationStrategy}</p>
        </div>
      )}
    </div>
  );
}

/* ── StrategicPlaybookPanel ─────────────────────────────────────────── */
function StrategicPlaybookPanel({
  swotAnalysis,
  financialProjections,
  riskAssessment = [],
  marketingPlaybook = [],
  implementationRoadmap = []
}) {
  const [activeTab, setActiveTab] = useState('swot');

  const hasSwot = swotAnalysis && (
    swotAnalysis.strengths?.length > 0 ||
    swotAnalysis.weaknesses?.length > 0 ||
    swotAnalysis.opportunities?.length > 0 ||
    swotAnalysis.threats?.length > 0
  );
  const hasFinancials = financialProjections && (
    financialProjections.capexRange || financialProjections.opexRange || financialProjections.estimatedBreakEven
  );
  const hasRisks = riskAssessment?.length > 0;
  const hasMarketing = marketingPlaybook?.length > 0;
  const hasRoadmap = implementationRoadmap?.length > 0;
  const hasPlaybook = hasSwot || hasFinancials || hasRisks || hasMarketing || hasRoadmap;

  // Tab definitions (only include available tabs)
  const tabs = [
    hasSwot     && { id: 'swot',       icon: Grid,       label: 'SWOT Matrix' },
    hasRoadmap  && { id: 'roadmap',    icon: Milestone,  label: 'Setup Roadmap' },
    hasFinancials && { id: 'financials', icon: DollarSign, label: 'Financials' },
    hasRisks    && { id: 'risks',      icon: ShieldAlert, label: 'Risk Assessment' },
    hasMarketing && { id: 'marketing', icon: Megaphone,  label: 'Marketing' },
  ].filter(Boolean);

  if (!hasPlaybook) {
    return (
      <section className="panel empty-playbook-panel animate-in" style={{ animationDelay: '0.4s' }}>
        <div className="panel-heading compact">
          <div>
            <p className="eyebrow">Strategic Playbook</p>
            <h2>Plan & Roadmap Unavailable</h2>
          </div>
        </div>
        <p className="text-muted" style={{ fontStyle: 'italic', margin: 0 }}>
          This market analysis record was generated on an older version of the engine and does not contain
          strategic playbook fields. Run a new analysis to receive full premium SWOT matrices, setup roadmaps,
          financial cost estimates, risk mitigations, and target audience marketing plans.
        </p>
      </section>
    );
  }

  return (
    <section className="panel strategic-playbook-panel animate-in" style={{ animationDelay: '0.4s' }}>
      {/* ── Panel header ────────────────────────────────────────── */}
      <div className="panel-heading playbook-panel-heading">
        <div>
          <p className="eyebrow">Premium Feature</p>
          <h2 className="playbook-title">Strategic Business Playbook</h2>
        </div>
        <div className="premium-badge-v2">
          <Sparkles size={13} aria-hidden="true" />
          <span>PRO EXECUTIVE</span>
        </div>
      </div>

      {/* ── Pill tab bar ─────────────────────────────────────────── */}
      <div className="playbook-tab-bar" role="tablist" aria-label="Strategic playbook views">
        {tabs.map((tab) => {
          const TabIcon = tab.icon;
          return (
            <button
              key={tab.id}
              className={`playbook-pill-tab ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
              role="tab"
              aria-selected={activeTab === tab.id}
              id={`tab-${tab.id}`}
              aria-controls={`panel-${tab.id}`}
            >
              <TabIcon size={14} aria-hidden="true" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ── Tab content ──────────────────────────────────────────── */}
      <div className="playbook-content">

        {/* SWOT 2×2 Matrix */}
        {activeTab === 'swot' && hasSwot && (
          <div id="panel-swot" role="tabpanel" aria-labelledby="tab-swot" className="swot-matrix-2x2 animate-in">
            <SwotBox letter="S" title="Strengths"     items={swotAnalysis.strengths}     variant="strengths" />
            <SwotBox letter="W" title="Weaknesses"    items={swotAnalysis.weaknesses}    variant="weaknesses" />
            <SwotBox letter="O" title="Opportunities" items={swotAnalysis.opportunities} variant="opportunities" />
            <SwotBox letter="T" title="Threats"       items={swotAnalysis.threats}       variant="threats" />
          </div>
        )}

        {/* Roadmap */}
        {activeTab === 'roadmap' && hasRoadmap && (
          <div id="panel-roadmap" role="tabpanel" aria-labelledby="tab-roadmap" className="roadmap-flow animate-in">
            {implementationRoadmap.map((phase, idx) => (
              <div key={idx} className="roadmap-step">
                <div className="roadmap-marker">
                  <div className="roadmap-node">{idx + 1}</div>
                  {idx < implementationRoadmap.length - 1 && <div className="roadmap-line" />}
                </div>
                <div className="roadmap-details">
                  <div className="roadmap-phase-header">
                    <h4>{phase.phaseName}</h4>
                    <span className="roadmap-timeline-tag">
                      <Clock size={12} aria-hidden="true" />
                      <span>{phase.timelineEstimate}</span>
                    </span>
                  </div>
                  <ul className="roadmap-tasks">
                    {(phase.keyTasks || []).map((task, tIdx) => (
                      <li key={tIdx}>
                        <CheckCircle2 size={14} className="task-check" aria-hidden="true" />
                        <span>{task}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Financials */}
        {activeTab === 'financials' && hasFinancials && (
          <div id="panel-financials" role="tabpanel" aria-labelledby="tab-financials" className="financials-view animate-in">
            <div className="fin-cards-row">
              <div className="fin-card fin-card--capex">
                <div className="fin-card-top">
                  <DollarSign size={16} className="fin-card-icon" aria-hidden="true" />
                  <span className="fin-card-label">Capital Expense</span>
                </div>
                <span className="fin-card-amount">{financialProjections.capexRange || 'N/A'}</span>
                <p className="fin-card-note">One-time launch & setup costs</p>
              </div>
              <div className="fin-card fin-card--opex">
                <div className="fin-card-top">
                  <Zap size={16} className="fin-card-icon" aria-hidden="true" />
                  <span className="fin-card-label">Monthly Operating Expense</span>
                </div>
                <span className="fin-card-amount">{financialProjections.opexRange || 'N/A'}</span>
                <p className="fin-card-note">Rental, staff & utilities per month</p>
              </div>
              <div className="fin-card fin-card--breakeven">
                <div className="fin-card-top">
                  <Target size={16} className="fin-card-icon" aria-hidden="true" />
                  <span className="fin-card-label">Break-Even Timeline</span>
                </div>
                <span className="fin-card-amount">{financialProjections.estimatedBreakEven || 'N/A'}</span>
                <p className="fin-card-note">Time to reach net-positive cash flow</p>
              </div>
            </div>
            {financialProjections.description && (
              <div className="financials-rationale">
                <h5><Lightbulb size={14} style={{ marginRight: 6 }} aria-hidden="true" />Strategic Financial Rationale</h5>
                <p>{financialProjections.description}</p>
              </div>
            )}
          </div>
        )}

        {/* Risks */}
        {activeTab === 'risks' && hasRisks && (
          <div id="panel-risks" role="tabpanel" aria-labelledby="tab-risks" className="risks-view animate-in">
            <div className="risks-list-v2">
              {riskAssessment.map((risk, idx) => (
                <RiskItem key={idx} risk={risk} index={idx} />
              ))}
            </div>
          </div>
        )}

        {/* Marketing */}
        {activeTab === 'marketing' && hasMarketing && (
          <div id="panel-marketing" role="tabpanel" aria-labelledby="tab-marketing" className="marketing-view animate-in">
            <div className="marketing-grid-v2">
              {marketingPlaybook.map((play, idx) => (
                <div key={idx} className="marketing-card-v2 animate-in" style={{ animationDelay: `${idx * 0.07}s` }}>
                  <div className="marketing-card-top">
                    <span className="mkt-audience-badge">
                      <Users size={11} aria-hidden="true" style={{ display: 'inline', marginRight: 4 }} />
                      {play.targetAudience}
                    </span>
                    <span className="mkt-channel-badge">
                      <ArrowUpRight size={11} aria-hidden="true" />
                      {play.channel}
                    </span>
                  </div>
                  <p className="mkt-tactic-text">{play.tacticDescription}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

export default StrategicPlaybookPanel;

