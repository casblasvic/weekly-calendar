"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { 
  BarChart2, 
  Users, 
  Phone, 
  Mail, 
  FileText, 
  Briefcase, 
  TrendingUp, 
  ArrowRight, 
  Calendar
} from "lucide-react"

export default function CRMPage() {
  return (
    <div className="p-6 space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight mb-2">Sistema CRM</h1>
        <p className="text-muted-foreground">Gestione clientes, oportunidades y seguimiento comercial</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl">Dashboard</CardTitle>
              <BarChart2 className="h-6 w-6 text-purple-600" />
            </div>
            <CardDescription>Visualización de métricas y KPIs</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Acceda a gráficos, estadísticas y análisis de rendimiento de su negocio.
            </p>
            <Button asChild variant="outline" className="w-full">
              <Link href="/crm/dashboard" className="flex items-center justify-between">
                <span>Ver dashboard</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl">Clientes</CardTitle>
              <Users className="h-6 w-6 text-blue-600" />
            </div>
            <CardDescription>Gestión de clientes y contactos</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Administre información de clientes, historiales y actividad reciente.
            </p>
            <Button asChild variant="outline" className="w-full">
              <Link href="/crm/clientes" className="flex items-center justify-between">
                <span>Gestionar clientes</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl">Oportunidades</CardTitle>
              <TrendingUp className="h-6 w-6 text-green-600" />
            </div>
            <CardDescription>Seguimiento de oportunidades de venta</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Controle el pipeline comercial y gestione oportunidades de venta.
            </p>
            <Button asChild variant="outline" className="w-full">
              <Link href="/crm/oportunidades" className="flex items-center justify-between">
                <span>Ver oportunidades</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl">Agenda</CardTitle>
              <Calendar className="h-6 w-6 text-amber-600" />
            </div>
            <CardDescription>Calendario de actividades comerciales</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Planifique reuniones, llamadas y seguimientos con clientes potenciales.
            </p>
            <Button asChild variant="outline" className="w-full">
              <Link href="/crm/agenda" className="flex items-center justify-between">
                <span>Ver agenda</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl">Comunicaciones</CardTitle>
              <Mail className="h-6 w-6 text-indigo-600" />
            </div>
            <CardDescription>Gestión de correos y mensajes</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Envíe y realice seguimiento de comunicaciones con clientes y prospectos.
            </p>
            <Button asChild variant="outline" className="w-full">
              <Link href="/crm/comunicaciones" className="flex items-center justify-between">
                <span>Gestionar comunicaciones</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl">Informes</CardTitle>
              <FileText className="h-6 w-6 text-red-600" />
            </div>
            <CardDescription>Reportes y análisis de datos</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Genere informes personalizados de ventas, clientes y actividades.
            </p>
            <Button asChild variant="outline" className="w-full">
              <Link href="/crm/informes" className="flex items-center justify-between">
                <span>Ver informes</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="bg-purple-50 p-6 rounded-lg">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-purple-800">¿Necesita ayuda con el CRM?</h2>
            <p className="text-purple-700">Ofrecemos capacitación y soporte para maximizar el uso de su sistema.</p>
          </div>
          <Button className="bg-purple-700 hover:bg-purple-800">
            Solicitar soporte
          </Button>
        </div>
      </div>
    </div>
  )
}

