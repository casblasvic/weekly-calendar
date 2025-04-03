'use client';

import React, { createContext, useContext, ReactNode, useEffect, useState } from 'react';
import { DataService } from '@/services/data/data-service';
import { getDataService } from '@/services/data';

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

  useEffect(() => {
    const initializeDataService = async () => {
      try {
        const service = getDataService();
        await service.initialize();
        setDataService(service);
        setIsInitialized(true);
      } catch (error) {
        console.error('Error al inicializar el servicio de datos:', error);
      }
    };

    if (!isInitialized) {
      initializeDataService();
    }
  }, [isInitialized]);

  if (!dataService) {
    return <div>Cargando servicio de datos...</div>;
  }

  return (
    <DataServiceContext.Provider value={dataService}>
      {children}
    </DataServiceContext.Provider>
  );
};

export default DataServiceProvider; 