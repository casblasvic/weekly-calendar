import { NextRequest, NextResponse } from 'next/server';
import { prisma, Prisma } from '@/lib/db';
import { z } from 'zod';
import { auth } from '@/lib/auth';

// const prisma = new PrismaClient(); // MIGRADO: usar singleton desde @/lib/db

// Schema de validación para actualizar gastos
const UpdateExpenseSchema = z.object({
  date: z.string().transform(str => new Date(str)).optional(),
  typeId: z.string().optional(),
  supplierId: z.string().optional(),
  invoiceNumber: z.string().optional(),
  description: z.string().optional(),
  subtotal: z.number().positive().optional(),
  taxAmount: z.number().min(0).optional(),
  totalAmount: z.number().positive().optional(),
  vatTypeId: z.string().nullable().optional(),
  clinicId: z.string().optional(),
  paymentId: z.string().nullable().optional(),
  status: z.enum(['PENDING', 'APPROVED', 'PAID', 'CANCELLED']).optional(),
});

// GET - Obtener un gasto específico
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const expense = await prisma.expense.findFirst({
      where: {
        id: params.id,
        systemId
      },
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
      }
    });

    if (!expense) {
      return NextResponse.json(
        { error: 'Expense not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(expense);
  } catch (error) {
    console.error('Error fetching expense:', error);
    return NextResponse.json(
      { error: 'Error fetching expense' },
      { status: 500 }
    );
  }
}

// PUT - Actualizar un gasto
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
    const validatedData = UpdateExpenseSchema.parse(body);

    // Verificar que el gasto existe y el journalEntryId si se proporciona
    const existingExpense = await prisma.expense.findFirst({
      where: {
        id: params.id,
        systemId
      }
    });

    if (!existingExpense) {
      return NextResponse.json(
        { error: 'Expense not found' },
        { status: 404 }
      );
    }

    // Si el gasto ya fue contabilizado, no permitir ciertos cambios
    const hasJournalEntries = await prisma.journalEntry.count({
      where: {
        expenseId: params.id
      }
    }) > 0;

    if (hasJournalEntries && 
        (validatedData.subtotal !== undefined || 
         validatedData.taxAmount !== undefined || 
         validatedData.totalAmount !== undefined ||
         validatedData.vatTypeId !== undefined)) {
      return NextResponse.json(
        { error: 'Cannot modify amounts on an expense with journal entry' },
        { status: 400 }
      );
    }

    // Actualizar el gasto
    const updatedExpense = await prisma.expense.update({
      where: { id: params.id },
      data: {
        ...(validatedData.date && { date: validatedData.date }),
        ...(validatedData.typeId && { expenseTypeId: validatedData.typeId }),
        ...(validatedData.supplierId && { supplierId: validatedData.supplierId }),
        ...(validatedData.invoiceNumber && { reference: validatedData.invoiceNumber }),
        ...(validatedData.description && { description: validatedData.description }),
        ...(validatedData.subtotal && { subtotalAmount: validatedData.subtotal }),
        ...(validatedData.taxAmount && { vatAmount: validatedData.taxAmount }),
        ...(validatedData.totalAmount && { totalAmount: validatedData.totalAmount }),
        ...(validatedData.vatTypeId !== undefined && { vatTypeId: validatedData.vatTypeId }),
        ...(validatedData.clinicId && { clinicId: validatedData.clinicId }),
        ...(validatedData.paymentId !== undefined && { paymentId: validatedData.paymentId }),
        ...(validatedData.status && { status: validatedData.status }),
      },
      include: {
        expenseType: true,
        supplier: true,
        vatType: true,
        clinic: true
      }
    });

    // Si cambió a APPROVED y no tiene asiento, generarlo
    if (validatedData.status === 'APPROVED' && 
        !hasJournalEntries &&
        existingExpense.status !== 'APPROVED') {
      // TODO: Llamar a la API de generación de asientos
      // await generateExpenseJournalEntry(updatedExpense.id, systemId);
    }

    return NextResponse.json(updatedExpense);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid data', details: error.errors },
        { status: 400 }
      );
    }
    console.error('Error updating expense:', error);
    return NextResponse.json(
      { error: 'Error updating expense' },
      { status: 500 }
    );
  }
}

// DELETE - Eliminar un gasto
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    // Verificar que el gasto existe
    const expense = await prisma.expense.findFirst({
      where: {
        id: params.id,
        systemId
      }
    });

    if (!expense) {
      return NextResponse.json(
        { error: 'Expense not found' },
        { status: 404 }
      );
    }

    // Verificar si el gasto tiene asientos contables asociados
    const hasJournalEntries = await prisma.journalEntry.count({
      where: {
        expenseId: params.id
      }
    }) > 0;

    if (hasJournalEntries) {
      return NextResponse.json(
        { error: 'Cannot delete expense with journal entry' },
        { status: 400 }
      );
    }

    // Eliminar el gasto
    await prisma.expense.delete({
      where: { id: params.id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting expense:', error);
    return NextResponse.json(
      { error: 'Error deleting expense' },
      { status: 500 }
    );
  }
}
