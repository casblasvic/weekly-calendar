import { NextResponse } from 'next/server';
import { getServerAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { z } from 'zod';
import { Prisma, PaymentMethodType } from '@prisma/client'; // Importar tipos de Prisma si es necesario
import { clinicPaymentSettingFormSchema } from '@/lib/schemas/clinic-payment-setting';
import { ZodError } from 'zod';

// Esquema Zod para la validación de la actualización (PUT)
const clinicPaymentSettingUpdateSchema = z.object({
  isActiveInClinic: z.boolean().optional(),
  // Permitir null o string para la cuenta bancaria. Opcional.
  receivingBankAccountId: z.string().nullable().optional(), 
});

// Schema Zod para PATCH (permite actualizar campos parciales)
const clinicPaymentSettingPatchSchema = clinicPaymentSettingFormSchema.partial();

// GET - Obtener una configuración de pago de clínica específica por ID
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerAuthSession();
  if (!session || !session.user || !session.user.systemId) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }
  const systemId = session.user.systemId;
  const settingId = params.id;

  try {
    const setting = await prisma.clinicPaymentSetting.findUnique({
      where: {
        id: settingId,
        systemId: systemId, // Asegurar que pertenece al sistema del usuario
      },
      include: {
        paymentMethodDefinition: true,
        receivingBankAccount: true,
        posTerminal: { select: { id: true, name: true } },
        clinic: { select: { id: true, name: true } },
      },
    });

    if (!setting) {
      return NextResponse.json({ message: 'Clinic payment setting not found' }, { status: 404 });
    }

    return NextResponse.json(setting);
  } catch (error) {
    console.error("Error fetching clinic payment setting:", error);
    return NextResponse.json({ message: 'Error fetching clinic payment setting' }, { status: 500 });
  }
}

// PUT - Actualizar una configuración de pago de clínica específica por ID
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerAuthSession();
  if (!session || !session.user.systemId) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const settingId = params.id;
  if (!settingId) {
    return NextResponse.json({ error: 'ID de configuración no proporcionado' }, { status: 400 });
  }

  let data;
  try {
    data = await request.json();
  } catch (error) {
    return NextResponse.json({ error: 'Cuerpo de la solicitud inválido (no es JSON)' }, { status: 400 });
  }

  // Validar el cuerpo de la solicitud con Zod
  const validationResult = clinicPaymentSettingUpdateSchema.safeParse(data);
  if (!validationResult.success) {
    return NextResponse.json({ error: 'Datos de entrada inválidos', details: validationResult.error.flatten() }, { status: 400 });
  }

  const { isActiveInClinic, receivingBankAccountId } = validationResult.data;

  // Verificar que al menos un campo se esté actualizando
  if (isActiveInClinic === undefined && receivingBankAccountId === undefined) {
    return NextResponse.json({ error: 'No se proporcionaron campos para actualizar' }, { status: 400 });
  }
  
  try {
    // 1. Verificar que la configuración exista y pertenezca al sistema
    const existingSetting = await prisma.clinicPaymentSetting.findUnique({
      where: { id: settingId, systemId: session.user.systemId },
    });

    if (!existingSetting) {
      return NextResponse.json({ error: 'Configuración de pago no encontrada o no pertenece a este sistema' }, { status: 404 });
    }

    // 2. (Opcional pero recomendado) Si se proporciona receivingBankAccountId, verificar que la cuenta exista y pertenezca al mismo sistema
    if (receivingBankAccountId !== undefined && receivingBankAccountId !== null) {
      const bankAccountExists = await prisma.bankAccount.findFirst({
        where: {
          id: receivingBankAccountId,
          systemId: session.user.systemId,
        },
      });
      if (!bankAccountExists) {
        return NextResponse.json({ error: `La cuenta bancaria con ID ${receivingBankAccountId} no existe o no pertenece a este sistema.` }, { status: 400 });
      }
    }

    // 3. Construir el objeto de datos para la actualización
    const updateData: Prisma.ClinicPaymentSettingUpdateInput = {};
    if (isActiveInClinic !== undefined) {
      updateData.isActiveInClinic = isActiveInClinic;
    }
    if (receivingBankAccountId !== undefined) {
       // Permitir establecer a null
      updateData.receivingBankAccount = receivingBankAccountId === null 
        ? { disconnect: true } 
        : { connect: { id: receivingBankAccountId } };
    }


    // 4. Realizar la actualización
    const updatedSetting = await prisma.clinicPaymentSetting.update({
      where: { id: settingId },
      data: updateData,
    });

    return NextResponse.json(updatedSetting);
  } catch (error) {
     console.error(`[API] Error PUT /clinic-payment-settings/${settingId}:`, error);
     if (error instanceof Prisma.PrismaClientKnownRequestError) {
       // Manejar errores específicos de Prisma si es necesario (ej. FK constraint)
     }
     return NextResponse.json({ error: 'Error interno del servidor al actualizar la configuración' }, { status: 500 });
  }
}

// PATCH /api/clinic-payment-settings/[id]
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerAuthSession();
  if (!session || !session.user || !session.user.systemId) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }
  const systemId = session.user.systemId;
  const settingId = params.id;

  try {
    const body = await request.json();
    // Validar solo los campos proporcionados en el body
    const parsedData = clinicPaymentSettingPatchSchema.parse(body);

    // Obtener la configuración existente y el método de pago para validaciones
    const existingSetting = await prisma.clinicPaymentSetting.findUnique({
        where: { id: settingId, systemId: systemId },
        include: { paymentMethodDefinition: true }, // Necesitamos el tipo
    });

    if (!existingSetting) {
         return NextResponse.json({ message: 'Clinic payment setting not found' }, { status: 404 });
    }

    const methodType = existingSetting.paymentMethodDefinition.type;

    // --- Validaciones antes de la transacción ---

    // Verificar TPV si se proporciona ID
    if (parsedData.posTerminalId && parsedData.posTerminalId !== null) { // Check !== null
      const posTerminalCheck = await prisma.posTerminal.findFirst({
        where: { id: parsedData.posTerminalId, systemId: systemId },
      });
      if (!posTerminalCheck) {
        return NextResponse.json({ message: 'Invalid POS Terminal ID for this system' }, { status: 400 });
      }
    }
    
    // Verificar cuenta bancaria si se proporciona ID
    if (parsedData.receivingBankAccountId && parsedData.receivingBankAccountId !== null) { // Check !== null
      const accountCheck = await prisma.bankAccount.findFirst({
        where: { id: parsedData.receivingBankAccountId, systemId: systemId },
      });
      if (!accountCheck) {
        return NextResponse.json({ message: 'Invalid receiving bank account ID for this system' }, { status: 400 });
      }
    }

    // Si el tipo es CARD y se intenta quitar el TPV (poner a null) mientras está activo -> Error
    if (methodType === PaymentMethodType.CARD && 
        parsedData.posTerminalId === null && 
        (parsedData.isActiveInClinic ?? existingSetting.isActiveInClinic)) {
        return NextResponse.json({ 
            message: 'Cannot remove POS Terminal from an active CARD payment method setting.',
            errors: [{ path: ['posTerminalId'], message: 'No se puede quitar el TPV de una configuración activa de Tarjeta.' }] 
           }, { status: 400 });
    }

    // Si el tipo NO es CARD, forzar posTerminalId y isDefault a null/false si vienen en el payload
    if (methodType !== PaymentMethodType.CARD) {
        if (parsedData.posTerminalId !== undefined && parsedData.posTerminalId !== null) { // Also check !== null
             parsedData.posTerminalId = null;
             console.warn(`Attempted to set posTerminalId on non-CARD setting ${settingId}. Forcing to null.`);
        }
         if (parsedData.isDefaultPosTerminal !== undefined && parsedData.isDefaultPosTerminal !== false) { // Also check !== false
             parsedData.isDefaultPosTerminal = false;
             console.warn(`Attempted to set isDefaultPosTerminal on non-CARD setting ${settingId}. Forcing to false.`);
        }
    }
    
     // Si se intenta marcar como default TPV sin un TPV -> Error
    if (parsedData.isDefaultPosTerminal === true && !(parsedData.posTerminalId ?? existingSetting.posTerminalId)) {
       return NextResponse.json({ 
             message: 'Cannot set as default POS terminal without a terminal assigned.',
             errors: [{ path: ['isDefaultPosTerminal'], message: 'Debe haber un TPV asignado para marcarlo como predeterminado.' }]
            }, { status: 400 });
    }
    
    // <<< NUEVA VALIDACIÓN: Si se intenta marcar como default Cuenta sin una Cuenta -> Error >>>
    if (parsedData.isDefaultReceivingBankAccount === true && !(parsedData.receivingBankAccountId ?? existingSetting.receivingBankAccountId)) {
        return NextResponse.json({ 
              message: 'Cannot set as default receiving bank account without an account assigned.',
              errors: [{ path: ['isDefaultReceivingBankAccount'], message: 'Debe haber una cuenta bancaria asignada para marcarla como predeterminada.' }]
             }, { status: 400 });
    }
    
    // --- Fin Validaciones ---


    // Usar transacción para actualizar y manejar la lógica de los 'isDefault'
    const updatedSetting = await prisma.$transaction(async (tx) => {
      // 1a. Si se está marcando TPV como default, desmarcar los otros de la misma clínica
      // (No filtrar por paymentMethodDefinitionId, el TPV default es por clínica) 
      if (parsedData.isDefaultPosTerminal === true) {
        await tx.clinicPaymentSetting.updateMany({
          where: {
            clinicId: existingSetting.clinicId,
            // No filtrar por método de pago, el default TPV es por clínica
            id: { not: settingId }, // Excluir el que estamos actualizando
            isDefaultPosTerminal: true,
          },
          data: {
            isDefaultPosTerminal: false,
          },
        });
      }
      
      // <<< 1b. NUEVO: Si se está marcando Cuenta como default, desmarcar las otras de la misma clínica >>>
      if (parsedData.isDefaultReceivingBankAccount === true) {
        await tx.clinicPaymentSetting.updateMany({
          where: {
            clinicId: existingSetting.clinicId,
            id: { not: settingId }, // Excluir el que estamos actualizando
            isDefaultReceivingBankAccount: true,
          },
          data: {
            isDefaultReceivingBankAccount: false,
          },
        });
      }

      // 2. Preparar datos para la actualización
      const updatePayload: Prisma.ClinicPaymentSettingUpdateInput = {};
      if (parsedData.receivingBankAccountId !== undefined) {
          updatePayload.receivingBankAccount = parsedData.receivingBankAccountId === null 
              ? { disconnect: true } 
              : { connect: { id: parsedData.receivingBankAccountId } };
          // Si se desconecta la cuenta, forzar a no ser default
          if (parsedData.receivingBankAccountId === null) {
              updatePayload.isDefaultReceivingBankAccount = false;
          }
      }
      if (parsedData.posTerminalId !== undefined) {
          updatePayload.posTerminal = parsedData.posTerminalId === null 
              ? { disconnect: true } 
              : { connect: { id: parsedData.posTerminalId } };
           // Si se desconecta el TPV, forzar a no ser default
           if (parsedData.posTerminalId === null) {
              updatePayload.isDefaultPosTerminal = false;
           }
      }
      if (parsedData.isActiveInClinic !== undefined) {
          updatePayload.isActiveInClinic = parsedData.isActiveInClinic;
      }
      if (parsedData.isDefaultPosTerminal !== undefined) {
          // Solo permitir true si el tipo es CARD
          updatePayload.isDefaultPosTerminal = methodType === PaymentMethodType.CARD ? parsedData.isDefaultPosTerminal : false;
      }
      if (parsedData.isDefaultReceivingBankAccount !== undefined) {
          // <<< AÑADIDO >>>
          updatePayload.isDefaultReceivingBankAccount = parsedData.isDefaultReceivingBankAccount;
      }
      

      // 3. Actualizar la configuración
      const updated = await tx.clinicPaymentSetting.update({
        where: { id: settingId },
        data: updatePayload, // Usar el payload construido
        include: { // Devolver datos útiles para la UI
            paymentMethodDefinition: true,
            receivingBankAccount: true,
            clinic: { select: { id: true, name: true } },
            posTerminal: { select: { id: true, name: true } }
        },
      });
      return updated;
    });

    return NextResponse.json(updatedSetting);

  } catch (error) {
    console.error(`Error patching clinic payment setting ${settingId}:`, error);
    if (error instanceof ZodError) {
      return NextResponse.json({ message: 'Validation failed', errors: error.errors }, { status: 400 });
    }
    // Manejar otros errores específicos si es necesario
    return NextResponse.json({ message: 'Error updating clinic payment setting' }, { status: 500 });
  }
}

// DELETE /api/clinic-payment-settings/[id]
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerAuthSession();
  if (!session || !session.user || !session.user.systemId) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }
  const systemId = session.user.systemId;
  const settingId = params.id;

  try {
    // Verificar primero que el registro existe y pertenece al sistema
    const existingSetting = await prisma.clinicPaymentSetting.findUnique({
      where: { id: settingId, systemId: systemId },
    });

    if (!existingSetting) {
      return NextResponse.json({ message: 'Clinic payment setting not found' }, { status: 404 });
    }

    // Eliminar el registro
    await prisma.clinicPaymentSetting.delete({
      where: { id: settingId },
    });

    // Devolver éxito sin contenido o un mensaje simple
    // return new NextResponse(null, { status: 204 }); 
    return NextResponse.json({ message: 'Clinic payment setting deleted successfully' }, { status: 200 });


  } catch (error) {
    console.error("Error deleting clinic payment setting:", error);
     if (error instanceof Prisma.PrismaClientKnownRequestError) {
       // Ej: Error si hay dependencias que impiden borrar (FK constraint)
       if (error.code === 'P2003') { 
            return NextResponse.json({ message: 'Cannot delete this setting due to existing dependencies.' }, { status: 409 }); // Conflict
       }
        if (error.code === 'P2025') { // Record to delete does not exist.
             return NextResponse.json({ message: 'Clinic payment setting not found' }, { status: 404 });
        }
    }
    return NextResponse.json({ message: 'Error deleting clinic payment setting' }, { status: 500 });
  }
} 