"use client"

import { useState, useEffect, useCallback, use, useMemo } from "react"
import { useRouter, useSearchParams, useParams } from "next/navigation"
import { Button, BackButton } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { CabinEditDialog } from "@/components/cabin-edit-dialog"
import { useClinic } from "@/contexts/clinic-context"
import { Clinica, Tarifa, ExcepcionHoraria, HorarioDia, FranjaHoraria } from "@/services/data/models/interfaces"
import { SearchInput } from "@/components/SearchInput"
import { ScheduleConfig } from "@/components/schedule-config"
import { DEFAULT_SCHEDULE } from "@/types/schedule"
import { useTemplates } from "@/hooks/use-templates"
import { toast } from "@/components/ui/use-toast"
import { Badge } from "@/components/ui/badge"
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
  Tag,
  Settings2,
  LayoutGrid,
  Wrench,
  HardDrive,
  X,
  Calendar,
  AlertCircle,
  AlertTriangle,
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { WeekSchedule } from "@/types/schedule"
import { saveToStorage } from "@/utils/storage-utils"
import { DebugStorage } from "@/components/debug-storage"
import AlmacenamientoClinicaContent from "@/app/configuracion/clinicas/[id]/almacenamiento/page"
import { useEquipment } from "@/contexts/equipment-context"
import { useTarif } from "@/contexts/tarif-context"
import { UsuariosClinica } from "@/components/usuarios-clinica"
import {
  findActiveExceptions,
  createExampleException,
  applyExampleException
} from "@/services/clinic-schedule-service"

const menuItems = [
  { id: "datos", label: "Datos de la clínica", icon: Building2 },
  { id: "horarios", label: "Horarios", icon: Clock },
  { id: "usuarios", label: "Usuarios", icon: Users },
  { id: "tarifa", label: "Tarifa", icon: Tag },
  { id: "entidades", label: "Entidades bancarias", icon: CreditCard },
  { id: "integraciones", label: "Integraciones", icon: Link },
  { id: "descuentos", label: "Descuentos", icon: Percent },
  { id: "sms", label: "SMS/Push", icon: MessageSquare },
  { id: "email", label: "Notificaciones e-mail", icon: Mail },
  { id: "whatsapp", label: "Notificaciones WhatsApp", icon: Phone },
  { id: "otros", label: "Otros APIs", icon: Globe },
  { id: "sedes", label: "Sedes", icon: MapPin },
  { id: "cabinas", label: "Cabinas", icon: LayoutGrid },
  { id: "equipamiento", label: "Equipamiento", icon: Wrench },
  { id: "almacenamiento", label: "Almacenamiento", icon: HardDrive },
  { id: "depuracion", label: "Depuración", icon: Trash2 },
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
    <Icon className="w-5 h-5" />
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
  const { getTarifaById } = useTarif()
  const [tarifaAplicada, setTarifaAplicada] = useState<Tarifa | null | undefined>(undefined)
  const [isLoadingTarifa, setIsLoadingTarifa] = useState(false)
  const [showNewUserDialog, setShowNewUserDialog] = useState(false)
  const [showExcepcionModal, setShowExcepcionModal] = useState(false)
  const [showHorarioModal, setShowHorarioModal] = useState(false)
  const [nuevaExcepcion, setNuevaExcepcion] = useState<Partial<ExcepcionHoraria>>({
    nombre: "",
    fechaInicio: "",
    fechaFin: "",
    dias: []
  })
  const [editingExcepcion, setEditingExcepcion] = useState<ExcepcionHoraria | null>(null)
  const [editingFranja, setEditingFranja] = useState<{
    diaId: string;
    franjaId?: string;
    inicio: string;
    fin: string;
    excepcionDiaIndex?: number;
  } | null>(null)
  
  const diasSemana = [
    'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'
  ]

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
          const equipmentList = await getEquiposByClinicaId(String(clinicId))
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
    
    // Si el parámetro tab es 'usuarios', establecer la pestaña activa a 'usuarios'
    if (tabParam === "usuarios") {
      setActiveTab("usuarios");
    } 
    // Si no, verificar si el parámetro tab coincide con algún ID de los menuItems
    else if (tabParam && menuItems.some(item => item.id === tabParam)) {
      setActiveTab(tabParam);
    }
  }, [searchParams])

  useEffect(() => {
    const loadTarifaData = async () => {
      const tarifaIdAsignada = clinicData?.config?.rate as string | undefined; 
      
      if (tarifaIdAsignada) { 
        setIsLoadingTarifa(true);
        setTarifaAplicada(undefined); 
        try {
          const tarifa: Tarifa | null = await getTarifaById(tarifaIdAsignada);
          setTarifaAplicada(tarifa || null); 
        } catch (error) {
          console.error("Error al cargar la tarifa plantilla:", error);
          setTarifaAplicada(null); 
        } finally {
          setIsLoadingTarifa(false);
        }
      } else if (clinicData) {
         setTarifaAplicada(null); 
      }
    };

    loadTarifaData();
  }, [clinicData, getTarifaById]);

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
          id: Math.max(...updatedCabins.map((c) => Number(c.id)), 0) + 1,
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
      const updatedCabins = clinicData?.config?.cabins?.filter((c) => Number(c.id) !== cabinId) || []
      handleClinicUpdate({ cabins: updatedCabins })
    },
    [clinicData?.config?.cabins, handleClinicUpdate],
  )

  const handleMoveCabin = useCallback(
    (cabinId: number, direction: "up" | "down") => {
      const updatedCabins = [...(clinicData?.config?.cabins || [])].sort((a, b) => a.order - b.order)
      const cabinIndex = updatedCabins.findIndex((c) => Number(c.id) === cabinId)

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

  const handleExcepcionChange = (field: keyof ExcepcionHoraria, value: any) => {
    if (editingExcepcion) {
      setEditingExcepcion({ ...editingExcepcion, [field]: value })
    } else {
      setNuevaExcepcion({ ...nuevaExcepcion, [field]: value })
    }
  }

  const handleCrearExcepcion = () => {
    setEditingExcepcion({
      id: Date.now().toString(),
      clinicaId: clinicId,
      ...crearExcepcionPorDefecto()
    } as ExcepcionHoraria)
    setShowExcepcionModal(true)
  }

  const handleEditarExcepcion = (excepcionId: string) => {
    const excepcion = clinicData?.config?.excepciones?.find(exc => exc.id === excepcionId)
    if (excepcion) {
      setEditingExcepcion(excepcion)
      setShowExcepcionModal(true)
    }
  }

  const handleGuardarExcepcion = () => {
    if (!editingExcepcion) return

    const excepcionesActualizadas = [
      ...(clinicData?.config?.excepciones || []).filter(exc => exc.id !== editingExcepcion.id),
      editingExcepcion
    ]
    
    handleClinicUpdate({ excepciones: excepcionesActualizadas })
    setShowExcepcionModal(false)
    setEditingExcepcion(null)
    
    toast({
      title: "Excepción de horario guardada",
      description: "La excepción ha sido guardada correctamente",
    })
  }

  const handleEliminarExcepcion = (excepcionId: string) => {
    const excepcionesActualizadas = (clinicData?.config?.excepciones || []).filter(exc => exc.id !== excepcionId)
    handleClinicUpdate({ excepciones: excepcionesActualizadas })
    
    toast({
      title: "Excepción eliminada",
      description: "La excepción ha sido eliminada exitosamente.",
    })
  }

  const handleToggleDiaExcepcion = (diaIndex: number, activo: boolean) => {
    if (!editingExcepcion) return
    
    const diasActualizados = [...editingExcepcion.dias]
    diasActualizados[diaIndex] = {
      ...diasActualizados[diaIndex],
      activo,
      franjas: activo ? diasActualizados[diaIndex].franjas : []
    }
    
    setEditingExcepcion({
      ...editingExcepcion,
      dias: diasActualizados
    })
  }

  const handleAddFranjaExcepcion = (diaIndex: number, inicio: string, fin: string) => {
    if (!editingExcepcion) return
    
    const nuevaFranja: FranjaHoraria = {
      id: Date.now().toString(),
      inicio,
      fin
    }
    
    const diasActualizados = [...editingExcepcion.dias]
    diasActualizados[diaIndex] = {
      ...diasActualizados[diaIndex],
      franjas: [...diasActualizados[diaIndex].franjas, nuevaFranja]
    }
    
    setEditingExcepcion({
      ...editingExcepcion,
      dias: diasActualizados
    })
  }

  const handleRemoveFranjaExcepcion = (diaIndex: number, franjaId: string) => {
    if (!editingExcepcion) return
    
    const diasActualizados = [...editingExcepcion.dias]
    diasActualizados[diaIndex] = {
      ...diasActualizados[diaIndex],
      franjas: diasActualizados[diaIndex].franjas.filter(franja => franja.id !== franjaId)
    }
    
    setEditingExcepcion({
      ...editingExcepcion,
      dias: diasActualizados
    })
  }
  
  const handleUpdateFranjaExcepcion = (diaIndex: number, franjaId: string, inicio: string, fin: string) => {
    if (!editingExcepcion) return
    
    const diasActualizados = [...editingExcepcion.dias]
    const franjas = [...diasActualizados[diaIndex].franjas]
    const franjaIndex = franjas.findIndex(f => f.id === franjaId)
    
    if (franjaIndex >= 0) {
      franjas[franjaIndex] = { ...franjas[franjaIndex], inicio, fin }
      diasActualizados[diaIndex] = { ...diasActualizados[diaIndex], franjas: franjas }
      
      setEditingExcepcion({
        ...editingExcepcion,
        dias: diasActualizados
      })
    }
  }

  if (!clinicData) {
    return null
  }

  const { config } = clinicData
  const typedConfig = config as any
  
  const defaultOpenTime = "00:00"
  const defaultCloseTime = "23:59"

  // Comprobar si hay excepciones activas - como función normal
  const verificarExcepcionesActivas = () => {
    // Verificar si hay excepciones configuradas
    if (!typedConfig.excepciones || typedConfig.excepciones.length === 0) return false;
    
    // Fecha actual
    const today = new Date();
    
    // Buscar alguna excepción activa
    return typedConfig.excepciones.some(excepcion => {
      const fechaInicio = new Date(excepcion.fechaInicio);
      const fechaFin = new Date(excepcion.fechaFin);
      
      // Comprobar si la fecha actual está dentro del rango de la excepción
      return fechaInicio <= today && today <= fechaFin;
    });
  };
  
  // Variable para almacenar el resultado
  const hayExcepcionesActivas = verificarExcepcionesActivas();

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
    { id: "horarios", label: "Horarios" },
    { id: "equipamiento", label: "Equipamiento" },
    { id: "almacenamiento", label: "Almacenamiento" },
    { id: "depuracion", label: "Depuración" },
  ]

  const traducirDia = (dia: string): string => {
    const traducciones: Record<string, string> = {
      'lunes': 'Lunes',
      'martes': 'Martes',
      'miercoles': 'Miércoles',
      'jueves': 'Jueves',
      'viernes': 'Viernes',
      'sabado': 'Sábado',
      'domingo': 'Domingo',
    }
    return traducciones[dia] || dia
  }

  const crearExcepcionPorDefecto = () => {
    // Obtener horario general de la clínica
    const horarioApertura = typedConfig.openTime || defaultOpenTime;
    const horarioCierre = typedConfig.closeTime || defaultCloseTime;
    
    return {
      nombre: "",
      fechaInicio: "",
      fechaFin: "",
      dias: diasSemana.map(dia => ({
        dia,
        franjas: [{
          id: Date.now().toString() + Math.random().toString(36).substring(2, 10),
          inicio: horarioApertura,
          fin: horarioCierre
        }],
        activo: true
      }))
    }
  }

  // Agregar una función para crear la excepción de ejemplo
  const crearExcepcionEjemplo = () => {
    if (!clinicData) return;
    
    // Crear y aplicar la excepción de ejemplo
    const exceptionToAdd = createExampleException(clinicData);
    
    // Actualizar la clínica con la nueva excepción
    const excepcionesActualizadas = [
      ...(typedConfig.excepciones || []),
      exceptionToAdd
    ];
    
    handleClinicUpdate({ excepciones: excepcionesActualizadas });
    
    toast({
      title: "Excepción de ejemplo creada",
      description: "Se ha creado una excepción de ejemplo que comienza hoy y dura una semana.",
    });
  }

  return (
    <div className="container px-0 pt-4 pb-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Configuración de Clínica: {clinicData?.name}</h1>
      </div>

      <div className="flex items-start gap-6">
        <div className="w-64 shrink-0">
          <div className="sticky p-4 border rounded-lg shadow top-4 bg-card">
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
                    <Icon className="w-5 h-5" />
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
              <h2 className="mb-6 text-2xl font-semibold">{menuItems.find((item) => item.id === activeTab)?.label}</h2>

              {activeTab === "datos" && (
                <Card className="p-6">
                  <SectionTitle icon={Building2} title="Información general" color="text-blue-600 border-blue-600" />
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="prefix" className="text-sm">
                        Prefijo
                      </Label>
                      <Input
                        id="prefix"
                        defaultValue={typedConfig.prefix}
                        className="text-sm h-9"
                        onChange={(e) => handleClinicUpdate({ prefix: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="name" className="text-sm">
                        Nombre
                      </Label>
                      <Input
                        id="name"
                        defaultValue={typedConfig.name}
                        className="text-sm h-9"
                        onChange={(e) => handleClinicUpdate({ name: e.target.value })}
                      />
                    </div>
                    
                    {/* Estado de activación de la clínica */}
                    <div className="space-y-2 md:col-span-2">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="isActive"
                          checked={clinicData?.isActive}
                          onCheckedChange={(checked) => {
                            if (clinicData) {
                              setClinicData({
                                ...clinicData,
                                isActive: checked === true
                              });
                              
                              // Mostrar feedback al usuario
                              toast({
                                title: checked ? "Clínica activada" : "Clínica desactivada",
                                description: checked 
                                  ? "La clínica aparecerá en los selectores de clínicas activas" 
                                  : "La clínica solo será visible cuando se muestre 'clínicas deshabilitadas'",
                                duration: 3000
                              });
                            }
                          }}
                        />
                        <Label htmlFor="isActive" className="text-sm font-medium cursor-pointer">
                          Clínica activa
                        </Label>
                        <div className={`ml-2 px-2 py-0.5 text-xs rounded-full ${clinicData?.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                          {clinicData?.isActive ? 'Activa' : 'Inactiva'}
                        </div>
                      </div>
                      <p className="ml-6 text-xs text-gray-500">
                        Las clínicas inactivas no aparecerán en los selectores por defecto,
                        pero sus datos se conservan y pueden reactivarse en cualquier momento.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="commercialName" className="text-sm">
                        Nombre Comercial
                      </Label>
                      <Input
                        id="commercialName"
                        defaultValue={typedConfig.commercialName}
                        className="text-sm h-9"
                        onChange={(e) => handleClinicUpdate({ commercialName: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="businessName" className="text-sm">
                        Razón Social
                      </Label>
                      <Input
                        id="businessName"
                        defaultValue={typedConfig.businessName}
                        className="text-sm h-9"
                        onChange={(e) => handleClinicUpdate({ businessName: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cif" className="text-sm">
                        CIF
                      </Label>
                      <Input
                        id="cif"
                        defaultValue={typedConfig.cif}
                        className="text-sm h-9"
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
                        defaultValue={typedConfig.country}
                        onValueChange={(value) => handleClinicUpdate({ country: value })}
                      >
                        <SelectTrigger className="text-sm h-9">
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
                        defaultValue={typedConfig.province}
                        className="text-sm h-9"
                        onChange={(e) => handleClinicUpdate({ province: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="city" className="text-sm">
                        Ciudad
                      </Label>
                      <Input
                        id="city"
                        defaultValue={typedConfig.city}
                        className="text-sm h-9"
                        onChange={(e) => handleClinicUpdate({ city: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="postalCode" className="text-sm">
                        CP
                      </Label>
                      <Input
                        id="postalCode"
                        defaultValue={typedConfig.postalCode}
                        className="text-sm h-9"
                        onChange={(e) => handleClinicUpdate({ postalCode: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="address" className="text-sm">
                        Dirección
                      </Label>
                      <Input
                        id="address"
                        defaultValue={typedConfig.address}
                        className="text-sm h-9"
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
                        defaultValue={typedConfig.phone}
                        className="text-sm h-9"
                        onChange={(e) => handleClinicUpdate({ phone: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone2" className="text-sm">
                        Teléfono 2
                      </Label>
                      <Input
                        id="phone2"
                        defaultValue={typedConfig.phone2}
                        className="text-sm h-9"
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
                        defaultValue={typedConfig.email}
                        className="text-sm h-9"
                        onChange={(e) => handleClinicUpdate({ email: e.target.value })}
                      />
                    </div>
                  </div>

                  <SectionTitle icon={Settings2} title="Configuración" color="text-purple-600 border-purple-600" />
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-sm">Caja inicial</Label>
                      <Input
                        type="number"
                        step="0.01"
                        defaultValue={typedConfig.initialCash}
                        className="text-sm h-9"
                        onChange={(e) => handleClinicUpdate({ initialCash: e.target.value })}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm">Tamaño impresión ticket</Label>
                      <Select
                        defaultValue={typedConfig.ticketSize}
                        onValueChange={(value) => handleClinicUpdate({ ticketSize: value })}
                      >
                        <SelectTrigger className="text-sm h-9">
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
                      <Select defaultValue={typedConfig.rate} onValueChange={(value) => handleClinicUpdate({ rate: value })}>
                        <SelectTrigger className="text-sm h-9">
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
                        defaultValue={typedConfig.ip}
                        className="text-sm h-9"
                        onChange={(e) => handleClinicUpdate({ ip: e.target.value })}
                      />
                    </div>

                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label className="text-sm">¿Desea bloquear el área de firma electrónica en flowww.me?</Label>
                        <RadioGroup
                          defaultValue={typedConfig.blockSignArea}
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
                          defaultValue={typedConfig.blockPersonalData}
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
                            defaultChecked={typedConfig.delayedPayments}
                            onCheckedChange={(checked) => handleClinicUpdate({ delayedPayments: checked })}
                          />
                          <Label htmlFor="delayed-payments" className="text-sm">
                            Pagos aplazados
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="affects-stats"
                            defaultChecked={typedConfig.affectsStats}
                            onCheckedChange={(checked) => handleClinicUpdate({ affectsStats: checked })}
                          />
                          <Label htmlFor="affects-stats" className="text-sm">
                            Afecta estadísticas
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="appears-in-app"
                            defaultChecked={typedConfig.appearsInApp}
                            onCheckedChange={(checked) => handleClinicUpdate({ appearsInApp: checked })}
                          />
                          <Label htmlFor="appears-in-app" className="text-sm">
                            Aparece en App / Self
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="schedule-control"
                            defaultChecked={typedConfig.scheduleControl}
                            onCheckedChange={(checked) => handleClinicUpdate({ scheduleControl: checked })}
                          />
                          <Label htmlFor="schedule-control" className="text-sm">
                            Control de horarios
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="professional-skills"
                            defaultChecked={typedConfig.professionalSkills}
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
                        defaultValue={typedConfig.notes}
                        className="h-20 text-sm"
                        onChange={(e) => handleClinicUpdate({ notes: e.target.value })}
                      />
                    </div>
                  </div>
                </Card>
              )}

              {activeTab === "horarios" && (
                <Card className="p-6">
                  <Tabs defaultValue="general" className="w-full">
                    <TabsList className="mb-4">
                      <TabsTrigger value="general">Horario General</TabsTrigger>
                      <TabsTrigger value="excepciones">Excepciones</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="general">
                      <div className="space-y-4">
                        <div className="grid grid-cols-3 gap-4 mb-6">
                          <div className="space-y-2">
                            <Label>Horario Apertura</Label>
                            <Input
                              type="time"
                              value={typedConfig.openTime || defaultOpenTime}
                              onChange={(e) => handleClinicUpdate({ openTime: e.target.value })}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Horario Cierre</Label>
                            <Input
                              type="time"
                              value={typedConfig.closeTime || defaultCloseTime}
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
                              value={typedConfig.slotDuration || 15}
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
                                <SelectItem key={String(template.id)} value={String(template.id)}>
                                  {template.description}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <Card>
                          <CardContent className="pt-6">
                            <ScheduleConfig
                              value={typedConfig.schedule || DEFAULT_SCHEDULE}
                              onChange={handleAdvancedScheduleChange}
                            />
                          </CardContent>
                        </Card>
                      </div>
                    </TabsContent>

                    <TabsContent value="excepciones">
                      <div className="space-y-6">
                        <div className="flex items-center justify-between">
                          <h3 className="text-lg font-medium">Excepciones horarias de la clínica</h3>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              onClick={crearExcepcionEjemplo}
                              className="bg-amber-100 text-amber-800 hover:bg-amber-200 border-amber-300"
                            >
                              Crear excepción de ejemplo
                            </Button>
                            <Button 
                              onClick={handleCrearExcepcion}
                              className="bg-purple-600 hover:bg-purple-700"
                            >
                              <Plus className="w-4 h-4 mr-2" />
                              Nueva excepción
                            </Button>
                          </div>
                        </div>
                        
                        {hayExcepcionesActivas && (
                          <div className="flex items-center gap-2 p-4 text-green-800 border border-green-300 rounded-lg bg-green-50">
                            <AlertTriangle className="w-5 h-5 text-green-600" />
                            <div>
                              <p className="font-medium">Hay excepciones activas actualmente</p>
                              <p className="text-sm">Los horarios de la agenda se están mostrando según estas excepciones.</p>
                            </div>
                          </div>
                        )}
                        
                        <p className="text-sm text-gray-600">
                          Configure periodos específicos con horarios diferentes al horario general de la clínica.
                          Las excepciones se aplican durante las fechas seleccionadas y tienen prioridad sobre el horario general.
                        </p>
                        
                        <div className="border rounded-md">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Nombre</TableHead>
                                <TableHead>Fecha Inicio</TableHead>
                                <TableHead>Fecha Fin</TableHead>
                                <TableHead className="text-right">Acciones</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {(typedConfig.excepciones || []).map((excepcion) => (
                                <TableRow key={excepcion.id}>
                                  <TableCell className="font-medium">{excepcion.nombre}</TableCell>
                                  <TableCell>
                                    <div className="flex items-center gap-2">
                                      <Calendar className="w-4 h-4 text-gray-500" />
                                      <span>
                                        {new Date(excepcion.fechaInicio).toLocaleDateString()}
                                      </span>
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex items-center gap-2">
                                      <Calendar className="w-4 h-4 text-gray-500" />
                                      <span>
                                        {new Date(excepcion.fechaFin).toLocaleDateString()}
                                      </span>
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-right">
                                    <div className="flex justify-end space-x-2">
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleEditarExcepcion(excepcion.id)}
                                      >
                                        Editar
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="text-red-600 hover:text-red-700"
                                        onClick={() => handleEliminarExcepcion(excepcion.id)}
                                      >
                                        Eliminar
                                      </Button>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              ))}
                              
                              {(!typedConfig.excepciones || typedConfig.excepciones.length === 0) && (
                                <TableRow>
                                  <TableCell colSpan={4} className="text-center text-gray-500">
                                    No hay excepciones configuradas
                                  </TableCell>
                                </TableRow>
                              )}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    </TabsContent>
                  </Tabs>
                </Card>
              )}

              {activeTab === "cabinas" && (
                <Card className="p-6">
                  <div className="space-y-4">
                    <h2 className="text-lg font-medium">Listado de cabinas de la clínica: {clinicData.name}</h2>

                    <SearchInput placeholder="Buscar cabinas" value={cabinFilterText} onChange={setCabinFilterText} />

                    <div className="border rounded-md">
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
                                    className="w-10 h-10 text-purple-600 hover:bg-purple-100"
                                    onClick={() => handleMoveCabin(Number(cabin.id), "up")}
                                    disabled={index === 0}
                                  >
                                    <ChevronUp className="w-6 h-6 font-bold" />
                                  </Button>
                                </TableCell>
                                <TableCell className="text-center">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="w-10 h-10 text-purple-600 hover:bg-purple-100"
                                    onClick={() => handleMoveCabin(Number(cabin.id), "down")}
                                    disabled={index === clinicData?.config?.cabins.length - 1}
                                  >
                                    <ChevronDown className="w-6 h-6 font-bold" />
                                  </Button>
                                </TableCell>
                                <TableCell className="text-center">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="w-10 h-10 text-purple-600 hover:bg-purple-100"
                                    onClick={() => handleDeleteCabin(Number(cabin.id))}
                                  >
                                    <Trash2 className="w-6 h-6 font-bold" />
                                  </Button>
                                </TableCell>
                                <TableCell className="text-center">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="w-10 h-10 text-purple-600 hover:bg-purple-100"
                                    onClick={() => {
                                      const cabinToEdit: Cabin = {
                                        id: Number(cabin.id),
                                        code: cabin.code,
                                        name: cabin.name,
                                        color: cabin.color,
                                        isActive: cabin.isActive,
                                        order: cabin.order
                                      };
                                      setEditingCabin(cabinToEdit)
                                      setIsCabinDialogOpen(true)
                                    }}
                                  >
                                    <Search className="w-6 h-6 font-bold" />
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

                    <div className="border rounded-md">
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
                              <TableCell className="space-x-1 text-right">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="w-8 h-8"
                                  onClick={() => deleteEquipment(index)}
                                >
                                  <Trash2 className="w-4 h-4 text-primary" />
                                  <span className="sr-only">Eliminar</span>
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="w-8 h-8"
                                  onClick={() =>
                                    router.push(`/configuracion/clinicas/${params.id}/equipamiento/${equipment.id}`)
                                  }
                                >
                                  <Search className="w-4 h-4 text-primary" />
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
                  <div className="flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-medium">Usuarios de la clínica: {clinicData.name}</h3>
                    </div>
                    
                    <UsuariosClinica 
                      clinicId={clinicId}
                      showNewUserDialog={showNewUserDialog}
                      onCloseNewUserDialog={() => setShowNewUserDialog(false)}
                    />
                  </div>
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

              {activeTab === "tarifa" && (
                <Card className="p-6">
                  <SectionTitle icon={Tag} title="Tarifa Aplicada" color="text-teal-600 border-teal-600" />
                  {isLoadingTarifa ? (
                    <p className="text-gray-500">Cargando información de la tarifa...</p>
                  ) : tarifaAplicada === null ? (
                    <p className="text-gray-500">
                       {clinicData?.config?.rate 
                          ? `No se encontró la tarifa con ID: "${clinicData.config.rate}". Verifique la configuración.`
                          : "Esta clínica no tiene una tarifa asignada."}
                    </p>
                  ) : tarifaAplicada ? (
                    <div className="space-y-4">
                       <div>
                          <Label className="block mb-1 text-sm font-medium text-gray-500">Nombre Tarifa</Label>
                          <p className="text-lg font-semibold">{tarifaAplicada.nombre}</p>
                       </div>
                       <Button onClick={() => router.push(`/configuracion/clinicas/${clinicId}/servicios`)} className="mt-4">
                          Configurar Servicios y Precios para esta Clínica
                       </Button>
                    </div>
                  ) : (
                     <p className="text-gray-500">Inicializando...</p>
                  )}
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
        onSave={handleSaveCabin as any}
      />

      <div className="fixed z-50 flex flex-col items-end space-y-2 bottom-4 right-4 md:flex-row md:space-y-0 md:space-x-2">
        <BackButton
          href="/configuracion/clinicas"
          className="px-4 py-2 text-sm text-gray-600 bg-white rounded-md shadow-md hover:bg-gray-100"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Volver
        </BackButton>
        {activeTab === "cabinas" && (
          <Button
            className="px-4 py-2 text-sm text-white bg-purple-600 rounded-md shadow-md hover:bg-purple-700"
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
            <Plus className="w-4 h-4 mr-2" />
            Nueva cabina
          </Button>
        )}
        {activeTab === "equipamiento" && (
          <Button
            className="px-4 py-2 text-sm text-white bg-purple-600 rounded-md shadow-md hover:bg-purple-700"
            onClick={() => {
              router.push(`/configuracion/clinicas/${clinicId}/equipamiento/nuevo`)
            }}
          >
            <Plus className="w-4 h-4 mr-2" />
            Nuevo equipamiento
          </Button>
        )}
        {activeTab === "usuarios" && (
          <Button
            className="px-4 py-2 text-sm text-white bg-purple-600 rounded-md shadow-md hover:bg-purple-700"
            onClick={() => setShowNewUserDialog(true)}
          >
            <Plus className="w-4 h-4 mr-2" />
            Nuevo usuario
          </Button>
        )}
        <Button
          className="px-4 py-2 text-sm text-white bg-purple-600 rounded-md shadow-md hover:bg-purple-700"
          onClick={handleSaveClinic}
          disabled={isSaving}
        >
          {isSaving ? (
            <>
              <svg
                className="w-5 h-5 mr-3 -ml-1 text-white animate-spin"
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
              <Save className="w-4 h-4 mr-2" />
              Guardar Centro
            </>
          )}
        </Button>
        <Button className="px-4 py-2 text-sm text-white bg-black rounded-md shadow-md hover:bg-gray-800">
          <HelpCircle className="w-4 h-4" />
        </Button>
      </div>

      {/* Modal para editar excepciones de horario */}
      {showExcepcionModal && editingExcepcion && !showHorarioModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-2xl p-6 bg-white rounded-lg shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">
                {editingExcepcion.id ? "Editar excepción de horario" : "Nueva excepción de horario"}
              </h3>
              <Button
                variant="ghost"
                size="icon"
                className="w-8 h-8 rounded-full"
                onClick={() => {
                  setShowExcepcionModal(false);
                  setEditingExcepcion(null);
                }}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="nombreExcepcion">Nombre de la excepción</Label>
                  <Input 
                    id="nombreExcepcion" 
                    value={editingExcepcion.nombre}
                    onChange={(e) => setEditingExcepcion({...editingExcepcion, nombre: e.target.value})}
                    placeholder="Ej: Vacaciones, Periodo especial, etc."
                  />
                </div>
                
                <div className="flex items-end gap-2">
                  <div className="flex-grow">
                    <Label htmlFor="fechaInicioExcepcion">Fecha inicio</Label>
                    <Input 
                      id="fechaInicioExcepcion" 
                      type="date"
                      value={editingExcepcion.fechaInicio}
                      onChange={(e) => setEditingExcepcion({...editingExcepcion, fechaInicio: e.target.value})}
                    />
                  </div>
                  <div className="flex-grow">
                    <Label htmlFor="fechaFinExcepcion">Fecha fin</Label>
                    <Input 
                      id="fechaFinExcepcion" 
                      type="date"
                      value={editingExcepcion.fechaFin}
                      min={editingExcepcion.fechaInicio}
                      onChange={(e) => setEditingExcepcion({...editingExcepcion, fechaFin: e.target.value})}
                    />
                  </div>
                </div>
              </div>
              
              <div className="p-3 mb-4 text-sm text-blue-700 rounded-md bg-blue-50">
                <p className="font-medium">Configuración de horario general de la clínica:</p>
                <p className="text-gray-600">
                  <span className="font-medium">Horario general:</span> {typedConfig.openTime || defaultOpenTime} - {typedConfig.closeTime || defaultCloseTime}
                </p>
                <p className="mt-1 text-xs italic text-gray-500">
                  Los horarios de excepción permiten modificar temporalmente el horario general de la clínica durante un periodo específico.
                </p>
              </div>
              
              <div className="mt-5">
                <h4 className="mb-3 text-sm font-medium">Configuración por día</h4>
                
                <div className="overflow-hidden border rounded-md">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="py-2 h-9 w-[100px]">Día</TableHead>
                        <TableHead className="py-2 h-9">Franjas horarias</TableHead>
                        <TableHead className="py-2 h-9 w-[100px] text-center">Activo</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {editingExcepcion.dias.map((dia, index) => (
                        <TableRow key={dia.dia}>
                          <TableCell className="font-medium">{traducirDia(dia.dia)}</TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-2">
                              {dia.franjas.length === 0 ? (
                                <span className="text-sm italic text-gray-500">Sin horario definido</span>
                              ) : (
                                dia.franjas.map((franja) => (
                                  <Badge 
                                    key={franja.id} 
                                    variant="outline"
                                    className="flex items-center gap-1 text-blue-700 border-blue-200 cursor-pointer hover:bg-blue-100 bg-blue-50"
                                    onClick={() => {
                                      setEditingFranja({
                                        diaId: dia.dia,
                                        franjaId: franja.id,
                                        inicio: franja.inicio,
                                        fin: franja.fin,
                                        excepcionDiaIndex: index
                                      });
                                      setShowHorarioModal(true);
                                    }}
                                  >
                                    <Clock className="w-3 h-3 mr-1" />
                                    {franja.inicio} - {franja.fin}
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="w-4 h-4 p-0 ml-1 text-gray-500 rounded-full hover:text-red-500 hover:bg-transparent"
                                      onClick={(e) => {
                                        e.stopPropagation(); // Evitar que se abra el modal de edición
                                        handleRemoveFranjaExcepcion(index, franja.id);
                                      }}
                                    >
                                      ×
                                    </Button>
                                  </Badge>
                                ))
                              )}
                              {dia.activo && (
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  className="h-6 text-gray-700 bg-gray-100 rounded-full hover:bg-gray-200"
                                  onClick={() => {
                                    handleAddFranjaExcepcion(
                                      index,
                                      typedConfig.openTime || defaultOpenTime,
                                      typedConfig.closeTime || defaultCloseTime
                                    );
                                  }}
                                >
                                  <Plus className="w-3 h-3 mr-1" />
                                  Añadir
                                </Button>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <Checkbox 
                              checked={dia.activo}
                              onCheckedChange={(checked) => handleToggleDiaExcepcion(index, checked === true)}
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
              
              <div className="flex justify-end gap-2 mt-6">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowExcepcionModal(false);
                    setEditingExcepcion(null);
                  }}
                  className="h-9"
                >
                  Cancelar
                </Button>
                <Button
                  className="bg-purple-600 h-9 hover:bg-purple-700"
                  onClick={handleGuardarExcepcion}
                  disabled={
                    !editingExcepcion.nombre || 
                    !editingExcepcion.fechaInicio || 
                    !editingExcepcion.fechaFin
                  }
                >
                  Guardar Excepción
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Modal para editar franjas horarias */}
      {showHorarioModal && editingFranja && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md p-6 bg-white rounded-lg shadow-lg">
            <h3 className="mb-4 text-lg font-semibold">
              {editingFranja.franjaId ? "Editar franja horaria" : "Añadir franja horaria"}
            </h3>
            
            <div className="space-y-4">
              <div className="p-3 mb-4 text-sm text-blue-700 rounded-md bg-blue-50">
                <p className="font-medium">Día: {traducirDia(editingFranja.diaId)}</p>
                <p className="text-gray-600">
                  <span className="font-medium">Horario general:</span> {typedConfig.openTime || defaultOpenTime} - {typedConfig.closeTime || defaultCloseTime}
                </p>
                <p className="mt-1 text-xs italic text-gray-500">
                  Configura un rango de tiempo para este día específico.
                </p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="horaInicio">Hora de inicio</Label>
                  <Input
                    id="horaInicio"
                    type="time"
                    value={editingFranja.inicio}
                    onChange={(e) => setEditingFranja({
                      ...editingFranja,
                      inicio: e.target.value
                    })}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="horaFin">Hora de fin</Label>
                  <Input
                    id="horaFin"
                    type="time"
                    value={editingFranja.fin}
                    onChange={(e) => setEditingFranja({
                      ...editingFranja,
                      fin: e.target.value
                    })}
                  />
                </div>
              </div>
              
              <div className="flex justify-end gap-2 mt-6">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowHorarioModal(false);
                    setEditingFranja(null);
                  }}
                  className="h-9"
                >
                  Cancelar
                </Button>
                <Button
                  className="bg-purple-600 h-9 hover:bg-purple-700"
                  onClick={() => {
                    if (editingFranja.excepcionDiaIndex !== undefined) {
                      if (editingFranja.franjaId) {
                        // Actualizar franja existente
                        handleUpdateFranjaExcepcion(
                          editingFranja.excepcionDiaIndex,
                          editingFranja.franjaId,
                          editingFranja.inicio,
                          editingFranja.fin
                        );
                      } else {
                        // Añadir nueva franja
                        handleAddFranjaExcepcion(
                          editingFranja.excepcionDiaIndex,
                          editingFranja.inicio,
                          editingFranja.fin
                        );
                      }
                    }
                    setShowHorarioModal(false);
                    setEditingFranja(null);
                  }}
                  disabled={
                    !editingFranja.inicio || 
                    !editingFranja.fin || 
                    editingFranja.inicio >= editingFranja.fin
                  }
                >
                  Guardar
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

