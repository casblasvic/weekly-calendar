"use client"

import { useScheduleTemplates } from "@/contexts/schedule-templates-context"
import type { WeekSchedule } from "@/types/schedule"

export interface ScheduleTemplate {
  id: string
  description: string
  schedule: WeekSchedule
}

/**
 * Hook para acceder a las plantillas horarias
 * Actúa como un wrapper sobre el contexto para mantener compatibilidad
 */
export const useTemplates = () => {
  const context = useScheduleTemplates()
  
  // Adaptamos el contexto para que tenga la misma interfaz que antes
  const templates = context.templates.map(template => ({
    id: template.id,
    description: template.description,
    schedule: template.schedule
  }))
  
  return {
    templates,
    addTemplate: (template: ScheduleTemplate) => 
      context.createTemplate({
        ...template,
        isDefault: false
      }),
    updateTemplate: (template: ScheduleTemplate) => 
      context.updateTemplate(template.id, {
        description: template.description,
        schedule: template.schedule
      }),
    deleteTemplate: context.deleteTemplate
  }
}

