"use client"

import type React from "react"
import "@/styles/globals.css"
import { LastClientProvider } from "@/contexts/last-client-context"
import { ClientCardProvider } from "@/contexts/client-card-context"
import { ThemeProvider as AppThemeProvider } from "@/app/contexts/theme-context"
import { LayoutWrapper } from "@/components/LayoutWrapper"
import { CabinProvider } from "@/contexts/CabinContext"
import { ClinicProvider } from "@/contexts/clinic-context"
import { FamilyProvider } from "@/contexts/family-context"
import { ServicioProvider } from "@/contexts/servicios-context"
import { ConsumoServicioProvider } from "@/contexts/consumo-servicio-context"
import { EquipmentProvider } from "@/contexts/equipment-context"
import { AppProviders } from '@/contexts'
import { StorageInitializer } from "@/components/storage-initializer"
import { Toaster } from "@/app/components/ui/toaster"
import { SystemProvider } from "@/app/contexts/system-context"

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        <StorageInitializer />
        <AppThemeProvider>
          <AppProviders>
            <SystemProvider>
              <EquipmentProvider>
                <ClinicProvider>
                  <FamilyProvider>
                    <CabinProvider>
                      <LastClientProvider>
                        <ClientCardProvider>
                          <ServicioProvider>
                            <ConsumoServicioProvider>
                              <LayoutWrapper>{children}</LayoutWrapper>
                              <Toaster />
                            </ConsumoServicioProvider>
                          </ServicioProvider>
                        </ClientCardProvider>
                      </LastClientProvider>
                    </CabinProvider>
                  </FamilyProvider>
                </ClinicProvider>
              </EquipmentProvider>
            </SystemProvider>
          </AppProviders>
        </AppThemeProvider>
      </body>
    </html>
  )
}

import './globals.css'