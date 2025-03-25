"use client"

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { useInterfaz } from '@/contexts/interfaz-Context';
import { toast } from 'sonner';

export default function ReiniciarDatosPage() {
  const router = useRouter();
  const interfaz = useInterfaz();
  const [isResetting, setIsResetting] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);

  const handleReset = async () => {
    if (!isConfirming) {
      setIsConfirming(true);
      return;
    }

    try {
      setIsResetting(true);
      await interfaz.resetData();
      toast.success('Datos reiniciados correctamente');
      setTimeout(() => {
        router.push('/configuracion/clinicas');
      }, 1500);
    } catch (error) {
      console.error('Error al reiniciar datos:', error);
      toast.error('Error al reiniciar datos');
    } finally {
      setIsResetting(false);
      setIsConfirming(false);
    }
  };

  return (
    <div className="container p-8 mx-auto">
      <h1 className="text-3xl font-bold mb-8">Configuración Avanzada</h1>
      
      <Card className="mb-8">
        <CardHeader className="bg-amber-50">
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Reiniciar Datos de Ejemplo
          </CardTitle>
          <CardDescription>
            Esta operación eliminará todos los datos actuales y regenerará los datos de ejemplo.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <p className="text-gray-700">
              Esta acción eliminará todos los datos actuales (clínicas, equipamiento, tarifas, etc.) y generará
              nuevos datos de ejemplo con IDs consistentes. Úsala solo cuando necesites
              restablecer completamente la aplicación.
            </p>
            
            {isConfirming && (
              <div className="rounded-md bg-amber-50 p-4 border border-amber-200">
                <p className="font-medium text-amber-800">
                  ¿Estás seguro? Esta acción no se puede deshacer y todos los datos actuales se perderán.
                </p>
              </div>
            )}
            
            <div className="flex justify-end space-x-2 mt-4">
              {isConfirming && (
                <Button 
                  variant="outline" 
                  onClick={() => setIsConfirming(false)}
                  disabled={isResetting}
                >
                  Cancelar
                </Button>
              )}
              
              <Button 
                onClick={handleReset}
                className={isConfirming ? "bg-red-600 hover:bg-red-700" : "bg-amber-600 hover:bg-amber-700"}
                disabled={isResetting}
              >
                {isResetting ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Reiniciando...
                  </>
                ) : isConfirming ? (
                  'Confirmar Reinicio'
                ) : (
                  'Reiniciar Datos'
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 