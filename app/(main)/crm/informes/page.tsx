"use client"

import { useState } from "react"
import {
  BarChart3, LineChart, PieChart, TrendingUp, Download,
  Calendar, Filter, FileText, Users, DollarSign, Target,
  Activity, Clock, Eye, MousePointer, Mail, Phone,
  ArrowUpRight, ArrowDownRight, Printer, Share2,
  MessageCircle, Instagram, Plus
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { CalendarDateRangePicker } from "@/components/ui/date-range-picker"
import { Progress } from "@/components/ui/progress"
import { ReportCreateModal } from "@/components/crm/report-create-modal"

// Componente ficticio para gráficos (en producción usarías Recharts o similar)
const ChartPlaceholder = ({ type, height = "h-64" }: { type: string; height?: string }) => (
  <div className={`${height} bg-gray-50 rounded-lg flex items-center justify-center text-gray-400`}>
    {type === "bar" && <BarChart3 className="h-12 w-12" />}
    {type === "line" && <LineChart className="h-12 w-12" />}
    {type === "pie" && <PieChart className="h-12 w-12" />}
  </div>
)

export default function InformesPage() {
  const [selectedPeriod, setSelectedPeriod] = useState("month")
  const [selectedReport, setSelectedReport] = useState("overview")
  const [showCreateReportModal, setShowCreateReportModal] = useState(false)

  // Métricas de ejemplo
  const metrics = {
    leads: { total: 156, change: 12.5, trend: "up" },
    conversions: { total: 24, rate: 15.4, change: -2.3, trend: "down" },
    revenue: { total: 45600, change: 18.7, trend: "up" },
    avgDealSize: { total: 1900, change: 5.2, trend: "up" },
  }

  const topPerformers = [
    { name: "Dr. Martínez", leads: 45, conversions: 12, revenue: 18500 },
    { name: "Dra. Rodríguez", leads: 38, conversions: 9, revenue: 15200 },
    { name: "Dr. Sánchez", leads: 32, conversions: 8, revenue: 14100 },
  ]

  const leadSources = [
    { source: "Instagram", count: 45, percentage: 28.8 },
    { source: "Web", count: 38, percentage: 24.4 },
    { source: "Referencia", count: 32, percentage: 20.5 },
    { source: "Google Ads", count: 22, percentage: 14.1 },
    { source: "Facebook", count: 19, percentage: 12.2 },
  ]

  return (
    <div className="flex flex-col h-full pb-20 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Informes y Análisis</h1>
          <p className="text-gray-600 mt-1">Visualiza el rendimiento de tu CRM y toma decisiones basadas en datos</p>
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Exportar
          </Button>
          <Button variant="outline">
            <Printer className="mr-2 h-4 w-4" />
            Imprimir
          </Button>
          <Button variant="outline">
            <Share2 className="mr-2 h-4 w-4" />
            Compartir
          </Button>
        </div>
      </div>

      {/* Filtros globales */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-4 items-center">
            <div className="flex-1">
              <CalendarDateRangePicker />
            </div>
            <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Hoy</SelectItem>
                <SelectItem value="week">Esta semana</SelectItem>
                <SelectItem value="month">Este mes</SelectItem>
                <SelectItem value="quarter">Este trimestre</SelectItem>
                <SelectItem value="year">Este año</SelectItem>
                <SelectItem value="custom">Personalizado</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon">
              <Filter className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tabs de tipos de informes */}
      <Tabs value={selectedReport} onValueChange={setSelectedReport}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">General</TabsTrigger>
          <TabsTrigger value="sales">Ventas</TabsTrigger>
          <TabsTrigger value="marketing">Marketing</TabsTrigger>
          <TabsTrigger value="team">Equipo</TabsTrigger>
          <TabsTrigger value="custom">Personalizado</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6 mt-6">
          {/* KPIs principales */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-gray-600">Leads Totales</CardTitle>
                  <Users className="h-4 w-4 text-blue-500" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.leads.total}</div>
                <div className="flex items-center text-sm mt-1">
                  {metrics.leads.trend === "up" ? (
                    <>
                      <ArrowUpRight className="h-3 w-3 text-green-500 mr-1" />
                      <span className="text-green-600">+{metrics.leads.change}%</span>
                    </>
                  ) : (
                    <>
                      <ArrowDownRight className="h-3 w-3 text-red-500 mr-1" />
                      <span className="text-red-600">-{metrics.leads.change}%</span>
                    </>
                  )}
                  <span className="text-gray-500 ml-1">vs periodo anterior</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-gray-600">Tasa de Conversión</CardTitle>
                  <Target className="h-4 w-4 text-green-500" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.conversions.rate}%</div>
                <div className="flex items-center text-sm mt-1">
                  <ArrowDownRight className="h-3 w-3 text-red-500 mr-1" />
                  <span className="text-red-600">{metrics.conversions.change}%</span>
                  <span className="text-gray-500 ml-1">vs periodo anterior</span>
                </div>
                <Progress value={metrics.conversions.rate} className="mt-2 h-1" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-gray-600">Ingresos Totales</CardTitle>
                  <DollarSign className="h-4 w-4 text-green-500" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {metrics.revenue.total.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
                </div>
                <div className="flex items-center text-sm mt-1">
                  <ArrowUpRight className="h-3 w-3 text-green-500 mr-1" />
                  <span className="text-green-600">+{metrics.revenue.change}%</span>
                  <span className="text-gray-500 ml-1">vs periodo anterior</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-gray-600">Valor Promedio</CardTitle>
                  <Activity className="h-4 w-4 text-purple-500" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {metrics.avgDealSize.total.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
                </div>
                <div className="flex items-center text-sm mt-1">
                  <ArrowUpRight className="h-3 w-3 text-green-500 mr-1" />
                  <span className="text-green-600">+{metrics.avgDealSize.change}%</span>
                  <span className="text-gray-500 ml-1">vs periodo anterior</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Gráficos principales */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Evolución de Leads y Conversiones</CardTitle>
              </CardHeader>
              <CardContent>
                <ChartPlaceholder type="line" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Pipeline de Ventas</CardTitle>
              </CardHeader>
              <CardContent>
                <ChartPlaceholder type="bar" />
              </CardContent>
            </Card>
          </div>

          {/* Tablas de datos */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Top Performers</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {topPerformers.map((performer, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-sm font-semibold text-purple-700">
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-medium">{performer.name}</p>
                          <p className="text-sm text-gray-500">{performer.leads} leads • {performer.conversions} conversiones</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">
                          {performer.revenue.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
                        </p>
                        <p className="text-xs text-gray-500">
                          {((performer.conversions / performer.leads) * 100).toFixed(1)}% conv.
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Fuentes de Leads</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {leadSources.map((source, index) => (
                    <div key={index} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">{source.source}</span>
                        <span className="text-sm text-gray-500">{source.count} ({source.percentage}%)</span>
                      </div>
                      <Progress value={source.percentage} className="h-2" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="sales" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Ventas por Mes</CardTitle>
              </CardHeader>
              <CardContent>
                <ChartPlaceholder type="bar" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Pronóstico de Ventas</CardTitle>
              </CardHeader>
              <CardContent>
                <ChartPlaceholder type="line" />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="marketing" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>ROI por Canal</CardTitle>
              </CardHeader>
              <CardContent>
                <ChartPlaceholder type="pie" height="h-48" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Rendimiento de Campañas</CardTitle>
              </CardHeader>
              <CardContent>
                <ChartPlaceholder type="bar" height="h-48" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Engagement por Tipo</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 mt-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-blue-500" />
                      <span className="text-sm">Email</span>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">68.5%</p>
                      <p className="text-xs text-gray-500">apertura</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <MessageCircle className="h-4 w-4 text-green-500" />
                      <span className="text-sm">SMS</span>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">92.3%</p>
                      <p className="text-xs text-gray-500">lectura</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Instagram className="h-4 w-4 text-purple-500" />
                      <span className="text-sm">Social</span>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">4.2%</p>
                      <p className="text-xs text-gray-500">interacción</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="team" className="mt-6">
          <div className="text-center py-12 text-gray-500">
            Análisis de rendimiento del equipo - Próximamente
          </div>
        </TabsContent>

        <TabsContent value="custom" className="mt-6">
          <div className="text-center py-12">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Crea informes personalizados</h3>
            <p className="text-gray-600 mb-4">Diseña y guarda informes adaptados a tus necesidades específicas</p>
            <Button className="bg-purple-600 hover:bg-purple-700" onClick={() => setShowCreateReportModal(true)}>
              Crear nuevo informe
            </Button>
          </div>
        </TabsContent>
      </Tabs>

      {/* Modal de creación de informe */}
      <ReportCreateModal 
        open={showCreateReportModal} 
        onOpenChange={setShowCreateReportModal} 
      />
    </div>
  )
}
