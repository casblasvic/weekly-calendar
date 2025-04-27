import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { Prisma } from '@prisma/client';
import bcrypt from 'bcrypt'; // Necesario para hashear contraseñas
import { getServerAuthSession } from "@/lib/auth"; // Importar helper
import { z } from 'zod'; // Importar Zod para validación

const saltRounds = 10; // Coste de hashing (podría ir a variables de entorno)

/**
 * Handler para obtener todos los usuarios DEL SISTEMA ACTUAL.
 * @param request La solicitud entrante.
 * @returns NextResponse con la lista de usuarios (sin passwordHash) o un error.
 */
export async function GET(request: Request) {
  console.log("[API Users GET] Received request"); // Log inicio
  const session = await getServerAuthSession();
  if (!session || !session.user?.systemId) {
    console.error("[API Users GET] Unauthorized - No session or systemId");
    return NextResponse.json({ error: 'No autorizado o falta systemId.' }, { status: 401 });
  }
  const systemId = session.user.systemId;
  console.log(`[API Users GET] Authorized for systemId: ${systemId}`);

  try {
    console.log(`[API Users GET] Attempting to find users for systemId: ${systemId}`);
    const users = await prisma.user.findMany({
      where: { systemId: systemId }, // <<< Filtrar por systemId de la sesión
      // Excluir el campo passwordHash de la respuesta por seguridad
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        profileImageUrl: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        systemId: true,
        phone: true,
        phone2: true,
        countryIsoCode: true,
        languageIsoCode: true,
        phone1CountryIsoCode: true,
        phone2CountryIsoCode: true,
        // Podríamos incluir roles aquí si es necesario
        // roles: { include: { role: true } }
      },
      orderBy: [ // <<< Envolver en un array
        { lastName: 'asc' },
        { firstName: 'asc' },
      ]
    });
    console.log(`[API Users GET] Found ${users.length} users for systemId: ${systemId}`);
    return NextResponse.json(users);
  } catch (error) {
    // Log detallado del error
    console.error("[API Users GET] Error fetching users:", error);
    // Intentar obtener más detalles si es un error conocido
    let errorMessage = 'Error interno del servidor al obtener los usuarios';
    if (error instanceof Error) {
        errorMessage = error.message;
    } 
    // Devolver el error
    return NextResponse.json(
      { message: 'Error interno del servidor al obtener los usuarios', details: errorMessage },
      { status: 500 }
    );
  }
}

// Esquema Zod para la creación de usuarios
const createUserSchema = z.object({
  email: z.string().email("Email inválido."),
  firstName: z.string().min(1, "El nombre es obligatorio."),
  lastName: z.string().min(1, "El apellido es obligatorio."),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres."), // Mínimo de seguridad
  profileImageUrl: z.string().url("URL de imagen inválida.").optional().nullable(),
  isActive: z.boolean().optional(),
  // TODO: Añadir validación para roles si se gestionan aquí
});


/**
 * Handler para crear un nuevo usuario EN EL SISTEMA ACTUAL.
 * Espera email, firstName, lastName y password en el cuerpo JSON.
 * Hashea la contraseña antes de guardarla.
 * @param request La solicitud entrante con los datos del nuevo usuario.
 * @returns NextResponse con el nuevo usuario (sin passwordHash) y estado 201, o un error.
 */
export async function POST(request: Request) {
  const session = await getServerAuthSession();
  if (!session || !session.user?.systemId) {
    return NextResponse.json({ error: 'No autorizado o falta systemId.' }, { status: 401 });
  }
  const systemId = session.user.systemId; // <<< Usar systemId de la sesión

  try {
    const body = await request.json();

    // Validar body con Zod
    const validation = createUserSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { message: 'Datos inválidos.', details: validation.error.format() },
        { status: 400 }
      );
    }
    const { email, firstName, lastName, password, profileImageUrl, isActive } = validation.data;

    // Hashear la contraseña
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Crear el nuevo usuario
    const newUser = await prisma.user.create({
      data: {
        email: email,
        firstName: firstName,
        lastName: lastName,
        passwordHash: hashedPassword,
        profileImageUrl: profileImageUrl, // Usar valor validado
        isActive: isActive !== undefined ? isActive : true, // Usar valor validado
        systemId: systemId, // <<< Asignar systemId de la sesión
        // TODO: Asignar roles si vienen en el body?
      },
      // Excluir el hash de la respuesta
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        profileImageUrl: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        systemId: true
      }
    });

    return NextResponse.json(newUser, { status: 201 });

  } catch (error) {
    console.error("Error creating user:", error);

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') { // Violación de unicidad (email)
        return NextResponse.json(
          { message: 'Ya existe un usuario con ese email.' },
          { status: 409 }
        );
      }
    }
    if (error instanceof z.ZodError) { // Capturar error Zod
      return NextResponse.json({ error: 'Datos inválidos', details: error.errors }, { status: 400 });
    }
    if (error instanceof SyntaxError) {
       return NextResponse.json({ message: 'JSON inválido' }, { status: 400 });
    }

    return NextResponse.json(
      { message: 'Error interno del servidor al crear el usuario' },
      { status: 500 }
    );
  }
} 