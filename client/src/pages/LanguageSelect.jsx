import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Globe, ArrowRight, CheckCircle2, Sparkles, MapPin, Landmark, Layers } from 'lucide-react';
import LiquidGlass from '../components/LiquidGlass.jsx';
import '../styles/language-select.css';

export default function LanguageSelect() {
  const { i18n, t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const returnTo = searchParams.get('returnTo') || '/';

  const [selectedLang, setSelectedLang] = useState(() => {
    return i18n.language === 'ta' ? 'ta' : 'en';
  });

  const handleSelect = (lang) => {
    setSelectedLang(lang);
    // Dynamically preview the language in i18n
    i18n.changeLanguage(lang);
  };

  const handleProceed = () => {
    i18n.changeLanguage(selectedLang);
    localStorage.setItem('app_language', selectedLang);
    navigate(returnTo);
  };

  return (
    <div className="language-select-page">
      {/* Ambient background orbs */}
      <div className="lang-bg-orbs" aria-hidden="true">
        <div className="lang-bg-orb lang-bg-orb--1" />
        <div className="lang-bg-orb lang-bg-orb--2" />
        <div className="lang-bg-orb lang-bg-orb--3" />
      </div>

      <header className="lang-select-header">
        <div className="lang-select-brand">
          <img src="/images/marketsense_logo.png" alt="MarketSense Logo" className="brand-logo-img" />
          <span>MarketSense</span>
        </div>
      </header>

      <main className="lang-select-main">
        <div className="lang-select-hero animate-in">
          <div className="lang-badge">
            <Sparkles size={13} className="lang-badge-icon" />
            <span>{selectedLang === 'ta' ? 'பன்மொழி ஆதரவு · Language Selection' : 'Multi-Language Support · மொழி தேர்வு'}</span>
          </div>

          <h1 className="lang-title">
            {selectedLang === 'ta' ? 'உங்கள் விருப்ப மொழியைத் தேர்வுசெய்க' : 'Choose Your Language'}
          </h1>
          <p className="lang-subtitle">
            {selectedLang === 'ta'
              ? 'அனைத்து வணிக ஆய்வு, போட்டியாளர் நுண்ணறிவு மற்றும் அரசு நிதி திட்ட அறிக்கைகளும் தேர்ந்தெடுக்கப்பட்ட மொழியில் உருவாக்கப்படும்.'
              : 'Select your preferred language. All location analysis, competitor intelligence, and financial advisory reports will be generated in this language.'}
          </p>
        </div>

        {/* Language Selection Grid */}
        <div className="lang-cards-grid">
          {/* 1. English Option */}
          <div
            className={`lang-card ${selectedLang === 'en' ? 'active' : ''}`}
            onClick={() => handleSelect('en')}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && handleSelect('en')}
          >
            <div className="lang-card-header">
              <div className="lang-flag-pill">
                <span className="flag-icon">🌐</span>
                <span className="flag-code">EN</span>
              </div>
              <div className={`lang-check-radio ${selectedLang === 'en' ? 'checked' : ''}`}>
                {selectedLang === 'en' && <CheckCircle2 size={18} className="check-icon" />}
              </div>
            </div>

            <div className="lang-card-body">
              <h2 className="lang-card-name">English</h2>
              <p className="lang-card-native">English (Global / Standard)</p>
              <p className="lang-card-desc">
                Complete site analysis, SWOT evaluation, competitor mapping, and banking financial advisory in English.
              </p>
            </div>

            <div className="lang-card-features">
              <div className="lang-feature-pill">
                <MapPin size={12} />
                <span>Google Places Data</span>
              </div>
              <div className="lang-feature-pill">
                <Landmark size={12} />
                <span>Govt Schemes & EMI</span>
              </div>
              <div className="lang-feature-pill">
                <Sparkles size={12} />
                <span>Mistral AI Reports</span>
              </div>
            </div>

            <div className="lang-card-glow" />
          </div>

          {/* 2. Tamil Option */}
          <div
            className={`lang-card ${selectedLang === 'ta' ? 'active' : ''}`}
            onClick={() => handleSelect('ta')}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && handleSelect('ta')}
          >
            <div className="lang-card-header">
              <div className="lang-flag-pill lang-flag-pill--tamil">
                <span className="flag-icon">🇮🇳</span>
                <span className="flag-code">தமிழ்</span>
              </div>
              <div className={`lang-check-radio ${selectedLang === 'ta' ? 'checked' : ''}`}>
                {selectedLang === 'ta' && <CheckCircle2 size={18} className="check-icon" />}
              </div>
            </div>

            <div className="lang-card-body">
              <h2 className="lang-card-name">தமிழ்</h2>
              <p className="lang-card-native">Tamil (தமிழ்நாடு & உலகெங்கிலும்)</p>
              <p className="lang-card-desc">
                முழுமையான சந்தை ஆய்வு, போட்டியாளர் பட்டியல், SWOT பகுப்பாய்வு மற்றும் அரசு மானியத் திட்ட வழிகாட்டல் தமிழில்.
              </p>
            </div>

            <div className="lang-card-features">
              <div className="lang-feature-pill">
                <MapPin size={12} />
                <span>தமிழில் சந்தை பகுப்பாய்வு</span>
              </div>
              <div className="lang-feature-pill">
                <Landmark size={12} />
                <span>அரசு மானியங்கள் & கடனுதவி</span>
              </div>
              <div className="lang-feature-pill">
                <Sparkles size={12} />
                <span>மிஸ்ட்ரல் AI தமிழ் அறிக்கை</span>
              </div>
            </div>

            <div className="lang-card-glow" />
          </div>

          {/* 3. Upcoming Languages */}
          <div className="lang-card lang-card--disabled">
            <div className="lang-card-header">
              <div className="lang-flag-pill lang-flag-pill--dim">
                <Layers size={13} />
                <span>விரைவில்</span>
              </div>
              <span className="coming-soon-tag">Coming Soon</span>
            </div>

            <div className="lang-card-body">
              <h2 className="lang-card-name">More Languages</h2>
              <p className="lang-card-native">हिन्दी • తెలుగు • ಕನ್ನಡ • മലയാളം</p>
              <p className="lang-card-desc">
                Support for Hindi, Telugu, Kannada, Malayalam and other Indian languages is currently under development.
              </p>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="lang-action-container">
          <LiquidGlass
            tagName="button"
            className="lang-submit-btn"
            onClick={handleProceed}
            depth={25}
            blur={1}
            glint={30}
            tint={0.12}
            tintColor="#3b82f6"
          >
            <span>
              {selectedLang === 'ta' ? 'செயலியைத் தொடங்கவும்' : 'Continue to Application'}
            </span>
            <ArrowRight size={18} className="btn-arrow" />
          </LiquidGlass>
          <p className="lang-note">
            {selectedLang === 'ta'
              ? '💡 நீங்கள் செயலியில் எப்போது வேண்டுமானாலும் மேல் பட்டியில் இருந்து மொழியை மாற்றிக்கொள்ளலாம்.'
              : '💡 You can easily change your language anytime from the top navigation bar.'}
          </p>
        </div>
      </main>
    </div>
  );
}
