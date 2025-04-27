"use client"

import type React from "react"

import { Dialog, DialogContent as UIDialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
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
import { ClientCard } from "./client-card"
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
  name: string;
  phone: string;
}

interface AppointmentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  client: Client | null | undefined; 
  selectedTime?: string;
  onSearchClick: () => void;
  onNewClientClick: () => void;
  onSave: (data: any) => void; 
  onDelete: () => void;
  isEditing: boolean;
  appointmentToEdit?: Appointment | null;
}

export const AppointmentDialog: React.FC<AppointmentDialogProps> = ({ 
    isOpen, 
    onClose, 
    client, 
    selectedTime,
    onSearchClick,
    onNewClientClick,
    onSave,
    onDelete,
    isEditing,
    appointmentToEdit 
}) => {
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

  useEffect(() => {
    if (selectedTime) {
      if (selectedServices.length === 0) {
        setEndTime("");
        return;
      }
      
      const [hours, minutes] = selectedTime.split(":").map(Number);
      
      const totalMinutes = selectedServices.reduce((sum, service) => sum + ((service.duration || 1) * 15), 0);
      
      const endTimeMinutes = minutes + totalMinutes;
      const addHours = Math.floor(endTimeMinutes / 60);
      const finalMinutes = endTimeMinutes % 60;
      const finalHours = (hours + addHours) % 24;
      
      const formattedEndHours = finalHours.toString().padStart(2, "0");
      const formattedEndMinutes = finalMinutes.toString().padStart(2, "0");
      
      setEndTime(`${formattedEndHours}:${formattedEndMinutes}`);
    }
  }, [selectedTime, selectedServices]);

  useEffect(() => {
    if (appointmentToEdit && isEditing) {
      if (appointmentToEdit.tags && Array.isArray(appointmentToEdit.tags)) {
        setSelectedTags(appointmentToEdit.tags);
      }
      
      if (appointmentToEdit.comment) {
        setAppointmentComment(appointmentToEdit.comment);
      }
    }
  }, [appointmentToEdit, isEditing]);

  if (!client) return null

  const servicesData: Record<string, Service[]> = {
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

  const currentServices = servicesData[activeTab === "sin-parametros" ? "Sin parámetros" : 
                                      activeTab === "con-parametros" ? "Con parámetros" : "Paquetes"];
  
  const filteredServices = searchQuery 
    ? currentServices.filter(s => 
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        s.category.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : currentServices;

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
      setModules((prev) => prev + (service.duration || 1));
      
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
    if (onDelete) {
      onDelete();
      onClose();
    }
  }

  const handleSave = () => {
    onSave({
      client: client,
      services: selectedServices,
      time: selectedTime || "",
      comment: appointmentComment,
      blocks: modules,
      tags: selectedTags
    });
    onClose();
  }

  const handleTagSelect = (tagId: string) => {
    setSelectedTags((prev) => 
      prev.includes(tagId) 
        ? prev.filter(id => id !== tagId) 
        : [...prev, tagId]
    )
  }

  const timeSlots = useMemo(() => {
    const slots = [];
    for (let h = 9; h < 20; h++) {
      for (let m = 0; m < 60; m+= 15) {
        slots.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
      }
    }
    return slots;
  }, []);

  const isLoadingServices = false;
  const initialClient = client;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <UIDialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar Cita" : "Nueva Cita"}</DialogTitle>
          <DialogDescription>
            {isEditing ? "Modifica los detalles de la cita existente." : `Creando cita para las ${selectedTime || ""}. Busca o añade un cliente.`}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {initialClient ? (
            <ClientCard client={initialClient} />
          ) : (
            <div className="flex items-center justify-between p-3 border rounded-md bg-gray-50">
              <span className="text-sm text-gray-500">No hay cliente seleccionado</span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={onSearchClick} title="Buscar cliente existente">
                  <Search className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={onNewClientClick} title="Crear nuevo cliente">
                  <UserPlus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="time" className="text-right col-span-1">
              Hora
            </Label>
            <Select value={selectedTime} onValueChange={(value) => {
              setSelectedServices([]);
              setModules(1);
              setEndTime("");
            }} defaultValue={selectedTime}>
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Seleccionar hora" />
              </SelectTrigger>
              <SelectContent>
                {timeSlots.map(slot => (
                  <SelectItem key={slot} value={slot}>{slot}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="mb-2 block">Servicios</Label>
            {isLoadingServices ? (
              <p>Cargando...</p>
            ) : (
              <div className="flex flex-wrap gap-2 p-2 border rounded-md max-h-40 overflow-y-auto">
                {(searchQuery ? filteredServices : currentServices).map((service: Service) => (
                  <Badge 
                    key={service.id}
                    variant={selectedServices.some(s => s.id === service.id) ? "default" : "outline"}
                    onClick={() => handleServiceClick(service)}
                    className="cursor-pointer"
                  >
                    {service.name}
                  </Badge>
                ))}
                {(searchQuery ? filteredServices : currentServices).length === 0 && (
                  <span className="text-xs text-gray-500 p-2">No se encontraron servicios.</span>
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-4 items-start gap-4">
            <Label htmlFor="comment" className="text-right col-span-1 pt-2">
              Comentario
            </Label>
            <Textarea 
              id="comment" 
              value={appointmentComment}
              onChange={(e) => setAppointmentComment(e.target.value)}
              placeholder="Añadir notas internas sobre la cita..."
              className="col-span-3"
              rows={3}
            />
          </div>
        </div>

        <DialogFooter className="flex justify-between w-full">
          <div>
            {isEditing && (
              <Button variant="destructive" onClick={handleDelete} size="sm">
                <Trash2 className="mr-2 h-4 w-4" />
                Eliminar
              </Button>
            )}
          </div>
          <div className="flex space-x-2">
            <Button variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button 
              onClick={handleSave}
              disabled={!client || selectedServices.length === 0}
            >
              {selectedServices.length === 0 ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {selectedServices.length === 0 ? "Guardando..." : (isEditing ? "Actualizar" : "Guardar Cita")}
            </Button>
          </div>
        </DialogFooter>
      </UIDialogContent>

      <CommentDialog
        isOpen={showCommentDialog}
        onClose={() => setShowCommentDialog(false)}
        onSave={handleSaveComment}
        initialComment={appointmentComment}
      />
      
      {showClientDetails && client && (
        <Dialog open={showClientDetails} onOpenChange={setShowClientDetails}>
          <UIDialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Detalles del Cliente</DialogTitle>
            </DialogHeader>
            <ClientCard client={client} />
            <DialogFooter>
              <Button onClick={() => setShowClientDetails(false)}>Cerrar</Button>
            </DialogFooter>
          </UIDialogContent>
        </Dialog>
      )}
    </Dialog>
  )
}

