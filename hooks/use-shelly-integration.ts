import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';

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
 * Hook para verificar si el módulo Shelly está activo
 */
export function useShellyIntegration() {
  const { data: integrations, isLoading, error } = useQuery<IntegrationsResponse>({
    queryKey: ['integrations'],
    queryFn: async () => {
      const response = await fetch('/api/internal/integrations');
      if (!response.ok) {
        throw new Error('Error al obtener integraciones');
      }
      return response.json();
    },
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    staleTime: 5 * 60 * 1000, // 5 minutos
  });

  const isShellyActive = useMemo(() => {
    if (!integrations) return false;
    
    // Buscar módulo Shelly en todas las categorías
    for (const category of Object.values(integrations)) {
      for (const module of category) {
        if (module.name.toLowerCase().includes('shelly') && module.isActive) {
          return true;
        }
      }
    }
    return false;
  }, [integrations]);

  return {
    isShellyActive,
    isLoading,
    error,
    integrations,
  };
}

/**
 * Hook simplificado que solo retorna el estado activo
 */
export function useIsShellyActive(): boolean {
  const { isShellyActive } = useShellyIntegration();
  return isShellyActive;
} 