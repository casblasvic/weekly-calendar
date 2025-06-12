'use client'

import React, { useState, useEffect, use, useRef } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, Users, CreditCard, Clock, Package, FileText, User, Menu } from 'lucide-react'
import { useLastClient } from '@/contexts/last-client-context'
import { useClientCard } from '@/contexts/client-card-context'

interface Person {
  id: string
  firstName: string
  lastName: string
  email?: string
  profileImage?: string
}

// API para obtener persona por ID
async function getPersonById(id: string) {
  try {
    const response = await fetch(`/api/persons/${id}`)
    if (!response.ok) {
      throw new Error("Error al obtener la persona")
    }
    const data = await response.json()
    return data
  } catch (error) {
    console.error("Error fetching person:", error)
    return null
  }
}

const tabs = [
  { label: "DATOS DE LA PERSONA", path: "" },
  { label: "HISTORIAL", path: "/historial" },
  { label: "CONSENTIMIENTOS", path: "/consentimientos" },
  { label: "COMPRAS Y PAGOS", path: "/compras-pagos" },
  { label: "APLAZADO", path: "/aplazado" },
  { label: "BONOS", path: "/bonos" },
  { label: "FOTOGRAFÍAS", path: "/fotografias" },
  { label: "AVISOS", path: "/avisos" },
]

export default function PersonLayout({ children, params }: { children: React.ReactNode; params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)
  const personId = resolvedParams.id
  
  const [person, setPerson] = useState<Person | null>(null)
  const [isMobile, setIsMobile] = useState(false)
  const [activeTab, setActiveTab] = useState("")
  
  const pathname = usePathname()
  const router = useRouter()
  const { setLastClient } = useLastClient()
  const { setHideMainCard } = useClientCard()
  const tabsRef = useRef<HTMLDivElement>(null)

  // Determinar la pestaña activa basada en la ruta
  useEffect(() => {
    const currentPath = pathname.split('/').pop()
    const currentTab = tabs.find(tab => {
      if (tab.path === "" && (currentPath === personId || pathname.endsWith(`/${personId}`))) {
        return true
      }
      return tab.path !== "" && pathname.includes(tab.path.substring(1))
    })
    
    if (currentTab) {
      setActiveTab(currentTab.path)
    }
  }, [pathname, personId])

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    
    checkMobile()
    window.addEventListener("resize", checkMobile)
    
    return () => {
      setHideMainCard(false)
      window.removeEventListener("resize", checkMobile)
    }
  }, [setHideMainCard])

  useEffect(() => {
    const loadPerson = async () => {
      try {
        const personData = await getPersonById(personId)
        if (personData) {
          setPerson(personData)
          setLastClient(personData)
        } else {
          console.error(`No se encontró la persona con ID: ${personId}`)
        }
      } catch (error) {
        console.error(`Error al cargar persona ${personId}:`, error)
      }
    }
    
    loadPerson()
  }, [personId, setLastClient])

  // Función para cambiar de pestaña sin forzar recarga completa
  const handleTabChange = (tabPath: string) => {
    const newPath = `/personas/${personId}${tabPath}`
    router.push(newPath)
  }

  if (!person) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Cargando persona...</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header con navegación por pestañas */}
      <div className="bg-white border-b">
        <div className="container mx-auto">
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
                {person.profileImage ? (
                  <img 
                    src={person.profileImage} 
                    alt="Persona" 
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  <span className="text-gray-600 text-sm font-medium">
                    {person.firstName?.[0]}{person.lastName?.[0]}
                  </span>
                )}
              </div>
              <div>
                <h1 className="text-lg font-semibold">
                  {person.firstName} {person.lastName}
                </h1>
                <p className="text-sm text-gray-500">{person.email}</p>
              </div>
            </div>
          </div>
          
          <div className="flex overflow-x-auto" ref={tabsRef}>
            {tabs.map((tab) => (
              <button
                key={tab.path}
                onClick={() => handleTabChange(tab.path)}
                className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                  activeTab === tab.path
                    ? "border-purple-600 text-purple-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Contenido principal */}
      <div className="flex-1 overflow-auto bg-gray-50">
        {children}
      </div>
    </div>
  )
}
