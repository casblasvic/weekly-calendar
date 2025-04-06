"use client"

import { createContext, useContext, useState, useEffect, ReactNode } from "react"
import { Usuario } from "@/services/data/models/interfaces"

interface EmployeeContextProps {
  empleados: Usuario[];
  loading: boolean;
  error: string | null;
  reloadEmployees: () => Promise<void>;
  getEmployeeById: (id: string) => Usuario | undefined;
}

const EmployeeContext = createContext<EmployeeContextProps>({
  empleados: [],
  loading: false,
  error: null,
  reloadEmployees: async () => {},
  getEmployeeById: () => undefined,
})

export const useEmployees = () => useContext(EmployeeContext)

export function EmployeeProvider({ children }: { children: ReactNode }) {
  const [empleados, setEmpleados] = useState<Usuario[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Función para cargar empleados
  const loadEmployees = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // En un entorno real, aquí se cargarían los empleados desde la API
      // Por ahora, usamos datos de ejemplo
      const mockEmpleados: Usuario[] = [
        {
          id: "1",
          nombre: "Juan Pérez",
          email: "juan@ejemplo.com",
          perfil: "médico",
          clinicasIds: ["1", "2"],
          isActive: true,
          telefono: "123456789"
        },
        {
          id: "2",
          nombre: "Ana García",
          email: "ana@ejemplo.com",
          perfil: "asistente",
          clinicasIds: ["1"],
          isActive: true,
          telefono: "987654321"
        },
        {
          id: "3",
          nombre: "Carlos Rodríguez",
          email: "carlos@ejemplo.com",
          perfil: "médico",
          clinicasIds: ["2"],
          isActive: true,
          telefono: "456789123"
        }
      ]
      
      setEmpleados(mockEmpleados)
    } catch (err) {
      setError("Error al cargar empleados")
      console.error("Error al cargar empleados:", err)
    } finally {
      setLoading(false)
    }
  }

  // Cargar empleados al iniciar
  useEffect(() => {
    loadEmployees()
  }, [])

  // Función para recargar empleados
  const reloadEmployees = async () => {
    await loadEmployees()
  }

  // Función para obtener un empleado por ID
  const getEmployeeById = (id: string) => {
    return empleados.find(emp => emp.id.toString() === id)
  }

  return (
    <EmployeeContext.Provider
      value={{
        empleados,
        loading,
        error,
        reloadEmployees,
        getEmployeeById
      }}
    >
      {children}
    </EmployeeContext.Provider>
  )
} 