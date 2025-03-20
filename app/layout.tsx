"use client"

import type React from "react"
import "@/styles/globals.css"
import { LastClientProvider } from "@/contexts/last-client-context"
import { ClientCardProvider } from "@/contexts/client-card-context"
import { ThemeProvider } from "@/contexts/theme-context"
import { LayoutWrapper } from "@/components/LayoutWrapper"
import { CabinProvider } from "@/contexts/CabinContext"
import { ClinicProvider } from "@/contexts/clinic-context"
import { FamilyProvider } from "@/contexts/family-context"
import { ServicioProvider } from "@/contexts/servicios-context"
import { ConsumoServicioProvider } from "@/contexts/consumo-servicio-context"
import { EquipmentProvider } from "@/contexts/equipment-context"

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        <EquipmentProvider>
          <ClinicProvider>
            <FamilyProvider>
              <CabinProvider>
                <LastClientProvider>
                  <ClientCardProvider>
                    <ThemeProvider>
                      <ServicioProvider>
                        <ConsumoServicioProvider>
                          <LayoutWrapper>{children}</LayoutWrapper>
                        </ConsumoServicioProvider>
                      </ServicioProvider>
                    </ThemeProvider>
                  </ClientCardProvider>
                </LastClientProvider>
              </CabinProvider>
            </FamilyProvider>
          </ClinicProvider>
        </EquipmentProvider>
      </body>
    </html>
  )
}

import './globals.css'