/**
 * Plantilla IFRS Base para Clínicas Estéticas y Centros de Belleza
 * 
 * Esta plantilla proporciona un plan contable basado en las Normas Internacionales
 * de Información Financiera (IFRS) adaptado específicamente para clínicas estéticas,
 * centros de belleza y negocios similares del sector.
 * 
 * Características:
 * - Multi-idioma: ES, FR, EN, AR
 * - Estructura jerárquica de 4 niveles
 * - Categorías predefinidas para servicios y productos del sector
 * - Integración automática con categorías de servicios/productos
 * - Configuración de IVA por tipo de cuenta
 */

import { ChartOfAccountTemplate } from '@/types/accounting';

export const IFRS_AESTHETIC_CLINIC_TEMPLATE: ChartOfAccountTemplate = {
  code: 'IFRS_AESTHETIC_CLINIC',
  names: {
    es: 'IFRS Clínicas y Centros Estéticos',
    fr: 'IFRS Cliniques et Centres Esthétiques',
    en: 'IFRS Aesthetic Clinics & Beauty Centers',
    ar: 'المعايير الدولية للعيادات ومراكز التجميل'
  },
  description: {
    es: 'Plan contable basado en IFRS adaptado para clínicas estéticas y centros de belleza',
    fr: 'Plan comptable basé sur les IFRS adapté aux cliniques esthétiques et centres de beauté',
    en: 'IFRS-based chart of accounts adapted for aesthetic clinics and beauty centers',
    ar: 'خطة محاسبية قائمة على المعايير الدولية مخصصة للعيادات التجميلية ومراكز التجميل'
  },
  level: 1,
  countryIso: null,
  version: '2024.1',
  isSystem: true,
  entries: [
    // ========== ACTIVOS ==========
    {
      accountNumber: "1",
      names: {
        es: "ACTIVO",
        fr: "ACTIF",
        en: "ASSETS",
        ar: "الأصول"
      },
      type: "ASSET",
      level: 0,
      allowsDirectEntry: false
    },
    
    // === ACTIVO NO CORRIENTE ===
    {
      accountNumber: "10",
      names: {
        es: "ACTIVO NO CORRIENTE",
        fr: "ACTIF NON COURANT",
        en: "NON-CURRENT ASSETS",
        ar: "الأصول غير المتداولة"
      },
      type: "ASSET",
      level: 1,
      parentNumber: "1",
      allowsDirectEntry: false
    },
    {
      accountNumber: "101",
      names: {
        es: "EQUIPAMIENTO MÉDICO",
        fr: "ÉQUIPEMENT MÉDICAL",
        en: "MEDICAL EQUIPMENT",
        ar: "المعدات الطبية"
      },
      type: "ASSET",
      level: 2,
      parentNumber: "10",
      ifrsCode: "101",
      vatCategory: "VAT_DEDUCTIBLE"
    },
    {
      accountNumber: "102",
      names: {
        es: "EQUIPAMIENTO ESTÉTICO",
        fr: "ÉQUIPEMENT ESTHÉTIQUE",
        en: "AESTHETIC EQUIPMENT",
        ar: "معدات التجميل"
      },
      type: "ASSET",
      level: 2,
      parentNumber: "10",
      ifrsCode: "102",
      vatCategory: "VAT_DEDUCTIBLE"
    },
    {
      accountNumber: "103",
      names: {
        es: "MOBILIARIO Y DECORACIÓN",
        fr: "MOBILIER ET DÉCORATION",
        en: "FURNITURE AND FIXTURES",
        ar: "الأثاث والديكور"
      },
      type: "ASSET",
      level: 2,
      parentNumber: "10",
      ifrsCode: "103",
      vatCategory: "VAT_DEDUCTIBLE"
    },
    {
      accountNumber: "104",
      names: {
        es: "EQUIPOS INFORMÁTICOS",
        fr: "ÉQUIPEMENTS INFORMATIQUES",
        en: "IT EQUIPMENT",
        ar: "معدات تكنولوجيا المعلومات"
      },
      type: "ASSET",
      level: 2,
      parentNumber: "10",
      ifrsCode: "104",
      vatCategory: "VAT_DEDUCTIBLE"
    },
    
    // === ACTIVO CORRIENTE ===
    {
      accountNumber: "11",
      names: {
        es: "ACTIVO CORRIENTE",
        fr: "ACTIF COURANT",
        en: "CURRENT ASSETS",
        ar: "الأصول المتداولة"
      },
      type: "ASSET",
      level: 1,
      parentNumber: "1",
      allowsDirectEntry: false
    },
    
    // TESORERÍA
    {
      accountNumber: "110",
      names: {
        es: "CAJA Y BANCOS",
        fr: "CAISSE ET BANQUES",
        en: "CASH AND BANKS",
        ar: "النقد والبنوك"
      },
      type: "ASSET",
      level: 2,
      parentNumber: "11",
      allowsDirectEntry: false
    },
    {
      accountNumber: "1101",
      names: {
        es: "CAJA GENERAL",
        fr: "CAISSE GÉNÉRALE",
        en: "GENERAL CASH",
        ar: "الصندوق العام"
      },
      type: "ASSET",
      level: 3,
      parentNumber: "110",
      ifrsCode: "1101"
    },
    {
      accountNumber: "1102",
      names: {
        es: "BANCOS CUENTA CORRIENTE",
        fr: "BANQUES COMPTE COURANT",
        en: "BANK CURRENT ACCOUNTS",
        ar: "الحسابات الجارية البنكية"
      },
      type: "ASSET",
      level: 3,
      parentNumber: "110",
      ifrsCode: "1102"
    },
    
    // CUENTAS POR COBRAR
    {
      accountNumber: "112",
      names: {
        es: "CUENTAS POR COBRAR",
        fr: "COMPTES CLIENTS",
        en: "ACCOUNTS RECEIVABLE",
        ar: "حسابات العملاء"
      },
      type: "ASSET",
      level: 2,
      parentNumber: "11",
      allowsDirectEntry: false
    },
    {
      accountNumber: "1121",
      names: {
        es: "CLIENTES",
        fr: "CLIENTS",
        en: "CUSTOMERS",
        ar: "العملاء"
      },
      type: "ASSET",
      level: 3,
      parentNumber: "112",
      ifrsCode: "1121"
    },
    {
      accountNumber: "1122",
      names: {
        es: "DEUDORES VARIOS",
        fr: "DÉBITEURS DIVERS",
        en: "SUNDRY DEBTORS",
        ar: "مدينون متنوعون"
      },
      type: "ASSET",
      level: 3,
      parentNumber: "112",
      ifrsCode: "1122"
    },
    
    // INVENTARIOS
    {
      accountNumber: "113",
      names: {
        es: "INVENTARIOS",
        fr: "STOCKS",
        en: "INVENTORY",
        ar: "المخزون"
      },
      type: "ASSET",
      level: 2,
      parentNumber: "11",
      allowsDirectEntry: false
    },
    {
      accountNumber: "1131",
      names: {
        es: "PRODUCTOS COSMÉTICOS",
        fr: "PRODUITS COSMÉTIQUES",
        en: "COSMETIC PRODUCTS",
        ar: "منتجات التجميل"
      },
      type: "ASSET",
      level: 3,
      parentNumber: "113",
      ifrsCode: "1131",
      vatCategory: "VAT_DEDUCTIBLE",
      defaultForProducts: true,
      productCategories: ["COSMETICS", "SKINCARE", "BEAUTY_PRODUCTS"]
    },
    {
      accountNumber: "1132",
      names: {
        es: "MATERIAL MÉDICO DESECHABLE",
        fr: "MATÉRIEL MÉDICAL JETABLE",
        en: "DISPOSABLE MEDICAL SUPPLIES",
        ar: "المستلزمات الطبية للاستعمال مرة واحدة"
      },
      type: "ASSET",
      level: 3,
      parentNumber: "113",
      ifrsCode: "1132",
      vatCategory: "VAT_DEDUCTIBLE",
      productCategories: ["MEDICAL_SUPPLIES", "DISPOSABLES"]
    },
    {
      accountNumber: "1133",
      names: {
        es: "MEDICAMENTOS",
        fr: "MÉDICAMENTS",
        en: "MEDICINES",
        ar: "الأدوية"
      },
      type: "ASSET",
      level: 3,
      parentNumber: "113",
      ifrsCode: "1133",
      vatCategory: "VAT_MEDICAL",
      productCategories: ["MEDICINES", "PHARMACEUTICALS"]
    },
    
    // ========== PASIVOS ==========
    {
      accountNumber: "2",
      names: {
        es: "PASIVO",
        fr: "PASSIF",
        en: "LIABILITIES",
        ar: "الخصوم"
      },
      type: "LIABILITY",
      level: 0,
      allowsDirectEntry: false
    },
    
    // === PASIVO NO CORRIENTE ===
    {
      accountNumber: "20",
      names: {
        es: "PASIVO NO CORRIENTE",
        fr: "PASSIF NON COURANT",
        en: "NON-CURRENT LIABILITIES",
        ar: "الخصوم غير المتداولة"
      },
      type: "LIABILITY",
      level: 1,
      parentNumber: "2",
      allowsDirectEntry: false
    },
    {
      accountNumber: "201",
      names: {
        es: "PRÉSTAMOS A LARGO PLAZO",
        fr: "EMPRUNTS À LONG TERME",
        en: "LONG-TERM LOANS",
        ar: "القروض طويلة الأجل"
      },
      type: "LIABILITY",
      level: 2,
      parentNumber: "20",
      ifrsCode: "201"
    },
    
    // === PASIVO CORRIENTE ===
    {
      accountNumber: "21",
      names: {
        es: "PASIVO CORRIENTE",
        fr: "PASSIF COURANT",
        en: "CURRENT LIABILITIES",
        ar: "الخصوم المتداولة"
      },
      type: "LIABILITY",
      level: 1,
      parentNumber: "2",
      allowsDirectEntry: false
    },
    
    // CUENTAS POR PAGAR
    {
      accountNumber: "210",
      names: {
        es: "CUENTAS POR PAGAR",
        fr: "COMPTES FOURNISSEURS",
        en: "ACCOUNTS PAYABLE",
        ar: "حسابات الموردين"
      },
      type: "LIABILITY",
      level: 2,
      parentNumber: "21",
      allowsDirectEntry: false
    },
    {
      accountNumber: "2101",
      names: {
        es: "PROVEEDORES",
        fr: "FOURNISSEURS",
        en: "SUPPLIERS",
        ar: "الموردون"
      },
      type: "LIABILITY",
      level: 3,
      parentNumber: "210",
      ifrsCode: "2101"
    },
    {
      accountNumber: "2102",
      names: {
        es: "ACREEDORES VARIOS",
        fr: "CRÉDITEURS DIVERS",
        en: "SUNDRY CREDITORS",
        ar: "دائنون متنوعون"
      },
      type: "LIABILITY",
      level: 3,
      parentNumber: "210",
      ifrsCode: "2102"
    },
    
    // OBLIGACIONES FISCALES
    {
      accountNumber: "211",
      names: {
        es: "OBLIGACIONES FISCALES",
        fr: "OBLIGATIONS FISCALES",
        en: "TAX LIABILITIES",
        ar: "الالتزامات الضريبية"
      },
      type: "LIABILITY",
      level: 2,
      parentNumber: "21",
      allowsDirectEntry: false
    },
    {
      accountNumber: "2111",
      names: {
        es: "IVA POR PAGAR",
        fr: "TVA À PAYER",
        en: "VAT PAYABLE",
        ar: "ضريبة القيمة المضافة المستحقة"
      },
      type: "LIABILITY",
      level: 3,
      parentNumber: "211",
      ifrsCode: "2111",
      vatCategory: "VAT_PAYABLE"
    },
    {
      accountNumber: "2112",
      names: {
        es: "RETENCIONES POR PAGAR",
        fr: "RETENUES À PAYER",
        en: "WITHHOLDINGS PAYABLE",
        ar: "الاقتطاعات المستحقة"
      },
      type: "LIABILITY",
      level: 3,
      parentNumber: "211",
      ifrsCode: "2112"
    },
    
    // ========== PATRIMONIO ==========
    {
      accountNumber: "3",
      names: {
        es: "PATRIMONIO NETO",
        fr: "CAPITAUX PROPRES",
        en: "EQUITY",
        ar: "حقوق الملكية"
      },
      type: "EQUITY",
      level: 0,
      allowsDirectEntry: false
    },
    {
      accountNumber: "301",
      names: {
        es: "CAPITAL SOCIAL",
        fr: "CAPITAL SOCIAL",
        en: "SHARE CAPITAL",
        ar: "رأس المال"
      },
      type: "EQUITY",
      level: 1,
      parentNumber: "3",
      ifrsCode: "301"
    },
    {
      accountNumber: "302",
      names: {
        es: "RESERVAS",
        fr: "RÉSERVES",
        en: "RESERVES",
        ar: "الاحتياطيات"
      },
      type: "EQUITY",
      level: 1,
      parentNumber: "3",
      ifrsCode: "302"
    },
    {
      accountNumber: "303",
      names: {
        es: "RESULTADOS ACUMULADOS",
        fr: "RÉSULTATS ACCUMULÉS",
        en: "RETAINED EARNINGS",
        ar: "الأرباح المحتجزة"
      },
      type: "EQUITY",
      level: 1,
      parentNumber: "3",
      ifrsCode: "303"
    },
    
    // ========== INGRESOS ==========
    {
      accountNumber: "4",
      names: {
        es: "INGRESOS",
        fr: "REVENUS",
        en: "REVENUE",
        ar: "الإيرادات"
      },
      type: "REVENUE",
      level: 0,
      allowsDirectEntry: false
    },
    
    // === INGRESOS OPERACIONALES ===
    {
      accountNumber: "41",
      names: {
        es: "INGRESOS OPERACIONALES",
        fr: "REVENUS OPÉRATIONNELS",
        en: "OPERATING REVENUE",
        ar: "الإيرادات التشغيلية"
      },
      type: "REVENUE",
      level: 1,
      parentNumber: "4",
      allowsDirectEntry: false
    },
    
    // SERVICIOS MÉDICOS
    {
      accountNumber: "411",
      names: {
        es: "SERVICIOS MÉDICOS",
        fr: "SERVICES MÉDICAUX",
        en: "MEDICAL SERVICES",
        ar: "الخدمات الطبية"
      },
      type: "REVENUE",
      level: 2,
      parentNumber: "41",
      allowsDirectEntry: false,
      vatCategory: "VAT_MEDICAL_EXEMPT",
      defaultForServices: true,
      serviceCategories: ["MEDICAL_CONSULTATIONS", "SURGERIES", "MEDICAL_TREATMENTS"]
    },
    {
      accountNumber: "4111",
      names: {
        es: "CONSULTAS MÉDICAS",
        fr: "CONSULTATIONS MÉDICALES",
        en: "MEDICAL CONSULTATIONS",
        ar: "الاستشارات الطبية"
      },
      type: "REVENUE",
      level: 3,
      parentNumber: "411",
      ifrsCode: "4111",
      vatCategory: "VAT_MEDICAL_EXEMPT"
    },
    {
      accountNumber: "4112",
      names: {
        es: "CIRUGÍAS",
        fr: "CHIRURGIES",
        en: "SURGERIES",
        ar: "العمليات الجراحية"
      },
      type: "REVENUE",
      level: 3,
      parentNumber: "411",
      ifrsCode: "4112",
      vatCategory: "VAT_MEDICAL_EXEMPT"
    },
    
    // SERVICIOS ESTÉTICOS
    {
      accountNumber: "412",
      names: {
        es: "SERVICIOS ESTÉTICOS",
        fr: "SERVICES ESTHÉTIQUES",
        en: "AESTHETIC SERVICES",
        ar: "خدمات التجميل"
      },
      type: "REVENUE",
      level: 2,
      parentNumber: "41",
      allowsDirectEntry: false,
      vatCategory: "VAT_STANDARD",
      defaultForServices: true,
      serviceCategories: ["FACIAL_TREATMENTS", "BODY_TREATMENTS", "HAIR_REMOVAL"]
    },
    {
      accountNumber: "4121",
      names: {
        es: "TRATAMIENTOS FACIALES",
        fr: "SOINS DU VISAGE",
        en: "FACIAL TREATMENTS",
        ar: "علاجات الوجه"
      },
      type: "REVENUE",
      level: 3,
      parentNumber: "412",
      ifrsCode: "4121",
      vatCategory: "VAT_STANDARD"
    },
    {
      accountNumber: "4122",
      names: {
        es: "TRATAMIENTOS CORPORALES",
        fr: "SOINS DU CORPS",
        en: "BODY TREATMENTS",
        ar: "علاجات الجسم"
      },
      type: "REVENUE",
      level: 3,
      parentNumber: "412",
      ifrsCode: "4122",
      vatCategory: "VAT_STANDARD"
    },
    {
      accountNumber: "4123",
      names: {
        es: "DEPILACIÓN LÁSER",
        fr: "ÉPILATION LASER",
        en: "LASER HAIR REMOVAL",
        ar: "إزالة الشعر بالليزر"
      },
      type: "REVENUE",
      level: 3,
      parentNumber: "412",
      ifrsCode: "4123",
      vatCategory: "VAT_STANDARD"
    },
    
    // VENTA DE PRODUCTOS
    {
      accountNumber: "413",
      names: {
        es: "VENTA DE PRODUCTOS",
        fr: "VENTE DE PRODUITS",
        en: "PRODUCT SALES",
        ar: "مبيعات المنتجات"
      },
      type: "REVENUE",
      level: 2,
      parentNumber: "41",
      ifrsCode: "413",
      vatCategory: "VAT_STANDARD",
      defaultForProducts: true
    },
    
    // ========== GASTOS ==========
    {
      accountNumber: "5",
      names: {
        es: "GASTOS",
        fr: "CHARGES",
        en: "EXPENSES",
        ar: "المصروفات"
      },
      type: "EXPENSE",
      level: 0,
      allowsDirectEntry: false
    },
    
    // === GASTOS OPERACIONALES ===
    {
      accountNumber: "51",
      names: {
        es: "GASTOS OPERACIONALES",
        fr: "CHARGES OPÉRATIONNELLES",
        en: "OPERATING EXPENSES",
        ar: "المصروفات التشغيلية"
      },
      type: "EXPENSE",
      level: 1,
      parentNumber: "5",
      allowsDirectEntry: false
    },
    
    // COSTO DE VENTAS
    {
      accountNumber: "511",
      names: {
        es: "COSTO DE VENTAS",
        fr: "COÛT DES VENTES",
        en: "COST OF SALES",
        ar: "تكلفة المبيعات"
      },
      type: "COST_OF_GOODS_SOLD",
      level: 2,
      parentNumber: "51",
      allowsDirectEntry: false
    },
    {
      accountNumber: "5111",
      names: {
        es: "COSTO PRODUCTOS VENDIDOS",
        fr: "COÛT DES PRODUITS VENDUS",
        en: "COST OF GOODS SOLD",
        ar: "تكلفة البضائع المباعة"
      },
      type: "COST_OF_GOODS_SOLD",
      level: 3,
      parentNumber: "511",
      ifrsCode: "5111",
      vatCategory: "VAT_DEDUCTIBLE"
    },
    {
      accountNumber: "5112",
      names: {
        es: "MATERIAL MÉDICO CONSUMIDO",
        fr: "MATÉRIEL MÉDICAL CONSOMMÉ",
        en: "MEDICAL SUPPLIES CONSUMED",
        ar: "المستلزمات الطبية المستهلكة"
      },
      type: "COST_OF_GOODS_SOLD",
      level: 3,
      parentNumber: "511",
      ifrsCode: "5112",
      vatCategory: "VAT_DEDUCTIBLE"
    },
    
    // GASTOS DE PERSONAL
    {
      accountNumber: "512",
      names: {
        es: "GASTOS DE PERSONAL",
        fr: "CHARGES DE PERSONNEL",
        en: "PERSONNEL EXPENSES",
        ar: "مصروفات الموظفين"
      },
      type: "EXPENSE",
      level: 2,
      parentNumber: "51",
      allowsDirectEntry: false
    },
    {
      accountNumber: "5121",
      names: {
        es: "SUELDOS Y SALARIOS",
        fr: "SALAIRES ET TRAITEMENTS",
        en: "WAGES AND SALARIES",
        ar: "الرواتب والأجور"
      },
      type: "EXPENSE",
      level: 3,
      parentNumber: "512",
      ifrsCode: "5121"
    },
    {
      accountNumber: "5122",
      names: {
        es: "SEGURIDAD SOCIAL",
        fr: "SÉCURITÉ SOCIALE",
        en: "SOCIAL SECURITY",
        ar: "الضمان الاجتماعي"
      },
      type: "EXPENSE",
      level: 3,
      parentNumber: "512",
      ifrsCode: "5122"
    },
    {
      accountNumber: "5123",
      names: {
        es: "HONORARIOS PROFESIONALES",
        fr: "HONORAIRES PROFESSIONNELS",
        en: "PROFESSIONAL FEES",
        ar: "الأتعاب المهنية"
      },
      type: "EXPENSE",
      level: 3,
      parentNumber: "512",
      ifrsCode: "5123",
      vatCategory: "VAT_PROFESSIONAL"
    },
    
    // GASTOS GENERALES
    {
      accountNumber: "513",
      names: {
        es: "GASTOS GENERALES",
        fr: "CHARGES GÉNÉRALES",
        en: "GENERAL EXPENSES",
        ar: "المصروفات العامة"
      },
      type: "EXPENSE",
      level: 2,
      parentNumber: "51",
      allowsDirectEntry: false
    },
    {
      accountNumber: "5131",
      names: {
        es: "ALQUILER LOCAL",
        fr: "LOYER",
        en: "RENT",
        ar: "الإيجار"
      },
      type: "EXPENSE",
      level: 3,
      parentNumber: "513",
      ifrsCode: "5131",
      vatCategory: "VAT_STANDARD"
    },
    {
      accountNumber: "5132",
      names: {
        es: "SUMINISTROS (LUZ, AGUA, GAS)",
        fr: "FOURNITURES (ÉLECTRICITÉ, EAU, GAZ)",
        en: "UTILITIES",
        ar: "المرافق"
      },
      type: "EXPENSE",
      level: 3,
      parentNumber: "513",
      ifrsCode: "5132",
      vatCategory: "VAT_STANDARD"
    },
    {
      accountNumber: "5133",
      names: {
        es: "TELÉFONO E INTERNET",
        fr: "TÉLÉPHONE ET INTERNET",
        en: "PHONE AND INTERNET",
        ar: "الهاتف والإنترنت"
      },
      type: "EXPENSE",
      level: 3,
      parentNumber: "513",
      ifrsCode: "5133",
      vatCategory: "VAT_STANDARD"
    },
    {
      accountNumber: "5134",
      names: {
        es: "MARKETING Y PUBLICIDAD",
        fr: "MARKETING ET PUBLICITÉ",
        en: "MARKETING AND ADVERTISING",
        ar: "التسويق والإعلان"
      },
      type: "EXPENSE",
      level: 3,
      parentNumber: "513",
      ifrsCode: "5134",
      vatCategory: "VAT_STANDARD"
    },
    {
      accountNumber: "5135",
      names: {
        es: "SEGUROS",
        fr: "ASSURANCES",
        en: "INSURANCE",
        ar: "التأمين"
      },
      type: "EXPENSE",
      level: 3,
      parentNumber: "513",
      ifrsCode: "5135",
      vatCategory: "VAT_STANDARD"
    },
    {
      accountNumber: "5136",
      names: {
        es: "MANTENIMIENTO EQUIPOS",
        fr: "MAINTENANCE ÉQUIPEMENTS",
        en: "EQUIPMENT MAINTENANCE",
        ar: "صيانة المعدات"
      },
      type: "EXPENSE",
      level: 3,
      parentNumber: "513",
      ifrsCode: "5136",
      vatCategory: "VAT_DEDUCTIBLE"
    }
  ]
}; 