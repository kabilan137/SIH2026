import { Radar } from 'lucide-react';
import { useTranslation } from 'react-i18next';

function AnalysisProgressModal({ isOpen, progress = 0, status = 'Initializing AI market models...' }) {
  const { t, i18n } = useTranslation();
  if (!isOpen) return null;

  const isTa = i18n.language === 'ta';

  return (
    <div className="progress-modal-overlay">
      <div className="progress-modal-box">
        <h2 className="progress-modal-title">
          <Radar className="progress-modal-icon rotate-animation" size={20} />
          <span>{t('progress.title')}</span>
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
          {isTa
            ? 'இந்த பகுப்பாய்வு பெரிய அளவிலான இருப்பிடம், போட்டியாளர் மற்றும் தேவைக் குறிகாட்டிகளை செயலாக்குகிறது. சிறிது நேரம் காத்திருக்கவும்.'
            : "This analysis processes large volumes of location, competitor, and demand data. Please hang tight, it's worth it."}
        </p>
      </div>
    </div>
  );
}

export default AnalysisProgressModal;
