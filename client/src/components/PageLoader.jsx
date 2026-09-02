import { Radar } from 'lucide-react';

/**
 * PageLoader — replaces the old LoadingSpinner (orb animation).
 *
 * Renders a full-viewport centered loading state that matches the
 * AnalysisProgressModal visual language: shimmer progress bar + status text.
 *
 * Props:
 *   label   — status text shown below the bar  (default: "Loading")
 *   icon    — optional lucide icon component   (default: Radar)
 */
function PageLoader({ label = 'Loading', icon: Icon = Radar }) {
  return (
    <div className="page-loader" role="status" aria-live="polite" aria-label={label}>
      <div className="page-loader-inner">
        {/* Icon */}
        <div className="page-loader-icon-wrap" aria-hidden="true">
          <Icon size={22} className="page-loader-icon" />
        </div>

        {/* Shimmer progress bar — matches AnalysisProgressModal style */}
        <div className="page-loader-bar-track" aria-hidden="true">
          <div className="page-loader-bar-shimmer" />
        </div>

        {/* Label */}
        <span className="page-loader-label">{label}</span>
      </div>
    </div>
  );
}

export default PageLoader;
