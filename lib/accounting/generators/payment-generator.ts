/**
 * Generador de métodos de pago estándar
 */

import { PaymentMethodTemplate, BusinessFeatures } from './types';

/**
 * Métodos de pago completos - Se crean TODOS para cualquier negocio
 * El usuario puede desactivar los que no necesite después
 */
const ALL_PAYMENT_METHODS: PaymentMethodTemplate[] = [
  {
    name: {
      es: 'Efectivo',
      fr: 'Espèces',
      en: 'Cash'
    },
    code: 'CASH',
    type: 'CASH',
    isActive: true,
    requiresTerminal: false,
    requiresBankAccount: false
  },
  {
    name: {
      es: 'Tarjeta de Crédito/Débito',
      fr: 'Carte de Crédit/Débit',
      en: 'Credit/Debit Card'
    },
    code: 'CARD',
    type: 'CARD',
    isActive: true,
    requiresTerminal: true,
    requiresBankAccount: false
  },
  {
    name: {
      es: 'Transferencia Bancaria',
      fr: 'Virement Bancaire',
      en: 'Bank Transfer'
    },
    code: 'BANK_TRANSFER',
    type: 'TRANSFER',
    isActive: true,
    requiresTerminal: false,
    requiresBankAccount: true
  },
  {
    name: {
      es: 'Pasarela de Pago Online',
      fr: 'Passerelle de Paiement en Ligne',
      en: 'Online Payment Gateway'
    },
    code: 'ONLINE_GATEWAY',
    type: 'OTHER',
    isActive: true, 
    requiresTerminal: false,
    requiresBankAccount: false
  },
  {
    name: {
      es: 'Cheque',
      fr: 'Chèque',
      en: 'Check'
    },
    code: 'CHECK',
    type: 'CHECK',
    isActive: true, 
    requiresTerminal: false,
    requiresBankAccount: true
  },
  {
    name: {
      es: 'Crédito Interno / Bonos',
      fr: 'Crédit Interne / Bons',
      en: 'Internal Credit / Vouchers'
    },
    code: 'INTERNAL_CREDIT',
    type: 'GIFT_CARD',
    isActive: true,
    requiresTerminal: false,
    requiresBankAccount: false
  },
  {
    name: {
      es: 'Pago Aplazado',
      fr: 'Paiement Différé',
      en: 'Deferred Payment'
    },
    code: 'DEFERRED_PAYMENT',
    type: 'OTHER',
    isActive: true,
    requiresTerminal: false,
    requiresBankAccount: false
  },
  {
    name: {
      es: 'Domiciliación Bancaria',
      fr: 'Prélèvement Bancaire',
      en: 'Direct Debit'
    },
    code: 'DIRECT_DEBIT',
    type: 'OTHER',
    isActive: true, 
    requiresTerminal: false,
    requiresBankAccount: true
  },
  {
    name: {
      es: 'Financiación',
      fr: 'Financement',
      en: 'Financing'
    },
    code: 'FINANCING',
    type: 'FINANCING',
    isActive: true, 
    requiresTerminal: false,
    requiresBankAccount: false
  }
];

/**
 * Genera TODOS los métodos de pago 
 */
export function generatePaymentMethods(): PaymentMethodTemplate[] {
  return ALL_PAYMENT_METHODS;
}

/**
 * Alias para compatibilidad
 */
export const generateAllPaymentMethods = generatePaymentMethods;

/**
 * Genera la configuración de cuentas contables por defecto para cada método de pago
 */
export function generatePaymentAccountMappings(
  paymentMethods: PaymentMethodTemplate[]
): { [paymentCode: string]: string } {
  const mappings: { [key: string]: string } = {
    'CASH': '570',                // Caja
    'CARD': '572',                // Bancos c/c
    'BANK_TRANSFER': '572',       // Bancos c/c
    'ONLINE_GATEWAY': '572',      // Bancos c/c
    'CHECK': '572',               // Bancos c/c
    'INTERNAL_CREDIT': '438',     // Anticipos de clientes
    'DEFERRED_PAYMENT': '430',    // Clientes
    'DIRECT_DEBIT': '572',        // Bancos c/c
    'FINANCING': '174',           // Acreedores por prestación de servicios a l/p
  };
  
  const result: { [key: string]: string } = {};
  
  // Mapear solo los métodos que están en la lista proporcionada
  paymentMethods.forEach(method => {
    if (mappings[method.code]) {
      result[method.code] = mappings[method.code];
    }
  });
  
  return result;
}
