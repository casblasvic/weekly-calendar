'use client'

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2 } from "lucide-react";

// Leer variables de entorno públicas (si se definieron en .env con NEXT_PUBLIC_)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

interface TestResult {
  dbConnected: boolean | null;
  envVarsOk: boolean | null;
  error?: string | null;
}

export default function DatabaseConfigPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TestResult>({ dbConnected: null, envVarsOk: null });

  const handleTestConnection = async () => {
    setLoading(true);
    setResult({ dbConnected: null, envVarsOk: null }); // Reset result
    try {
      const response = await fetch('/api/test-connection');
      const data: TestResult = await response.json();
      setResult(data);
      console.log("Resultado del Test de Conexión:", data);
    } catch (error) {
      console.error("Error al llamar a la API de test de conexión:", error);
      setResult({ 
        dbConnected: false, 
        envVarsOk: null, // No podemos saberlo si la API falla
        error: "Error al contactar el servidor de pruebas." 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Configuración de Base de Datos</h1>
      <p className="text-muted-foreground">
        Esta sección permite verificar el estado de la conexión a la base de datos configurada.
        La configuración principal (URL de conexión, claves secretas) se gestiona mediante
        variables de entorno en el servidor por motivos de seguridad.
      </p>

      <Card>
        <CardHeader>
          <CardTitle>Información Pública</CardTitle>
          <CardDescription>
            Variables públicas leídas desde el entorno (si están definidas con NEXT_PUBLIC_).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div>
            <span className="font-medium">Supabase Project URL:</span>
            <span className="ml-2 text-muted-foreground">
              {supabaseUrl || "No definida (NEXT_PUBLIC_SUPABASE_URL)"}
            </span>
          </div>
          <div>
            <span className="font-medium">Supabase Anon Key:</span>
            <span className="ml-2 text-muted-foreground">
              {supabaseAnonKey || "No definida (NEXT_PUBLIC_SUPABASE_ANON_KEY)"}
            </span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Test de Conexión del Servidor</CardTitle>
          <CardDescription>
            Pulsa el botón para que el servidor intente conectar a la base de datos
            y verifique las variables de entorno esenciales.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleTestConnection} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {loading ? 'Probando...' : 'Realizar Test de Conexión'}
          </Button>

          <div className="mt-4">
            {result.dbConnected !== null && (
              <Alert variant={result.dbConnected && result.envVarsOk ? "default" : "destructive"}>
                <AlertTitle>
                  {result.dbConnected && result.envVarsOk ? "Prueba Exitosa" : "Prueba Fallida"}
                </AlertTitle>
                <AlertDescription className="space-y-1">
                  <p>
                    Conexión a Base de Datos: 
                    <span className={result.dbConnected ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>
                      {result.dbConnected ? " OK ✅" : " Fallida ❌"}
                    </span>
                  </p>
                  <p>
                    Variables de Entorno Esenciales (Servidor):
                    <span className={result.envVarsOk === false ? 'text-red-600 font-semibold' : (result.envVarsOk === true ? 'text-green-600 font-semibold' : 'text-gray-500') }>
                      {result.envVarsOk === false ? " Faltan ❌" : (result.envVarsOk === true ? " OK ✅" : " No verificado")}
                    </span>
                  </p>
                  {result.error && (
                    <p className="text-red-700">Error: {result.error}</p>
                  )}
                </AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 