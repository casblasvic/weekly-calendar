"use client"

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { StorageSettings } from '@/components/storage/storage-settings';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { ArrowLeft, HardDrive, Cloud, Settings, Save } from 'lucide-react';
import Link from 'next/link';

export default function StorageConfigPage() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Link href="/configuracion/almacenamiento">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <h1 className="text-2xl font-bold">Configuración de Almacenamiento</h1>
          </div>
          <p className="text-gray-500">Define cómo y dónde se almacenan los archivos del sistema</p>
        </div>
      </div>
      
      <Separator />
      
      <div className="grid grid-cols-1 gap-6">
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Configuración del almacenamiento
            </CardTitle>
            <CardDescription>
              Selecciona el proveedor y configura las opciones de almacenamiento
            </CardDescription>
          </CardHeader>
          <CardContent>
            <StorageSettings />
          </CardContent>
        </Card>
        
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HardDrive className="h-5 w-5" />
              Información del sistema
            </CardTitle>
            <CardDescription>
              Información sobre el sistema de almacenamiento actual
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h3 className="font-medium">Ruta de almacenamiento local</h3>
                <p className="text-sm text-gray-500">/storage</p>
              </div>
              
              <div>
                <h3 className="font-medium">Versión del sistema de archivos</h3>
                <p className="text-sm text-gray-500">v1.0.0</p>
              </div>
              
              <div>
                <h3 className="font-medium">Estado del sistema</h3>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  <p className="text-sm text-gray-500">Funcionando correctamente</p>
                </div>
              </div>
              
              <div className="pt-2">
                <Button size="sm" variant="outline">
                  Verificar integridad
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 