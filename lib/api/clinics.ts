import axios from "axios";
// <<< RE-EXPORTAR TIPO Clinic de Prisma >>>
export type { Clinic } from '@prisma/client'; 
// <<< IMPORTAR TIPO Clinic para uso local >>>
import type { Clinic } from '@prisma/client';
// <<< FIN IMPORTACIÓN >>>

// <<< Usar un placeholder para el tipo del schema Zod >>>
// import type { ClinicFormValues } from '@/lib/schemas/clinic'; 
type ClinicFormValues = any; // Placeholder temporal

// Interfaz para clínicas
/*
interface Clinic {
  id: string;
  name: string;
  address?: string | null;
  city?: string | null;
  postalCode?: string | null;
  province?: string | null;
  countryCode?: string | null;
  currency: string;
  phone?: string | null;
  email?: string | null;
  isActive: boolean;
  systemId: string;
}
*/

// <<< --- Definir tipo para los parámetros de filtro --- >>>
interface GetClinicsParams {
  isActive?: boolean;
  // Añadir otros filtros si son necesarios en el futuro (ej. name, city)
}

// Obtener todas las clínicas
export async function getClinics(params?: GetClinicsParams): Promise<Clinic[]> {
  try {
    // <<< --- Pasar params a axios --- >>>
    const response = await axios.get("/api/clinics", { params });
    return response.data;
  } catch (error) {
    console.error("Error fetching clinics:", error);
    throw error;
  }
}

// Obtener solo clínicas activas
export async function getActiveClinics(): Promise<Clinic[]> {
  try {
    const response = await axios.get("/api/clinics?active=true");
    return response.data;
  } catch (error) {
    console.error("Error al obtener clínicas activas:", error);
    throw new Error("No se pudieron cargar las clínicas activas");
  }
}

// Obtener una clínica específica por ID
export async function getClinic(id: string): Promise<Clinic> {
  try {
    const response = await axios.get(`/api/clinics/${id}`);
    return response.data;
  } catch (error) {
    console.error(`Error al obtener clínica ${id}:`, error);
    throw new Error("No se pudo cargar la clínica");
  }
}

// --- GET /api/clinics/[id] --- 
export async function getClinicById(id: string): Promise<Clinic> { // Asumiendo que devuelve el tipo Clinic completo
  try {
    const response = await axios.get(`/api/clinics/${id}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching clinic ${id}:`, error);
    throw error;
  }
}

// --- POST /api/clinics --- 
export async function createClinic(data: ClinicFormValues): Promise<Clinic> { // Asume que existe ClinicFormValues
  try {
    const response = await axios.post('/api/clinics', data);
    return response.data;
  } catch (error) {
    console.error("Error creating clinic:", error);
    const errorMessage = (error as any).response?.data?.message || (error as Error).message || 'Unknown error';
    throw new Error(errorMessage); 
  }
}

// --- PUT /api/clinics/[id] --- 
export async function updateClinic(id: string, data: Partial<ClinicFormValues>): Promise<Clinic> { // Asume ClinicFormValues
  try {
    const response = await axios.put(`/api/clinics/${id}`, data);
    return response.data;
  } catch (error) {
    console.error(`Error updating clinic ${id}:`, error);
    const errorMessage = (error as any).response?.data?.message || (error as Error).message || 'Unknown error';
    throw new Error(errorMessage);
  }
}

// --- DELETE /api/clinics/[id] --- 
export async function deleteClinic(id: string): Promise<{ message: string }> { 
  try {
    const response = await axios.delete(`/api/clinics/${id}`);
    return response.data;
  } catch (error) {
    console.error(`Error deleting clinic ${id}:`, error);
    const errorMessage = (error as any).response?.data?.message || (error as Error).message || 'Unknown error';
    throw new Error(errorMessage);
  }
} 