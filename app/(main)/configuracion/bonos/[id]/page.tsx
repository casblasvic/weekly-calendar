// Página para editar una definición de bono existente
import React from 'react';
import { BonoDefinitionForm } from '@/components/bono/bono-definition-form';
import { prisma } from '@/lib/db';
import { getServerAuthSession } from '@/lib/auth';
import { notFound } from 'next/navigation';
import type { BonoDefinitionWithRelations } from '../page'; // Importar tipo extendido
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb"

interface EditarDefinicionBonoPageProps {
  params: {
    id: string;
  };
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
      },
    });
    return bonoDefinition;
  } catch (error) {
    console.error("[EDIT_BONO_PAGE] Error fetching data:", error);
    return null;
  }
}

// Componente de Página (Server Component para obtener datos)
const EditarDefinicionBonoPage = async ({ params }: EditarDefinicionBonoPageProps) => {
  const { id } = params;
  const session = await getServerAuthSession();
  const systemId = session?.user?.systemId;

  if (!systemId) {
    // Redirigir o manejar error si no hay sesión/systemId
    // notFound(); // Podría ser una opción
    console.warn("[EDIT_BONO_PAGE] No systemId found in session.");
    // Devolver null o un componente de error
    return <div>Error: No autorizado o ID de sistema no encontrado.</div>;
  }

  const initialData = await getBonoDefinition(id, systemId);

  if (!initialData) {
    notFound(); // Mostrar página 404 si el bono no existe o no pertenece al sistema
  }

  return (
    <div className="flex-col">
      <div className="flex-1 p-8 pt-6 space-y-4">
        {/* Breadcrumbs */}
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink href="/configuracion/bonos">Bonos</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Editar Bono</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

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