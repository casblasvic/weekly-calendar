"use client"

import { useState } from "react"
import { 
  TrendingUp, Filter, Calendar, DollarSign, Target, Users, 
  ChevronRight, Plus, Eye, Clock, AlertCircle, CheckCircle2,
  BarChart3, PieChart, Activity, ArrowUpRight, ArrowDownRight
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { OpportunityDetailView } from "@/components/crm/opportunity-detail-view"

// Datos de ejemplo para oportunidades
const opportunities = [
  {
    id: 1,
    title: "Tratamiento rejuvenecimiento facial - Ana García",
    client: "Ana García",
    value: 2500,
    probability: 75,
    stage: "proposal",
    expectedCloseDate: "2024-02-15",
    owner: "Dr. Martínez",
    lastActivity: "Hace 2 días",
    daysInStage: 5,
    source: "Instagram",
  },
  {
    id: 2,
    title: "Consulta medicina preventiva - Carlos López",
    client: "Carlos López",
    value: 1200,
    probability: 90,
    stage: "negotiation",
    expectedCloseDate: "2024-01-30",
    owner: "Dra. Rodríguez",
    lastActivity: "Hace 3 horas",
    daysInStage: 2,
    source: "Referencia",
  },
  {
    id: 3,
    title: "Programa wellness corporativo - TechCorp",
    client: "TechCorp S.L.",
    value: 15000,
    probability: 60,
    stage: "qualified",
    expectedCloseDate: "2024-03-01",
    owner: "Dr. Sánchez",
    lastActivity: "Hace 1 semana",
    daysInStage: 12,
    source: "Web",
  },
]

const stages = [
  { id: "new", label: "Nueva", color: "bg-slate-500", count: 8, value: 12500 },
  { id: "contacted", label: "Contactado", color: "bg-blue-500", count: 15, value: 45000 },
  { id: "qualified", label: "Calificado", color: "bg-indigo-500", count: 12, value: 125000 },
  { id: "proposal", label: "Propuesta", color: "bg-purple-500", count: 6, value: 85000 },
  { id: "negotiation", label: "Negociación", color: "bg-pink-500", count: 4, value: 62000 },
  { id: "won", label: "Ganada", color: "bg-green-500", count: 25, value: 320000 },
]

export default function OportunidadesCRMPage() {
  const [selectedStage, setSelectedStage] = useState("all")
  const [selectedPeriod, setSelectedPeriod] = useState("month")
  const [selectedOwner, setSelectedOwner] = useState("all")
  const [expandedOpportunityId, setExpandedOpportunityId] = useState<number | null>(null)

  const totalValue = stages.reduce((sum, stage) => sum + stage.value, 0)
  const wonValue = stages.find(s => s.id === "won")?.value || 0
  const conversionRate = ((stages.find(s => s.id === "won")?.count || 0) / 70 * 100).toFixed(1)

  return (
    <div className="flex flex-col h-full pb-20 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Oportunidades</h1>
          <p className="text-gray-600 mt-1">Gestiona y analiza tu pipeline de ventas</p>
        </div>
        <Button className="bg-purple-600 hover:bg-purple-700">
          <Plus className="mr-2 h-4 w-4" />
          Nueva Oportunidad
        </Button>
      </div>

      {/* KPIs Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-gray-600">Pipeline Total</CardTitle>
              <TrendingUp className="h-4 w-4 text-gray-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {totalValue.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
            </div>
            <div className="flex items-center text-sm text-green-600 mt-1">
              <ArrowUpRight className="h-3 w-3 mr-1" />
              <span>+12% vs mes anterior</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-gray-600">Valor Ganado</CardTitle>
              <DollarSign className="h-4 w-4 text-gray-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {wonValue.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
            </div>
            <Progress value={65} className="mt-2 h-1" />
            <p className="text-xs text-gray-500 mt-1">65% del objetivo mensual</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-gray-600">Tasa Conversión</CardTitle>
              <Target className="h-4 w-4 text-gray-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{conversionRate}%</div>
            <div className="flex items-center text-sm text-red-600 mt-1">
              <ArrowDownRight className="h-3 w-3 mr-1" />
              <span>-3% vs mes anterior</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-gray-600">Oportunidades Activas</CardTitle>
              <Activity className="h-4 w-4 text-gray-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">45</div>
            <div className="flex gap-2 mt-2">
              <Badge variant="secondary" className="text-xs">12 calientes</Badge>
              <Badge variant="outline" className="text-xs">8 frías</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-gray-600">Tiempo Medio Cierre</CardTitle>
              <Clock className="h-4 w-4 text-gray-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">28 días</div>
            <p className="text-xs text-gray-500 mt-1">Mejoró 3 días este mes</p>
          </CardContent>
        </Card>
      </div>

      {/* Pipeline Visual */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Pipeline de Ventas</CardTitle>
            <div className="flex gap-2">
              <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="week">Esta semana</SelectItem>
                  <SelectItem value="month">Este mes</SelectItem>
                  <SelectItem value="quarter">Este trimestre</SelectItem>
                  <SelectItem value="year">Este año</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {stages.map((stage, index) => {
              const percentage = (stage.value / totalValue) * 100
              return (
                <div key={stage.id} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${stage.color}`} />
                      <span className="font-medium">{stage.label}</span>
                      <Badge variant="outline" className="text-xs">
                        {stage.count} oportunidades
                      </Badge>
                    </div>
                    <span className="text-sm font-medium">
                      {stage.value.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
                    </span>
                  </div>
                  <div className="relative">
                    <Progress value={percentage} className="h-6" />
                    <span className="absolute inset-0 flex items-center justify-center text-xs text-white font-medium">
                      {percentage.toFixed(1)}%
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Tabs para diferentes vistas */}
      <Tabs defaultValue="list" className="space-y-4">
        <div className="flex justify-between items-center">
          <TabsList>
            <TabsTrigger value="list">Lista</TabsTrigger>
            <TabsTrigger value="kanban">Kanban</TabsTrigger>
            <TabsTrigger value="forecast">Pronóstico</TabsTrigger>
            <TabsTrigger value="analytics">Análisis</TabsTrigger>
          </TabsList>
          
          <div className="flex gap-2">
            <Select value={selectedStage} onValueChange={setSelectedStage}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Todas las etapas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las etapas</SelectItem>
                {stages.map(stage => (
                  <SelectItem key={stage.id} value={stage.id}>
                    {stage.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={selectedOwner} onValueChange={setSelectedOwner}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Todos los propietarios" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="dr-martinez">Dr. Martínez</SelectItem>
                <SelectItem value="dra-rodriguez">Dra. Rodríguez</SelectItem>
                <SelectItem value="dr-sanchez">Dr. Sánchez</SelectItem>
              </SelectContent>
            </Select>
            
            <Button variant="outline" size="icon">
              <Filter className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <TabsContent value="list" className="space-y-4">
          {opportunities.map((opp) => (
            <div key={opp.id}>
              <Card className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-4 mb-2">
                        <h3 className="text-lg font-semibold">{opp.title}</h3>
                        <Badge 
                          className={
                            opp.stage === "negotiation" ? "bg-pink-100 text-pink-700" :
                            opp.stage === "proposal" ? "bg-purple-100 text-purple-700" :
                            "bg-indigo-100 text-indigo-700"
                          }
                        >
                          {stages.find(s => s.id === opp.stage)?.label}
                        </Badge>
                        {opp.daysInStage > 10 && (
                          <Badge variant="outline" className="text-orange-600 border-orange-600">
                            <AlertCircle className="h-3 w-3 mr-1" />
                            {opp.daysInStage} días en etapa
                          </Badge>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-5 gap-4 text-sm text-gray-600">
                        <div>
                          <span className="text-gray-400">Cliente:</span>
                          <p className="font-medium text-gray-900">{opp.client}</p>
                        </div>
                        <div>
                          <span className="text-gray-400">Valor:</span>
                          <p className="font-medium text-gray-900">
                            {opp.value.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
                          </p>
                        </div>
                        <div>
                          <span className="text-gray-400">Probabilidad:</span>
                          <div className="flex items-center gap-2">
                            <Progress value={opp.probability} className="w-16 h-2" />
                            <span className="font-medium text-gray-900">{opp.probability}%</span>
                          </div>
                        </div>
                        <div>
                          <span className="text-gray-400">Cierre esperado:</span>
                          <p className="font-medium text-gray-900">
                            {new Date(opp.expectedCloseDate).toLocaleDateString('es-ES')}
                          </p>
                        </div>
                        <div>
                          <span className="text-gray-400">Propietario:</span>
                          <p className="font-medium text-gray-900">{opp.owner}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {opp.lastActivity}
                        </span>
                        <span>Origen: {opp.source}</span>
                      </div>
                    </div>
                    
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => setExpandedOpportunityId(
                        expandedOpportunityId === opp.id ? null : opp.id
                      )}
                      className={expandedOpportunityId === opp.id ? "rotate-90" : ""}
                    >
                      <ChevronRight className="h-5 w-5 transition-transform" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
              
              {/* Detalle expandido */}
              {expandedOpportunityId === opp.id && (
                <div className="mt-2">
                  <OpportunityDetailView 
                    opportunity={opp} 
                    onClose={() => setExpandedOpportunityId(null)}
                  />
                </div>
              )}
            </div>
          ))}
        </TabsContent>

        <TabsContent value="kanban">
          <div className="grid grid-cols-5 gap-4 h-[600px]">
            {stages.map((stage) => {
              const stageOpportunities = opportunities.filter(opp => opp.stage === stage.id)
              return (
                <div key={stage.id} className="bg-gray-50 rounded-lg p-4 flex flex-col">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${stage.color}`} />
                      <h3 className="font-semibold">{stage.label}</h3>
                      <Badge variant="secondary" className="text-xs">
                        {stageOpportunities.length}
                      </Badge>
                    </div>
                    <span className="text-sm text-gray-600">
                      {stageOpportunities.reduce((sum, opp) => sum + opp.value, 0).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
                    </span>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto space-y-3">
                    {stageOpportunities.map((opp) => (
                      <Card 
                        key={opp.id} 
                        className="cursor-move hover:shadow-lg transition-all duration-200 border-2 border-transparent hover:border-primary/20"
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-2">
                            <h4 className="text-sm font-medium line-clamp-2">{opp.client}</h4>
                            <Badge variant="outline" className="text-xs ml-2">
                              {opp.probability}%
                            </Badge>
                          </div>
                          
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-lg font-bold">
                                {opp.value.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
                              </span>
                              {opp.daysInStage > 10 && (
                                <AlertCircle className="h-4 w-4 text-orange-500" />
                              )}
                            </div>
                            
                            <div className="flex items-center gap-2 text-xs text-gray-500">
                              <Users className="h-3 w-3" />
                              <span>{opp.owner}</span>
                            </div>
                            
                            <div className="flex items-center gap-2 text-xs text-gray-500">
                              <Calendar className="h-3 w-3" />
                              <span>Cierre: {new Date(opp.expectedCloseDate).toLocaleDateString('es-ES')}</span>
                            </div>
                            
                            <div className="flex items-center gap-2 text-xs text-gray-500">
                              <Clock className="h-3 w-3" />
                              <span>{opp.lastActivity}</span>
                            </div>
                          </div>
                          
                          <div className="mt-3 flex gap-2">
                            <Button size="sm" variant="ghost" className="h-7 text-xs flex-1">
                              <Eye className="h-3 w-3 mr-1" />
                              Ver
                            </Button>
                            <Button size="sm" variant="ghost" className="h-7 text-xs flex-1">
                              <Activity className="h-3 w-3 mr-1" />
                              Actividad
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                  
                  <Button 
                    variant="ghost" 
                    className="w-full mt-3 border-2 border-dashed border-gray-300 hover:border-primary hover:bg-primary/5"
                    size="sm"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Añadir oportunidad
                  </Button>
                </div>
              )
            })}
          </div>
        </TabsContent>

        <TabsContent value="forecast">
          <div className="space-y-6">
            {/* Resumen del Pronóstico */}
            <div className="grid grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Pronóstico Total</p>
                      <p className="text-2xl font-bold">45.280 €</p>
                      <p className="text-xs text-green-600 flex items-center gap-1 mt-1">
                        <ArrowUpRight className="h-3 w-3" />
                        +23% vs mes anterior
                      </p>
                    </div>
                    <Target className="h-8 w-8 text-primary" />
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Cierre Probable</p>
                      <p className="text-2xl font-bold">32.150 €</p>
                      <p className="text-xs text-gray-500 mt-1">71% probabilidad</p>
                    </div>
                    <CheckCircle2 className="h-8 w-8 text-green-500" />
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">En Riesgo</p>
                      <p className="text-2xl font-bold">8.500 €</p>
                      <p className="text-xs text-orange-600 flex items-center gap-1 mt-1">
                        <AlertCircle className="h-3 w-3" />
                        4 oportunidades
                      </p>
                    </div>
                    <Activity className="h-8 w-8 text-orange-500" />
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Tasa de Conversión</p>
                      <p className="text-2xl font-bold">28%</p>
                      <p className="text-xs text-green-600 flex items-center gap-1 mt-1">
                        <ArrowUpRight className="h-3 w-3" />
                        +5% este mes
                      </p>
                    </div>
                    <PieChart className="h-8 w-8 text-purple-500" />
                  </div>
                </CardContent>
              </Card>
            </div>
            
            {/* Gráfico de Pronóstico por Mes */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Pronóstico por Mes</CardTitle>
                  <Select defaultValue="6months">
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="3months">3 meses</SelectItem>
                      <SelectItem value="6months">6 meses</SelectItem>
                      <SelectItem value="12months">12 meses</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { month: 'Enero 2024', expected: 32000, probable: 28000, closed: 25000 },
                    { month: 'Febrero 2024', expected: 45280, probable: 32150, closed: 0 },
                    { month: 'Marzo 2024', expected: 52000, probable: 38000, closed: 0 },
                    { month: 'Abril 2024', expected: 48500, probable: 35000, closed: 0 },
                    { month: 'Mayo 2024', expected: 55000, probable: 42000, closed: 0 },
                    { month: 'Junio 2024', expected: 62000, probable: 48000, closed: 0 },
                  ].map((data) => (
                    <div key={data.month} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="font-medium">{data.month}</span>
                        <div className="flex items-center gap-4 text-sm">
                          <span className="text-gray-500">
                            Esperado: {data.expected.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
                          </span>
                          <span className="text-primary font-medium">
                            Probable: {data.probable.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
                          </span>
                          {data.closed > 0 && (
                            <span className="text-green-600 font-medium">
                              Cerrado: {data.closed.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="relative h-8 bg-gray-100 rounded-full overflow-hidden">
                        {data.closed > 0 && (
                          <div 
                            className="absolute h-full bg-green-500" 
                            style={{ width: `${(data.closed / data.expected) * 100}%` }}
                          />
                        )}
                        <div 
                          className="absolute h-full bg-primary" 
                          style={{ 
                            width: `${(data.probable / data.expected) * 100}%`,
                            left: data.closed > 0 ? `${(data.closed / data.expected) * 100}%` : 0
                          }}
                        />
                        <div 
                          className="absolute h-full bg-gray-300" 
                          style={{ 
                            width: `${((data.expected - data.probable) / data.expected) * 100}%`,
                            left: `${(data.probable / data.expected) * 100}%`
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="flex items-center gap-6 mt-6 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full" />
                    <span>Cerrado</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-primary rounded-full" />
                    <span>Probable</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-gray-300 rounded-full" />
                    <span>Optimista</span>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {/* Oportunidades por Probabilidad */}
            <Card>
              <CardHeader>
                <CardTitle>Oportunidades por Probabilidad</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    { range: '90-100%', count: 5, value: 12500, color: 'bg-green-500' },
                    { range: '70-89%', count: 8, value: 18000, color: 'bg-green-400' },
                    { range: '50-69%', count: 12, value: 22000, color: 'bg-yellow-400' },
                    { range: '30-49%', count: 15, value: 28000, color: 'bg-orange-400' },
                    { range: '0-29%', count: 7, value: 9500, color: 'bg-red-400' },
                  ].map((prob) => (
                    <div key={prob.range} className="flex items-center gap-4">
                      <div className="w-20 text-sm font-medium">{prob.range}</div>
                      <div className="flex-1 relative h-8 bg-gray-100 rounded overflow-hidden">
                        <div 
                          className={`absolute h-full ${prob.color}`} 
                          style={{ width: `${(prob.value / 90000) * 100}%` }}
                        />
                        <div className="absolute inset-0 flex items-center justify-between px-3 text-xs">
                          <span className="text-white font-medium">{prob.count} oportunidades</span>
                          <span className="text-gray-700 font-medium">
                            {(prob.value / 1000).toFixed(0)}k €
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="analytics">
          <div className="space-y-6">
            {/* Métricas de Rendimiento */}
            <div className="grid grid-cols-2 gap-6">
              {/* Conversión por Etapa */}
              <Card>
                <CardHeader>
                  <CardTitle>Embudo de Conversión</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {[
                      { from: 'Prospección', to: 'Cualificación', rate: 65, count: 120 },
                      { from: 'Cualificación', to: 'Propuesta', rate: 78, count: 78 },
                      { from: 'Propuesta', to: 'Negociación', rate: 82, count: 64 },
                      { from: 'Negociación', to: 'Ganado', rate: 72, count: 46 },
                    ].map((stage, index) => (
                      <div key={index} className="space-y-2">
                        <div className="flex justify-between items-center text-sm">
                          <span>{stage.from} → {stage.to}</span>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{stage.rate}%</span>
                            <span className="text-gray-500">({stage.count})</span>
                          </div>
                        </div>
                        <Progress value={stage.rate} className="h-2" />
                      </div>
                    ))}
                  </div>
                  
                  <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Conversión Total</span>
                      <span className="text-lg font-bold text-primary">28%</span>
                    </div>
                    <p className="text-xs text-gray-600">
                      De 165 oportunidades iniciales, 46 se convirtieron en ventas
                    </p>
                  </div>
                </CardContent>
              </Card>
              
              {/* Tiempo Medio por Etapa */}
              <Card>
                <CardHeader>
                  <CardTitle>Velocidad del Pipeline</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {[
                      { stage: 'Prospección', days: 3, benchmark: 5, status: 'good' },
                      { stage: 'Cualificación', days: 7, benchmark: 7, status: 'normal' },
                      { stage: 'Propuesta', days: 12, benchmark: 10, status: 'warning' },
                      { stage: 'Negociación', days: 8, benchmark: 15, status: 'good' },
                    ].map((item) => (
                      <div key={item.stage} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-2 h-2 rounded-full ${
                            item.status === 'good' ? 'bg-green-500' :
                            item.status === 'warning' ? 'bg-orange-500' : 'bg-gray-500'
                          }`} />
                          <span className="text-sm">{item.stage}</span>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="text-sm font-medium">{item.days} días</p>
                            <p className="text-xs text-gray-500">benchmark: {item.benchmark}</p>
                          </div>
                          {item.status === 'warning' && (
                            <AlertCircle className="h-4 w-4 text-orange-500" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <div className="mt-6 p-4 bg-primary/5 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Ciclo de Venta Promedio</span>
                      <span className="text-lg font-bold text-primary">30 días</span>
                    </div>
                    <p className="text-xs text-gray-600">
                      -5 días vs promedio histórico
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            {/* Análisis por Fuente y Propietario */}
            <div className="grid grid-cols-2 gap-6">
              {/* Rendimiento por Fuente */}
              <Card>
                <CardHeader>
                  <CardTitle>Rendimiento por Fuente de Lead</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {[
                      { source: 'Instagram', leads: 45, conversion: 35, value: 28500 },
                      { source: 'Google Ads', leads: 38, conversion: 28, value: 22000 },
                      { source: 'Referencias', leads: 25, conversion: 52, value: 35000 },
                      { source: 'Web Orgánico', leads: 32, conversion: 22, value: 15000 },
                      { source: 'Facebook', leads: 28, conversion: 18, value: 12000 },
                    ].map((source) => (
                      <div key={source.source} className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium">{source.source}</span>
                          <div className="flex items-center gap-4 text-sm">
                            <span className="text-gray-500">{source.leads} leads</span>
                            <Badge variant={source.conversion > 30 ? "default" : "secondary"}>
                              {source.conversion}% conv
                            </Badge>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Progress value={source.conversion} className="flex-1 h-2" />
                          <span className="text-xs font-medium w-16 text-right">
                            {(source.value / 1000).toFixed(0)}k €
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
              
              {/* Rendimiento por Propietario */}
              <Card>
                <CardHeader>
                  <CardTitle>Rendimiento por Comercial</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {[
                      { name: 'Dr. Martínez', opportunities: 32, won: 12, value: 45000, avgDeal: 3750 },
                      { name: 'Dra. Rodríguez', opportunities: 28, won: 10, value: 38000, avgDeal: 3800 },
                      { name: 'Dr. Sánchez', opportunities: 25, won: 8, value: 28000, avgDeal: 3500 },
                      { name: 'Dra. López', opportunities: 22, won: 6, value: 18000, avgDeal: 3000 },
                    ].map((owner) => (
                      <div key={owner.name} className="p-3 border rounded-lg">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <p className="font-medium">{owner.name}</p>
                            <p className="text-sm text-gray-500">
                              {owner.opportunities} oportunidades · {owner.won} ganadas
                            </p>
                          </div>
                          <Badge variant="outline">
                            {((owner.won / owner.opportunities) * 100).toFixed(0)}%
                          </Badge>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="text-gray-500">Valor total</p>
                            <p className="font-medium">
                              {owner.value.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-500">Ticket medio</p>
                            <p className="font-medium">
                              {owner.avgDeal.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
            
            {/* Tendencias y Predicciones */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Tendencias y Predicciones</CardTitle>
                  <Badge variant="outline" className="gap-1">
                    <Activity className="h-3 w-3" />
                    Actualizado en tiempo real
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <p className="text-sm text-gray-600">Predicción Q1 2024</p>
                    <p className="text-2xl font-bold">185.000 €</p>
                    <div className="flex items-center gap-2">
                      <Progress value={65} className="flex-1 h-2" />
                      <span className="text-sm">65%</span>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <p className="text-sm text-gray-600">Crecimiento YoY</p>
                    <p className="text-2xl font-bold flex items-center gap-2">
                      +34%
                      <ArrowUpRight className="h-5 w-5 text-green-500" />
                    </p>
                    <p className="text-xs text-gray-500">vs 138k € en 2023</p>
                  </div>
                  
                  <div className="space-y-2">
                    <p className="text-sm text-gray-600">Oportunidades en Riesgo</p>
                    <p className="text-2xl font-bold flex items-center gap-2">
                      12
                      <AlertCircle className="h-5 w-5 text-orange-500" />
                    </p>
                    <p className="text-xs text-gray-500">22.500 € en valor</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
      
      {/* Padding inferior para mejor scroll */}
      <div className="h-20" />
    </div>
  )
}
