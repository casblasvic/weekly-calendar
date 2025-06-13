"use client"

import { useState } from "react"
import { 
  Calendar, Clock, User, Building2, Phone, Mail, Tag, 
  FileText, MessageSquare, CalendarCheck, History,
  TrendingUp, AlertCircle, CheckCircle2, X
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"

interface OpportunityDetailViewProps {
  opportunity: any
  onClose?: () => void
}

export function OpportunityDetailView({ opportunity, onClose }: OpportunityDetailViewProps) {
  const [showNoteForm, setShowNoteForm] = useState(false)
  const [note, setNote] = useState("")

  return (
    <div className="space-y-6 p-6 bg-gray-50 rounded-lg border-2 border-primary/20">
      {/* Header con información principal */}
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3 className="text-xl font-semibold mb-2">{opportunity.title}</h3>
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <span className="flex items-center gap-1">
              <User className="h-4 w-4" />
              {opportunity.client}
            </span>
            <span className="flex items-center gap-1">
              <Building2 className="h-4 w-4" />
              {opportunity.source}
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              Creada: {new Date(opportunity.createdAt || Date.now()).toLocaleDateString('es-ES')}
            </span>
          </div>
        </div>
        {onClose && (
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Métricas principales */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600">Valor</p>
                <p className="text-lg font-bold">
                  {opportunity.value.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
                </p>
              </div>
              <TrendingUp className="h-5 w-5 text-primary" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600">Probabilidad</p>
                <p className="text-lg font-bold">{opportunity.probability}%</p>
              </div>
              <Progress value={opportunity.probability} className="w-12 h-12" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600">Cierre esperado</p>
                <p className="text-sm font-medium">
                  {new Date(opportunity.expectedCloseDate).toLocaleDateString('es-ES')}
                </p>
              </div>
              <CalendarCheck className="h-5 w-5 text-green-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600">Días en etapa</p>
                <p className="text-lg font-bold">{opportunity.daysInStage}</p>
              </div>
              {opportunity.daysInStage > 10 ? (
                <AlertCircle className="h-5 w-5 text-orange-500" />
              ) : (
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Separator />

      {/* Información de contacto */}
      <div className="grid grid-cols-2 gap-6">
        <div>
          <h4 className="font-medium mb-3">Información de Contacto</h4>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-gray-400" />
              <span>{opportunity.client}</span>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-gray-400" />
              <span>+34 600 123 456</span>
            </div>
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-gray-400" />
              <span>cliente@email.com</span>
            </div>
          </div>
        </div>
        
        <div>
          <h4 className="font-medium mb-3">Asignación</h4>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-gray-400" />
              <span>Propietario: {opportunity.owner}</span>
            </div>
            <div className="flex items-center gap-2">
              <Tag className="h-4 w-4 text-gray-400" />
              <span>Etapa: {opportunity.stage}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-gray-400" />
              <span>Última actividad: {opportunity.lastActivity}</span>
            </div>
          </div>
        </div>
      </div>

      <Separator />

      {/* Actividad reciente */}
      <div>
        <h4 className="font-medium mb-3">Actividad Reciente</h4>
        <div className="space-y-3">
          <div className="flex items-start gap-3 p-3 bg-white rounded-lg">
            <MessageSquare className="h-4 w-4 text-gray-400 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium">Llamada de seguimiento</p>
              <p className="text-xs text-gray-500">Hace 2 días - Cliente interesado, solicita más información</p>
            </div>
          </div>
          
          <div className="flex items-start gap-3 p-3 bg-white rounded-lg">
            <FileText className="h-4 w-4 text-gray-400 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium">Propuesta enviada</p>
              <p className="text-xs text-gray-500">Hace 5 días - Propuesta personalizada con descuento del 10%</p>
            </div>
          </div>
          
          <div className="flex items-start gap-3 p-3 bg-white rounded-lg">
            <History className="h-4 w-4 text-gray-400 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium">Primera consulta</p>
              <p className="text-xs text-gray-500">Hace 1 semana - Contacto inicial vía Instagram</p>
            </div>
          </div>
        </div>
      </div>

      {/* Formulario para añadir nota */}
      {showNoteForm && (
        <div className="space-y-3 p-4 bg-white rounded-lg border">
          <h4 className="font-medium">Añadir Nota</h4>
          <Textarea
            placeholder="Escribe una nota sobre esta oportunidad..."
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="min-h-[100px]"
          />
          <div className="flex gap-2">
            <Button size="sm">Guardar Nota</Button>
            <Button size="sm" variant="outline" onClick={() => {
              setShowNoteForm(false)
              setNote("")
            }}>
              Cancelar
            </Button>
          </div>
        </div>
      )}

      {/* Acciones */}
      <div className="flex gap-2">
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => setShowNoteForm(!showNoteForm)}
        >
          <MessageSquare className="h-4 w-4 mr-1" />
          Añadir Nota
        </Button>
        <Button variant="outline" size="sm">
          <CalendarCheck className="h-4 w-4 mr-1" />
          Programar Actividad
        </Button>
        <Button variant="outline" size="sm">
          <FileText className="h-4 w-4 mr-1" />
          Ver Historial Completo
        </Button>
      </div>
    </div>
  )
}
