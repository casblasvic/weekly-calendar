---
description: Como hemos implementado mejoras de rendimiento 
---

# Estrategia de Optimización con TanStack Query (React Query)

## 1. Situación Actual y Beneficios

Hemos implementado una estrategia de optimización basada en TanStack Query que ha mejorado significativamente el rendimiento de nuestra aplicación. Los principales beneficios son:

- **Velocidad perceptible:** Reducción drástica en tiempos de carga
- **Experiencia fluida:** Eliminación de "esqueletos" de carga recurrentes
- **Reducción de peticiones:** Caché inteligente y revalidación selectiva
- **Estado consistente:** Manejo unificado de estados loading/error/success
- **Mantenibilidad:** Separación clara de responsabilidades datos/UI

## 2. Arquitectura Implementada

### 2.1 Hooks Especializados por Entidad

Cada entidad tiene su propio archivo de hooks en `lib/hooks/`:

```
lib/hooks/
  ├── use-tariff-query.ts
  ├── use-service-query.ts
  ├── use-product-query.ts
  ├── use-bono-query.ts
  ├── use-package-query.ts 
  ├── use-equipment-query.ts
  ├── use-category-query.ts
  ├── use-clinic-query.ts
  └── use-vat-query.ts
```

### 2.2 Configuración Global

Hemos creado una configuración centralizada en `lib/react-query.ts` con:

```typescript
// Configuración optimizada del QueryClient
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        // Solo reintentar para errores de red o 5xx
        const status = error?.response?.status || 0;
        return (status >= 500 || !status) && failureCount < 3;
      },
      staleTime: 1000 * 60, // 1 minuto por defecto
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: false,
    },
  },
});

// Constantes para tiempos de caché según tipo de datos
export const CACHE_TIME = {
  INMEDIATO: 0,             // Sin caché
  MUY_CORTO: 1000 * 30,     // 30 segundos
  CORTO: 1000 * 60 * 2,     // 2 minutos
  MEDIO: 1000 * 60 * 5,     // 5 minutos
  LARGO: 1000 * 60 * 15,    // 15 minutos
  MUY_LARGO: 1000 * 60 * 60, // 1 hora
  ESTATICO: 1000 * 60 * 60 * 24, // 24 horas
};
```

### 2.3 Estructura de los Hooks

Para cada entidad seguimos un patrón consistente:

```typescript
// Consulta de lista completa
export function useXXXsQuery(options?) { ... }

// Consulta de detalle
export function useXXXDetailQuery(id, options?) { ... }

// Consultas específicas
export function useXXXRelatedItemsQuery(id, options?) { ... }

// Mutaciones (crear, actualizar, eliminar)
export function useCreateXXXMutation() { ... }
export function useUpdateXXXMutation() { ... }
export function useDeleteXXXMutation() { ... }
```

### 2.4 Cliente API Centralizado

Usamos `api` de `utils/api-client.ts` para todas las peticiones:

```typescript
// Consultas con caché
return await api.cached.get(`/api/services/${id}`);

// Mutaciones sin caché
return await api.post('/api/services', data);
```

## 3. Guía de Implementación para Nuevos Desarrollos

### 3.1 Crear un Nuevo Hook para una Entidad

1. Crear un archivo en `lib/hooks/use-[entidad]-query.ts`
2. Implementar estructura básica:

```typescript
import { UseQueryOptions, useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { api } from '@/utils/api-client';
import { CACHE_TIME } from '@/lib/react-query';

// Consulta de lista
export function useEntidadsQuery(options?: Omit<UseQueryOptions<any, unknown, any>, 'queryKey' | 'queryFn'>) {
  return useQuery<any, unknown>({
    queryKey: ['entidads'],
    queryFn: async () => {
      return await api.cached.get('/api/entidads');
    },
    staleTime: CACHE_TIME.MEDIO, // Ajustar según frecuencia de cambio
    ...options,
  });
}

// Consulta de detalle
export function useEntidadDetailQuery(id: string | null, options?: Omit<UseQueryOptions<any, unknown, any>, 'queryKey' | 'queryFn'>) {
  return useQuery<any, unknown>({
    queryKey: ['entidad', id],
    queryFn: async () => {
      if (!id) throw new Error('ID is required');
      return await api.cached.get(`/api/entidads/${id}`);
    },
    enabled: !!id,
    staleTime: CACHE_TIME.MEDIO,
    ...options,
  });
}

// Mutación de creación
export function useCreateEntidadMutation() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: any) => {
      return await api.post('/api/entidads', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['entidads'] });
    }
  });
}

// Mutación de actualización
export function useUpdateEntidadMutation() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      return await api.put(`/api/entidads/${id}`, data);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['entidad', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['entidads'] });
    }
  });
}

// Mutación de eliminación
export function useDeleteEntidadMutation() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      return await api.delete(`/api/entidads/${id}`);
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['entidads'] });
      queryClient.invalidateQueries({ queryKey: ['entidad', id] });
    }
  });
}
```

### 3.2 Implementar Actualizaciones Optimistas

Para mutaciones críticas, implementar optimistic updates:

```typescript
export function useDeleteEntidadMutation() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      return await api.delete(`/api/entidads/${id}`);
    },
    
    // Actualización optimista
    onMutate: async (id) => {
      // Cancelar consultas en curso
      await queryClient.cancelQueries({ queryKey: ['entidads'] });
      
      // Guardar estado anterior
      const previousData = queryClient.getQueryData(['entidads']);
      
      // Actualizar caché optimistamente
      queryClient.setQueryData(['entidads'],