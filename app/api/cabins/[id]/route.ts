import { NextResponse } from 'next/server';
// Importar instancia singleton Y el namespace Prisma
import { prisma } from '@/lib/db';
import { Prisma } from '@prisma/client'; // Añadir importación de Prisma
import { z } from 'zod';
import { getServerAuthSession } from "@/lib/auth"; // <<< IMPORTAR HELPER DE SESIÓN

// Eliminar instanciación directa
// // const prisma = new PrismaClient(); // MIGRADO: usar singleton desde @/lib/db

// Esquema para validar el ID en los parámetros
const ParamsSchema = z.object({
  id: z.string().cuid({ message: "ID de cabina inválido." }),
});

// Esquema para validar el body de la solicitud PUT
// Similar a Create, pero todos los campos son opcionales excepto quizás el nombre?
// No permitir cambiar clinicId o systemId en una actualización
const UpdateCabinSchema = z.object({
  name: z.string().min(1, "El nombre es obligatorio.").optional(),
  code: z.string().optional().nullable(),
  color: z.string().optional().nullable(),
  order: z.number().int().optional().nullable(),
  isActive: z.boolean().optional(),
});

// --- Función PUT --- 
export async function PUT(request: Request, props: { params: Promise<{ id: string }> }) {
  // <<< 1. VALIDAR SESIÓN Y OBTENER systemId >>>
  const session = await getServerAuthSession();
  if (!session || !session.user?.systemId) {
      return NextResponse.json({ message: 'No autorizado o falta systemId' }, { status: 401 });
  }
  const systemId = session.user.systemId;

  // <<< 2. VALIDAR PARÁMETROS DE RUTA (cabinId) >>>
  const params = await props.params;
  const paramsValidation = ParamsSchema.safeParse(params);
   if (!paramsValidation.success) {
    console.warn("[API PUT /api/cabins/[id]] Invalid route params:", paramsValidation.error.errors);
    return NextResponse.json({ error: 'ID de cabina inválido.', details: paramsValidation.error.errors }, { status: 400 });
  }
  const { id: cabinId } = paramsValidation.data;

  // TODO: Add authentication/authorization // <<< COMENTARIO OBSOLETO
  // const { id: cabinId } = params; // <<< YA SE HACE ARRIBA

  // *** LOG RECIBIDO ***
  console.log(`[API PUT /api/cabins/[id]] Received request for cabinId: ${cabinId} from systemId: ${systemId}`);

  // if (!cabinId) { // <<< YA VALIDADO ARRIBA
  //   console.warn("[API PUT /api/cabins/[id]] Cabin ID is missing in params.");
  //   return NextResponse.json({ error: 'Cabin ID is required' }, { status: 400 });
  // }

  try {
    // <<< 3. VALIDAR BODY >>>
    const body = await request.json();
     // Usar Zod para validar el body (más robusto)
    const validation = UpdateCabinSchema.safeParse(body);
    if (!validation.success) {
      console.warn(`[API PUT /api/cabins/[id]] Validation failed:`, validation.error.errors);
      return NextResponse.json({ error: 'Datos de cabina inválidos.', details: validation.error.errors }, { status: 400 });
    }
    const validatedData = validation.data; // Datos validados para usar en la actualización

    // const { name, code, color, isActive, order } = body; // <<< USAR validatedData

    // *** LOG BODY ***
    console.log(`[API PUT /api/cabins/[id]] Request body validated:`, validatedData);

    // if (name !== undefined && !name) { // <<< Zod ya valida esto si se define min(1)
    //   console.warn(`[API PUT /api/cabins/[id]] Validation failed: Name cannot be empty.`);
    //   return NextResponse.json({ error: 'Cabin name cannot be empty if provided' }, { status: 400 });
    // }

    // <<< 4. VERIFICAR PERTENENCIA AL systemId ANTES DE ACTUALIZAR >>>
    const cabin = await prisma.cabin.findUnique({
        where: { id: cabinId },
        include: { clinic: { select: { systemId: true } } } // Incluir systemId de la clínica
    });

    if (!cabin) {
        console.warn(`[API PUT /api/cabins/[id]] Cabin ${cabinId} not found.`);
        return NextResponse.json({ error: 'Cabina no encontrada.' }, { status: 404 });
    }

    if (cabin.clinic.systemId !== systemId) {
        console.warn(`[API PUT /api/cabins/[id]] Cabin ${cabinId} does not belong to system ${systemId}. Belongs to ${cabin.clinic.systemId}.`);
        // Devolver 404 para no revelar existencia a usuarios no autorizados
        return NextResponse.json({ error: 'Cabina no encontrada.' }, { status: 404 });
    }

    // <<< 5. ACTUALIZAR EN DB USANDO validatedData >>>
    console.log(`[API PUT /api/cabins/[id]] Attempting to update cabin ${cabinId} in DB...`);
    const updatedCabin = await prisma.cabin.update({
      where: {
        id: cabinId,
        // Añadir clinic.systemId aquí es redundante si ya lo verificamos antes, pero puede ser una doble seguridad
        // clinic: { systemId: systemId } // Opcional: doble check
      },
      // Usar los datos validados directamente
      data: validatedData,
      // data: { // <<< FORMA ANTERIOR MENOS SEGURA/LIMPIA
      //   name: name !== undefined ? name : undefined,
      //   code: code !== undefined ? (code || null) : undefined,
      //   color: color !== undefined ? (color || null) : undefined,
      //   isActive: isActive !== undefined ? isActive : undefined,
      //   order: order !== undefined ? (Number.isFinite(order) ? Number(order) : null) : undefined,
      // },
    });
    console.log(`[API PUT /api/cabins/[id]] Cabin ${cabinId} updated successfully.`);

    return NextResponse.json(updatedCabin);

  } catch (error) {
    console.error("[API Cabins PUT] Error:", error);
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        const target = (error.meta?.target as string[])?.join(', ') || 'campos';
        return NextResponse.json({ error: `Conflicto: Ya existe una cabina con los mismos valores en ${target}.` }, { status: 409 });
      }
      if (error.code === 'P2025') {
           // Este error ahora sería menos probable porque verificamos la existencia antes
           return NextResponse.json({ error: 'Cabina no encontrada para actualizar.' }, { status: 404 });
      }
    }
     if (error instanceof z.ZodError) { // Manejar error de validación Zod del body
      return NextResponse.json({ error: 'Datos inválidos', details: error.errors }, { status: 400 });
    }
    if (error instanceof SyntaxError) { // Manejar error de JSON inválido
       return NextResponse.json({ message: 'JSON inválido' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Error interno del servidor al actualizar la cabina.' }, { status: 500 });
  } finally {
     // await prisma.$disconnect(); // No desconectar con la instancia singleton
  }
}

// --- Función DELETE --- 
export async function DELETE(request: Request, props: { params: Promise<{ id: string }> }) {
   // <<< 1. VALIDAR SESIÓN Y OBTENER systemId >>>
  const session = await getServerAuthSession();
  if (!session || !session.user?.systemId) {
      return NextResponse.json({ message: 'No autorizado o falta systemId' }, { status: 401 });
  }
  const systemId = session.user.systemId;

  const params = await props.params;
  // 1. Validar ID de ruta // <<< YA LO HACE, REORDENAR A PASO 2 >>>
  const paramsValidation = ParamsSchema.safeParse(params);
  if (!paramsValidation.success) {
    console.warn("[API DELETE /api/cabins/[id]] Invalid route params:", paramsValidation.error.errors);
    return NextResponse.json({ error: 'ID de cabina inválido.', details: paramsValidation.error.errors }, { status: 400 });
  }
  const { id: cabinId } = paramsValidation.data;

  console.log(`[API DELETE /api/cabins/[id]] Received request for cabinId: ${cabinId} from systemId: ${systemId}`);

  // 2. Eliminar de DB // <<< REORDENAR A PASO 3 >>>
  try {
    // <<< 2. VERIFICAR PERTENENCIA AL systemId ANTES DE ELIMINAR >>>
     const cabin = await prisma.cabin.findUnique({
        where: { id: cabinId },
        include: { clinic: { select: { systemId: true } } } // Incluir systemId de la clínica
    });

     if (!cabin) {
        console.warn(`[API DELETE /api/cabins/[id]] Cabin ${cabinId} not found.`);
        // Devolver 404 incluso si no existe, para no revelar información
        return NextResponse.json({ error: 'Cabina no encontrada.' }, { status: 404 });
    }

     if (cabin.clinic.systemId !== systemId) {
        console.warn(`[API DELETE /api/cabins/[id]] Cabin ${cabinId} does not belong to system ${systemId}. Belongs to ${cabin.clinic.systemId}.`);
        // Devolver 404 para no revelar existencia a usuarios no autorizados
        return NextResponse.json({ error: 'Cabina no encontrada.' }, { status: 404 });
    }

     // <<< 3. ELIMINAR DE DB >>>
    console.log(`[API DELETE /api/cabins/[id]] Attempting to delete cabin ${cabinId} from DB...`);
    await prisma.cabin.delete({
      where: {
          id: cabinId,
          // clinic: { systemId: systemId } // Opcional: doble check
      },
    });
    console.log(`[API DELETE /api/cabins/[id]] Cabin ${cabinId} deleted successfully.`);

    // Devolver éxito sin contenido
    return new NextResponse(null, { status: 204 });

  } catch (error) { // <<< MEJORAR EL MANEJO DE ERRORES
    console.error("[API Cabins DELETE] Error:", error);
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2025') {
        // Este error ahora sería menos probable porque verificamos la existencia antes
        return NextResponse.json({ error: 'Cabina no encontrada para eliminar.' }, { status: 404 });
      }
      // Podría haber errores de restricción de FK si la cabina está en uso (ej. en citas)
      if (error.code === 'P2003') {
           console.warn(`[API DELETE /api/cabins/[id]] Failed to delete cabin ${cabinId} due to foreign key constraint.`);
           return NextResponse.json({ error: 'No se puede eliminar la cabina porque está siendo utilizada.' }, { status: 409 }); // Conflict
      }
    }
    return NextResponse.json({ error: 'Error interno del servidor al eliminar la cabina.' }, { status: 500 });
  } finally {
    // await prisma.$disconnect(); // No desconectar con la instancia singleton
  }
} 