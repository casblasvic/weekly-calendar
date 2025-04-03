/**
 * Interfaces para los modelos de datos de la aplicación
 * Estas interfaces definen la estructura de todas las entidades que se manejan en la aplicación
 */

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

/** Interfaz para Clínica */
export interface Clinica extends BaseEntity, Activable {
  prefix: string;
  name: string;
  city: string;
  direccion?: string;
  telefono?: string;
  email?: string;
  openTime?: string;
  closeTime?: string;
  config?: ClinicConfig;
}

/** Interfaz para configuración de clínica */
export interface ClinicConfig {
  openTime: string;
  closeTime: string;
  weekendOpenTime: string;
  weekendCloseTime: string;
  saturdayOpen: boolean;
  sundayOpen: boolean;
  slotDuration: number;
  cabins: Cabin[];
  schedule?: any;
  initialCash?: number;
  ticketSize?: string;
  rate?: string;
  ip?: string;
  blockSignArea?: string;
  blockPersonalData?: string;
  delayedPayments?: boolean;
  affectsStats?: boolean;
  appearsInApp?: boolean;
  scheduleControl?: boolean;
  professionalSkills?: boolean;
  notes?: string;
  country?: string;
  province?: string;
  postalCode?: string;
  address?: string;
  phone2?: string;
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
export interface Tarifa extends BaseEntity, Activable, Deshabilitada {
  nombre: string;
  clinicaId: string;
  clinicasIds: string[];
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
  descripcion: string;
  porcentaje: number;
  tarifaId: string;
}

/** Interfaz para Servicio */
export interface Servicio extends BaseEntity {
  nombre: string;
  codigo: string;
  tarifaId: string;
  tarifaBase: string;
  familiaId: string;
  precioConIVA: string;
  ivaId: string;
  colorAgenda: string;
  duracion: number;
  equipoId: string;
  tipoComision: string;
  comision: string;
  requiereParametros: boolean;
  visitaValoracion: boolean;
  apareceEnApp: boolean;
  descuentosAutomaticos: boolean;
  descuentosManuales: boolean;
  aceptaPromociones: boolean;
  aceptaEdicionPVP: boolean;
  afectaEstadisticas: boolean;
  deshabilitado: boolean;
  precioCoste: string;
  tarifaPlanaId: string;
  archivoAyuda: string | null;
  consumos: Consumo[];
}

/** Interfaz para Equipo */
export interface Equipo extends BaseEntity, Activable {
  id: string;
  clinicId: string;
  clinicIds?: string[];
  code: string;
  name: string;
  description?: string;
  serialNumber?: string;
  purchaseDate?: string;
  warrantyDate?: string;
  supplier?: string;
  status: 'active' | 'maintenance' | 'inactive' | 'retired';
  config?: Record<string, any>;
  // params?: EquipoParam[];
  // files?: FileData[];
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
export interface Producto extends BaseEntity {
  nombre: string;
  codigo: string;
  descripcion: string;
  familia: string;
  stock: number;
  stockMinimo: number;
  precioCompra: number;
  precioVenta: number;
  iva: string;
  tarifaId: string;
  activo: boolean;
  fechaCreacion: string;
}

/** Interfaz para Plantillas de Horario */
export interface ScheduleTemplate extends BaseEntity {
  description: string;
  schedule: any; // WeekSchedule
  clinicId: string | null;
  isDefault: boolean;
  createdAt: string;
  updatedAt?: string;
}

/** Interfaz para Bonos */
export interface Bono extends BaseEntity, Activable {
  nombre: string;
  familiaId: string;
  servicioId: string;
  tipoComision: string;
  comision: string | number;
  credito: number;
  precioConIVA: string | number;
  ivaId: string;
  caducidad: {
    tipo: 'intervalo' | 'fechaFija';
    intervalo?: {
      tipo: 'dias' | 'semanas' | 'meses';
      valor: number;
    };
    fechaFija?: string;
  };
  archivoAyuda?: string | null;
  apareceEnApp: boolean;
  soloParaPagoDeCitas: boolean;
  descuentosAutomaticos: boolean;
  descuentosManuales: boolean;
  aceptaPromociones: boolean;
  aceptaEdicionPVP: boolean;
  formaConPaquetesAutomaticamente: boolean;
  afectaEstadisticas: boolean;
  deshabilitado: boolean;
  validoParaTodosPlanaTarifa: boolean;
  precioCoste?: string | number;
} 