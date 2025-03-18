"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { ExternalLink, Mail, Calendar, X } from "lucide-react"

interface ClientDetailsPanelProps {
  isOpen: boolean
  onClose: () => void
  client: {
    id: string
    name: string
    email: string
    phone: string
    clientNumber: string
    clinic: string
    registrationDate: string
  }
}

export function ClientDetailsPanel({ isOpen, onClose, client }: ClientDetailsPanelProps) {
  if (!isOpen) return null

  return (
    <>
      <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 w-[600px] bg-white shadow-lg z-50 overflow-hidden flex flex-col animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="p-6 border-b">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Detalles del Cliente</h2>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          </div>
          <div className="flex items-start gap-4">
            <div className="w-[100px] h-[100px] rounded-lg bg-gray-100 flex items-center justify-center">
              <div className="w-16 h-16 bg-gray-300 rounded-full" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-medium text-gray-900">{client.name}</h2>
                <ExternalLink className="h-4 w-4 text-purple-600" />
              </div>
              <p className="text-purple-600">{client.email}</p>
              <p className="text-purple-600">{client.phone}</p>
            </div>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-8">
            {/* Client Info */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label className="text-xs text-gray-500">Nº Cliente</Label>
                <Input value={client.clientNumber} readOnly className="bg-gray-50" />
              </div>
              <div className="col-span-2">
                <Label className="text-xs text-gray-500">Clínica</Label>
                <Input value={client.clinic} readOnly className="bg-gray-50" />
              </div>
              <div>
                <Label className="text-xs text-gray-500">Fecha alta</Label>
                <Input value={client.registrationDate} readOnly className="bg-gray-50" />
              </div>
              <div>
                <Label className="text-xs text-purple-600">¿Cómo nos has conocido?</Label>
                <Select defaultValue="recommande">
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccione una opción" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="recommande">Recommandé</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-gray-500">Etapa del ciclo de vida</Label>
                <Input value="Cliente" readOnly className="bg-gray-50" />
              </div>
            </div>

            {/* Personal Data */}
            <div>
              <h3 className="text-lg font-medium text-gray-700 mb-4">Datos personales</h3>
              <div className="space-y-4">
                <div>
                  <Label className="text-xs text-purple-600">Nombre</Label>
                  <Input defaultValue="vicente" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-purple-600">Primer apellido</Label>
                    <Input defaultValue="blasco" />
                  </div>
                  <div>
                    <Label className="text-xs text-gray-500">Segundo apellido</Label>
                    <Input />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="relative">
                    <Label className="text-xs text-gray-500">Fecha nacimiento</Label>
                    <div className="relative">
                      <Input type="text" placeholder="DD/MM/AAAA" />
                      <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-purple-600" />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs text-gray-500">Sexo</Label>
                    <Select defaultValue="mujer">
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccione una opción" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="mujer">Mujer</SelectItem>
                        <SelectItem value="hombre">Hombre</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-purple-600">Tipo de documento</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccione una opción" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="dni">DNI</SelectItem>
                        <SelectItem value="passport">Pasaporte</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs text-gray-500">Número de documento</Label>
                    <Input />
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-gray-500">Notas</Label>
                  <Textarea className="min-h-[100px] resize-none" />
                </div>
              </div>
            </div>

            {/* Contact Data */}
            <div>
              <h3 className="text-lg font-medium text-gray-700 mb-4">Datos de contacto</h3>
              <div className="space-y-4">
                <div className="relative">
                  <Label className="text-xs text-purple-600">E-mail</Label>
                  <div className="relative">
                    <Input type="email" value={client.email} />
                    <Mail className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-purple-600" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-purple-600">Teléfono 1</Label>
                    <Input value={client.phone} />
                  </div>
                  <div>
                    <Label className="text-xs text-gray-500">Teléfono 2</Label>
                    <Input />
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-gray-500">Teléfono 3</Label>
                  <Input />
                </div>
                <div>
                  <Label className="text-xs text-gray-500">Dirección</Label>
                  <Input />
                </div>
                <div>
                  <Label className="text-xs text-gray-500">Localidad</Label>
                  <Input />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label className="text-xs text-gray-500">País</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="(Elija uno)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="maroc">Maroc</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs text-gray-500">Provincia</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="(Ninguna)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="casablanca">Casablanca</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs text-gray-500">CP</Label>
                    <Input />
                  </div>
                </div>
              </div>
            </div>

            {/* Configuration */}
            <div>
              <h3 className="text-lg font-medium text-gray-700 mb-4">Configuración</h3>
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Checkbox id="vipClient" />
                  <label htmlFor="vipClient" className="text-sm text-gray-700">
                    Cliente VIP
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="privacyPolicy" defaultChecked />
                  <label htmlFor="privacyPolicy" className="text-sm text-gray-700">
                    Política de Privacidad
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="commercialComm" defaultChecked />
                  <div className="flex items-center gap-2">
                    <label htmlFor="commercialComm" className="text-sm text-gray-700">
                      Acepto recibir comunicaciones comerciales
                    </label>
                    <Button variant="link" className="h-auto p-0 text-purple-600">
                      Ver historial de cambios
                    </Button>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="preventAppAppts" />
                  <label htmlFor="preventAppAppts" className="text-sm text-gray-700">
                    Impedir citas desde la App
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Fixed Footer */}
        <div className="border-t p-4 flex justify-end gap-2 bg-white">
          <Button variant="outline" onClick={onClose}>
            Cerrar
          </Button>
          <Button className="bg-purple-600 hover:bg-purple-700">Guardar</Button>
        </div>
      </div>
    </>
  )
}

