"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Checkbox } from "@/components/ui/checkbox"
import { CabinConfig } from "@/components/cabin-config"
import { ScheduleConfig } from "@/components/schedule-config"
import { useClinic } from "@/contexts/clinic-context"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"
import { DEFAULT_SCHEDULE } from "@/types/schedule"

interface ClinicConfigProps {
  clinicId: string
}

export function ClinicConfig({ clinicId }: ClinicConfigProps) {
  const { clinics, updateClinicConfig } = useClinic()
  const { toast } = useToast()
  const router = useRouter()

  const clinic = clinics.find((c) => c.id.toString() === clinicId)

  const [name, setName] = useState(clinic?.name || "")
  const [prefix, setPrefix] = useState(clinic?.prefix || "")
  const [city, setCity] = useState(clinic?.city || "")
  const [openTime, setOpenTime] = useState(clinic?.config?.openTime || "00:00")
  const [closeTime, setCloseTime] = useState(clinic?.config?.closeTime || "23:59")
  const [weekendOpenTime, setWeekendOpenTime] = useState(clinic?.config?.weekendOpenTime || "10:00")
  const [weekendCloseTime, setWeekendCloseTime] = useState(clinic?.config?.weekendCloseTime || "15:00")
  const [saturdayOpen, setSaturdayOpen] = useState(clinic?.config?.saturdayOpen || false)
  const [sundayOpen, setSundayOpen] = useState(clinic?.config?.sundayOpen || false)
  const [cabins, setCabins] = useState(clinic?.config?.cabins || [])
  const [schedule, setSchedule] = useState(clinic?.config?.schedule || DEFAULT_SCHEDULE)

  useEffect(() => {
    if (clinic) {
      setName(clinic.name)
      setPrefix(clinic.prefix)
      setCity(clinic.city)
      setOpenTime(clinic.config?.openTime || "00:00")
      setCloseTime(clinic.config?.closeTime || "23:59")
      setWeekendOpenTime(clinic.config?.weekendOpenTime || "10:00")
      setWeekendCloseTime(clinic.config?.weekendCloseTime || "15:00")
      setSaturdayOpen(clinic.config?.saturdayOpen || false)
      setSundayOpen(clinic.config?.sundayOpen || false)
      setCabins(clinic.config?.cabins || [])
      setSchedule(clinic.config?.schedule || DEFAULT_SCHEDULE)
    }
  }, [clinic])

  const handleSave = () => {
    if (!clinic) return

    updateClinicConfig(clinic.id, {
      openTime,
      closeTime,
      weekendOpenTime,
      weekendCloseTime,
      saturdayOpen,
      sundayOpen,
      cabins,
      schedule,
    })

    // Notificar a la agenda que se ha actualizado la configuración
    if (typeof window !== "undefined" && (window as any).notifyClinicConfigUpdated) {
      ;(window as any).notifyClinicConfigUpdated()
    }

    toast({
      title: "Configuración guardada",
      description: "La configuración de la clínica ha sido guardada correctamente.",
    })

    router.push("/configuracion/clinicas")
  }

  if (!clinic) {
    return <div>Clínica no encontrada</div>
  }

  return (
    <div className="container mx-auto py-6">
      <h1 className="text-2xl font-bold mb-6">Configuración de {clinic.name}</h1>

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

              <div className="border-t pt-4 mt-4">
                <h3 className="text-lg font-medium mb-4">Horarios Generales</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="openTime">Horario de apertura</Label>
                    <Input id="openTime" type="time" value={openTime} onChange={(e) => setOpenTime(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="closeTime">Horario de cierre</Label>
                    <Input
                      id="closeTime"
                      type="time"
                      value={closeTime}
                      onChange={(e) => setCloseTime(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="border-t pt-4 mt-4">
                <h3 className="text-lg font-medium mb-4">Horarios de Fin de Semana</h3>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="space-y-2">
                    <Label htmlFor="weekendOpenTime">Horario de apertura (fin de semana)</Label>
                    <Input
                      id="weekendOpenTime"
                      type="time"
                      value={weekendOpenTime}
                      onChange={(e) => setWeekendOpenTime(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="weekendCloseTime">Horario de cierre (fin de semana)</Label>
                    <Input
                      id="weekendCloseTime"
                      type="time"
                      value={weekendCloseTime}
                      onChange={(e) => setWeekendCloseTime(e.target.value)}
                    />
                  </div>
                </div>
                <div className="flex items-center space-x-8">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="saturdayOpen"
                      checked={saturdayOpen}
                      onCheckedChange={(checked) => setSaturdayOpen(checked as boolean)}
                    />
                    <Label htmlFor="saturdayOpen">Abierto los sábados</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="sundayOpen"
                      checked={sundayOpen}
                      onCheckedChange={(checked) => setSundayOpen(checked as boolean)}
                    />
                    <Label htmlFor="sundayOpen">Abierto los domingos</Label>
                  </div>
                </div>
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
              <CabinConfig cabins={cabins} onChange={setCabins} />
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
              <ScheduleConfig value={schedule} onChange={setSchedule} showTemplateSelector />
            </CardContent>
          </Card>
        </TabsContent>

        <div className="mt-6 flex justify-end">
          <Button onClick={handleSave}>Guardar Cambios</Button>
        </div>
      </Tabs>
    </div>
  )
}

