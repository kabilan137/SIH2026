import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from './locales/en.json';
import ta from './locales/ta.json';

const savedLanguage = typeof window !== 'undefined'
  ? localStorage.getItem('app_language') || 'en'
  : 'en';

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      ta: { translation: ta }
    },
    lng: savedLanguage,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false // React already escapes values
    }
  });

// Broadcast changes when language switches
i18n.on('languageChanged', (lng) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('app_language', lng);
    document.documentElement.lang = lng;
    window.dispatchEvent(new CustomEvent('app_language_change', { detail: lng }));
  }
});

if (typeof window !== 'undefined') {
  document.documentElement.lang = savedLanguage;
}

export default i18n;
