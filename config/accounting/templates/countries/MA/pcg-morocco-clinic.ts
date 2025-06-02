/**
 * Plan Comptable Général Marocain (PCG) - Clínicas Estéticas
 * 
 * Adaptación del plan contable marroquí para clínicas estéticas y centros de belleza.
 * Basado en el Code Général de la Normalisation Comptable (CGNC).
 * 
 * Características:
 * - Compatible con la normativa fiscal marroquí
 * - Incluye cuentas específicas para TVA marroquí
 * - Adaptado para el sector sanitario y estético
 * - Multi-idioma con énfasis en francés y árabe
 */

import { CountryTemplate } from '@/types/accounting';

export const PCG_MOROCCO_CLINIC_TEMPLATE: CountryTemplate = {
  code: 'PCG_MOROCCO_CLINIC',
  baseTemplateCode: 'IFRS_AESTHETIC_CLINIC',
  names: {
    fr: 'PCG Maroc - Cliniques Esthétiques',
    ar: 'النظام المحاسبي المغربي - العيادات التجميلية',
    en: 'Moroccan GAAP - Aesthetic Clinics',
    es: 'PCG Marruecos - Clínicas Estéticas'
  },
  description: {
    fr: 'Plan comptable marocain adapté pour les cliniques esthétiques selon le CGNC',
    ar: 'خطة محاسبية مغربية مخصصة للعيادات التجميلية وفقاً للمدونة العامة للمعايير المحاسبية',
    en: 'Moroccan chart of accounts adapted for aesthetic clinics according to CGNC',
    es: 'Plan contable marroquí adaptado para clínicas estéticas según el CGNC'
  },
  level: 2,
  countryIso: 'MA',
  version: '2024.1',
  isSystem: true,
  
  // Mapeo de cuentas IFRS a cuentas del PCG Marroquí
  mappings: {
    // === ACTIVOS - ACTIF ===
    // Inmovilizado - Immobilisations
    '101': '2332',   // Equipamiento médico → Matériel et outillage
    '102': '2332',   // Equipamiento estético → Matériel et outillage
    '103': '2351',   // Mobiliario → Mobilier de bureau
    '104': '2355',   // Equipos informáticos → Matériel informatique
    
    // Tesorería - Trésorerie
    '1101': '5161',  // Caja → Caisse
    '1102': '5141',  // Bancos → Banques (soldes débiteurs)
    
    // Cuentas por cobrar - Créances
    '1121': '3421',  // Clientes → Clients
    '1122': '3487',  // Deudores varios → Créances diverses
    
    // Inventarios - Stocks
    '1131': '3111',  // Productos cosméticos → Marchandises
    '1132': '3122',  // Material médico → Matières et fournitures consommables
    '1133': '3121',  // Medicamentos → Matières premières
    
    // === PASIVOS - PASSIF ===
    // Deudas a largo plazo - Dettes de financement
    '201': '1481',   // Préstamos → Emprunts auprès des établissements de crédit
    
    // Proveedores - Fournisseurs
    '2101': '4411',  // Proveedores → Fournisseurs
    '2102': '4487',  // Acreedores → Dettes diverses
    
    // Obligaciones fiscales - Dettes fiscales
    '2111': '4456',  // IVA por pagar → État, TVA due
    '2112': '4457',  // Retenciones → État, impôts et taxes à payer
    
    // === PATRIMONIO - CAPITAUX PROPRES ===
    '301': '1111',   // Capital social → Capital social ou personnel
    '302': '1140',   // Reservas → Réserve légale
    '303': '1161',   // Resultados acumulados → Report à nouveau (solde créditeur)
    
    // === INGRESOS - PRODUITS ===
    // Servicios médicos
    '411': '7124',   // Servicios médicos → Prestations de services (médicales)
    '4111': '71241', // Consultas médicas → Consultations médicales
    '4112': '71242', // Cirugías → Actes chirurgicaux
    
    // Servicios estéticos
    '412': '7127',   // Servicios estéticos → Prestations de services (esthétiques)
    '4121': '71271', // Tratamientos faciales → Soins du visage
    '4122': '71272', // Tratamientos corporales → Soins du corps
    '4123': '71273', // Depilación láser → Épilation laser
    
    // Venta de productos
    '413': '7111',   // Venta productos → Ventes de marchandises au Maroc
    
    // === GASTOS - CHARGES ===
    // Costo de ventas
    '5111': '6111',  // Costo productos → Achats de marchandises
    '5112': '6122',  // Material médico consumido → Achats de matières et fournitures
    
    // Gastos de personal
    '5121': '6171',  // Sueldos → Rémunérations du personnel
    '5122': '6174',  // Seguridad social → Charges sociales
    '5123': '6136',  // Honorarios → Rémunérations d'intermédiaires et honoraires
    
    // Gastos generales
    '5131': '6132',  // Alquiler → Redevances de crédit-bail
    '5132': '6125',  // Suministros → Achats non stockés de matières et fournitures
    '5133': '6145',  // Teléfono e internet → Frais postaux et télécommunications
    '5134': '6144',  // Marketing → Publicité, publications et relations publiques
    '5135': '6134',  // Seguros → Primes d'assurances
    '5136': '6133'   // Mantenimiento → Entretien et réparations
  },
  
  // Entradas específicas del PCG Marroquí (adicionales a las IFRS)
  entries: [
    // === CUENTAS ESPECIALES TVA MARRUECOS ===
    {
      accountNumber: "3455",
      names: {
        fr: "ÉTAT - TVA RÉCUPÉRABLE",
        ar: "الدولة - ضريبة القيمة المضافة القابلة للاسترداد",
        es: "ESTADO - IVA RECUPERABLE",
        en: "STATE - RECOVERABLE VAT"
      },
      type: "ASSET",
      level: 2,
      parentNumber: "34",
      vatCategory: "VAT_RECOVERABLE"
    },
    {
      accountNumber: "34551",
      names: {
        fr: "TVA récupérable sur immobilisations",
        ar: "ضريبة القيمة المضافة القابلة للاسترداد على الأصول الثابتة",
        es: "IVA recuperable sobre inmovilizado",
        en: "VAT recoverable on fixed assets"
      },
      type: "ASSET",
      level: 3,
      parentNumber: "3455"
    },
    {
      accountNumber: "34552",
      names: {
        fr: "TVA récupérable sur charges",
        ar: "ضريبة القيمة المضافة القابلة للاسترداد على المصروفات",
        es: "IVA recuperable sobre gastos",
        en: "VAT recoverable on expenses"
      },
      type: "ASSET",
      level: 3,
      parentNumber: "3455"
    },
    
    // === CUENTAS ESPECIALES SISTEMA MARROQUÍ ===
    {
      accountNumber: "1151",
      names: {
        fr: "Primes de fusion, scission et transformation",
        ar: "علاوات الاندماج والانقسام والتحويل",
        es: "Primas de fusión, escisión y transformación",
        en: "Merger, split and transformation premiums"
      },
      type: "EQUITY",
      level: 2,
      parentNumber: "11"
    },
    {
      accountNumber: "4465",
      names: {
        fr: "ASSOCIÉS - DIVIDENDES À PAYER",
        ar: "الشركاء - أرباح مستحقة الدفع",
        es: "SOCIOS - DIVIDENDOS A PAGAR",
        en: "PARTNERS - DIVIDENDS PAYABLE"
      },
      type: "LIABILITY",
      level: 2,
      parentNumber: "44"
    },
    
    // === CUENTAS ESPECÍFICAS SECTOR SANITARIO MARRUECOS ===
    {
      accountNumber: "7125",
      names: {
        fr: "Prestations médicales exonérées",
        ar: "الخدمات الطبية المعفاة",
        es: "Prestaciones médicas exentas",
        en: "Tax-exempt medical services"
      },
      type: "REVENUE",
      level: 3,
      parentNumber: "712",
      vatCategory: "VAT_EXEMPT_MEDICAL"
    },
    {
      accountNumber: "6147",
      names: {
        fr: "Services bancaires",
        ar: "الخدمات المصرفية",
        es: "Servicios bancarios",
        en: "Banking services"
      },
      type: "EXPENSE",
      level: 3,
      parentNumber: "614"
    },
    
    // === CUENTAS DE REGULARIZACIÓN MARRUECOS ===
    {
      accountNumber: "3491",
      names: {
        fr: "CHARGES CONSTATÉES D'AVANCE",
        ar: "مصروفات مثبتة مقدماً",
        es: "GASTOS ANTICIPADOS",
        en: "PREPAID EXPENSES"
      },
      type: "ASSET",
      level: 2,
      parentNumber: "34"
    },
    {
      accountNumber: "4491",
      names: {
        fr: "PRODUITS CONSTATÉS D'AVANCE",
        ar: "إيرادات مثبتة مقدماً",
        es: "INGRESOS ANTICIPADOS",
        en: "DEFERRED INCOME"
      },
      type: "LIABILITY",
      level: 2,
      parentNumber: "44"
    },
    
    // === CUENTAS ESPECÍFICAS PARA IMPUESTOS MARROQUÍES ===
    {
      accountNumber: "44571",
      names: {
        fr: "TVA collectée 20%",
        ar: "ضريبة القيمة المضافة المحصلة 20%",
        es: "IVA repercutido 20%",
        en: "VAT collected 20%"
      },
      type: "LIABILITY",
      level: 3,
      parentNumber: "4457",
      vatCategory: "VAT_STANDARD_20"
    },
    {
      accountNumber: "44572",
      names: {
        fr: "TVA collectée 14%",
        ar: "ضريبة القيمة المضافة المحصلة 14%",
        es: "IVA repercutido 14%",
        en: "VAT collected 14%"
      },
      type: "LIABILITY",
      level: 3,
      parentNumber: "4457",
      vatCategory: "VAT_INTERMEDIATE_14"
    },
    {
      accountNumber: "44573",
      names: {
        fr: "TVA collectée 10%",
        ar: "ضريبة القيمة المضافة المحصلة 10%",
        es: "IVA repercutido 10%",
        en: "VAT collected 10%"
      },
      type: "LIABILITY",
      level: 3,
      parentNumber: "4457",
      vatCategory: "VAT_REDUCED_10"
    },
    {
      accountNumber: "44574",
      names: {
        fr: "TVA collectée 7%",
        ar: "ضريبة القيمة المضافة المحصلة 7%",
        es: "IVA repercutido 7%",
        en: "VAT collected 7%"
      },
      type: "LIABILITY",
      level: 3,
      parentNumber: "4457",
      vatCategory: "VAT_SUPER_REDUCED_7"
    },
    
    // === COTIZACIONES SOCIALES ESPECÍFICAS MARRUECOS ===
    {
      accountNumber: "61741",
      names: {
        fr: "Cotisations à la CNSS",
        ar: "اشتراكات الصندوق الوطني للضمان الاجتماعي",
        es: "Cotizaciones a la CNSS",
        en: "CNSS contributions"
      },
      type: "EXPENSE",
      level: 3,
      parentNumber: "6174"
    },
    {
      accountNumber: "61742",
      names: {
        fr: "Cotisations aux caisses de retraite",
        ar: "اشتراكات صناديق التقاعد",
        es: "Cotizaciones a cajas de jubilación",
        en: "Pension fund contributions"
      },
      type: "EXPENSE",
      level: 3,
      parentNumber: "6174"
    },
    {
      accountNumber: "61743",
      names: {
        fr: "Cotisations aux mutuelles",
        ar: "اشتراكات التعاضديات",
        es: "Cotizaciones a mutuas",
        en: "Mutual fund contributions"
      },
      type: "EXPENSE",
      level: 3,
      parentNumber: "6174"
    },
    {
      accountNumber: "61744",
      names: {
        fr: "Prestations sociales",
        ar: "المزايا الاجتماعية",
        es: "Prestaciones sociales",
        en: "Social benefits"
      },
      type: "EXPENSE",
      level: 3,
      parentNumber: "6174"
    }
  ]
}; 