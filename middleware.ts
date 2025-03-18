import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// Rutas que requieren autenticación
const PROTECTED_ROUTES = ["/dashboard", "/settings", "/appointments", "/clients"]

// Rutas públicas (no requieren autenticación)
const PUBLIC_ROUTES = ["/login", "/register", "/forgot-password", "/reset-password"]

// Este middleware se ejecuta en cada solicitud
export function middleware(request: NextRequest) {
  const response = NextResponse.next()

  // Obtener la ruta actual
  const { pathname } = request.nextUrl

  // Verificar si es una ruta protegida
  const isProtectedRoute = PROTECTED_ROUTES.some((route) => pathname.startsWith(route))

  // Verificar si es una ruta pública
  const isPublicRoute = PUBLIC_ROUTES.some((route) => pathname.startsWith(route))

  // Verificar si el usuario está autenticado
  const authCookie = request.cookies.get("auth_user")
  const isAuthenticated = !!authCookie

  // Redirigir según el estado de autenticación
  if (isProtectedRoute && !isAuthenticated) {
    // Redirigir a la página de login si intenta acceder a una ruta protegida sin autenticación
    return NextResponse.redirect(new URL("/login", request.url))
  }

  if (isPublicRoute && isAuthenticated) {
    // Redirigir al dashboard si intenta acceder a una ruta pública estando autenticado
    return NextResponse.redirect(new URL("/dashboard", request.url))
  }

  // Añadir encabezados de seguridad para cookies
  response.headers.set("X-Content-Type-Options", "nosniff")
  response.headers.set("X-Frame-Options", "DENY")
  response.headers.set("X-XSS-Protection", "1; mode=block")

  return response
}

// Configurar en qué rutas se ejecuta el middleware
export const config = {
  matcher: [
    /*
     * Coincide con todas las rutas excepto:
     * 1. /api (rutas API)
     * 2. /_next (archivos internos de Next.js)
     * 3. /_static (si usas imágenes estáticas)
     * 4. /favicon.ico, /robots.txt, etc.
     */
    "/((?!api|_next|_static|favicon.ico|robots.txt).*)",
  ],
}

