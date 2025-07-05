"use client"

import { createContext, useContext, useState, type ReactNode, useEffect, useCallback, useMemo, useRef } from "react"
import { toast } from "@/components/ui/use-toast";
import type { Cabin, Clinic as PrismaClinic } from '@prisma/client'
import { useSession } from "next-auth/react";
import type { ClinicSchedule, ScheduleTemplate as PrismaScheduleTemplate, ScheduleTemplateBlock as PrismaScheduleTemplateBlock } from '@prisma/client';
import type { ClinicaApiOutput } from "@/lib/types/api-outputs";
import { useQueryClient } from '@tanstack/react-query';

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
  isInitialized: boolean // 🔥 CRÍTICO: Previene race condition con appointment queries - NUNCA ELIMINAR
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
  const queryClient = useQueryClient();
  const cachedClinics = queryClient.getQueryData<PrismaClinic[]>(['clinics']) || [];

  // Iniciar estado con datos ya hidratados para evitar spinner innecesario
  const [clinics, setClinics] = useState<PrismaClinic[]>(cachedClinics);
  const [isLoadingClinics, setIsLoadingClinics] = useState(cachedClinics.length === 0);

  // --- Hidratación de activeClinic ----------------------------------------
  const storedActiveId = typeof window !== 'undefined' ? localStorage.getItem('activeClinicId') : null;
  const cachedDetailedClinic = storedActiveId ? queryClient.getQueryData<ClinicaApiOutput>(['clinic', storedActiveId]) : null;

  const [activeClinic, setActiveClinicState] = useState<ClinicaApiOutput | null>(cachedDetailedClinic ?? null);
  // Si ya teníamos clínica detallada en caché, consideramos que no está cargando
  const [isLoadingDetails, setIsLoadingDetails] = useState(cachedDetailedClinic ? false : false);
  const [activeClinicCabins, setActiveClinicCabins] = useState<Cabin[] | null>(null)
  const [isLoadingCabinsContext, setIsLoadingCabinsContext] = useState(false)
  // 🔥 CRÍTICO: isInitialized previene race condition con appointment queries
  // ❌ NUNCA ELIMINAR: Causa múltiples recargas + redirección a /dashboard
  // 📚 VER: docs/clinic-context-race-condition-fix.md
  const [isInitialized, setIsInitialized] = useState(cachedDetailedClinic ? true : false)
  const [error, setError] = useState<string | null>(null)
  const [currentlyFetchingClinicId, setCurrentlyFetchingClinicId] = useState<string | null>(null);
  const [isFetchingClinics, setIsFetchingClinics] = useState(false);
  const fetchClinicsCalledRef = useRef<boolean>(false);
  const { data: session, status } = useSession();

  // ----------------------------------------------------------------------------------
  // 🔥 MICRO-OPTIMIZACIÓN UX ---------------------------------------------------------
  // Cuando `activeClinic` ya está disponible pero `isLoadingClinics` sigue en true unos
  // milisegundos, la UI muestra "Cargando clínica..." aunque ya tengamos la clínica
  // seleccionada.  Este useEffect baja inmediatamente `isLoadingClinics` a false en
  // cuanto detecta que existe una clínica activa.  No altera ningún flujo de datos
  // porque la lista de clínicas ya se ha cargado.
  // ----------------------------------------------------------------------------------

  useEffect(() => {
    if (activeClinic && isLoadingClinics) {
      setIsLoadingClinics(false);
    }
  }, [activeClinic, isLoadingClinics]);

  // ✅ MEMOIZAR internalSetActiveClinic para evitar re-creaciones
  const internalSetActiveClinic = useCallback((clinic: ClinicaApiOutput | null) => {
    console.log("[ClinicContext] internalSetActiveClinic called with:", JSON.stringify(clinic, (key, value) => key === 'linkedScheduleTemplate' || key === 'independentScheduleBlocks' ? '...' : value, 2));
    
    const previousClinicId = activeClinic?.id;
    const newClinicId = clinic?.id;
    
    setActiveClinicState(clinic);
    if (clinic?.id) {
      localStorage.setItem('activeClinicId', String(clinic.id));
      
      // ✅ PREFETCH INTELIGENTE: Solo si cambió la clínica
      if (String(previousClinicId) !== String(newClinicId)) {
        console.log(`[ClinicContext] 🚀 Clínica cambió de ${previousClinicId} a ${newClinicId}. Iniciando prefetch de agenda...`);
        
        // ✅ PREFETCH usando QueryClient directamente (no hooks)
        import('@/lib/query-client').then(({ getQueryClient }) => {
          import('@/lib/hooks/use-appointments-query').then(({ getCurrentWeekKey, getWeekKey, getDayKey }) => {
            const queryClient = getQueryClient();
            const clinicIdStr = String(clinic.id);
            
            try {
              const currentDate = new Date(); // ✅ USAR FECHA ACTUAL VÁLIDA
              const currentWeek = getCurrentWeekKey();
              const prevWeek = getWeekKey(currentDate, -1);
              const nextWeek = getWeekKey(currentDate, +1);
              const today = getDayKey(currentDate);
            
              // ✅ PREFETCH SLIDING WINDOW (3 semanas) + DÍA ACTUAL
              const prefetchPromises = [
                // Semanas
                ...([prevWeek, currentWeek, nextWeek].map(week =>
                  queryClient.prefetchQuery({
                    queryKey: ['appointments', 'week', week, clinicIdStr],
                    queryFn: async () => {
                      const response = await fetch(`/api/appointments?clinicId=${clinicIdStr}&week=${week}`);
                      if (!response.ok) throw new Error('Error fetching week appointments');
                      const data = await response.json();
                      return {
                        appointments: data.map((apt: any) => ({ ...apt, date: new Date(apt.date) })),
                        weekKey: week
                      };
                    },
                    staleTime: 2 * 60 * 1000, // 2 minutos
                  })
                )),
                // Día actual
                queryClient.prefetchQuery({
                  queryKey: ['appointments', 'day', today, clinicIdStr],
                  queryFn: async () => {
                    const response = await fetch(`/api/appointments?clinicId=${clinicIdStr}&date=${today}`);
                    if (!response.ok) throw new Error('Error fetching day appointments');
                    const data = await response.json();
                    return {
                      appointments: data.map((apt: any) => ({ ...apt, date: new Date(apt.date) })),
                      dayKey: today
                    };
                  },
                  staleTime: 30 * 1000, // 30 segundos
                })
              ];
            
              Promise.all(prefetchPromises)
                .then(() => {
                  // console.log(`[ClinicContext] ✅ Prefetch completado para clínica ${clinicIdStr}`); // Log optimizado
                })
                .catch(error => {
                  console.error(`[ClinicContext] ❌ Error en prefetch para clínica ${clinicIdStr}:`, error);
                });
            
            } catch (error) {
              console.error(`[ClinicContext] ❌ Error generando keys de prefetch para clínica ${clinicIdStr}:`, error);
            }
          });
        }).catch(error => {
          console.error('[ClinicContext] ❌ Error importando utils de prefetch:', error);
        });
      }
    } else {
      localStorage.removeItem('activeClinicId');
    }
  }, []); // ✅ Remover activeClinic?.id de dependencies para evitar loops

  // ✅ MEMOIZAR fetchAndUpdateDetailedClinic para evitar re-creaciones
  const fetchAndUpdateDetailedClinic = useCallback(async (clinicId: string) => {
    if (status !== 'authenticated') {
      console.log(`[ClinicContext] fetchAndUpdateDetailedClinic - Not authenticated, returning for ${clinicId}`);
      return;
    }
    if (!clinicId) {
      console.log(`[ClinicContext] fetchAndUpdateDetailedClinic - No clinicId provided, returning.`);
      return;
    }
    
    const idToFetch = String(clinicId);
    
    // ✅ GUARD CRÍTICO: Evitar múltiples llamadas simultáneas para la misma clínica
    if (currentlyFetchingClinicId === idToFetch) {
      console.log(`[ClinicContext] fetchAndUpdateDetailedClinic - Already fetching details for ${idToFetch}, skipping duplicate call`);
      return;
    }
    
    // ✅ GUARD ADICIONAL: Si ya está cargando detalles, no hacer otra llamada
    if (isLoadingDetails) {
      console.log(`[ClinicContext] fetchAndUpdateDetailedClinic - Already loading details for another clinic, skipping ${idToFetch}`);
      return;
    }
    
    setCurrentlyFetchingClinicId(idToFetch);
    setIsLoadingDetails(true);
    try {
      setError(null);
      const response = await fetch(`/api/clinics/${clinicId}`);
      if (!response.ok) {
        throw new Error(`Error ${response.status} fetching detailed clinic ${clinicId}`);
      }
      const detailedClinicData: ClinicaApiOutput = await response.json();
      console.log(`[ClinicContext] fetchAndUpdateDetailedClinic - Received detailed data for ${idToFetch}. Updating active clinic state.`);
      
      // Logs de depuración para las fuentes de horario (solo en desarrollo)
      if (process.env.NODE_ENV === 'development') {
        console.log(`[ClinicContext] Debug schedule sources for clinic ${clinicId}:`);
        console.log(`  - independentSchedule:`, detailedClinicData.independentSchedule ? 'Exists' : 'null/undefined', detailedClinicData.independentSchedule);
        console.log(`  - linkedScheduleTemplate:`, detailedClinicData.linkedScheduleTemplate ? 'Exists' : 'null/undefined', detailedClinicData.linkedScheduleTemplate);
        if (detailedClinicData.linkedScheduleTemplate) {
          console.log(`    - linkedScheduleTemplate.blocks:`, detailedClinicData.linkedScheduleTemplate.blocks && detailedClinicData.linkedScheduleTemplate.blocks.length > 0 ? `Exists (${detailedClinicData.linkedScheduleTemplate.blocks.length} blocks)` : 'null/undefined/empty', detailedClinicData.linkedScheduleTemplate.blocks);
        }
        console.log(`  - independentScheduleBlocks:`, detailedClinicData.independentScheduleBlocks && detailedClinicData.independentScheduleBlocks.length > 0 ? `Exists (${detailedClinicData.independentScheduleBlocks.length} blocks)` : 'null/undefined/empty', detailedClinicData.independentScheduleBlocks);
      }
      
      // Actualizar clínica activa y cachear resultado detallado
      internalSetActiveClinic(detailedClinicData);
      if (detailedClinicData.id) {
        queryClient.setQueryData(['clinic', String(detailedClinicData.id)], detailedClinicData);
      }
      
      // Asignar las cabinas recibidas directamente para que la UI las tenga de inmediato
      if (Array.isArray(detailedClinicData.cabins)) {
        console.log(`[ClinicContext] fetchAndUpdateDetailedClinic - Setting activeClinicCabins from detailedClinicData.cabins (len=${detailedClinicData.cabins.length})`);
        setActiveClinicCabins(detailedClinicData.cabins);
      }
      
    } catch (err) {
      console.error(`[ClinicContext] fetchAndUpdateDetailedClinic - ERROR - Error fetching details for ${idToFetch}:`, err);
      setError(err instanceof Error ? err.message : `Error fetching details for clinic ${idToFetch}`);
    } finally {
      setCurrentlyFetchingClinicId(null);
      setIsLoadingDetails(false);
      // ✅ MARCAR COMO INICIALIZADO cuando se completa la carga de detalles
      // 🔥 CRÍTICO: isInitialized=true permite que appointment queries se ejecuten
      // ❌ NO ELIMINAR: Previene race condition y múltiples recargas
      if (!isInitialized) {
        console.log(`[ClinicContext] fetchAndUpdateDetailedClinic - Clinic details loaded, marking as initialized.`);
        setIsInitialized(true);
      }
      console.log(`[ClinicContext] fetchAndUpdateDetailedClinic - END - Finished for clinic: ${idToFetch}`);
    }
  }, [internalSetActiveClinic, setError, status, isInitialized, currentlyFetchingClinicId, isLoadingDetails]); // ✅ Minimizar dependencies

  // ✅ MEMOIZAR setActiveClinicById
  const setActiveClinicById = useCallback(async (id: string) => {
    const currentId = activeClinic?.id || 'null';
    console.log(`[ClinicContext] setActiveClinicById called for ID: ${id}. Current active: ${currentId}`);
    
    if (!id) {
        console.warn("[ClinicContext] setActiveClinicById called with invalid ID");
        return;
    }
    
    await fetchAndUpdateDetailedClinic(id);
  }, [fetchAndUpdateDetailedClinic, activeClinic?.id]);

  // ✅ MEMOIZAR fetchClinics
  const fetchClinics = useCallback(async () => {
    if (status !== 'authenticated') {
        console.log("[ClinicContext] Sesión no autenticada, saltando fetchClinics.");
        setIsLoadingClinics(false);
        setClinics([]);
        setActiveClinicState(null);
        setActiveClinicCabins(null);
        return;
    }
    
    // ✅ GUARD: Evitar múltiples llamadas simultáneas
    if (isFetchingClinics) {
      console.log("[ClinicContext] Ya está cargando clínicas, saltando llamada duplicada.");
      return;
    }
    
    console.log("ClinicContext: Iniciando fetchClinics");
    setIsFetchingClinics(true);
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
      queryClient.setQueryData(['clinics'], loadedClinics);
      console.log("ClinicContext: Estado 'clinics' actualizado.");
    } catch (err) {
      console.error("Error al cargar clínicas desde API:", err);
      setError(err instanceof Error ? err.message : 'Error desconocido al cargar clínicas');
      setClinics([]);
    } finally {
      setIsFetchingClinics(false);
      setIsLoadingClinics(false);
      console.log("ClinicContext: fetchClinics finalizado.");
    }
  }, [setError, setIsLoadingClinics, status, isFetchingClinics]);

  // ✅ PRIMER useEffect: Solo para autenticación y fetch inicial
  useEffect(() => {
     if (status === 'authenticated') {
        // ✅ GUARD REF: Solo llamar una vez por sesión de autenticación
        if (!fetchClinicsCalledRef.current) {
          fetchClinicsCalledRef.current = true;
          fetchClinics();
        }
    } else if (status === 'unauthenticated') {
        fetchClinicsCalledRef.current = false; // ✅ Resetear flag
        setClinics([]); 
        internalSetActiveClinic(null);
        setActiveClinicCabins(null);
        setIsLoadingClinics(false);
        setIsInitialized(true);
        setError(null);
    } else {
        // status === 'loading'
        fetchClinicsCalledRef.current = false; // ✅ Resetear flag mientras carga
        setIsLoadingClinics(true);
        setIsInitialized(false);
    }
  }, [fetchClinics, status, internalSetActiveClinic]); // ✅ Dependencies mínimas

  // ✅ SEGUNDO useEffect: Solo para activación de clínica cuando cambien las clínicas
  useEffect(() => {
    // Si está cargando o no hay clínicas, no hacer nada aún
    if (isLoadingClinics || !clinics || clinics.length === 0) {
      // Si no hay clínicas pero sí una activa, limpiarla
      if (!isLoadingClinics && clinics?.length === 0 && activeClinic) {
          console.log("[ClinicContext] useEffect - No clinics available, clearing active clinic.");
          internalSetActiveClinic(null);
      }
      
      // ✅ MARCAR COMO INICIALIZADO si no está cargando y no hay clínicas
      if (!isLoadingClinics && clinics?.length === 0) {
        console.log("[ClinicContext] useEffect - No clinics available, marking as initialized.");
        setIsInitialized(true);
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

      // ✅ GUARD ADICIONAL: Solo proceder si no estamos ya cargando detalles
      if (isLoadingDetails) {
        console.log(`[ClinicContext] useEffect - Already loading details for a clinic, skipping activation for ${clinicIdToFetch}`);
        return;
      }

      // ¿Es diferente de la clínica activa actual?
      if (clinicIdToFetch !== currentActiveClinicId) {
        console.log(`[ClinicContext] useEffect - Clinic to activate (${clinicIdToFetch}) differs from current (${currentActiveClinicId}). Fetching details.`);
        fetchAndUpdateDetailedClinic(clinicIdToFetch);
      } else if (clinicIdToFetch === currentActiveClinicId) {
          console.log(`[ClinicContext] useEffect - Clinic ${clinicIdToFetch} is already active. Load finished (details presence checked elsewhere).`);
          if (!isInitialized) {
            console.log(`[ClinicContext] useEffect - Clinic ${clinicIdToFetch} already active, marking as initialized.`);
            setIsInitialized(true);
          }
      }
    } else {
      console.log("[ClinicContext] useEffect - No clinic could be selected for activation. Clearing active clinic.");
      if(activeClinic) {
         internalSetActiveClinic(null); 
      }
      if (!isInitialized) {
        console.log("[ClinicContext] useEffect - No clinic to activate, marking as initialized.");
        setIsInitialized(true);
      }
    }

  }, [clinics, isLoadingClinics, isLoadingDetails, isInitialized]); // ✅ Solo dependencies esenciales

  // ✅ MEMOIZAR getClinicaById
  const getClinicaById = useCallback(async (id: string): Promise<ClinicaApiOutput | null> => {
    if (status !== 'authenticated') return null;
    
    const clinicIdString = String(id); 
    if (process.env.NODE_ENV === 'development') {
      console.log(`getClinicaById: Fetching clinic ${clinicIdString} from API (Context)`);
    }
    setError(null);
    try {
      const response = await fetch(`/api/clinics/${clinicIdString}`);
      if (response.status === 404) {
          if (process.env.NODE_ENV === 'development') {
            console.log(`getClinicaById: Clinic ${clinicIdString} not found (404)`);
          }
          return null;
      }
      if (!response.ok) {
        console.error(`getClinicaById: API error fetching ${clinicIdString}: ${response.status}`);
        throw new Error(`Error ${response.status} fetching clinic`);
      }
      const clinica: ClinicaApiOutput = await response.json();
      if (process.env.NODE_ENV === 'development') {
        console.log(`getClinicaById: Successfully fetched clinic ${clinicIdString}`);
      }
      return clinica;
    } catch (err) {
      console.error(`getClinicaById: Catch block error fetching ${clinicIdString}:`, err);
      setError(err instanceof Error ? err.message : 'Error desconocido obteniendo clínica');
      return null;
    } 
  }, [setError, status]);

  // ✅ MEMOIZAR createClinica
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
  }, [status, setIsLoadingClinics, setError, setClinics, activeClinic, fetchAndUpdateDetailedClinic]);

  // ✅ MEMOIZAR updateClinica
  const updateClinica = useCallback(async (id: string, data: ClinicUpdatePayload): Promise<ClinicaApiOutput | null> => {
    if (status !== 'authenticated') return null;
    
    const clinicIdString = String(id);
    setIsLoadingClinics(true);
    setError(null);
    let response: Response | null = null;

    // Campos permitidos directamente del modelo PrismaClinic
    const allowedPrismaFields: (keyof PrismaClinic)[] = [
        'name', 'address', 'city', 'postalCode', 'province', 'currency', 'phone', 
        'email', 'isActive', 'prefix', 'commercialName', 'businessName', 'cif', 
        'phone2', 'initialCash', 'ticketSize', 'ip', 'blockSignArea', 'blockPersonalData', 
        'delayedPayments', 'affectsStats', 'appearsInApp', 'scheduleControl', 
        'professionalSkills', 'notes', 'tariffId', 'linkedScheduleTemplateId',
        'countryIsoCode', 'languageIsoCode', 'phone1CountryIsoCode', 'phone2CountryIsoCode' 
    ];

    // Campos extra permitidos (que no están en PrismaClinic pero la API maneja)
    const allowedExtraFields: string[] = [
        'independentScheduleData', 'deleteIndependentBlocks', 'cabinsOrder'
    ];

    // Construir el payload filtrado
    const payload: Record<string, any> = {};
    for (const key in data) {
        if (allowedPrismaFields.includes(key as keyof PrismaClinic) || allowedExtraFields.includes(key)) {
            payload[key] = (data as any)[key];
        }
    }

    // Manejo especial para campos booleanos opcionales que pueden ser null
    const booleanFieldsNullable: (keyof PrismaClinic)[] = [
      'blockSignArea', 'blockPersonalData', 'delayedPayments', 'affectsStats',
      'appearsInApp', 'scheduleControl', 'professionalSkills'
    ];
    booleanFieldsNullable.forEach(field => {
        if (data.hasOwnProperty(field) && data[field] === null) {
            payload[field] = null;
        }
    });

    // Lógica existente para modificar payload
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

    if (process.env.NODE_ENV === 'development') {
      console.log(`[ClinicContext] updateClinica - Final Filtered Payload for ${clinicIdString}:`, JSON.stringify(payload, null, 2));
    }

    try {
      response = await fetch(`/api/clinics/${clinicIdString}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
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
  }, [status, setIsLoadingClinics, setError, setClinics, activeClinic, internalSetActiveClinic]);

  // ✅ MEMOIZAR deleteClinica
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
         const nextClinicToActivate = remainingClinics.find(c => c.isActive) || (remainingClinics.length > 0 ? remainingClinics[0] : null);
         if (nextClinicToActivate && nextClinicToActivate.id) {
            console.log(`[ClinicContext] deleteClinica - Deleted active clinic. Activating next clinic ${nextClinicToActivate.id}. Fetching details...`);
            fetchAndUpdateDetailedClinic(String(nextClinicToActivate.id));
         } else {
            console.log(`[ClinicContext] deleteClinica - Deleted active clinic. No remaining clinics to activate. Clearing active clinic.`);
            internalSetActiveClinic(null);
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
  }, [status, clinics, setClinics, setIsLoadingClinics, setError, activeClinic, internalSetActiveClinic, fetchAndUpdateDetailedClinic]);

  // ✅ MEMOIZAR getActiveClinicas
  const getActiveClinicas = useCallback(async (): Promise<PrismaClinic[]> => {
    if (status !== 'authenticated') return [];
    return clinics.filter(c => c.isActive);
  }, [clinics, status]);

  // ✅ MEMOIZAR exposedRefetchClinics
  const exposedRefetchClinics = useCallback(async () => {
    await fetchClinics();
  }, [fetchClinics]);

  // ✅ MEMOIZAR exposedSetActiveClinic
  const exposedSetActiveClinic = useCallback((clinic: ClinicaApiOutput | null) => {
    const newClinicId = clinic?.id ? String(clinic.id) : null;
    const currentClinicId = activeClinic?.id ? String(activeClinic.id) : null;
    
    console.log(`[ClinicContext] exposedSetActiveClinic called. Current: ${currentClinicId}, New: ${newClinicId}`);

    if (newClinicId !== currentClinicId) {
      if (clinic && newClinicId) {
        // Verificar si la clínica proporcionada tiene datos de horario.
        const hasScheduleData = clinic.linkedScheduleTemplate !== undefined || clinic.independentSchedule !== undefined;

        if (hasScheduleData) {
          console.log(`[ClinicContext] exposedSetActiveClinic: ID diferente. Clínica proporcionada tiene datos de horario. Llamando a internalSetActiveClinic.`);
          internalSetActiveClinic(clinic);
        } else {
          console.log(`[ClinicContext] exposedSetActiveClinic: ID diferente. Clínica proporcionada NO tiene datos de horario. Llamando a fetchAndUpdateDetailedClinic para ${newClinicId}.`);
          fetchAndUpdateDetailedClinic(newClinicId);
        }
      } else {
        console.log(`[ClinicContext] exposedSetActiveClinic: ID diferente. Nueva clínica es null. Llamando a internalSetActiveClinic con null.`);
        internalSetActiveClinic(null);
      }
    } else {
      console.log("[ClinicContext] exposedSetActiveClinic: ID es el mismo, no se hace nada.");
    }
  }, [activeClinic?.id, internalSetActiveClinic, fetchAndUpdateDetailedClinic]);

  // ✅ MEMOIZAR fetchCabinsForClinic
  const fetchCabinsForClinic = useCallback(async (clinicId: string, systemId: string) => {
    if (!clinicId || !systemId) {
        setActiveClinicCabins(null);
        setIsLoadingCabinsContext(false);
        return;
    }
    
    setIsLoadingCabinsContext(true);
    try {
      setError(null);
      
      const response = await fetch(`/api/clinics/${clinicId}/cabins?systemId=${systemId}`);
      if (!response.ok) {
        if (response.status === 404) {
          console.warn(`[ClinicContext] fetchCabinsForClinic - Clinic ${clinicId} not found or doesn't belong to system ${systemId}`);
          setActiveClinicCabins(null);
        } else {
          const errorBody = await response.text();
          console.error(`[ClinicContext] fetchCabinsForClinic - API Error ${response.status}: ${errorBody}`);
          throw new Error(`Error ${response.status} fetching cabins for clinic ${clinicId}`);
        }
      } else {
        const cabinsData: Cabin[] = await response.json();
        setActiveClinicCabins(cabinsData);
        // 🗄️ Guardar en React-Query para hidratación futura (IndexedDB persister)
        queryClient.setQueryData(['cabins', clinicId], cabinsData); // TODO-MULTIUSER: invalidar vía WS
      }
    } catch (err) {
      console.error(`[ClinicContext] fetchCabinsForClinic - Error fetching cabins for clinic ${clinicId}:`, err);
      setError(err instanceof Error ? err.message : `Error fetching cabins for clinic ${clinicId}`);
      setActiveClinicCabins(null);
    } finally {
      setIsLoadingCabinsContext(false);
    }
  }, [setError, setActiveClinicCabins, queryClient]);

  // ✅ MEMOIZAR refreshActiveClinicCabins
  const refreshActiveClinicCabins = useCallback(async () => {
    const currentClinicId = activeClinic?.id;
    const currentSystemId = session?.user?.systemId; 

    if (currentClinicId && currentSystemId && status === 'authenticated') {
        await fetchCabinsForClinic(String(currentClinicId), currentSystemId); 
    } else {
        console.warn(`refreshActiveClinicCabins - Cannot refresh: Missing clinicId (${currentClinicId}), systemId (${currentSystemId}), or session not authenticated (${status})`);
    }
  }, [activeClinic?.id, fetchCabinsForClinic, session?.user?.systemId, status]);

  // ✅ useEffect para cargar cabinas cuando activeClinic cambia 
  useEffect(() => {
    const currentClinicId = activeClinic?.id;
    const currentSystemId = session?.user?.systemId; 

    if (currentClinicId && currentSystemId && status === 'authenticated') {
      fetchCabinsForClinic(String(currentClinicId), currentSystemId); 
    } else {
      // Solo limpiamos las cabinas si NO hay clínica activa
      if (!currentClinicId) {
        setActiveClinicCabins(null);
        setIsLoadingCabinsContext(false);
      }
    }
  }, [activeClinic?.id, fetchCabinsForClinic, session?.user?.systemId, status]);

  // --- Log para verificar cambios en activeClinicCabins ---
  useEffect(() => {
    // console.log("ClinicProvider - Estado activeClinicCabins actualizado:", activeClinicCabins); // Log optimizado
  }, [activeClinicCabins]);
  // --- Fin Log ---

  // ---------------------------------------------------------------------------
  // ✨ HIDRATACIÓN INSTANTÁNEA DE CLÍNICAS -------------------------------------
  // Leemos la query ['clinics'] desde el caché persistido (IndexedDB). Si existe,
  // llenamos `clinics` y desactivamos `isLoadingClinics` antes de hacer el fetch
  // real, evitando el spinner "Cargando clínica…". El fetch posterior actualizará
  // los datos y la caché, por lo que la UI no se queda obsoleta.
  // TODO-MULTIUSER: cuando añadamos WebSocket broadcast, invalidaremos esta query
  // en todos los clientes para mantener sincronía.
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const cached = queryClient.getQueryData<PrismaClinic[]>(['clinics']);
    if (cached && cached.length > 0) {
      console.log('[ClinicContext] Hidratando clínicas desde cache persistido.');
      setClinics(cached);
      setIsLoadingClinics(false);
    }
  }, []);

  const value = useMemo(() => ({
    // Propiedades requeridas por ClinicContextType:
    activeClinic,
    setActiveClinic: exposedSetActiveClinic,
    setActiveClinicById,
    clinics,
    isLoading: isLoadingClinics || isLoadingDetails || isLoadingCabinsContext,
    isInitialized,
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
    isInitialized,
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

