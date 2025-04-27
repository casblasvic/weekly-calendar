import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { Prisma, PaymentMethodType } from '@prisma/client';
import { getServerAuthSession } from "@/lib/auth";
import { clinicPaymentSettingFormSchema } from '@/lib/schemas/clinic-payment-setting';
import { ZodError } from 'zod';

// GET /api/clinic-payment-settings?clinicId=...
export async function GET(request: Request) {
  const session = await getServerAuthSession();
  if (!session || !session.user || !session.user.systemId) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }
  const systemId = session.user.systemId;

  const { searchParams } = new URL(request.url);
  const clinicId = searchParams.get('clinicId');
  const isActiveInClinicParam = searchParams.get('isActiveInClinic');
  const paymentMethodDefinitionId = searchParams.get('paymentMethodDefinitionId');

  let isActiveFilter: boolean | undefined = undefined;
  if (isActiveInClinicParam === 'true') {
    isActiveFilter = true;
  } else if (isActiveInClinicParam === 'false') {
    isActiveFilter = false;
  }

  try {
    const settings = await prisma.clinicPaymentSetting.findMany({
      where: {
        systemId: systemId,
        ...(clinicId && { clinicId: clinicId }),
        ...(isActiveFilter !== undefined && { isActiveInClinic: isActiveFilter }),
        ...(paymentMethodDefinitionId && { paymentMethodDefinitionId: paymentMethodDefinitionId }),
      },
      include: {
        paymentMethodDefinition: true,
        receivingBankAccount: true,
        clinic: {
          select: { id: true, name: true }
        },
        posTerminal: {
          select: { id: true, name: true }
        }
      },
      orderBy: {
        paymentMethodDefinition: {
          name: 'asc'
        }
      }
    });

    return NextResponse.json(settings);

  } catch (error) {
    console.error("Error fetching clinic payment settings:", error);
    return NextResponse.json({ message: 'Error fetching clinic payment settings' }, { status: 500 });
  }
}

// POST /api/clinic-payment-settings
export async function POST(request: Request) {
  const session = await getServerAuthSession();
  if (!session || !session.user || !session.user.systemId) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }
  const systemId = session.user.systemId;

  try {
    const body = await request.json();
    const parsedData = clinicPaymentSettingFormSchema.parse(body);

    const [clinicCheck, methodCheck, posTerminalCheck, accountCheck] = await Promise.all([
        prisma.clinic.findFirst({ 
            where: { id: parsedData.clinicId, systemId: systemId }
        }),
        prisma.paymentMethodDefinition.findFirst({ 
            where: { id: parsedData.paymentMethodDefinitionId, systemId: systemId }
        }),
        parsedData.posTerminalId ? prisma.posTerminal.findFirst({ 
            where: { id: parsedData.posTerminalId, systemId: systemId }
        }) : Promise.resolve(null),
        parsedData.receivingBankAccountId ? prisma.bankAccount.findFirst({ 
            where: { id: parsedData.receivingBankAccountId, systemId: systemId }
        }) : Promise.resolve(null)
    ]);

    if (!clinicCheck || !methodCheck) {
        return NextResponse.json({ message: 'Invalid clinic or payment method ID for this system' }, { status: 400 });
    }
    if (parsedData.posTerminalId && !posTerminalCheck) {
        return NextResponse.json({ message: 'Invalid POS Terminal ID for this system' }, { status: 400 });
    }
    if (parsedData.receivingBankAccountId && !accountCheck) {
        return NextResponse.json({ message: 'Invalid receiving bank account ID for this system' }, { status: 400 });
   }
    
    if (methodCheck.type === PaymentMethodType.CARD && !parsedData.posTerminalId) {
         return NextResponse.json({ 
             message: 'POS Terminal is required for payment methods of type CARD.', 
             errors: [{ path: ['posTerminalId'], message: 'POS Terminal es obligatorio para métodos de pago tipo Tarjeta.' }] 
            }, { status: 400 });
    }
    if (methodCheck.type !== PaymentMethodType.CARD) {
        if (parsedData.posTerminalId) {
            parsedData.posTerminalId = null;
            console.warn(`posTerminalId provided for non-CARD payment method ${methodCheck.name}. Forcing to null.`);
        }
        if (parsedData.isDefaultPosTerminal) {
            parsedData.isDefaultPosTerminal = false;
            console.warn(`isDefaultPosTerminal set for non-CARD payment method ${methodCheck.name}. Forcing to false.`);
        }
    }
    if (parsedData.isDefaultPosTerminal === true && !parsedData.posTerminalId) {
         return NextResponse.json({ 
             message: 'Cannot set as default POS terminal without selecting a terminal.',
             errors: [{ path: ['isDefaultPosTerminal'], message: 'Debe seleccionar un TPV para marcarlo como predeterminado.' }]
            }, { status: 400 });
    }
    
    if (parsedData.isDefaultReceivingBankAccount === true && !parsedData.receivingBankAccountId) {
        return NextResponse.json({ 
            message: 'Cannot set as default receiving bank account without selecting an account.',
            errors: [{ path: ['isDefaultReceivingBankAccount'], message: 'Debe seleccionar una cuenta bancaria para marcarla como predeterminada.' }]
           }, { status: 400 });
    }

    const newSetting = await prisma.$transaction(async (tx) => {
        if (parsedData.isDefaultPosTerminal === true) {
            await tx.clinicPaymentSetting.updateMany({
                where: {
                    clinicId: parsedData.clinicId,
                    isDefaultPosTerminal: true,
                },
                data: {
                    isDefaultPosTerminal: false,
                },
            });
        }
        
        if (parsedData.isDefaultReceivingBankAccount === true) {
            await tx.clinicPaymentSetting.updateMany({
                where: {
                    clinicId: parsedData.clinicId,
                    isDefaultReceivingBankAccount: true,
                },
                data: {
                    isDefaultReceivingBankAccount: false,
                },
            });
        }

        const created = await tx.clinicPaymentSetting.create({
            data: {
                systemId: systemId,
                clinicId: parsedData.clinicId,
                paymentMethodDefinitionId: parsedData.paymentMethodDefinitionId,
                receivingBankAccountId: parsedData.receivingBankAccountId,
                posTerminalId: parsedData.posTerminalId,
                isDefaultPosTerminal: methodCheck.type === PaymentMethodType.CARD ? parsedData.isDefaultPosTerminal : false,
                isDefaultReceivingBankAccount: parsedData.isDefaultReceivingBankAccount,
                isActiveInClinic: parsedData.isActiveInClinic,
            },
            include: {
                paymentMethodDefinition: true,
                receivingBankAccount: true,
                clinic: { select: { id: true, name: true } },
                posTerminal: { select: { id: true, name: true } }
            },
        });
        return created;
    });

    return NextResponse.json(newSetting, { status: 201 });

  } catch (error) {
    console.error("Error creating clinic payment setting:", error);
    if (error instanceof ZodError) {
      return NextResponse.json({ message: 'Validation failed', errors: error.errors }, { status: 400 });
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
       if (error.code === 'P2002') {
           const isUniqueConstraintViolation = error.message.includes('clinicId_paymentMethodDefinitionId');
           if (isUniqueConstraintViolation) {
               return NextResponse.json({ message: 'Este método de pago ya está configurado para esta clínica.' }, { status: 409 });
           } else {
               return NextResponse.json({ message: 'Error de restricción única al crear la configuración.' }, { status: 409 });
           }
       }
    }
    return NextResponse.json({ message: 'Error creating clinic payment setting' }, { status: 500 });
  }
} 