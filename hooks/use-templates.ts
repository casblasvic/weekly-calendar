"use client"

import { useState, useEffect } from "react"
import type { WeekSchedule } from "@/types/schedule"

export interface ScheduleTemplate {
  id: string
  description: string
  schedule: WeekSchedule
}

const STORAGE_KEY = "schedule-templates"

// Datos iniciales para las plantillas
const initialTemplates: ScheduleTemplate[] = [
  {
    id: "1",
    description: "Plantilla Estándar",
    schedule: {
      monday: { isOpen: true, ranges: [{ start: "09:00", end: "18:00" }] },
      tuesday: { isOpen: true, ranges: [{ start: "09:00", end: "18:00" }] },
      wednesday: { isOpen: true, ranges: [{ start: "09:00", end: "18:00" }] },
      thursday: { isOpen: true, ranges: [{ start: "09:00", end: "18:00" }] },
      friday: { isOpen: true, ranges: [{ start: "09:00", end: "18:00" }] },
      saturday: { isOpen: false, ranges: [] },
      sunday: { isOpen: false, ranges: [] },
    },
  },
]

export const useTemplates = () => {
  const [templates, setTemplates] = useState<ScheduleTemplate[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(STORAGE_KEY)
      return saved ? JSON.parse(saved) : initialTemplates
    }
    return initialTemplates
  })

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(templates))
    }
  }, [templates])

  const addTemplate = (newTemplate: ScheduleTemplate) => {
    setTemplates((prev) => [...prev, newTemplate])
  }

  const updateTemplate = (updatedTemplate: ScheduleTemplate) => {
    setTemplates((prev) => prev.map((t) => (t.id === updatedTemplate.id ? updatedTemplate : t)))
  }

  const deleteTemplate = (id: string) => {
    setTemplates((prev) => prev.filter((t) => t.id !== id))
  }

  return { templates, addTemplate, updateTemplate, deleteTemplate }
}

