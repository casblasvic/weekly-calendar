"use client"

import { useState, useEffect, useRef } from "react"
import dynamic from "next/dynamic"
import { useRouter } from "next/navigation"
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
  // Estado para controlar si es la primera renderización
  const [hasRendered, setHasRendered] = useState(false)
  
  // Estado para almacenar una clave estable para forzar re-renderizado limpio
  const [mountKey, setMountKey] = useState(() => Date.now())
  
  // Referencia para prevenir actualizaciones múltiples en cascada
  const isUpdatingRef = useRef(false)
  const previousViewRef = useRef(initialView)
  const previousDateRef = useRef(date)
  
  // Efecto para marcar la primera renderización y prevenir actualizaciones en cadena
  useEffect(() => {
    if (!hasRendered) {
      setHasRendered(true)
    }
    
    return () => {
      // Limpiar el estado de actualización al desmontar
      isUpdatingRef.current = false
    }
  }, [hasRendered])
  
  // Efecto para forzar un solo remontaje cuando cambia la fecha o vista
  useEffect(() => {
    // Solamente ejecutar si ya se ha renderizado y no estamos actualizando
    if (hasRendered && !isUpdatingRef.current) {
      // Verificar si realmente cambiaron los valores antes de actualizar
      if (previousViewRef.current !== initialView || previousDateRef.current !== date) {
        // Marcar que estamos en proceso de actualización
        isUpdatingRef.current = true
        
        // Actualizar referencias
        previousViewRef.current = initialView
        previousDateRef.current = date
        
        // Generar una nueva clave de montaje después de un pequeño retraso
        // para permitir que el navegador actualice el DOM
        setTimeout(() => {
          setMountKey(Date.now())
          
          // Desbloquear actualizaciones después de completar
          setTimeout(() => {
            isUpdatingRef.current = false
          }, 50)
        }, 50)
      }
    }
  }, [date, initialView, hasRendered])

  // Memorizar las claves para evitar regeneración en cada render
  const mobileViewKey = `mobile-view-${mountKey}`
  const desktopViewKey = `desktop-view-${mountKey}`
  const containerKey = `agenda-container-${date}-${initialView}-${mountKey}`

  return (
    <>
      {/* Vista para móvil (renderizada en cliente) */}
      <div className="lg:hidden" key={mobileViewKey}>
        <MobileAgendaView showMainSidebar={false} />
      </div>
      
      {/* Vista para escritorio */}
      <div className="hidden lg:block" key={desktopViewKey}>
        <AgendaContainer 
          key={containerKey} 
          initialDate={date} 
          initialView={initialView} 
        />
      </div>
    </>
  )
} 