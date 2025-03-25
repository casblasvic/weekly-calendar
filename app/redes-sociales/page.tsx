"use client"

import { Card } from "@/components/ui/card"
import { Instagram, Facebook, MessageCircle, Share2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"

export default function RedesSocialesPage() {
  const socialStats = [
    {
      platform: "Instagram",
      icon: Instagram,
      color: "bg-gradient-to-r from-purple-500 to-pink-500",
      stats: {
        pendingMessages: 3,
        pendingComments: 8,
        newFollowers: 12
      }
    },
    {
      platform: "Facebook",
      icon: Facebook,
      color: "bg-blue-600",
      stats: {
        pendingMessages: 1,
        pendingComments: 4,
        newLikes: 15
      }
    },
    {
      platform: "WhatsApp Business",
      icon: MessageCircle,
      color: "bg-green-600",
      stats: {
        pendingMessages: 5,
        newContacts: 2
      }
    }
  ]

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3 mb-8">
        <Share2 className="w-6 h-6 text-purple-600" />
        <h1 className="text-2xl font-semibold">Redes Sociales</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {socialStats.map((platform) => (
          <Card key={platform.platform} className="p-4">
            <div className="flex items-center gap-3 mb-4">
              <div className={`p-2 rounded-lg ${platform.color}`}>
                <platform.icon className="w-5 h-5 text-white" />
              </div>
              <h2 className="text-lg font-medium">{platform.platform}</h2>
            </div>

            <div className="space-y-3">
              {Object.entries(platform.stats).map(([key, value]) => (
                <div key={key} className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">
                    {key.replace(/([A-Z])/g, ' $1').toLowerCase()}
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
    </div>
  )
} 