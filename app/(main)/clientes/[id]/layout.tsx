"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useLastClient } from "@/contexts/last-client-context"
import { useClientCard } from "@/contexts/client-card-context"
import { use } from "react"
import { Client } from "@/types"
import { getMockClient } from "@/lib/mock-data"
import { useClient } from "@/contexts/client-context"

interface Client {
  id: string
  name: string
  clientNumber: string
  phone: string
  email: string
  clinic: string
  avatar?: string
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

export default function ClientLayout({ children, params }: { children: React.ReactNode; params: { id: string } }) {
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
  const { getClientById } = useClient()

  // Determinar la pestaña activa basada en la ruta
  useEffect(() => {
    const currentTabPath = pathname.replace(`/clientes/${clientId}`, "") || ""
    setActiveTab(currentTabPath)
  }, [pathname, clientId])

  useEffect(() => {
    setHideMainCard(true)
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
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
  }, [clientId, setLastClient, getClientById])

  // Función para cambiar de pestaña sin forzar recarga completa
  const handleTabChange = (tabPath: string) => {
    router.push(`/clientes/${clientId}${tabPath}`, { shallow: true })
  }

  if (!client) return null

  return (
    <div className="min-h-screen flex flex-col">
      {/* Tabs como menú principal */}
      <div className={`border-b ${isMobile ? "sticky top-0 bg-white z-10" : "bg-white"}`}>
        <div className="container mx-auto px-4 md:px-8">
          <div
            ref={tabsRef}
            className={`flex ${isMobile ? "overflow-x-auto scrollbar-hide" : "flex-wrap"} space-x-2 md:space-x-4 py-3`}
          >
            {tabs.map((tab) => {
              const isActive = pathname === `/clientes/${client.id}${tab.path}`
              return (
                <button
                  key={tab.path}
                  onClick={() => handleTabChange(tab.path)}
                  className={`flex-shrink-0 px-4 py-2 text-sm font-medium rounded-full transition-colors duration-200 ${
                    isActive ? "bg-purple-600 text-white" : "text-gray-500 hover:text-purple-600 hover:bg-purple-100"
                  } ${isMobile ? "whitespace-nowrap" : ""}`}
                  aria-current={isActive ? "page" : undefined}
                >
                  {tab.label}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Page content */}
      <div className="flex-1 container mx-auto px-4 md:px-8 py-6">
        <div className="rounded-lg bg-white p-4 md:p-6 shadow-sm">
          {children}
        </div>
      </div>
    </div>
  )
}

