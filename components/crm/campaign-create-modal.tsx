"use client"

import { useState } from "react"
import { 
  X, Calendar, Target, Users, Mail, MessageSquare, 
  Globe, FileText, Tag, Clock, DollarSign
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"

interface CampaignCreateModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave?: (campaign: any) => void
}

export function CampaignCreateModal({ open, onOpenChange, onSave }: CampaignCreateModalProps) {
  const [campaignData, setCampaignData] = useState({
    name: "",
    type: "email",
    objective: "",
    targetAudience: "",
    startDate: "",
    endDate: "",
    budget: "",
    description: "",
    channels: [] as string[],
    segments: [] as string[],
    scheduledSend: false,
    scheduledDate: "",
    scheduledTime: ""
  })

  const handleSave = () => {
    onSave?.(campaignData)
    onOpenChange(false)
    // Reset form
    setCampaignData({
      name: "",
      type: "email",
      objective: "",
      targetAudience: "",
      startDate: "",
      endDate: "",
      budget: "",
      description: "",
      channels: [],
      segments: [],
      scheduledSend: false,
      scheduledDate: "",
      scheduledTime: ""
    })
  }

  const toggleChannel = (channel: string) => {
    setCampaignData(prev => ({
      ...prev,
      channels: prev.channels.includes(channel)
        ? prev.channels.filter(c => c !== channel)
        : [...prev.channels, channel]
    }))
  }

  const toggleSegment = (segment: string) => {
    setCampaignData(prev => ({
      ...prev,
      segments: prev.segments.includes(segment)
        ? prev.segments.filter(s => s !== segment)
        : [...prev.segments, segment]
    }))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nueva Campaña</DialogTitle>
          <DialogDescription>
            Crea una nueva campaña de marketing para conectar con tus clientes
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Información básica */}
          <div className="space-y-4">
            <h3 className="font-medium text-sm text-gray-700">Información Básica</h3>
            
            <div className="grid gap-4">
              <div>
                <Label htmlFor="name">Nombre de la campaña</Label>
                <Input
                  id="name"
                  value={campaignData.name}
                  onChange={(e) => setCampaignData({ ...campaignData, name: e.target.value })}
                  placeholder="Ej: Promoción de Verano 2024"
                />
              </div>

              <div>
                <Label>Tipo de campaña</Label>
                <RadioGroup
                  value={campaignData.type}
                  onValueChange={(value) => setCampaignData({ ...campaignData, type: value })}
                  className="grid grid-cols-4 gap-4 mt-2"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="email" id="email" />
                    <Label htmlFor="email" className="font-normal cursor-pointer">
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        Email
                      </div>
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="sms" id="sms" />
                    <Label htmlFor="sms" className="font-normal cursor-pointer">
                      <div className="flex items-center gap-2">
                        <MessageSquare className="h-4 w-4" />
                        SMS
                      </div>
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="social" id="social" />
                    <Label htmlFor="social" className="font-normal cursor-pointer">
                      <div className="flex items-center gap-2">
                        <Globe className="h-4 w-4" />
                        Social
                      </div>
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="multi" id="multi" />
                    <Label htmlFor="multi" className="font-normal cursor-pointer">
                      <div className="flex items-center gap-2">
                        <Target className="h-4 w-4" />
                        Multicanal
                      </div>
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              <div>
                <Label htmlFor="objective">Objetivo</Label>
                <Select
                  value={campaignData.objective}
                  onValueChange={(value) => setCampaignData({ ...campaignData, objective: value })}
                >
                  <SelectTrigger id="objective">
                    <SelectValue placeholder="Selecciona el objetivo principal" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="awareness">Aumentar conocimiento de marca</SelectItem>
                    <SelectItem value="engagement">Mejorar engagement</SelectItem>
                    <SelectItem value="conversion">Aumentar conversiones</SelectItem>
                    <SelectItem value="retention">Fidelización de clientes</SelectItem>
                    <SelectItem value="reactivation">Reactivar clientes inactivos</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Audiencia */}
          <div className="space-y-4">
            <h3 className="font-medium text-sm text-gray-700">Audiencia Objetivo</h3>
            
            <div>
              <Label>Segmentos de clientes</Label>
              <div className="grid grid-cols-2 gap-3 mt-2">
                {[
                  "Clientes nuevos",
                  "Clientes frecuentes",
                  "Clientes VIP",
                  "Clientes inactivos",
                  "Leads cualificados",
                  "Suscriptores newsletter"
                ].map((segment) => (
                  <div key={segment} className="flex items-center space-x-2">
                    <Checkbox
                      id={segment}
                      checked={campaignData.segments.includes(segment)}
                      onCheckedChange={() => toggleSegment(segment)}
                    />
                    <Label
                      htmlFor={segment}
                      className="text-sm font-normal cursor-pointer"
                    >
                      {segment}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <Label htmlFor="targetAudience">Descripción adicional de audiencia</Label>
              <Textarea
                id="targetAudience"
                value={campaignData.targetAudience}
                onChange={(e) => setCampaignData({ ...campaignData, targetAudience: e.target.value })}
                placeholder="Ej: Mujeres de 25-45 años interesadas en tratamientos faciales"
                className="min-h-[80px]"
              />
            </div>
          </div>

          {/* Canales adicionales */}
          {campaignData.type === "multi" && (
            <div className="space-y-4">
              <h3 className="font-medium text-sm text-gray-700">Canales de distribución</h3>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { id: "email", label: "Email", icon: Mail },
                  { id: "sms", label: "SMS", icon: MessageSquare },
                  { id: "whatsapp", label: "WhatsApp", icon: MessageSquare },
                  { id: "facebook", label: "Facebook", icon: Globe },
                  { id: "instagram", label: "Instagram", icon: Globe },
                  { id: "web", label: "Web Push", icon: Globe }
                ].map((channel) => (
                  <div key={channel.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={channel.id}
                      checked={campaignData.channels.includes(channel.id)}
                      onCheckedChange={() => toggleChannel(channel.id)}
                    />
                    <Label
                      htmlFor={channel.id}
                      className="text-sm font-normal cursor-pointer flex items-center gap-2"
                    >
                      <channel.icon className="h-3 w-3" />
                      {channel.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Programación */}
          <div className="space-y-4">
            <h3 className="font-medium text-sm text-gray-700">Programación</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="startDate">Fecha de inicio</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={campaignData.startDate}
                  onChange={(e) => setCampaignData({ ...campaignData, startDate: e.target.value })}
                />
              </div>
              
              <div>
                <Label htmlFor="endDate">Fecha de fin</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={campaignData.endDate}
                  onChange={(e) => setCampaignData({ ...campaignData, endDate: e.target.value })}
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="scheduled"
                checked={campaignData.scheduledSend}
                onCheckedChange={(checked) => 
                  setCampaignData({ ...campaignData, scheduledSend: checked as boolean })
                }
              />
              <Label htmlFor="scheduled" className="font-normal cursor-pointer">
                Programar envío automático
              </Label>
            </div>

            {campaignData.scheduledSend && (
              <div className="grid grid-cols-2 gap-4 ml-6">
                <div>
                  <Label htmlFor="scheduledDate">Fecha de envío</Label>
                  <Input
                    id="scheduledDate"
                    type="date"
                    value={campaignData.scheduledDate}
                    onChange={(e) => setCampaignData({ ...campaignData, scheduledDate: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="scheduledTime">Hora de envío</Label>
                  <Input
                    id="scheduledTime"
                    type="time"
                    value={campaignData.scheduledTime}
                    onChange={(e) => setCampaignData({ ...campaignData, scheduledTime: e.target.value })}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Presupuesto */}
          <div className="space-y-4">
            <h3 className="font-medium text-sm text-gray-700">Presupuesto</h3>
            
            <div>
              <Label htmlFor="budget">Presupuesto estimado</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="budget"
                  type="number"
                  value={campaignData.budget}
                  onChange={(e) => setCampaignData({ ...campaignData, budget: e.target.value })}
                  placeholder="0.00"
                  className="pl-10"
                />
              </div>
            </div>
          </div>

          {/* Descripción */}
          <div className="space-y-4">
            <h3 className="font-medium text-sm text-gray-700">Descripción</h3>
            
            <div>
              <Label htmlFor="description">Descripción de la campaña</Label>
              <Textarea
                id="description"
                value={campaignData.description}
                onChange={(e) => setCampaignData({ ...campaignData, description: e.target.value })}
                placeholder="Describe los detalles de la campaña, mensaje principal, ofertas, etc."
                className="min-h-[100px]"
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave}>
            Crear Campaña
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
