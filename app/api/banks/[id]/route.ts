import { NextResponse } from 'next/server';
import { getServerAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { z } from 'zod'; // z puede ser útil para validar params si es necesario
import { Prisma } from '@prisma/client'; // <<< Importar Prisma
import { bankFormSchema } from '@/lib/schemas/bank'; // <<< Importar schema Zod

// Handler para GET /api/banks/[id]
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
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
    });

    if (!bank) {
      return NextResponse.json(
        { message: `Banco con ID ${bankId} no encontrado o no pertenece a este sistema.` },
        { status: 404 }
      );
    }

    return NextResponse.json(bank);

  } catch (error) {
    console.error(`[API Banks GET /${params.id}] Error:`, error);
    return NextResponse.json(
      { message: 'Error interno del servidor al obtener el banco.' },
      { status: 500 }
    );
  }
}

// Handler para PUT /api/banks/[id] (Funciona como PATCH)
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerAuthSession();
    if (!session?.user?.systemId) {
      return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
    }
    const systemId = session.user.systemId;
    const { id: bankId } = params;

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

      return bank; // Devolver el banco actualizado
    });

    return NextResponse.json(updatedBank);

  } catch (error) {
    console.error(`[API Banks PUT /${params.id}] Error:`, error);
    
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        return NextResponse.json(
          { message: 'Ya existe un banco con este nombre en el sistema.' },
          { status: 409 } // Conflict
        );
      }
      if (error.code === 'P2025') {
        // Puede ocurrir si el banco no existe, o si el countryIsoCode o clinicId no existen
        return NextResponse.json(
          { message: `Error al actualizar: Banco con ID ${params.id} no encontrado, o país/clínica referenciada inválida.` },
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
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerAuthSession();
    if (!session?.user?.systemId) {
      return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
    }
    const systemId = session.user.systemId;
    const { id: bankId } = params;

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
    console.error(`[API Banks DELETE /${params.id}] Error:`, error);

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2025') {
        // Error porque el where (id + systemId) no encontró el registro
        return NextResponse.json(
          { message: `Banco con ID ${params.id} no encontrado o no pertenece a este sistema para eliminar.` },
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