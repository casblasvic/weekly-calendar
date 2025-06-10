import { NextRequest, NextResponse } from 'next/server';
import { getServerAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { bankFormSchema } from '@/lib/schemas/bank';
import { Prisma } from '@prisma/client';
import { getRemappingService } from '@/lib/accounting/remapping-service';

// Handler para GET /api/banks/[id]
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerAuthSession();
    if (!session?.user?.systemId) {
      return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
    }
    const systemId = session.user.systemId;
    const { id: bankId } = await params;

    if (!bankId) {
        return NextResponse.json({ message: 'ID de banco no proporcionado.' }, { status: 400 });
    }

    const bank = await prisma.bank.findUnique({
      where: {
        id: bankId,
        systemId: systemId, // Asegurar pertenencia al sistema
      },
      include: {
        country: true,
        account: true,
        applicableClinics: {
          include: {
            clinic: true
          }
        },
        bankAccounts: {
          include: {
            applicableClinics: {
              include: {
                clinic: true
              }
            }
          }
        }
      }
    });

    if (!bank) {
      return NextResponse.json(
        { message: `Banco con ID ${bankId} no encontrado o no pertenece a este sistema.` },
        { status: 404 }
      );
    }

    return NextResponse.json(bank);

  } catch (error) {
    const { id } = await params;
    console.error(`[API Banks GET /${id}] Error:`, error);
    return NextResponse.json(
      { message: 'Error interno del servidor al obtener el banco.' },
      { status: 500 }
    );
  }
}

// Handler para PUT /api/banks/[id] (Funciona como PATCH)
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerAuthSession();
    if (!session?.user?.systemId) {
      return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
    }
    const systemId = session.user.systemId;
    const { id: bankId } = await params;

    if (!bankId) {
      return NextResponse.json({ message: 'ID de banco no proporcionado.' }, { status: 400 });
    }

    // Validar Body con Zod
    const json = await request.json();
    const validation = bankFormSchema.safeParse(json);

    if (!validation.success) {
      return NextResponse.json(
        { message: 'Datos inválidos', errors: validation.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    // Desestructurar datos validados
    const { 
      applicableClinicIds,
      countryIsoCode,
      ...restOfBankData // Campos escalares (name, code, phone, email, address, isGlobal)
    } = validation.data;

    // Actualizar banco y su alcance en una transacción
    const updatedBank = await prisma.$transaction(async (tx) => {
      
      // Construir objeto de datos para actualizar campos escalares y relaciones
      const dataToUpdate: Prisma.BankUpdateInput = {
        ...restOfBankData, // Incluye name, code, phone, email, address, isGlobal, etc.
        // Actualizar relación con país
        country: countryIsoCode 
          ? { connect: { isoCode: countryIsoCode } } 
          : { disconnect: true }, // Desconectar si no se proporciona countryIsoCode
      };

      // Obtener estado previo del banco para comparación
      const previousBank = await tx.bank.findUnique({
        where: {
          id: bankId,
          systemId: systemId,
        },
        include: {
          applicableClinics: true
        }
      });

      // 1. Actualizar los datos del banco
      const bank = await tx.bank.update({
      where: {
        id: bankId,
          systemId: systemId, // Asegurar pertenencia al sistema
      },
        data: dataToUpdate,
      });

      // 2. Eliminar relaciones de alcance existentes para este banco
      await tx.bankClinicScope.deleteMany({
        where: { bankId: bankId },
    });

      // 3. Si NO es global y hay clínicas seleccionadas, crear nuevas relaciones de alcance
      if (!bank.isGlobal && applicableClinicIds && applicableClinicIds.length > 0) {
        await tx.bankClinicScope.createMany({
          data: applicableClinicIds.map(clinicId => ({
            bankId: bankId,
            clinicId: clinicId,
          })),
          skipDuplicates: true, // Por si acaso, aunque deleteMany debería haber limpiado
        });
      }

      return { bank, previousBank }; // Devolver el banco actualizado y el estado previo
    });

    // Ejecutar remapeo si cambió el alcance del banco
    const remappingService = getRemappingService(prisma);
    
    // Detectar si hubo cambios en el alcance
    const clinicsChanged = 
      updatedBank.previousBank?.applicableClinics.length !== applicableClinicIds?.length ||
      updatedBank.previousBank?.isGlobal !== updatedBank.bank.isGlobal;
    
    if (clinicsChanged) {
      const remappingResult = await remappingService.executeRemapping({
        entityType: 'bank',
        entityId: bankId,
        changeType: updatedBank.bank.isGlobal !== updatedBank.previousBank?.isGlobal ? 'globalStatus' : 'clinicAssignment',
        previousState: {
          isGlobal: updatedBank.previousBank?.isGlobal,
          clinicIds: updatedBank.previousBank?.applicableClinics.map(ac => ac.clinicId)
        },
        newState: {
          isGlobal: updatedBank.bank.isGlobal,
          clinicIds: applicableClinicIds
        },
        systemId: systemId,
        userId: session.user.id
      });

      // Log del resultado del remapeo
      if (!remappingResult.success) {
        console.warn('[Bank Update] Remapping warnings:', remappingResult.warnings);
      }
      
      if (remappingResult.changes.length > 0) {
        console.log('[Bank Update] Remapping changes:', remappingResult.changes);
      }
    }

    return NextResponse.json(updatedBank.bank);

  } catch (error) {
    const { id } = await params;
    console.error(`[API Banks PUT /${id}] Error:`, error);
    
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        return NextResponse.json(
          { message: 'Ya existe un banco con este nombre en el sistema.' },
          { status: 409 } // Conflict
        );
      }
      if (error.code === 'P2025') {
        // Puede ocurrir si el banco no existe, o si el countryIsoCode o clinicId no existen
        const { id } = await params;
        return NextResponse.json(
          { message: `Error al actualizar: Banco con ID ${id} no encontrado, o país/clínica referenciada inválida.` },
          { status: 404 }
        );
      }
    }

    return NextResponse.json(
      { message: 'Error interno del servidor al actualizar el banco.' },
      { status: 500 }
    );
  }
}

// Handler para DELETE /api/banks/[id] (Sin cambios necesarios por ahora)
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerAuthSession();
    if (!session?.user?.systemId) {
      return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
    }
    const systemId = session.user.systemId;
    const { id: bankId } = await params;

    if (!bankId) {
      return NextResponse.json({ message: 'ID de banco no proporcionado.' }, { status: 400 });
    }

    // *** IMPORTANTE: La lógica actual intenta eliminar manualmente TPVs y Cuentas ***
    // *** PERO Prisma con `onDelete: Cascade` en BankAccount lo hará automáticamente ***
    // *** Y la eliminación de TPVs debería estar ligada a BankAccount, no a Bank directamente ***
    // *** VAMOS A SIMPLIFICAR USANDO EL BORRADO EN CASCADA DE PRISMA ***

    // Intentar eliminar el banco directamente. Prisma manejará las cascadas definidas.
    const deletedBank = await prisma.bank.delete({
      where: {
        id: bankId,
         systemId: systemId, // Asegurar pertenencia al sistema
      },
    });

    // Si llega aquí, se eliminó correctamente (incluyendo cascadas)
    return NextResponse.json({ message: 'Banco eliminado correctamente.' }, { status: 200 });

  } catch (error) {
    const { id } = await params;
    console.error(`[API Banks DELETE /${id}] Error:`, error);

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2025') {
        // Error porque el where (id + systemId) no encontró el registro
        const { id } = await params;
        return NextResponse.json(
          { message: `Banco con ID ${id} no encontrado o no pertenece a este sistema para eliminar.` },
          { status: 404 }
        );
      }
       // Podrían ocurrir errores P2003 (Foreign key constraint) si alguna relación 
       // relacionada NO tiene onDelete: Cascade y aún existen registros apuntando al banco.
       // Por ahora, asumimos que las cascadas están bien definidas para BankAccount y BankClinicScope.
      if (error.code === 'P2003') {
        return NextResponse.json(
           { message: 'No se puede eliminar el banco porque tiene relaciones activas (ej. TPVs asociados a sus cuentas?).' },
          { status: 409 } // Conflict
        );
      }
    }

    return NextResponse.json(
      { message: 'Error interno del servidor al eliminar el banco.' },
      { status: 500 }
    );
  }
} 