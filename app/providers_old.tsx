"use client"

import { ServicioProvider } from "@/contexts/servicios-context"
import { ConsumoServicioProvider } from "@/contexts/consumo-servicio-context"

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ServicioProvider>
      <ConsumoServicioProvider>
        {children}
      </ConsumoServicioProvider>
    </ServicioProvider>
  )
} 