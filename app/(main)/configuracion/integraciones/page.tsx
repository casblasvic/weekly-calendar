"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Link2, Webhook, Cpu, Network, Zap } from "lucide-react"
import Link from "next/link"

export default function IntegracionesPage() {
  const integracionSections = [
    {
      title: "Webhooks",
      description: "Conecta tu sistema con aplicaciones externas usando webhooks bidireccionales",
      icon: Webhook,
      href: "/configuracion/integraciones/webhooks",
      features: ["Incoming y Outgoing", "Mapeo visual de datos", "Monitoreo en tiempo real"]
    },
    {
      title: "Equipos IoT",
      description: "Controla dispositivos inteligentes conectados a tus servicios",
      icon: Cpu,
      href: "/configuracion/integraciones/equipos",
      features: ["Control automático", "Estado en tiempo real", "Logs de uso"]
    },
    {
      title: "APIs Externas",
      description: "Configura conexiones con APIs de terceros",
      icon: Network,
      href: "/configuracion/integraciones/apis",
      features: ["Autenticación OAuth", "Rate limiting", "Sincronización automática"]
    }
  ]

  return (
    <div className="container mx-auto py-8">
      <div className="flex items-center mb-8">
        <Link2 className="w-8 h-8 mr-3 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">Integraciones</h1>
          <p className="text-muted-foreground mt-1">
            Conecta tu sistema con herramientas externas y dispositivos IoT
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {integracionSections.map((section) => (
          <Link href={section.href} key={section.title} className="block">
            <Card className="h-full transition-all hover:shadow-md hover:border-primary/50">
              <CardHeader className="flex flex-row items-center space-y-0 pb-4">
                <section.icon className="h-6 w-6 text-primary mr-3" />
                <CardTitle className="text-xl">{section.title}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <CardDescription className="text-base leading-relaxed">
                  {section.description}
                </CardDescription>
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">Características:</p>
                  <ul className="text-sm space-y-1">
                    {section.features.map((feature, index) => (
                      <li key={index} className="flex items-center">
                        <Zap className="h-3 w-3 text-primary mr-2" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
} 