"use client"

import { useState, useEffect, useCallback, use } from "react"
import { useRouter, useSearchParams, useParams } from "next/navigation"
import { Button, BackButton } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { CabinEditDialog } from "@/components/cabin-edit-dialog"
import { useClinic } from "@/contexts/clinic-context"
import { Clinica } from "@/services/data/models/interfaces"
import { SearchInput } from "@/components/SearchInput"
import { ScheduleConfig } from "@/components/schedule-config"
import { DEFAULT_SCHEDULE } from "@/types/schedule"
import { useTemplates } from "@/hooks/use-templates"
import { toast } from "@/components/ui/use-toast"
import {
  Building2,
  Bed,
  Cog,
  Users,
  CreditCard,
  Link,
  Percent,
  MessageSquare,
  Mail,
  Phone,
  Globe,
  ArrowLeft,
  HelpCircle,
  Save,
  MapPin,
  BarChart2,
  Search,
  Plus,
  ChevronUp,
  ChevronDown,
  Trash2,
  Clock,
  Database,
  FolderOpen,
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { WeekSchedule } from "@/types/schedule"
import { saveToStorage } from "@/utils/storage-utils"
import { DebugStorage } from "@/components/debug-storage"
import AlmacenamientoClinicaContent from "@/app/configuracion/clinicas/[id]/almacenamiento/page"
import { useEquipment } from "@/contexts/equipment-context"

const menuItems = [
  { id: "datos", label: "Datos de la clínica", icon: Building2 },
  { id: "cabinas", label: "Cabinas", icon: Bed },
  { id: "equipamiento", label: "Equipamiento", icon: Cog },
  { id: "usuarios", label: "Usuarios", icon: Users },
  { id: "entidades", label: "Entidades bancarias", icon: CreditCard },
  { id: "integraciones", label: "Integraciones", icon: Link },
  { id: "descuentos", label: "Descuentos", icon: Percent },
  { id: "sms", label: "SMS/Push", icon: MessageSquare },
  { id: "email", label: "Notificaciones e-mail", icon: Mail },
  { id: "whatsapp", label: "Notificaciones WhatsApp", icon: Phone },
  { id: "otros", label: "Otros APIs", icon: Globe },
  { id: "almacenamiento", label: "Almacenamiento", icon: Database },
]

interface Cabin {
  id: number
  code: string
  name: string
  color: string
  isActive: boolean
  order: number
}

const SectionTitle = ({ icon: Icon, title, color }: { icon: any; title: string; color: string }) => (
  <div className={`flex items-center space-x-2 mb-4 pb-2 border-b ${color}`}>
    <Icon className="h-5 w-5" />
    <h3 className={`text-lg font-medium ${color}`}>{title}</h3>
  </div>
)

export default function ClinicaDetailPage() {
  const clinicContext = useClinic()
  const { clinics, updateClinicConfig, updateClinica } = clinicContext
  
  console.log("ClinicaDetailPage - Contexto recibido:", clinicContext)
  console.log("ClinicaDetailPage - updateClinica:", updateClinica)
  
  const { templates } = useTemplates()
  const [activeTab, setActiveTab] = useState("datos")
  const [isCabinDialogOpen, setIsCabinDialogOpen] = useState(false)
  const [editingCabin, setEditingCabin] = useState<Cabin | null>(null)
  const [clinicData, setClinicData] = useState<Clinica | null>(null)
  const [cabinFilterText, setCabinFilterText] = useState("")
  const [equipmentFilterText, setEquipmentFilterText] = useState("")
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null)
  const [equipmentData, setEquipmentData] = useState<any[]>([])
  const [advancedSchedule, setAdvancedSchedule] = useState<WeekSchedule>(DEFAULT_SCHEDULE)
  const [isSaving, setIsSaving] = useState(false)

  const router = useRouter()
  const searchParams = useSearchParams()
  const params = useParams()
  const clinicId = typeof params?.id === 'string' ? params.id : ''
  
  const clinic = clinics.find((c) => c.id.toString() === clinicId)

  const { getEquiposByClinicaId } = useEquipment()

  useEffect(() => {
    if (!clinic) {
      router.push("/configuracion/clinicas")
    } else {
      setClinicData(clinic)
    }
  }, [clinic, router])

  useEffect(() => {
    if (clinicData) {
      const clinicId = clinicData.id
      const loadEquipment = async () => {
        try {
          const equipmentList = await getEquiposByClinicaId(clinicId)
          setEquipmentData(Array.isArray(equipmentList) ? equipmentList : [])
        } catch (error) {
          console.error("Error al cargar equipamiento:", error)
          setEquipmentData([])
        }
      }
      loadEquipment()
    }
  }, [clinicData, getEquiposByClinicaId])

  useEffect(() => {
    const tabParam = searchParams.get("tab")
    if (tabParam && ["informacion", "cabinas", "equipamiento", "usuarios", "debug"].includes(tabParam)) {
      setActiveTab(tabParam)
    }
  }, [searchParams])

  const handleAdvancedScheduleChange = (newSchedule: WeekSchedule) => {
    setAdvancedSchedule(newSchedule)
    handleClinicUpdate({ schedule: newSchedule })
  }

  const handleClinicUpdate = useCallback(
    (newConfig: any) => {
      if (clinicData) {
        const updatedConfig = { ...newConfig }
        setClinicData((prev) => (prev ? { ...prev, config: { ...prev.config, ...updatedConfig } } : null))
      }
    },
    [clinicData],
  )

  const handleTemplateChange = (templateId: string) => {
    const selectedTemplate = templates.find((t) => t.id === templateId)
    if (selectedTemplate) {
      setAdvancedSchedule(selectedTemplate.schedule)
      setSelectedTemplateId(templateId)
      handleClinicUpdate({ schedule: selectedTemplate.schedule })
    }
  }

  const handleSaveCabin = useCallback(
    (cabin: Cabin) => {
      const updatedCabins = clinicData?.config?.cabins?.map((c) => (c.id === cabin.id ? cabin : c)) || []
      if (cabin.id === 0) {
        updatedCabins.push({
          ...cabin,
          id: Math.max(...updatedCabins.map((c) => c.id), 0) + 1,
          order: (clinicData?.config?.cabins?.length || 0) + 1,
        })
      }
      handleClinicUpdate({ cabins: updatedCabins })
      setIsCabinDialogOpen(false)
    },
    [clinicData?.config?.cabins, handleClinicUpdate],
  )

  const handleDeleteCabin = useCallback(
    (cabinId: number) => {
      const updatedCabins = clinicData?.config?.cabins?.filter((c) => c.id !== cabinId) || []
      handleClinicUpdate({ cabins: updatedCabins })
    },
    [clinicData?.config?.cabins, handleClinicUpdate],
  )

  const handleMoveCabin = useCallback(
    (cabinId: number, direction: "up" | "down") => {
      const updatedCabins = [...(clinicData?.config?.cabins || [])].sort((a, b) => a.order - b.order)
      const cabinIndex = updatedCabins.findIndex((c) => c.id === cabinId)

      if ((direction === "up" && cabinIndex > 0) || (direction === "down" && cabinIndex < updatedCabins.length - 1)) {
        const swapIndex = direction === "up" ? cabinIndex - 1 : cabinIndex + 1
        const temp = updatedCabins[cabinIndex].order
        updatedCabins[cabinIndex].order = updatedCabins[swapIndex].order
        updatedCabins[swapIndex].order = temp

        handleClinicUpdate({ cabins: updatedCabins })
      }
    },
    [clinicData?.config?.cabins, handleClinicUpdate],
  )

  const deleteEquipment = useCallback((index: number) => {
    setEquipmentData((prevData) => prevData.filter((_, i) => i !== index))
  }, [])

  const filteredEquipment = Array.isArray(equipmentData) 
    ? equipmentData.filter((equipment) =>
        Object.values(equipment).some((value) => 
          value !== null && String(value).toLowerCase().includes(equipmentFilterText.toLowerCase())
        )
      )
    : []

  const handleSaveClinic = useCallback(async () => {
    setIsSaving(true)
    try {
      if (clinicData) {
        if (typeof updateClinica !== "function") {
          console.error("updateClinica is not a function", updateClinica)
          throw new Error("updateClinica is not a function")
        }

        const clinicId = String(clinicData.id)
        
        const success = await updateClinica(clinicId, clinicData)

        if (success) {
          toast({
            title: "Configuración guardada",
            description: "Los cambios han sido guardados exitosamente.",
          })
        } else {
          throw new Error("No se pudo guardar la configuración")
        }
      }
    } catch (error) {
      console.error("Error al guardar:", error)
      toast({
        title: "Error al guardar",
        description: "Hubo un problema al guardar la configuración.",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }, [clinicData, updateClinica])

  if (!clinicData) {
    return null
  }

  const { config } = clinicData

  const defaultOpenTime = "00:00"
  const defaultCloseTime = "23:59"

  const handleSave = async () => {
    setIsSaving(true)
    // Simular una operación de guardado
    await new Promise((resolve) => setTimeout(resolve, 2000))
    setIsSaving(false)
    // Aquí iría la lógica real de guardado
  }

  const tabs = [
    { id: "info", label: "Información" },
    { id: "sedes", label: "Sedes" },
    { id: "cabinas", label: "Cabinas" },
    { id: "equipamiento", label: "Equipamiento" },
    { id: "almacenamiento", label: "Almacenamiento" },
    { id: "depuracion", label: "Depuración" },
  ]

  return (
    <div className="container px-0 pb-8 pt-4">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Configuración de Clínica: {clinicData?.name}</h1>
      </div>

      <div className="flex items-start gap-6">
        <div className="w-64 shrink-0">
          <div className="sticky top-4 rounded-lg border bg-card p-4 shadow">
            <div className="flex flex-col space-y-1">
              {menuItems.map((item) => {
                const Icon = item.icon
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={cn(
                      "flex items-center space-x-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                      activeTab === item.id
                        ? "bg-accent text-accent-foreground"
                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                    )}
                  >
                    <Icon className="h-5 w-5" />
                    <span>{item.label}</span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        <div className="flex-1">
          {clinicData && (
            <div className="space-y-6">
              <h2 className="text-2xl font-semibold mb-6">{menuItems.find((item) => item.id === activeTab)?.label}</h2>

              {activeTab === "datos" && (
                <Card className="p-6">
                  <SectionTitle icon={Building2} title="Información Básica" color="text-blue-600 border-blue-600" />
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="prefix" className="text-sm">
                        Prefijo
                      </Label>
                      <Input
                        id="prefix"
                        defaultValue={config.prefix}
                        className="h-9 text-sm"
                        onChange={(e) => handleClinicUpdate({ prefix: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="commercialName" className="text-sm">
                        Nombre Comercial
                      </Label>
                      <Input
                        id="commercialName"
                        defaultValue={config.commercialName}
                        className="h-9 text-sm"
                        onChange={(e) => handleClinicUpdate({ commercialName: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="businessName" className="text-sm">
                        Razón Social
                      </Label>
                      <Input
                        id="businessName"
                        defaultValue={config.businessName}
                        className="h-9 text-sm"
                        onChange={(e) => handleClinicUpdate({ businessName: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cif" className="text-sm">
                        CIF
                      </Label>
                      <Input
                        id="cif"
                        defaultValue={config.cif}
                        className="h-9 text-sm"
                        onChange={(e) => handleClinicUpdate({ cif: e.target.value })}
                      />
                    </div>
                  </div>

                  <SectionTitle icon={MapPin} title="Ubicación" color="text-green-600 border-green-600" />
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="country" className="text-sm">
                        País
                      </Label>
                      <Select
                        defaultValue={config.country}
                        onValueChange={(value) => handleClinicUpdate({ country: value })}
                      >
                        <SelectTrigger className="h-9 text-sm">
                          <SelectValue placeholder="Seleccionar país" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Marruecos">Marruecos</SelectItem>
                          <SelectItem value="España">España</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="province" className="text-sm">
                        Provincia
                      </Label>
                      <Input
                        id="province"
                        defaultValue={config.province}
                        className="h-9 text-sm"
                        onChange={(e) => handleClinicUpdate({ province: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="city" className="text-sm">
                        Ciudad
                      </Label>
                      <Input
                        id="city"
                        defaultValue={config.city}
                        className="h-9 text-sm"
                        onChange={(e) => handleClinicUpdate({ city: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="postalCode" className="text-sm">
                        CP
                      </Label>
                      <Input
                        id="postalCode"
                        defaultValue={config.postalCode}
                        className="h-9 text-sm"
                        onChange={(e) => handleClinicUpdate({ postalCode: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="address" className="text-sm">
                        Dirección
                      </Label>
                      <Input
                        id="address"
                        defaultValue={config.address}
                        className="h-9 text-sm"
                        onChange={(e) => handleClinicUpdate({ address: e.target.value })}
                      />
                    </div>
                  </div>

                  <SectionTitle icon={Phone} title="Contacto" color="text-orange-600 border-orange-600" />
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="phone" className="text-sm">
                        Teléfono
                      </Label>
                      <Input
                        id="phone"
                        defaultValue={config.phone}
                        className="h-9 text-sm"
                        onChange={(e) => handleClinicUpdate({ phone: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone2" className="text-sm">
                        Teléfono 2
                      </Label>
                      <Input
                        id="phone2"
                        defaultValue={config.phone2}
                        className="h-9 text-sm"
                        onChange={(e) => handleClinicUpdate({ phone2: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="email" className="text-sm">
                        E-mail
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        defaultValue={config.email}
                        className="h-9 text-sm"
                        onChange={(e) => handleClinicUpdate({ email: e.target.value })}
                      />
                    </div>
                  </div>

                  <SectionTitle icon={Cog} title="Configuración" color="text-purple-600 border-purple-600" />
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-sm">Caja inicial</Label>
                      <Input
                        type="number"
                        step="0.01"
                        defaultValue={config.initialCash}
                        className="h-9 text-sm"
                        onChange={(e) => handleClinicUpdate({ initialCash: e.target.value })}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm">Tamaño impresión ticket</Label>
                      <Select
                        defaultValue={config.ticketSize}
                        onValueChange={(value) => handleClinicUpdate({ ticketSize: value })}
                      >
                        <SelectTrigger className="h-9 text-sm">
                          <SelectValue placeholder="Seleccionar tamaño" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="a5">Hoja A5</SelectItem>
                          <SelectItem value="a4">Hoja A4</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm">Tarifa</Label>
                      <Select defaultValue={config.rate} onValueChange={(value) => handleClinicUpdate({ rate: value })}>
                        <SelectTrigger className="h-9 text-sm">
                          <SelectValue placeholder="Seleccionar tarifa" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Tarifa Californie">Tarifa Californie</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm">IP</Label>
                      <Input
                        defaultValue={config.ip}
                        className="h-9 text-sm"
                        onChange={(e) => handleClinicUpdate({ ip: e.target.value })}
                      />
                    </div>

                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label className="text-sm">¿Desea bloquear el área de firma electrónica en flowww.me?</Label>
                        <RadioGroup
                          defaultValue={config.blockSignArea}
                          onValueChange={(value) => handleClinicUpdate({ blockSignArea: value })}
                        >
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="no" id="sign-no" />
                            <Label htmlFor="sign-no" className="text-sm">
                              No
                            </Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="yes" id="sign-yes" />
                            <Label htmlFor="sign-yes" className="text-sm">
                              Sí, con la clave
                            </Label>
                          </div>
                        </RadioGroup>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm">¿Desea bloquear las áreas de datos personales en flowww.me?</Label>
                        <RadioGroup
                          defaultValue={config.blockPersonalData}
                          onValueChange={(value) => handleClinicUpdate({ blockPersonalData: value })}
                        >
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="no" id="personal-no" />
                            <Label htmlFor="personal-no" className="text-sm">
                              No
                            </Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="yes" id="personal-yes" />
                            <Label htmlFor="personal-yes" className="text-sm">
                              Sí, con la clave
                            </Label>
                          </div>
                        </RadioGroup>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm">Funcionalidades</Label>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="delayed-payments"
                            defaultChecked={config.delayedPayments}
                            onCheckedChange={(checked) => handleClinicUpdate({ delayedPayments: checked })}
                          />
                          <Label htmlFor="delayed-payments" className="text-sm">
                            Pagos aplazados
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="affects-stats"
                            defaultChecked={config.affectsStats}
                            onCheckedChange={(checked) => handleClinicUpdate({ affectsStats: checked })}
                          />
                          <Label htmlFor="affects-stats" className="text-sm">
                            Afecta estadísticas
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="appears-in-app"
                            defaultChecked={config.appearsInApp}
                            onCheckedChange={(checked) => handleClinicUpdate({ appearsInApp: checked })}
                          />
                          <Label htmlFor="appears-in-app" className="text-sm">
                            Aparece en App / Self
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="schedule-control"
                            defaultChecked={config.scheduleControl}
                            onCheckedChange={(checked) => handleClinicUpdate({ scheduleControl: checked })}
                          />
                          <Label htmlFor="schedule-control" className="text-sm">
                            Control de horarios
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="professional-skills"
                            defaultChecked={config.professionalSkills}
                            onCheckedChange={(checked) => handleClinicUpdate({ professionalSkills: checked })}
                          />
                          <Label htmlFor="professional-skills" className="text-sm">
                            Control de habilidades profesionales
                          </Label>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="notes" className="text-sm">
                        Notas
                      </Label>
                      <Textarea
                        id="notes"
                        defaultValue={config.notes}
                        className="h-20 text-sm"
                        onChange={(e) => handleClinicUpdate({ notes: e.target.value })}
                      />
                    </div>
                  </div>

                  <SectionTitle icon={Clock} title="Horarios" color="text-purple-600 border-purple-600" />

                  <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-4 mb-6">
                      <div className="space-y-2">
                        <Label>Horario Apertura</Label>
                        <Input
                          type="time"
                          value={config.openTime || defaultOpenTime}
                          onChange={(e) => handleClinicUpdate({ openTime: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Horario Cierre</Label>
                        <Input
                          type="time"
                          value={config.closeTime || defaultCloseTime}
                          onChange={(e) => handleClinicUpdate({ closeTime: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Duración Slot (min)</Label>
                        <Input
                          type="number"
                          min="1"
                          max="60"
                          step="1"
                          value={config.slotDuration || 15}
                          onChange={(e) => {
                            const value = Number.parseInt(e.target.value)
                            if (value >= 1 && value <= 60) {
                              handleClinicUpdate({ slotDuration: value })
                            }
                          }}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Seleccionar plantilla horaria</Label>
                      <Select value={selectedTemplateId || ""} onValueChange={handleTemplateChange}>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar una plantilla" />
                        </SelectTrigger>
                        <SelectContent>
                          {templates.map((template) => (
                            <SelectItem key={template.id} value={template.id}>
                              {template.description}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Card>
                      <CardContent className="pt-6">
                        <ScheduleConfig
                          value={clinicData?.config?.schedule || DEFAULT_SCHEDULE}
                          onChange={handleAdvancedScheduleChange}
                        />
                      </CardContent>
                    </Card>
                  </div>

                  <SectionTitle icon={BarChart2} title="Estadísticas de uso" color="text-red-600 border-red-600" />
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-sm">Espacio de almacenamiento</Label>
                      <div className="flex items-center justify-between">
                        <div className="text-sm text-gray-600">100 Mb (0 Mb libres)</div>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            setActiveTab("almacenamiento");
                          }}
                        >
                          <FolderOpen className="w-4 h-4 mr-2" />
                          Gestionar almacenamiento
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm">Nº de cuenta domiciliaciones clientes</Label>
                      <div className="grid grid-cols-4 gap-2">
                        <Input placeholder="PCC" className="h-9 text-sm" />
                        <Input placeholder="Entidad" className="h-9 text-sm" />
                        <Input placeholder="Oficina" className="h-9 text-sm" />
                        <Input placeholder="D.C." className="h-9 text-sm" />
                      </div>
                      <Input placeholder="Cuenta" className="h-9 text-sm" />
                      <Input placeholder="BIC/SWIFT" className="h-9 text-sm" />
                    </div>
                  </div>
                </Card>
              )}

              {activeTab === "cabinas" && (
                <Card className="p-6">
                  <div className="space-y-4">
                    <h2 className="text-lg font-medium">Listado de cabinas de la clínica: {clinicData.name}</h2>

                    <SearchInput placeholder="Buscar cabinas" value={cabinFilterText} onChange={setCabinFilterText} />

                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-[100px]">Nº</TableHead>
                            <TableHead>Código</TableHead>
                            <TableHead>Nombre</TableHead>
                            <TableHead>Color</TableHead>
                            <TableHead className="text-center">Activo</TableHead>
                            <TableHead className="text-center">Subir</TableHead>
                            <TableHead className="text-center">Bajar</TableHead>
                            <TableHead className="text-center">Borrar</TableHead>
                            <TableHead className="text-center">Ver +</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {clinicData?.config?.cabins
                            .filter(
                              (cabin) =>
                                cabin.name.toLowerCase().includes(cabinFilterText.toLowerCase()) ||
                                cabin.code.toLowerCase().includes(cabinFilterText.toLowerCase()),
                            )
                            .sort((a, b) => a.order - b.order)
                            .map((cabin, index) => (
                              <TableRow key={cabin.id} className={cabin.isActive ? "" : "opacity-50"}>
                                <TableCell>{cabin.order}</TableCell>
                                <TableCell>{cabin.code}</TableCell>
                                <TableCell>{cabin.name}</TableCell>
                                <TableCell>
                                  <div className="w-6 h-6 rounded-full" style={{ backgroundColor: cabin.color }}></div>
                                </TableCell>
                                <TableCell className="text-center">
                                  <Checkbox
                                    checked={cabin.isActive}
                                    onCheckedChange={(checked) => {
                                      const updatedCabins = clinicData?.config?.cabins.map((c) =>
                                        c.id === cabin.id ? { ...c, isActive: checked as boolean } : c,
                                      )
                                      handleClinicUpdate({ cabins: updatedCabins })
                                    }}
                                  />
                                </TableCell>
                                <TableCell className="text-center">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-10 w-10 text-purple-600 hover:bg-purple-100"
                                    onClick={() => handleMoveCabin(cabin.id, "up")}
                                    disabled={index === 0}
                                  >
                                    <ChevronUp className="h-6 w-6 font-bold" />
                                  </Button>
                                </TableCell>
                                <TableCell className="text-center">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-10 w-10 text-purple-600 hover:bg-purple-100"
                                    onClick={() => handleMoveCabin(cabin.id, "down")}
                                    disabled={index === clinicData?.config?.cabins.length - 1}
                                  >
                                    <ChevronDown className="h-6 w-6 font-bold" />
                                  </Button>
                                </TableCell>
                                <TableCell className="text-center">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-10 w-10 text-purple-600 hover:bg-purple-100"
                                    onClick={() => handleDeleteCabin(cabin.id)}
                                  >
                                    <Trash2 className="h-6 w-6 font-bold" />
                                  </Button>
                                </TableCell>
                                <TableCell className="text-center">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-10 w-10 text-purple-600 hover:bg-purple-100"
                                    onClick={() => {
                                      setEditingCabin(cabin)
                                      setIsCabinDialogOpen(true)
                                    }}
                                  >
                                    <Search className="h-6 w-6 font-bold" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </Card>
              )}

              {activeTab === "equipamiento" && (
                <Card className="p-6">
                  <div className="space-y-4">
                    <div className="flex flex-col gap-2">
                      <h2 className="text-lg font-medium">Listado del equipamiento de la clínica: {clinicData.name}</h2>
                    </div>

                    <SearchInput
                      placeholder="Buscar equipamiento"
                      value={equipmentFilterText}
                      onChange={setEquipmentFilterText}
                    />

                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="font-medium">Código</TableHead>
                            <TableHead>Nombre</TableHead>
                            <TableHead>Descripción</TableHead>
                            <TableHead>Número de serie</TableHead>
                            <TableHead className="text-right">Acciones</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredEquipment.map((equipment, index) => (
                            <TableRow key={index}>
                              <TableCell className="font-medium">{equipment.code}</TableCell>
                              <TableCell>{equipment.name}</TableCell>
                              <TableCell>{equipment.description}</TableCell>
                              <TableCell>{equipment.serialNumber || "-"}</TableCell>
                              <TableCell className="text-right space-x-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => deleteEquipment(index)}
                                >
                                  <Trash2 className="h-4 w-4 text-primary" />
                                  <span className="sr-only">Eliminar</span>
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() =>
                                    router.push(`/configuracion/clinicas/${params.id}/equipamiento/${equipment.id}`)
                                  }
                                >
                                  <Search className="h-4 w-4 text-primary" />
                                  <span className="sr-only">Ver/Editar</span>
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </Card>
              )}

              {activeTab === "almacenamiento" && (
                <Card className="p-6">
                  <AlmacenamientoClinicaContent clinicId={clinicId} />
                </Card>
              )}

              {activeTab === "usuarios" && (
                <Card className="p-6">
                  <h3>Contenido de Usuarios</h3>
                </Card>
              )}

              {activeTab === "entidades" && (
                <Card className="p-6">
                  <h3>Entidades bancarias</h3>
                </Card>
              )}
              
              {activeTab === "integraciones" && (
                <Card className="p-6">
                  <h3>Integraciones</h3>
                </Card>
              )}
              
              {activeTab === "descuentos" && (
                <Card className="p-6">
                  <h3>Descuentos</h3>
                </Card>
              )}
              
              {activeTab === "sms" && (
                <Card className="p-6">
                  <h3>SMS/Push</h3>
                </Card>
              )}
              
              {activeTab === "email" && (
                <Card className="p-6">
                  <h3>Notificaciones e-mail</h3>
                </Card>
              )}
              
              {activeTab === "whatsapp" && (
                <Card className="p-6">
                  <h3>Notificaciones WhatsApp</h3>
                </Card>
              )}
              
              {activeTab === "otros" && (
                <Card className="p-6">
                  <h3>Otros APIs</h3>
                </Card>
              )}

              {activeTab === "debug" && (
                <div className="space-y-4">
                  <DebugStorage clinicId={clinic.id.toString()} />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      
      <CabinEditDialog
        isOpen={isCabinDialogOpen}
        cabin={editingCabin}
        onClose={() => {
          setIsCabinDialogOpen(false)
          setEditingCabin(null)
        }}
        onSave={handleSaveCabin}
      />

      {/* Botones flotantes */}
      <div className="fixed bottom-4 right-4 flex flex-col md:flex-row items-end space-y-2 md:space-y-0 md:space-x-2 z-50">
        <BackButton
          href="/configuracion/clinicas"
          className="bg-white text-gray-600 hover:bg-gray-100 text-sm py-2 px-4 rounded-md shadow-md"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver
        </BackButton>
        {activeTab === "cabinas" && (
          <Button
            className="bg-purple-600 hover:bg-purple-700 text-white text-sm py-2 px-4 rounded-md shadow-md"
            onClick={() => {
              setEditingCabin({
                id: 0,
                code: "",
                name: "",
                color: "#ffffff",
                isActive: true,
                order: (clinicData?.config?.cabins?.length || 0) + 1,
              })
              setIsCabinDialogOpen(true)
            }}
          >
            <Plus className="h-4 w-4 mr-2" />
            Nueva cabina
          </Button>
        )}
        {activeTab === "equipamiento" && (
          <Button
            className="bg-purple-600 hover:bg-purple-700 text-white text-sm py-2 px-4 rounded-md shadow-md"
            onClick={() => {
              router.push(`/configuracion/clinicas/${clinicId}/equipamiento/nuevo`)
            }}
          >
            <Plus className="h-4 w-4 mr-2" />
            Nuevo equipamiento
          </Button>
        )}
        <Button
          className="bg-purple-600 hover:bg-purple-700 text-white text-sm py-2 px-4 rounded-md shadow-md"
          onClick={handleSaveClinic}
          disabled={isSaving}
        >
          {isSaving ? (
            <>
              <svg
                className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              Guardando...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Guardar Centro
            </>
          )}
        </Button>
        <Button className="bg-black text-white hover:bg-gray-800 text-sm py-2 px-4 rounded-md shadow-md">
          <HelpCircle className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

