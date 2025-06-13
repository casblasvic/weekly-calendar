"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { CalendarDateRangePicker } from "@/components/ui/date-range-picker"
import {
  User, Mail, Phone, Building2, Calendar, Clock,
  MessageSquare, Activity, History, DollarSign,
  Plus, Trash2, Edit, Send, X
} from "lucide-react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface LeadDetailModalProps {
  lead: any
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function LeadDetailModal({ lead, open, onOpenChange }: LeadDetailModalProps) {
  const [activeTab, setActiveTab] = useState("info")
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showNoteDialog, setShowNoteDialog] = useState(false)
  const [showActivityDialog, setShowActivityDialog] = useState(false)
  const [newNote, setNewNote] = useState("")
  const [newActivity, setNewActivity] = useState({
    type: "call",
    subject: "",
    description: "",
    date: "",
    time: "",
  })

  // Datos simulados
  const notes = [
    {
      id: 1,
      author: "María García",
      date: "2024-01-20 10:30",
      content: "Cliente interesado en el tratamiento facial premium. Prefiere horarios de tarde.",
    },
    {
      id: 2,
      author: "Carlos López",
      date: "2024-01-19 15:45",
      content: "Llamada inicial realizada. Enviado catálogo de servicios por email.",
    },
  ]

  const activities = [
    {
      id: 1,
      type: "call",
      subject: "Llamada de seguimiento",
      date: "2024-01-25",
      time: "11:00",
      status: "scheduled",
      assignedTo: "María García",
    },
    {
      id: 2,
      type: "meeting",
      subject: "Visita a la clínica",
      date: "2024-01-28",
      time: "16:00",
      status: "scheduled",
      assignedTo: "Ana Martínez",
    },
  ]

  const timeline = [
    {
      id: 1,
      type: "created",
      description: "Lead creado",
      date: "2024-01-18 09:00",
      user: "Sistema",
    },
    {
      id: 2,
      type: "status",
      description: "Estado cambiado de Nuevo a Contactado",
      date: "2024-01-19 15:50",
      user: "Carlos López",
    },
    {
      id: 3,
      type: "note",
      description: "Nota añadida",
      date: "2024-01-20 10:30",
      user: "María García",
    },
  ]

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[85vh]">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-2xl">
                  {lead?.name || "Detalle del Lead"}
                </DialogTitle>
                <DialogDescription>
                  ID: {lead?.id} • Creado el {new Date().toLocaleDateString("es-ES")}
                </DialogDescription>
              </div>
              <div className="flex gap-2">
                <Badge
                  variant={lead?.status === "new" ? "secondary" : "default"}
                  className="capitalize"
                >
                  {lead?.status || "nuevo"}
                </Badge>
                <Badge variant="outline" className="capitalize">
                  {lead?.assignedTo || "Sin asignar"}
                </Badge>
              </div>
            </div>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="info">Información</TabsTrigger>
              <TabsTrigger value="notes">Notas</TabsTrigger>
              <TabsTrigger value="activities">Actividades</TabsTrigger>
              <TabsTrigger value="timeline">Historial</TabsTrigger>
            </TabsList>

            <ScrollArea className="h-[500px] mt-4">
              <TabsContent value="info" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Información de Contacto</CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        <User className="h-4 w-4 text-gray-500" />
                        <span className="font-medium">Nombre:</span>
                        <span>{lead?.name}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Mail className="h-4 w-4 text-gray-500" />
                        <span className="font-medium">Email:</span>
                        <span>{lead?.email}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="h-4 w-4 text-gray-500" />
                        <span className="font-medium">Teléfono:</span>
                        <span>{lead?.phone}</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        <Building2 className="h-4 w-4 text-gray-500" />
                        <span className="font-medium">Empresa:</span>
                        <span>{lead?.company || "No especificada"}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <DollarSign className="h-4 w-4 text-gray-500" />
                        <span className="font-medium">Valor estimado:</span>
                        <span>${lead?.value?.toLocaleString() || "0"}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Detalles del Lead</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label>Fuente</Label>
                      <p className="text-sm text-gray-600">{lead?.source || "Web"}</p>
                    </div>
                    <div>
                      <Label>Etapa del Pipeline</Label>
                      <p className="text-sm text-gray-600">{lead?.pipeline || "Nuevo"}</p>
                    </div>
                    <div>
                      <Label>Propietario</Label>
                      <p className="text-sm text-gray-600">{lead?.assignedTo || "Sin asignar"}</p>
                    </div>
                    <div>
                      <Label>Notas iniciales</Label>
                      <p className="text-sm text-gray-600">
                        Interesado en tratamientos faciales y consulta dermatológica
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="notes" className="space-y-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold">Notas del Lead</h3>
                  <Button onClick={() => setShowNoteDialog(true)} size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Añadir Nota
                  </Button>
                </div>

                <div className="space-y-3">
                  {notes.map((note) => (
                    <Card key={note.id}>
                      <CardContent className="pt-4">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <p className="font-medium text-sm">{note.author}</p>
                            <p className="text-xs text-gray-500">{note.date}</p>
                          </div>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="sm">
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button variant="ghost" size="sm">
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                        <p className="text-sm">{note.content}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="activities" className="space-y-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold">Actividades Programadas</h3>
                  <Button onClick={() => setShowActivityDialog(true)} size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Programar Actividad
                  </Button>
                </div>

                <div className="space-y-3">
                  {activities.map((activity) => (
                    <Card key={activity.id}>
                      <CardContent className="pt-4">
                        <div className="flex justify-between items-start">
                          <div className="flex gap-3">
                            <div className="p-2 bg-blue-100 rounded-full">
                              {activity.type === "call" ? (
                                <Phone className="h-4 w-4 text-blue-600" />
                              ) : (
                                <Calendar className="h-4 w-4 text-blue-600" />
                              )}
                            </div>
                            <div>
                              <p className="font-medium">{activity.subject}</p>
                              <p className="text-sm text-gray-600">
                                {activity.date} a las {activity.time}
                              </p>
                              <p className="text-sm text-gray-500">
                                Asignado a: {activity.assignedTo}
                              </p>
                            </div>
                          </div>
                          <Badge variant="outline">{activity.status}</Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="timeline" className="space-y-4">
                <h3 className="text-lg font-semibold mb-4">Historial de Actividad</h3>
                
                <div className="space-y-3">
                  {timeline.map((event) => (
                    <div key={event.id} className="flex gap-3">
                      <div className="relative">
                        <div className="h-8 w-8 bg-gray-100 rounded-full flex items-center justify-center">
                          <History className="h-4 w-4 text-gray-600" />
                        </div>
                        {event.id !== timeline.length && (
                          <div className="absolute top-8 left-4 w-0.5 h-full bg-gray-200" />
                        )}
                      </div>
                      <div className="flex-1 pb-8">
                        <p className="font-medium text-sm">{event.description}</p>
                        <p className="text-xs text-gray-500">
                          {event.date} • {event.user}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </TabsContent>
            </ScrollArea>
          </Tabs>

          <DialogFooter className="flex justify-between">
            <Button
              variant="destructive"
              onClick={() => setShowDeleteConfirm(true)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Eliminar Lead
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cerrar
              </Button>
              <Button>
                <Edit className="h-4 w-4 mr-2" />
                Editar Lead
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de confirmación de eliminación */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará permanentemente el lead "{lead?.name}" y toda su información asociada.
              Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => {
                setShowDeleteConfirm(false)
                onOpenChange(false)
                // Aquí iría la lógica de eliminación
              }}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Modal para añadir nota */}
      <Dialog open={showNoteDialog} onOpenChange={setShowNoteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Añadir Nota</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              placeholder="Escribe tu nota aquí..."
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNoteDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={() => {
              setShowNoteDialog(false)
              setNewNote("")
            }}>
              <Send className="h-4 w-4 mr-2" />
              Guardar Nota
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal para programar actividad */}
      <Dialog open={showActivityDialog} onOpenChange={setShowActivityDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Programar Actividad</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Tipo de Actividad</Label>
              <Select
                value={newActivity.type}
                onValueChange={(value) => setNewActivity({ ...newActivity, type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="call">Llamada</SelectItem>
                  <SelectItem value="meeting">Reunión</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="task">Tarea</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Asunto</Label>
              <Input
                value={newActivity.subject}
                onChange={(e) => setNewActivity({ ...newActivity, subject: e.target.value })}
                placeholder="Asunto de la actividad"
              />
            </div>
            <div>
              <Label>Descripción</Label>
              <Textarea
                value={newActivity.description}
                onChange={(e) => setNewActivity({ ...newActivity, description: e.target.value })}
                placeholder="Detalles de la actividad"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Fecha</Label>
                <Input
                  type="date"
                  value={newActivity.date}
                  onChange={(e) => setNewActivity({ ...newActivity, date: e.target.value })}
                />
              </div>
              <div>
                <Label>Hora</Label>
                <Input
                  type="time"
                  value={newActivity.time}
                  onChange={(e) => setNewActivity({ ...newActivity, time: e.target.value })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowActivityDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={() => {
              setShowActivityDialog(false)
              setNewActivity({
                type: "call",
                subject: "",
                description: "",
                date: "",
                time: "",
              })
            }}>
              <Activity className="h-4 w-4 mr-2" />
              Programar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
