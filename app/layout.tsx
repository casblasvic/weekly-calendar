"use client"

import "@/styles/globals.css"
import { AppProviders } from '@/contexts'
import { ThemeProvider } from "@/app/contexts/theme-context"
import { SystemProvider } from "@/app/contexts/system-context"
import { DatabaseProvider } from '@/contexts/database-context'
import { ClinicProvider } from '@/contexts/clinic-context'
import { InterfazProvider } from '@/contexts/interfaz-Context'
import { LastClientProvider } from '@/contexts/last-client-context'
import { Toaster } from "@/app/components/ui/toaster"
import { InitializeData } from './components/InitializeData'
import { LayoutWrapper } from "@/components/LayoutWrapper"

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <body>
        <ThemeProvider>
          <SystemProvider>
            <DatabaseProvider>
              <InterfazProvider>
                <ClinicProvider>
                  <LastClientProvider>
                    <AppProviders>
                      <LayoutWrapper>
                        <InitializeData />
                        {children}
                      </LayoutWrapper>
                      <Toaster />
                    </AppProviders>
                  </LastClientProvider>
                </ClinicProvider>
              </InterfazProvider>
            </DatabaseProvider>
          </SystemProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}