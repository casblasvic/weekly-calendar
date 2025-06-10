import { NextResponse, NextRequest } from 'next/server';
import { getServerAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { z } from 'zod';

// Schema para crear/actualizar banco
const bankSchema = z.object({
  name: z.string().min(1, "El nombre es requerido"),
  code: z.string().optional(),
  phone: z.string().optional(),
  phone1CountryIsoCode: z.string().optional(),
  phone2: z.string().optional(),
  phone2CountryIsoCode: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  address: z.string().optional(),
  isGlobal: z.boolean().default(true),
  countryIsoCode: z.string().optional(),
  accountId: z.string().optional().nullable(),
  applicableClinics: z.array(z.string()).optional() // IDs de clínicas
});

// GET - Obtener todos los bancos
export async function GET(request: NextRequest) {
  try {
    const session = await getServerAuthSession();
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const systemId = searchParams.get('systemId');

    if (!systemId) {
      return NextResponse.json({ error: 'System ID es requerido' }, { status: 400 });
    }

    const banks = await prisma.bank.findMany({
      where: {
        systemId
      },
      include: {
        account: true,
        applicableClinics: {
          include: {
            clinic: true
          }
        },
        paymentMethods: true,
        _count: {
          select: {
            bankAccounts: true,
            paymentMethods: true
          }
        }
      },
      orderBy: {
        name: 'asc'
      }
    });

    return NextResponse.json(banks);
  } catch (error) {
    console.error('Error fetching banks:', error);
    return NextResponse.json(
      { error: 'Error al obtener bancos' }, 
      { status: 500 }
    );
  }
}

// POST - Crear nuevo banco
export async function POST(request: NextRequest) {
  try {
    const session = await getServerAuthSession();
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    
    // Obtener systemId del body
    const systemId = body.systemId as string;
    if (!systemId) {
      return NextResponse.json({ error: 'System ID es requerido' }, { status: 400 });
    }

    // Validar datos
    const validationResult = bankSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const { applicableClinics, ...bankData } = validationResult.data;

    // Crear banco sin relaciones anidadas
    const bank = await prisma.bank.create({
      data: {
        name: bankData.name,
        code: bankData.code || null,
        phone: bankData.phone || null,
        phone1CountryIsoCode: bankData.phone1CountryIsoCode || null,
        phone2: bankData.phone2 || null,
        phone2CountryIsoCode: bankData.phone2CountryIsoCode || null,
        email: bankData.email || null,
        address: bankData.address || null,
        isGlobal: bankData.isGlobal ?? true,
        systemId,
        countryIsoCode: bankData.countryIsoCode || null,
        accountId: bankData.accountId || null
      }
    });

    // Si hay clínicas aplicables, crear las relaciones
    if (applicableClinics?.length) {
      await prisma.bankClinicScope.createMany({
        data: applicableClinics.map(clinicId => ({
          bankId: bank.id,
          clinicId
        }))
      });
    }

    // Obtener el banco con todas las relaciones
    const bankWithRelations = await prisma.bank.findUnique({
      where: { id: bank.id },
      include: {
        account: true,
        applicableClinics: {
          include: {
            clinic: true
          }
        }
      }
    });

    return NextResponse.json(bankWithRelations);
  } catch (error) {
    console.error('Error creating bank:', error);
    return NextResponse.json(
      { error: 'Error al crear banco' }, 
      { status: 500 }
    );
  }
}

// PUT - Actualizar banco
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerAuthSession();
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { id, systemId, ...updateData } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID es requerido' }, { status: 400 });
    }

    // Validar datos
    const validationResult = bankSchema.safeParse(updateData);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const { applicableClinics, ...bankData } = validationResult.data;

    // Actualizar banco
    const bank = await prisma.$transaction(async (tx) => {
      // Primero eliminar relaciones de clínicas existentes si hay nuevas
      if (applicableClinics !== undefined) {
        await tx.bankClinicScope.deleteMany({
          where: { bankId: id }
        });
      }

      // Actualizar banco
      return await tx.bank.update({
        where: { id },
        data: {
          ...bankData,
          applicableClinics: applicableClinics?.length ? {
            create: applicableClinics.map(clinicId => ({
              clinicId
            }))
          } : undefined
        },
        include: {
          account: true,
          applicableClinics: {
            include: {
              clinic: true
            }
          }
        }
      });
    });

    return NextResponse.json(bank);
  } catch (error) {
    console.error('Error updating bank:', error);
    return NextResponse.json(
      { error: 'Error al actualizar banco' }, 
      { status: 500 }
    );
  }
}

// DELETE - Eliminar banco
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerAuthSession();
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID es requerido' }, { status: 400 });
    }

    // Verificar si tiene métodos de pago asociados
    const bank = await prisma.bank.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            paymentMethods: true,
            bankAccounts: true
          }
        }
      }
    });

    if (!bank) {
      return NextResponse.json({ error: 'Banco no encontrado' }, { status: 404 });
    }

    if (bank._count.paymentMethods > 0 || bank._count.bankAccounts > 0) {
      return NextResponse.json(
        { 
          error: 'No se puede eliminar el banco porque tiene métodos de pago o cuentas asociadas',
          details: {
            paymentMethods: bank._count.paymentMethods,
            bankAccounts: bank._count.bankAccounts
          }
        }, 
        { status: 400 }
      );
    }

    // Eliminar banco
    await prisma.bank.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting bank:', error);
    return NextResponse.json(
      { error: 'Error al eliminar banco' }, 
      { status: 500 }
    );
  }
}
