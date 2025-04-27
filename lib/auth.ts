import { PrismaAdapter } from "@auth/prisma-adapter";
import { type NextAuthOptions, getServerSession, type DefaultSession } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/db";
// Importar bcrypt para comparar contraseñas
import bcrypt from "bcrypt";

/**
 * Extender el tipo Session para incluir las propiedades personalizadas.
 */
declare module "next-auth" {
  interface Session extends DefaultSession {
    user: {
      id: string;
      systemId: string;
      firstName?: string;
      lastName?: string;
      // Añade aquí otros campos que quieras en la sesión (ej: role)
    } & DefaultSession["user"];
  }

  // Si también quieres añadir campos al objeto User devuelto por el adapter/callbacks
  // interface User {
  //   systemId?: string;
  // }
}

/**
 * Extender el tipo JWT para incluir las propiedades personalizadas antes de que lleguen a la sesión.
 */
declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    systemId: string;
    firstName?: string;
    lastName?: string;
    // Añade aquí otros campos que quieras propagar al token
  }
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: "jwt", // Usar JWT para las sesiones
  },
  providers: [
    // --- Proveedor de Credenciales (Email/Password) --- 
    // Este es un ejemplo básico. Necesitarás ajustar la lógica de `authorize`.
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email", placeholder: "tu@email.com" },
        password: { label: "Contraseña", type: "password" },
      },
             // Dentro de la configuración de CredentialsProvider
             async authorize(credentials, req) {
              console.log('[Auth Authorize] Received credentials:', credentials); // Log para ver si llega el email/pass
              if (!credentials?.email || !credentials?.password) {
                console.log('[Auth Authorize] Missing email or password');
                return null;
              }
    
              try {
                const user = await prisma.user.findUnique({
                  where: { email: credentials.email },
                });
    
                if (!user) {
                  console.log('[Auth Authorize] User not found for email:', credentials.email);
                  return null;
                }
    
                console.log('[Auth Authorize] User found:', user.id, user.email);
                console.log('[Auth Authorize] DB Hash:', user.passwordHash); // Verificar que el hash existe
    
                const passwordMatch = await bcrypt.compare(
                  credentials.password,
                  user.passwordHash // Asegúrate que este es el campo correcto
                );
    
                console.log('[Auth Authorize] Password match result:', passwordMatch); // VERIFICAR ESTO
    
                if (passwordMatch) {
                  console.log('[Auth Authorize] Password OK, returning user.');
                  // Devuelve el objeto de usuario SIN la contraseña
                  // Asegúrate de devolver los campos necesarios para la sesión/token JWT
                  return {
                    id: user.id,
                    email: user.email,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    systemId: user.systemId, // MUY IMPORTANTE para el contexto multi-tenant
                    // Añade otros campos necesarios como roles si los usas en el token/session
                  };
                } else {
                  console.log('[Auth Authorize] Password mismatch.');
                  return null; // Contraseña incorrecta
                }
              } catch (error) {
                console.error('[Auth Authorize] Error during authorization:', error);
                return null; // Error general
              }
            },
    }),
    // --- Proveedor de Google --- (Ejemplo, puedes añadirlo después)
    // GoogleProvider({
    //   clientId: process.env.GOOGLE_CLIENT_ID!,
    //   clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    // }),
    // ...otros proveedores (GitHub, etc.)
  ],
  callbacks: {
    // Callback JWT: Se ejecuta *antes* de que se cree/actualice la sesión.
    // Aquí transferimos los datos del usuario (obtenido de authorize o de la BD) al token JWT.
    jwt: async ({ token, user }) => {
      // El objeto 'user' solo está presente en el primer login después de authorize.
      if (user) {
        token.id = user.id;

        // Asignar solo si existen en el objeto user recibido
        if ('firstName' in user) {
            token.firstName = user.firstName as string | undefined;
        }
        if ('lastName' in user) {
            token.lastName = user.lastName as string | undefined;
        }
        
        // Obtener systemId siempre desde la BD para asegurar consistencia
        // (El objeto 'user' puede no tenerlo dependiendo del flujo/adapter)
        const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
        token.systemId = dbUser?.systemId ?? ""; 
        
        console.log("Callback JWT - User presente:", { 
            userId: token.id, 
            systemId: token.systemId, 
            firstName: token.firstName, 
            lastName: token.lastName 
        });
      }
      return token;
    },
    // Callback Session: Se ejecuta *después* del callback JWT.
    // Aquí transferimos los datos del token JWT a la sesión que verá el cliente.
    session: ({ session, token }) => {
      // Añadimos los campos personalizados del token a la sesión
      if (token && session.user) {
        session.user.id = token.id;
        session.user.systemId = token.systemId;
        session.user.firstName = token.firstName;
        session.user.lastName = token.lastName;
        // session.user.role = token.role; // Ejemplo si añades roles
      }
      // console.log("Callback Session - Sesión final:", session);
      return session;
    },
  },
  pages: {
    // Define aquí tus páginas personalizadas si las tienes (opcional)
    signIn: '/login', // Aseguramos que la página de login sea esta
    signOut: '/login', // <<< Añadir redirección explícita a /login tras cerrar sesión
    // error: '/auth/error', // Error code passed in query string as ?error=
    // verifyRequest: '/auth/verify-request', // (used for email/magic link verification)
    // newUser: '/auth/new-user' // New users will be directed here on first sign in (leave the property out if not of interest)
  },
  // Añade un secret para firmar los JWTs (MUY IMPORTANTE en producción)
  // Deberías guardarlo en tus variables de entorno
  secret: process.env.NEXTAUTH_SECRET, 
  // debug: process.env.NODE_ENV === 'development', // Habilitar logs de debug en desarrollo
};

/**
 * Helper para obtener la sesión del lado del servidor de forma segura.
 * @returns La sesión del usuario o null si no está autenticado.
 */
export const getServerAuthSession = () => getServerSession(authOptions); 