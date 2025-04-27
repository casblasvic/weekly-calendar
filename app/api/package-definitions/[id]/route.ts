import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { getServerAuthSession } from '@/lib/auth';
import { Prisma } from '@prisma/client';

// Esquema para validar el ID en los parámetros
const ParamsSchema = z.object({
  id: z.string().cuid({ message: "ID de paquete inválido." }),
});

// Reutilizar el schema de Item que definimos en la ruta base
const PackageItemSchema = z.object({
  itemType: z.enum(['SERVICE', 'PRODUCT']),
  itemId: z.string().cuid({ message: "ID de item inválido." }),
  quantity: z.number().positive({ message: 'La cantidad debe ser positiva.' }),
  price: z.coerce.number().min(0, "El precio no puede ser negativo.").optional(),
}).refine(data => (data.itemType === 'SERVICE' || data.itemType === 'PRODUCT'), {
  message: 'Tipo de item inválido o falta ID.',
  path: ['itemType', 'itemId'],
});


// Esquema para validar la actualización de PackageDefinition
const UpdatePackageDefinitionSchema = z.object({
  name: z.string().min(1, { message: 'El nombre es obligatorio.' }).optional(),
  description: z.string().optional().nullable(),
  price: z.number().nonnegative({ message: 'El precio no puede ser negativo.' }).optional(),
  isActive: z.boolean().optional(),
  pointsAwarded: z.number().int().nonnegative().optional(),
  // Items: Enviar la lista COMPLETA de items deseados para el paquete
  items: z.array(PackageItemSchema).min(1, { message: 'El paquete debe contener al menos un item.' }).optional(),
});


// Función auxiliar para extraer ID de la URL (Podría refactorizarse a un helper)
function extractIdFromUrl(url: string): string | null {
    try {
        const pathname = new URL(url).pathname;
        const segments = pathname.split('/').filter(Boolean);
        // Asumiendo /api/package-definitions/[id]
        if (segments.length >= 3 && segments[0] === 'api' && segments[1] === 'package-definitions') {
            return segments[2];
        }
        return null;
    } catch (error) {
        console.error("Error extracting ID from URL:", error);
        return null;
    }
}

// --- Handler GET para Obtener PackageDefinition por ID ---
export async function GET(request: Request) {
  const session = await getServerAuthSession();
   if (!session?.user?.systemId) {
       return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
   }
   // const systemId = session.user.systemId; // No necesitamos systemId para buscar por ID único global

  const id = extractIdFromUrl(request.url);
  if (!id) {
      return NextResponse.json({ error: 'No se pudo extraer el ID de la URL.' }, { status: 400 });
  }

  const paramsValidation = ParamsSchema.safeParse({ id });
  if (!paramsValidation.success) {
    return NextResponse.json({ error: 'ID inválido.', details: paramsValidation.error.flatten() }, { status: 400 });
  }
  const { id: packageDefinitionId } = paramsValidation.data;

  try {
    const packageDefinition = await prisma.packageDefinition.findUnique({
      where: { id: packageDefinitionId },
      include: {
        items: { // Incluir siempre los items y sus detalles
            include: {
                service: true,
                product: true
            },
            orderBy: { // Opcional: ordenar items
               createdAt: 'asc'
            }
        }
        // Podríamos incluir tariffPrices si fuera necesario aquí
        // tariffPrices: { include: { tariff: true } }
      },
    });

    if (!packageDefinition) {
      return NextResponse.json({ message: `Paquete ${packageDefinitionId} no encontrado.` }, { status: 404 });
    }

    // Validar si el paquete pertenece al systemId del usuario (si aplica la lógica multi-tenant aquí)
     if (packageDefinition.systemId !== session.user.systemId) {
         return NextResponse.json({ error: 'Acceso denegado al paquete.' }, { status: 403 });
     }

    return NextResponse.json(packageDefinition);

  } catch (error) {
    console.error(`Error fetching package definition ${packageDefinitionId}:`, error);
    return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 });
  }
}

// --- Handler PUT para Actualizar PackageDefinition ---
export async function PUT(request: Request) {
  const session = await getServerAuthSession();
   if (!session?.user?.systemId) {
       return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
   }
   const systemId = session.user.systemId; // Necesario para verificar pertenencia

  const id = extractIdFromUrl(request.url);
  if (!id) {
      return NextResponse.json({ error: 'No se pudo extraer el ID de la URL.' }, { status: 400 });
  }

  const paramsValidation = ParamsSchema.safeParse({ id });
  if (!paramsValidation.success) {
    return NextResponse.json({ error: 'ID inválido.', details: paramsValidation.error.flatten() }, { status: 400 });
  }
  const { id: packageDefinitionId } = paramsValidation.data;

  let body;
  try {
      body = await request.json();
  } catch (error) {
      return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
  }

  const validation = UpdatePackageDefinitionSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json({ error: 'Datos inválidos.', details: validation.error.format() }, { status: 400 });
  }

  const { items, ...packageUpdateData } = validation.data;

   if (Object.keys(packageUpdateData).length === 0 && items === undefined) {
       return NextResponse.json({ error: 'No se proporcionaron datos para actualizar.' }, { status: 400 });
   }

  try {
      const updatedPackageDefinition = await prisma.$transaction(async (tx) => {
          // 1. Verificar que el paquete existe y pertenece al sistema del usuario
          const existingPackage = await tx.packageDefinition.findUnique({
              where: { id: packageDefinitionId },
          });
          if (!existingPackage) {
              throw new Prisma.PrismaClientKnownRequestError(`Paquete ${packageDefinitionId} no encontrado.`, { code: 'P2025', clientVersion: '' });
          }
          if (existingPackage.systemId !== systemId) {
               throw new Error('Forbidden'); // Lanzar error para capturar abajo
          }

          // 2. Actualizar datos básicos del paquete (si se proporcionaron)
          if (Object.keys(packageUpdateData).length > 0) {
              await tx.packageDefinition.update({
                  where: { id: packageDefinitionId },
                  data: packageUpdateData,
              });
          }

          // 3. Actualizar items (si se proporcionó la lista de items)
          if (items !== undefined) {
              // Borrar items existentes
              await tx.packageItem.deleteMany({
                  where: { packageDefinitionId: packageDefinitionId },
              });

              // Crear los nuevos items
              const itemsToCreate = items.map(item => ({
                  packageDefinitionId: packageDefinitionId,
                  itemType: item.itemType,
                  serviceId: item.itemType === 'SERVICE' ? item.itemId : null,
                  productId: item.itemType === 'PRODUCT' ? item.itemId : null,
                  quantity: item.quantity,
                  price: item.price,
              }));

              await tx.packageItem.createMany({
                  data: itemsToCreate,
              });
          }

          // 4. Devolver el paquete actualizado con sus items finales
          return tx.packageDefinition.findUniqueOrThrow({
              where: { id: packageDefinitionId },
              include: {
                  items: {
                      include: { 
                          service: { select: { id: true, name: true, price: true } }, 
                          product: { select: { id: true, name: true, price: true } }
                      },
                       orderBy: { createdAt: 'asc' }
                  }
              },
          });
      });

      return NextResponse.json(updatedPackageDefinition);

  } catch (error) {
       console.error(`Error updating package definition ${packageDefinitionId}:`, error);
       if (error instanceof Prisma.PrismaClientKnownRequestError) {
           if (error.code === 'P2025') { // No encontrado (lanzado desde nuestra verificación)
               return NextResponse.json({ error: `Paquete ${packageDefinitionId} no encontrado o referencia inválida.` }, { status: 404 });
           }
           if (error.code === 'P2002') { // Unicidad nombre
               return NextResponse.json({ error: 'Ya existe un paquete con este nombre.' }, { status: 409 });
           }
            if (error.code === 'P2003') { // FK inválida en items
               return NextResponse.json({ error: 'Referencia inválida (Servicio o Producto en items no existe).' }, { status: 400 });
           }
       }
        if (error instanceof Error && error.message === 'Forbidden') {
           return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
       }
       return NextResponse.json({ error: 'Error interno del servidor al actualizar el paquete.' }, { status: 500 });
  }
}


// --- Handler DELETE para Eliminar PackageDefinition ---
export async function DELETE(request: Request) {
  const session = await getServerAuthSession();
   if (!session?.user?.systemId) {
       return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
   }
   const systemId = session.user.systemId; // Necesario para verificar pertenencia

  const id = extractIdFromUrl(request.url);
  if (!id) {
      return NextResponse.json({ error: 'No se pudo extraer el ID de la URL.' }, { status: 400 });
  }

  const paramsValidation = ParamsSchema.safeParse({ id });
  if (!paramsValidation.success) {
    return NextResponse.json({ error: 'ID inválido.', details: paramsValidation.error.flatten() }, { status: 400 });
  }
  const { id: packageDefinitionId } = paramsValidation.data;

  try {
       await prisma.$transaction(async (tx) => {
           // 1. Verificar que el paquete existe y pertenece al sistema del usuario
            const existingPackage = await tx.packageDefinition.findUnique({
                where: { id: packageDefinitionId },
            });
            if (!existingPackage) {
                throw new Prisma.PrismaClientKnownRequestError(`Paquete ${packageDefinitionId} no encontrado.`, { code: 'P2025', clientVersion: '' });
            }
            if (existingPackage.systemId !== systemId) {
                 throw new Error('Forbidden');
            }

           // 2. Eliminar (onDelete: Cascade en PackageItem y TariffPackagePrice se encargará de los dependientes)
           // ¡CUIDADO! Si hay otras relaciones futuras, revisar reglas onDelete.
           await tx.packageDefinition.delete({
               where: { id: packageDefinitionId },
           });
       });

    return NextResponse.json({ message: `Paquete ${packageDefinitionId} eliminado.` });

  } catch (error) {
    console.error(`Error deleting package definition ${packageDefinitionId}:`, error);
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') { // No encontrado
            return NextResponse.json({ error: `Paquete ${packageDefinitionId} no encontrado.` }, { status: 404 });
        }
         // P2003 podría ocurrir si alguna restricción futura impide borrar
    }
     if (error instanceof Error && error.message === 'Forbidden') {
        return NextResponse.json({ error: 'Acceso denegado al paquete.' }, { status: 403 });
    }
    return NextResponse.json({ error: 'Error interno del servidor al eliminar el paquete.' }, { status: 500 });
  }
} 