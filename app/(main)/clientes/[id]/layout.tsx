"use client"

import type React from "react"
import { useState, useEffect, useRef, use } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useLastClient } from "@/contexts/last-client-context"
import { useClientCard } from "@/contexts/client-card-context"

interface Client {
  id: string
  firstName: string
  lastName: string
  email: string
  primaryPhone: string
  profileImage?: string
}

// API para obtener cliente por ID
async function getClientById(id: string) {
  try {
    const response = await fetch(`/api/clients/${id}`)
    if (!response.ok) {
      throw new Error("Error al obtener el cliente")
    }
    const data = await response.json()
    return data
  } catch (error) {
    console.error("Error fetching client:", error)
    return null
  }
}

const tabs = [
  { label: "DATOS DEL CLIENTE", path: "" },
  { label: "HISTORIAL", path: "/historial" },
  { label: "CONSENTIMIENTOS", path: "/consentimientos" },
  { label: "APLAZADO", path: "/aplazado" },
  { label: "BONOS", path: "/bonos" },
  { label: "FOTOGRAFÍAS", path: "/fotografias" },
  { label: "AVISOS", path: "/avisos" },
]

export default function ClientLayout({ children, params }: { children: React.ReactNode; params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)
  const clientId = resolvedParams.id
  
  const [client, setClient] = useState<Client | null>(null)
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
      if (tab.path === "" && (currentPath === clientId || pathname.endsWith(`/${clientId}`))) {
        return true
      }
      return tab.path !== "" && pathname.includes(tab.path.substring(1))
    })
    
    if (currentTab) {
      setActiveTab(currentTab.path)
    }
  }, [pathname, clientId])

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
    const loadClient = async () => {
      try {
        const clientData = await getClientById(clientId)
        if (clientData) {
          setClient(clientData)
          setLastClient(clientData)
        } else {
          console.error(`No se encontró el cliente con ID: ${clientId}`)
        }
      } catch (error) {
        console.error(`Error al cargar cliente ${clientId}:`, error)
      }
    }
    
    loadClient()
  }, [clientId, setLastClient])

  // Función para cambiar de pestaña sin forzar recarga completa
  const handleTabChange = (tabPath: string) => {
    const newPath = `/clientes/${clientId}${tabPath}`
    router.push(newPath)
  }

  if (!client) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Cargando cliente...</p>
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
                {client.profileImage ? (
                  <img 
                    src={client.profileImage} 
                    alt="Cliente" 
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  <span className="text-gray-600 text-sm font-medium">
                    {client.firstName?.[0]}{client.lastName?.[0]}
                  </span>
                )}
              </div>
              <div>
                <h1 className="text-lg font-semibold">
                  {client.firstName} {client.lastName}
                </h1>
                <p className="text-sm text-gray-500">{client.email}</p>
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
