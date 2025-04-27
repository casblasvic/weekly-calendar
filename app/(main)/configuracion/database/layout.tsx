"use client"

import { usePathname } from "next/navigation"
import Link from "next/link"
import { Card } from "@/components/ui/card"
import { Database, Server, HardDrive, CircleSlash, ChevronsUpDown, Workflow, History } from "lucide-react"

export default function DatabaseLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  const links = [
    {
      href: "/configuracion/database",
      label: "General",
      icon: Database,
      description: "Configuración general de la base de datos",
    },
    {
      href: "/configuracion/database/providers",
      label: "Proveedores",
      icon: Server,
      description: "Configura los proveedores de bases de datos",
    },
    {
      href: "/configuracion/database/backup",
      label: "Respaldos",
      icon: HardDrive,
      description: "Gestiona las copias de seguridad de tus datos",
    },
    {
      href: "/configuracion/database/migration",
      label: "Migración",
      icon: ChevronsUpDown,
      description: "Migra datos entre diferentes sistemas",
    },
    {
      href: "/configuracion/database/schemas",
      label: "Esquemas",
      icon: Workflow,
      description: "Gestiona los esquemas de base de datos",
    },
    {
      href: "/configuracion/database/logs",
      label: "Registros",
      icon: History,
      description: "Visualiza los registros de operaciones",
    },
  ]

  return (
    <div className="flex flex-col md:flex-row h-full gap-6 p-6">
      <aside className="w-full md:w-60 shrink-0 space-y-2">
        <div className="sticky top-20">
          <div className="flex items-center mb-4">
            <Database className="h-5 w-5 mr-2 text-primary" />
            <h2 className="text-xl font-bold">Base de datos</h2>
          </div>
          <div className="space-y-1">
            {links.map((link) => {
              const isActive = pathname === link.href

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`
                    flex items-center px-3 py-2 rounded-md text-sm font-medium
                    ${isActive ? "bg-primary/10 text-primary" : "hover:bg-muted"}
                  `}
                >
                  <link.icon className={`h-4 w-4 mr-2 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
                  <span>{link.label}</span>
                </Link>
              )
            })}
          </div>
          
          <div className="mt-8 p-3 border rounded-md bg-amber-50 border-amber-100">
            <div className="flex items-start gap-2">
              <CircleSlash className="h-4 w-4 text-amber-600 mt-0.5" />
              <div>
                <h3 className="text-sm font-medium text-amber-800">Entorno de desarrollo</h3>
                <p className="text-xs text-amber-700 mt-1">
                  En modo desarrollo, los cambios se aplican solo a los archivos locales. En producción, se aplicarán a la base de datos configurada.
                </p>
              </div>
            </div>
          </div>
        </div>
      </aside>
      <main className="flex-1">
        {children}
      </main>
    </div>
  )
} 