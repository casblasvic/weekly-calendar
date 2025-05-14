"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { CustomDatePicker } from "@/components/custom-date-picker"
import { HelpCircle } from "lucide-react"
import Link from "next/link"

interface NotificationSetting {
  id: string
  label: string
  enabled: boolean
}

export default function AvisosPage() {
  const [expirationDate, setExpirationDate] = useState<Date | null>(null)
  const [notificationContent, setNotificationContent] = useState("")
  const [notifications, setNotifications] = useState<NotificationSetting[]>([
    {
      id: "create-appointment",
      label: "Al crear cita",
      enabled: false,
    },
    {
      id: "check-appointment",
      label: "Al consultar cita",
      enabled: false,
    },
    {
      id: "validate-appointment",
      label: "Al validar una cita",
      enabled: false,
    },
    {
      id: "check-ticket",
      label: "Al consultar el ticket",
      enabled: false,
    },
  ])

  const handleNotificationToggle = (id: string) => {
    setNotifications(
      notifications.map((notification) =>
        notification.id === id ? { ...notification, enabled: !notification.enabled } : notification,
      ),
    )
  }

  const handleSubmit = () => {
    console.log({
      notifications,
      expirationDate,
      notificationContent,
    })
  }

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="grid gap-6 md:grid-cols-2">
          {/* Left Column - Notification Settings */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Avisos habilitados</h3>
            <div className="space-y-4">
              {notifications.map((notification) => (
                <div key={notification.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={notification.id}
                    checked={notification.enabled}
                    onCheckedChange={() => handleNotificationToggle(notification.id)}
                    className="checkbox-purple"
                  />
                  <Label
                    htmlFor={notification.id}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    {notification.label}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* Right Column - Date and Content */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="expiration-date">Fecha de caducidad</Label>
              <CustomDatePicker
                value={expirationDate}
                onChange={setExpirationDate}
                onBlur={() => {}}
                name="expiration-date"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notification-content">Contenido del aviso</Label>
              <Textarea
                id="notification-content"
                value={notificationContent}
                onChange={(e) => setNotificationContent(e.target.value)}
                className="min-h-[150px] resize-none"
                placeholder="Escriba el contenido del aviso aquí..."
              />
            </div>
          </div>
        </div>
      </Card>

      {/* Action Buttons - Footer style */}
      <div className="fixed bottom-0 md:bottom-8 right-0 md:right-8 flex items-center gap-1 z-40 w-full md:w-auto justify-end px-4 py-2 bg-white/80 backdrop-blur-md border-t border-gray-200 md:border-0 md:bg-transparent md:backdrop-blur-0 md:py-0">
        <Button size="sm" className="h-8 px-2 bg-purple-600 hover:bg-purple-700 rounded-md text-xs" onClick={handleSubmit}>
          Guardar
        </Button>
        <Button variant="outline" size="sm" className="h-8 w-8 p-0 rounded-full bg-black text-white hover:bg-gray-800">
          <HelpCircle className="h-4 w-4" />
        </Button>
      </div>
      
      {/* Spacer to prevent content from being hidden behind fixed buttons */}
      <div className="h-12"></div>
    </div>
  )
}

