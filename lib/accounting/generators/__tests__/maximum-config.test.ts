import { generateMaximumTemplate, generateConfigurationSummary } from '../maximum-template-configurator';
import { generateMaximumAccountsForCountry } from '../maximum-accounts-generator';
import { generateAllPaymentMethods } from '../payment-generator';

describe('Configuración de Máximos', () => {
  describe('generateMaximumTemplate', () => {
    it('debe generar una plantilla completa para España', () => {
      const baseTemplate = {
        name: 'Plan General Contable',
        description: 'Plan contable estándar para España',
        country: 'ES',
        accounts: [
          {
            number: '100',
            name: 'Capital social',
            type: 'EQUITY',
            description: 'Capital social de la empresa'
          }
        ]
      };

      const result = generateMaximumTemplate(baseTemplate);

      // Verificar estructura básica
      expect(result.name).toBe('Plan General Contable - Configuración Completa');
      expect(result.country).toBe('ES');
      expect(result.accounts.length).toBeGreaterThan(1);
      
      // Verificar extensiones
      expect(result.extensions).toBeDefined();
      expect(result.extensions.serviceCategories.length).toBe(7);
      expect(result.extensions.productFamilies.length).toBe(8);
      expect(result.extensions.paymentMethods.length).toBeGreaterThanOrEqual(9);
      expect(result.extensions.documentSeries.length).toBeGreaterThanOrEqual(12);
      
      // Verificar que todas las características están activadas
      expect(result.extensions.businessFeatures).toEqual({
        hasConsultationServices: true,
        hasMedicalTreatments: true,
        hasHairSalon: true,
        hasSpa: true,
        sellsProducts: true,
        isMultiCenter: true
      });
    });

    it('debe incluir todas las cuentas adicionales de máximos', () => {
      const baseTemplate = {
        name: 'Plan test',
        description: 'Test',
        country: 'ES',
        accounts: []
      };

      const result = generateMaximumTemplate(baseTemplate);
      const accountNumbers = result.accounts.map(acc => acc.number);

      // Verificar cuentas de personal
      expect(accountNumbers).toContain('640');
      expect(accountNumbers).toContain('642');
      expect(accountNumbers).toContain('465');
      expect(accountNumbers).toContain('476');

      // Verificar cuentas de amortización
      expect(accountNumbers).toContain('280');
      expect(accountNumbers).toContain('281');
      expect(accountNumbers).toContain('681');

      // Verificar cuentas de inventario
      expect(accountNumbers).toContain('300');
      expect(accountNumbers).toContain('600');
      expect(accountNumbers).toContain('700');

      // Verificar cuentas multicentro
      expect(accountNumbers).toContain('570001');
      expect(accountNumbers).toContain('570002');
    });

    it('debe generar todos los métodos de pago con mapeos', () => {
      const baseTemplate = {
        name: 'Plan test',
        description: 'Test',
        country: 'ES',
        accounts: []
      };

      const result = generateMaximumTemplate(baseTemplate);
      const paymentMethods = result.extensions.paymentMethods;
      const mappings = result.extensions.accountingMappings.paymentMethods;

      // Verificar que todos los métodos están presentes
      const methodCodes = paymentMethods.map(pm => pm.code);
      expect(methodCodes).toContain('CASH');
      expect(methodCodes).toContain('CARD');
      expect(methodCodes).toContain('BANK_TRANSFER');
      expect(methodCodes).toContain('DEFERRED_PAYMENT');
      expect(methodCodes).toContain('FINANCING');

      // Verificar mapeos
      expect(mappings['CASH']).toBeDefined();
      expect(mappings['CASH'].accountCode).toBe('570');
      expect(mappings['CARD']).toBeDefined();
      expect(mappings['CARD'].accountCode).toBe('572');
    });
  });

  describe('generateConfigurationSummary', () => {
    it('debe generar un resumen legible de la configuración', () => {
      const baseTemplate = {
        name: 'Plan test',
        description: 'Test',
        country: 'ES',
        accounts: []
      };

      const template = generateMaximumTemplate(baseTemplate);
      const summary = generateConfigurationSummary(template);

      expect(summary).toContain('CONFIGURACIÓN DE MÁXIMOS GENERADA');
      expect(summary).toContain('📊 CUENTAS CONTABLES');
      expect(summary).toContain('💳 MÉTODOS DE PAGO');
      expect(summary).toContain('📁 CATEGORÍAS DE SERVICIOS');
      expect(summary).toContain('📦 FAMILIAS DE PRODUCTOS');
      expect(summary).toContain('📄 SERIES DE DOCUMENTOS');
      expect(summary).toContain('✅ Preparado para empleados');
      expect(summary).toContain('✅ Preparado para multicentro');
    });
  });

  describe('Integración con generadores específicos', () => {
    it('debe integrar correctamente todos los generadores', () => {
      // Obtener cuentas de máximos
      const maximumAccounts = generateMaximumAccountsForCountry('ES');
      expect(maximumAccounts.length).toBeGreaterThan(20);

      // Obtener métodos de pago
      const paymentMethods = generateAllPaymentMethods();
      expect(paymentMethods.length).toBeGreaterThanOrEqual(9);

      // Verificar que todos tienen la estructura correcta
      paymentMethods.forEach(pm => {
        expect(pm.code).toBeDefined();
        expect(pm.name).toBeDefined();
        expect(pm.type).toBeDefined();
        expect(pm.isActive).toBeDefined();
      });
    });
  });
});
