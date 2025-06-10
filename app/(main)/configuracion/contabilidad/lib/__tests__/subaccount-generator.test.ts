import { describe, it, expect, beforeEach } from 'vitest';
import { 
  generateSubaccount, 
  validateAnalyticalDimensions,
  type AnalyticalDimension,
  type SubaccountContext 
} from '../subaccount-generator';

describe('Subaccount Generator', () => {
  const mockDimensions: AnalyticalDimension[] = [
    {
      code: 'CLINIC',
      name: 'Clínica',
      dataType: 'STRING',
      isRequired: true,
      allowedValues: []
    },
    {
      code: 'COST_CENTER',
      name: 'Centro de Coste',
      dataType: 'STRING',
      isRequired: false,
      allowedValues: ['ADMIN', 'SALES', 'MEDICAL']
    }
  ];

  describe('generateSubaccount', () => {
    it('should generate subaccount from simple pattern', () => {
      const baseAccount = '705';
      const pattern = '{BASE}001';
      const context: SubaccountContext = {};
      
      const result = generateSubaccount(baseAccount, pattern, context);
      expect(result).toBe('705001');
    });

    it('should replace context variables in pattern', () => {
      const baseAccount = '705';
      const pattern = '{BASE}.{CLINIC}.{SERVICE}';
      const context: SubaccountContext = {
        clinic: { id: 'clinic123', name: 'Clínica Madrid' },
        service: { id: 'service456', name: 'Consulta' }
      };
      
      const result = generateSubaccount(baseAccount, pattern, context);
      expect(result).toBe('705.123.456');
    });

    it('should handle payment method codes', () => {
      const baseAccount = '572';
      const pattern = '{BASE}.{PAYMENT_METHOD}';
      const context: SubaccountContext = {
        paymentMethod: { id: 'pm_card', type: 'CARD' as any }
      };
      
      const result = generateSubaccount(baseAccount, pattern, context);
      expect(result).toBe('572.CARD');
    });

    it('should handle missing context gracefully', () => {
      const baseAccount = '705';
      const pattern = '{BASE}.{CLINIC}';
      const context: SubaccountContext = {};
      
      const result = generateSubaccount(baseAccount, pattern, context);
      expect(result).toBe('705.XXX');
    });

    it('should extract numeric part from IDs', () => {
      const baseAccount = '430';
      const pattern = '{BASE}{CATEGORY}';
      const context: SubaccountContext = {
        category: { id: 'cat_beauty_123', name: 'Belleza' }
      };
      
      const result = generateSubaccount(baseAccount, pattern, context);
      expect(result).toBe('430123');
    });
  });

  describe('validateAnalyticalDimensions', () => {
    it('should validate correct dimensions', async () => {
      const dimensionsData = {
        CLINIC: 'clinic123',
        COST_CENTER: 'ADMIN'
      };

      const mockPrisma = {
        analyticalDimension: {
          findMany: async () => mockDimensions
        }
      };

      const errors = await validateAnalyticalDimensions(
        dimensionsData,
        'system123',
        mockPrisma as any
      );

      expect(errors).toHaveLength(0);
    });

    it('should report missing required dimensions', async () => {
      const dimensionsData = {
        COST_CENTER: 'ADMIN'
      };

      const mockPrisma = {
        analyticalDimension: {
          findMany: async () => mockDimensions
        }
      };

      const errors = await validateAnalyticalDimensions(
        dimensionsData,
        'system123',
        mockPrisma as any
      );

      expect(errors).toContain('La dimensión CLINIC es requerida pero no fue proporcionada');
    });

    it('should validate allowed values', async () => {
      const dimensionsData = {
        CLINIC: 'clinic123',
        COST_CENTER: 'INVALID'
      };

      const mockPrisma = {
        analyticalDimension: {
          findMany: async () => mockDimensions
        }
      };

      const errors = await validateAnalyticalDimensions(
        dimensionsData,
        'system123',
        mockPrisma as any
      );

      expect(errors).toContain('El valor "INVALID" no es válido para la dimensión COST_CENTER');
    });

    it('should report unknown dimensions', async () => {
      const dimensionsData = {
        CLINIC: 'clinic123',
        UNKNOWN_DIM: 'value'
      };

      const mockPrisma = {
        analyticalDimension: {
          findMany: async () => mockDimensions
        }
      };

      const errors = await validateAnalyticalDimensions(
        dimensionsData,
        'system123',
        mockPrisma as any
      );

      expect(errors).toContain('La dimensión UNKNOWN_DIM no está configurada en el sistema');
    });
  });
});
