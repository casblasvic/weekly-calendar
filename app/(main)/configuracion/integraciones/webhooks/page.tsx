"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator 
} from "@/components/ui/dropdown-menu"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  Webhook, 
  Plus, 
  Search, 
  Filter, 
  MoreHorizontal, 
  Copy, 
  Eye, 
  Settings2, 
  Trash2,
  Activity,
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
  ArrowUpDown,
  ArrowUp,
  ArrowDown
} from "lucide-react"
import Link from "next/link"
import { WebhookCreateModal } from "@/components/webhooks/webhook-create-modal"
import { WebhookCard } from "@/components/webhooks/webhook-card"
import { WebhookStats } from "@/components/webhooks/webhook-stats"
import { useSession } from "next-auth/react"

interface Webhook {
  id: string
  name: string
  description?: string
  slug: string
  direction: "incoming" | "outgoing" | "bidirectional"
  isActive: boolean
  url: string
  allowedMethods: string[]
  totalCalls: number
  successfulCalls: number
  lastTriggered?: Date
  createdAt: Date
  category?: string
}

interface WebhookStats {
  totalWebhooks: number
  activeWebhooks: number
  requestsToday: number
  successRate: number
}

export default function WebhooksPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedTab, setSelectedTab] = useState("all")
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [webhooks, setWebhooks] = useState<Webhook[]>([])
  const [stats, setStats] = useState<WebhookStats>({
    totalWebhooks: 0,
    activeWebhooks: 0,
    requestsToday: 0,
    successRate: 0
  })
  const [isLoading, setIsLoading] = useState(true)
  
  // Obtener systemId de la sesión autenticada
  const { data: session, status } = useSession()
  const systemId = session?.user?.systemId
  
  // Cargar webhooks desde la API
  useEffect(() => {
    // No cargar webhooks hasta que tengamos la sesión y el systemId
    if (!systemId || status === 'loading') return
    const loadWebhooks = async () => {
      try {
        setIsLoading(true)
        const response = await fetch(`/api/internal/webhooks?systemId=${systemId}`)
        
        if (!response.ok) {
          throw new Error('Failed to fetch webhooks')
        }
        
        const data = await response.json()
        setWebhooks(data.webhooks || [])
        setStats(data.stats || {
          totalWebhooks: 0,
          activeWebhooks: 0,
          requestsToday: 0,
          successRate: 0
        })
      } catch (error) {
        console.error('Error loading webhooks:', error)
        // Mantener vacío en caso de error
        setWebhooks([])
        setStats({
          totalWebhooks: 0,
          activeWebhooks: 0,
          requestsToday: 0,
          successRate: 0
        })
      } finally {
        setIsLoading(false)
      }
    }
    
    loadWebhooks()
  }, [systemId, status])
  
  const filteredWebhooks = webhooks.filter(webhook => {
    const matchesSearch = webhook.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         webhook.slug.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesTab = selectedTab === "all" || 
                      (selectedTab === "active" && webhook.isActive) ||
                      (selectedTab === "inactive" && !webhook.isActive) ||
                      webhook.direction === selectedTab
    
    return matchesSearch && matchesTab
  })

  return (
    <div className="container mx-auto py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <Webhook className="w-8 h-8 mr-3 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">Webhooks</h1>
            <p className="text-muted-foreground mt-1">
              Gestiona las conexiones con aplicaciones externas
            </p>
          </div>
        </div>
        
        <Button onClick={() => setIsCreateModalOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Crear Webhook
        </Button>
      </div>

      {/* Stats */}
      <WebhookStats stats={stats} />

      {/* Filters and Search */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex gap-2 flex-1 max-w-md">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar webhooks..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button variant="outline" size="icon">
            <Filter className="h-4 w-4" />
          </Button>
        </div>

        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-auto">
          <TabsList>
            <TabsTrigger value="all">Todos</TabsTrigger>
            <TabsTrigger value="active">Activos</TabsTrigger>
            <TabsTrigger value="inactive">Inactivos</TabsTrigger>
            <TabsTrigger value="incoming">Incoming</TabsTrigger>
            <TabsTrigger value="outgoing">Outgoing</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Webhooks List */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredWebhooks.map((webhook) => (
          <WebhookCard key={webhook.id} webhook={webhook} />
        ))}
      </div>

      {/* Empty State */}
      {filteredWebhooks.length === 0 && (
        <Card className="text-center py-12">
          <CardContent>
            <Webhook className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <CardTitle className="mb-2">No se encontraron webhooks</CardTitle>
            <CardDescription className="mb-4">
              {searchTerm ? 
                "No hay webhooks que coincidan con tu búsqueda" :
                "Comienza creando tu primer webhook para conectar con aplicaciones externas"
              }
            </CardDescription>
            {!searchTerm && (
              <Button onClick={() => setIsCreateModalOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Crear tu primer webhook
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Create Modal */}
      <WebhookCreateModal 
        open={isCreateModalOpen}
        onOpenChange={setIsCreateModalOpen}
        systemId={systemId}
      />
    </div>
  )
} 