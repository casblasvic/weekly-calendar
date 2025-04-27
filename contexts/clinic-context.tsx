"use client"

import { createContext, useContext, useState, type ReactNode, useEffect, useCallback, useMemo } from "react"
import { toast } from "@/components/ui/use-toast";
import type { Cabin, Clinic as PrismaClinic } from '@prisma/client'
import { useSession } from "next-auth/react";
import type { ClinicSchedule, ScheduleTemplate as PrismaScheduleTemplate, ScheduleTemplateBlock as PrismaScheduleTemplateBlock } from '@prisma/client';
import type { ClinicaApiOutput } from "@/lib/types/api-outputs";

// Función auxiliar para comparar IDs que pueden ser string o number
const isSameId = (id1: string | number | undefined | null, id2: string | number | undefined | null): boolean => {
  if (id1 === null || id1 === undefined || id2 === null || id2 === undefined) return false;
  return String(id1) === String(id2);
}

// Crear un tipo para el payload de actualización que incluye cabinsOrder
type ClinicUpdatePayload = Partial<PrismaClinic> & {
  // Mantener campos existentes si se añadieron aquí antes
  independentScheduleData?: any; 
  deleteIndependentBlocks?: boolean;
  // Añadir nuestro campo opcional
  cabinsOrder?: { id: string; order: number }[]; 
};

// --- Interface Simplificada --- 
interface ClinicContextType {
  activeClinic: ClinicaApiOutput | null
  setActiveClinic: (clinic: ClinicaApiOutput | null) => void
  setActiveClinicById: (id: string) => Promise<void>
  clinics: PrismaClinic[]
  isLoading: boolean
  error: string | null
  refetchClinics: () => Promise<void>
  getAllClinicas: () => Promise<PrismaClinic[]>
  getClinicaById: (id: string) => Promise<ClinicaApiOutput | null>
  createClinica: (clinica: Omit<PrismaClinic, 'id' | 'createdAt' | 'updatedAt' | 'systemId' | 'independentScheduleId' | 'linkedScheduleTemplateId' | 'tariffId'> ) => Promise<PrismaClinic | null>
  updateClinica: (id: string, clinica: ClinicUpdatePayload) => Promise<ClinicaApiOutput | null>
  deleteClinica: (id: string) => Promise<boolean>
  getActiveClinicas: () => Promise<PrismaClinic[]>
  activeClinicCabins: Cabin[] | null
  isLoadingCabinsContext: boolean
  refreshActiveClinicCabins: () => Promise<void>
  fetchCabinsForClinic: (clinicId: string, systemId: string) => Promise<void>
}

const ClinicContext = createContext<ClinicContextType | undefined>(undefined)

export const ClinicProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [clinics, setClinics] = useState<PrismaClinic[]>([])
  const [activeClinic, setActiveClinicState] = useState<ClinicaApiOutput | null>(null)
  const [activeClinicCabins, setActiveClinicCabins] = useState<Cabin[] | null>(null)
  const [isLoadingClinics, setIsLoadingClinics] = useState(true)
  const [isLoadingCabinsContext, setIsLoadingCabinsContext] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const { data: session, status } = useSession();

  const internalSetActiveClinic = useCallback((clinic: ClinicaApiOutput | null) => {
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
    if (status !== 'authenticated') return;
    if (!clinicId) return;
    console.log(`[ClinicContext] fetchAndUpdateDetailedClinic - Fetching details for clinic: ${clinicId}`);
    setIsLoadingDetails(true);
    try {
      setError(null);
      const response = await fetch(`/api/clinics/${clinicId}`);
      if (!response.ok) {
        throw new Error(`Error ${response.status} fetching detailed clinic ${clinicId}`);
      }
      const detailedClinicData: ClinicaApiOutput = await response.json();
      console.log(`[ClinicContext] fetchAndUpdateDetailedClinic - Received detailed data for ${clinicId}. Updating active clinic state.`);
      internalSetActiveClinic(detailedClinicData); 
    } catch (err) {
      console.error(`[ClinicContext] fetchAndUpdateDetailedClinic - Error fetching details for ${clinicId}:`, err);
      setError(err instanceof Error ? err.message : `Error fetching details for clinic ${clinicId}`);
    } finally {
      setIsLoadingDetails(false);
    }
  }, [internalSetActiveClinic, setError, status]);

  const setActiveClinicById = useCallback(async (id: string) => {
    console.log(`[ClinicContext] setActiveClinicById called for ID: ${id}`);
    // Validar ID si es necesario (ej. cuid)
    if (!id) {
        console.warn("[ClinicContext] setActiveClinicById called with invalid ID");
        return;
    }
    // Podríamos verificar si ya es la activa para evitar carga innecesaria?
    // if (id === activeClinic?.id) {
    //     console.log(`[ClinicContext] Clinic ${id} is already active.`);
    //     return;
    // }
    
    // Reutilizar la función existente para cargar y actualizar
    await fetchAndUpdateDetailedClinic(id);
    // fetchAndUpdateDetailedClinic ya llama a internalSetActiveClinic que actualiza localStorage
    
  }, [fetchAndUpdateDetailedClinic, activeClinic?.id]); // Añadir dependencia de activeClinic?.id si se descomenta la verificación

  const fetchClinics = useCallback(async () => {
    if (status !== 'authenticated') {
        console.log("[ClinicContext] Sesión no autenticada, saltando fetchClinics.");
        setIsLoadingClinics(false);
        setClinics([]);
        setActiveClinicState(null);
        setActiveClinicCabins(null);
        return;
    }
    
    console.log("ClinicContext: Iniciando fetchClinics");
    setIsLoadingClinics(true);
    setError(null);
    try {
      const response = await fetch('/api/clinics');
      if (!response.ok) {
         let errorText = response.statusText;
         if (response.status === 401) {
             try { const errorBody = await response.json(); errorText = errorBody.message || errorText; } catch (e) {}
         }
         throw new Error(`Error ${response.status}: ${errorText}`);
      }
      const loadedClinics: PrismaClinic[] = await response.json();
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
  }, [setError, setIsLoadingClinics, status]);

  useEffect(() => {
     if (status === 'authenticated') {
        fetchClinics();
    } else if (status === 'unauthenticated') {
        setClinics([]); 
        internalSetActiveClinic(null);
        setActiveClinicCabins(null);
        setIsLoadingClinics(false);
        setError(null);
    } else {
        setIsLoadingClinics(true);
    }
  }, [fetchClinics, status, internalSetActiveClinic]);

  useEffect(() => {
    console.log("[ClinicContext] useEffect[clinics, isLoading] - Checking active clinic status...");
    
    // Si está cargando o no hay clínicas, no hacer nada aún
    if (isLoadingClinics || !clinics || clinics.length === 0) {
      console.log(`[ClinicContext] useEffect - Skipping activation logic (isLoading: ${isLoadingClinics}, clinics#: ${clinics?.length})`);
      // Si no hay clínicas pero sí una activa, limpiarla
      if (!isLoadingClinics && clinics?.length === 0 && activeClinic) {
          console.log("[ClinicContext] useEffect - No clinics available, clearing active clinic.");
          internalSetActiveClinic(null);
      }
      return; 
    }

    // Hay clínicas y no está cargando
    const storedActiveId = localStorage.getItem('activeClinicId');
    let clinicToActivate: PrismaClinic | null = null;

    if (storedActiveId) {
      clinicToActivate = clinics.find(c => String(c.id) === storedActiveId) || null;
      console.log(`[ClinicContext] useEffect - Found stored ID ${storedActiveId}. Found matching clinic in list? ${!!clinicToActivate}`);
    }

    // Si no hay ID guardado o no coincide, buscar la primera activa o la primera de la lista
    if (!clinicToActivate) {
      clinicToActivate = clinics.find(c => c.isActive) || clinics[0]; 
      console.log("[ClinicContext] useEffect - No valid stored ID, using first active/available clinic:", clinicToActivate?.id);
    }

    // Si encontramos una clínica para activar (de localStorage o por defecto)
    if (clinicToActivate && clinicToActivate.id != null) {
      const clinicIdToFetch = String(clinicToActivate.id);
      const currentActiveClinicId = activeClinic?.id ? String(activeClinic.id) : null;

      // ¿Es diferente de la clínica activa actual?
      if (clinicIdToFetch !== currentActiveClinicId) {
        console.log(`[ClinicContext] useEffect - Clinic to activate (${clinicIdToFetch}) differs from current (${currentActiveClinicId}). Fetching details.`);
        fetchAndUpdateDetailedClinic(clinicIdToFetch); // Fetch obtendrá detalles y llamará a internalSetActiveClinic
      }
      // ¿Es la misma clínica activa pero está cargando detalles o le faltan?
      else if (clinicIdToFetch === currentActiveClinicId) {
          if (isLoadingDetails) {
              console.log(`[ClinicContext] useEffect - Clinic ${clinicIdToFetch} is already active, details are loading.`);
          } else if (activeClinic) { // Verificar que activeClinic no sea null aquí
              // Simplemente registrar que ya está activa y con detalles (o al menos, la carga finalizó)
              console.log(`[ClinicContext] useEffect - Clinic ${clinicIdToFetch} is already active. Load finished (details presence checked elsewhere).`);
          }
      }
    } 
    // Si después de buscar no encontramos NINGUNA clínica para activar
    else {
      console.log("[ClinicContext] useEffect - No clinic could be selected for activation. Clearing active clinic.");
      if(activeClinic) { // Solo limpiar si había una activa antes
         internalSetActiveClinic(null); 
      }
    }

  }, [clinics, isLoadingClinics, activeClinic?.id, internalSetActiveClinic, fetchAndUpdateDetailedClinic, isLoadingDetails]); // << dependencia activeClinic eliminada, activeClinic.id ya está

  // --- Simplificar getClinicaById --- 
  const getClinicaById = useCallback(async (id: string): Promise<ClinicaApiOutput | null> => {
    if (status !== 'authenticated') return null;
    
    const clinicIdString = String(id); 
    console.log(`getClinicaById: Fetching clinic ${clinicIdString} from API (Context)`);
    setError(null);
    try {
      const response = await fetch(`/api/clinics/${clinicIdString}`);
      if (response.status === 404) {
          console.log(`getClinicaById: Clinic ${clinicIdString} not found (404)`);
          return null;
      }
      if (!response.ok) {
        console.error(`getClinicaById: API error fetching ${clinicIdString}: ${response.status}`);
        throw new Error(`Error ${response.status} fetching clinic`);
      }
      const clinica: ClinicaApiOutput = await response.json();
      console.log(`getClinicaById: Successfully fetched clinic ${clinicIdString}`);
      return clinica;
    } catch (err) {
      console.error(`getClinicaById: Catch block error fetching ${clinicIdString}:`, err);
      setError(err instanceof Error ? err.message : 'Error desconocido obteniendo clínica');
      return null;
    } 
  }, [setError, status]);

  // ENVUELTO EN useCallback
  const createClinica = useCallback(async (clinicaData: Omit<PrismaClinic, 'id' | 'createdAt' | 'updatedAt' | 'systemId' | 'independentScheduleId' | 'linkedScheduleTemplateId' | 'tariffId'>): Promise<PrismaClinic | null> => {
    if (status !== 'authenticated') return null;

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
      const newClinic: PrismaClinic = await response.json();
      setClinics(prev => [...prev, newClinic]);
      if (!activeClinic || !activeClinic.isActive) {
          if (newClinic.id) {
             console.log(`[ClinicContext] createClinica - Setting new clinic ${newClinic.id} as active. Fetching details...`);
             fetchAndUpdateDetailedClinic(String(newClinic.id));
          }
      }
      return newClinic;
    } catch (err) {
      console.error("Error al crear clínica vía API:", err);
      setError(err instanceof Error ? err.message : 'Error desconocido al crear clínica');
      return null;
    } finally {
      setIsLoadingClinics(false);
    }
  }, [setClinics, setIsLoadingClinics, setError, activeClinic, internalSetActiveClinic, status]);

  // ENVUELTO EN useCallback
  const updateClinica = useCallback(async (id: string, data: ClinicUpdatePayload): Promise<ClinicaApiOutput | null> => {
    if (status !== 'authenticated') return null;
    
    const clinicIdString = String(id);
    setIsLoadingClinics(true);
    setError(null);
    let response: Response | null = null;

    // <<< INICIO LÓGICA DE FILTRADO RESTAURADA Y ADAPTADA >>>
    // Campos permitidos directamente del modelo PrismaClinic
    const allowedPrismaFields: (keyof PrismaClinic)[] = [
        'name', 'address', 'city', 'postalCode', 'province', 'currency', 'phone', 
        'email', 'isActive', 'prefix', 'commercialName', 'businessName', 'cif', 
        'phone2', 'initialCash', 'ticketSize', 'ip', 'blockSignArea', 'blockPersonalData', 
        'delayedPayments', 'affectsStats', 'appearsInApp', 'scheduleControl', 
        'professionalSkills', 'notes', 'tariffId', 'linkedScheduleTemplateId',
        'countryIsoCode', // Usar el campo correcto
        'languageIsoCode', 
        'phone1CountryIsoCode', 
        'phone2CountryIsoCode' 
        // NO incluir 'countryCode', 'timezone', 'country' ya que no existen o se derivan
    ];

    // Campos extra permitidos (que no están en PrismaClinic pero la API maneja)
    const allowedExtraFields: string[] = [
        'independentScheduleData', 
        'deleteIndependentBlocks', 
        'cabinsOrder' // Añadir nuestro nuevo campo
    ];

    // Construir el payload filtrado
    const payload: Record<string, any> = {};
    // Iterar sobre los datos recibidos ('data')
    for (const key in data) {
        // Comprobar si la clave está en los campos permitidos (Prisma o extra)
        if (allowedPrismaFields.includes(key as keyof PrismaClinic) || allowedExtraFields.includes(key)) {
            // Si está permitido, añadirlo al payload
            payload[key] = (data as any)[key];
        }
    }

    // Manejo especial para campos booleanos opcionales que pueden ser null
    // (Restaurado y adaptado para usar 'data')
    const booleanFieldsNullable: (keyof PrismaClinic)[] = [
      'blockSignArea', 'blockPersonalData', 'delayedPayments', 'affectsStats',
      'appearsInApp', 'scheduleControl', 'professionalSkills'
    ];
    booleanFieldsNullable.forEach(field => {
        if (data.hasOwnProperty(field) && data[field] === null) {
            payload[field] = null;
        }
    });
    // <<< FIN LÓGICA DE FILTRADO RESTAURADA Y ADAPTADA >>>

    // --- Lógica existente para modificar payload (deleteIndependentBlocks, etc.) ---
    // (Esta lógica ahora opera sobre el 'payload' ya filtrado)
    if (payload.hasOwnProperty('independentScheduleData') && payload.independentScheduleData) {
        payload['linkedScheduleTemplateId'] = null; 
        payload['deleteIndependentBlocks'] = false; 
    } else if (payload.hasOwnProperty('linkedScheduleTemplateId') && payload.linkedScheduleTemplateId) {
        payload['deleteIndependentBlocks'] = true; 
        delete payload.independentScheduleData;
    } else if (payload.hasOwnProperty('deleteIndependentBlocks') && payload.deleteIndependentBlocks === true) {
        payload['linkedScheduleTemplateId'] = null;
        delete payload.independentScheduleData;
    }
    // --- Fin Lógica existente ---

    console.log(`[ClinicContext] updateClinica - Final Filtered Payload for ${clinicIdString}:`, JSON.stringify(payload, null, 2)); 

    try {
      response = await fetch(`/api/clinics/${clinicIdString}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload), // Enviar el payload filtrado y modificado
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error(`[ClinicContext] updateClinica - API Error ${response.status} para ${clinicIdString}:`, errorData);
        throw new Error(errorData.message || `Error ${response.status}`);
      }

      const updatedClinic: ClinicaApiOutput = await response.json();
      console.log(`[ClinicContext] updateClinica - Éxito para ${clinicIdString}. Actualizando estado...`);
      setClinics(prev => 
        prev.map(c => isSameId(c.id, clinicIdString) ? updatedClinic : c)
      );
      if (isSameId(activeClinic?.id, clinicIdString)) {
        console.log(`[ClinicContext] updateClinica - Actualizando también activeClinic`);
        internalSetActiveClinic(updatedClinic);
      }
      return updatedClinic;

    } catch (err) {
        console.error(`Error al actualizar clínica ${clinicIdString} vía API:`, err);
        setError(err instanceof Error ? err.message : 'Error desconocido al actualizar clínica');
        return null;
    } finally {
        setIsLoadingClinics(false);
    }
  }, [status, setIsLoadingClinics, setError, setClinics, activeClinic, internalSetActiveClinic]); // Mantener dependencias

  // ENVUELTO EN useCallback (Ya estaba, pero revisar dependencias)
  const deleteClinica = useCallback(async (id: string): Promise<boolean> => {
    if (status !== 'authenticated') return false;
    
    const clinicIdString = String(id);
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
      
      const remainingClinics = clinics.filter(c => !isSameId(c.id, clinicIdString));
      setClinics(remainingClinics);
      
      if (isSameId(activeClinic?.id, clinicIdString)) {
         // internalSetActiveClinic(remainingClinics.find(c => c.isActive) || (remainingClinics.length > 0 ? remainingClinics[0] : null)); // <<< NO llamar directamente
         const nextClinicToActivate = remainingClinics.find(c => c.isActive) || (remainingClinics.length > 0 ? remainingClinics[0] : null);
         if (nextClinicToActivate && nextClinicToActivate.id) {
            console.log(`[ClinicContext] deleteClinica - Deleted active clinic. Activating next clinic ${nextClinicToActivate.id}. Fetching details...`);
            fetchAndUpdateDetailedClinic(String(nextClinicToActivate.id)); // <<< Llamar a fetch para obtener detalles y activar
         } else {
            console.log(`[ClinicContext] deleteClinica - Deleted active clinic. No remaining clinics to activate. Clearing active clinic.`);
            internalSetActiveClinic(null); // <<< Llamar con null si no hay más clínicas
         }
      }
      return true;
    } catch (err) {
      console.error(`Error al eliminar clínica ${clinicIdString} vía API:`, err);
      setError(err instanceof Error ? err.message : 'Error desconocido al eliminar clínica');
      return false;
    } finally {
      setIsLoadingClinics(false);
    }
  }, [clinics, setClinics, setIsLoadingClinics, setError, activeClinic, internalSetActiveClinic, status]);

  // ENVUELTO EN useCallback (Ya estaba, pero revisar dependencias)
  const getActiveClinicas = useCallback(async (): Promise<PrismaClinic[]> => {
    if (status !== 'authenticated') return [];
    return clinics.filter(c => c.isActive);
  }, [clinics, status]);

  // ENVUELTO EN useCallback (Ya estaba)
  const exposedRefetchClinics = useCallback(async () => {
    await fetchClinics();
  }, [fetchClinics]);

  // Función expuesta (solo llama a la interna)
  const exposedSetActiveClinic = useCallback((clinic: ClinicaApiOutput | null) => {
    const newClinicId = clinic?.id ? String(clinic.id) : null;
    const currentClinicId = activeClinic?.id ? String(activeClinic.id) : null;
    console.log(`Exposed setActiveClinic called. Current: ${currentClinicId}, New: ${newClinicId}`);
    if (newClinicId !== currentClinicId) {
      console.log(`Exposed setActiveClinic: ID diferente, llamando a internalSetActiveClinic.`);
      internalSetActiveClinic(clinic);
    } else {
      console.log("Exposed setActiveClinic: ID es el mismo, no se llama.");
    }
  }, [activeClinic?.id, internalSetActiveClinic]);

  // --- Función para cargar cabinas de una clínica específica (CORREGIDA y CON LOGS) ---
  const fetchCabinsForClinic = useCallback(async (clinicId: string, systemId: string) => {
    // <<< ELIMINAR LOG >>>
    // console.log(`[ClinicContext] fetchCabinsForClinic START for clinicId: ${clinicId}, systemId: ${systemId}`);

    if (!clinicId || !systemId) {
        // console.warn(`[ClinicContext] fetchCabinsForClinic: clinicId (${clinicId}) or systemId (${systemId}) is missing.`); // <<< Dejar Warn?
        setActiveClinicCabins(null);
        setIsLoadingCabinsContext(false);
        return;
    }
    
    // <<< ELIMINAR LOG >>>
    // console.log(`[ClinicContext] fetchCabinsForClinic - Fetching cabins for clinic: ${clinicId}`);
    setIsLoadingCabinsContext(true);
    try {
      setError(null);
      const systemId = session.user.systemId;
      console.log(`[ClinicContext] fetchCabinsForClinic - Fetching cabins for clinic: ${clinicId} and systemId: ${systemId}`);
      const response = await fetch(`/api/clinics/${clinicId}/cabins?systemId=${systemId}`);
      if (!response.ok) {
        if (response.status === 404) {
          console.warn(`[ClinicContext] fetchCabinsForClinic - Clinic ${clinicId} not found or doesn't belong to system ${systemId}`);
          setActiveClinicCabins(null); // Limpiar cabinas si la clínica no se encuentra
        } else {
          const errorBody = await response.text(); // Leer como texto por si no es JSON
          console.error(`[ClinicContext] fetchCabinsForClinic - API Error ${response.status}: ${errorBody}`);
          throw new Error(`Error ${response.status} fetching cabins for clinic ${clinicId}`);
        }
      } else {
        const cabinsData: Cabin[] = await response.json();
        console.log(`[ClinicContext] fetchCabinsForClinic - Received cabins data for clinic ${clinicId}:`, cabinsData);
        setActiveClinicCabins(cabinsData);
      }
    } catch (err) {
      console.error(`[ClinicContext] fetchCabinsForClinic - Error fetching cabins for clinic ${clinicId}:`, err);
      setError(err instanceof Error ? err.message : `Error fetching cabins for clinic ${clinicId}`);
      setActiveClinicCabins(null); // Limpiar cabinas en caso de error
    } finally {
      setIsLoadingCabinsContext(false);
      // <<< ELIMINAR LOG >>>
      // console.log(`[ClinicContext] fetchCabinsForClinic END for clinicId: ${clinicId}. Status: ${response?.status ?? 'N/A'}`);
    }
  }, [session, setError, setActiveClinicCabins]); 

  // --- useEffect para cargar cabinas cuando activeClinic cambia (CORREGIDO) --- 
  useEffect(() => {
    const currentClinicId = activeClinic?.id;
    const currentSystemId = session?.user?.systemId; 

    if (currentClinicId && currentSystemId && status === 'authenticated') {
      // console.log(`useEffect[activeClinic.id] - Active clinic changed to ${currentClinicId} for system ${currentSystemId}, fetching cabins.`); // <<< ELIMINAR LOG
      fetchCabinsForClinic(String(currentClinicId), currentSystemId); 
    } else {
      // <<< ELIMINAR LOGS >>>
      // if (!currentClinicId) console.log("useEffect[activeClinic.id] - No active clinic, clearing cabins.");
      // else if (!currentSystemId) console.log(`useEffect[activeClinic.id] - No systemId available for clinic ${currentClinicId}, clearing cabins.`);
      // else if (status !== 'authenticated') console.log(`useEffect[activeClinic.id] - Session not authenticated, clearing cabins.`);
      setActiveClinicCabins(null);
      if (!currentClinicId) setIsLoadingCabinsContext(false);
    }
  }, [activeClinic?.id, fetchCabinsForClinic, session?.user?.systemId, status]); 
  
  const refreshActiveClinicCabins = useCallback(async () => {
    const currentClinicId = activeClinic?.id;
    const currentSystemId = session?.user?.systemId; 

    if (currentClinicId && currentSystemId && status === 'authenticated') {
        // console.log(`refreshActiveClinicCabins - Refreshing cabins for clinic ${currentClinicId}, system ${currentSystemId}`); // <<< ELIMINAR LOG
        await fetchCabinsForClinic(String(currentClinicId), currentSystemId); 
    } else {
        console.warn(`refreshActiveClinicCabins - Cannot refresh: Missing clinicId (${currentClinicId}), systemId (${currentSystemId}), or session not authenticated (${status})`); // <<< DEJAR WARN
    }
  }, [activeClinic?.id, fetchCabinsForClinic, session?.user?.systemId, status]); 
  // --- Fin refreshActiveClinicCabins ---

  // --- Log para verificar cambios en activeClinicCabins ---
  useEffect(() => {
    console.log("ClinicProvider - Estado activeClinicCabins actualizado:", activeClinicCabins);
  }, [activeClinicCabins]);
  // --- Fin Log ---

  const value = useMemo(() => ({
    // Propiedades requeridas por ClinicContextType:
    activeClinic,
    setActiveClinic: exposedSetActiveClinic,
    setActiveClinicById,
    clinics,
    isLoading: isLoadingClinics || isLoadingDetails || isLoadingCabinsContext,
    error,
    refetchClinics: exposedRefetchClinics,
    getAllClinicas: async () => clinics,
    getClinicaById,
    createClinica, 
    updateClinica,
    deleteClinica,
    getActiveClinicas,
    activeClinicCabins,
    isLoadingCabinsContext,
    refreshActiveClinicCabins,
    fetchCabinsForClinic,
  }), [
    activeClinic,
    exposedSetActiveClinic,
    setActiveClinicById,
    clinics,
    isLoadingClinics,
    isLoadingDetails,
    isLoadingCabinsContext,
    error,
    exposedRefetchClinics,
    getClinicaById,
    createClinica,
    updateClinica,
    deleteClinica,
    getActiveClinicas,
    activeClinicCabins,
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

