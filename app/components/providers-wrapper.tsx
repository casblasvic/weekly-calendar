/**
 * providers-wrapper.tsx - ARQUITECTURA DE SEGURIDAD DE PROVIDERS
 * 
 * 🔐 FUNCIÓN CRÍTICA:
 * Este archivo implementa la arquitectura de seguridad que separa providers públicos
 * de providers sensibles, evitando que se carguen datos confidenciales en la página de login.
 * 
 * 🏗️ ARQUITECTURA DE PROVIDERS:
 * 
 * 📁 PROVIDERS PÚBLICOS (siempre disponibles):
 * - SessionProvider: Manejo de sesiones NextAuth
 * - I18nProviderClient: Internacionalización
 * - ThemeProvider: Temas y estilos
 * - DatabaseProvider: Configuración de BD
 * - SystemProvider: Configuración del sistema
 * - QueryProvider: React Query
 * 
 * 🔒 PROVIDERS SENSIBLES (solo con autenticación):
 * - ClinicProvider: Datos de clínicas
 * - UserProvider: Información de usuarios
 * - ClientProvider: Datos de clientes
 * - FileProvider: Gestión de archivos
 * - StorageProvider: Almacenamiento
 * - ScheduleTemplatesProvider: Plantillas de horarios
 * - Y TODOS los demás que acceden a datos confidenciales
 * 
 * 🛡️ MECANISMO DE SEGURIDAD:
 * 
 * 1. AuthenticatedProviders verifica:
 *    - pathname === '/login' → NO cargar providers sensibles
 *    - status === 'authenticated' → SÍ cargar providers sensibles
 * 
 * 2. Previene COMPLETAMENTE:
 *    - Fetch de datos sensibles en login
 *    - Exposición de información confidencial
 *    - Errores de contexto durante transiciones
 * 
 * 🔄 FLUJO DE CARGA DE PROVIDERS:
 * 
 * EN LOGIN (/login):
 * ✅ Providers públicos → Cargados
 * ❌ Providers sensibles → NO cargados
 * 📊 Resultado: Solo funcionalidad básica, sin datos sensibles
 * 
 * EN DASHBOARD (/ con autenticación):
 * ✅ Providers públicos → Cargados
 * ✅ Providers sensibles → Cargados
 * 📊 Resultado: Funcionalidad completa con todos los datos
 * 
 * ⚠️ REGLAS CRÍTICAS PARA DESARROLLADORES:
 * 
 * 1. NUNCA agregar providers sensibles fuera de AuthenticatedProviders
 * 2. NUNCA modificar la lógica de detección de login sin coordinación con LayoutWrapper
 * 3. SIEMPRE verificar que nuevos providers estén en la categoría correcta
 * 4. CUALQUIER provider que haga fetch de datos confidenciales DEBE estar en AuthenticatedProviders
 * 
 * 📋 CÓMO AGREGAR NUEVOS PROVIDERS:
 * 
 * ✅ PROVIDER PÚBLICO (sin datos sensibles):
 * ```tsx
 * export function ProvidersWrapper({ children, session }) {
 *   return (
 *     <SessionProvider session={session}>
 *       <NuevoProviderPublico> // ← Aquí
 *         <AuthenticatedProviders>
 *           {children}
 *         </AuthenticatedProviders>
 *       </NuevoProviderPublico>
 *     </SessionProvider>
 *   )
 * }
 * ```
 * 
 * ✅ PROVIDER SENSIBLE (con datos confidenciales):
 * ```tsx
 * function AuthenticatedProviders({ children }) {
 *   // ... verificaciones de seguridad ...
 *   return (
 *     <DataServiceProvider>
 *       <NuevoProviderSensible> // ← Aquí
 *         <ClinicProvider>
 *           {children}
 *         </ClinicProvider>
 *       </NuevoProviderSensible>
 *     </DataServiceProvider>
 *   )
 * }
 * ```
 * 
 * 🚨 PROBLEMAS DE SEGURIDAD PREVENIDOS:
 * 
 * ❌ ANTES (sin esta arquitectura):
 * - Fetch de clientes en login → Exposición de datos
 * - Fetch de usuarios en login → Violación de privacidad  
 * - Fetch de archivos en login → Acceso no autorizado
 * - Logs con información sensible → Fuga de datos
 * 
 * ✅ AHORA (con esta arquitectura):
 * - CERO fetch de datos sensibles en login
 * - Acceso controlado a información confidencial
 * - Transiciones seguras entre estados
 * - Logs limpios sin exposición de datos
 * 
 * 🔧 DEBUGGING Y MONITOREO:
 * Los logs indican claramente el estado:
 * - "🚫 En página de LOGIN - NO cargando providers sensibles"
 * - "✅ AUTENTICADO y NO en login - cargando todos los providers"
 * 
 * 💡 COORDINACIÓN CON OTROS ARCHIVOS:
 * - components/LayoutWrapper.tsx: Controla el layout según autenticación
 * - Ambos usan pathname === '/login' para detectar la página de login
 * - Ambos deben estar sincronizados para funcionamiento correcto
 */

"use client"

import { useEffect, useState, useMemo, memo, useRef } from "react"
import { SessionProvider, useSession } from "next-auth/react"
import { usePathname } from "next/navigation"
// Importar client-logger para cargar funciones globales de logs en el navegador
import '@/lib/utils/client-logger'
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
import { DatabaseProvider } from "@/contexts/database-context"
import I18nProviderClient from "@/lib/i18n-provider-client"
import { QueryProvider } from '@/components/providers/query-provider'
import { GlobalLoadingOverlay } from '@/app/components/global-loading-overlay'

// ✅ PROVIDERS SENSIBLES QUE REQUIEREN AUTENTICACIÓN
import { FileProvider } from '@/contexts/file-context';
import { ImageProvider } from '@/contexts/image-context';
import { DocumentProvider } from '@/contexts/document-context';
import { StorageProvider } from '@/contexts/storage-context';
import { InterfazProvider } from '@/contexts/interfaz-Context';
import { ClientProvider } from '@/contexts/client-context';
import { ScheduleTemplatesProvider } from '@/contexts/schedule-templates-context';
import { ScheduleBlocksProvider } from '@/contexts/schedule-blocks-context';
import { AppointmentTagsProvider } from '@/contexts/appointment-tags-context';
import { DataServiceProvider } from '@/contexts/data-context';
import { UserProvider } from '@/contexts/user-context';
import { ClinicScheduleProvider } from '@/contexts/clinic-schedule-context';
import { ServiceProvider } from '@/contexts/service-context';
import { ClinicProvider } from '@/contexts/clinic-context';

interface ProvidersWrapperProps {
  children: React.ReactNode
  session?: any
}

/**
 * AuthenticatedProviders - NÚCLEO DE SEGURIDAD DE PROVIDERS
 * 
 * 🔐 RESPONSABILIDAD:
 * Controla cuándo se cargan los providers sensibles basándose en:
 * 1. Estado de autenticación (NextAuth)
 * 2. Página actual (pathname)
 * 
 * 🛡️ LÓGICA DE SEGURIDAD:
 * 
 * PASO 1: Verificar página
 * - Si pathname === '/login' → NUNCA cargar providers sensibles
 * - Esto previene fetch de datos confidenciales en login
 * 
 * PASO 2: Verificar autenticación  
 * - Si status === 'loading' → Mostrar spinner, no cargar providers
 * - Si status === 'unauthenticated' → Solo children, no cargar providers
 * - Si status === 'authenticated' → Cargar TODOS los providers sensibles
 * 
 * 🔄 ESTADOS Y COMPORTAMIENTOS:
 * 
 * 🚫 LOGIN PAGE (pathname === '/login'):
 * - Retorna: <>{children}</>
 * - Providers cargados: NINGUNO sensible
 * - Seguridad: Datos confidenciales protegidos
 * 
 * ⏳ LOADING (status === 'loading'):
 * - Retorna: Spinner de carga
 * - Providers cargados: NINGUNO sensible  
 * - UX: Usuario ve que algo está pasando
 * 
 * ❌ UNAUTHENTICATED (status === 'unauthenticated'):
 * - Retorna: <>{children}</>
 * - Providers cargados: NINGUNO sensible
 * - Seguridad: Sin acceso a datos protegidos
 * 
 * ✅ AUTHENTICATED (status === 'authenticated' && !isLoginPage):
 * - Retorna: Todos los providers sensibles anidados
 * - Providers cargados: TODOS los sensibles
 * - Funcionalidad: Aplicación completa disponible
 * 
 * ⚠️ ORDEN DE PROVIDERS SENSIBLES:
 * El orden de anidación es CRÍTICO para dependencias:
 * DataServiceProvider (base) → InterfazProvider → FileProvider → etc.
 * 
 * 🔧 DEBUGGING:
 * Los logs muestran exactamente qué decisión se toma y por qué.
 */
// ✅ MEMOIZAR COMPONENTE PARA EVITAR RE-RENDERIZADOS INNECESARIOS
const AuthenticatedProviders = memo(function AuthenticatedProviders({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession()
  const pathname = usePathname()
  const lastStatusRef = useRef<string>('')
  const lastPathnameRef = useRef<string>('')
  
  // ✅ MEMOIZAR VERIFICACIÓN DE LOGIN PAGE
  const isLoginPage = useMemo(() => pathname === '/login', [pathname])
  
  // ✅ MEMOIZAR ESTADO DE AUTENTICACIÓN
  const authState = useMemo(() => ({
    isLoginPage,
    isLoading: status === "loading",
    isUnauthenticated: status === "unauthenticated" || !session,
    isAuthenticated: status === "authenticated" && !!session
  }), [isLoginPage, status, session])

  // ✅ REDUCIR LOGS - Solo mostrar cuando el estado realmente cambie
  useEffect(() => {
    const currentState = `${status}-${pathname}`;
    const lastState = `${lastStatusRef.current}-${lastPathnameRef.current}`;
    
    if (currentState !== lastState) {
      lastStatusRef.current = status;
      lastPathnameRef.current = pathname;
      
      if (process.env.NODE_ENV === 'development') {
        if (authState.isLoginPage) {
          console.log('🚫 [AuthenticatedProviders] En página de LOGIN - NO cargando providers sensibles')
        } else if (authState.isLoading) {
          console.log('⏳ [AuthenticatedProviders] Cargando autenticación...')
        } else if (authState.isUnauthenticated) {
          console.log('🚫 [AuthenticatedProviders] NO autenticado - renderizando solo children')
        } else if (authState.isAuthenticated) {
          console.log('✅ [AuthenticatedProviders] AUTENTICADO y NO en login - cargando todos los providers')
        }
      }
    }
  }, [authState, status, pathname])
  
  // ✅ SI ESTAMOS EN LOGIN, NUNCA CARGAR PROVIDERS SENSIBLES
  if (authState.isLoginPage) {
    return <>{children}</>
  }
  
  // ✅ SOLO RENDERIZAR PROVIDERS SENSIBLES SI ESTÁ COMPLETAMENTE AUTENTICADO
  if (authState.isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
          <div className="mx-auto mb-4 w-8 h-8 rounded-full border-b-2 border-blue-600 animate-spin"></div>
          <p className="text-gray-600">Verificando autenticación...</p>
        </div>
      </div>
    )
  }
  
  if (authState.isUnauthenticated) {
    // ✅ SI NO ESTÁ AUTENTICADO, SOLO RENDERIZAR CHILDREN SIN PROVIDERS SENSIBLES
    return <>{children}</>
  }
  
  // ✅ SI ESTÁ AUTENTICADO Y NO EN LOGIN, RENDERIZAR TODOS LOS PROVIDERS SENSIBLES
  return (
    <DataServiceProvider>
      <InterfazProvider>
        <FileProvider>
          <StorageProvider>
            <ImageProvider>
              <DocumentProvider>
                <ClientProvider>
                  <UserProvider>
                    <ScheduleTemplatesProvider>
                      <ScheduleBlocksProvider>
                        <AppointmentTagsProvider>
                          <ClinicProvider>
                            <ClinicScheduleProvider>
                              <ServiceProvider>
                                <EquipmentProvider>
                                  <FamilyProvider>
                                    <CabinProvider>
                                      <LastClientProvider>
                                        <ClientCardProvider>
                                          <ServicioProvider>
                                            <ConsumoServicioProvider>
                                              <GlobalLoadingOverlay />
                                              {children}
                                            </ConsumoServicioProvider>
                                          </ServicioProvider>
                                        </ClientCardProvider>
                                      </LastClientProvider>
                                    </CabinProvider>
                                  </FamilyProvider>
                                </EquipmentProvider>
                              </ServiceProvider>
                            </ClinicScheduleProvider>
                          </ClinicProvider>
                        </AppointmentTagsProvider>
                      </ScheduleBlocksProvider>
                    </ScheduleTemplatesProvider>
                  </UserProvider>
                </ClientProvider>
              </DocumentProvider>
            </ImageProvider>
          </StorageProvider>
        </FileProvider>
      </InterfazProvider>
    </DataServiceProvider>
  )
})

export function ProvidersWrapper({ children, session }: ProvidersWrapperProps) {
  return (
    <SessionProvider session={session}>
      <I18nProviderClient>
        <StorageInitializer />
        <ThemeProvider>
          <DatabaseProvider>
            <SystemProvider>
              <QueryProvider>
                {/* ✅ WRAPPER QUE SOLO CARGA PROVIDERS SENSIBLES CUANDO HAY AUTENTICACIÓN */}
                <AuthenticatedProviders>
                  {children}
                </AuthenticatedProviders>
                <Toaster />
              </QueryProvider>
            </SystemProvider>
          </DatabaseProvider>
        </ThemeProvider>
      </I18nProviderClient>
    </SessionProvider>
  );
} 