// Página para crear una nueva definición de bono
import React from 'react';
import { BonoDefinitionForm } from '@/components/bono/bono-definition-form'; // Ajusta la ruta si es necesario

// Convertir a Server Component para leer searchParams
interface NuevaDefinicionBonoPageProps {
  searchParams?: {
    serviceId?: string;
    productId?: string;
  };
}

const NuevaDefinicionBonoPage = ({ searchParams }: NuevaDefinicionBonoPageProps) => {
  const preselectedServiceId = searchParams?.serviceId;
  const preselectedProductId = searchParams?.productId;

  return (
    <div className="flex-col">
      <div className="flex-1 space-y-4 p-8 pt-6">
        {/* Título */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-3xl font-bold tracking-tight">Crear Nueva Definición de Bono</h2>
        </div>

        {/* Formulario - Pasar los IDs preseleccionados */}
        <BonoDefinitionForm 
          preselectedServiceId={preselectedServiceId}
          preselectedProductId={preselectedProductId}
        />
      </div>
    </div>
  );
};

export default NuevaDefinicionBonoPage; 