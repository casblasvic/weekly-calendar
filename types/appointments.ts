/**
 * Interfaz base para una cita
 */
export interface Appointment {
  id: string
  name: string
  service: string
  date: Date
  roomId: string
  startTime: string
  duration: number
  color: string
  completed?: boolean
  phone?: string
  tags?: string[]
  comment?: string
  personId?: string
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