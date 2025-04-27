// Importamos TODO el paquete como 'pkg'
import pkg from '@prisma/client';
const { PrismaClient, Prisma } = pkg; // Obtener constructor y namespace Prisma

// --- Importación de Tipos Específicos ---
import type { ScheduleTemplate as PrismaScheduleTemplateType, ScheduleTemplateBlock as PrismaScheduleTemplateBlockType, DayOfWeek, ScheduleTemplate } from '@prisma/client'; // Renombrar para evitar conflicto
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library'; // Importar error específico
// --- FIN Importación de Tipos ---

// --- IMPORTACIÓN EXPLÍCITA (Eliminada) ---
// import {
//   PrismaClient,
//   Prisma,
//   ScheduleTemplate,
//   DayOfWeek
// } from '@prisma/client';
// --- FIN IMPORTACIÓN EXPLÍCITA ---

// Ya no necesitamos importar Permission aquí
// import { Permission } from '@prisma/client'; // Comentar o eliminar si estaba duplicada

import bcrypt from 'bcrypt';
import path from 'path'; // Importar path
import { fileURLToPath } from 'url'; // Importar fileURLToPath
// import seedCountries from './seed-countries'; // <<< ELIMINAR Importación

// Eliminar asignación a constante DayOfWeek, usar directamente el importado
// const DayOfWeek = pkg.DayOfWeek;

// --- Calcular ruta absoluta a mockData.ts ---
const __filename = fileURLToPath(import.meta.url); // Ruta al archivo actual (seed.ts)
const __dirname = path.dirname(__filename); // Directorio actual (prisma/)
// Resolvemos subiendo un nivel desde prisma/ y añadiendo mockData.ts
// Asegurarse de que el archivo real se llama mockData.ts
const mockDataPath = path.resolve(__dirname, '../mockData.ts');
// --- Fin cálculo ---

// Quitar la importación estática anterior
// import { initialMockData } from '../mockData'; 

// --- DATOS DE PAÍSES (Movido desde seed-countries.ts) ---
// Lista ampliada de países con sus datos
// Fuentes de datos ejemplo - verificar/completar con datos precisos y relevantes
// Códigos ISO 3166-1 alpha-2, Nombres comunes, Zonas Horarias IANA, Códigos Telefónicos Internacionales
const countriesData = [
  // Europa
  { isoCode: 'ES', name: 'España', timezone: 'Europe/Madrid', phoneCode: '+34', languageCode: 'es', languageName: 'Español', currencyCode: 'EUR', currencyName: 'Euro', currencySymbol: '€' },
  { isoCode: 'FR', name: 'Francia', timezone: 'Europe/Paris', phoneCode: '+33', languageCode: 'fr', languageName: 'Francés', currencyCode: 'EUR', currencyName: 'Euro', currencySymbol: '€' },
  { isoCode: 'DE', name: 'Alemania', timezone: 'Europe/Berlin', phoneCode: '+49', languageCode: 'de', languageName: 'Alemán', currencyCode: 'EUR', currencyName: 'Euro', currencySymbol: '€' },
  { isoCode: 'IT', name: 'Italia', timezone: 'Europe/Rome', phoneCode: '+39', languageCode: 'it', languageName: 'Italiano', currencyCode: 'EUR', currencyName: 'Euro', currencySymbol: '€' },
  { isoCode: 'GB', name: 'Reino Unido', timezone: 'Europe/London', phoneCode: '+44', languageCode: 'en', languageName: 'Inglés', currencyCode: 'GBP', currencyName: 'Pound Sterling', currencySymbol: '£' },
  { isoCode: 'PT', name: 'Portugal', timezone: 'Europe/Lisbon', phoneCode: '+351', languageCode: 'pt', languageName: 'Portugués', currencyCode: 'EUR', currencyName: 'Euro', currencySymbol: '€' },
  { isoCode: 'IE', name: 'Irlanda', timezone: 'Europe/Dublin', phoneCode: '+353', languageCode: 'en', languageName: 'Inglés', currencyCode: 'EUR', currencyName: 'Euro', currencySymbol: '€' },
  { isoCode: 'NL', name: 'Países Bajos', timezone: 'Europe/Amsterdam', phoneCode: '+31', languageCode: 'nl', languageName: 'Neerlandés', currencyCode: 'EUR', currencyName: 'Euro', currencySymbol: '€' },
  { isoCode: 'BE', name: 'Bélgica', timezone: 'Europe/Brussels', phoneCode: '+32', languageCode: 'nl', languageName: 'Neerlandés', currencyCode: 'EUR', currencyName: 'Euro', currencySymbol: '€' }, // Note: Multiple official languages
  { isoCode: 'LU', name: 'Luxemburgo', timezone: 'Europe/Luxembourg', phoneCode: '+352', languageCode: 'lb', languageName: 'Luxemburgués', currencyCode: 'EUR', currencyName: 'Euro', currencySymbol: '€' }, // Note: Multiple languages
  { isoCode: 'CH', name: 'Suiza', timezone: 'Europe/Zurich', phoneCode: '+41', languageCode: 'de', languageName: 'Alemán', currencyCode: 'CHF', currencyName: 'Swiss Franc', currencySymbol: 'CHF' }, // Note: Multiple languages
  { isoCode: 'AT', name: 'Austria', timezone: 'Europe/Vienna', phoneCode: '+43', languageCode: 'de', languageName: 'Alemán', currencyCode: 'EUR', currencyName: 'Euro', currencySymbol: '€' },
  { isoCode: 'PL', name: 'Polonia', timezone: 'Europe/Warsaw', phoneCode: '+48', languageCode: 'pl', languageName: 'Polaco', currencyCode: 'PLN', currencyName: 'Polish Złoty', currencySymbol: 'zł' },
  { isoCode: 'SE', name: 'Suecia', timezone: 'Europe/Stockholm', phoneCode: '+46', languageCode: 'sv', languageName: 'Sueco', currencyCode: 'SEK', currencyName: 'Swedish Krona', currencySymbol: 'kr' },
  { isoCode: 'NO', name: 'Noruega', timezone: 'Europe/Oslo', phoneCode: '+47', languageCode: 'no', languageName: 'Noruego', currencyCode: 'NOK', currencyName: 'Norwegian Krone', currencySymbol: 'kr' },
  { isoCode: 'DK', name: 'Dinamarca', timezone: 'Europe/Copenhagen', phoneCode: '+45', languageCode: 'da', languageName: 'Danés', currencyCode: 'DKK', currencyName: 'Danish Krone', currencySymbol: 'kr' },
  { isoCode: 'FI', name: 'Finlandia', timezone: 'Europe/Helsinki', phoneCode: '+358', languageCode: 'fi', languageName: 'Finlandés', currencyCode: 'EUR', currencyName: 'Euro', currencySymbol: '€' },
  { isoCode: 'GR', name: 'Grecia', timezone: 'Europe/Athens', phoneCode: '+30', languageCode: 'el', languageName: 'Griego', currencyCode: 'EUR', currencyName: 'Euro', currencySymbol: '€' },

  // América del Norte
  { isoCode: 'US', name: 'Estados Unidos', timezone: 'America/New_York', phoneCode: '+1', languageCode: 'en', languageName: 'Inglés', currencyCode: 'USD', currencyName: 'US Dollar', currencySymbol: '$' }, // Note: Multiple timezones
  { isoCode: 'CA', name: 'Canadá', timezone: 'America/Toronto', phoneCode: '+1', languageCode: 'en', languageName: 'Inglés', currencyCode: 'CAD', currencyName: 'Canadian Dollar', currencySymbol: '$' }, // Note: Multiple timezones, bilingual
  { isoCode: 'MX', name: 'México', timezone: 'America/Mexico_City', phoneCode: '+52', languageCode: 'es', languageName: 'Español', currencyCode: 'MXN', currencyName: 'Mexican Peso', currencySymbol: '$' }, // Note: Multiple timezones

  // América Latina
  { isoCode: 'BR', name: 'Brasil', timezone: 'America/Sao_Paulo', phoneCode: '+55', languageCode: 'pt', languageName: 'Portugués', currencyCode: 'BRL', currencyName: 'Brazilian Real', currencySymbol: 'R$' }, // Note: Multiple timezones
  { isoCode: 'AR', name: 'Argentina', timezone: 'America/Argentina/Buenos_Aires', phoneCode: '+54', languageCode: 'es', languageName: 'Español', currencyCode: 'ARS', currencyName: 'Argentine Peso', currencySymbol: '$' },
  { isoCode: 'CO', name: 'Colombia', timezone: 'America/Bogota', phoneCode: '+57', languageCode: 'es', languageName: 'Español', currencyCode: 'COP', currencyName: 'Colombian Peso', currencySymbol: '$' },
  { isoCode: 'CL', name: 'Chile', timezone: 'America/Santiago', phoneCode: '+56', languageCode: 'es', languageName: 'Español', currencyCode: 'CLP', currencyName: 'Chilean Peso', currencySymbol: '$' },
  { isoCode: 'PE', name: 'Perú', timezone: 'America/Lima', phoneCode: '+51', languageCode: 'es', languageName: 'Español', currencyCode: 'PEN', currencyName: 'Peruvian Sol', currencySymbol: 'S/' },
  { isoCode: 'VE', name: 'Venezuela', timezone: 'America/Caracas', phoneCode: '+58', languageCode: 'es', languageName: 'Español', currencyCode: 'VES', currencyName: 'Venezuelan Bolívar Soberano', currencySymbol: 'Bs.' }, // Official VES
  { isoCode: 'EC', name: 'Ecuador', timezone: 'America/Guayaquil', phoneCode: '+593', languageCode: 'es', languageName: 'Español', currencyCode: 'USD', currencyName: 'US Dollar', currencySymbol: '$' }, // Ecuador uses USD
  { isoCode: 'UY', name: 'Uruguay', timezone: 'America/Montevideo', phoneCode: '+598', languageCode: 'es', languageName: 'Español', currencyCode: 'UYU', currencyName: 'Uruguayan Peso', currencySymbol: '$U' },
  { isoCode: 'PY', name: 'Paraguay', timezone: 'America/Asuncion', phoneCode: '+595', languageCode: 'es', languageName: 'Español', currencyCode: 'PYG', currencyName: 'Paraguayan Guaraní', currencySymbol: '₲' }, // Note: Guarani also official
  { isoCode: 'BO', name: 'Bolivia', timezone: 'America/La_Paz', phoneCode: '+591', languageCode: 'es', languageName: 'Español', currencyCode: 'BOB', currencyName: 'Bolivian Boliviano', currencySymbol: 'Bs.' }, // Note: Multiple indigenous languages
  { isoCode: 'CR', name: 'Costa Rica', timezone: 'America/Costa_Rica', phoneCode: '+506', languageCode: 'es', languageName: 'Español', currencyCode: 'CRC', currencyName: 'Costa Rican Colón', currencySymbol: '₡' },
  { isoCode: 'PA', name: 'Panamá', timezone: 'America/Panama', phoneCode: '+507', languageCode: 'es', languageName: 'Español', currencyCode: 'USD', currencyName: 'US Dollar', currencySymbol: '$' }, // Panama uses USD primarily
  { isoCode: 'DO', name: 'República Dominicana', timezone: 'America/Santo_Domingo', phoneCode: '+1-809', languageCode: 'es', languageName: 'Español', currencyCode: 'DOP', currencyName: 'Dominican Peso', currencySymbol: 'RD$' }, // Shared code
  { isoCode: 'GT', name: 'Guatemala', timezone: 'America/Guatemala', phoneCode: '+502', languageCode: 'es', languageName: 'Español', currencyCode: 'GTQ', currencyName: 'Guatemalan Quetzal', currencySymbol: 'Q' }, // Note: Multiple Mayan languages

  // Oceanía
  { isoCode: 'AU', name: 'Australia', timezone: 'Australia/Sydney', phoneCode: '+61', languageCode: 'en', languageName: 'Inglés', currencyCode: 'AUD', currencyName: 'Australian Dollar', currencySymbol: '$' }, // Note: Multiple timezones
  { isoCode: 'NZ', name: 'Nueva Zelanda', timezone: 'Pacific/Auckland', phoneCode: '+64', languageCode: 'en', languageName: 'Inglés', currencyCode: 'NZD', currencyName: 'New Zealand Dollar', currencySymbol: '$' }, // Note: Maori also official

  // Asia (Ejemplos)
  { isoCode: 'JP', name: 'Japón', timezone: 'Asia/Tokyo', phoneCode: '+81', languageCode: 'ja', languageName: 'Japonés', currencyCode: 'JPY', currencyName: 'Japanese Yen', currencySymbol: '¥' },
  { isoCode: 'KR', name: 'Corea del Sur', timezone: 'Asia/Seoul', phoneCode: '+82', languageCode: 'ko', languageName: 'Coreano', currencyCode: 'KRW', currencyName: 'South Korean Won', currencySymbol: '₩' },
  { isoCode: 'SG', name: 'Singapur', timezone: 'Asia/Singapore', phoneCode: '+65', languageCode: 'en', languageName: 'Inglés', currencyCode: 'SGD', currencyName: 'Singapore Dollar', currencySymbol: '$' }, // Note: Multiple languages
  { isoCode: 'AE', name: 'Emiratos Árabes Unidos', timezone: 'Asia/Dubai', phoneCode: '+971', languageCode: 'ar', languageName: 'Árabe', currencyCode: 'AED', currencyName: 'UAE Dirham', currencySymbol: 'د.إ' },

  // África (Ejemplos)
  { isoCode: 'ZA', name: 'Sudáfrica', timezone: 'Africa/Johannesburg', phoneCode: '+27', languageCode: 'en', languageName: 'Inglés', currencyCode: 'ZAR', currencyName: 'South African Rand', currencySymbol: 'R' }, // Note: Multiple languages
  { isoCode: 'MA', name: 'Marruecos', timezone: 'Africa/Casablanca', phoneCode: '+212', languageCode: 'ar', languageName: 'Árabe', currencyCode: 'MAD', currencyName: 'Moroccan Dirham', currencySymbol: 'د.م.' },

  // ... Añadir más países si es necesario ...
];
// --- FIN DATOS DE PAÍSES ---

const prisma = new PrismaClient();

async function main() {
  console.log(`[Diagnostic Seed] Start seeding ...`);

  // --- DIAGNOSTIC STEP 1: Log available models ---
  try {
    console.log("[Diagnostic Seed] Attempting to check prisma instance keys:", Object.keys(prisma));
  } catch (e) {
    console.error("[Diagnostic Seed] Error logging prisma keys:", e);
  }

  console.log("[Diagnostic Seed] Diagnostic checks finished (removed clinicSchedule check).");

  // --- CÓDIGO ORIGINAL RESTAURADO (Ajustar la carga de mockData si es necesario) ---
  const currentFileURL = import.meta.url;
  const currentFilePath = fileURLToPath(currentFileURL);
  const currentDir = path.dirname(currentFilePath);
  const mockDataPathResolved = path.resolve(currentDir, '../mockData.ts'); 

  console.log(`Importing mock data from: ${mockDataPathResolved}`);
  let initialMockData;
  try {
    const mockDataModule = await import('file://' + mockDataPathResolved);
    initialMockData = mockDataModule.initialMockData;
    if (!initialMockData) {
      throw new Error("initialMockData not found in the imported module.");
    }
  } catch (importError) {
     console.error("Error importing mock data:", importError);
     process.exit(1);
  }

  console.log(`Start seeding real data...`);

  // --- Crear Entidades Base (System, Permissions, Roles) --- 
  console.log('Creating base entities...');

  let system = await prisma.system.findFirst({
    where: { name: 'Sistema Ejemplo Avatar' },
  });
  if (!system) {
    system = await prisma.system.create({
      data: {
        name: 'Sistema Ejemplo Avatar',
        isActive: true,
      },
    });
    console.log(`Created system with id: ${system.id}`);
  } else {
    console.log(`Using existing system with id: ${system.id}`);
  }

  // --- Crear Países --- 
  console.log(`Start seeding countries...`);
  for (const country of countriesData) {
    const existingCountry = await prisma.countryInfo.findUnique({
      where: { isoCode: country.isoCode },
    });

    if (existingCountry) {
        console.log(`Country ${country.isoCode} already exists, updating...`);
        await prisma.countryInfo.update({
            where: { isoCode: country.isoCode },
            data: country,
        });
    } else {
        console.log(`Creating country ${country.isoCode} - ${country.name}...`);
        await prisma.countryInfo.create({
            data: country,
        });
    }
  }
  console.log(`Seeding countries finished.`);
  // --- FIN Crear Países ---

  console.log('Creating base permissions...');
  const permissionsToCreate = [
    { action: 'ver', module: 'agenda_diaria' },
    { action: 'ver', module: 'agenda_semanal' },
    { action: 'crear', module: 'cita' },
    { action: 'editar', module: 'cita' },
    { action: 'eliminar', module: 'cita' },
    { action: 'marcar_asistida', module: 'cita' },
    { action: 'buscar', module: 'clientes' },
    { action: 'crear', module: 'clientes' },
    { action: 'editar', module: 'clientes' },
    { action: 'ver_datos_contacto', module: 'clientes' },
    { action: 'eliminar', module: 'clientes' },
    { action: 'gestionar', module: 'clinicas' },
    { action: 'gestionar', module: 'usuarios' },
    { action: 'gestionar', module: 'roles_permisos' },
    { action: 'gestionar', module: 'catalogo_servicios' },
    { action: 'gestionar', module: 'catalogo_productos' },
    { action: 'gestionar', module: 'plantillas_horarias' },
  ];

  try {
      await prisma.permission.createMany({
        data: permissionsToCreate,
        skipDuplicates: true, 
      });
      console.log(`${permissionsToCreate.length} base permissions ensured.`);
  } catch (error) {
      console.error("Error creating permissions:", error);
      await prisma.$disconnect();
      process.exit(1);
  }

  const allPermissions = await prisma.permission.findMany();
  const allPermissionIds = allPermissions.map(p => ({ permissionId: p.id }));

  console.log('Creating base roles and assigning permissions...');

  const adminRole = await prisma.role.upsert({
    where: { name_systemId: { name: 'Administrador', systemId: system.id } },
    update: {
        permissions: {
            deleteMany: {},
            create: allPermissionIds,
        }
    },
    create: {
      name: 'Administrador',
      description: 'Acceso completo a todas las funcionalidades.',
      systemId: system.id,
      permissions: {
        create: allPermissionIds,
      },
    },
    include: { permissions: true },
  });
  console.log(`Ensured role "${adminRole.name}" with ${adminRole.permissions.length} permissions.`);

  const clinicStaffPermissions = allPermissions.filter(p =>
      p.module.includes('agenda') || p.module.includes('cita') ||
      (p.module === 'clientes' && (p.action === 'buscar' || p.action === 'ver_datos_contacto' || p.action === 'crear'))
  ).map(p => ({ permissionId: p.id }));

  const staffRole = await prisma.role.upsert({
      where: { name_systemId: { name: 'Personal Clinica', systemId: system.id } },
      update: { 
          permissions: {
              deleteMany: {},
              create: clinicStaffPermissions,
          }
      },
      create: {
          name: 'Personal Clinica',
          description: 'Acceso a agenda, citas y gestión básica de clientes.',
          systemId: system.id,
          permissions: {
              create: clinicStaffPermissions,
          },
      },
      include: { permissions: true },
  });
  console.log(`Ensured role "${staffRole.name}" with ${staffRole.permissions.length} permissions.`);

  // --- Crear Plantillas de Horario y Bloques --- 
  console.log('Creating schedule templates and blocks...');
  let template1: (pkg.ScheduleTemplate & { blocks: pkg.ScheduleTemplateBlock[] }) | null = null;
  let template2: (pkg.ScheduleTemplate & { blocks: pkg.ScheduleTemplateBlock[] }) | null = null;
  try {
    const template1Result = await prisma.scheduleTemplate.upsert({
      where: { name_systemId: { name: 'Lunes a Viernes (9h-17h)', systemId: system.id } },
      update: {},
      create: {
        name: 'Lunes a Viernes (9h-17h)', description: 'Horario estándar de oficina L-V de 9:00 a 17:00', systemId: system.id, openTime: '09:00', closeTime: '17:00',
        blocks: { create: [
            { dayOfWeek: 'MONDAY', startTime: '09:00', endTime: '17:00', isWorking: true }, { dayOfWeek: 'TUESDAY', startTime: '09:00', endTime: '17:00', isWorking: true },
            { dayOfWeek: 'WEDNESDAY', startTime: '09:00', endTime: '17:00', isWorking: true }, { dayOfWeek: 'THURSDAY', startTime: '09:00', endTime: '17:00', isWorking: true },
            { dayOfWeek: 'FRIDAY', startTime: '09:00', endTime: '17:00', isWorking: true },
        ] },
      }, include: { blocks: true }
    });
    template1 = template1Result as (pkg.ScheduleTemplate & { blocks: pkg.ScheduleTemplateBlock[] });
    console.log(`Ensured template "${template1.name}" with ${template1.blocks.length} blocks.`);

    const template2Result = await prisma.scheduleTemplate.upsert({
      where: { name_systemId: { name: 'Fines de Semana (Mañana)', systemId: system.id } },
      update: {},
      create: {
        name: 'Fines de Semana (Mañana)', description: 'Horario solo mañanas de Sábado y Domingo (10h-14h)', systemId: system.id, openTime: '10:00', closeTime: '14:00',
        blocks: { create: [ { dayOfWeek: 'SATURDAY', startTime: '10:00', endTime: '14:00', isWorking: true }, { dayOfWeek: 'SUNDAY', startTime: '10:00', endTime: '14:00', isWorking: true } ] },
      }, include: { blocks: true }
    });
    template2 = template2Result as (pkg.ScheduleTemplate & { blocks: pkg.ScheduleTemplateBlock[] });
    console.log(`Ensured template "${template2.name}" with ${template2.blocks.length} blocks.`);
  } catch (error) {
    console.error("Error creating schedule templates:", error); await prisma.$disconnect(); process.exit(1);
  }
  console.log('Schedule templates ensured.');
  // --- FIN Crear Plantillas --- 

  const saltRounds = 10;
  const defaultPassword = 'password123';
  const hashedPassword = await bcrypt.hash(defaultPassword, saltRounds);
  console.log(`Hashed default password.`);

  // --- Crear Tipos de IVA --- 
  console.log('Creating VAT types...');
  const vatGeneral = await prisma.vATType.upsert({
    where: { name_systemId: { name: 'IVA General (21%)', systemId: system.id } },
    update: { rate: 21.0, isDefault: true }, create: { name: 'IVA General (21%)', rate: 21.0, isDefault: true, systemId: system.id },
  });
  const createdVatTypesMap = new Map<string, any>();
  const vatTypesData = initialMockData.tiposIVA || [];
  for (const vatData of vatTypesData) {
    try {
      const vatType = await prisma.vATType.upsert({
        where: { name_systemId: { name: vatData.descripcion, systemId: system.id } },
        update: { rate: vatData.porcentaje }, create: { name: vatData.descripcion, rate: vatData.porcentaje, systemId: system.id },
      });
      if (typeof vatData.id === 'string') createdVatTypesMap.set(vatData.id, vatType);
      console.log(`Ensured VAT type "${vatType.name}".`);
    } catch (error) { console.error(`Error creating VAT type "${vatData.descripcion}":`, error); }
  }
  console.log('VAT types ensured.');

  // --- Crear Categorías de Servicios/Productos ---
  console.log('Creating Categories...');
  const createdCategoriesMap = new Map<string, any>();
  const categoriesData = initialMockData.familias || [];
  for (const categoryData of categoriesData) {
    try {
      const category = await prisma.category.upsert({
        where: { name_systemId: { name: categoryData.nombre, systemId: system.id } },
        update: { description: categoryData.descripcion }, create: { name: categoryData.nombre, description: categoryData.descripcion, systemId: system.id },
      });
      if (typeof categoryData.id === 'string') createdCategoriesMap.set(categoryData.id, category);
      console.log(`Ensured category "${category.name}".`);
    } catch (error) { console.error(`Error creating category "${categoryData.nombre}":`, error); }
  }
  console.log('Categories ensured.');

  // --- Crear Tarifas y Mapa ---
  console.log('Creating default tariffs...');
  const defaultVatTypeId = vatGeneral.id; 
  const tarifaGeneral = await prisma.tariff.upsert({
    where: { name_systemId: { name: 'Tarifa General', systemId: system.id } },
    update: { vatTypeId: defaultVatTypeId, currencyCode: 'EUR' },
    create: { name: 'Tarifa General', description: 'Tarifa estándar para la mayoría de clínicas y servicios.', isDefault: true, isActive: true, systemId: system.id, vatTypeId: defaultVatTypeId, currencyCode: 'EUR' },
  });
  console.log(`Ensured tariff "${tarifaGeneral.name}" with id: ${tarifaGeneral.id}`);
  const tarifaVIP = await prisma.tariff.upsert({
    where: { name_systemId: { name: 'Tarifa VIP', systemId: system.id } },
    update: { vatTypeId: defaultVatTypeId, currencyCode: 'EUR' },
    create: { name: 'Tarifa VIP', description: 'Tarifa especial para clientes VIP con posibles descuentos.', isDefault: false, isActive: true, systemId: system.id, vatTypeId: defaultVatTypeId, currencyCode: 'EUR' },
  });
  console.log(`Ensured tariff "${tarifaVIP.name}" with id: ${tarifaVIP.id}`);
  const createdTariffsMap = new Map<string, pkg.Tariff>();
  if (tarifaGeneral) createdTariffsMap.set(tarifaGeneral.name, tarifaGeneral);
  if (tarifaVIP) createdTariffsMap.set(tarifaVIP.name, tarifaVIP);
  console.log(`Created tariffs map with keys: ${Array.from(createdTariffsMap.keys()).join(', ')}`);
  console.log('Tariffs ensured.');

  // --- Crear Bancos ---
  console.log('Creating example banks...');
  try {
    const bank1 = await prisma.bank.upsert({ where: { name_systemId: { name: 'BBVA', systemId: system.id } }, update: {}, create: { name: 'BBVA', code: '0182', systemId: system.id } }); console.log(`Ensured bank: ${bank1.name}`);
    const bank2 = await prisma.bank.upsert({ where: { name_systemId: { name: 'Santander', systemId: system.id } }, update: {}, create: { name: 'Santander', code: '0049', systemId: system.id } }); console.log(`Ensured bank: ${bank2.name}`);
    const bank3 = await prisma.bank.upsert({ where: { name_systemId: { name: 'CaixaBank', systemId: system.id } }, update: {}, create: { name: 'CaixaBank', code: '2100', systemId: system.id } }); console.log(`Ensured bank: ${bank3.name}`);
  } catch (error) { console.error("Error creating example banks:", error); }
  console.log('Example banks ensured.');

  // --- Crear Definiciones de Métodos de Pago ---
  console.log('Creating example payment method definitions...');
  let paymentMethodCash: pkg.PaymentMethodDefinition | null = null;
  let paymentMethodCard: pkg.PaymentMethodDefinition | null = null;
  let paymentMethodTransfer: pkg.PaymentMethodDefinition | null = null;
  let paymentMethodBono: pkg.PaymentMethodDefinition | null = null;
  try {
    paymentMethodCash = await prisma.paymentMethodDefinition.upsert({ where: { name_systemId: { name: 'Efectivo', systemId: system.id } }, update: {}, create: { name: 'Efectivo', type: 'CASH', systemId: system.id, isActive: true } }); console.log(`Ensured payment method: ${paymentMethodCash.name}`);
    paymentMethodCard = await prisma.paymentMethodDefinition.upsert({ where: { name_systemId: { name: 'Tarjeta Crédito/Débito', systemId: system.id } }, update: {}, create: { name: 'Tarjeta Crédito/Débito', type: 'CARD', details: 'TPV Físico/Virtual', systemId: system.id, isActive: true } }); console.log(`Ensured payment method: ${paymentMethodCard.name}`);
    paymentMethodTransfer = await prisma.paymentMethodDefinition.upsert({ where: { name_systemId: { name: 'Transferencia Bancaria', systemId: system.id } }, update: {}, create: { name: 'Transferencia Bancaria', type: 'BANK_TRANSFER', systemId: system.id, isActive: true } }); console.log(`Ensured payment method: ${paymentMethodTransfer.name}`);
    paymentMethodBono = await prisma.paymentMethodDefinition.upsert({ where: { name_systemId: { name: 'Bono/Paquete', systemId: system.id } }, update: {}, create: { name: 'Bono/Paquete', type: 'INTERNAL_CREDIT', details: 'Consumo de bono o paquete pre-pagado', systemId: system.id, isActive: true } }); console.log(`Ensured payment method: ${paymentMethodBono.name}`);
  } catch (error) { console.error("Error creating example payment methods:", error); }
  console.log('Example payment method definitions ensured.');

  // --- Crear Clínicas ---
  console.log('Creating clinics...');
  const clinicsData = initialMockData.clinicas;
  const createdClinicsMap = new Map<string, any>();
  for (const clinicData of clinicsData) {
     try {
         const mockTariffName = clinicData.config?.rate;
         const foundTariff = mockTariffName ? createdTariffsMap.get(mockTariffName) : undefined;
         const defaultTariffId = tarifaGeneral?.id;
         if (!defaultTariffId) { console.error(`[Seed Clinic ${clinicData.name}] CRITICAL: Default tariff (tarifaGeneral) ID is missing. Skipping clinic creation/update.`); continue; }
         const targetTariffId = foundTariff ? foundTariff.id : defaultTariffId; 
         console.log(`[Seed Clinic ${clinicData.name}] Mock Tariff: ${mockTariffName}, Found Tariff: ${foundTariff?.name}, Target Tariff ID: ${targetTariffId}`);

         const clinic = await prisma.clinic.upsert({
           where: { Clinic_name_systemId_key: { name: clinicData.name, systemId: system.id } },
           update: {
             address: clinicData.direccion, city: clinicData.city, phone: clinicData.telefono, email: clinicData.email, isActive: clinicData.isActive !== false, tariffId: targetTariffId, 
             prefix: clinicData.prefix, commercialName: clinicData.config?.commercialName, businessName: clinicData.config?.businessName, cif: clinicData.config?.cif, phone2: clinicData.config?.phone2,
             initialCash: clinicData.config?.initialCash, ticketSize: clinicData.config?.ticketSize, ip: clinicData.config?.ip, blockSignArea: clinicData.config?.blockSignArea ?? false,
             blockPersonalData: clinicData.config?.blockPersonalData ?? false, delayedPayments: clinicData.config?.delayedPayments ?? false, affectsStats: clinicData.config?.affectsStats ?? true,
             appearsInApp: clinicData.config?.appearsInApp ?? true, scheduleControl: clinicData.config?.scheduleControl ?? false, professionalSkills: clinicData.config?.professionalSkills ?? false,
             notes: clinicData.config?.notes, countryIsoCode: clinicData.countryIsoCode || 'ES', languageIsoCode: clinicData.languageIsoCode || 'es', 
             phone1CountryIsoCode: clinicData.phone1CountryIsoCode, phone2CountryIsoCode: clinicData.phone2CountryIsoCode,
           },
           create: {
             name: clinicData.name, prefix: clinicData.prefix, address: clinicData.direccion, city: clinicData.city, currency: 'EUR', phone: clinicData.telefono, email: clinicData.email, 
             isActive: clinicData.isActive !== false, systemId: system.id, tariffId: targetTariffId, commercialName: clinicData.config?.commercialName, businessName: clinicData.config?.businessName,
             cif: clinicData.config?.cif, phone2: clinicData.config?.phone2, initialCash: clinicData.config?.initialCash, ticketSize: clinicData.config?.ticketSize, ip: clinicData.config?.ip,
             blockSignArea: clinicData.config?.blockSignArea ?? false, blockPersonalData: clinicData.config?.blockPersonalData ?? false, delayedPayments: clinicData.config?.delayedPayments ?? false,
             affectsStats: clinicData.config?.affectsStats ?? true, appearsInApp: clinicData.config?.appearsInApp ?? true, scheduleControl: clinicData.config?.scheduleControl ?? false,
             professionalSkills: clinicData.config?.professionalSkills ?? false, notes: clinicData.config?.notes, countryIsoCode: clinicData.countryIsoCode || 'ES', languageIsoCode: clinicData.languageIsoCode || 'es',
             phone1CountryIsoCode: clinicData.phone1CountryIsoCode, phone2CountryIsoCode: clinicData.phone2CountryIsoCode,
           },
         });
         createdClinicsMap.set(clinicData.id, clinic);
         console.log(`Upserted clinic: ${clinic.name} (ID: ${clinic.id})`);
     } catch (error) { console.error(`Error upserting clinic ${clinicData.name}:`, error); }
  }
  console.log(`Processed ${clinicsData.length} clinics.`);
  console.log('Clinics ensured.');

  // --- Crear Cabinas ---
  console.log('Creating cabins...');
  for (const [mockClinicId, realClinic] of createdClinicsMap.entries()) {
    const clinicData = clinicsData.find((c: any) => c.id === mockClinicId);
    if (clinicData && clinicData.config && clinicData.config.cabins && Array.isArray(clinicData.config.cabins)) {
        for (const cabinData of clinicData.config.cabins) {
            if (!cabinData.name) { console.warn(`Skipping cabin without name for clinic ${realClinic.name}:`, cabinData); continue; }
            try {
                await prisma.cabin.upsert({
                    where: { name_clinicId: { name: cabinData.name, clinicId: realClinic.id } }, 
                    update: { code: cabinData.code, color: cabinData.color, order: cabinData.order, isActive: cabinData.isActive !== false, systemId: realClinic.systemId },
                    create: { name: cabinData.name, code: cabinData.code, color: cabinData.color, order: cabinData.order, isActive: cabinData.isActive !== false, clinicId: realClinic.id, systemId: realClinic.systemId },
                });
                console.log(`Upserted cabin "${cabinData.name}" for clinic "${realClinic.name}"`);
            } catch (error) {
                if (error instanceof PrismaClientKnownRequestError && error.code === 'P2002') { console.warn(`Cabin upsert failed for "${cabinData.name}" in clinic "${realClinic.name}". Potential duplicate code "${cabinData.code}". Error:`, error.message); } 
                else { console.error(`Error upserting cabin "${cabinData.name}" for clinic ${realClinic.name}:`, error); }
            }
        }
    } else { console.warn(`No cabin data found for clinic ${realClinic.name}`); }
  }
  console.log('Cabins ensured.');

  // --- Limpiar Plantillas Antiguas ---
  try {
    console.log('[Seed Cleanup] Deleting previously auto-generated schedule templates...');
    const deleteResult = await prisma.scheduleTemplate.deleteMany({
      where: { systemId: system.id, OR: [ { name: { contains: ':' } }, { name: { startsWith: 'Horario Detallado (' } } ] }
    });
    console.log(`[Seed Cleanup] Deleted ${deleteResult.count} old auto-generated templates.`);
  } catch (error) { console.error("[Seed Cleanup] Error deleting old templates:", error); }

  // --- Crear Horarios de Clínica ---
  console.log('Creating clinic schedules...');
  const dayOfWeekMap: { [key: string]: DayOfWeek } = { monday: pkg.DayOfWeek.MONDAY, tuesday: pkg.DayOfWeek.TUESDAY, wednesday: pkg.DayOfWeek.WEDNESDAY, thursday: pkg.DayOfWeek.THURSDAY, friday: pkg.DayOfWeek.FRIDAY, saturday: pkg.DayOfWeek.SATURDAY, sunday: pkg.DayOfWeek.SUNDAY };
  for (const [mockClinicId, realClinic] of createdClinicsMap.entries()) {
    const clinicData = clinicsData.find((c:any) => c.id === mockClinicId);
    if (clinicData?.config?.schedule) {
        console.log(`[Seed Hybrid] Clinic "${realClinic.name}" has detailed schedule. Creating/Linking Template...`);
        const scheduleConfig = clinicData.config.schedule;
        const templateOpenTime = clinicData.config.openTime || realClinic.openTime;
        const templateCloseTime = clinicData.config.closeTime || realClinic.closeTime;
        const templateBlocksDataTemp: Omit<pkg.Prisma.ScheduleTemplateBlockCreateManyInput, 'templateId'>[] = [];
        for (const dayKey in scheduleConfig) {
            const dayConfig = scheduleConfig[dayKey as keyof typeof scheduleConfig]; const prismaDay = dayOfWeekMap[dayKey.toLowerCase()];
            if (prismaDay && dayConfig.isOpen && dayConfig.ranges && dayConfig.ranges.length > 0) {
                dayConfig.ranges.forEach((range: { start: string; end: string; }) => { if (range.start && range.end) templateBlocksDataTemp.push({ dayOfWeek: prismaDay, startTime: range.start, endTime: range.end, isWorking: true }); });
            }
        }
        let templateName = `Horario Detallado (${realClinic.name})`;
        let templateDescription = `Plantilla detallada generada para ${realClinic.name} desde mockData`;
        try {
            let scheduleTemplate: ScheduleTemplate | null = null;
            const existingTemplate = await prisma.scheduleTemplate.findUnique({ where: { name_systemId: { name: templateName, systemId: system.id } } });
            if (existingTemplate) {
                 scheduleTemplate = await prisma.scheduleTemplate.update({ where: { id: existingTemplate.id }, data: { openTime: templateOpenTime, closeTime: templateCloseTime, description: templateDescription + " (actualizada)" } });
                 await prisma.scheduleTemplateBlock.deleteMany({ where: { templateId: scheduleTemplate.id } });
            } else {
                 scheduleTemplate = await prisma.scheduleTemplate.create({ data: { name: templateName, description: templateDescription, systemId: system.id, openTime: templateOpenTime, closeTime: templateCloseTime } });
            }
            if (scheduleTemplate && templateBlocksDataTemp.length > 0) {
                 const blocksToCreate: pkg.Prisma.ScheduleTemplateBlockCreateManyInput[] = templateBlocksDataTemp.map(block => ({ ...block, templateId: scheduleTemplate!.id }));
                 await prisma.scheduleTemplateBlock.createMany({ data: blocksToCreate });
                 console.log(`[Seed Hybrid] Created ${blocksToCreate.length} blocks for Template ${scheduleTemplate.name}`);
            }
            if (scheduleTemplate) {
                await prisma.clinic.update({ where: { id: realClinic.id }, data: { linkedScheduleTemplateId: scheduleTemplate.id, independentScheduleBlocks: { deleteMany: {} } } });
                console.log(`[Seed Hybrid] SUCCESSFULLY Linked Clinic "${realClinic.name}" to Template "${scheduleTemplate.name}"`);
            }
        } catch (error) { console.error(`[Seed Hybrid] Error during template/block operations or linking for ${templateName} (Clinic: ${realClinic.name}):`, error); }
    } else if (clinicData?.config?.openTime && clinicData?.config?.closeTime) {
        console.log(`[Seed Hybrid] Clinic "${realClinic.name}" lacks detailed schedule. Creating independent schedule.`);
        const independentOpenTime = clinicData.config.openTime; const independentCloseTime = clinicData.config.closeTime;
        const independentBlocksDataTemp: Omit<pkg.Prisma.ClinicScheduleBlockCreateManyInput, 'clinicId'>[] = [];
        const defaultWorkingDaysEnum: DayOfWeek[] = [ pkg.DayOfWeek.MONDAY, pkg.DayOfWeek.TUESDAY, pkg.DayOfWeek.WEDNESDAY, pkg.DayOfWeek.THURSDAY, pkg.DayOfWeek.FRIDAY ];
        defaultWorkingDaysEnum.forEach(day => independentBlocksDataTemp.push({ dayOfWeek: day, startTime: independentOpenTime, endTime: independentCloseTime, isWorking: true }));
        if (clinicData?.config?.saturdayOpen === true) {
          const saturdayOpen = clinicData.config.weekendOpenTime || independentOpenTime; const saturdayClose = clinicData.config.weekendCloseTime || independentCloseTime;
          if (saturdayOpen && saturdayClose) independentBlocksDataTemp.push({ dayOfWeek: pkg.DayOfWeek.SATURDAY, startTime: saturdayOpen, endTime: saturdayClose, isWorking: true });
        }
        try {
            await prisma.clinic.update({ where: { id: realClinic.id }, data: { linkedScheduleTemplateId: null, independentScheduleBlocks: { deleteMany: {} } } });
            if (independentBlocksDataTemp.length > 0) {
                const blocksToCreate: pkg.Prisma.ClinicScheduleBlockCreateManyInput[] = independentBlocksDataTemp.map(block => ({ ...block, clinicId: realClinic.id }));
                await prisma.clinicScheduleBlock.createMany({ data: blocksToCreate });
                 console.log(`[Seed Hybrid] Created ${blocksToCreate.length} independent schedule blocks for Clinic "${realClinic.name}"`);
            }
        } catch (error) { console.error(`[Seed Hybrid] Error creating independent schedule for clinic ${realClinic.name}:`, error); }
    } else {
        console.warn(`[Seed Hybrid] Skipping schedule creation for clinic ${realClinic.name}: No detailed or base times found.`);
        try { await prisma.clinic.update({ where: { id: realClinic.id }, data: { linkedScheduleTemplateId: null, independentScheduleBlocks: { deleteMany: {} } } }); } 
        catch (error) { console.error(`[Seed Hybrid] Error clearing schedule link/blocks for clinic ${realClinic.name}:`, error); }
    }
  }
  console.log('Clinic schedules ensured.');

  // --- Crear Servicios ---
  console.log('Creating Services...');
  const servicesData = initialMockData.servicios || [];
  for (const serviceData of servicesData) {
    const category = createdCategoriesMap.get(serviceData.familiaId); const vatType = createdVatTypesMap.get(serviceData.tipoIvaId);
    try {
      await prisma.service.upsert({
        where: { name_systemId: { name: serviceData.nombre, systemId: system.id } },
        update: { code: serviceData.codigo, description: serviceData.descripcion, durationMinutes: serviceData.duracion, price: serviceData.precio != null ? Number(serviceData.precio) : null, categoryId: category?.id, vatTypeId: vatType?.id, isActive: serviceData.activo !== false },
        create: { name: serviceData.nombre, code: serviceData.codigo, description: serviceData.descripcion, durationMinutes: serviceData.duracion, price: serviceData.precio != null ? Number(serviceData.precio) : null, categoryId: category?.id, vatTypeId: vatType?.id, isActive: serviceData.activo !== false, systemId: system.id },
      });
      console.log(`Ensured service "${serviceData.nombre}".`);
    } catch (error) { console.error(`Error creating service "${serviceData.nombre}":`, error); if (error instanceof PrismaClientKnownRequestError && error.code === 'P2002') { console.log('Unique constraint violation for service.'); } }
  }
  console.log('Services ensured.');

  // --- Crear Equipos ---
  console.log('Creating Equipment...');
  const equipmentData = initialMockData.equipos || [];
  for (const equipData of equipmentData) {
    const clinic = createdClinicsMap.get(equipData.clinicId);
    if (!clinic) { console.warn(`Skipping equipment "${equipData.name}" due to missing clinic ID ${equipData.clinicId}.`); continue; }
    try {
      await prisma.equipment.upsert({
        where: { name_systemId: { name: equipData.name, systemId: system.id } },
        update: { serialNumber: equipData.serialNumber, description: equipData.description, modelNumber: equipData.modelNumber, purchaseDate: equipData.purchaseDate ? new Date(equipData.purchaseDate) : null, warrantyEndDate: equipData.warrantyDate ? new Date(equipData.warrantyDate) : null, location: equipData.location, notes: equipData.notes, clinicId: clinic.id, isActive: equipData.isActive !== false },
        create: { name: equipData.name, serialNumber: equipData.serialNumber, description: equipData.description, modelNumber: equipData.modelNumber, purchaseDate: equipData.purchaseDate ? new Date(equipData.purchaseDate) : null, warrantyEndDate: equipData.warrantyDate ? new Date(equipData.warrantyDate) : null, location: equipData.location, notes: equipData.notes, clinicId: clinic.id, isActive: equipData.isActive !== false, systemId: system.id },
      });
      console.log(`Ensured equipment "${equipData.name}" for clinic "${clinic.name}".`);
    } catch (error) { console.error(`Error creating equipment "${equipData.name}":`, error); if (error instanceof PrismaClientKnownRequestError && error.code === 'P2002') { console.log('Unique constraint violation for equipment.'); } }
  }
  console.log('Equipment ensured.');

  // --- Crear Productos ---
  console.log('Creating Products...');
  const productsData = initialMockData.productos || [];
  for (const productData of productsData) {
    const category = createdCategoriesMap.get(productData.categoryId); const vatType = createdVatTypesMap.get(productData.vatTypeId);
    try {
      await prisma.product.upsert({
        where: { name_systemId: { name: productData.name, systemId: system.id } },
        update: { sku: productData.sku, description: productData.description, currentStock: productData.currentStock ?? 0, minStockThreshold: productData.minStockThreshold, costPrice: productData.costPrice != null ? Number(productData.costPrice) : null, price: productData.price != null ? Number(productData.price) : null, barcode: productData.barcode, isForSale: productData.isForSale !== false, isInternalUse: productData.isInternalUse || false, categoryId: category?.id, vatTypeId: vatType?.id, isActive: productData.activo !== false },
        create: { name: productData.name, sku: productData.sku, description: productData.description, currentStock: productData.currentStock ?? 0, minStockThreshold: productData.minStockThreshold, costPrice: productData.costPrice != null ? Number(productData.costPrice) : null, price: productData.price != null ? Number(productData.price) : null, barcode: productData.barcode, isForSale: productData.isForSale !== false, isInternalUse: productData.isInternalUse || false, categoryId: category?.id, vatTypeId: vatType?.id, isActive: productData.activo !== false, systemId: system.id },
      });
      console.log(`Ensured product "${productData.name}".`);
    } catch (error) { console.error(`Error creating product "${productData.name}":`, error); if (error instanceof PrismaClientKnownRequestError && error.code === 'P2002') { console.log('Unique constraint violation for product.'); } }
  }
  console.log('Products ensured.');

  // --- Crear Configuraciones de Pago por Clínica --- 
  console.log('Creating default clinic payment settings...');
  try {
    const clinicsIterator = createdClinicsMap.values();
    const paymentMethodsToActivate = [ paymentMethodCash, paymentMethodCard, paymentMethodTransfer, paymentMethodBono ].filter(pm => pm !== null); 
    for (const clinic of clinicsIterator) {
        console.log(` -> Setting up payment methods for clinic: ${clinic.name} (ID: ${clinic.id})`);
        for (const pmDef of paymentMethodsToActivate) {
            if (!pmDef) continue; 
            const receivingAccountId = null; // No default account for now
            await prisma.clinicPaymentSetting.upsert({
                where: { clinicId_paymentMethodDefinitionId: { clinicId: clinic.id, paymentMethodDefinitionId: pmDef.id } },
                update: { isActiveInClinic: true },
                create: { systemId: system.id, clinicId: clinic.id, paymentMethodDefinitionId: pmDef.id, isActiveInClinic: true, receivingBankAccountId: receivingAccountId },
            });
            console.log(`    - Ensured setting for: ${pmDef.name}`);
        }
    }
  } catch (error) { console.error("Error creating default clinic payment settings:", error); }
  console.log('Default clinic payment settings ensured.');

  // --- Crear Facturas de Ejemplo ---
  console.log('Creating example invoices...');
  let invoice1: pkg.Invoice | null = null; let invoice2: pkg.Invoice | null = null;
  try {
      const vatGeneralId = vatGeneral?.id;
      if (!vatGeneralId) { console.warn("VAT General ID not found, skipping invoice creation."); } 
      else {
          invoice1 = await prisma.invoice.upsert({
              where: { invoiceSeries_invoiceNumber_systemId: { invoiceSeries: 'FV2024', invoiceNumber: '001', systemId: system.id } }, update: {},
              create: { invoiceSeries: 'FV2024', invoiceNumber: '001', type: 'SALE', status: 'PAID', issueDate: new Date('2024-01-15T10:00:00Z'), currencyCode: 'EUR', emitterFiscalName: 'Clínica Ejemplo SL', emitterTaxId: 'B12345678', receiverFiscalName: 'Cliente Contado', subtotalAmount: 100, discountAmount: 0, taxAmount: 21, totalAmount: 121, systemId: system.id, items: { create: [ { description: 'Servicio Ejemplo 1', quantity: 1, unitPrice: 100, discountAmount: 0, vatRateId: vatGeneralId, vatPercentage: 21.0, vatAmount: 21, finalPrice: 121 } ] } }
          }); console.log(`Ensured SALE invoice: ${invoice1.invoiceSeries}-${invoice1.invoiceNumber}`);
          invoice2 = await prisma.invoice.upsert({
              where: { invoiceSeries_invoiceNumber_systemId: { invoiceSeries: 'FC-PROV-A', invoiceNumber: 'FACT-500', systemId: system.id } }, update: {},
              create: { invoiceSeries: 'FC-PROV-A', invoiceNumber: 'FACT-500', type: 'PURCHASE', status: 'PENDING', issueDate: new Date('2024-01-20T15:30:00Z'), currencyCode: 'EUR', emitterFiscalName: 'Proveedor Ejemplo SA', emitterTaxId: 'A87654321', receiverFiscalName: 'Clínica Ejemplo SL', subtotalAmount: 50, discountAmount: 5, taxAmount: 9.45, totalAmount: 54.45, systemId: system.id, items: { create: [ { description: 'Material Oficina', quantity: 2, unitPrice: 25, discountAmount: 5, vatRateId: vatGeneralId, vatPercentage: 21.0, vatAmount: 9.45, finalPrice: 54.45 } ] } }
          }); console.log(`Ensured PURCHASE invoice: ${invoice2.invoiceSeries}-${invoice2.invoiceNumber}`);
      }
  } catch (error) { console.error("Error creating example invoices:", error); }
  console.log('Example invoices ensured.');

   // --- Crear Pagos de Ejemplo ---
   console.log('Creating example payments...');
   try {
       const cardPaymentMethodId = paymentMethodCard?.id; const transferPaymentMethodId = paymentMethodTransfer?.id;
       const invoice1Id = invoice1?.id; const invoice2Id = invoice2?.id;
       const firstUserData = initialMockData.usuarios?.[0]; let exampleUserId: string | undefined;
       if (firstUserData?.email) { const firstUser = await prisma.user.findUnique({ where: { email: firstUserData.email } }); exampleUserId = firstUser?.id; }
       if (!cardPaymentMethodId || !transferPaymentMethodId || !invoice1Id || !invoice2Id || !exampleUserId) { console.warn("Missing IDs for payment creation, skipping."); } 
       else {
           await prisma.payment.create({ data: { type: 'DEBIT', amount: invoice1.totalAmount, paymentDate: new Date('2024-01-15T10:05:00Z'), transactionReference: `TRX-CARD-${Date.now()}`, paymentMethodDefinitionId: cardPaymentMethodId, invoiceId: invoice1Id, userId: exampleUserId, systemId: system.id } });
           console.log(`Created DEBIT payment for Invoice ${invoice1.invoiceSeries}-${invoice1.invoiceNumber}`);
           await prisma.payment.create({ data: { type: 'CREDIT', amount: invoice2.totalAmount, paymentDate: new Date('2024-02-10T09:00:00Z'), transactionReference: `BANK-TRANSFER-${Date.now()}`, paymentMethodDefinitionId: transferPaymentMethodId, invoiceId: invoice2Id, userId: exampleUserId, systemId: system.id } });
           console.log(`Created CREDIT payment for Invoice ${invoice2.invoiceSeries}-${invoice2.invoiceNumber}`);
       }
   } catch (error) { console.error("Error creating example payments:", error); }
  console.log('Example payments ensured.');

  // --- Crear Paquetes de Ejemplo ---
  console.log('Creating example packages...');
  try { console.log('No package definitions found, skipping package instance creation.'); } 
  catch (error) { console.error("Error creating example packages:", error); }
  console.log('Example packages ensured.');

  // --- Crear Usuarios de Ejemplo ---
  console.log('Creating example users...');
  const usersDataFromMock = initialMockData.usuarios || []; 
  for (const userData of usersDataFromMock) {
    const userRole = userData.perfil === 'Administrador' || userData.perfil === 'Central' ? adminRole : staffRole;
    if (!userRole) { console.warn(`Skipping user ${userData.email}: Could not determine role based on perfil="${userData.perfil}".`); continue; }
    let userToProcess: { id: string, email: string } | null = null;
    try {
      const user = await prisma.user.upsert({
        where: { email: userData.email },
        update: { firstName: userData.nombre, lastName: userData.apellidos, phone: userData.telefono, isActive: userData.activo !== false },
        create: { email: userData.email, firstName: userData.nombre, lastName: userData.apellidos, passwordHash: hashedPassword, isActive: userData.activo !== false, systemId: system.id },
      });
      userToProcess = user;
      console.log(`Ensured user: ${userToProcess.email} (ID: ${userToProcess.id})`);
      await prisma.userRole.upsert({
        where: { userId_roleId: { userId: userToProcess.id, roleId: userRole.id } }, update: {}, create: { userId: userToProcess.id, roleId: userRole.id },
      });
      console.log(` -> Ensured role assignment: ${userRole.name} for ${userToProcess.email}`);
    } catch (userError) { console.error(`Error upserting user or assigning role for "${userData.email}":`, userError); if (userError instanceof Prisma.PrismaClientKnownRequestError && userError.code === 'P2002') { console.log(`  -> Skipping due to unique constraint violation.`); } continue; }
    if (userToProcess && userData.clinicasIds && Array.isArray(userData.clinicasIds)) {
      const clinicAssignmentsData = userData.clinicasIds
        .map((mockClinicId: string) => createdClinicsMap.get(mockClinicId)).filter((clinic: any) => clinic)
        .map((clinic: any) => ({ userId: userToProcess!.id, clinicId: clinic.id, roleId: userRole.id }));
      if (clinicAssignmentsData.length > 0) {
        console.log(` -> Attempting to ensure ${clinicAssignmentsData.length} clinic assignments for ${userToProcess.email}...`);
        let successfulAssignments = 0;
        for (const assignmentData of clinicAssignmentsData) {
          try {
            await prisma.userClinicAssignment.upsert({
              where: { userId_clinicId: { userId: assignmentData.userId, clinicId: assignmentData.clinicId } },
              update: { roleId: assignmentData.roleId }, create: { userId: assignmentData.userId, clinicId: assignmentData.clinicId, roleId: assignmentData.roleId }
            }); successfulAssignments++;
          } catch (assignmentError) { console.error(`  -> Error upserting clinic assignment (User: ${assignmentData.userId}, Clinic: ${assignmentData.clinicId}):`, assignmentError); }
        } 
        const assignedClinicNames = clinicAssignmentsData.map(d => createdClinicsMap.get(Object.keys(createdClinicsMap).find(key => createdClinicsMap.get(key)?.id === d.clinicId) || '')?.name).filter(Boolean).join(', ');
        console.log(` -> Ensured ${successfulAssignments}/${clinicAssignmentsData.length} clinic assignments for ${userToProcess.email}: ${assignedClinicNames || 'None'}`);
      } 
    } 
  } 
  console.log('Example users ensured.');
  // --- FIN Crear Usuarios ---

  console.log(`Seeding finished.`);
} // Fin función main()


// ... (mapClientData function and main execution call) ...

main()
  .catch(async (e) => {
    console.error("[Seed Script] Error in main:", e);
    await prisma.$disconnect();
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 