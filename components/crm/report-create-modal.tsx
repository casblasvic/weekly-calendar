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
import { Checkbox } from "@/components/ui/checkbox"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { 
  FileText, BarChart3, LineChart, PieChart, TrendingUp, 
  Calendar, Users, Target, DollarSign, Clock, Activity
} from "lucide-react"

interface ReportCreateModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

// Tipos de informe disponibles
const reportTypes = [
  {
    id: "performance",
    name: "Rendimiento General",
    description: "Análisis completo del rendimiento del CRM",
    icon: TrendingUp,
    color: "text-blue-600 bg-blue-100",
  },
  {
    id: "sales",
    name: "Ventas y Conversión",
    description: "Métricas de ventas, conversiones y revenue",
    icon: DollarSign,
    color: "text-green-600 bg-green-100",
  },
  {
    id: "leads",
    name: "Análisis de Leads",
    description: "Estado y evolución de leads en el pipeline",
    icon: Users,
    color: "text-purple-600 bg-purple-100",
  },
  {
    id: "campaigns",
    name: "Rendimiento de Campañas",
    description: "Efectividad y ROI de campañas de marketing",
    icon: Target,
    color: "text-orange-600 bg-orange-100",
  },
  {
    id: "activity",
    name: "Actividad del Equipo",
    description: "Productividad y actividades del equipo comercial",
    icon: Activity,
    color: "text-indigo-600 bg-indigo-100",
  },
  {
    id: "custom",
    name: "Informe Personalizado",
    description: "Crea un informe con métricas específicas",
    icon: FileText,
    color: "text-gray-600 bg-gray-100",
  },
]

// Métricas disponibles para informes personalizados
const availableMetrics = [
  { id: "leads_created", label: "Leads creados", category: "leads" },
  { id: "leads_converted", label: "Leads convertidos", category: "leads" },
  { id: "conversion_rate", label: "Tasa de conversión", category: "leads" },
  { id: "opportunities_created", label: "Oportunidades creadas", category: "sales" },
  { id: "opportunities_won", label: "Oportunidades ganadas", category: "sales" },
  { id: "revenue_generated", label: "Ingresos generados", category: "sales" },
  { id: "average_deal_size", label: "Ticket promedio", category: "sales" },
  { id: "campaign_sent", label: "Campañas enviadas", category: "campaigns" },
  { id: "campaign_opened", label: "Aperturas de campaña", category: "campaigns" },
  { id: "campaign_clicked", label: "Clics en campaña", category: "campaigns" },
  { id: "activities_completed", label: "Actividades completadas", category: "activity" },
  { id: "calls_made", label: "Llamadas realizadas", category: "activity" },
  { id: "meetings_held", label: "Reuniones realizadas", category: "activity" },
]

export function ReportCreateModal({ open, onOpenChange }: ReportCreateModalProps) {
  const [selectedType, setSelectedType] = useState("")
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>([])
  const [reportName, setReportName] = useState("")
  const [reportDescription, setReportDescription] = useState("")
  const [frequency, setFrequency] = useState("monthly")
  const [format, setFormat] = useState("dashboard")

  const handleCreateReport = () => {
    // Aquí iría la lógica para crear el informe
    console.log("Crear informe:", {
      type: selectedType,
      name: reportName,
      description: reportDescription,
      metrics: selectedMetrics,
      frequency,
      format,
    })
    
    // Cerrar modal y resetear estado
    onOpenChange(false)
    setSelectedType("")
    setSelectedMetrics([])
    setReportName("")
    setReportDescription("")
    setFrequency("monthly")
    setFormat("dashboard")
  }

  const toggleMetric = (metricId: string) => {
    setSelectedMetrics(prev => 
      prev.includes(metricId)
        ? prev.filter(id => id !== metricId)
        : [...prev, metricId]
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Crear Nuevo Informe</DialogTitle>
          <DialogDescription>
            Selecciona el tipo de informe y configura las métricas que deseas analizar
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Selección del tipo de informe */}
          <div className="space-y-3">
            <Label>Tipo de Informe</Label>
            <div className="grid grid-cols-2 gap-3">
              {reportTypes.map((type) => {
                const Icon = type.icon
                return (
                  <button
                    key={type.id}
                    onClick={() => setSelectedType(type.id)}
                    className={`p-4 rounded-lg border-2 text-left transition-all ${
                      selectedType === type.id
                        ? "border-purple-500 bg-purple-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg ${type.color}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-sm">{type.name}</h4>
                        <p className="text-xs text-gray-500 mt-1">{type.description}</p>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Nombre y descripción del informe */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reportName">Nombre del Informe</Label>
              <Input
                id="reportName"
                value={reportName}
                onChange={(e) => setReportName(e.target.value)}
                placeholder="Ej: Informe Mensual de Ventas Q1 2024"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="reportDescription">Descripción (opcional)</Label>
              <Textarea
                id="reportDescription"
                value={reportDescription}
                onChange={(e) => setReportDescription(e.target.value)}
                placeholder="Describe el propósito y alcance de este informe..."
                rows={3}
              />
            </div>
          </div>

          {/* Métricas personalizadas (solo para informes custom) */}
          {selectedType === "custom" && (
            <div className="space-y-3">
              <Label>Métricas a Incluir</Label>
              <div className="border rounded-lg p-4 max-h-48 overflow-y-auto space-y-2">
                {availableMetrics.map((metric) => (
                  <div key={metric.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={metric.id}
                      checked={selectedMetrics.includes(metric.id)}
                      onCheckedChange={() => toggleMetric(metric.id)}
                    />
                    <Label
                      htmlFor={metric.id}
                      className="text-sm font-normal cursor-pointer flex-1"
                    >
                      {metric.label}
                    </Label>
                    <span className="text-xs text-gray-500 capitalize">{metric.category}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Configuración adicional */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Frecuencia de Actualización</Label>
              <Select value={frequency} onValueChange={setFrequency}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Diario</SelectItem>
                  <SelectItem value="weekly">Semanal</SelectItem>
                  <SelectItem value="monthly">Mensual</SelectItem>
                  <SelectItem value="quarterly">Trimestral</SelectItem>
                  <SelectItem value="yearly">Anual</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Formato de Visualización</Label>
              <RadioGroup value={format} onValueChange={setFormat}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="dashboard" id="dashboard" />
                  <Label htmlFor="dashboard" className="font-normal">Dashboard interactivo</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="pdf" id="pdf" />
                  <Label htmlFor="pdf" className="font-normal">Informe PDF</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="excel" id="excel" />
                  <Label htmlFor="excel" className="font-normal">Exportación Excel</Label>
                </div>
              </RadioGroup>
            </div>
          </div>

          {/* Programación (opcional) */}
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Checkbox id="schedule" />
              <Label htmlFor="schedule" className="font-normal">
                Programar envío automático por email
              </Label>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleCreateReport}
            disabled={!selectedType || !reportName}
            className="bg-purple-600 hover:bg-purple-700"
          >
            Crear Informe
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
