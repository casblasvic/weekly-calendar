'use server';

import { NextResponse } from 'next/server';
import { getServerAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { posTerminalFormSchema } from '@/lib/schemas/pos-terminal';
import { Prisma } from '@prisma/client';
import { z } from 'zod';

// GET /api/pos-terminals - Obtener todos los terminales POS
export async function GET(request: Request) {
  try {
    // Verificar sesión y obtener systemId
    const session = await getServerAuthSession();
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    const systemId = session.user.systemId;

    // Obtener parámetros de query
    const { searchParams } = new URL(request.url);
    const bankId = searchParams.get('bankId');

    // Construir condición where
    let whereCondition: Prisma.PosTerminalWhereInput = { systemId };

    // Si se proporciona bankId, filtrar por las cuentas bancarias de ese banco
    if (bankId) {
      // Primero obtenemos todas las cuentas del banco
      const bankAccounts = await prisma.bankAccount.findMany({
        where: {
          bankId: bankId,
          systemId: systemId
        },
        select: {
          id: true
        }
      });

      // Extraemos los IDs de las cuentas
      const bankAccountIds = bankAccounts.map(account => account.id);

      // Añadimos el filtro por bankAccountId
      whereCondition.bankAccountId = {
        in: bankAccountIds
      };
    }

    // Obtener terminales con información relacionada
    const posTerminals = await prisma.posTerminal.findMany({
      where: whereCondition,
      include: {
        bankAccount: {
          select: {
            id: true,
            accountName: true,
            iban: true,
            bank: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        applicableClinics: {
          select: {
            clinic: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json(posTerminals);
  } catch (error) {
    console.error("Error al obtener terminales POS:", error);
    return NextResponse.json(
      { error: "Error al procesar la solicitud" },
      { status: 500 }
    );
  }
}

// POST /api/pos-terminals - Crear un nuevo terminal POS
export async function POST(request: Request) {
  try {
    // Verificar sesión y obtener systemId
    const session = await getServerAuthSession();
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    const systemId = session.user.systemId;

    // Obtener y validar los datos usando el schema importado
    const data = await request.json();
    const validatedData = posTerminalFormSchema.parse(data);

    // Verificar que la cuenta bancaria pertenece al mismo sistema
    const bankAccount = await prisma.bankAccount.findUnique({
      where: { 
        id: validatedData.bankAccountId,
        systemId
      },
    });

    if (!bankAccount) {
      return NextResponse.json(
        { error: "La cuenta bancaria especificada no existe o no pertenece a su sistema." },
        { status: 400 }
      );
    }
    
    // <<< --- Lógica de Creación con Ámbito --- >>>
    let newPosTerminal;
    try {
      newPosTerminal = await prisma.$transaction(async (tx) => {
        // 1. Crear el terminal POS principal
        const terminal = await tx.posTerminal.create({
          data: {
            name: validatedData.name,
            terminalIdProvider: validatedData.terminalIdProvider,
            provider: validatedData.provider,
            isActive: validatedData.isActive,
            isGlobal: validatedData.isGlobal,
            system: { connect: { id: systemId } },
            bankAccount: { connect: { id: validatedData.bankAccountId } },
          },
          select: { 
            id: true, 
            name: true,
            terminalIdProvider: true,
            provider: true,
            isActive: true,
            isGlobal: true,
            bankAccountId: true,
            bankAccount: {
                select: {
                    id: true,
                    accountName: true,
                    iban: true,
                    bank: { select: { id: true, name: true } }
                }
            }
          }
        });

        // 2. Si NO es global y hay clínicas, crear las asociaciones
        if (!validatedData.isGlobal && validatedData.applicableClinicIds && validatedData.applicableClinicIds.length > 0) {
          // Validar que todas las clínicas pertenecen al sistema
          const clinicsToLink = await tx.clinic.findMany({
            where: {
              id: { in: validatedData.applicableClinicIds },
              systemId: systemId,
            },
            select: { id: true }
          });

          // Comparar si todos los IDs solicitados existen en el sistema
          if (clinicsToLink.length !== validatedData.applicableClinicIds.length) {
            throw new Error("Una o más clínicas especificadas no son válidas o no pertenecen a su sistema.");
          }

          // Crear las relaciones en PosTerminalClinicScope
          await tx.posTerminalClinicScope.createMany({
            data: validatedData.applicableClinicIds.map((clinicId) => ({
              posTerminalId: terminal.id,
              clinicId: clinicId,
            })),
          });
        }

        // Devolver el terminal creado (o una versión extendida si es necesario)
        return terminal;
      });

       // Volver a buscar el terminal con las clínicas incluidas para la respuesta completa
       const finalPosTerminal = await prisma.posTerminal.findUnique({
        where: { id: newPosTerminal.id },
        include: {
          bankAccount: { select: { id: true, accountName: true, iban: true, bank: { select: { id: true, name: true } } } },
          applicableClinics: { select: { clinic: { select: { id: true, name: true } } } }
        }
      });

      return NextResponse.json(finalPosTerminal, { status: 201 });

    } catch (transactionError) {
        // Manejo específico de errores de transacción (ej., clínicas inválidas)
        console.error("Error en transacción al crear TPV:", transactionError);
        return NextResponse.json(
          { error: transactionError instanceof Error ? transactionError.message : "Error al crear las asociaciones del terminal." },
          { status: 400 }
        );
    }
    // <<< --- Fin Lógica de Creación con Ámbito --- >>>

  } catch (error) {
    if (error instanceof z.ZodError) {
      // Error de validación Zod
      return NextResponse.json(
        { error: "Datos inválidos", details: error.format() },
        { status: 400 }
      );
    }
    
    // Otros errores inesperados
    console.error("Error al crear terminal POS:", error);
    return NextResponse.json(
      { error: "Error interno del servidor al procesar la solicitud" },
      { status: 500 }
    );
  }
} 