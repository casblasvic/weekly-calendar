import axios from 'axios';

const axiosInstance = axios.create({
  baseURL: '/api', // O la URL base de tu API si es externa
  headers: {
    'Content-Type': 'application/json',
  },
  // Puedes añadir más configuraciones aquí, como interceptores para manejar errores o tokens
});

// Interceptor de errores (Ejemplo básico)
axiosInstance.interceptors.response.use(
  (response) => response, // Si la respuesta es exitosa, la devuelve tal cual
  (error) => {
    // Si hay un error en la respuesta
    console.error('Axios Error:', error.response?.data || error.message);
    // Rechazar la promesa con el error para que pueda ser manejado por react-query o el llamador
    return Promise.reject(error);
  }
);

export default axiosInstance; 