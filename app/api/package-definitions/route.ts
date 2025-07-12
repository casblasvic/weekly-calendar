import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { getServerAuthSession } from '@/lib/auth';
import { ApiPackageDefinitionPayloadSchema } from '@/lib/schemas/package-definition';

// Esquema para validar un item individual dentro del paquete al crear/actualizar
// const PackageItemSchema = z.object({ ... });

// Esquema para validar la creación de PackageDefinition
// const CreatePackageDefinitionSchema = z.object({ ... });

// --- Handler POST para Crear PackageDefinition ---
export async function POST(request: Request) {
  try {
    const session = await getServerAuthSession();
    if (!session?.user?.id || !session.user.systemId) {
      return NextResponse.json({ error: 'No autenticado o falta systemId' }, { status: 401 });
    }
    
    // TODO: Añadir verificación de permisos si es necesario
    // Ejemplo: if (!hasPermission(session.user, 'crear_paquetes')) { return NextResponse.json({ error: 'Permiso denegado' }, { status: 403 }); }

    const systemId = session.user.systemId;
    const json = await request.json();

    // Validar el cuerpo de la solicitud con el schema importado
    const validatedData = ApiPackageDefinitionPayloadSchema.parse(json);
    console.log("[API PKG_DEF POST] Zod validation successful:", validatedData);

    const { items, settings, vatTypeId, ...packageBaseData } = validatedData;

    // Transacción para crear todo
    const newPackageDefId = await prisma.$transaction(async (tx) => {
      // 1. Crear PackageDefinition base
      const newPackageDef = await tx.packageDefinition.create({
        data: {
          // Campos obligatorios explícitos
          name: validatedData.name,
          price: validatedData.price,
          // Resto de campos base (opcionales)
          description: validatedData.description,
          // Conexiones
          system: { connect: { id: systemId } },
          // Nota: vatTypeId ahora va en settings
        }
      });

      // 2. Crear PackageDefinitionSetting (incluyendo vatTypeId)
      const newSettings = await tx.packageDefinitionSetting.create({
        data: {
          ...settings,
          systemId: systemId, // 🏢 NUEVO: systemId para operaciones a nivel sistema
          clinicId: null, // 🏥 NUEVO: PackageDefinitionSetting no está vinculado directamente a clínica específica
          packageDefinition: { connect: { id: newPackageDef.id } },
          ...(vatTypeId && { vatTypeId: vatTypeId }), // <<< Solo conectar el ID
        }
      });

      // 3. Crear PackageItems
      if (items && items.length > 0) {
    const prismaItemsData = items.map(item => ({
          packageDefinitionId: newPackageDef.id,
          systemId: systemId, // 🏢 NUEVO: systemId para operaciones a nivel sistema
          clinicId: null, // 🏥 NUEVO: PackageItem no está vinculado directamente a clínica específica
      quantity: item.quantity,
          itemType: item.serviceId ? 'SERVICE' : 'PRODUCT', // <<< Añadir itemType obligatorio
          ...(item.serviceId && { serviceId: item.serviceId }),
          ...(item.productId && { productId: item.productId }),
        }));
        await tx.packageItem.createMany({ data: prismaItemsData });
      }
      
      return newPackageDef.id;
    });

    // Buscar el paquete completo fuera de la transacción para incluir todo
    const finalPackageResponse = await prisma.packageDefinition.findUnique({
        where: { id: newPackageDefId }, 
        include: {
            settings: true, // <<< Incluir settings (contendrá vatTypeId)
        items: {
      include: {
                    service: { select: { id: true, name: true } },
                    product: { select: { id: true, name: true } }
          }
        } 
      }
    });

    return NextResponse.json(finalPackageResponse, { status: 201 });

  } catch (error: any) {
    console.error("Error al crear paquete:", error);
    if (error instanceof z.ZodError) {
      console.error("Error de validación Zod:", error.errors);
      return NextResponse.json({ error: 'Datos inválidos', details: error.flatten().fieldErrors }, { status: 400 });
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        const target = (error.meta?.target as string[])?.join(', ') || 'nombre';
        return NextResponse.json({ error: `Conflicto: Ya existe un paquete con ese ${target}.` }, { status: 409 });
      }
      if (error.code === 'P2003') {
         const fieldName = (error.meta?.field_name as string) || 'relacionado';
         return NextResponse.json({ error: `Referencia inválida: El servicio, producto o tipo de IVA no existe (campo: ${fieldName}).` }, { status: 400 });
      }
      if (error.code === 'P2025') { // Podría ocurrir si se conecta a algo inválido
        return NextResponse.json({ error: 'Error al crear paquete: Uno de los elementos referenciados no existe.' }, { status: 400 });
      }
    }
    return NextResponse.json({ error: 'Error interno del servidor al crear el paquete.' }, { status: 500 });
  }
}

// --- Handler GET para Listar/Filtrar PackageDefinitions ---
export async function GET(request: Request) {
  const session = await getServerAuthSession();
  if (!session?.user?.id || !session.user.systemId) {
    return NextResponse.json({ error: 'No autenticado o falta systemId' }, { status: 401 });
  }
  const systemId = session.user.systemId;
  
  const { searchParams } = new URL(request.url);
  
  // <<< Leer parámetros de filtro por item >>>
  const serviceId = searchParams.get("serviceId");
  const productId = searchParams.get("productId");
  const isActiveParam = searchParams.get('isActive');

  // Variables para paginación (solo si NO filtramos por item)
  let page = 1;
  let limit = 10;
  let skip = 0;
  let applyPagination = true;

  // Construir cláusula Where inicial
  let whereClause: Prisma.PackageDefinitionWhereInput = {
    systemId: systemId,
  };

  // Filtro por isActive (usando settings)
  if (isActiveParam !== null) {
    whereClause.settings = {
      isActive: isActiveParam === 'true'
    };
  }

  // <<< Añadir filtro si serviceId o productId están presentes >>>
  if (serviceId) {
    whereClause.items = {
      some: { serviceId: serviceId }
    };
    applyPagination = false; // No paginar si filtramos por item específico
    console.log(`[API GET Packages] Filtering by serviceId: ${serviceId}`);
  } else if (productId) {
    whereClause.items = {
      some: { productId: productId }
    };
    applyPagination = false; // No paginar si filtramos por item específico
    console.log(`[API GET Packages] Filtering by productId: ${productId}`);
  }
  // TODO: Añadir otros filtros si es necesario (nombre, estado, etc.)
  // else { ... lógica de otros filtros ... }

  // Calcular paginación solo si es necesario
  if (applyPagination) {
    page = parseInt(searchParams.get("page") || "1");
    limit = parseInt(searchParams.get("limit") || "10");
    skip = (page - 1) * limit;
  }
  
  try {
    const findManyArgs: Prisma.PackageDefinitionFindManyArgs = {
        where: whereClause,
        include: {
          settings: true, // <<< Incluir settings (contendrá vatTypeId)
          items: {
            include: {
              service: { select: { id: true, name: true } }, 
              product: { select: { id: true, name: true } }
            }
          },
        },
        orderBy: { updatedAt: 'desc' }
    };

    // Aplicar paginación solo si corresponde
    if (applyPagination) {
        findManyArgs.skip = skip;
        findManyArgs.take = limit;
    }

    // Ejecutar consultas
    if (applyPagination) {
        // Consulta paginada normal
        const [packageDefinitions, totalPackageDefinitions] = await prisma.$transaction([
            prisma.packageDefinition.findMany(findManyArgs),
            prisma.packageDefinition.count({ where: whereClause }) // Contar con el mismo filtro
        ]);

        const totalPages = Math.ceil(totalPackageDefinitions / limit);

        return NextResponse.json({
            packageDefinitions,
            currentPage: page,
            totalPages,
            totalPackageDefinitions
        });
    } else {
        // Consulta SIN paginación (cuando filtramos por serviceId/productId)
        const packageDefinitions = await prisma.packageDefinition.findMany(findManyArgs);
        // En este caso, no necesitamos el total ni las páginas
        return NextResponse.json({ packageDefinitions }); 
        // O simplemente: return NextResponse.json(packageDefinitions);
    }

  } catch (error: any) {
    console.error("Error al obtener paquetes:", error);
    return NextResponse.json({ error: 'Error interno del servidor al obtener los paquetes.' }, { status: 500 });
  }
} 