"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CalendarDateRangePicker } from "@/components/ui/date-range-picker"
import { 
  BarChart as BarChartIcon, 
  PieChart as PieChartIcon, 
  Users, 
  ShoppingCart, 
  CreditCard, 
  Package, 
  TrendingUp, 
  Download, 
  ArrowUpRight, 
  ArrowDownRight,
  Activity
} from "lucide-react"

export default function DashboardPage() {
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    to: new Date()
  })

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between space-y-4 md:space-y-0">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard CRM</h1>
          <p className="text-muted-foreground">Analiza el rendimiento de tu negocio y clientes.</p>
        </div>
        <div className="flex items-center space-x-4">
          <CalendarDateRangePicker />
          <Button className="bg-purple-700 hover:bg-purple-800">
            <Download className="mr-2 h-4 w-4" />
            Exportar datos
          </Button>
        </div>
      </div>

      {/* KPIs principales */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between space-x-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Ingresos totales</p>
                <p className="text-3xl font-bold">€42,340</p>
                <div className="flex items-center space-x-1 text-sm text-green-500">
                  <ArrowUpRight className="h-4 w-4" />
                  <span>12.5%</span>
                  <span className="text-muted-foreground">vs. mes anterior</span>
                </div>
              </div>
              <div className="rounded-full p-3 bg-purple-100">
                <CreditCard className="h-8 w-8 text-purple-700" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between space-x-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Nuevos clientes</p>
                <p className="text-3xl font-bold">168</p>
                <div className="flex items-center space-x-1 text-sm text-green-500">
                  <ArrowUpRight className="h-4 w-4" />
                  <span>8.2%</span>
                  <span className="text-muted-foreground">vs. mes anterior</span>
                </div>
              </div>
              <div className="rounded-full p-3 bg-blue-100">
                <Users className="h-8 w-8 text-blue-700" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between space-x-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Ventas completadas</p>
                <p className="text-3xl font-bold">324</p>
                <div className="flex items-center space-x-1 text-sm text-red-500">
                  <ArrowDownRight className="h-4 w-4" />
                  <span>3.1%</span>
                  <span className="text-muted-foreground">vs. mes anterior</span>
                </div>
              </div>
              <div className="rounded-full p-3 bg-green-100">
                <ShoppingCart className="h-8 w-8 text-green-700" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between space-x-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Tasa de conversión</p>
                <p className="text-3xl font-bold">24.8%</p>
                <div className="flex items-center space-x-1 text-sm text-green-500">
                  <ArrowUpRight className="h-4 w-4" />
                  <span>2.3%</span>
                  <span className="text-muted-foreground">vs. mes anterior</span>
                </div>
              </div>
              <div className="rounded-full p-3 bg-amber-100">
                <TrendingUp className="h-8 w-8 text-amber-700" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos principales */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3 h-11 items-stretch">
          <TabsTrigger value="overview">Resumen general</TabsTrigger>
          <TabsTrigger value="analytics">Ventas y clientes</TabsTrigger>
          <TabsTrigger value="reports">Rendimiento por agente</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card className="col-span-2">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-base font-normal">Ingresos por periodo</CardTitle>
                <Select defaultValue="monthly">
                  <SelectTrigger className="w-[180px] h-8">
                    <SelectValue placeholder="Seleccionar vista" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Diario</SelectItem>
                    <SelectItem value="weekly">Semanal</SelectItem>
                    <SelectItem value="monthly">Mensual</SelectItem>
                    <SelectItem value="yearly">Anual</SelectItem>
                  </SelectContent>
                </Select>
              </CardHeader>
              <CardContent className="pt-2 px-6 pb-6">
                <div className="h-[300px]">
                  {/* Aquí iría un componente de gráfico de líneas */}
                  <div className="w-full h-full bg-gradient-to-r from-purple-100 to-blue-100 rounded-md flex items-center justify-center">
                    <span className="text-muted-foreground">Gráfico de ingresos por periodo</span>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-base font-normal">Distribución de ventas</CardTitle>
                <BarChartIcon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent className="pt-2 px-6 pb-6">
                <div className="h-[300px]">
                  {/* Aquí iría un componente de gráfico circular */}
                  <div className="w-full h-full bg-gradient-to-r from-green-100 to-emerald-100 rounded-md flex items-center justify-center">
                    <span className="text-muted-foreground">Gráfico de distribución de ventas</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
            <Card className="col-span-4">
              <CardHeader>
                <CardTitle>Pipeline de ventas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[200px]">
                  {/* Aquí iría un gráfico de embudo */}
                  <div className="w-full h-full bg-gradient-to-r from-blue-100 to-indigo-100 rounded-md flex items-center justify-center">
                    <span className="text-muted-foreground">Gráfico de embudo de ventas</span>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="col-span-3">
              <CardHeader>
                <CardTitle>Clientes por segmento</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[200px]">
                  {/* Aquí iría un gráfico de pastel */}
                  <div className="w-full h-full bg-gradient-to-r from-amber-100 to-orange-100 rounded-md flex items-center justify-center">
                    <span className="text-muted-foreground">Gráfico de segmentación de clientes</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        {/* Otros contenidos de las pestañas */}
        <TabsContent value="analytics" className="space-y-4">
          {/* Contenido para la pestaña de Analytics */}
        </TabsContent>
        
        <TabsContent value="reports" className="space-y-4">
          {/* Contenido para la pestaña de Reports */}
        </TabsContent>
      </Tabs>

      {/* Sección inferior: actividad reciente y principales clientes */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Actividad reciente</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-8">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center">
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={`https://avatar.vercel.sh/${i}${i}${i}`} alt="Avatar" />
                    <AvatarFallback>UC</AvatarFallback>
                  </Avatar>
                  <div className="ml-4 space-y-1">
                    <p className="text-sm font-medium leading-none">
                      {["José García", "María Rodríguez", "Carlos López", "Ana Martínez", "Luis Fernández"][i-1]}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {[
                        "Compró paquete premium", 
                        "Solicitó demostración", 
                        "Renovó contrato anual", 
                        "Abrió ticket de soporte", 
                        "Actualizó plan"
                      ][i-1]}
                    </p>
                  </div>
                  <div className="ml-auto font-medium">
                    {["-25m", "-1h", "-2h", "-3h", "-5h"][i-1]}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Mejores clientes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-8">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-center">
                  <Avatar className="h-9 w-9 border-2 border-purple-500">
                    <AvatarImage src={`https://avatar.vercel.sh/company${i}`} alt="Avatar" />
                    <AvatarFallback>CL</AvatarFallback>
                  </Avatar>
                  <div className="ml-4 space-y-1">
                    <p className="text-sm font-medium leading-none">
                      {["Dental Clinic Madrid", "Hospital San Carlos", "Centro Médico Vitalidad", "Clínica Bienestar"][i-1]}
                    </p>
                    <div className="flex items-center text-sm text-muted-foreground">
                      <span>€{[12480, 9850, 7620, 6340][i-1]}</span>
                      <Activity className="ml-2 h-3 w-3 text-green-500" />
                    </div>
                  </div>
                  <div className="ml-auto font-medium text-green-500">
                    +{[24, 18, 15, 12][i-1]}%
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 