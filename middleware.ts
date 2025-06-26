import { auth } from "@/lib/auth-edge";

// Exportamos directamente la función auth como middleware
export default auth;

// Configuración del matcher para especificar qué rutas proteger
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/auth (authentication routes)
     * - api/webhooks (webhook endpoints - must be public)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - login (login page)
     */
    '/((?!api/auth|api/webhooks|_next/static|_next/image|favicon.ico|login).*)',
  ],
};
