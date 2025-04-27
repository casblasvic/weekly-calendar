import axios from "@/lib/axios";

// Interfaz para cuentas bancarias (devuelta por la API)
export interface BankAccount {
  id: string;
  accountName: string;
  iban: string;
  currency: string;
  bankId: string;
  bank?: {
    id: string;
    name: string;
  }; // Puede venir o no dependiendo del include en la API
  clinicId?: string | null;
  clinic?: {
    id: string;
    name: string;
  } | null; // Puede venir o no dependiendo del include en la API
  isActive: boolean;
  systemId: string;
  // Añadir aquí otros campos si la API los devuelve y se necesitan en el frontend
}

// Obtener todas las cuentas bancarias
export async function getBankAccounts(): Promise<BankAccount[]> {
  try {
    const response = await axios.get("/api/bank-accounts");
    return response.data;
  } catch (error) {
    console.error("Error al obtener cuentas bancarias:", error);
    throw new Error("No se pudieron cargar las cuentas bancarias");
  }
}

// Obtener cuentas bancarias filtradas por banco
export async function getBankAccountsByBank(bankId: string): Promise<BankAccount[]> {
  try {
    const response = await axios.get(`/api/bank-accounts?bankId=${bankId}`);
    return response.data;
  } catch (error) {
    console.error(`Error al obtener cuentas bancarias del banco ${bankId}:`, error);
    throw new Error("No se pudieron cargar las cuentas bancarias del banco");
  }
}

// Obtener una cuenta bancaria específica por ID
export async function getBankAccount(id: string): Promise<BankAccount> {
  try {
    const response = await axios.get(`/api/bank-accounts/${id}`);
    return response.data;
  } catch (error) {
    console.error(`Error al obtener cuenta bancaria ${id}:`, error);
    throw new Error("No se pudo cargar la cuenta bancaria");
  }
}

// Crear una nueva cuenta bancaria
export const createBankAccount = async (data: Omit<BankAccount, "id" | "bank" | "clinic">): Promise<BankAccount> => {
  const response = await axios.post("/api/bank-accounts", data);
  return response.data;
};

// Actualizar una cuenta bancaria existente
export const updateBankAccount = async (id: string, data: Partial<Omit<BankAccount, "id" | "bank" | "clinic">>): Promise<BankAccount> => {
  const response = await axios.patch(`/api/bank-accounts/${id}`, data);
  return response.data;
};

// Eliminar una cuenta bancaria
export const deleteBankAccount = async (id: string): Promise<void> => {
  await axios.delete(`/api/bank-accounts/${id}`);
}; 