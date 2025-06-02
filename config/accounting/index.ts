/**
 * Configuración principal del sistema de contabilidad internacional
 * 
 * Este archivo centraliza todas las plantillas de planes contables
 * y configuraciones fiscales por país
 */

// Plantillas base
import { IFRS_AESTHETIC_CLINIC_TEMPLATE } from './templates/base/ifrs-clinic';

// Plantillas por país
import { PCG_MOROCCO_CLINIC_TEMPLATE } from './templates/countries/MA/pcg-morocco-clinic';
import { PCG_FRANCE_CLINIC_TEMPLATE } from './templates/countries/FR/pcg-france-clinic';
import { PGC_SPAIN_CLINIC_TEMPLATE } from './templates/countries/ES/pgc-spain-clinic';

// Configuraciones de IVA
import { MOROCCO_VAT_CONFIG } from './vat/morocco-vat';
import { FRANCE_VAT_CONFIG } from './vat/france-vat';
import { SPAIN_VAT_CONFIG } from './vat/spain-vat';

// Plantillas de sectores
import { 
  SECTOR_TEMPLATES, 
  getSectorTemplate, 
  getAvailableSectors 
} from './templates/sectors';

// Re-exportar las plantillas para uso directo
export { IFRS_AESTHETIC_CLINIC_TEMPLATE };
export { PCG_MOROCCO_CLINIC_TEMPLATE };
export { PCG_FRANCE_CLINIC_TEMPLATE };
export { PGC_SPAIN_CLINIC_TEMPLATE };

// Re-exportar las configuraciones de IVA
export { MOROCCO_VAT_CONFIG };
export { FRANCE_VAT_CONFIG };
export { SPAIN_VAT_CONFIG };

// Re-exportar funciones y plantillas de sectores
export { SECTOR_TEMPLATES, getSectorTemplate, getAvailableSectors };

// Tipos
export * from '@/types/accounting';

// Constantes del sistema
export const SUPPORTED_COUNTRIES = ['MA', 'FR', 'ES'] as const;
export type SupportedCountry = typeof SUPPORTED_COUNTRIES[number];

export const DEFAULT_LANGUAGE = 'es';
export const SUPPORTED_LANGUAGES = ['es', 'fr', 'en', 'ar'] as const;
export type SupportedLanguage = typeof SUPPORTED_LANGUAGES[number];

// Mapa de plantillas por país
export const COUNTRY_TEMPLATES = {
  MA: PCG_MOROCCO_CLINIC_TEMPLATE,
  FR: PCG_FRANCE_CLINIC_TEMPLATE,
  ES: PGC_SPAIN_CLINIC_TEMPLATE
} as const;

// Mapa de configuraciones de IVA por país
export const COUNTRY_VAT_CONFIGS = {
  MA: MOROCCO_VAT_CONFIG,
  FR: FRANCE_VAT_CONFIG,
  ES: SPAIN_VAT_CONFIG
} as const;

// Información de países
export const COUNTRY_INFO = {
  MA: {
    code: 'MA',
    names: {
      es: 'Marruecos',
      fr: 'Maroc',
      en: 'Morocco',
      ar: 'المغرب'
    },
    currency: 'MAD',
    defaultLanguage: 'fr' as SupportedLanguage,
    languages: ['fr', 'ar', 'es', 'en'] as SupportedLanguage[],
    accounting: {
      standard: 'CGNC',
      fiscalYearStart: '01-01',
      fiscalYearEnd: '12-31'
    }
  },
  FR: {
    code: 'FR',
    names: {
      es: 'Francia',
      fr: 'France',
      en: 'France',
      ar: 'فرنسا'
    },
    currency: 'EUR',
    defaultLanguage: 'fr' as SupportedLanguage,
    languages: ['fr', 'en', 'es', 'ar'] as SupportedLanguage[],
    accounting: {
      standard: 'PCG',
      fiscalYearStart: '01-01',
      fiscalYearEnd: '12-31'
    }
  },
  ES: {
    code: 'ES',
    names: {
      es: 'España',
      fr: 'Espagne',
      en: 'Spain',
      ar: 'إسبانيا'
    },
    currency: 'EUR',
    defaultLanguage: 'es' as SupportedLanguage,
    languages: ['es', 'en', 'fr', 'ar'] as SupportedLanguage[],
    accounting: {
      standard: 'PGC',
      fiscalYearStart: '01-01',
      fiscalYearEnd: '12-31'
    }
  }
} as const;

// Tipos exportados
export type { ChartOfAccountTemplate, CountryTemplate, VATRate, CountryVATConfig } from '@/types/accounting'; 