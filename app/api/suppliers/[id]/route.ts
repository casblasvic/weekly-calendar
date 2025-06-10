import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { getSystemId } from '@/lib/auth/getSystemId';

const prisma = new PrismaClient();

// Schema de validación para actualizar proveedores
const UpdateSupplierSchema = z.object({
  fiscalName: z.string().min(1, 'El nombre fiscal es requerido').optional(),
  taxId: z.string().min(1, 'El CIF/NIF es requerido').optional(),
  email: z.string().email('Email inválido').optional().nullable().or(z.literal('')),
  phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  postalCode: z.string().optional().nullable(),
  countryIsoCode: z.string().optional().nullable(),
  website: z.string().url('URL inválida').optional().nullable().or(z.literal('')),
  notes: z.string().optional().nullable(),
});

// GET - Obtener un proveedor específico
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const systemId = await getSystemId();
    if (!systemId) {
      return NextResponse.json({ error: 'Sistema no encontrado' }, { status: 400 });
    }

    const supplier = await prisma.company.findFirst({
      where: {
        id: params.id,
        systemId,
        // Verificar que tenga facturas de compra para considerarlo proveedor
        purchaseInvoices: {
          some: {}
        }
      },
      include: {
        purchaseInvoices: {
          orderBy: { issueDate: 'desc' },
          select: {
            id: true,
            invoiceNumber: true,
            issueDate: true,
            totalAmount: true,
            status: true,
          }
        },
        _count: {
          select: {
            purchaseInvoices: true,
          }
        }
      }
    });

    if (!supplier) {
      return NextResponse.json(
        { error: 'Proveedor no encontrado' },
        { status: 404 }
      );
    }

    // Formatear respuesta
    const formattedSupplier = {
      ...supplier,
      name: supplier.fiscalName, // Alias para compatibilidad
      vat: supplier.taxId, // Alias para compatibilidad
      isSupplier: true,
      isActive: true,
      totalPurchases: supplier._count.purchaseInvoices,
    };

    return NextResponse.json(formattedSupplier);
  } catch (error) {
    console.error('Error obteniendo proveedor:', error);
    return NextResponse.json(
      { error: 'Error obteniendo proveedor' },
      { status: 500 }
    );
  }
}

// PUT - Actualizar un proveedor
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const systemId = await getSystemId();
    if (!systemId) {
      return NextResponse.json({ error: 'Sistema no encontrado' }, { status: 400 });
    }

    const body = await request.json();
    const validatedData = UpdateSupplierSchema.parse(body);

    // Verificar que el proveedor existe y pertenece al sistema
    const existingSupplier = await prisma.company.findFirst({
      where: {
        id: params.id,
        systemId,
      }
    });

    if (!existingSupplier) {
      return NextResponse.json(
        { error: 'Proveedor no encontrado' },
        { status: 404 }
      );
    }

    // Si se está cambiando el CIF, verificar que no exista otro con el mismo
    if (validatedData.taxId && validatedData.taxId !== existingSupplier.taxId) {
      const duplicateTaxId = await prisma.company.findFirst({
        where: {
          taxId: validatedData.taxId,
          systemId,
          id: { not: params.id }
        }
      });

      if (duplicateTaxId) {
        return NextResponse.json(
          { error: 'Ya existe otra empresa con ese CIF' },
          { status: 400 }
        );
      }
    }

    // Actualizar el proveedor
    const updatedSupplier = await prisma.company.update({
      where: { id: params.id },
      data: validatedData,
      include: {
        purchaseInvoices: {
          orderBy: { issueDate: 'desc' },
          select: {
            id: true,
            invoiceNumber: true,
            issueDate: true,
            totalAmount: true,
            status: true,
          }
        },
        _count: {
          select: {
            purchaseInvoices: true,
          }
        }
      }
    });

    // Formatear respuesta
    const formattedSupplier = {
      ...updatedSupplier,
      name: updatedSupplier.fiscalName, // Alias para compatibilidad
      vat: updatedSupplier.taxId, // Alias para compatibilidad
      isSupplier: true,
      isActive: true,
      totalPurchases: updatedSupplier._count.purchaseInvoices,
    };

    return NextResponse.json(formattedSupplier);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Datos inválidos', detalles: error.errors },
        { status: 400 }
      );
    }
    console.error('Error actualizando proveedor:', error);
    return NextResponse.json(
      { error: 'Error actualizando proveedor' },
      { status: 500 }
    );
  }
}

// DELETE - Eliminar un proveedor
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const systemId = await getSystemId();
    if (!systemId) {
      return NextResponse.json({ error: 'Sistema no encontrado' }, { status: 400 });
    }

    // Verificar que el proveedor existe
    const supplier = await prisma.company.findFirst({
      where: {
        id: params.id,
        systemId,
      },
      include: {
        _count: {
          select: {
            purchaseInvoices: true,
          }
        }
      }
    });

    if (!supplier) {
      return NextResponse.json(
        { error: 'Proveedor no encontrado' },
        { status: 404 }
      );
    }

    // No permitir eliminar si tiene facturas o gastos asociados
    if (supplier._count.purchaseInvoices > 0) {
      return NextResponse.json(
        { 
          error: 'No se puede eliminar un proveedor con facturas asociadas',
          detalles: {
            facturas: supplier._count.purchaseInvoices,
          }
        },
        { status: 400 }
      );
    }

    // Eliminar el proveedor
    await prisma.company.delete({
      where: { id: params.id }
    });

    return NextResponse.json({ éxito: true });
  } catch (error) {
    console.error('Error eliminando proveedor:', error);
    return NextResponse.json(
      { error: 'Error eliminando proveedor' },
      { status: 500 }
    );
  }
}
