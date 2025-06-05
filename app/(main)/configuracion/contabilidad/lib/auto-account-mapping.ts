// Sistema de mapeo automático inteligente de cuentas contables

export enum CategoryType {
  SERVICE = 'SERVICE',
  PRODUCT = 'PRODUCT',
  MIXED = 'MIXED'
}

interface Category {
  id: string;
  name: string;
  type?: CategoryType;
}

interface Product {
  id: string;
  name: string;
  isForSale: boolean;
  categoryId?: string;
}

interface Service {
  id: string;
  name: string;
  requiresMedicalSignOff: boolean;
  categoryId?: string;
}

interface ChartOfAccountEntry {
  id: string;
  accountNumber: string;
  name: string;
  level: number;
  isActive: boolean;
}

// Reglas de mapeo basadas en tipo y características
const MAPPING_RULES = {
  // Mapeo para categorías
  category: {
    SERVICE: { accountPrefix: '712', description: 'Ventes de services produits' }, // Plan marroquí
    PRODUCT: { accountPrefix: '711', description: 'Ventes de marchandises' }, // Plan marroquí  
    MIXED: { accountPrefix: '712', description: 'Ventes diverses' } // Por defecto servicios
  },
  
  // Mapeo para productos
  product: {
    forSale: { accountPrefix: '711', description: 'Ventes de marchandises' },
    consumable: { accountPrefix: '611', description: 'Achats de marchandises' }
  },
  
  // Mapeo para servicios
  service: {
    medical: { accountPrefix: '7124', description: 'Services médicaux' },
    nonMedical: { accountPrefix: '7125', description: 'Services esthétiques' }
  }
};

// Palabras clave para sugerencias inteligentes (actualizado para plan marroquí)
const KEYWORD_MAPPINGS = {
  // Servicios médicos
  ['consulta|diagnóstico|tratamiento|cirugía|médico|sanitario']: '7124',
  // Servicios estéticos
  ['estética|belleza|facial|corporal|masaje']: '7125',
  // Productos cosméticos
  ['cosmético|crema|serum|producto']: '7111',
  // Material sanitario
  ['material|suministro|consumible']: '6111',
};

/**
 * Encuentra la cuenta más apropiada en el plan contable basándose en el prefijo
 */
function findAccountByPrefix(
  chartOfAccounts: ChartOfAccountEntry[], 
  prefix: string
): string | null {
  // Buscar cuenta exacta primero
  const exactMatch = chartOfAccounts.find(
    account => account.accountNumber === prefix && account.isActive
  );
  if (exactMatch) return exactMatch.id;
  
  // Buscar cuenta que empiece con el prefijo
  const prefixMatch = chartOfAccounts.find(
    account => account.accountNumber.startsWith(prefix) && account.isActive
  );
  if (prefixMatch) return prefixMatch.id;
  
  // Si el prefijo es de 3 dígitos, buscar con los primeros 2 dígitos
  if (prefix.length >= 3) {
    const shorterPrefix = prefix.substring(0, 2);
    const shorterMatch = chartOfAccounts.find(
      account => account.accountNumber.startsWith(shorterPrefix) && account.isActive
    );
    if (shorterMatch) return shorterMatch.id;
  }
  
  // Si el prefijo es de ingresos (7xx), NO buscar en otras clases
  if (prefix.startsWith('7')) {
    // Solo buscar en cuentas de clase 7
    const class7Account = chartOfAccounts.find(
      account => account.accountNumber.startsWith('7') && account.isActive && account.level > 1
    );
    if (class7Account) return class7Account.id;
  }
  
  // Si el prefijo es de gastos (6xx), NO buscar en otras clases
  if (prefix.startsWith('6')) {
    // Solo buscar en cuentas de clase 6
    const class6Account = chartOfAccounts.find(
      account => account.accountNumber.startsWith('6') && account.isActive && account.level > 1
    );
    if (class6Account) return class6Account.id;
  }
  
  // No devolver cuentas de otras clases para evitar mapeos incorrectos
  return null;
}

/**
 * Obtiene el mapeo contable automático para una categoría
 */
export function getAutoCategoryMapping(
  category: Category,
  chartOfAccounts: ChartOfAccountEntry[]
): string | null {
  const type = category.type || CategoryType.MIXED;
  const rule = MAPPING_RULES.category[type];
  
  // Buscar por palabras clave primero
  const name = category.name.toLowerCase();
  for (const [keywords, accountPrefix] of Object.entries(KEYWORD_MAPPINGS)) {
    const regex = new RegExp(keywords, 'i');
    if (regex.test(name)) {
      const account = findAccountByPrefix(chartOfAccounts, accountPrefix);
      if (account) return account;
    }
  }
  
  // Si no hay coincidencia por palabras clave, usar regla por tipo
  return findAccountByPrefix(chartOfAccounts, rule.accountPrefix);
}

/**
 * Obtiene el mapeo contable automático para un producto
 */
export function getAutoProductMapping(
  product: Product,
  chartOfAccounts: ChartOfAccountEntry[]
): string | null {
  const rule = product.isForSale 
    ? MAPPING_RULES.product.forSale 
    : MAPPING_RULES.product.consumable;
    
  // Buscar por palabras clave primero
  const name = product.name.toLowerCase();
  for (const [keywords, accountPrefix] of Object.entries(KEYWORD_MAPPINGS)) {
    const regex = new RegExp(keywords, 'i');
    if (regex.test(name)) {
      const account = findAccountByPrefix(chartOfAccounts, accountPrefix);
      if (account) return account;
    }
  }
  
  return findAccountByPrefix(chartOfAccounts, rule.accountPrefix);
}

/**
 * Obtiene el mapeo contable automático para un servicio
 */
export function getAutoServiceMapping(
  service: Service,
  chartOfAccounts: ChartOfAccountEntry[]
): string | null {
  const rule = service.requiresMedicalSignOff
    ? MAPPING_RULES.service.medical
    : MAPPING_RULES.service.nonMedical;
    
  // Buscar por palabras clave primero
  const name = service.name.toLowerCase();
  for (const [keywords, accountPrefix] of Object.entries(KEYWORD_MAPPINGS)) {
    const regex = new RegExp(keywords, 'i');
    if (regex.test(name)) {
      const account = findAccountByPrefix(chartOfAccounts, accountPrefix);
      if (account) return account;
    }
  }
  
  return findAccountByPrefix(chartOfAccounts, rule.accountPrefix);
}

/**
 * Función principal para obtener mapeo automático
 */
export function getAutoAccountMapping(
  item: { type: 'category' | 'product' | 'service'; data: any },
  chartOfAccounts: ChartOfAccountEntry[]
): string | null {
  switch (item.type) {
    case 'category':
      return getAutoCategoryMapping(item.data, chartOfAccounts);
    case 'product':
      return getAutoProductMapping(item.data, chartOfAccounts);
    case 'service':
      return getAutoServiceMapping(item.data, chartOfAccounts);
    default:
      return null;
  }
}
