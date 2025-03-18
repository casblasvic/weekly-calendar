"use client"

import { useState, useEffect } from "react"

interface ClinicHours {
  openTime: string // formato "HH:MM"
  closeTime: string // formato "HH:MM"
}

export interface Clinic {
  id: string
  name: string
  hours: ClinicHours
  // Otros campos de la clínica
}

export function useClinicData(clinicId?: string) {
  const [loading, setLoading] = useState(true)
  const [clinic, setClinic] = useState<Clinic | null>(null)
  const [clinics, setClinics] = useState<Clinic[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)

        // Simulación de carga de datos
        // En producción, esto sería una llamada a la API
        await new Promise((resolve) => setTimeout(resolve, 500))

        // Datos de ejemplo (reemplazar con llamada a API real)
        const mockClinics: Clinic[] = [
          {
            id: "1",
            name: "Clínica Central",
            hours: {
              openTime: "09:00",
              closeTime: "18:00",
            },
          },
          {
            id: "2",
            name: "Clínica Norte",
            hours: {
              openTime: "08:30",
              closeTime: "17:30",
            },
          },
        ]

        setClinics(mockClinics)

        if (clinicId) {
          const foundClinic = mockClinics.find((c) => c.id === clinicId)
          if (foundClinic) {
            setClinic(foundClinic)
          } else {
            setError("Clínica no encontrada")
          }
        }
      } catch (err) {
        setError("Error al cargar los datos de la clínica")
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [clinicId])

  // Función para verificar si los horarios están configurados correctamente
  const hasValidHours = (clinic: Clinic | null): boolean => {
    if (!clinic) return false

    const { openTime, closeTime } = clinic.hours

    // Verificar que los horarios existen y tienen el formato correcto
    if (!openTime || !closeTime) return false

    const openTimePattern = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/
    const closeTimePattern = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/

    if (!openTimePattern.test(openTime) || !closeTimePattern.test(closeTime)) {
      return false
    }

    // Verificar que el horario de cierre es posterior al de apertura
    const [openHour, openMinute] = openTime.split(":").map(Number)
    const [closeHour, closeMinute] = closeTime.split(":").map(Number)

    const openMinutes = openHour * 60 + openMinute
    const closeMinutes = closeHour * 60 + closeMinute

    return closeMinutes > openMinutes
  }

  // Convertir horarios de string a objetos para el indicador de tiempo actual
  const getClinicHoursForTimeIndicator = () => {
    if (!clinic) return null

    const { openTime, closeTime } = clinic.hours

    if (!openTime || !closeTime) return null

    const [openHour, openMinute] = openTime.split(":").map(Number)
    const [closeHour, closeMinute] = closeTime.split(":").map(Number)

    return {
      start: { hour: openHour, minute: openMinute },
      end: { hour: closeHour, minute: closeMinute },
    }
  }

  return {
    loading,
    clinic,
    clinics,
    error,
    hasValidHours: clinic ? hasValidHours(clinic) : false,
    clinicHoursForTimeIndicator: getClinicHoursForTimeIndicator(),
    hasClinics: clinics.length > 0,
  }
}

