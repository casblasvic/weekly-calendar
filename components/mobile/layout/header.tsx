"use client"

import { Bell, Menu } from "lucide-react"
import { Button } from "@/components/ui/button"
import { format } from "date-fns"
import { es } from "date-fns/locale"

interface MobileHeaderProps {
  onMenuClick: () => void
  onNotificationsClick: () => void
  currentDate: Date
}

export function MobileHeader({ onMenuClick, onNotificationsClick, currentDate }: MobileHeaderProps) {
  return (
    <header className="bg-white px-4 py-3 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onMenuClick}>
          <Menu className="h-6 w-6" />
        </Button>
        <div>
          <div className="text-xl font-semibold">LOGO</div>
          <div className="text-xs text-purple-600">
            {format(currentDate, "EEEE, d 'de' MMMM 'de' yyyy, HH:mm", { locale: es })}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" className="relative" onClick={onNotificationsClick}>
          <Bell className="h-6 w-6" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
        </Button>
        <Button variant="ghost" size="icon" className="w-8 h-8 rounded-full bg-gray-100">
          <span className="text-sm font-medium">RA</span>
        </Button>
      </div>
    </header>
  )
}

