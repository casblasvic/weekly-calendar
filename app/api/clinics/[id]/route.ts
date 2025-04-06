import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client'; // Importar tipos de Prisma si son necesarios para errores
import { z } from 'zod';

/**
 * Esquema para validar el ID de la clínica en los parámetros
 */
const ParamsSchema = z.object({
  id: z.string().cuid({ message: "ID de clínica inválido." }),
});

/**
 * Esquema para validar el body de la solicitud PUT
 * Incluir TODOS los campos editables desde el formulario de configuración
 */
const UpdateClinicSchema = z.object({
  name: z.string().min(1, "El nombre es obligatorio."),
  address: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  postalCode: z.string().optional().nullable(),
  province: z.string().optional().nullable(),
  countryCode: z.string().optional().nullable(), // Código ISO
  phone: z.string().optional().nullable(),
  email: z.string().email({ message: "Email inválido." }).optional().nullable(),
  currency: z.string().optional().nullable(), // Código ISO
  timezone: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
  // --- AÑADIR CAMPOS FALTANTES --- 
  prefix: z.string().optional().nullable(),
  commercialName: z.string().optional().nullable(), 
  businessName: z.string().optional().nullable(), 
  cif: z.string().optional().nullable(), 
  country: z.string().optional().nullable(), // Nombre país?
  phone2: z.string().optional().nullable(), 
  initialCash: z.number().optional().nullable(), // Prisma usa Float, Zod usa number
  ticketSize: z.string().optional().nullable(), 
  ip: z.string().ip({ version: 'v4' }).optional().nullable(), // Validar IP v4 si aplica
  blockSignArea: z.boolean().optional().nullable(),
  blockPersonalData: z.boolean().optional().nullable(), 
  delayedPayments: z.boolean().optional().nullable(), 
  affectsStats: z.boolean().optional().nullable(),  
  appearsInApp: z.boolean().optional().nullable(),  
  scheduleControl: z.boolean().optional().nullable(), 
  professionalSkills: z.boolean().optional().nullable(), 
  notes: z.string().optional().nullable(), 
  openTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Formato HH:MM inválido").optional().nullable(), // Validar formato HH:MM
  closeTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Formato HH:MM inválido").optional().nullable(),
  slotDuration: z.number().int().positive("Debe ser positivo").optional().nullable(), // Prisma usa Int
  scheduleJson: z.any().optional().nullable(), // z.any() o un esquema más específico si es posible
  tariffId: z.string().cuid({ message: "ID de tarifa inválido" }).optional().nullable(), // Asumiendo CUID para IDs
}).strict(); // Usar .strict() para asegurar que NO se permitan campos extra (opcional pero recomendado)

/**
 * Handler para obtener una clínica específica por su ID.
 * @param request La solicitud entrante (no se usa directamente aquí).
 * @param context Objeto que contiene los parámetros de la ruta dinámica (ej: { id: '...' }).
 * @returns NextResponse con la clínica encontrada (JSON) o un mensaje de error.
 */
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  // 1. Validar ID de la ruta
  console.log("[API GET /api/clinics/[id]] Received params:", params); 

  // --- Acceder al ID directamente ---
  const clinicIdFromParams = params.id;
  console.log(`[API GET /api/clinics/[id]] Extracted clinicId: ${clinicIdFromParams}`);

  // --- Validar el ID extraído con Zod --- 
  const paramsValidation = ParamsSchema.safeParse({ id: clinicIdFromParams });
  if (!paramsValidation.success) {
    console.error("[API GET /api/clinics/[id]] Zod validation failed for extracted ID:", { id: clinicIdFromParams }, "Error:", paramsValidation.error.flatten()); 
    return NextResponse.json({ error: 'ID de clínica inválido.', details: paramsValidation.error.errors }, { status: 400 });
  }
  // Usar el ID validado
  const { id: clinicId } = paramsValidation.data;
  console.log(`[API GET /api/clinics/[id]] Zod validation successful for ID: ${clinicId}`);

  if (!clinicId) { // Doble chequeo por si acaso
      console.error("[API GET /api/clinics/[id]] clinicId is null/undefined after validation.");
      return NextResponse.json({ error: 'No se pudo obtener el ID de la clínica validado.' }, { status: 400 });
  }

  try {
    console.log(`[API GET /api/clinics/[id]] Fetching clinic details for ID: ${clinicId}`);
    const clinic = await prisma.clinic.findUnique({
      where: { id: clinicId },
    });

    if (!clinic) {
      console.warn(`[API GET /api/clinics/[id]] Clinic not found: ${clinicId}`);
      return NextResponse.json({ error: 'Clinic not found' }, { status: 404 });
    }
    
    // El console.log que añadimos antes ya muestra los datos leídos
    console.log(`[API GET /api/clinics/[id]] Data fetched from DB:`, JSON.stringify(clinic, null, 2));

    // Simplemente devolver el objeto clinic, que ahora contiene los campos correctos
    return NextResponse.json(clinic); 

  } catch (error) {
    console.error(`[API GET /api/clinics/[id]] Error fetching clinic ${clinicId}:`, error);
    return NextResponse.json({ error: 'Failed to fetch clinic data' }, { status: 500 });
  }
}

/**
 * Handler para actualizar una clínica existente por su ID.
 * Espera los datos a actualizar en el cuerpo de la solicitud (JSON).
 * @param request La solicitud entrante con los datos de actualización.
 * @param params Objeto que contiene el ID de la clínica a actualizar.
 * @returns NextResponse con la clínica actualizada (JSON) o un mensaje de error.
 */
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  // 1. Validar ID de la ruta
  console.log("[API PUT /api/clinics/[id]] Received params:", params);
  const clinicIdFromParams = params.id;
  console.log(`[API PUT /api/clinics/[id]] Extracted clinicId: ${clinicIdFromParams}`);
  const paramsValidation = ParamsSchema.safeParse({ id: clinicIdFromParams });
  if (!paramsValidation.success) {
    console.error("[API PUT /api/clinics/[id]] Zod validation failed for extracted ID:", { id: clinicIdFromParams }, "Error:", paramsValidation.error.flatten());
    return NextResponse.json({ error: 'ID de clínica inválido.', details: paramsValidation.error.errors }, { status: 400 });
  }
  const { id: clinicId } = paramsValidation.data;
  console.log(`[API PUT /api/clinics/[id]] Zod validation successful for ID: ${clinicId}`);

  // 2. Validar Body de la solicitud
  let validatedData;
  try {
    const body = await request.json();
    const validation = UpdateClinicSchema.safeParse(body);
    if (!validation.success) {
      console.error("Zod validation failed for PUT /api/clinics/[id] body:", validation.error.format());
      return NextResponse.json({ error: 'Datos de clínica inválidos.', details: validation.error.format() }, { status: 400 });
    }
    validatedData = validation.data;
  } catch (error) {
    console.error("Error parsing PUT request body:", error);
    return NextResponse.json({ error: 'Error al parsear los datos de la solicitud.' }, { status: 400 });
  }

  // 3. Actualizar en la base de datos
  try {
    // *** LOG ANTES DE ACTUALIZAR ***
    console.log(`[API PUT /api/clinics/${clinicId}] Attempting update with validated data:`, JSON.stringify(validatedData, null, 2));
    
    const updatedClinic = await prisma.clinic.update({
      where: { id: clinicId },
      data: validatedData, // Usar los datos validados
      // Opcionalmente, incluir relaciones si queremos devolverlas actualizadas
      // include: { cabins: true, clinicSchedules: { where: {endDate: null}, include: {template: {include: {blocks: true}}}} }
    });

    // Devolver la clínica actualizada (solo los campos base o con include)
    return NextResponse.json(updatedClinic);

  } catch (error: any) {
    console.error("Error updating clinic:", error);
    // Manejar error si la clínica no existe (P2025)
    if (error.code === 'P2025') {
        return NextResponse.json({ error: 'Clínica no encontrada.' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Error interno del servidor al actualizar la clínica.' }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * Handler para eliminar una clínica existente por su ID.
 * @param request La solicitud entrante (no se usa directamente aquí).
 * @param params Objeto que contiene el ID de la clínica a eliminar.
 * @returns NextResponse con un mensaje de éxito y estado 200/204, o un mensaje de error.
 */
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const clinicId = params.id;

  try {
    // TODO: Implementar lógica de autorización para asegurar que el usuario puede eliminar esta clínica.

    // Eliminar la clínica de la base de datos
    await prisma.clinic.delete({
      where: { id: clinicId },
    });

    // Devolver respuesta de éxito (200 con mensaje o 204 sin contenido)
    // return new NextResponse(null, { status: 204 }); // Opción No Content
    return NextResponse.json(
      { message: `Clínica con ID ${clinicId} eliminada correctamente` },
      { status: 200 }
    );

  } catch (error) {
    console.error(`Error deleting clinic with ID ${clinicId}:`, error);

    // Manejar error específico de Prisma "Registro no encontrado"
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      return NextResponse.json(
        { message: `Clínica con ID ${clinicId} no encontrada para eliminar` },
        { status: 404 } // Not Found
      );
    }
    
    // Manejar error de restricción de clave externa (si la clínica tiene datos relacionados)
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
        return NextResponse.json(
          { message: `No se puede eliminar la clínica con ID ${clinicId} porque tiene datos relacionados (ej: citas, TPVs).` },
          { status: 409 } // Conflict
        );
    }

    // Devolver error genérico del servidor
    return NextResponse.json(
      { message: 'Error interno del servidor al eliminar la clínica' },
      { status: 500 }
    );
  }
}

// TODO: Implementar handler DELETE para /api/clinics/[id] 