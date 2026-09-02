import { Radar } from 'lucide-react';

function AnalysisProgressModal({ isOpen, progress = 0, status = 'Initializing AI market models...' }) {
  if (!isOpen) return null;

  return (
    <div className="progress-modal-overlay">
      <div className="progress-modal-box">
        <h2 className="progress-modal-title">
          <Radar className="progress-modal-icon rotate-animation" size={20} />
          <span>Location Analysis in Progress</span>
        </h2>

        <div className="progress-bar-container">
          <div
            className="progress-bar-fill"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="progress-status-row">
          <span className="progress-status-text">{status}</span>
          <span className="progress-percent">{progress}%</span>
        </div>

        <p className="progress-disclaimer">
          This analysis processes large volumes of location, competitor, and demand data. Please hang tight, it's worth it.
        </p>
      </div>
    </div>
  );
}

export default AnalysisProgressModal;
