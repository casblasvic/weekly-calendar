"use client"

import type React from "react"
import { createContext, useState, useContext, type ReactNode } from "react"
import { expandHexColor } from "@/utils/color-utils"

export interface Cabin {
  id: string | number
  code: string
  name: string
  color: string
  isActive: boolean
  order: number
}

interface CabinContextType {
  cabins: Cabin[]
  setCabins: React.Dispatch<React.SetStateAction<Cabin[]>>
  addCabin: (cabin: Omit<Cabin, "id">) => void
  updateCabin: (id: string | number, data: Partial<Cabin>) => void
  deleteCabin: (id: string | number) => void
  toggleCabinActive: (id: string | number) => void
  reorderCabins: (startIndex: number, endIndex: number) => void
}

const CabinContext = createContext<CabinContextType | undefined>(undefined)

export const CabinProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Usar colores hexadecimales completos en lugar de abreviados
  const [cabins, setCabins] = useState<Cabin[]>([
    { id: 1, code: "Con", name: "Consultation", color: "#ff0000", isActive: true, order: 1 },
    { id: 2, code: "Con", name: "Consultation2", color: "#00ff00", isActive: true, order: 2 },
    { id: 3, code: "Lun", name: "Lunula", color: "#0000ff", isActive: true, order: 3 },
    { id: 4, code: "For", name: "Forte/Bal", color: "#ff0000", isActive: true, order: 4 },
    { id: 5, code: "Ski", name: "SkinShape", color: "#ff0000", isActive: false, order: 5 },
    { id: 6, code: "WB", name: "Won/Bal", color: "#ff0000", isActive: true, order: 6 },
    { id: 7, code: "Ver", name: "Verju/Bal", color: "#ff0000", isActive: true, order: 7 },
    { id: 8, code: "WB", name: "Won/Bal", color: "#ff0000", isActive: false, order: 8 },
    { id: 9, code: "Eme", name: "Emerald", color: "#ff0000", isActive: true, order: 9 },
  ])

  const addCabin = (cabin: Omit<Cabin, "id">) => {
    setCabins((prevCabins) => {
      const newId = Math.max(...prevCabins.map((c) => Number(c.id)), 0) + 1
      // Asegurar que el color esté en formato hexadecimal completo
      const newCabin = {
        ...cabin,
        id: newId,
        color: expandHexColor(cabin.color),
      }
      return [...prevCabins, newCabin]
    })
  }

  const updateCabin = (id: string | number, data: Partial<Cabin>) => {
    setCabins((prevCabins) =>
      prevCabins.map((cabin) =>
        cabin.id === id
          ? {
              ...cabin,
              ...data,
              // Asegurar que el color esté en formato hexadecimal completo si se actualiza
              color: data.color ? expandHexColor(data.color) : cabin.color,
            }
          : cabin,
      ),
    )
  }

  const deleteCabin = (id: string | number) => {
    setCabins((prevCabins) => prevCabins.filter((cabin) => cabin.id !== id))
  }

  const toggleCabinActive = (id: string | number) => {
    setCabins((prevCabins) =>
      prevCabins.map((cabin) => (cabin.id === id ? { ...cabin, isActive: !cabin.isActive } : cabin)),
    )
  }

  const reorderCabins = (startIndex: number, endIndex: number) => {
    setCabins((prevCabins) => {
      const result = Array.from(prevCabins)
      const [removed] = result.splice(startIndex, 1)
      result.splice(endIndex, 0, removed)

      // Actualizar el orden después de reordenar
      return result.map((cabin, index) => ({
        ...cabin,
        order: index + 1,
      }))
    })
  }

  return (
    <CabinContext.Provider
      value={{
        cabins,
        setCabins,
        addCabin,
        updateCabin,
        deleteCabin,
        toggleCabinActive,
        reorderCabins,
      }}
    >
      {children}
    </CabinContext.Provider>
  )
}

export const useCabins = () => {
  const context = useContext(CabinContext)
  if (context === undefined) {
    throw new Error("useCabins must be used within a CabinProvider")
  }
  return context
}

