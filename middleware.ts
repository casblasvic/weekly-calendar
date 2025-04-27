export { default } from "next-auth/middleware"

// No necesitamos NextResponse ni NextRequest directamente si usamos el middleware de next-auth
// import { NextResponse } from "next/server"
// import type { NextRequest } from "next/server"

// Las rutas definidas aquí ya no son necesarias con la configuración del matcher
// const PROTECTED_ROUTES = ["/dashboard", "/settings", "/appointments", "/clients"]
// const PUBLIC_ROUTES = ["/login", "/register", "/forgot-password", "/reset-password"]

// La función middleware explícita ya no es necesaria si usamos el export default
// export function middleware(request: NextRequest) {
//   return NextResponse.next();
// }

// Configurar para que se ejecute en todas las rutas excepto las públicas y las de sistema
export const config = {
  matcher: [
    // Aplicar a todas las rutas excepto:
    // - /api/...
    // - /_next/static/...
    // - /_next/image/...
    // - Archivos de imagen (png, jpg, etc.)
    // - favicon.ico
    // - /login, /register, etc. (Rutas públicas)
    '/((?!api|_next/static|_next/image|.*\\.(?:png|jpg|jpeg|gif|webp|svg)$|favicon.ico|login|register|forgot-password|reset-password).*)',
  ],
};

