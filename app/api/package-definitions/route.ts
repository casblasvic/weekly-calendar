import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { getServerAuthSession } from '@/lib/auth';
import { Prisma } from '@prisma/client';

// Esquema para validar un item individual dentro del paquete al crear/actualizar
const PackageItemSchema = z.object({
  itemType: z.enum(['SERVICE', 'PRODUCT']),
  itemId: z.string().min(1, "Debes seleccionar un servicio o producto."),
  quantity: z.coerce.number().min(1, "La cantidad debe ser al menos 1."),
  price: z.coerce.number().min(0, "El precio no puede ser negativo.").optional(),
}).refine(data => (data.itemType === 'SERVICE' || data.itemType === 'PRODUCT'), {
  message: 'Debe proporcionar itemId (y tipo SERVICE o PRODUCT), pero no ambos.',
  path: ['itemId', 'itemType'],
});

// Esquema para validar la creación de PackageDefinition
const CreatePackageDefinitionSchema = z.object({
  name: z.string().min(3, "El nombre debe tener al menos 3 caracteres."),
  description: z.string().optional(),
  price: z.coerce.number().min(0, "El precio no puede ser negativo."),
  isActive: z.boolean().default(true),
  pointsAwarded: z.coerce.number().min(0, "Los puntos no pueden ser negativos.").default(0),
  items: z.array(PackageItemSchema).min(1, "El paquete debe contener al menos un ítem."),
});

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

    // Validar el cuerpo de la solicitud
    const parsedData = CreatePackageDefinitionSchema.safeParse(json);

    if (!parsedData.success) {
      console.error("Error de validación Zod:", parsedData.error.errors);
      // Devolver errores detallados de Zod
      return NextResponse.json({ error: 'Datos inválidos', details: parsedData.error.flatten().fieldErrors }, { status: 400 });
    }

    const { name, description, price, isActive, pointsAwarded, items } = parsedData.data;

    // Mapear items del formulario al formato de Prisma para creación anidada
    const prismaItemsData = items.map(item => ({
      itemType: item.itemType,
      quantity: item.quantity,
      price: item.price,
      ...(item.itemType === 'SERVICE' 
        ? { service: { connect: { id: item.itemId } } } 
        : { product: { connect: { id: item.itemId } } }
      )
    }));

    // Crear el paquete y sus items en una transacción
    const newPackage = await prisma.packageDefinition.create({
      data: {
        name,
        description,
        price,
        isActive,
        pointsAwarded,
        system: { connect: { id: systemId } },
        items: {
          create: prismaItemsData,
        },
      },
      include: {
        items: { // Incluir items creados en la respuesta
          include: {
            service: { select: { id: true, name: true, price: true } }, // Incluir precio base de servicio
            product: { select: { id: true, name: true, price: true } }  // Incluir precio base de producto
          }
        } 
      }
    });

    return NextResponse.json(newPackage, { status: 201 });

  } catch (error: any) {
    console.error("Error al crear paquete:", error);
    // Manejar errores específicos de Prisma (ej: foreign key constraint)
    if (error.code === 'P2025') { // Código de error de Prisma para registro no encontrado (ej: servicio/producto no existe)
      return NextResponse.json({ error: 'Error al crear paquete: Uno de los servicios o productos seleccionados no existe.' }, { status: 400 });
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

  // Variables para paginación (solo si NO filtramos por item)
  let page = 1;
  let limit = 10;
  let skip = 0;
  let applyPagination = true;

  // Construir cláusula Where inicial
  let whereClause: Prisma.PackageDefinitionWhereInput = {
    systemId: systemId,
  };

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
          items: {
            include: {
              // Incluir detalles necesarios para la tabla o vista
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