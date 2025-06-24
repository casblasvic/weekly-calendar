"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useClinic } from "@/contexts/clinic-context";
import { Loader2 } from "lucide-react";

// Esta página crea un ticket en blanco y redirige a la ruta de edición para reutilizar
// TODO: en el futuro se podría refactorizar a un componente compartido.
export default function NuevoTicketPage() {
  const router = useRouter();
  const { activeClinic, isInitialized } = useClinic();

  // ✅ ESPERAR A QUE LA INICIALIZACIÓN ESTÉ COMPLETA
  if (!isInitialized) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 text-purple-600 animate-spin" />
          <span className="ml-2">Inicializando clínicas...</span>
        </div>
      </div>
    );
  }

  // ✅ VERIFICAR CLÍNICA ACTIVA DESPUÉS DE LA INICIALIZACIÓN Y REDIRIGIR
  useEffect(() => {
    if (!activeClinic?.id) {
      // Redirigir a la lista de tickets con un mensaje
      router.push('/facturacion/tickets?error=no-clinic');
      return;
    }

    // Redirigir a la página de edición de tickets con modo creación
    router.push(`/facturacion/tickets/editar/nuevo?clinicId=${activeClinic.id}`);
  }, [activeClinic, router]);

  // Mostrar loading mientras se procesa la redirección
  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-purple-600 animate-spin" />
        <span className="ml-2">Preparando nuevo ticket...</span>
      </div>
    </div>
  );
}
// Archivo simplificado: fin