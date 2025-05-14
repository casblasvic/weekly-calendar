import type { AuthConfig } from "@auth/core/types";
import type { NextAuthConfig } from 'next-auth';

// Definimos los tipos aquí para que estén disponibles
declare module "@auth/core/types" {
  interface Session {
    user?: {
      id: string;
      systemId: string;
      firstName?: string;
      lastName?: string;
    } & import("@auth/core/types").DefaultSession["user"];
  }

  interface User {
    systemId?: string;
    firstName?: string;
    lastName?: string;
  }
}

// Configuración base compatible con Edge Runtime
export const authConfig = {
  // NO adapter aquí
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: '/login',
    signOut: '/login',
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isOnDashboard = nextUrl.pathname.startsWith('/'); // Ajusta esto a tu ruta de dashboard/protegida
 
      if (isOnDashboard) {
        if (isLoggedIn) return true;
        return false; // Redirect unauthenticated users to login page
      } else if (isLoggedIn) {
        // Si ya está logueado y trata de ir a /login, redirigir a la página principal
        if (nextUrl.pathname === '/login') {
          return Response.redirect(new URL('/', nextUrl));
        }
        return true;
      }
      return true;
    },
    jwt({ token, user, account, profile, isNewUser }) {
      if (user) {
        token.id = user.id;
        // Cast `user` a `any` temporalmente si TypeScript se queja de `systemId`
        // Lo ideal sería asegurar que el tipo User en el callback jwt incluya systemId
        const u = user as any; 
        token.systemId = u.systemId;
        token.firstName = u.firstName;
        token.lastName = u.lastName;
      }
      return token;
    },
    session({ session, token, user }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.systemId = token.systemId as string;
        session.user.firstName = token.firstName as string | undefined;
        session.user.lastName = token.lastName as string | undefined;
      }
      return session;
    },
  },
  providers: [], // Vacío para satisfacer el tipo, NO CredentialsProvider aquí
  secret: process.env.NEXTAUTH_SECRET,
} satisfies AuthConfig; 