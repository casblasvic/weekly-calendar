import axios from 'axios';
import type { ClinicPaymentSetting, Clinic, PaymentMethodDefinition, BankAccount, PosTerminal, PaymentMethodType } from '@prisma/client'; // Importar tipos completos de Prisma
import type { ClinicPaymentSettingFormValues } from '@/lib/schemas/clinic-payment-setting'; // Importar tipo del formulario

// Tipo extendido que esperamos de la API GET (con relaciones)
// Asegúrate que coincide con el include de la API
export type ClinicPaymentSettingWithRelations = ClinicPaymentSetting & {
  clinic: Pick<Clinic, 'id' | 'name'>;
  paymentMethodDefinition: Pick<PaymentMethodDefinition, 'id' | 'name'> & { type: PaymentMethodType }; // Ajustar según el include real
  receivingBankAccount?: Pick<BankAccount, 'id' | 'accountName' | 'iban'> | null;
  posTerminal?: (Pick<PosTerminal, 'id' | 'name'> & { 
    bankAccount?: Pick<BankAccount, 'id' | 'accountName' | 'iban'> | null 
  }) | null;
};

// --- GET /api/clinic-payment-settings --- 
export async function getClinicPaymentSettings(
  params: { 
    clinicId?: string;
    paymentMethodDefinitionId?: string;
    isActiveInClinic?: boolean;
  } = {}
): Promise<ClinicPaymentSettingWithRelations[]> {
  try {
    const response = await axios.get('/api/clinic-payment-settings', {
      params: params // Pasar los filtros como query params
    });
    return response.data;
  } catch (error) {
    console.error("Error fetching clinic payment settings:", error);
    // Lanzar el error para que react-query lo maneje
    throw error;
  }
}

// --- GET /api/clinic-payment-settings/[id] --- 
export async function getClinicPaymentSettingById(
  id: string
): Promise<ClinicPaymentSettingWithRelations> {
  try {
    const response = await axios.get(`/api/clinic-payment-settings/${id}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching clinic payment setting ${id}:`, error);
    throw error;
  }
}

// --- POST /api/clinic-payment-settings --- 
export async function createClinicPaymentSetting(
  data: ClinicPaymentSettingFormValues
): Promise<ClinicPaymentSettingWithRelations> {
  try {
    const response = await axios.post('/api/clinic-payment-settings', data);
    return response.data;
  } catch (error) {
    console.error("Error creating clinic payment setting:", error);
    // Extraer mensaje de error de la respuesta si existe
    const errorMessage = (error as any).response?.data?.message || (error as Error).message || 'Unknown error';
    throw new Error(errorMessage); // Lanzar error con mensaje específico
  }
}

// --- PATCH /api/clinic-payment-settings/[id] --- 
export async function updateClinicPaymentSetting(
  id: string,
  data: Partial<ClinicPaymentSettingFormValues> // Usar Partial para actualizaciones parciales
): Promise<ClinicPaymentSettingWithRelations> {
  try {
    const response = await axios.patch(`/api/clinic-payment-settings/${id}`, data);
    return response.data;
  } catch (error) {
    console.error(`Error updating clinic payment setting ${id}:`, error);
    const errorMessage = (error as any).response?.data?.message || (error as Error).message || 'Unknown error';
    throw new Error(errorMessage);
  }
}

// --- DELETE /api/clinic-payment-settings/[id] --- 
export async function deleteClinicPaymentSetting(
  id: string
): Promise<{ message: string }> { // La API devuelve un objeto con mensaje
  try {
    const response = await axios.delete(`/api/clinic-payment-settings/${id}`);
    return response.data;
  } catch (error) {
    console.error(`Error deleting clinic payment setting ${id}:`, error);
    const errorMessage = (error as any).response?.data?.message || (error as Error).message || 'Unknown error';
    throw new Error(errorMessage);
  }
} 