"use client"

import { useScheduleTemplates, ScheduleTemplate as ContextScheduleTemplate } from "@/contexts/schedule-templates-context"
// Eliminamos la interfaz local y WeekSchedule si no se usa directamente aquí
// import type { WeekSchedule } from "@/types/schedule"

// // Eliminamos la interfaz local
// export interface ScheduleTemplate {
//   id: string
//   description: string
//   schedule: WeekSchedule
// }

/**
 * Hook para acceder a las plantillas horarias (ya NO actúa como wrapper)
 * Devuelve directamente los datos y funciones del contexto.
 */
export const useTemplates = () => {
  const context = useScheduleTemplates()
  
  // // Eliminamos la adaptación
  // const templates = context.templates.map(template => ({
  //   id: template.id,
  //   description: template.description,
  //   schedule: template.schedule
  // }))
  
  // Devolver directamente lo del contexto
  return {
    templates: context.templates, // Devuelve el array completo del contexto
    loading: context.loading,     // Exponer el estado de carga
    getTemplateById: context.getTemplateById,
    // Ajustar addTemplate para aceptar el tipo completo del contexto (Omitiendo campos auto-generados)
    addTemplate: (templateData: Omit<ContextScheduleTemplate, 'id' | 'createdAt' | 'updatedAt'>) => 
      context.createTemplate(templateData), // Pasar directamente
    // Ajustar updateTemplate para aceptar Partial del tipo completo del contexto
    updateTemplate: (id: string, templateData: Partial<ContextScheduleTemplate>) => 
      context.updateTemplate(id, templateData), // Pasar directamente
    deleteTemplate: context.deleteTemplate,
    refreshTemplates: context.refreshTemplates, // Exponer refresh si es necesario
    // Añadir otras funciones del contexto si son útiles aquí
    setDefaultTemplate: context.setDefaultTemplate,
    getTemplatesByClinic: context.getTemplatesByClinic,
    exportTemplates: context.exportTemplates,
    importTemplates: context.importTemplates,
  }
}

