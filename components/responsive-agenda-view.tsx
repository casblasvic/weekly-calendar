"use client"

import dynamic from "next/dynamic"
import AgendaContainer from "@/components/agenda-container"

// Importar MobileAgendaView de manera dinámica para evitar errores de SSR
const MobileAgendaView = dynamic(
  () => import("@/components/mobile/agenda/agenda-view").then((mod) => mod.MobileAgendaView),
  { ssr: false }
)

interface ResponsiveAgendaViewProps {
  date: string
  initialView: "day" | "week"
}

export default function ResponsiveAgendaView({ date, initialView }: ResponsiveAgendaViewProps) {
  return (
    <>
      {/* Vista para móvil (renderizada en cliente) */}
      <div className="lg:hidden">
        <MobileAgendaView showMainSidebar={false} />
      </div>
      
      {/* Vista para escritorio */}
      <div className="hidden lg:block">
        <AgendaContainer initialDate={date} initialView={initialView} />
      </div>
    </>
  )
} 