"use client"

import React, { createContext, useContext, useState, useCallback } from 'react'

interface Client {
  id: string | number
  name: string
  prefix?: string
  phone?: string
  // Añadir más campos según sea necesario
}

interface LastActiveClientContextType {
  lastActiveClient: Client | null
  setLastActiveClient: (client: Client | null) => void
  clearLastActiveClient: () => void
}

const LastActiveClientContext = createContext<LastActiveClientContextType | undefined>(undefined)

export function LastActiveClientProvider({ children }: { children: React.ReactNode }) {
  const [lastActiveClient, setLastActiveClient] = useState<Client | null>(null)

  const clearLastActiveClient = useCallback(() => {
    setLastActiveClient(null)
  }, [])

  return (
    <LastActiveClientContext.Provider
      value={{
        lastActiveClient,
        setLastActiveClient,
        clearLastActiveClient,
      }}
    >
      {children}
    </LastActiveClientContext.Provider>
  )
}

export function useLastActiveClient() {
  const context = useContext(LastActiveClientContext)
  if (context === undefined) {
    throw new Error('useLastActiveClient must be used within a LastActiveClientProvider')
  }
  return context
} 