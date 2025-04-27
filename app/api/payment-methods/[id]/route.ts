import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db'; // Usar alias correcto
import { Prisma, PaymentMethodType } from '@prisma/client';
import { getServerAuthSession } from "@/lib/auth";
import { paymentMethodDefinitionFormSchema } from '@/lib/schemas/payment-method-definition';
import { z, ZodError } from 'zod';
import { id } from 'date-fns/locale';

// GET /api/payment-methods/[id]
export async function GET(
  request: Request, 
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerAuthSession();
    if (!session || !session.user || !session.user.systemId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    const systemId = session.user.systemId;
    
    const { id } = await params;

    if (!id) {
      return NextResponse.json({ message: 'Payment Method ID is required' }, { status: 400 });
    }

    const paymentMethod = await prisma.paymentMethodDefinition.findUnique({
      where: {
        id: id,
        systemId: systemId,
      },
    });

    if (!paymentMethod) {
      return NextResponse.json({ message: 'Payment Method not found or access denied' }, { status: 404 });
    }

    return NextResponse.json(paymentMethod);

  } catch (error) {
    console.error(`Error fetching payment method ${id}:`, error);
    return NextResponse.json({ message: 'Error fetching payment method' }, { status: 500 });
  }
}

// PUT /api/payment-methods/[id]
export async function PUT(
  request: Request, 
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerAuthSession();
    if (!session || !session.user || !session.user.systemId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    const systemId = session.user.systemId;

    const { id } = await params;

    if (!id) {
      return NextResponse.json({ message: 'Payment Method ID is required' }, { status: 400 });
    }

    const body = await request.json();
    const parsedData = paymentMethodDefinitionFormSchema.parse(body);

    const updatedPaymentMethod = await prisma.paymentMethodDefinition.update({
      where: {
        id: id,
        systemId: systemId, // Asegurar que solo se actualiza si pertenece al sistema
      },
      data: {
        name: parsedData.name,
        type: parsedData.type as PaymentMethodType,
        details: parsedData.details,
        isActive: parsedData.isActive,
        // systemId no se actualiza, ya está filtrado por el where
      },
    });

    return NextResponse.json(updatedPaymentMethod);

  } catch (error) {
    console.error(`Error updating payment method ${id}:`, error);
    if (error instanceof ZodError) {
      return NextResponse.json({ message: 'Validation failed', errors: error.errors }, { status: 400 });
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2025') {
        // Record to update not found
        return NextResponse.json({ message: 'Payment Method not found or access denied' }, { status: 404 });
      }
      if (error.code === 'P2002') {
        // Error de restricción única (probablemente el nombre ya existe para otro método en el mismo sistema)
        return NextResponse.json({ message: 'A payment method with this name already exists.' }, { status: 409 });
      }
    }
    return NextResponse.json({ message: 'Error updating payment method' }, { status: 500 });
  }
}

// DELETE /api/payment-methods/[id]
export async function DELETE(
  request: Request, 
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerAuthSession();
    if (!session || !session.user || !session.user.systemId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    const systemId = session.user.systemId;

    const { id } = await params;

    if (!id) {
      return NextResponse.json({ message: 'Payment Method ID is required' }, { status: 400 });
    }

    // Verificar que existe antes de borrar (opcional pero bueno para dar 404)
    const existingMethod = await prisma.paymentMethodDefinition.findUnique({
        where: { id: id, systemId: systemId }
    });
    if (!existingMethod) {
       return NextResponse.json({ message: 'Payment method not found' }, { status: 404 });
    }

    // TODO: Considerar qué hacer si tiene ClinicPaymentSettings asociados.
    // ¿Borrar en cascada? ¿Prevenir eliminación? Por ahora, permitimos.

    await prisma.paymentMethodDefinition.delete({
      where: { 
        id: id,
        systemId: systemId, // Asegurar que borramos el correcto
      },
    });

    return NextResponse.json({ message: 'Payment method deleted successfully' }, { status: 200 });

  } catch (error) {
    console.error(`Error deleting payment method ${id}:`, error);
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2025') {
        // Record to delete not found
        return NextResponse.json({ message: 'Payment Method not found or access denied' }, { status: 404 });
      }
      // Podrían haber otras restricciones, ej: P2003 (foreign key constraint) si está en uso
      if (error.code === 'P2003') {
         return NextResponse.json({ message: 'Cannot delete payment method as it is currently in use.' }, { status: 409 }); // 409 Conflict
      }
    }
    return NextResponse.json({ message: 'Error deleting payment method' }, { status: 500 });
  }
} 