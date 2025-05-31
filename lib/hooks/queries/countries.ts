import { useQuery } from '@tanstack/react-query';
import apiClient from '@/lib/axios';

// Tipo para los datos de país que necesitamos
export interface CountryForSelector {
  isoCode: string;
  name: string;
  phoneCode: string;
  currencyCode?: string | null; // Opcional, por si se necesita más adelante
  currencyName?: string | null;
  currencySymbol?: string | null;
}

// Claves de consulta para países
export const countryKeys = {
  all: ['countries'] as const,
  list: () => [...countryKeys.all, 'list'] as const,
};

// Hook para obtener la lista de países
export function useGetCountriesQuery() {
  return useQuery<
    CountryForSelector[], // Tipo de dato que devuelve la consulta
    Error // Tipo de error
  >({
    queryKey: countryKeys.list(),
    queryFn: async (): Promise<CountryForSelector[]> => {
      return apiClient.get<CountryForSelector[]>('/api/countries');
    },
    // Opciones adicionales de React Query si son necesarias:
    // staleTime: 5 * 60 * 1000, // 5 minutos
    // cacheTime: 10 * 60 * 1000, // 10 minutos
    // refetchOnWindowFocus: false,
  });
}
