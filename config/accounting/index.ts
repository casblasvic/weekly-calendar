/**
 * Configuración principal del sistema de contabilidad internacional
 * 
 * Este archivo centraliza todas las plantillas de planes contables
 * y configuraciones fiscales por país
 */

// Importar configuraciones existentes
import { BASIC_ACCOUNTS_BY_COUNTRY, PAYMENT_METHOD_MAPPINGS, type BasicAccount } from './basic-accounts';
import { SERIES_TEMPLATES_BY_COUNTRY, generateSeriesCode, generateSeriesName, type SeriesTemplate } from './basic-series';

// Configuraciones de IVA
import { MOROCCO_VAT_CONFIG } from './vat/morocco-vat';
import { FRANCE_VAT_CONFIG } from './vat/france-vat';
import { SPAIN_VAT_CONFIG } from './vat/spain-vat';

// Re-exportar las plantillas básicas
export { BASIC_ACCOUNTS_BY_COUNTRY, PAYMENT_METHOD_MAPPINGS };
export { SERIES_TEMPLATES_BY_COUNTRY, generateSeriesCode, generateSeriesName };
export type { BasicAccount, SeriesTemplate };

// Re-exportar las configuraciones de IVA
export { MOROCCO_VAT_CONFIG };
export { FRANCE_VAT_CONFIG };
export { SPAIN_VAT_CONFIG };

// Tipos
export * from '@/types/accounting';

// Constantes del sistema
export const SUPPORTED_COUNTRIES = ['MA', 'FR', 'ES'] as const;
export type SupportedCountry = typeof SUPPORTED_COUNTRIES[number];
export type SupportedLanguage = 'es' | 'fr' | 'en' | 'ar';

// Tipo para las plantillas de cuentas (para compatibilidad)
export type ChartOfAccountTemplate = {
  id: string;
  name: string;
  description: string;
  countryCode: SupportedCountry;
  accounts: BasicAccount[];
};

export const DEFAULT_LANGUAGE = 'es';
export const SUPPORTED_LANGUAGES = ['es', 'fr', 'en', 'ar'] as const;

// Función simplificada para obtener plantilla por país
export function getAccountTemplateByCountry(country: string) {
  // Buscar en las cuentas básicas por país
  const accounts = BASIC_ACCOUNTS_BY_COUNTRY[country];
  if (accounts) {
    return {
      id: `BASIC_${country}`,
      name: `Plan Contable ${country}`,
      description: `Plan contable básico para ${country}`,
      countryCode: country,
      accounts: accounts
    };
  }
  
  // Si no hay plantilla específica, devolver null
  return null;
}

// Crear BASIC_ACCOUNT_TEMPLATES para compatibilidad
export const BASIC_ACCOUNT_TEMPLATES = Object.entries(BASIC_ACCOUNTS_BY_COUNTRY).map(([country, accounts]) => ({
  id: `BASIC_${country}`,
  name: `Plan Contable ${country}`,
  description: `Plan contable básico para ${country}`,
  countryCode: country,
  accounts: accounts
}));

// Función stub para sectores (para evitar errores)
export function getAvailableSectors() {
  return [
    { id: 'AESTHETIC_CLINIC', name: 'Clínica Estética' },
    { id: 'MEDICAL_CLINIC', name: 'Clínica Médica' },
    { id: 'SPA', name: 'Spa / Centro de Bienestar' }
  ];
}

// Función stub para obtener plantilla de sector
export function getSectorTemplate(sectorId: string) {
  // Por ahora devolver null hasta implementar sectores
  return null;
}

// Plantilla base genérica (stub)
export const IFRS_AESTHETIC_CLINIC_TEMPLATE = {
  id: 'IFRS_AESTHETIC_CLINIC',
  name: 'IFRS - Clínica Estética',
  description: 'Plantilla base IFRS para clínicas estéticas',
  countryCode: 'INTERNATIONAL',
  accounts: []
};

// Plantillas por país (stubs)
export const PCG_MOROCCO_CLINIC_TEMPLATE = getAccountTemplateByCountry('MA');
export const PCG_FRANCE_CLINIC_TEMPLATE = getAccountTemplateByCountry('FR');
export const PGC_SPAIN_CLINIC_TEMPLATE = getAccountTemplateByCountry('ES');

// Información de países (para compatibilidad con AccountingTemplateImporter)
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

// Mapas de plantillas y configuraciones de IVA por país (para compatibilidad)
export const COUNTRY_TEMPLATES = {
  MA: PCG_MOROCCO_CLINIC_TEMPLATE,
  FR: PCG_FRANCE_CLINIC_TEMPLATE,
  ES: PGC_SPAIN_CLINIC_TEMPLATE
} as const;

export const COUNTRY_VAT_CONFIGS = {
  MA: MOROCCO_VAT_CONFIG,
  FR: FRANCE_VAT_CONFIG,
  ES: SPAIN_VAT_CONFIG
} as const;