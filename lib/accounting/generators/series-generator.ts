/**
 * Generador de series de documentos contables
 */

import { BusinessFeatures, DocumentSeriesTemplate } from './types';

/**
 * Genera las series de documentos contables según el tipo de negocio
 * Para multi-centro, se generarán las series cuando se creen los centros
 */
export function generateDocumentSeries(
  businessType: string,
  features: BusinessFeatures,
  systemConfig: {
    currentYear: number;
    countryCode: string;
  }
): DocumentSeriesTemplate[] {
  const series: DocumentSeriesTemplate[] = [];
  const year = systemConfig.currentYear;

  // Series base para todos los negocios (códigos internacionales)
  
  // Tickets de venta (receipts)
  series.push({
    code: 'RCT',
    prefix: `RCT${year}`,
    documentType: 'RECEIPT',
    description: {
      es: 'Tickets de Venta',
      fr: 'Tickets de Caisse',
      en: 'Sales Receipts'
    },
    isActive: true,
    resetYearly: true,
    nextNumber: 1
  });

  // Facturas simplificadas (simplified invoices)
  series.push({
    code: 'SIV',
    prefix: `SIV${year}`,
    documentType: 'SIMPLIFIED_INVOICE',
    description: {
      es: 'Facturas Simplificadas',
      fr: 'Factures Simplifiées',
      en: 'Simplified Invoices'
    },
    isActive: true,
    resetYearly: true,
    nextNumber: 1
  });

  // Facturas completas (invoices)
  series.push({
    code: 'INV',
    prefix: `INV${year}`,
    documentType: 'INVOICE',
    description: {
      es: 'Facturas',
      fr: 'Factures',
      en: 'Invoices'
    },
    isActive: true,
    resetYearly: true,
    nextNumber: 1
  });

  // Notas de crédito / Abonos (credit notes)
  series.push({
    code: 'CRN',
    prefix: `CRN${year}`,
    documentType: 'CREDIT_NOTE',
    description: {
      es: 'Notas de Crédito / Abonos',
      fr: 'Avoirs',
      en: 'Credit Notes'
    },
    isActive: true,
    resetYearly: true,
    nextNumber: 1
  });

  // Facturas rectificativas (corrective invoices)
  series.push({
    code: 'CRI',
    prefix: `CRI${year}`,
    documentType: 'CORRECTIVE_INVOICE',
    description: {
      es: 'Facturas Rectificativas',
      fr: 'Factures Rectificatives',
      en: 'Corrective Invoices'
    },
    isActive: true,
    resetYearly: true,
    nextNumber: 1
  });

  // Series específicas según el tipo de negocio

  // Presupuestos (quotes)
  if (features.hasMedicalTreatments || features.hasConsultationServices) {
    series.push({
      code: 'QTE',
      prefix: `QTE${year}`,
      documentType: 'QUOTE',
      description: {
        es: 'Presupuestos',
        fr: 'Devis',
        en: 'Quotes'
      },
      isActive: true,
      resetYearly: true,
      nextNumber: 1
    });
  }

  // Órdenes de trabajo (work orders) para servicios
  if (features.hasMedicalTreatments || features.hasHairSalon || features.hasSpa) {
    series.push({
      code: 'WRO',
      prefix: `WRO${year}`,
      documentType: 'WORK_ORDER',
      description: {
        es: 'Órdenes de Trabajo',
        fr: 'Bons de Travail',
        en: 'Work Orders'
      },
      isActive: true,
      resetYearly: true,
      nextNumber: 1
    });
  }

  // Albaranes de entrega (delivery notes) si vende productos
  if (features.sellsProducts) {
    series.push({
      code: 'DLN',
      prefix: `DLN${year}`,
      documentType: 'DELIVERY_NOTE',
      description: {
        es: 'Albaranes de Entrega',
        fr: 'Bons de Livraison',
        en: 'Delivery Notes'
      },
      isActive: true,
      resetYearly: true,
      nextNumber: 1
    });

    // Bonos regalo (gift vouchers)
    series.push({
      code: 'GFV',
      prefix: `GFV${year}`,
      documentType: 'VOUCHER',
      description: {
        es: 'Bonos Regalo',
        fr: 'Bons Cadeaux',
        en: 'Gift Vouchers'
      },
      isActive: true,
      resetYearly: true,
      nextNumber: 1
    });
  }

  // Si es multi-centro, las series específicas por centro se crearán dinámicamente
  // con el formato: {CÓDIGO}-{CENTRO}, ej: INV-MAD2024001, INV-BCN2024001
  
  return series;
}

/**
 * Genera series de documentos para un centro específico
 * Se usa cuando se añade un nuevo centro en configuración multi-centro
 */
export function generateSeriesForCenter(
  centerCode: string,
  baseTemplates: DocumentSeriesTemplate[],
  year: number
): DocumentSeriesTemplate[] {
  return baseTemplates.map(template => ({
    ...template,
    code: `${template.code}-${centerCode}`,
    prefix: `${template.code.replace(year.toString(), '')}-${centerCode}${year}`,
    description: {
      es: `${template.description.es} - ${centerCode}`,
      fr: `${template.description.fr} - ${centerCode}`,
      en: `${template.description.en} - ${centerCode}`
    }
  }));
}

/**
 * Genera código de 3 letras para un centro basado en su nombre
 */
export function generateCenterCode(centerName: string): string {
  // Eliminar acentos y caracteres especiales
  const normalized = centerName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase();

  // Casos especiales para ciudades comunes
  const specialCases: Record<string, string> = {
    'MADRID': 'MAD',
    'BARCELONA': 'BCN',
    'VALENCIA': 'VAL',
    'SEVILLA': 'SEV',
    'BILBAO': 'BIL',
    'MALAGA': 'MAL',
    'PARIS': 'PAR',
    'LYON': 'LYO',
    'MARSEILLE': 'MAR',
    'LONDON': 'LON',
    'MANCHESTER': 'MAN',
    'BIRMINGHAM': 'BIR'
  };

  // Buscar en casos especiales
  for (const [key, code] of Object.entries(specialCases)) {
    if (normalized.includes(key)) {
      return code;
    }
  }

  // Generar código de las primeras 3 letras
  const words = normalized.split(/\s+/).filter(w => w.length > 0);
  
  if (words.length === 1) {
    // Una palabra: primeras 3 letras
    return words[0].substring(0, 3).padEnd(3, 'X');
  } else if (words.length === 2) {
    // Dos palabras: 2 letras de la primera, 1 de la segunda
    return (words[0].substring(0, 2) + words[1].substring(0, 1)).padEnd(3, 'X');
  } else {
    // Tres o más palabras: primera letra de cada una
    return words.slice(0, 3).map(w => w[0]).join('').padEnd(3, 'X');
  }
}
