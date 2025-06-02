/**
 * Configuración de IVA para España
 * 
 * Tipos de IVA según la Ley del Impuesto sobre el Valor Añadido
 * Actualizado según las últimas modificaciones fiscales
 */

import { CountryVATConfig } from '@/types/accounting';

export const SPAIN_VAT_CONFIG: CountryVATConfig = {
  countryIso: 'ES',
  defaultRate: 'IVA_21',
  rates: [
    {
      code: 'IVA_21',
      name: {
        es: 'IVA tipo general 21%',
        en: 'General VAT rate 21%',
        fr: 'TVA taux général 21%',
        ar: 'ضريبة القيمة المضافة النسبة العامة 21%'
      },
      rate: 21,
      type: 'STANDARD',
      isDefault: true
    },
    {
      code: 'IVA_10',
      name: {
        es: 'IVA tipo reducido 10%',
        en: 'Reduced VAT rate 10%',
        fr: 'TVA taux réduit 10%',
        ar: 'ضريبة القيمة المضافة النسبة المخفضة 10%'
      },
      rate: 10,
      type: 'REDUCED',
      category: 'REDUCED_GENERAL'
    },
    {
      code: 'IVA_4',
      name: {
        es: 'IVA tipo superreducido 4%',
        en: 'Super-reduced VAT rate 4%',
        fr: 'TVA taux super-réduit 4%',
        ar: 'ضريبة القيمة المضافة النسبة المخفضة جداً 4%'
      },
      rate: 4,
      type: 'SUPER_REDUCED',
      category: 'ESSENTIAL_GOODS'
    },
    {
      code: 'IVA_0',
      name: {
        es: 'IVA tipo 0%',
        en: 'Zero VAT rate',
        fr: 'TVA taux zéro',
        ar: 'ضريبة القيمة المضافة نسبة صفر'
      },
      rate: 0,
      type: 'ZERO',
      category: 'INTRACOMMUNITY_EXPORTS'
    },
    {
      code: 'EXENTO',
      name: {
        es: 'Exento de IVA',
        en: 'VAT exempt',
        fr: 'Exonéré de TVA',
        ar: 'معفى من ضريبة القيمة المضافة'
      },
      rate: 0,
      type: 'EXEMPT',
      category: 'GENERAL_EXEMPT'
    },
    {
      code: 'EXENTO_ART20',
      name: {
        es: 'Exento art. 20 - Servicios médicos',
        en: 'Exempt art. 20 - Medical services',
        fr: 'Exonéré art. 20 - Services médicaux',
        ar: 'معفى المادة 20 - الخدمات الطبية'
      },
      rate: 0,
      type: 'EXEMPT',
      category: 'MEDICAL_SERVICES'
    },
    {
      code: 'EXENTO_SANITARIO',
      name: {
        es: 'Exento - Asistencia sanitaria',
        en: 'Exempt - Healthcare',
        fr: 'Exonéré - Soins de santé',
        ar: 'معفى - الرعاية الصحية'
      },
      rate: 0,
      type: 'EXEMPT',
      category: 'HEALTHCARE_SERVICES'
    },
    {
      code: 'IVA_4_MEDICAMENTOS',
      name: {
        es: 'IVA 4% - Medicamentos',
        en: 'VAT 4% - Medicines',
        fr: 'TVA 4% - Médicaments',
        ar: 'ضريبة القيمة المضافة 4% - أدوية'
      },
      rate: 4,
      type: 'SUPER_REDUCED',
      category: 'MEDICINES'
    },
    {
      code: 'IGIC_7',
      name: {
        es: 'IGIC tipo general 7% (Canarias)',
        en: 'IGIC general rate 7% (Canary Islands)',
        fr: 'IGIC taux général 7% (Canaries)',
        ar: 'IGIC النسبة العامة 7% (جزر الكناري)'
      },
      rate: 7,
      type: 'STANDARD',
      category: 'CANARY_STANDARD'
    },
    {
      code: 'IGIC_3',
      name: {
        es: 'IGIC tipo reducido 3% (Canarias)',
        en: 'IGIC reduced rate 3% (Canary Islands)',
        fr: 'IGIC taux réduit 3% (Canaries)',
        ar: 'IGIC النسبة المخفضة 3% (جزر الكناري)'
      },
      rate: 3,
      type: 'REDUCED',
      category: 'CANARY_REDUCED'
    },
    {
      code: 'IGIC_0',
      name: {
        es: 'IGIC tipo cero 0% (Canarias)',
        en: 'IGIC zero rate 0% (Canary Islands)',
        fr: 'IGIC taux zéro 0% (Canaries)',
        ar: 'IGIC نسبة صفر 0% (جزر الكناري)'
      },
      rate: 0,
      type: 'ZERO',
      category: 'CANARY_ZERO'
    },
    {
      code: 'IPSI_10',
      name: {
        es: 'IPSI tipo general 10% (Ceuta y Melilla)',
        en: 'IPSI general rate 10% (Ceuta and Melilla)',
        fr: 'IPSI taux général 10% (Ceuta et Melilla)',
        ar: 'IPSI النسبة العامة 10% (سبتة ومليلة)'
      },
      rate: 10,
      type: 'STANDARD',
      category: 'CEUTA_MELILLA_STANDARD'
    },
    {
      code: 'IPSI_4',
      name: {
        es: 'IPSI tipo reducido 4% (Ceuta y Melilla)',
        en: 'IPSI reduced rate 4% (Ceuta and Melilla)',
        fr: 'IPSI taux réduit 4% (Ceuta et Melilla)',
        ar: 'IPSI النسبة المخفضة 4% (سبتة ومليلة)'
      },
      rate: 4,
      type: 'REDUCED',
      category: 'CEUTA_MELILLA_REDUCED'
    },
    {
      code: 'REQ_5_2',
      name: {
        es: 'Recargo de equivalencia 5,2%',
        en: 'Equivalence surcharge 5.2%',
        fr: 'Majoration d\'équivalence 5,2%',
        ar: 'رسم المعادلة 5.2%'
      },
      rate: 5.2,
      type: 'STANDARD',
      category: 'EQUIVALENCE_SURCHARGE'
    },
    {
      code: 'REQ_1_4',
      name: {
        es: 'Recargo de equivalencia 1,4%',
        en: 'Equivalence surcharge 1.4%',
        fr: 'Majoration d\'équivalence 1,4%',
        ar: 'رسم المعادلة 1.4%'
      },
      rate: 1.4,
      type: 'REDUCED',
      category: 'EQUIVALENCE_SURCHARGE_REDUCED'
    },
    {
      code: 'REQ_0_5',
      name: {
        es: 'Recargo de equivalencia 0,5%',
        en: 'Equivalence surcharge 0.5%',
        fr: 'Majoration d\'équivalence 0,5%',
        ar: 'رسم المعادلة 0.5%'
      },
      rate: 0.5,
      type: 'SUPER_REDUCED',
      category: 'EQUIVALENCE_SURCHARGE_SUPER'
    }
  ]
}; 