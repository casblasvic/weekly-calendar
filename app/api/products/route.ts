import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db'; // Asumiendo que esta ruta es correcta
import { Prisma } from '@prisma/client';
import { z } from 'zod'; // Añadir Zod
import { getServerAuthSession } from "@/lib/auth"; // Importar helper de sesión
// import { getCurrentUserSystemId } from '@/lib/auth'; // TODO: Ajustar ruta de importación

export async function GET(request: Request) {
    const session = await getServerAuthSession();
    if (!session || !session.user?.systemId) {
      console.error("API GET /api/products: Sesión no válida o falta systemId", { session });
      return NextResponse.json({ error: 'No autorizado o falta configuración del sistema.' }, { status: session ? 500 : 401 });
    }
    const systemId = session.user.systemId;
    console.log("API GET /api/products: Usando systemId de la sesión:", systemId);

    // TODO: Añadir lógica de filtros desde searchParams si es necesario (isActive, categoryId, etc.)

    try {
        const products = await prisma.product.findMany({
            where: { systemId }, // Filtrar por systemId
            include: {
                category: true,
                vatType: true, 
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

// Schema Zod para creación y actualización
const productSchema = z.object({
    name: z.string().min(1, "El nombre es obligatorio."),
    description: z.string().nullish(),
    sku: z.string().nullish(),
    barcode: z.string().nullish(),
    price: z.number().nonnegative("El precio base debe ser >= 0").optional(), // Opcional en PUT, requerido en POST?
    costPrice: z.number().nonnegative("El precio coste debe ser >= 0").nullish(),
    // currentStock: z.number().int().optional(), // Stock se maneja por StockLedger
    minStockThreshold: z.number().int().positive().nullish(),
    isForSale: z.boolean().optional(),
    isInternalUse: z.boolean().optional(),
    isActive: z.boolean().optional(),
    pointsAwarded: z.number().int().nonnegative().optional(), // Campo añadido
    categoryId: z.string().cuid().nullish(),
    vatTypeId: z.string().cuid().nullish(),
});

export async function POST(request: Request) {
    const session = await getServerAuthSession();
    if (!session || !session.user?.systemId) {
      console.error("API POST /api/products: Sesión no válida o falta systemId", { session });
      return NextResponse.json({ error: 'No autorizado o falta configuración del sistema.' }, { status: session ? 500 : 401 });
    }
    const systemId = session.user.systemId;
    console.log("API POST /api/products: Usando systemId de la sesión:", systemId);

    let skuValue: string | null | undefined = undefined; // Para usar en catch

    try {
        const body = await request.json();
        
        // Validar body con Zod (requiere price para POST)
        const validatedData = productSchema.extend({
            price: z.number().nonnegative("El precio base es obligatorio y debe ser >= 0"),
        }).parse(body);

        skuValue = validatedData.sku;

        // Validar unicidad de SKU si se proporciona
        if (skuValue) {
             const existingSku = await prisma.product.findFirst({
                 where: { sku: skuValue, systemId: systemId }
             });
            if (existingSku) {
                 return NextResponse.json({ message: `El SKU '${skuValue}' ya está en uso en este sistema.` }, { status: 409 });
            }
        }

        // Crear producto
        const { categoryId, vatTypeId, ...productData } = validatedData; // Separar IDs de relación
        
        const dataToCreate: Prisma.ProductCreateInput = {
            // Campos obligatorios explícitos
            name: productData.name,
            price: productData.price,
            // ... otros campos obligatorios si los hubiera ...
            
            // Resto de datos validados
            ...productData,
            sku: skuValue, // Usar SKU procesado
            // Forzar valores por defecto si no vienen
            isForSale: productData.isForSale ?? true,
            isInternalUse: productData.isInternalUse ?? false,
            isActive: productData.isActive ?? true,
            pointsAwarded: productData.pointsAwarded ?? 0,
            system: { // Conectar con el systemId de la sesión
                connect: { id: systemId } 
            },
            // Conectar relaciones opcionales
            ...(categoryId && { category: { connect: { id: categoryId } } }),
            ...(vatTypeId && { vatType: { connect: { id: vatTypeId } } }),
        };

        const newProduct = await prisma.product.create({
            data: dataToCreate, // Usar el objeto construido explícitamente
            include: { category: true, vatType: true },
        });

        return NextResponse.json(newProduct, { status: 201 });

    } catch (error) {
        console.error("Error al crear producto:", error);
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
             // ... (manejo error P2002 similar, usando skuValue) ...
             const target = (error.meta?.target as string[])?.join(', ');
             if (target?.includes('sku')) {
                 return NextResponse.json({ message: `Conflicto: El SKU '${skuValue || ''}' ya existe.` }, { status: 409 });
             }
             return NextResponse.json({ message: `Conflicto de datos: El valor proporcionado para '${target || 'campo único'}' ya existe.` }, { status: 409 });

        }
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: 'Datos de entrada inválidos', details: error.errors }, { status: 400 });
        }
        if (error instanceof SyntaxError) {
           return NextResponse.json({ message: 'JSON inválido' }, { status: 400 });
        }
        return NextResponse.json({ message: 'Error interno del servidor al crear el producto' }, { status: 500 });
    }
} 