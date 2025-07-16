import "@/app/globals.css"
import { ProvidersWrapper } from "@/app/components/providers-wrapper"
import { GhostSocketMonitorProvider } from "@/components/providers/ghost-socket-monitor-provider"
import { auth } from "@/lib/auth"
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Weekly Calendar - Gestión de Clínicas',
  description: 'Sistema de gestión para clínicas y centros de belleza',
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  
  return (
    <html lang="es" suppressHydrationWarning>
      <body>
        <ProvidersWrapper session={session}>
          {children}
        </ProvidersWrapper>
        <GhostSocketMonitorProvider />
      </body>
    </html>
  )
}