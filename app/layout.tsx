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
import { useEffect, useState } from "react"
import { initializeDataService, type SupabaseConnectionConfig } from "@/services/data"

export default function RootLayout({ children }: { children: React.ReactNode }) {
  
  const [isDataServiceInitialized, setIsDataServiceInitialized] = useState(false);

  useEffect(() => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error("Error: Faltan las variables de entorno de Supabase...");
      return; 
    }

    const config: SupabaseConnectionConfig = {
      url: supabaseUrl,
      apiKey: supabaseAnonKey,
      schema: 'public'
    };

    initializeDataService(config)
      .then(() => {
        setIsDataServiceInitialized(true);
        console.log("Servicio de datos inicializado correctamente.");
      })
      .catch(error => {
        console.error('Error al inicializar el servicio de datos:', error);
      });
  }, []);
  
  return (
    <html lang="es" suppressHydrationWarning>
      <body>
        {!isDataServiceInitialized ? (
          <div className="flex items-center justify-center h-screen">
            Cargando servicio de datos...
          </div>
        ) : (
          <>
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
          </>
        )}
      </body>
    </html>
  )
}