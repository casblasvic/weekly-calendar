// Importamos TODO el paquete como 'pkg'
import pkg from '@prisma/client';
// <<< RESTAURAR LA DESESTRUCTURACIÓN ORIGINAL DE PRISMA >>>
const { PrismaClient, Prisma } = pkg; // Obtener constructor y namespace Prisma

// --- Importación de Tipos Específicos ---
// <<< ELIMINAR LA IMPORTACIÓN DE TIPO AISLADA PARA EL NAMESPACE PRISMA >>>
// import type { Prisma } from '@prisma/client'; 
import type { ScheduleTemplate as PrismaScheduleTemplateType, ScheduleTemplateBlock as PrismaScheduleTemplateBlockType, /*DayOfWeek,*/ ScheduleTemplate } from '@prisma/client'; // Renombrar para evitar conflicto
// <<< ASEGURAR QUE DayOfWeek SE IMPORTA COMO ENUM (VALOR) >>>
import { DayOfWeek as PrismaDayOfWeekEnum } from '@prisma/client';
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

// --- FUNCIÓN HASH MOVIDA AQUÍ PARA EVITAR PROBLEMAS DE IMPORTACIÓN ---
let bcrypt: any;
async function initBcrypt() {
  if (bcrypt) return bcrypt;
  try {
    bcrypt = await import('bcrypt');
  } catch (error) {
    bcrypt = await import('bcryptjs');
    console.warn('[SEED HASH] bcryptjs en uso como fallback');
  }
  return bcrypt;
}
async function hashPassword(password: string): Promise<string> {
  const saltRounds = 10;
  const bcryptLib = await initBcrypt();
  return await bcryptLib.hash(password, saltRounds);
}
// --- FIN FUNCIÓN HASH ---

import path from 'path'; // Importar path
import { fileURLToPath } from 'url'; // Importar fileURLToPath
import { seedCountries } from './seed-countries.ts';
import { seedPersons } from './seed-persons.ts';
import { seedTags } from './seed-tags.ts';
import { seedWebhooks } from './seed-webhooks.ts'; // Importar el nuevo seeder
import { getOrCreateCuid, getMappedId, initializeKnownIds, generateCuid } from './seed-helpers.ts';
// <<< ELIMINAR Importación dinámica de mockData >>>
// import seedCountries from './seed-countries'; // <<< ELIMINAR Importación (ya integrada)

// Eliminar asignación a constante DayOfWeek, usar directamente el importado
// const DayOfWeek = pkg.DayOfWeek;

// --- Calcular ruta absoluta a mockData.ts --- (ELIMINADO)
// const __filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(__filename);
// const mockDataPath = path.resolve(__dirname, '../mockData.ts');
// --- Fin cálculo --- (ELIMINADO)

// Quitar la importación estática anterior (ELIMINADO)
// import { initialMockData } from '../mockData'; 

// --- INICIO: Definición de Datos Iniciales (Movido desde mockData.ts) ---
// Esta es ahora la fuente central de datos para el seeder
const initialMockData = {
  // <<< NUEVO: Permisos definidos directamente >>>
  permissions: [
    { action: 'manage', subject: 'all', description: 'Acceso total a todo el sistema' },
    // Permisos específicos (ejemplos)
    { action: 'read', subject: 'Dashboard', description: 'Ver el dashboard principal' },
    { action: 'manage', subject: 'Agenda', description: 'Gestionar la agenda (citas, bloqueos)' },
    { action: 'read', subject: 'Client', description: 'Ver fichas de clientes' },
    { action: 'create', subject: 'Client', description: 'Crear nuevos clientes' },
    { action: 'update', subject: 'Client', description: 'Modificar clientes existentes' },
    { action: 'manage', subject: 'Ticket', description: 'Crear, editar y gestionar tickets de venta' },
    { action: 'read', subject: 'Configuration', description: 'Ver la configuración del sistema' },
    { action: 'manage', subject: 'Configuration', description: 'Modificar la configuración del sistema' },
    { action: 'manage', subject: 'User', description: 'Gestionar usuarios y sus permisos' },
    { action: 'manage', subject: 'Clinic', description: 'Gestionar datos y configuración de clínicas' },
    // ... añadir más permisos específicos según módulos
  ],
  clinicas: [
    {
      mockId: 'clinic-1',
      id: getOrCreateCuid('clinic-1'), // Usar CUID válido
      prefix: 'CMO', // Usado en upsert
      name: 'Californie Multilaser - Organicare', // Usado en upsert
      city: 'Casablanca', // Usado en upsert
      direccion: 'Av. Mohammed VI, 234', // Usado en upsert (address)
      telefono: '+212 522 123 456', // Usado en upsert (phone)
      email: 'info@californie-multilaser.ma', // Usado en upsert
      isActive: true, // Usado en upsert
      countryIsoCode: 'MA', // Ejemplo añadido
      languageIsoCode: 'fr', // Ejemplo añadido
      phone1CountryIsoCode: 'MA', // Ejemplo añadido
      currency: 'MAD', // <<< AÑADIDO currency >>>
      config: { // Usado en upsert
        commercialName: 'Californie Multilaser',
        businessName: 'Organicare SARL AU',
        cif: 'CIF-CMO-123',
        phone2: '+212 600 111 222',
        phone2CountryIsoCode: 'MA',
        openTime: '09:00', // Usado para crear plantilla o bloques independientes
        closeTime: '19:00', // Usado para crear plantilla o bloques independientes
        weekendOpenTime: '10:00', // Usado para crear plantilla o bloques independientes
        weekendCloseTime: '14:00', // Usado para crear plantilla o bloques independientes
        saturdayOpen: true, // Usado para bloques independientes
        sundayOpen: false, // Usado para bloques independientes
        slotDuration: 15, // Usado en upsert clinic
        cabins: [ // Usado para crear cabinas
          { id: getOrCreateCuid('cabin-1'), clinicId: getOrCreateCuid('clinic-1'), code: 'CAB1', name: 'Cabina Láser 1', color: '#4f46e5', isActive: true, order: 1 },
          { id: getOrCreateCuid('cabin-2'), clinicId: getOrCreateCuid('clinic-1'), code: 'CAB2', name: 'Cabina Estética', color: '#ef4444', isActive: true, order: 2 },
          { id: getOrCreateCuid('cabin-3'), clinicId: getOrCreateCuid('clinic-1'), code: 'CAB3', name: 'Cabina Tratamientos', color: '#22c55e', isActive: true, order: 3 }
        ],
        schedule: { // Usado para crear plantilla detallada
          monday: { isOpen: true, ranges: [{ start: '09:00', end: '19:00' }] },
          tuesday: { isOpen: true, ranges: [{ start: '09:00', end: '19:00' }] },
          wednesday: { isOpen: true, ranges: [{ start: '09:00', end: '19:00' }] },
          thursday: { isOpen: true, ranges: [{ start: '09:00', end: '19:00' }] },
          friday: { isOpen: true, ranges: [{ start: '09:00', end: '19:00' }] },
          saturday: { isOpen: true, ranges: [{ start: '10:00', end: '14:00' }] },
          sunday: { isOpen: false, ranges: [] }
        },
        initialCash: 1000, // Usado en upsert clinic
        appearsInApp: true, // Usado en upsert clinic
        ticketSize: '80mm', // Usado en upsert clinic
        affectsStats: true, // Usado en upsert clinic
        scheduleControl: true, // Usado en upsert clinic
        delayedPayments: true, // Añadido para ejemplo
        blockSignArea: false,
        blockPersonalData: false,
        professionalSkills: false,
        notes: "Clínica principal en Casablanca."
      }
    },
    {
      mockId: 'clinic-2',
      id: getOrCreateCuid('clinic-2'), // Usar CUID válido
      prefix: 'CAFC', // Usado en upsert
      name: 'Cafc Multilaser', // Usado en upsert
      city: 'Casablanca', // Usado en upsert
      direccion: 'Rue Moulay Youssef, 45', // Usado en upsert (address)
      telefono: '+212 522 789 123', // Usado en upsert (phone)
      email: 'info@cafc-multilaser.ma', // Usado en upsert
      isActive: true, // Usado en upsert
      countryIsoCode: 'MA',
      languageIsoCode: 'fr',
      phone1CountryIsoCode: 'MA',
      currency: 'MAD', // <<< AÑADIDO currency >>>
      config: { // Usado en upsert
        commercialName: 'CAFC Multilaser Center',
        businessName: 'CAFC Group SARL',
        cif: 'CIF-CAFC-456',
        openTime: '08:30', // Usado para crear plantilla o bloques independientes
        closeTime: '20:00', // Usado para crear plantilla o bloques independientes
        weekendOpenTime: '09:00', // Usado para crear plantilla o bloques independientes
        weekendCloseTime: '15:00', // Usado para crear plantilla o bloques independientes
        saturdayOpen: true, // Usado para bloques independientes
        sundayOpen: false, // Usado para bloques independientes
        slotDuration: 30, // Usado en upsert clinic
        cabins: [ // Usado para crear cabinas
          { id: getOrCreateCuid('cabin-4'), clinicId: getOrCreateCuid('clinic-2'), code: 'C1', name: 'Cabina Principal CAFC', color: '#f97316', isActive: true, order: 1 },
          { id: getOrCreateCuid('cabin-5'), clinicId: getOrCreateCuid('clinic-2'), code: 'C2', name: 'Sala de Espera CAFC', color: '#6b7280', isActive: false, order: 2 }
        ],
        schedule: { // Usado para crear plantilla detallada
          monday: { isOpen: true, ranges: [{ start: '08:30', end: '20:00' }] },
          tuesday: { isOpen: true, ranges: [{ start: '08:30', end: '20:00' }] },
          wednesday: { isOpen: true, ranges: [{ start: '08:30', end: '20:00' }] },
          thursday: { isOpen: true, ranges: [{ start: '08:30', end: '20:00' }] },
          friday: { isOpen: true, ranges: [{ start: '08:30', end: '20:00' }] },
          saturday: { isOpen: true, ranges: [{ start: '09:00', end: '15:00' }] },
          sunday: { isOpen: false, ranges: [] }
        },
        initialCash: 1500, // Usado en upsert clinic
        appearsInApp: true, // Usado en upsert clinic
        ticketSize: 'a4', // Usado en upsert clinic
        affectsStats: true, // Usado en upsert clinic
        scheduleControl: false, // Usado en upsert clinic
        delayedPayments: false, // Añadido
        blockSignArea: false,
        blockPersonalData: false,
        professionalSkills: false,
        notes: "Centro especializado CAFC."
      }
    },
    {
      mockId: 'clinic-3',
      id: getOrCreateCuid('clinic-3'), // Usar CUID válido
      prefix: 'TEST', // Usado en upsert
      name: 'CENTRO TEST', // Usado en upsert
      city: 'Madrid', // Usado en upsert
      direccion: 'Calle Ficticia, 123', // Usado en upsert (address)
      telefono: '+34 91 999 8888', // Usado en upsert (phone)
      email: 'test@centrotest.es', // Usado en upsert
      isActive: false, // Usado en upsert (Inicialmente inactiva)
      countryIsoCode: 'ES',
      languageIsoCode: 'es',
      phone1CountryIsoCode: 'ES',
      currency: 'EUR', // <<< AÑADIDO currency >>>
      config: { // Usado en upsert
        commercialName: 'Centro de Pruebas',
        businessName: 'Testing Solutions SL',
        cif: 'B-TEST-789',
        openTime: '08:00', // Usado para bloques independientes (no hay schedule detallado)
        closeTime: '20:00', // Usado para bloques independientes
        weekendOpenTime: '10:00', // Usado para bloques independientes
        weekendCloseTime: '16:00', // Usado para bloques independientes
        saturdayOpen: true, // Usado para bloques independientes
        sundayOpen: false, // Usado para bloques independientes
        slotDuration: 15, // Usado en upsert clinic
        cabins: [{ id: getOrCreateCuid('cabin-6'), clinicId: getOrCreateCuid('clinic-3'), code: 'Tes', name: 'Test Cabin', color: '#10b981', isActive: true, order: 1 }], // Usado para crear cabinas
        // schedule: null, // No hay schedule detallado, se usan bloques independientes
        initialCash: 500, // Usado en upsert clinic
        appearsInApp: false, // Usado en upsert clinic
        ticketSize: 'a4', // Usado en upsert clinic
        affectsStats: false, // Usado en upsert clinic
        scheduleControl: false, // Usado en upsert clinic
        delayedPayments: true, // Añadido
        blockSignArea: true, // Añadido
        blockPersonalData: true, // Añadido
        professionalSkills: true, // Añadido
        notes: "Clínica de pruebas, inicialmente inactiva."
      }
    }
  ],
  familias: [ // Usado para crear Categories
    { id: getOrCreateCuid('fam-1'), nombre: 'Tratamientos Faciales', descripcion: 'Servicios para el rostro', tarifaId: getOrCreateCuid('tarifa-1'), isActive: true },
    { id: getOrCreateCuid('fam-2'), nombre: 'Tratamientos Corporales', descripcion: 'Servicios para el cuerpo', tarifaId: getOrCreateCuid('tarifa-1'), isActive: true },
    { id: getOrCreateCuid('fam-3'), nombre: 'Depilación Láser', descripcion: 'Servicios de depilación', tarifaId: getOrCreateCuid('tarifa-1'), isActive: true },
    { id: getOrCreateCuid('fam-4'), nombre: 'Servicios CAFC', descripcion: 'Servicios exclusivos CAFC', tarifaId: getOrCreateCuid('tarifa-2'), isActive: true },
    { id: getOrCreateCuid('fam-5'), nombre: 'Cremas Faciales', descripcion: 'Productos para cuidado facial', isActive: true }, // Añadida para productos
    { id: getOrCreateCuid('fam-6'), nombre: 'Productos Corporales', descripcion: 'Productos para cuidado corporal', isActive: true } // Añadida para productos
  ],
  servicios: [ // Usado para crear Services y ServiceSettings
    // Servicios para 'Tarifa General' (implícito por precio base)
    { id: getOrCreateCuid('serv-1'), codigo: 'S001', nombre: 'Limpieza Facial Profunda', descripcion: 'Limpieza e hidratación', duracion: 60, familiaId: getOrCreateCuid('fam-1'), nombreFamilia: 'Tratamientos Faciales', tarifaId: getOrCreateCuid('tarifa-1'), precio: 55, tipoIvaId: getOrCreateCuid('iva-gral-mock'), activo: true, config: {}, color: '#3b82f6' }, // Precio ajustado
    { id: getOrCreateCuid('serv-2'), codigo: 'S002', nombre: 'Peeling Químico', descripcion: 'Renovación celular', duracion: 45, familiaId: getOrCreateCuid('fam-1'), nombreFamilia: 'Tratamientos Faciales', tarifaId: getOrCreateCuid('tarifa-1'), precio: 70, tipoIvaId: getOrCreateCuid('iva-gral-mock'), activo: true, config: {}, color: '#a855f7' }, // Necesita su propio precio específico si es diferente
    { id: getOrCreateCuid('serv-3'), codigo: 'S003', nombre: 'Masaje Relajante', descripcion: 'Masaje de cuerpo completo', duracion: 60, familiaId: getOrCreateCuid('fam-2'), nombreFamilia: 'Tratamientos Corporales', tarifaId: getOrCreateCuid('tarifa-1'), precio: 50, tipoIvaId: getOrCreateCuid('iva-gral-mock'), activo: true, config: {}, color: '#14b8a6' }, // Precio ajustado
    { id: getOrCreateCuid('serv-4'), codigo: 'S004', nombre: 'Depilación Láser Piernas', descripcion: 'Láser diodo', duracion: 40, familiaId: getOrCreateCuid('fam-3'), nombreFamilia: 'Depilación Láser', tarifaId: getOrCreateCuid('tarifa-1'), precio: 120, tipoIvaId: getOrCreateCuid('iva-gral-mock'), activo: true, config: {}, color: '#ec4899' }, // Nombre ajustado
    { id: getOrCreateCuid('serv-5'), codigo: 'S005', nombre: 'Depilación Axilas', descripcion: 'Láser diodo', duracion: 15, familiaId: getOrCreateCuid('fam-3'), nombreFamilia: 'Depilación Láser', tarifaId: getOrCreateCuid('tarifa-1'), precio: 30, tipoIvaId: getOrCreateCuid('iva-gral-mock'), activo: true, config: {}, color: '#f472b6' }, // Necesita su propio precio
    // Servicios para 'Tarifa VIP' (implícito por precio base)
    { id: getOrCreateCuid('serv-6'), codigo: 'S006', nombre: 'Tratamiento Reafirmante CAFC', descripcion: 'Tecnología exclusiva', duracion: 75, familiaId: getOrCreateCuid('fam-4'), nombreFamilia: 'Servicios CAFC', tarifaId: getOrCreateCuid('tarifa-2'), precio: 150, tipoIvaId: getOrCreateCuid('iva-red-mock'), activo: true, config: {}, color: '#f97316' } // Necesita su propio precio
  ],
  tiposIVA: [ // Usado para crear VATTypes (si no existen por nombre/systemId)
    { id: getOrCreateCuid('iva-gral-mock'), descripcion: 'IVA General (21%)', porcentaje: 21.00, tarifaId: getOrCreateCuid('tarifa-1') }, // Coincide con el creado por defecto
    { id: getOrCreateCuid('iva-red-mock'), descripcion: 'IVA Reducido (10%)', porcentaje: 10.00, tarifaId: getOrCreateCuid('tarifa-2') } // Se creará si no existe
  ],
  equipos: [ // Usado para crear Equipment
    { id: getOrCreateCuid('eq-1'), clinicId: getOrCreateCuid('clinic-1'), clinicIds: [getOrCreateCuid('clinic-1')], code: 'LASER01', name: 'Láser Diodo LS-1000', description: 'Equipo para depilación', serialNumber: 'LS1000-SN123', modelNumber: 'LS-1000', purchaseDate: '2023-01-15', warrantyDate: '2025-01-15', location: 'Cabina Láser 1', supplier: 'LaserTech', status: 'active', config: {}, isActive: true, notes: 'Mantenimiento anual en Enero', deviceId: 'LASER-LS1000-001' },
    { id: getOrCreateCuid('eq-2'), clinicId: getOrCreateCuid('clinic-1'), clinicIds: [getOrCreateCuid('clinic-1')], code: 'RF01', name: 'Radiofrecuencia RF-Pro', description: 'Equipo para tratamientos faciales', serialNumber: 'RFPRO-SN456', modelNumber: 'RF-PRO', purchaseDate: '2023-03-20', warrantyDate: '2025-03-20', location: 'Cabina Estética', supplier: 'BeautyCorp', status: 'active', config: {}, isActive: true, notes: '', deviceId: 'RADIO-RFPRO-002' },
    { id: getOrCreateCuid('eq-3'), clinicId: getOrCreateCuid('clinic-2'), clinicIds: [getOrCreateCuid('clinic-2')], code: 'ULTRA01', name: 'Ultrasonido US-500', description: 'Equipo para tratamientos corporales', serialNumber: 'US500-SN789', modelNumber: 'US-500', purchaseDate: '2022-11-10', warrantyDate: '2024-11-10', location: 'Cabina Principal CAFC', supplier: 'MedEquip', status: 'active', config: {}, isActive: true, notes: 'Revisión pendiente', deviceId: 'ULTRA-US500-003' }
  ],
  usuarios: [ // Usado para crear Users, UserRoles, UserClinicAssignments
    {
      id: getOrCreateCuid('usr-houda'), // No usado directamente, se busca por email
      nombre: "Houda",
      apellidos: "Bekkali", // Añadido
      email: "houda@multilaser.ma",
      telefono: "+212 611 223344", // Añadido
      perfil: "Personal Clinica", // Mapeado a rol 'Personal Clinica'
      clinicasIds: [getOrCreateCuid('clinic-1')], // Mapeado a UserClinicAssignment
      activo: true // Usado en upsert
    },
    {
      id: getOrCreateCuid('usr-islam'),
      nombre: "Islam",
      apellidos: "Alaoui",
      email: "islam.alaoui@multilaser.ma",
      telefono: "+212 622 334455",
      perfil: "Central", // Mapeado a rol 'Administrador'
      clinicasIds: [getOrCreateCuid('clinic-1'), getOrCreateCuid('clinic-2'), getOrCreateCuid('clinic-3')],
      activo: true
    },
    {
      id: getOrCreateCuid('usr-latifa'),
      nombre: "Latifa",
      apellidos: "Cherkaoui",
      email: "latifa@multilaser.ma",
      telefono: "+212 633 445566",
      perfil: "Personal Clinica", // Mapeado a rol 'Personal Clinica'
      clinicasIds: [getOrCreateCuid('clinic-2')],
      activo: true
    },
    {
      id: getOrCreateCuid('usr-lina'),
      nombre: "Lina",
      apellidos: "Admin", // Apellido genérico
      email: "is.organizare@gmail.com",
      telefono: "+34 699 887766",
      perfil: "Administrador", // Mapeado a rol 'Administrador'
      clinicasIds: [getOrCreateCuid('clinic-1'), getOrCreateCuid('clinic-2'), getOrCreateCuid('clinic-3')], // Asignado a todas
      activo: true
    },
    {
      id: getOrCreateCuid('usr-multi'),
      nombre: "Multilaser",
      apellidos: "System",
      email: "casblaxic@gmail.com",
      telefono: "+34 611 223344",
      perfil: "Administrador", // Mapeado a rol 'Administrador'
      clinicasIds: [getOrCreateCuid('clinic-1'), getOrCreateCuid('clinic-2'), getOrCreateCuid('clinic-3')], // Asignado a todas
      activo: true
    },
    {
      id: getOrCreateCuid('usr-salma'),
      nombre: "Salma",
      apellidos: "Bouregba",
      email: "bouregbasalma7@gmail.com",
      telefono: "+212 655 667788",
      perfil: "Personal Clinica", // Mapeado a rol 'Personal Clinica'
      clinicasIds: [getOrCreateCuid('clinic-3')],
      activo: true
    },
    {
      id: getOrCreateCuid('usr-yasmine'),
      nombre: "Yasmine",
      apellidos: "Tachfine",
      email: "yasmine@multilaser.ma",
      telefono: "+212 677 889900",
      perfil: "Personal Clinica", // Mapeado a rol 'Personal Clinica'
      clinicasIds: [getOrCreateCuid('clinic-1')],
      activo: true
    },
    {
      id: getOrCreateCuid('usr-admin-sys'),
      nombre: "Admin",
      apellidos: "Sistema",
      email: "casblasvic@gmail.com",
      telefono: "+34 600 000001",
      perfil: "Administrador", // Mapeado a rol 'Administrador'
      clinicasIds: [getOrCreateCuid('clinic-1'), getOrCreateCuid('clinic-2'), getOrCreateCuid('clinic-3')], // Asignado a todas como admin
      activo: true
    }
  ]
};
// --- FIN: Definición de Datos Iniciales ---


// --- DATOS DE PAÍSES ---
// Movido a seed-countries.ts
// --- FIN DATOS DE PAÍSES ---

import { seedIntegrations } from './seed-integrations.ts';
import { seedAnomalias } from './seed-anomalias.ts';

const prisma = new PrismaClient();

// Inicializar los IDs conocidos para mantener consistencia
initializeKnownIds();

// <<< NUEVO: Función Helper para obtener precio de Tarifa >>>
async function getTariffPrice(tariffId: string, itemType: 'SERVICE' | 'PRODUCT' | 'BONO' | 'PACKAGE', itemId: string): Promise<number | null> {
  try {
    let priceRecord = null;
    if (itemType === 'SERVICE') {
      priceRecord = await prisma.tariffServicePrice.findUnique({
        where: { tariffId_serviceId: { tariffId, serviceId: itemId } },
      });
      if (priceRecord) return priceRecord.price;
      // Fallback al precio base del servicio si no hay precio específico en tarifa
      const service = await prisma.service.findUnique({ where: { id: itemId } });
      return service?.price ?? null;

    } else if (itemType === 'PRODUCT') {
      priceRecord = await prisma.tariffProductPrice.findUnique({
        where: { tariffId_productId: { tariffId, productId: itemId } },
      });
      if (priceRecord) return priceRecord.price;
      // Fallback al precio base del producto
      const product = await prisma.product.findUnique({ where: { id: itemId } });
      return product?.price ?? null;

    } else if (itemType === 'BONO') {
      priceRecord = await prisma.tariffBonoPrice.findUnique({
        where: { tariffId_bonoDefinitionId: { tariffId, bonoDefinitionId: itemId } },
      });
      if (priceRecord) return priceRecord.price;
      // Fallback al precio base del bono
      const bonoDef = await prisma.bonoDefinition.findUnique({ where: { id: itemId } });
      return bonoDef?.price ?? null;

    } else if (itemType === 'PACKAGE') {
      priceRecord = await prisma.tariffPackagePrice.findUnique({
        where: { tariffId_packageDefinitionId: { tariffId, packageDefinitionId: itemId } },
      });
      if (priceRecord) return priceRecord.price;
      // Fallback al precio base del paquete
      const packageDef = await prisma.packageDefinition.findUnique({ where: { id: itemId } });
      return packageDef?.price ?? null;
    }
  } catch (error) {
    console.error(`Error fetching tariff price for ${itemType} ID ${itemId} in Tariff ${tariffId}:`, error);
  }
  return null; // Devolver null si hay error o no se encuentra
}

// <<< NUEVO: Función Helper para calcular IVA >>>
async function calculateVAT(price: number, vatTypeId: string | null, defaultVatTypeId: string): Promise<{ vatAmount: number; vatRateId: string | null; vatPercentage: number }> {
  let finalVatTypeId = vatTypeId;
  let vatRate = 0;

  if (!finalVatTypeId) {
    finalVatTypeId = defaultVatTypeId; // Usar IVA por defecto si no hay uno específico
  }

  if (finalVatTypeId) {
    try {
      const vatType = await prisma.vATType.findUnique({ where: { id: finalVatTypeId } });
      if (vatType) {
        vatRate = vatType.rate;
      } else {
        console.warn(`VAT Type with ID ${finalVatTypeId} not found. Using 0 VAT.`);
        finalVatTypeId = null; // Marcar como nulo si no se encontró
      }
    } catch (error) {
      console.error(`Error fetching VAT Type ID ${finalVatTypeId}:`, error);
      finalVatTypeId = null; // Marcar como nulo en caso de error
    }
  } else {
    console.warn(`No specific or default VAT Type ID provided. Using 0 VAT.`);
  }

  const vatAmount = parseFloat(((price * vatRate) / 100).toFixed(2));
  return { vatAmount, vatRateId: finalVatTypeId, vatPercentage: vatRate };
}

async function main() {
    console.log(`Start seeding ...`);

    // Llamar al nuevo seeder de integraciones primero
    await seedIntegrations(prisma);

    // --- 1. Asegurar/Crear System ---
    let mainSystem = await prisma.system.findFirst({
      // Podríamos buscar por un nombre específico si lo hubiera, o tomar el primero
      // orderBy: { createdAt: 'asc' } // Opcional: tomar el más antiguo si hay varios
    });

    if (!mainSystem) {
      mainSystem = await prisma.system.create({
        data: {
          name: 'Sistema Principal (Default)', // Nombre para el sistema de ejemplo
          isActive: true,
        },
      });
      console.log(`Created default system with id: ${mainSystem.id}`);
    } else {
      console.log(`Using existing system with id: ${mainSystem.id}`);
    }
    const systemId = mainSystem.id;

    // --- Crear Países PRIMERO (antes de las entidades legales) --- 
    console.log('Creating countries...');
    await seedCountries(prisma);
    console.log('Countries seeded.');

    // --- 2. Crear Legal Entities ---
    const legalEntityData = [
      {
        name: 'Empresa Demo Contable S.L.',
        taxIdentifierFields: { "ES_CIF": "B12345678" }, // Usar taxIdentifierFields
        address: 'Calle Ficticia 123, Madrid',
        systemId: systemId,
      },
      {
        name: 'Servicios Avanzados Contables S.A.',
        taxIdentifierFields: { "ES_CIF": "A87654321" }, // Usar taxIdentifierFields
        address: 'Avenida Imaginaria 45, Barcelona',
        systemId: systemId,
      },
    ];

    const createdLegalEntities = [];
    for (const leData of legalEntityData) {
      // Como no hay índice único name_systemId, primero buscamos si existe
      const existingLegalEntity = await prisma.legalEntity.findFirst({
        where: {
          name: leData.name,
          systemId: leData.systemId
        }
      });

      let legalEntity;
      if (existingLegalEntity) {
        legalEntity = await prisma.legalEntity.update({
          where: { id: existingLegalEntity.id },
          data: {
            taxIdentifierFields: leData.taxIdentifierFields,
            fullAddress: leData.address,
            country: {
              connect: { isoCode: 'ES' },
            }
          }
        });
      } else {
        legalEntity = await prisma.legalEntity.create({
          data: {
            name: leData.name,
            taxIdentifierFields: leData.taxIdentifierFields,
            fullAddress: leData.address,
            system: { connect: { id: leData.systemId } },
            country: { connect: { isoCode: 'ES' } },
          }
        });
      }
      
      createdLegalEntities.push(legalEntity);
      console.log(`Upserted Legal Entity: ${legalEntity.name} (ID: ${legalEntity.id})`);
    }

    // --- 3. Crear Chart of Account Entries para la primera Legal Entity de contabilidad ---
    if (createdLegalEntities.length > 0) {
      const firstLegalEntityForChart = createdLegalEntities[0];
      const legalEntityIdForChart = firstLegalEntityForChart.id;
      console.log(`Seeding Chart of Accounts for Legal Entity: ${firstLegalEntityForChart.name} (ID: ${legalEntityIdForChart})`);

      const chartOfAccountsSeed = [
        // Nivel 0
        { accountNumber: '1', name: 'ACTIVO', type: 'ASSET', level: 0, allowsDirectEntry: false },
        { accountNumber: '2', name: 'PASIVO', type: 'LIABILITY', level: 0, allowsDirectEntry: false },
        { accountNumber: '3', name: 'PATRIMONIO NETO', type: 'EQUITY', level: 0, allowsDirectEntry: false },
        { accountNumber: '4', name: 'INGRESOS', type: 'REVENUE', level: 0, allowsDirectEntry: false },
        { accountNumber: '5', name: 'GASTOS', type: 'EXPENSE', level: 0, allowsDirectEntry: false },
      ];

      const parentAccountsMap = new Map<string, string>(); // Map 'accountNumber' -> 'id'

      for (const accountData of chartOfAccountsSeed) {
        if (accountData.level === 0) {
          try {
            const entry = await prisma.chartOfAccountEntry.upsert({
              where: { legalEntityId_systemId_accountNumber: { legalEntityId: legalEntityIdForChart, systemId, accountNumber: accountData.accountNumber } },
              update: { name: accountData.name, type: accountData.type as any, allowsDirectEntry: accountData.allowsDirectEntry },
              create: {
                accountNumber: accountData.accountNumber,
                name: accountData.name,
                type: accountData.type as any, 
                level: accountData.level,
                allowsDirectEntry: accountData.allowsDirectEntry,
                legalEntityId: legalEntityIdForChart,
                systemId: systemId,
              },
            });
            parentAccountsMap.set(accountData.accountNumber, entry.id);
            console.log(`  Upserted L0 Account: ${entry.accountNumber} - ${entry.name}`);
          } catch (e) {
            console.error(`Error upserting L0 account ${accountData.accountNumber} - ${accountData.name}:`, e);
          }
        }
      }

      const activoParentId = parentAccountsMap.get('1');
      if (activoParentId) {
        const activoSubAccounts = [
          { accountNumber: '10', name: 'ACTIVO CORRIENTE', type: 'ASSET', level: 1, parentAccountId: activoParentId, allowsDirectEntry: false },
          { accountNumber: '11', name: 'ACTIVO NO CORRIENTE', type: 'ASSET', level: 1, parentAccountId: activoParentId, allowsDirectEntry: false },
        ];
        for (const accountData of activoSubAccounts) {
          try {
            const entry = await prisma.chartOfAccountEntry.upsert({
              where: { legalEntityId_systemId_accountNumber: { legalEntityId: legalEntityIdForChart, systemId, accountNumber: accountData.accountNumber } },
              update: { name: accountData.name, type: accountData.type as any, parentAccountId: accountData.parentAccountId, allowsDirectEntry: accountData.allowsDirectEntry },
              create: { ...accountData, type: accountData.type as any, legalEntityId: legalEntityIdForChart, systemId: systemId },
            });
            parentAccountsMap.set(accountData.accountNumber, entry.id);
            console.log(`    Upserted L1 Account: ${entry.accountNumber} - ${entry.name} (Parent: 1)`);
          } catch (e) {
            console.error(`Error upserting L1 account ${accountData.accountNumber} - ${accountData.name}:`, e);
          }
        }
      }

      const activoCorrienteParentId = parentAccountsMap.get('10');
      if (activoCorrienteParentId) {
        const activoCorrienteSubAccounts = [
          { accountNumber: '100', name: 'CAJA', type: 'ASSET', level: 2, parentAccountId: activoCorrienteParentId, allowsDirectEntry: true },
          { accountNumber: '101', name: 'BANCOS', type: 'ASSET', level: 2, parentAccountId: activoCorrienteParentId, allowsDirectEntry: true },
          { accountNumber: '102', name: 'CLIENTES', type: 'ASSET', level: 2, parentAccountId: activoCorrienteParentId, allowsDirectEntry: true },
        ];
        for (const accountData of activoCorrienteSubAccounts) {
          try {
            await prisma.chartOfAccountEntry.upsert({
              where: { legalEntityId_systemId_accountNumber: { legalEntityId: legalEntityIdForChart, systemId, accountNumber: accountData.accountNumber } },
              update: { name: accountData.name, type: accountData.type as any, parentAccountId: accountData.parentAccountId, allowsDirectEntry: accountData.allowsDirectEntry },
              create: { ...accountData, type: accountData.type as any, legalEntityId: legalEntityIdForChart, systemId: systemId },
            });
            console.log(`      Upserted L2 Account: ${accountData.accountNumber} - ${accountData.name} (Parent: 10)`);
          } catch (e) {
            console.error(`Error upserting L2 account ${accountData.accountNumber} - ${accountData.name}:`, e);
          }
        }
      }
    } else {
      console.log('No Legal Entities created or found, skipping Chart of Accounts seeding for them.');
    }

    // --- 4. Crear Legal Entity para las clínicas ---
    const clinicLegalEntity = await prisma.legalEntity.findFirst({
      where: {
        name: 'Entidad Demo SaaS',
        systemId: systemId
      }
    });

    let legalEntityForClinics;
    if (clinicLegalEntity) {
      legalEntityForClinics = await prisma.legalEntity.update({
        where: { id: clinicLegalEntity.id },
        data: {
          taxIdentifierFields: { "ES_CIF": "B98765432" },
          fullAddress: 'Calle Principal 456, Madrid',
          country: { connect: { isoCode: 'ES' } }
        }
      });
    } else {
      legalEntityForClinics = await prisma.legalEntity.create({
        data: {
          name: 'Entidad Demo SaaS',
          taxIdentifierFields: { "ES_CIF": "B98765432" },
          fullAddress: 'Calle Principal 456, Madrid',
          system: { connect: { id: systemId } },
          country: { connect: { isoCode: 'ES' } }
        }
      });
    }
    console.log(`Legal Entity for clinics: ${legalEntityForClinics.name} (ID: ${legalEntityForClinics.id})`);

    // ... (El resto del código de seed.ts existente comenzaría aquí)
    // Asegúrate de que el console.log(`Start seeding ...`); original no se duplique.
    console.log(`[Diagnostic Seed] Start seeding ...`);

    // --- DIAGNOSTIC STEP 1: Log available models ---
    try {
      console.log("[Diagnostic Seed] Attempting to check prisma instance keys:", Object.keys(prisma));
    } catch (e) {
      console.error("[Diagnostic Seed] Error logging prisma keys:", e);
    }

    console.log("[Diagnostic Seed] Diagnostic checks finished (removed clinicSchedule check).");

    console.log(`Start seeding real data...`);

    // --- MAPAS GLOBALES para IDs (Declaración temprana) ---
    const createdClinicsMap = new Map<string, any>();
    const createdTariffsMap = new Map<string, pkg.Tariff>();
    const serviceMap = new Map<string, string>();
    const productMap = new Map<string, string>();
    const categoryMap = new Map<string, string>();
    const bankMap = new Map<string, string>(); 
    const createdVatTypesMap = new Map<string, any>();
    const createdCategoriesMap = new Map<string, any>(); // Mapa intermedio para familias
    let createdBonoDefsMap = new Map<string, string>();
    let createdPackageDefsMap = new Map<string, string>();
    const createdClientsMap = new Map<string, pkg.Person>(); // Cambiado de Client a Person
    let createdBankAccountsMap = new Map<string, string>(); // iban -> id
    // <<< AÑADIR DECLARACIÓN DEL MAPA DE USUARIOS >>>
    const createdUsersMap = new Map<string, pkg.User>(); 
    
    // <<< Variables para IDs globales (CORREGIDO: Inicialización correcta) >>>
    let system: pkg.System | null = mainSystem;
    let adminRole: pkg.Role | null = null;
    let staffRole: pkg.Role | null = null;
    let vatGeneral: pkg.VATType | null = null;
    let defaultVatTypeIdFromDB: string | undefined;
    let tarifaGeneral: pkg.Tariff | null = null;
    let tarifaVIP: pkg.Tariff | null = null;
    let paymentMethodCash: pkg.PaymentMethodDefinition | null = null;
    let paymentMethodCard: pkg.PaymentMethodDefinition | null = null;
    let paymentMethodTransfer: pkg.PaymentMethodDefinition | null = null;
    let paymentMethodBono: pkg.PaymentMethodDefinition | null = null;
    let bonoMasajeInstanceId: string | undefined;
    let packRelaxInstanceId: string | undefined;

    // --- Crear Entidades Base (System, Permissions, Roles) --- 
    console.log('Creating base entities...');
    // No necesitamos crear otro sistema, ya tenemos mainSystem/systemId
    // Usar el sistema que ya creamos al inicio
    console.log(`Using existing system: ${mainSystem.name} (ID: ${systemId})`);

    // --- Crear Permisos --- 
    console.log('Creating base permissions...');
    const permissionsData = initialMockData.permissions || [];
    const allPermissions: pkg.Permission[] = [];
    for (const permData of permissionsData) {
        const perm = await prisma.permission.upsert({
            // <<< CORREGIDO: Usar action_module y asegurar que module exista >>>
            // <<< CORREGIDO: Asegurar que el campo del modelo 'module' se usa correctamente >>>
            where: { action_module: { action: permData.action, module: permData.subject /* <- Usar subject del mock aquí */ } }, 
            update: { description: permData.description }, 
            // <<< CORREGIDO: Usar 'module' y el valor correcto al crear >>>
            create: { action: permData.action, module: permData.subject, description: permData.description /*, systemId: system!.id */ }, // SystemId se infiere
        });
        allPermissions.push(perm);
    }
    console.log(`Ensured ${allPermissions.length} permissions.`);

    // --- Crear Roles y asignar todos los permisos al Admin ---
    // <<< CORREGIDO: Asignación directa a variables globales y upsert completo >>>
    adminRole = await prisma.role.upsert({ where: { name_systemId: { name: 'Administrador', systemId: system!.id } }, update: { description: 'Rol con acceso total al sistema' }, create: { name: 'Administrador', description: 'Rol con acceso total al sistema', systemId: system!.id, permissions: { create: allPermissions.map(p => ({ permissionId: p.id })) } } });
    staffRole = await prisma.role.upsert({ where: { name_systemId: { name: 'Personal Clinica', systemId: system!.id } }, update: { description: 'Rol para el personal de la clínica con acceso limitado' }, create: { name: 'Personal Clinica', description: 'Rol para el personal de la clínica con acceso limitado', systemId: system!.id /* Añadir permisos específicos si es necesario */ } });
    console.log('Base roles ensured.');

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
              { dayOfWeek: 'MONDAY', startTime: '09:00', endTime: '17:00', isWorking: true, systemId: system.id }, { dayOfWeek: 'TUESDAY', startTime: '09:00', endTime: '17:00', isWorking: true, systemId: system.id },
              { dayOfWeek: 'WEDNESDAY', startTime: '09:00', endTime: '17:00', isWorking: true, systemId: system.id }, { dayOfWeek: 'THURSDAY', startTime: '09:00', endTime: '17:00', isWorking: true, systemId: system.id },
              { dayOfWeek: 'FRIDAY', startTime: '09:00', endTime: '17:00', isWorking: true, systemId: system.id },
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
          blocks: { create: [ { dayOfWeek: 'SATURDAY', startTime: '10:00', endTime: '14:00', isWorking: true, systemId: system.id }, { dayOfWeek: 'SUNDAY', startTime: '10:00', endTime: '14:00', isWorking: true, systemId: system.id } ] },
        }, include: { blocks: true }
      });
      template2 = template2Result as (pkg.ScheduleTemplate & { blocks: pkg.ScheduleTemplateBlock[] });
      console.log(`Ensured template "${template2.name}" with ${template2.blocks.length} blocks.`);
    } catch (error) {
      console.error("Error creating schedule templates:", error); await prisma.$disconnect(); process.exit(1);
    }
    console.log('Schedule templates ensured.');

    const saltRounds = 10;
    const defaultPassword = 'password123';
    const hashedPassword = await hashPassword(defaultPassword);
    console.log(`Hashed default password.`);

    // --- Crear Usuarios ---
    console.log('Creating users...');
    const usersData = initialMockData.usuarios || [];
    for (const userData of usersData) {
      const roleName = userData.perfil === 'Personal Clinica' ? 'Personal Clinica' : 'Administrador';
      const roleId = roleName === 'Administrador' ? adminRole!.id : staffRole!.id;

      const user = await prisma.user.upsert({
        where: { email: userData.email },
        update: {
          firstName: userData.nombre,
          lastName: userData.apellidos,
          phone: userData.telefono,
          passwordHash: hashedPassword,
        },
        create: {
          email: userData.email,
          firstName: userData.nombre,
          lastName: userData.apellidos,
          phone: userData.telefono,
          passwordHash: hashedPassword,
          systemId: system!.id,
        },
      });

      createdUsersMap.set(userData.email, user);

      // Asignar rol al usuario
      await prisma.userRole.upsert({
        where: { userId_roleId: { userId: user.id, roleId } },
        update: {},
        create: { userId: user.id, roleId },
      });

      // Asignar clínicas al usuario
      if (Array.isArray(userData.clinicasIds)) {
        for (const mockClinicId of userData.clinicasIds) {
          const clinic = createdClinicsMap.get(mockClinicId);
          if (clinic) {
            await prisma.userClinicAssignment.upsert({
              where: { userId_clinicId: { userId: user.id, clinicId: clinic.id } },
              update: {},
              create: { userId: user.id, clinicId: clinic.id, roleId },
            });
          }
        }
      }
    }
    console.log(`Users ensured. Created ${createdUsersMap.size} users.`);

    // --- Crear Tipos de IVA --- 
    console.log('Creating VAT types...');
    vatGeneral = await prisma.vATType.upsert({ 
      where: { code_systemId: { code: 'VAT_STANDARD', systemId: system!.id } },
      update: { name: 'IVA General (21%)', rate: 21.0, isDefault: true }, 
      create: { code: 'VAT_STANDARD', name: 'IVA General (21%)', rate: 21.0, isDefault: true, systemId: system!.id },
    });
    defaultVatTypeIdFromDB = vatGeneral.id; 
    const vatTypesData = initialMockData.tiposIVA || [];
    for (const vatData of vatTypesData) {
        const vatCode = `VAT_${vatData.descripcion.replace(/[^A-Z0-9]/gi, '_').toUpperCase()}`;
        const vatType = await prisma.vATType.upsert({
            where: { code_systemId: { code: vatCode, systemId: system!.id } },
            update: { name: vatData.descripcion, rate: vatData.porcentaje }, 
            create: { code: vatCode, name: vatData.descripcion, rate: vatData.porcentaje, systemId: system!.id },
        });
        if (typeof vatData.id === 'string') createdVatTypesMap.set(vatData.id, vatType);
    }
    console.log('VAT types ensured.');

    // --- Crear Categorías de Servicios/Productos ---
    console.log('Creating Categories...');
    const categoriesData = initialMockData.familias || [];
    for (const categoryData of categoriesData) {
        const category = await prisma.category.upsert({
            where: { name_systemId: { name: categoryData.nombre, systemId: system!.id } },
            update: { description: categoryData.descripcion }, 
            create: { name: categoryData.nombre, description: categoryData.descripcion, systemId: system!.id },
        });
        if (typeof categoryData.id === 'string') createdCategoriesMap.set(categoryData.id, category);
        categoryMap.set(category.name, category.id); 
    }
    console.log('Categories ensured.');

    // --- Crear Tarifas y Mapa ---
    console.log('Creating default tariffs...');
    // <<< CORREGIDO: Upsert completo para tarifas >>>
    tarifaGeneral = await prisma.tariff.upsert({ 
        where: { name_systemId: { name: 'Tarifa General', systemId: system!.id } }, 
        update: { vatTypeId: defaultVatTypeIdFromDB, currencyCode: 'EUR' }, 
        create: { name: 'Tarifa General', description: 'Tarifa estándar para la mayoría de clínicas y servicios.', isDefault: true, isActive: true, systemId: system!.id, vatTypeId: defaultVatTypeIdFromDB!, currencyCode: 'EUR' },
    });
    tarifaVIP = await prisma.tariff.upsert({ 
        where: { name_systemId: { name: 'Tarifa VIP', systemId: system!.id } }, 
        update: { vatTypeId: defaultVatTypeIdFromDB, currencyCode: 'EUR' }, 
        create: { name: 'Tarifa VIP', description: 'Tarifa especial para clientes VIP con posibles descuentos.', isDefault: false, isActive: true, systemId: system!.id, vatTypeId: defaultVatTypeIdFromDB!, currencyCode: 'EUR' },
    });
    if (tarifaGeneral) createdTariffsMap.set(tarifaGeneral.name, tarifaGeneral);
    if (tarifaVIP) createdTariffsMap.set(tarifaVIP.name, tarifaVIP);
    console.log(`Created tariffs map with keys: ${Array.from(createdTariffsMap.keys()).join(', ')}`);
    console.log('Tariffs ensured.');

    // --- Crear Bancos ---
    console.log('Creating example banks...');
    try {
      await prisma.bank.upsert({ where: { name_systemId: { name: 'BBVA', systemId: system!.id } }, update: { code: '0182' }, create: { name: 'BBVA', code: '0182', systemId: system!.id } }); console.log(`Ensured bank: BBVA`);
      await prisma.bank.upsert({ where: { name_systemId: { name: 'Santander', systemId: system!.id } }, update: { code: '0049' }, create: { name: 'Santander', code: '0049', systemId: system!.id } }); console.log(`Ensured bank: Santander`);
      await prisma.bank.upsert({ where: { name_systemId: { name: 'CaixaBank', systemId: system!.id } }, update: { code: '2100' }, create: { name: 'CaixaBank', code: '2100', systemId: system!.id } }); console.log(`Ensured bank: CaixaBank`);
      
      const banksFromDB = await prisma.bank.findMany({ where: { systemId: system!.id } });
      banksFromDB.forEach(b => bankMap.set(b.name, b.id)); 
      console.log(`Mapped banks: ${Array.from(bankMap.keys()).join(', ')}`);

    } catch (error) { console.error("Error creating/mapping example banks:", error); }
    console.log('Example banks ensured and mapped.');

    // --- Crear Definiciones de Métodos de Pago ---
    console.log('Creating example payment method definitions...');
    // <<< CORREGIDO: Upsert completo >>>
    paymentMethodCash = await prisma.paymentMethodDefinition.upsert({ where: { name_systemId: { name: 'Efectivo', systemId: system!.id } }, update: { type: 'CASH', isActive: true }, create: { name: 'Efectivo', type: 'CASH', systemId: system!.id, isActive: true } });
    paymentMethodCard = await prisma.paymentMethodDefinition.upsert({ where: { name_systemId: { name: 'Tarjeta Crédito/Débito', systemId: system!.id } }, update: { type: 'CARD', details: 'TPV Físico/Virtual', isActive: true }, create: { name: 'Tarjeta Crédito/Débito', type: 'CARD', details: 'TPV Físico/Virtual', systemId: system!.id, isActive: true } });
    paymentMethodTransfer = await prisma.paymentMethodDefinition.upsert({ where: { name_systemId: { name: 'Transferencia Bancaria', systemId: system!.id } }, update: { type: 'BANK_TRANSFER', isActive: true }, create: { name: 'Transferencia Bancaria', type: 'BANK_TRANSFER', systemId: system!.id, isActive: true } });
    paymentMethodBono = await prisma.paymentMethodDefinition.upsert({ where: { name_systemId: { name: 'Bono/Paquete', systemId: system!.id } }, update: { type: 'INTERNAL_CREDIT', details: 'Consumo de bono o paquete pre-pagado', isActive: true }, create: { name: 'Bono/Paquete', type: 'INTERNAL_CREDIT', details: 'Consumo de bono o paquete pre-pagado', systemId: system!.id, isActive: true } });
    console.log('Example payment method definitions ensured.');

    // --- Crear Clínicas ---
    console.log('Creating clinics...');
    const clinicsData = initialMockData.clinicas;
    for (const clinicData of clinicsData) {
        // <<< CORREGIDO: Lógica de upsert para clínicas (simplificada para ejemplo) >>>
        const targetTariffId = tarifaGeneral!.id; 

         const clinic = await prisma.clinic.upsert({
          where: { Clinic_name_systemId_key: { name: clinicData.name, systemId: system!.id } }, 
          update: { 
            address: clinicData.direccion, 
            city: clinicData.city, 
            phone: clinicData.telefono, 
            email: clinicData.email, 
            tariffId: targetTariffId,
            countryIsoCode: clinicData.countryIsoCode, // Añadido desde tu schema y datos previos
            languageIsoCode: clinicData.languageIsoCode,
            phone1CountryIsoCode: clinicData.phone1CountryIsoCode,
            currency: clinicData.currency || 'EUR', // Asegurar moneda
            legalEntityId: legalEntityForClinics.id, // Usar la legal entity para clínicas
         }, 
          create: {
            name: clinicData.name, 
            prefix: clinicData.prefix, 
            address: clinicData.direccion, 
            city: clinicData.city, 
            currency: clinicData.currency || 'EUR', 
            phone: clinicData.telefono, 
            email: clinicData.email, 
            systemId: system!.id, 
            tariffId: targetTariffId!,
            countryIsoCode: clinicData.countryIsoCode,
            languageIsoCode: clinicData.languageIsoCode,
            phone1CountryIsoCode: clinicData.phone1CountryIsoCode,
            // Campos de configuración general que van directamente en Clinic
            commercialName: clinicData.config?.commercialName,
            businessName: clinicData.config?.businessName,
            cif: clinicData.config?.cif,
            phone2: clinicData.config?.phone2,
            phone2CountryIsoCode: clinicData.config?.phone2CountryIsoCode,
            initialCash: clinicData.config?.initialCash,
            ticketSize: clinicData.config?.ticketSize,
            affectsStats: clinicData.config?.affectsStats,
            scheduleControl: clinicData.config?.scheduleControl,
            delayedPayments: clinicData.config?.delayedPayments,
            blockSignArea: clinicData.config?.blockSignArea,
            blockPersonalData: clinicData.config?.blockPersonalData,
            professionalSkills: clinicData.config?.professionalSkills,
            notes: clinicData.config?.notes,
            legalEntityId: legalEntityForClinics.id, // Usar la legal entity para clínicas
          }
         });
         createdClinicsMap.set(clinicData.mockId, clinic); // Usar el mockId como clave
         console.log(`Ensured clinic: ${clinic.name}`);

        // --- Crear Cabinas para esta clínica ---
        if (clinicData.config?.cabins && clinicData.config.cabins.length > 0) {
          for (const cabinData of clinicData.config.cabins) {
            await prisma.cabin.upsert({
              // Usar code y clinicId para unicidad, ya que el ID del mock (cabinData.id) puede no ser string
              where: { code_clinicId: { code: String(cabinData.code), clinicId: clinic.id } }, 
              update: { 
                name: cabinData.name, 
                color: cabinData.color, 
                order: cabinData.order 
              },
              create: {
                name: cabinData.name,
                code: String(cabinData.code),
                color: cabinData.color,
                order: cabinData.order,
                clinicId: clinic.id, // Usar el ID real de la clínica creada
                systemId: system!.id,
              },
            });
            console.log(`  -> Ensured cabin: ${cabinData.name} for clinic ${clinic.name}`);
          }
        }

        // --- Crear Horario (ScheduleTemplate) para esta clínica y vincularlo ---
        if (clinicData.config?.schedule) {
          const scheduleData = clinicData.config.schedule;
          const templateName = `Horario ${clinic.name}`;
          // <<< VOLVER A any[] TEMPORALMENTE PARA DESBLOQUEAR >>>
          const blocksToCreate: any[] = []; 
          const dayMapping: { [key: string]: PrismaDayOfWeekEnum } = { 
            monday: PrismaDayOfWeekEnum.MONDAY, tuesday: PrismaDayOfWeekEnum.TUESDAY, wednesday: PrismaDayOfWeekEnum.WEDNESDAY,
            thursday: PrismaDayOfWeekEnum.THURSDAY, friday: PrismaDayOfWeekEnum.FRIDAY, saturday: PrismaDayOfWeekEnum.SATURDAY, sunday: PrismaDayOfWeekEnum.SUNDAY,
          };
    
          for (const dayKey of Object.keys(scheduleData)) {
            const daySchedule = scheduleData[dayKey as keyof typeof scheduleData];
            // Asegurarse que daySchedule y daySchedule.ranges existen y son iterables
            if (daySchedule && typeof daySchedule.isOpen === 'boolean' && Array.isArray(daySchedule.ranges)) {
                if (daySchedule.isOpen && daySchedule.ranges.length > 0) {
                    daySchedule.ranges.forEach(range => {
                        if (range && typeof range.start === 'string' && typeof range.end === 'string') {
                            blocksToCreate.push({
                                dayOfWeek: dayMapping[dayKey],
                                startTime: range.start,
                                endTime: range.end,
                                isWorking: true,
                                systemId: system!.id,
                            });
                        }
                    });
                }
            } else {
                 // Podrías añadir un log si la estructura de scheduleData[dayKey] no es la esperada
                 // console.warn(`  -- Schedule data for ${dayKey} in clinic ${clinic.name} is not as expected or empty.`);
            }
          }
    
          if (blocksToCreate.length > 0 || clinicData.config.openTime || clinicData.config.closeTime || clinicData.config.slotDuration) { // Crear plantilla incluso si no hay bloques si hay config general de horario
            const scheduleTemplate = await prisma.scheduleTemplate.upsert({
              where: { name_systemId: { name: templateName, systemId: system!.id } },
              update: {
                description: `Horario principal para ${clinic.name}`,
                openTime: clinicData.config.openTime, 
                closeTime: clinicData.config.closeTime,
                slotDuration: clinicData.config.slotDuration,
                // Para actualizar bloques, Prisma requiere borrar y recrear o manejarlos individualmente.
                // Por simplicidad en upsert, nos enfocamos en crear. Si se necesita actualizar bloques, es más complejo.
              },
              create: {
                name: templateName,
                description: `Horario principal para ${clinic.name}`,
                systemId: system!.id,
                openTime: clinicData.config.openTime,
                closeTime: clinicData.config.closeTime,
                slotDuration: clinicData.config.slotDuration,
                blocks: { create: blocksToCreate }, // Solo se crean bloques aquí
              },
            });
            console.log(`  -> Ensured schedule template: ${templateName} for clinic ${clinic.name}`);
            
            // Vincular plantilla a la clínica (si se creó o actualizó)
            await prisma.clinic.update({
              where: { id: clinic.id },
              data: { linkedScheduleTemplateId: scheduleTemplate.id },
            });
            console.log(`  -> Linked template for clinic ${clinic.name}`);
          }
        } // Fin if (clinicData.config?.schedule)
  }
  console.log('Clinics, Cabins, and Schedules ensured.');
 
  // --- MAPAS PARA IDS (Solo poblar, ya declarados) ---
  console.log('Fetching base entity IDs for linking (Services, Products)...');
  const servicesFromDB = await prisma.service.findMany({ where: { systemId: system!.id } });
  const productsFromDB = await prisma.product.findMany({ where: { systemId: system!.id } });
  servicesFromDB.forEach(s => serviceMap.set(s.name, s.id));
  productsFromDB.forEach(p => productMap.set(p.name, p.id));
  console.log('Base entity IDs fetched and mapped.');

  // --- Crear Servicios --- 
  console.log('Creating Services...');
  const servicesData = initialMockData.servicios || [];
  for (const serviceData of servicesData) {
     const categoryId = categoryMap.get(serviceData.nombreFamilia || '');
     const vatTypeId = defaultVatTypeIdFromDB; // Usar IVA por defecto o buscarlo si es necesario
     // <<< CORREGIDO: Upsert completo para servicio y settings >>>
      const service = await prisma.service.upsert({
         where: { name_systemId: { name: serviceData.nombre, systemId: system!.id } }, 
         update: { code: serviceData.codigo, description: serviceData.descripcion, durationMinutes: serviceData.duracion, price: Number(serviceData.precio), categoryId: categoryId, vatTypeId: vatTypeId, colorCode: serviceData.color }, 
         create: { name: serviceData.nombre, code: serviceData.codigo, description: serviceData.descripcion, durationMinutes: serviceData.duracion, price: Number(serviceData.precio), categoryId: categoryId, vatTypeId: vatTypeId!, systemId: system!.id, colorCode: serviceData.color }
     });
     await prisma.serviceSetting.upsert({
        where: { serviceId: service.id },
         update: { systemId: system!.id },
         create: { serviceId: service.id, systemId: system!.id }
     });
     if (!serviceMap.has(service.name)) serviceMap.set(service.name, service.id);
  }
  console.log('Services ensured.');

  // --- Crear Productos --- 
  console.log('Creating Products...');
  // <<< AÑADIR DATOS DE PRODUCTOS DIRECTAMENTE AQUÍ >>>
  const directProductData = [
    {
      id: getOrCreateCuid('prod-1'), // ID para mock
      name: 'Crema Hidratante Facial',
      sku: 'PROD-CHF-001',
      description: 'Crema hidratante intensiva para todo tipo de pieles.',
      costPrice: 8.50,
      price: 25.00,
      barcode: '8400000000011',
      categoryId: categoryMap.get('Cremas Faciales'), // Usar categoryMap
      vatTypeId: defaultVatTypeIdFromDB, // Usar IVA General por defecto
      currentStock: 100,
      minStockThreshold: 20,
      isForSale: true,
      isInternalUse: false,
      activo: true, // para ProductSetting.isActive
      pointsAwarded: 25,
    },
    {
      id: getOrCreateCuid('prod-2'),
      name: 'Sérum Reparador Nocturno',
      sku: 'PROD-SRN-001',
      description: 'Sérum concentrado para reparación nocturna de la piel.',
      costPrice: 15.00,
      price: 45.00,
      barcode: '8400000000028',
      categoryId: categoryMap.get('Cremas Faciales'),
      vatTypeId: defaultVatTypeIdFromDB,
      currentStock: 50,
      minStockThreshold: 10,
      isForSale: true,
      isInternalUse: false,
      activo: true,
      pointsAwarded: 45,
    },
    {
      id: getOrCreateCuid('prod-3'),
      name: 'Aceite Corporal Nutritivo',
      sku: 'PROD-ACN-001',
      description: 'Aceite seco nutritivo para cuerpo y cabello.',
      costPrice: 12.00,
      price: 32.00,
      barcode: '8400000000035',
      categoryId: categoryMap.get('Productos Corporales'),
      vatTypeId: defaultVatTypeIdFromDB,
      currentStock: 75,
      minStockThreshold: 15,
      isForSale: true,
      isInternalUse: false,
      activo: true,
      pointsAwarded: 30,
    },
    {
      id: getOrCreateCuid('prod-4'),
      name: 'Protector Solar SPF50+',
      sku: 'PROD-PSS-001',
      description: 'Alta protección solar facial y corporal.',
      costPrice: 9.00,
      price: 28.00,
      barcode: '8400000000042',
      categoryId: categoryMap.get('Productos Corporales'), // Podría tener su propia categoría "Solares"
      vatTypeId: defaultVatTypeIdFromDB,
      currentStock: 120,
      minStockThreshold: 25,
      isForSale: true,
      isInternalUse: false,
      activo: true,
      pointsAwarded: 20,
    }
  ];

  for (const productData of directProductData) { 
      // Asegurarse que categoryId es válido (existe en la DB)
      let finalCategoryId = productData.categoryId;
      if (typeof productData.categoryId === 'string' && !Object.values(categoryMap).includes(productData.categoryId as any) && !(await prisma.category.findUnique({where: {id: productData.categoryId}}))) {
        console.warn(`Category ID ${productData.categoryId} for product ${productData.name} not found in categoryMap or DB. Setting to null.`);
        finalCategoryId = undefined; // o el ID de una categoría por defecto si prefieres
      }


      const product = await prisma.product.upsert({
          where: { name_systemId: { name: productData.name, systemId: system!.id } }, 
          update: { sku: productData.sku, description: productData.description, costPrice: productData.costPrice, price: productData.price, barcode: productData.barcode, categoryId: finalCategoryId, vatTypeId: productData.vatTypeId },
          create: { name: productData.name, sku: productData.sku, description: productData.description, costPrice: productData.costPrice, price: productData.price, barcode: productData.barcode, categoryId: finalCategoryId, vatTypeId: productData.vatTypeId!, systemId: system!.id },
      });
      await prisma.productSetting.upsert({
        where: { productId: product.id },
          update: { currentStock: productData.currentStock, minStockThreshold: productData.minStockThreshold, isForSale: productData.isForSale, isInternalUse: productData.isInternalUse, pointsAwarded: productData.pointsAwarded, systemId: system!.id },
          create: { productId: product.id, currentStock: productData.currentStock, minStockThreshold: productData.minStockThreshold, isForSale: productData.isForSale, isInternalUse: productData.isInternalUse, pointsAwarded: productData.pointsAwarded, systemId: system!.id }
      });
      if (!productMap.has(product.name)) productMap.set(product.name, product.id);
      console.log(`Ensured product: ${product.name}`);
  }
  console.log('Products ensured.');

  // --- Crear Bonos de Servicio --- 
  console.log('Creating Bono Definitions...');
      const masajeRelajanteId = serviceMap.get('Masaje Relajante');
      if (masajeRelajanteId) {
      // <<< CORREGIDO: Upsert completo para bono >>>
          const bonoMasaje = await prisma.bonoDefinition.upsert({
          where: { name_systemId: { name: 'Bono 5 Masajes Relajantes', systemId: system!.id } }, 
              update: { price: 200, validityDays: 90 },
          create: { name: 'Bono 5 Masajes Relajantes', serviceId: masajeRelajanteId, quantity: 5, price: 200, validityDays: 90, vatTypeId: defaultVatTypeIdFromDB!, systemId: system!.id, settings: { create: { systemId: system!.id } } }
          });
          createdBonoDefsMap.set(bonoMasaje.name, bonoMasaje.id);
  }
  // ... otro bono ...
  console.log('Bono Definitions ensured.');

  // --- Crear Paquetes Mixtos --- 
  console.log('Creating Package Definitions...');
  // <<< CORREGIDO: Upsert completo para paquete >>>
  const masajeIdForPack = serviceMap.get('Masaje Relajante');
  const cremaIdForPack = productMap.get('Crema Hidratante Facial'); // Ahora debería existir
  if (masajeIdForPack && cremaIdForPack) {
          const packRelax = await prisma.packageDefinition.upsert({
          where: { name_systemId: { name: 'Pack Relax Total', systemId: system!.id } }, 
              update: { price: 75 },
          create: { name: 'Pack Relax Total', description: 'Un masaje relajante y una crema hidratante.', price: 75, systemId: system!.id, settings: { create: { systemId: system!.id } }, items: { create: [ { itemType: 'SERVICE', serviceId: masajeIdForPack, quantity: 1, price: serviceMap.get('Masaje Relajante') ? (await prisma.service.findUnique({where: {id: serviceMap.get('Masaje Relajante')!}}))?.price ?? 50 : 50, systemId: system!.id }, { itemType: 'PRODUCT', productId: cremaIdForPack, quantity: 1, price: productMap.get('Crema Hidratante Facial') ? (await prisma.product.findUnique({where: {id: productMap.get('Crema Hidratante Facial')!}}))?.price ?? 25 : 25, systemId: system!.id } ] } }
          });
          createdPackageDefsMap.set(packRelax.name, packRelax.id);
          console.log(`Ensured package: ${packRelax.name}`);
  }

  const depilacionPiernasId = serviceMap.get('Depilación Láser Piernas');
  const depilacionAxilasId = serviceMap.get('Depilación Axilas');
  const protectorSolarId = productMap.get('Protector Solar SPF50+');

  if (depilacionPiernasId && depilacionAxilasId && protectorSolarId) {
    const packVeranoLaser = await prisma.packageDefinition.upsert({
      where: { name_systemId: { name: 'Pack Verano Láser Plus', systemId: system!.id } },
      update: { price: 160 }, // Precio del paquete ajustado
      create: {
        name: 'Pack Verano Láser Plus',
        description: 'Depilación láser en piernas y axilas, más un protector solar.',
        price: 160, // Precio total del paquete
        systemId: system!.id,
        settings: { create: { systemId: system!.id } },
        items: {
          create: [
            { itemType: 'SERVICE', serviceId: depilacionPiernasId, quantity: 1, price: serviceMap.get('Depilación Láser Piernas') ? (await prisma.service.findUnique({where: {id: serviceMap.get('Depilación Láser Piernas')!}}))?.price ?? 120 : 120, systemId: system!.id },
            { itemType: 'SERVICE', serviceId: depilacionAxilasId, quantity: 1, price: serviceMap.get('Depilación Axilas') ? (await prisma.service.findUnique({where: {id: serviceMap.get('Depilación Axilas')!}}))?.price ?? 30 : 30, systemId: system!.id },
            { itemType: 'PRODUCT', productId: protectorSolarId, quantity: 1, price: productMap.get('Protector Solar SPF50+') ? (await prisma.product.findUnique({where: {id: productMap.get('Protector Solar SPF50+')!}}))?.price ?? 28 : 28, systemId: system!.id },
          ]
        }
      }
    });
    createdPackageDefsMap.set(packVeranoLaser.name, packVeranoLaser.id);
    console.log(`Ensured package: ${packVeranoLaser.name}`);
  }
  console.log('Package Definitions ensured.');

  // --- Crear Cuentas Bancarias --- 
  console.log('Creating Bank Accounts...');
  try {
      const bbvaId = bankMap.get('BBVA');
      const santanderId = bankMap.get('Santander');
      if (bbvaId) {
          const accBBVA = await prisma.bankAccount.upsert({
              where: { iban: 'ES9121000418450200051332' }, 
              update: { accountName: 'Cuenta Principal BBVA', swiftBic: 'BBVAESMMXXX', currency: 'EUR', isActive: true },
              create: { accountName: 'Cuenta Principal BBVA', iban: 'ES9121000418450200051332', swiftBic: 'BBVAESMMXXX', currency: 'EUR', bankId: bbvaId, systemId: system!.id, isActive: true }
          });
          createdBankAccountsMap.set(accBBVA.iban, accBBVA.id);
      }
      if (santanderId) {
           const accSantander1 = await prisma.bankAccount.upsert({
              where: { iban: 'ES8000490001591234567890' },
              update: { accountName: 'Cuenta Santander 1', swiftBic: 'BSCHESMMXXX', currency: 'EUR', isActive: true },
              create: { accountName: 'Cuenta Santander 1', iban: 'ES8000490001591234567890', swiftBic: 'BSCHESMMXXX', currency: 'EUR', bankId: santanderId, systemId: system!.id, isActive: true }
          });
          createdBankAccountsMap.set(accSantander1.iban, accSantander1.id);
          const accSantander2 = await prisma.bankAccount.upsert({
              where: { iban: 'ES1200491111009876543210' },
              update: { accountName: 'Cuenta Gastos Santander', swiftBic: 'BSCHESMMXXX', currency: 'EUR', isActive: false },
              create: { accountName: 'Cuenta Gastos Santander', iban: 'ES1200491111009876543210', swiftBic: 'BSCHESMMXXX', currency: 'EUR', bankId: santanderId, systemId: system!.id, isActive: false }
          });
          createdBankAccountsMap.set(accSantander2.iban, accSantander2.id);
      }
  } catch (error) { console.error("Error creating Bank Accounts:", error); }
  console.log('Bank Accounts ensured.');

  // --- Crear TPVs --- 
  console.log('Creating POS Terminals...');
  // ... (Creación de POS Terminals con upsert completo usando createdBankAccountsMap y system!.id) ...

  // --- Crear Precios Específicos por Tarifa --- 
  console.log('Creating specific Tariff Prices for ALL Tariffs...');
  const allTariffsFromDB = await prisma.tariff.findMany({ where: { systemId: system!.id } });

  for (const tariff of allTariffsFromDB) {
    console.log(`Processing tariff: ${tariff.name} (ID: ${tariff.id})`);

    // SERVICIOS
    for (const [serviceName, serviceId] of serviceMap) {
      const serviceDetails = await prisma.service.findUnique({ where: { id: serviceId } });
      if (serviceDetails && typeof serviceDetails.price === 'number') {
        let specificPrice = serviceDetails.price;
        if (tariff.name === 'Tarifa VIP') { // Ejemplo: 10% de descuento para VIP
          specificPrice = parseFloat((serviceDetails.price * 0.9).toFixed(2));
        }
        try {
          await prisma.tariffServicePrice.upsert({
            where: { tariffId_serviceId: { tariffId: tariff.id, serviceId: serviceId } },
            update: { price: specificPrice, vatTypeId: serviceDetails.vatTypeId || defaultVatTypeIdFromDB, isActive: true },
            create: { tariffId: tariff.id, serviceId: serviceId, price: specificPrice, vatTypeId: serviceDetails.vatTypeId || defaultVatTypeIdFromDB, isActive: true }
          });
          console.log(`  -> Ensured price for service '${serviceName}' in tariff '${tariff.name}': ${specificPrice}`);
        } catch (e: any) {
          if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
            console.warn(`  -- Price for service '${serviceName}' in tariff '${tariff.name}' likely already exists (P2002). Skipping.`);
          } else {
            console.error(`  !! Error ensuring price for service '${serviceName}' in tariff '${tariff.name}':`, e);
          }
        }
      } else {
        console.warn(`  -- Service '${serviceName}' (ID: ${serviceId}) not found or has no base price. Skipping for tariff '${tariff.name}'.`);
      }
    }

    // PRODUCTOS
    for (const [productName, productId] of productMap) {
      const productDetails = await prisma.product.findUnique({ where: { id: productId } });
      if (productDetails && typeof productDetails.price === 'number') {
        let specificPrice = productDetails.price;
        if (tariff.name === 'Tarifa VIP') { // Ejemplo: 10% de descuento para VIP
          specificPrice = parseFloat((productDetails.price * 0.9).toFixed(2));
        }
        try {
          await prisma.tariffProductPrice.upsert({
            where: { tariffId_productId: { tariffId: tariff.id, productId: productId } },
            update: { price: specificPrice, vatTypeId: productDetails.vatTypeId || defaultVatTypeIdFromDB, isActive: true },
            create: { tariffId: tariff.id, productId: productId, price: specificPrice, vatTypeId: productDetails.vatTypeId || defaultVatTypeIdFromDB, isActive: true }
          });
          console.log(`  -> Ensured price for product '${productName}' in tariff '${tariff.name}': ${specificPrice}`);
        } catch (e: any) {
          if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
            console.warn(`  -- Price for product '${productName}' in tariff '${tariff.name}' likely already exists (P2002). Skipping.`);
          } else {
            console.error(`  !! Error ensuring price for product '${productName}' in tariff '${tariff.name}':`, e);
          }
        }
      } else {
        console.warn(`  -- Product '${productName}' (ID: ${productId}) not found or has no base price. Skipping for tariff '${tariff.name}'.`);
      }
    }

    // BONOS
    for (const [bonoName, bonoDefId] of createdBonoDefsMap) {
      const bonoDefDetails = await prisma.bonoDefinition.findUnique({ where: { id: bonoDefId } });
      if (bonoDefDetails && typeof bonoDefDetails.price === 'number') {
        let specificPrice = bonoDefDetails.price;
        if (tariff.name === 'Tarifa VIP') { // Ejemplo: 5% de descuento para VIP en bonos
          specificPrice = parseFloat((bonoDefDetails.price * 0.95).toFixed(2));
        }
        try {
          await prisma.tariffBonoPrice.upsert({
            where: { tariffId_bonoDefinitionId: { tariffId: tariff.id, bonoDefinitionId: bonoDefId } },
            update: { price: specificPrice, vatTypeId: bonoDefDetails.vatTypeId || defaultVatTypeIdFromDB, isActive: true },
            create: { tariffId: tariff.id, bonoDefinitionId: bonoDefId, price: specificPrice, vatTypeId: bonoDefDetails.vatTypeId || defaultVatTypeIdFromDB, isActive: true }
          });
          console.log(`  -> Ensured price for bono '${bonoName}' in tariff '${tariff.name}': ${specificPrice}`);
        } catch (e: any) {
          if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
            console.warn(`  -- Price for bono '${bonoName}' in tariff '${tariff.name}' likely already exists (P2002). Skipping.`);
          } else {
            console.error(`  !! Error ensuring price for bono '${bonoName}' in tariff '${tariff.name}':`, e);
          }
        }
      } else {
        console.warn(`  -- Bono Definition '${bonoName}' (ID: ${bonoDefId}) not found or has no base price. Skipping for tariff '${tariff.name}'.`);
      }
    }

    // PAQUETES
    for (const [packageName, packageDefId] of createdPackageDefsMap) {
      const packageDefDetails = await prisma.packageDefinition.findUnique({ where: { id: packageDefId } });
      if (packageDefDetails && typeof packageDefDetails.price === 'number') {
        let specificPrice = packageDefDetails.price;
        if (tariff.name === 'Tarifa VIP') { // Ejemplo: 5% de descuento para VIP en paquetes
          specificPrice = parseFloat((packageDefDetails.price * 0.95).toFixed(2));
        }
        // El IVA de un paquete es más complejo, podría ser una media o el de la tarifa.
        // Por simplicidad, usaremos el defaultVatTypeIdFromDB para el paquete en la tarifa.
        try {
          await prisma.tariffPackagePrice.upsert({
            where: { tariffId_packageDefinitionId: { tariffId: tariff.id, packageDefinitionId: packageDefId } },
            update: { price: specificPrice, vatTypeId: defaultVatTypeIdFromDB, isActive: true }, // Usar IVA por defecto de la tarifa para el paquete
            create: { tariffId: tariff.id, packageDefinitionId: packageDefId, price: specificPrice, vatTypeId: defaultVatTypeIdFromDB, isActive: true }
          });
          console.log(`  -> Ensured price for package '${packageName}' in tariff '${tariff.name}': ${specificPrice}`);
        } catch (e: any) {
          if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
            console.warn(`  -- Price for package '${packageName}' in tariff '${tariff.name}' likely already exists (P2002). Skipping.`);
          } else {
            console.error(`  !! Error ensuring price for package '${packageName}' in tariff '${tariff.name}':`, e);
          }
        }
      } else {
        console.warn(`  -- Package Definition '${packageName}' (ID: ${packageDefId}) not found or has no base price. Skipping for tariff '${tariff.name}'.`);
      }
    }
  }
  console.log('Specific Tariff Prices ensured.');

  // --- Crear Promociones de Ejemplo ---
  console.log('Creating Example Promotions...');
  try {
    // Buscar servicios y productos para las promociones
    const serviceLimpiezaId = serviceMap.get('Limpieza Facial Profunda');
    const serviceMasajeId = serviceMap.get('Masaje Relajante');
    const productCremaId = productMap.get('Crema Hidratante Facial');
    
    if (serviceLimpiezaId && serviceMasajeId) {
      // Promoción de descuento por porcentaje
      const promoDescuento = await prisma.promotion.upsert({
        where: { code: 'VERANO2024' },
        update: { 
          name: 'Promoción de Verano 2024',
          description: '20% de descuento en tratamientos faciales',
          type: 'PERCENTAGE_DISCOUNT',
          value: 20.0,
          startDate: new Date('2024-06-01'),
          endDate: new Date('2024-08-31'),
          isActive: true
        },
        create: {
          code: 'VERANO2024',
          name: 'Promoción de Verano 2024',
          description: '20% de descuento en tratamientos faciales',
          type: 'PERCENTAGE_DISCOUNT',
          value: 20.0,
          startDate: new Date('2024-06-01'),
          endDate: new Date('2024-08-31'),
          isActive: true,
          targetScope: 'SPECIFIC_SERVICE',
          targetServiceId: serviceLimpiezaId,
          systemId: system!.id
        }
      });
      console.log(`  -> Ensured promotion: ${promoDescuento.name}`);

      // Promoción de cantidad fija
      const promoFija = await prisma.promotion.upsert({
        where: { code: 'RELAX10' },
        update: {
          name: 'Descuento Relax',
          description: '10€ de descuento en masajes',
          type: 'FIXED_AMOUNT_DISCOUNT',
          value: 10.0,
          isActive: true
        },
        create: {
          code: 'RELAX10',
          name: 'Descuento Relax',
          description: '10€ de descuento en masajes',
          type: 'FIXED_AMOUNT_DISCOUNT',
          value: 10.0,
          isActive: true,
          targetScope: 'SPECIFIC_SERVICE',
          targetServiceId: serviceMasajeId,
          systemId: system!.id
        }
      });
      console.log(`  -> Ensured promotion: ${promoFija.name}`);
    }
  } catch (error) {
    console.error("Error creating promotions:", error);
  }
  console.log('Example Promotions ensured.');

  // --- Crear Equipos --- 
  console.log('Creating Equipment...');
  const equiposData = initialMockData.equipos || [];
  for (const equipoData of equiposData) {
    try {
      // Buscar clínica basándose en el mockId correspondiente
      let clinic;
      if (equipoData.clinicId === getOrCreateCuid('clinic-1')) {
        clinic = createdClinicsMap.get('clinic-1');
      } else if (equipoData.clinicId === getOrCreateCuid('clinic-2')) {
        clinic = createdClinicsMap.get('clinic-2');
      } else if (equipoData.clinicId === getOrCreateCuid('clinic-3')) {
        clinic = createdClinicsMap.get('clinic-3');
      }
      
      if (!clinic) {
        console.warn(`Clinic not found for equipment ${equipoData.name}, skipping...`);
        continue;
      }

      const equipment = await prisma.equipment.upsert({
        where: { name_systemId: { name: equipoData.name, systemId: system!.id } },
        update: {
          description: equipoData.description,
          modelNumber: equipoData.modelNumber,
          purchaseDate: equipoData.purchaseDate ? new Date(equipoData.purchaseDate) : null,
          warrantyEndDate: equipoData.warrantyDate ? new Date(equipoData.warrantyDate) : null,
          isActive: equipoData.isActive,
        },
        create: {
          name: equipoData.name,
          description: equipoData.description,
          modelNumber: equipoData.modelNumber,
          purchaseDate: equipoData.purchaseDate ? new Date(equipoData.purchaseDate) : null,
          warrantyEndDate: equipoData.warrantyDate ? new Date(equipoData.warrantyDate) : null,
          isActive: equipoData.isActive,
          systemId: system!.id,
        }
      });
      console.log(`  -> Ensured equipment: ${equipment.name} (model: ${equipment.modelNumber || 'N/A'})`);
    } catch (error) {
      console.error(`Error creating equipment ${equipoData.name}:`, error);
    }
  }
  console.log('Equipment ensured.');

  // --- Crear Configuraciones de Recambios ---
  console.log('Creating Equipment Spare Parts configurations...');
  try {
    // Buscar equipamiento y productos
    const laserEquipment = await prisma.equipment.findFirst({
      where: { name: 'Láser Diodo LS-1000', systemId: system!.id }
    });

    if (laserEquipment) {
      // Buscar productos de recambios por SKU
      const lamparaProduct = await prisma.product.findFirst({
        where: { sku: 'LD-200K', systemId: system!.id }
      });
      
      const filtroProduct = await prisma.product.findFirst({
        where: { sku: 'FH-01', systemId: system!.id }
      });

      const ventiladorProduct = await prisma.product.findFirst({
        where: { sku: 'VR-50', systemId: system!.id }
      });

      // Crear configuraciones de recambios
      if (lamparaProduct) {
        await prisma.equipmentSparePart.upsert({
          where: { 
            equipmentId_productId: { 
              equipmentId: laserEquipment.id, 
              productId: lamparaProduct.id 
            }
          },
          update: {},
          create: {
            equipmentId: laserEquipment.id,
            productId: lamparaProduct.id,
            partName: 'Lámpara Principal',
            partNumber: 'LD-200K-MAIN',
            recommendedLifespan: 200000, // 200k disparos
            warningThreshold: 180000,    // 90% de vida
            criticalThreshold: 195000,   // 97.5% de vida
            installationNotes: 'Verificar calibración después del cambio. Usar guantes antiestáticos.',
            isRequired: true,
            category: 'Componente Principal',
            systemId: system!.id
          }
        });
        console.log(`  -> Configurado recambio: Lámpara Principal para ${laserEquipment.name}`);
      }

      if (filtroProduct) {
        await prisma.equipmentSparePart.upsert({
          where: { 
            equipmentId_productId: { 
              equipmentId: laserEquipment.id, 
              productId: filtroProduct.id 
            }
          },
          update: {},
          create: {
            equipmentId: laserEquipment.id,
            productId: filtroProduct.id,
            partName: 'Filtro de Aire HEPA',
            partNumber: 'FH-01-STD',
            recommendedLifespan: 4320, // 6 meses en horas (180 días * 24h)
            warningThreshold: 3456,    // 80% de vida
            criticalThreshold: 4104,   // 95% de vida
            installationNotes: 'Cambiar cada 6 meses o cuando el indicador se active.',
            isRequired: true,
            category: 'Filtración',
            systemId: system!.id
          }
        });
        console.log(`  -> Configurado recambio: Filtro HEPA para ${laserEquipment.name}`);
      }

      if (ventiladorProduct) {
        await prisma.equipmentSparePart.upsert({
          where: { 
            equipmentId_productId: { 
              equipmentId: laserEquipment.id, 
              productId: ventiladorProduct.id 
            }
          },
          update: {},
          create: {
            equipmentId: laserEquipment.id,
            productId: ventiladorProduct.id,
            partName: 'Ventilador de Refrigeración',
            partNumber: 'VR-50-COOL',
            recommendedLifespan: 17520, // 2 años en horas
            warningThreshold: 15768,    // 90% de vida
            criticalThreshold: 17016,   // 97% de vida
            installationNotes: 'Limpiar antes de instalar. Verificar dirección del flujo de aire.',
            isRequired: false,
            category: 'Refrigeración',
            systemId: system!.id
          }
        });
        console.log(`  -> Configurado recambio: Ventilador para ${laserEquipment.name}`);
      }
    }
  } catch (error) {
    console.error("Error creating equipment spare parts:", error);
  }
  console.log('Equipment Spare Parts configurations ensured.');

  // --- Crear productos que pueden ser recambios ---
  console.log('Creating spare parts products...');
  const sparePartsProducts = [
    { id: getOrCreateCuid('prod-spare-1'), name: 'Lámpara Depilación LD-200K', description: 'Lámpara de alta duración para equipos de depilación láser. Vida útil estimada: 200,000 disparos', sku: 'LD-200K', costPrice: 850.00, price: 1200.00, categoryName: 'Recambios', currentStock: 5, minStock: 1 },
    { id: getOrCreateCuid('prod-spare-2'), name: 'Filtro HEPA FH-01', description: 'Filtro de aire HEPA para equipos de láser. Cambio recomendado cada 6 meses', sku: 'FH-01', costPrice: 45.00, price: 75.00, categoryName: 'Recambios', currentStock: 15, minStock: 3 },
    { id: getOrCreateCuid('prod-spare-3'), name: 'Cabezal Radiofrecuencia RF-H3', description: 'Cabezal de reemplazo para equipos de radiofrecuencia. Compatible con modelos RF-Pro', sku: 'RF-H3', costPrice: 320.00, price: 480.00, categoryName: 'Recambios', currentStock: 3, minStock: 1 },
    { id: getOrCreateCuid('prod-spare-4'), name: 'Sensor Temperatura ST-100', description: 'Sensor de temperatura de precisión para equipos de ultrasonido', sku: 'ST-100', costPrice: 95.00, price: 150.00, categoryName: 'Recambios', currentStock: 8, minStock: 2 },
    { id: getOrCreateCuid('prod-spare-5'), name: 'Ventilador Refrigeración VR-50', description: 'Ventilador de refrigeración para equipos láser', sku: 'VR-50', costPrice: 125.00, price: 200.00, categoryName: 'Recambios', currentStock: 6, minStock: 2 },
  ];

  for (const spareProduct of sparePartsProducts) {
    try {
      const category = await prisma.category.upsert({
        where: { name_systemId: { name: spareProduct.categoryName, systemId: system!.id } },
        update: {},
        create: { name: spareProduct.categoryName, systemId: system!.id }
      });

      const product = await prisma.product.upsert({
        where: { name_systemId: { name: spareProduct.name, systemId: system!.id } },
        update: {
          description: spareProduct.description,
          sku: spareProduct.sku,
          costPrice: spareProduct.costPrice,
          price: spareProduct.price,
          categoryId: category.id,
          vatTypeId: defaultVatTypeIdFromDB
        },
        create: {
          name: spareProduct.name,
          description: spareProduct.description,
          sku: spareProduct.sku,
          costPrice: spareProduct.costPrice,
          price: spareProduct.price,
          categoryId: category.id,
          vatTypeId: defaultVatTypeIdFromDB,
          systemId: system!.id
        }
      });

      await prisma.productSetting.upsert({
        where: { productId: product.id },
        update: {
          currentStock: spareProduct.currentStock,
          minStockThreshold: spareProduct.minStock,
          isForSale: true,
          isInternalUse: false,
          systemId: system!.id
        },
        create: {
          productId: product.id,
          currentStock: spareProduct.currentStock,
          minStockThreshold: spareProduct.minStock,
          isForSale: true,
          isInternalUse: false,
          systemId: system!.id
        }
      });

      console.log(`  -> Ensured spare part product: ${product.name} (Stock: ${spareProduct.currentStock})`);
    } catch (error) {
      console.error(`Error creating spare part product ${spareProduct.name}:`, error);
    }
  }
  console.log('Spare parts products ensured.');

  // --- Crear TPVs --- 
  console.log('Creating POS Terminals...');
  try {
    const bbvaAccountId = createdBankAccountsMap.get('ES9121000418450200051332');
    const santanderAccountId = createdBankAccountsMap.get('ES8000490001591234567890');
    
    if (bbvaAccountId) {
      const clinic1 = createdClinicsMap.get('clinic-1');
      if (clinic1) {
        const tpvBBVA = await prisma.posTerminal.upsert({
          where: { name_systemId: { name: 'TPV BBVA Clinic 1', systemId: system!.id } },
          update: {
            terminalIdProvider: 'TPV-BBVA-001',
            bankAccountId: bbvaAccountId,
            provider: 'BBVA',
            isActive: true
          },
          create: {
            name: 'TPV BBVA Clinic 1',
            terminalIdProvider: 'TPV-BBVA-001',
            bankAccountId: bbvaAccountId,
            provider: 'BBVA',
            isActive: true,
            systemId: system!.id
          }
        });
        console.log(`  -> Ensured POS Terminal: ${tpvBBVA.name}`);
      }
    }

    if (santanderAccountId) {
      const clinic2 = createdClinicsMap.get('clinic-2');
      if (clinic2) {
        const tpvSantander = await prisma.posTerminal.upsert({
          where: { name_systemId: { name: 'TPV Santander Clinic 2', systemId: system!.id } },
          update: {
            terminalIdProvider: 'TPV-SANT-002',
            bankAccountId: santanderAccountId,
            provider: 'Santander',
            isActive: true
          },
          create: {
            name: 'TPV Santander Clinic 2',
            terminalIdProvider: 'TPV-SANT-002',
            bankAccountId: santanderAccountId,
            provider: 'Santander',
            isActive: true,
            systemId: system!.id
          }
        });
        console.log(`  -> Ensured POS Terminal: ${tpvSantander.name}`);
      }
    }
  } catch (error) {
    console.error("Error creating POS Terminals:", error);
  }
  console.log('POS Terminals ensured.');

  // --- Crear Configuraciones de Pago por Clínica --- 
  console.log('Creating default clinic payment settings...');
  try {
    const clinicsArray = Array.from(createdClinicsMap.values());
    
    for (const clinic of clinicsArray) {
      // Crear configuraciones para cada método de pago
      const paymentMethods = [paymentMethodCash, paymentMethodCard, paymentMethodTransfer, paymentMethodBono];
      
      for (const paymentMethod of paymentMethods) {
        if (paymentMethod) {
          // Verificar si ya existe configuración de pago para esta clínica y método
          const existingConfig = await prisma.clinicPaymentSetting.findUnique({
            where: { 
              systemId_clinicId_paymentMethodDefinitionId: { 
                systemId: system!.id,
                clinicId: clinic.id,
                paymentMethodDefinitionId: paymentMethod.id
              } 
            }
          });

          if (!existingConfig) {
            const paymentConfig = await prisma.clinicPaymentSetting.create({
              data: {
                systemId: system!.id,
                clinicId: clinic.id,
                paymentMethodDefinitionId: paymentMethod.id,
                isActiveInClinic: true,
                isDefaultPosTerminal: paymentMethod.type === 'CARD' ? false : undefined,
                isDefaultReceivingBankAccount: false
              }
            });
            console.log(`  -> Created payment setting for clinic ${clinic.name} - method ${paymentMethod.name}`);
          } else {
            console.log(`  -> Payment setting already exists for clinic ${clinic.name} - method ${paymentMethod.name}`);
          }
        }
      }
    }
  } catch (error) {
    console.error("Error creating clinic payment settings:", error);
  }
  console.log('Clinic payment settings ensured.');

  // --- Crear Facturas de Ejemplo ---
  console.log('Creating example invoices...');
  try {
    const client1 = createdClientsMap.get('ana.garcia@test.com');
    const clinic1 = createdClinicsMap.get('clinic-1');
    const serviceLimpiezaFacialId = serviceMap.get('Limpieza Facial Profunda');
    
    if (client1 && clinic1 && serviceLimpiezaFacialId) {
      // Crear una factura de ejemplo basada en un ticket
      const exampleInvoice = await prisma.invoice.upsert({
        where: { invoiceSeries_invoiceNumber_systemId: { invoiceSeries: 'INV', invoiceNumber: '2024-001', systemId: system!.id } },
        update: {
          totalAmount: 66.55, // 55 + 21% IVA
          taxAmount: 11.55,
          subtotalAmount: 55.00,
          status: 'PAID',
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 días
        },
        create: {
          invoiceNumber: '2024-001',
          invoiceSeries: 'INV',
          type: 'SALE',
          personId: client1.id,
          subtotalAmount: 55.00,
          taxAmount: 11.55,
          totalAmount: 66.55,
          discountAmount: 0,
          currencyCode: 'EUR',
          status: 'PAID',
          issueDate: new Date(),
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          systemId: system!.id,
          items: {
            create: [{
              description: 'Limpieza Facial Profunda',
              quantity: 1,
              unitPrice: 55.00,
              vatPercentage: 21.0,
              vatAmount: 11.55,
              finalPrice: 66.55,
              discountAmount: 0,
              serviceId: serviceLimpiezaFacialId
            }]
          }
        }
      });
      console.log(`  -> Ensured invoice: ${exampleInvoice.invoiceNumber}`);
    }
  } catch (error) {
    console.error("Error creating example invoices:", error);
  }
  console.log('Example invoices ensured.');

  await seedWebhooks(prisma, system!.id); // Llamar al seeder de webhooks

  // <<< --- NUEVO: Crear Clientes de Ejemplo --- >>>
  console.log('Creating example Clients...');
  try {
      // Ahora crearemos personas con functionalRoles: CLIENT
      const client1Data = { 
        email: 'ana.garcia@test.com', // Corregido: usar el email correcto
        firstName: 'Ana', 
        lastName: 'Garcia', 
        phone: '600111222', 
        system: { connect: { id: system!.id } }, 
        birthDate: new Date('1985-05-15'), 
        gender: 'FEMALE', 
        address: 'Calle Falsa 123', 
        city: 'Madrid', 
        countryIsoCode: 'ES', 
        postalCode: '28001'
      };
      
      // Usar person en lugar de client
      let client1Found = await prisma.person.findFirst({ 
        where: { email: client1Data.email, systemId: system!.id } 
      });
      let client1;
      if (client1Found) {
          client1 = await prisma.person.update({ 
            where: { id: client1Found.id }, 
            data: client1Data 
          });
      } else {
          client1 = await prisma.person.create({ data: client1Data });
      }
      
      // Crear el rol funcional CLIENT para esta persona
      const client1Role = await prisma.personFunctionalRole.upsert({
        where: {
          personId_roleType: {
            personId: client1.id,
            roleType: 'CLIENT'
          }
        },
        update: {},
        create: {
          person: { connect: { id: client1.id } },
          roleType: 'CLIENT',
          isActive: true,
          system: { connect: { id: system!.id } }
        }
      });
      
      // Crear PersonClientData
      await prisma.personClientData.upsert({
        where: { functionalRoleId: client1Role.id },
        update: {},
        create: {
          functionalRoleId: client1Role.id,
          marketingConsent: true,
          dataProcessingConsent: true
        }
      });
      
      createdClientsMap.set(client1Data.email, client1);
      
      const client2Data = { 
        email: 'cliente2.casablanca@mail.ma', 
        firstName: 'Youssef', 
        lastName: 'Bennani', 
        phone: '0600998877', 
        system: { connect: { id: system!.id } }, 
        birthDate: new Date('1990-11-20'), 
        gender: 'MALE', 
        address: 'Boulevard Hassan II 456', 
        city: 'Casablanca', 
        countryIsoCode: 'MA', 
        postalCode: '20250', 
      };
      
      let client2Found = await prisma.person.findFirst({ 
        where: { email: client2Data.email, systemId: system!.id } 
      });
      let client2;
      if (client2Found) {
          client2 = await prisma.person.update({ 
            where: { id: client2Found.id }, 
            data: client2Data 
          });
      } else {
          client2 = await prisma.person.create({ data: client2Data });
      }
      
      // Crear el rol funcional CLIENT para esta persona
      const client2Role = await prisma.personFunctionalRole.upsert({
        where: {
          personId_roleType: {
            personId: client2.id,
            roleType: 'CLIENT'
          }
        },
        update: {},
        create: {
          person: { connect: { id: client2.id } },
          roleType: 'CLIENT',
          isActive: true,
          system: { connect: { id: system!.id } }
        }
      });
      
      // Crear PersonClientData
      await prisma.personClientData.upsert({
        where: { functionalRoleId: client2Role.id },
        update: {},
        create: {
          functionalRoleId: client2Role.id,
          marketingConsent: false,
          dataProcessingConsent: false
        }
      });
      
      createdClientsMap.set(client2Data.email, client2);

      // Cliente sin email
      const client3Data = { 
        firstName: 'Cliente', 
        lastName: 'Test Sin Email', 
        phone: '600333444', 
        system: { connect: { id: system!.id } }, 
        birthDate: new Date('1995-01-01'), 
        gender: 'MALE', 
        address: 'Plaza Mayor 1', 
        city: 'Sevilla', 
        countryIsoCode: 'ES', 
        postalCode: '41001',
      };
      const client3 = await prisma.person.create({ data: client3Data });
      
      // Crear el rol funcional CLIENT para esta persona
      const client3Role = await prisma.personFunctionalRole.upsert({
        where: {
          personId_roleType: {
            personId: client3.id,
            roleType: 'CLIENT'
          }
        },
        update: {},
        create: {
          person: { connect: { id: client3.id } },
          roleType: 'CLIENT',
          isActive: true,
          system: { connect: { id: system!.id } }
        }
      });
      
      // Crear PersonClientData
      await prisma.personClientData.upsert({
        where: { functionalRoleId: client3Role.id },
        update: {},
        create: {
          functionalRoleId: client3Role.id,
          marketingConsent: false,
          dataProcessingConsent: true
        }
      });
      
      createdClientsMap.set('client3-no-email', client3);
  } catch (error) { console.error("Error creating example clients:", error); }
  console.log(`Example Clients ensured. Created ${createdClientsMap.size} clients.`);
  // <<< --- FIN Crear Clientes --- >>>

  // --- Crear Instancias de Bonos y Paquetes para Clientes --- 
  console.log('Creating Bono/Package Instances for clients...');
  try {
      const exampleClient = createdClientsMap.get('ana.garcia@test.com'); // Corregido: usar el email correcto
      if (exampleClient) {
          const bonoMasajeDefId = createdBonoDefsMap.get('Bono 5 Masajes Relajantes');
          if (bonoMasajeDefId) { 
              const bonoInstance = await prisma.bonoInstance.create({ data: { bonoDefinitionId: bonoMasajeDefId, personId: exampleClient.id, remainingQuantity: 5, purchaseDate: new Date(), expiryDate: new Date(new Date().setDate(new Date().getDate() + 90)), systemId: system!.id } });
              bonoMasajeInstanceId = bonoInstance.id; 
          }
          const packRelaxDefId = createdPackageDefsMap.get('Pack Relax Total');
          if (packRelaxDefId) {
               const packDef = await prisma.packageDefinition.findUnique({ where: { id: packRelaxDefId }, include: { items: true } });
               if (packDef?.items) { 
                   const remainingItemsJson: { [key: string]: number } = {};
                   packDef.items.forEach(item => { const key = item.serviceId ? `service:${item.serviceId}` : `product:${item.productId}`; remainingItemsJson[key] = item.quantity; });
                   const packageInstance = await prisma.packageInstance.create({ data: { packageDefinitionId: packRelaxDefId, personId: exampleClient.id, remainingItems: remainingItemsJson as any, purchaseDate: new Date(), systemId: system!.id } });
                   packRelaxInstanceId = packageInstance.id; 
               }
           }
       }
   } catch (error) { console.error("Error creating Bono/Package Instances:", error); }
   console.log('Bono/Package Instances creation attempt finished.');

   // <<< --- INICIO: SEEDING DE SESIONES DE CAJA, TICKETS Y PAGOS --- >>>
   console.log('Creating example Cash Sessions, Tickets, Items, and Payments...');

  try {
    // --- Prerequisitos (Usuarios, Clientes, Clínicas, Servicios, etc. deben existir) ---
    const cashierUser1 = createdUsersMap.get('houda@multilaser.ma');
    const cashierUser2 = createdUsersMap.get('latifa@multilaser.ma');
    const sellerUser1 = createdUsersMap.get('yasmine@multilaser.ma');
    const adminUser = createdUsersMap.get('casblasvic@gmail.com');

    const client1 = createdClientsMap.get('ana.garcia@test.com'); // Corregido: usar el email correcto
    const client2 = createdClientsMap.get('cliente2.casablanca@mail.ma');

    const clinic1 = createdClinicsMap.get('clinic-1');
    const clinic2 = createdClinicsMap.get('clinic-2');

    const serviceLimpiezaFacialId = serviceMap.get('Limpieza Facial Profunda');
    const serviceMasajeId = serviceMap.get('Masaje Relajante');
    const productCremaId = productMap.get('Crema Hidratante Facial');

    const bonoMasajeDefId = createdBonoDefsMap.get('Bono 5 Masajes Relajantes');
    // const packageDefRelaxId = createdPackageDefsMap.get('Pack Relax Total'); // Ya no se usa en los tickets de ejemplo directamente

    const paymentMethodCashId = paymentMethodCash?.id;
    const paymentMethodCardId = paymentMethodCard?.id;
    const paymentMethodBonoId = paymentMethodBono?.id;
    const paymentMethodTransferId = paymentMethodTransfer?.id;

    const defaultVatId = defaultVatTypeIdFromDB;
    const tarifaGeneralId = tarifaGeneral?.id;

    if (!cashierUser1 || !cashierUser2 || !sellerUser1 || !adminUser || !client1 || !client2 || !clinic1 || !clinic2 || !serviceLimpiezaFacialId || !serviceMasajeId || !productCremaId || !paymentMethodCashId || !paymentMethodCardId || !paymentMethodBonoId || !defaultVatId || !tarifaGeneralId || !bonoMasajeDefId /*|| !packageDefRelaxId*/) {
      console.error("Missing prerequisite data for Seeding. Check maps and variables.");
      throw new Error("Missing prerequisite data for Seeding.");
    }

    // --- Crear CashSessions de Ejemplo ---
    console.log("Seeding example Cash Sessions...");
    let cashSessionClinic1_Closed: pkg.CashSession | null = null;
    if (clinic1 && cashierUser1 && system) {
      const sessionNumberClinic1 = `${clinic1.prefix || 'CLI1'}-20231026-001`;
      cashSessionClinic1_Closed = await prisma.cashSession.upsert({
        where: { clinicId_sessionNumber_systemId: { clinicId: clinic1.id, sessionNumber: sessionNumberClinic1, systemId: system.id } },
        update: { // Qué actualizar si ya existe. Podemos ser conservadores aquí o actualizar todos los campos.
          userId: cashierUser1.id,
          openingTime: new Date('2023-10-26T09:00:00Z'),
          closingTime: new Date('2023-10-26T18:00:00Z'),
          reconciliationTime: new Date('2023-10-26T18:30:00Z'),
          status: 'RECONCILED',
          openingBalanceCash: 100.00,
          expectedCash: 255.50,
          countedCash: 255.50,
          differenceCash: 0,
          countedCard: 120.00,
          notes: 'Cierre de caja de ejemplo para clinic1, conciliado (actualizado por seed).',
        },
        create: {
          sessionNumber: sessionNumberClinic1,
          userId: cashierUser1.id,
          clinicId: clinic1.id,
          openingTime: new Date('2023-10-26T09:00:00Z'),
          closingTime: new Date('2023-10-26T18:00:00Z'),
          reconciliationTime: new Date('2023-10-26T18:30:00Z'),
          status: 'RECONCILED', // Sesión cerrada y conciliada
          openingBalanceCash: 100.00,
          expectedCash: 255.50, // Ejemplo
          countedCash: 255.50,   // Ejemplo
          differenceCash: 0,     // Ejemplo
          countedCard: 120.00,   // Ejemplo
          notes: 'Cierre de caja de ejemplo para clinic1, conciliado.',
          systemId: system.id,
        }
      });
      console.log(`Upserted RECONCILED CashSession ${cashSessionClinic1_Closed.sessionNumber} for clinic1.`);
    }

    let cashSessionClinic2_Open: pkg.CashSession | null = null;
    if (clinic2 && cashierUser2 && system) {
      const sessionNumberClinic2 = `${clinic2.prefix || 'CLI2'}-20231027-001`;
      cashSessionClinic2_Open = await prisma.cashSession.upsert({
        where: { clinicId_sessionNumber_systemId: { clinicId: clinic2.id, sessionNumber: sessionNumberClinic2, systemId: system.id } },
        update: {
          userId: cashierUser2.id,
          openingTime: new Date('2023-10-27T08:30:00Z'),
          status: 'OPEN',
          openingBalanceCash: 150.00,
          notes: 'Sesión de caja abierta para clinic2 (actualizada por seed).',
          // Campos que no se deben actualizar si la sesión estaba abierta y sigue abierta:
          // closingTime: null, reconciliationTime: null, expectedCash: null, countedCash: null, differenceCash: null, countedCard: null
        },
        create: {
          sessionNumber: sessionNumberClinic2,
          userId: cashierUser2.id,
          clinicId: clinic2.id,
          openingTime: new Date('2023-10-27T08:30:00Z'),
          status: 'OPEN', // Sesión activa
          openingBalanceCash: 150.00,
          systemId: system.id,
          notes: 'Sesión de caja abierta para clinic2.'
        }
      });
      console.log(`Upserted OPEN CashSession ${cashSessionClinic2_Open.sessionNumber} for clinic2.`);
    }

    // --- Escenario 1: Ticket Simple (Servicio + Producto), Pagado Efectivo, CONTABILIZADO ---
    console.log("Seeding Ticket Scenario 1: Simple Sale, Cash Payment, ACCOUNTED");
    // ... (cálculos de precios y VAT para ticket1_item1 y ticket1_item2 se mantienen igual) ...
    const ticket1_item1_price = await getTariffPrice(clinic1.tariffId, 'SERVICE', serviceLimpiezaFacialId) ?? 0;
    const ticket1_item1_quantity = 1;
    const ticket1_item1_lineTotal = ticket1_item1_price * ticket1_item1_quantity;
    const ticket1_item1_vatDetails = await calculateVAT(ticket1_item1_lineTotal, defaultVatId, defaultVatId);
    const ticket1_item1_finalPrice = ticket1_item1_lineTotal + ticket1_item1_vatDetails.vatAmount;

    const ticket1_item2_price = await getTariffPrice(clinic1.tariffId, 'PRODUCT', productCremaId) ?? 0;
    const ticket1_item2_quantity = 1;
    const ticket1_item2_lineTotal = ticket1_item2_price * ticket1_item2_quantity;
    const ticket1_item2_vatDetails = await calculateVAT(ticket1_item2_lineTotal, defaultVatId, defaultVatId);
    const ticket1_item2_finalPrice = ticket1_item2_lineTotal + ticket1_item2_vatDetails.vatAmount;

    const ticket1_totalAmount = ticket1_item1_lineTotal + ticket1_item2_lineTotal;
    const ticket1_taxAmount = ticket1_item1_vatDetails.vatAmount + ticket1_item2_vatDetails.vatAmount;
    const ticket1_finalAmount = ticket1_item1_finalPrice + ticket1_item2_finalPrice;
    const ticket1_number = '2025-000001';

    if (cashSessionClinic1_Closed) { // Solo crear si la sesión de caja existe
    const ticket1 = await prisma.ticket.upsert({
      where: { ticketNumber_clinicId_systemId: { ticketNumber: ticket1_number, clinicId: clinic1.id, systemId: system!.id } },
      update: {
        type: 'SALE',
        status: 'ACCOUNTED',
        currencyCode: clinic1.currency || 'EUR',
        totalAmount: ticket1_totalAmount,
        taxAmount: ticket1_taxAmount,
        finalAmount: ticket1_finalAmount,
        notes: 'Ticket de ejemplo simple, contabilizado (actualizado por seed).',
        personId: client1.id,
        cashierUserId: cashierUser1.id,
        clinicId: clinic1.id,
        cashSessionId: cashSessionClinic1_Closed.id,
        // items y payments no se actualizan directamente aquí para evitar complejidad,
        // se asume que si el ticket existe, sus items y pagos ya son correctos o se manejan por separado.
      },
      create: {
        ticketNumber: ticket1_number,
        type: 'SALE',
        status: 'ACCOUNTED', // Cambiado de PAID a ACCOUNTED
        currencyCode: clinic1.currency || 'EUR',
        totalAmount: ticket1_totalAmount,
        taxAmount: ticket1_taxAmount,
        finalAmount: ticket1_finalAmount,
        notes: 'Ticket de ejemplo simple, contabilizado.',
        personId: client1.id,
        cashierUserId: cashierUser1.id,
        clinicId: clinic1.id,
        systemId: system!.id,
        items: {
          create: [
            {
              itemType: 'SERVICE',
              serviceId: serviceLimpiezaFacialId,
              description: 'Limpieza Facial Profunda',
              quantity: ticket1_item1_quantity,
              unitPrice: ticket1_item1_price,
              vatRateId: ticket1_item1_vatDetails.vatRateId,
              vatAmount: ticket1_item1_vatDetails.vatAmount,
              finalPrice: ticket1_item1_finalPrice,
            },
            {
              itemType: 'PRODUCT',
              productId: productCremaId,
              description: 'Crema Hidratante Facial',
              quantity: ticket1_item2_quantity,
              unitPrice: ticket1_item2_price,
              vatRateId: ticket1_item2_vatDetails.vatRateId,
              vatAmount: ticket1_item2_vatDetails.vatAmount,
              finalPrice: ticket1_item2_finalPrice,
            },
          ]
        },
        payments: {
          create: [
            {
              type: 'DEBIT',
              amount: ticket1_finalAmount,
              paymentDate: new Date('2023-10-26T10:00:00Z'), // Fecha dentro de la sesión
              status: 'COMPLETED',
              paymentMethodDefinitionId: paymentMethodCashId,
              userId: cashierUser1.id,
              clinicId: clinic1.id,
              systemId: system!.id,
              payerPersonId: client1.id,
              cashSessionId: cashSessionClinic1_Closed.id, // Pago vinculado a la sesión
            }
          ]
        }
      }
    });
      console.log(`Upserted Ticket ${ticket1.ticketNumber} (ACCOUNTED) with items and payment.`);
    }


    // --- Escenario 2: Ticket con Descuento Manual por Línea, Vendedor, Pago Parcial Tarjeta, ABIERTO ---
    console.log("Seeding Ticket Scenario 2: Manual Discount, Seller, Partial Card Payment, OPEN");
    // ... (cálculos de precios y VAT para ticket2_item1 se mantienen igual) ...
    const ticket2_item1_price = await getTariffPrice(clinic2.tariffId, 'SERVICE', serviceMasajeId) ?? 0;
    const ticket2_item1_quantity = 2;
    const ticket2_item1_grossLineTotal = ticket2_item1_price * ticket2_item1_quantity;
    const ticket2_item1_manualDiscount = 5.00;
    const ticket2_item1_price_after_discount = ticket2_item1_grossLineTotal - ticket2_item1_manualDiscount;
    const ticket2_item1_vatDetails = await calculateVAT(ticket2_item1_price_after_discount, defaultVatId, defaultVatId);
    const ticket2_item1_finalPrice = ticket2_item1_price_after_discount + ticket2_item1_vatDetails.vatAmount;

    const ticket2_totalAmount = ticket2_item1_grossLineTotal; // Debería ser el total antes de descuentos para reflejar el valor bruto
    const ticket2_taxAmount = ticket2_item1_vatDetails.vatAmount;
    // El finalAmount es el que se paga después de descuentos e impuestos.
    const ticket2_finalAmount = ticket2_item1_finalPrice;
    const ticket2_number = '2025-000002-BONO';

    if (cashSessionClinic2_Open) { // Solo crear si la sesión de caja abierta existe
    const ticket2 = await prisma.ticket.upsert({
        where: { ticketNumber_clinicId_systemId: { ticketNumber: ticket2_number, clinicId: clinic2.id, systemId: system!.id } },
        update: {
            type: 'SALE',
            status: 'OPEN',
            currencyCode: clinic2.currency || 'EUR',
            totalAmount: ticket2_totalAmount,
            taxAmount: ticket2_taxAmount,
            finalAmount: ticket2_finalAmount, // Este es el importe que queda por pagar o el total a pagar
            notes: 'Ticket con descuento manual, pago parcial, actualmente abierto (actualizado por seed).',
            personId: client2.id,
            cashierUserId: cashierUser2.id,
            sellerUserId: sellerUser1.id,
            clinicId: clinic2.id,
             // No cashSessionId si está OPEN y no se ha cerrado nunca
        },
        create: {
            ticketNumber: ticket2_number,
            type: 'SALE',
            status: 'OPEN', 
            currencyCode: clinic2.currency || 'EUR',
            totalAmount: ticket2_totalAmount,
            taxAmount: ticket2_taxAmount,
            finalAmount: ticket2_finalAmount,
            notes: 'Ticket con descuento manual, pago parcial, actualmente abierto.',
            personId: client2.id,
            cashierUserId: cashierUser2.id,
            sellerUserId: sellerUser1.id,
            clinicId: clinic2.id,
            systemId: system!.id,
            items: {
                create: [
                    {
                        itemType: 'SERVICE',
                        serviceId: serviceMasajeId,
                        description: 'Masaje Relajante (x2)',
                        quantity: ticket2_item1_quantity,
                        unitPrice: ticket2_item1_price,
                        manualDiscountAmount: ticket2_item1_manualDiscount,
                        discountNotes: 'Descuento especial cliente frecuente.',
                        vatRateId: ticket2_item1_vatDetails.vatRateId,
                        vatAmount: ticket2_item1_vatDetails.vatAmount,
                        finalPrice: ticket2_item1_finalPrice, 
                    },
                ]
            },
            payments: {
                create: [
                    {
                        type: 'DEBIT',
                      amount: Math.round(ticket2_finalAmount / 2), // Asumiendo que el pago parcial se hizo
                        paymentDate: new Date(),
                        status: 'COMPLETED',
                        paymentMethodDefinitionId: paymentMethodCardId,
                        userId: cashierUser2.id,
                        clinicId: clinic2.id,
                        systemId: system!.id,
                      payerPersonId: client2.id,
                      cashSessionId: cashSessionClinic2_Open.id, 
                    }
                ]
            }
        }
    });
      console.log(`Upserted Ticket ${ticket2.ticketNumber} (OPEN) with manual discount and partial payment.`);
    }


    // --- Escenario 3: Ticket por Consumo de Bono (isValidationGenerated), CONTABILIZADO ---
    console.log("Seeding Ticket Scenario 3: Bono Consumption (Validation Generated), ACCOUNTED");
    // ... (cálculos de precios para ticket3 se mantienen igual, todo es 0) ...
         const ticket3_item1_price = 0;
         const ticket3_item1_quantity = 1;
    // ...
         const ticket3_finalAmount = 0;

         const ticket3_totalAmount = 0;
         const ticket3_taxAmount = 0;
    const ticket3_number = '2025-000003-BONO';

    if (bonoMasajeInstanceId && client1 && serviceMasajeId && paymentMethodBonoId && cashSessionClinic1_Closed) { // Asegurar sesión cerrada
         const ticket3 = await prisma.ticket.upsert({
            where: { ticketNumber_clinicId_systemId: { ticketNumber: ticket3_number, clinicId: clinic1.id, systemId: system!.id } },
            update: {
                type: 'SALE',
                status: 'ACCOUNTED',
                currencyCode: clinic1.currency || 'EUR',
                totalAmount: ticket3_totalAmount,
                taxAmount: ticket3_taxAmount,
                finalAmount: ticket3_finalAmount,
                notes: 'Generado por consumo de bono masaje, contabilizado (actualizado por seed).',
                personId: client1.id,
                cashierUserId: cashierUser1.id,
                clinicId: clinic1.id,
                cashSessionId: cashSessionClinic1_Closed.id,
            },
            create: {
                ticketNumber: ticket3_number,
                type: 'SALE',
                status: 'ACCOUNTED', 
                currencyCode: clinic1.currency || 'EUR',
                totalAmount: ticket3_totalAmount,
                taxAmount: ticket3_taxAmount,
                finalAmount: ticket3_finalAmount,
                notes: 'Generado por consumo de bono masaje, contabilizado.',
                personId: client1.id,
                cashierUserId: cashierUser1.id,
                clinicId: clinic1.id,
                systemId: system!.id,
                cashSessionId: cashSessionClinic1_Closed.id, 
                items: {
                    create: [
                        {
                            itemType: 'SERVICE',
                            serviceId: serviceMasajeId,
                            description: 'Masaje Relajante (Consumo Bono)',
                            quantity: ticket3_item1_quantity,
                            unitPrice: ticket3_item1_price,
                            manualDiscountAmount: 0,
                            promotionDiscountAmount: 0,
                            vatRateId: defaultVatId, 
                            vatAmount: 0,
                            finalPrice: 0,
                            consumedBonoInstanceId: bonoMasajeInstanceId,
                            isValidationGenerated: true,
                        },
                    ]
                },
                 payments: {
                     create: [
                         {
                             type: 'DEBIT',
                             amount: 0,
                             paymentDate: new Date('2023-10-26T11:00:00Z'), // Fecha dentro de la sesión cerrada
                             status: 'COMPLETED',
                             paymentMethodDefinitionId: paymentMethodBonoId,
                             bonoInstanceId: bonoMasajeInstanceId,
                             userId: cashierUser1.id,
                             clinicId: clinic1.id,
                             systemId: system!.id,
                             payerPersonId: client1.id,
                             notes: `Pago con Bono Instancia ID: ${bonoMasajeInstanceId}`,
                             cashSessionId: cashSessionClinic1_Closed.id, // Pago vinculado a la sesión
                         }
                     ]
                 }
            }
         });
        console.log(`Upserted Ticket ${ticket3.ticketNumber} (ACCOUNTED) for bono consumption.`);
    }

    // --- Escenario 4: Ticket Anulado (VOID), asociado a una sesión CERRADA (para registro) ---
    console.log("Seeding Ticket Scenario 4: VOID Ticket, associated with a CLOSED session");
    const ticket4_item1_price = await getTariffPrice(clinic1.tariffId, 'SERVICE', serviceMasajeId) ?? 0;
        const ticket4_item1_quantity = 1;
        const ticket4_item1_lineTotal = ticket4_item1_price * ticket4_item1_quantity;
        const ticket4_item1_vatDetails = await calculateVAT(ticket4_item1_lineTotal, defaultVatId, defaultVatId);
        const ticket4_item1_finalPrice = ticket4_item1_lineTotal + ticket4_item1_vatDetails.vatAmount;
    const ticket4_number = '2025-000004-VOID';

    if (cashSessionClinic1_Closed && client1 && serviceMasajeId && cashierUser1 && system) {
        const ticket4 = await prisma.ticket.upsert({
            where: { ticketNumber_clinicId_systemId: { ticketNumber: ticket4_number, clinicId: clinic1.id, systemId: system!.id } },
            update: {
                type: 'SALE',
                status: 'VOID', 
                currencyCode: clinic1.currency || 'EUR',
                totalAmount: ticket4_item1_lineTotal,
                taxAmount: ticket4_item1_vatDetails.vatAmount,
                finalAmount: ticket4_item1_finalPrice,
                notes: 'Ticket de ejemplo anulado, registrado en cierre de caja (actualizado por seed).',
                personId: client1.id,
                cashierUserId: cashierUser1.id,
                clinicId: clinic1.id,
                cashSessionId: cashSessionClinic1_Closed.id, 
            },
            create: {
                ticketNumber: ticket4_number, 
                 type: 'SALE',
                status: 'VOID', 
                 currencyCode: clinic1.currency || 'EUR',
                totalAmount: ticket4_item1_lineTotal,
                taxAmount: ticket4_item1_vatDetails.vatAmount,
                finalAmount: ticket4_item1_finalPrice,
                notes: 'Ticket de ejemplo anulado, registrado en cierre de caja.',
                personId: client1.id,
                cashierUserId: cashierUser1.id,
                clinicId: clinic1.id,
                systemId: system!.id,
                cashSessionId: cashSessionClinic1_Closed.id, 
                items: {
                    create: [{
                            itemType: 'SERVICE',
                            serviceId: serviceMasajeId,
                        description: 'Servicio que se anuló',
                            quantity: ticket4_item1_quantity,
                            unitPrice: ticket4_item1_price,
                        vatRateId: ticket4_item1_vatDetails.vatRateId,
                        vatAmount: ticket4_item1_vatDetails.vatAmount,
                            finalPrice: ticket4_item1_finalPrice,
                    }]
                }
                // Los tickets VOID generalmente no tienen pagos, o si los tuvieron, se revirtieron.
            }
        });
        console.log(`Upserted Ticket ${ticket4.ticketNumber} (VOID) and associated with closed CashSession.`);
    }

  } catch (error) {
    console.error("Error during comprehensive Ticket, Item, and Payment seeding:", error);
    // No lanzar error aquí para permitir que el resto del seed intente continuar si es posible
    // o manejarlo según la política de errores del seed general.
  }
  console.log('Comprehensive example Tickets, Items, and Payments creation attempt finished.');
  // <<< --- FIN: SEEDING DE TICKETS Y PAGOS --- >>>

  // Temporalmente comentado hasta adaptar los seeds al modelo actual
  await seedPersons(prisma, system!.id);
  await seedTags(prisma, system!.id); // Agregar llamada a seedTags
  
  // Crear datos de prueba para Energy Insights al final
  await seedAnomalias(prisma, system!.id);
  
  console.log('Seeding completed.');
} // Fin función main()

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  }); 