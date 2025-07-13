"use client"

import "@/styles/globals.css"
import { useEffect, useState } from "react"
import { ThemeProvider } from "@/app/contexts/theme-context"
import { SystemProvider } from "@/app/contexts/system-context"
import { Toaster } from "@/app/components/ui/toaster"
import { DatabaseProvider } from "@/contexts/database-context"
import { StorageInitializer } from "@/components/storage-initializer"
import { DataProviders } from "@/contexts/data-providers"
import { UIProviders } from "@/contexts/ui-providers"
import { LayoutWrapper } from "@/components/LayoutWrapper"

// ⚡ COMPONENTE DE LOADING OPTIMIZADO
const LoadingFallback = ({ message }: { message: string }) => (
  <div className="flex items-center justify-center min-h-screen bg-background">
    <div className="text-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
      <p className="text-muted-foreground text-sm">{message}</p>
    </div>
  </div>
)

// ⚡ INICIALIZACIÓN DIFERIDA - No bloquea renderizado inicial
const DeferredInitializer = () => {
  const [shouldInitialize, setShouldInitialize] = useState(false)

  useEffect(() => {
    // Diferir inicialización pesada hasta que el renderizado inicial esté completo
    const timer = setTimeout(() => {
      setShouldInitialize(true)
    }, 100) // Muy pequeño delay para no bloquear renderizado inicial

    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    if (shouldInitialize) {
      // Inicializar servicio de datos de forma asíncrona sin bloquear
      import("@/services/data").then(({ initializeDataService }) => {
        initializeDataService().catch(error => {
          console.error('Error al inicializar el servicio de datos:', error)
        })
      })
    }
  }, [shouldInitialize])

  return shouldInitialize ? <StorageInitializer /> : null
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body>
        {/* ✅ PROVIDERS CRÍTICOS - Se cargan inmediatamente */}
        <ThemeProvider>
          <SystemProvider>
            {/* ✅ INICIALIZACIÓN DIFERIDA - No bloquea renderizado inicial */}
            <DeferredInitializer />
            
                        {/* ✅ PROVIDERS SECUNDARIOS - Carga diferida para mejor rendimiento */}
            <DatabaseProvider>
              <DataProviders>
                <UIProviders>
                  <LayoutWrapper>{children}</LayoutWrapper>
                </UIProviders>
              </DataProviders>
            </DatabaseProvider>
            
            <Toaster />
          </SystemProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}