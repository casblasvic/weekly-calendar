import axios from "@/lib/axios";

// Interfaz para bancos (devuelta por la API)
export interface Bank {
  id: string;
  name: string;
  code?: string | null;
  systemId: string;
  isGlobal?: boolean;
  accountId?: string | null;
  applicableClinics?: {
    clinicId: string;
    clinic: {
      id: string;
      name: string;
    };
  }[];
  bankAccounts?: {
    id: string;
    accountName: string;
    iban?: string | null;
    currency?: string | null;
    isActive: boolean;
    isGlobal?: boolean;
    applicableClinics?: {
      clinicId: string;
      clinic: {
        id: string;
        name: string;
      };
    }[];
  }[];
}

// Obtener todos los bancos
export async function getBanks(): Promise<Bank[]> {
  try {
    console.log('[getBanks] Starting request...');
    console.log('[getBanks] Axios default baseURL:', axios.defaults.baseURL);
    console.log('[getBanks] Axios withCredentials:', axios.defaults.withCredentials);
    
    // El interceptor de axios ya devuelve response.data, así que 'response' aquí ES la data
    const data = await axios.get("/api/banks");
    console.log('[getBanks] Raw response data:', data);
    console.log('[getBanks] Response data type:', typeof data);
    console.log('[getBanks] Is array?:', Array.isArray(data));
    
    // Verificar que la respuesta sea un array
    if (!Array.isArray(data)) {
      console.error('[getBanks] Response is not an array:', data);
      return [];
    }
    
    console.log('[getBanks] Returning', data.length, 'banks');
    return data; 
  } catch (error: any) {
    console.error("[getBanks] Error details:", {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
      config: error.config,
      url: error.config?.url,
      baseURL: error.config?.baseURL,
    });
    throw error;
  }
}

// Obtener un banco específico por ID
export async function getBank(id: string): Promise<Bank> {
  try {
    const data = await axios.get(`/api/banks/${id}`);
    return data;
  } catch (error) {
    console.error("Error al obtener banco:", error);
    throw new Error("No se pudo cargar el banco");
  }
}

// Crear un nuevo banco
export async function createBank(data: Omit<Bank, 'id' | 'createdAt' | 'updatedAt' | 'applicableClinics' | 'bankAccounts'>): Promise<Bank> {
  try {
    const result = await axios.post("/api/banks", data);
    return result;
  } catch (error) {
    console.error("Error al crear banco:", error);
    throw new Error("No se pudo crear el banco");
  }
}

// Actualizar un banco existente
export async function updateBank(id: string, data: Partial<Omit<Bank, 'id' | 'createdAt' | 'updatedAt'>>): Promise<Bank> {
  try {
    const result = await axios.put(`/api/banks/${id}`, data);
    return result;
  } catch (error) {
    console.error("Error al actualizar banco:", error);
    throw new Error("No se pudo actualizar el banco");
  }
}

// Eliminar un banco
export async function deleteBank(id: string): Promise<void> {
  try {
    await axios.delete(`/api/banks/${id}`);
  } catch (error) {
    console.error("Error al eliminar banco:", error);
    throw new Error("No se pudo eliminar el banco");
  }
}