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

// <<< NUEVO: Definir tipo para las opciones de getBankAccounts >>>
interface GetBankAccountsOptions {
  isActive?: boolean;
  bankId?: string; // Podríamos necesitar otros filtros en el futuro
}

// Obtener todas las cuentas bancarias
export async function getBankAccounts(
  options?: GetBankAccountsOptions
): Promise<BankAccount[]> {
  try {
    // <<< CONSTRUIR query string usando URLSearchParams >>>
    const params = new URLSearchParams();
    if (options?.isActive !== undefined) {
      params.append("isActive", String(options.isActive));
    }
    if (options?.bankId) {
      params.append("bankId", options.bankId);
    }
    const queryString = params.toString();
    const url = queryString ? `/api/bank-accounts?${queryString}` : "/api/bank-accounts";
    // <<< FIN CONSTRUIR query string >>>

    // El interceptor ya devuelve response.data
    const data = await axios.get(url);
    return data;
  } catch (error) {
    console.error("Error al obtener cuentas bancarias:", error);
    throw new Error("No se pudieron cargar las cuentas bancarias");
  }
}

// Obtener una cuenta bancaria específica por ID
export async function getBankAccount(id: string): Promise<BankAccount> {
  try {
    const data = await axios.get(`/api/bank-accounts/${id}`);
    return data;
  } catch (error) {
    console.error(`Error al obtener cuenta bancaria ${id}:`, error);
    throw new Error("No se pudo cargar la cuenta bancaria");
  }
}

// Crear una nueva cuenta bancaria
export async function createBankAccount(data: Omit<BankAccount, "id" | "bank" | "clinic">): Promise<BankAccount> {
  const result = await axios.post("/api/bank-accounts", data);
  return result;
}

// Actualizar una cuenta bancaria existente
export async function updateBankAccount(id: string, data: Partial<Omit<BankAccount, "id" | "bank" | "clinic">>): Promise<BankAccount> {
  const result = await axios.put(`/api/bank-accounts/${id}`, data);
  return result;
}

// Eliminar una cuenta bancaria
export async function deleteBankAccount(id: string): Promise<void> {
  await axios.delete(`/api/bank-accounts/${id}`);
}