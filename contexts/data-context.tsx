'use client';

import React, { createContext, useContext, ReactNode, useEffect, useState } from 'react';
import { DataService } from '@/services/data/data-service';
import { initializeDataService, getDataService, type SupabaseConnectionConfig } from '@/services/data';

// Crear el contexto
const DataServiceContext = createContext<DataService | null>(null);

// Hook personalizado para usar el contexto
export const useDataService = () => {
  const context = useContext(DataServiceContext);
  if (!context) {
    throw new Error('useDataService debe ser usado dentro de un DataServiceProvider');
  }
  return context;
};

// Props para el proveedor
interface DataServiceProviderProps {
  children: ReactNode;
}

// Componente proveedor
export const DataServiceProvider = ({ children }: DataServiceProviderProps) => {
  const [dataService, setDataService] = useState<DataService | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initializeService = async () => {
      try {
        // Verificar variables de entorno
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

        if (!supabaseUrl || !supabaseAnonKey) {
          throw new Error('Variables de entorno de Supabase no configuradas');
        }

        const config: SupabaseConnectionConfig = {
          url: supabaseUrl,
          apiKey: supabaseAnonKey,
          schema: 'public'
        };

        // Inicializar el servicio
        await initializeDataService(config);
        const service = getDataService();
        
        setDataService(service);
        setIsInitialized(true);
      } catch (error) {
        console.error('Error al inicializar el servicio de datos:', error);
        setError(error instanceof Error ? error.message : 'Error desconocido');
        setIsInitialized(true); // Marcar como inicializado para evitar bucles
      }
    };

    if (!isInitialized) {
      initializeService();
    }
  }, [isInitialized]);

  // Mostrar error si hay problemas de configuración
  if (error) {
    return (
      <div className="p-4 bg-yellow-100 border border-yellow-400 text-yellow-700 rounded">
        <h3>Advertencia: Servicio de datos no disponible</h3>
        <p>{error}</p>
        <p>La aplicación funcionará con funcionalidad limitada.</p>
      </div>
    );
  }

  // Mostrar loading mientras se inicializa
  if (!dataService && !error) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2">Inicializando servicio de datos...</span>
      </div>
    );
  }

  return (
    <DataServiceContext.Provider value={dataService}>
      {children}
    </DataServiceContext.Provider>
  );
};

export default DataServiceProvider; 