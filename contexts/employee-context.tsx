"use client"

import { createContext, useContext, useState, useEffect, ReactNode } from "react"
import { User } from "@prisma/client"

interface EmployeeContextProps {
  empleados: User[];
  loading: boolean;
  error: string | null;
  reloadEmployees: () => Promise<void>;
  getEmployeeById: (id: string) => User | undefined;
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
  const [empleados, setEmpleados] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Función para cargar empleados
  const loadEmployees = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // En un entorno real, aquí se cargarían los empleados desde la API
      // Por ahora, usamos datos de ejemplo
      const mockEmpleados: User[] = [
        {
          id: "1",
          firstName: "Juan",
          lastName: "Pérez",
          email: "juan@ejemplo.com",
          isActive: true,
          phone: "123456789",
          passwordHash: "mockHash",
          systemId: "mockSystem",
          createdAt: new Date(),
          updatedAt: new Date(),
          login: "juanperez",
          profileImageUrl: null,
          phone2: null,
          countryIsoCode: null,
          languageIsoCode: null,
          phone1CountryIsoCode: null,
          phone2CountryIsoCode: null,
        },
        {
          id: "2",
          firstName: "Ana",
          lastName: "García",
          email: "ana@ejemplo.com",
          isActive: true,
          phone: "987654321",
          passwordHash: "mockHash2",
          systemId: "mockSystem",
          createdAt: new Date(),
          updatedAt: new Date(),
          login: "anagarcia",
          profileImageUrl: null,
          phone2: null,
          countryIsoCode: null,
          languageIsoCode: null,
          phone1CountryIsoCode: null,
          phone2CountryIsoCode: null,
        },
        {
          id: "3",
          firstName: "Carlos",
          lastName: "Rodríguez",
          email: "carlos@ejemplo.com",
          isActive: true,
          phone: "456789123",
          passwordHash: "mockHash3",
          systemId: "mockSystem",
          createdAt: new Date(),
          updatedAt: new Date(),
          login: "carlosrodriguez",
          profileImageUrl: null,
          phone2: null,
          countryIsoCode: null,
          languageIsoCode: null,
          phone1CountryIsoCode: null,
          phone2CountryIsoCode: null,
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