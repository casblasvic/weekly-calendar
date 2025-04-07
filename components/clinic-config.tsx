"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Checkbox } from "@/components/ui/checkbox"
import CabinConfig from "@/components/cabin-configuration"
import { ScheduleConfig } from "@/components/schedule-config"
import { useClinic } from "@/contexts/clinic-context"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"
import type { WeekSchedule } from "@/types/schedule"

interface ClinicConfigProps {
  clinicId: string
}

export function ClinicConfig({ clinicId }: ClinicConfigProps) {
  const { clinics, updateClinica, activeClinic, activeClinicCabins } = useClinic()
  const { toast } = useToast()
  const router = useRouter()

  const clinic = clinics.find((c) => c.id.toString() === clinicId)

  const [name, setName] = useState(activeClinic?.name ?? "")
  const [prefix, setPrefix] = useState(activeClinic?.prefix ?? "")
  const [city, setCity] = useState(activeClinic?.city ?? "")

  useEffect(() => {
    if (activeClinic && activeClinic.id === clinicId) {
      setName(activeClinic.name ?? "")
      setPrefix(activeClinic.prefix ?? "")
      setCity(activeClinic.city ?? "")
    }
  }, [activeClinic, clinicId])

  const handleSave = async () => {
    if (!activeClinic) {
      toast({
        title: "Error",
        description: "No hay clínica activa para guardar.",
        variant: "destructive",
      })
      return
    }

    const clinicUpdateData = {
      name,
      prefix,
      city,
    }

    try {
      await updateClinica(String(activeClinic.id), clinicUpdateData)

      toast({
        title: "Configuración guardada",
        description: "La configuración de la clínica ha sido guardada correctamente.",
      })

      router.push("/configuracion/clinicas")
    } catch (error) {
      toast({
        title: "Error al guardar la configuración",
        description: error instanceof Error ? error.message : "Hubo un error al intentar guardar la configuración.",
        variant: "destructive",
      })
    }
  }

  const handleScheduleChange = (newSchedule: WeekSchedule) => {
    console.log("Schedule changed in child component (Not saved automatically yet):", newSchedule)
    // TODO: Implementar la lógica para guardar newSchedule.
    // Esto requerirá llamar a una función (probablemente en useClinic)
    // que sepa cómo actualizar la plantilla vinculada o los bloques independientes.
    // Por ejemplo: updateClinicSchedule(activeClinic.id, newSchedule)
  }

  if (!activeClinic || activeClinic.id !== clinicId) {
    return <div>Clínica no encontrada</div>
  }

  return (
    <div className="container py-6 mx-auto">
      <h1 className="mb-6 text-2xl font-bold">Configuración de {activeClinic.name}</h1>

      <Tabs defaultValue="general">
        <TabsList className="mb-4">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="cabins">Cabinas</TabsTrigger>
          <TabsTrigger value="schedule">Horarios</TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle>Información General</CardTitle>
              <CardDescription>Configura la información básica de la clínica</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nombre</Label>
                  <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="prefix">Prefijo</Label>
                  <Input id="prefix" value={prefix} onChange={(e) => setPrefix(e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="city">Ciudad</Label>
                <Input id="city" value={city} onChange={(e) => setCity(e.target.value)} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cabins">
          <Card>
            <CardHeader>
              <CardTitle>Configuración de Cabinas</CardTitle>
              <CardDescription>Gestiona las cabinas disponibles en la clínica</CardDescription>
            </CardHeader>
            <CardContent>
              <CabinConfig cabins={activeClinicCabins || []} clinicId={activeClinic?.id ? Number(activeClinic.id) : -1} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="schedule">
          <Card>
            <CardHeader>
              <CardTitle>Configuración de Horarios</CardTitle>
              <CardDescription>Define los horarios de atención para cada día de la semana</CardDescription>
            </CardHeader>
            <CardContent>
              <ScheduleConfig onChange={handleScheduleChange} showTemplateSelector clinic={activeClinic} />
            </CardContent>
          </Card>
        </TabsContent>

        <div className="flex justify-end mt-6">
          <Button onClick={handleSave}>Guardar Cambios Generales</Button>
        </div>
      </Tabs>
    </div>
  )
}

