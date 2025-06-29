"use client"

import { useEffect, useState } from "react"
import { SessionProvider } from "next-auth/react"
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
import { DatabaseProvider } from "@/contexts/database-context"
import I18nProviderClient from "@/lib/i18n-provider-client"
import { QueryProvider } from '@/components/providers/query-provider'

interface ProvidersWrapperProps {
  children: React.ReactNode
  session?: any
}

export function ProvidersWrapper({ children, session }: ProvidersWrapperProps) {
  return (
    <SessionProvider session={session}>
      <I18nProviderClient>
        <StorageInitializer />
        <ThemeProvider>
          <DatabaseProvider>
            <SystemProvider>
              <QueryProvider>
                <AppProviders>
                  <EquipmentProvider>
                    <FamilyProvider>
                      <CabinProvider>
                        <LastClientProvider>
                          <ClientCardProvider>
                            <ServicioProvider>
                              <ConsumoServicioProvider>
                                {children}
                                <Toaster />
                              </ConsumoServicioProvider>
                            </ServicioProvider>
                          </ClientCardProvider>
                        </LastClientProvider>
                      </CabinProvider>
                    </FamilyProvider>
                  </EquipmentProvider>
                </AppProviders>
              </QueryProvider>
            </SystemProvider>
          </DatabaseProvider>
        </ThemeProvider>
      </I18nProviderClient>
    </SessionProvider>
  );
} 