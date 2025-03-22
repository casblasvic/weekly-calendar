"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import { type WeekSchedule, DEFAULT_SCHEDULE } from "@/types/schedule"
import { setCookie, syncDataWithCookies, COOKIE_KEYS, type CookieOptions, parseJSONSafe } from "@/utils/cookie-utils"
import { isBrowser, runOnlyInBrowser } from "@/utils/client-utils"
import { compressData, estimateSize } from "@/utils/compression-utils"

// Eventos personalizados para notificar cambios
export const CLINIC_CONFIG_UPDATED_EVENT = "clinic-config-updated"
export const ACTIVE_CLINIC_CHANGED_EVENT = "active-clinic-changed"

interface Cabin {
  id: number
  code: string
  name: string
  color: string
  isActive: boolean
  order: number
}

interface ClinicConfig {
  openTime: string
  closeTime: string
  weekendOpenTime: string
  weekendCloseTime: string
  cabins: Cabin[]
  saturdayOpen: boolean
  sundayOpen: boolean
  schedule: WeekSchedule
  slotDuration: number
}

interface Clinic {
  id: number
  prefix: string
  name: string
  city: string
  config: ClinicConfig
}

interface ClinicContextType {
  activeClinic: Clinic
  setActiveClinic: (clinic: Clinic, options?: SetActiveClinicOptions) => void
  clinics: Clinic[]
  setClinics: (clinics: Clinic[]) => void
  updateClinicConfig: (clinicId: number, newConfig: Partial<ClinicConfig>) => void
  updateClinic: (updatedClinic: Clinic) => boolean
  // Nuevas propiedades para depuración
  debug?: {
    initialized: boolean
    hydrated?: boolean
    lastUpdate: Date | null
    dataSource: "cookie" | "localStorage" | "default" | null
    errors: string[]
  }
  _hydrated: boolean
}

// Opciones para la función setActiveClinic
interface SetActiveClinicOptions {
  // Si es true, no emite eventos (útil para actualizaciones silenciosas)
  silent?: boolean
  // Si es true, fuerza la actualización incluso si la clínica no existe en la lista
  force?: boolean
  // Si es true, comprime los datos antes de guardarlos (para clínicas con muchos datos)
  compress?: boolean
}

// Valores por defecto
const defaultClinics: Clinic[] = [
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

// Opciones para cookies de clínicas
const CLINIC_COOKIE_OPTIONS: CookieOptions = {
  expires: 30, // 30 días
  path: "/",
  secure: isBrowser ? window.location.protocol === "https:" : false,
  sameSite: "lax",
}

const ClinicContext = createContext<ClinicContextType | undefined>(undefined)

// Claves para las cookies
const ACTIVE_CLINIC_KEY = COOKIE_KEYS.ACTIVE_CLINIC
const CLINICS_KEY = COOKIE_KEYS.CLINICS

export function ClinicProvider({ children }: { children: ReactNode }) {
  // Inicializar con valores por defecto
  const [activeClinic, setActiveClinicState] = useState<Clinic>(defaultClinics[0])
  const [clinics, setClinicsState] = useState<Clinic[]>(defaultClinics)
  const [initialized, setInitialized] = useState(false)
  const [hydrated, setHydrated] = useState(false)

  // Estado para depuración
  const [debug, setDebug] = useState({
    initialized: false,
    lastUpdate: null as Date | null,
    dataSource: null as "cookie" | "localStorage" | "default" | null,
    errors: [] as string[],
  })

  // Función para registrar errores
  const logError = (message: string) => {
    console.error(message)
    setDebug((prev) => ({
      ...prev,
      errors: [...prev.errors, message],
      lastUpdate: new Date(),
    }))
  }

  // Cargar datos de cookies/localStorage al iniciar
  useEffect(() => {
    // En el servidor, usamos los valores por defecto
    if (typeof window === "undefined") return

    if (!initialized) {
      try {
        // Marcar que estamos en proceso de hidratación
        const savedClinics = syncDataWithCookies<Clinic[]>(CLINICS_KEY, defaultClinics, CLINIC_COOKIE_OPTIONS)
        setClinicsState(savedClinics)

        // Actualizar información de depuración
        setDebug((prev) => ({
          ...prev,
          dataSource: savedClinics !== defaultClinics ? "cookie" : "default",
          lastUpdate: new Date(),
        }))

        // Sincronizar clínica activa
        const savedActiveClinic = syncDataWithCookies<Clinic>(
          ACTIVE_CLINIC_KEY,
          defaultClinics[0],
          CLINIC_COOKIE_OPTIONS,
        )
        setActiveClinicState(savedActiveClinic)

        // Verificar que la clínica activa existe en la lista de clínicas
        const clinicExists = savedClinics.some((clinic) => clinic.id === savedActiveClinic.id)
        if (!clinicExists) {
          // Si la clínica activa no existe en la lista, usar la primera clínica
          setActiveClinicState(savedClinics[0])
          setCookie(ACTIVE_CLINIC_KEY, savedClinics[0], CLINIC_COOKIE_OPTIONS)
          logError(`La clínica activa (ID: ${savedActiveClinic.id}) no existe en la lista. Usando la primera clínica.`)
        }

        setInitialized(true)
        setHydrated(true)
        setDebug((prev) => ({
          ...prev,
          initialized: true,
          lastUpdate: new Date(),
        }))
      } catch (error) {
        logError(`Error al inicializar el contexto de clínica: ${(error as Error).message}`)
        // En caso de error, usar valores por defecto
        setClinicsState(defaultClinics)
        setActiveClinicState(defaultClinics[0])
        setInitialized(true)
        setHydrated(true)
      }
    }
  }, [initialized])

  // Efecto específico para manejar la hidratación
  useEffect(() => {
    // Este efecto solo se ejecuta en el cliente
    if (typeof window !== "undefined") {
      setHydrated(true)
    }
  }, [])

  // Función para actualizar la clínica activa
  const handleSetActiveClinic = (clinic: Clinic, options: SetActiveClinicOptions = {}) => {
    try {
      const { silent = false, force = false, compress = false } = options

      // Verificar que la clínica existe en la lista (a menos que force sea true)
      if (!force && !clinics.some((c) => c.id === clinic.id)) {
        const errorMessage = `La clínica con ID ${clinic.id} no existe en la lista de clínicas.`
        logError(errorMessage)
        return
      }

      // Actualizar estado
      setActiveClinicState(clinic)
      setDebug((prev) => ({
        ...prev,
        lastUpdate: new Date(),
      }))

      // Comprimir datos si es necesario
      let dataToStore = clinic
      let compressed = false

      if (compress || estimateSize(clinic) > 2048) {
        try {
          dataToStore = compressData(clinic) as any
          compressed = true
        } catch (e) {
          console.warn(`No se pudo comprimir la clínica activa: ${(e as Error).message}`)
        }
      }

      // Guardar en cookie con opciones personalizadas
      const cookieOptions = {
        ...CLINIC_COOKIE_OPTIONS,
        // Añadir metadatos para indicar si los datos están comprimidos
        ...(compressed ? { path: `${CLINIC_COOKIE_OPTIONS.path}?compressed=true` } : {}),
      }

      const success = setCookie(ACTIVE_CLINIC_KEY, dataToStore, cookieOptions)

      // Guardar en localStorage como fallback (siempre sin comprimir para compatibilidad)
      if (isBrowser) {
        try {
          localStorage.setItem(ACTIVE_CLINIC_KEY, JSON.stringify(clinic))
        } catch (e) {
          console.warn(`No se pudo guardar la clínica activa en localStorage: ${(e as Error).message}`)
        }
      }

      if (!success) {
        logError("No se pudo guardar la clínica activa en cookies")
      }

      // Emitir evento personalizado si no es silencioso
      if (!silent) {
        runOnlyInBrowser(() => {
          const event = new CustomEvent(ACTIVE_CLINIC_CHANGED_EVENT, {
            detail: { clinic },
          })
          window.dispatchEvent(event)

          // También emitir un evento genérico para compatibilidad con código existente
          const genericEvent = new CustomEvent("clinic-changed", {
            detail: { clinic },
          })
          window.dispatchEvent(genericEvent)
        })
      }

      return true
    } catch (error) {
      const errorMessage = `Error al actualizar la clínica activa: ${(error as Error).message}`
      logError(errorMessage)
      return false
    }
  }

  // Actualizar la función handleSetClinics para mejorar su robustez y funcionalidad

  // Reemplazar la función handleSetClinics actual con esta versión mejorada:
  const handleSetClinics = (newClinics: Clinic[]) => {
    try {
      // Validar que newClinics es un array
      if (!Array.isArray(newClinics)) {
        throw new Error("La lista de clínicas debe ser un array")
      }

      // Validar que cada clínica tiene un ID único
      const clinicIds = new Set<number>()
      for (const clinic of newClinics) {
        if (clinicIds.has(clinic.id)) {
          throw new Error(`ID de clínica duplicado: ${clinic.id}`)
        }
        clinicIds.add(clinic.id)
      }

      // Actualizar el estado
      setClinicsState(newClinics)
      setDebug((prev) => ({
        ...prev,
        lastUpdate: new Date(),
      }))

      // Comprimir datos si son grandes
      const dataSize = estimateSize(newClinics)
      let dataToStore = newClinics
      let compressed = false

      // Si los datos son grandes (más de 2KB), comprimirlos
      if (dataSize > 2048) {
        try {
          dataToStore = compressData(newClinics) as any
          compressed = true
          console.log(`Datos de clínicas comprimidos. Tamaño original: ~${dataSize} bytes`)
        } catch (e) {
          console.warn(`No se pudieron comprimir los datos de clínicas: ${(e as Error).message}`)
        }
      }

      // Guardar en cookie con opciones personalizadas
      const cookieOptions = {
        ...CLINIC_COOKIE_OPTIONS,
        // Añadir metadatos para indicar si los datos están comprimidos
        ...(compressed ? { path: `${CLINIC_COOKIE_OPTIONS.path}?compressed=true` } : {}),
      }

      const success = setCookie(CLINICS_KEY, dataToStore, cookieOptions)

      // Guardar en localStorage como fallback (siempre sin comprimir para compatibilidad)
      if (isBrowser) {
        try {
          localStorage.setItem(CLINICS_KEY, JSON.stringify(newClinics))

          // Verificar si la clínica activa sigue existiendo en la nueva lista
          const activeClinicExists = newClinics.some((clinic) => clinic.id === activeClinic.id)
          if (!activeClinicExists && newClinics.length > 0) {
            // Si la clínica activa ya no existe, establecer la primera clínica como activa
            const newActiveClinic = newClinics[0]
            handleSetActiveClinic(newActiveClinic, { silent: true })
            logError(
              `La clínica activa (ID: ${activeClinic.id}) ya no existe en la lista actualizada. Usando la primera clínica.`,
            )
          }
        } catch (e) {
          console.warn(`No se pudo guardar la lista de clínicas en localStorage: ${(e as Error).message}`)
        }
      }

      if (!success) {
        logError("No se pudo guardar la lista de clínicas en cookies")
      }

      // Emitir evento personalizado para notificar a los componentes
      runOnlyInBrowser(() => {
        const event = new CustomEvent("clinics-updated", {
          detail: { clinics: newClinics },
        })
        window.dispatchEvent(event)
      })

      return true
    } catch (error) {
      const errorMessage = `Error al actualizar la lista de clínicas: ${(error as Error).message}`
      logError(errorMessage)
      return false
    }
  }

  // Función para actualizar la configuración de una clínica
  const updateClinicConfig = (
    clinicId: number,
    newConfig: Partial<ClinicConfig>,
    options: { silent?: boolean } = {},
  ) => {
    try {
      // Validar que el ID de clínica existe
      const clinicExists = clinics.some((clinic) => clinic.id === clinicId)
      if (!clinicExists) {
        const errorMessage = `No se puede actualizar la configuración: La clínica con ID ${clinicId} no existe.`
        logError(errorMessage)
        return false
      }

      // Validar la configuración nueva
      if (newConfig.slotDuration && (newConfig.slotDuration < 5 || newConfig.slotDuration > 60)) {
        logError(`Duración de slot inválida: ${newConfig.slotDuration}. Debe estar entre 5 y 60 minutos.`)
        return false
      }

      // Validar horarios si se proporcionan
      const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/
      if (newConfig.openTime && !timeRegex.test(newConfig.openTime)) {
        logError(`Formato de hora de apertura inválido: ${newConfig.openTime}. Use formato HH:MM.`)
        return false
      }
      if (newConfig.closeTime && !timeRegex.test(newConfig.closeTime)) {
        logError(`Formato de hora de cierre inválido: ${newConfig.closeTime}. Use formato HH:MM.`)
        return false
      }
      if (newConfig.weekendOpenTime && !timeRegex.test(newConfig.weekendOpenTime)) {
        logError(
          `Formato de hora de apertura de fin de semana inválido: ${newConfig.weekendOpenTime}. Use formato HH:MM.`,
        )
        return false
      }
      if (newConfig.weekendCloseTime && !timeRegex.test(newConfig.weekendCloseTime)) {
        logError(
          `Formato de hora de cierre de fin de semana inválido: ${newConfig.weekendCloseTime}. Use formato HH:MM.`,
        )
        return false
      }

      // Actualizar el estado de las clínicas
      setClinicsState((prevClinics) => {
        // Crear una copia profunda para evitar mutaciones inesperadas
        const updatedClinics = prevClinics.map((clinic) =>
          clinic.id === clinicId
            ? {
                ...clinic,
                config: { ...clinic.config, ...newConfig },
              }
            : clinic,
        )

        // Determinar si necesitamos comprimir los datos
        const dataSize = estimateSize(updatedClinics)
        let dataToStore = updatedClinics
        let compressed = false

        // Si los datos son grandes (más de 2KB), comprimirlos
        if (dataSize > 2048) {
          try {
            dataToStore = compressData(updatedClinics) as any
            compressed = true
            console.log(`Datos de clínicas comprimidos. Tamaño original: ~${dataSize} bytes`)
          } catch (e) {
            console.warn(`No se pudieron comprimir los datos de clínicas: ${(e as Error).message}`)
          }
        }

        // Guardar en cookie con opciones personalizadas
        const cookieOptions = {
          ...CLINIC_COOKIE_OPTIONS,
          // Añadir metadatos para indicar si los datos están comprimidos
          ...(compressed ? { path: `${CLINIC_COOKIE_OPTIONS.path}?compressed=true` } : {}),
        }

        const success = setCookie(CLINICS_KEY, dataToStore, cookieOptions)

        // Guardar en localStorage como fallback (siempre sin comprimir para compatibilidad)
        if (isBrowser) {
          try {
            localStorage.setItem(CLINICS_KEY, JSON.stringify(updatedClinics))
          } catch (e) {
            console.warn(`No se pudo guardar la lista de clínicas en localStorage: ${(e as Error).message}`)
          }
        }

        if (!success) {
          logError("No se pudo guardar la configuración de clínica en cookies")
        }

        return updatedClinics
      })

      // Si estamos actualizando la clínica activa, actualizar también su estado
      if (activeClinic.id === clinicId) {
        setActiveClinicState((prev) => {
          const updated = {
            ...prev,
            config: { ...prev.config, ...newConfig },
          }

          // Determinar si necesitamos comprimir los datos
          const dataSize = estimateSize(updated)
          let dataToStore = updated
          let compressed = false

          // Si los datos son grandes (más de 2KB), comprimirlos
          if (dataSize > 2048) {
            try {
              dataToStore = compressData(updated) as any
              compressed = true
            } catch (e) {
              console.warn(`No se pudo comprimir la clínica activa: ${(e as Error).message}`)
            }
          }

          // Guardar en cookie con opciones personalizadas
          const cookieOptions = {
            ...CLINIC_COOKIE_OPTIONS,
            // Añadir metadatos para indicar si los datos están comprimidos
            ...(compressed ? { path: `${CLINIC_COOKIE_OPTIONS.path}?compressed=true` } : {}),
          }

          const success = setCookie(ACTIVE_CLINIC_KEY, dataToStore, cookieOptions)

          // Guardar en localStorage como fallback (siempre sin comprimir para compatibilidad)
          if (isBrowser) {
            try {
              localStorage.setItem(ACTIVE_CLINIC_KEY, JSON.stringify(updated))
            } catch (e) {
              console.warn(`No se pudo guardar la clínica activa en localStorage: ${(e as Error).message}`)
            }
          }

          if (!success) {
            logError("No se pudo guardar la clínica activa en cookies")
          }

          return updated
        })
      }

      // Actualizar información de depuración
      setDebug((prev) => ({
        ...prev,
        lastUpdate: new Date(),
      }))

      // Disparar evento personalizado para notificar a los componentes (a menos que silent sea true)
      if (!options.silent) {
        runOnlyInBrowser(() => {
          // Evento específico para actualización de configuración
          const configEvent = new CustomEvent(CLINIC_CONFIG_UPDATED_EVENT, {
            detail: { clinicId, newConfig },
          })
          window.dispatchEvent(configEvent)

          // Evento genérico para cualquier cambio en clínicas (para compatibilidad)
          const genericEvent = new CustomEvent("clinic-data-changed", {
            detail: { type: "config", clinicId, data: newConfig },
          })
          window.dispatchEvent(genericEvent)
        })
      }

      return true
    } catch (error) {
      const errorMessage = `Error al actualizar la configuración de clínica: ${(error as Error).message}`
      logError(errorMessage)
      return false
    }
  }

  // Función para actualizar una clínica completa
  const updateClinic = (updatedClinic: Clinic) => {
    try {
      // Buscar la clínica en el array
      const clinicIndex = clinics.findIndex((c) => c.id === updatedClinic.id)

      if (clinicIndex !== -1) {
        // Actualizar la clínica en el array
        const updatedClinics = [...clinics]
        updatedClinics[clinicIndex] = updatedClinic

        // Actualizar estado
        setClinicsState(updatedClinics)
        setDebug((prev) => ({
          ...prev,
          lastUpdate: new Date(),
        }))

        // Guardar en cookie
        const success = setCookie(CLINICS_KEY, updatedClinics, CLINIC_COOKIE_OPTIONS)

        // Guardar en localStorage como fallback
        if (isBrowser) {
          try {
            localStorage.setItem(CLINICS_KEY, JSON.stringify(updatedClinics))
          } catch (e) {
            console.warn(`No se pudo guardar la lista de clínicas en localStorage: ${(e as Error).message}`)
          }
        }

        if (!success) {
          logError("No se pudo guardar la lista de clínicas en cookies")
        }

        // Si estamos actualizando la clínica activa, actualizar también
        if (activeClinic.id === updatedClinic.id) {
          setActiveClinicState(updatedClinic)

          // Guardar en cookie
          const success = setCookie(ACTIVE_CLINIC_KEY, updatedClinic, CLINIC_COOKIE_OPTIONS)

          // Guardar en localStorage como fallback
          if (isBrowser) {
            try {
              localStorage.setItem(ACTIVE_CLINIC_KEY, JSON.stringify(updatedClinic))
            } catch (e) {
              console.warn(`No se pudo guardar la clínica activa en localStorage: ${(e as Error).message}`)
            }
          }

          if (!success) {
            logError("No se pudo guardar la clínica activa en cookies")
          }
        }

        return true
      }
      return false
    } catch (error) {
      logError(`Error al actualizar la clínica: ${(error as Error).message}`)
      return false
    }
  }

  // Valor del contexto
  const value = {
    clinics,
    activeClinic,
    setActiveClinic: handleSetActiveClinic,
    setClinics: handleSetClinics,
    updateClinic,
    updateClinicConfig,
    // Añadir el estado de hidratación para uso interno
    _hydrated: hydrated,
    debug:
      process.env.NODE_ENV === "development"
        ? {
            initialized,
            hydrated,
            lastUpdate: debug.lastUpdate,
            dataSource: debug.dataSource,
            errors: debug.errors,
          }
        : undefined,
  }

  return <ClinicContext.Provider value={value}>{children}</ClinicContext.Provider>
}

export function useClinic() {
  const context = useContext(ClinicContext)
  if (context === undefined) {
    throw new Error("useClinic debe usarse dentro de un ClinicProvider")
  }
  return context
}

