"use client"

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react"
import { useInterfaz } from "./interfaz-Context"
import { WeekSchedule, DEFAULT_SCHEDULE } from "@/types/schedule"
import { ScheduleTemplate as ScheduleTemplateModel } from "@/services/data/models/interfaces"

// Tipo para la plantilla horaria utilizando el modelo central
export type ScheduleTemplate = ScheduleTemplateModel;

// Interfaz del contexto
interface ScheduleTemplatesContextType {
  templates: ScheduleTemplate[];
  loading: boolean;
  getTemplateById: (id: string) => Promise<ScheduleTemplate | null>;
  createTemplate: (template: Omit<ScheduleTemplate, 'id' | 'createdAt' | 'updatedAt'>) => Promise<ScheduleTemplate>;
  updateTemplate: (id: string, template: Partial<ScheduleTemplate>) => Promise<ScheduleTemplate | null>;
  deleteTemplate: (id: string) => Promise<boolean>;
  setDefaultTemplate: (id: string) => Promise<boolean>;
  getTemplatesByClinic: (clinicId: string | null) => Promise<ScheduleTemplate[]>;
  refreshTemplates: () => Promise<void>;
  exportTemplates: () => string;
  importTemplates: (data: string) => Promise<boolean>;
}

// Valor por defecto para plantillas
const defaultTemplates: ScheduleTemplate[] = [
  {
    id: "template-default",
    description: "Plantilla Estándar",
    schedule: DEFAULT_SCHEDULE,
    clinicId: null,
    isDefault: true,
    createdAt: new Date().toISOString()
  }
];

// Crear el contexto
const ScheduleTemplatesContext = createContext<ScheduleTemplatesContextType | undefined>(undefined)

// Provider del contexto
export function ScheduleTemplatesProvider({ children }: { children: ReactNode }) {
  const [templates, setTemplates] = useState<ScheduleTemplate[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const interfaz = useInterfaz();
  const [dataFetched, setDataFetched] = useState(false);

  // Cargar plantillas al iniciar
  useEffect(() => {
    if (interfaz.initialized && !dataFetched) {
      loadTemplates();
    }
  }, [interfaz.initialized, dataFetched]);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      
      // Usar la interfaz centralizada
      try {
        // Llamar al método específico cuando esté implementado
        // const templatesList = await interfaz.getScheduleTemplates();
        
        // Mientras tanto, como fallback temporal, cargar de localStorage
        const storedTemplates = localStorage.getItem('schedule-templates');
        if (storedTemplates) {
          const parsedTemplates = JSON.parse(storedTemplates);
          setTemplates(parsedTemplates);
        } else {
          setTemplates(defaultTemplates);
        }
      } catch (error) {
        console.error("Error al cargar plantillas:", error);
        
        // Si falla, usar plantillas predeterminadas
        setTemplates(defaultTemplates);
      }
      
      setDataFetched(true);
    } catch (error) {
      console.error("Error al cargar plantillas horarias:", error);
      setTemplates(defaultTemplates);
    } finally {
      setLoading(false);
    }
  }

  // Guardar plantillas (usando la interfaz)
  const saveTemplates = async (updatedTemplates: ScheduleTemplate[]) => {
    // Actualizar estado
    setTemplates(updatedTemplates);
    
    // Guardar mediante la interfaz centralizada (cuando esté disponible)
    // En el futuro: await interfaz.saveScheduleTemplates(updatedTemplates);
    
    // Mientras tanto, mantener el guardado en localStorage
    try {
      localStorage.setItem('schedule-templates', JSON.stringify(updatedTemplates));
    } catch (error) {
      console.error("Error al guardar plantillas en localStorage:", error);
    }
  }

  // Métodos del contexto
  const getTemplateById = async (id: string): Promise<ScheduleTemplate | null> => {
    try {
      // En el futuro: return await interfaz.getTemplateById(id);
      
      // Mientras tanto, buscar en el estado local
      const template = templates.find(t => t.id === id);
      return template || null;
    } catch (error) {
      console.error(`Error al obtener plantilla ${id}:`, error);
      return null;
    }
  }

  const createTemplate = async (template: Omit<ScheduleTemplate, 'id' | 'createdAt' | 'updatedAt'>): Promise<ScheduleTemplate> => {
    try {
      // En el futuro: return await interfaz.saveTemplate(template);
      
      // Mientras tanto, crear localmente
      const now = new Date().toISOString();
      const newTemplate: ScheduleTemplate = {
        ...template,
        id: `template-${Date.now()}`,
        createdAt: now
      };
      
      // Actualizar estado local
      const updatedTemplates = [...templates, newTemplate];
      await saveTemplates(updatedTemplates);
      return newTemplate;
    } catch (error) {
      console.error("Error al crear plantilla:", error);
      throw error;
    }
  }

  const updateTemplate = async (id: string, template: Partial<ScheduleTemplate>): Promise<ScheduleTemplate | null> => {
    try {
      // En el futuro: return await interfaz.updateTemplate(id, template);
      
      // Buscar plantilla
      const index = templates.findIndex(t => t.id === id);
      if (index === -1) return null;
      
      // Actualizar con nuevos datos
      const now = new Date().toISOString();
      const updatedTemplate: ScheduleTemplate = {
        ...templates[index],
        ...template,
        updatedAt: now
      };
      
      // Actualización local
      const updatedTemplates = [...templates];
      updatedTemplates[index] = updatedTemplate;
      await saveTemplates(updatedTemplates);
      return updatedTemplate;
    } catch (error) {
      console.error(`Error al actualizar plantilla ${id}:`, error);
      return null;
    }
  }

  const deleteTemplate = async (id: string): Promise<boolean> => {
    try {
      // En el futuro: return await interfaz.deleteTemplate(id);
      
      // Verificar si existe la plantilla
      if (!templates.some(t => t.id === id)) return false;
      
      // Eliminar localmente
      const filteredTemplates = templates.filter(t => t.id !== id);
      await saveTemplates(filteredTemplates);
      return true;
    } catch (error) {
      console.error(`Error al eliminar plantilla ${id}:`, error);
      return false;
    }
  }

  const setDefaultTemplate = async (id: string): Promise<boolean> => {
    try {
      // En el futuro: return await interfaz.setDefaultTemplate(id);
      
      // Verificar si existe la plantilla
      const targetIndex = templates.findIndex(t => t.id === id);
      if (targetIndex === -1) return false;
      
      // Actualizar estado
      const updatedTemplates = templates.map(template => ({
        ...template,
        isDefault: template.id === id
      }));
      
      // Guardar cambios
      await saveTemplates(updatedTemplates);
      return true;
    } catch (error) {
      console.error(`Error al establecer plantilla predeterminada ${id}:`, error);
      return false;
    }
  }

  const getTemplatesByClinic = async (clinicId: string | null): Promise<ScheduleTemplate[]> => {
    try {
      // En el futuro: return await interfaz.getTemplatesByClinic(clinicId);
      
      // Filtrar por clínica
      return templates.filter(t => {
        // Plantillas sin clínica (globales) o específicas para esta clínica
        return (clinicId === null && t.clinicId === null) || t.clinicId === clinicId;
      });
    } catch (error) {
      console.error(`Error al obtener plantillas para clínica ${clinicId}:`, error);
      return [];
    }
  }

  const refreshTemplates = async (): Promise<void> => {
    setDataFetched(false); // Esto forzará la recarga en el useEffect
  }

  const exportTemplates = (): string => {
    return JSON.stringify(templates);
  }

  const importTemplates = async (data: string): Promise<boolean> => {
    try {
      // En el futuro: return await interfaz.importTemplates(data);
      
      // Validar el formato JSON
      let importedTemplates: ScheduleTemplate[];
      try {
        importedTemplates = JSON.parse(data);
        if (!Array.isArray(importedTemplates)) {
          throw new Error("El formato de los datos importados no es válido");
        }
      } catch (error) {
        console.error("Error al parsear datos importados:", error);
        return false;
      }
      
      // Validar estructura básica de cada plantilla
      const validTemplates = importedTemplates.filter(template => {
        return template && 
               typeof template === 'object' && 
               typeof template.id === 'string' && 
               typeof template.description === 'string' &&
               typeof template.schedule === 'object' &&
               typeof template.isDefault === 'boolean';
      });
      
      if (validTemplates.length === 0) {
        console.error("No se encontraron plantillas válidas para importar");
        return false;
      }
      
      // Actualizar el estado con las plantillas importadas
      await saveTemplates(validTemplates);
      return true;
    } catch (error) {
      console.error("Error al importar plantillas:", error);
      return false;
    }
  }

  return (
    <ScheduleTemplatesContext.Provider 
      value={{
        templates,
        loading,
        getTemplateById,
        createTemplate,
        updateTemplate,
        deleteTemplate,
        setDefaultTemplate,
        getTemplatesByClinic,
        refreshTemplates,
        exportTemplates,
        importTemplates
      }}
    >
      {children}
    </ScheduleTemplatesContext.Provider>
  );
}

export function useScheduleTemplates() {
  const context = useContext(ScheduleTemplatesContext);
  if (context === undefined) {
    throw new Error("useScheduleTemplates debe ser usado dentro de un ScheduleTemplatesProvider");
  }
  return context;
} 