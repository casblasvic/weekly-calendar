"use client"

import { useEffect, useState } from "react"
import WeeklyAgenda from "@/components/weekly-agenda"
import { MobileAgendaView } from "@/components/mobile/agenda/agenda-view"
import { HydrationWrapper } from "@/components/hydration-wrapper"

export default function AgendaPage() {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }

    checkMobile()
    window.addEventListener("resize", checkMobile)
    return () => window.removeEventListener("resize", checkMobile)
  }, [])

  return (
    <HydrationWrapper fallback={<div className="flex items-center justify-center h-screen">Cargando agenda...</div>}>
      {isMobile ? <MobileAgendaView /> : <WeeklyAgenda />}
    </HydrationWrapper>
  )
}

