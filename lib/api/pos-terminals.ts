import axios from "axios";
import { z } from "zod";

// Tipos para los terminales POS
export interface PosTerminal {
  id: string;
  name: string;
  terminalIdProvider?: string | null;
  bankAccountId: string;
  bankAccount: {
    id: string;
    accountName: string;
    iban: string;
    bank: {
      id: string;
      name: string;
    };
  };
  // clinicId ya no es necesario si tenemos applicableClinics
  // clinicId?: string | null; 
  // clinic?: { 
  //   id: string;
  //   name: string;
  // } | null;
  provider?: string | null;
  isActive: boolean;
  // <<< --- CAMPOS AÑADIDOS --- >>>
  isGlobal: boolean;
  applicableClinics?: { 
    clinic: { 
      id: string; 
      name: string; 
    }; 
  }[]; // Array de clínicas aplicables
  // <<< --- FIN CAMPOS AÑADIDOS --- >>>
}

// Esquema de validación para crear/actualizar un terminal POS
export const posTerminalSchema = z.object({
  name: z.string().min(1, { message: "El nombre es obligatorio" }),
  terminalIdProvider: z.string().optional(),
  bankAccountId: z.string().min(1, { message: "La cuenta bancaria es obligatoria" }),
  clinicId: z.string().optional().nullable(),
  provider: z.string().optional(),
  isActive: z.boolean().default(true),
});

export type PosTerminalFormValues = z.infer<typeof posTerminalSchema>;

// <<< NUEVO: Definir tipo para las opciones de getPosTerminals >>>
interface GetPosTerminalsOptions {
  isActive?: boolean;
  includeBankAccount?: boolean;
  // Añadir otros filtros si son necesarios en el futuro
}

// <<< MODIFICAR getPosTerminals para aceptar opciones >>>
export async function getPosTerminals(
  options?: GetPosTerminalsOptions
): Promise<PosTerminal[]> {
  try {
    // Construir parámetros de consulta
    const params = new URLSearchParams();
    if (options?.isActive !== undefined) {
      params.append('isActive', String(options.isActive));
    }
    if (options?.includeBankAccount !== undefined) {
      params.append('includeBankAccount', String(options.includeBankAccount));
    }
    
    const queryString = params.toString();
    const apiUrl = `/api/pos-terminals${queryString ? `?${queryString}` : ''}`;
    
    console.log(`[getPosTerminals] Fetching from: ${apiUrl}`); // Log para depuración
    
    const response = await axios.get(apiUrl);
    return response.data;
  } catch (error) {
    console.error("Error al obtener terminales POS:", error);
    throw new Error("No se pudieron cargar los terminales POS");
  }
}

// Obtener un terminal POS específico por ID
export async function getPosTerminal(id: string): Promise<PosTerminal> {
  try {
    const response = await axios.get(`/api/pos-terminals/${id}`);
    return response.data;
  } catch (error) {
    console.error(`Error al obtener terminal POS ${id}:`, error);
    throw new Error("No se pudo cargar el terminal POS");
  }
}

// Crear un nuevo terminal POS
export async function createPosTerminal(data: PosTerminalFormValues): Promise<PosTerminal> {
  try {
    const response = await axios.post("/api/pos-terminals", data);
    return response.data;
  } catch (error) {
    console.error("Error al crear terminal POS:", error);
    if (axios.isAxiosError(error) && error.response) {
      // Si el servidor devuelve un mensaje de error, lo usamos
      throw new Error(
        error.response.data.error || "No se pudo crear el terminal POS"
      );
    }
    throw new Error("No se pudo crear el terminal POS");
  }
}

// Actualizar un terminal POS existente
export async function updatePosTerminal(
  id: string, 
  data: PosTerminalFormValues
): Promise<PosTerminal> {
  try {
    const response = await axios.put(`/api/pos-terminals/${id}`, data);
    return response.data;
  } catch (error) {
    console.error(`Error al actualizar terminal POS ${id}:`, error);
    if (axios.isAxiosError(error) && error.response) {
      throw new Error(
        error.response.data.error || "No se pudo actualizar el terminal POS"
      );
    }
    throw new Error("No se pudo actualizar el terminal POS");
  }
}

// Eliminar un terminal POS
export async function deletePosTerminal(id: string): Promise<void> {
  try {
    await axios.delete(`/api/pos-terminals/${id}`);
  } catch (error) {
    console.error(`Error al eliminar terminal POS ${id}:`, error);
    if (axios.isAxiosError(error) && error.response) {
      throw new Error(
        error.response.data.error || "No se pudo eliminar el terminal POS"
      );
    }
    throw new Error("No se pudo eliminar el terminal POS");
  }
} 