/**
 * Configuration de TVA pour la France
 * 
 * Taux de TVA selon le Code Général des Impôts français
 * Mise à jour selon les dernières dispositions fiscales
 */

import { CountryVATConfig } from '@/types/accounting';

export const FRANCE_VAT_CONFIG: CountryVATConfig = {
  countryIso: 'FR',
  defaultRate: 'TVA_20',
  rates: [
    {
      code: 'TVA_20',
      name: {
        fr: 'TVA taux normal 20%',
        en: 'Standard VAT rate 20%',
        es: 'IVA tipo normal 20%',
        ar: 'ضريبة القيمة المضافة النسبة العادية 20%'
      },
      rate: 20,
      type: 'STANDARD',
      isDefault: true
    },
    {
      code: 'TVA_10',
      name: {
        fr: 'TVA taux intermédiaire 10%',
        en: 'Intermediate VAT rate 10%',
        es: 'IVA tipo intermedio 10%',
        ar: 'ضريبة القيمة المضافة النسبة المتوسطة 10%'
      },
      rate: 10,
      type: 'REDUCED',
      category: 'RESTORATION_HOSPITALITY'
    },
    {
      code: 'TVA_5_5',
      name: {
        fr: 'TVA taux réduit 5,5%',
        en: 'Reduced VAT rate 5.5%',
        es: 'IVA tipo reducido 5,5%',
        ar: 'ضريبة القيمة المضافة النسبة المخفضة 5.5%'
      },
      rate: 5.5,
      type: 'REDUCED',
      category: 'ESSENTIAL_PRODUCTS'
    },
    {
      code: 'TVA_2_1',
      name: {
        fr: 'TVA taux super-réduit 2,1%',
        en: 'Super-reduced VAT rate 2.1%',
        es: 'IVA tipo super-reducido 2,1%',
        ar: 'ضريبة القيمة المضافة النسبة المخفضة جداً 2.1%'
      },
      rate: 2.1,
      type: 'SUPER_REDUCED',
      category: 'MEDICINES_PRESS'
    },
    {
      code: 'EXONERE',
      name: {
        fr: 'Exonéré de TVA',
        en: 'VAT exempt',
        es: 'Exento de IVA',
        ar: 'معفى من ضريبة القيمة المضافة'
      },
      rate: 0,
      type: 'EXEMPT',
      category: 'GENERAL_EXEMPT'
    },
    {
      code: 'EXONERE_ART261',
      name: {
        fr: 'Exonéré art. 261 CGI - Soins médicaux',
        en: 'Exempt art. 261 CGI - Medical care',
        es: 'Exento art. 261 CGI - Cuidados médicos',
        ar: 'معفى المادة 261 CGI - الرعاية الطبية'
      },
      rate: 0,
      type: 'EXEMPT',
      category: 'MEDICAL_SERVICES'
    },
    {
      code: 'EXONERE_PHARMA',
      name: {
        fr: 'Exonéré - Médicaments remboursables',
        en: 'Exempt - Reimbursable medicines',
        es: 'Exento - Medicamentos reembolsables',
        ar: 'معفى - أدوية قابلة للتعويض'
      },
      rate: 0,
      type: 'EXEMPT',
      category: 'REIMBURSABLE_MEDICINES'
    },
    {
      code: 'TVA_DOM_8_5',
      name: {
        fr: 'TVA DOM taux normal 8,5%',
        en: 'Overseas VAT standard rate 8.5%',
        es: 'IVA DOM tipo normal 8,5%',
        ar: 'ضريبة القيمة المضافة أقاليم ما وراء البحار 8.5%'
      },
      rate: 8.5,
      type: 'STANDARD',
      category: 'DOM_STANDARD'
    },
    {
      code: 'TVA_DOM_2_1',
      name: {
        fr: 'TVA DOM taux réduit 2,1%',
        en: 'Overseas VAT reduced rate 2.1%',
        es: 'IVA DOM tipo reducido 2,1%',
        ar: 'ضريبة القيمة المضافة أقاليم ما وراء البحار مخفضة 2.1%'
      },
      rate: 2.1,
      type: 'REDUCED',
      category: 'DOM_REDUCED'
    },
    {
      code: 'TVA_CORSE_13',
      name: {
        fr: 'TVA Corse taux particulier 13%',
        en: 'Corsica special VAT rate 13%',
        es: 'IVA Córcega tipo especial 13%',
        ar: 'ضريبة القيمة المضافة كورسيكا نسبة خاصة 13%'
      },
      rate: 13,
      type: 'STANDARD',
      category: 'CORSICA_SPECIAL'
    },
    {
      code: 'TVA_CORSE_10',
      name: {
        fr: 'TVA Corse taux réduit 10%',
        en: 'Corsica reduced VAT rate 10%',
        es: 'IVA Córcega tipo reducido 10%',
        ar: 'ضريبة القيمة المضافة كورسيكا مخفضة 10%'
      },
      rate: 10,
      type: 'REDUCED',
      category: 'CORSICA_REDUCED'
    },
    {
      code: 'TVA_INTRACOM',
      name: {
        fr: 'TVA intracommunautaire',
        en: 'Intra-community VAT',
        es: 'IVA intracomunitario',
        ar: 'ضريبة القيمة المضافة داخل الاتحاد الأوروبي'
      },
      rate: 0,
      type: 'ZERO',
      category: 'INTRACOMMUNITY'
    }
  ]
}; 