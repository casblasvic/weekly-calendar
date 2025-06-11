// lib/auth-edge.ts
// Configuración mínima de autenticación para el edge runtime (middleware)
import NextAuth from "next-auth";
import type { NextAuthConfig } from "next-auth";

// Configuración básica sin Prisma para el middleware
export const authConfigEdge: NextAuthConfig = {
  providers: [], // No necesitamos providers en el middleware
  callbacks: {
    authorized({ auth }) {
      // Simple verificación: si hay sesión, está autorizado
      return !!auth;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
  pages: {
    signIn: "/login",
  },
};

// Exportar la función de autenticación para el middleware
export const { auth } = NextAuth(authConfigEdge);
