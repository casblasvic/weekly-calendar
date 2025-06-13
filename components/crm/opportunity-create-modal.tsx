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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import {
  CalendarIcon, User, Building, DollarSign, Target,
  Clock, Tag, FileText, Users, Briefcase, Phone,
  Mail, MapPin, Hash
} from "lucide-react"

interface OpportunityCreateModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  leadId?: string
  personId?: string
}

export function OpportunityCreateModal({ 
  open, 
  onOpenChange,
  leadId,
  personId 
}: OpportunityCreateModalProps) {
  const [opportunityData, setOpportunityData] = useState({
    name: "",
    description: "",
    value: "",
    probability: 50,
    pipeline: "",
    stage: "",
    closeDate: undefined as Date | undefined,
    contactPerson: leadId || personId || "",
    company: "",
    owner: "",
    tags: [],
    type: "new_business",
    source: "direct",
  })

  const handleSubmit = () => {
    console.log("Creando oportunidad:", opportunityData)
    onOpenChange(false)
  }

  const pipelines = [
    { id: "sales", name: "Pipeline de Ventas" },
    { id: "services", name: "Pipeline de Servicios" },
    { id: "products", name: "Pipeline de Productos" },
  ]

  const stages = [
    { id: "new", name: "Nuevo", probability: 10 },
    { id: "contacted", name: "Contactado", probability: 25 },
    { id: "qualified", name: "Calificado", probability: 50 },
    { id: "proposal", name: "Propuesta", probability: 75 },
    { id: "negotiation", name: "Negociación", probability: 85 },
    { id: "won", name: "Ganado", probability: 100 },
  ]

  const types = [
    { id: "new_business", name: "Nuevo Negocio", icon: Briefcase },
    { id: "upsell", name: "Venta Adicional", icon: Target },
    { id: "renewal", name: "Renovación", icon: Clock },
  ]

  const sources = [
    { id: "direct", name: "Directo" },
    { id: "website", name: "Sitio Web" },
    { id: "referral", name: "Referencia" },
    { id: "campaign", name: "Campaña" },
    { id: "social", name: "Redes Sociales" },
    { id: "other", name: "Otro" },
  ]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle>Nueva Oportunidad</DialogTitle>
          <DialogDescription>
            Crea una nueva oportunidad de negocio
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 overflow-y-auto max-h-[60vh] pr-2">
          {/* Información básica */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Briefcase className="h-5 w-5" />
                Información General
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="name">
                  Nombre de la Oportunidad <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="name"
                  value={opportunityData.name}
                  onChange={(e) => setOpportunityData({ ...opportunityData, name: e.target.value })}
                  placeholder="Ej: Contrato de servicios anuales"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="type">Tipo</Label>
                  <Select
                    value={opportunityData.type}
                    onValueChange={(value) => setOpportunityData({ ...opportunityData, type: value })}
                  >
                    <SelectTrigger id="type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {types.map((type) => (
                        <SelectItem key={type.id} value={type.id}>
                          <div className="flex items-center gap-2">
                            <type.icon className="h-4 w-4" />
                            {type.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="source">Origen</Label>
                  <Select
                    value={opportunityData.source}
                    onValueChange={(value) => setOpportunityData({ ...opportunityData, source: value })}
                  >
                    <SelectTrigger id="source">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {sources.map((source) => (
                        <SelectItem key={source.id} value={source.id}>
                          {source.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="closeDate">Fecha de cierre estimada</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        id="closeDate"
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !opportunityData.closeDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {opportunityData.closeDate ? (
                          format(opportunityData.closeDate, "PPP", { locale: es })
                        ) : (
                          <span>Seleccionar fecha</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={opportunityData.closeDate}
                        onSelect={(date) => setOpportunityData({ ...opportunityData, closeDate: date })}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              <div>
                <Label htmlFor="description">Descripción</Label>
                <Textarea
                  id="description"
                  value={opportunityData.description}
                  onChange={(e) => setOpportunityData({ ...opportunityData, description: e.target.value })}
                  placeholder="Describe los detalles de esta oportunidad..."
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Pipeline y etapa */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Target className="h-5 w-5" />
                Pipeline y Etapa
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="pipeline">
                    Pipeline <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={opportunityData.pipeline}
                    onValueChange={(value) => setOpportunityData({ ...opportunityData, pipeline: value })}
                  >
                    <SelectTrigger id="pipeline">
                      <SelectValue placeholder="Seleccionar pipeline" />
                    </SelectTrigger>
                    <SelectContent>
                      {pipelines.map((pipeline) => (
                        <SelectItem key={pipeline.id} value={pipeline.id}>
                          {pipeline.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="stage">
                    Etapa <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={opportunityData.stage}
                    onValueChange={(value) => {
                      const stage = stages.find(s => s.id === value)
                      setOpportunityData({ 
                        ...opportunityData, 
                        stage: value,
                        probability: stage?.probability || 50
                      })
                    }}
                  >
                    <SelectTrigger id="stage">
                      <SelectValue placeholder="Seleccionar etapa" />
                    </SelectTrigger>
                    <SelectContent>
                      {stages.map((stage) => (
                        <SelectItem key={stage.id} value={stage.id}>
                          <div className="flex items-center justify-between w-full">
                            <span>{stage.name}</span>
                            <span className="text-xs text-gray-500 ml-2">{stage.probability}%</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Valor y probabilidad */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Valor y Probabilidad
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="value">
                    Valor estimado <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-3 h-4 w-4 text-gray-500" />
                    <Input
                      id="value"
                      type="number"
                      value={opportunityData.value}
                      onChange={(e) => setOpportunityData({ ...opportunityData, value: e.target.value })}
                      placeholder="0.00"
                      className="pl-10"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="probability">Probabilidad de cierre (%)</Label>
                  <div className="flex items-center gap-3">
                    <Input
                      id="probability"
                      type="number"
                      value={opportunityData.probability}
                      onChange={(e) => setOpportunityData({ ...opportunityData, probability: parseInt(e.target.value) || 0 })}
                      min="0"
                      max="100"
                      className="flex-1"
                    />
                    <Badge variant="outline" className="min-w-[60px] justify-center">
                      {opportunityData.probability}%
                    </Badge>
                  </div>
                </div>
              </div>

              {opportunityData.value && (
                <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Valor ponderado:</span>
                    <span className="text-lg font-semibold">
                      ${((parseFloat(opportunityData.value) || 0) * (opportunityData.probability / 100)).toFixed(2)}
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Contacto y empresa */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="h-5 w-5" />
                Contacto y Empresa
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="contact">
                  Persona de contacto {leadId || personId ? "(pre-seleccionado)" : ""}
                </Label>
                <Select
                  value={opportunityData.contactPerson}
                  onValueChange={(value) => setOpportunityData({ ...opportunityData, contactPerson: value })}
                >
                  <SelectTrigger id="contact">
                    <SelectValue placeholder="Buscar contacto..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={leadId || personId || "1"}>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        Juan Pérez
                      </div>
                    </SelectItem>
                    <SelectItem value="2">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        María García
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="company">Empresa</Label>
                <Select
                  value={opportunityData.company}
                  onValueChange={(value) => setOpportunityData({ ...opportunityData, company: value })}
                >
                  <SelectTrigger id="company">
                    <SelectValue placeholder="Buscar empresa..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">
                      <div className="flex items-center gap-2">
                        <Building className="h-4 w-4" />
                        Empresa ABC
                      </div>
                    </SelectItem>
                    <SelectItem value="2">
                      <div className="flex items-center gap-2">
                        <Building className="h-4 w-4" />
                        Corporación XYZ
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="owner">Propietario/Responsable</Label>
                <Select
                  value={opportunityData.owner}
                  onValueChange={(value) => setOpportunityData({ ...opportunityData, owner: value })}
                >
                  <SelectTrigger id="owner">
                    <SelectValue placeholder="Asignar responsable..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="current">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        Yo (Usuario actual)
                      </div>
                    </SelectItem>
                    <SelectItem value="user2">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        Ana Martínez
                      </div>
                    </SelectItem>
                    <SelectItem value="user3">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        Carlos López
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!opportunityData.name || !opportunityData.value || !opportunityData.pipeline || !opportunityData.stage}
          >
            Crear Oportunidad
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
