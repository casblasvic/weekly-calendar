import { prisma } from '@/lib/db';
import { getServerAuthSession } from '@/lib/auth';
import { BonoDefinitionList } from '@/components/bono/bono-definition-list'; // Ajusta la ruta si es necesario
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { notFound } from 'next/navigation'; // Importar notFound
import { Prisma } from '@prisma/client'; // Importar Prisma

interface ProductBonosPageProps {
  params: {
    id: string; // productId
  };
}

// Define el tipo para bonos con relaciones necesarias para BonoDefinitionList
type BonoDefinitionWithRelationsForList = Prisma.BonoDefinitionGetPayload<{
  include: {
    service: { select: { id: true, name: true } };
    product: { select: { id: true, name: true } };
    vatType: { select: { id: true, name: true, rate: true } };
  };
}>;

export default async function ProductBonosPage({ params }: ProductBonosPageProps) {
  const productId = params.id;
  const session = await getServerAuthSession();
  const systemId = session?.user?.systemId;

  if (!systemId) {
     // Puedes redirigir a login o mostrar un error más explícito
     return (
        <div className="p-6 text-red-600">
            Acceso no autorizado. Debes iniciar sesión.
        </div>
     );
  }

  // 1. Fetch Product details para mostrar nombre y verificar existencia/pertenencia
  const product = await prisma.product.findUnique({
    where: { 
        id: productId, 
        systemId: systemId // Asegura que el producto pertenece al sistema del usuario
    },
    select: { name: true }
  });

  if (!product) {
     notFound(); // Producto no encontrado o no pertenece al usuario
  }

  // 2. Fetch BonoDefinitions asociadas a este producto y sistema
  let bonos: BonoDefinitionWithRelationsForList[] = [];
  try {
      bonos = await prisma.bonoDefinition.findMany({
        where: {
          productId: productId,
          systemId: systemId, // Filtrar por systemId aquí también
        },
        orderBy: { name: 'asc' },
        include: {
          // Incluir relaciones que BonoDefinitionList espera
          service: { select: { id: true, name: true } }, // Incluir aunque sea null para consistencia del tipo
          product: { select: { id: true, name: true } },
          vatType: { select: { id: true, name: true, rate: true } },
        },
      });
  } catch (error) {
      console.error("Error fetching bono definitions for product:", error);
      // Podrías mostrar un mensaje de error en la UI
  }


  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-4">
      <div className="flex justify-between items-center flex-wrap gap-2">
         <h1 className="text-2xl font-semibold break-words">
           Bonos para Producto: {product.name}
         </h1>
         <Button asChild>
           {/* Enlace al formulario de nuevo bono, pasando el productId */}
           <Link href={`/configuracion/bonos/nuevo?productId=${productId}`}>
             <Plus className="mr-2 h-4 w-4" /> Nuevo Bono
           </Link>
         </Button>
      </div>

      {/* Pasar los bonos obtenidos (puede ser un array vacío) a la lista */}
      <BonoDefinitionList bonos={bonos} />

      {/* Botón adicional para volver a la lista general de productos o al producto */}
      <div className="mt-4">
         <Button variant="outline" asChild>
            <Link href={`/configuracion/productos/${productId}`}>Volver al Producto</Link>
         </Button>
      </div>
    </div>
  );
} 