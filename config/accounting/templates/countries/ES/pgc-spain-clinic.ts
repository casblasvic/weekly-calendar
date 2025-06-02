/**
 * Plan General de Contabilidad Español (PGC) - Clínicas Estéticas
 * 
 * Adaptación del plan contable español para clínicas estéticas y centros de belleza.
 * Basado en el Real Decreto 1514/2007 y sus actualizaciones.
 * 
 * Características:
 * - Compatible con la normativa fiscal española
 * - Integración con el SII (Suministro Inmediato de Información)
 * - Adaptado para el sector sanitario y estético
 * - Incluye cuentas específicas para IVA español
 */

import { CountryTemplate } from '@/types/accounting';

export const PGC_SPAIN_CLINIC_TEMPLATE: CountryTemplate = {
  code: 'PGC_SPAIN_CLINIC',
  baseTemplateCode: 'IFRS_AESTHETIC_CLINIC',
  names: {
    es: 'PGC España - Clínicas Estéticas',
    en: 'Spanish GAAP - Aesthetic Clinics',
    fr: 'PGC Espagne - Cliniques Esthétiques',
    ar: 'النظام المحاسبي الإسباني - العيادات التجميلية'
  },
  description: {
    es: 'Plan contable español adaptado para clínicas estéticas según el PGC 2007',
    en: 'Spanish chart of accounts adapted for aesthetic clinics according to PGC 2007',
    fr: 'Plan comptable espagnol adapté pour les cliniques esthétiques selon le PGC 2007',
    ar: 'خطة محاسبية إسبانية مخصصة للعيادات التجميلية وفقاً لـ PGC 2007'
  },
  level: 2,
  countryIso: 'ES',
  version: '2024.1',
  isSystem: true,
  
  // Mapeo de cuentas IFRS a cuentas del PGC Español
  mappings: {
    // === ACTIVO ===
    // Inmovilizado
    '101': '213',    // Equipamiento médico → Maquinaria
    '102': '214',    // Equipamiento estético → Utillaje
    '103': '216',    // Mobiliario → Mobiliario
    '104': '217',    // Equipos informáticos → Equipos para procesos de información
    
    // Tesorería
    '1101': '570',   // Caja → Caja, euros
    '1102': '572',   // Bancos → Bancos e instituciones de crédito c/c vista, euros
    
    // Realizable
    '1121': '430',   // Clientes → Clientes
    '1122': '440',   // Deudores varios → Deudores
    
    // Existencias
    '1131': '300',   // Productos cosméticos → Mercaderías A
    '1132': '328',   // Material médico → Material de oficina
    '1133': '602',   // Medicamentos → Compras de otros aprovisionamientos
    
    // === PASIVO ===
    // Deudas a largo plazo
    '201': '170',    // Préstamos → Deudas a largo plazo con entidades de crédito
    
    // Acreedores comerciales
    '2101': '400',   // Proveedores → Proveedores
    '2102': '410',   // Acreedores → Acreedores por prestaciones de servicios
    
    // Acreedores públicos
    '2111': '477',   // IVA por pagar → Hacienda Pública, IVA repercutido
    '2112': '4751',  // Retenciones → Hacienda Pública, acreedora por retenciones practicadas
    
    // === PATRIMONIO NETO ===
    '301': '100',    // Capital social → Capital social
    '302': '112',    // Reservas → Reserva legal
    '303': '120',    // Resultados acumulados → Remanente
    
    // === INGRESOS ===
    // Prestación de servicios
    '411': '705',    // Servicios médicos → Prestaciones de servicios
    '4111': '7051',  // Consultas médicas → Consultas médicas
    '4112': '7052',  // Cirugías → Intervenciones quirúrgicas
    
    '412': '705',    // Servicios estéticos → Prestaciones de servicios
    '4121': '7053',  // Tratamientos faciales → Tratamientos faciales
    '4122': '7054',  // Tratamientos corporales → Tratamientos corporales
    '4123': '7055',  // Depilación láser → Depilación láser
    
    // Venta de mercaderías
    '413': '700',    // Venta productos → Ventas de mercaderías
    
    // === GASTOS ===
    // Compras
    '5111': '600',   // Costo productos → Compras de mercaderías
    '5112': '602',   // Material médico consumido → Compras de otros aprovisionamientos
    
    // Gastos de personal
    '5121': '640',   // Sueldos → Sueldos y salarios
    '5122': '642',   // Seguridad social → Seguridad Social a cargo de la empresa
    '5123': '623',   // Honorarios → Servicios de profesionales independientes
    
    // Otros gastos de explotación
    '5131': '621',   // Alquiler → Arrendamientos y cánones
    '5132': '628',   // Suministros → Suministros
    '5133': '629',   // Teléfono → Otros servicios
    '5134': '627',   // Marketing → Publicidad, propaganda y relaciones públicas
    '5135': '625',   // Seguros → Primas de seguros
    '5136': '622'    // Mantenimiento → Reparaciones y conservación
  },
  
  // Entradas específicas del PGC Español (adicionales a las IFRS)
  entries: [
    // === CUENTAS IVA ESPECÍFICAS ESPAÑA ===
    {
      accountNumber: "472",
      names: {
        es: "Hacienda Pública, IVA soportado",
        en: "Tax authorities, input VAT",
        fr: "Administration fiscale, TVA déductible",
        ar: "السلطات الضريبية، ضريبة القيمة المضافة المدخلة"
      },
      type: "ASSET",
      level: 2,
      parentNumber: "47",
      vatCategory: "VAT_DEDUCTIBLE"
    },
    {
      accountNumber: "4700",
      names: {
        es: "Hacienda Pública, deudora por diversos conceptos",
        en: "Tax authorities, sundry debtor",
        fr: "Administration fiscale, débitrice divers",
        ar: "السلطات الضريبية، مدين متنوع"
      },
      type: "ASSET",
      level: 3,
      parentNumber: "470"
    },
    {
      accountNumber: "4770",
      names: {
        es: "Hacienda Pública, IVA repercutido",
        en: "Tax authorities, output VAT",
        fr: "Administration fiscale, TVA collectée",
        ar: "السلطات الضريبية، ضريبة القيمة المضافة المحصلة"
      },
      type: "LIABILITY",
      level: 3,
      parentNumber: "477"
    },
    
    // === CUENTAS IVA POR TIPOS ===
    {
      accountNumber: "47700",
      names: {
        es: "IVA repercutido 21%",
        en: "Output VAT 21%",
        fr: "TVA collectée 21%",
        ar: "ضريبة القيمة المضافة المحصلة 21%"
      },
      type: "LIABILITY",
      level: 4,
      parentNumber: "4770",
      vatCategory: "VAT_STANDARD_21"
    },
    {
      accountNumber: "47701",
      names: {
        es: "IVA repercutido 10%",
        en: "Output VAT 10%",
        fr: "TVA collectée 10%",
        ar: "ضريبة القيمة المضافة المحصلة 10%"
      },
      type: "LIABILITY",
      level: 4,
      parentNumber: "4770",
      vatCategory: "VAT_REDUCED_10"
    },
    {
      accountNumber: "47702",
      names: {
        es: "IVA repercutido 4%",
        en: "Output VAT 4%",
        fr: "TVA collectée 4%",
        ar: "ضريبة القيمة المضافة المحصلة 4%"
      },
      type: "LIABILITY",
      level: 4,
      parentNumber: "4770",
      vatCategory: "VAT_SUPER_REDUCED_4"
    },
    {
      accountNumber: "47703",
      names: {
        es: "IVA repercutido exento",
        en: "Output VAT exempt",
        fr: "TVA collectée exonérée",
        ar: "ضريبة القيمة المضافة المحصلة معفاة"
      },
      type: "LIABILITY",
      level: 4,
      parentNumber: "4770",
      vatCategory: "VAT_EXEMPT"
    },
    
    // === CUENTAS ESPECÍFICAS SECTOR SANITARIO ===
    {
      accountNumber: "7050",
      names: {
        es: "Prestaciones de servicios médicos exentos",
        en: "Exempt medical services",
        fr: "Prestations de services médicaux exonérés",
        ar: "الخدمات الطبية المعفاة"
      },
      type: "REVENUE",
      level: 3,
      parentNumber: "705",
      vatCategory: "VAT_EXEMPT_MEDICAL"
    },
    {
      accountNumber: "7056",
      names: {
        es: "Prestaciones de servicios estéticos",
        en: "Aesthetic services",
        fr: "Prestations de services esthétiques",
        ar: "خدمات التجميل"
      },
      type: "REVENUE",
      level: 3,
      parentNumber: "705",
      vatCategory: "VAT_STANDARD"
    },
    
    // === CUENTAS SEGURIDAD SOCIAL ===
    {
      accountNumber: "476",
      names: {
        es: "Organismos de la Seguridad Social, acreedores",
        en: "Social Security, creditors",
        fr: "Organismes de sécurité sociale, créditeurs",
        ar: "هيئات الضمان الاجتماعي، دائنون"
      },
      type: "LIABILITY",
      level: 2,
      parentNumber: "47"
    },
    {
      accountNumber: "6420",
      names: {
        es: "Seguridad Social a cargo de la empresa",
        en: "Employer's Social Security contributions",
        fr: "Cotisations sociales patronales",
        ar: "اشتراكات الضمان الاجتماعي على عاتق الشركة"
      },
      type: "EXPENSE",
      level: 3,
      parentNumber: "642"
    },
    {
      accountNumber: "6430",
      names: {
        es: "Retribuciones a largo plazo mediante sistemas de aportación definida",
        en: "Long-term defined contribution benefits",
        fr: "Rémunérations à long terme par systèmes à cotisations définies",
        ar: "مكافآت طويلة الأجل من خلال أنظمة المساهمة المحددة"
      },
      type: "EXPENSE",
      level: 3,
      parentNumber: "643"
    },
    
    // === CUENTAS DE AJUSTES POR PERIODIFICACIÓN ===
    {
      accountNumber: "480",
      names: {
        es: "Gastos anticipados",
        en: "Prepaid expenses",
        fr: "Charges constatées d'avance",
        ar: "مصروفات مدفوعة مقدماً"
      },
      type: "ASSET",
      level: 2,
      parentNumber: "48"
    },
    {
      accountNumber: "485",
      names: {
        es: "Ingresos anticipados",
        en: "Deferred income",
        fr: "Produits constatés d'avance",
        ar: "إيرادات مؤجلة"
      },
      type: "LIABILITY",
      level: 2,
      parentNumber: "48"
    },
    
    // === CUENTAS DE DOTACIONES Y PROVISIONES ===
    {
      accountNumber: "681",
      names: {
        es: "Amortización del inmovilizado material",
        en: "Depreciation of tangible fixed assets",
        fr: "Amortissement des immobilisations corporelles",
        ar: "استهلاك الأصول الثابتة الملموسة"
      },
      type: "EXPENSE",
      level: 2,
      parentNumber: "68"
    },
    {
      accountNumber: "682",
      names: {
        es: "Amortización del inmovilizado intangible",
        en: "Amortization of intangible assets",
        fr: "Amortissement des immobilisations incorporelles",
        ar: "إطفاء الأصول غير الملموسة"
      },
      type: "EXPENSE",
      level: 2,
      parentNumber: "68"
    },
    
    // === CUENTAS ESPECÍFICAS SII ===
    {
      accountNumber: "4709",
      names: {
        es: "Hacienda Pública, deudora por devolución de impuestos",
        en: "Tax authorities, tax refunds receivable",
        fr: "Administration fiscale, remboursements à recevoir",
        ar: "السلطات الضريبية، استردادات ضريبية مستحقة"
      },
      type: "ASSET",
      level: 3,
      parentNumber: "470"
    },
    {
      accountNumber: "4759",
      names: {
        es: "Hacienda Pública, acreedora por otros conceptos",
        en: "Tax authorities, other creditor",
        fr: "Administration fiscale, créditrice autres",
        ar: "السلطات الضريبية، دائن آخر"
      },
      type: "LIABILITY",
      level: 3,
      parentNumber: "475"
    },
    
    // === CUENTAS PARA OPERACIONES INTRACOMUNITARIAS ===
    {
      accountNumber: "4771",
      names: {
        es: "IVA repercutido operaciones intracomunitarias",
        en: "Output VAT on intra-community operations",
        fr: "TVA collectée opérations intracommunautaires",
        ar: "ضريبة القيمة المضافة المحصلة على العمليات داخل الاتحاد الأوروبي"
      },
      type: "LIABILITY",
      level: 3,
      parentNumber: "477"
    },
    {
      accountNumber: "4721",
      names: {
        es: "IVA soportado operaciones intracomunitarias",
        en: "Input VAT on intra-community operations",
        fr: "TVA déductible opérations intracommunautaires",
        ar: "ضريبة القيمة المضافة المدخلة على العمليات داخل الاتحاد الأوروبي"
      },
      type: "ASSET",
      level: 3,
      parentNumber: "472"
    },
    
    // === CUENTAS ESPECÍFICAS SECTOR PRIVADO SANITARIO ===
    {
      accountNumber: "759",
      names: {
        es: "Ingresos por servicios diversos",
        en: "Income from various services",
        fr: "Revenus de services divers",
        ar: "إيرادات من خدمات متنوعة"
      },
      type: "REVENUE",
      level: 2,
      parentNumber: "75"
    },
    {
      accountNumber: "651",
      names: {
        es: "Resultados de operaciones en común",
        en: "Results of joint operations",
        fr: "Résultats d'opérations en commun",
        ar: "نتائج العمليات المشتركة"
      },
      type: "EXPENSE",
      level: 2,
      parentNumber: "65"
    }
  ]
}; 