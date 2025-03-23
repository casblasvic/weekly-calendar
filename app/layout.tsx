"use client"

import "@/styles/globals.css"
import { ClinicProvider } from "@/contexts/clinic-context"
import { LastClientProvider } from "@/contexts/last-client-context"
import { ClientCardProvider } from "@/contexts/client-card-context"
import { CabinProvider } from "@/contexts/CabinContext"
import { FamilyProvider } from "@/contexts/family-context"
import { ServicioProvider } from "@/contexts/servicios-context"
import { ConsumoServicioProvider } from "@/contexts/consumo-servicio-context"
import { EquipmentProvider } from "@/contexts/equipment-context"
import { SystemProvider } from "@/contexts/system"
import { StorageInitializer } from "@/components/storage-initializer"
import { Toaster } from "@/app/components/ui/toaster"
import { ThemeProvider as AppThemeProvider } from "@/contexts/theme"
import { AppProviders } from '@/contexts'
import { LayoutWrapper } from "@/components/LayoutWrapper"

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
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