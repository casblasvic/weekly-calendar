"use client";

import React, { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useClinic } from "@/contexts/clinic-context";
import { LoadingSpinner } from "@/components/loading-spinner";

// Esta página crea un ticket en blanco y redirige a la ruta de edición para reutilizar
// TODO: en el futuro se podría refactorizar a un componente compartido.
export default function NuevoTicketPage() {
  const router = useRouter();
  const { activeClinic } = useClinic();
  const hasRequestedRef = useRef(false);

  useEffect(() => {
    if (!activeClinic?.id) return;

    // Evitar múltiples redirecciones en StrictMode
    if (hasRequestedRef.current) return;
    hasRequestedRef.current = true;

    router.replace(`/facturacion/tickets/editar/new?from=${encodeURIComponent('/facturacion/tickets')}`);
  }, [activeClinic, router]);

  return (
    <div className="flex w-full h-full items-center justify-center p-10">
      <LoadingSpinner size="lg" />
    </div>
  );
}
// Archivo simplificado: fin