'use server';

import { NextResponse } from 'next/server';
import { getServerAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { z } from 'zod';

// Schema para validar el cuerpo de la petición
const toggleActiveSchema = z.object({
  id: z.string().min(1, "El ID es obligatorio"),
  isActive: z.boolean()
});

export async function POST(request: Request) {
  try {
    // Verificar autenticación
    const session = await getServerAuthSession();
    if (!session?.user?.systemId) {
      return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
    }
    const systemId = session.user.systemId;

    // Obtener y validar los datos del cuerpo
    const body = await request.json();
    const validationResult = toggleActiveSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        { message: 'Datos inválidos', errors: validationResult.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { id, isActive } = validationResult.data;

    // Verificar si la cuenta bancaria existe y pertenece al sistema
    const existingAccount = await prisma.bankAccount.findUnique({
      where: {
        id: id,
        systemId: systemId,
      },
    });

    if (!existingAccount) {
      return NextResponse.json(
        { message: 'Cuenta bancaria no encontrada o no pertenece a este sistema' },
        { status: 404 }
      );
    }

    // Actualizar solo el campo isActive
    const updatedAccount = await prisma.bankAccount.update({
      where: { id: id },
      data: { isActive: isActive },
      select: {
        id: true,
        accountName: true,
        isActive: true
      }
    });

    return NextResponse.json({
      message: `Cuenta bancaria ${isActive ? 'activada' : 'desactivada'} correctamente`,
      account: updatedAccount
    });
  } catch (error) {
    console.error('[API Toggle BankAccount Active] Error:', error);
    return NextResponse.json(
      { message: 'Error interno del servidor al cambiar el estado de la cuenta bancaria.' },
      { status: 500 }
    );
  }
} 