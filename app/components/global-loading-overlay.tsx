/*
 * GlobalLoadingOverlay.tsx
 * --------------------------------------------------
 * Muestra un overlay centrado (logo + spinner) cuando:
 *  1. ClinicContext aún no está inicializado (isInitialized === false)
 *  2. Existen queries React-Query con meta.globalLoading === true y estado fetching.
 * 
 * El overlay es transparente a clics cuando está oculto y cubre toda la
 * pantalla cuando visible.  Usa clases Tailwind + Magic-UI spinner.
 */
'use client';

import { useIsFetching } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { useClinic } from '@/contexts/clinic-context';
import { useEffect, useState } from 'react';

export function GlobalLoadingOverlay() {
  const { isInitialized } = useClinic();
  const globalFetching = useIsFetching({
    predicate: (q) => q.meta?.globalLoading === true && q.state.fetchStatus === 'fetching',
  });

  const [initialLoadComplete, setInitialLoadComplete] = useState(false);

  // Marcar cuando la primera carga masiva termina
  useEffect(() => {
    if (!initialLoadComplete && isInitialized && globalFetching === 0) {
      setInitialLoadComplete(true);
    }
  }, [isInitialized, globalFetching, initialLoadComplete]);

  const visible = !initialLoadComplete && (!isInitialized || globalFetching > 0);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[2000] flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm transition-opacity animate-fade-in">
      <img src="/placeholder-logo.svg" alt="logo" className="w-28 h-28 mb-6" />
      <Loader2 className="w-8 h-8 text-purple-600 animate-spin" />
      <p className="mt-2 text-gray-700 text-sm">Cargando datos…</p>
    </div>
  );
} 