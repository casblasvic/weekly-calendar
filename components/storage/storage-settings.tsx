'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { saveToStorage, getFromStorage } from '@/utils/storage-utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Componente para configurar almacenamiento
export const StorageSettings = () => {
  const [provider, setProvider] = useState('local');
  const [localConfig, setLocalConfig] = useState({
    usePhysicalStorage: true,
    backupEnabled: false,
    backupFrequency: 'daily',
  });
  const [googleDriveConfig, setGoogleDriveConfig] = useState({
    clientId: '',
    apiKey: '',
    rootFolder: ''
  });
  const [s3Config, setS3Config] = useState({
    accessKey: '',
    secretKey: '',
    bucket: '',
    region: ''
  });
  const [isConfigChanged, setIsConfigChanged] = useState(false);

  // Cargar configuración al iniciar
  useEffect(() => {
    const storedConfig = getFromStorage('storageConfig', { provider: 'local', local: localConfig, googleDrive: googleDriveConfig, s3: s3Config });
    
    setProvider(storedConfig.provider || 'local');
    setLocalConfig(storedConfig.local || localConfig);
    setGoogleDriveConfig(storedConfig.googleDrive || googleDriveConfig);
    setS3Config(storedConfig.s3 || s3Config);
  }, []);

  // Marcar cuando hay cambios no guardados
  useEffect(() => {
    setIsConfigChanged(true);
  }, [provider, localConfig, googleDriveConfig, s3Config]);

  // Guardar configuración
  const saveConfig = () => {
    const config = {
      provider,
      local: localConfig,
      googleDrive: googleDriveConfig,
      s3: s3Config
    };
    
    saveToStorage('storageConfig', config);
    setIsConfigChanged(false);
    
    // Mostrar mensaje de éxito
    alert('Configuración guardada correctamente');
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Configuración de almacenamiento</CardTitle>
        <CardDescription>
          Configura cómo se almacenan los archivos en el sistema
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="provider">Proveedor de almacenamiento</Label>
            <Select 
              value={provider} 
              onValueChange={setProvider}
            >
              <SelectTrigger id="provider">
                <SelectValue placeholder="Selecciona un proveedor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="local">Almacenamiento local</SelectItem>
                <SelectItem value="gdrive">Google Drive</SelectItem>
                <SelectItem value="s3">Amazon S3</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Tabs defaultValue={provider} value={provider} onValueChange={setProvider}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="local">Local</TabsTrigger>
              <TabsTrigger value="gdrive">Google Drive</TabsTrigger>
              <TabsTrigger value="s3">Amazon S3</TabsTrigger>
            </TabsList>
            
            {/* Configuración local */}
            <TabsContent value="local" className="space-y-4 mt-4">
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="usePhysicalStorage" 
                  checked={localConfig.usePhysicalStorage}
                  onCheckedChange={(checked) => 
                    setLocalConfig({...localConfig, usePhysicalStorage: !!checked})
                  }
                />
                <Label htmlFor="usePhysicalStorage">
                  Usar almacenamiento físico (archivos persistentes)
                </Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="backupEnabled" 
                  checked={localConfig.backupEnabled}
                  onCheckedChange={(checked) => 
                    setLocalConfig({...localConfig, backupEnabled: !!checked})
                  }
                />
                <Label htmlFor="backupEnabled">
                  Habilitar copias de seguridad automáticas
                </Label>
              </div>
              
              {localConfig.backupEnabled && (
                <div className="space-y-2">
                  <Label htmlFor="backupFrequency">Frecuencia de copias de seguridad</Label>
                  <Select 
                    value={localConfig.backupFrequency} 
                    onValueChange={(value) => setLocalConfig({...localConfig, backupFrequency: value})}
                  >
                    <SelectTrigger id="backupFrequency">
                      <SelectValue placeholder="Selecciona frecuencia" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Diaria</SelectItem>
                      <SelectItem value="weekly">Semanal</SelectItem>
                      <SelectItem value="monthly">Mensual</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </TabsContent>
            
            {/* Configuración Google Drive */}
            <TabsContent value="gdrive" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="clientId">Client ID</Label>
                <Input 
                  id="clientId" 
                  value={googleDriveConfig.clientId}
                  onChange={(e) => setGoogleDriveConfig({...googleDriveConfig, clientId: e.target.value})}
                  placeholder="Client ID de Google Drive API"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="apiKey">API Key</Label>
                <Input 
                  id="apiKey" 
                  value={googleDriveConfig.apiKey}
                  onChange={(e) => setGoogleDriveConfig({...googleDriveConfig, apiKey: e.target.value})}
                  placeholder="API Key de Google Drive"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="rootFolder">Carpeta raíz</Label>
                <Input 
                  id="rootFolder" 
                  value={googleDriveConfig.rootFolder}
                  onChange={(e) => setGoogleDriveConfig({...googleDriveConfig, rootFolder: e.target.value})}
                  placeholder="ID de carpeta raíz (opcional)"
                />
              </div>
            </TabsContent>
            
            {/* Configuración Amazon S3 */}
            <TabsContent value="s3" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="accessKey">Access Key</Label>
                <Input 
                  id="accessKey" 
                  value={s3Config.accessKey}
                  onChange={(e) => setS3Config({...s3Config, accessKey: e.target.value})}
                  placeholder="Access Key de AWS"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="secretKey">Secret Key</Label>
                <Input 
                  id="secretKey" 
                  type="password"
                  value={s3Config.secretKey}
                  onChange={(e) => setS3Config({...s3Config, secretKey: e.target.value})}
                  placeholder="Secret Key de AWS"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="bucket">Bucket</Label>
                <Input 
                  id="bucket" 
                  value={s3Config.bucket}
                  onChange={(e) => setS3Config({...s3Config, bucket: e.target.value})}
                  placeholder="Nombre del bucket S3"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="region">Región</Label>
                <Input 
                  id="region" 
                  value={s3Config.region}
                  onChange={(e) => setS3Config({...s3Config, region: e.target.value})}
                  placeholder="Región AWS (ej. eu-west-1)"
                />
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline" onClick={() => window.location.reload()}>
          Cancelar
        </Button>
        <Button onClick={saveConfig} disabled={!isConfigChanged}>
          Guardar configuración
        </Button>
      </CardFooter>
    </Card>
  );
}; 