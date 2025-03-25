"use client"

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react"
import { useInterfaz } from "./interfaz-Context"
import { Client as ClientModel } from "@/services/data/data-service"

// Definir alias para los tipos usando los tipos del modelo central
export type Client = ClientModel;

// Interfaz del contexto
interface ClientContextType {
  clients: Client[]
  loading: boolean
  getClientById: (id: string) => Promise<Client | null>
  createClient: (client: Omit<Client, 'id'>) => Promise<Client>
  updateClient: (id: string, client: Partial<Client>) => Promise<Client | null>
  deleteClient: (id: string) => Promise<boolean>
  refreshClients: () => Promise<void>
  getClientsByClinicId: (clinicId: string) => Promise<Client[]>
}

// Crear el contexto
const ClientContext = createContext<ClientContextType | undefined>(undefined)

// Provider del contexto
export function ClientProvider({ children }: { children: ReactNode }) {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [dataFetched, setDataFetched] = useState(false)
  const interfaz = useInterfaz()

  // Cargar clientes al iniciar
  useEffect(() => {
    const loadClients = async () => {
      if (interfaz.initialized && !dataFetched) {
        try {
          setLoading(true)
          const clientsList = await interfaz.getAllClients()
          setClients(clientsList)
          setDataFetched(true)
        } catch (error) {
          console.error("Error al cargar clientes:", error)
          setClients([])
        } finally {
          setLoading(false)
        }
      }
    }

    loadClients()
  }, [interfaz.initialized, dataFetched])

  // Métodos del contexto
  const getClientById = async (id: string): Promise<Client | null> => {
    try {
      return await interfaz.getClientById(id)
    } catch (error) {
      console.error(`Error al obtener cliente ${id}:`, error)
      
      // Intentar recuperar del estado local en caso de error
      const clienteLocal = clients.find(c => c.id === id);
      if (clienteLocal) {
        console.log("Cliente recuperado del estado local tras error:", id);
        return clienteLocal;
      }
      
      return null
    }
  }

  const createClient = async (client: Omit<Client, 'id'>): Promise<Client> => {
    try {
      const newClient = await interfaz.createClient(client)
      setClients(prev => [...prev, newClient])
      return newClient
    } catch (error) {
      console.error("Error al crear cliente:", error)
      throw error
    }
  }

  const updateClient = async (id: string, client: Partial<Client>): Promise<Client | null> => {
    try {
      const updatedClient = await interfaz.updateClient(id, client)
      if (updatedClient) {
        setClients(prev => prev.map(c => c.id === id ? updatedClient : c))
      }
      return updatedClient
    } catch (error) {
      console.error(`Error al actualizar cliente ${id}:`, error)
      return null
    }
  }

  const deleteClient = async (id: string): Promise<boolean> => {
    try {
      const success = await interfaz.deleteClient(id)
      if (success) {
        setClients(prev => prev.filter(c => c.id !== id))
      }
      return success
    } catch (error) {
      console.error(`Error al eliminar cliente ${id}:`, error)
      return false
    }
  }

  const refreshClients = async (): Promise<void> => {
    try {
      setLoading(true)
      const clientsList = await interfaz.getAllClients()
      setClients(clientsList)
    } catch (error) {
      console.error("Error al actualizar clientes:", error)
    } finally {
      setLoading(false)
    }
  }

  const getClientsByClinicId = async (clinicId: string): Promise<Client[]> => {
    try {
      return await interfaz.getClientsByClinicId(clinicId)
    } catch (error) {
      console.error(`Error al obtener clientes de la clínica ${clinicId}:`, error)
      
      // Intentar recuperar del estado local en caso de error
      const clientesLocales = clients.filter(c => c.clinicId === clinicId);
      if (clientesLocales.length > 0) {
        console.log("Clientes recuperados del estado local tras error para clínica:", clinicId);
        return clientesLocales;
      }
      
      return []
    }
  }

  return (
    <ClientContext.Provider
      value={{
        clients,
        loading,
        getClientById,
        createClient,
        updateClient,
        deleteClient,
        refreshClients,
        getClientsByClinicId
      }}
    >
      {children}
    </ClientContext.Provider>
  )
}

// Hook para usar el contexto
export function useClient() {
  const context = useContext(ClientContext)
  if (context === undefined) {
    throw new Error("useClient debe ser usado dentro de un ClientProvider")
  }
  return context
} 