/**
 * Hook de Validación de Ejercicio Fiscal
 * 
 * Valida que las operaciones contables se realicen
 * dentro del ejercicio fiscal activo
 */

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';

interface FiscalYear {
  id: string;
  name: string;
  startDate: Date;
  endDate: Date;
  status: 'OPEN' | 'CLOSING_PROCESS' | 'CLOSED';
}

interface ValidationResult {
  isValid: boolean;
  message?: string;
  fiscalYear?: FiscalYear;
}

export function useFiscalYearValidation(legalEntityId?: string) {
  const [activeFiscalYear, setActiveFiscalYear] = useState<FiscalYear | null>(null);

  // Cargar ejercicio fiscal activo
  const { data: fiscalYears, isLoading } = useQuery({
    queryKey: ['active-fiscal-year', legalEntityId],
    queryFn: async () => {
      if (!legalEntityId) return null;
      
      const response = await fetch(
        `/api/fiscal-years?legalEntityId=${legalEntityId}&status=OPEN`
      );
      if (!response.ok) throw new Error('Error cargando ejercicio fiscal');
      
      const data = await response.json();
      return data as FiscalYear[];
    },
    enabled: !!legalEntityId
  });

  useEffect(() => {
    if (fiscalYears && fiscalYears.length > 0) {
      // Si hay múltiples ejercicios abiertos, tomar el más reciente
      const sorted = [...fiscalYears].sort((a, b) => 
        new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
      );
      setActiveFiscalYear(sorted[0]);
    } else {
      setActiveFiscalYear(null);
    }
  }, [fiscalYears]);

  /**
   * Valida si una fecha está dentro del ejercicio fiscal activo
   */
  const validateDate = (date: Date | string): ValidationResult => {
    if (!legalEntityId) {
      return {
        isValid: true, // Si no hay entidad legal, no aplicar validación
        message: 'Sin entidad legal configurada'
      };
    }

    if (!activeFiscalYear) {
      return {
        isValid: false,
        message: 'No hay ejercicio fiscal activo. Configure uno antes de continuar.'
      };
    }

    const checkDate = typeof date === 'string' ? new Date(date) : date;
    const startDate = new Date(activeFiscalYear.startDate);
    const endDate = new Date(activeFiscalYear.endDate);

    if (checkDate < startDate || checkDate > endDate) {
      return {
        isValid: false,
        message: `La fecha debe estar dentro del ejercicio fiscal ${activeFiscalYear.name} (${
          startDate.toLocaleDateString('es-ES')
        } - ${endDate.toLocaleDateString('es-ES')})`,
        fiscalYear: activeFiscalYear
      };
    }

    return {
      isValid: true,
      fiscalYear: activeFiscalYear
    };
  };

  /**
   * Valida si se puede crear un documento en la fecha actual
   */
  const validateCurrentDate = (): ValidationResult => {
    return validateDate(new Date());
  };

  /**
   * Muestra un toast con el resultado de la validación
   */
  const validateWithToast = (date: Date | string): boolean => {
    const result = validateDate(date);
    
    if (!result.isValid && result.message) {
      toast.error(result.message);
    }
    
    return result.isValid;
  };

  /**
   * Obtiene las fechas límite del ejercicio fiscal activo
   */
  const getFiscalYearBounds = (): { min: string; max: string } | null => {
    if (!activeFiscalYear) return null;

    return {
      min: new Date(activeFiscalYear.startDate).toISOString().split('T')[0],
      max: new Date(activeFiscalYear.endDate).toISOString().split('T')[0]
    };
  };

  return {
    activeFiscalYear,
    isLoading,
    validateDate,
    validateCurrentDate,
    validateWithToast,
    getFiscalYearBounds,
    hasActiveFiscalYear: !!activeFiscalYear
  };
} 