import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { z } from 'zod';

// Schema para validar la petición de eliminación
const deleteMappingSchema = z.object({
  type: z.enum(['service', 'product', 'paymentMethod', 'vat', 'expense', 'bank']),
  id: z.string(),
  legalEntityId: z.string(),
  clinicId: z.string().optional()
});

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, id, legalEntityId, clinicId } = deleteMappingSchema.parse(body);

    switch (type) {
      case 'service':
        await prisma.serviceAccountMapping.deleteMany({
          where: {
            serviceId: id,
            legalEntityId,
            ...(clinicId ? { clinicId } : { clinicId: null })
          }
        });
        break;
      
      case 'product':
        await prisma.productAccountMapping.deleteMany({
          where: {
            productId: id,
            legalEntityId,
            ...(clinicId ? { clinicId } : { clinicId: null })
          }
        });
        break;
      
      case 'paymentMethod':
        await prisma.paymentMethodAccountMapping.deleteMany({
          where: {
            paymentMethodDefinitionId: id,
            legalEntityId,
            ...(clinicId ? { clinicId } : { clinicId: null })
          }
        });
        break;
      
      case 'vat':
        await prisma.vATTypeAccountMapping.deleteMany({
          where: {
            vatTypeId: id,
            legalEntityId,
            ...(clinicId ? { clinicId } : { clinicId: null })
          }
        });
        break;
      
      case 'expense':
        await prisma.expenseTypeAccountMapping.deleteMany({
          where: {
            expenseTypeId: id,
            legalEntityId,
            ...(clinicId ? { clinicId } : { clinicId: null })
          }
        });
        break;
      
      case 'bank':
        await prisma.bank.update({
          where: { id },
          data: { accountId: null }
        });
        break;
    }

    return NextResponse.json({ 
      success: true, 
      message: `Mapeo ${clinicId ? 'específico de clínica' : 'global'} eliminado correctamente` 
    });
  } catch (error) {
    console.error('Error deleting mapping:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Datos de solicitud inválidos', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Error al eliminar el mapeo' },
      { status: 500 }
    );
  }
}
