// Cuentas contables básicas por país - Sistema simplificado
// Solo las cuentas esenciales para operativa diaria

export type BasicAccount = {
  accountNumber: string;
  name: string;
  type: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE';
  parentNumber?: string;
  isMonetary?: boolean;
  allowDirectEntry?: boolean;
};

export const BASIC_ACCOUNTS_BY_COUNTRY: Record<string, BasicAccount[]> = {
  // ESPAÑA
  ES: [
    // INGRESOS (70X)
    { accountNumber: "700", name: "Ventas de mercaderías", type: "REVENUE", isMonetary: true, allowDirectEntry: true },
    { accountNumber: "705", name: "Prestaciones de servicios", type: "REVENUE", isMonetary: true, allowDirectEntry: true },
    { accountNumber: "708", name: "Devoluciones de ventas", type: "REVENUE", isMonetary: true, allowDirectEntry: true },
    
    // CAJA Y BANCOS (57X)
    { accountNumber: "570", name: "Caja", type: "ASSET", isMonetary: true, allowDirectEntry: false },
    { accountNumber: "5700", name: "Caja efectivo", type: "ASSET", parentNumber: "570", isMonetary: true, allowDirectEntry: true },
    { accountNumber: "5701", name: "Caja tarjeta", type: "ASSET", parentNumber: "570", isMonetary: true, allowDirectEntry: true },
    { accountNumber: "5702", name: "Caja transferencia", type: "ASSET", parentNumber: "570", isMonetary: true, allowDirectEntry: true },
    { accountNumber: "572", name: "Bancos", type: "ASSET", isMonetary: true, allowDirectEntry: true },
    
    // CLIENTES Y DEUDAS (43X)
    { accountNumber: "430", name: "Clientes", type: "ASSET", isMonetary: true, allowDirectEntry: true },
    { accountNumber: "431", name: "Clientes, efectos comerciales", type: "ASSET", isMonetary: true, allowDirectEntry: true },
    { accountNumber: "436", name: "Clientes de dudoso cobro", type: "ASSET", isMonetary: true, allowDirectEntry: true },
    { accountNumber: "438", name: "Anticipos de clientes", type: "LIABILITY", isMonetary: true, allowDirectEntry: true },
    
    // PROVEEDORES (40X)
    { accountNumber: "400", name: "Proveedores", type: "LIABILITY", isMonetary: true, allowDirectEntry: true },
    { accountNumber: "410", name: "Acreedores diversos", type: "LIABILITY", isMonetary: true, allowDirectEntry: true },
    
    // GASTOS OPERATIVOS (6XX)
    { accountNumber: "600", name: "Compras de mercaderías", type: "EXPENSE", isMonetary: true, allowDirectEntry: true },
    { accountNumber: "621", name: "Arrendamientos", type: "EXPENSE", isMonetary: true, allowDirectEntry: true },
    { accountNumber: "622", name: "Reparaciones y conservación", type: "EXPENSE", isMonetary: true, allowDirectEntry: true },
    { accountNumber: "623", name: "Servicios de profesionales", type: "EXPENSE", isMonetary: true, allowDirectEntry: true },
    { accountNumber: "625", name: "Primas de seguros", type: "EXPENSE", isMonetary: true, allowDirectEntry: true },
    { accountNumber: "626", name: "Servicios bancarios", type: "EXPENSE", isMonetary: true, allowDirectEntry: true },
    { accountNumber: "628", name: "Suministros", type: "EXPENSE", isMonetary: true, allowDirectEntry: true },
    { accountNumber: "629", name: "Otros servicios", type: "EXPENSE", isMonetary: true, allowDirectEntry: true },
    
    // PERSONAL (64X)
    { accountNumber: "640", name: "Sueldos y salarios", type: "EXPENSE", isMonetary: true, allowDirectEntry: true },
    { accountNumber: "642", name: "Seguridad Social a cargo empresa", type: "EXPENSE", isMonetary: true, allowDirectEntry: true },
    { accountNumber: "465", name: "Remuneraciones pendientes de pago", type: "LIABILITY", isMonetary: true, allowDirectEntry: true },
    { accountNumber: "476", name: "Organismos de la Seguridad Social", type: "LIABILITY", isMonetary: true, allowDirectEntry: true },
    
    // IVA (47X)
    { accountNumber: "472", name: "IVA soportado", type: "ASSET", isMonetary: true, allowDirectEntry: true },
    { accountNumber: "477", name: "IVA repercutido", type: "LIABILITY", isMonetary: true, allowDirectEntry: true },
  ],

  // FRANCIA
  FR: [
    // PRODUITS (70X)
    { accountNumber: "706", name: "Prestations de services", type: "REVENUE", isMonetary: true, allowDirectEntry: true },
    { accountNumber: "707", name: "Ventes de marchandises", type: "REVENUE", isMonetary: true, allowDirectEntry: true },
    { accountNumber: "709", name: "Rabais, remises accordés", type: "REVENUE", isMonetary: true, allowDirectEntry: true },
    
    // TRÉSORERIE (51X/53X)
    { accountNumber: "512", name: "Banques", type: "ASSET", isMonetary: true, allowDirectEntry: true },
    { accountNumber: "530", name: "Caisse", type: "ASSET", isMonetary: true, allowDirectEntry: false },
    { accountNumber: "5300", name: "Caisse espèces", type: "ASSET", parentNumber: "530", isMonetary: true, allowDirectEntry: true },
    { accountNumber: "5301", name: "Caisse cartes", type: "ASSET", parentNumber: "530", isMonetary: true, allowDirectEntry: true },
    { accountNumber: "5302", name: "Caisse virements", type: "ASSET", parentNumber: "530", isMonetary: true, allowDirectEntry: true },
    
    // CLIENTS (41X)
    { accountNumber: "411", name: "Clients", type: "ASSET", isMonetary: true, allowDirectEntry: true },
    { accountNumber: "413", name: "Clients - Effets à recevoir", type: "ASSET", isMonetary: true, allowDirectEntry: true },
    { accountNumber: "416", name: "Clients douteux", type: "ASSET", isMonetary: true, allowDirectEntry: true },
    { accountNumber: "419", name: "Clients créditeurs", type: "LIABILITY", isMonetary: true, allowDirectEntry: true },
    
    // FOURNISSEURS (40X)
    { accountNumber: "401", name: "Fournisseurs", type: "LIABILITY", isMonetary: true, allowDirectEntry: true },
    { accountNumber: "408", name: "Fournisseurs - Factures non parvenues", type: "LIABILITY", isMonetary: true, allowDirectEntry: true },
    
    // CHARGES (60X/62X)
    { accountNumber: "607", name: "Achats de marchandises", type: "EXPENSE", isMonetary: true, allowDirectEntry: true },
    { accountNumber: "613", name: "Locations", type: "EXPENSE", isMonetary: true, allowDirectEntry: true },
    { accountNumber: "615", name: "Entretien et réparations", type: "EXPENSE", isMonetary: true, allowDirectEntry: true },
    { accountNumber: "622", name: "Rémunérations d'intermédiaires", type: "EXPENSE", isMonetary: true, allowDirectEntry: true },
    { accountNumber: "616", name: "Primes d'assurance", type: "EXPENSE", isMonetary: true, allowDirectEntry: true },
    { accountNumber: "627", name: "Services bancaires", type: "EXPENSE", isMonetary: true, allowDirectEntry: true },
    { accountNumber: "626", name: "Frais postaux", type: "EXPENSE", isMonetary: true, allowDirectEntry: true },
    
    // PERSONNEL (64X)
    { accountNumber: "641", name: "Rémunérations du personnel", type: "EXPENSE", isMonetary: true, allowDirectEntry: true },
    { accountNumber: "645", name: "Charges de sécurité sociale", type: "EXPENSE", isMonetary: true, allowDirectEntry: true },
    { accountNumber: "421", name: "Personnel - Rémunérations dues", type: "LIABILITY", isMonetary: true, allowDirectEntry: true },
    { accountNumber: "431", name: "Sécurité sociale", type: "LIABILITY", isMonetary: true, allowDirectEntry: true },
    
    // TVA (44X)
    { accountNumber: "44566", name: "TVA déductible", type: "ASSET", isMonetary: true, allowDirectEntry: true },
    { accountNumber: "44571", name: "TVA collectée", type: "LIABILITY", isMonetary: true, allowDirectEntry: true },
  ],

  // MARRUECOS
  MA: [
    // PRODUITS (71X)
    { accountNumber: "711", name: "Ventes de marchandises", type: "REVENUE", isMonetary: true, allowDirectEntry: true },
    { accountNumber: "712", name: "Ventes de biens et services", type: "REVENUE", isMonetary: true, allowDirectEntry: true },
    { accountNumber: "718", name: "Autres produits d'exploitation", type: "REVENUE", isMonetary: true, allowDirectEntry: true },
    
    // TRÉSORERIE (51X)
    { accountNumber: "514", name: "Banques", type: "ASSET", isMonetary: true, allowDirectEntry: true },
    { accountNumber: "516", name: "Caisses", type: "ASSET", isMonetary: true, allowDirectEntry: false },
    { accountNumber: "5161", name: "Caisse centrale", type: "ASSET", parentNumber: "516", isMonetary: true, allowDirectEntry: true },
    { accountNumber: "5162", name: "Caisse cartes", type: "ASSET", parentNumber: "516", isMonetary: true, allowDirectEntry: true },
    { accountNumber: "5163", name: "Caisse virements", type: "ASSET", parentNumber: "516", isMonetary: true, allowDirectEntry: true },
    
    // CLIENTS (342X)
    { accountNumber: "3421", name: "Clients", type: "ASSET", isMonetary: true, allowDirectEntry: true },
    { accountNumber: "3423", name: "Clients - Retenues de garantie", type: "ASSET", isMonetary: true, allowDirectEntry: true },
    { accountNumber: "3424", name: "Clients douteux", type: "ASSET", isMonetary: true, allowDirectEntry: true },
    { accountNumber: "3427", name: "Clients - Factures à établir", type: "ASSET", isMonetary: true, allowDirectEntry: true },
    
    // FOURNISSEURS (441X)
    { accountNumber: "4411", name: "Fournisseurs", type: "LIABILITY", isMonetary: true, allowDirectEntry: true },
    { accountNumber: "4415", name: "Fournisseurs - Effets à payer", type: "LIABILITY", isMonetary: true, allowDirectEntry: true },
    
    // CHARGES (61X)
    { accountNumber: "611", name: "Achats revendus de marchandises", type: "EXPENSE", isMonetary: true, allowDirectEntry: true },
    { accountNumber: "612", name: "Achats consommés", type: "EXPENSE", isMonetary: true, allowDirectEntry: true },
    { accountNumber: "613", name: "Locations et charges locatives", type: "EXPENSE", isMonetary: true, allowDirectEntry: true },
    { accountNumber: "614", name: "Charges d'entretien", type: "EXPENSE", isMonetary: true, allowDirectEntry: true },
    { accountNumber: "616", name: "Primes d'assurances", type: "EXPENSE", isMonetary: true, allowDirectEntry: true },
    { accountNumber: "617", name: "Charges du personnel", type: "EXPENSE", isMonetary: true, allowDirectEntry: true },
    
    // PERSONNEL (44X)
    { accountNumber: "4432", name: "Rémunérations dues au personnel", type: "LIABILITY", isMonetary: true, allowDirectEntry: true },
    { accountNumber: "4441", name: "CNSS", type: "LIABILITY", isMonetary: true, allowDirectEntry: true },
    
    // TVA (445X)
    { accountNumber: "3455", name: "État - TVA récupérable", type: "ASSET", isMonetary: true, allowDirectEntry: true },
    { accountNumber: "4455", name: "État - TVA facturée", type: "LIABILITY", isMonetary: true, allowDirectEntry: true },
  ],

  // MÉXICO
  MX: [
    // INGRESOS (4XX)
    { accountNumber: "401", name: "Ingresos por servicios", type: "REVENUE", isMonetary: true, allowDirectEntry: true },
    { accountNumber: "402", name: "Ingresos por ventas", type: "REVENUE", isMonetary: true, allowDirectEntry: true },
    { accountNumber: "403", name: "Devoluciones y descuentos", type: "REVENUE", isMonetary: true, allowDirectEntry: true },
    
    // EFECTIVO Y BANCOS (10X)
    { accountNumber: "101", name: "Caja", type: "ASSET", isMonetary: true, allowDirectEntry: false },
    { accountNumber: "1011", name: "Caja efectivo", type: "ASSET", parentNumber: "101", isMonetary: true, allowDirectEntry: true },
    { accountNumber: "1012", name: "Caja tarjetas", type: "ASSET", parentNumber: "101", isMonetary: true, allowDirectEntry: true },
    { accountNumber: "1013", name: "Caja transferencias", type: "ASSET", parentNumber: "101", isMonetary: true, allowDirectEntry: true },
    { accountNumber: "102", name: "Bancos", type: "ASSET", isMonetary: true, allowDirectEntry: true },
    
    // CLIENTES (11X)
    { accountNumber: "113", name: "Clientes", type: "ASSET", isMonetary: true, allowDirectEntry: true },
    { accountNumber: "114", name: "Documentos por cobrar", type: "ASSET", isMonetary: true, allowDirectEntry: true },
    { accountNumber: "115", name: "Clientes de dudosa recuperación", type: "ASSET", isMonetary: true, allowDirectEntry: true },
    { accountNumber: "116", name: "Anticipo de clientes", type: "LIABILITY", isMonetary: true, allowDirectEntry: true },
    
    // PROVEEDORES (20X)
    { accountNumber: "201", name: "Proveedores", type: "LIABILITY", isMonetary: true, allowDirectEntry: true },
    { accountNumber: "202", name: "Acreedores diversos", type: "LIABILITY", isMonetary: true, allowDirectEntry: true },
    
    // GASTOS (50X/60X)
    { accountNumber: "501", name: "Compras", type: "EXPENSE", isMonetary: true, allowDirectEntry: true },
    { accountNumber: "601", name: "Gastos de venta", type: "EXPENSE", isMonetary: true, allowDirectEntry: true },
    { accountNumber: "602", name: "Gastos de administración", type: "EXPENSE", isMonetary: true, allowDirectEntry: true },
    { accountNumber: "603", name: "Gastos financieros", type: "EXPENSE", isMonetary: true, allowDirectEntry: true },
    
    // PERSONAL
    { accountNumber: "510", name: "Sueldos y salarios", type: "EXPENSE", isMonetary: true, allowDirectEntry: true },
    { accountNumber: "511", name: "Cuotas patronales IMSS", type: "EXPENSE", isMonetary: true, allowDirectEntry: true },
    { accountNumber: "213", name: "Sueldos por pagar", type: "LIABILITY", isMonetary: true, allowDirectEntry: true },
    { accountNumber: "214", name: "IMSS por pagar", type: "LIABILITY", isMonetary: true, allowDirectEntry: true },
    
    // IVA
    { accountNumber: "118", name: "IVA acreditable", type: "ASSET", isMonetary: true, allowDirectEntry: true },
    { accountNumber: "216", name: "IVA por pagar", type: "LIABILITY", isMonetary: true, allowDirectEntry: true },
  ]
};

// Mapeo de métodos de pago por país
export const PAYMENT_METHOD_MAPPINGS: Record<string, Record<string, string>> = {
  ES: {
    CASH: "5700",
    CARD: "5701", 
    BANK_TRANSFER: "5702",
    ONLINE_GATEWAY: "572",
    CHECK: "572",
    INTERNAL_CREDIT: "438",
    DEFERRED_PAYMENT: "430",
    OTHER: "572"
  },
  FR: {
    CASH: "5300",
    CARD: "5301",
    BANK_TRANSFER: "5302", 
    ONLINE_GATEWAY: "512",
    CHECK: "512",
    INTERNAL_CREDIT: "419",
    DEFERRED_PAYMENT: "411",
    OTHER: "512"
  },
  MA: {
    CASH: "5161",
    CARD: "5162",
    BANK_TRANSFER: "5163",
    ONLINE_GATEWAY: "514",
    CHECK: "514", 
    INTERNAL_CREDIT: "3427",
    DEFERRED_PAYMENT: "3421",
    OTHER: "514"
  },
  MX: {
    CASH: "1011",
    CARD: "1012",
    BANK_TRANSFER: "1013",
    ONLINE_GATEWAY: "102",
    CHECK: "102",
    INTERNAL_CREDIT: "116",
    DEFERRED_PAYMENT: "113",
    OTHER: "102"
  }
};
