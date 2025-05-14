// import NextAuth from "next-auth"; // Ya no es necesario aquí
// import { authOptions } from "@/lib/auth"; // No es necesario aquí

// Importamos y re-exportamos directamente los handlers GET y POST
export { GET, POST } from "@/lib/auth";

// Código anterior comentado:
// const handler = NextAuth(authOptions);
// export { handler as GET, handler as POST }; 