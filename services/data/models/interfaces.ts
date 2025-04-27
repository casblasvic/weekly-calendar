/**
 * Interfaces para los modelos de datos de la aplicación
 * Estas interfaces definen la estructura de todas las entidades que se manejan en la aplicación
 */

// Eliminar estas líneas que causan conflicto
// import { toast } from "@/components/ui/use-toast";
// import type { Clinica } from "@/services/data/models/interfaces"
// import type { Cabin } from '@prisma/client'
// --- Fin Eliminación ---

import type { Tariff as PrismaTariff } from '@prisma/client'; // Importar Tariff
import type {
    System as PrismaSystem,
    User as PrismaUser,
    Clinic as PrismaClinic,
    ScheduleTemplate as PrismaScheduleTemplate,
    ScheduleTemplateBlock as PrismaScheduleTemplateBlock,
    ClinicScheduleBlock as PrismaClinicScheduleBlock,
    VATType as PrismaVATType,
    Category as PrismaCategory,
    Cabin as PrismaCabin,
    UserClinicScheduleException as PrismaUserClinicScheduleException
} from '@prisma/client';

// Interfaces básicas

/** Interfaz base para entidades con ID */
export interface BaseEntity {
  id: string | number;
}

/** Interfaz para entidades con estado activo/inactivo */
export interface Activable {
  isActive: boolean;
}

/** Interfaz para entidades con estado habilitado/deshabilitado */
export interface Deshabilitada {
  deshabilitada: boolean;
}

/** Interfaz para imágenes asociadas a entidades */
export interface EntityImage extends BaseEntity {
  url: string;
  isPrimary: boolean;
  path?: string;
}

/** Interfaz para documentos asociados a entidades */
export interface EntityDocument extends BaseEntity {
  fileName: string;
  fileSize: number;
  mimeType: string;
  url: string;
  path?: string;
  entityType: string;
  entityId: string;
  category?: string;
  createdAt: string;
  updatedAt?: string;
}

// Interfaces de entidades principales

/** 
 * Interfaz para Clínica 
 * @deprecated Muchas propiedades aquí pueden estar obsoletas o diferir del schema de Prisma. 
 *             Usar tipos derivados de Prisma/API como fuente de verdad.
 */
export interface Clinica extends BaseEntity, Activable {
  prefix?: string | null;
  name: string;
  city?: string | null;
  // direccion?: string; // Probablemente obsoleto, usar 'address'
  // telefono?: string; // Probablemente obsoleto, usar 'phone'/'phone2'
  email?: string | null;
  // openTime?: string | null; // Obsoleto: Usar bloques de horario
  // closeTime?: string | null; // Obsoleto: Usar bloques de horario
  isActive: boolean;
  address?: string | null;
  postalCode?: string | null;
  province?: string | null;
  countryCode?: string | null;
  timezone?: string | null;
  currency?: string | null;
  phone?: string | null;
  systemId: string;
  linkedScheduleTemplateId?: string | null;
  // scheduleJson?: any | null; // Obsoleto: Usar bloques de horario
  linkedScheduleTemplate?: (PrismaScheduleTemplate & { blocks?: PrismaScheduleTemplateBlock[] }) | null;
  independentScheduleBlocks?: PrismaClinicScheduleBlock[] | null;
  commercialName?: string | null;
  businessName?: string | null;
  cif?: string | null;
  country?: string | null;
  phone2?: string | null;
  initialCash?: number | null;
  ticketSize?: string | null;
  ip?: string | null;
  blockSignArea?: boolean | null;
  blockPersonalData?: boolean | null;
  delayedPayments?: boolean | null;
  affectsStats?: boolean | null;
  appearsInApp?: boolean | null;
  scheduleControl?: boolean | null;
  professionalSkills?: boolean | null;
  notes?: string | null;
  // slotDuration?: number | null; // Obsoleto: Definido en plantilla o configuración independiente
  tariffId?: string | null;
  tariff?: PrismaTariff | null;
}

/** Interfaz para Cabina en una clínica */
export interface Cabin extends BaseEntity {
  clinicId: string;
  code: string;
  name: string;
  color: string;
  isActive: boolean;
  order: number;
}

/** Interfaz para Tarifa */
export interface Tarifa extends BaseEntity, Activable {
  name: string;
  description: string | null;
  isDefault: boolean;
  validFrom: Date | string | null;
  validUntil: Date | string | null;
  isActive: boolean;
  systemId: string;
  defaultVatTypeId: string | null;
}

/** Interfaz para Familia de Tarifa */
export interface FamiliaTarifa extends BaseEntity, Activable {
  name?: string;
  nombre?: string;
  code?: string;
  codigo?: string;
  parentId: string | null;
  tarifaId: string;
  descripcion?: string;
}

/** Interfaz para Consumo de Servicio */
export interface Consumo extends BaseEntity {
  cantidad: number;
  tipoConsumo: string;
  servicioId: string;
  productoId: string;
}

/** Interfaz para Tipo de IVA */
export interface TipoIVA extends BaseEntity {
  name: string;
  rate: number;
  isDefault: boolean;
  systemId: string;
}

/** Interfaz para Servicio */
export interface Servicio extends BaseEntity, Activable {
  name: string;
  code?: string | null;
  categoryId?: string | null;
  durationMinutes: number;
  colorCode?: string | null;
  price?: number | null;
  vatTypeId?: string | null;
  description?: string | null;
  requiresMedicalSignOff: boolean;
  pointsAwarded: number;
  systemId: string;
}

/** Interfaz para Equipo */
export interface Equipo extends BaseEntity, Activable {
  clinicId?: string | null;
  name: string;
  description?: string | null;
  serialNumber?: string | null;
  modelNumber?: string | null;
  purchaseDate?: Date | string | null;
  warrantyEndDate?: Date | string | null;
  location?: string | null;
  notes?: string | null;
  systemId: string;
  deviceId?: string | null;
}

/** Interfaz para Bloque de Agenda */
export interface ScheduleBlock extends BaseEntity {
  clinicId: string;
  date: string;
  startTime: string;
  endTime: string;
  roomIds: string[];
  description: string;
  recurring: boolean;
  recurrencePattern?: {
    frequency: "daily" | "weekly" | "monthly";
    endDate?: string;
    daysOfWeek?: number[];
  };
  createdAt: string;
}

/** Interfaz para Productos */
export interface Producto extends BaseEntity, Activable {
  name: string;
  sku?: string | null;
  description?: string | null;
  categoryId?: string | null;
  currentStock: number;
  minStockThreshold?: number | null;
  costPrice?: number | null;
  price?: number | null;
  vatTypeId?: string | null;
  barcode?: string | null;
  isForSale: boolean;
  isInternalUse: boolean;
  systemId: string;
}

/** Interfaz para Plantillas de Horario */
export interface ScheduleTemplate extends BaseEntity {
  name: string;
  description?: string | null;
  systemId: string;
  schedule?: any | null;
  clinicId?: string | null;
  isDefault?: boolean | null;
  createdAt?: string | Date | null;
  updatedAt?: string | Date | null;
  openTime?: string | null;
  closeTime?: string | null;
  blocks?: PrismaScheduleTemplateBlock[] | null;
  slotDuration?: number | null;
}

/** Interfaz para Bonos */
export interface BonoDefinition extends BaseEntity, Activable {
  name: string;
  serviceId: string;
  numberOfSessions: number;
  price: number;
  validityDays?: number | null;
  systemId: string;
}

/** Interfaz para Usuario */
export interface Usuario extends BaseEntity, Activable {
  firstName: string;
  lastName: string;
  email: string;
  passwordHash?: string;
  profileImageUrl?: string;
  isActive: boolean;
  systemId: string;
  customScheduleExceptions?: PrismaUserClinicScheduleException[];
}

/** Interfaz para Perfil de usuario */
export interface PerfilUsuario extends BaseEntity {
  name: string;
  description?: string | null;
  systemId: string;
}

/** Interfaz para Permiso */
export interface Permiso extends BaseEntity {
  module: string;
  action: string;
  description?: string | null;
}

/**
 * Interfaces básicas para horarios de clínica y usuario
 */

/** Interfaz para una franja horaria */
export interface FranjaHoraria {
  id: string;
  inicio: string;
  fin: string;
}

/** Interfaz para un día en el horario semanal */
export interface HorarioDia {
  dia: 'lunes' | 'martes' | 'miercoles' | 'jueves' | 'viernes' | 'sabado' | 'domingo';
  franjas: FranjaHoraria[];
  activo: boolean;
}

/** Interfaz para horario semanal de una clínica */
export interface HorarioSemanal {
  clinicaId: string;
  dias: HorarioDia[];
}

/** Interfaz para excepciones de horario */
export interface ExcepcionHoraria {
  id: string;
  clinicaId: string;
  nombre: string;
  fechaInicio: string;
  fechaFin: string;
  dias: HorarioDia[];
}

/** Interfaz para configuración completa de horario de clínica */
export interface HorarioClinica {
  clinicaId: string;
  horarioGeneral: {
    apertura: string;
    cierre: string;
  };
  excepciones: {
    dia: string;
    apertura: string;
    cierre: string;
  }[];
}

/**
 * Interfaces para servicios y familias
 */

/** Interfaz para Familia de servicios */
export interface FamiliaServicio extends BaseEntity, Activable {
  name: string;
  description?: string | null;
  systemId: string;
}

/** 
 * Interfaz para usuario empleado extendida 
 * Completa la interfaz Usuario con los campos adicionales necesarios
 */
/*
export interface UsuarioEmpleado extends Usuario {
  dni?: string;
  fechaNacimiento?: string;
  sexo?: string;
  telefono2?: string;
  contrasena?: string;
  idioma?: string;
  colegio?: string;
  numeroColegiado?: string;
  especialidad?: string;
  universidad?: string;
  direccion?: string;
  provincia?: string;
  pais?: string;
  localidad?: string;
  cp?: string;
  exportCsv?: string;
  indiceControl?: string;
  numeroPIN?: string;
  notas?: string;
  mostrarDesplazados?: boolean;
  mostrarCitasPropias?: boolean;
  restringirIP?: boolean;
  perfilesClinica?: Map<string, string[]>;
  habilidadesProfesionales?: Map<string, string[]>;
  horarios?: Map<string, HorarioDia[]>;
  excepciones?: ExcepcionHoraria[];
}
*/

/**
 * Interfaz para perfiles de empleados
 */
export interface PerfilEmpleado extends BaseEntity {
  name: string;
  description?: string | null;
  systemId: string;
}

export type { 
    PrismaSystem, 
    PrismaUser, 
    PrismaClinic, 
    PrismaScheduleTemplate, 
    PrismaScheduleTemplateBlock, 
    PrismaClinicScheduleBlock, 
    PrismaTariff,
    PrismaVATType,
    PrismaCategory,
    PrismaCabin,
    PrismaUserClinicScheduleException
}; 