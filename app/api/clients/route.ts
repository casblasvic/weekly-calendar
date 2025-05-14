import { NextResponse, type NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { Prisma } from '@prisma/client';
import { getServerAuthSession } from "@/lib/auth"; // Importar helper de sesión
import { z } from 'zod'; // Importar Zod para validación

const GetClientsSchema = z.object({
  search: z.string().optional(),
  // page: z.string().optional().default("1"),
  // pageSize: z.string().optional().default("50"),
});

/**
 * Handler para obtener todos los clientes DEL SISTEMA ACTUAL.
 * TODO: Añadir paginación, filtros (por clínica, por estado), ordenación.
 * TODO: Considerar qué campos devolver (¿excluir datos sensibles?).
 * @param request La solicitud entrante.
 * @returns NextResponse con la lista de clientes o un error.
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerAuthSession();
    if (!session?.user?.id || !session.user.systemId) {
      return NextResponse.json(
        { error: 'Usuario no autenticado o falta systemId.' },
        { status: 401 }
      );
    }
    const systemId = session.user.systemId;

    const { searchParams } = new URL(request.url);
    const queryParams = GetClientsSchema.safeParse(Object.fromEntries(searchParams));

    if (!queryParams.success) {
      return NextResponse.json(
        { error: 'Parámetros de búsqueda inválidos', details: queryParams.error.flatten() },
        { status: 400 }
      );
    }

    const { search } = queryParams.data;
    // const page = parseInt(queryParams.data.page as string, 10);
    // const pageSize = parseInt(queryParams.data.pageSize as string, 10);

    const whereClause: any = {
      systemId,
      isActive: true, // Solo clientes activos
    };

    if (search) {
      whereClause.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { taxId: { contains: search, mode: 'insensitive' } },
        { fiscalName: { contains: search, mode: 'insensitive' } },
        { company: { fiscalName: { contains: search, mode: 'insensitive' } } },
        { phone: { contains: search, mode: 'insensitive' } },
      ];
    }

    const clients = await prisma.client.findMany({
      where: whereClause,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        phoneCountryIsoCode: true,
        taxId: true,
        fiscalName: true,
        address: true, 
        city: true,    
        postalCode: true,
        country: {
          select: {
            name: true,
            isoCode: true,
          }
        },
        company: {
          select: {
            id: true,
            fiscalName: true,
          }
        }
      },
      // skip: (page - 1) * pageSize,
      // take: pageSize,
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      take: 50, 
    });

    // const totalClients = await prisma.client.count({ where: whereClause });

    return NextResponse.json(clients);
    // return NextResponse.json({
    //   data: clients,
    //   totalCount: totalClients,
    //   page,
    //   pageSize,
    //   totalPages: Math.ceil(totalClients / pageSize),
    // });

  } catch (error) {
    console.error("[API_CLIENTS_GET] Error fetching clients:", error);
    return NextResponse.json(
      { error: "Error interno del servidor al obtener clientes." },
      { status: 500 }
    );
  }
}

// Esquema Zod para la creación de clientes
const createClientSchema = z.object({
  firstName: z.string().min(1, "El nombre es obligatorio."),
  lastName: z.string().min(1, "El apellido es obligatorio."),
  email: z.string().email("Email inválido."), // Email es único por sistema
  phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  postalCode: z.string().optional().nullable(),
  province: z.string().optional().nullable(),
  countryCode: z.string().optional().nullable(),
  birthDate: z.string().optional().nullable().refine(val => !val || !isNaN(Date.parse(val)), {
      message: "Formato de fecha de nacimiento inválido.",
  }).transform(val => val ? new Date(val) : null), // Convertir a Date
  gender: z.string().optional().nullable(), // Podría ser un enum
  notes: z.string().optional().nullable(),
  isActive: z.boolean().optional().default(true),
  // TODO: Añadir clinicId si es necesario como relación directa
});

/**
 * Handler para crear un nuevo cliente EN EL SISTEMA ACTUAL.
 * @param request La solicitud entrante con los datos del nuevo cliente.
 * @returns NextResponse con el nuevo cliente y estado 201, o un error.
 */
export async function POST(request: Request) {
  const session = await getServerAuthSession();
  if (!session || !session.user?.systemId) {
      return NextResponse.json({ message: 'No autorizado o falta systemId' }, { status: 401 });
  }
  const systemId = session.user.systemId; // <<< Usar systemId de la sesión

  try {
    const body = await request.json();

    // Validar con Zod
    const validation = createClientSchema.safeParse(body);
     if (!validation.success) {
      return NextResponse.json(
        { message: 'Datos inválidos.', details: validation.error.format() },
        { status: 400 }
      );
    }
    const validatedData = validation.data;

    // // Validación básica -> Reemplazada por Zod
    // if (!body.firstName || !body.lastName || !body.email) {
    //   return NextResponse.json(
    //     { message: 'Faltan campos obligatorios: nombre, apellido, email' },
    //     { status: 400 }
    //   );
    // }

    // // TODO: Obtener systemId del usuario autenticado. -> Hecho
    // // Por ahora, usamos el ID del sistema de ejemplo.
    // const exampleSystem = await prisma.system.findFirst({
    //   where: { name: 'Sistema Ejemplo Avatar' },
    // });
    // if (!exampleSystem) {
    //   throw new Error('Sistema de ejemplo no encontrado para asignar el cliente.');
    // }

    // Crear el nuevo cliente - Construir data explícitamente
    const newClient = await prisma.client.create({
      data: {
        // --- Campos de validatedData ---
        firstName: validatedData.firstName,
        lastName: validatedData.lastName,
        email: validatedData.email,
        phone: validatedData.phone,
        address: validatedData.address,
        city: validatedData.city,
        postalCode: validatedData.postalCode,
        province: validatedData.province,
        countryCode: validatedData.countryCode,
        birthDate: validatedData.birthDate, // Ya es Date o null
        gender: validatedData.gender,
        notes: validatedData.notes,
        isActive: validatedData.isActive,
        // --- Fin Campos validatedData ---
        
        systemId: systemId, // <<< Asignar systemId de la sesión
      },
    });

    return NextResponse.json(newClient, { status: 201 });

  } catch (error) {
    console.error("Error creating client:", error);

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') { // Violación de unicidad (probablemente email+systemId)
        return NextResponse.json(
          { message: 'Ya existe un cliente con ese email en este sistema.' },
          { status: 409 }
        );
      }
    }
    if (error instanceof z.ZodError) { // Añadir manejo Zod Error
      return NextResponse.json({ error: 'Datos inválidos', details: error.errors }, { status: 400 });
    }
    if (error instanceof SyntaxError) {
       return NextResponse.json({ message: 'JSON inválido' }, { status: 400 });
    }

    return NextResponse.json(
      { message: 'Error interno del servidor al crear el cliente' },
      { status: 500 }
    );
  }
} 