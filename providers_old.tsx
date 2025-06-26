import { SessionProvider } from "next-auth/react"
// import { AuthProvider } from "@/contexts/auth-context"
import { InterfazProvider } from "@/contexts/interfaz-Context"
import { ThemeProvider } from "next-themes"
import { AppointmentTagsProvider } from "@/contexts/appointment-tags-context"
import { ClinicProvider } from "@/contexts/clinic-context"
import { EmployeeProvider } from "@/contexts/employee-context"
import { ClientProvider } from "@/contexts/client-context"
import GlobalSettingsProvider from "@/contexts/data-context"
import { ClinicScheduleProvider } from "@/contexts/clinic-schedule-context"
import { QueryClientProvider } from "@tanstack/react-query"
import { getQueryClient } from "@/lib/query-client"
import { useState } from "react"
import { AppPrefetcher } from "@/lib/app-prefetcher"

export function Providers({ children }: { children: React.ReactNode }) {
  // Usar useState para asegurar que el queryClient se crea solo una vez
  const [queryClient] = useState(() => getQueryClient())

  return (
    <QueryClientProvider client={queryClient}>
      <AppPrefetcher />
      <ThemeProvider
        attribute="class"
        defaultTheme="light"
        enableSystem
        disableTransitionOnChange
      >
        <InterfazProvider>
          <SessionProvider>
            <GlobalSettingsProvider>
              <ClinicProvider>
                <EmployeeProvider>
                  <ClientProvider>
                    <AppointmentTagsProvider>
                      <ClinicScheduleProvider>
                        {children}
                      </ClinicScheduleProvider>
                    </AppointmentTagsProvider>
                  </ClientProvider>
                </EmployeeProvider>
              </ClinicProvider>
            </GlobalSettingsProvider>
          </SessionProvider>
        </InterfazProvider>
      </ThemeProvider>
    </QueryClientProvider>
  )
} 