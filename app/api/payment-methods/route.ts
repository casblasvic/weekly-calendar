import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db'; // Usar la ruta con alias correcta
import { Prisma, PaymentMethodType } from '@prisma/client';
import { getServerAuthSession } from "@/lib/auth";
import { paymentMethodDefinitionFormSchema } from '@/lib/schemas/payment-method-definition'; // Usar el schema Zod simplificado
import { ZodError } from 'zod';

// GET /api/payment-methods
export async function GET(request: Request) {
  const session = await getServerAuthSession();
  if (!session || !session.user || !session.user.systemId) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }
  const systemId = session.user.systemId;

  try {
    // Seleccionamos solo los campos necesarios para el modal y evitamos _count pesado
    const paymentMethods = await prisma.paymentMethodDefinition.findMany({
      where: {
        systemId,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        code: true,
        type: true,
      },
      orderBy: {
        name: 'asc',
      },
    });

    return NextResponse.json(paymentMethods);

  } catch (error) {
    console.error("Error fetching payment method definitions:", error);
    return NextResponse.json({ message: 'Error fetching payment method definitions' }, { status: 500 });
  }
}

// POST /api/payment-methods
export async function POST(request: Request) {
  const session = await getServerAuthSession();
  if (!session || !session.user || !session.user.systemId) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }
  const systemId = session.user.systemId;

  try {
    const body = await request.json();
    // Usar el schema Zod simplificado para validar
    const parsedData = paymentMethodDefinitionFormSchema.parse(body);

    const newPaymentMethod = await prisma.paymentMethodDefinition.create({
      data: {
        systemId: systemId,
        name: parsedData.name,
        type: parsedData.type as PaymentMethodType,
        details: parsedData.details,
        isActive: parsedData.isActive,
        // No hay clinicId ni bankAccountId aquí
      },
    });

    return NextResponse.json(newPaymentMethod, { status: 201 });

  } catch (error) {
    console.error("Error creating payment method definition:", error);
    if (error instanceof ZodError) {
      return NextResponse.json({ message: 'Validation failed', errors: error.errors }, { status: 400 });
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
       if (error.code === 'P2002') {
           // Error de restricción única (name + systemId)
           return NextResponse.json({ message: 'A payment method with this name already exists.' }, { status: 409 });
       }
    }
    return NextResponse.json({ message: 'Error creating payment method definition' }, { status: 500 });
  }
} 