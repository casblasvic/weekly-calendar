import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db'; // Asumiendo que esta ruta es correcta
import { Prisma } from '@prisma/client';
import { z } from 'zod'; // Añadir Zod
import { getServerAuthSession } from "@/lib/auth"; // Importar helper de sesión
import { ApiProductPayloadSchema, ProductFormValues } from '@/lib/schemas/product'; // <<< Importar nuevo schema
// import { getCurrentUserSystemId } from '@/lib/auth'; // TODO: Ajustar ruta de importación

export async function GET(request: Request) {
    const session = await getServerAuthSession();
    if (!session || !session.user?.systemId) {
      console.error("API GET /api/products: Sesión no válida o falta systemId", { session });
      return NextResponse.json({ error: 'No autorizado o falta configuración del sistema.' }, { status: session ? 500 : 401 });
    }
    const systemId = session.user.systemId;
    console.log("API GET /api/products: Usando systemId de la sesión:", systemId);

    const { searchParams } = new URL(request.url);
    const isActiveParam = searchParams.get('isActive');
    const categoryIdParam = searchParams.get('categoryId');

    let whereClause: Prisma.ProductWhereInput = {
        systemId: systemId,
    };

    // Filtro por isActive (usando settings)
    if (isActiveParam !== null) {
      const isActiveValue = isActiveParam === 'true';
      whereClause.settings = {
        isActive: isActiveValue
      };
    }
    
    // Filtro por categoryId
    if (categoryIdParam) {
      whereClause.categoryId = categoryIdParam;
    }

    try {
        const products = await prisma.product.findMany({
            where: whereClause, 
            include: {
                category: true,
                vatType: true, 
                settings: true, // <<< Incluir settings
                productPrices: { // Corregido de tariffPrices a productPrices (según schema)
                    where: { isActive: true }, // Solo mostrar tarifas donde el producto esté activo
                    select: {
                        tariff: {
                            select: {
                                id: true,
                                name: true,
                            },
                        },
                    },
                },
            },
            orderBy: {
                name: 'asc',
            },
        });
        return NextResponse.json(products);
    } catch (error) {
        console.error("Error al obtener productos:", error);
        return NextResponse.json({ message: 'Error interno del servidor al obtener productos' }, { status: 500 });
    }
}

// Eliminar schema Zod local
// const productSchema = z.object({ ... });

export async function POST(request: Request) {
    const session = await getServerAuthSession();
    if (!session || !session.user?.systemId) {
      console.error("API POST /api/products: Sesión no válida o falta systemId", { session });
      return NextResponse.json({ error: 'No autorizado o falta configuración del sistema.' }, { status: session ? 500 : 401 });
    }
    const systemId = session.user.systemId;
    console.log("API POST /api/products: Usando systemId de la sesión:", systemId);

    try {
        const body = await request.json();
        
        // Validar body con el schema importado
        const validatedData = ApiProductPayloadSchema.parse(body);

        const { categoryId, vatTypeId, settings, ...productBaseData } = validatedData;
        const skuValue = productBaseData.sku; // Guardar SKU para chequeo

        const newProductWithSettings = await prisma.$transaction(async (tx) => {
            // 1. Validar unicidad de SKU si se proporciona (dentro de la tx)
        if (skuValue) {
                const existingSku = await tx.product.findFirst({
                 where: { sku: skuValue, systemId: systemId }
             });
            if (existingSku) {
                    // Lanzar error específico para que la tx falle
                    throw new Prisma.PrismaClientKnownRequestError(
                        `El SKU '${skuValue}' ya está en uso.`, 
                        { code: 'P2002', clientVersion: 'tx', meta: { target: ['sku'] } }
                    );
            }
        }

            // 2. Crear el Producto base
            const newProduct = await tx.product.create({
                data: {
            // Campos obligatorios explícitos
                    name: productBaseData.name, 
                    // Resto de datos base validados
                    ...productBaseData,
                    system: { connect: { id: systemId } },
            ...(categoryId && { category: { connect: { id: categoryId } } }),
            ...(vatTypeId && { vatType: { connect: { id: vatTypeId } } }),
                }
            });

            // 3. Crear los Settings asociados
            const newSettings = await tx.productSetting.create({
                data: {
                    ...settings, // Usar los datos validados del objeto settings
                    product: { connect: { id: newProduct.id } }
                }
            });

            // 4. Devolver producto base y settings creados
            return { ...newProduct, settings: newSettings };
        });
        
        // Recuperar datos completos fuera de la tx si es necesario
        const finalProductResponse = await prisma.product.findUnique({
            where: { id: newProductWithSettings.id },
            include: { 
                settings: true,
                category: true, 
                vatType: true 
            },
        });

        return NextResponse.json(finalProductResponse, { status: 201 });

    } catch (error) {
        console.error("Error al crear producto:", error);
        
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
             if (error.code === 'P2002') {
                 const target = (error.meta?.target as string[])?.join(', ') || 'desconocido';
                 console.error(`Error de unicidad en campos: ${target}`);
                 // Usar el mensaje del error si viene de la validación de SKU dentro de la TX
                 const message = error.message.includes('ya está en uso') ? error.message : `Conflicto: El valor proporcionado para '${target}' ya existe.`;
                 return NextResponse.json({ message }, { status: 409 });
             }
             if (error.code === 'P2003') {
                 const fieldName = (error.meta?.field_name as string) || 'desconocido';
                 return NextResponse.json({ message: `Referencia inválida: La categoría o tipo de IVA no existe (campo: ${fieldName}).` }, { status: 400 });
             }
             if (error.code === 'P2025') { 
                 return NextResponse.json({ message: `Error al crear: ${error.message}` }, { status: 400 });
             }
        }
        if (error instanceof z.ZodError) {
            console.error("Error de validación Zod:", error.errors);
            return NextResponse.json({ error: 'Datos de entrada inválidos', details: error.errors }, { status: 400 });
        }
        if (error instanceof SyntaxError) {
           console.error("Error de sintaxis JSON:", error.message);
           return NextResponse.json({ message: 'JSON inválido' }, { status: 400 });
        }
        return NextResponse.json({ message: 'Error interno del servidor al crear el producto' }, { status: 500 });
    }
} 