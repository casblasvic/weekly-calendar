import axiosInstance from '@/lib/axios-instance';
import { type PaymentMethodDefinitionFormValues } from '@/lib/schemas/payment-method-definition';
import { type PaymentMethodDefinitionData } from '@/app/(main)/configuracion/metodos-pago/components/columns'; // Asegúrate que este tipo es correcto y exportado

const API_URL = 'payment-methods';

/**
 * Obtiene la lista de todas las definiciones de métodos de pago.
 */
export const getPaymentMethods = async (): Promise<PaymentMethodDefinitionData[]> => {
  const response = await axiosInstance.get<PaymentMethodDefinitionData[]>(API_URL);
  return response.data;
};

/**
 * Obtiene una definición de método de pago específica por su ID.
 * @param id - El ID de la definición del método de pago.
 */
export const getPaymentMethodById = async (id: string): Promise<PaymentMethodDefinitionFormValues> => {
  const response = await axiosInstance.get<PaymentMethodDefinitionFormValues>(`${API_URL}/${id}`);
  return response.data;
};

/**
 * Crea una nueva definición de método de pago.
 * @param data - Los datos para la nueva definición.
 */
export const createPaymentMethod = async (data: PaymentMethodDefinitionFormValues): Promise<any> => { // Ajustar el tipo de retorno si la API devuelve algo específico
  const response = await axiosInstance.post(API_URL, data);
  return response.data;
};

/**
 * Actualiza una definición de método de pago existente.
 * @param id - El ID de la definición a actualizar.
 * @param data - Los datos actualizados.
 */
export const updatePaymentMethod = async (id: string, data: PaymentMethodDefinitionFormValues): Promise<any> => { // Ajustar el tipo de retorno si la API devuelve algo específico
  const response = await axiosInstance.put(`${API_URL}/${id}`, data);
  return response.data;
};

/**
 * Elimina una definición de método de pago.
 * @param id - El ID de la definición a eliminar.
 */
export const deletePaymentMethod = async (id: string): Promise<void> => {
  await axiosInstance.delete(`${API_URL}/${id}`);
};
