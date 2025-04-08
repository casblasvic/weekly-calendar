"use client"

import { createContext, useContext, useState, type ReactNode, useEffect, useCallback, useMemo } from "react"
import { toast } from "@/components/ui/use-toast";
import type { Clinica } from "@/services/data/models/interfaces"
import type { Cabin } from '@prisma/client'

// Función auxiliar para comparar IDs que pueden ser string o number
const isSameId = (id1: string | number | undefined | null, id2: string | number | undefined | null): boolean => {
  if (id1 === null || id1 === undefined || id2 === null || id2 === undefined) return false;
  return String(id1) === String(id2);
}

// Definir alias para los tipos usando los tipos del modelo central
// export type Clinica = Clinica; // <-- Eliminada/Comentada esta línea redundante

// --- Interface Simplificada --- 
interface ClinicContextType {
  activeClinic: Clinica | null
  setActiveClinic: (clinic: Clinica | null) => void // La expuesta
  clinics: Clinica[]
  isLoading: boolean
  error: string | null
  refetchClinics: () => Promise<void>
  getAllClinicas: () => Promise<Clinica[]>
  getClinicaById: (id: string) => Promise<Clinica | null>
  createClinica: (clinica: Omit<Clinica, 'id' | 'createdAt' | 'updatedAt' | 'systemId'>) => Promise<Clinica | null>
  updateClinica: (id: string, clinica: Partial<Omit<Clinica, 'id' | 'createdAt' | 'updatedAt' | 'systemId'>>) => Promise<Clinica | null>
  deleteClinica: (id: string) => Promise<boolean>
  getActiveClinicas: () => Promise<Clinica[]>
  activeClinicCabins: Cabin[] | null
  isLoadingCabinsContext: boolean
  refreshActiveClinicCabins: () => Promise<void>
  fetchCabinsForClinic: (clinicId: string | null) => Promise<void>
}

const ClinicContext = createContext<ClinicContextType | undefined>(undefined)

export const ClinicProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [clinics, setClinics] = useState<Clinica[]>([])
  const [activeClinic, setActiveClinicState] = useState<Clinica | null>(null)
  const [activeClinicCabins, setActiveClinicCabins] = useState<Cabin[] | null>(null)
  const [isLoadingClinics, setIsLoadingClinics] = useState(true)
  const [isLoadingCabinsContext, setIsLoadingCabinsContext] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

  const internalSetActiveClinic = useCallback((clinic: Clinica | null) => {
    console.log("[ClinicContext] internalSetActiveClinic called with:", JSON.stringify(clinic, (key, value) => key === 'linkedScheduleTemplate' || key === 'independentScheduleBlocks' ? '...' : value, 2));
    if (clinic) {
      // Remove old detailed logs if not needed
      // console.log(`[ClinicContext] internalSetActiveClinic - Checking scheduleJson:`, clinic.scheduleJson); 
      // console.log(`[ClinicContext] internalSetActiveClinic - Checking openTime:`, clinic.openTime);
      // console.log(`[ClinicContext] internalSetActiveClinic - Checking closeTime:`, clinic.closeTime);
    } else {
      console.log("[ClinicContext] internalSetActiveClinic - Clinic is null");
    }
    setActiveClinicState(clinic);
    if (clinic?.id) {
      localStorage.setItem('activeClinicId', String(clinic.id));
    } else {
      localStorage.removeItem('activeClinicId');
    }
  }, []);

  const fetchAndUpdateDetailedClinic = useCallback(async (clinicId: string) => {
    if (!clinicId) return;
    console.log(`[ClinicContext] fetchAndUpdateDetailedClinic - Fetching details for clinic: ${clinicId}`);
    setIsLoadingDetails(true);
    try {
      const response = await fetch(`/api/clinics/${clinicId}`);
      if (!response.ok) {
        throw new Error(`Error ${response.status} fetching detailed clinic ${clinicId}`);
      }
      const detailedClinicData: Clinica = await response.json();
      console.log(`[ClinicContext] fetchAndUpdateDetailedClinic - Received detailed data for ${clinicId}. Updating active clinic state.`);
      internalSetActiveClinic(detailedClinicData); 
    } catch (err) {
      console.error(`[ClinicContext] fetchAndUpdateDetailedClinic - Error fetching details for ${clinicId}:`, err);
      setError(err instanceof Error ? err.message : `Error fetching details for clinic ${clinicId}`);
    } finally {
      setIsLoadingDetails(false);
    }
  }, [internalSetActiveClinic, setError]);

  const fetchClinics = useCallback(async () => {
    console.log("ClinicContext: Iniciando fetchClinics");
    setIsLoadingClinics(true);
    setError(null);
    try {
      const response = await fetch('/api/clinics');
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
      const loadedClinics: Clinica[] = await response.json();
      console.log("ClinicContext: Clínicas cargadas desde API:", loadedClinics);
      setClinics(loadedClinics);
      console.log("ClinicContext: Estado 'clinics' actualizado.");
    } catch (err) {
      console.error("Error al cargar clínicas desde API:", err);
      setError(err instanceof Error ? err.message : 'Error desconocido al cargar clínicas');
      setClinics([]);
    } finally {
      setIsLoadingClinics(false);
      console.log("ClinicContext: fetchClinics finalizado.");
    }
  }, [setError, setIsLoadingClinics]);

  useEffect(() => {
    fetchClinics();
  }, [fetchClinics]);

  useEffect(() => {
    console.log("[ClinicContext] useEffect[clinics, isLoading] - Determinando activa...");
    if (!isLoadingClinics && clinics.length > 0) {
      const storedActiveId = localStorage.getItem('activeClinicId');
      let clinicToActivate: Clinica | null = null;

      if (storedActiveId) {
        clinicToActivate = clinics.find(c => String(c.id) === storedActiveId) || null; 
        console.log(`[ClinicContext] useEffect[clinics, isLoading] - Found stored ID ${storedActiveId}. Found clinic? ${!!clinicToActivate}`);
      }

      if (!clinicToActivate) {
        clinicToActivate = clinics.find(c => c.isActive) || clinics[0]; 
        console.log("[ClinicContext] useEffect[clinics, isLoading] - No stored ID or not found, using first active/available clinic:", clinicToActivate?.id);
      }
      
      // Ensure clinicToActivate and its ID exist before proceeding
      if (clinicToActivate && clinicToActivate.id != null) { // Check for null/undefined ID
          // <<< ENSURE ID is passed as STRING >>>
          const clinicIdToFetch = String(clinicToActivate.id); 

          if (clinicIdToFetch !== String(activeClinic?.id)) { // Compare as string
             console.log(`[ClinicContext] useEffect[clinics, isLoading] - Setting initial active clinic: ${clinicIdToFetch}`);
             internalSetActiveClinic(clinicToActivate); 
             
             fetchAndUpdateDetailedClinic(clinicIdToFetch); // Pass the guaranteed string

          } else if (clinicIdToFetch === String(activeClinic?.id) && !isLoadingDetails) {
             const hasBlocks = activeClinic.linkedScheduleTemplate?.blocks || activeClinic.independentScheduleBlocks;
             if (!hasBlocks) {
                 console.log(`[ClinicContext] useEffect[clinics, isLoading] - Active clinic ${clinicIdToFetch} present but lacks details. Refetching details.`);
                 fetchAndUpdateDetailedClinic(clinicIdToFetch); // Pass the guaranteed string
             } else {
                 console.log(`[ClinicContext] useEffect[clinics, isLoading] - Active clinic ${clinicIdToFetch} already correct and has details.`);
             }
          } else {
             console.log(`[ClinicContext] useEffect[clinics, isLoading] - Clinic ${clinicIdToFetch} already set or details are loading.`);
          }
      } else if (!clinicToActivate) {
         console.log("[ClinicContext] useEffect[clinics, isLoading] - No clinic to activate.");
         if(activeClinic) internalSetActiveClinic(null);
      }
      
    } else {
       console.log(`[ClinicContext] useEffect[clinics, isLoading] - Skipping activation (isLoading: ${isLoadingClinics}, clinics.length: ${clinics.length})`);
    }
  }, [clinics, isLoadingClinics, activeClinic?.id, internalSetActiveClinic, fetchAndUpdateDetailedClinic, isLoadingDetails, activeClinic]);

  // --- Simplificar getClinicaById --- 
  const getClinicaById = useCallback(async (id: string): Promise<Clinica | null> => {
    const clinicIdString = String(id); 
    console.log(`getClinicaById: Fetching clinic ${clinicIdString} from API (Context)`);
    // NO modificar isLoading global aquí
    // setIsLoading(true); 
    setError(null); // Limpiar error sí es pertinente
    try {
      const response = await fetch(`/api/clinics/${clinicIdString}`);
      if (response.status === 404) {
          console.log(`getClinicaById: Clinic ${clinicIdString} not found (404)`);
          return null;
      }
      if (!response.ok) {
        // Lanzar error para que el componente que llama lo maneje
        console.error(`getClinicaById: API error fetching ${clinicIdString}: ${response.status}`);
        throw new Error(`Error ${response.status} fetching clinic`);
      }
      const clinica: Clinica = await response.json();
      console.log(`getClinicaById: Successfully fetched clinic ${clinicIdString}`);
      // NO actualizar la lista global de clinics aquí
      // setClinics(prev => { ... }); 
      return clinica; // Devolver solo la clínica encontrada
    } catch (err) {
      console.error(`getClinicaById: Catch block error fetching ${clinicIdString}:`, err);
      setError(err instanceof Error ? err.message : 'Error desconocido obteniendo clínica');
      return null;
    } 
    // NO modificar isLoading global aquí
    // finally { setIsLoading(false); }
  }, [setError]); // <-- Dependencias estables (setError de useState)

  const createClinica = async (clinicaData: Omit<Clinica, 'id' | 'createdAt' | 'updatedAt' | 'systemId'>): Promise<Clinica | null> => {
    setIsLoadingClinics(true);
    setError(null);
    try {
      const response = await fetch('/api/clinics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(clinicaData),
      });
      if (!response.ok) {
         const errorData = await response.json();
         throw new Error(errorData.message || `Error ${response.status}`);
      }
      const newClinic: Clinica = await response.json();
      setClinics(prev => [...prev, newClinic]);
      if (!activeClinic || !activeClinic.isActive) {
          internalSetActiveClinic(newClinic);
      }
      return newClinic;
    } catch (err) {
      console.error("Error al crear clínica vía API:", err);
      setError(err instanceof Error ? err.message : 'Error desconocido al crear clínica');
      return null;
    } finally {
      setIsLoadingClinics(false);
    }
  };

  const updateClinica = async (id: string, clinicaUpdate: Partial<Omit<Clinica, 'id' | 'createdAt' | 'updatedAt' | 'systemId'>>): Promise<Clinica | null> => {
    const clinicIdString = String(id); // Asegurar string
    setIsLoadingClinics(true);
    setError(null);
    let response: Response | null = null; // << Declare response here

    // <<< INICIO: Sanitizar el payload >>>
    // Lista de campos permitidos según UpdateClinicAndScheduleSchema en la API
    const allowedFields: (keyof Partial<Clinica> | 'independentScheduleData')[] = [
        'name', 'address', 'city', 'postalCode', 'province', 'countryCode', 'phone',
        'email', 'currency', 'timezone', 'isActive', 'prefix', 'commercialName', 
        'businessName', 'cif', 'country', 'phone2', 'initialCash', 'ticketSize', 
        'ip', 'blockSignArea', 'blockPersonalData', 'delayedPayments', 'affectsStats', 
        'appearsInApp', 'scheduleControl', 'professionalSkills', 'notes', 'openTime', 
        'closeTime', 'slotDuration', 'tariffId', 'linkedScheduleTemplateId',
        'independentScheduleData' // Campo especial para el horario independiente
    ];

    const payload: Record<string, any> = {};
    for (const key in clinicaUpdate) {
      if (allowedFields.includes(key as any)) {
        // Caso especial: Si se envía scheduleJson pero no es plantilla, enviarlo como independentScheduleData
        if (key === 'scheduleJson' && !clinicaUpdate.linkedScheduleTemplateId) {
            payload['independentScheduleData'] = (clinicaUpdate as any)[key];
        } else if (key !== 'scheduleJson') { // No incluir scheduleJson directamente
            payload[key] = (clinicaUpdate as any)[key];
        }
      }
    }
    // Asegurarse de que linkedScheduleTemplateId esté presente si corresponde (incluso si es null)
    if (clinicaUpdate.hasOwnProperty('linkedScheduleTemplateId')) {
      payload['linkedScheduleTemplateId'] = clinicaUpdate.linkedScheduleTemplateId;
    }
    
    console.log(`[updateClinica] Sanitized Payload being sent to PUT /api/clinics/${clinicIdString}:`, JSON.stringify(payload, null, 2));
    // <<< FIN: Sanitizar el payload >>>

    try {
      response = await fetch(`/api/clinics/${clinicIdString}`, { // << Assign to response
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        // Usar el payload sanitizado
        body: JSON.stringify(payload),
      });
       if (!response.ok) {
         let errorData: any = { message: `Error ${response.status}` }; // Default error
         try {
           // Try to parse JSON error body
           errorData = await response.json();
         } catch (jsonError) {
           // If JSON parsing fails, try to get the raw text body
           try {
              const errorText = await response.text();
              console.error("API Error Response (Non-JSON):", errorText); // << Log raw text
              errorData.message = errorText.substring(0, 200) || errorData.message; // Use text snippet as message
           } catch (textError) {
              console.error("Failed to get error response text body:", textError);
           }
         }
         throw new Error(errorData.message || `Error ${response.status} (no details)`); // Use extracted message or default
      }
      const updatedClinic: Clinica = await response.json();
      
      setClinics(prev => 
        prev.map(c => String(c.id) === clinicIdString ? updatedClinic : c) // Comparar como string
      );
      
      if (activeClinic && String(activeClinic.id) === clinicIdString) {
        internalSetActiveClinic(updatedClinic);
      }
      return updatedClinic;
    } catch (err) {
       console.error(`Error al actualizar clínica ${clinicIdString} vía API:`, err);
       // Log the full response object if available
       if (response) {
         console.error("Full API Response Object:", response);
       }
       setError(err instanceof Error ? err.message : 'Error desconocido al actualizar');
       return null;
    } finally {
      setIsLoadingClinics(false);
    }
  };

  const deleteClinica = async (id: string): Promise<boolean> => {
    const clinicIdString = String(id); // Asegurar string
    setIsLoadingClinics(true);
    setError(null);
    try {
       const response = await fetch(`/api/clinics/${clinicIdString}`, {
        method: 'DELETE',
      });
       if (!response.ok) {
         const errorData = await response.json();
         throw new Error(errorData.message || `Error ${response.status}`);
      }
      
      const remainingClinics = clinics.filter(c => String(c.id) !== clinicIdString); // Comparar como string
      setClinics(remainingClinics);
      
      if (activeClinic && String(activeClinic.id) === clinicIdString) {
         internalSetActiveClinic(remainingClinics.find(c => c.isActive) || (remainingClinics.length > 0 ? remainingClinics[0] : null));
      }
      return true;
    } catch (err) {
      console.error(`Error al eliminar clínica ${clinicIdString} vía API:`, err);
      setError(err instanceof Error ? err.message : 'Error desconocido al eliminar');
      return false;
    } finally {
      setIsLoadingClinics(false);
    }
  };

  const getActiveClinicas = async (): Promise<Clinica[]> => {
      return clinics.filter(c => c.isActive);
  };

  const exposedRefetchClinics = useCallback(async () => {
    await fetchClinics();
  }, [fetchClinics]);

  // Función expuesta (solo llama a la interna)
  const exposedSetActiveClinic = useCallback((clinic: Clinica | null) => {
    const newClinicId = clinic?.id ? String(clinic.id) : null;
    const currentClinicId = activeClinic?.id ? String(activeClinic.id) : null;
    console.log(`Exposed setActiveClinic called. Current: ${currentClinicId}, New: ${newClinicId}`);
    if (newClinicId !== currentClinicId) {
      console.log(`Exposed setActiveClinic: ID diferente, llamando a internalSetActiveClinic.`);
      internalSetActiveClinic(clinic); // Llama a la interna que solo actualiza el estado
    } else {
      console.log("Exposed setActiveClinic: ID es el mismo, no se llama.");
    }
  }, [activeClinic?.id, internalSetActiveClinic]); // Depender de la interna

  // --- Función para cargar cabinas de una clínica específica (similar a refresh) ---
  const fetchCabinsForClinic = useCallback(async (clinicId: string | null) => {
    if (!clinicId) {
      console.log("fetchCabinsForClinic - No clinicId provided, setting cabins to null.");
      setActiveClinicCabins(null);
      return;
    }
    
    console.log(`fetchCabinsForClinic - Fetching cabins for clinic: ${clinicId}`);
    setIsLoadingCabinsContext(true);
    setActiveClinicCabins(null); // Limpiar mientras carga
    try {
      const response = await fetch(`/api/clinics/${clinicId}/cabins`);
      if (!response.ok) {
        throw new Error(`Failed to fetch cabins for clinic ${clinicId}`);
      }
      const cabinsData = await response.json();
      console.log(`fetchCabinsForClinic - Cabins received for ${clinicId}:`, cabinsData);
      setActiveClinicCabins(cabinsData);
    } catch (error) {
      console.error(`Error fetching cabins for clinic ${clinicId}:`, error);
      setActiveClinicCabins(null); 
    } finally {
      setIsLoadingCabinsContext(false);
    }
  }, []); // Sin dependencias, ya que recibe el ID
  // --- Fin fetchCabinsForClinic ---

  // --- useEffect para cargar cabinas cuando activeClinic cambia --- 
  useEffect(() => {
    // Asegurar que el ID es string o null
    const currentClinicId = activeClinic?.id ? String(activeClinic.id) : null;
    console.log(`ClinicProvider - useEffect[activeClinic.id] triggered. Current ID: ${currentClinicId}`);
    // Llamar a la función para cargar cabinas con el ID actual (string o null)
    fetchCabinsForClinic(currentClinicId);
  }, [activeClinic?.id, fetchCabinsForClinic]); // Depender del ID de la clínica activa
  // --- Fin useEffect ---
  
  // --- refreshActiveClinicCabins ahora puede reutilizar fetchCabinsForClinic ---
  const refreshActiveClinicCabins = useCallback(async () => {
    // Asegurar que el ID es string o null
    const clinicId = activeClinic?.id ? String(activeClinic.id) : null;
    console.log(`refreshActiveClinicCabins called. Triggering fetch for clinic: ${clinicId}`);
    await fetchCabinsForClinic(clinicId);
  }, [activeClinic?.id, fetchCabinsForClinic]); 
  // --- Fin refreshActiveClinicCabins ---

  // --- Log para verificar cambios en activeClinicCabins ---
  useEffect(() => {
    console.log("ClinicProvider - Estado activeClinicCabins actualizado:", activeClinicCabins);
  }, [activeClinicCabins]);
  // --- Fin Log ---

  const value = useMemo(() => ({
    // Propiedades requeridas por ClinicContextType:
    activeClinic,
    setActiveClinic: exposedSetActiveClinic, // Usar la función renombrada internamente
    clinics,
    isLoading: isLoadingClinics || isLoadingDetails, // Usar el estado interno renombrado
    error,
    refetchClinics: exposedRefetchClinics, // Usar la función renombrada internamente
    getAllClinicas: async () => clinics, // Simplificado
    getClinicaById,
    createClinica, 
    updateClinica,
    deleteClinica,
    getActiveClinicas,
    activeClinicCabins,
    isLoadingCabinsContext,
    refreshActiveClinicCabins,
    fetchCabinsForClinic, // Exponerla si fuera necesario, aunque no parece
  }), [
    // Dependencias:
    activeClinic,
    exposedSetActiveClinic,
    clinics,
    isLoadingClinics,
    isLoadingDetails,
    error,
    exposedRefetchClinics,
    getClinicaById,
    createClinica,
    updateClinica,
    deleteClinica,
    getActiveClinicas,
    activeClinicCabins,
    isLoadingCabinsContext,
    refreshActiveClinicCabins,
    fetchCabinsForClinic,
  ]);

  return (
    <ClinicContext.Provider value={value}>
      {children}
    </ClinicContext.Provider>
  );
}

export function useClinic() {
  const context = useContext(ClinicContext)
  if (context === undefined) {
    throw new Error("useClinic debe usarse dentro de un ClinicProvider")
  }
  return context
}

export { ClinicContext }

