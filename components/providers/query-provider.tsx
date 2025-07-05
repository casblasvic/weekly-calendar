/*
 * 🗄️ Persistencia de Caché — QueryProvider
 * -------------------------------------------------------------
 * Este archivo crea el `QueryClient` y el persister basado en IndexedDB.
 * @see docs/PERSISTENT_CACHE_STRATEGY.md
 * Si modificas TTL, clave de DB o lógica de serialización **actualiza el README**.
 */
"use client";

import React, { useState } from 'react';
import { QueryClient } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
// 🗄️ Persistencia de caché ----------------------------------------------------
// ⚠️ ¡IMPORTANTE! No podemos importar `idb` de forma estática porque en el
// entorno SSR no existe `indexedDB` y `idb` lo referencia en tiempo de carga.
// Haremos un `dynamic import()` dentro del bloque que solo se ejecuta en
// cliente.  De esta forma evitamos el `ReferenceError: indexedDB is not defined`.

interface QueryProviderProps {
  children: React.ReactNode;
}

export function QueryProvider({ children }: QueryProviderProps) {
  // Crear una única instancia de QueryClient
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        retry: (failureCount, error: any) => {
          if (error?.response?.status === 404 || error?.response?.status === 401 || error?.response?.status === 403) {
            return false; // No reintentar en errores de cliente/autorización
          }
          return failureCount < 3; // Hasta 3 reintentos con backoff exponencial
        },
        retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
      },
    },
  }));

  // Crear persister basado en IndexedDB (async) **una sola vez**
  const [persister] = useState(() => {
    // 👉 Si estamos en SSR (no window), devolvemos un persister NOOP
    if (typeof window === 'undefined') {
      return {
        persistClient: async () => {},
        restoreClient: async () => undefined,
        removeClient: async () => {},
      } as const;
    }

    // En cliente creamos el persister real con `idb` vía import dinámico
    let dbPromise: Promise<any> | null = null;

    const getDb = async () => {
      if (!dbPromise) {
        const { openDB } = await import('idb');
        dbPromise = openDB('rq_cache', 1, {
          upgrade(db) {
            if (!db.objectStoreNames.contains('queries')) {
              db.createObjectStore('queries');
            }
          },
        });
      }
      return dbPromise;
    };

    return {
      persistClient: async (client: unknown) => {
        try {
          const db = await getDb();
          await db.put('queries', client, 'react-query');
        } catch (err: any) {
          if (err?.name === 'DataCloneError') {
            console.warn('[QueryProvider] DataCloneError al persistir caché. Se ignorará este ciclo y se volverá a intentar más tarde.', err);
          } else {
            throw err;
          }
        }
      },
      restoreClient: async () => {
        const db = await getDb();
        return db.get('queries', 'react-query');
      },
      removeClient: async () => {
        const db = await getDb();
        await db.delete('queries', 'react-query');
      },
    } as const;
  });

  // PersistQueryClientProvider se encarga de restaurar el caché **antes** de renderizar hijos.
  // De esta forma, evitamos peticiones duplicadas y spinners innecesarios.
  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister,
        maxAge: 1000 * 60 * 60 * 12, // 12 h TTL
        dehydrateOptions: {
          shouldDehydrateQuery: (query) =>
            query.state.status === 'success' && !(query.meta as any)?.noPersist,
        },
      }}
    >
      {children}
    </PersistQueryClientProvider>
  );
} 