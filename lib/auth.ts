import NextAuth from "next-auth";
import type { AuthConfig, User as AuthUser, Session as AuthSession, DefaultSession } from "@auth/core/types";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/db";
import bcrypt from "bcrypt";
import { authConfig } from "./auth.config";
// import { PrismaAdapter } from "@auth/prisma-adapter"; // <-- Adapter quitado

/**
 * Extender el tipo Session para incluir las propiedades personalizadas.
 * En v5, se recomienda hacerlo en un archivo auth.d.ts
 * pero por ahora lo dejamos aquí para mantener la estructura.
 */
declare module "@auth/core/types" {
  interface Session extends DefaultSession {
    user?: {
      id: string;
      systemId: string;
      firstName?: string;
      lastName?: string;
    } & DefaultSession["user"];
  }

  // Simplificar la extensión de User para evitar recursión
  // Definir aquí SOLO los campos ADICIONALES que `authorize` devuelve
  // y que quieres que estén disponibles en el objeto `user` de los callbacks.
  interface User {
    systemId?: string; 
    firstName?: string;
    lastName?: string;
    // email e id ya vienen por defecto
  }
}

export const authOptions: AuthConfig = {
  ...authConfig,
  // adapter: PrismaAdapter(prisma), // <-- Adapter quitado
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email", placeholder: "tu@email.com" },
        password: { label: "Contraseña", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email;
        const password = credentials?.password;

        if (typeof email !== 'string' || typeof password !== 'string' || !email || !password) {
          return null;
        }

        try {
          const user = await prisma.user.findUnique({
            where: { email: email },
          });

          if (!user || !user.passwordHash) {
            return null;
          }

          const passwordMatch = await bcrypt.compare(password, user.passwordHash);

          if (passwordMatch) {
            return {
              id: user.id,
              email: user.email,
              firstName: user.firstName ?? undefined,
              lastName: user.lastName ?? undefined,
              systemId: user.systemId,
            };
          } else {
            return null;
          }
        } catch (error) {
          console.error('[Auth v5 Authorize] Error during authorization:', error);
          return null;
        }
      },
    }),
  ],
  pages: {
    signIn: '/login',
    signOut: '/login',
  },
  secret: process.env.NEXTAUTH_SECRET,
};

// Inicializar NextAuth con las opciones y exportar handlers y función auth
export const { handlers: { GET, POST }, auth } = NextAuth(authOptions);

// Helper para sesiones del lado del servidor
export const getServerAuthSession = async () => {
  return await auth();
}; 