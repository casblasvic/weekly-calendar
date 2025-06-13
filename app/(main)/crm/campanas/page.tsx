"use client"

import { useState } from "react"
import { 
  Mail, MessageCircle, Globe, Instagram, Facebook, Linkedin,
  Send, Users, BarChart3, Calendar, Play, Pause, CheckCircle,
  Clock, TrendingUp, Eye, MousePointer, DollarSign, Target,
  Plus, Filter, MoreVertical, Copy, Trash2, Edit, Search
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { CampaignCreateModal } from "@/components/crm/campaign-create-modal"
import { CampaignContextMenu } from "@/components/crm/campaign-context-menu"

// Tipos de campaña
const campaignTypes = [
  { id: "email", label: "Email", icon: Mail, color: "bg-blue-500" },
  { id: "sms", label: "SMS", icon: MessageCircle, color: "bg-green-500" },
  { id: "social", label: "Redes Sociales", icon: Instagram, color: "bg-purple-500" },
  { id: "web", label: "Web Push", icon: Globe, color: "bg-orange-500" },
  { id: "multi", label: "Multicanal", icon: Users, color: "bg-yellow-500" },
]

// Campañas de ejemplo
const campaigns = [
  {
    id: 1,
    name: "Promoción Rejuvenecimiento Facial",
    type: "email",
    status: "active",
    audience: 2500,
    sent: 1850,
    opened: 1200,
    clicked: 450,
    converted: 85,
    revenue: 12500,
    startDate: "2024-01-10",
    endDate: "2024-02-10",
    tags: ["Estética", "Promoción", "VIP"],
  },
  {
    id: 2,
    name: "Recordatorio Chequeo Anual",
    type: "sms",
    status: "scheduled",
    audience: 1200,
    sent: 0,
    opened: 0,
    clicked: 0,
    converted: 0,
    revenue: 0,
    startDate: "2024-02-01",
    endDate: "2024-02-15",
    tags: ["Salud", "Recordatorio"],
    scheduledDate: "2024-02-01T09:00:00",
  },
  {
    id: 3,
    name: "Lanzamiento Nuevo Servicio Wellness",
    type: "social",
    status: "draft",
    audience: 5000,
    sent: 0,
    opened: 0,
    clicked: 0,
    converted: 0,
    revenue: 0,
    startDate: "2024-02-15",
    endDate: "2024-03-15",
    tags: ["Wellness", "Lanzamiento"],
  },
  {
    id: 4,
    name: "Black Friday - Ofertas Especiales",
    type: "email",
    status: "completed",
    audience: 8000,
    sent: 7850,
    opened: 5200,
    clicked: 2100,
    converted: 420,
    revenue: 85000,
    startDate: "2023-11-20",
    endDate: "2023-11-30",
    tags: ["Promoción", "Black Friday"],
  },
  {
    id: 5,
    name: "Newsletter Mensual - Consejos de Salud",
    type: "email",
    status: "active",
    audience: 3500,
    sent: 2100,
    opened: 1680,
    clicked: 520,
    converted: 95,
    revenue: 4500,
    startDate: "2024-01-15",
    endDate: "2024-02-15",
    tags: ["Newsletter", "Educativo"],
  },
  {
    id: 6,
    name: "Campaña San Valentín",
    type: "multi",
    status: "scheduled",
    audience: 4200,
    sent: 0,
    opened: 0,
    clicked: 0,
    converted: 0,
    revenue: 0,
    startDate: "2024-02-10",
    endDate: "2024-02-20",
    tags: ["San Valentín", "Parejas"],
    scheduledDate: "2024-02-10T10:00:00",
  },
]

export default function CampanasPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedType, setSelectedType] = useState("all")
  const [selectedStatus, setSelectedStatus] = useState("all")
  const [showNewCampaignDialog, setShowNewCampaignDialog] = useState(false)
  const [activeTab, setActiveTab] = useState("all")

  // Filtrar campañas por pestaña activa
  const getFilteredCampaigns = () => {
    let filtered = campaigns

    // Filtrar por pestaña de estado
    if (activeTab !== "all") {
      filtered = filtered.filter(campaign => campaign.status === activeTab)
    }

    // Filtros adicionales
    if (selectedType !== "all") {
      filtered = filtered.filter(campaign => campaign.type === selectedType)
    }

    if (searchTerm) {
      filtered = filtered.filter(campaign => 
        campaign.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        campaign.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    }

    return filtered
  }

  const filteredCampaigns = getFilteredCampaigns()

  // Contar campañas por estado
  const campaignCounts = {
    all: campaigns.length,
    active: campaigns.filter(c => c.status === "active").length,
    scheduled: campaigns.filter(c => c.status === "scheduled").length,
    draft: campaigns.filter(c => c.status === "draft").length,
    completed: campaigns.filter(c => c.status === "completed").length,
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-green-100 text-green-700">Activa</Badge>
      case "scheduled":
        return <Badge className="bg-blue-100 text-blue-700">Programada</Badge>
      case "draft":
        return <Badge className="bg-gray-100 text-gray-700">Borrador</Badge>
      case "completed":
        return <Badge className="bg-purple-100 text-purple-700">Completada</Badge>
      default:
        return <Badge>{status}</Badge>
    }
  }

  const getTypeIcon = (type: string) => {
    const campaignType = campaignTypes.find(t => t.id === type)
    const Icon = campaignType?.icon || Mail
    return <Icon className="h-4 w-4" />
  }

  // Métricas totales
  const totalCampaigns = campaigns.length
  const activeCampaigns = campaigns.filter(c => c.status === "active").length
  const totalRevenue = campaigns.reduce((sum, c) => sum + c.revenue, 0)
  const totalAudience = campaigns.reduce((sum, c) => sum + c.audience, 0)

  return (
    <div className="flex flex-col h-full pb-20 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Campañas</h1>
          <p className="text-gray-600 mt-1">Crea y gestiona campañas de marketing multicanal</p>
        </div>
        
        <Dialog open={showNewCampaignDialog} onOpenChange={setShowNewCampaignDialog}>
          <DialogTrigger asChild>
            <Button className="bg-purple-600 hover:bg-purple-700">
              <Plus className="mr-2 h-4 w-4" />
              Nueva Campaña
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Crear Nueva Campaña</DialogTitle>
              <DialogDescription>
                Configure los detalles de su nueva campaña de marketing
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={(e) => {
              e.preventDefault()
              // Aquí iría la lógica para crear la campaña
              setShowNewCampaignDialog(false)
            }}>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Nombre de la campaña</Label>
                  <Input
                    id="name"
                    placeholder="Ej: Promoción de Verano 2024"
                    required
                  />
                </div>

                <div className="grid gap-2">
                  <Label>Tipo de campaña</Label>
                  <RadioGroup defaultValue="email">
                    <div className="grid grid-cols-2 gap-4">
                      {campaignTypes.map(type => (
                        <div key={type.id} className="flex items-center space-x-2">
                          <RadioGroupItem value={type.id} id={type.id} />
                          <Label htmlFor={type.id} className="flex items-center gap-2 cursor-pointer">
                            <type.icon className="h-4 w-4" />
                            {type.label}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </RadioGroup>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="audience">Audiencia objetivo</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccione la audiencia" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos los contactos</SelectItem>
                      <SelectItem value="vip">Clientes VIP</SelectItem>
                      <SelectItem value="new">Nuevos clientes (últimos 30 días)</SelectItem>
                      <SelectItem value="inactive">Clientes inactivos</SelectItem>
                      <SelectItem value="birthday">Cumpleaños este mes</SelectItem>
                      <SelectItem value="custom">Audiencia personalizada...</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="startDate">Fecha de inicio</Label>
                    <Input
                      id="startDate"
                      type="date"
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="endDate">Fecha de fin</Label>
                    <Input
                      id="endDate"
                      type="date"
                      required
                    />
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="objective">Objetivo de la campaña</Label>
                  <Textarea
                    id="objective"
                    placeholder="Describe el objetivo principal de esta campaña..."
                    rows={3}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setShowNewCampaignDialog(false)}>
                  Cancelar
                </Button>
                <Button type="submit" className="bg-purple-600 hover:bg-purple-700">
                  Crear Campaña
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* KPIs Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-gray-600">Campañas Activas</CardTitle>
              <Play className="h-4 w-4 text-green-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeCampaigns}</div>
            <p className="text-xs text-gray-500 mt-1">de {totalCampaigns} totales</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-gray-600">Alcance Total</CardTitle>
              <Users className="h-4 w-4 text-blue-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalAudience.toLocaleString()}</div>
            <p className="text-xs text-gray-500 mt-1">contactos únicos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-gray-600">Tasa de Apertura</CardTitle>
              <Eye className="h-4 w-4 text-purple-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">64.8%</div>
            <div className="flex items-center gap-1 mt-1">
              <TrendingUp className="h-3 w-3 text-green-500" />
              <span className="text-xs text-green-600">+5.2% vs mes anterior</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-gray-600">Ingresos Generados</CardTitle>
              <DollarSign className="h-4 w-4 text-green-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {totalRevenue.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
            </div>
            <p className="text-xs text-gray-500 mt-1">este mes</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs de campañas */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="flex items-center justify-between mb-6">
          <TabsList>
            <TabsTrigger value="all">
              Todas
              <Badge variant="secondary" className="ml-2">{campaignCounts.all}</Badge>
            </TabsTrigger>
            <TabsTrigger value="active">
              Activas
              <Badge variant="secondary" className="ml-2 bg-green-100 text-green-700">
                {campaignCounts.active}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="scheduled">
              Programadas
              <Badge variant="secondary" className="ml-2 bg-blue-100 text-blue-700">
                {campaignCounts.scheduled}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="draft">
              Borradores
              <Badge variant="secondary" className="ml-2 bg-gray-100 text-gray-700">
                {campaignCounts.draft}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="completed">
              Completadas
              <Badge variant="secondary" className="ml-2 bg-purple-100 text-purple-700">
                {campaignCounts.completed}
              </Badge>
            </TabsTrigger>
          </TabsList>
          
          <div className="flex gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar campañas..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 w-64"
              />
            </div>
            
            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Tipo de campaña" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los tipos</SelectItem>
                {campaignTypes.map(type => (
                  <SelectItem key={type.id} value={type.id}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Button variant="outline" size="icon">
              <Filter className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Contenido de cada pestaña */}
        {["all", "active", "scheduled", "draft", "completed"].map((tabValue) => (
          <TabsContent key={tabValue} value={tabValue} className="space-y-4 mt-6">
            {filteredCampaigns.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <div className="text-gray-400 mb-4">
                    {tabValue === "active" && <Play className="h-12 w-12 mx-auto mb-4" />}
                    {tabValue === "scheduled" && <Calendar className="h-12 w-12 mx-auto mb-4" />}
                    {tabValue === "draft" && <Edit className="h-12 w-12 mx-auto mb-4" />}
                    {tabValue === "completed" && <CheckCircle className="h-12 w-12 mx-auto mb-4" />}
                    {tabValue === "all" && <Mail className="h-12 w-12 mx-auto mb-4" />}
                  </div>
                  <h3 className="text-lg font-semibold mb-2">
                    No hay campañas {
                      tabValue === "active" ? "activas" :
                      tabValue === "scheduled" ? "programadas" :
                      tabValue === "draft" ? "en borrador" :
                      tabValue === "completed" ? "completadas" :
                      ""
                    }
                  </h3>
                  <p className="text-gray-500 mb-4">
                    {tabValue === "active" && "Las campañas activas aparecerán aquí"}
                    {tabValue === "scheduled" && "Las campañas programadas aparecerán aquí"}
                    {tabValue === "draft" && "Los borradores de campañas aparecerán aquí"}
                    {tabValue === "completed" && "Las campañas finalizadas aparecerán aquí"}
                    {tabValue === "all" && "Crea tu primera campaña para comenzar"}
                  </p>
                  {tabValue === "draft" && (
                    <Button onClick={() => setShowNewCampaignDialog(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Crear Campaña
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              filteredCampaigns.map((campaign) => (
                <Card key={campaign.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <div className={`p-2 rounded-lg ${campaignTypes.find(t => t.id === campaign.type)?.color} text-white`}>
                            {getTypeIcon(campaign.type)}
                          </div>
                          <div className="flex-1">
                            <h3 className="text-lg font-semibold">{campaign.name}</h3>
                            <p className="text-sm text-gray-500">
                              {new Date(campaign.startDate).toLocaleDateString('es-ES')} - {new Date(campaign.endDate).toLocaleDateString('es-ES')}
                              {campaign.status === "scheduled" && campaign.scheduledDate && (
                                <span className="ml-2 text-blue-600">
                                  • Programada para: {new Date(campaign.scheduledDate).toLocaleString('es-ES')}
                                </span>
                              )}
                            </p>
                          </div>
                          {getStatusBadge(campaign.status)}
                        </div>

                        <div className="grid grid-cols-5 gap-6 mb-4">
                          <div>
                            <p className="text-sm text-gray-500">Audiencia</p>
                            <p className="text-lg font-semibold">{campaign.audience.toLocaleString()}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Enviados</p>
                            <p className="text-lg font-semibold">
                              {campaign.sent.toLocaleString()}
                              {campaign.sent > 0 && (
                                <span className="text-xs text-gray-500 ml-1">
                                  ({Math.round((campaign.sent / campaign.audience) * 100)}%)
                                </span>
                              )}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Abiertos</p>
                            <p className="text-lg font-semibold">
                              {campaign.opened.toLocaleString()}
                              {campaign.opened > 0 && (
                                <span className="text-xs text-gray-500 ml-1">
                                  ({Math.round((campaign.opened / campaign.sent) * 100)}%)
                                </span>
                              )}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Clics</p>
                            <p className="text-lg font-semibold">
                              {campaign.clicked.toLocaleString()}
                              {campaign.clicked > 0 && (
                                <span className="text-xs text-gray-500 ml-1">
                                  ({Math.round((campaign.clicked / campaign.opened) * 100)}%)
                                </span>
                              )}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Ingresos</p>
                            <p className="text-lg font-semibold">
                              {campaign.revenue.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {campaign.tags.map((tag) => (
                            <Badge key={tag} variant="secondary" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      <CampaignContextMenu 
                        campaign={campaign}
                        onEdit={() => console.log("Editar", campaign.id)}
                        onDuplicate={() => console.log("Duplicar", campaign.id)}
                        onViewStats={() => console.log("Ver estadísticas", campaign.id)}
                        onViewAudience={() => console.log("Ver audiencia", campaign.id)}
                        onSchedule={() => console.log("Programar", campaign.id)}
                        onSendTest={() => console.log("Enviar prueba", campaign.id)}
                        onActivate={() => console.log("Activar", campaign.id)}
                        onPause={() => console.log("Pausar", campaign.id)}
                        onArchive={() => console.log("Archivar", campaign.id)}
                        onDelete={() => console.log("Eliminar", campaign.id)}
                      />
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        ))}
      </Tabs>

    </div>
  )
}
