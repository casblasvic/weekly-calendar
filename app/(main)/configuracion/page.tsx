"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Settings, Building2, HardDrive, Database, UserCog, FileText } from "lucide-react"
import Link from "next/link"

export default function ConfiguracionPage() {
  const configSections = [
    {
      title: "Clínicas",
      description: "Gestione sus clínicas, consultorios y salas",
      icon: Building2,
      href: "/configuracion/clinicas"
    },
    {
      title: "Usuarios",
      description: "Administre usuarios y permisos",
      icon: UserCog,
      href: "/configuracion/usuarios"
    },
    {
      title: "Tarifas",
      description: "Configure servicios y precios",
      icon: FileText,
      href: "/configuracion/tarifas"
    },
    {
      title: "Almacenamiento",
      description: "Gestione el almacenamiento de archivos",
      icon: HardDrive,
      href: "/configuracion/almacenamiento"
    },
    {
      title: "Bases de datos",
      description: "Configure la conexión con bases de datos",
      icon: Database,
      href: "/configuracion/database"
    }
  ]

  return (
    <div className="container mx-auto py-8">
      <div className="flex items-center mb-8">
        <Settings className="w-8 h-8 mr-3 text-primary" />
        <h1 className="text-3xl font-bold">Configuración del Sistema</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {configSections.map((section) => (
          <Link href={section.href} key={section.title} className="block">
            <Card className="h-full transition-all hover:shadow-md">
              <CardHeader className="flex flex-row items-center space-y-0 pb-2">
                <section.icon className="h-5 w-5 text-primary mr-2" />
                <CardTitle className="text-xl">{section.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base">{section.description}</CardDescription>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}

