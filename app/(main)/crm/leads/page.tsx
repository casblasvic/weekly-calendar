'use client'

import React, { useState, useCallback } from 'react'
import { 
  Plus, Filter, Search, MoreVertical, ChevronDown, Grid3X3, List, 
  Mail, Phone, Calendar, Tag, Building2, User, TrendingUp, 
  DollarSign, Clock, Star, MessageSquare, Edit2, Trash2, 
  FolderPlus, Settings, Users, Target, ChevronRight, Eye 
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator 
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { LeadDetailModal } from "@/components/crm/lead-detail-modal"
import { LeadCreateModal } from "@/components/crm/lead-create-modal"
import { PipelineCreateModal } from "@/components/crm/pipeline-create-modal"

// Estados del pipeline por defecto
const defaultPipelineStages = [
  { id: 'new', name: 'Nuevos', color: 'bg-blue-100 text-blue-700', count: 0 },
  { id: 'contacted', name: 'Contactados', color: 'bg-purple-100 text-purple-700', count: 0 },
  { id: 'qualified', name: 'Calificados', color: 'bg-yellow-100 text-yellow-700', count: 0 },
  { id: 'proposal', name: 'Propuesta', color: 'bg-orange-100 text-orange-700', count: 0 },
  { id: 'negotiation', name: 'Negociación', color: 'bg-pink-100 text-pink-700', count: 0 },
  { id: 'won', name: 'Ganados', color: 'bg-green-100 text-green-700', count: 0 },
  { id: 'lost', name: 'Perdidos', color: 'bg-red-100 text-red-700', count: 0 }
]

// Datos de ejemplo para leads
const mockLeads = [
  {
    id: '1',
    name: 'María García',
    email: 'maria.garcia@email.com',
    phone: '+34 612 345 678',
    company: 'Tech Solutions SL',
    stage: 'new',
    value: 15000,
    probability: 20,
    owner: 'Ana Martínez',
    source: 'Web',
    lastActivity: '2024-01-18',
    tags: ['Cirugía estética', 'VIP'],
    score: 85
  },
  {
    id: '2',
    name: 'Carlos Rodríguez',
    email: 'carlos.r@empresa.com',
    phone: '+34 623 456 789',
    company: 'Innovate Corp',
    stage: 'contacted',
    value: 8500,
    probability: 40,
    owner: 'Pedro López',
    source: 'Referencia',
    lastActivity: '2024-01-17',
    tags: ['Tratamiento facial'],
    score: 72
  },
  {
    id: '3',
    name: 'Laura Fernández',
    email: 'lfernandez@gmail.com',
    phone: '+34 634 567 890',
    company: '',
    stage: 'qualified',
    value: 3200,
    probability: 60,
    owner: 'Ana Martínez',
    source: 'Instagram',
    lastActivity: '2024-01-16',
    tags: ['Botox', 'Primera visita'],
    score: 68
  }
]

interface Lead {
  id: string
  name: string
  email: string
  phone: string
  company: string
  stage: string
  value: number
  probability: number
  owner: string
  source: string
  lastActivity: string
  tags: string[]
  score: number
}

export default function LeadsPage() {
  const [viewMode, setViewMode] = useState<'table' | 'kanban'>('table')
  const [leads, setLeads] = useState(mockLeads)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedStage, setSelectedStage] = useState('all')
  const [selectedOwner, setSelectedOwner] = useState('all')
  const [showFilters, setShowFilters] = useState(false)
  const [draggedLead, setDraggedLead] = useState<string | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
  const [showPipelineModal, setShowPipelineModal] = useState(false)

  // Handlers para drag & drop
  const handleDragStart = (e: React.DragEvent, leadId: string) => {
    setDraggedLead(leadId)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleDrop = (e: React.DragEvent, stageId: string) => {
    e.preventDefault()
    if (draggedLead) {
      setLeads(prevLeads => 
        prevLeads.map(lead => 
          lead.id === draggedLead ? { ...lead, stage: stageId } : lead
        )
      )
      setDraggedLead(null)
    }
  }

  // Filtrado de leads
  const filteredLeads = leads.filter(lead => {
    const matchesSearch = lead.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         lead.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         lead.company.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStage = selectedStage === 'all' || lead.stage === selectedStage
    const matchesOwner = selectedOwner === 'all' || lead.owner === selectedOwner
    
    return matchesSearch && matchesStage && matchesOwner
  })

  // Cálculo de leads por etapa
  const stagesWithCounts = defaultPipelineStages.map(stage => ({
    ...stage,
    count: filteredLeads.filter(lead => lead.stage === stage.id).length
  }))

  const totalValue = filteredLeads.reduce((sum, lead) => sum + lead.value, 0)

  const handleViewLead = (lead: Lead) => {
    setSelectedLead(lead)
    setShowDetailModal(true)
  }

  return (
    <div className="flex flex-col h-full pb-20">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Leads</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {filteredLeads.length} leads activos · Valor total: €{totalValue.toLocaleString('es-ES')}
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2"
            >
              <Filter className="h-4 w-4" />
              Filtros
              {(selectedStage !== 'all' || selectedOwner !== 'all') && (
                <Badge variant="secondary" className="ml-1">
                  {[selectedStage !== 'all', selectedOwner !== 'all'].filter(Boolean).length}
                </Badge>
              )}
            </Button>
            
            <div className="flex items-center border rounded-lg p-1">
              <Button
                variant={viewMode === 'table' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('table')}
                className="px-3"
              >
                <List className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'kanban' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('kanban')}
                className="px-3"
              >
                <Grid3X3 className="h-4 w-4" />
              </Button>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Settings className="h-4 w-4 mr-2" />
                  Pipelines
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem>
                  <FolderPlus className="h-4 w-4 mr-2" />
                  Crear nuevo pipeline
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Edit2 className="h-4 w-4 mr-2" />
                  Editar pipeline actual
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem>Pipeline Ventas General</DropdownMenuItem>
                <DropdownMenuItem>Pipeline Cirugía Estética</DropdownMenuItem>
                <DropdownMenuItem>Pipeline Tratamientos Faciales</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button onClick={() => setShowCreateModal(true)} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Nuevo Lead
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowPipelineModal(true)}>
              <FolderPlus className="h-4 w-4 mr-2" />
              Crear Pipeline
            </Button>
          </div>
        </div>

        {/* Barra de búsqueda y filtros */}
        <div className="flex items-center gap-4">
          <div className="flex-1 max-w-md relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Buscar por nombre, email o empresa..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {showFilters && (
            <>
              <Select value={selectedStage} onValueChange={setSelectedStage}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Todas las etapas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las etapas</SelectItem>
                  {defaultPipelineStages.map(stage => (
                    <SelectItem key={stage.id} value={stage.id}>
                      {stage.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedOwner} onValueChange={setSelectedOwner}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Todos los propietarios" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los propietarios</SelectItem>
                  <SelectItem value="Ana Martínez">Ana Martínez</SelectItem>
                  <SelectItem value="Pedro López">Pedro López</SelectItem>
                </SelectContent>
              </Select>
            </>
          )}
        </div>
      </div>

      {/* Contenido principal */}
      <div className="flex-1 overflow-auto p-6 pb-20">
        {viewMode === 'table' ? (
          /* Vista tabla */
          <Card>
            <CardContent className="p-0">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-gray-50 dark:bg-gray-800">
                    <th className="text-left p-4 font-medium text-sm text-gray-700 dark:text-gray-300">
                      <input type="checkbox" className="rounded" />
                    </th>
                    <th className="text-left p-4 font-medium text-sm text-gray-700 dark:text-gray-300">Lead</th>
                    <th className="text-left p-4 font-medium text-sm text-gray-700 dark:text-gray-300">Empresa</th>
                    <th className="text-left p-4 font-medium text-sm text-gray-700 dark:text-gray-300">Etapa</th>
                    <th className="text-left p-4 font-medium text-sm text-gray-700 dark:text-gray-300">Valor</th>
                    <th className="text-left p-4 font-medium text-sm text-gray-700 dark:text-gray-300">Propietario</th>
                    <th className="text-left p-4 font-medium text-sm text-gray-700 dark:text-gray-300">Score</th>
                    <th className="text-left p-4 font-medium text-sm text-gray-700 dark:text-gray-300">Última actividad</th>
                    <th className="p-4"></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLeads.map((lead) => {
                    const stage = defaultPipelineStages.find(s => s.id === lead.stage)
                    return (
                      <tr key={lead.id} className="border-b hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer">
                        <td className="p-4">
                          <input type="checkbox" className="rounded" />
                        </td>
                        <td className="p-4">
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">{lead.name}</p>
                            <div className="flex items-center gap-3 text-sm text-gray-500 mt-1">
                              <span className="flex items-center gap-1">
                                <Mail className="h-3 w-3" />
                                {lead.email}
                              </span>
                              <span className="flex items-center gap-1">
                                <Phone className="h-3 w-3" />
                                {lead.phone}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-gray-400" />
                            <span className="text-sm">{lead.company || '-'}</span>
                          </div>
                        </td>
                        <td className="p-4">
                          <Badge className={stage?.color}>
                            {stage?.name}
                          </Badge>
                        </td>
                        <td className="p-4">
                          <div>
                            <p className="font-medium">€{lead.value.toLocaleString('es-ES')}</p>
                            <p className="text-xs text-gray-500">{lead.probability}% prob.</p>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                              <User className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                            </div>
                            <span className="text-sm">{lead.owner}</span>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <div className={`h-16 w-1 rounded ${
                              lead.score >= 80 ? 'bg-green-500' : 
                              lead.score >= 60 ? 'bg-yellow-500' : 
                              'bg-red-500'
                            }`} />
                            <span className="text-sm font-medium">{lead.score}</span>
                          </div>
                        </td>
                        <td className="p-4 text-sm text-gray-500">
                          {new Date(lead.lastActivity).toLocaleDateString('es-ES')}
                        </td>
                        <td className="p-4">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleViewLead(lead)}>
                                <Eye className="h-4 w-4 mr-2" />
                                Ver detalles
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <MessageSquare className="h-4 w-4 mr-2" />
                                Añadir nota
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Calendar className="h-4 w-4 mr-2" />
                                Programar actividad
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-red-600">
                                <Trash2 className="h-4 w-4 mr-2" />
                                Eliminar
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </CardContent>
          </Card>
        ) : (
          /* Vista Kanban */
          <div className="flex gap-4 h-full overflow-x-auto pb-20">
            {stagesWithCounts.map((stage) => (
              <div
                key={stage.id}
                className="flex-shrink-0 w-80"
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, stage.id)}
              >
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 h-full">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-gray-900 dark:text-white">
                        {stage.name}
                      </h3>
                      <Badge variant="secondary" className="rounded-full">
                        {stage.count}
                      </Badge>
                    </div>
                    <Button variant="ghost" size="sm">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="space-y-3">
                    {filteredLeads
                      .filter(lead => lead.stage === stage.id)
                      .map((lead) => (
                        <Card
                          key={lead.id}
                          className="cursor-move hover:shadow-md transition-shadow"
                          draggable
                          onDragStart={(e) => handleDragStart(e, lead.id)}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between mb-2">
                              <div>
                                <h4 className="font-medium text-gray-900 dark:text-white">
                                  {lead.name}
                                </h4>
                                {lead.company && (
                                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                    {lead.company}
                                  </p>
                                )}
                              </div>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => handleViewLead(lead)}>
                                    <Eye className="h-4 w-4 mr-2" />
                                    Ver detalles
                                  </DropdownMenuItem>
                                  <DropdownMenuItem>
                                    <MessageSquare className="h-4 w-4 mr-2" />
                                    Añadir nota
                                  </DropdownMenuItem>
                                  <DropdownMenuItem>
                                    <Calendar className="h-4 w-4 mr-2" />
                                    Programar actividad
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem className="text-red-600">
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Eliminar
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>

                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-medium text-gray-900 dark:text-white">
                                  €{lead.value.toLocaleString('es-ES')}
                                </span>
                                <div className="flex items-center gap-1">
                                  <TrendingUp className="h-3 w-3 text-gray-400" />
                                  <span className="text-xs text-gray-500">
                                    {lead.probability}%
                                  </span>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 text-xs text-gray-500">
                                <User className="h-3 w-3" />
                                <span>{lead.owner}</span>
                              </div>

                              {lead.tags.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-2">
                                  {lead.tags.map((tag, index) => (
                                    <Badge 
                                      key={index} 
                                      variant="secondary" 
                                      className="text-xs px-2 py-0"
                                    >
                                      {tag}
                                    </Badge>
                                  ))}
                                </div>
                              )}

                              <div className="flex items-center justify-between mt-3 pt-3 border-t">
                                <div className="flex items-center gap-1 text-xs text-gray-500">
                                  <Clock className="h-3 w-3" />
                                  <span>
                                    {new Date(lead.lastActivity).toLocaleDateString('es-ES')}
                                  </span>
                                </div>
                                <div className={`flex items-center gap-1 text-xs font-medium ${
                                  lead.score >= 80 ? 'text-green-600' : 
                                  lead.score >= 60 ? 'text-yellow-600' : 
                                  'text-red-600'
                                }`}>
                                  <Star className="h-3 w-3" />
                                  <span>{lead.score}</span>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modales */}
      <LeadCreateModal
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
      />
      
      <LeadDetailModal
        lead={selectedLead}
        open={showDetailModal}
        onOpenChange={setShowDetailModal}
      />

      <PipelineCreateModal
        open={showPipelineModal}
        onOpenChange={setShowPipelineModal}
      />
    </div>
  )
}
