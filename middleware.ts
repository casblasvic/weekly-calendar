import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// Rutas que requieren autenticación
const PROTECTED_ROUTES = ["/dashboard", "/settings", "/appointments", "/clients"]

// Rutas públicas (no requieren autenticación)
const PUBLIC_ROUTES = ["/login", "/register", "/forgot-password", "/reset-password"]

// Esta función se ejecuta antes de cada petición
export function middleware(request: NextRequest) {
  // Simplemente pasamos la petición sin modificarla
  return NextResponse.next();
}

// Configurar para que se ejecute en todas las rutas excepto las de API y las estáticas
export const config = {
  matcher: [
    // Excluyendo rutas de API, archivos estáticos e imágenes
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.png$).*)'
  ]
};

