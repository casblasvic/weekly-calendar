import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { Prisma } from '@prisma/client';
// Import Zod for validation
import { z } from 'zod';

// Esquema para la asignación de clínica/rol
const ClinicAssignmentSchema = z.object({
  clinicId: z.string().cuid("ID de clínica inválido en asignación."),
  roleId: z.string().cuid("ID de rol inválido en asignación.")
});

/**
 * Esquema para validar los datos de actualización del usuario en el PUT request.
 */
const UpdateUserSchema = z.object({
  firstName: z.string().min(1, "El nombre es obligatorio").optional(),
  lastName: z.string().optional().nullable(),
  profileImageUrl: z.string().url("URL de imagen inválida").optional().nullable(),
  isActive: z.boolean().optional(),
  // Cambiar a un array de objetos { clinicId, roleId }
  clinicAssignments: z.array(ClinicAssignmentSchema).optional(),
}).passthrough();

/**
 * Handler para obtener un usuario específico por su ID.
 * @param request La solicitud entrante.
 * @param params Objeto con el ID del usuario.
 * @returns NextResponse con el usuario encontrado (sin passwordHash) o un error.
 */
export async function GET(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const userId = params.id;
  try {
    const user = await prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { 
        id: true, email: true, firstName: true, lastName: true, profileImageUrl: true, 
        isActive: true, createdAt: true, updatedAt: true, systemId: true, 
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
 * @param request La solicitud con los datos de actualización.
 * @param params Objeto con el ID del usuario.
 * @returns NextResponse con el usuario actualizado (sin passwordHash) o un error.
 */
export async function PUT(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const userId = params.id;

  let rawBody;
  try {
    rawBody = await request.json();
    console.log(`[API PUT /users/${userId}] Received raw body:`, JSON.stringify(rawBody, null, 2));

    // Validar el body con Zod
    const validation = UpdateUserSchema.safeParse(rawBody);
    if (!validation.success) {
      console.error(`[API PUT /users/${userId}] Zod validation failed:`, validation.error.format());
      return NextResponse.json({ error: 'Datos de usuario inválidos.', details: validation.error.format() }, { status: 400 });
    }
    const validatedData = validation.data;
    console.log(`[API PUT /users/${userId}] Zod validation successful. Validated data:`, validatedData);

    // Separar datos base del usuario y las asignaciones de clínicas/roles
    const { clinicAssignments: requestedAssignments, ...userBaseUpdateData } = validatedData;

    // Usar transacción para asegurar atomicidad
    const updatedUserResult = await prisma.$transaction(async (tx) => {
      console.log(`[API PUT /users/${userId}] Starting transaction...`);

      // 1. Actualizar datos base del usuario (SOLO campos válidos del modelo User)
      const baseDataToUpdate: Prisma.UserUpdateInput = {};
      if (userBaseUpdateData.firstName !== undefined) baseDataToUpdate.firstName = userBaseUpdateData.firstName;
      if (userBaseUpdateData.lastName !== undefined) baseDataToUpdate.lastName = userBaseUpdateData.lastName;
      if (userBaseUpdateData.profileImageUrl !== undefined) baseDataToUpdate.profileImageUrl = userBaseUpdateData.profileImageUrl;
      if (userBaseUpdateData.isActive !== undefined) baseDataToUpdate.isActive = userBaseUpdateData.isActive;
      // ¡NO incluir otros campos como dni, fechaNacimiento, etc. si no existen en el modelo User!

      if (Object.keys(baseDataToUpdate).length > 0) {
          console.log(`[API PUT /users/${userId}] Updating user base data:`, baseDataToUpdate);
          await tx.user.update({
            where: { id: userId },
            data: baseDataToUpdate, // Usar datos base preparados y válidos
          });
          console.log(`[API PUT /users/${userId}] User base data updated.`);
      } else {
          console.log(`[API PUT /users/${userId}] No base user data fields to update.`);
      }

      // 2. Gestionar asignaciones de clínicas y roles (SOLO si se proporcionó clinicAssignments)
      if (requestedAssignments !== undefined) {
        console.log(`[API PUT /users/${userId}] Managing clinic/role assignments. Received:`, requestedAssignments);

        // --- LÓGICA REVISADA: Eliminar todas las existentes y luego crear/actualizar --- 

        // Eliminar TODAS las asignaciones actuales para este usuario
        // Esto simplifica la lógica al no tener que calcular diferencias complejas
        // y asegura que solo queden las asignaciones enviadas en la solicitud.
        console.log(`[API PUT /users/${userId}] Deleting ALL current assignments for user...`);
        await tx.userClinicAssignment.deleteMany({
          where: { userId: userId }
        });
        console.log(`[API PUT /users/${userId}] All current assignments deleted.`);

        // Crear las nuevas asignaciones (Upsert no es necesario si siempre borramos primero)
        if (requestedAssignments.length > 0) {
          console.log(`[API PUT /users/${userId}] Creating new assignments:`, requestedAssignments);
          await tx.userClinicAssignment.createMany({
            data: requestedAssignments.map(assignment => ({
              userId: userId,
              clinicId: assignment.clinicId,
              roleId: assignment.roleId,
            })),
          });
          console.log(`[API PUT /users/${userId}] New assignments created.`);
        } else {
           console.log(`[API PUT /users/${userId}] No new assignments requested.`);
        }

      } else {
        console.log(`[API PUT /users/${userId}] No 'clinicAssignments' key found in request body. Skipping assignment update.`);
      }

      // 3. Devolver el usuario actualizado incluyendo las asignaciones con roles
      console.log(`[API PUT /users/${userId}] Transaction finished. Fetching final user state...`);
      const finalUser = await tx.user.findUniqueOrThrow({
        where: { id: userId },
        select: {
          id: true, email: true, firstName: true, lastName: true, profileImageUrl: true,
          isActive: true, createdAt: true, updatedAt: true, systemId: true,
          clinicAssignments: { // Incluir asignaciones actualizadas
            select: {
              clinicId: true,
              roleId: true, // Incluir el roleId
              clinic: { select: { name: true } }, // Incluir nombre de clínica
              role: { select: { name: true } } // Incluir nombre de rol
            }
          }
        }
      });
      // DEVOLVER EL USUARIO FINAL DE LA TRANSACCIÓN
      return finalUser;
    }); // Fin de la transacción

    // <<< AÑADIR LOG AQUÍ para inspeccionar el resultado ANTES de enviarlo >>>
    console.log(`[API PUT /users/${userId}] Final user object BEFORE sending response:`, JSON.stringify(updatedUserResult, null, 2));

    console.log(`[API PUT /users/${userId}] Update successful. Returning updated user data.`);
    return NextResponse.json(updatedUserResult);

  } catch (error) {
    console.error(`[API PUT /users/${userId}] Error during update:`, error);
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      return NextResponse.json({ message: `Usuario ${userId} no encontrado` }, { status: 404 });
    }
     if (error instanceof SyntaxError) {
       return NextResponse.json({ message: 'JSON inválido' }, { status: 400 });
    }
    return NextResponse.json({ message: 'Error interno del servidor' }, { status: 500 });
  }
}

/**
 * Handler para eliminar un usuario existente por su ID.
 * @param request La solicitud entrante.
 * @param params Objeto con el ID del usuario.
 * @returns NextResponse con mensaje de éxito o error.
 */
export async function DELETE(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const userId = params.id;
  try {
    // TODO: Añadir lógica de autorización. ¿Se puede eliminar a sí mismo?
    // TODO: Considerar si es borrado lógico (isActive = false) o físico.
    await prisma.user.delete({ where: { id: userId } });
    return NextResponse.json({ message: `Usuario ${userId} eliminado` }, { status: 200 });

  } catch (error) {
    console.error(`Error deleting user ${userId}:`, error);
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      return NextResponse.json({ message: `Usuario ${userId} no encontrado` }, { status: 404 });
    }
    // Podría haber errores P2003 si el usuario tiene datos relacionados (citas, etc)
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
        return NextResponse.json(
          { message: `No se puede eliminar el usuario ${userId} porque tiene datos relacionados.` },
          { status: 409 } // Conflict
        );
    }
    return NextResponse.json({ message: 'Error interno del servidor' }, { status: 500 });
  }
} 