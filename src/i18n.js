import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import nl from './locales/nl.json'
import en from './locales/en.json'

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: { nl: { translation: nl }, en: { translation: en } },
    fallbackLng: 'en',
    supportedLngs: ['nl', 'en'],
    detection: { order: ['localStorage', 'navigator'], caches: ['localStorage'], lookupLocalStorage: 'coach-lang' },
    interpolation: { escapeValue: false },
  })

export default i18n
