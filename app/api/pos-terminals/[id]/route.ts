import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerAuthSession } from "@/lib/auth";
import { z } from "zod";
import { posTerminalFormSchema } from '@/lib/schemas/pos-terminal';

// Esquema de validación para actualizar un terminal POS
// const updatePosTerminalSchema = z.object({ ... });

// GET /api/pos-terminals/[id] - Obtener un terminal POS específico
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerAuthSession();

  if (!session?.user?.systemId) {
    return NextResponse.json({ error: 'Not authenticated or systemId missing' }, { status: 401 });
  }
  const systemId = session.user.systemId;

  try {
    const { id } = params;

    // Obtener el terminal POS con sus relaciones
    const posTerminal = await prisma.posTerminal.findUnique({
      where: {
        id: id,
        systemId,
      },
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
                name: true,
              }
            }
          }
        },
      },
    });

    // Si no existe o no pertenece al sistema del usuario
    if (!posTerminal) {
      return NextResponse.json(
        { error: "Terminal POS no encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json(posTerminal);
  } catch (error) {
    console.error("Error al obtener terminal POS:", error);
    return NextResponse.json(
      { error: "Error al procesar la solicitud" },
      { status: 500 }
    );
  }
}

// PUT /api/pos-terminals/[id] - Actualizar un terminal POS
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerAuthSession();

  if (!session?.user?.systemId) {
    return NextResponse.json({ error: 'Not authenticated or systemId missing' }, { status: 401 });
  }
  const systemId = session.user.systemId;

  try {
    const { id } = params;

    const body = await req.json();
    console.log("Received data for PUT:", body);

    const validation = posTerminalFormSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: validation.error.format() },
        { status: 400 }
      );
    }

    const validatedData = validation.data;
    console.log("Validated data for PUT:", validatedData);

    const existingPosTerminal = await prisma.posTerminal.findUnique({
      where: { id: id, systemId },
      include: { applicableClinics: true }
    });

    if (!existingPosTerminal) {
      return NextResponse.json(
        { error: "Terminal POS no encontrado" },
        { status: 404 }
      );
    }

    const bankAccount = await prisma.bankAccount.findUnique({
      where: { id: validatedData.bankAccountId, systemId },
    });

    if (!bankAccount) {
      return NextResponse.json(
        { error: "La cuenta bancaria especificada no existe o no pertenece a su sistema" },
        { status: 400 }
      );
    }

    const { applicableClinicIds = [], ...restOfData } = validatedData;

    const updatedTerminal = await prisma.posTerminal.update({
      where: { id: id },
      data: {
        name: restOfData.name,
        terminalIdProvider: restOfData.terminalIdProvider,
        provider: restOfData.provider,
        isActive: restOfData.isActive,
        isGlobal: restOfData.isGlobal,
        bankAccount: { connect: { id: restOfData.bankAccountId } },
      },
    });

    if (!restOfData.isGlobal) {
      const currentClinicIds = new Set(existingPosTerminal.applicableClinics.map(ac => ac.clinicId));
      const newClinicIds = new Set(applicableClinicIds);

      const clinicsToAdd = applicableClinicIds.filter(id => !currentClinicIds.has(id));
      const clinicsToRemove = Array.from(currentClinicIds).filter(id => !newClinicIds.has(id));

      if (clinicsToAdd.length > 0) {
        await prisma.posTerminalClinicScope.createMany({
          data: clinicsToAdd.map(clinicId => ({
            posTerminalId: id,
            clinicId: clinicId,
          })),
        });
        console.log("Added clinics:", clinicsToAdd);
      }

      if (clinicsToRemove.length > 0) {
        await prisma.posTerminalClinicScope.deleteMany({
          where: {
            posTerminalId: id,
            clinicId: { in: clinicsToRemove },
          },
        });
        console.log("Removed clinics:", clinicsToRemove);
      }

    } else {
      await prisma.posTerminalClinicScope.deleteMany({
        where: { posTerminalId: id },
      });
      console.log("Made global, removed specific clinics for:", id);
    }

    const finalUpdatedPosTerminal = await prisma.posTerminal.findUnique({
      where: { id: id },
      include: {
        bankAccount: { select: { id: true, accountName: true, iban: true, bank: { select: { id: true, name: true } } } },
        applicableClinics: { select: { clinic: { select: { id: true, name: true } } } }
      }
    });

    console.log("Final updated terminal:", finalUpdatedPosTerminal);
    return NextResponse.json(finalUpdatedPosTerminal);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Datos inválidos", details: error.format() },
        { status: 400 }
      );
    }

    console.error("Error al actualizar terminal POS:", error);
    return NextResponse.json(
      { error: "Error al procesar la solicitud" },
      { status: 500 }
    );
  }
}

// DELETE /api/pos-terminals/[id] - Eliminar un terminal POS
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerAuthSession();

  if (!session?.user?.systemId) {
    return NextResponse.json({ error: 'Not authenticated or systemId missing' }, { status: 401 });
  }
  const systemId = session.user.systemId;

  try {
    const { id } = params;

    // Verificar que el terminal existe y pertenece al sistema
    const posTerminal = await prisma.posTerminal.findUnique({
      where: {
        id: id,
        systemId,
      },
    });

    if (!posTerminal) {
      return NextResponse.json(
        { error: "Terminal POS no encontrado" },
        { status: 404 }
      );
    }

    // Verificar si el terminal está siendo usado en pagos
    const paymentsUsingTerminal = await prisma.payment.count({
      where: {
        posTerminalId: id,
      },
    });

    if (paymentsUsingTerminal > 0) {
      return NextResponse.json(
        {
          error: "No se puede eliminar este terminal porque está siendo utilizado en pagos",
        },
        { status: 400 }
      );
    }

    // Verificar si está siendo usado en ClinicPaymentSettings
    const settingsUsingTerminal = await prisma.clinicPaymentSetting.count({
      where: { posTerminalId: id },
    });

    if (settingsUsingTerminal > 0) {
       return NextResponse.json(
         { error: "No se puede eliminar este terminal porque está configurado en los métodos de pago de una clínica" },
         { status: 400 }
       );
    }

    // Eliminar relaciones en la tabla intermedia
    await prisma.posTerminalClinicScope.deleteMany({
      where: { posTerminalId: id },
    });
    console.log(`Deleted clinic scopes for terminal: ${id}`);

    // Eliminar el terminal POS
    await prisma.posTerminal.delete({
      where: {
        id: id,
      },
    });
    console.log(`Deleted POS terminal: ${id}`);

    return NextResponse.json(
      { message: "Terminal POS eliminado correctamente" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error al eliminar terminal POS:", error);
    return NextResponse.json(
      { error: "Error al procesar la solicitud" },
      { status: 500 }
    );
  }
} 