/**
 * Interfaz base para una cita
 */
export interface Appointment {
  id: string
  name: string
  service: string
  date: Date
  roomId: string
  clinicId: string // 🆕 ID de la clínica donde se realiza la cita
  startTime: string
  endTime?: string // Hora de fin real de la cita
  duration: number
  estimatedDurationMinutes?: number // Duración estimada original basada en servicios
  color: string
  completed?: boolean
  phone?: string
  tags?: string[]
  comment?: string
  personId?: string
  status?: string
  notes?: string
  services?: any[] // Array de servicios asociados a la cita
}

/**
 * Interfaz para una nueva cita que se va a crear
 */
export interface NewAppointment {
  person: { 
    id: string
    name: string
    phone: string 
  }
  services: { 
    id: string
    name: string
    category: string
    duration?: number 
  }[]
  time: string
  date: Date
  comment?: string
  blocks?: number
  roomId: string
  tags?: string[]
}

/**
 * Interfaz para los datos necesarios al guardar una cita
 */
export interface AppointmentSaveData {
  person: { 
    name: string
    phone: string 
  }
  services: { 
    id: string
    name: string
    category: string 
  }[]
  time: string
  comment?: string
  blocks: number
  tags?: string[]
}

/**
 * Interfaz para filtrar citas
 */
export interface AppointmentFilter {
  startDate?: Date
  endDate?: Date
  personId?: string
  roomId?: string
  serviceId?: string
  employeeId?: string
}

/**
 * Interfaz para el servicio que gestiona las citas
 */
export interface AppointmentService {
  getAppointments: (filter?: AppointmentFilter) => Promise<Appointment[]>
  getAppointmentById: (id: string) => Promise<Appointment | null>
  createAppointment: (appointment: NewAppointment) => Promise<Appointment>
  updateAppointment: (id: string, appointment: Partial<Appointment>) => Promise<Appointment>
  deleteAppointment: (id: string) => Promise<boolean>
}

// 🆕 TIPOS PARA SISTEMA DE CRONÓMETRO Y PAUSAS
export interface PauseInterval {
  pausedAt: string;           // ISO timestamp
  resumedAt?: string;         // ISO timestamp (undefined si está pausado actualmente)
  reason?: string;            // Motivo opcional de la pausa
  durationMinutes?: number;   // Calculado automáticamente
}

export type PauseIntervals = PauseInterval[];

export enum AppointmentUsageStatus {
  ACTIVE = 'ACTIVE',         // Cronómetro corriendo
  PAUSED = 'PAUSED',         // Pausado actualmente
  COMPLETED = 'COMPLETED'    // Finalizado
}

export interface EquipmentAvailability {
  id: string;
  name: string;
  location?: string;
  status: 'available' | 'occupied' | 'offline';
  currentUsage?: {
    appointmentId: string;
    clientName: string;
    estimatedEndTime: Date;
  };
  hasSmartPlug: boolean;
  smartPlugOnline?: boolean;
  deviceId?: string;
}

export interface AppointmentTimerData {
  id: string;
  appointmentId: string;
  startedAt: Date;
  endedAt?: Date;
  estimatedMinutes: number;
  actualMinutes?: number;
  currentStatus: AppointmentUsageStatus;
  pausedAt?: Date;
  pauseIntervals?: PauseIntervals;
  equipmentId?: string;
  deviceId?: string;
}

export interface EquipmentStartOptions {
  equipmentId: string;
  deviceId?: string;
  smartPlugRequired: boolean;
}