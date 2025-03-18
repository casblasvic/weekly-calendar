"use client"

import type React from "react"

import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
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
} from "lucide-react"
import { useState, forwardRef } from "react"
import { cn } from "@/lib/utils"
import { useLastClient } from "@/contexts/last-client-context"
import { CommentDialog } from "./comment-dialog"
import { Input } from "@/components/ui/input"
import * as DialogPrimitive from "@radix-ui/react-dialog"

const DialogPrimitiveContent = DialogPrimitive.Content

const DialogContent = forwardRef<
  React.ElementRef<typeof DialogPrimitiveContent>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitiveContent>
>(({ className, children, ...props }, ref) => (
  <DialogPrimitiveContent
    ref={ref}
    className={cn(
      "fixed z-50 bg-background shadow-lg duration-200",
      "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      "left-[50%] top-[50%] translate-x-[-50%] translate-y-[-50%]",
      "w-[90vw] max-h-[85vh] rounded-lg border",
      "md:w-full",
      className,
    )}
    aria-describedby="dialog-description"
    {...props}
  >
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
  client?: {
    name: string
    phone: string
  } | null
  selectedTime?: string
  onSearchClick: () => void
  onNewClientClick: () => void
  onDelete?: () => void
  onSave?: (appointment: {
    client: { name: string; phone: string }
    services: Service[]
    time: string
    comment?: string
    blocks: number
  }) => void
}

interface Service {
  id: string
  name: string
  category: string
  duration?: number
}

export function AppointmentDialog({
  isOpen,
  onClose,
  client,
  selectedTime,
  onSearchClick,
  onNewClientClick,
  onDelete,
  onSave,
}: AppointmentDialogProps) {
  const [activeTab, setActiveTab] = useState("sin-parametros")
  const [selectedServices, setSelectedServices] = useState<Service[]>([])
  const [modules, setModules] = useState(0)
  const [showCommentDialog, setShowCommentDialog] = useState(false)
  const [appointmentComment, setAppointmentComment] = useState("")
  const { lastClient } = useLastClient()
  const [blocks, setBlocks] = useState(1)

  if (!client) return null

  const services = {
    "Sin parámetros": [
      { id: "s1", name: "Consulta General", category: "General", duration: 1 },
      { id: "s2", name: "Limpieza Dental", category: "Dental", duration: 2 },
      { id: "s3", name: "Revisión Anual", category: "General", duration: 1 },
      { id: "s4", name: "Vacunación", category: "Prevención", duration: 1 },
    ],
    "Con parámetros": [
      { id: "p1", name: "Tratamiento Facial", category: "Estética", duration: 3 },
      { id: "p2", name: "Masaje Terapéutico", category: "Terapia", duration: 2 },
      { id: "p3", name: "Depilación Láser", category: "Estética", duration: 2 },
      { id: "p4", name: "Manicura", category: "Belleza", duration: 1 },
    ],
  }

  const handleServiceClick = (service: Service) => {
    if (!selectedServices.some((s) => s.id === service.id)) {
      setSelectedServices((prev) => [...prev, service])
      setBlocks((prev) => prev + (service.duration || 1))
    }
  }

  const handleRemoveService = (serviceId: string) => {
    const serviceToRemove = selectedServices.find((s) => s.id === serviceId)
    setSelectedServices((prev) => prev.filter((s) => s.id !== serviceId))
    if (serviceToRemove) {
      setBlocks((prev) => Math.max(1, prev - (serviceToRemove.duration || 1)))
    }
  }

  const handleSaveComment = (comment: string) => {
    setAppointmentComment(comment)
  }

  const handleDelete = () => {
    if (onDelete) {
      onDelete()
      onClose()
    }
  }

  const handleSave = () => {
    if (onSave) {
      onSave({
        client,
        services: selectedServices,
        time: selectedTime || "",
        comment: appointmentComment,
        blocks: blocks,
      })
      onClose()
    }
  }

  const actionButtons = [
    { icon: Tag, label: "Etiquetas", onClick: () => {} },
    { icon: Trash2, label: "Eliminar", onClick: handleDelete },
    { icon: Move, label: "Mover", onClick: () => {} },
    { icon: MessageSquare, label: "Comentarios", onClick: () => setShowCommentDialog(true) },
    { icon: XCircle, label: "No asistida", onClick: () => {} },
    { icon: CheckCircle2, label: "Validar Cita", onClick: () => {} },
  ]

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[90vw] md:max-w-[800px] h-[85vh] p-0">
        <DialogHeader>
          <DialogTitle>Información de la cita</DialogTitle>
        </DialogHeader>
        <span id="dialog-description" className="sr-only">
          Diálogo para gestionar citas de pacientes, seleccionar servicios y configurar detalles de la cita
        </span>
        <div className="flex flex-col h-full">
          <div className="p-4 border-b">
            <div className="flex justify-between items-start">
              <div className="space-y-2">
                <div className="flex items-center gap-2 group cursor-pointer">
                  <h2 className="text-xl font-medium text-purple-600">{client.name}</h2>
                  <ExternalLink className="h-4 w-4 text-purple-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <span className="text-sm">Teléfono {client.phone}</span>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-purple-600">
                      <Phone className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-purple-600">
                      <MessageCircle className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-purple-600">
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Clock className="h-4 w-4" />
                  <span>{selectedTime}</span>
                  <Heart className="h-4 w-4 text-purple-600" />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" className="text-purple-600">
                  <Users className="h-5 w-5" />
                </Button>
                <Button variant="ghost" size="icon" className="text-purple-600">
                  <UserPlus className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </div>

          <div className="flex flex-1 min-h-0">
            {/* Left Panel - Redesigned to be more compact */}
            <div className="w-[250px] bg-gray-50 border-r flex flex-col">
              <div className="p-3 flex-1 overflow-y-auto">
                {selectedServices.map((service) => (
                  <div key={service.id} className="rounded p-2 flex items-center justify-between group">
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-purple-600" />
                      <span className="text-sm text-gray-700">{service.name}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 opacity-0 group-hover:opacity-100"
                      onClick={() => handleRemoveService(service.id)}
                    >
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </Button>
                  </div>
                ))}
              </div>

              {/* Action Buttons - Reorganized as a compact grid */}
              <div className="p-3 border-t bg-gray-50">
                <div className="grid grid-cols-3 gap-2">
                  {actionButtons.map((button, index) => (
                    <Button
                      key={button.label}
                      variant="ghost"
                      size="sm"
                      className={cn(
                        "h-auto py-2 flex flex-col items-center gap-1 text-gray-600 hover:bg-gray-200",
                        index === actionButtons.length - 1 && "col-span-3 mt-2 bg-gray-100",
                      )}
                      onClick={button.onClick}
                    >
                      <button.icon className="h-4 w-4" />
                      <span className="text-xs">{button.label}</span>
                    </Button>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Panel */}
            <div className="flex-1 flex flex-col min-w-0">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="w-full justify-start h-auto px-4 py-2 bg-transparent border-b">
                  {["SIN PARÁMETROS", "CON PARÁMETROS", "PAQUETES"].map((tab) => (
                    <TabsTrigger
                      key={tab}
                      value={tab.toLowerCase().replace(" ", "-")}
                      className={cn(
                        "rounded-none px-4 py-1.5 font-normal",
                        "data-[state=active]:border-b-2 data-[state=active]:border-purple-600",
                        "data-[state=active]:text-purple-600",
                      )}
                    >
                      {tab}
                    </TabsTrigger>
                  ))}
                </TabsList>
                <div className="flex-1 overflow-y-auto p-3">
                  <TabsContent value="sin-parametros" className="m-0">
                    <div className="grid gap-2">
                      {services["Sin parámetros"].map((service) => (
                        <div
                          key={service.id}
                          className="p-2.5 rounded-lg cursor-pointer hover:bg-purple-50"
                          onClick={() => handleServiceClick(service)}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-medium">{service.name}</span>
                            <span className="text-sm text-gray-500">{service.duration} min</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </TabsContent>
                </div>
              </Tabs>

              {/* Bottom Controls - More compact */}
              <div className="p-3 border-t bg-white">
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <Input placeholder="Buscar servicio..." className="bg-gray-50 h-9" />
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setBlocks((prev) => Math.max(1, prev - 1))}
                      className="h-9 w-9 text-green-400 border-green-400 hover:bg-green-50"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="w-8 text-center">{blocks}</span>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setBlocks((prev) => prev + 1)}
                      className="h-9 w-9 text-green-400 border-green-400 hover:bg-green-50"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="w-[180px]">
                    <Select defaultValue="any">
                      <SelectTrigger className="bg-gray-50 h-9">
                        <SelectValue placeholder="(Cualquiera)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="any">(Cualquiera)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={onClose}>
                      Cancelar
                    </Button>
                    <Button size="sm" className="bg-purple-600 hover:bg-purple-700" onClick={handleSave}>
                      Guardar
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>

      <CommentDialog
        isOpen={showCommentDialog}
        onClose={() => setShowCommentDialog(false)}
        onSave={handleSaveComment}
        initialComment={appointmentComment}
      />
    </Dialog>
  )
}

