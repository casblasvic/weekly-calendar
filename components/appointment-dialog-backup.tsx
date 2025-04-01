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
} from "lucide-react"
import { useState, forwardRef, useEffect, useRef } from "react"
import { cn } from "@/lib/utils"
import { useLastClient } from "@/contexts/last-client-context"
import { CommentDialog } from "./comment-dialog"
import { Input } from "@/components/ui/input"
import { useAppointmentTags } from "@/contexts/appointment-tags-context"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

const DialogPrimitiveContent = DialogPrimitive.Content

const DialogContent = forwardRef<
  React.ElementRef<typeof DialogPrimitiveContent>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitiveContent>
>(({ className, children, ...props }, ref) => (
  <DialogPrimitiveContent
    ref={ref}
    className={cn(
      "fixed z-50 bg-white shadow-lg duration-200",
      "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      "left-[50%] top-[50%] translate-x-[-50%] translate-y-[-50%]",
      "w-[90vw] max-h-[80vh] rounded-lg border",
      "md:w-full md:max-w-[750px]",
      className,
    )}
    aria-describedby="dialog-description"
    {...props}
  >
    <DialogPrimitive.Title className="sr-only">
      Información de la cita
    </DialogPrimitive.Title>
    {children}
    <span id="dialog-description" className="sr-only">
      Diálogo para gestionar citas
    </span>
    <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
      <X className="h-4 w-4" />
      <span className="sr-only">Close</span>
    </DialogPrimitive.Close>
  </DialogPrimitiveContent>
))
DialogContent.displayName = DialogPrimitiveContent.displayName

interface AppointmentDialogProps {
  isOpen: boolean
  onClose: () => void
  date?: Date
  selectedTime: string
  onCreateAppointment?: (appointment: any) => void
  onDeleteAppointment?: () => void
  onMoveAppointment?: () => void
  onValidateAppointment?: () => void
  onMarkAsNoShow?: () => void
  servicesFilter?: string[]
  client?: any
  appointment?: any
  onSearchClick?: () => void
  onNewClientClick?: () => void
  onDelete?: () => void
  onSave?: (appointment: {
    client: { name: string; phone: string }
    services: Service[]
    time: string
    comment?: string
    blocks: number
    tags?: string[]
  }) => void
  isEditing?: boolean
}

interface Service {
  id: string
  name: string
  category: string
  duration?: number
}

// Componente para mostrar detalles del cliente
function ClientDetailsPanel({ client }: { client: { name: string; phone: string } }) {
  return (
    <div className="p-4 bg-white border rounded-lg shadow-sm">
      <h3 className="font-medium text-lg mb-2">Información del cliente</h3>
      <div className="space-y-2">
        <div>
          <span className="text-sm text-gray-500 block">Nombre</span>
          <span>{client.name}</span>
        </div>
        <div>
          <span className="text-sm text-gray-500 block">Teléfono</span>
          <span>{client.phone}</span>
        </div>
      </div>
    </div>
  )
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
  const [activeTab, setActiveTab] = useState("sin-parametros")
  const [selectedServices, setSelectedServices] = useState<Service[]>([])
  const [modules, setModules] = useState(1)
  const [showCommentDialog, setShowCommentDialog] = useState(false)
  const [appointmentComment, setAppointmentComment] = useState("")
  const [showClientDetails, setShowClientDetails] = useState(false)
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [endTime, setEndTime] = useState("")
  const { lastClient } = useLastClient()
  const { getTags, getTagById } = useAppointmentTags() || { getTags: () => [], getTagById: () => undefined }
  
  const servicesContainerRef = useRef<HTMLDivElement>(null)

  // Calcular la hora de finalización de la cita
  useEffect(() => {
    if (selectedTime) {
      // Solo mostrar hora final si hay servicios seleccionados
      if (selectedServices.length === 0) {
        setEndTime("");
        return;
      }
      
      const [hours, minutes] = selectedTime.split(":").map(Number);
      
      // Calcular minutos totales sumando solo la duración de los servicios
      // Cada unidad de duración equivale a 15 minutos
      const totalMinutes = selectedServices.reduce((sum, service) => sum + ((service.duration || 1) * 15), 0);
      
      // Calcular la hora final sumando los minutos totales
      const endTimeMinutes = minutes + totalMinutes;
      const addHours = Math.floor(endTimeMinutes / 60);
      const finalMinutes = endTimeMinutes % 60;
      const finalHours = (hours + addHours) % 24;
      
      const formattedEndHours = finalHours.toString().padStart(2, "0");
      const formattedEndMinutes = finalMinutes.toString().padStart(2, "0");
      
      setEndTime(`${formattedEndHours}:${formattedEndMinutes}`);
    }
  }, [selectedTime, selectedServices]);

  // Cargar datos de la cita existente si estamos en modo de edición
  useEffect(() => {
    if (appointment && isEditing) {
      // Cargar etiquetas de la cita existente
      if (appointment.tags && Array.isArray(appointment.tags)) {
        setSelectedTags(appointment.tags);
      }
      
      // Aquí también se podrían cargar otros datos del appointment si fuera necesario
      // como comentarios, servicios, etc.
      if (appointment.comment) {
        setAppointmentComment(appointment.comment);
      }
    }
  }, [appointment, isEditing]);

  if (!initialClient) return null

  // Datos de servicios organizados por categorías
  const servicesData = {
    "Sin parámetros": [
      { id: "s1", name: "Consulta General", category: "General", duration: 2 },
      { id: "s2", name: "Limpieza Dental", category: "Dental", duration: 4 },
      { id: "s3", name: "Revisión Anual", category: "General", duration: 2 },
      { id: "s4", name: "Vacunación", category: "Prevención", duration: 1 },
    ],
    "Con parámetros": [
      { id: "p1", name: "Tratamiento Facial", category: "Estética", duration: 6 },
      { id: "p2", name: "Masaje Terapéutico", category: "Terapia", duration: 8 },
      { id: "p3", name: "Depilación Láser", category: "Estética", duration: 4 },
      { id: "p4", name: "Manicura", category: "Belleza", duration: 2 },
    ],
    "Paquetes": [
      { id: "pack1", name: "Paquete Belleza Completo", category: "Paquetes", duration: 12 },
      { id: "pack2", name: "Paquete Relajación", category: "Paquetes", duration: 10 },
    ]
  }

  // Organizar servicios por categoría para la pestaña activa
  const currentServices = servicesData[activeTab === "sin-parametros" ? "Sin parámetros" : 
                                      activeTab === "con-parametros" ? "Con parámetros" : "Paquetes"];
  
  // Filtrar por búsqueda si hay un término
  const filteredServices = searchQuery 
    ? currentServices.filter(s => 
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        s.category.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : currentServices;

  // Agrupar servicios por categoría
  const servicesByCategory = filteredServices.reduce((acc, service) => {
    if (!acc[service.category]) {
      acc[service.category] = [];
    }
    acc[service.category].push(service);
    return acc;
  }, {} as Record<string, Service[]>);

  const handleServiceClick = (service: Service) => {
    if (!selectedServices.some((s) => s.id === service.id)) {
      setSelectedServices((prev) => [...prev, service]);
      // Actualizar los módulos basados en la duración del servicio
      setModules((prev) => prev + (service.duration || 1));
      
      // Auto-scroll al final del contenedor de servicios seleccionados
      setTimeout(() => {
        if (servicesContainerRef.current) {
          servicesContainerRef.current.scrollTop = servicesContainerRef.current.scrollHeight;
        }
      }, 50);
    }
  }

  const handleRemoveService = (serviceId: string) => {
    const serviceToRemove = selectedServices.find((s) => s.id === serviceId);
    setSelectedServices((prev) => prev.filter((s) => s.id !== serviceId));
    if (serviceToRemove) {
      setModules((prev) => Math.max(1, prev - (serviceToRemove.duration || 1)));
    }
  }

  const handleSaveComment = (comment: string) => {
    setAppointmentComment(comment);
    setShowCommentDialog(false);
  }

  const handleDelete = () => {
    if (onDeleteAppointment) {
      onDeleteAppointment();
      onClose();
    } else if (onDelete) {
      onDelete();
      onClose();
    }
  }

  const handleSave = () => {
    if (onValidateAppointment) {
      onValidateAppointment();
      onClose();
    } else if (onSave) {
      onSave({
        client: initialClient,
        services: selectedServices,
        time: selectedTime || "",
        comment: appointmentComment,
        blocks: modules,
        tags: selectedTags
      });
      onClose();
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
      onMarkAsNoShow();
      onClose();
    }
  }

  const handleMove = () => {
    if (onMoveAppointment) {
      onMoveAppointment();
      onClose();
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="p-0 overflow-hidden max-w-3xl">
        <div className="flex flex-col h-full overflow-hidden">
          {/* Cabecera con info del cliente */}
          <div className="p-3 border-b">
            <div className="flex justify-between items-start">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 group cursor-pointer">
                  <h2 className="text-lg font-normal text-purple-600">{initialClient.name}</h2>
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
                        const tag = getTagById(tagId);
                        if (!tag) return null;
                        
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
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="h-7 w-7 text-purple-600">
                  <Users className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-purple-600">
                  <UserPlus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          <div className="flex flex-1 min-h-0">
            {/* Panel Izquierdo - Servicios seleccionados y acciones */}
            <div className="w-[260px] border-r flex flex-col shrink-0">
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
                
                <div className="px-2.5 pt-1.5 pb-2.5 flex flex-wrap gap-2 justify-end">
                  <Button
                    variant="outline"
                    className="justify-start font-light text-xs bg-[#E9ECEF] hover:bg-gray-200 border-0 shadow-none h-8 disabled:opacity-50 disabled:cursor-not-allowed"
                    onClick={handleDelete}
                    disabled={!isEditing}
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-1.5 text-red-500" />
                    Eliminar
                  </Button>
                  
                  <Button
                    variant="outline"
                    className="justify-start font-light text-xs bg-[#E9ECEF] hover:bg-gray-200 border-0 shadow-none h-8 disabled:opacity-50 disabled:cursor-not-allowed"
                    onClick={handleNoShow}
                    disabled={!isEditing}
                  >
                    <XCircle className="h-3.5 w-3.5 mr-1.5 text-orange-500" />
                    No asistido
                  </Button>
                  
                  <Button
                    variant="outline"
                    className="justify-start font-light text-xs bg-[#E9ECEF] hover:bg-gray-200 border-0 shadow-none h-8 disabled:opacity-50 disabled:cursor-not-allowed"
                    onClick={handleMove}
                    disabled={!isEditing}
                  >
                    <Move className="h-3.5 w-3.5 mr-1.5 text-blue-500" />
                    Mover
                  </Button>
                  
                  <Button
                    variant="outline"
                    className="justify-start font-light text-xs bg-[#E9ECEF] hover:bg-gray-200 border-0 shadow-none h-8 disabled:opacity-50 disabled:cursor-not-allowed"
                    onClick={handleSave}
                    disabled={!isEditing}
                  >
                    <CheckCircle2 className="h-3.5 w-3.5 mr-1.5 text-green-500" />
                    Validar cita
                  </Button>
                </div>
              </div>
            </div>

            {/* Panel Derecho - Selección de servicios */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
                <TabsList className="w-full justify-start h-auto px-3 py-1.5 bg-transparent border-b rounded-none">
                  <TabsTrigger
                    value="con-parametros"
                    className="rounded-none px-3 py-1 text-xs font-normal border-b-2 border-transparent
                              data-[state=active]:border-purple-600 
                              data-[state=active]:text-purple-600 hover:text-purple-600 
                              data-[state=active]:font-medium data-[state=active]:bg-transparent"
                  >
                    CON PARÁMETROS
                  </TabsTrigger>
                  <TabsTrigger
                    value="sin-parametros"
                    className="rounded-none px-3 py-1 text-xs font-normal border-b-2 border-transparent
                              data-[state=active]:border-purple-600 
                              data-[state=active]:text-purple-600 hover:text-purple-600 
                              data-[state=active]:font-medium data-[state=active]:bg-transparent"
                  >
                    SIN PARÁMETROS
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
                </TabsList>
                
                {/* Contenedor con scroll para los servicios de la pestaña - altura fija */}
                <div className="flex-1 overflow-y-auto min-h-[300px]">
                  <TabsContent value="sin-parametros" className="p-3 m-0 h-full">
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
                  
                  <TabsContent value="con-parametros" className="p-3 m-0 h-full">
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
                  
                  <TabsContent value="paquetes" className="p-3 m-0 h-full">
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
                </div>
                
                {/* Buscador movido al final */}
                <div className="px-3 py-2 border-t">
                  <Input 
                    placeholder="Buscar servicio..." 
                    className="bg-gray-50 h-8 text-xs" 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </Tabs>

              {/* Controles inferiores */}
              <div className="px-3 py-3 border-t bg-white">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-gray-500">Módulos:</label>
                    <div className="flex items-center">
                      <button
                        onClick={() => setModules((prev) => Math.max(0, prev - 1))}
                        className="w-6 h-6 flex items-center justify-center"
                      >
                        <svg width="10" height="10" viewBox="0 0 10 10" xmlns="http://www.w3.org/2000/svg">
                          <path d="M5 1L9 5L5 9" fill="#16A34A" transform="rotate(180 5 5)"/>
                        </svg>
                      </button>
                      <div className="h-6 w-[30px] flex items-center justify-center">
                        <span className="text-center text-xs">{modules}</span>
                      </div>
                      <button
                        onClick={() => setModules((prev) => prev + 1)}
                        className="w-6 h-6 flex items-center justify-center"
                      >
                        <svg width="10" height="10" viewBox="0 0 10 10" xmlns="http://www.w3.org/2000/svg">
                          <path d="M5 1L9 5L5 9" fill="#16A34A"/>
                        </svg>
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
                    <Button size="sm" className="h-7 text-xs px-3 min-w-[80px] bg-[#2F0E5D] hover:bg-[#260b4a] text-white font-normal" onClick={handleSave}>
                      Guardar
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>

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
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Detalles del Cliente</DialogTitle>
            </DialogHeader>
            <ClientDetailsPanel client={initialClient} />
            <DialogFooter>
              <Button onClick={() => setShowClientDetails(false)}>Cerrar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </Dialog>
  )
}

