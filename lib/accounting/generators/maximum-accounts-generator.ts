/**
 * Generador de cuentas contables de MÁXIMOS
 * Crea TODAS las cuentas necesarias para cualquier situación empresarial
 */

export interface AdditionalAccount {
  code: string;
  name: {
    es: string;
    fr: string;
    en: string;
  };
  description?: {
    es: string;
    fr: string;
    en: string;
  };
  type: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE';
  isActive: boolean;
}

/**
 * Genera cuentas adicionales para la configuración de máximos
 * Cubre TODAS las posibles situaciones de un negocio
 */
export function generateMaximumAccountsForCountry(countryCode: string): AdditionalAccount[] {
  switch(countryCode.toUpperCase()) {
    case 'ES':
      return generateSpainMaximumAccounts();
    case 'FR':
      return generateFranceMaximumAccounts();
    default:
      // Por defecto usar estructura similar a España
      return generateSpainMaximumAccounts();
  }
}

/**
 * Genera cuentas de configuración máxima para España
 */
function generateSpainMaximumAccounts(): AdditionalAccount[] {
  const accounts: AdditionalAccount[] = [];

  // CUENTAS DE PERSONAL (Grupo 64)
  accounts.push(
    {
      code: '640',
      name: { es: 'Sueldos y salarios', fr: 'Salaires et traitements', en: 'Wages and salaries' },
      type: 'EXPENSE',
      isActive: true
    },
    {
      code: '642',
      name: { es: 'Seguridad Social a cargo de la empresa', fr: 'Sécurité sociale à charge de l\'entreprise', en: 'Social security employer contributions' },
      type: 'EXPENSE',
      isActive: true
    },
    {
      code: '649',
      name: { es: 'Otros gastos sociales', fr: 'Autres charges sociales', en: 'Other social expenses' },
      type: 'EXPENSE',
      isActive: true
    }
  );

  // CUENTAS DE AMORTIZACIÓN (Grupo 28 y 68)
  accounts.push(
    {
      code: '280',
      name: { es: 'Amortización acumulada del inmovilizado intangible', fr: 'Amortissement cumulé des immobilisations incorporelles', en: 'Accumulated depreciation of intangible assets' },
      type: 'ASSET',
      isActive: true
    },
    {
      code: '281',
      name: { es: 'Amortización acumulada del inmovilizado material', fr: 'Amortissement cumulé des immobilisations corporelles', en: 'Accumulated depreciation of tangible assets' },
      type: 'ASSET',
      isActive: true
    },
    {
      code: '680',
      name: { es: 'Amortización del inmovilizado intangible', fr: 'Amortissement des immobilisations incorporelles', en: 'Depreciation of intangible assets' },
      type: 'EXPENSE',
      isActive: true
    },
    {
      code: '681',
      name: { es: 'Amortización del inmovilizado material', fr: 'Amortissement des immobilisations corporelles', en: 'Depreciation of tangible assets' },
      type: 'EXPENSE',
      isActive: true
    }
  );

  // CUENTAS DE INVENTARIO (Grupos 30, 60, 70)
  accounts.push(
    {
      code: '300',
      name: { es: 'Mercaderías', fr: 'Marchandises', en: 'Merchandise' },
      type: 'ASSET',
      isActive: true
    },
    {
      code: '600',
      name: { es: 'Compras de mercaderías', fr: 'Achats de marchandises', en: 'Purchases of merchandise' },
      type: 'EXPENSE',
      isActive: true
    },
    {
      code: '610',
      name: { es: 'Variación de existencias de mercaderías', fr: 'Variation de stocks de marchandises', en: 'Change in merchandise inventory' },
      type: 'EXPENSE',
      isActive: true
    },
    {
      code: '700',
      name: { es: 'Ventas de mercaderías', fr: 'Ventes de marchandises', en: 'Sales of merchandise' },
      type: 'REVENUE',
      isActive: true
    }
  );

  // CUENTAS DE SERVICIOS
  accounts.push(
    {
      code: '705',
      name: { es: 'Prestaciones de servicios', fr: 'Prestations de services', en: 'Service revenue' },
      type: 'REVENUE',
      isActive: true
    }
  );

  // CUENTAS PARA PAGOS APLAZADOS Y DUDOSOS
  accounts.push(
    {
      code: '431',
      name: { es: 'Clientes, efectos comerciales a cobrar', fr: 'Clients, effets commerciaux à recevoir', en: 'Trade receivables, bills receivable' },
      type: 'ASSET',
      isActive: true
    },
    {
      code: '436',
      name: { es: 'Clientes de dudoso cobro', fr: 'Clients douteux', en: 'Doubtful debtors' },
      type: 'ASSET',
      isActive: true
    },
    {
      code: '490',
      name: { es: 'Deterioro de valor de créditos por operaciones comerciales', fr: 'Dépréciation de créances commerciales', en: 'Impairment of trade receivables' },
      type: 'ASSET',
      isActive: true
    },
    {
      code: '650',
      name: { es: 'Pérdidas de créditos comerciales incobrables', fr: 'Pertes sur créances commerciales irrécouvrables', en: 'Losses from uncollectible trade receivables' },
      type: 'EXPENSE',
      isActive: true
    }
  );

  // CUENTAS DE PROVEEDORES Y ACREEDORES
  accounts.push(
    {
      code: '400',
      name: { es: 'Proveedores', fr: 'Fournisseurs', en: 'Suppliers' },
      type: 'LIABILITY',
      isActive: true
    },
    {
      code: '410',
      name: { es: 'Acreedores por prestaciones de servicios', fr: 'Créanciers pour prestations de services', en: 'Service creditors' },
      type: 'LIABILITY',
      isActive: true
    }
  );

  // CUENTAS DE RETENCIONES Y HACIENDA
  accounts.push(
    {
      code: '465',
      name: { es: 'Remuneraciones pendientes de pago', fr: 'Rémunérations à payer', en: 'Salaries payable' },
      type: 'LIABILITY',
      isActive: true
    },
    {
      code: '4751',
      name: { es: 'Hacienda Pública, acreedora por retenciones practicadas', fr: 'Administration fiscale, créditrice pour retenues', en: 'Tax authority, creditor for withholdings' },
      type: 'LIABILITY',
      isActive: true
    },
    {
      code: '476',
      name: { es: 'Organismos de la Seguridad Social, acreedores', fr: 'Organismes de sécurité sociale, créditeurs', en: 'Social security creditors' },
      type: 'LIABILITY',
      isActive: true
    }
  );

  // CUENTAS DE GASTOS DIVERSOS
  accounts.push(
    {
      code: '621',
      name: { es: 'Arrendamientos y cánones', fr: 'Loyers et redevances', en: 'Rent and royalties' },
      type: 'EXPENSE',
      isActive: true
    },
    {
      code: '622',
      name: { es: 'Reparaciones y conservación', fr: 'Réparations et entretien', en: 'Repairs and maintenance' },
      type: 'EXPENSE',
      isActive: true
    },
    {
      code: '623',
      name: { es: 'Servicios de profesionales independientes', fr: 'Services de professionnels indépendants', en: 'Independent professional services' },
      type: 'EXPENSE',
      isActive: true
    },
    {
      code: '624',
      name: { es: 'Transportes', fr: 'Transports', en: 'Transportation' },
      type: 'EXPENSE',
      isActive: true
    },
    {
      code: '625',
      name: { es: 'Primas de seguros', fr: 'Primes d\'assurance', en: 'Insurance premiums' },
      type: 'EXPENSE',
      isActive: true
    },
    {
      code: '626',
      name: { es: 'Servicios bancarios y similares', fr: 'Services bancaires et similaires', en: 'Banking services' },
      type: 'EXPENSE',
      isActive: true
    },
    {
      code: '627',
      name: { es: 'Publicidad, propaganda y relaciones públicas', fr: 'Publicité, propagande et relations publiques', en: 'Advertising and public relations' },
      type: 'EXPENSE',
      isActive: true
    },
    {
      code: '628',
      name: { es: 'Suministros', fr: 'Fournitures', en: 'Utilities' },
      type: 'EXPENSE',
      isActive: true
    },
    {
      code: '629',
      name: { es: 'Otros servicios', fr: 'Autres services', en: 'Other services' },
      type: 'EXPENSE',
      isActive: true
    }
  );

  // CUENTAS DE COMISIONES (para pagos con tarjeta)
  accounts.push(
    {
      code: '669',
      name: { es: 'Otros gastos financieros', fr: 'Autres charges financières', en: 'Other financial expenses' },
      description: { 
        es: 'Incluye comisiones bancarias y de tarjetas',
        fr: 'Comprend les commissions bancaires et de cartes',
        en: 'Includes bank and card fees'
      },
      type: 'EXPENSE',
      isActive: true
    }
  );

  // SUBCUENTAS PARA MULTICENTRO
  // Ejemplo de estructura para cajas por centro
  accounts.push(
    {
      code: '5700001',
      name: { es: 'Caja Centro Principal', fr: 'Caisse Centre Principal', en: 'Cash Main Center' },
      type: 'ASSET',
      isActive: true
    },
    {
      code: '5700002',
      name: { es: 'Caja Centro 2', fr: 'Caisse Centre 2', en: 'Cash Center 2' },
      type: 'ASSET',
      isActive: true
    },
    {
      code: '5700003',
      name: { es: 'Caja Centro 3', fr: 'Caisse Centre 3', en: 'Cash Center 3' },
      type: 'ASSET',
      isActive: true
    }
  );

  return accounts;
}

/**
 * Genera cuentas de configuración máxima para Francia
 */
function generateFranceMaximumAccounts(): AdditionalAccount[] {
  return [
    // Personal
    {
      code: '641',
      name: { es: 'Remuneraciones del personal', fr: 'Rémunérations du personnel', en: 'Staff remuneration' },
      type: 'EXPENSE',
      description: { 
        es: 'Salarios y remuneraciones del personal',
        fr: 'Salaires et traitements du personnel',
        en: 'Staff salaries and wages'
      },
      isActive: true
    },
    {
      code: '645',
      name: { es: 'Cargas sociales', fr: 'Charges de sécurité sociale', en: 'Social security charges' },
      type: 'EXPENSE',
      description: { 
        es: 'Cotizaciones patronales de seguridad social',
        fr: 'Cotisations patronales',
        en: 'Employer social security contributions'
      },
      isActive: true
    },
    {
      code: '421',
      name: { es: 'Personal - remuneraciones pendientes', fr: 'Personnel - rémunérations dues', en: 'Staff - remuneration due' },
      type: 'LIABILITY',
      isActive: true
    },
    {
      code: '431',
      name: { es: 'Seguridad social', fr: 'Sécurité sociale', en: 'Social security' },
      type: 'LIABILITY',
      isActive: true
    },
    // Amortizaciones
    {
      code: '2801',
      name: { es: 'Amortizaciones del inmovilizado inmaterial', fr: 'Amortissements des immobilisations incorporelles', en: 'Amortization of intangible assets' },
      type: 'ASSET',
      isActive: true
    },
    {
      code: '2813',
      name: { es: 'Amortizaciones de construcciones', fr: 'Amortissements des constructions', en: 'Depreciation of buildings' },
      type: 'ASSET',
      isActive: true
    },
    {
      code: '6811',
      name: { es: 'Dotaciones a las amortizaciones', fr: 'Dotations aux amortissements', en: 'Depreciation charges' },
      type: 'EXPENSE',
      isActive: true
    },
    // Inventario
    {
      code: '370',
      name: { es: 'Stocks de mercaderías', fr: 'Stocks de marchandises', en: 'Merchandise inventory' },
      type: 'ASSET',
      isActive: true
    },
    {
      code: '607',
      name: { es: 'Compras de mercaderías', fr: 'Achats de marchandises', en: 'Purchases of goods' },
      type: 'EXPENSE',
      isActive: true
    },
    {
      code: '707',
      name: { es: 'Ventas de mercaderías', fr: 'Ventes de marchandises', en: 'Sales of goods' },
      type: 'REVENUE',
      isActive: true
    },
    // Servicios
    {
      code: '706',
      name: { es: 'Prestaciones de servicios', fr: 'Prestations de services', en: 'Service revenue' },
      type: 'REVENUE',
      isActive: true
    },
    // Proveedores
    {
      code: '401',
      name: { es: 'Proveedores', fr: 'Fournisseurs', en: 'Suppliers' },
      type: 'LIABILITY',
      isActive: true
    },
    {
      code: '4081',
      name: { es: 'Proveedores - Facturas pendientes', fr: 'Fournisseurs - factures non parvenues', en: 'Suppliers - invoices pending' },
      type: 'LIABILITY',
      isActive: true
    },
    // Clientes
    {
      code: '411',
      name: { es: 'Clientes', fr: 'Clients', en: 'Customers' },
      type: 'ASSET',
      isActive: true
    },
    {
      code: '416',
      name: { es: 'Clientes dudosos', fr: 'Clients douteux', en: 'Doubtful customers' },
      type: 'ASSET',
      isActive: true
    },
    {
      code: '491',
      name: { es: 'Provisiones para clientes', fr: 'Dépréciations des comptes clients', en: 'Provision for bad debts' },
      type: 'ASSET',
      isActive: true
    },
    // Caja y bancos para multicentro
    {
      code: '531001',
      name: { es: 'Caja Centro 1', fr: 'Caisse Centre 1', en: 'Cash Center 1' },
      type: 'ASSET',
      isActive: true
    },
    {
      code: '531002',
      name: { es: 'Caja Centro 2', fr: 'Caisse Centre 2', en: 'Cash Center 2' },
      type: 'ASSET',
      isActive: true
    },
    {
      code: '531003',
      name: { es: 'Caja Centro 3', fr: 'Caisse Centre 3', en: 'Cash Center 3' },
      type: 'ASSET',
      isActive: true
    },
    // Gastos diversos
    {
      code: '613',
      name: { es: 'Alquileres', fr: 'Locations', en: 'Rent' },
      type: 'EXPENSE',
      isActive: true
    },
    {
      code: '615',
      name: { es: 'Reparaciones y conservación', fr: 'Entretien et réparations', en: 'Repairs and maintenance' },
      type: 'EXPENSE',
      isActive: true
    },
    {
      code: '622',
      name: { es: 'Honorarios', fr: 'Rémunérations d\'intermédiaires et honoraires', en: 'Professional fees' },
      type: 'EXPENSE',
      isActive: true
    },
    {
      code: '616',
      name: { es: 'Primas de seguros', fr: 'Primes d\'assurance', en: 'Insurance premiums' },
      type: 'EXPENSE',
      isActive: true
    },
    {
      code: '627',
      name: { es: 'Servicios bancarios', fr: 'Services bancaires', en: 'Banking services' },
      type: 'EXPENSE',
      isActive: true
    },
    {
      code: '623',
      name: { es: 'Publicidad y propaganda', fr: 'Publicité, publications', en: 'Advertising' },
      type: 'EXPENSE',
      isActive: true
    },
    {
      code: '626',
      name: { es: 'Gastos postales y telecomunicaciones', fr: 'Frais postaux et télécommunications', en: 'Postal and telecommunications' },
      type: 'EXPENSE',
      isActive: true
    }
  ];
}

/**
 * Genera subcuentas adicionales para estructura multicentro
 */
export function generateMultiCenterSubAccounts(
  parentCode: string,
  numberOfCenters: number,
  accountName: { es: string; fr: string; en: string }
): AdditionalAccount[] {
  const subAccounts: AdditionalAccount[] = [];
  
  for (let i = 1; i <= numberOfCenters; i++) {
    const paddedNumber = i.toString().padStart(3, '0');
    subAccounts.push({
      code: `${parentCode}${paddedNumber}`,
      name: {
        es: `${accountName.es} - Centro ${i}`,
        fr: `${accountName.fr} - Centre ${i}`,
        en: `${accountName.en} - Center ${i}`
      },
      type: 'ASSET', // Ajustar según el tipo de cuenta padre
      isActive: true
    });
  }
  
  return subAccounts;
}
