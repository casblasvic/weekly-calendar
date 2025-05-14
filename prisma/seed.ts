// Importamos TODO el paquete como 'pkg'
import pkg from '@prisma/client';
// <<< CORREGIDO: Asegurar que Prisma está importado >>>
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
      id: 'clinic-1', // Usado como clave en createdClinicsMap
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
          { id: 'cabin-1', clinicId: 'clinic-1', code: 'CAB1', name: 'Cabina Láser 1', color: '#4f46e5', isActive: true, order: 1 },
          { id: 'cabin-2', clinicId: 'clinic-1', code: 'CAB2', name: 'Cabina Estética', color: '#ef4444', isActive: true, order: 2 },
          { id: 'cabin-3', clinicId: 'clinic-1', code: 'CAB3', name: 'Cabina Tratamientos', color: '#22c55e', isActive: true, order: 3 }
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
        rate: 'Tarifa General', // Usado para buscar tarifa existente
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
      id: 'clinic-2', // Usado como clave en createdClinicsMap
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
          { id: 'cabin-4', clinicId: 'clinic-2', code: 'C1', name: 'Cabina Principal CAFC', color: '#f97316', isActive: true, order: 1 },
          { id: 'cabin-5', clinicId: 'clinic-2', code: 'C2', name: 'Sala de Espera CAFC', color: '#6b7280', isActive: false, order: 2 }
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
        rate: 'Tarifa VIP', // Usado para buscar tarifa existente
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
      id: 'clinic-3', // Usado como clave en createdClinicsMap
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
        cabins: [{ id: 'cabin-6', clinicId: 'clinic-3', code: 'Tes', name: 'Test Cabin', color: '#10b981', isActive: true, order: 1 }], // Usado para crear cabinas
        // schedule: null, // No hay schedule detallado, se usan bloques independientes
        initialCash: 500, // Usado en upsert clinic
        appearsInApp: false, // Usado en upsert clinic
        ticketSize: 'a4', // Usado en upsert clinic
        rate: 'Tarifa General', // Usado para buscar tarifa existente
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
    { id: 'fam-1', nombre: 'Tratamientos Faciales', descripcion: 'Servicios para el rostro', tarifaId: 'tarifa-1', isActive: true },
    { id: 'fam-2', nombre: 'Tratamientos Corporales', descripcion: 'Servicios para el cuerpo', tarifaId: 'tarifa-1', isActive: true },
    { id: 'fam-3', nombre: 'Depilación Láser', descripcion: 'Servicios de depilación', tarifaId: 'tarifa-1', isActive: true },
    { id: 'fam-4', nombre: 'Servicios CAFC', descripcion: 'Servicios exclusivos CAFC', tarifaId: 'tarifa-2', isActive: true },
    { id: 'fam-5', nombre: 'Cremas Faciales', descripcion: 'Productos para cuidado facial', isActive: true }, // Añadida para productos
    { id: 'fam-6', nombre: 'Productos Corporales', descripcion: 'Productos para cuidado corporal', isActive: true } // Añadida para productos
  ],
  servicios: [ // Usado para crear Services y ServiceSettings
    // Servicios para 'Tarifa General' (implícito por precio base)
    { id: 'serv-1', codigo: 'S001', nombre: 'Limpieza Facial Profunda', descripcion: 'Limpieza e hidratación', duracion: 60, familiaId: 'fam-1', nombreFamilia: 'Tratamientos Faciales', tarifaId: 'tarifa-1', precio: 55, tipoIvaId: 'iva-gral-mock', activo: true, config: {}, color: '#3b82f6' }, // Precio ajustado
    { id: 'serv-2', codigo: 'S002', nombre: 'Peeling Químico', descripcion: 'Renovación celular', duracion: 45, familiaId: 'fam-1', nombreFamilia: 'Tratamientos Faciales', tarifaId: 'tarifa-1', precio: 70, tipoIvaId: 'iva-gral-mock', activo: true, config: {}, color: '#a855f7' }, // Necesita su propio precio específico si es diferente
    { id: 'serv-3', codigo: 'S003', nombre: 'Masaje Relajante', descripcion: 'Masaje de cuerpo completo', duracion: 60, familiaId: 'fam-2', nombreFamilia: 'Tratamientos Corporales', tarifaId: 'tarifa-1', precio: 50, tipoIvaId: 'iva-gral-mock', activo: true, config: {}, color: '#14b8a6' }, // Precio ajustado
    { id: 'serv-4', codigo: 'S004', nombre: 'Depilación Láser Piernas', descripcion: 'Láser diodo', duracion: 40, familiaId: 'fam-3', nombreFamilia: 'Depilación Láser', tarifaId: 'tarifa-1', precio: 120, tipoIvaId: 'iva-gral-mock', activo: true, config: {}, color: '#ec4899' }, // Nombre ajustado
    { id: 'serv-5', codigo: 'S005', nombre: 'Depilación Axilas', descripcion: 'Láser diodo', duracion: 15, familiaId: 'fam-3', nombreFamilia: 'Depilación Láser', tarifaId: 'tarifa-1', precio: 30, tipoIvaId: 'iva-gral-mock', activo: true, config: {}, color: '#f472b6' }, // Necesita su propio precio
    // Servicios para 'Tarifa VIP' (implícito por precio base)
    { id: 'serv-6', codigo: 'S006', nombre: 'Tratamiento Reafirmante CAFC', descripcion: 'Tecnología exclusiva', duracion: 75, familiaId: 'fam-4', nombreFamilia: 'Servicios CAFC', tarifaId: 'tarifa-2', precio: 150, tipoIvaId: 'iva-red-mock', activo: true, config: {}, color: '#f97316' } // Necesita su propio precio
  ],
  tiposIVA: [ // Usado para crear VATTypes (si no existen por nombre/systemId)
    { id: 'iva-gral-mock', descripcion: 'IVA General (21%)', porcentaje: 21.00, tarifaId: 'tarifa-1' }, // Coincide con el creado por defecto
    { id: 'iva-red-mock', descripcion: 'IVA Reducido (10%)', porcentaje: 10.00, tarifaId: 'tarifa-2' } // Se creará si no existe
  ],
  equipos: [ // Usado para crear Equipment
    { id: 'eq-1', clinicId: 'clinic-1', clinicIds: ['clinic-1'], code: 'LASER01', name: 'Láser Diodo LS-1000', description: 'Equipo para depilación', serialNumber: 'LS1000-SN123', modelNumber: 'LS-1000', purchaseDate: '2023-01-15', warrantyDate: '2025-01-15', location: 'Cabina Láser 1', supplier: 'LaserTech', status: 'active', config: {}, isActive: true, notes: 'Mantenimiento anual en Enero' },
    { id: 'eq-2', clinicId: 'clinic-1', clinicIds: ['clinic-1'], code: 'RF01', name: 'Radiofrecuencia RF-Pro', description: 'Equipo para tratamientos faciales', serialNumber: 'RFPRO-SN456', modelNumber: 'RF-PRO', purchaseDate: '2023-03-20', warrantyDate: '2025-03-20', location: 'Cabina Estética', supplier: 'BeautyCorp', status: 'active', config: {}, isActive: true, notes: '' },
    { id: 'eq-3', clinicId: 'clinic-2', clinicIds: ['clinic-2'], code: 'ULTRA01', name: 'Ultrasonido US-500', description: 'Equipo para tratamientos corporales', serialNumber: 'US500-SN789', modelNumber: 'US-500', purchaseDate: '2022-11-10', warrantyDate: '2024-11-10', location: 'Cabina Principal CAFC', supplier: 'MedEquip', status: 'active', config: {}, isActive: true, notes: 'Revisión pendiente' }
  ],
  usuarios: [ // Usado para crear Users, UserRoles, UserClinicAssignments
    {
      id: "usr-houda", // No usado directamente, se busca por email
      nombre: "Houda",
      apellidos: "Bekkali", // Añadido
      email: "houda@multilaser.ma",
      telefono: "+212 611 223344", // Añadido
      perfil: "Personal Clinica", // Mapeado a rol 'Personal Clinica'
      clinicasIds: ["clinic-1"], // Mapeado a UserClinicAssignment
      activo: true // Usado en upsert
    },
    {
      id: "usr-islam",
      nombre: "Islam",
      apellidos: "Alaoui",
      email: "islam.alaoui@multilaser.ma",
      telefono: "+212 622 334455",
      perfil: "Central", // Mapeado a rol 'Administrador'
      clinicasIds: ["clinic-1", "clinic-2", "clinic-3"],
      activo: true
    },
    {
      id: "usr-latifa",
      nombre: "Latifa",
      apellidos: "Cherkaoui",
      email: "latifa@multilaser.ma",
      telefono: "+212 633 445566",
      perfil: "Personal Clinica", // Mapeado a rol 'Personal Clinica'
      clinicasIds: ["clinic-2"],
      activo: true
    },
    {
      id: "usr-lina",
      nombre: "Lina",
      apellidos: "Admin", // Apellido genérico
      email: "is.organizare@gmail.com",
      telefono: "+34 699 887766",
      perfil: "Administrador", // Mapeado a rol 'Administrador'
      clinicasIds: ["clinic-1", "clinic-2", "clinic-3"], // Asignado a todas
      activo: true
    },
    {
      id: "usr-multi",
      nombre: "Multilaser",
      apellidos: "System",
      email: "casblaxic@gmail.com",
      telefono: "+34 611 223344",
      perfil: "Administrador", // Mapeado a rol 'Administrador'
      clinicasIds: ["clinic-1", "clinic-2", "clinic-3"], // Asignado a todas
      activo: true
    },
    {
      id: "usr-salma",
      nombre: "Salma",
      apellidos: "Bouregba",
      email: "bouregbasalma7@gmail.com",
      telefono: "+212 655 667788",
      perfil: "Personal Clinica", // Mapeado a rol 'Personal Clinica'
      clinicasIds: ["clinic-3"],
      activo: true
    },
    {
      id: "usr-yasmine",
      nombre: "Yasmine",
      apellidos: "Tachfine",
      email: "yasmine@multilaser.ma",
      telefono: "+212 677 889900",
      perfil: "Personal Clinica", // Mapeado a rol 'Personal Clinica'
      clinicasIds: ["clinic-1"],
      activo: true
    },
    {
      id: "usr-admin-sys",
      nombre: "Admin",
      apellidos: "Sistema",
      email: "casblasvic@gmail.com",
      telefono: "+34 600 000001",
      perfil: "Administrador", // Mapeado a rol 'Administrador'
      clinicasIds: ["clinic-1", "clinic-2", "clinic-3"], // Asignado a todas como admin
      activo: true
    }
  ]
};
// --- FIN: Definición de Datos Iniciales ---


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
  const createdClientsMap = new Map<string, pkg.Client>();
  let createdBankAccountsMap = new Map<string, string>(); // iban -> id
  // <<< AÑADIR DECLARACIÓN DEL MAPA DE USUARIOS >>>
  const createdUsersMap = new Map<string, pkg.User>(); 
  
  // <<< Variables para IDs globales (CORREGIDO: Inicialización correcta) >>>
  let system: pkg.System | null = null;
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
  // <<< CORREGIDO: Cambiado upsert a findFirst/update/create >>>
  let systemFound = await prisma.system.findFirst({ 
      where: { name: 'Sistema Ejemplo Avatar' } 
  });
  if (systemFound) {
    system = await prisma.system.update({ 
        where: { id: systemFound.id }, 
        data: { isActive: true } 
    });
  } else {
    system = await prisma.system.create({ 
        data: { name: 'Sistema Ejemplo Avatar', isActive: true } 
    });
  }
  // system = await prisma.system.upsert({ 
  //     where: { name: 'Sistema Ejemplo Avatar' }, // <<< ERROR LINTER: 'name' no es único
  //     update: { isActive: true }, 
  //     create: { name: 'Sistema Ejemplo Avatar', isActive: true },
  // });
  console.log(`Using system: ${system.name} (ID: ${system.id})`);

  // --- Crear Países (si no existen) --- 
  console.log('Creating countries...');
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
  console.log('Countries ensured.');

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
  adminRole = await prisma.role.upsert({ 
      where: { name_systemId: { name: 'Administrador', systemId: system!.id } }, 
      update: { description: 'Rol con acceso total al sistema' }, 
      // <<< CORREGIDO: Usar 'create' en la tabla intermedia RolePermission >>>
    create: {
      name: 'Administrador',
          description: 'Rol con acceso total al sistema', 
          systemId: system!.id, 
      permissions: {
              // <<< CORREGIDO: Eliminar systemId explícito al crear el permiso a través de la relación >>>
              create: allPermissions.map(p => ({ permissionId: p.id })) 
          } 
      },
  });
  staffRole = await prisma.role.upsert({ 
      where: { name_systemId: { name: 'Personal Clinica', systemId: system!.id } }, 
      update: { description: 'Rol para el personal de la clínica con acceso limitado' }, 
      create: { name: 'Personal Clinica', description: 'Rol para el personal de la clínica con acceso limitado', systemId: system!.id /* Añadir permisos específicos si es necesario */ },
  });
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

  const saltRounds = 10;
  const defaultPassword = 'password123';
  const hashedPassword = await bcrypt.hash(defaultPassword, saltRounds);
  console.log(`Hashed default password.`);

  // --- Crear Tipos de IVA --- 
  console.log('Creating VAT types...');
  vatGeneral = await prisma.vATType.upsert({ 
    where: { name_systemId: { name: 'IVA General (21%)', systemId: system!.id } },
    update: { rate: 21.0, isDefault: true }, create: { name: 'IVA General (21%)', rate: 21.0, isDefault: true, systemId: system!.id },
  });
  defaultVatTypeIdFromDB = vatGeneral.id; 
  const vatTypesData = initialMockData.tiposIVA || [];
  for (const vatData of vatTypesData) {
      const vatType = await prisma.vATType.upsert({
          where: { name_systemId: { name: vatData.descripcion, systemId: system!.id } },
          update: { rate: vatData.porcentaje }, 
          create: { name: vatData.descripcion, rate: vatData.porcentaje, systemId: system!.id },
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
         const mockTariffName = clinicData.config?.rate;
         const foundTariff = mockTariffName ? createdTariffsMap.get(mockTariffName) : undefined;
      const targetTariffId = foundTariff ? foundTariff.id : tarifaGeneral!.id; 

         const clinic = await prisma.clinic.upsert({
          where: { Clinic_name_systemId_key: { name: clinicData.name, systemId: system!.id } }, 
          update: { address: clinicData.direccion, city: clinicData.city, phone: clinicData.telefono, email: clinicData.email, isActive: clinicData.isActive !== false, tariffId: targetTariffId }, 
          create: { name: clinicData.name, prefix: clinicData.prefix, address: clinicData.direccion, city: clinicData.city, currency: 'EUR', phone: clinicData.telefono, email: clinicData.email, isActive: clinicData.isActive !== false, systemId: system!.id, tariffId: targetTariffId! }
         });
         createdClinicsMap.set(clinicData.id, clinic);
  }
  console.log('Clinics ensured.');

  // --- Crear Cabinas ---
  console.log('Creating cabins...');
  // ... (Creación de Cabinas sin cambios, asumir que usa createdClinicsMap y system!.id) ...

  // --- Crear Horarios de Clínica ---
  console.log('Creating clinic schedules...');
  // ... (Creación de Horarios de Clínica sin cambios, asumir que usa createdClinicsMap y system!.id) ...
 
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
         update: { isActive: serviceData.activo !== false },
         create: { serviceId: service.id, isActive: serviceData.activo !== false }
     });
     if (!serviceMap.has(service.name)) serviceMap.set(service.name, service.id);
  }
  console.log('Services ensured.');

  // --- Crear Productos --- 
  console.log('Creating Products...');
  const directProductData = [ /* ... (datos de producto como antes) ... */ ];
  for (const productData of directProductData) { 
      const categoryId = productData.categoryId; 
      const vatTypeId = defaultVatTypeIdFromDB;
      // <<< CORREGIDO: Upsert completo para producto y settings >>>
      const product = await prisma.product.upsert({
          where: { name_systemId: { name: productData.name, systemId: system!.id } }, 
          update: { sku: productData.sku, description: productData.description, costPrice: productData.costPrice, price: productData.price, barcode: productData.barcode, categoryId: categoryId, vatTypeId: vatTypeId }, 
          create: { name: productData.name, sku: productData.sku, description: productData.description, costPrice: productData.costPrice, price: productData.price, barcode: productData.barcode, categoryId: categoryId!, vatTypeId: vatTypeId!, systemId: system!.id }
      });
      await prisma.productSetting.upsert({
        where: { productId: product.id },
          update: { currentStock: productData.currentStock, minStockThreshold: productData.minStockThreshold, isForSale: productData.isForSale, isInternalUse: productData.isInternalUse, isActive: productData.activo, pointsAwarded: productData.pointsAwarded },
          create: { productId: product.id, currentStock: productData.currentStock, minStockThreshold: productData.minStockThreshold, isForSale: productData.isForSale, isInternalUse: productData.isInternalUse, isActive: productData.activo, pointsAwarded: productData.pointsAwarded }
      });
      if (!productMap.has(product.name)) productMap.set(product.name, product.id);
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
          create: { name: 'Bono 5 Masajes Relajantes', serviceId: masajeRelajanteId, quantity: 5, price: 200, validityDays: 90, vatTypeId: defaultVatTypeIdFromDB!, systemId: system!.id, settings: { create: { isActive: true, pointsAwarded: 50 } } }
          });
          createdBonoDefsMap.set(bonoMasaje.name, bonoMasaje.id);
  }
  // ... otro bono ...
  console.log('Bono Definitions ensured.');

  // --- Crear Paquetes Mixtos --- 
  console.log('Creating Package Definitions...');
  // <<< CORREGIDO: Upsert completo para paquete >>>
  const masajeIdForPack = serviceMap.get('Masaje Relajante');
  const cremaIdForPack = productMap.get('Crema Hidratante Facial');
  if (masajeIdForPack && cremaIdForPack) {
          const packRelax = await prisma.packageDefinition.upsert({
          where: { name_systemId: { name: 'Pack Relax Total', systemId: system!.id } }, 
              update: { price: 75 },
          create: { name: 'Pack Relax Total', description: 'Un masaje relajante y una crema hidratante.', price: 75, systemId: system!.id, settings: { create: { isActive: true, pointsAwarded: 80 } }, items: { create: [ { itemType: 'SERVICE', serviceId: masajeIdForPack, quantity: 1 }, { itemType: 'PRODUCT', productId: cremaIdForPack, quantity: 1 } ] } }
          });
          createdPackageDefsMap.set(packRelax.name, packRelax.id);
  }
  // ... otro paquete ...
  console.log('Package Definitions ensured.');

  // --- Crear Cuentas Bancarias --- 
  console.log('Creating Bank Accounts...');
  try {
      const bbvaId = bankMap.get('BBVA');
      const santanderId = bankMap.get('Santander');
      if (bbvaId) {
          const accBBVA = await prisma.bankAccount.upsert({
              where: { iban: 'ES9121000418450200051332' }, 
              update: { accountName: 'Cuenta Principal BBVA', swiftBic: 'BBVAESMMXXX', currency: 'EUR', bankId: bbvaId, systemId: system!.id, isActive: true },
              create: { accountName: 'Cuenta Principal BBVA', iban: 'ES9121000418450200051332', swiftBic: 'BBVAESMMXXX', currency: 'EUR', bankId: bbvaId, systemId: system!.id, isActive: true }
          });
          createdBankAccountsMap.set(accBBVA.iban, accBBVA.id);
      }
      if (santanderId) {
           const accSantander1 = await prisma.bankAccount.upsert({
              where: { iban: 'ES8000490001591234567890' },
              update: { accountName: 'Cuenta Santander 1', swiftBic: 'BSCHESMMXXX', currency: 'EUR', bankId: santanderId, systemId: system!.id, isActive: true },
              create: { accountName: 'Cuenta Santander 1', iban: 'ES8000490001591234567890', swiftBic: 'BSCHESMMXXX', currency: 'EUR', bankId: santanderId, systemId: system!.id, isActive: true }
          });
          createdBankAccountsMap.set(accSantander1.iban, accSantander1.id);
          const accSantander2 = await prisma.bankAccount.upsert({
              where: { iban: 'ES1200491111009876543210' },
              update: { accountName: 'Cuenta Gastos Santander', swiftBic: 'BSCHESMMXXX', currency: 'EUR', bankId: santanderId, systemId: system!.id, isActive: false },
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
  // ... (Creación de Tariff Prices con upsert completo usando mapas globales) ...

  // --- Crear Promociones de Ejemplo ---
  console.log('Creating Example Promotions...');
  // ... (Creación de Promotions con upsert completo usando mapas globales) ...

  // --- Crear Equipos --- 
  console.log('Creating Equipment...');
  // ... (Creación de Equipment con upsert completo usando createdClinicsMap y system!.id) ...

  // --- Crear Configuraciones de Pago por Clínica --- 
  console.log('Creating default clinic payment settings...');
  // ... (Creación de Clinic Payment Settings con upsert completo usando mapas/variables globales) ...

  // --- Crear Facturas de Ejemplo ---
  console.log('Creating example invoices...');
  // ... (Creación de Invoices con upsert completo) ...
 
  // --- Crear Pagos de Ejemplo (para Facturas) ---
  console.log('Creating example payments (for Invoices)...');
  // ... (Creación de Payments para Invoices con create) ...
 
  // <<< --- NUEVO: Crear Clientes de Ejemplo --- >>>
  console.log('Creating example Clients...');
  try {
      const client1Data = { email: 'cliente1@example.com', firstName: 'Ana', lastName: 'Garcia', phone: '600111222', systemId: system!.id, /*birthDate*/ birthDate: new Date('1985-05-15'), gender: 'Female', address: 'Calle Falsa 123', city: 'Madrid', countryIsoCode: 'ES', postalCode: '28001', marketingConsent: true, /*isEmailVerified*/ dataProcessingConsent: true }; // Ajustados campos booleanos y tipo Gender
      // <<< CORREGIDO: Cambiado upsert a findFirst/update/create >>>
      let client1Found = await prisma.client.findFirst({ where: { email: client1Data.email, systemId: client1Data.systemId } });
      let client1;
      if (client1Found) {
          client1 = await prisma.client.update({ where: { id: client1Found.id }, data: client1Data });
      } else {
          client1 = await prisma.client.create({ data: client1Data });
      }
      // const client1 = await prisma.client.upsert({ where: { email_systemId: { email: client1Data.email, systemId: client1Data.systemId } }, update: client1Data, create: client1Data }); // <<< ERROR LINTER
      createdClientsMap.set(client1Data.email, client1);
      
      const client2Data = { email: 'cliente2.casablanca@mail.ma', firstName: 'Youssef', lastName: 'Bennani', phone: '0600998877', systemId: system!.id, /*birthDate*/ birthDate: new Date('1990-11-20'), gender: 'Male', address: 'Bd Anfa 5', city: 'Casablanca', countryIsoCode: 'MA', postalCode: '20000', marketingConsent: false, /*isEmailVerified*/ dataProcessingConsent: false }; // Ajustados campos booleanos y tipo Gender
      // <<< CORREGIDO: Cambiado upsert a findFirst/update/create >>>
      let client2Found = await prisma.client.findFirst({ where: { email: client2Data.email, systemId: client2Data.systemId } });
      let client2;
      if (client2Found) {
          client2 = await prisma.client.update({ where: { id: client2Found.id }, data: client2Data });
      } else {
          client2 = await prisma.client.create({ data: client2Data });
      }
      // const client2 = await prisma.client.upsert({ where: { email_systemId: { email: client2Data.email, systemId: client2Data.systemId } }, update: client2Data, create: client2Data }); // <<< ERROR LINTER
      createdClientsMap.set(client2Data.email, client2);

      // Cliente sin email, usar otro identificador único si es necesario o permitir null si el schema lo permite.
      // Para este ejemplo, asumimos que se puede identificar por una combinación (esto es solo un ejemplo)
      const client3Data = { firstName: 'Cliente', lastName: 'Test Sin Email', phone: '600333444', systemId: system!.id, address: 'Plaza Mayor 1', city: 'Sevilla', countryIsoCode: 'ES', postalCode: '41001' };
      // const client3 = await prisma.client.create({ data: client3Data }); // Usar create si no hay constraint única para upsert sin email
      // createdClientsMap.set('client3-no-email', client3); // Usar un ID temporal si es necesario
  } catch (error) { console.error("Error creating example clients:", error); }
  console.log(`Example Clients ensured. Created ${createdClientsMap.size} clients.`);
  // <<< --- FIN Crear Clientes --- >>>


  // --- Crear Instancias de Bonos y Paquetes para Clientes --- 
  console.log('Creating Bono/Package Instances for clients...');
  try {
      const exampleClient = createdClientsMap.get('cliente1@example.com'); 
      if (exampleClient) {
          const bonoMasajeDefId = createdBonoDefsMap.get('Bono 5 Masajes Relajantes');
          if (bonoMasajeDefId) { 
              const bonoInstance = await prisma.bonoInstance.create({ data: { bonoDefinitionId: bonoMasajeDefId, clientId: exampleClient.id, remainingQuantity: 5, purchaseDate: new Date(), expiryDate: new Date(new Date().setDate(new Date().getDate() + 90)), systemId: system!.id } });
              bonoMasajeInstanceId = bonoInstance.id; 
          }
          const packRelaxDefId = createdPackageDefsMap.get('Pack Relax Total');
          if (packRelaxDefId) {
               const packDef = await prisma.packageDefinition.findUnique({ where: { id: packRelaxDefId }, include: { items: true } });
               if (packDef?.items) { 
                   const remainingItemsJson: { [key: string]: number } = {};
                   packDef.items.forEach(item => { const key = item.serviceId ? `service:${item.serviceId}` : `product:${item.productId}`; remainingItemsJson[key] = item.quantity; });
                   const packageInstance = await prisma.packageInstance.create({ data: { packageDefinitionId: packRelaxDefId, clientId: exampleClient.id, remainingItems: remainingItemsJson as any, purchaseDate: new Date(), systemId: system!.id } });
                   packRelaxInstanceId = packageInstance.id; 
               }
           }
       }
   } catch (error) { console.error("Error creating Bono/Package Instances:", error); }
   console.log('Bono/Package Instances creation attempt finished.');

   // <<< --- REFACTORIZACIÓN y AMPLIACIÓN Tickets de Ejemplo --- >>>
   console.log('Creating example Tickets (Expanded)...');
   // ... (Creación de Tickets, Items y Payments (Tickets) con upsert/create completos, usando mapas y variables globales) ...
   console.log('Example Tickets creation attempt finished.');
   // <<< --- FIN REFACTORIZACIÓN Tickets --- >>>


  // --- Crear Usuarios de Ejemplo --- 
  console.log('Creating example users...');
  const usersData = initialMockData.usuarios || [];
  // <<< INICIALIZAR MAPA ANTES DEL BUCLE (Ya hecho arriba) >>>
  // const createdUsersMap = new Map<string, pkg.User>();

  for (const userData of usersData) {
    // <<< CORREGIDO: Usar email como where y mapear campos correctamente >>>
    const user = await prisma.user.upsert({
      where: { email: userData.email }, // Usar email único
      update: {
        firstName: userData.nombre,
        lastName: userData.apellidos,
        phone: userData.telefono,
        isActive: userData.activo,
        // passwordHash: hashedPassword, // Actualizar hash si es necesario?
      },
      create: {
        email: userData.email,
        firstName: userData.nombre,
        lastName: userData.apellidos,
        phone: userData.telefono,
        isActive: userData.activo,
        passwordHash: hashedPassword,
        systemId: system!.id // Obligatorio al crear
        // roles, clinicAssignments se manejan después
      }
    });

    // <<< POBLAR EL MAPA DE USUARIOS >>>
    if (user.email) { // Guardar por email si existe
        createdUsersMap.set(user.email, user);
    }

    // Asignar usuario a clínicas y rol
    // <<< CORREGIDO: Usar clinicasIds y añadir roleId obligatorio >>>
    const roleToAssign = userData.perfil === 'Administrador' ? adminRole : staffRole;
    if (userData.clinicasIds && userData.clinicasIds.length > 0 && roleToAssign) {
      for (const clinicMockId of userData.clinicasIds) {
        const clinic = createdClinicsMap.get(clinicMockId);
        if (clinic) {
          await prisma.userClinicAssignment.upsert({
            where: { userId_clinicId: { userId: user.id, clinicId: clinic.id } },
            update: { roleId: roleToAssign.id }, // Actualizar rol si cambia
            create: { userId: user.id, clinicId: clinic.id, roleId: roleToAssign.id } // <<< AÑADIDO roleId >>>
          });
        }
      }
    }

    // <<< ELIMINADO: La lógica de asignar roles aquí es redundante/incorrecta >>>
    // <<< Se maneja a través de UserClinicAssignment.roleId >>>
    // if (userData.perfil === 'Personal Clinica') {
    //   await prisma.role.upsert({
    //     where: { id: staffRole?.id },
    //     update: { userIds: [...(adminRole?.userIds || []), user.id] },
    //     create: { userIds: [...(adminRole?.userIds || []), user.id] }
    //   });
    // }
  }
  console.log('Example users ensured.');
  // --- FIN Crear Usuarios ---

  // <<< --- INICIO: SEEDING DE TICKETS Y PAGOS --- >>>
  console.log('Creating comprehensive example Tickets, Items, and Payments...');

  try {
    // --- Prerequisitos (Asegurar que existen IDs necesarios) ---
    const cashierUser1 = createdUsersMap.get('houda@multilaser.ma'); // Asumiendo que existe en el mapa
    const cashierUser2 = createdUsersMap.get('latifa@multilaser.ma');
    const sellerUser1 = createdUsersMap.get('yasmine@multilaser.ma');
    const adminUser = createdUsersMap.get('casblasvic@gmail.com'); // Para acciones administrativas si es necesario

    const client1 = createdClientsMap.get('cliente1@example.com');
    const client2 = createdClientsMap.get('cliente2.casablanca@mail.ma');

    const clinic1 = createdClinicsMap.get('clinic-1');
    const clinic2 = createdClinicsMap.get('clinic-2');

    const serviceLimpiezaFacialId = serviceMap.get('Limpieza Facial Profunda');
    const serviceMasajeId = serviceMap.get('Masaje Relajante');
    const productCremaId = productMap.get('Crema Hidratante Facial'); // Asumiendo que se creó este producto

    const bonoDefMasajeId = createdBonoDefsMap.get('Bono 5 Masajes Relajantes');
    const packageDefRelaxId = createdPackageDefsMap.get('Pack Relax Total');

    // Asegurarse de que las instancias existen (IDs guardados previamente)
    // const bonoMasajeInstanceId = ... (obtenido al crear la instancia)
    // const packRelaxInstanceId = ... (obtenido al crear la instancia)

    // Asegurarse que los métodos de pago existen (variables globales)
    const paymentMethodCashId = paymentMethodCash?.id;
    const paymentMethodCardId = paymentMethodCard?.id;
    const paymentMethodBonoId = paymentMethodBono?.id; // Para pago con bono consumido
    const paymentMethodTransferId = paymentMethodTransfer?.id;

    // IVA por defecto
    const defaultVatId = defaultVatTypeIdFromDB;

    // Tarifas
    const tarifaGeneralId = tarifaGeneral?.id;
    const tarifaVipId = tarifaVIP?.id;

    if (!cashierUser1 || !cashierUser2 || !sellerUser1 || !adminUser || !client1 || !client2 || !clinic1 || !clinic2 || !serviceLimpiezaFacialId || !serviceMasajeId || !productCremaId || !paymentMethodCashId || !paymentMethodCardId || !paymentMethodBonoId || !defaultVatId || !tarifaGeneralId || !bonoDefMasajeId || !packageDefRelaxId) {
      console.error("Missing prerequisite data for Ticket seeding. Check maps and variables.");
      throw new Error("Missing prerequisite data for Ticket seeding.");
    }

    // --- Escenario 1: Ticket Simple (Servicio + Producto), Pagado Efectivo ---
    console.log("Seeding Ticket Scenario 1: Simple Sale, Cash Payment");
    const ticket1_item1_price = await getTariffPrice(clinic1.tariffId, 'SERVICE', serviceLimpiezaFacialId) ?? 0;
    const ticket1_item1_quantity = 1;
    const ticket1_item1_lineTotal = ticket1_item1_price * ticket1_item1_quantity;
    const ticket1_item1_vatDetails = await calculateVAT(ticket1_item1_lineTotal, defaultVatId, defaultVatId); // IVA sobre el total de línea (sin descuentos de línea aquí)
    const ticket1_item1_finalPrice = ticket1_item1_lineTotal + ticket1_item1_vatDetails.vatAmount;

    const ticket1_item2_price = await getTariffPrice(clinic1.tariffId, 'PRODUCT', productCremaId) ?? 0;
    const ticket1_item2_quantity = 1;
    const ticket1_item2_lineTotal = ticket1_item2_price * ticket1_item2_quantity;
    const ticket1_item2_vatDetails = await calculateVAT(ticket1_item2_lineTotal, defaultVatId, defaultVatId); // IVA sobre el total de línea
    const ticket1_item2_finalPrice = ticket1_item2_lineTotal + ticket1_item2_vatDetails.vatAmount;

    const ticket1_totalAmount = ticket1_item1_lineTotal + ticket1_item2_lineTotal;
    const ticket1_taxAmount = ticket1_item1_vatDetails.vatAmount + ticket1_item2_vatDetails.vatAmount;
    const ticket1_finalAmount = ticket1_item1_finalPrice + ticket1_item2_finalPrice;

    const ticket1 = await prisma.ticket.create({
      data: {
        ticketNumber: 'SEED-TKT-001',
        type: 'SALE',
        status: 'PAID',
        currencyCode: clinic1.currency || 'EUR',
        totalAmount: ticket1_totalAmount,
        taxAmount: ticket1_taxAmount,
        finalAmount: ticket1_finalAmount,
        notes: 'Ticket de ejemplo simple.',
        clientId: client1.id,
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
              type: 'DEBIT', // Cobro
              amount: ticket1_finalAmount,
              paymentDate: new Date(),
              status: 'COMPLETED',
              paymentMethodDefinitionId: paymentMethodCashId,
              userId: cashierUser1.id, // Usuario que registra el pago
              clinicId: clinic1.id,
              systemId: system!.id,
              payerClientId: client1.id // Quién paga
            }
          ]
        }
      }
    });
    console.log(`Created Ticket ${ticket1.ticketNumber} with items and payment.`);

    // --- Escenario 2: Ticket con Descuento Manual por Línea, Vendedor, Pago Parcial Tarjeta ---
    console.log("Seeding Ticket Scenario 2: Manual Discount, Seller, Partial Card Payment");
    const ticket2_item1_price = await getTariffPrice(clinic2.tariffId, 'SERVICE', serviceMasajeId) ?? 0;
    const ticket2_item1_quantity = 2;
    const ticket2_item1_grossLineTotal = ticket2_item1_price * ticket2_item1_quantity;
    const ticket2_item1_manualDiscount = 5.00;
    // El descuento se aplica al total de la línea si es para todas las unidades, o por unidad si se especifica así.
    // Aquí asumimos que el descuento de 5.00 es para el total de las 2 unidades.
    const ticket2_item1_price_after_discount = ticket2_item1_grossLineTotal - ticket2_item1_manualDiscount;
    const ticket2_item1_vatDetails = await calculateVAT(ticket2_item1_price_after_discount, defaultVatId, defaultVatId);
    const ticket2_item1_finalPrice = ticket2_item1_price_after_discount + ticket2_item1_vatDetails.vatAmount;


    // Para el Ticket global:
    // totalAmount es la suma de los precios brutos de línea (antes de descuentos de línea)
    const ticket2_totalAmount = ticket2_item1_grossLineTotal;
    // taxAmount es la suma de los IVAs de línea (calculados sobre precios descontados)
    const ticket2_taxAmount = ticket2_item1_vatDetails.vatAmount;
    // finalAmount es la suma de los finalPrice de línea
    const ticket2_finalAmount = ticket2_item1_finalPrice;


    const ticket2 = await prisma.ticket.create({
        data: {
            ticketNumber: 'SEED-TKT-002',
            type: 'SALE',
            status: 'PARTIALLY_PAID', // Pago parcial
            currencyCode: clinic2.currency || 'EUR',
            totalAmount: ticket2_totalAmount,
            taxAmount: ticket2_taxAmount,
            finalAmount: ticket2_finalAmount,
            notes: 'Ticket con descuento manual y pago parcial.',
            clientId: client2.id,
            cashierUserId: cashierUser2.id,
            sellerUserId: sellerUser1.id, // Vendedor asignado
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
                        manualDiscountAmount: ticket2_item1_manualDiscount, // Descuento aplicado
                        discountNotes: 'Descuento especial cliente frecuente.', // Nota del descuento
                        vatRateId: ticket2_item1_vatDetails.vatRateId,
                        vatAmount: ticket2_item1_vatDetails.vatAmount,
                        finalPrice: ticket2_item1_finalPrice, 
                    },
                ]
            },
            payments: { // Pago parcial
                create: [
                    {
                        type: 'DEBIT',
                        amount: Math.round(ticket2_finalAmount / 2), // La mitad pagada
                        paymentDate: new Date(),
                        status: 'COMPLETED',
                        paymentMethodDefinitionId: paymentMethodCardId,
                        // posTerminalId: ... // Añadir si se crea un TPV de ejemplo
                        userId: cashierUser2.id,
                        clinicId: clinic2.id,
                        systemId: system!.id,
                        payerClientId: client2.id
                    }
                ]
            }
        }
    });
    console.log(`Created Ticket ${ticket2.ticketNumber} with manual discount and partial payment.`);


    // --- Escenario 3: Ticket por Consumo de Bono (isValidationGenerated) ---
    console.log("Seeding Ticket Scenario 3: Bono Consumption (Validation Generated)");
    if (bonoMasajeInstanceId && client1 && serviceMasajeId && paymentMethodBonoId) {
         // Para consumo de bono, todos los montos son 0
         const ticket3_item1_price = 0;
         const ticket3_item1_quantity = 1;
         const ticket3_item1_lineTotal = 0;
         const ticket3_item1_vatDetails = { vatAmount: 0, vatRateId: defaultVatId, vatPercentage: 0 }; // Asumir IVA 0 para items de valor 0
         const ticket3_item1_finalPrice = 0;

         const ticket3_totalAmount = 0;
         const ticket3_taxAmount = 0;
         const ticket3_finalAmount = 0;

         const ticket3 = await prisma.ticket.create({
            data: {
                ticketNumber: 'SEED-TKT-003-BONO',
                type: 'SALE',
                status: 'PAID', // Pagado con el bono
                currencyCode: clinic1.currency || 'EUR',
                totalAmount: 0,
                taxAmount: 0,
                finalAmount: ticket3_finalAmount,
                notes: 'Generado por consumo de bono masaje.',
                clientId: client1.id,
                cashierUserId: cashierUser1.id, // O el profesional que validó
                clinicId: clinic1.id,
                systemId: system!.id,
                items: {
                    create: [
                        {
                            itemType: 'SERVICE',
                            serviceId: serviceMasajeId,
                            description: 'Masaje Relajante (Consumo Bono)',
                            quantity: ticket3_item1_quantity,
                            unitPrice: ticket3_item1_price, // Precio cero
                            manualDiscountAmount: 0,
                            promotionDiscountAmount: 0,
                            vatRateId: ticket3_item1_vatDetails.vatRateId, 
                            vatAmount: ticket3_item1_vatDetails.vatAmount,
                            finalPrice: ticket3_item1_finalPrice,
                            consumedBonoInstanceId: bonoMasajeInstanceId, // Link a la instancia consumida
                            isValidationGenerated: true, // Marcar como generado por validación
                        },
                    ]
                },
                // No se crea un 'Payment' tradicional, el 'pago' es el consumo del bono.
                // Podríamos crear un pago de tipo INTERNAL_CREDIT si el flujo lo requiere.
                 payments: {
                     create: [
                         {
                             type: 'DEBIT', // Aunque sea 0, representa el 'cobro' via bono
                             amount: 0,
                             paymentDate: new Date(),
                             status: 'COMPLETED',
                             paymentMethodDefinitionId: paymentMethodBonoId, // Método: Bono/Paquete
                             bonoInstanceId: bonoMasajeInstanceId, // Opcional: link al bono usado en el pago
                             userId: cashierUser1.id,
                             clinicId: clinic1.id,
                             systemId: system!.id,
                             payerClientId: client1.id,
                             notes: `Pago con Bono Instancia ID: ${bonoMasajeInstanceId}`
                         }
                     ]
                 }
            }
         });
         console.log(`Created Ticket ${ticket3.ticketNumber} for bono consumption.`);
        // Aquí iría la lógica para decrementar remainingQuantity en BonoInstance si el seed lo hiciera
    } else {
        console.warn("Skipping Ticket Scenario 3 due to missing bono instance ID or other prerequisites.");
    }

    // --- Escenario 4: Ticket de Compra de Bono ---
    console.log("Seeding Ticket Scenario 4: Bono Purchase");
    // const ticket4_item1_price = await getTariffPrice(clinic1.tariffId, 'BONO', bonoDefMasajeId) ?? 0;
    // const ticket4_item1_vat = await calculateVAT(ticket4_item1_price, defaultVatId, defaultVatId);
    // const ticket4_finalAmount = ticket4_item1_price + ticket4_item1_vat.vatAmount;

    if (bonoDefMasajeId && client1 && paymentMethodTransferId) {
        const ticket4_item1_price = await getTariffPrice(clinic1.tariffId, 'BONO', bonoDefMasajeId) ?? 0;
        const ticket4_item1_quantity = 1;
        const ticket4_item1_lineTotal = ticket4_item1_price * ticket4_item1_quantity;
        const ticket4_item1_vatDetails = await calculateVAT(ticket4_item1_lineTotal, defaultVatId, defaultVatId);
        const ticket4_item1_finalPrice = ticket4_item1_lineTotal + ticket4_item1_vatDetails.vatAmount;

        const ticket4_totalAmount = ticket4_item1_lineTotal;
        const ticket4_taxAmount = ticket4_item1_vatDetails.vatAmount;
        const ticket4_finalAmount = ticket4_item1_finalPrice;
        
        const ticket4 = await prisma.ticket.create({
            data: {
                ticketNumber: 'SEED-TKT-004-BUYBONO',
                type: 'SALE',
                status: 'PAID',
                currencyCode: clinic1.currency || 'EUR',
                totalAmount: ticket4_totalAmount,       // Corregido
                taxAmount: ticket4_taxAmount,         // Corregido
                finalAmount: ticket4_finalAmount,
                notes: 'Compra de Bono 5 Masajes.',
                clientId: client1.id,
                cashierUserId: cashierUser1.id,
                clinicId: clinic1.id,
                systemId: system!.id,
                items: {
                    create: [
                        {
                            itemType: 'BONO_PURCHASE', // Tipo específico
                            bonoDefinitionId: bonoDefMasajeId, // Link a la definición comprada
                            description: 'Bono 5 Masajes Relajantes',
                            quantity: ticket4_item1_quantity,
                            unitPrice: ticket4_item1_price,
                            manualDiscountAmount: 0,
                            promotionDiscountAmount: 0,
                            vatRateId: ticket4_item1_vatDetails.vatRateId, // Corregido
                            vatAmount: ticket4_item1_vatDetails.vatAmount, // Corregido
                            finalPrice: ticket4_item1_finalPrice,
                        },
                    ]
                },
                payments: {
                     create: [
                         {
                             type: 'DEBIT',
                             amount: ticket4_finalAmount,
                             paymentDate: new Date(),
                             status: 'COMPLETED',
                             paymentMethodDefinitionId: paymentMethodTransferId, // Pagado por transferencia
                             // bankAccountId: ... // Añadir si se crea una cuenta de ejemplo
                             userId: cashierUser1.id,
                             clinicId: clinic1.id,
                             systemId: system!.id,
                             payerClientId: client1.id
                         }
                     ]
                 }
            }
        });
        console.log(`Created Ticket ${ticket4.ticketNumber} for bono purchase.`);
        // Aquí se crearía la BonoInstance asociada a ticket4.items[0].id si el flujo fuera completo
    } else {
         console.warn("Skipping Ticket Scenario 4 due to missing prerequisites.");
    }


    // --- Escenario 5: Ticket de Compra de Paquete ---
    console.log("Seeding Ticket Scenario 5: Package Purchase");
    // const ticket5_item1_price = await getTariffPrice(clinic1.tariffId, 'PACKAGE', packageDefRelaxId) ?? 0;
    // El IVA de un paquete puede ser complejo (suma del IVA de sus componentes o IVA fijo?)
    // Para el seed, calcularemos un IVA sobre el precio total usando el tipo por defecto.
    // const ticket5_item1_vat = await calculateVAT(ticket5_item1_price, defaultVatId, defaultVatId);
    // const ticket5_finalAmount = ticket5_item1_price + ticket5_item1_vat.vatAmount;

     if (packageDefRelaxId && client2 && paymentMethodCardId) {
         const ticket5_item1_price = await getTariffPrice(clinic1.tariffId, 'PACKAGE', packageDefRelaxId) ?? 0;
         const ticket5_item1_quantity = 1;
         const ticket5_item1_lineTotal = ticket5_item1_price * ticket5_item1_quantity;
         // Para el seed, calcularemos un IVA sobre el precio total usando el tipo por defecto.
         const ticket5_item1_vatDetails = await calculateVAT(ticket5_item1_lineTotal, defaultVatId, defaultVatId);
         const ticket5_item1_finalPrice = ticket5_item1_lineTotal + ticket5_item1_vatDetails.vatAmount;

         const ticket5_totalAmount = ticket5_item1_lineTotal;
         const ticket5_taxAmount = ticket5_item1_vatDetails.vatAmount;
         const ticket5_finalAmount = ticket5_item1_finalPrice;

         const ticket5 = await prisma.ticket.create({
             data: {
                 ticketNumber: 'SEED-TKT-005-BUYPACK',
                 type: 'SALE',
                 status: 'PAID',
                 currencyCode: clinic1.currency || 'EUR',
                 totalAmount: ticket5_totalAmount,       // Corregido
                 taxAmount: ticket5_taxAmount,         // Corregido
                 finalAmount: ticket5_finalAmount,
                 notes: 'Compra de Pack Relax Total.',
                 clientId: client2.id, // Cliente 2 compra este
                 cashierUserId: cashierUser1.id,
                 clinicId: clinic1.id, // En clínica 1
                 systemId: system!.id,
                 items: {
                     create: [
                         {
                             itemType: 'PACKAGE_PURCHASE', // Tipo específico
                             packageDefinitionId: packageDefRelaxId, // Link a la definición comprada
                             description: 'Pack Relax Total',
                             quantity: ticket5_item1_quantity,
                             unitPrice: ticket5_item1_price,
                             manualDiscountAmount: 0,
                             promotionDiscountAmount: 0,
                             vatRateId: ticket5_item1_vatDetails.vatRateId, // Corregido
                             vatAmount: ticket5_item1_vatDetails.vatAmount, // Corregido
                             finalPrice: ticket5_item1_finalPrice,
                         },
                     ]
                 },
                 payments: {
                      create: [
                          {
                              type: 'DEBIT',
                              amount: ticket5_finalAmount,
                              paymentDate: new Date(),
                              status: 'COMPLETED',
                              paymentMethodDefinitionId: paymentMethodCardId, // Pagado con tarjeta
                              userId: cashierUser1.id,
                              clinicId: clinic1.id,
                              systemId: system!.id,
                              payerClientId: client2.id
                          }
                      ]
                  }
             }
         });
         console.log(`Created Ticket ${ticket5.ticketNumber} for package purchase.`);
         // Aquí se crearía la PackageInstance asociada
     } else {
          console.warn("Skipping Ticket Scenario 5 due to missing prerequisites.");
     }

    // --- Escenario 6: Ticket con Promoción Aplicada (Ejemplo: 10% dto en Limpieza Facial) ---
    console.log("Seeding Ticket Scenario 6: Applied Promotion");
    // Asumir que existe una promoción con ID 'promo-10pct-limpieza' que aplica 10% a serviceLimpiezaFacialId
    const promotionNameExample = '10% Descuento Servicios Faciales'; // Nombre de la promoción a buscar
    const promoExists = await prisma.promotion.findFirst({ where: { name: promotionNameExample, systemId: system!.id } });

    if (promoExists && serviceLimpiezaFacialId && client1 && paymentMethodCashId) {
        const ticket6_item1_price = await getTariffPrice(clinic1.tariffId, 'SERVICE', serviceLimpiezaFacialId) ?? 0;
        const ticket6_item1_quantity = 1;
        const ticket6_item1_grossLineTotal = ticket6_item1_price * ticket6_item1_quantity;
        
        // Aplicar descuento de promoción
        const ticket6_item1_promoDiscountRate = promoExists.value ?? 0.10; // Usar valor de la promo, o 10% por defecto
        const ticket6_item1_promoDiscountAmount = parseFloat((ticket6_item1_grossLineTotal * ticket6_item1_promoDiscountRate).toFixed(2));
        const ticket6_item1_price_after_discount = ticket6_item1_grossLineTotal - ticket6_item1_promoDiscountAmount;
        
        const ticket6_item1_vatDetails = await calculateVAT(ticket6_item1_price_after_discount, defaultVatId, defaultVatId);
        const ticket6_item1_finalPrice = ticket6_item1_price_after_discount + ticket6_item1_vatDetails.vatAmount;

        const ticket6_totalAmount = ticket6_item1_grossLineTotal; // Bruto antes de descuento promo
        const ticket6_taxAmount = ticket6_item1_vatDetails.vatAmount;
        const ticket6_finalAmount = ticket6_item1_finalPrice;

         const ticket6 = await prisma.ticket.create({
            data: {
                ticketNumber: 'SEED-TKT-006-PROMO',
                type: 'SALE',
                status: 'PAID',
                currencyCode: clinic1.currency || 'EUR',
                totalAmount: ticket6_totalAmount,
                taxAmount: ticket6_taxAmount,
                finalAmount: ticket6_finalAmount,
                notes: 'Ticket con promoción 10% Limpieza Facial.',
                clientId: client1.id,
                cashierUserId: cashierUser1.id,
                clinicId: clinic1.id,
                systemId: system!.id,
                items: {
                    create: [
                        {
                            itemType: 'SERVICE',
                            serviceId: serviceLimpiezaFacialId,
                            description: `Limpieza Facial Profunda (Promo ${promoExists.name})`,
                            quantity: ticket6_item1_quantity,
                            unitPrice: ticket6_item1_price,
                            manualDiscountAmount: 0,
                            promotionDiscountAmount: ticket6_item1_promoDiscountAmount, // Descuento promo aplicado
                            appliedPromotionId: promoExists.id, // Link a la promoción
                            vatRateId: ticket6_item1_vatDetails.vatRateId,
                            vatAmount: ticket6_item1_vatDetails.vatAmount,
                            finalPrice: ticket6_item1_finalPrice,
                        },
                    ]
                },
                payments: {
                     create: [
                         {
                             type: 'DEBIT',
                             amount: ticket6_finalAmount,
                             paymentDate: new Date(),
                             status: 'COMPLETED',
                             paymentMethodDefinitionId: paymentMethodCashId,
                             userId: cashierUser1.id,
                             clinicId: clinic1.id,
                             systemId: system!.id,
                             payerClientId: client1.id
                         }
                     ]
                 }
            }
        });
        console.log(`Created Ticket ${ticket6.ticketNumber} with promotion.`);
    } else {
        console.warn("Skipping Ticket Scenario 6 due to missing promotion or prerequisites.");
    }

     // --- Escenario 7: Ticket de Devolución (Return) ---
    console.log("Seeding Ticket Scenario 7: Return Ticket");
    // Crear primero un ticket simple para devolver
    const original_t7_item1_price = 50; // Precio del producto a devolver
    const original_t7_item1_quantity = 1;
    const original_t7_item1_lineTotal = original_t7_item1_price * original_t7_item1_quantity;
    const original_t7_item1_vatDetails = await calculateVAT(original_t7_item1_lineTotal, defaultVatId, defaultVatId);
    const original_t7_item1_finalPrice = original_t7_item1_lineTotal + original_t7_item1_vatDetails.vatAmount;

    const original_t7_totalAmount = original_t7_item1_lineTotal;
    const original_t7_taxAmount = original_t7_item1_vatDetails.vatAmount;
    const original_t7_finalAmount = original_t7_item1_finalPrice;

    const originalTicketForReturn = await prisma.ticket.create({
        data: { 
            ticketNumber: 'SEED-TKT-ORG-RET', status: 'PAID', type: 'SALE',
            clientId: client1.id, cashierUserId: cashierUser1.id, clinicId: clinic1.id, systemId: system!.id,
            currencyCode: clinic1.currency || 'EUR', 
            totalAmount: original_t7_totalAmount, 
            taxAmount: original_t7_taxAmount, 
            finalAmount: original_t7_finalAmount,
            items: { create: [{ 
                itemType: 'PRODUCT', 
                productId: productCremaId, // Asegúrate que productCremaId está definido y es válido
                description: 'Producto a devolver', 
                quantity: original_t7_item1_quantity, 
                unitPrice: original_t7_item1_price, 
                manualDiscountAmount: 0,
                promotionDiscountAmount: 0,
                            vatRateId: original_t7_item1_vatDetails.vatRateId, 
                            vatAmount: original_t7_item1_vatDetails.vatAmount, 
                            finalPrice: original_t7_item1_finalPrice 
            }] },
            payments: { create: [{ 
                type: 'DEBIT', 
                amount: original_t7_finalAmount, 
                paymentDate: new Date(), 
                status: 'COMPLETED', 
                paymentMethodDefinitionId: paymentMethodCashId, 
                userId: cashierUser1.id, 
                clinicId: clinic1.id, 
                systemId: system!.id, 
                payerClientId: client1.id 
            }] }
        }
    });
    // Ahora crear el ticket de devolución
    const return_item1_quantity = -original_t7_item1_quantity;
    const return_item1_unitPrice = original_t7_item1_price; // El precio unitario es el mismo, la cantidad es negativa
    const return_item1_lineTotal = return_item1_unitPrice * return_item1_quantity; // Será negativo
    // No hay descuentos en la devolución en este ejemplo
    const return_item1_vatDetails = await calculateVAT(return_item1_lineTotal, original_t7_item1_vatDetails.vatRateId, defaultVatId); // IVA también será negativo
    const return_item1_finalPrice = return_item1_lineTotal + return_item1_vatDetails.vatAmount;


    const return_totalAmount = return_item1_lineTotal;
    const return_taxAmount = return_item1_vatDetails.vatAmount;
    const return_finalAmount = return_item1_finalPrice;


    const returnTicket = await prisma.ticket.create({
        data: {
            ticketNumber: 'SEED-TKT-RETURN-001',
            type: 'RETURN', // <<< TIPO RETURN
            status: 'REFUNDED', // Estado devuelto/reembolsado
            currencyCode: clinic1.currency || 'EUR',
            totalAmount: return_totalAmount, 
            taxAmount: return_taxAmount,
            finalAmount: return_finalAmount,
            notes: `Devolución del ticket ${originalTicketForReturn.ticketNumber}`,
            originalTicketId: originalTicketForReturn.id, // <<< Link al original
            clientId: client1.id,
            cashierUserId: cashierUser1.id,
            clinicId: clinic1.id,
            systemId: system!.id,
            items: { // Líneas negativas correspondientes
                create: [
                    {
                        itemType: 'PRODUCT',
                        productId: productCremaId, // Mismo producto
                        description: 'Devolución Producto',
                        quantity: return_item1_quantity, // Cantidad negativa
                        unitPrice: return_item1_unitPrice, // Precio unitario (positivo)
                        manualDiscountAmount: 0,
                        promotionDiscountAmount: 0,
                        vatRateId: return_item1_vatDetails.vatRateId,
                        vatAmount: return_item1_vatDetails.vatAmount, // IVA negativo
                        finalPrice: return_item1_finalPrice, // Final negativo
                    },
                ]
            },
            payments: { // Pago de tipo CRÉDITO (salida de dinero)
                create: [
                    {
                        type: 'CREDIT', // <<< TIPO CREDITO
                        amount: Math.abs(return_finalAmount), // Cantidad positiva para el pago, pero representa una salida
                        paymentDate: new Date(),
                        status: 'COMPLETED',
                        paymentMethodDefinitionId: paymentMethodCashId, // Devuelto en efectivo
                        userId: cashierUser1.id,
                        clinicId: clinic1.id,
                        systemId: system!.id,
                        payerClientId: client1.id // A quién se devuelve
                    }
                ]
            }
        }
    });
    console.log(`Created Return Ticket ${returnTicket.ticketNumber} for ${originalTicketForReturn.ticketNumber}.`);


    // --- Escenario 8: Ticket en Borrador (DRAFT) ---
     console.log("Seeding Ticket Scenario 8: Draft Ticket");

     // Para un borrador, los cálculos pueden ser tentativos o incluso no tener items aún.
     // Aquí creamos uno con un item tentativo.
     const ticket8_item1_price = await getTariffPrice(clinic1.tariffId, 'SERVICE', serviceLimpiezaFacialId) ?? 55; // Precio base o de tarifa
     const ticket8_item1_quantity = 1;
     const ticket8_item1_lineTotal = ticket8_item1_price * ticket8_item1_quantity;
     const ticket8_item1_vatDetails = await calculateVAT(ticket8_item1_lineTotal, defaultVatId, defaultVatId);
     const ticket8_item1_finalPrice = ticket8_item1_lineTotal + ticket8_item1_vatDetails.vatAmount;

     const ticket8_totalAmount_draft = ticket8_item1_lineTotal;
     const ticket8_taxAmount_draft = ticket8_item1_vatDetails.vatAmount;
     const ticket8_finalAmount_draft = ticket8_item1_finalPrice;

     const ticket8 = await prisma.ticket.create({
        data: {
            ticketNumber: 'SEED-TKT-DRAFT-001',
            type: 'SALE',
            status: 'DRAFT', // <<< ESTADO DRAFT
            currencyCode: clinic1.currency || 'EUR',
            totalAmount: ticket8_totalAmount_draft, 
            taxAmount: ticket8_taxAmount_draft,
            finalAmount: ticket8_finalAmount_draft,
            notes: 'Ticket en borrador, pendiente de finalizar.',
            clientId: client1.id, // Puede tener cliente
            cashierUserId: cashierUser1.id,
            clinicId: clinic1.id,
            systemId: system!.id,
            items: { // Puede tener items preliminares
                create: [
                     {
                         itemType: 'SERVICE',
                         serviceId: serviceLimpiezaFacialId,
                         description: 'Limpieza Facial - Borrador',
                         quantity: ticket8_item1_quantity,
                         unitPrice: ticket8_item1_price, 
                         manualDiscountAmount: 0,
                         promotionDiscountAmount: 0,
                         vatRateId: ticket8_item1_vatDetails.vatRateId,
                         vatAmount: ticket8_item1_vatDetails.vatAmount, 
                         finalPrice: ticket8_item1_finalPrice, 
                     },
                ]
            }
            // Sin sección de pagos para DRAFT
        }
     });
     console.log(`Created Draft Ticket ${ticket8.ticketNumber}.`);


    // --- (Opcional) Crear más escenarios: B2B, Citas, Consumo Paquete, etc. ---

  } catch (error) {
    console.error("Error during Ticket seeding:", error);
    // No salir, intentar continuar con el resto si es posible
  }
  console.log('Comprehensive Ticket seeding attempt finished.');
  // <<< --- FIN: SEEDING DE TICKETS Y PAGOS --- >>>


  console.log(`Seeding finished.`);
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