import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { getServerAuthSession } from '@/lib/auth';
import { ApiPackageDefinitionPayloadSchema } from '@/lib/schemas/package-definition';

// Esquema para validar el ID en los parámetros
const ParamsSchema = z.object({
  id: z.string().cuid({ message: "ID de paquete inválido." }),
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
   const systemId = session.user.systemId;

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
      where: { id: packageDefinitionId, systemId: systemId },
      include: {
        settings: true,
        items: { 
            include: {
                service: { select: { id: true, name: true } },
                product: { select: { id: true, name: true } }
            },
            orderBy: { createdAt: 'asc' }
        }
      },
    });

    if (!packageDefinition) {
      return NextResponse.json({ message: `Paquete ${packageDefinitionId} no encontrado.` }, { status: 404 });
     }

    return NextResponse.json(packageDefinition);

  } catch (error) {
    console.error(`Error fetching package definition ${packageDefinitionId}:`, error);
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        return NextResponse.json({ message: `Paquete ${packageDefinitionId} no encontrado.` }, { status: 404 });
    }
    return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 });
  }
}

// --- Handler PUT para Actualizar PackageDefinition ---
export async function PUT(request: Request) {
  const session = await getServerAuthSession();
   if (!session?.user?.systemId) {
       return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
   }
   const systemId = session.user.systemId;

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

  const validation = ApiPackageDefinitionPayloadSchema.safeParse(body);
  if (!validation.success) {
    console.error("Error de validación Zod (PUT Package):");
    return NextResponse.json({ error: 'Datos inválidos.', details: validation.error.format() }, { status: 400 });
  }

  const { items, settings, vatTypeId, ...packageUpdateData } = validation.data;

   if (Object.keys(packageUpdateData).length === 0 && items === undefined && vatTypeId === undefined && settings === undefined) {
       return NextResponse.json({ error: 'No se proporcionaron datos para actualizar.' }, { status: 400 });
   }

  try {
      const existingPackageCheck = await prisma.packageDefinition.findUnique({
          where: { id: packageDefinitionId, systemId: systemId }
      });
      if (!existingPackageCheck) {
          return NextResponse.json({ error: `Paquete ${packageDefinitionId} no encontrado.` }, { status: 404 });
      }

      const updatedPackageDefinition = await prisma.$transaction(async (tx) => {
          if (Object.keys(packageUpdateData).length > 0) {
              await tx.packageDefinition.update({
                  where: { id: packageDefinitionId, systemId: systemId },
                  data: packageUpdateData,
              });
          }

          if (settings !== undefined || vatTypeId !== undefined) {
              await tx.packageDefinitionSetting.upsert({
                  where: { packageDefinitionId: packageDefinitionId },
                  create: {
                      ...(settings ?? {}), 
                      packageDefinition: { connect: { id: packageDefinitionId } },
                      ...(vatTypeId && { vatTypeId: vatTypeId }),
                  },
                  update: {
                      ...(settings ?? {}),
                      vatTypeId: vatTypeId === null ? null : (vatTypeId ?? undefined),
                  },
              });
          }

          if (items !== undefined) {
              await tx.packageItem.deleteMany({
                  where: { packageDefinitionId: packageDefinitionId },
              });

              if (items.length > 0) {
              const itemsToCreate = items.map(item => ({
                  packageDefinitionId: packageDefinitionId,
                      itemType: item.serviceId ? 'SERVICE' : 'PRODUCT',
                      serviceId: item.serviceId,
                      productId: item.productId,
                  quantity: item.quantity,
              }));
                  await tx.packageItem.createMany({ data: itemsToCreate });
          }
          }

          return tx.packageDefinition.findUniqueOrThrow({
              where: { id: packageDefinitionId },
              include: {
                  settings: true,
                  items: {
                      include: { 
                          service: { select: { id: true, name: true } }, 
                          product: { select: { id: true, name: true } }
                      },
                       orderBy: { createdAt: 'asc' }
                  }
              },
          });
      });

      return NextResponse.json(updatedPackageDefinition);

  } catch (error) {
       console.error(`Error updating package definition ${packageDefinitionId}:`, error);
       if (error instanceof z.ZodError) {
          console.error("Error de validación Zod (PUT Package Catch):");
          return NextResponse.json({ error: 'Datos inválidos.', details: error.format() }, { status: 400 });
       }
       if (error instanceof Prisma.PrismaClientKnownRequestError) {
           if (error.code === 'P2025') { 
               return NextResponse.json({ error: `Paquete ${packageDefinitionId} no encontrado o referencia inválida.` }, { status: 404 });
           }
           if (error.code === 'P2002') { 
               return NextResponse.json({ error: 'Ya existe un paquete con este nombre.' }, { status: 409 });
           }
            if (error.code === 'P2003') { 
               return NextResponse.json({ error: 'Referencia inválida (Servicio, Producto o Tipo IVA en items no existe).' }, { status: 400 });
           }
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
   const systemId = session.user.systemId;

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
            const existingPackage = await tx.packageDefinition.findUnique({
                where: { id: packageDefinitionId, systemId: systemId },
            });
            if (!existingPackage) {
                throw new Prisma.PrismaClientKnownRequestError(`Paquete ${packageDefinitionId} no encontrado.`, { code: 'P2025', clientVersion: 'tx' });
            }

           await tx.packageDefinition.delete({
                where: { id: packageDefinitionId, systemId: systemId },
           });
       });

    return NextResponse.json({ message: `Paquete ${packageDefinitionId} eliminado correctamente.` }, { status: 200 });

  } catch (error: any) {
    console.error(`Error deleting package definition ${packageDefinitionId}:`, error);
       
       if (error.message?.startsWith('Conflicto:')) {
         return NextResponse.json({ error: error.message }, { status: 409 });
       }

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
           if (error.code === 'P2025') {
            return NextResponse.json({ error: `Paquete ${packageDefinitionId} no encontrado.` }, { status: 404 });
        }
            if (error.code === 'P2003'){
                 return NextResponse.json({ error: "No se puede eliminar: El paquete está en uso por instancias existentes." }, { status: 409 });
    }
    }
    return NextResponse.json({ error: 'Error interno del servidor al eliminar el paquete.' }, { status: 500 });
  }
} 