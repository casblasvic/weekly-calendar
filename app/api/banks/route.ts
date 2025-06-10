'use server';

import { NextResponse } from 'next/server';
import { getServerAuthSession } from '@/lib/auth'; // Importar helper de sesión
import { prisma } from '@/lib/db'; // Importar prisma desde @/lib/db
import { bankFormSchema } from '@/lib/schemas/bank'; // Importar schema Zod
import { z } from 'zod';
import { Prisma } from '@prisma/client'; // Importar Prisma para manejo de errores

// Handler para GET /api/banks
export async function GET(request: Request) {
  try {
    const session = await getServerAuthSession();
    console.log('[API Banks GET] Session:', session?.user?.id, 'SystemId:', session?.user?.systemId);
    
    if (!session?.user?.systemId) {
      console.log('[API Banks GET] No session or systemId found');
      return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
    }
    const systemId = session.user.systemId;

    // <<< LEER clinicId de los parámetros de búsqueda de la URL >>>
    const { searchParams } = new URL(request.url);
    const clinicId = searchParams.get('clinicId');
    console.log('[API Banks GET] Request params - clinicId:', clinicId);

    // <<< CONSTRUIR WHERE condicional >>>
    let whereCondition: Prisma.BankWhereInput = {
      systemId: systemId,
    };

    if (clinicId) {
      // Si se proporciona clinicId, filtrar por disponibilidad
      whereCondition = {
        ...whereCondition,
        OR: [
          {
            // Bancos SIN clínicas específicas (globales por defecto)
            applicableClinics: { none: {} } 
          },
          {
            // O Bancos con alcance específico PARA esta clínica
            applicableClinics: {
              some: {
                clinicId: clinicId,
              },
            },
          },
        ],
      };
    }
    // <<< FIN CONSTRUIR WHERE >>>

    console.log('[API Banks GET] Where condition:', JSON.stringify(whereCondition, null, 2));

    // Obtener los bancos según la condición
    const banks = await prisma.bank.findMany({
      // <<< Usar la condición construida >>>
      where: whereCondition,
      orderBy: {
        name: 'asc',
      },
      // <<< Incluir todos los campos necesarios >>>
      include: {
        applicableClinics: { 
          include: {
            clinic: true
          }
        },
        bankAccounts: {
          where: {
            isActive: true
          },
          include: {
            applicableClinics: {
              include: {
                clinic: true
              }
            }
          }
        }
      },
    });

    console.log('[API Banks GET] Returning banks:', banks.length);
    return NextResponse.json(banks);
  } catch (error) {
    console.error('[API Banks GET] Error:', error);
    return NextResponse.json(
      { message: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// Handler para POST /api/banks
// Esta función sería para crear un nuevo banco
export async function POST(request: Request) {
  try {
    const session = await getServerAuthSession();
    if (!session?.user?.systemId) {
      return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
    }
    const systemId = session.user.systemId;

    let body;
    try {
      body = await request.json();
    } catch (error) {
      return NextResponse.json(
        { message: 'Error al parsear JSON del cuerpo de la solicitud' },
        { status: 400 }
      );
    }

    const validation = bankFormSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { message: "Datos inválidos", errors: validation.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    
    // <<< INCLUIR isGlobal y applicableClinicIds aquí >>>
    const { 
      isGlobal,
      applicableClinicIds,
      countryIsoCode, 
      ...restOfBankData 
    } = validation.data;

    // Verificar si ya existe un banco con el mismo nombre en este sistema
    const existingBankByName = await prisma.bank.findFirst({
      where: {
        systemId: systemId,
        name: restOfBankData.name,
      },
    });

    if (existingBankByName) {
       return NextResponse.json(
        { message: 'Ya existe un banco con este nombre en el sistema' },
        { status: 409 } // Conflict
      );
    }

    // Crear el nuevo banco y las relaciones de alcance en una transacción
    const newBank = await prisma.$transaction(async (tx) => {
      
      // <<< CONSTRUIR data para prisma.bank.create >>>
      const dataToCreate: Prisma.BankCreateInput = {
        name: restOfBankData.name, 
        ...restOfBankData, 
        isGlobal: isGlobal,
        system: {
          connect: { id: systemId } 
        },
        ...(countryIsoCode && {
          country: {
            connect: { isoCode: countryIsoCode }
          }
        }),
      };
      // <<< FIN CONSTRUIR data >>>

      const createdBank = await tx.bank.create({
        data: dataToCreate, 
      });

      // <<< RESTAURAR LÓGICA DE BankClinicScope USANDO isGlobal Y applicableClinicIds >>>
      // Si NO es global (según los datos del formulario) y hay clínicas seleccionadas...
      if (!isGlobal && applicableClinicIds && applicableClinicIds.length > 0) {
        // Opcional: Validar que las clinicIds existen y pertenecen al sistema (Buena práctica)
        const validClinics = await tx.clinic.findMany({
          where: { id: { in: applicableClinicIds }, systemId: systemId },
          select: { id: true },
        });
        if (validClinics.length !== applicableClinicIds.length) {
          throw new Error('Una o más clínicas especificadas son inválidas o no pertenecen al sistema.');
        }

        await tx.bankClinicScope.createMany({
          data: applicableClinicIds.map(clinicId => ({
            bankId: createdBank.id,
            clinicId: clinicId,
          })),
        });
      }

      return createdBank;
    });

    return NextResponse.json(newBank, { status: 201 });

  } catch (error) {
    console.error('[API Banks POST] Error:', error);
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        return NextResponse.json({ message: 'Ya existe un banco con este nombre.' }, { status: 409 });
      } 
      if (error.code === 'P2025') {
        // <<< Ajustar mensaje de error por si falla la validación de clínicas >>>
        return NextResponse.json({ message: 'Error de referencia: El país, sistema o clínica especificada no existe.' }, { status: 400 });
      }
    }
    // <<< CAPTURAR ERROR DE VALIDACIÓN DE CLÍNICAS >>>
    if (error instanceof Error && error.message.includes('clínicas especificadas son inválidas')) {
        return NextResponse.json({ message: error.message }, { status: 400 });
    }
    return NextResponse.json(
      { message: 'Error interno del servidor al crear el banco' },
      { status: 500 }
    );
  }
} 