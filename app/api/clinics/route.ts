import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db'; // Importar la instancia de Prisma
import { Prisma } from '@prisma/client';
import { z } from 'zod'; // Añadir Zod
import { getServerAuthSession } from "@/lib/auth"; // Importar helper de sesión

// Esquema Zod para validar la creación/actualización de clínicas
const ClinicSchema = z.object({
  name: z.string().min(1, "El nombre es obligatorio"),
  currency: z.string().min(3, "Código de moneda inválido").max(3, "Código de moneda inválido"),
  address: z.string().nullish(),
  city: z.string().nullish(),
  postalCode: z.string().nullish(),
  province: z.string().nullish(),
  timezone: z.string().nullish(),
  phone: z.string().nullish(),
  phone2: z.string().nullish(),
  email: z.string().email("Email inválido").nullish(),
  isActive: z.boolean().optional(),
  // Añadir otros campos de la UI si se manejan aquí
  prefix: z.string().nullish(),
  commercialName: z.string().nullish(),
  businessName: z.string().nullish(),
  cif: z.string().nullish(),
  countryIsoCode: z.string().length(2, "Código ISO inválido").nullish(),
  languageIsoCode: z.string().length(2, "Código ISO idioma inválido").nullish(),
  phone1CountryIsoCode: z.string().length(2, "Código ISO inválido").nullish(),
  phone2CountryIsoCode: z.string().length(2, "Código ISO inválido").nullish(),
  initialCash: z.number().nonnegative().nullish(),
  ticketSize: z.string().nullish(),
  ip: z.string().nullish(),
  blockSignArea: z.boolean().optional(),
  blockPersonalData: z.boolean().optional(),
  delayedPayments: z.boolean().optional(),
  affectsStats: z.boolean().optional(),
  appearsInApp: z.boolean().optional(),
  scheduleControl: z.boolean().optional(),
  professionalSkills: z.boolean().optional(),
  notes: z.string().nullish(),
  openTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Formato HH:MM inválido").nullish(),
  closeTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Formato HH:MM inválido").nullish(),
  slotDuration: z.number().int().positive("Duración de slot debe ser positiva").nullish(),
  linkedScheduleTemplateId: z.string().cuid().nullish(),
  tariffId: z.string().cuid().nullish(),
});

export async function GET(request: Request) {
  const session = await getServerAuthSession();
  if (!session || !session.user?.systemId) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }
  const systemId = session.user.systemId;

  try {
    const clinics = await prisma.clinic.findMany({
      where: { systemId: systemId },
      select: {
        id: true, 
        name: true, 
        prefix: true, 
        isActive: true, 
        phone: true, 
        phone2: true, 
        address: true, 
        city: true, 
        postalCode: true, 
        province: true,
        email: true, 
        currency: true, 
        countryIsoCode: true,    // FK País
        languageIsoCode: true,   // Campo directo
        phone1CountryIsoCode: true, // Campo directo
        phone2CountryIsoCode: true, // Campo directo
        tariffId: true           // FK Tarifa
      },
      orderBy: { name: 'asc' }
    });
    return NextResponse.json(clinics);
  } catch (error) {
    console.error("Error fetching clinics:", error);
    return NextResponse.json({ message: 'Error interno del servidor' }, { status: 500 });
  }
}

/**
 * Handler para crear una nueva clínica.
 * Espera los datos de la clínica en el cuerpo de la solicitud (JSON).
 * @param request La solicitud entrante con los datos de la nueva clínica.
 * @returns NextResponse con la clínica creada (JSON) y estado 201, o un mensaje de error.
 */
export async function POST(request: Request) {
  const session = await getServerAuthSession();
  if (!session || !session.user?.systemId) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }
  const systemId = session.user.systemId;

  try {
    const body = await request.json();
    const validatedData = ClinicSchema.parse(body);

    const { 
        linkedScheduleTemplateId, 
        tariffId, 
        countryIsoCode, 
        languageIsoCode,
        phone1CountryIsoCode,
        phone2CountryIsoCode,
        ...clinicData
    } = validatedData;

    // Crear la nueva clínica
    const dataToCreate: Prisma.ClinicCreateInput = {
        name: clinicData.name!,
        currency: clinicData.currency!,
        ...clinicData,
        system: { connect: { id: systemId } },
        isActive: clinicData.isActive !== undefined ? clinicData.isActive : true,
        blockSignArea: clinicData.blockSignArea ?? false,
        blockPersonalData: clinicData.blockPersonalData ?? false,
        delayedPayments: clinicData.delayedPayments ?? false,
        affectsStats: clinicData.affectsStats ?? true,
        appearsInApp: clinicData.appearsInApp ?? true,
        scheduleControl: clinicData.scheduleControl ?? false,
        professionalSkills: clinicData.professionalSkills ?? false,
        languageIsoCode: languageIsoCode,
        ...(linkedScheduleTemplateId && { linkedScheduleTemplate: { connect: { id: linkedScheduleTemplateId } } }),
        ...(tariffId && { tariff: { connect: { id: tariffId } } }),
        ...(countryIsoCode && { country: { connect: { isoCode: countryIsoCode } } }),
        phone1CountryIsoCode: clinicData.phone ? phone1CountryIsoCode : null,
        phone2CountryIsoCode: clinicData.phone2 ? phone2CountryIsoCode : null,
    };
    
    const newClinic = await prisma.clinic.create({
      data: dataToCreate,
      select: {
        id: true, name: true, prefix: true, isActive: true, phone: true, phone2: true,
        address: true, city: true, postalCode: true, province: true,
        email: true, currency: true,
        countryIsoCode: true,
        languageIsoCode: true,
        phone1CountryIsoCode: true,
        phone2CountryIsoCode: true,
        country: { select: { name: true, phoneCode: true } },
        tariff: { select: { id: true, name: true } },
        createdAt: true,
        updatedAt: true
      }
    });

    return NextResponse.json(newClinic, { status: 201 });

  } catch (error) {
    console.error("Error creating clinic:", error);

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        return NextResponse.json({ message: 'Ya existe una clínica con ese nombre.' }, { status: 409 });
      }
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Datos inválidos', details: error.errors }, { status: 400 });
    }
    if (error instanceof SyntaxError) {
       return NextResponse.json({ message: 'JSON inválido' }, { status: 400 });
    }
    return NextResponse.json({ message: 'Error interno del servidor.' }, { status: 500 });
  }
}

// Podríamos añadir funciones PUT, DELETE aquí más tarde 
// Podríamos añadir funciones PUT, DELETE aquí más tarde 