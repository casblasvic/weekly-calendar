"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  Instagram, 
  Facebook, 
  Twitter, 
  MessageCircle, 
  Mail,
  Share2,
  Clock,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Users,
  BarChart2
} from "lucide-react"
import React from "react"

// Datos de ejemplo para el dashboard
const mockStats = {
  totalInteractions: 156,
  pendingResponses: 23,
  averageResponseTime: "2.5h",
  activeUsers: 89,
  engagementRate: "4.2%",
  channels: {
    instagram: {
      name: "Instagram",
      icon: Instagram,
      color: "from-purple-500 to-pink-500",
      stats: {
        pendingMessages: 8,
        pendingComments: 12,
        newFollowers: 15,
        totalInteractions: 45
      }
    },
    facebook: {
      name: "Facebook",
      icon: Facebook,
      color: "from-blue-500 to-blue-600",
      stats: {
        pendingMessages: 5,
        pendingComments: 7,
        newLikes: 20,
        totalInteractions: 38
      }
    },
    twitter: {
      name: "Twitter",
      icon: Twitter,
      color: "from-blue-400 to-blue-500",
      stats: {
        pendingMentions: 3,
        pendingDMs: 4,
        newFollowers: 8,
        totalInteractions: 25
      }
    },
    whatsapp: {
      name: "WhatsApp",
      icon: MessageCircle,
      color: "from-green-500 to-green-600",
      stats: {
        pendingMessages: 15,
        newContacts: 5,
        totalInteractions: 32
      }
    },
    email: {
      name: "Email",
      icon: Mail,
      color: "from-red-500 to-red-600",
      stats: {
        pendingEmails: 6,
        newSubscribers: 3,
        totalInteractions: 16
      }
    }
  }
}

const mockRecentInteractions = [
  {
    id: 1,
    channel: "instagram",
    type: "comment",
    user: "María García",
    content: "¿Cuánto cuesta el tratamiento facial?",
    timestamp: "5m",
    status: "pending"
  },
  {
    id: 2,
    channel: "whatsapp",
    type: "message",
    user: "Juan Pérez",
    content: "Necesito agendar una cita urgente",
    timestamp: "15m",
    status: "pending"
  },
  {
    id: 3,
    channel: "facebook",
    type: "message",
    user: "Ana Martínez",
    content: "¿Tienen descuentos para parejas?",
    timestamp: "30m",
    status: "pending"
  },
  {
    id: 4,
    channel: "twitter",
    type: "mention",
    user: "@carlosruiz",
    content: "¿Qué horarios tienen disponibles?",
    timestamp: "1h",
    status: "pending"
  },
  {
    id: 5,
    channel: "email",
    type: "email",
    user: "Laura Torres",
    content: "Consulta sobre tratamientos",
    timestamp: "2h",
    status: "pending"
  }
]

export default function SocialDashboard() {
  const [selectedInteraction, setSelectedInteraction] = useState(mockRecentInteractions[0])
  const [newResponse, setNewResponse] = useState("")

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Share2 className="w-8 h-8 text-purple-600" />
          <h1 className="text-2xl font-semibold">Dashboard de Redes Sociales</h1>
        </div>
        <div className="flex items-center gap-4">
          <Button variant="outline" className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            <span>Últimas 24h</span>
          </Button>
          <Button className="bg-purple-600 hover:bg-purple-700">
            <TrendingUp className="w-4 h-4 mr-2" />
            Ver Reportes
          </Button>
        </div>
      </div>

      {/* Estadísticas generales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Interacciones</p>
              <h3 className="text-2xl font-semibold">{mockStats.totalInteractions}</h3>
            </div>
            <div className="p-2 bg-purple-100 rounded-lg">
              <BarChart2 className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Pendientes de Respuesta</p>
              <h3 className="text-2xl font-semibold">{mockStats.pendingResponses}</h3>
            </div>
            <div className="p-2 bg-red-100 rounded-lg">
              <AlertCircle className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Tiempo Medio de Respuesta</p>
              <h3 className="text-2xl font-semibold">{mockStats.averageResponseTime}</h3>
            </div>
            <div className="p-2 bg-blue-100 rounded-lg">
              <Clock className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Usuarios Activos</p>
              <h3 className="text-2xl font-semibold">{mockStats.activeUsers}</h3>
            </div>
            <div className="p-2 bg-green-100 rounded-lg">
              <Users className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </Card>
      </div>

      {/* Estadísticas por canal */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Object.entries(mockStats.channels).map(([key, channel]) => (
          <Card key={key} className="p-4">
            <div className="flex items-center gap-3 mb-4">
              <div className={`p-2 rounded-lg bg-gradient-to-r ${channel.color}`}>
                {React.createElement(channel.icon, {
                  className: "w-5 h-5 text-white"
                })}
              </div>
              <h3 className="font-medium">{channel.name}</h3>
            </div>

            <div className="space-y-3">
              {Object.entries(channel.stats).map(([statKey, value]) => (
                <div key={statKey} className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">
                    {statKey.replace(/([A-Z])/g, ' $1').toLowerCase()}
                  </span>
                  <Badge variant={value > 0 ? "default" : "secondary"}>
                    {value}
                  </Badge>
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>

      {/* Interacciones recientes y respuesta */}
      <div className="grid grid-cols-12 gap-4">
        <Card className="col-span-4 p-4">
          <h3 className="font-medium mb-4">Interacciones Recientes</h3>
          <div className="space-y-2">
            {mockRecentInteractions.map((interaction) => (
              <div
                key={interaction.id}
                className={`p-3 rounded-lg cursor-pointer hover:bg-gray-50 ${
                  selectedInteraction?.id === interaction.id ? "bg-purple-50" : ""
                }`}
                onClick={() => setSelectedInteraction(interaction)}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg bg-gradient-to-r ${
                    mockStats.channels[interaction.channel].color
                  }`}>
                    {React.createElement(mockStats.channels[interaction.channel].icon, {
                      className: "w-5 h-5 text-white"
                    })}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{interaction.user}</span>
                      <span className="text-sm text-gray-500">{interaction.timestamp}</span>
                    </div>
                    <p className="text-sm text-gray-600 truncate">{interaction.content}</p>
                    {interaction.status === "pending" && (
                      <Badge variant="destructive" className="mt-1">
                        Pendiente
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="col-span-8 p-4 flex flex-col">
          {selectedInteraction ? (
            <>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg bg-gradient-to-r ${
                    mockStats.channels[selectedInteraction.channel].color
                  }`}>
                    {React.createElement(mockStats.channels[selectedInteraction.channel].icon, {
                      className: "w-5 h-5 text-white"
                    })}
                  </div>
                  <div>
                    <h3 className="font-medium">{selectedInteraction.user}</h3>
                    <span className="text-sm text-gray-500">
                      {selectedInteraction.timestamp}
                    </span>
                  </div>
                </div>
                <Badge variant="outline">
                  {selectedInteraction.type}
                </Badge>
              </div>

              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <p className="text-gray-700">{selectedInteraction.content}</p>
              </div>

              <div className="flex-1 flex flex-col">
                <textarea
                  value={newResponse}
                  onChange={(e) => setNewResponse(e.target.value)}
                  placeholder="Escribe tu respuesta..."
                  className="flex-1 p-3 border rounded-lg mb-4 resize-none"
                />
                <div className="flex justify-end gap-2">
                  <Button variant="outline">Cancelar</Button>
                  <Button className="bg-purple-600 hover:bg-purple-700">
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Enviar Respuesta
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500">
              Selecciona una interacción para responder
            </div>
          )}
        </Card>
      </div>
    </div>
  )
} 