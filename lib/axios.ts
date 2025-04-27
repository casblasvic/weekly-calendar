import axios from 'axios';

// Instancia personalizada de axios con configuración básica
const instance = axios.create({
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
  (response) => response,
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