import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

interface IntegrationModule {
  id: string;
  name: string;
  description: string;
  logoUrl: string | null;
  category: string;
  isPaid: boolean;
  isActive: boolean;
}

interface IntegrationsResponse {
  [category: string]: IntegrationModule[];
}

/**
 * Hook para verificar el estado de módulos de integración
 */
export function useIntegrationModules() {
  // Usamos systemId para no mezclar datos entre sistemas distintos
  const systemId = (typeof window !== 'undefined') ? localStorage.getItem('systemId') ?? undefined : undefined;

  const { data: integrations, isLoading, error } = useQuery<IntegrationsResponse>({
    queryKey: ['integrations', systemId],
    queryFn: async () => {
      const response = await fetch('/api/internal/integrations');
      if (!response.ok) {
        throw new Error('Error al obtener integraciones');
      }
      return response.json();
    },
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    staleTime: 1000 * 60 * 15, // 15 min como otras entidades estáticas
    refetchInterval: false, // sin polling
  });

  const moduleCheckers = useMemo(() => {
    if (!integrations) return {
      isShellyActive: false,
      hasActiveIoTModules: false,
      isModuleActive: () => false,
      hasActiveCategoryModules: () => false,
      getActiveModulesInCategory: () => [],
    };

    // Función para verificar si un módulo específico está activo
    const isModuleActive = (moduleNamePattern: string): boolean => {
      for (const category of Object.values(integrations)) {
        for (const module of category) {
          if (module.name.toLowerCase().includes(moduleNamePattern.toLowerCase()) && module.isActive) {
            return true;
          }
        }
      }
      return false;
    };

    // Función para verificar si hay módulos activos en una categoría específica
    const hasActiveCategoryModules = (categoryName: string): boolean => {
      const category = integrations[categoryName];
      if (!category) return false;
      
      return category.some(module => module.isActive);
    };

    // Función para obtener módulos activos en una categoría específica
    const getActiveModulesInCategory = (categoryName: string): IntegrationModule[] => {
      const category = integrations[categoryName];
      if (!category) return [];
      
      return category.filter(module => module.isActive);
    };

    // Verificadores específicos
    const isShellyActive = isModuleActive('shelly');
    const hasActiveIoTModules = hasActiveCategoryModules('IOT_DEVICES');

    return {
      isShellyActive,
      hasActiveIoTModules,
      isModuleActive,
      hasActiveCategoryModules,
      getActiveModulesInCategory,
    };
  }, [integrations]);

  return {
    ...moduleCheckers,
    isLoading,
    error,
    integrations,
  };
} 