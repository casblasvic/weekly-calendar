"use client"

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react"
// QUITAR: import { useInterfaz } from "./interfaz-Context"
// QUITAR: import { Client as ClientModel } from "@/services/data/data-service" // Usaremos Prisma.Client
import { Client as PrismaClient } from '@prisma/client';

// Usar tipo de Prisma directamente
export type Client = PrismaClient;

// Interfaz del contexto
interface ClientContextType {
  clients: Client[]
  isLoading: boolean // Cambiar nombre loading a isLoading
  error: string | null;
  refetchClients: () => Promise<void>; // Cambiar nombre refreshClients a refetchClients
  getClientById: (id: string) => Promise<Client | null>
  createClient: (client: Omit<Client, 'id' | 'createdAt' | 'updatedAt' | 'systemId'>) => Promise<Client | null> // Ajustar tipo y retorno
  updateClient: (id: string, client: Partial<Omit<Client, 'id' | 'createdAt' | 'updatedAt' | 'systemId'>>) => Promise<Client | null> // Ajustar tipo y retorno
  deleteClient: (id: string) => Promise<boolean>
  getClientsByClinicId: (clinicId: string) => Promise<Client[]> // PENDIENTE API
}

// Crear el contexto
const ClientContext = createContext<ClientContextType | undefined>(undefined)

// Provider del contexto
export function ClientProvider({ children }: { children: ReactNode }) {
  const [clients, setClients] = useState<Client[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null);
  // QUITAR: const interfaz = useInterfaz()
  // QUITAR: dataFetched

  // Función para cargar/recargar clientes desde la API
  const fetchClients = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/clients');
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
      const clientsList: Client[] = await response.json();
      setClients(clientsList);
      console.log("ClientContext: Clientes cargados/actualizados desde API");
    } catch (err) {
      console.error("Error al cargar clientes desde API:", err);
      setError(err instanceof Error ? err.message : 'Error desconocido al cargar clientes');
      setClients([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Cargar clientes al iniciar
  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  // Métodos del contexto usando API

  const getClientById = async (id: string): Promise<Client | null> => {
    // Intentar desde estado local primero
    const localClient = clients.find(c => c.id === id);
    if (localClient) return localClient;

    setIsLoading(true);
    try {
      const response = await fetch(`/api/clients/${id}`);
      if (response.status === 404) return null;
      if (!response.ok) throw new Error(`Error ${response.status}: ${response.statusText}`);
      const client: Client = await response.json();
      // Opcional: actualizar estado local
      setClients(prev => prev.map(c => c.id === id ? client : c));
      return client;
    } catch (err) {
      console.error(`Error fetching client ${id} from API:`, err);
      setError(err instanceof Error ? err.message : 'Error desconocido');
      return null;
    } finally {
        setIsLoading(false);
    }
  };

  const createClient = async (clientData: Omit<Client, 'id' | 'createdAt' | 'updatedAt' | 'systemId'>): Promise<Client | null> => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(clientData),
      });
      if (!response.ok) {
         const errorData = await response.json();
         throw new Error(errorData.message || `Error ${response.status}`);
      }
      const newClient: Client = await response.json();
      setClients(prev => [...prev, newClient]);
      return newClient;
    } catch (err) {
      console.error("Error creando cliente vía API:", err);
      setError(err instanceof Error ? err.message : 'Error desconocido al crear');
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const updateClient = async (id: string, clientUpdate: Partial<Omit<Client, 'id' | 'createdAt' | 'updatedAt' | 'systemId'>>): Promise<Client | null> => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/clients/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(clientUpdate),
      });
       if (!response.ok) {
         const errorData = await response.json();
         throw new Error(errorData.message || `Error ${response.status}`);
      }
      const updatedClient: Client = await response.json();
      setClients(prev => 
        prev.map(c => c.id === id ? updatedClient : c)
      );
      return updatedClient;
    } catch (err) {
      console.error(`Error updating client ${id} via API:`, err);
      setError(err instanceof Error ? err.message : 'Error desconocido al actualizar');
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const deleteClient = async (id: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    try {
       const response = await fetch(`/api/clients/${id}`, {
        method: 'DELETE',
      });
       if (!response.ok) {
         const errorData = await response.json();
         throw new Error(errorData.message || `Error ${response.status}`);
      }
      setClients(prev => prev.filter(c => c.id !== id));
      return true;
    } catch (err) {
      console.error(`Error deleting client ${id} via API:`, err);
      setError(err instanceof Error ? err.message : 'Error desconocido al eliminar');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const getClientsByClinicId = async (clinicId: string): Promise<Client[]> => {
      console.warn("getClientsByClinicId no implementado con API (filtrado backend necesario)");
      // TODO: Implementar API route /api/clients?clinicId=...
      // Devolver filtrado local como fallback temporal? No, porque el estado local puede no tener todos.
      return [];
  };

  const contextValue: ClientContextType = {
      clients,
      isLoading,
      error,
      refetchClients: fetchClients,
      getClientById,
      createClient,
      updateClient,
      deleteClient,
      getClientsByClinicId
  };

  return (
    <ClientContext.Provider value={contextValue}>
      {children}
    </ClientContext.Provider>
  );
}

// Hook para usar el contexto
export function useClient() {
  const context = useContext(ClientContext)
  if (context === undefined) {
    throw new Error("useClient debe ser usado dentro de un ClientProvider")
  }
  return context
} 