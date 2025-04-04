import { AuthProvider } from "@/contexts/auth-context"
import { InterfazProvider } from "@/contexts/interfaz-Context"
import { ThemeProvider } from "@/contexts/theme-provider"
import { AppointmentProvider } from "@/contexts/appointment-context"
import { ClinicProvider } from "@/contexts/clinic-context"
import { EmployeeProvider } from "@/contexts/employee-context"
import { ClientProvider } from "@/contexts/client-context"
import { GlobalSettingsProvider } from "@/contexts/settings-context"
import { ClinicScheduleProvider } from "@/contexts/clinic-schedule-context"

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="light"
      enableSystem
      disableTransitionOnChange
    >
      <InterfazProvider>
        <AuthProvider>
          <GlobalSettingsProvider>
            <ClinicProvider>
              <ClinicScheduleProvider>
                <EmployeeProvider>
                  <ClientProvider>
                    <AppointmentProvider>{children}</AppointmentProvider>
                  </ClientProvider>
                </EmployeeProvider>
              </ClinicScheduleProvider>
            </ClinicProvider>
          </GlobalSettingsProvider>
        </AuthProvider>
      </InterfazProvider>
    </ThemeProvider>
  )
} 