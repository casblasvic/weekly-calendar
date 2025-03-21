'use client';

import { useEffect, useState } from 'react';

/**
 * Componente que inicializa la estructura de carpetas de almacenamiento
 * al cargar la aplicación. Este componente no renderiza nada visible.
 */
export const StorageInitializer = () => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initSystem = async () => {
      try {
        console.log("Inicializando sistema de almacenamiento desde componente...");
        
        // Llamada al API para inicialización del servidor
        const response = await fetch('/api/storage/init-system');
        
        if (!response.ok) {
          throw new Error('Error al inicializar estructura de almacenamiento');
        }
        
        const data = await response.json();
        
        if (data.success) {
          console.log('Estructura de almacenamiento inicializada correctamente');
          setIsInitialized(true);
        } else {
          throw new Error(data.error || 'Error desconocido');
        }
      } catch (err: any) {
        console.error('Error al inicializar estructura de almacenamiento:', err);
        setError(err.message || 'Error desconocido');
      }
    };

    // Solo inicializar si no se ha hecho ya
    if (!isInitialized && !error) {
      initSystem();
    }
  }, [isInitialized, error]);

  // Este componente no renderiza nada visible
  return null;
}; 