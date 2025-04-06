import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

// Instanciar PrismaClient fuera del manejador para reutilización potencial
// (Aunque en serverless se recomienda instanciar dentro para algunas plataformas,
// para este test simple está bien así)
let prisma: PrismaClient;

try {
  // Intentar inicializar prisma globalmente
  prisma = new PrismaClient();
} catch (initError) {
  console.error("[API Test Connection] Error inicializando PrismaClient global:", initError);
  // Dejar prisma undefined para que el handler falle controladamente
}

export async function GET() {
  console.log("[API Test Connection] Recibida petición GET");

  // Verificar variables de entorno esenciales (ejemplo)
  const jwtSecret = process.env.JWT_SECRET;
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  const envVarsOk = !!jwtSecret && !!supabaseUrl && !!serviceRoleKey;
  if (!envVarsOk) {
    console.error("[API Test Connection] Faltan variables de entorno esenciales (JWT_SECRET, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)");
  }

  let dbConnected = false;
  let errorMessage: string | null = null;

  // Si la inicialización global de prisma falló, no intentar conectar
  if (!prisma) {
    errorMessage = "Error crítico al inicializar Prisma Client.";
    console.error("[API Test Connection] Prisma Client no inicializado.");
    return NextResponse.json(
      { dbConnected, envVarsOk, error: errorMessage },
      { status: 500 }
    );
  }

  try {
    console.log("[API Test Connection] Intentando conectar a la base de datos...");
    // Consulta simple para verificar la conexión
    await prisma.$queryRaw`SELECT 1`;
    dbConnected = true;
    console.log("[API Test Connection] Conexión a base de datos exitosa.");
  } catch (error: any) {
    errorMessage = error.message || "Error desconocido al conectar a la base de datos.";
    console.error("[API Test Connection] Error al conectar a la base de datos:", errorMessage);
    // Puedes añadir más detalles del error si es necesario, pero con cuidado de no exponer info sensible
    // console.error("Detalles del error:", error);
  } finally {
    // Desconectar explícitamente si es necesario (generalmente no en serverless)
    // await prisma.$disconnect();
  }

  const status = dbConnected && envVarsOk ? 200 : 500;

  return NextResponse.json(
    { dbConnected, envVarsOk, error: errorMessage },
    { status }
  );
} 