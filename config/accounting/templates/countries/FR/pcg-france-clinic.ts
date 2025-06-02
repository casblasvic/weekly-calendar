/**
 * Plan Comptable Général Français (PCG) - Cliniques Esthétiques
 * 
 * Adaptation du plan comptable français pour les cliniques esthétiques et centres de beauté.
 * Conforme aux normes comptables françaises et au PCG 2014.
 * 
 * Caractéristiques:
 * - Compatible avec la réglementation fiscale française
 * - Inclut les comptes spécifiques pour la TVA française
 * - Adapté pour le secteur sanitaire et esthétique
 * - Intégration avec les obligations déclaratives (FEC, liasse fiscale)
 */

import { CountryTemplate } from '@/types/accounting';

export const PCG_FRANCE_CLINIC_TEMPLATE: CountryTemplate = {
  code: 'PCG_FRANCE_CLINIC',
  baseTemplateCode: 'IFRS_AESTHETIC_CLINIC',
  names: {
    fr: 'PCG France - Cliniques Esthétiques',
    en: 'French GAAP - Aesthetic Clinics',
    es: 'PCG Francia - Clínicas Estéticas',
    ar: 'النظام المحاسبي الفرنسي - العيادات التجميلية'
  },
  description: {
    fr: 'Plan comptable français adapté pour les cliniques esthétiques selon le PCG 2014',
    en: 'French chart of accounts adapted for aesthetic clinics according to PCG 2014',
    es: 'Plan contable francés adaptado para clínicas estéticas según el PCG 2014',
    ar: 'خطة محاسبية فرنسية مخصصة للعيادات التجميلية وفقاً لـ PCG 2014'
  },
  level: 2,
  countryIso: 'FR',
  version: '2024.1',
  isSystem: true,
  
  // Mapeo de cuentas IFRS a cuentas del PCG Francés
  mappings: {
    // === ACTIF - ACTIVOS ===
    // Immobilisations - Inmovilizado
    '101': '2154',   // Equipamiento médico → Matériel industriel
    '102': '2154',   // Equipamiento estético → Matériel industriel
    '103': '2184',   // Mobiliario → Mobilier
    '104': '2183',   // Equipos informáticos → Matériel de bureau et informatique
    
    // Trésorerie - Tesorería
    '1101': '5310',  // Caja → Caisse siège social
    '1102': '5121',  // Bancos → Banques comptes à vue
    
    // Créances - Cuentas por cobrar
    '1121': '4110',  // Clientes → Clients et comptes rattachés
    '1122': '4670',  // Deudores varios → Débiteurs divers
    
    // Stocks - Inventarios
    '1131': '3701',  // Productos cosméticos → Stocks de marchandises
    '1132': '3220',  // Material médico → Autres approvisionnements
    '1133': '3211',  // Medicamentos → Matières consommables
    
    // === PASSIF - PASIVOS ===
    // Emprunts - Deudas
    '201': '1640',   // Préstamos → Emprunts auprès des établissements de crédit
    
    // Fournisseurs - Proveedores
    '2101': '4010',  // Proveedores → Fournisseurs et comptes rattachés
    '2102': '4670',  // Acreedores → Créditeurs divers
    
    // Dettes fiscales - Obligaciones fiscales
    '2111': '44571', // IVA por pagar → TVA collectée
    '2112': '4470',  // Retenciones → Autres impôts, taxes et versements
    
    // === CAPITAUX PROPRES - PATRIMONIO ===
    '301': '1010',   // Capital social → Capital social
    '302': '1061',   // Reservas → Réserve légale
    '303': '1100',   // Resultados acumulados → Report à nouveau (solde créditeur)
    
    // === PRODUITS - INGRESOS ===
    // Services médicaux
    '411': '7061',   // Servicios médicos → Prestations de services (médicales)
    '4111': '70611', // Consultas médicas → Consultations médicales
    '4112': '70612', // Cirugías → Actes chirurgicaux
    
    // Services esthétiques
    '412': '7062',   // Servicios estéticos → Prestations de services (esthétiques)
    '4121': '70621', // Tratamientos faciales → Soins du visage
    '4122': '70622', // Tratamientos corporales → Soins du corps
    '4123': '70623', // Depilación láser → Épilation définitive
    
    // Ventes de marchandises
    '413': '7070',   // Venta productos → Ventes de marchandises
    
    // === CHARGES - GASTOS ===
    // Achats
    '5111': '6070',  // Costo productos → Achats de marchandises
    '5112': '6022',  // Material médico consumido → Fournitures consommables
    
    // Charges de personnel
    '5121': '6410',  // Sueldos → Rémunérations du personnel
    '5122': '6450',  // Seguridad social → Charges de sécurité sociale
    '5123': '6226',  // Honorarios → Honoraires
    
    // Charges externes
    '5131': '6132',  // Alquiler → Locations immobilières
    '5132': '6061',  // Suministros → Fournitures non stockables
    '5133': '6262',  // Teléfono e internet → Frais de télécommunications
    '5134': '6230',  // Marketing → Publicité, publications, relations publiques
    '5135': '6160',  // Seguros → Primes d'assurance
    '5136': '6155'   // Mantenimiento → Entretien et réparations
  },
  
  // Entradas específicas del PCG Francés (adicionales a las IFRS)
  entries: [
    // === COMPTES TVA SPÉCIFIQUES FRANCE ===
    {
      accountNumber: "44562",
      names: {
        fr: "TVA déductible sur immobilisations",
        en: "Deductible VAT on fixed assets",
        es: "IVA deducible sobre inmovilizado",
        ar: "ضريبة القيمة المضافة القابلة للخصم على الأصول الثابتة"
      },
      type: "ASSET",
      level: 3,
      parentNumber: "4456",
      vatCategory: "VAT_DEDUCTIBLE_ASSETS"
    },
    {
      accountNumber: "44566",
      names: {
        fr: "TVA déductible sur autres biens et services",
        en: "Deductible VAT on other goods and services",
        es: "IVA deducible sobre otros bienes y servicios",
        ar: "ضريبة القيمة المضافة القابلة للخصم على السلع والخدمات الأخرى"
      },
      type: "ASSET",
      level: 3,
      parentNumber: "4456",
      vatCategory: "VAT_DEDUCTIBLE_EXPENSES"
    },
    
    // === COMPTES TVA COLLECTÉE PAR TAUX ===
    {
      accountNumber: "445711",
      names: {
        fr: "TVA collectée 20%",
        en: "VAT collected 20%",
        es: "IVA repercutido 20%",
        ar: "ضريبة القيمة المضافة المحصلة 20%"
      },
      type: "LIABILITY",
      level: 4,
      parentNumber: "44571",
      vatCategory: "VAT_STANDARD_20"
    },
    {
      accountNumber: "445712",
      names: {
        fr: "TVA collectée 10%",
        en: "VAT collected 10%",
        es: "IVA repercutido 10%",
        ar: "ضريبة القيمة المضافة المحصلة 10%"
      },
      type: "LIABILITY",
      level: 4,
      parentNumber: "44571",
      vatCategory: "VAT_INTERMEDIATE_10"
    },
    {
      accountNumber: "445713",
      names: {
        fr: "TVA collectée 5,5%",
        en: "VAT collected 5.5%",
        es: "IVA repercutido 5,5%",
        ar: "ضريبة القيمة المضافة المحصلة 5.5%"
      },
      type: "LIABILITY",
      level: 4,
      parentNumber: "44571",
      vatCategory: "VAT_REDUCED_5_5"
    },
    {
      accountNumber: "445714",
      names: {
        fr: "TVA collectée 2,1%",
        en: "VAT collected 2.1%",
        es: "IVA repercutido 2,1%",
        ar: "ضريبة القيمة المضافة المحصلة 2.1%"
      },
      type: "LIABILITY",
      level: 4,
      parentNumber: "44571",
      vatCategory: "VAT_SUPER_REDUCED_2_1"
    },
    
    // === COMPTES SPÉCIFIQUES SECTEUR MÉDICAL ===
    {
      accountNumber: "7061",
      names: {
        fr: "Prestations de services médicaux",
        en: "Medical service revenue",
        es: "Prestaciones de servicios médicos",
        ar: "إيرادات الخدمات الطبية"
      },
      type: "REVENUE",
      level: 3,
      parentNumber: "706",
      vatCategory: "VAT_EXEMPT_MEDICAL"
    },
    {
      accountNumber: "7063",
      names: {
        fr: "Prestations de services paramédicaux",
        en: "Paramedical service revenue",
        es: "Prestaciones de servicios paramédicos",
        ar: "إيرادات الخدمات شبه الطبية"
      },
      type: "REVENUE",
      level: 3,
      parentNumber: "706",
      vatCategory: "VAT_EXEMPT_MEDICAL"
    },
    
    // === COMPTES DE RÉGULARISATION ===
    {
      accountNumber: "486",
      names: {
        fr: "Charges constatées d'avance",
        en: "Prepaid expenses",
        es: "Gastos anticipados",
        ar: "مصروفات مدفوعة مقدماً"
      },
      type: "ASSET",
      level: 2,
      parentNumber: "48"
    },
    {
      accountNumber: "487",
      names: {
        fr: "Produits constatés d'avance",
        en: "Deferred income",
        es: "Ingresos diferidos",
        ar: "إيرادات مؤجلة"
      },
      type: "LIABILITY",
      level: 2,
      parentNumber: "48"
    },
    
    // === CHARGES SOCIALES SPÉCIFIQUES FRANCE ===
    {
      accountNumber: "6451",
      names: {
        fr: "Cotisations à l'URSSAF",
        en: "URSSAF contributions",
        es: "Cotizaciones a la URSSAF",
        ar: "اشتراكات URSSAF"
      },
      type: "EXPENSE",
      level: 3,
      parentNumber: "645"
    },
    {
      accountNumber: "6453",
      names: {
        fr: "Cotisations aux caisses de retraite",
        en: "Pension fund contributions",
        es: "Cotizaciones a fondos de pensiones",
        ar: "اشتراكات صناديق التقاعد"
      },
      type: "EXPENSE",
      level: 3,
      parentNumber: "645"
    },
    {
      accountNumber: "6454",
      names: {
        fr: "Cotisations aux ASSEDIC",
        en: "Unemployment insurance contributions",
        es: "Cotizaciones al seguro de desempleo",
        ar: "اشتراكات التأمين ضد البطالة"
      },
      type: "EXPENSE",
      level: 3,
      parentNumber: "645"
    },
    {
      accountNumber: "6455",
      names: {
        fr: "Cotisations aux mutuelles",
        en: "Mutual insurance contributions",
        es: "Cotizaciones a mutuas",
        ar: "اشتراكات التأمين الصحي التكميلي"
      },
      type: "EXPENSE",
      level: 3,
      parentNumber: "645"
    },
    
    // === COMPTES POUR PROVISIONS ===
    {
      accountNumber: "681",
      names: {
        fr: "Dotations aux amortissements et provisions",
        en: "Depreciation and provision expenses",
        es: "Dotaciones a amortizaciones y provisiones",
        ar: "مخصصات الاستهلاك والمؤونات"
      },
      type: "EXPENSE",
      level: 2,
      parentNumber: "68"
    },
    {
      accountNumber: "781",
      names: {
        fr: "Reprises sur amortissements et provisions",
        en: "Reversals of depreciation and provisions",
        es: "Reversión de amortizaciones y provisiones",
        ar: "استرداد الاستهلاك والمؤونات"
      },
      type: "REVENUE",
      level: 2,
      parentNumber: "78"
    },
    
    // === COMPTES POUR CONTRIBUTIONS ÉCONOMIQUES ===
    {
      accountNumber: "6351",
      names: {
        fr: "Contribution économique territoriale (CET)",
        en: "Territorial economic contribution",
        es: "Contribución económica territorial",
        ar: "المساهمة الاقتصادية الإقليمية"
      },
      type: "EXPENSE",
      level: 3,
      parentNumber: "635"
    },
    {
      accountNumber: "6353",
      names: {
        fr: "Contribution sociale de solidarité",
        en: "Social solidarity contribution",
        es: "Contribución social de solidaridad",
        ar: "مساهمة التضامن الاجتماعي"
      },
      type: "EXPENSE",
      level: 3,
      parentNumber: "635"
    },
    
    // === COMPTES SPÉCIFIQUES POUR LE FEC ===
    {
      accountNumber: "471",
      names: {
        fr: "Comptes d'attente",
        en: "Suspense accounts",
        es: "Cuentas de espera",
        ar: "حسابات انتظار"
      },
      type: "ASSET",
      level: 2,
      parentNumber: "47"
    },
    {
      accountNumber: "472",
      names: {
        fr: "Comptes transitoires ou d'attente - créditeurs",
        en: "Transitory or suspense accounts - credit",
        es: "Cuentas transitorias o de espera - acreedoras",
        ar: "حسابات انتقالية أو انتظار - دائنة"
      },
      type: "LIABILITY",
      level: 2,
      parentNumber: "47"
    }
  ]
}; 