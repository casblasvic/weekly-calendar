import React from 'react';
import Link from 'next/link';
import { prisma } from '@/lib/db';
import { getServerAuthSession } from '@/lib/auth';
import { notFound } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { BonoDefinitionList } from '@/components/bono/bono-definition-list';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import type { BonoDefinitionWithRelations } from '@/app/(main)/configuracion/bonos/page'; // Importar tipo extendido si BonoList lo usa

interface ServiceBonosPageProps {
  params: {
    id: string; // ID del servicio
  };
}

// Función para obtener los datos necesarios en el servidor
async function getData(serviceId: string, systemId: string) {
  try {
    // Obtener detalles del servicio para el título/breadcrumbs
    const service = await prisma.service.findUnique({
      where: { id: serviceId, systemId },
      select: { id: true, name: true },
    });

    if (!service) {
      return { service: null, bonos: [] };
    }

    // Obtener las definiciones de bonos filtradas para este servicio
    const bonos = await prisma.bonoDefinition.findMany({
      where: {
        systemId,
        serviceId: serviceId, // Filtrar por el ID del servicio
      },
      orderBy: { name: 'asc' },
      // Incluir relaciones si BonoList las necesita (ajustar según BonoList)
      include: {
        service: { select: { id: true, name: true } },
        product: { select: { id: true, name: true } },
        vatType: { select: { id: true, name: true, rate: true } },
        settings: { // <<< AÑADIDO
            select: {
                isActive: true,
                validityDays: true,
                pointsAwarded: true,
            }
        },
        tariffPrices: { // <<< AÑADIDO
           select: {
                // price: true, // Descomentar si el precio de la tarifa es necesario aquí
                tariff: {
                    select: {
                        id: true,
                        name: true,
                    }
                }
            }
        },
      },
    });

    // Asegurarse de que los datos coincidan con BonoDefinitionWithRelations si es necesario
    const bonosTyped: BonoDefinitionWithRelations[] = bonos.map(bono => ({
        ...bono,
        // Asegura que las relaciones opcionales sean null si no existen
        service: bono.service ?? null, 
        product: bono.product ?? null,
        vatType: bono.vatType ?? null,
        settings: bono.settings ?? null, // <<< AÑADIDO (o manejar si es null y el tipo no lo permite)
        tariffPrices: bono.tariffPrices || [], // <<< AÑADIDO (o manejar si es undefined y el tipo no lo permite)
    }));


    return { service, bonos: bonosTyped };

  } catch (error) {
    console.error("[SERVICE_BONOS_PAGE] Error fetching data:", error);
    // Podrías lanzar el error o devolver datos vacíos/nulos
    return { service: null, bonos: [] };
  }
}

// Componente de Página (Server Component)
const ServiceBonosPage = async ({ params }: ServiceBonosPageProps) => {
  const serviceId = params.id;
  const session = await getServerAuthSession();
  const systemId = session?.user?.systemId;

  if (!systemId) {
    // Manejar caso sin sesión/systemId
    // Podría redirigir o mostrar un error específico
    return <div className="p-8">Error: No autorizado o ID de sistema no encontrado.</div>;
  }

  const { service, bonos } = await getData(serviceId, systemId);

  if (!service) {
    notFound(); // Mostrar 404 si el servicio no existe o no pertenece al sistema
  }

  return (
    <div className="flex-col">
      <div className="flex-1 space-y-4 p-8 pt-6">
        {/* Breadcrumbs */}
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink href="/configuracion">Configuración</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink href="/configuracion/servicios">Servicios</BreadcrumbLink>
            </BreadcrumbItem>
             <BreadcrumbSeparator />
             <BreadcrumbItem>
               {/* Enlace a la página de edición del servicio */}
              <BreadcrumbLink href={`/configuracion/servicios/${service.id}`}>{service.name}</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Bonos Asociados</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        {/* Cabecera con Título y Botón Crear */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-3xl font-bold tracking-tight">Bonos para {service.name}</h2>
          <Button asChild>
             {/* Enlace a la página de creación global, pasando el serviceId */}
            <Link href={`/configuracion/bonos/nuevo?serviceId=${service.id}`}>
              <PlusCircle className="mr-2 h-4 w-4" /> Crear Nuevo Bono
            </Link>
          </Button>
        </div>

        {/* Lista de Bonos Filtrada */}
        {/* Usar el nuevo componente y pasar la prop 'bonos' */}
        <BonoDefinitionList bonos={bonos} />

        {/* Botón para Volver al Servicio */}
        <div className="mt-6 flex justify-start"> {/* Añadir margen superior y alinear a la izquierda */} 
          <Button variant="outline" asChild>
            <Link href={`/configuracion/servicios/${serviceId}`}>Volver al Servicio</Link>
          </Button>
        </div>

      </div>
    </div>
  );
};

export default ServiceBonosPage; 