import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { Prisma } from '@prisma/client';
// import { getCurrentUserSystemId } from '@/lib/auth'; // TODO: Ajustar ruta
import { getServerAuthSession } from '@/lib/auth'; 

export async function GET(request: Request, props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    const productId = params.id;
    let systemId: string | null = null; // Inicializar a null

    try {
        // --- Obtener sesión y systemId --- 
        const session = await getServerAuthSession();
        if (!session?.user?.systemId) {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }
        systemId = session.user.systemId; // Reasignar aquí
        // --- Fin obtención --- 

        // Buscar por ID y verificar systemId
        const product = await prisma.product.findUnique({
            where: { id: productId }, 
            include: {
                category: true,
                vatType: true,
            },
        });

        // Verificar si el producto existe y pertenece al systemId correcto
        if (!product || product.systemId !== systemId) {
             throw new Prisma.PrismaClientKnownRequestError('Not found', { code: 'P2025', clientVersion: '' }); // Simular error P2025
        }

        return NextResponse.json(product);
    } catch (error) {
        console.error(`Error fetching product ${productId} for system ${systemId ?? 'UNKNOWN'}:`, error);
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
            return NextResponse.json({ message: `Producto ${productId} no encontrado en este sistema` }, { status: 404 });
        }
        return NextResponse.json({ message: 'Error interno del servidor al obtener el producto' }, { status: 500 });
    } finally {
        await prisma.$disconnect();
    }
}

export async function PUT(request: Request, props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    const productId = params.id;
    let systemId: string | null = null; // Inicializar a null
    let sku: string | null | undefined = undefined;
    let updateData: Prisma.ProductUpdateArgs['data'] = {};

    try {
        // --- Obtener sesión y systemId --- 
        const session = await getServerAuthSession();
        if (!session?.user?.systemId) {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }
        systemId = session.user.systemId; // Reasignar aquí
        // --- Fin obtención --- 

        // Verificar existencia y pertenencia
        const existingProduct = await prisma.product.findUnique({ where: { id: productId } });
        if (!existingProduct || existingProduct.systemId !== systemId) {
            return NextResponse.json({ message: `Producto ${productId} no encontrado en este sistema` }, { status: 404 });
        }

        const body = await request.json();
        const { name, description, price, costPrice, isActive, categoryId, vatTypeId } = body;
        sku = body.sku;

        // Validaciones (precio, coste, sku)
        if (price !== undefined && (typeof price !== 'number' || price < 0)) {
             return NextResponse.json({ message: 'El precio debe ser un número >= 0' }, { status: 400 });
        }
        if (costPrice !== undefined && costPrice !== null && (typeof costPrice !== 'number' || costPrice < 0)) {
            return NextResponse.json({ message: 'El precio de coste debe ser un número >= 0 o nulo' }, { status: 400 });
        }
        if (sku !== undefined && sku !== null) { 
             const existingProductWithSku = await prisma.product.findFirst({
                where: {
                    sku: sku,
                    systemId: systemId,
                    id: { not: productId } // Excluir el producto actual de la búsqueda
                }
            });
            if (existingProductWithSku) {
                return NextResponse.json({ message: `El SKU '${sku}' ya está en uso por otro producto en este sistema.` }, { status: 409 });
            }
        }

        // Asignar valores a updateData (declarada fuera)
        if (name !== undefined) updateData.name = name;
        if (description !== undefined) updateData.description = description;
        if (sku !== undefined) updateData.sku = sku; 
        if (price !== undefined) updateData.price = parseFloat(price.toString());
        if (costPrice !== undefined) updateData.costPrice = costPrice !== null ? parseFloat(costPrice.toString()) : null;
        if (isActive !== undefined) updateData.isActive = !!isActive;
        if (categoryId !== undefined) updateData.categoryId = categoryId;
        if (vatTypeId !== undefined) updateData.vatTypeId = vatTypeId;

        const updatedProduct = await prisma.product.update({
            where: { id: productId, systemId: systemId }, 
            data: updateData,
            include: {
                category: true,
                vatType: true,
            },
        });
        return NextResponse.json(updatedProduct);

    } catch (error) {
        console.error(`Error updating product ${productId} for system ${systemId ?? 'UNKNOWN'}:`, error);
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
            if (error.code === 'P2025') {
                 return NextResponse.json({ message: `Producto ${productId} no encontrado en este sistema` }, { status: 404 });
            }
            if (error.code === 'P2002') { 
                 const target = (error.meta?.target as string[])?.join(', ');
                 if (target?.includes('sku')) {
                      return NextResponse.json({ message: `Conflicto: El SKU '${sku || ''}' ya existe globalmente.` }, { status: 409 });
                 }
                 if (target?.includes('name_systemId')) { 
                      return NextResponse.json({ message: `Conflicto: Ya existe un producto con el nombre '${updateData.name || ''}' en este sistema.` }, { status: 409 });
                 }
                 return NextResponse.json({ message: `Conflicto de datos: El valor proporcionado para '${target || 'campo único'}' ya existe.` }, { status: 409 });
            }
        }
        if (error instanceof SyntaxError) {
           return NextResponse.json({ message: 'JSON inválido' }, { status: 400 });
        }
        return NextResponse.json({ message: 'Error interno del servidor al actualizar el producto' }, { status: 500 });
    } finally {
        await prisma.$disconnect();
    }
}

export async function DELETE(request: Request, props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    const productId = params.id;
    let systemId: string | null = null; // Inicializar a null

    try {
        // --- Obtener sesión y systemId --- 
        const session = await getServerAuthSession();
        if (!session?.user?.systemId) {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }
        systemId = session.user.systemId; // Reasignar aquí
        // --- Fin obtención --- 
        
        // Verificar existencia y pertenencia al sistema ANTES de verificar dependencias
        const existingProduct = await prisma.product.findUnique({ where: { id: productId } });
        if (!existingProduct || existingProduct.systemId !== systemId) {
             return NextResponse.json({ message: `Producto ${productId} no encontrado en este sistema` }, { status: 404 });
        }

        // Verificar dependencias (tarifas, tickets, etc.)
        const tariffAssociations = await prisma.tariffProductPrice.count({ where: { productId: productId }});
        if (tariffAssociations > 0) {
            return NextResponse.json(
                { message: `No se puede eliminar el producto ${productId} porque está asociado a ${tariffAssociations} tarifa(s). Desvincúlelo primero.` },
                { status: 409 } // Conflict
            );
        }
        const ticketAssociations = await prisma.ticketItem.count({ where: { productId: productId }});
        if (ticketAssociations > 0) {
             return NextResponse.json(
                { message: `No se puede eliminar el producto ${productId} porque está incluido en ${ticketAssociations} ticket(s) existentes.` },
                { status: 409 } // Conflict
            );
        }
        
        // Eliminar usando where con id y systemId para doble verificación
        await prisma.product.delete({
            where: { id: productId, systemId: systemId },
        });
        return NextResponse.json({ message: `Producto ${productId} eliminado` }, { status: 200 });

    } catch (error) {
        console.error(`Error deleting product ${productId} for system ${systemId ?? 'UNKNOWN'}:`, error);
         if (error instanceof Prisma.PrismaClientKnownRequestError) {
            // P2025 no debería ocurrir aquí
            if (error.code === 'P2025') {
                 return NextResponse.json({ message: `Producto ${productId} no encontrado en este sistema` }, { status: 404 });
            }
            if (error.code === 'P2003'){ // Foreign key constraint failed
                 // Podría ser StockLedger u otra dependencia no verificada explícitamente
                 return NextResponse.json({ message: `No se puede eliminar el producto ${productId} debido a registros dependientes existentes (ej: historial de stock).` }, { status: 409 });
            }
        }
        return NextResponse.json({ message: 'Error interno del servidor al eliminar el producto' }, { status: 500 });
    } finally {
        await prisma.$disconnect();
    }
} 