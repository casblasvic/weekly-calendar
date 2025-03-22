"use client"

import { createContext, useContext, useState, type ReactNode } from "react"

// Definición de tipos
interface ClinicConfig {
  openTime?: string
  closeTime?: string
  weekendOpenTime?: string
  weekendCloseTime?: string
  saturdayOpen?: boolean
  sundayOpen?: boolean
  slotDuration?: number
  cabins?: any[]
  schedule?: any
}

interface Clinic {
  id: number
  prefix: string
  name: string
  city: string
  isActive: boolean // Añadimos el campo isActive
  config: ClinicConfig
}

interface ClinicContextType {
  activeClinic: Clinic
  setActiveClinic: (clinic: Clinic) => void
  clinics: Clinic[]
  setClinics: (clinics: Clinic[]) => void
  updateClinicConfig: (clinicId: number, newConfig: Partial<ClinicConfig>) => void
}

// Valores por defecto
const DEFAULT_SCHEDULE = {}

const defaultClinics: Clinic[] = [
  {
    id: 1,
    prefix: "000001",
    name: "Californie Multilaser - Organicare",
    city: "Casablanca",
    isActive: true, // Clínica activa
    config: {
      openTime: "10:00",
      closeTime: "19:30",
      weekendOpenTime: "10:00",
      weekendCloseTime: "15:00",
      saturdayOpen: true,
      sundayOpen: false,
      cabins: [
        { id: 1, code: "Con", name: "Consultation", color: "#ff0000", isActive: true, order: 1 },
        { id: 2, code: "Con", name: "Consultation2", color: "#00ff00", isActive: true, order: 2 },
        { id: 3, code: "Lun", name: "Lunula", color: "#0000ff", isActive: true, order: 3 },
        { id: 4, code: "For", name: "Forte/Bal", color: "#ff0000", isActive: true, order: 4 },
        { id: 5, code: "Ski", name: "SkinShape", color: "#ff0000", isActive: false, order: 5 },
        { id: 6, code: "WB", name: "Won/Bal", color: "#ff0000", isActive: true, order: 6 },
        { id: 7, code: "Ver", name: "Verju/Bal", color: "#ff0000", isActive: true, order: 7 },
        { id: 8, code: "WB", name: "Won/Bal", color: "#ff0000", isActive: false, order: 8 },
        { id: 9, code: "Eme", name: "Emerald", color: "#ff0000", isActive: true, order: 9 },
      ],
      schedule: DEFAULT_SCHEDULE,
      slotDuration: 15,
    },
  },
  {
    id: 2,
    prefix: "Cafc",
    name: "Cafc Multilaser",
    city: "Casablanca",
    isActive: true, // Clínica activa
    config: {
      openTime: "09:00",
      closeTime: "18:00",
      weekendOpenTime: "09:00",
      weekendCloseTime: "14:00",
      saturdayOpen: true,
      sundayOpen: false,
      cabins: [
        { id: 1, code: "Con", name: "Consultation", color: "#0000ff", isActive: true, order: 1 },
        { id: 2, code: "Tre", name: "Treatment", color: "#00ff00", isActive: true, order: 2 },
      ],
      schedule: DEFAULT_SCHEDULE,
      slotDuration: 15,
    },
  },
  {
    id: 3,
    prefix: "TEST",
    name: "CENTRO TEST",
    city: "Casablanca",
    isActive: false, // Clínica inactiva
    config: {
      openTime: "08:00",
      closeTime: "20:00",
      weekendOpenTime: "10:00",
      weekendCloseTime: "16:00",
      saturdayOpen: true,
      sundayOpen: false,
      cabins: [{ id: 1, code: "Tes", name: "Test Cabin", color: "#00ff00", isActive: true, order: 1 }],
      schedule: DEFAULT_SCHEDULE,
      slotDuration: 15,
    },
  },
]

// Crear el contexto
const ClinicContext = createContext<ClinicContextType | undefined>(undefined)

// Proveedor del contexto
export function ClinicProvider({ children }: { children: ReactNode }) {
  // Inicializar con los valores por defecto
  const [activeClinic, setActiveClinic] = useState<Clinic>(defaultClinics[0])
  const [clinics, setClinics] = useState<Clinic[]>(defaultClinics)

  const updateClinicConfig = (clinicId: number, newConfig: Partial<ClinicConfig>) => {
    setClinics((prevClinics) =>
      prevClinics.map((clinic) =>
        clinic.id === clinicId
          ? {
              ...clinic,
              config: { ...clinic.config, ...newConfig },
            }
          : clinic,
      ),
    )

    if (activeClinic.id === clinicId) {
      setActiveClinic({
        ...activeClinic,
        config: { ...activeClinic.config, ...newConfig },
      })
    }
  }

  const value = {
    clinics,
    activeClinic,
    setActiveClinic,
    setClinics,
    updateClinicConfig,
  }

  return <ClinicContext.Provider value={value}>{children}</ClinicContext.Provider>
}

// Hook para usar el contexto
export function useClinic() {
  const context = useContext(ClinicContext)
  if (!context) {
    throw new Error("useClinic must be used within a ClinicProvider")
  }
  return context
}

export { ClinicContext }

