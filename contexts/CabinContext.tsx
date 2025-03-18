"use client"

import type React from "react"
import { createContext, useState, useContext, type ReactNode } from "react"

export interface Cabin {
  id: number
  code: string
  name: string
  color: string
  isActive: boolean
  order: number
}

interface CabinContextType {
  cabins: Cabin[]
  updateCabins: (newCabins: Cabin[]) => void
}

const CabinContext = createContext<CabinContextType | undefined>(undefined)

export const useCabinContext = () => {
  const context = useContext(CabinContext)
  if (!context) {
    throw new Error("useCabinContext must be used within a CabinProvider")
  }
  return context
}

export const CabinProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [cabins, setCabins] = useState<Cabin[]>([
    { id: 1, code: "Con", name: "Consultation", color: "#ff0000", isActive: true, order: 1 },
    { id: 2, code: "Con", name: "Consultation2", color: "#0000ff", isActive: true, order: 2 },
    { id: 3, code: "Lun", name: "Lunula", color: "#00ff00", isActive: true, order: 3 },
    { id: 4, code: "For", name: "Forte/Bal", color: "#ff0000", isActive: true, order: 4 },
    { id: 5, code: "Ski", name: "SkinShape", color: "#ff0000", isActive: false, order: 5 },
    { id: 6, code: "WB", name: "Won/Bal", color: "#ff0000", isActive: true, order: 6 },
    { id: 7, code: "Ver", name: "Verju/Bal", color: "#ff0000", isActive: true, order: 7 },
    { id: 8, code: "WB", name: "Won/Bal", color: "#ff0000", isActive: false, order: 8 },
    { id: 9, code: "Eme", name: "Emerald", color: "#ff0000", isActive: true, order: 9 },
  ])

  const updateCabins = (newCabins: Cabin[]) => {
    setCabins(newCabins)
  }

  return <CabinContext.Provider value={{ cabins, updateCabins }}>{children}</CabinContext.Provider>
}

