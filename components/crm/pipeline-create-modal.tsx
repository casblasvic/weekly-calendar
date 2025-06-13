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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import {
  Plus, Trash2, ChevronUp, ChevronDown, ChevronRight,
  Settings, Palette, Target, Clock, Users
} from "lucide-react"

interface Stage {
  id: string
  name: string
  color: string
  probability: number
  description: string
}

interface PipelineCreateModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const DEFAULT_COLORS = [
  { name: "Azul", value: "#3B82F6" },
  { name: "Verde", value: "#10B981" },
  { name: "Amarillo", value: "#F59E0B" },
  { name: "Rojo", value: "#EF4444" },
  { name: "Morado", value: "#8B5CF6" },
  { name: "Rosa", value: "#EC4899" },
  { name: "Gris", value: "#6B7280" },
  { name: "Índigo", value: "#6366F1" },
]

export function PipelineCreateModal({ open, onOpenChange }: PipelineCreateModalProps) {
  const [pipelineData, setPipelineData] = useState({
    name: "",
    description: "",
    isDefault: false,
  })
  
  const [stages, setStages] = useState<Stage[]>([
    {
      id: "1",
      name: "Nuevo",
      color: "#6B7280",
      probability: 10,
      description: "Leads recién creados o sin contactar",
    },
    {
      id: "2",
      name: "Contactado",
      color: "#3B82F6",
      probability: 25,
      description: "Primer contacto realizado",
    },
    {
      id: "3",
      name: "Calificado",
      color: "#F59E0B",
      probability: 50,
      description: "Lead calificado y con interés",
    },
    {
      id: "4",
      name: "Propuesta",
      color: "#8B5CF6",
      probability: 75,
      description: "Propuesta enviada o en negociación",
    },
    {
      id: "5",
      name: "Ganado",
      color: "#10B981",
      probability: 100,
      description: "Negocio cerrado exitosamente",
    },
  ])

  const moveStage = (index: number, direction: 'up' | 'down') => {
    const newStages = [...stages]
    const newIndex = direction === 'up' ? index - 1 : index + 1
    
    if (newIndex >= 0 && newIndex < stages.length) {
      [newStages[index], newStages[newIndex]] = [newStages[newIndex], newStages[index]]
      setStages(newStages)
    }
  }

  const addStage = () => {
    const newStage: Stage = {
      id: Date.now().toString(),
      name: "",
      color: "#6B7280",
      probability: 50,
      description: "",
    }
    setStages([...stages, newStage])
  }

  const updateStage = (id: string, updates: Partial<Stage>) => {
    setStages(stages.map(stage => 
      stage.id === id ? { ...stage, ...updates } : stage
    ))
  }

  const removeStage = (id: string) => {
    if (stages.length > 1) {
      setStages(stages.filter(stage => stage.id !== id))
    }
  }

  const handleSubmit = () => {
    console.log("Creando pipeline:", { ...pipelineData, stages })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle>Crear Nuevo Pipeline</DialogTitle>
          <DialogDescription>
            Define las etapas y configuración de tu pipeline de ventas
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 overflow-y-auto max-h-[60vh]">
          {/* Información básica */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Información del Pipeline
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="name">
                  Nombre del Pipeline <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="name"
                  value={pipelineData.name}
                  onChange={(e) => setPipelineData({ ...pipelineData, name: e.target.value })}
                  placeholder="Ej: Pipeline de Ventas Principal"
                />
              </div>
              
              <div>
                <Label htmlFor="description">Descripción</Label>
                <Textarea
                  id="description"
                  value={pipelineData.description}
                  onChange={(e) => setPipelineData({ ...pipelineData, description: e.target.value })}
                  placeholder="Describe el propósito de este pipeline..."
                  rows={3}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="default">Pipeline por defecto</Label>
                  <p className="text-sm text-gray-500">
                    Los nuevos leads se asignarán automáticamente a este pipeline
                  </p>
                </div>
                <Switch
                  id="default"
                  checked={pipelineData.isDefault}
                  onCheckedChange={(checked) => setPipelineData({ ...pipelineData, isDefault: checked })}
                />
              </div>
            </CardContent>
          </Card>

          {/* Etapas del pipeline */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Target className="h-5 w-5" />
                Etapas del Pipeline
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-500 mb-4">
                Define las etapas por las que pasarán tus leads. Cada etapa debe tener un nombre único y una probabilidad de cierre.
              </p>
              
              {stages.map((stage, index) => (
                <div
                  key={stage.id}
                  className="bg-white border rounded-lg p-4 mb-3"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex flex-col gap-1 mt-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => moveStage(index, 'up')}
                        disabled={index === 0}
                        className="h-8 w-8 p-0"
                      >
                        <ChevronUp className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => moveStage(index, 'down')}
                        disabled={index === stages.length - 1}
                        className="h-8 w-8 p-0"
                      >
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    <div className="flex-1 space-y-3">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-4 h-4 rounded-full flex-shrink-0"
                          style={{ backgroundColor: stage.color }}
                        />
                        <Input
                          value={stage.name}
                          onChange={(e) => updateStage(stage.id, { name: e.target.value })}
                          placeholder="Nombre de la etapa"
                          className="flex-1"
                        />
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            value={stage.probability}
                            onChange={(e) => updateStage(stage.id, { probability: parseInt(e.target.value) || 0 })}
                            className="w-20 text-center"
                            min="0"
                            max="100"
                          />
                          <span className="text-sm text-gray-500">%</span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeStage(stage.id)}
                          className="text-red-600 hover:text-red-700"
                          disabled={stages.length === 1}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      
                      <div className="flex gap-2">
                        {DEFAULT_COLORS.map((color) => (
                          <button
                            key={color.value}
                            onClick={() => updateStage(stage.id, { color: color.value })}
                            className={`w-6 h-6 rounded-full border-2 ${
                              stage.color === color.value ? "border-gray-800" : "border-transparent"
                            }`}
                            style={{ backgroundColor: color.value }}
                            title={color.name}
                          />
                        ))}
                      </div>
                      
                      <Textarea
                        value={stage.description}
                        onChange={(e) => updateStage(stage.id, { description: e.target.value })}
                        placeholder="Descripción de la etapa (opcional)"
                        rows={2}
                        className="text-sm"
                      />
                    </div>
                  </div>
                </div>
              ))}

              <Button
                variant="outline"
                onClick={addStage}
                className="w-full mt-3"
              >
                <Plus className="h-4 w-4 mr-2" />
                Añadir Etapa
              </Button>
            </CardContent>
          </Card>

          {/* Vista previa */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Palette className="h-5 w-5" />
                Vista Previa
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 overflow-x-auto pb-2">
                {stages.map((stage, index) => (
                  <div key={stage.id} className="flex items-center flex-shrink-0">
                    <div className="text-center">
                      <div
                        className="px-4 py-2 rounded-lg text-white font-medium whitespace-nowrap"
                        style={{ backgroundColor: stage.color }}
                      >
                        {stage.name || "Sin nombre"}
                      </div>
                      <p className="text-xs text-gray-500 mt-1">{stage.probability}%</p>
                    </div>
                    {index < stages.length - 1 && (
                      <ChevronRight className="h-5 w-5 text-gray-400 mx-2" />
                    )}
                  </div>
                ))}
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
            disabled={!pipelineData.name || stages.length === 0 || stages.some(s => !s.name)}
          >
            Crear Pipeline
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
