"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import {
  User, Mail, Phone, Building2, Globe, MapPin,
  DollarSign, Tag, Calendar, FileText, Plus
} from "lucide-react"

interface LeadCreateModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function LeadCreateModal({ open, onOpenChange }: LeadCreateModalProps) {
  const [activeTab, setActiveTab] = useState("basic")
  const [leadData, setLeadData] = useState({
    // Información básica
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    company: "",
    position: "",
    
    // Información adicional
    source: "web",
    status: "new",
    assignedTo: "",
    value: "",
    probability: "50",
    
    // Dirección
    address: "",
    city: "",
    postalCode: "",
    country: "ES",
    
    // Notas
    notes: "",
    tags: [],
  })

  const sources = [
    { value: "web", label: "Sitio Web" },
    { value: "phone", label: "Llamada Telefónica" },
    { value: "email", label: "Email" },
    { value: "referral", label: "Referencia" },
    { value: "social", label: "Redes Sociales" },
    { value: "event", label: "Evento" },
    { value: "advertisement", label: "Publicidad" },
    { value: "other", label: "Otro" },
  ]

  const users = [
    { value: "maria", label: "María García" },
    { value: "carlos", label: "Carlos López" },
    { value: "ana", label: "Ana Martínez" },
  ]

  const handleSubmit = () => {
    console.log("Creando lead:", leadData)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Nuevo Lead</DialogTitle>
          <DialogDescription>
            Complete la información para crear un nuevo lead en el sistema
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="basic">Básico</TabsTrigger>
            <TabsTrigger value="additional">Adicional</TabsTrigger>
            <TabsTrigger value="address">Dirección</TabsTrigger>
            <TabsTrigger value="notes">Notas</TabsTrigger>
          </TabsList>

          <div className="mt-6">
            <TabsContent value="basic" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">
                    Nombre <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <User className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                    <Input
                      id="firstName"
                      placeholder="Nombre"
                      value={leadData.firstName}
                      onChange={(e) => setLeadData({ ...leadData, firstName: e.target.value })}
                      className="pl-10"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="lastName">
                    Apellidos <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="lastName"
                    placeholder="Apellidos"
                    value={leadData.lastName}
                    onChange={(e) => setLeadData({ ...leadData, lastName: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">
                  Email <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="email@ejemplo.com"
                    value={leadData.email}
                    onChange={(e) => setLeadData({ ...leadData, email: e.target.value })}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Teléfono</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="+34 600 000 000"
                    value={leadData.phone}
                    onChange={(e) => setLeadData({ ...leadData, phone: e.target.value })}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="company">Empresa</Label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                    <Input
                      id="company"
                      placeholder="Nombre de la empresa"
                      value={leadData.company}
                      onChange={(e) => setLeadData({ ...leadData, company: e.target.value })}
                      className="pl-10"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="position">Cargo</Label>
                  <Input
                    id="position"
                    placeholder="Cargo en la empresa"
                    value={leadData.position}
                    onChange={(e) => setLeadData({ ...leadData, position: e.target.value })}
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="additional" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="source">Fuente del Lead</Label>
                  <Select
                    value={leadData.source}
                    onValueChange={(value) => setLeadData({ ...leadData, source: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {sources.map((source) => (
                        <SelectItem key={source.value} value={source.value}>
                          {source.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="assignedTo">Asignar a</Label>
                  <Select
                    value={leadData.assignedTo}
                    onValueChange={(value) => setLeadData({ ...leadData, assignedTo: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar usuario" />
                    </SelectTrigger>
                    <SelectContent>
                      {users.map((user) => (
                        <SelectItem key={user.value} value={user.value}>
                          {user.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="value">Valor Estimado</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                    <Input
                      id="value"
                      type="number"
                      placeholder="0.00"
                      value={leadData.value}
                      onChange={(e) => setLeadData({ ...leadData, value: e.target.value })}
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="probability">Probabilidad (%)</Label>
                  <Select
                    value={leadData.probability}
                    onValueChange={(value) => setLeadData({ ...leadData, probability: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10%</SelectItem>
                      <SelectItem value="25">25%</SelectItem>
                      <SelectItem value="50">50%</SelectItem>
                      <SelectItem value="75">75%</SelectItem>
                      <SelectItem value="90">90%</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Estado del Lead</Label>
                <div className="flex gap-2">
                  <Badge variant="secondary" className="cursor-pointer">
                    Nuevo
                  </Badge>
                  <Badge variant="outline" className="cursor-pointer">
                    Contactado
                  </Badge>
                  <Badge variant="outline" className="cursor-pointer">
                    Calificado
                  </Badge>
                  <Badge variant="outline" className="cursor-pointer">
                    En Negociación
                  </Badge>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="address" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="address">Dirección</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                  <Input
                    id="address"
                    placeholder="Calle y número"
                    value={leadData.address}
                    onChange={(e) => setLeadData({ ...leadData, address: e.target.value })}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city">Ciudad</Label>
                  <Input
                    id="city"
                    placeholder="Ciudad"
                    value={leadData.city}
                    onChange={(e) => setLeadData({ ...leadData, city: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="postalCode">Código Postal</Label>
                  <Input
                    id="postalCode"
                    placeholder="28001"
                    value={leadData.postalCode}
                    onChange={(e) => setLeadData({ ...leadData, postalCode: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="country">País</Label>
                <Select
                  value={leadData.country}
                  onValueChange={(value) => setLeadData({ ...leadData, country: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ES">España</SelectItem>
                    <SelectItem value="FR">Francia</SelectItem>
                    <SelectItem value="PT">Portugal</SelectItem>
                    <SelectItem value="IT">Italia</SelectItem>
                    <SelectItem value="UK">Reino Unido</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </TabsContent>

            <TabsContent value="notes" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="notes">Notas Iniciales</Label>
                <Textarea
                  id="notes"
                  placeholder="Añade cualquier información relevante sobre este lead..."
                  value={leadData.notes}
                  onChange={(e) => setLeadData({ ...leadData, notes: e.target.value })}
                  rows={5}
                />
              </div>

              <div className="space-y-2">
                <Label>Etiquetas</Label>
                <div className="flex gap-2 flex-wrap">
                  <Badge variant="secondary" className="cursor-pointer">
                    <Tag className="h-3 w-3 mr-1" />
                    Prioritario
                  </Badge>
                  <Badge variant="outline" className="cursor-pointer">
                    <Tag className="h-3 w-3 mr-1" />
                    Decisor
                  </Badge>
                  <Badge variant="outline" className="cursor-pointer">
                    <Tag className="h-3 w-3 mr-1" />
                    Presupuesto Alto
                  </Badge>
                  <Button variant="outline" size="sm">
                    <Plus className="h-3 w-3 mr-1" />
                    Añadir Etiqueta
                  </Button>
                </div>
              </div>
            </TabsContent>
          </div>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit}>
            Crear Lead
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
