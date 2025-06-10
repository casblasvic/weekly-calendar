import { NextRequest, NextResponse } from 'next/server';
import { getServerAuthSession } from '@/lib/auth';
import { prisma as db } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerAuthSession();
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { 
      vatTypeId, 
      clinicId, 
      legalEntityId, 
      inputAccountId, 
      outputAccountId,
      systemId 
    } = body;

    if (!vatTypeId || !legalEntityId || !systemId) {
      return NextResponse.json(
        { error: 'vatTypeId, legalEntityId y systemId son requeridos' },
        { status: 400 }
      );
    }

    // Buscar mapeo existente
    const existingMapping = await db.vATTypeAccountMapping.findFirst({
      where: {
        vatTypeId,
        legalEntityId,
        clinicId: clinicId || null
      }
    });

    if (existingMapping) {
      // Actualizar mapeo existente
      const updatedMapping = await db.vATTypeAccountMapping.update({
        where: {
          id: existingMapping.id
        },
        data: {
          inputAccountId,
          outputAccountId,
          systemId,
          updatedAt: new Date()
        },
        include: {
          vatType: true,
          inputAccount: true,
          outputAccount: true,
          clinic: true
        }
      });

      return NextResponse.json({
        success: true,
        mapping: updatedMapping
      });
    } else {
      // Crear nuevo mapeo
      const newMapping = await db.vATTypeAccountMapping.create({
        data: {
          vatTypeId,
          clinicId: clinicId || null,
          legalEntityId,
          systemId,
          inputAccountId,
          outputAccountId
        },
        include: {
          vatType: true,
          inputAccount: true,
          outputAccount: true,
          clinic: true
        }
      });

      return NextResponse.json({
        success: true,
        mapping: newMapping
      });
    }

  } catch (error) {
    console.error('Error al guardar mapeo de IVA:', error);
    return NextResponse.json(
      { error: 'Error al guardar mapeo de IVA' },
      { status: 500 }
    );
  }
}
