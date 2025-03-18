"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect } from "react"

export interface Family {
  id: string
  name: string
  code: string
  parentId: string | null
  isActive: boolean
}

interface FamilyContextType {
  families: Family[]
  addFamily: (family: Omit<Family, "id">) => void
  updateFamily: (id: string, family: Partial<Family>) => void
  toggleFamilyStatus: (id: string) => void
  getFamilyById: (id: string) => Family | undefined
  getSubfamilies: (parentId: string) => Family[]
  getRootFamilies: () => Family[]
}

const FamilyContext = createContext<FamilyContextType | undefined>(undefined)

// Datos iniciales de ejemplo
const initialFamilies: Family[] = [
  { id: "1", name: "Administration", code: "adm", parentId: null, isActive: true },
  { id: "2", name: "Ballance", code: "BALLANCE", parentId: null, isActive: true },
  { id: "3", name: "Consommables", code: "CONSOM", parentId: null, isActive: true },
  { id: "4", name: "Consultation", code: "Consulta", parentId: null, isActive: true },
  { id: "5", name: "Control", code: "Control", parentId: null, isActive: true },
  { id: "6", name: "Dispositifs", code: "DISPO", parentId: null, isActive: true },
  { id: "7", name: "EVIRL", code: "EVIRL", parentId: null, isActive: true },
  { id: "8", name: "Forte Gem", code: "FORTEGEM", parentId: null, isActive: true },
  { id: "9", name: "JETPEEL", code: "JPL", parentId: null, isActive: true },
  { id: "10", name: "Lunula", code: "LUNULA", parentId: null, isActive: true },
  { id: "11", name: "NYCE", code: "NYC", parentId: null, isActive: true },
  { id: "12", name: "RENPHO", code: "RPH", parentId: null, isActive: true },
  { id: "13", name: "SkinShape", code: "SKINSHAP", parentId: null, isActive: true },
  { id: "14", name: "SOLIDEA", code: "SLD", parentId: null, isActive: true },
  { id: "15", name: "Tarifa plana", code: "TarifPla", parentId: null, isActive: true },
  { id: "16", name: "Tricologie", code: "trc", parentId: null, isActive: true },
  { id: "17", name: "Verju", code: "VERJU", parentId: null, isActive: true },
  { id: "18", name: "Wonder", code: "WONDER", parentId: null, isActive: true },
  { id: "19", name: "Acne", code: "JPAC", parentId: "9", isActive: true },
  { id: "20", name: "Anti Aging", code: "JTAA", parentId: "9", isActive: true },
]

export const FamilyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [families, setFamilies] = useState<Family[]>(initialFamilies)

  // Cargar familias desde localStorage si existen
  useEffect(() => {
    const storedFamilies = localStorage.getItem("families")
    if (storedFamilies) {
      setFamilies(JSON.parse(storedFamilies))
    }
  }, [])

  // Guardar familias en localStorage cuando cambien
  useEffect(() => {
    localStorage.setItem("families", JSON.stringify(families))
  }, [families])

  const addFamily = (family: Omit<Family, "id">) => {
    const newFamily: Family = {
      ...family,
      id: Date.now().toString(),
    }
    setFamilies((prev) => [...prev, newFamily])
  }

  const updateFamily = (id: string, updatedFamily: Partial<Family>) => {
    setFamilies((prev) => prev.map((family) => (family.id === id ? { ...family, ...updatedFamily } : family)))
  }

  const toggleFamilyStatus = (id: string) => {
    setFamilies((prev) => prev.map((family) => (family.id === id ? { ...family, isActive: !family.isActive } : family)))
  }

  const getFamilyById = (id: string) => {
    return families.find((family) => family.id === id)
  }

  const getSubfamilies = (parentId: string) => {
    return families.filter((family) => family.parentId === parentId)
  }

  const getRootFamilies = () => {
    return families.filter((family) => family.parentId === null)
  }

  return (
    <FamilyContext.Provider
      value={{
        families,
        addFamily,
        updateFamily,
        toggleFamilyStatus,
        getFamilyById,
        getSubfamilies,
        getRootFamilies,
      }}
    >
      {children}
    </FamilyContext.Provider>
  )
}

export const useFamily = () => {
  const context = useContext(FamilyContext)
  if (context === undefined) {
    throw new Error("useFamily must be used within a FamilyProvider")
  }
  return context
}

