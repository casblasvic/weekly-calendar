// Página para editar una definición de bono existente
import React from 'react';
import { BonoDefinitionForm } from '@/components/bono/bono-definition-form';
import { prisma } from '@/lib/db';
import { getServerAuthSession } from '@/lib/auth';
import { notFound } from 'next/navigation';
import type { BonoDefinitionWithRelations } from '../page'; // Importar tipo extendido

interface EditarDefinicionBonoPageProps {
  params: Promise<{
    id: string;
  }>;
}

// Función para obtener datos del bono en el servidor
async function getBonoDefinition(id: string, systemId: string): Promise<BonoDefinitionWithRelations | null> {
  try {
    const bonoDefinition = await prisma.bonoDefinition.findUnique({
      where: { id, systemId },
      include: {
        service: { select: { id: true, name: true } },
        product: { select: { id: true, name: true } },
        vatType: { select: { id: true, name: true, rate: true } },
        settings: {
          select: { 
            isActive: true,
            validityDays: true,
            pointsAwarded: true,
            costPrice: true,
            commissionType: true,
            commissionValue: true,
            appearsInApp: true,
            autoAddToInvoice: true
          }
        },
      },
    });
    return bonoDefinition as BonoDefinitionWithRelations;
  } catch (error) {
    console.error("[EDIT_BONO_PAGE] Error fetching data:", error);
    return null;
  }
}

// Componente de Página (Server Component para obtener datos)
const EditarDefinicionBonoPage = async ({ params: paramsPromise }: EditarDefinicionBonoPageProps) => {
  // Esperar la promesa params primero
  const params = await paramsPromise;
  const bonoId = params.id;

  const session = await getServerAuthSession();
  const systemId = session?.user?.systemId;

  let initialData: BonoDefinitionWithRelations | null = null;

  if (!systemId) {
    console.warn("[EDIT_BONO_PAGE] No systemId found in session.");
    // Podríamos devolver un error aquí o dejar que continúe y falle en notFound si initialData es null
    // return <div>Error: No autorizado o ID de sistema no encontrado.</div>;
  } else {
    initialData = await getBonoDefinition(bonoId, systemId);
  }

  if (!initialData) {
    notFound(); // Mostrar página 404 si el bono no existe, no pertenece al sistema, o no hubo systemId
  }

  return (
    <div className="flex-col">
      <div className="flex-1 p-8 pt-6 space-y-4">
        {/* Título */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-3xl font-bold tracking-tight">Editar Definición de Bono</h2>
        </div>

        {/* Formulario con datos iniciales */}
        <BonoDefinitionForm initialData={initialData} />
      </div>
    </div>
  );
};

export default EditarDefinicionBonoPage; 