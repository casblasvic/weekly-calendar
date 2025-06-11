import NextAuth from "next-auth";
import type { NextAuthConfig } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/db";
import { comparePassword } from "@/lib/hash";

/**
 * Extender el tipo Session para incluir las propiedades personalizadas.
 */
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      systemId: string;
      firstName?: string;
      lastName?: string;
      email?: string;
      name?: string;
      image?: string;
    }
  }

  interface User {
    id: string;
    systemId: string;
    firstName?: string;
    lastName?: string;
    email?: string;
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    id?: string;
    systemId?: string;
    firstName?: string;
    lastName?: string;
  }
}

export const authOptions: NextAuthConfig = {
  session: {
    strategy: "jwt",
  },
  providers: [
    CredentialsProvider({
      name: "credentials",
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

          const passwordMatch = await comparePassword(password, user.passwordHash);

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
          console.error('[Auth] Error during authorization:', error);
          return null;
        }
      },
    }),
  ],
  pages: {
    signIn: '/login',
    signOut: '/login',
    error: '/login',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.systemId = user.systemId;
        token.firstName = user.firstName;
        token.lastName = user.lastName;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.systemId = token.systemId as string;
        session.user.firstName = token.firstName as string | undefined;
        session.user.lastName = token.lastName as string | undefined;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};

// Inicializar NextAuth con las opciones y exportar handlers
const nextAuth = NextAuth(authOptions);

export const { handlers: { GET, POST }, auth } = nextAuth;

// Helper para sesiones del lado del servidor
export const getServerAuthSession = async () => {
  return await auth();
};