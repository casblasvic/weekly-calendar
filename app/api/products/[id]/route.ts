import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
// import { getCurrentUserSystemId } from '@/lib/auth'; // TODO: Ajustar ruta
import { getServerAuthSession } from '@/lib/auth'; 
import { ApiProductPayloadSchema, ProductFormValues } from '@/lib/schemas/product'; // <<< Importar nuevo schema
import { z } from 'zod'; // Importar z para usar ZodError
import { updateCategoryTypeIfNeeded } from '@/utils/category-type-calculator';

// Helper para extraer ID (mismo que en servicios)
function extractIdFromUrl(url: string): string | null {
    try {
        const pathname = new URL(url).pathname;
        const segments = pathname.split('/').filter(Boolean);
        if (segments.length >= 3 && segments[0] === 'api' && segments[1] === 'products') {
            return segments[2];
        }
        return null;
    } catch (error) {
        console.error("Error extracting ID from URL:", error);
        return null;
    }
}

export async function GET(request: Request) {
    const id = extractIdFromUrl(request.url);
    if (!id) {
      return NextResponse.json({ error: 'No se pudo extraer el ID de la URL.' }, { status: 400 });
    }
    let systemId: string | null = null;

    try {
        const session = await getServerAuthSession();
        if (!session?.user?.systemId) {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }
        systemId = session.user.systemId;

        const product = await prisma.product.findUnique({
            where: { id: id, systemId: systemId }, // <<< Añadir filtro systemId
            include: {
                category: true,
                vatType: true,
                settings: true, // <<< Incluir settings
            },
        });

        if (!product) { // La condición where ya filtra por systemId
             throw new Prisma.PrismaClientKnownRequestError('Producto no encontrado', { code: 'P2025', clientVersion: '' });
        }

        return NextResponse.json(product);
    } catch (error) {
        console.error(`Error fetching product ${id} for system ${systemId ?? 'UNKNOWN'}:`, error);
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
            return NextResponse.json({ message: `Producto ${id} no encontrado en este sistema.` }, { status: 404 });
        }
        return NextResponse.json({ message: 'Error interno del servidor al obtener el producto' }, { status: 500 });
    }
    // No necesitamos finally { await prisma.$disconnect(); } en Next.js Route Handlers
}

export async function PUT(request: Request) {
    const id = extractIdFromUrl(request.url);
    if (!id) {
      return NextResponse.json({ error: 'No se pudo extraer el ID de la URL.' }, { status: 400 });
    }
    const productId = id;
    let systemId: string | null = null;

    try {
        const session = await getServerAuthSession();
        if (!session?.user?.systemId) {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }
        systemId = session.user.systemId;

        const body = await request.json();
        // Validar con el schema importado
        const validatedData = ApiProductPayloadSchema.parse(body);
        const { categoryId, vatTypeId, settings, ...productBaseData } = validatedData;
        const skuValue = productBaseData.sku; // Guardar SKU para chequeo

        // Verificar existencia y pertenencia ANTES de la transacción
        const existingProductCheck = await prisma.product.findUnique({ 
            where: { id: productId, systemId: systemId },
            select: { id: true, sku: true, categoryId: true } // ✅ Incluir categoryId para actualización automática
        });
        if (!existingProductCheck) {
            return NextResponse.json({ message: `Producto ${productId} no encontrado en este sistema` }, { status: 404 });
        }

        // 🔍 NUEVO: Guardar categoryId anterior para actualización posterior
        const previousCategoryId = existingProductCheck.categoryId;

        // Transacción para actualizar
        const updatedProductWithSettings = await prisma.$transaction(async (tx) => {
            // 1. Validar unicidad de SKU si se proporciona y ha cambiado
            if (skuValue && skuValue !== existingProductCheck.sku) { 
                const existingSku = await tx.product.findFirst({
                where: {
                        sku: skuValue,
                    systemId: systemId,
                        id: { not: productId } // Excluir el actual
                }
            });
                if (existingSku) {
                    throw new Prisma.PrismaClientKnownRequestError(
                        `El SKU '${skuValue}' ya está en uso.`, 
                        { code: 'P2002', clientVersion: 'tx', meta: { target: ['sku'] } }
                    );
            }
        }

            // 2. Actualizar Producto base
            await tx.product.update({
                where: { id: productId, systemId: systemId }, // Doble check
                data: {
                    name: productBaseData.name,
                    description: productBaseData.description,
                    sku: productBaseData.sku,
                    barcode: productBaseData.barcode,
                    price: productBaseData.price,
                    costPrice: productBaseData.costPrice,
                    ...(categoryId !== undefined && { 
                        category: categoryId ? { connect: { id: categoryId } } : { disconnect: true }
                    }),
                    ...(vatTypeId !== undefined && { 
                        vatType: vatTypeId ? { connect: { id: vatTypeId } } : { disconnect: true }
                    }),
                }
            });

            // 3. Upsert de ProductSetting
            await tx.productSetting.upsert({
                where: { productId: productId },
                create: { 
                    ...settings, 
                    product: { connect: { id: productId } } 
                },
                update: settings,
            });

            // 4. Devolver el producto actualizado con settings
            return await tx.product.findUniqueOrThrow({
                where: { id: productId },
                include: { settings: true, category: true, vatType: true }
            });
        });

        // 🔄 Actualizar automáticamente los tipos de categorías
        try {
          // Actualizar categoría nueva (si se asignó una)
          if (categoryId) {
            await updateCategoryTypeIfNeeded(categoryId, systemId!);
          }
          
          // 🔄 NUEVO: Actualizar categoría anterior (si había una y es diferente a la nueva)
          if (previousCategoryId && previousCategoryId !== categoryId) {
            await updateCategoryTypeIfNeeded(previousCategoryId, systemId!);
          }
        } catch (error) {
          console.error("❌ [AutoCategoryType] Error actualizando tipos de categorías:", error);
          // No fallar la operación principal por este error
        }

        return NextResponse.json(updatedProductWithSettings);

    } catch (error) {
        console.error(`Error updating product ${productId} for system ${systemId ?? 'UNKNOWN'}:`, error);
        
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
            if (error.code === 'P2025') {
                 return NextResponse.json({ message: `Producto ${productId} no encontrado.` }, { status: 404 });
            }
            if (error.code === 'P2002') { 
                 const target = (error.meta?.target as string[])?.join(', ') || 'desconocido';
                 const message = error.message.includes('ya está en uso') ? error.message : `Conflicto: El valor proporcionado para '${target}' ya existe.`;
                 return NextResponse.json({ message }, { status: 409 });
                 }
             if (error.code === 'P2003') {
                 const fieldName = (error.meta?.field_name as string) || 'desconocido';
                 return NextResponse.json({ message: `Referencia inválida: La categoría o tipo de IVA no existe (campo: ${fieldName}).` }, { status: 400 });
                 }
        }
        if (error instanceof z.ZodError) { // Capturar ZodError
            console.error("Error de validación Zod:", error.errors);
            return NextResponse.json({ error: 'Datos de entrada inválidos', details: error.errors }, { status: 400 });
        }
        if (error instanceof SyntaxError) {
           console.error("Error de sintaxis JSON:", error.message);
           return NextResponse.json({ message: 'JSON inválido' }, { status: 400 });
        }
        return NextResponse.json({ message: 'Error interno del servidor al actualizar el producto' }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    const id = extractIdFromUrl(request.url);
    if (!id) {
      return NextResponse.json({ error: 'No se pudo extraer el ID de la URL.' }, { status: 400 });
    }
    const productId = id;
    let systemId: string | null = null;

    try {
        const session = await getServerAuthSession();
        if (!session?.user?.systemId) {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }
        systemId = session.user.systemId;
        
        // 🔍 Obtener datos del producto ANTES de la transacción para uso posterior
        const existingProduct = await prisma.product.findUnique({
            where: { id: productId, systemId: systemId },
            select: { id: true, categoryId: true }
        });
        
        if (!existingProduct) {
            return NextResponse.json({ message: `Producto ${productId} no encontrado en este sistema` }, { status: 404 });
        }
        
        // Usar transacción para verificar dependencias y eliminar
        await prisma.$transaction(async (tx) => {
            // 1. Verificar dependencias
            const tariffAssociations = await tx.tariffProductPrice.count({ where: { productId: productId }});
        if (tariffAssociations > 0) {
                 throw new Error(`Conflicto: Asociado a ${tariffAssociations} tarifa(s).`); // Lanzar error para rollback
        }
            const ticketAssociations = await tx.ticketItem.count({ where: { productId: productId }});
        if (ticketAssociations > 0) {
                 throw new Error(`Conflicto: Incluido en ${ticketAssociations} ticket(s).`); // Lanzar error para rollback
            }
            // TODO: Añadir verificaciones para InvoiceItem, PackageItem, ServiceConsumption si es necesario
            
            // 2. Eliminar (la cascada se encarga de ProductSetting)
            await tx.product.delete({
                where: { id: productId, systemId: systemId }, // Doble check
        });
        });
        
        // 🔄 NUEVO: Actualizar automáticamente el tipo de categoría tras eliminar producto
        if (existingProduct.categoryId) {
          try {
            await updateCategoryTypeIfNeeded(existingProduct.categoryId, systemId!);
          } catch (error) {
            console.error("❌ [AutoCategoryType] Error actualizando tipo de categoría tras eliminación:", error);
            // No fallar la operación principal por este error
          }
        }

        return NextResponse.json({ message: `Producto ${productId} eliminado` }, { status: 200 });

    } catch (error: any) {
        console.error(`Error deleting product ${productId} for system ${systemId ?? 'UNKNOWN'}:`, error);
        
        // Capturar errores lanzados desde la transacción
        if (error.message?.startsWith('Conflicto:')) {
             return NextResponse.json({ message: error.message }, { status: 409 });
        }
        
         if (error instanceof Prisma.PrismaClientKnownRequestError) {
            if (error.code === 'P2025') {
                 return NextResponse.json({ message: `Producto ${productId} no encontrado en este sistema.` }, { status: 404 });
            }
            if (error.code === 'P2003'){ 
                 return NextResponse.json({ message: `No se puede eliminar el producto ${productId} debido a registros dependientes.` }, { status: 409 });
            }
        }
        return NextResponse.json({ message: 'Error interno del servidor al eliminar el producto' }, { status: 500 });
    }
} 