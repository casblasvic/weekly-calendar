"use client"

import React from "react"
import {
  Dialog,
  DialogTrigger,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogContent
} from "./ui/dialog"
import { DialogContent as DialogPrimitive } from "@radix-ui/react-dialog"
import { X } from "lucide-react"
import { VisuallyHidden } from "@/components/ui/visually-hidden"
import { ClientQuickViewDialog } from "./client-quick-view-dialog"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { 
  Calendar,
  X as XIcon,
  Search,
  Users,
  Tag,
  MessageCircle,
  Copy,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Move,
  CheckCircle,
  Phone,
  ExternalLink,
  ChevronUp,
  ChevronDown,
  Check,
  FileText,
  UserPlus,
  Clock,
  MapPin,
  MessageSquare,
  XCircle,
  CheckCircle2,
  ArrowUpRight,
  RefreshCw,
  RotateCcw,
  Play,
} from "lucide-react"
import { useState, forwardRef, useEffect, useRef, useMemo } from "react"
import { cn } from "@/lib/utils"
import { useLastClient } from "@/contexts/last-client-context"
import { CommentDialog } from "./comment-dialog"
import { useAppointmentTags } from "@/contexts/appointment-tags-context"
import { format, parseISO } from 'date-fns'
import { Badge } from '@/components/ui/badge'
import { Textarea } from "@/components/ui/textarea"
import { Loader2 } from "lucide-react"
import type { Appointment } from '@/types/appointments'
import type { CSSProperties, Key } from 'react'
import { useRouter } from 'next/navigation'
import { useClinic } from '@/contexts/clinic-context'
import { useServicesQuery, useBonosQuery, usePackagesQuery } from '@/lib/hooks/use-api-query'
import { extractTimeFromString, calculateDurationInMinutes, calculateEndTime } from "@/lib/utils/time-parser"
import { useGranularity } from "@/lib/drag-drop/granularity-context"
import { useIntegrationModules } from '@/hooks/use-integration-modules'
import { AppointmentEquipmentSelector } from './appointment-equipment-selector'

// WhatsApp icon component
const WhatsAppIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" fill="none">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.693.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
  </svg>
)

interface Service {
  id: string
  name: string
  price?: number
  duration: number
  category: string
  type?: 'service' | 'bono' | 'package' | 'package-service'
  items?: any[]
  serviceName?: string // Para bonos
  serviceId?: string // ID del servicio real asociado al bono
  realServiceId?: string // ID del servicio real para el backend
}

export interface Person {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  postalCode?: string;
  countryIsoCode?: string;
}

interface AppointmentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  date?: Date;
  clinic?: { id: string; name: string };
  professional?: { id: string; name: string };
  selectedTime?: string;
  roomId?: string;
  initialClient?: Person;
  isEditing?: boolean;
  existingAppointment?: {
    id?: string; // Añadir el ID de la cita para poder eliminarla o validarla
    services?: any[];
    notes?: string;
    tags?: string[];
    isValidated?: boolean; // Nuevo campo para saber si la cita está validada
    startTime?: string; // Hora de inicio de la cita (HH:mm o ISO string)
    endTime?: string; // Hora de fin de la cita (HH:mm o ISO string)
    duration?: number; // Duración real de la cita en minutos
    estimatedDurationMinutes?: number; // Duración teórica basada en servicios
  };
  onSaveAppointment?: (appointment: {
    id?: string; // Incluir el ID si es una edición
    clinicId: string;
    professionalId: string;
    personId: string;
    date: string;
    startTime: string;
    endTime: string;
    services: string[];
    notes?: string;
    roomId: string;
    tags?: string[]; // Añadir etiquetas
    estimatedDurationMinutes: number;
    durationMinutes: number;
    hasExtension: boolean;
    extensionMinutes: number;
  }) => void;
  onMoveAppointment?: () => void;
  onSearchClick?: () => void;
  onNewClientClick?: () => void;
  showClientDetailsOnOpen?: boolean;
  onDeleteAppointment?: (appointmentId: string, showConfirm: boolean) => Promise<void>;
}

export function AppointmentDialog({
  isOpen,
  onClose,
  date = new Date(),
  clinic,
  professional,
  selectedTime,
  roomId,
  initialClient,
  isEditing = false,
  existingAppointment,
  onSaveAppointment,
  onMoveAppointment,
  onSearchClick,
  onNewClientClick,
  showClientDetailsOnOpen,
  onDeleteAppointment,
}: AppointmentDialogProps) {
  const [activeTab, setActiveTab] = useState("servicios")
  const [selectedServices, setSelectedServices] = useState<Service[]>([])
  const [modules, setModules] = useState(1)
  const [showCommentDialog, setShowCommentDialog] = useState(false)
  const [showClientQuickView, setShowClientQuickView] = useState(false)
  const [appointmentComment, setAppointmentComment] = useState("")
  const [showClientDetails, setShowClientDetails] = useState(false)
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [endTime, setEndTime] = useState("")
  const [tagPopoverOpen, setTagPopoverOpen] = useState(false)
  const [userModifiedModules, setUserModifiedModules] = useState(false) // Track si el usuario modificó los módulos
  const [userModifiedServices, setUserModifiedServices] = useState(false) // Track si el usuario modificó los servicios
  const [initialTime, setInitialTime] = useState<string | undefined>() // Hora inicial para detectar cambios
  const servicesContainerRef = useRef<HTMLDivElement>(null)
  
  // ✅ ESTADO DE LOADING para renderizado optimista
  const [isSaving, setIsSaving] = useState(false)
  
  // ✅ DETECCIÓN DE CITA OPTIMISTA para botón dinámico
  const isOptimisticAppointment = existingAppointment?.id?.toString().startsWith('temp-')
  const canSave = !isOptimisticAppointment && !isSaving // Solo permitir guardar si NO es optimista
  
  // Nuevo estado para controlar servicios a validar
  const [servicesToValidate, setServicesToValidate] = useState<Record<string, 'VALIDATED' | 'NO_SHOW' | null>>({})
  
  // Estado para saber si la cita está validada
  const isAppointmentValidated = existingAppointment?.isValidated || false
  
  // 🛡️ Verificar módulo Shelly activo y estado de equipamiento
  const { isShellyActive } = useIntegrationModules()
  const [showEquipmentSelector, setShowEquipmentSelector] = useState(false)
  
  const { getTags, getTagById } = useAppointmentTags()
  const router = useRouter()

  const [hasChanges, setHasChanges] = useState(false)
  const [clientFormData, setClientFormData] = useState({
    firstName: initialClient?.firstName || '',
    lastName: initialClient?.lastName || '',
    phone: initialClient?.phone || '',
    email: initialClient?.email || '',
    address: initialClient?.address || '',
  })

  // Obtener slotDuration del contexto de granularidad
  const { slotDuration, minuteGranularity } = useGranularity();

  // NUEVO: Recalcular módulos basándose en la duración real de servicios seleccionados
  useEffect(() => {
    if (selectedServices.length > 0 && userModifiedServices && !userModifiedModules) {
      // Solo recalcular si el usuario modificó servicios pero NO módulos manualmente
      const totalDurationMinutes = selectedServices.reduce((sum, s) => sum + s.duration, 0)
      const calculatedModules = Math.max(1, Math.ceil(totalDurationMinutes / minuteGranularity))
      
      if (calculatedModules !== modules) {
        setModules(calculatedModules)
      }
    }
  }, [selectedServices, minuteGranularity, userModifiedServices, userModifiedModules, modules])

  // Calcular endTime cuando cambie selectedTime o modules
  useEffect(() => {
    // Solo recalcular endTime si:
    // 1. Es una nueva cita (no hay existingAppointment)
    // 2. El usuario modificó manualmente los módulos/servicios
    // 3. El usuario cambió la hora de inicio
    if (!existingAppointment || userModifiedModules || userModifiedServices) {
      if (selectedTime && modules > 0) {
        const totalMinutes = modules * minuteGranularity;
        const calculatedEndTime = calculateEndTime(selectedTime, totalMinutes);
        setEndTime(calculatedEndTime);
      }
    }
  }, [selectedTime, modules, minuteGranularity, existingAppointment, userModifiedModules, userModifiedServices])

  // Reset user modification flags when dialog opens/closes
  useEffect(() => {
    if (isOpen) {
      setUserModifiedModules(false)
      setUserModifiedServices(false)
      setInitialTime(selectedTime)
      setIsSaving(false) // ✅ RESETEAR LOADING al abrir modal
    } else {
      setIsSaving(false) // ✅ RESETEAR LOADING al cerrar modal
    }
  }, [isOpen, selectedTime])

  // Detectar cambios en selectedTime
  useEffect(() => {
    if (initialTime && selectedTime && selectedTime !== initialTime) {
      setUserModifiedModules(true) // Si cambia la hora, recalcular todo
    }
  }, [selectedTime, initialTime])

  // Obtener la clínica activa y su tarifa
  const { activeClinic } = useClinic()
  const tariffId = activeClinic?.tariff?.id

  // Usar los hooks normales que ya tienen caché optimizada
  const { 
    data: allServicesData = [], 
    isLoading: loadingServices 
  } = useServicesQuery()
  
  const { 
    data: allBonosData = [], 
    isLoading: loadingBonos 
  } = useBonosQuery()
  
  const { 
    data: allPackagesData = [], 
    isLoading: loadingPackages 
  } = usePackagesQuery()

  // Formatear los datos inmediatamente sin esperar a efectos
  const formattedServices = useMemo(() => {
    return allServicesData.map((s: any) => ({
      id: s.id,
      name: s.name,
      duration: s.durationMinutes || 0,
      category: s.category?.name || 'Sin categoría',
      type: 'service' as const
    }))
  }, [allServicesData])

  const formattedBonos = useMemo(() => {
    return allBonosData.map((b: any) => ({
      id: b.id,
      name: b.name,
      serviceName: b.service?.name || '', // Guardar el nombre del servicio
      duration: b.service?.durationMinutes || 0,
      category: 'Bonos',
      sessions: b.sessions,
      type: 'bono' as const,
      serviceId: b.service?.id // Guardar el ID del servicio real asociado al bono
    }))
  }, [allBonosData])

  const formattedPackages = useMemo(() => {
    // Solo mostrar paquetes que contengan servicios
    return allPackagesData
      .filter((p: any) => {
        // Verificar si el paquete tiene items de tipo servicio
        return p.items && p.items.some((item: any) => item.serviceId && item.service)
      })
      .map((p: any) => ({
        id: p.id,
        name: p.name,
        duration: 0, // No mostrar duración para paquetes
        category: 'Paquetes',
        items: p.items.filter((item: any) => item.serviceId && item.service),
        type: 'package' as const
      }))
  }, [allPackagesData])

  // Seleccionar qué datos mostrar según la pestaña activa
  const currentServices = useMemo(() => {
    switch (activeTab) {
      case 'servicios':
        return formattedServices
      case 'bonos':
        return formattedBonos
      case 'paquetes':
        return formattedPackages
      default:
        return []
    }
  }, [activeTab, formattedServices, formattedBonos, formattedPackages])

  // Filtrar por búsqueda
  const filteredServices = searchQuery
    ? currentServices.filter((s: any) =>
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.category.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : currentServices

  // Agrupar por categoría
  const servicesByCategory = useMemo(() => {
    return filteredServices.reduce((acc, service) => {
      if (!acc[service.category]) {
        acc[service.category] = []
      }
      acc[service.category].push(service)
      return acc
    }, {} as Record<string, typeof currentServices>)
  }, [filteredServices])

  // No mostrar spinner de carga ya que los datos principales están en caché
  const isLoading = false // Los datos ya están cargados en caché

  const handleServiceClick = (service: Service) => {
    if (isAppointmentValidated) return // No permitir añadir si está validada
    
    if (service.type === 'bono') {
      // Para bonos, añadir el servicio asociado
      const serviceId = `bono-${service.id}` // Mantener ID único para diferenciar servicios de bonos
      const isSelected = selectedServices.some((s) => s.id === serviceId)
      
      if (isSelected) {
        // Quitar el servicio
        setSelectedServices((prev) => prev.filter((s) => s.id !== serviceId))
        setModules((prev) => Math.max(1, prev - Math.ceil(service.duration / minuteGranularity)))
        setServicesToValidate((prev) => {
          const newState = { ...prev }
          delete newState[serviceId]
          return newState
        })
        setUserModifiedServices(true)
      } else {
        // Añadir el servicio del bono
        const serviceToAdd = {
          ...service,
          id: serviceId, // ID único para el estado local
          name: service.serviceName || service.name, // Usar el nombre del servicio, no del bono
          type: 'service' as const,
          realServiceId: service.serviceId // Guardar el ID del servicio real para el backend
        }
        setSelectedServices((prev) => [...prev, serviceToAdd])
        setModules((prev) => prev + Math.ceil(service.duration / minuteGranularity))
        setUserModifiedServices(true)
      }
    } else if (service.type === 'package' && service.items) {
      // Para paquetes, verificar si algún servicio del paquete está seleccionado
      const packageServiceIds = service.items.map((item: any) => `${service.id}-${item.service.id}`)
      const hasAnySelected = selectedServices.some((s) => packageServiceIds.includes(s.id))
      
      if (hasAnySelected) {
        // Quitar todos los servicios del paquete
        setSelectedServices((prev) => prev.filter((s) => !packageServiceIds.includes(s.id)))
        const totalDuration = service.items.reduce((sum: number, item: any) => 
          sum + (item.service.durationMinutes || 0), 0
        )
        setModules((prev) => Math.max(1, prev - Math.ceil(totalDuration / minuteGranularity)))
        setServicesToValidate((prev) => {
          const newState = { ...prev }
          packageServiceIds.forEach((id) => delete newState[id])
          return newState
        })
        setUserModifiedServices(true)
      } else {
        // Añadir todos los servicios del paquete
        const packageServices = service.items.map((item: any) => ({
          id: `${service.id}-${item.service.id}`,
          name: item.service.name,
          duration: item.service.durationMinutes || 0,
          category: service.name,
          type: 'service' as const,
          price: 0
        }))
        
        setSelectedServices((prev) => [...prev, ...packageServices])
        const totalDuration = packageServices.reduce((sum, s) => sum + s.duration, 0)
        setModules((prev) => prev + Math.ceil(totalDuration / minuteGranularity))
        setUserModifiedServices(true)
      }
    } else {
      // Para servicios normales
      const isSelected = selectedServices.some((s) => s.id === service.id)
      
      if (isSelected) {
        setSelectedServices((prev) => prev.filter((s) => s.id !== service.id))
        setModules((prev) => Math.max(1, prev - Math.ceil(service.duration / minuteGranularity)))
        setServicesToValidate((prev) => {
          const newState = { ...prev }
          delete newState[service.id]
          return newState
        })
        setUserModifiedServices(true)
      } else {
        setSelectedServices((prev) => [...prev, service])
        setModules((prev) => prev + Math.ceil(service.duration / minuteGranularity))
        setUserModifiedServices(true)
      }
    }
    
    // Scroll automático al final
    setTimeout(() => {
      if (servicesContainerRef.current) {
        servicesContainerRef.current.scrollTop = servicesContainerRef.current.scrollHeight
      }
    }, 50)
  }

  const handleRemoveService = (serviceId: string) => {
    if (isAppointmentValidated) return // No permitir eliminar si está validada
    
    const service = selectedServices.find((s) => s.id === serviceId)
    if (service) {
      setSelectedServices((prev) => prev.filter((s) => s.id !== serviceId))
      setModules((prev) => Math.max(1, prev - Math.ceil(service.duration / minuteGranularity)))
      
      // También quitar de servicios a validar
      setServicesToValidate((prev) => {
        const newState = { ...prev }
        delete newState[serviceId]
        return newState
      })
      setUserModifiedServices(true)
    }
  }

  const handleSaveComment = (comment: string) => {
    setAppointmentComment(comment)
    setShowCommentDialog(false)
  }

  const handleDelete = async () => {
    if (!existingAppointment?.id) return
    
    // ✅ CONFIRMACIÓN ÚNICA
    if (!confirm('¿Estás seguro de que deseas eliminar esta cita?')) {
      return
    }
    
    console.log('[AppointmentDialog] 🗑️ Usuario confirmó eliminación');
    
    try {
      // ✅ RENDERIZADO OPTIMISTA: Cerrar modal INMEDIATAMENTE
      onClose();
      
      // ✅ EJECUTAR ELIMINACIÓN OPTIMISTA en background
      if (onDeleteAppointment) {
        console.log('[AppointmentDialog] 🗑️ Llamando eliminación optimista...');
        await onDeleteAppointment(existingAppointment.id, false); // showConfirm = false porque ya confirmamos
      }
    } catch (error) {
      console.error('[AppointmentDialog] 🗑️ Error en eliminación:', error);
      // El error ya se maneja en handleDeleteAppointment del weekly-agenda
    }
  }

  const handleSave = async () => {
    if (!clinic || !professional || !selectedTime || !roomId || selectedServices.length === 0) {
      return
    }
    
    // ✅ ACTIVAR LOADING para feedback inmediato
    setIsSaving(true)

    try {
      const serviceIds = selectedServices.map(service => {
        if (service.id.startsWith('bono-')) {
          return service.realServiceId // Usar el ID del servicio real para el backend
        } else if (service.id.includes('-')) {
          // Para servicios de paquetes, obtener el ID del servicio
          const parts = service.id.split('-')
          return parts[parts.length - 1]
        }
        return service.id
      })

      // ✅ CORREGIDO: Lógica de extensión solo para cambios MANUALES
      const theoreticalDuration = selectedServices.reduce((sum, s) => sum + s.duration, 0)
      let actualDuration = modules * minuteGranularity
      
      // ✅ VALIDACIÓN CRÍTICA: Asegurar que actualDuration sea un número válido
      if (!actualDuration || actualDuration <= 0 || isNaN(actualDuration)) {
        console.warn('[AppointmentDialog] ⚠️ actualDuration inválida, calculando desde horarios:', {
          modules,
          minuteGranularity,
          originalActualDuration: actualDuration,
          selectedTime,
          endTime
        });
        
        // ✅ FALLBACK: Calcular desde startTime/endTime
        if (selectedTime && endTime) {
          const [startHours, startMinutes] = selectedTime.split(':').map(Number);
          const [endHours, endMinutes] = endTime.split(':').map(Number);
          const startTotalMinutes = startHours * 60 + startMinutes;
          const endTotalMinutes = endHours * 60 + endMinutes;
          actualDuration = endTotalMinutes - startTotalMinutes;
          console.log('[AppointmentDialog] ✅ Duración calculada desde horarios:', actualDuration);
        } else {
          // ✅ FALLBACK FINAL: Usar duración teórica de servicios
          actualDuration = theoreticalDuration > 0 ? theoreticalDuration : 15;
          console.warn('[AppointmentDialog] ⚠️ Usando duración de servicios como fallback:', actualDuration);
        }
      }
      
      // ✅ NUEVA LÓGICA: Solo considerar extensión si hay cambio MANUAL de módulos/tiempo
      // NO cuando simplemente se añaden servicios (cambio natural)
      const hasManualDurationChange = userModifiedModules && !userModifiedServices
      const hasExtension = hasManualDurationChange && actualDuration > theoreticalDuration
      const extensionMinutes = hasExtension ? actualDuration - theoreticalDuration : 0

      const appointmentData = {
        id: existingAppointment?.id, // Incluir el ID si es una edición
        clinicId: clinic.id,
        professionalId: professional.id,
        personId: initialClient?.id || '',
        date: format(date, 'yyyy-MM-dd'),
        startTime: selectedTime,
        endTime,
        services: serviceIds,
        notes: appointmentComment,
        roomId: roomId, // CORREGIDO: usar roomId, no equipmentId
        tags: selectedTags, // Añadir las etiquetas seleccionadas
        // ✅ INFORMACIÓN CORREGIDA DE EXTENSIÓN
        estimatedDurationMinutes: theoreticalDuration,
        durationMinutes: actualDuration,
        hasExtension,
        extensionMinutes,
        // ✅ METADATOS PARA DISTINGUIR ORIGEN DEL CAMBIO
        isManualDurationChange: hasManualDurationChange,
        userModifiedServices,
        userModifiedModules,
        // ✅ AÑADIR DATOS PARA RENDERIZADO OPTIMISTA
        selectedServicesData: selectedServices, // Servicios completos con nombres, duraciones, etc.
        clientData: initialClient // Cliente completo para el renderizado optimista
      }

      // ✅ DEBUG: Ver qué duración se está enviando
      console.log('[AppointmentDialog] 🔍 DATOS ENVIADOS AL OPTIMISTA:', {
        theoreticalDuration,
        actualDuration,
        modules,
        minuteGranularity,
        endTime,
        selectedTime,
        durationCalculation: `${modules} módulos × ${minuteGranularity} minutos = ${modules * minuteGranularity} minutos`,
        appointmentDataDuration: appointmentData.durationMinutes
      });

      // ✅ RENDERIZADO OPTIMISTA: Cerrar modal INMEDIATAMENTE
      onClose()

      // ✅ EJECUTAR API en background - el renderizado optimista ya se ve
      if (onSaveAppointment) {
        await onSaveAppointment(appointmentData)
      }
    } catch (error) {
      console.error('[AppointmentDialog] Error saving appointment:', error)
      // Si hay error, reabrir modal para que usuario pueda reintentar
      // onClose() ya se ejecutó, pero podríamos mostrar un toast de error
    } finally {
      // ✅ DESACTIVAR LOADING (aunque modal ya esté cerrado)
      setIsSaving(false)
    }
  }

  const handleValidate = async () => {
    // Filtrar solo los servicios que tienen un estado seleccionado
    const servicesToSend = Object.entries(servicesToValidate)
      .filter(([_, status]) => status !== null)
      .map(([serviceId, status]) => ({
        serviceId: serviceId.startsWith('bono-') ? serviceId.substring(5) : serviceId,
        status: status as 'VALIDATED' | 'NO_SHOW'
      }))
    
    if (servicesToSend.length === 0) return
    
    try {
      const response = await fetch('/api/appointments/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          appointmentId: existingAppointment?.id,
          servicesToValidate: servicesToSend,
          clinicId: clinic?.id
        })
      })

      if (response.ok) {
        const result = await response.json()
        alert(result.message || 'Cita validada correctamente')
        
        // Refrescar la agenda si existe la función
        if (onMoveAppointment) {
          onMoveAppointment()
        }
        onClose()
      } else {
        const error = await response.json()
        alert(`Error al validar: ${error.message}`)
      }
    } catch (error) {
      console.error('Error validating appointment:', error)
      alert('Error al validar la cita')
    }
  }

  const handleNoShow = async () => {
    if (!existingAppointment?.id) return
    
    try {
      // Marcar todos los servicios como NO_SHOW
      const servicesToSend = selectedServices.map(service => {
        let realServiceId = service.id
        if (service.id.startsWith('bono-')) {
          realServiceId = service.realServiceId // Usar el ID del servicio real para el backend
        } else if (service.id.includes('-')) {
          const parts = service.id.split('-')
          realServiceId = parts[parts.length - 1]
        }

        return {
          serviceId: realServiceId,
          status: 'NO_SHOW'
        }
      })

      const response = await fetch('/api/appointments/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          appointmentId: existingAppointment.id,
          servicesToValidate: servicesToSend,
          clinicId: clinic?.id
        })
      })

      if (response.ok) {
        alert('Cita marcada como no asistida')
        
        if (onMoveAppointment) {
          onMoveAppointment()
        }
        onClose()
      } else {
        const error = await response.json()
        alert(`Error: ${error.message}`)
      }
    } catch (error) {
      console.error('Error marking appointment as no-show:', error)
      alert('Error al marcar la cita como no asistida')
    }
  }

  const toggleServiceValidation = (serviceId: string, status: 'VALIDATED' | 'NO_SHOW') => {
    if (isAppointmentValidated) return // No permitir cambios si está validada
    
    setServicesToValidate(prev => {
      const newState = { ...prev }
      
      // Si ya tiene el mismo estado, lo quitamos (deseleccionar)
      if (newState[serviceId] === status) {
        delete newState[serviceId]
      } else {
        // Si no, lo establecemos con el nuevo estado
        newState[serviceId] = status
      }
      
      return newState
    })
  }

  const handleTagSelect = (tagId: string) => {
    console.log('[AppointmentDialog] handleTagSelect called with tagId:', tagId)
    setSelectedTags((prev) => 
      prev.includes(tagId) 
        ? prev.filter(id => id !== tagId) 
        : [...prev, tagId]
    )
  }

  const handleMove = () => {
    if (onMoveAppointment) {
      onMoveAppointment()
      onClose()
    }
  }

  // Initialize from appointment if editing
  useEffect(() => {
    if (initialClient) {
      setSelectedServices([])
      setModules(1)
      setAppointmentComment("")
      setSelectedTags([])
    }
  }, [initialClient])

  // Initialize from existing appointment when editing
  useEffect(() => {
    if (isEditing && existingAppointment) {

      
      // Inicializar notas
      setAppointmentComment(existingAppointment.notes || "")
      
      // Inicializar tags
      setSelectedTags(existingAppointment.tags || [])
      
      // NUEVO: Si existingAppointment tiene endTime, usarlo directamente
      if (existingAppointment.endTime) {
        // Extraer hora de fin del appointment existente usando la utilidad
        const endTimeStr = extractTimeFromString(existingAppointment.endTime);
        setEndTime(endTimeStr)
        
        // Calcular módulos basándose en la duración REAL de la cita
        if (existingAppointment.startTime && existingAppointment.endTime) {
          // Extraer las horas usando la utilidad
          const startTimeStr = extractTimeFromString(existingAppointment.startTime);
          const durationMinutes = calculateDurationInMinutes(startTimeStr, endTimeStr);
          setModules(Math.ceil(durationMinutes / minuteGranularity))
        }
      }
      
      // Inicializar servicios seleccionados
      const servicesToSelect = existingAppointment.services || []
      const formattedServices = allServicesData.map((s: any) => ({
        id: s.id,
        name: s.name,
        duration: s.durationMinutes || 0,
        category: s.category?.name || 'Sin categoría',
        type: 'service' as const
      }))
      const formattedBonos = allBonosData.map((b: any) => ({
        id: b.id,
        name: b.name,
        serviceName: b.service?.name || '', // Guardar el nombre del servicio
        duration: b.service?.durationMinutes || 0,
        category: 'Bonos',
        sessions: b.sessions,
        type: 'bono' as const,
        serviceId: b.service?.id // Guardar el ID del servicio real asociado al bono
      }))
      const formattedPackages = allPackagesData
        .filter((p: any) => {
          // Verificar si el paquete tiene items de tipo servicio
          return p.items && p.items.some((item: any) => item.serviceId && item.service)
        })
        .map((p: any) => ({
          id: p.id,
          name: p.name,
          duration: 0, // No mostrar duración para paquetes
          category: 'Paquetes',
          items: p.items.filter((item: any) => item.serviceId && item.service),
          type: 'package' as const
        }))
      const allServices = [...formattedServices, ...formattedBonos, ...formattedPackages]
      
      // Mapear los servicios desde la estructura del backend
      const selectedServices = servicesToSelect.map((appointmentService: any) => {
        const serviceId = appointmentService.serviceId || appointmentService.id
        const service = allServices.find((s) => {
          if (s.type === 'package') {
            return s.items.some((item: any) => item.serviceId === serviceId)
          }
          return s.id === serviceId
        })
        if (!service) return null
        if (service.type === 'bono') {
          // Para bonos, crear un ID especial para evitar conflictos
          return {
            ...service,
            id: `bono-${service.id}`, // ID único para el estado local
            name: service.serviceName || service.name, // Usar el nombre del servicio, no del bono
            type: 'service' as const,
            realServiceId: service.serviceId // Guardar el ID del servicio real para el backend
          }
        } else if (service.type === 'package' && service.items) {
          // Para paquetes, crear servicios individuales
          const packageService = service.items.find((item: any) => item.serviceId === serviceId)
          return {
            id: `${service.id}-${packageService.service.id}`,
            name: packageService.service.name,
            duration: packageService.service.durationMinutes || 0,
            category: service.name,
            type: 'service' as const,
            price: 0
          }
        } else {
          return service
        }
      }).filter(Boolean)
      
      setSelectedServices(selectedServices)
      
      // IMPORTANTE: Solo recalcular duración si NO tenemos endTime de la BD
      if (!existingAppointment.endTime) {
        setModules(Math.ceil(selectedServices.reduce((sum, s) => sum + s.duration, 0) / minuteGranularity))
      }
    }
  }, [isEditing, existingAppointment, allServicesData, allBonosData, allPackagesData])

  // Mostrar el resumen del cliente si showClientDetailsOnOpen es true
  useEffect(() => {
    if (isOpen && showClientDetailsOnOpen) {
      setShowClientDetails(true);
    }
  }, [isOpen, showClientDetailsOnOpen]);

  // Si no hay cliente, no mostrar el modal
  if (!initialClient) return null

  const clientName = `${initialClient.firstName} ${initialClient.lastName}`

  return (
    <React.Fragment>
      <Dialog 
        open={isOpen} 
        onOpenChange={(newOpen) => {
          if (!newOpen) {
            onClose()
          }
        }}
      >
        <DialogContent className="w-[90vw] max-h-[85vh] md:w-full sm:max-w-[800px] p-0 overflow-hidden h-[600px] flex flex-col">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-50 rounded-sm opacity-70 transition-opacity ring-offset-background hover:opacity-100 focus:outline-none focus:ring-0 disabled:pointer-events-none"
          >
            <XIcon className="w-4 h-4" />
            <span className="sr-only">Close</span>
          </button>
          
          <VisuallyHidden>
            <DialogTitle>Crear nueva cita</DialogTitle>
            <DialogDescription>Crear una nueva cita para el cliente {clientName}</DialogDescription>
          </VisuallyHidden>
          
          <div className="flex flex-col h-full">
            {/* Header horizontal a todo el ancho */}
            <div className="bg-gray-50 border-b">
              <div className="flex justify-between items-center px-4 py-3">
                {/* Lado izquierdo con información del cliente */}
                <div className="flex gap-4 items-start">
                  {/* Nombre y resumen */}
                  <div>
                    <div className="flex gap-2 items-center">
                      <h2 className="text-lg font-medium text-violet-600">{clientName}</h2>
                      <button
                        className="inline-flex justify-center items-center w-6 h-6 rounded hover:bg-purple-50"
                        onClick={() => {
                          console.log('[AppointmentDialog] Opening client quick view', { showClientDetails, initialClient })
                          setShowClientDetails(true)
                        }}
                        title="Ver resumen rápido"
                      >
                        <ExternalLink className="w-4 h-4 text-purple-600" />
                      </button>
                    </div>
                    {/* Teléfono y acciones */}
                    <div className="flex gap-3 items-center mt-1">
                      <span className="text-sm text-gray-600">{initialClient.phone}</span>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="w-5 h-5 hover:bg-violet-50"
                        onClick={() => window.location.href = `tel:${initialClient.phone}`}
                        title="Llamar"
                      >
                        <Phone className="h-3.5 w-3.5 text-violet-600" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="w-5 h-5 hover:bg-violet-50"
                        onClick={() => window.open(`https://wa.me/${initialClient.phone?.replace(/\s+/g, '')}`, '_blank')}
                        title="WhatsApp"
                      >
                        <WhatsAppIcon className="h-3.5 w-3.5 text-violet-600" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="w-5 h-5 hover:bg-purple-50"
                        onClick={() => {
                          // TODO: Navegar a la ficha del cliente
                          window.location.href = `/clientes/${initialClient.id}`
                        }}
                        title="Ir a ficha del cliente"
                      >
                        <FileText className="h-3.5 w-3.5 text-purple-600" />
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Lado derecho con acciones */}
                <div className="flex gap-2 items-center">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="w-8 h-8"
                    onClick={() => {
                      if (onNewClientClick) onNewClientClick()
                    }}
                    title="Añadir nuevo cliente"
                  >
                    <UserPlus className="w-4 h-4 text-blue-600" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="w-8 h-8"
                    onClick={() => {
                      if (onSearchClick) onSearchClick()
                    }}
                    title="Buscar otro cliente"
                  >
                    <Search className="w-4 h-4 text-orange-600" />
                  </Button>
                  <div className="mx-1 w-px h-6 bg-gray-300" />
                </div>
              </div>
            </div>
            
            {/* Contenido principal con dos columnas */}
            <div className="flex flex-1 min-h-0">
              {/* Panel lateral con fecha y hora de la cita */}
              <div className="w-[280px] border-r bg-white flex flex-col">
                {/* Fecha y hora de la cita */}
                <div className="p-4 bg-gray-50 border-b">
                  <div className="flex gap-2 items-center">
                    <MapPin className="h-3.5 w-3.5 text-purple-600" />
                    <span className="text-xs text-gray-700">
                      {date ? format(date, 'dd/MM/yyyy') : 'Sin fecha'}
                    </span>
                    <Clock className="h-3.5 w-3.5 text-green-500 ml-2" />
                    <span className="text-xs text-gray-700">
                      {selectedTime}
                      {endTime && selectedServices.length > 0 && (
                        <span> - {endTime}</span>
                      )}
                    </span>
                    
                    {/* ✅ BOTÓN RESTABLECER - Al lado de las horas - CORREGIDO para extensiones Y reducciones */}
                    {existingAppointment?.estimatedDurationMinutes && 
                     existingAppointment?.duration && 
                     existingAppointment.duration !== existingAppointment.estimatedDurationMinutes && (
                      <button
                        className={cn(
                          "p-1 ml-2 rounded-md transition-colors shadow-sm",
                          // ✅ COLORES SEGÚN TIPO: Rojo para extensión, naranja para reducción
                          existingAppointment.duration > existingAppointment.estimatedDurationMinutes ? (
                            "hover:bg-red-100 bg-red-50" // Rojo para extendida
                          ) : (
                            "hover:bg-orange-100 bg-orange-50" // Naranja para reducida
                          )
                        )}
                        onClick={async () => {
                          if (!existingAppointment?.id) return;
                          
                          try {
                            console.log('[Modal] Revirtiendo extensión:', existingAppointment.id);
                            
                            const response = await fetch(`/api/appointments/${existingAppointment.id}/revert-extension`, {
                              method: 'DELETE',
                              headers: {
                                'Content-Type': 'application/json',
                              },
                            });
                            
                            if (response.ok) {
                              console.log('[Modal] Extensión revertida correctamente');
                              onClose(); // Cerrar modal después de revertir
                              // El optimistic update se maneja automáticamente
                            } else {
                              const errorData = await response.json().catch(() => ({ error: 'Error desconocido' }));
                              console.error('[Modal] Error al revertir extensión:', errorData);
                              
                              // Mostrar mensaje de error específico
                              if (response.status === 400 && errorData.error?.includes('duración correcta')) {
                                // Cita ya tiene duración correcta - no es un error crítico
                                console.log('[Modal] La cita ya tiene la duración correcta');
                                onClose(); // Cerrar modal igual
                              } else {
                                console.error('[Modal] Error inesperado:', response.status, errorData);
                              }
                            }
                          } catch (error) {
                            console.error('[Modal] Error de red:', error);
                          }
                        }}
                        title={`Restablecer a duración de servicios (${existingAppointment.estimatedDurationMinutes} min)`}
                      >
                        <RotateCcw className={cn(
                          "h-3.5 w-3.5 transition-colors",
                          // ✅ COLORES SEGÚN TIPO: Rojo para extensión, naranja para reducción
                          existingAppointment.duration > existingAppointment.estimatedDurationMinutes ? (
                            "text-red-600 hover:text-red-700" // Rojo para extendida
                          ) : (
                            "text-orange-600 hover:text-orange-700" // Naranja para reducida
                          )
                        )} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Contenedor scrollable para servicios seleccionados */}
                <div 
                  ref={servicesContainerRef}
                  className="flex-1 p-2.5 overflow-y-auto bg-[#F8F9FA]"
                  style={{ 
                    scrollbarWidth: 'thin',
                    scrollbarColor: '#9333ea #f3f4f6'
                  }}
                >
                  {selectedServices.length === 0 ? (
                    <div className="py-6 text-center text-gray-400">
                      <p className="text-sm">No hay servicios seleccionados</p>
                      <p className="text-xs">Selecciona servicios de la lista</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {selectedServices.map((service) => (
                        <div 
                          key={service.id} 
                          className="flex justify-between items-center p-2"
                        >
                          <div className="flex items-center gap-1.5 max-w-[160px]">
                            <div className="w-1.5 h-1.5 rounded-full bg-purple-600 shrink-0" />
                            <span className="text-xs text-gray-700 truncate">{service.name}</span>
                            <span className="ml-1 text-xs text-gray-500 shrink-0">({service.duration}m)</span>
                          </div>
                          <div className="flex gap-1 items-center">
                            {isEditing && !isAppointmentValidated && (
                              <div className="flex items-center gap-0.5">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className={cn(
                                    "h-5 w-5 shrink-0",
                                    servicesToValidate[service.id] === 'VALIDATED' 
                                      ? "text-green-600 hover:text-green-700" 
                                      : "text-gray-400 hover:text-green-600"
                                  )}
                                  onClick={() => toggleServiceValidation(service.id, 'VALIDATED')}
                                  title={servicesToValidate[service.id] === 'VALIDATED' ? "Marcado para validar" : "Marcar para validar"}
                                >
                                  <CheckCircle2 className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className={cn(
                                    "h-5 w-5 shrink-0",
                                    servicesToValidate[service.id] === 'NO_SHOW' 
                                      ? "text-red-600 hover:text-red-700" 
                                      : "text-gray-400 hover:text-red-600"
                                  )}
                                  onClick={() => toggleServiceValidation(service.id, 'NO_SHOW')}
                                  title={servicesToValidate[service.id] === 'NO_SHOW' ? "Marcado como no asistido" : "Marcar como no asistido"}
                                >
                                  <XCircle className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="w-5 h-5 shrink-0"
                              onClick={() => handleRemoveService(service.id)}
                              disabled={isAppointmentValidated}
                            >
                              <Trash2 className="h-3.5 w-3.5 text-red-600" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Botones de acción - siempre visible */}
                <div className="p-2.5 space-y-2 border-t bg-[#F8F9FA]">
                  {/* Etiquetas seleccionadas como bolitas de colores */}
                  {selectedTags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {selectedTags.map((tagId) => {
                        const tag = getTags().find((t) => t.id === tagId)
                        if (!tag) return null
                        return (
                          <div
                            key={tagId}
                            className="relative w-5 h-5 rounded-full cursor-pointer group"
                            style={{ backgroundColor: tag.color }}
                            title={tag.name}
                          >
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleTagSelect(tagId)
                              }}
                              className="flex absolute inset-0 justify-center items-center rounded-full opacity-0 transition-opacity group-hover:opacity-100 bg-black/20"
                            >
                              <XIcon className="h-2.5 w-2.5 text-white" />
                            </button>
                          </div>
                        )
                      })}
                    </div>
                  )}
                  
                  <div className="relative">
                    <Button 
                      variant="outline" 
                      className="justify-start w-full h-8 text-xs font-light bg-white border shadow-sm hover:bg-gray-50"
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        console.log('[AppointmentDialog] Etiquetas button clicked')
                        setTagPopoverOpen(!tagPopoverOpen)
                      }}
                    >
                      <Tag className="h-3.5 w-3.5 mr-1.5 text-purple-500" />
                      Etiquetas
                      {selectedTags.length > 0 && (
                        <span className="ml-1.5 text-xs text-gray-600">
                          ({selectedTags.length})
                        </span>
                      )}
                    </Button>
                    
                    {/* Popover simple sin Radix UI para depurar */}
                    {tagPopoverOpen && (
                      <>
                        {/* Overlay invisible para cerrar al hacer clic fuera */}
                        <div 
                          className="fixed inset-0 z-40" 
                          onClick={() => setTagPopoverOpen(false)}
                        />
                        <div 
                          className="absolute top-full left-0 mt-1 w-[240px] bg-white border rounded-md shadow-lg z-50"
                          onMouseLeave={() => {
                            // Cerrar después de un pequeño delay para evitar cierres accidentales
                            setTimeout(() => setTagPopoverOpen(false), 300)
                          }}
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                          }}
                        >
                          <div className="max-h-[220px] overflow-y-auto p-1">
                            {getTags().length === 0 ? (
                              <div className="p-4 text-xs text-center text-gray-500">
                                No hay etiquetas disponibles
                              </div>
                            ) : (
                              <div className="grid gap-0.5 pb-1">
                                {getTags().map((tag) => (
                                  <button
                                    key={tag.id}
                                    type="button"
                                    className="flex justify-between items-center px-3 py-2 text-left rounded transition-colors cursor-pointer hover:brightness-110"
                                    style={{
                                      backgroundColor: tag.color,
                                      color: "#FFFFFF",
                                    }}
                                    onClick={(e) => {
                                      e.preventDefault()
                                      e.stopPropagation()
                                      console.log('[AppointmentDialog] Tag clicked:', tag.id, tag.name)
                                      handleTagSelect(tag.id)
                                    }}
                                  >
                                    <span className="text-sm font-medium">{tag.name}</span>
                                    {selectedTags.includes(tag.id) && <Check className="w-4 h-4" />}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                  
                  <div className="px-2.5 pt-1.5 pb-2.5 flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      className="justify-start font-light text-xs bg-[#E9ECEF] hover:bg-gray-200 border-0 shadow-none h-8 disabled:opacity-50 disabled:cursor-not-allowed"
                      onClick={handleDelete}
                      disabled={!selectedServices.length || isAppointmentValidated}
                    >
                      <Trash2 className="h-3.5 w-3.5 text-red-500" />
                      Eliminar
                    </Button>
                    
                    <Button
                      variant="outline"
                      className="justify-start font-light text-xs bg-[#E9ECEF] hover:bg-gray-200 border-0 shadow-none h-8 disabled:opacity-50 disabled:cursor-not-allowed"
                      onClick={handleMove}
                      disabled={!selectedServices.length || isAppointmentValidated}
                    >
                      <Move className="h-3.5 w-3.5 text-blue-500" />
                      Mover
                    </Button>
                    
                    <Button
                      variant="outline"
                      className="justify-start font-light text-xs bg-[#E9ECEF] hover:bg-gray-200 border-0 shadow-none h-8 disabled:opacity-50 disabled:cursor-not-allowed"
                      onClick={() => setShowCommentDialog(true)}
                      disabled={!selectedServices.length || isAppointmentValidated}
                    >
                      <MessageSquare className="h-3.5 w-3.5 mr-1.5 text-gray-500" />
                      Comentarios
                    </Button>
                    
                    <Button
                      variant="outline"
                      className="justify-start font-light text-xs bg-[#E9ECEF] hover:bg-gray-200 border-0 shadow-none h-8 disabled:opacity-50 disabled:cursor-not-allowed"
                      onClick={handleNoShow}
                      disabled={!selectedServices.length || isAppointmentValidated}
                    >
                      <XCircle className="h-3.5 w-3.5 mr-1.5 text-orange-500" />
                      No asistido
                    </Button>
                    
                    {/* 🎯 BOTÓN INICIAR SERVICIO - Solo si módulo Shelly activo */}
                    {isEditing && isShellyActive && (
                      <Button
                        variant="outline"
                        className="justify-start font-light text-xs border-0 shadow-sm h-8 bg-green-500 hover:bg-green-600 text-white disabled:opacity-50 disabled:cursor-not-allowed w-full mt-2"
                        onClick={() => setShowEquipmentSelector(true)}
                        disabled={!selectedServices.length || isAppointmentValidated}
                      >
                        <Play className="h-3.5 w-3.5 mr-1.5" />
                        Iniciar Servicio
                      </Button>
                    )}
                    
                    {isEditing && (
                      <Button
                        variant="outline"
                        className={cn(
                          "justify-start font-light text-xs border-0 shadow-sm h-8 disabled:opacity-50 disabled:cursor-not-allowed w-full",
                          isShellyActive ? "mt-1" : "mt-2", // Menos margen si hay botón de equipamiento arriba
                          Object.values(servicesToValidate).some(status => status === 'VALIDATED') 
                            ? "bg-[#28A745] hover:bg-[#218838] text-white" 
                            : "bg-red-500 hover:bg-red-600 text-white"
                        )}
                        onClick={handleValidate}
                        disabled={!Object.values(servicesToValidate).some(status => status !== null)}
                      >
                        <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                        Validar cita
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              {/* Panel derecho con pestañas de servicios */}
              <div className="flex overflow-hidden flex-col flex-1 min-h-0 bg-white">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col flex-1 h-full">
                  <TabsList className="w-full justify-start h-auto px-3 py-1.5 bg-transparent border-b rounded-none shrink-0">
                    <TabsTrigger
                      value="servicios"
                      className="rounded-none px-3 py-1 text-xs font-normal border-b-2 border-transparent
                                data-[state=active]:border-purple-600 
                                data-[state=active]:text-purple-600 
                                data-[state=active]:font-medium data-[state=active]:bg-transparent
                                hover:bg-purple-600 hover:text-white transition-colors"
                    >
                      SERVICIOS
                    </TabsTrigger>
                    <TabsTrigger
                      value="bonos"
                      className="rounded-none px-3 py-1 text-xs font-normal border-b-2 border-transparent
                                data-[state=active]:border-purple-600 
                                data-[state=active]:text-purple-600 
                                data-[state=active]:font-medium data-[state=active]:bg-transparent
                                hover:bg-purple-600 hover:text-white transition-colors"
                    >
                      BONOS
                    </TabsTrigger>
                    <TabsTrigger
                      value="paquetes"
                      className="rounded-none px-3 py-1 text-xs font-normal border-b-2 border-transparent
                                data-[state=active]:border-purple-600 
                                data-[state=active]:text-purple-600 
                                data-[state=active]:font-medium data-[state=active]:bg-transparent
                                hover:bg-purple-600 hover:text-white transition-colors"
                    >
                      PAQUETES
                    </TabsTrigger>
                  </TabsList>
                  
                  {/* Contenedor con scroll para los servicios de la pestaña */}
                  <div className="overflow-hidden flex-1 min-h-0">
                    <div className="overflow-y-auto h-full" style={{ scrollbarWidth: 'thin', scrollbarColor: '#9333ea #f3f4f6' }}>
                      {['servicios', 'bonos', 'paquetes'].map((tab) => (
                        <TabsContent key={tab} value={tab} className="m-0">
                          {/* Siempre mostrar contenido con altura fija, nunca skeleton */}
                          {servicesByCategory && Object.keys(servicesByCategory).length > 0 ? (
                            Object.entries(servicesByCategory).map(([category, servicesInCategory]) => (
                              <div key={category} className="border-b last:border-b-0">
                                {/* Categoría con estilo más prominente */}
                                <h3 className="sticky top-0 z-10 px-3 py-3 text-xs font-bold tracking-wider text-gray-700 uppercase bg-gray-50 border-b border-gray-200">
                                  {category}
                                </h3>
                                {/* Servicios con mejor separación visual */}
                                <div className="bg-white">
                                  {(servicesInCategory as Service[]).map((service, index) => {
                                    // Para bonos, verificar si está seleccionado por el ID especial
                                    const isSelected = service.type === 'bono' 
                                      ? selectedServices.some(s => s.id === `bono-${service.id}`)
                                      : service.type === 'package' && service.items
                                      ? service.items.some((item: any) => selectedServices.some(s => s.id === `${service.id}-${item.service.id}`))
                                      : selectedServices.some(s => s.id === service.id)
                                    
                                    return (
                                      <div
                                        key={service.id}
                                        className={cn(
                                          "px-4 py-2.5 cursor-pointer transition-all group border-b border-gray-100 last:border-b-0",
                                          isSelected 
                                            ? "bg-purple-50 shadow-sm" 
                                            : "hover:bg-purple-50 hover:shadow-sm"
                                        )}
                                        onClick={() => handleServiceClick(service)}
                                      >
                                        <div className="flex justify-between items-center">
                                          <span className={cn(
                                            "flex-1 mr-3 text-sm font-normal",
                                            isSelected 
                                              ? "font-medium text-purple-700" 
                                              : "text-gray-700 group-hover:text-purple-700"
                                          )}>
                                            {service.name}
                                          </span>
                                          <div className="flex gap-3 items-center shrink-0">
                                            {isSelected && (
                                              <CheckCircle2 className="w-4 h-4 text-purple-600" />
                                            )}
                                            {service.type !== 'package' && (
                                              <span className={cn(
                                                "text-xs",
                                                isSelected 
                                                  ? "text-purple-600" 
                                                  : "text-gray-500 group-hover:text-purple-600"
                                              )}>
                                                <Clock className="inline mr-1 w-3 h-3" />
                                                {service.duration}min
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    )
                                  })}
                                </div>
                              </div>
                            ))
                          ) : (
                            // Contenedor vacío con altura mínima para evitar saltos
                            <div className="min-h-[200px] flex items-center justify-center text-gray-400 text-sm">
                              {activeTab === 'servicios' && 'No hay servicios disponibles'}
                              {activeTab === 'bonos' && 'No hay bonos disponibles'}
                              {activeTab === 'paquetes' && 'No hay paquetes disponibles'}
                            </div>
                          )}
                        </TabsContent>
                      ))}
                    </div>
                  </div>
                  
                  {/* Buscador - siempre visible al fondo */}
                  <div className="px-3 py-2 border-t shrink-0">
                    <Input 
                      placeholder="Buscar servicio..." 
                      className="h-8 text-xs bg-gray-50" 
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  
                  {/* Controles inferiores */}
                  <div className="px-3 py-3 bg-white border-t shrink-0">
                    <div className="flex gap-3 justify-between items-center">
                      <div className="flex gap-2 items-center">
                        <label className="text-xs text-gray-500">Módulos:</label>
                        <div className="flex gap-2 items-center">
                          <Button
                            variant="outline"
                            size="icon"
                            className="w-6 h-6"
                            onClick={() => {
                              setModules(Math.max(1, modules - 1))
                              setUserModifiedModules(true)
                            }}
                          >
                            <ChevronDown className="w-3 h-3" />
                          </Button>
                          <span className="w-8 text-xs font-medium text-center">{modules}</span>
                          <Button
                            variant="outline"
                            size="icon"
                            className="w-6 h-6"
                            onClick={() => {
                              setModules(modules + 1)
                              setUserModifiedModules(true)
                            }}
                          >
                            <ChevronUp className="w-3 h-3" />
                          </Button>
                        </div>
                        <span className="text-xs text-gray-500">
                          (Cualquiera)
                        </span>
                      </div>
                      
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={onClose}
                        >
                          Cancelar
                        </Button>
                        <Button
                          variant="default"
                          size="sm"
                          className="bg-purple-600 hover:bg-purple-700"
                          onClick={handleSave}
                          disabled={!selectedServices.length || isAppointmentValidated || isSaving || isOptimisticAppointment}
                        >
                          {isSaving ? (
                            <>
                              <Loader2 className="mr-2 w-4 h-4 animate-spin" />
                              Guardando...
                            </>
                          ) : isOptimisticAppointment ? (
                            <>
                              <Loader2 className="mr-2 w-4 h-4 animate-spin" />
                              Procesando...
                            </>
                          ) : (
                            'Guardar'
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                </Tabs>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Diálogo de comentarios */}
      <CommentDialog
        isOpen={showCommentDialog}
        onClose={() => setShowCommentDialog(false)}
        onSave={handleSaveComment}
        initialComment={appointmentComment}
      />
      
      {/* Panel lateral de detalles del cliente */}
      <ClientQuickViewDialog
        isOpen={showClientDetails}
        onOpenChange={setShowClientDetails}
        client={initialClient}
      />

      {/* 🎯 MODAL SELECTOR DE EQUIPAMIENTO - Solo si módulo Shelly activo */}
      {isShellyActive && existingAppointment?.id && !existingAppointment.id.toString().startsWith('temp-') && (
        <AppointmentEquipmentSelector
          open={showEquipmentSelector}
          onOpenChange={setShowEquipmentSelector}
          appointmentId={existingAppointment.id}
          appointmentClientName={initialClient ? `${initialClient.firstName} ${initialClient.lastName}` : undefined}
          onStartWithoutEquipment={() => {
            console.log('Iniciar sin equipamiento desde modal de edición');
            setShowEquipmentSelector(false);
          }}
          appointmentData={existingAppointment} // ⚡ Pasar datos pre-cargados del appointment
        />
      )}
    </React.Fragment>
  )
}
