import { useEffect, useRef, useState } from 'react';
import { Award, Gauge, ShieldCheck, TrendingUp, Zap, BarChart2, Target, Sparkles } from 'lucide-react';

/* ── Animated counter hook ─────────────────────────────────────────── */
function useAnimatedCounter(target, duration = 900, delay = 0) {
  const [value, setValue] = useState(0);
  const rafRef = useRef(null);

  useEffect(() => {
    if (target === null || target === undefined || typeof target !== 'number') return;
    const start = performance.now() + delay;

    const tick = (now) => {
      const elapsed = now - start;
      if (elapsed < 0) {
        rafRef.current = requestAnimationFrame(tick);
        return;
      }
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      setValue(Math.round(eased * target));
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      }
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => rafRef.current && cancelAnimationFrame(rafRef.current);
  }, [target, duration, delay]);

  return value;
}

/* ── SVG Radial Progress Ring ──────────────────────────────────────── */
function RadialRing({ score, color, size = 96, strokeWidth = 7 }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clampedScore = Math.min(100, Math.max(0, score ?? 0));
  const offset = circumference - (clampedScore / 100) * circumference;
  const animated = useAnimatedCounter(clampedScore, 1000, 100);

  return (
    <div className="radial-ring-wrap" style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="radial-ring-svg"
        aria-hidden="true"
      >
        {/* Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--surface-3)"
          strokeWidth={strokeWidth}
        />
        {/* Fill */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          className="radial-ring-fill"
        />
      </svg>
      <div className="radial-ring-label">
        <strong className="radial-value" style={{ color }}>{animated}</strong>
        <span className="radial-unit">/ 100</span>
      </div>
    </div>
  );
}

/* ── Hero Metric Widget (with radial ring) ─────────────────────────── */
function HeroMetricWidget({ icon: Icon, label, score, color, delay = 0 }) {
  return (
    <article
      className="metric-widget metric-widget--hero metric-widget--radial animate-in"
      style={{ animationDelay: `${0.08 + delay * 0.06}s` }}
    >
      <div className="metric-widget-header">
        <div className="metric-icon" style={{ background: `color-mix(in srgb, ${color} 12%, transparent)`, color }}>
          <Icon size={18} aria-hidden="true" />
        </div>
        <span className="metric-label">{label}</span>
      </div>
      <div className="metric-widget-body metric-widget-body--hero">
        <RadialRing score={score} color={color} size={100} strokeWidth={8} />
      </div>
    </article>
  );
}

/* ── Standard Metric Widget ────────────────────────────────────────── */
function MetricWidget({ icon: Icon, label, value, color = 'var(--accent)', score = null, delay = 0 }) {
  const clampedScore = score !== null && score !== undefined ? Math.min(100, Math.max(0, score)) : null;
  const animated = useAnimatedCounter(
    typeof value === 'number' ? value : null,
    800,
    delay * 60
  );
  const displayValue = typeof value === 'number' ? animated : (value ?? '—');

  return (
    <article
      className="metric-widget animate-in"
      style={{ animationDelay: `${0.08 + delay * 0.06}s` }}
    >
      <div className="metric-widget-header">
        <div className="metric-icon" style={{ background: `color-mix(in srgb, ${color} 12%, transparent)`, color }}>
          <Icon size={18} aria-hidden="true" />
        </div>
        <span className="metric-label">{label}</span>
      </div>
      <div className="metric-widget-body">
        <strong className="metric-value">{displayValue}</strong>
        {clampedScore !== null && (
          <div className="metric-progress-track">
            <div
              className="metric-progress-fill"
              style={{
                width: `${clampedScore}%`,
                background: color,
                boxShadow: `0 0 8px color-mix(in srgb, ${color} 50%, transparent)`,
                animationDelay: `${0.3 + delay * 0.08}s`
              }}
              aria-label={`${clampedScore}%`}
            />
          </div>
        )}
      </div>
    </article>
  );
}

/* ── Opportunity Tier Card ─────────────────────────────────────────── */
function TierCard({ opportunityTier, delay = 0 }) {
  const tierColors = {
    high: { color: 'var(--green)', bg: 'rgba(46,125,50,0.08)', border: 'rgba(46,125,50,0.2)' },
    moderate: { color: 'var(--amber)', bg: 'rgba(183,129,3,0.08)', border: 'rgba(183,129,3,0.2)' },
    low: { color: 'var(--orange)', bg: 'rgba(234,88,12,0.08)', border: 'rgba(234,88,12,0.2)' },
    'very-low': { color: 'var(--red)', bg: 'rgba(198,40,40,0.08)', border: 'rgba(198,40,40,0.2)' },
  };
  const key = (opportunityTier || '').toLowerCase().replace(' ', '-');
  const palette = tierColors[key] || tierColors['moderate'];

  return (
    <article
      className="metric-widget metric-widget--tier animate-in"
      style={{
        animationDelay: `${0.08 + delay * 0.06}s`,
        background: palette.bg,
        borderColor: palette.border,
      }}
    >
      <div className="metric-widget-header">
        <div className="metric-icon" style={{ background: `color-mix(in srgb, ${palette.color} 15%, transparent)`, color: palette.color }}>
          <Sparkles size={18} aria-hidden="true" />
        </div>
        <span className="metric-label">Opportunity tier</span>
      </div>
      <div className="metric-widget-body">
        <strong className={`metric-value tier-label tier-${key}`} style={{ color: palette.color }}>
          {opportunityTier}
        </strong>
        <div className="tier-sub-indicator" style={{ color: palette.color }}>
          <Zap size={13} aria-hidden="true" />
          <span>{key === 'high' ? 'Strong market fit' : key === 'moderate' ? 'Possible with strategy' : key === 'low' ? 'Challenging market' : 'Very difficult entry'}</span>
        </div>
      </div>
    </article>
  );
}

/* ── ScoreCard ─────────────────────────────────────────────────────── */
function ScoreCard({ analysis, demandScore, supplyScore, opportunityScore, opportunityTier }) {
  if (!analysis) return null;
  const score = analysis.overallScore ?? 0;

  return (
    <section className="score-grid" aria-label="Market score metrics">
      {/* Row 1: Hero metrics */}
      <HeroMetricWidget
        icon={Gauge}
        label="Overall score"
        score={score}
        color="var(--accent)"
        delay={0}
      />
      <HeroMetricWidget
        icon={Target}
        label="Opportunity score"
        score={opportunityScore}
        color={opportunityScore >= 60 ? 'var(--green)' : opportunityScore >= 35 ? 'var(--amber)' : 'var(--red)'}
        delay={1}
      />

      {/* Row 1 right: Grade + Confidence */}
      <MetricWidget
        icon={Award}
        label="Grade"
        value={analysis.grade}
        color="var(--green)"
        delay={2}
      />
      <MetricWidget
        icon={ShieldCheck}
        label="Confidence"
        value={analysis.confidence ? analysis.confidence.charAt(0).toUpperCase() + analysis.confidence.slice(1) : '—'}
        color="var(--amber)"
        delay={3}
      />

      {/* Row 2: Demand / Supply / Market Opp / Tier */}
      <MetricWidget
        icon={BarChart2}
        label="Demand score"
        value={demandScore ?? '—'}
        color="var(--teal)"
        score={demandScore}
        delay={4}
      />
      <MetricWidget
        icon={ShieldCheck}
        label="Supply pressure"
        value={supplyScore ?? '—'}
        color="var(--red)"
        score={supplyScore}
        delay={5}
      />
      <MetricWidget
        icon={TrendingUp}
        label="Market opportunity"
        value={analysis.marketAnalysis?.opportunityLevel}
        color="var(--blue)"
        delay={6}
      />
      {opportunityTier && (
        <TierCard opportunityTier={opportunityTier} delay={7} />
      )}
    </section>
  );
}

export default ScoreCard;
