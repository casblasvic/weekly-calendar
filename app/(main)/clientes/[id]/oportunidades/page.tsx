'use client'

import React, { useState } from 'react'
import { useParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { 
  TrendingUp, DollarSign, Calendar, User, FileText, Target, 
  AlertCircle, Plus, Search, Filter, MoreVertical 
} from 'lucide-react'
import { usePersonClientsQuery } from '@/lib/hooks/use-person-query'
import { OpportunityCreateModal } from "@/components/crm/opportunity-create-modal"

interface Opportunity {
  id: string
  title: string
  value: number
  probability: number
  stage: string
  expectedCloseDate: string
  description?: string
  source?: string
  nextAction?: string
  lastActivity?: string
}

const opportunityStages = [
  { value: 'new', label: 'Nueva', color: 'bg-blue-100 text-blue-700' },
  { value: 'contacted', label: 'Contactado', color: 'bg-purple-100 text-purple-700' },
  { value: 'qualified', label: 'Calificado', color: 'bg-yellow-100 text-yellow-700' },
  { value: 'proposal', label: 'Propuesta', color: 'bg-orange-100 text-orange-700' },
  { value: 'negotiation', label: 'Negociación', color: 'bg-pink-100 text-pink-700' },
  { value: 'won', label: 'Ganada', color: 'bg-green-100 text-green-700' },
  { value: 'lost', label: 'Perdida', color: 'bg-red-100 text-red-700' }
]

export default function OportunidadesPage() {
  const params = useParams()
  const personId = params.id as string
  const { data: persons, isLoading } = usePersonClientsQuery()
  const [showNewOpportunityDialog, setShowNewOpportunityDialog] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedStage, setSelectedStage] = useState('all')
  
  // Encontrar la persona específica
  const person = persons?.find(p => p.id === personId)
  
  // Datos de ejemplo - en producción vendrían de la API
  // Por ahora usaremos datos mockeados ya que PersonForSelector no incluye roles
  const opportunities: Opportunity[] = []

  const getStageColor = (stage: string) => {
    const stageInfo = opportunityStages.find(s => s.value === stage)
    return stageInfo?.color || 'bg-gray-100 text-gray-700'
  }

  const calculateTotalValue = () => {
    return opportunities.reduce((sum, opp) => sum + opp.value, 0)
  }

  const calculateWeightedValue = () => {
    return opportunities.reduce((sum, opp) => sum + (opp.value * opp.probability / 100), 0)
  }

  const getOpportunitiesInStage = (stage: string) => {
    return opportunities.filter(opp => opp.stage === stage).length
  }

  const filteredOpportunities = opportunities.filter(opp => {
    const matchesSearch = opp.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         opp.description?.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStage = selectedStage === 'all' || opp.stage === selectedStage
    return matchesSearch && matchesStage
  })

  const handleCreateOpportunity = (data: any) => {
    // Aquí iría la lógica para crear la oportunidad
    // También se asignaría automáticamente el rol de Lead si no lo tiene
    console.log('Creating opportunity:', data)
    setShowNewOpportunityDialog(false)
  }

  if (isLoading) {
    return <div className="p-8 text-center">Cargando oportunidades...</div>
  }

  return (
    <div className="space-y-6">
      {/* Header con acciones */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Oportunidades</h2>
          <p className="text-gray-600">
            Gestión de oportunidades de venta para {person?.firstName} {person?.lastName}
          </p>
        </div>
        
        <Button onClick={() => setShowNewOpportunityDialog(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nueva Oportunidad
        </Button>
      </div>

      {/* Métricas principales */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Oportunidades</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{opportunities.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Valor Total Estimado</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {calculateTotalValue().toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Valor Ponderado</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {calculateWeightedValue().toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
            </div>
            <p className="text-xs text-gray-500 mt-1">Según probabilidad</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">En Negociación</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{getOpportunitiesInStage('negotiation')}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <div className="flex gap-4 items-center">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Buscar oportunidades..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <Select value={selectedStage} onValueChange={setSelectedStage}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Todas las etapas" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las etapas</SelectItem>
            {opportunityStages.map(stage => (
              <SelectItem key={stage.value} value={stage.value}>
                {stage.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Lista de oportunidades o mensaje */}
      {filteredOpportunities.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Target className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold mb-2">No hay oportunidades registradas</h3>
            <p className="text-gray-600 text-center mb-4">
              Comience a crear oportunidades para hacer seguimiento del proceso de venta
            </p>
            <Button 
              onClick={() => setShowNewOpportunityDialog(true)}
              className="bg-purple-600 hover:bg-purple-700"
            >
              <Plus className="mr-2 h-4 w-4" />
              Crear primera oportunidad
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredOpportunities.map((opportunity) => (
            <Card key={opportunity.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-4 mb-2">
                      <h3 className="text-lg font-semibold">{opportunity.title}</h3>
                      <Badge className={getStageColor(opportunity.stage)}>
                        {opportunityStages.find(s => s.value === opportunity.stage)?.label}
                      </Badge>
                    </div>
                    
                    {opportunity.description && (
                      <p className="text-gray-600 text-sm mb-3">{opportunity.description}</p>
                    )}
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-gray-400" />
                        <span className="font-medium">
                          {opportunity.value.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-gray-400" />
                        <span>{opportunity.probability}% probabilidad</span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        <span>Cierre: {new Date(opportunity.expectedCloseDate).toLocaleDateString('es-ES')}</span>
                      </div>
                      
                      {opportunity.source && (
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-gray-400" />
                          <span>Origen: {opportunity.source}</span>
                        </div>
                      )}
                    </div>
                    
                    {opportunity.nextAction && (
                      <div className="mt-3 p-3 bg-yellow-50 rounded-md">
                        <div className="flex items-start gap-2">
                          <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5" />
                          <div>
                            <p className="text-sm font-medium text-yellow-800">Próxima acción</p>
                            <p className="text-sm text-yellow-700">{opportunity.nextAction}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <Button variant="ghost" size="sm" className="ml-4">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      
      <OpportunityCreateModal
        open={showNewOpportunityDialog}
        onOpenChange={setShowNewOpportunityDialog}
        personId={personId}
      />
    </div>
  )
}
