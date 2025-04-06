import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

/**
 * Handler para obtener todos los servicios.
 * TODO: Filtros (por tarifa, por familia, por clínica?), paginación, ordenación.
 * @param request La solicitud entrante.
 * @returns NextResponse con la lista de servicios o un error.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const tariffId = searchParams.get('tariffId');
  const familyId = searchParams.get('tariffFamilyId'); // Usar el nombre correcto del campo FK
  // TODO: Añadir filtro por systemId
  
  try {
    const whereClause: Prisma.ServiceWhereInput = {};
    if (tariffId) {
       // Usar la relación 'tariffFamily' para filtrar por 'tariffId' dentro de ella
      whereClause.tariffFamily = { tariffId: tariffId }; 
    }
    if (familyId) {
       // Usar el campo FK directamente
       whereClause.tariffFamilyId = familyId; 
    }
     // TODO: añadir whereClause.systemId = ...

    const services = await prisma.service.findMany({
      where: whereClause,
      orderBy: { name: 'asc' },
      include: { vatType: true, tariffFamily: true } // Incluir datos relacionados
    });
    return NextResponse.json(services);
  } catch (error) {
    console.error("Error fetching services:", error);
    return NextResponse.json(
      { message: 'Error interno del servidor al obtener los servicios' },
      { status: 500 }
    );
  }
}

/**
 * Handler para crear un nuevo servicio.
 * @param request La solicitud entrante con los datos del nuevo servicio.
 * @returns NextResponse con el nuevo servicio y estado 201, o un error.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Validación básica (usar tariffFamilyId y vatTypeId)
    if (!body.name || !body.durationMinutes || !body.price || !body.tariffFamilyId || !body.vatTypeId) {
      return NextResponse.json(
        { message: 'Faltan campos obligatorios: nombre, durationMinutes, price, tariffFamilyId, vatTypeId' },
        { status: 400 }
      );
    }
    
    // Verificar existencia y obtener systemId de TariffFamily
    const tariffFamily = await prisma.tariffFamily.findUnique({
      where: { id: body.tariffFamilyId },
      include: { tariff: true } // Incluir tarifa para obtener systemId
    });
    if (!tariffFamily || !tariffFamily.tariff) {
         return NextResponse.json({ message: `Familia de tarifa con ID ${body.tariffFamilyId} o su tarifa asociada no encontrada` }, { status: 400 });
    }
    const systemId = tariffFamily.tariff.systemId;
    // TODO: Verificar que el systemId coincide con el del usuario autenticado
    
    // Verificar existencia de VATType (opcional, Prisma lo hará, pero mejora mensaje de error)
    const vatTypeExists = await prisma.vATType.findUnique({ where: { id: body.vatTypeId }});
     if (!vatTypeExists) {
         return NextResponse.json({ message: `Tipo de IVA con ID ${body.vatTypeId} no encontrado` }, { status: 400 });
    }

    // Crear el nuevo servicio
    const newService = await prisma.service.create({
      data: {
        name: body.name,
        description: body.description,
        durationMinutes: body.durationMinutes,
        price: body.price,
        vatTypeId: body.vatTypeId, // Campo correcto para FK de IVA
        tariffFamilyId: body.tariffFamilyId, // Campo correcto para FK de Familia
        systemId: systemId, // Asignar systemId obtenido
        color: body.color,
        requiredGender: body.requiredGender,
        onlineBookingEnabled: body.onlineBookingEnabled !== undefined ? body.onlineBookingEnabled : false,
        depositRequiredOnline: body.depositRequiredOnline !== undefined ? body.depositRequiredOnline : false,
        depositAmountOnline: body.depositAmountOnline,
        isActive: body.isActive !== undefined ? body.isActive : true,
        // TODO: Manejar relaciones M2M (equipos requeridos, clínicas donde está disponible?)
      },
       include: { vatType: true, tariffFamily: true } // Devolver datos relacionados
    });

    return NextResponse.json(newService, { status: 201 });

  } catch (error) {
    console.error("Error creating service:", error);

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      // P2002: Violación de unicidad (ej: name+tariffFamilyId)
      if (error.code === 'P2002') { 
        return NextResponse.json({ message: 'Conflicto de datos (ej: servicio ya existe en esa familia)' }, { status: 409 });
      }
      // P2003: Foreign key constraint failed (ej: tariffFamilyId o vatTypeId no existen)
      if (error.code === 'P2003') { 
           return NextResponse.json({ message: 'Referencia inválida (ej: familia o tipo de IVA no existe)' }, { status: 400 });
      }
    }
    if (error instanceof SyntaxError) {
       return NextResponse.json({ message: 'JSON inválido' }, { status: 400 });
    }

    return NextResponse.json(
      { message: 'Error interno del servidor al crear el servicio' },
      { status: 500 }
    );
  }
} 