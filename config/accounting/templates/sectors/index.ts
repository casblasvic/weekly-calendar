/**
 * Índice central de plantillas de personalización por sector
 * 
 * Cada plantilla añade cuentas y configuraciones específicas
 * según el tipo de negocio seleccionado
 */

// Importar todas las plantillas de sectores
import { AESTHETIC_CLINIC_TEMPLATE } from './aesthetic-clinic';
import { BEAUTY_CENTER_TEMPLATE } from './beauty-center';
import { SPA_WELLNESS_TEMPLATE } from './spa-wellness';

// Importar tipos
import { SectorTemplate, BusinessSector } from '@/types/accounting';

/**
 * Mapa de todas las plantillas de sectores disponibles
 */
export const SECTOR_TEMPLATES: Record<BusinessSector, SectorTemplate> = {
  [BusinessSector.AESTHETIC_CLINIC]: AESTHETIC_CLINIC_TEMPLATE,
  [BusinessSector.BEAUTY_CENTER]: BEAUTY_CENTER_TEMPLATE,
  [BusinessSector.SPA_WELLNESS]: SPA_WELLNESS_TEMPLATE,
  [BusinessSector.MEDICAL_CENTER]: {
    // Placeholder para futuras expansiones
    sector: BusinessSector.MEDICAL_CENTER,
    names: {
      es: "Centro Médico Privado",
      fr: "Centre Médical Privé",
      en: "Private Medical Center"
    },
    description: {
      es: "Próximamente: Personalización para centros médicos y consultorios",
      fr: "Bientôt: Personnalisation pour centres médicaux et cabinets",
      en: "Coming soon: Customization for medical centers and practices"
    },
    accountCustomizations: {
      additionalAccounts: [],
      accountModifications: {},
      defaultMappings: {
        services: {},
        products: {}
      }
    }
  },
  [BusinessSector.PHYSIOTHERAPY_CENTER]: {
    // Placeholder para futuras expansiones
    sector: BusinessSector.PHYSIOTHERAPY_CENTER,
    names: {
      es: "Centro de Fisioterapia",
      fr: "Centre de Physiothérapie",
      en: "Physiotherapy Center"
    },
    description: {
      es: "Próximamente: Personalización para centros de fisioterapia y rehabilitación",
      fr: "Bientôt: Personnalisation pour centres de physiothérapie et réadaptation",
      en: "Coming soon: Customization for physiotherapy and rehabilitation centers"
    },
    accountCustomizations: {
      additionalAccounts: [],
      accountModifications: {},
      defaultMappings: {
        services: {},
        products: {}
      }
    }
  },
  [BusinessSector.DENTAL_CLINIC]: {
    // Placeholder para futuras expansiones
    sector: BusinessSector.DENTAL_CLINIC,
    names: {
      es: "Clínica Dental",
      fr: "Clinique Dentaire",
      en: "Dental Clinic"
    },
    description: {
      es: "Próximamente: Personalización para clínicas dentales",
      fr: "Bientôt: Personnalisation pour cliniques dentaires",
      en: "Coming soon: Customization for dental clinics"
    },
    accountCustomizations: {
      additionalAccounts: [],
      accountModifications: {},
      defaultMappings: {
        services: {},
        products: {}
      }
    }
  }
};

/**
 * Obtener la plantilla de un sector específico
 */
export function getSectorTemplate(sector: BusinessSector): SectorTemplate | null {
  return SECTOR_TEMPLATES[sector] || null;
}

/**
 * Obtener lista de sectores disponibles con sus nombres localizados
 */
export function getAvailableSectors(language: 'es' | 'fr' | 'en' = 'es') {
  return Object.values(SECTOR_TEMPLATES).map(template => ({
    sector: template.sector,
    name: template.names[language],
    description: template.description[language],
    isAvailable: template.accountCustomizations.additionalAccounts.length > 0
  }));
}

// Re-exportar plantillas individuales para uso directo
export {
  AESTHETIC_CLINIC_TEMPLATE,
  BEAUTY_CENTER_TEMPLATE,
  SPA_WELLNESS_TEMPLATE
}; 