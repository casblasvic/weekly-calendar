"use client"

import type React from "react"

import { createContext, useContext, useState } from "react"

interface ClientCardContextType {
  hideMainCard: boolean
  setHideMainCard: (hide: boolean) => void
}

const ClientCardContext = createContext<ClientCardContextType | undefined>(undefined)

export function ClientCardProvider({ children }: { children: React.ReactNode }) {
  const [hideMainCard, setHideMainCard] = useState(false)

  return <ClientCardContext.Provider value={{ hideMainCard, setHideMainCard }}>{children}</ClientCardContext.Provider>
}

export function useClientCard() {
  const context = useContext(ClientCardContext)
  if (context === undefined) {
    throw new Error("useClientCard must be used within a ClientCardProvider")
  }
  return context
}

