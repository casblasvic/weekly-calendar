import { useIntegrationModules } from './use-integration-modules';

/**
 * Hook para verificar si el módulo Shelly está activo
 * @deprecated - Usar useIntegrationModules directamente para mayor funcionalidad
 */
export function useShellyIntegration() {
  const { 
    isShellyActive, 
    isLoading, 
    error, 
    integrations 
  } = useIntegrationModules();

  return {
    isShellyActive,
    isLoading,
    error,
    integrations,
  };
}

/**
 * Hook simplificado que solo retorna el estado activo del módulo Shelly
 * Ahora usa el nuevo sistema de integrations modules
 */
export function useIsShellyActive(): boolean {
  const { isShellyActive } = useIntegrationModules();
  return isShellyActive;
} 