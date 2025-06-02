/**
 * Configuración de TVA para Marruecos
 * 
 * Tasas de TVA según la legislación fiscal marroquí
 * Actualizado según las últimas reformas fiscales
 */

import { CountryVATConfig } from '@/types/accounting';

export const MOROCCO_VAT_CONFIG: CountryVATConfig = {
  countryIso: 'MA',
  defaultRate: 'TVA_20',
  rates: [
    {
      code: 'TVA_20',
      name: {
        fr: 'TVA taux normal 20%',
        ar: 'ضريبة القيمة المضافة النسبة العادية 20%',
        es: 'IVA tipo normal 20%',
        en: 'Standard VAT rate 20%'
      },
      rate: 20,
      type: 'STANDARD',
      isDefault: true
    },
    {
      code: 'TVA_14',
      name: {
        fr: 'TVA taux intermédiaire 14%',
        ar: 'ضريبة القيمة المضافة النسبة المتوسطة 14%',
        es: 'IVA tipo intermedio 14%',
        en: 'Intermediate VAT rate 14%'
      },
      rate: 14,
      type: 'REDUCED',
      category: 'TRANSPORT_SERVICES'
    },
    {
      code: 'TVA_10',
      name: {
        fr: 'TVA taux réduit 10%',
        ar: 'ضريبة القيمة المضافة النسبة المخفضة 10%',
        es: 'IVA tipo reducido 10%',
        en: 'Reduced VAT rate 10%'
      },
      rate: 10,
      type: 'REDUCED',
      category: 'TOURISM_HOSPITALITY'
    },
    {
      code: 'TVA_7',
      name: {
        fr: 'TVA taux super-réduit 7%',
        ar: 'ضريبة القيمة المضافة النسبة المخفضة جداً 7%',
        es: 'IVA tipo super-reducido 7%',
        en: 'Super-reduced VAT rate 7%'
      },
      rate: 7,
      type: 'SUPER_REDUCED',
      category: 'BASIC_PRODUCTS'
    },
    {
      code: 'TVA_0',
      name: {
        fr: 'TVA taux zéro 0%',
        ar: 'ضريبة القيمة المضافة النسبة صفر 0%',
        es: 'IVA tipo cero 0%',
        en: 'Zero VAT rate 0%'
      },
      rate: 0,
      type: 'ZERO',
      category: 'EXPORT_ESSENTIAL'
    },
    {
      code: 'EXONERE',
      name: {
        fr: 'Exonéré de TVA',
        ar: 'معفى من ضريبة القيمة المضافة',
        es: 'Exento de IVA',
        en: 'VAT exempt'
      },
      rate: 0,
      type: 'EXEMPT',
      category: 'MEDICAL_EXEMPT'
    },
    {
      code: 'EXONERE_MEDICAL',
      name: {
        fr: 'Exonéré - Prestations médicales',
        ar: 'معفى - خدمات طبية',
        es: 'Exento - Prestaciones médicas',
        en: 'Exempt - Medical services'
      },
      rate: 0,
      type: 'EXEMPT',
      category: 'MEDICAL_SERVICES'
    },
    {
      code: 'EXONERE_PHARMA',
      name: {
        fr: 'Exonéré - Médicaments',
        ar: 'معفى - أدوية',
        es: 'Exento - Medicamentos',
        en: 'Exempt - Medicines'
      },
      rate: 0,
      type: 'EXEMPT',
      category: 'PHARMACEUTICALS'
    }
  ]
}; 