'use client'

import React, { useState, useEffect, useRef, use } from 'react'
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
  activeRoles?: string[]
  functionalRoles?: any[]
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

// Sub-pestañas del módulo Cliente
const clientSubTabs = [
  { label: "HISTORIAL", path: "/historial" },
  { label: "CONSENTIMIENTOS", path: "/consentimientos" },
  { label: "COMPRAS Y PAGOS", path: "/compras-pagos" },
  { label: "APLAZADO", path: "/aplazado" },
  { label: "BONOS", path: "/bonos" },
  { label: "FOTOGRAFÍAS", path: "/fotografias" },
  { label: "AVISOS", path: "/avisos" },
]

// Pestañas principales (siempre visibles)
const mainTabs = [
  { label: "DATOS DE LA PERSONA", path: "", roleRequired: null }, // Siempre visible
  { label: "CLIENTE", path: "/cliente", roleRequired: null },
  { label: "OPORTUNIDADES", path: "/oportunidades", roleRequired: null },
  { label: "EMPRESA", path: "/empresa", roleRequired: null }
]

export default function PersonLayout({ children, params }: { children: React.ReactNode; params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)
  const personId = resolvedParams.id
  
  const [person, setPerson] = useState<Person | null>(null)
  const [isMobile, setIsMobile] = useState(false)
  const [activeMainTab, setActiveMainTab] = useState("")
  const [activeSubTab, setActiveSubTab] = useState("")
  const [visibleMainTabs, setVisibleMainTabs] = useState(mainTabs)
  
  const pathname = usePathname()
  const router = useRouter()
  const { setLastClient } = useLastClient()
  const { setHideMainCard } = useClientCard()
  const tabsRef = useRef<HTMLDivElement>(null)

  // Determinar las pestañas activas basadas en la ruta
  useEffect(() => {
    const pathSegments = pathname.split('/')
    const lastSegment = pathSegments[pathSegments.length - 1]
    
    // Verificar si estamos en una sub-pestaña de cliente
    const isClientSubTab = clientSubTabs.some(tab => pathname.includes(tab.path))
    
    if (isClientSubTab) {
      setActiveMainTab("/cliente")
      const currentSubTab = clientSubTabs.find(tab => pathname.includes(tab.path))
      setActiveSubTab(currentSubTab?.path || "")
    } else if (pathname.includes("/oportunidades")) {
      setActiveMainTab("/oportunidades")
      setActiveSubTab("")
    } else if (pathname.includes("/empresa")) {
      setActiveMainTab("/empresa")
      setActiveSubTab("")
    } else if (lastSegment === personId || pathname.endsWith(`/${personId}`)) {
      setActiveMainTab("")
      setActiveSubTab("")
    } else {
      // Por defecto, si no coincide, asumimos que es cliente
      setActiveMainTab("/cliente")
      setActiveSubTab("")
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

  // Función para cambiar de pestaña principal
  const handleMainTabChange = (tabPath: string) => {
    if (tabPath === "/cliente") {
      // Si es cliente, ir a la primera sub-pestaña por defecto (historial)
      router.push(`/clientes/${personId}/historial`)
    } else {
      const newPath = `/clientes/${personId}${tabPath}`
      router.push(newPath)
    }
  }

  // Función para cambiar de sub-pestaña
  const handleSubTabChange = (subTabPath: string) => {
    const newPath = `/clientes/${personId}${subTabPath}`
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
      {/* Header con navegación y pestañas principales */}
      <div className="bg-white dark:bg-gray-900 border-b">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Link 
                href="/clientes" 
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <ChevronLeft className="h-5 w-5" />
              </Link>
              <div className="flex items-center space-x-3">
                <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                  <User className="h-5 w-5 text-blue-600 dark:text-blue-300" />
                </div>
                <div>
                  <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
                    {person.firstName} {person.lastName}
                  </h1>
                  {person.email && (
                    <p className="text-sm text-gray-500 dark:text-gray-400">{person.email}</p>
                  )}
                </div>
              </div>
            </div>
          </div>
          
          {/* Pestañas principales */}
          <div className="mt-4" ref={tabsRef}>
            <nav className="-mb-px flex space-x-8 overflow-x-auto scrollbar-hide">
              {visibleMainTabs.map((tab) => (
                <button
                  key={tab.path}
                  onClick={() => handleMainTabChange(tab.path)}
                  className={`
                    whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm transition-colors
                    ${activeMainTab === tab.path
                      ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-200'
                    }
                  `}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Sub-pestañas para Cliente */}
          {activeMainTab === "/cliente" && (
            <div className="mt-2 border-t pt-2">
              <nav className="-mb-px flex space-x-6 overflow-x-auto scrollbar-hide text-sm">
                {clientSubTabs.map((tab) => (
                  <button
                    key={tab.path}
                    onClick={() => handleSubTabChange(tab.path)}
                    className={`
                      whitespace-nowrap py-1.5 px-1 border-b-2 font-medium transition-colors
                      ${activeSubTab === tab.path
                        ? 'border-blue-400 text-blue-500 dark:text-blue-300'
                        : 'border-transparent text-gray-400 hover:text-gray-600 hover:border-gray-200 dark:text-gray-500 dark:hover:text-gray-300'
                      }
                    `}
                  >
                    {tab.label}
                  </button>
                ))}
              </nav>
            </div>
          )}
        </div>
      </div>

      {/* Contenido de la página */}
      <div className="flex-1 overflow-auto">
        {children}
      </div>
    </div>
  )
}
