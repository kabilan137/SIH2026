import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Globe, Check, ChevronDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function LanguageSwitcher({ variant = 'compact' }) {
  const { i18n, t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  const currentLang = i18n.language === 'ta' ? 'ta' : 'en';

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng);
    setIsOpen(false);
  };

  const isTamil = currentLang === 'ta';

  if (variant === 'toggle-only') {
    return (
      <button
        type="button"
        className="lang-toggle-btn"
        onClick={() => changeLanguage(isTamil ? 'en' : 'ta')}
        title={t('common.changeLanguage')}
        aria-label={t('common.changeLanguage')}
      >
        <Globe size={15} aria-hidden="true" />
        <span>{isTamil ? 'தமிழ்' : 'English'}</span>
      </button>
    );
  }

  return (
    <div className="language-switcher-container" ref={dropdownRef}>
      <button
        type="button"
        className={`lang-selector-trigger ${isOpen ? 'active' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-label={t('common.changeLanguage')}
      >
        <Globe size={15} className="lang-globe-icon" aria-hidden="true" />
        <span className="lang-label">{isTamil ? 'தமிழ்' : 'EN'}</span>
        <ChevronDown size={12} className={`lang-chevron ${isOpen ? 'rotate' : ''}`} aria-hidden="true" />
      </button>

      {isOpen && (
        <div className="lang-dropdown-menu" role="menu">
          <div className="lang-dropdown-header">
            <span>{t('common.language')}</span>
          </div>

          <button
            type="button"
            className={`lang-option ${currentLang === 'en' ? 'selected' : ''}`}
            onClick={() => changeLanguage('en')}
            role="menuitem"
          >
            <div className="lang-option-text">
              <span className="lang-name">English</span>
              <span className="lang-sub">Global / US</span>
            </div>
            {currentLang === 'en' && <Check size={14} className="lang-check-icon" />}
          </button>

          <button
            type="button"
            className={`lang-option ${currentLang === 'ta' ? 'selected' : ''}`}
            onClick={() => changeLanguage('ta')}
            role="menuitem"
          >
            <div className="lang-option-text">
              <span className="lang-name">தமிழ்</span>
              <span className="lang-sub">Tamil Nadu & Global</span>
            </div>
            {currentLang === 'ta' && <Check size={14} className="lang-check-icon" />}
          </button>

          <div className="lang-dropdown-divider" />

          <button
            type="button"
            className="lang-all-screens-link"
            onClick={() => {
              setIsOpen(false);
              navigate('/select-language');
            }}
          >
            <span>{t('languageSelect.badge')}</span>
          </button>
        </div>
      )}
    </div>
  );
}
