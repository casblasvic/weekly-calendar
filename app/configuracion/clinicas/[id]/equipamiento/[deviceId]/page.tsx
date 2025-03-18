"use client"

import { useState, use } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, HelpCircle, Save } from "lucide-react"

interface DeviceData {
  name: string
  code: string
  weight: string
  description: string
  flowwIntegration: string
}

export default function DevicePage({ params }: { params: { id: string; deviceId: string } }) {
  const router = useRouter()
  const resolvedParams = use(params)
  const isNew = resolvedParams.deviceId === "new"

  const [deviceData, setDeviceData] = useState<DeviceData>({
    name: "Ballancer",
    code: "BALLA",
    weight: "1",
    description: "Pressotherapie",
    flowwIntegration: "Ninguna",
  })

  return (
    <div className="container mx-auto p-6 space-y-6 max-w-4xl pt-28 md:pt-16 pb-24">
      <h2 className="text-2xl font-semibold mb-6">Datos del equipo</h2>

      <Card className="p-6 space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="name">Nombre</Label>
            <Input
              id="name"
              value={deviceData.name}
              onChange={(e) => setDeviceData((prev) => ({ ...prev, name: e.target.value }))}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="code">Código</Label>
            <Input
              id="code"
              value={deviceData.code}
              onChange={(e) => setDeviceData((prev) => ({ ...prev, code: e.target.value }))}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="weight">Ponderación</Label>
            <Input
              id="weight"
              value={deviceData.weight}
              onChange={(e) => setDeviceData((prev) => ({ ...prev, weight: e.target.value }))}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="flowwIntegration">Integración con Flowww</Label>
            <Select
              value={deviceData.flowwIntegration}
              onValueChange={(value) => setDeviceData((prev) => ({ ...prev, flowwIntegration: value }))}
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

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="description">Descripción</Label>
            <Textarea
              id="description"
              value={deviceData.description}
              onChange={(e) => setDeviceData((prev) => ({ ...prev, description: e.target.value }))}
              className="min-h-[100px]"
            />
          </div>
        </div>
      </Card>

      {/* Botones de parámetros */}
      <div className="flex gap-2">
        <Button
          variant="outline"
          onClick={() =>
            router.push(`/configuracion/clinicas/${resolvedParams.id}/equipamiento/${resolvedParams.deviceId}/parametros/1`)
          }
        >
          Parámetro I
        </Button>
        <Button
          variant="outline"
          onClick={() =>
            router.push(`/configuracion/clinicas/${resolvedParams.id}/equipamiento/${resolvedParams.deviceId}/parametros/2`)
          }
        >
          Parámetro II
        </Button>
        <Button
          variant="outline"
          onClick={() =>
            router.push(`/configuracion/clinicas/${resolvedParams.id}/equipamiento/${resolvedParams.deviceId}/parametros/3`)
          }
        >
          Parámetro III
        </Button>
      </div>

      {/* Botones fijos inferiores */}
      <div className="fixed bottom-4 right-4 flex items-center space-x-2 z-50">
        <Button variant="outline" className="bg-white" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver
        </Button>
        <Button>
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

