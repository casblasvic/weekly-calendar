export interface Clinica {
  id: string
  nombre: string
  direccion?: string
  telefono?: string
  email?: string
  openTime?: string
  closeTime?: string
  deshabilitada?: boolean
}

export interface Tarifa {
  id: string
  nombre: string
  clinicaId: string
  deshabilitada: boolean
}

export interface Servicio {
  id: string
  nombre: string
  familia: string
  precio: number
  iva: string
}

export interface ScheduleBlock {
  id: string
  clinicId: number
  date: string
  startTime: string
  endTime: string
  roomIds: string[]
  description: string
  recurring: boolean
  recurrencePattern?: {
    frequency: "daily" | "weekly" | "monthly"
    endDate?: string
    daysOfWeek?: number[]
  }
  createdAt: string
}

export interface Cabin {
  id: number
  clinicId: number
  code: string
  name: string
  color: string
  isActive: boolean
  order: number
}

export interface ClinicConfig {
  openTime: string
  closeTime: string
  weekendOpenTime: string
  weekendCloseTime: string
  saturdayOpen: boolean
  sundayOpen: boolean
  slotDuration: number
  cabins: Cabin[]
  schedule: any
  initialCash?: number
  ticketSize?: string
  rate?: string
  ip?: string
  blockSignArea?: string
  blockPersonalData?: string
  delayedPayments?: boolean
  affectsStats?: boolean
  appearsInApp?: boolean
  scheduleControl?: boolean
  professionalSkills?: boolean
  notes?: string
  country?: string
  province?: string
  postalCode?: string
  address?: string
  phone2?: string
}

export interface Clinic {
  id: number
  prefix: string
  name: string
  city: string
  config: ClinicConfig
}

// Objeto global para almacenar datos mock
export const MockData: {
  clinicas?: Clinic[]
  tarifas?: Tarifa[]
  servicios?: Servicio[]
  scheduleBlocks?: ScheduleBlock[]
  equipment?: any[]
  [key: string]: any
} = {
  clinicas: [
    {
      id: 1,
      prefix: "000001",
      name: "Californie Multilaser - Organicare",
      city: "Casablanca",
      config: {
        openTime: "10:00",
        closeTime: "19:30",
        weekendOpenTime: "10:00",
        weekendCloseTime: "15:00",
        saturdayOpen: true,
        sundayOpen: false,
        cabins: [
          { id: 1, clinicId: 1, code: "Con", name: "Consultation", color: "#ff0000", isActive: true, order: 1 },
          { id: 2, clinicId: 1, code: "Con", name: "Consultation2", color: "#00ff00", isActive: true, order: 2 },
          { id: 3, clinicId: 1, code: "Lun", name: "Lunula", color: "#0000ff", isActive: true, order: 3 },
          { id: 4, clinicId: 1, code: "For", name: "Forte/Bal", color: "#ff0000", isActive: true, order: 4 },
          { id: 5, clinicId: 1, code: "Ski", name: "SkinShape", color: "#ff0000", isActive: false, order: 5 },
          { id: 6, clinicId: 1, code: "WB", name: "Won/Bal", color: "#ff0000", isActive: true, order: 6 },
          { id: 7, clinicId: 1, code: "Ver", name: "Verju/Bal", color: "#ff0000", isActive: true, order: 7 },
          { id: 8, clinicId: 1, code: "WB", name: "Won/Bal", color: "#ff0000", isActive: false, order: 8 },
          { id: 9, clinicId: 1, code: "Eme", name: "Emerald", color: "#ff0000", isActive: true, order: 9 },
        ],
        schedule: {},
        slotDuration: 15,
      },
    },
    {
      id: 2,
      prefix: "Cafc",
      name: "Cafc Multilaser",
      city: "Casablanca",
      config: {
        openTime: "09:00",
        closeTime: "18:00",
        weekendOpenTime: "09:00",
        weekendCloseTime: "14:00",
        saturdayOpen: true,
        sundayOpen: false,
        cabins: [
          { id: 1, clinicId: 2, code: "Con", name: "Consultation", color: "#0000ff", isActive: true, order: 1 },
          { id: 2, clinicId: 2, code: "Tre", name: "Treatment", color: "#00ff00", isActive: true, order: 2 },
        ],
        schedule: {},
        slotDuration: 15,
      },
    },
    {
      id: 3,
      prefix: "TEST",
      name: "CENTRO TEST",
      city: "Casablanca",
      config: {
        openTime: "08:00",
        closeTime: "20:00",
        weekendOpenTime: "10:00",
        weekendCloseTime: "16:00",
        saturdayOpen: true,
        sundayOpen: false,
        cabins: [{ id: 1, clinicId: 3, code: "Tes", name: "Test Cabin", color: "#00ff00", isActive: true, order: 1 }],
        schedule: {},
        slotDuration: 15,
      },
    },
  ],
  tarifas: [],
  servicios: [],
  scheduleBlocks: [],
  equipment: [],
}

export const updateClinic = (updatedClinic: Clinic): boolean => {
  const index = MockData.clinicas?.findIndex((clinic) => clinic.id === updatedClinic.id)
  if (index === -1) return false

  MockData.clinicas = [
    ...(MockData.clinicas || []).slice(0, index),
    updatedClinic,
    ...(MockData.clinicas || []).slice(index + 1),
  ]
  window.dispatchEvent(new CustomEvent("storage-updated"))
  return true
}

export const deleteEquipment = (id: number): boolean => {
  MockData.equipment = (MockData.equipment || []).filter((item) => item.id !== id)
  window.dispatchEvent(new CustomEvent("storage-updated"))
  return true
}

let nextEquipmentId = 100 // Start from a high number to avoid conflicts

export const addEquipment = (equipmentData: any): number => {
  const newId = nextEquipmentId++
  const newEquipment = { ...equipmentData, id: newId }
  MockData.equipment = [...(MockData.equipment || []), newEquipment]
  window.dispatchEvent(new CustomEvent("storage-updated"))
  return newId
}

export const updateEquipment = (equipmentData: any): boolean => {
  const index = (MockData.equipment || []).findIndex((item) => item.id === equipmentData.id)
  if (index === -1) return false

  MockData.equipment = [
    ...(MockData.equipment || []).slice(0, index),
    equipmentData,
    ...(MockData.equipment || []).slice(index + 1),
  ]
  window.dispatchEvent(new CustomEvent("storage-updated"))
  return true
}

export const getEquipment = (clinicId: number): any[] => {
  return (MockData.equipment || []).filter((item) => item.clinicId === clinicId)
}

export const getScheduleBlocks = (clinicId: number): ScheduleBlock[] => {
  return (MockData.scheduleBlocks || []).filter((block) => block.clinicId === clinicId)
}

export const createScheduleBlock = (blockData: Omit<ScheduleBlock, "id" | "createdAt">): string => {
  const newId = Date.now().toString()
  const newBlock: ScheduleBlock = {
    id: newId,
    clinicId: blockData.clinicId,
    date: blockData.date,
    startTime: blockData.startTime,
    endTime: blockData.endTime,
    roomIds: blockData.roomIds,
    description: blockData.description,
    recurring: blockData.recurring,
    recurrencePattern: blockData.recurrencePattern,
    createdAt: new Date().toISOString(),
  }
  MockData.scheduleBlocks = [...(MockData.scheduleBlocks || []), newBlock]
  window.dispatchEvent(new CustomEvent("storage-updated"))
  return newId
}

export const updateScheduleBlock = (id: string, blockData: Omit<ScheduleBlock, "id" | "createdAt">): boolean => {
  const index = (MockData.scheduleBlocks || []).findIndex((block) => block.id === id)
  if (index === -1) return false

  MockData.scheduleBlocks = [
    ...(MockData.scheduleBlocks || []).slice(0, index),
    { id, ...blockData, createdAt: new Date().toISOString() },
    ...(MockData.scheduleBlocks || []).slice(index + 1),
  ]
  window.dispatchEvent(new CustomEvent("storage-updated"))
  return true
}

export const deleteScheduleBlock = (id: string): boolean => {
  MockData.scheduleBlocks = (MockData.scheduleBlocks || []).filter((block) => block.id !== id)
  window.dispatchEvent(new CustomEvent("storage-updated"))
  return true
}

export const updateCabin = (clinicId: number, updatedCabin: Cabin): boolean => {
  const clinicIndex = MockData.clinicas?.findIndex((clinic) => clinic.id === clinicId)
  if (clinicIndex === -1) return false

  const clinic = MockData.clinicas[clinicIndex]
  const cabinIndex = clinic.config.cabins.findIndex((cabin) => cabin.id === updatedCabin.id)
  if (cabinIndex === -1) return false

  clinic.config.cabins[cabinIndex] = updatedCabin
  MockData.clinicas[clinicIndex] = clinic

  window.dispatchEvent(new CustomEvent("storage-updated"))
  return true
}

export const deleteCabin = (clinicId: number, cabinId: number): boolean => {
  const clinicIndex = MockData.clinicas?.findIndex((clinic) => clinic.id === clinicId)
  if (clinicIndex === -1) return false

  const clinic = MockData.clinicas[clinicIndex]
  clinic.config.cabins = clinic.config.cabins.filter((cabin) => cabin.id !== cabinId)
  MockData.clinicas[clinicIndex] = clinic

  window.dispatchEvent(new CustomEvent("storage-updated"))
  return true
}

export const getClinic = (clinicId: number): Clinic | undefined => {
  return MockData.clinicas?.find((clinic) => clinic.id === clinicId)
}

export const getClinics = (): Clinic[] => {
  return MockData.clinicas || []
}

export const mockClinics = MockData.clinicas || []

export const DATA_CHANGE_EVENT = "data-change"

