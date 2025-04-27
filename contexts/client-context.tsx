"use client"

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react"
// QUITAR: import { useInterfaz } from "./interfaz-Context"
// QUITAR: import { Client as ClientModel } from "@/services/data/data-service" // Usaremos Prisma.Client
import { Client as PrismaClient } from '@prisma/client';
import { useSession } from "next-auth/react";

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
  const { data: session, status } = useSession();
  // QUITAR: const interfaz = useInterfaz()
  // QUITAR: dataFetched

  // Función para cargar/recargar clientes desde la API
  const fetchClients = useCallback(async () => {
    if (status !== 'authenticated') {
        console.log("[ClientContext] Sesión no autenticada, saltando fetchClients.");
        setIsLoading(false);
        setClients([]);
        return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/clients');
      if (!response.ok) {
        let errorText = response.statusText;
        if (response.status === 401) {
             try { const errorBody = await response.json(); errorText = errorBody.message || errorText; } catch (e) {}
        }
        throw new Error(`Error ${response.status}: ${errorText}`);
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
  }, [status]);

  // Cargar clientes al iniciar
  useEffect(() => {
    if (status === 'authenticated') {
        fetchClients();
    } else if (status === 'unauthenticated') {
        setClients([]); 
        setIsLoading(false);
        setError(null);
    } else {
         setIsLoading(true);
    }
  }, [fetchClients, status]);

  // Métodos del contexto usando API

  const getClientById = useCallback(async (id: string): Promise<Client | null> => {
    if (status !== 'authenticated') return null;
    
    const localClient = clients.find(c => c.id === id);
    if (localClient) return localClient;

    setIsLoading(true);
    try {
      const response = await fetch(`/api/clients/${id}`);
      if (response.status === 404) return null;
      if (!response.ok) throw new Error(`Error ${response.status}: ${response.statusText}`);
      const client: Client = await response.json();
      setClients(prev => prev.map(c => c.id === id ? client : c));
      return client;
    } catch (err) {
      console.error(`Error fetching client ${id} from API:`, err);
      setError(err instanceof Error ? err.message : 'Error desconocido');
      return null;
    } finally {
        setIsLoading(false);
    }
  }, [clients, status]);

  const createClient = useCallback(async (clientData: Omit<Client, 'id' | 'createdAt' | 'updatedAt' | 'systemId'>): Promise<Client | null> => {
    if (status !== 'authenticated') return null;
    
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
  }, [status]);

  const updateClient = useCallback(async (id: string, clientUpdate: Partial<Omit<Client, 'id' | 'createdAt' | 'updatedAt' | 'systemId'>>): Promise<Client | null> => {
    if (status !== 'authenticated') return null;

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
  }, [status]);

  const deleteClient = useCallback(async (id: string): Promise<boolean> => {
    if (status !== 'authenticated') return false;

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
  }, [status]);

  const getClientsByClinicId = useCallback(async (clinicId: string): Promise<Client[]> => {
    if (status !== 'authenticated') return [];
    console.warn("getClientsByClinicId no implementado con API (filtrado backend necesario)");
    // TODO: Implementar API route /api/clients?clinicId=...
    return [];
  }, [status]);

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