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
import { SystemProvider } from "@/app/contexts/system-context"
import { StorageInitializer } from "@/components/storage-initializer"
import { Toaster } from "@/app/components/ui/toaster"
import { ThemeProvider } from "@/app/contexts/theme-context"
import { AppProviders } from '@/contexts'
import { LayoutWrapper } from "@/components/LayoutWrapper"
import { DatabaseProvider } from "@/contexts/database-context"
import { useEffect } from "react"
import { initializeDataService } from "@/services/data"

export default function RootLayout({ children }: { children: React.ReactNode }) {
  
  // Inicializar el servicio de datos al cargar la aplicación
  useEffect(() => {
    initializeDataService().catch(error => {
      console.error('Error al inicializar el servicio de datos:', error);
    });
  }, []);
  
  return (
    <html lang="es" suppressHydrationWarning>
      <body>
        <StorageInitializer />
        <ThemeProvider>
          <DatabaseProvider>
            <SystemProvider>
              <AppProviders>
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
              </AppProviders>
            </SystemProvider>
          </DatabaseProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}