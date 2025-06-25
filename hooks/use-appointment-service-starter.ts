import { useState, useCallback } from 'react';
import { toast } from 'sonner';

export interface ServiceStartResult {
  success: boolean;
  message: string;
  data?: {
    deviceUsage?: {
      id: string;
      startedAt: string;
      estimatedMinutes: number;
      equipment?: {
        id: string;
        name: string;
      };
    };
    startedAt?: string;
    requiresEquipment?: boolean;
  };
  requiresSelection?: boolean;
  availableEquipment?: Array<{
    id: string;
    name: string;
    description?: string;
    hasDevice: boolean;
    deviceStatus?: string | null;
    location?: string;
  }>;
}

export interface StartServiceParams {
  appointmentId: string;
  serviceId: string;
  equipmentId?: string;
}

export interface UseAppointmentServiceStarterReturn {
  startService: (params: StartServiceParams) => Promise<ServiceStartResult>;
  isLoading: boolean;
  error: string | null;
  clearError: () => void;
}

/**
 * Hook personalizado para manejar el inicio de servicios de citas
 */
export function useAppointmentServiceStarter(): UseAppointmentServiceStarterReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const startService = useCallback(async (params: StartServiceParams): Promise<ServiceStartResult> => {
    const { appointmentId, serviceId, equipmentId } = params;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/appointments/${appointmentId}/start-service`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          serviceId,
          equipmentId,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        const errorMessage = result.error || `Error HTTP ${response.status}`;
        setError(errorMessage);
        toast.error(`Error al iniciar servicio: ${errorMessage}`);
        
        return {
          success: false,
          message: errorMessage,
        };
      }

      // Manejar respuesta exitosa o que requiere selección
      if (result.success) {
        toast.success(result.message || 'Servicio iniciado correctamente');
      } else if (result.requiresSelection) {
        // No mostrar toast para selección requerida, 
        // el componente manejará la UI
        console.log('Selección de equipo requerida:', result.availableEquipment);
      }

      return result;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error de conexión';
      setError(errorMessage);
      toast.error(`Error al iniciar servicio: ${errorMessage}`);
      
      return {
        success: false,
        message: errorMessage,
      };
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    startService,
    isLoading,
    error,
    clearError,
  };
}

/**
 * Hook específico para iniciar un servicio con notificaciones automáticas
 */
export function useStartServiceWithToast() {
  const { startService, isLoading, error, clearError } = useAppointmentServiceStarter();

  const startServiceWithToast = useCallback(async (
    params: StartServiceParams,
    options: {
      onSuccess?: (result: ServiceStartResult) => void;
      onRequiresSelection?: (equipment: Array<{
        id: string;
        name: string;
        description?: string;
        hasDevice: boolean;
        deviceStatus?: string | null;
        location?: string;
      }>) => void;
      onError?: (error: string) => void;
      successMessage?: string;
      loadingMessage?: string;
    } = {}
  ) => {
    const {
      onSuccess,
      onRequiresSelection,
      onError,
      successMessage = 'Servicio iniciado correctamente',
      loadingMessage = 'Iniciando servicio...'
    } = options;

    // Mostrar toast de carga
    const loadingToastId = toast.loading(loadingMessage);

    try {
      const result = await startService(params);

      // Cerrar toast de carga
      toast.dismiss(loadingToastId);

      if (result.success) {
        toast.success(successMessage);
        onSuccess?.(result);
      } else if (result.requiresSelection && result.availableEquipment) {
        // No mostrar error toast para selección requerida
        onRequiresSelection?.(result.availableEquipment);
      } else {
        toast.error(result.message || 'Error desconocido');
        onError?.(result.message);
      }

      return result;

    } catch (error) {
      toast.dismiss(loadingToastId);
      const errorMessage = error instanceof Error ? error.message : 'Error de conexión';
      toast.error(`Error: ${errorMessage}`);
      onError?.(errorMessage);
      
      return {
        success: false,
        message: errorMessage,
      };
    }
  }, [startService]);

  return {
    startServiceWithToast,
    isLoading,
    error,
    clearError,
  };
}

/**
 * Hook para manejar el flujo completo con selección de equipo
 */
export function useServiceStartFlow() {
  const [showEquipmentSelection, setShowEquipmentSelection] = useState(false);
  const [availableEquipment, setAvailableEquipment] = useState<Array<{
    id: string;
    name: string;
    description?: string;
    hasDevice: boolean;
    deviceStatus?: string | null;
    location?: string;
  }>>([]);
  const [pendingServiceParams, setPendingServiceParams] = useState<StartServiceParams | null>(null);

  const { startService, isLoading, error, clearError } = useAppointmentServiceStarter();

  const initiateServiceStart = useCallback(async (params: StartServiceParams) => {
    clearError();
    
    const result = await startService(params);

    if (result.success) {
      // Servicio iniciado exitosamente
      return result;
    } else if (result.requiresSelection && result.availableEquipment) {
      // Mostrar modal de selección de equipo
      setAvailableEquipment(result.availableEquipment);
      setPendingServiceParams(params);
      setShowEquipmentSelection(true);
      return result;
    }

    // Error en el inicio
    return result;
  }, [startService, clearError]);

  const selectEquipmentAndStart = useCallback(async (equipmentId: string) => {
    if (!pendingServiceParams) {
      toast.error('No hay parámetros de servicio pendientes');
      return { success: false, message: 'No hay parámetros pendientes' };
    }

    const params = {
      ...pendingServiceParams,
      equipmentId,
    };

    const result = await startService(params);

    if (result.success) {
      // Cerrar modal y limpiar estado
      setShowEquipmentSelection(false);
      setAvailableEquipment([]);
      setPendingServiceParams(null);
      toast.success('Servicio iniciado correctamente');
    }

    return result;
  }, [pendingServiceParams, startService]);

  const cancelEquipmentSelection = useCallback(() => {
    setShowEquipmentSelection(false);
    setAvailableEquipment([]);
    setPendingServiceParams(null);
    clearError();
  }, [clearError]);

  return {
    initiateServiceStart,
    selectEquipmentAndStart,
    cancelEquipmentSelection,
    showEquipmentSelection,
    availableEquipment,
    isLoading,
    error,
    clearError,
  };
} 