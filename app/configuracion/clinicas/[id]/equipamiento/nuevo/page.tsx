"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, Save, HelpCircle } from "lucide-react"

export default function NewEquipmentPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [equipmentData, setEquipmentData] = useState({
    name: "",
    code: "",
    weight: "1",
    description: "",
    flowwIntegration: "Ninguna",
  })

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setEquipmentData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSave = () => {
    // Aquí iría la lógica para guardar el equipamiento
    console.log("Guardando equipamiento:", equipmentData)
    router.push(`/configuracion/clinicas/${params.id}/equipamiento`)
  }

  return (
    <div className="container mx-auto p-6 space-y-6 max-w-7xl">
      <h1 className="text-2xl font-semibold mb-6">Datos del equipo</h1>

      <Card className="p-6">
        <div className="grid gap-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre</Label>
              <Input
                id="name"
                name="name"
                value={equipmentData.name}
                onChange={handleInputChange}
                placeholder="Ballancer"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="code">Código</Label>
              <Input
                id="code"
                name="code"
                value={equipmentData.code}
                onChange={handleInputChange}
                placeholder="BALLA"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="weight">Ponderación</Label>
              <Input
                id="weight"
                name="weight"
                type="number"
                value={equipmentData.weight}
                onChange={handleInputChange}
                placeholder="1"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="flowwIntegration">Integración con Floww</Label>
              <Select
                value={equipmentData.flowwIntegration}
                onValueChange={(value) => setEquipmentData((prev) => ({ ...prev, flowwIntegration: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar integración" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Ninguna">Ninguna</SelectItem>
                  <SelectItem value="Básica">Básica</SelectItem>
                  <SelectItem value="Completa">Completa</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descripción</Label>
            <Textarea
              id="description"
              name="description"
              value={equipmentData.description}
              onChange={handleInputChange}
              placeholder="Pressotherapie"
              className="min-h-[100px] resize-none"
            />
          </div>
        </div>
      </Card>

      {/* Botones de parámetros */}
      <div className="flex gap-2">
        <Button variant="outline" disabled>
          Parámetro I
        </Button>
        <Button variant="outline" disabled>
          Parámetro II
        </Button>
        <Button variant="outline" disabled>
          Parámetro III
        </Button>
      </div>

      {/* Botones fijos inferiores */}
      <div className="fixed bottom-4 right-4 flex items-center space-x-2 z-50">
        <Button variant="outline" className="bg-white" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver
        </Button>
        <Button className="bg-purple-600 hover:bg-purple-700 text-white" onClick={handleSave}>
          <Save className="h-4 w-4 mr-2" />
          Guardar
        </Button>
        <Button variant="outline" className="bg-black text-white hover:bg-gray-800">
          <HelpCircle className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

