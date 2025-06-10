import axios, { AxiosInstance, AxiosResponse, AxiosRequestConfig } from 'axios';

// Interfaz personalizada para nuestra instancia de Axios
// Asegura que los métodos devuelvan T (los datos) en lugar de AxiosResponse<T>
interface ApiClientInstance extends AxiosInstance {
  get<T = any, R = T, D = any>(url: string, config?: AxiosRequestConfig<D>): Promise<R>;
  post<T = any, R = T, D = any>(url: string, data?: D, config?: AxiosRequestConfig<D>): Promise<R>;
  put<T = any, R = T, D = any>(url: string, data?: D, config?: AxiosRequestConfig<D>): Promise<R>;
  delete<T = any, R = T, D = any>(url: string, config?: AxiosRequestConfig<D>): Promise<R>;
  patch<T = any, R = T, D = any>(url: string, data?: D, config?: AxiosRequestConfig<D>): Promise<R>;
}

// Obtenemos la URL base desde las variables de entorno
// En desarrollo usa localhost:3000, en producción usará tu dominio
const baseURL = process.env.NEXT_PUBLIC_API_URL || '';

console.log('[Axios Config] Base URL from env:', baseURL);
console.log('[Axios Config] Environment:', process.env.NODE_ENV);

// Si no hay baseURL y estamos en cliente, usar la URL actual
const finalBaseURL = baseURL || (typeof window !== 'undefined' ? window.location.origin : '');

console.log('[Axios Config] Final Base URL:', finalBaseURL);

// Instancia personalizada de axios con configuración básica
const instance: ApiClientInstance = axios.create({
  baseURL: finalBaseURL,
  timeout: 10000, // 10 segundos de timeout
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Para manejar cookies y sesiones si se necesita
});

// Interceptor para manejar tokens de autenticación
instance.interceptors.request.use(
  (config) => {
    console.log('[Axios Request]', {
      url: config.url,
      baseURL: config.baseURL,
      fullURL: config.baseURL + config.url,
      withCredentials: config.withCredentials,
      headers: config.headers,
    });
    
    // Obtener token del localStorage o donde se guarde
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor para manejar respuestas y errores
instance.interceptors.response.use(
  (response: AxiosResponse) => {
    console.log('[Axios Response]', {
      url: response.config.url,
      status: response.status,
      dataType: typeof response.data,
      isArray: Array.isArray(response.data),
    });
    return response.data; // Devolver response.data directamente
  },
  async (error) => {
    console.error('[Axios Error]', {
      url: error.config?.url,
      status: error.response?.status,
      message: error.message,
      data: error.response?.data,
    });
    
    // Manejar errores comunes como 401 (no autorizado)
    if (error.response?.status === 401) {
      // Aquí podría ir la lógica para redirigir al login o refrescar token
      // Por ejemplo: window.location.href = '/auth/login';
    }
    return Promise.reject(error);
  }
);

// Exportar la instancia con el tipo correcto que refleja que response.data es devuelto directamente
export default instance as Omit<AxiosInstance, 'get' | 'post' | 'put' | 'patch' | 'delete'> & {
  get<T = any>(url: string, config?: any): Promise<T>;
  post<T = any>(url: string, data?: any, config?: any): Promise<T>;
  put<T = any>(url: string, data?: any, config?: any): Promise<T>;
  patch<T = any>(url: string, data?: any, config?: any): Promise<T>;
  delete<T = any>(url: string, config?: any): Promise<T>;
};