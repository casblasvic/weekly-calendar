import axios from "@/lib/axios";

// Interfaz para bancos (devuelta por la API)
export interface Bank {
  id: string;
  name: string;
  code?: string | null;
  systemId: string;
  // Añadir aquí otros campos si la API los devuelve y se necesitan en el frontend
}

// Obtener todos los bancos
export async function getBanks(): Promise<Bank[]> {
  try {
    const response = await axios.get("/api/banks");
    // Asegúrate de que la API /api/banks devuelve objetos que coinciden con la interfaz Bank
    return response.data; 
  } catch (error) {
    console.error("Error al obtener bancos:", error);
    throw new Error("No se pudieron cargar los bancos");
  }
}

// Obtener un banco específico por ID
export async function getBank(id: string): Promise<Bank> {
  try {
    const response = await axios.get(`/api/banks/${id}`);
    // Asegúrate de que la API /api/banks/[id] devuelve un objeto que coincide con la interfaz Bank
    return response.data; 
  } catch (error) {
    console.error(`Error al obtener banco ${id}:`, error);
    throw new Error("No se pudo cargar el banco");
  }
}

// Aquí podrían ir otras funciones relacionadas exclusivamente con bancos si las hubiera
// Ejemplo: createBank, updateBank, deleteBank 