import { useQuery } from '@tanstack/react-query';
import { api } from '@/utils/api-client';

interface Service {
  id: string;
  name: string;
  description?: string;
  price: number;
  duration: number;
  category?: {
    id: string;
    name: string;
  };
  vatType?: {
    id: string;
    rate: number;
  };
  tariffPrice?: {
    price: number;
    isActive: boolean;
  };
}

interface BonoDefinition {
  id: string;
  name: string;
  description?: string;
  price: number;
  totalSessions: number;
  category?: {
    id: string;
    name: string;
  };
  vatType?: {
    id: string;
    rate: number;
  };
  tariffPrice?: {
    price: number;
    isActive: boolean;
  };
}

interface PackageDefinition {
  id: string;
  name: string;
  description?: string;
  price: number;
  items: any[];
  category?: {
    id: string;
    name: string;
  };
  tariffPrice?: {
    price: number;
    isActive: boolean;
  };
}

/**
 * Hook para obtener servicios de una tarifa específica
 * Solo devuelve servicios que tienen precios activos en esa tarifa
 */
export function useTariffServicesQuery(tariffId: string | null | undefined) {
  return useQuery<Service[]>({
    queryKey: ['tariff-services', tariffId],
    queryFn: async () => {
      if (!tariffId) return [];
      const response = await api.cached.get<Service[]>(`/api/tariffs/${tariffId}/services`);
      return response || [];
    },
    enabled: !!tariffId,
    staleTime: 1000 * 60 * 5, // 5 minutos
    gcTime: 1000 * 60 * 10, // 10 minutos
  });
}

/**
 * Hook para obtener bonos de una tarifa específica
 * Solo devuelve bonos que tienen precios activos en esa tarifa
 */
export function useTariffBonosQuery(tariffId: string | null | undefined) {
  return useQuery<BonoDefinition[]>({
    queryKey: ['tariff-bonos', tariffId],
    queryFn: async () => {
      if (!tariffId) return [];
      const response = await api.cached.get<BonoDefinition[]>(`/api/tariffs/${tariffId}/bonos`);
      return response || [];
    },
    enabled: !!tariffId,
    staleTime: 1000 * 60 * 5, // 5 minutos
    gcTime: 1000 * 60 * 10, // 10 minutos
  });
}

/**
 * Hook para obtener paquetes de una tarifa específica
 * Solo devuelve paquetes que tienen precios activos en esa tarifa
 */
export function useTariffPackagesQuery(tariffId: string | null | undefined) {
  return useQuery<PackageDefinition[]>({
    queryKey: ['tariff-packages', tariffId],
    queryFn: async () => {
      if (!tariffId) return [];
      const response = await api.cached.get<PackageDefinition[]>(`/api/tariffs/${tariffId}/packages`);
      return response || [];
    },
    enabled: !!tariffId,
    staleTime: 1000 * 60 * 5, // 5 minutos
    gcTime: 1000 * 60 * 10, // 10 minutos
  });
}
