"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { cn } from "@/lib/utils"
import { User, MapPin, Calendar, Settings, ArrowLeft, Trash2, Save, FileText, Camera, Bell } from "lucide-react"
import { useRouter } from "next/navigation"

interface Client {
  id: string
  name: string
  email: string
  phone: string
  clientNumber: string
  clinic: string
  registrationDate: string
}

interface MobileClientDetailsProps {
  client: Client
}

const tabs = [
  { id: "details", label: "DATOS", icon: User },
  { id: "history", label: "HISTORIAL", icon: FileText },
  { id: "consents", label: "CONSENTIMIENTOS", icon: FileText },
  { id: "deferred", label: "APLAZADO", icon: Calendar },
  { id: "vouchers", label: "BONOS", icon: FileText },
  { id: "photos", label: "FOTOGRAFÍAS", icon: Camera },
  { id: "notifications", label: "AVISOS", icon: Bell },
]

export function MobileClientDetails({ client }: MobileClientDetailsProps) {
  const [activeTab, setActiveTab] = useState("details")
  const router = useRouter()
  const tabsContainerRef = useRef<HTMLDivElement>(null)
  const activeTabRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (activeTabRef.current && tabsContainerRef.current) {
      const container = tabsContainerRef.current
      const tab = activeTabRef.current
      const containerWidth = container.offsetWidth
      const tabWidth = tab.offsetWidth
      const tabLeft = tab.offsetLeft

      container.scrollTo({
        left: tabLeft - containerWidth / 2 + tabWidth / 2,
        behavior: "smooth",
      })
    }
  }, [activeTab])

  const renderTabContent = () => {
    switch (activeTab) {
      case "details":
        return (
          <div className="space-y-6 p-4">
            {/* Personal Data */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <User className="h-5 w-5 text-purple-600" />
                <h2 className="text-lg font-medium">Datos personales</h2>
              </div>
              <div className="space-y-4">
                <div>
                  <Label className="text-xs text-purple-600">Nombre</Label>
                  <Input defaultValue={client.name} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-purple-600">Primer apellido</Label>
                    <Input defaultValue={client.name.split(" ")[1]} />
                  </div>
                  <div>
                    <Label className="text-xs text-gray-500">Segundo apellido</Label>
                    <Input defaultValue={client.name.split(" ")[2]} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-gray-500">Fecha nacimiento</Label>
                    <div className="relative">
                      <Input type="text" placeholder="DD/MM/AAAA" />
                      <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-purple-600" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Contact Data */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <MapPin className="h-5 w-5 text-purple-600" />
                <h2 className="text-lg font-medium">Datos de contacto</h2>
              </div>
              <div className="space-y-4">
                <div>
                  <Label className="text-xs text-purple-600">E-mail</Label>
                  <Input type="email" value={client.email} />
                </div>
                <div>
                  <Label className="text-xs text-purple-600">Teléfono</Label>
                  <Input value={client.phone} />
                </div>
              </div>
            </div>

            {/* Configuration */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Settings className="h-5 w-5 text-purple-600" />
                <h2 className="text-lg font-medium">Configuración</h2>
              </div>
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Checkbox id="vipClient" />
                  <label htmlFor="vipClient" className="text-sm">
                    Cliente VIP
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="privacyPolicy" defaultChecked />
                  <label htmlFor="privacyPolicy" className="text-sm">
                    Política de Privacidad
                  </label>
                </div>
              </div>
            </div>
          </div>
        )
      // Implementar otros tabs según sea necesario
      default:
        return <div className="p-4">Contenido en desarrollo para la pestaña {activeTab}</div>
    }
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-100">
      {/* Client Header */}
      <div className="bg-white p-4 border-b">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center">
            <span className="text-lg font-medium text-purple-600">
              {client.name
                .split(" ")
                .map((n) => n[0])
                .join("")
                .toUpperCase()}
            </span>
          </div>
          <div>
            <h2 className="text-lg font-medium">{client.name}</h2>
            <p className="text-sm text-gray-500">Nº: {client.clientNumber}</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b">
        <div
          ref={tabsContainerRef}
          className="flex overflow-x-auto scrollbar-hide"
          style={{
            scrollSnapType: "x mandatory",
            WebkitOverflowScrolling: "touch",
          }}
        >
          {tabs.map((tab) => (
            <button
              key={tab.id}
              ref={tab.id === activeTab ? activeTabRef : null}
              className={cn(
                "px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors",
                "scroll-snap-align-start",
                activeTab === tab.id
                  ? "text-purple-600 border-b-2 border-purple-600"
                  : "text-gray-500 hover:text-gray-700",
              )}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-auto bg-white">{renderTabContent()}</div>

      {/* Fixed Action Buttons */}
      <div className="fixed bottom-16 left-0 right-0 bg-white border-t p-2">
        <div className="flex justify-around">
          {tabs.map((tab) => {
            const Icon = tab.icon
            return (
              <Button
                key={tab.id}
                variant="ghost"
                size="sm"
                className={cn("flex flex-col items-center", activeTab === tab.id ? "text-purple-600" : "text-gray-500")}
                onClick={() => setActiveTab(tab.id)}
              >
                <Icon className="h-5 w-5" />
                <span className="text-xs mt-1">{tab.label}</span>
              </Button>
            )
          })}
        </div>
      </div>

      {/* Dynamic Action Buttons */}
      <div className="p-4 bg-white border-t fixed bottom-0 left-0 right-0">
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={() => router.back()}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver
          </Button>
          <Button variant="outline" className="flex-1 text-red-600">
            <Trash2 className="w-4 h-4 mr-2" />
            Eliminar
          </Button>
          <Button className="flex-1 bg-purple-600 hover:bg-purple-700">
            <Save className="w-4 h-4 mr-2" />
            Guardar
          </Button>
        </div>
      </div>
    </div>
  )
}

