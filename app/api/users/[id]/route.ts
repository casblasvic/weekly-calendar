import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
// Import Zod for validation
import { z } from 'zod';
import { getServerAuthSession } from '@/lib/auth'; // <<< IMPORTAR HELPER

// Esquema para la asignación de clínica/rol
const ClinicAssignmentSchema = z.object({
  clinicId: z.string().cuid("ID de clínica inválido en asignación."),
  roleId: z.string().cuid("ID de rol inválido en asignación.")
});

/**
 * Esquema para validar los datos de actualización del usuario en el PUT request.
 * <<< ACTUALIZADO con phone2 y phoneXCountryIsoCode >>>
 */
const UpdateUserSchema = z.object({
  // --- Campos del modelo User --- 
  firstName: z.string().min(1, "El nombre es obligatorio").optional(),
  lastName: z.string().optional().nullable(),
  email: z.string().email("Email inválido").optional(), 
  phone: z.string().optional().nullable(),
  phone2: z.string().optional().nullable(),
  profileImageUrl: z.string().url("URL de imagen inválida").optional().nullable(),
  isActive: z.boolean().optional(),
  countryIsoCode: z.string().length(2, "Código ISO de país inválido").optional().nullable(),
  languageIsoCode: z.string().length(2, "Código ISO de idioma inválido").optional().nullable(),
  phone1CountryIsoCode: z.string().length(2, "Código ISO país teléfono 1 inválido").optional().nullable(),
  phone2CountryIsoCode: z.string().length(2, "Código ISO país teléfono 2 inválido").optional().nullable(),
  // --- NO incluir phoneCode aquí --- 

  // --- Campos para relaciones (gestionados por separado) --- 
  clinicAssignments: z.array(ClinicAssignmentSchema).optional(),
  
  // --- Otros campos (NO del modelo User directo) ---
});

/**
 * Handler para obtener un usuario específico por su ID.
 * <<< AÑADIDA VALIDACIÓN DE SESIÓN >>>
 * @param request La solicitud entrante.
 * @param params Objeto con el ID del usuario.
 * @returns NextResponse con el usuario encontrado (sin passwordHash) o un error.
 */
export async function GET(request: Request, props: { params: Promise<{ id: string }> }) {
  const session = await getServerAuthSession(); // <<< OBTENER SESIÓN
  if (!session) {
    return NextResponse.json({ message: 'No autenticado' }, { status: 401 });
  }
  // Opcional: Añadir lógica de permisos aquí si no solo puede ver su propio perfil
  // if (session.user.id !== params.id && !session.user.isAdmin) { // Ejemplo
  //   return NextResponse.json({ message: 'No autorizado' }, { status: 403 });
  // }

  const params = await props.params;
  const userId = params.id;
  try {
    const user = await prisma.user.findUniqueOrThrow({
      where: { id: userId },
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
        clinicAssignments: { 
          select: {
            clinicId: true,
            roleId: true, 
            clinic: { select: { name: true, prefix: true, isActive: true } },
            role: { select: { name: true } } 
          }
        }
      }
    });
    console.log(`[API GET /users/${userId}] User data fetched including assignments:`, JSON.stringify(user, null, 2));
    return NextResponse.json(user);
  } catch (error) {
    console.error(`Error fetching user ${userId}:`, error);
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      return NextResponse.json({ message: `Usuario ${userId} no encontrado` }, { status: 404 });
    }
    return NextResponse.json({ message: 'Error interno del servidor' }, { status: 500 });
  }
}

/**
 * Handler para actualizar un usuario existente por su ID.
 * NO permite actualizar la contraseña (se haría en una ruta separada).
 * Permite actualizar datos básicos y las asignaciones a clínicas (incluyendo rol).
 * <<< AÑADIDA VALIDACIÓN DE SESIÓN Y PERMISOS (SOLO PROPIO USUARIO) >>>
 * @param request La solicitud con los datos de actualización.
 * @param params Objeto con el ID del usuario.
 * @returns NextResponse con el usuario actualizado (sin passwordHash) o un error.
 */
export async function PUT(request: Request, props: { params: Promise<{ id: string }> }) {
  const session = await getServerAuthSession(); // <<< OBTENER SESIÓN
  if (!session) {
    return NextResponse.json({ message: 'No autenticado' }, { status: 401 });
  }

  const params = await props.params;
  const userId = params.id;

  // <<< COMPROBAR SI EL USUARIO AUTENTICADO ES EL MISMO QUE SE INTENTA EDITAR >>>
  if (session.user.id !== userId) {
    // Aquí podríamos añadir lógica para permitir a administradores editar a otros
    // if (!session.user.isAdmin) { ... }
    return NextResponse.json({ message: 'No autorizado para modificar este usuario' }, { status: 403 });
  }

  let rawBody;
  try {
    rawBody = await request.json();
    console.log(`[API PUT /users/${userId}] Received raw body:`, JSON.stringify(rawBody, null, 2)); // <<< LOG INICIAL

    const validation = UpdateUserSchema.safeParse(rawBody);
    if (!validation.success) {
      console.error(`[API PUT /users/${userId}] Zod validation failed:`, validation.error.format());
      return NextResponse.json({ error: 'Datos de usuario inválidos.', details: validation.error.format() }, { status: 400 });
    }
    const validatedData = validation.data;
    console.log(`[API PUT /users/${userId}] Zod validation successful.`); // <<< LOG ZOD OK

    // Separar datos base, relaciones y otros campos
    const { 
        clinicAssignments: requestedAssignments, 
        countryIsoCode, 
        languageIsoCode, 
        phone1CountryIsoCode,
        phone2CountryIsoCode,
        ...userBaseUpdateData 
    } = validatedData;
    console.log(`[API PUT /users/${userId}] Data separated. Base data keys: ${Object.keys(userBaseUpdateData).join(', ')}`); // <<< LOG SEPARACIÓN

    const updatedUserResult = await prisma.$transaction(async (tx) => {
      console.log(`[API PUT /users/${userId}] --- Starting transaction ---`);

      // 1. Preparar datos base del usuario 
      const baseDataToUpdate: Prisma.UserUpdateInput = { ...userBaseUpdateData };
      let hasBaseDataUpdates = false; // Flag para saber si hay algo que actualizar

      // --- Manejo explícito de relaciones/campos especiales --- 
      if (countryIsoCode !== undefined) {
        console.log(`[API PUT /users/${userId}] Handling countryIsoCode: ${countryIsoCode}`);
        baseDataToUpdate.country = countryIsoCode 
          ? { connect: { isoCode: countryIsoCode } } 
          : { disconnect: true };
        hasBaseDataUpdates = true;
      }
      if (languageIsoCode !== undefined) { 
         console.log(`[API PUT /users/${userId}] Handling languageIsoCode: ${languageIsoCode}`);
         baseDataToUpdate.languageIsoCode = languageIsoCode;
         hasBaseDataUpdates = true;
      }
      if (phone1CountryIsoCode !== undefined) {
          console.log(`[API PUT /users/${userId}] Handling phone1CountryIsoCode: ${phone1CountryIsoCode} (phone1 present: ${!!userBaseUpdateData.phone})`);
          baseDataToUpdate.phone1CountryIsoCode = userBaseUpdateData.phone ? phone1CountryIsoCode : null;
           hasBaseDataUpdates = true;
      }
      if (phone2CountryIsoCode !== undefined) {
          console.log(`[API PUT /users/${userId}] Handling phone2CountryIsoCode: ${phone2CountryIsoCode} (phone2 present: ${!!userBaseUpdateData.phone2})`);
          baseDataToUpdate.phone2CountryIsoCode = userBaseUpdateData.phone2 ? phone2CountryIsoCode : null;
           hasBaseDataUpdates = true;
      }
      if (Object.keys(userBaseUpdateData).length > 0) {
          hasBaseDataUpdates = true; // Si hay campos directos como nombre, email, etc.
      }
      // --- Fin manejo explícito ---

      delete (baseDataToUpdate as any).phoneCode; // Asegurarse de que no va

      // --- Ejecutar Actualización Base (si hay cambios) --- 
      if (hasBaseDataUpdates) {
          console.log(`[API PUT /users/${userId}] [TX] Preparing to update base user data:`, JSON.stringify(baseDataToUpdate, null, 2));
          await tx.user.update({
            where: { id: userId },
            data: baseDataToUpdate, 
          });
          console.log(`[API PUT /users/${userId}] [TX] Base user data update successful.`);
      } else {
          console.log(`[API PUT /users/${userId}] [TX] No base user data fields to update. Skipping base update.`);
      }

      // 2. Gestionar asignaciones de clínicas y roles (SOLO si se proporcionó clinicAssignments)
      if (requestedAssignments !== undefined) {
        console.log(`[API PUT /users/${userId}] [TX] Managing clinic/role assignments. Received:`, requestedAssignments);

        console.log(`[API PUT /users/${userId}] [TX] Deleting ALL current assignments for user...`);
        const deleteResult = await tx.userClinicAssignment.deleteMany({ where: { userId: userId } });
        console.log(`[API PUT /users/${userId}] [TX] Delete result:`, deleteResult); // Ver cuántos se borraron

        if (requestedAssignments.length > 0) {
          const assignmentsToCreate = requestedAssignments.map(assignment => ({
              userId: userId,
              clinicId: assignment.clinicId,
              roleId: assignment.roleId,
          }));
          console.log(`[API PUT /users/${userId}] [TX] Creating new assignments:`, assignmentsToCreate);
          const createResult = await tx.userClinicAssignment.createMany({ data: assignmentsToCreate });
          console.log(`[API PUT /users/${userId}] [TX] Create result:`, createResult); // Ver cuántos se crearon
        } else {
           console.log(`[API PUT /users/${userId}] [TX] No new assignments requested.`);
        }
      } else {
        console.log(`[API PUT /users/${userId}] [TX] No 'clinicAssignments' key found in request body. Skipping assignment update.`);
      }

      // 3. Devolver el usuario actualizado
      console.log(`[API PUT /users/${userId}] [TX] Fetching final user state...`);
      const finalUser = await tx.user.findUniqueOrThrow({
        where: { id: userId },
        select: {
          id: true, email: true, firstName: true, lastName: true, profileImageUrl: true,
          isActive: true, createdAt: true, updatedAt: true, systemId: true,
          phone: true, 
          phone2: true,
          countryIsoCode: true, 
          languageIsoCode: true,
          phone1CountryIsoCode: true,
          phone2CountryIsoCode: true,
          clinicAssignments: { 
            select: {
              clinicId: true,
              roleId: true, 
              clinic: { select: { name: true } }, 
              role: { select: { name: true } } 
            }
          }
        }
      });
       console.log(`[API PUT /users/${userId}] [TX] Final user state fetched successfully.`);
      return finalUser;
    }); 
    // --- FIN TRANSACCIÓN --- 

    console.log(`[API PUT /users/${userId}] Transaction successful. Returning updated user data.`);
    return NextResponse.json(updatedUserResult);

  } catch (error) {
    console.error(`[API PUT /users/${userId}] Error during update execution:`, error);
    // Identificar si el error vino de la transacción
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
        console.error(`[API PUT /users/${userId}] Prisma Known Error: Code=${error.code}, Meta=${JSON.stringify(error.meta)}`);
        return NextResponse.json({ message: `Error de base de datos: ${error.code}`, details: error.meta }, { status: 500 });
    } else if (error instanceof Prisma.PrismaClientValidationError) {
        console.error(`[API PUT /users/${userId}] Prisma Validation Error:`, error.message);
        return NextResponse.json({ message: 'Error de validación de Prisma.', details: error.message }, { status: 500 });
    } else if (error instanceof SyntaxError) {
       console.error(`[API PUT /users/${userId}] JSON Syntax Error:`, error.message);
       return NextResponse.json({ message: 'JSON inválido en la solicitud.' }, { status: 400 });
    } else {
       console.error(`[API PUT /users/${userId}] Unknown Error:`, error);
       return NextResponse.json({ message: 'Error interno del servidor desconocido.' }, { status: 500 });
    }
  }
}

/**
 * Handler para eliminar un usuario existente por su ID.
 * <<< AÑADIDA VALIDACIÓN DE SESIÓN (SIN COMPROBACIÓN DE PERMISOS POR AHORA) >>>
 * @param request La solicitud entrante.
 * @param params Objeto con el ID del usuario.
 * @returns NextResponse con mensaje de éxito o error.
 */
export async function DELETE(request: Request, props: { params: Promise<{ id: string }> }) {
  const session = await getServerAuthSession(); // <<< OBTENER SESIÓN
  if (!session) {
    return NextResponse.json({ message: 'No autenticado' }, { status: 401 });
  }
  // <<< Añadir comprobación de permisos aquí cuando se defina la lógica >>>
  // Por ejemplo:
  // const userToDeleteId = (await props.params).id;
  // if (session.user.id !== userToDeleteId && !session.user.isAdmin) {
  //    return NextResponse.json({ message: 'No autorizado para eliminar este usuario' }, { status: 403 });
  // }

  const params = await props.params;
  const userId = params.id;

  console.log(`[API DELETE /users/${userId}] Request received.`);

  try {
    // Asegurarse de que el usuario existe antes de intentar borrar
    const userExists = await prisma.user.findUnique({ where: { id: userId } });
    if (!userExists) {
      console.warn(`[API DELETE /users/${userId}] User not found.`);
      return NextResponse.json({ message: `Usuario ${userId} no encontrado` }, { status: 404 });
    }

    console.log(`[API DELETE /users/${userId}] Attempting to delete user...`);
    await prisma.user.delete({
      where: { id: userId },
    });
    console.log(`[API DELETE /users/${userId}] User deleted successfully.`);
    return NextResponse.json({ message: `Usuario ${userId} eliminado correctamente` }, { status: 200 });

  } catch (error) {
    console.error(`[API DELETE /users/${userId}] Error deleting user:`, error);
    // Manejar errores específicos, por ejemplo, si hay restricciones de clave foránea
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2003') { // Foreign key constraint failed
        console.error(`[API DELETE /users/${userId}] Foreign key constraint failed.`);
        return NextResponse.json({ message: 'No se puede eliminar el usuario porque tiene datos asociados (asignaciones, etc.).' }, { status: 409 }); // Conflict
      }
      console.error(`[API DELETE /users/${userId}] Prisma Known Error: Code=${error.code}`);
      return NextResponse.json({ message: `Error de base de datos al eliminar: ${error.code}` }, { status: 500 });
    }
    return NextResponse.json({ message: 'Error interno del servidor al eliminar el usuario' }, { status: 500 });
  }
} 