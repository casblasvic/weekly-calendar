"use client"

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useMemo } from "react"
import { useInterfaz } from "./interfaz-Context"
import { WeekSchedule, DEFAULT_SCHEDULE } from "@/types/schedule"
import { ScheduleTemplate } from "@prisma/client"
import { useSession } from "next-auth/react"

// Interfaz del contexto
interface ScheduleTemplatesContextType {
  templates: ScheduleTemplate[];
  loading: boolean;
  getTemplateById: (id: string) => Promise<ScheduleTemplate | null>;
  createTemplate: (template: Omit<ScheduleTemplate, 'id' | 'createdAt' | 'updatedAt'>) => Promise<ScheduleTemplate | null>;
  updateTemplate: (id: string, template: Partial<ScheduleTemplate>) => Promise<ScheduleTemplate | null>;
  deleteTemplate: (id: string) => Promise<boolean>;
  setDefaultTemplate: (id: string) => Promise<boolean>;
  refreshTemplates: () => Promise<void>;
  exportTemplates: () => string;
  importTemplates: (data: string) => Promise<boolean>;
}

// Valor por defecto para plantillas
const defaultTemplates: ScheduleTemplate[] = [
  {
    id: "template-default",
    name: "Plantilla Estándar",
    description: "Plantilla por defecto inicial",
    systemId: "system-default-placeholder",
    createdAt: new Date(),
    updatedAt: new Date(),
    openTime: null,
    closeTime: null,
    slotDuration: 15,
  }
];

// Crear el contexto
const ScheduleTemplatesContext = createContext<ScheduleTemplatesContextType | undefined>(undefined)

// Provider del contexto
export function ScheduleTemplatesProvider({ children }: { children: ReactNode }) {
  const [templates, setTemplates] = useState<ScheduleTemplate[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const interfaz = useInterfaz();
  const { data: session, status } = useSession();

  // Cargar plantillas al iniciar (o al cambiar estado de sesión)
  const loadTemplates = useCallback(async () => {
    if (status !== 'authenticated') {
        console.log("[ScheduleTemplatesProvider] Sesión no autenticada, saltando loadTemplates.");
        setLoading(false);
        setTemplates([]);
        return;
    }
    
    setLoading(true);
    try {
      console.log("[ScheduleTemplatesProvider] Fetching templates from API...");
      const response = await fetch('/api/templates'); 
      if (!response.ok) {
        let errorText = response.statusText;
        try { const errorBody = await response.json(); errorText = errorBody.message || errorText; } catch (e) {}
        throw new Error(`Error ${response.status}: ${errorText}`);
      }
      const templatesFromApi: ScheduleTemplate[] = await response.json();
      console.log(`[ScheduleTemplatesProvider] Received ${templatesFromApi.length} templates from API.`);
      setTemplates(templatesFromApi); 
    } catch (error) {
      console.error("Error al cargar plantillas horarias desde API:", error);
      setTemplates([]); 
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    // Cargar solo si la sesión está autenticada Y la interfaz inicializada
    // (Asumiendo que interfaz.initialized es relevante para algo más)
    if (status === 'authenticated' && interfaz.initialized) {
        loadTemplates();
    } else if (status === 'unauthenticated') {
        setTemplates([]);
        setLoading(false);
    } else {
        setLoading(true); // Cargando sesión
    }
  }, [status, loadTemplates]);

  // Guardar plantillas DEPRECATED - Usar APIs individuales
  const saveTemplates = async (updatedTemplates: ScheduleTemplate[]) => {
    console.warn("saveTemplates DEPRECATED. Use individual API calls.");
    setTemplates(updatedTemplates); // Actualizar estado local es ok
  }

  const getTemplateById = useCallback(async (id: string): Promise<ScheduleTemplate | null> => {
     if (status !== 'authenticated') return null;
     // Implementación API (GET /api/templates/[id]) - PENDIENTE
    console.warn(`getTemplateById(${id}) no implementado con API. Buscando en estado local.`);
      const template = templates.find(t => t.id === id);
      return template || null;
  }, [templates, status]);

  const createTemplate = useCallback(async (template: Omit<ScheduleTemplate, 'id' | 'createdAt' | 'updatedAt'>): Promise<ScheduleTemplate | null> => {
     if (status !== 'authenticated') return null;
    
    setLoading(true);
    try {
        const response = await fetch('/api/templates', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            // Asegurar que el schedule se envía en el formato correcto esperado por la API
            body: JSON.stringify(template), 
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || `Error ${response.status}`);
        }
        const newTemplate: ScheduleTemplate = await response.json();
        setTemplates(prev => [...prev, newTemplate]);
      return newTemplate;
    } catch (error) {
        console.error("Error al crear plantilla vía API:", error);
        return null; // Devolver null en error
    } finally {
        setLoading(false);
    }
  }, [status]);

  const updateTemplate = useCallback(async (id: string, templateData: Partial<ScheduleTemplate>): Promise<ScheduleTemplate | null> => {
    if (status !== 'authenticated') return null;
    
    console.log(`[ScheduleTemplatesProvider] Updating template ${id} with data:`, templateData);
    setLoading(true); // Indicar carga
    try {
      const response = await fetch(`/api/templates/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(templateData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: `Error HTTP ${response.status}` }));
        console.error(`[ScheduleTemplatesProvider] API Error updating template ${id}:`, errorData);
        return null; 
      }

      const updatedTemplateFromApi: ScheduleTemplate = await response.json();
      console.log(`[ScheduleTemplatesProvider] Template ${id} updated successfully via API:`, updatedTemplateFromApi);

      setTemplates(currentTemplates => 
        currentTemplates.map(t => 
          t.id === id ? updatedTemplateFromApi : t
        )
      );
      
      return updatedTemplateFromApi; 

    } catch (error: any) {
      console.error(`[ScheduleTemplatesProvider] Unexpected error updating template ${id}:`, error);
      return null;
    } finally {
        setLoading(false); // Finalizar carga
    }
  }, [status]);

  const deleteTemplate = useCallback(async (id: string): Promise<boolean> => {
    if (status !== 'authenticated') return false;

    console.warn(`deleteTemplate(${id}) no implementado con API DELETE /api/templates/[id]`);
    setLoading(true);
    try {
        // TODO: Llamar a DELETE /api/templates/[id]
        // Simulación local por ahora:
      if (!templates.some(t => t.id === id)) return false;
      const filteredTemplates = templates.filter(t => t.id !== id);
        setTemplates(filteredTemplates); // Actualizar estado local es ok
      return true;
    } catch (error) {
      console.error(`Error al eliminar plantilla ${id}:`, error);
      return false;
    } finally {
        setLoading(false);
    }
  }, [status]);

  const setDefaultTemplate = useCallback(async (id: string): Promise<boolean> => {
     if (status !== 'authenticated') return false;

     console.warn(`setDefaultTemplate(${id}) no implementado con API PATCH /api/templates/[id]/set-default`);
     setLoading(true);
    try {
      // TODO: Llamar a API para marcar como default y desmarcar las otras
      // Simulación local:
      const targetIndex = templates.findIndex(t => t.id === id);
      if (targetIndex === -1) return false;
      const updatedTemplates = templates.map(template => ({ ...template, isDefault: template.id === id }));
      setTemplates(updatedTemplates); // Actualizar estado local
      return true;
    } catch (error) {
      console.error(`Error al establecer plantilla predeterminada ${id}:`, error);
      return false;
    } finally {
        setLoading(false);
  }
  }, [status, loadTemplates]);

  const refreshTemplates = useCallback(async (): Promise<void> => {
    if (status === 'authenticated') {
        await loadTemplates();
    } else {
        setTemplates([]);
    }
  }, [loadTemplates, status]);

  const exportTemplates = useCallback((): string => {
    return JSON.stringify(templates);
  }, [templates]);

  const importTemplates = useCallback(async (data: string): Promise<boolean> => {
    if (status !== 'authenticated') return false;

    console.warn(`importTemplates no implementado con API POST /api/templates/import`);
    setLoading(true);
    try {
      let importedTemplates: ScheduleTemplate[];
      try {
        importedTemplates = JSON.parse(data);
        if (!Array.isArray(importedTemplates)) {
          throw new Error("El formato de los datos importados no es válido");
        }
        // TODO: Validar cada plantilla importada con Zod?
      } catch (error) {
        console.error("Error al parsear datos importados:", error);
        return false;
      }
      // TODO: Llamar a API para importar/reemplazar
      // Simulación local:
      setTemplates(importedTemplates);
      return true;
    } catch (error) {
       console.error("Error importando plantillas:", error);
      return false;
    } finally {
        setLoading(false);
    }
  }, [status, loadTemplates]);

  // Valor del contexto
  const contextValue = useMemo(() => ({
        templates,
        loading,
        getTemplateById,
        createTemplate,
        updateTemplate,
        deleteTemplate,
        setDefaultTemplate,
        refreshTemplates,
        exportTemplates,
    importTemplates,
  }), [
    templates, loading, getTemplateById, createTemplate, updateTemplate, 
    deleteTemplate, setDefaultTemplate, refreshTemplates, // Eliminado de dependencias
    exportTemplates, importTemplates
  ]);

  return (
    <ScheduleTemplatesContext.Provider value={contextValue}>{children}</ScheduleTemplatesContext.Provider>
  );
}

export function useScheduleTemplates() {
  const context = useContext(ScheduleTemplatesContext);
  if (context === undefined) {
    throw new Error("useScheduleTemplates debe usarse dentro de un ScheduleTemplatesProvider");
  }
  return context;
} 