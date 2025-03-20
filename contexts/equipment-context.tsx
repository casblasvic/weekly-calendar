"use client"

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react"
import {
  getEquipment,
  addEquipment as addEquipmentMock,
  updateEquipment as updateEquipmentMock,
  deleteEquipment as deleteEquipmentMock,
  DATA_CHANGE_EVENT,
  MockData
} from "@/mockData"

export interface Equipment {
  id: number
  code: string
  name: string
  description: string
  serialNumber: string
  clinicId: number
  images?: DeviceImage[]
}

export interface DeviceImage {
  id: string
  url: string
  isPrimary: boolean
  file?: File
}

export interface EquipmentContextType {
  allEquipment: Equipment[]
  getClinicEquipment: (clinicId: number) => Equipment[]
  getEquipmentById: (id: number) => Equipment | undefined
  addEquipment: (equipment: Partial<Equipment>) => Equipment
  updateEquipment: (id: number, data: Partial<Equipment>) => boolean
  deleteEquipment: (id: number) => boolean
  refreshEquipment: () => void
  clinics: Array<{id: number, name: string, nombre?: string}>
}

const EquipmentContext = createContext<EquipmentContextType | undefined>(undefined)

export const EquipmentProvider: React.FC<{children: ReactNode}> = ({ children }) => {
  const [allEquipment, setAllEquipment] = useState<Equipment[]>([])
  const [clinics, setClinics] = useState<any[]>([])

  const refreshEquipment = () => {
    // Obtener datos de todas las clínicas
    const clinicsData = MockData.clinicas || []
    setClinics(clinicsData)
    
    // Obtener todo el equipamiento
    const allEquip: Equipment[] = []
    clinicsData.forEach(clinic => {
      allEquip.push(...getEquipment(Number(clinic.id)))
    })
    setAllEquipment(allEquip)
  }

  useEffect(() => {
    refreshEquipment()

    // Escuchar cambios en los datos
    const handleDataChange = (e: CustomEvent) => {
      if (e.detail.dataType === "equipment" || e.detail.dataType === "all") {
        refreshEquipment()
      }
    }

    window.addEventListener(DATA_CHANGE_EVENT, handleDataChange as EventListener)
    return () => {
      window.removeEventListener(DATA_CHANGE_EVENT, handleDataChange as EventListener)
    }
  }, [])

  const getClinicEquipment = (clinicId: number) => {
    return allEquipment.filter(item => item.clinicId === clinicId)
  }

  const getEquipmentById = (id: number) => {
    return allEquipment.find(item => item.id === id)
  }

  const addEquipmentItem = (equipmentData: Partial<Equipment>) => {
    const newId = addEquipmentMock(equipmentData as any)
    // Este es un enfoque temporal. Lo ideal sería que mockData.addEquipment
    // devolviera el objeto completo en lugar de solo el ID
    const newEquipment = { ...equipmentData, id: newId } as Equipment
    refreshEquipment()
    return newEquipment
  }

  const updateEquipmentItem = (id: number, data: Partial<Equipment>) => {
    // mockData.updateEquipment espera un objeto con id, así que lo añadimos
    const success = updateEquipmentMock({ ...data, id } as any)
    if (success) refreshEquipment()
    return success
  }

  const deleteEquipmentItem = (id: number) => {
    const success = deleteEquipmentMock(id)
    if (success) refreshEquipment()
    return success
  }

  return (
    <EquipmentContext.Provider
      value={{
        allEquipment,
        getClinicEquipment,
        getEquipmentById,
        addEquipment: addEquipmentItem,
        updateEquipment: updateEquipmentItem,
        deleteEquipment: deleteEquipmentItem,
        refreshEquipment,
        clinics
      }}
    >
      {children}
    </EquipmentContext.Provider>
  )
}

export const useEquipment = () => {
  const context = useContext(EquipmentContext)
  if (context === undefined) {
    throw new Error("useEquipment debe usarse dentro de un EquipmentProvider")
  }
  return context
} 