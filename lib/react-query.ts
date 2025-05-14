import { QueryClient } from '@tanstack/react-query';

/**
 * Configuración global del QueryClient con opciones por defecto optimizadas.
 * Esta configuración aplica a todas las queries a menos que se sobrescriban localmente.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // No reintenta automáticamente en caso de error (excepto en errores de red)
      retry: (failureCount, error: any) => {
        // Solo reintentar para errores de red o 5xx (servidor)
        const status = error?.response?.status || 0;
        const isNetworkError = !status;
        const isServerError = status >= 500 && status < 600;
        
        return (isNetworkError || isServerError) && failureCount < 3;
      },
      // 1 minuto por defecto - para datos que cambian con frecuencia media
      staleTime: 1000 * 60 * 1,
      // No revalidar la ventana cuando recupera el foco por defecto
      refetchOnWindowFocus: false,
      // Revalida al recuperar conexión 
      refetchOnReconnect: true,
      // Los manejadores de error deben configurarse individualmente en cada consulta
    },
    mutations: {
      // No reintenta automáticamente las mutaciones fallidas
      retry: false,
      // Los manejadores de error deben configurarse individualmente en cada mutación
    },
  },
});

/**
 * Constantes para tiempos de caché según tipo de datos
 */
export const CACHE_TIME = {
  INMEDIATO: 0, // No cachear (siempre revalidar)
  MUY_CORTO: 1000 * 30, // 30 segundos (datos que cambian constantemente)
  CORTO: 1000 * 60 * 2, // 2 minutos (datos que cambian frecuentemente)
  MEDIO: 1000 * 60 * 5, // 5 minutos (datos que cambian ocasionalmente)
  LARGO: 1000 * 60 * 15, // 15 minutos (datos semi-estáticos)
  MUY_LARGO: 1000 * 60 * 60, // 1 hora (datos que raramente cambian)
  ESTATICO: 1000 * 60 * 60 * 24, // 24 horas (datos de referencia/catálogo)
}; 