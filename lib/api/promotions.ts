import axiosInstance from '@/lib/axios-instance'; // <<< USAR IMPORTACIÓN POR DEFECTO
// import type { PromotionWithRelations } from '@/lib/types/api-outputs'; // <<< COMENTADO TEMPORALMENTE

// Interfaz para los parámetros de getPromotions
interface GetPromotionsParams {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  clinicId?: string;      // Nuevo parámetro
  includeGlobal?: boolean; // Nuevo parámetro
  // Añade otros filtros que la API pueda soportar (ej: status, type)
  isActive?: boolean;
  type?: string; // PromotionType enum as string?
}

// Interfaz para la respuesta esperada de la API
// Asegúrate de que coincida con lo que devuelve tu endpoint GET /api/promotions
interface PromotionsApiResponse {
  data: any[]; // <<< CAMBIADO a any[] temporalmente
  totalPromotions?: number; // Opcional, si tu API devuelve el total para paginación
  // Otros campos de paginación si existen
}

/**
 * Obtiene una lista de promociones desde la API.
 * Permite filtrar por clínica e incluir globales.
 *
 * @param params - Objeto con parámetros de paginación y filtro.
 * @returns Promesa que resuelve a la respuesta de la API.
 */
export const getPromotions = async (params: GetPromotionsParams = {}): Promise<PromotionsApiResponse> => {
  try {
    // Construir los query parameters para Axios
    const queryParams: Record<string, any> = { ...params };

    // Asegurarse de que los booleanos se envían correctamente si son false
    if (params.includeGlobal !== undefined) {
      queryParams.includeGlobal = String(params.includeGlobal); // Convertir a string 'true'/'false'
    }
     if (params.isActive !== undefined) {
       queryParams.isActive = String(params.isActive); // Convertir a string 'true'/'false'
     }

    console.log('[API Lib] Calling GET /api/promotions with params:', queryParams);

    const response = await axiosInstance.get<PromotionsApiResponse>('/api/promotions', {
      params: queryParams,
    });

    console.log('[API Lib] Received response from GET /api/promotions:', response.data);

    // Devuelve directamente la data de la respuesta de Axios.
    // Asegúrate que esta estructura coincide con PromotionsApiResponse y con lo que espera useQuery.
    // Si la API envuelve los datos (ej: { data: [...] }), solo devuelve response.data.data
    return response.data;

  } catch (error: any) {
    console.error("Error fetching promotions:", error);
    // Podrías relanzar un error más específico o devolver un objeto de error estandarizado
    const errorMessage = error.response?.data?.message || error.message || 'Failed to fetch promotions';
    throw new Error(errorMessage);
  }
};

// Podrías añadir aquí otras funciones relacionadas con promociones (getPromotionById, createPromotion, etc.)
// export const getPromotionById = async (id: string) => { ... };
// export const createPromotion = async (data: PromotionInput) => { ... };
// export const updatePromotion = async (id: string, data: Partial<PromotionInput>) => { ... };
// export const deletePromotion = async (id: string) => { ... }; 