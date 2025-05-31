import axios, { type AxiosInstance, type AxiosRequestConfig, type AxiosResponse } from 'axios';

// Interfaz personalizada para nuestra instancia de Axios
// Asegura que los métodos devuelvan T (los datos) en lugar de AxiosResponse<T>
interface ApiClientInstance extends AxiosInstance {
  get<T = any, R = T, D = any>(url: string, config?: AxiosRequestConfig<D>): Promise<R>;
  post<T = any, R = T, D = any>(url: string, data?: D, config?: AxiosRequestConfig<D>): Promise<R>;
  put<T = any, R = T, D = any>(url: string, data?: D, config?: AxiosRequestConfig<D>): Promise<R>;
  delete<T = any, R = T, D = any>(url: string, config?: AxiosRequestConfig<D>): Promise<R>;
  patch<T = any, R = T, D = any>(url: string, data?: D, config?: AxiosRequestConfig<D>): Promise<R>;
}

// Instancia personalizada de axios con configuración básica
const instance: ApiClientInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || '', 
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Para manejar cookies y sesiones si se necesita
});

// Interceptor para manejar tokens de autenticación
instance.interceptors.request.use(
  (config) => {
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
  (response: AxiosResponse) => response.data, // Devolver response.data directamente
  async (error) => {
    // Manejar errores comunes como 401 (no autorizado)
    if (error.response?.status === 401) {
      // Aquí podría ir la lógica para redirigir al login o refrescar token
      // Por ejemplo: window.location.href = '/auth/login';
    }
    return Promise.reject(error);
  }
);

export default instance; 