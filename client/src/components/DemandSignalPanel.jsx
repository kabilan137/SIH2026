import { useEffect } from 'react';
import { BarChart2, Building2, Users } from 'lucide-react';

/**
 * DemandSignalPanel
 *
 * Displays audience categories and per-category demand signal counts
 * discovered from Google Places.
 */
function DemandSignalPanel({ audienceCategories = [], demandSignals = null, demandScore = null }) {
  const signals = demandSignals?.signals || [];
  const totalCount = demandSignals?.totalValidInstitutions ?? demandSignals?.totalSignalCount ?? 0;
  const hasSignals = signals.length > 0;

  if (!hasSignals && audienceCategories.length === 0) {
    return null;
  }

  // Log the places collected for each category to the browser console
  useEffect(() => {
    if (signals.length > 0) {
      console.log('%c--- Audience Data Collections ---', 'color: #3b82f6; font-weight: bold; font-size: 14px;');
      signals.forEach((signal) => {
        const count = signal.validCount ?? signal.count ?? 0;
        console.log(`%cCategory: ${signal.category} (Total Places: ${count})`, 'font-weight: bold;');
        if (signal.validInstitutions && signal.validInstitutions.length > 0) {
          console.table(
            signal.validInstitutions.map((inst) => ({
              Name: inst.name,
              Distance: inst.distanceMeters ? `${inst.distanceMeters}m` : 'N/A',
              Rating: inst.rating || 'N/A'
            }))
          );
        } else {
          console.log('  No specific valid institutions found or returned.');
        }
      });
      console.log('%c---------------------------------', 'color: #3b82f6; font-weight: bold;');
    }
  }, [signals]);

  // Build a lookup: category → signal data
  const signalByCategory = new Map(signals.map((s) => [s.category, s]));

  // Max count for bar scaling
  const maxCount = Math.max(1, ...signals.map((s) => s.validCount ?? s.count ?? 0));

  function formatCategory(category) {
    return category.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  }

  function getDemandColor(score) {
    if (score === null || score === undefined) return 'var(--text-muted)';
    if (score >= 70) return 'var(--green)';
    if (score >= 40) return 'var(--amber)';
    return 'var(--red)';
  }

  return (
    <section className="panel demand-signal-panel" aria-label="Demand signals">
      <div className="panel-heading compact">
        <div>
          <p className="eyebrow">Demand Intelligence</p>
          <h2>Audience Signal Map</h2>
        </div>
        <div className="demand-score-badge" style={{ color: getDemandColor(demandScore) }}>
          <BarChart2 size={20} aria-hidden="true" />
          <span>
            <strong>{demandScore ?? '—'}</strong>
            <small>/100</small>
          </span>
        </div>
      </div>

      {/* Audience category tags */}
      {audienceCategories.length > 0 && (
        <div className="audience-category-row">
          <Users size={14} aria-hidden="true" />
          <span className="eyebrow" style={{ margin: 0 }}>Audience categories</span>
          <div className="category-tags">
            {audienceCategories.map((cat) => (
              <span key={cat} className="category-tag">
                {formatCategory(cat)}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Per-category signal bars */}
      {hasSignals ? (
        <div className="demand-signal-list">
          <div className="demand-signal-header">
            <span>
              <Building2 size={14} aria-hidden="true" />
              Category
            </span>
            <span>Places found</span>
          </div>
          {signals.map((signal, index) => {
            const count = signal.validCount ?? signal.count ?? 0;
            const pct = maxCount > 0 ? Math.round((count / maxCount) * 100) : 0;
            return (
              <div
                key={signal.category}
                className="demand-signal-row"
                style={{ animationDelay: `${0.3 + index * 0.08}s` }}
              >
                <span className="signal-label">{formatCategory(signal.category)}</span>
                <div className="signal-bar-wrap">
                  <div
                    className="signal-bar"
                    style={{
                      width: `${pct}%`,
                      animationDelay: `${0.4 + index * 0.1}s`
                    }}
                    aria-label={`${count} places`}
                  />
                </div>
                <span className="signal-count">{count}</span>
                {signal.closestDistanceMeters !== null && (
                  <span className="signal-distance">
                    {signal.closestDistanceMeters < 1000
                      ? `${signal.closestDistanceMeters}m`
                      : `${(signal.closestDistanceMeters / 1000).toFixed(1)}km`}
                  </span>
                )}
              </div>
            );
          })}
          <p className="demand-total-note">
            {totalCount} total demand places across {signals.length} categories
          </p>
        </div>
      ) : (
        audienceCategories.length > 0 && (
          <p className="demand-empty-note">
            No demand signal places found in the search radius for these categories.
          </p>
        )
      )}
    </section>
  );
}

export default DemandSignalPanel;
