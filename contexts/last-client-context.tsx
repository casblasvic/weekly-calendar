"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect } from "react"

interface Client {
  id: string
  name: string
  clientNumber: string
  phone: string
  email: string
  clinic: string
  avatar?: string
}

interface LastClientContextType {
  lastClient: Client | null
  setLastClient: (client: Client) => void
}

const LastClientContext = createContext<LastClientContextType | undefined>(undefined)

export function LastClientProvider({ children }: { children: React.ReactNode }) {
  const [lastClient, setLastClient] = useState<Client | null>(() => {
    // Try to get from localStorage on initial load
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("lastClient")
      return saved ? JSON.parse(saved) : null
    }
    return null
  })

  // Persist to localStorage when client changes
  useEffect(() => {
    if (lastClient) {
      localStorage.setItem("lastClient", JSON.stringify(lastClient))
    }
  }, [lastClient])

  return <LastClientContext.Provider value={{ lastClient, setLastClient }}>{children}</LastClientContext.Provider>
}

export function useLastClient() {
  const context = useContext(LastClientContext)
  if (context === undefined) {
    throw new Error("useLastClient must be used within a LastClientProvider")
  }
  return context
}

