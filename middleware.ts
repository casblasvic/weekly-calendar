import NextAuth from "next-auth";
// Importamos SOLO la config base (Edge compatible)
import { authConfig } from "@/lib/auth.config";
// Ya no necesitamos NextResponse o NextRequest aquí si usamos el callback 'authorized'
// import { NextResponse } from 'next/server';
// import type { NextRequest } from 'next/server';

// Usamos la config base para inicializar el middleware
export const { auth: middleware } = NextAuth(authConfig);

// La lógica de protección de rutas y redirección ahora debería manejarse
// principalmente a través del callback 'authorized' en authConfig (si se activa)
// y la configuración 'pages' en authConfig.

// Código anterior comentado (ya estaba comentado)
/*
export default auth((req) => {
...
});
*/

// La configuración del matcher sigue siendo la misma
export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|login|register|images|manifest.json|sw.js|workbox-.*.js).*)'
  ],
};

