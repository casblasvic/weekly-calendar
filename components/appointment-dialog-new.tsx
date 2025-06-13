"use client"

import type React from "react"
import { Dialog, DialogContent as UIDialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Phone,
  MessageCircle,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Clock,
  Heart,
  Users,
  UserPlus,
  Copy,
  ExternalLink,
  Tag,
  Move,
  MessageSquare,
  XCircle,
  CheckCircle2,
  X,
  Check,
  Search,
  MapPin,
} from "lucide-react"
import { useState, forwardRef, useEffect, useRef, useMemo } from "react"
import { cn } from "@/lib/utils"
import { useLastClient } from "@/contexts/last-client-context"
import { CommentDialog } from "./comment-dialog"
import { Input } from "@/components/ui/input"
import { useAppointmentTags } from "@/contexts/appointment-tags-context"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { format, parseISO } from 'date-fns'
import { Badge } from '@/components/ui/badge'
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Loader2 } from "lucide-react"
import type { Appointment } from '@/types/appointments'
import type { CSSProperties, Key } from 'react'

interface Service {
  id: string;
  name: string;
  category: string;
  duration: number;
}

interface Client {
  id: string;
  firstName: string;
  lastName: string;
  name?: string;
  phone: string;
  email: string;
  address: string;
}

interface AppointmentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  date?: Date;
  selectedTime: string;
  onCreateAppointment?: (appointment: any) => void;
  onDeleteAppointment?: () => void;
  onMoveAppointment?: () => void;
  onValidateAppointment?: () => void;
  onMarkAsNoShow?: () => void;
  servicesFilter?: string[];
  client?: Client;
  appointment?: any;
  onSearchClick?: () => void;
  onNewClientClick?: () => void;
  onDelete?: () => void;
  onSave?: (appointment: {
    client: Client;
    services: Service[];
    time: string;
    comment?: string;
    blocks: number;
    tags?: string[];
  }) => void;
  isEditing?: boolean;
}

export function AppointmentDialog({
  isOpen,
  onClose,
  date,
  selectedTime,
  onCreateAppointment,
  onDeleteAppointment,
  onMoveAppointment,
  onValidateAppointment,
  onMarkAsNoShow,
  servicesFilter = [],
  client: initialClient,
  appointment,
  onSearchClick,
  onNewClientClick,
  onDelete,
  onSave,
  isEditing = false,
}: AppointmentDialogProps) {
  const [activeTab, setActiveTab] = useState("servicios")
  const [selectedServices, setSelectedServices] = useState<Service[]>([])
  const [modules, setModules] = useState(1)
  const [showCommentDialog, setShowCommentDialog] = useState(false)
  const [appointmentComment, setAppointmentComment] = useState("")
  const [showClientDetails, setShowClientDetails] = useState(false)
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [endTime, setEndTime] = useState("")
  const servicesContainerRef = useRef<HTMLDivElement>(null)
  
  const { getTags, getTagById } = useAppointmentTags()

  // Calculate end time based on selected services
  useEffect(() => {
    if (selectedTime && modules > 0) {
      const [hours, minutes] = selectedTime.split(':').map(Number)
      const totalMinutes = hours * 60 + minutes + (modules * 15)
      const endHours = Math.floor(totalMinutes / 60)
      const endMinutes = totalMinutes % 60
      setEndTime(`${String(endHours).padStart(2, '0')}:${String(endMinutes).padStart(2, '0')}`)
    }
  }, [selectedTime, modules])

  // Initialize from appointment if editing
  useEffect(() => {
    if (appointment && isEditing) {
      setSelectedServices(appointment.services || [])
      setModules(appointment.blocks || 1)
      setAppointmentComment(appointment.comment || "")
      setSelectedTags(appointment.tags || [])
    }
  }, [appointment, isEditing])

  if (!initialClient) return null

  // Mock data for services - in real app this would come from API
  const servicesData = {
    servicios: [
      { id: "s1", name: "Consulta General", category: "General", duration: 2 },
      { id: "s2", name: "Limpieza Dental", category: "Dental", duration: 4 },
      { id: "s3", name: "Revisión Anual", category: "General", duration: 2 },
    ],
    bonos: [
      { id: "b1", name: "Bono 5 sesiones", category: "Bonos", duration: 0 },
      { id: "b2", name: "Bono 10 sesiones", category: "Bonos", duration: 0 },
    ],
    paquetes: [
      { id: "p1", name: "Paquete Belleza", category: "Paquetes", duration: 12 },
      { id: "p2", name: "Paquete Relajación", category: "Paquetes", duration: 10 },
    ],
    productos: [
      { id: "pr1", name: "Crema Facial", category: "Productos", duration: 0 },
      { id: "pr2", name: "Serum", category: "Productos", duration: 0 },
    ]
  }

  const currentServices = servicesData[activeTab as keyof typeof servicesData] || []
  
  const filteredServices = searchQuery 
    ? currentServices.filter(s => 
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        s.category.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : currentServices

  const servicesByCategory = filteredServices.reduce((acc, service) => {
    if (!acc[service.category]) {
      acc[service.category] = []
    }
    acc[service.category].push(service)
    return acc
  }, {} as Record<string, Service[]>)

  const handleServiceClick = (service: Service) => {
    if (!selectedServices.some((s) => s.id === service.id)) {
      setSelectedServices((prev) => [...prev, service])
      setModules((prev) => prev + (service.duration || 0))
      
      setTimeout(() => {
        if (servicesContainerRef.current) {
          servicesContainerRef.current.scrollTop = servicesContainerRef.current.scrollHeight
        }
      }, 50)
    }
  }

  const handleRemoveService = (serviceId: string) => {
    const serviceToRemove = selectedServices.find((s) => s.id === serviceId)
    setSelectedServices((prev) => prev.filter((s) => s.id !== serviceId))
    if (serviceToRemove) {
      setModules((prev) => Math.max(1, prev - (serviceToRemove.duration || 0)))
    }
  }

  const handleSaveComment = (comment: string) => {
    setAppointmentComment(comment)
    setShowCommentDialog(false)
  }

  const handleDelete = () => {
    if (onDeleteAppointment) {
      onDeleteAppointment()
      onClose()
    } else if (onDelete) {
      onDelete()
      onClose()
    }
  }

  const handleSave = () => {
    if (onValidateAppointment) {
      onValidateAppointment()
      onClose()
    } else if (onSave) {
      const clientToSave = {
        ...initialClient,
        name: initialClient.name || `${initialClient.firstName} ${initialClient.lastName}`
      }
      onSave({
        client: clientToSave,
        services: selectedServices,
        time: selectedTime || "",
        comment: appointmentComment,
        blocks: modules,
        tags: selectedTags
      })
      onClose()
    }
  }

  const handleTagSelect = (tagId: string) => {
    setSelectedTags((prev) => 
      prev.includes(tagId) 
        ? prev.filter(id => id !== tagId) 
        : [...prev, tagId]
    )
  }

  const handleNoShow = () => {
    if (onMarkAsNoShow) {
      onMarkAsNoShow()
      onClose()
    }
  }

  const handleMove = () => {
    if (onMoveAppointment) {
      onMoveAppointment()
      onClose()
    }
  }

  const clientName = initialClient.name || `${initialClient.firstName} ${initialClient.lastName}`

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <UIDialogContent className="p-0 overflow-hidden max-w-3xl">
        <div className="flex flex-col h-full overflow-hidden">
          {/* Header con info del cliente */}
          <div className="p-3 border-b">
            <div className="flex justify-between items-start">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 group cursor-pointer">
                  <h2 className="text-lg font-normal text-purple-600">{clientName}</h2>
                  <ExternalLink 
                    className="h-4 w-4 text-purple-600 opacity-0 group-hover:opacity-100 transition-opacity" 
                    onClick={() => setShowClientDetails(!showClientDetails)}
                  />
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <span className="text-xs">Teléfono {initialClient.phone}</span>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-purple-600">
                      <Phone className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-purple-600">
                      <MessageCircle className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-purple-600">
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <Clock className="h-3.5 w-3.5 text-green-500" />
                  <span>{selectedTime}</span>
                  {endTime && <span>- {endTime}</span>}
                  <Heart className="h-3.5 w-3.5 text-purple-600" />
                  
                  {/* Etiquetas seleccionadas como pequeños círculos */}
                  {selectedTags.length > 0 && (
                    <div className="flex items-center gap-1 ml-1">
                      {selectedTags.map(tagId => {
                        const tag = getTagById(tagId)
                        if (!tag) return null
                        
                        return (
                          <div 
                            key={tag.id}
                            className="group relative"
                          >
                            <div 
                              className="w-4 h-4 rounded-full flex items-center justify-center cursor-pointer border border-white shadow-sm"
                              style={{ backgroundColor: tag.color }}
                              onClick={() => handleTagSelect(tag.id)}
                              title={tag.name}
                            >
                              <X 
                                className="h-2.5 w-2.5 text-white opacity-0 group-hover:opacity-100 transition-opacity" 
                              />
                            </div>
                            <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs rounded px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                              {tag.name}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-7 w-7 text-purple-600"
                  onClick={onSearchClick}
                  title="Cambiar cliente"
                >
                  <Users className="h-4 w-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-7 w-7 text-purple-600"
                  onClick={onNewClientClick}
                  title="Nuevo cliente"
                >
                  <UserPlus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Body con dos columnas */}
          <div className="flex flex-1 min-h-0">
            {/* Panel Izquierdo - Servicios seleccionados y acciones */}
            <div className="w-[260px] border-r flex flex-col shrink-0">
              {/* Fecha y hora */}
              <div className="p-3 border-b bg-gray-50">
                <div className="flex items-center gap-2">
                  <MapPin className="h-3.5 w-3.5 text-purple-600" />
                  <span className="text-xs text-gray-700">
                    {date ? format(date, 'dd/MM/yyyy') : 'Sin fecha'} - {selectedTime}
                  </span>
                </div>
              </div>

              {/* Contenedor scrollable para servicios seleccionados */}
              <div 
                ref={servicesContainerRef}
                className="p-2.5 flex-1 overflow-y-auto bg-[#F8F9FA] min-h-[300px]"
                style={{ scrollbarWidth: 'thin' }}
              >
                {selectedServices.length === 0 ? (
                  <div className="text-center text-gray-400 py-6">
                    <p className="text-sm">No hay servicios seleccionados</p>
                    <p className="text-xs">Selecciona servicios de la lista</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {selectedServices.map((service) => (
                      <div 
                        key={service.id} 
                        className="p-2 flex items-center justify-between"
                      >
                        <div className="flex items-center gap-1.5 max-w-[190px]">
                          <div className="w-1.5 h-1.5 rounded-full bg-purple-600 shrink-0" />
                          <span className="text-xs text-gray-700 truncate">{service.name}</span>
                          <span className="text-xs text-gray-500 ml-1 shrink-0">({service.duration * 15}m)</span>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5 shrink-0"
                          onClick={() => handleRemoveService(service.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5 text-red-600" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Botones de acción */}
              <div className="p-2.5 space-y-2 border-t bg-[#F8F9FA]">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button 
                      variant="outline" 
                      className="w-full justify-start font-light text-xs bg-white hover:bg-gray-50 text-gray-700 border shadow-sm h-8"
                    >
                      <Tag className="h-3.5 w-3.5 mr-1.5 text-purple-500" />
                      Etiquetas
                      {selectedTags.length > 0 && (
                        <span className="ml-1.5 text-xs text-gray-600">
                          ({selectedTags.length})
                        </span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent 
                    className="p-0 w-[240px] shadow-md border" 
                    align="start" 
                    sideOffset={5}
                  >
                    <div className="max-h-[220px] overflow-y-auto">
                      {getTags().length === 0 ? (
                        <div className="py-4 text-center text-gray-500">
                          <p className="text-sm">No hay etiquetas disponibles</p>
                          <p className="text-xs mt-1">Crea etiquetas en Configuración &gt; Catálogos &gt; Etiquetas</p>
                        </div>
                      ) : (
                        <div className="grid gap-0.5">
                          {getTags().map((tag) => (
                            <div
                              key={tag.id}
                              className="flex items-center justify-between px-3 py-2 cursor-pointer transition-colors"
                              style={{
                                backgroundColor: tag.color,
                                color: "#FFFFFF",
                              }}
                              onClick={() => handleTagSelect(tag.id)}
                            >
                              <span className="font-medium text-sm">{tag.name}</span>
                              {selectedTags.includes(tag.id) && <Check className="h-4 w-4" />}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </PopoverContent>
                </Popover>
                
                <div className="px-2.5 pt-1.5 pb-2.5 flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    className="justify-start font-light text-xs bg-[#E9ECEF] hover:bg-gray-200 border-0 shadow-none h-8 disabled:opacity-50 disabled:cursor-not-allowed"
                    onClick={handleDelete}
                    disabled={!isEditing || selectedServices.length === 0}
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-1.5 text-red-500" />
                    Eliminar
                  </Button>
                  
                  <Button
                    variant="outline"
                    className="justify-start font-light text-xs bg-[#E9ECEF] hover:bg-gray-200 border-0 shadow-none h-8 disabled:opacity-50 disabled:cursor-not-allowed"
                    onClick={handleMove}
                    disabled={!isEditing || selectedServices.length === 0}
                  >
                    <Move className="h-3.5 w-3.5 mr-1.5 text-blue-500" />
                    Mover
                  </Button>
                  
                  <Button
                    variant="outline"
                    className="justify-start font-light text-xs bg-[#E9ECEF] hover:bg-gray-200 border-0 shadow-none h-8 disabled:opacity-50 disabled:cursor-not-allowed"
                    onClick={() => setShowCommentDialog(true)}
                    disabled={selectedServices.length === 0}
                  >
                    <MessageSquare className="h-3.5 w-3.5 mr-1.5 text-gray-500" />
                    Comentarios
                  </Button>
                  
                  <Button
                    variant="outline"
                    className="justify-start font-light text-xs bg-[#E9ECEF] hover:bg-gray-200 border-0 shadow-none h-8 disabled:opacity-50 disabled:cursor-not-allowed"
                    onClick={handleNoShow}
                    disabled={!isEditing || selectedServices.length === 0}
                  >
                    <XCircle className="h-3.5 w-3.5 mr-1.5 text-orange-500" />
                    No asistido
                  </Button>
                  
                  <Button
                    variant="outline"
                    className="justify-start font-light text-xs bg-[#28A745] hover:bg-[#218838] text-white border-0 shadow-sm h-8 disabled:opacity-50 disabled:cursor-not-allowed w-full mt-2"
                    onClick={handleSave}
                    disabled={selectedServices.length === 0}
                  >
                    <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                    Validar cita
                  </Button>
                </div>
              </div>

            {/* Panel Derecho - Selección de servicios */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
                <TabsList className="w-full justify-start h-auto px-3 py-1.5 bg-transparent border-b rounded-none">
                  <TabsTrigger
                    value="servicios"
                    className="rounded-none px-3 py-1 text-xs font-normal border-b-2 border-transparent
                              data-[state=active]:border-purple-600 
                              data-[state=active]:text-purple-600 hover:text-purple-600 
                              data-[state=active]:font-medium data-[state=active]:bg-transparent"
                  >
                    SERVICIOS
                  </TabsTrigger>
                  <TabsTrigger
                    value="bonos"
                    className="rounded-none px-3 py-1 text-xs font-normal border-b-2 border-transparent
                              data-[state=active]:border-purple-600 
                              data-[state=active]:text-purple-600 hover:text-purple-600 
                              data-[state=active]:font-medium data-[state=active]:bg-transparent"
                  >
                    BONOS
                  </TabsTrigger>
                  <TabsTrigger
                    value="paquetes"
                    className="rounded-none px-3 py-1 text-xs font-normal border-b-2 border-transparent
                              data-[state=active]:border-purple-600 
                              data-[state=active]:text-purple-600 hover:text-purple-600 
                              data-[state=active]:font-medium data-[state=active]:bg-transparent"
                  >
                    PAQUETES
                  </TabsTrigger>
                  <TabsTrigger
                    value="productos"
                    className="rounded-none px-3 py-1 text-xs font-normal border-b-2 border-transparent
                              data-[state=active]:border-purple-600 
                              data-[state=active]:text-purple-600 hover:text-purple-600 
                              data-[state=active]:font-medium data-[state=active]:bg-transparent"
                  >
                    PRODUCTOS
                  </TabsTrigger>
                </TabsList>
                
                {/* Contenedor con scroll para los servicios de la pestaña - altura fija */}
                <div className="flex-1 overflow-y-auto min-h-[300px]">
                  {['servicios', 'bonos', 'paquetes', 'productos'].map((tab) => (
                    <TabsContent key={tab} value={tab} className="p-3 m-0 h-full">
                      {Object.entries(servicesByCategory).map(([category, services]) => (
                        <div key={category} className="mb-4">
                          <h3 className="text-xs font-medium text-gray-700 mb-1.5">{category}</h3>
                          <div className="space-y-1.5">
                            {services.map((service) => (
                              <div
                                key={service.id}
                                className="px-2 py-1.5 cursor-pointer transition-colors rounded hover:bg-gray-50"
                                onClick={() => handleServiceClick(service)}
                              >
                                <div className="flex items-center justify-between">
                                  <span className="font-medium text-xs">{service.name}</span>
                                  <span className="text-xs text-gray-500">{service.duration * 15} min</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </TabsContent>
                  ))}
                </div>
                
                {/* Buscador */}
                <div className="px-3 py-2 border-t">
                  <Input 
                    placeholder="Buscar servicio..." 
                    className="bg-gray-50 h-8 text-xs" 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                
                {/* Controles inferiores */}
                <div className="px-3 py-3 border-t bg-white">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <label className="text-xs text-gray-500">Módulos:</label>
                      <div className="flex items-center">
                        <button
                          onClick={() => setModules((prev) => Math.max(1, prev - 1))}
                          className="w-6 h-6 flex items-center justify-center"
                          disabled={modules <= 1}
                        >
                          <ChevronLeft className="h-3.5 w-3.5 text-green-500" />
                        </button>
                        <div className="h-6 w-[30px] flex items-center justify-center">
                          <span className="text-center text-xs">{modules}</span>
                        </div>
                        <button
                          onClick={() => setModules((prev) => prev + 1)}
                          className="w-6 h-6 flex items-center justify-center"
                        >
                          <ChevronRight className="h-3.5 w-3.5 text-green-500" />
                        </button>
                      </div>
                    </div>
                    
                    <div className="flex-1 max-w-[160px]">
                      <Select defaultValue="any">
                        <SelectTrigger className="bg-gray-50 h-7 text-xs">
                          <SelectValue placeholder="Profesional" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="any" className="text-xs">(Cualquiera)</SelectItem>
                          <SelectItem value="houda" className="text-xs">Houda</SelectItem>
                          <SelectItem value="imane" className="text-xs">Imane</SelectItem>
                          <SelectItem value="sofia" className="text-xs">Sofia</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="h-7 text-xs px-3 min-w-[80px]" onClick={onClose}>
                        Cancelar
                      </Button>
                      <Button 
                        size="sm" 
                        className="h-7 text-xs px-3 min-w-[80px] bg-[#2F0E5D] hover:bg-[#260b4a] text-white font-normal" 
                        onClick={handleSave}
                        disabled={selectedServices.length === 0}
                      >
                        Guardar
                      </Button>
                    </div>
                  </div>
                </div>
              </Tabs>
            </div>
          </div>
          </div>
        </div>
      </UIDialogContent>

      {/* Diálogo de comentarios */}
      <CommentDialog
        isOpen={showCommentDialog}
        onClose={() => setShowCommentDialog(false)}
        onSave={handleSaveComment}
        initialComment={appointmentComment}
      />
      
      {/* Diálogo con detalles del cliente */}
      {showClientDetails && initialClient && (
        <Dialog open={showClientDetails} onOpenChange={setShowClientDetails}>
          <UIDialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Detalles del Cliente</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label className="text-xs text-gray-500">Nombre completo</Label>
                <p className="text-sm">{clientName}</p>
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-gray-500">Teléfono</Label>
                <p className="text-sm">{initialClient.phone}</p>
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-gray-500">Email</Label>
                <p className="text-sm">{initialClient.email || 'No especificado'}</p>
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-gray-500">Dirección</Label>
                <p className="text-sm">{initialClient.address || 'No especificada'}</p>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={() => setShowClientDetails(false)}>Cerrar</Button>
            </DialogFooter>
          </UIDialogContent>
        </Dialog>
      )}
    </Dialog>
  )
}
