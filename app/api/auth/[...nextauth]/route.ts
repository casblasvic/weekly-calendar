import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth"; // Importa las opciones configuradas

// La configuración es mínima aquí, toda la lógica está en authOptions
const handler = NextAuth(authOptions);

export { handler as GET, handler as POST }; 