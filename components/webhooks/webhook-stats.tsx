"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Activity, Webhook, TrendingUp, Clock, AlertTriangle } from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"

interface WebhookStatsProps {
  stats: {
    totalWebhooks: number
    activeWebhooks: number
    requestsToday: number
    successRate: number
    totalErrorsToday: number
  }
}

export function WebhookStats({ stats }: WebhookStatsProps) {
  const statItems = [
    {
      title: "Total Webhooks",
      value: stats.totalWebhooks,
      icon: Webhook,
      description: `${stats.activeWebhooks} activos`,
      iconColor: "text-blue-500"
    },
    {
      title: "Requests Hoy",
      value: stats.requestsToday,
      icon: Activity,
      description: "Últimas 24 horas",
      iconColor: "text-green-500"
    },
    {
      title: "Tasa de Éxito",
      value: `${stats.successRate}%`,
      icon: TrendingUp,
      description: "Promedio de hoy",
      iconColor: stats.successRate >= 95 ? "text-green-500" : stats.successRate >= 80 ? "text-yellow-500" : "text-red-500"
    },
    {
      title: "Errores sin ejecutar",
      value: stats.totalErrorsToday,
      icon: AlertTriangle,
      description: "Pendientes de re-ejecutar",
      isError: true,
      href: "/configuracion/integraciones/webhooks/errors",
      iconColor: stats.totalErrorsToday > 0 ? "text-red-500" : "text-green-500"
    },
    {
      title: "Tiempo Respuesta",
      value: "120ms",
      icon: Clock,
      description: "Promedio",
      iconColor: "text-purple-500"
    }
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
      {statItems.map((item) => {
        const content = (
          <Card className={cn(
              "transition-all hover:shadow-md",
              item.isError && stats.totalErrorsToday > 0 && "bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-800 cursor-pointer",
              item.isError && stats.totalErrorsToday === 0 && "bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800"
          )}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    {item.title}
                  </p>
                  <p className={cn(
                      "text-2xl font-bold",
                      item.isError && stats.totalErrorsToday > 0 && "text-red-600 dark:text-red-400",
                      item.isError && stats.totalErrorsToday === 0 && "text-green-600 dark:text-green-400"
                  )}>
                      {item.value}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {item.description}
                  </p>
                </div>
                <item.icon className={cn(
                    "h-8 w-8",
                    item.iconColor || "text-muted-foreground"
                )} />
              </div>
            </CardContent>
          </Card>
        );

        return item.href ? (
          <Link key={item.title} href={item.href}>
            {content}
          </Link>
        ) : (
          <div key={item.title}>
            {content}
          </div>
        );
      })}
    </div>
  )
} 