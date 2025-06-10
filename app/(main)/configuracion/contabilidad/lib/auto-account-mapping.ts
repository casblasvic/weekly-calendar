// Sistema de mapeo automático inteligente de cuentas contables
// Diseñado para ser escalable a múltiples países y planes contables

/**
 * Configuración de cuentas contables FIJAS por país
 * Estas son las cuentas legalmente definidas que DEBEN existir
 * Validadas por contador profesional - Normativa 2025
 */
export const FIXED_COUNTRY_ACCOUNTS = {
  ES: {
    services: '705',        // Prestaciones de servicios
    products: '700',        // Ventas de mercaderías
    consumables: '600',     // Compras de mercaderías
    cash: '570',            // Caja
    banks: '572',           // Bancos
    discounts: '709',       // Rappels y otros descuentos (665 es solo para pronto pago)
    vatReceivable: '472',   // IVA soportado
    vatPayable: '477',      // IVA repercutido
  },
  FR: {
    services: '706',        // Prestations de services
    products: '707',        // Ventes de marchandises
    consumables: '607',     // Achats de marchandises
    cash: '530',            // Caisse
    banks: '512',           // Banques
    discounts: '709',       // Rabais, remises et ristournes accordés
    vatReceivable: '44566', // TVA déductible
    vatPayable: '44571',    // TVA collectée
  },
  MA: {
    services: '712',        // Production vendue - services (solo servicios producidos)
    products: '711',        // Ventes de marchandises
    consumables: '611',     // Achats revendus de marchandises
    cash: '516',            // Caisses
    banks: '514',           // Banques
    discounts: '7129',      // Rabais, remises et ristournes accordés (618 es para compras)
    vatReceivable: '3455',  // État - TVA récupérable
    vatPayable: '4455',     // État - TVA facturée
  },
  MX: {
    services: '401',        // Ingresos por ventas y servicios - SAT 2024
    products: '401',        // Ingresos por ventas y servicios - SAT 2024  
    consumables: '501',     // Costo de venta y/o servicio
    cash: '101',            // Caja
    banks: '102',           // Bancos
    discounts: '402',       // Devoluciones y descuentos sobre ingresos
    vatReceivable: '118.01',// IVA acreditable pagado - SAT 2024
    vatPayable: '213.01',   // IVA por pagar - SAT 2024
  }
} as const;

/**
 * Obtiene las cuentas específicas del país
 * @throws Error si el país no está configurado
 */
export function getCountrySpecificAccounts(countryCode: string | null | undefined) {
  if (!countryCode) {
    throw new Error('Código de país no especificado');
  }
  
  const accounts = FIXED_COUNTRY_ACCOUNTS[countryCode as keyof typeof FIXED_COUNTRY_ACCOUNTS];
  if (!accounts) {
    throw new Error(`País ${countryCode} no tiene configuración de cuentas`);
  }
  
  return accounts;
}

export enum CategoryType {
  SERVICE = 'SERVICE',
  PRODUCT = 'PRODUCT',
  MIXED = 'MIXED'
}

interface Category {
  id: string;
  name: string;
  type?: CategoryType;
  appliesToServices?: boolean;
  appliesToProducts?: boolean;
}

interface Product {
  id: string;
  name: string;
  forSale?: boolean;
  isForSale?: boolean;
  consumable?: boolean;
  categoryId?: string;
  category?: { name: string } | null;
  settings?: {
    isForSale?: boolean;
    isInternalUse?: boolean;
  } | null;
}

interface Service {
  id: string;
  name: string;
  categoryId?: string;
  category?: { name: string } | null;
  settings?: {
    requiresMedicalSignOff?: boolean;
  } | null;
}

interface ChartOfAccountEntry {
  id: string;
  accountNumber: string;
  name: string;
  level: number;
  isActive: boolean;
}

// Interfaz mejorada para incluir patrón de subcuenta y dimensiones
export interface AccountMappingResult {
  accountNumber: string | null;
  subaccountPattern?: string;
  analyticalDimensions?: any;
  context?: any;
  accountType?: string;
}

/**
 * MAPEO PARA SERVICIOS
 */
export function getAutoServiceMapping(
  service: Service & { category?: { id: string; name: string } },
  chartOfAccounts: ChartOfAccountEntry[],
  countryCode?: string
): AccountMappingResult {
  console.log(`Getting auto mapping for service: ${service.name}`);
  
  // Si se proporciona el código del país, usar cuentas específicas
  const countryAccounts = getCountrySpecificAccounts(countryCode);
  if (countryAccounts) {
    const accountNumber = countryAccounts.services;
    return {
      accountNumber,
      subaccountPattern: '{base}.{clinic}.{service}',
      analyticalDimensions: [
        { type: 'service', required: true },
        { type: 'clinic', required: false }
      ]
    };
  }
  
  return { accountNumber: null };
}

/**
 * Verifica si un producto es usado como consumo en servicios
 */
export async function isProductUsedAsConsumption(productId: string, prisma: any): Promise<boolean> {
  const consumptions = await prisma.serviceConsumption.findFirst({
    where: { productId }
  });
  return !!consumptions;
}

/**
 * MAPEO PARA PRODUCTOS
 * Retorna múltiples mapeos si el producto es tanto para venta como consumo
 */
export function getAutoProductMapping(
  product: Product & { 
    category?: { id: string; name: string },
    consumptions?: any[],
    settings?: {
      isForSale?: boolean;
      isInternalUse?: boolean;
    }
  },
  chartOfAccounts: ChartOfAccountEntry[],
  countryCode?: string
): AccountMappingResult | AccountMappingResult[] {
  console.log(`Getting auto mapping for product: ${product.name}`);
  
  const isForSale = product.settings?.isForSale ?? product.isForSale ?? true;
  const isInternalUse = product.settings?.isInternalUse ?? false;
  const countryAccounts = getCountrySpecificAccounts(countryCode);
  
  if (countryAccounts) {
    // Si es producto dual (venta + consumo interno), retornar ambos mapeos
    if (isForSale && isInternalUse) {
      console.log(`Product ${product.name}: DUAL (venta + consumo interno)`);
      return [
        {
          accountNumber: countryAccounts.products,
          subaccountPattern: '{base}.{clinic}.{product}',
          analyticalDimensions: [
            { type: 'product', required: true },
            { type: 'clinic', required: false }
          ],
          accountType: 'sales'
        },
        {
          accountNumber: countryAccounts.consumables,
          subaccountPattern: '{base}.{clinic}.{product}',
          analyticalDimensions: [
            { type: 'product', required: true },
            { type: 'clinic', required: false }
          ],
          accountType: 'consumption'
        }
      ];
    }
    
    // Producto solo para venta
    if (isForSale && !isInternalUse) {
      console.log(`Product ${product.name}: Solo para venta`);
      return {
        accountNumber: countryAccounts.products,
        subaccountPattern: '{base}.{clinic}.{product}',
        analyticalDimensions: [
          { type: 'product', required: true },
          { type: 'clinic', required: false }
        ],
        accountType: 'sales'
      };
    }
    
    // Producto solo para consumo interno
    if (!isForSale && isInternalUse) {
      console.log(`Product ${product.name}: Solo consumo interno`);
      return {
        accountNumber: countryAccounts.consumables,
        subaccountPattern: '{base}.{clinic}.{product}',
        analyticalDimensions: [
          { type: 'product', required: true },
          { type: 'clinic', required: false }
        ],
        accountType: 'consumption'
      };
    }
    
    // Por defecto, si no tiene configuración clara, asumir que es para venta
    console.log(`Product ${product.name}: Sin configuración clara, asumiendo venta`);
    return {
      accountNumber: countryAccounts.products,
      subaccountPattern: '{base}.{clinic}.{product}',
      analyticalDimensions: [
        { type: 'product', required: true },
        { type: 'clinic', required: false }
      ],
      accountType: 'sales'
    };
  }
  
  return { accountNumber: null };
}

/**
 * MAPEO PARA CATEGORÍAS (adaptable a diferentes planes contables)
 */
export function getAutoCategoryMapping(
  category: Category,
  chartOfAccounts: ChartOfAccountEntry[],
  countryCode?: string
): AccountMappingResult {
  console.log(`Getting auto mapping for category: ${category.name}`);
  
  // Determinar tipo de categoría basado en las propiedades
  let categoryType = category.type || CategoryType.MIXED;
  
  if (category.appliesToServices !== undefined && category.appliesToProducts !== undefined) {
    if (category.appliesToServices && !category.appliesToProducts) {
      categoryType = CategoryType.SERVICE;
    } else if (!category.appliesToServices && category.appliesToProducts) {
      categoryType = CategoryType.PRODUCT;
    } else {
      categoryType = CategoryType.MIXED;
    }
  }
  
  // Seleccionar cuenta basada en el tipo
  const countryAccounts = getCountrySpecificAccounts(countryCode);
  if (countryAccounts) {
    const accountNumber = categoryType === CategoryType.SERVICE ? countryAccounts.services : countryAccounts.products;
    return {
      accountNumber,
      subaccountPattern: '{base}.{clinic}.{category}',
      analyticalDimensions: [
        { type: 'category', required: true },
        { type: 'clinic', required: false }
      ]
    };
  }
  
  return { accountNumber: null };
}

/**
 * MAPEO PARA MÉTODOS DE PAGO (flexible según tipo)
 */
export function getAutoPaymentMethodMapping(
  paymentType: string,
  chartOfAccounts: ChartOfAccountEntry[],
  countryCode?: string
): AccountMappingResult {
  console.log(`[getAutoPaymentMethodMapping] Tipo: ${paymentType}, País: ${countryCode}`);
  
  // Normalizar el tipo de pago
  const normalizedType = paymentType.toUpperCase();
  console.log(`[getAutoPaymentMethodMapping] Tipo normalizado: ${normalizedType}`);
  
  // Seleccionar cuenta basada en el tipo
  const countryAccounts = getCountrySpecificAccounts(countryCode);
  if (countryAccounts) {
    let accountNumber: string | undefined;
    switch (normalizedType) {
      case 'CASH':
        accountNumber = countryAccounts.cash;
        break;
      case 'BANK_TRANSFER':
        accountNumber = countryAccounts.banks;
        break;
      case 'CARD':
      case 'CREDIT_CARD':
      case 'DEBIT_CARD':
        // Las tarjetas van a cuentas bancarias
        accountNumber = countryAccounts.banks;
        break;
      case 'CHECK':
      case 'CHEQUE':
        // Los cheques van a cuentas bancarias
        accountNumber = countryAccounts.banks;
        break;
      case 'ONLINE_GATEWAY':
      case 'ONLINE_PAYMENT':
        // Los pagos online van a cuentas bancarias
        accountNumber = countryAccounts.banks;
        break;
      case 'SYS_DEFERRED_PAYMENT':
      case 'DEFERRED_PAYMENT':
      case 'DEFERRED':
        // Los pagos aplazados van a cuentas por cobrar
        // Para España: 430 (Clientes), Francia: 411, Marruecos: 342, México: 105
        accountNumber = countryCode === 'ES' ? '430' : 
                       countryCode === 'FR' ? '411' : 
                       countryCode === 'MA' ? '342' : 
                       countryCode === 'MX' ? '105' : undefined;
        break;
      case 'VOUCHER':
      case 'PACKAGE':
      case 'BONO':
      case 'PAQUETE':
      case 'INTERNAL_CREDIT':
        // Los bonos/paquetes van a cuentas de anticipos de clientes
        // Para España: 438 (Anticipos de clientes), Francia: 4191, Marruecos: 3421, México: 206
        accountNumber = countryCode === 'ES' ? '438' : 
                       countryCode === 'FR' ? '4191' : 
                       countryCode === 'MA' ? '3421' : 
                       countryCode === 'MX' ? '206' : undefined;
        break;
      case 'OTHER':
      case 'OTROS':
        // Otros métodos de pago van a cuentas bancarias por defecto
        accountNumber = countryAccounts.banks;
        break;
      default:
        // Por defecto usar cuentas bancarias
        accountNumber = countryAccounts.banks;
        console.log(`[getAutoPaymentMethodMapping] Tipo de pago no reconocido: ${normalizedType}, usando cuenta bancaria por defecto`);
    }
    
    if (accountNumber) {
      return {
        accountNumber,
        subaccountPattern: '{base}.{clinic}',
        analyticalDimensions: [
          { type: 'clinic', required: true }
        ]
      };
    }
  }

  return { accountNumber: null };
}

/**
 * MAPEO PARA TIPOS DE IVA
 */
export function getAutoVATMapping(
  chartOfAccounts: ChartOfAccountEntry[],
  countryCode?: string
): { inputAccount: string | null; outputAccount: string | null } {
  console.log('Getting auto mapping for VAT accounts');
  
  // Seleccionar cuentas basadas en el país
  const countryAccounts = getCountrySpecificAccounts(countryCode);
  if (countryAccounts) {
    return {
      inputAccount: countryAccounts.vatReceivable,
      outputAccount: countryAccounts.vatPayable
    };
  }
  
  return { inputAccount: null, outputAccount: null };
}

/**
 * BUSCAR CUENTA DE CAJA POR DEFECTO
 */
export function getDefaultCashAccount(
  chartOfAccounts: ChartOfAccountEntry[],
  countryCode?: string
): ChartOfAccountEntry | null {
  // Seleccionar cuenta basada en el país
  const countryAccounts = getCountrySpecificAccounts(countryCode);
  if (countryAccounts) {
    const accountNumber = countryAccounts.cash;
    return chartOfAccounts.find(account => account.accountNumber === accountNumber && account.isActive) || null;
  }
  
  return null;
}

/**
 * BUSCAR CUENTA DE DESCUENTOS POR DEFECTO
 */
export function getDefaultDiscountAccount(
  chartOfAccounts: ChartOfAccountEntry[],
  countryCode?: string
): ChartOfAccountEntry | null {
  // Seleccionar cuenta basada en el país
  const countryAccounts = getCountrySpecificAccounts(countryCode);
  if (countryAccounts) {
    const accountNumber = countryAccounts.discounts;
    return chartOfAccounts.find(account => account.accountNumber === accountNumber && account.isActive) || null;
  }
  
  return null;
}

/**
 * BUSCAR CUENTA DE BANCOS POR DEFECTO
 */
export function getDefaultBankAccount(
  chartOfAccounts: ChartOfAccountEntry[],
  countryCode?: string
): ChartOfAccountEntry | null {
  // Seleccionar cuenta basada en el país
  const countryAccounts = getCountrySpecificAccounts(countryCode);
  if (countryAccounts) {
    const accountNumber = countryAccounts.banks;
    return chartOfAccounts.find(account => account.accountNumber === accountNumber && account.isActive) || null;
  }
  
  return null;
}

/**
 * Función principal para obtener mapeo automático
 */
export function getAutoAccountMapping(
  item: { type: 'category' | 'product' | 'service' | 'paymentMethod'; data: any },
  chartOfAccounts: ChartOfAccountEntry[]
): AccountMappingResult | AccountMappingResult[] {
  switch (item.type) {
    case 'category':
      return getAutoCategoryMapping(item.data as Category, chartOfAccounts);
    case 'product':
      return getAutoProductMapping(item.data as Product & { category?: { id: string; name: string } }, chartOfAccounts);
    case 'service':
      return getAutoServiceMapping(item.data as Service & { category?: { id: string; name: string } }, chartOfAccounts);
    case 'paymentMethod':
      return getAutoPaymentMethodMapping(item.data.type, chartOfAccounts);
    default:
      return { accountNumber: null };
  }
}
