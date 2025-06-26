"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Activity, Webhook, TrendingUp, Clock } from "lucide-react"

interface WebhookStatsProps {
  stats: {
    totalWebhooks: number
    activeWebhooks: number
    requestsToday: number
    successRate: number
  }
}

export function WebhookStats({ stats }: WebhookStatsProps) {
  const statItems = [
    {
      title: "Total Webhooks",
      value: stats.totalWebhooks,
      icon: Webhook,
      description: `${stats.activeWebhooks} activos`
    },
    {
      title: "Requests Hoy",
      value: stats.requestsToday,
      icon: Activity,
      description: "Últimas 24 horas"
    },
    {
      title: "Tasa de Éxito",
      value: `${stats.successRate}%`,
      icon: TrendingUp,
      description: "Promedio semanal"
    },
    {
      title: "Tiempo Respuesta",
      value: "120ms",
      icon: Clock,
      description: "Promedio"
    }
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {statItems.map((item) => (
        <Card key={item.title}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  {item.title}
                </p>
                <p className="text-2xl font-bold">{item.value}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {item.description}
                </p>
              </div>
              <item.icon className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
} 