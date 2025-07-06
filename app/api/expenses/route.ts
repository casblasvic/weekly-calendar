import { NextRequest, NextResponse } from 'next/server';
import { prisma, Prisma } from '@/lib/db';
import { z } from 'zod';
import { auth } from '@/lib/auth';

// const prisma = new PrismaClient(); // MIGRADO: usar singleton desde @/lib/db

// Schema de validación para crear/actualizar gastos
const ExpenseSchema = z.object({
  date: z.string().transform(str => new Date(str)),
  typeId: z.string(),
  supplierId: z.string(),
  invoiceNumber: z.string().optional(),
  description: z.string(),
  subtotal: z.number().positive(),
  taxAmount: z.number().min(0),
  totalAmount: z.number().positive(),
  vatTypeId: z.string().optional(),
  clinicId: z.string(),
  paymentId: z.string().optional(),
  status: z.enum(['PENDING', 'APPROVED', 'PAID', 'CANCELLED']).default('PENDING'),
});

// GET - Listar gastos con filtros
export async function GET(request: NextRequest) {
  try {
    console.log('[API GET /api/expenses] Received request');
    
    const session = await auth();
    console.log('[API GET /api/expenses] Session:', session?.user?.email);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Obtener systemId de la sesión
    const systemId = (session.user as any).systemId;
    console.log('[API GET /api/expenses] SystemId from session:', systemId);
    
    if (!systemId) {
      return NextResponse.json({ error: 'Sistema no encontrado en la sesión' }, { status: 400 });
    }

    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const status = searchParams.get('status');
    const clinicId = searchParams.get('clinicId');
    const typeId = searchParams.get('typeId');
    const supplierId = searchParams.get('supplierId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Construir filtros
    const where: any = { systemId };
    if (status) where.status = status;
    if (clinicId) where.clinicId = clinicId;
    if (typeId) where.expenseTypeId = typeId;
    if (supplierId) where.supplierId = supplierId;
    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(startDate);
      if (endDate) where.date.lte = new Date(endDate);
    }

    const [expenses, total] = await Promise.all([
      prisma.expense.findMany({
        where,
        include: {
          expenseType: true,
          supplier: true,
          user: {
            select: { id: true, firstName: true, lastName: true, email: true }
          },
          payment: true,
          vatType: true,
          clinic: {
            select: { id: true, name: true }
          },
          journalEntries: {
            select: { id: true, entryNumber: true },
            take: 1
          }
        },
        orderBy: { date: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.expense.count({ where })
    ]);

    return NextResponse.json({
      expenses,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching expenses:', error);
    return NextResponse.json(
      { error: 'Error fetching expenses' },
      { status: 500 }
    );
  }
}

// POST - Crear nuevo gasto
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Obtener systemId de la sesión
    const systemId = (session.user as any).systemId;
    if (!systemId) {
      return NextResponse.json({ error: 'Sistema no encontrado en la sesión' }, { status: 400 });
    }

    const body = await request.json();
    
    // Validar datos
    const validatedData = ExpenseSchema.parse(body);

    // Obtener el userId de la sesión
    const userId = session.user.id;
    if (!userId) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 400 });
    }

    // Obtener legalEntityId del sistema
    const systemData = await prisma.system.findUnique({
      where: { id: systemId },
      select: { 
        legalEntities: {
          select: { id: true },
          take: 1
        }
      }
    });

    if (!systemData?.legalEntities?.[0]?.id) {
      return NextResponse.json({ error: 'Entidad legal no encontrada' }, { status: 400 });
    }

    const legalEntityId = systemData.legalEntities[0].id;

    // Generar número de gasto
    const lastExpense = await prisma.expense.findFirst({
      where: { systemId },
      orderBy: { expenseNumber: 'desc' },
      select: { expenseNumber: true }
    });

    const nextNumber = lastExpense 
      ? parseInt(lastExpense.expenseNumber.replace(/\D/g, '')) + 1
      : 1;
    
    const expenseNumber = `EXP-${nextNumber.toString().padStart(6, '0')}`;

    // Crear el gasto
    const expense = await prisma.expense.create({
      data: {
        expenseNumber,
        date: validatedData.date,
        expenseTypeId: validatedData.typeId,
        supplierId: validatedData.supplierId,
        reference: validatedData.invoiceNumber,
        description: validatedData.description,
        subtotalAmount: validatedData.subtotal,
        vatAmount: validatedData.taxAmount,
        totalAmount: validatedData.totalAmount,
        vatTypeId: validatedData.vatTypeId,
        clinicId: validatedData.clinicId,
        paymentId: validatedData.paymentId,
        status: validatedData.status,
        userId,
        systemId,
        legalEntityId,
        createdBy: userId
      },
      include: {
        expenseType: true,
        supplier: true,
        vatType: true,
        clinic: true
      }
    });

    // Si el gasto está aprobado, generar asiento contable
    if (expense.status === 'APPROVED') {
      // TODO: Llamar a la API de generación de asientos
      // await generateExpenseJournalEntry(expense.id, systemId);
    }

    return NextResponse.json(expense, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid data', details: error.errors },
        { status: 400 }
      );
    }
    console.error('Error creating expense:', error);
    return NextResponse.json(
      { error: 'Error creating expense' },
      { status: 500 }
    );
  }
}
