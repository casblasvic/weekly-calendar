import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Importar los archivos de traducción JSON
import esTranslations from '../locales/es.json';
import enTranslations from '../locales/en.json';
import frTranslations from '../locales/fr.json';

// Check if i18n is already initialized before calling init
if (!i18n.isInitialized) {
  // Configuración de i18next
  i18n
    // Detectar idioma del navegador
    .use(LanguageDetector)
    // Pasar la instancia de i18n a react-i18next
    .use(initReactI18next)
    // Inicializar i18next
    .init({
      debug: process.env.NODE_ENV === 'development', // Activar debug en desarrollo
      fallbackLng: 'es', // Idioma de respaldo si el detectado no está disponible
      // lng: 'es', // Opcional: Forzar un idioma inicial específico
      interpolation: {
        escapeValue: false, // React ya escapa por defecto
      },
      resources: {
        es: {
          translation: esTranslations,
        },
        'es-ES': {
          translation: esTranslations,
        },
        en: {
          translation: enTranslations,
        },
        fr: {
          translation: frTranslations,
        },
      },
    });
}

export default i18n; 