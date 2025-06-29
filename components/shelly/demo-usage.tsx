import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { DeviceConfigModalV2 } from './device-config-modal-v2';

// Ejemplo de cómo usar el nuevo modal de configuración granular
export const ShellyDeviceConfigDemo: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Datos de ejemplo de un dispositivo Shelly
  const exampleDevice = {
    id: 'device_123',
    deviceId: 'b0b21c12dd94',
    cloudId: '194279021665684',
    name: 'Enchufe Recepción',
    online: true,
    relayOn: false,
    generation: '3',
    modelCode: 'S3PL-00112EU',
    firmwareVersion: '1.0.3',
    hasUpdate: false,
    
    // Configuraciones básicas
    timezone: 'Europe/Madrid',
    autoUpdate: true,
    
    // Datos energéticos
    currentPower: 15.2,
    totalEnergy: 1250.75,
    voltage: 230.1,
    current: 0.066,
    temperature: 42.3,
    
    // Configuraciones de red
    wifiSsid: 'Clinica_WiFi',
    wifiRssi: -45,
    wifiBackupEnabled: true,
    wifiBackupSsid: 'Clinica_Backup',
    apModeEnabled: false,
    
    // Configuraciones de protección
    autoOffEnabled: false,
    autoOffDelay: 300,
    powerLimit: 2500,
    
    // Configuraciones LED (Gen 3)
    ledColorMode: 'color',
    ledBrightness: 80,
    ledColorR: 0,
    ledColorG: 255,
    ledColorB: 0,
    ledNightMode: true
  };

  const handleDeviceUpdate = () => {
    console.log('Dispositivo actualizado - refrescar datos...');
    // Aquí normalmente harías un refetch de los datos del dispositivo
  };

  return (
    <div className="p-6 space-y-4">
      <div className="border rounded-lg p-4">
        <h3 className="text-lg font-semibold mb-2">
          {exampleDevice.name}
        </h3>
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">
              Modelo: {exampleDevice.modelCode}
            </p>
            <p className="text-sm text-muted-foreground">
              Potencia: {exampleDevice.currentPower}W
            </p>
            <p className="text-sm text-muted-foreground">
              Estado: {exampleDevice.relayOn ? 'Encendido' : 'Apagado'}
            </p>
          </div>
          
          <Button 
            onClick={() => setIsModalOpen(true)}
            variant="outline"
          >
            ⚙️ Configurar
          </Button>
        </div>
      </div>

      <DeviceConfigModalV2
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        device={exampleDevice}
        onDeviceUpdate={handleDeviceUpdate}
      />

      <div className="mt-8 p-4 bg-blue-50 rounded-lg">
        <h4 className="font-semibold mb-2">✨ Características del nuevo modal:</h4>
        <ul className="text-sm space-y-1 text-blue-800">
          <li>• <strong>Tamaño fijo:</strong> Modal de 85vh altura, sin redimensionamiento molesto</li>
          <li>• <strong>Cambios granulares:</strong> Cada configuración se ejecuta inmediatamente</li>
          <li>• <strong>Feedback visual:</strong> Spinners y confirmaciones por control individual</li>
          <li>• <strong>Sin botón "Guardar" global:</strong> Cada control maneja su propio estado</li>
          <li>• <strong>Escaneo WiFi:</strong> Detecta redes disponibles automáticamente</li>
          <li>• <strong>Configuraciones específicas:</strong> Diferentes endpoints por tipo de configuración</li>
          <li>• <strong>Scroll interno:</strong> Contenido scrollable dentro del modal fijo</li>
        </ul>
      </div>

      <div className="mt-4 p-4 bg-green-50 rounded-lg">
        <h4 className="font-semibold mb-2">🎯 Tipos de controles implementados:</h4>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <h5 className="font-medium text-green-800">ConfigSwitch</h5>
            <p className="text-green-700">Cambios inmediatos al mover el switch</p>
          </div>
          <div>
            <h5 className="font-medium text-green-800">ConfigInput</h5>
            <p className="text-green-700">Input con icono ✓ para confirmar</p>
          </div>
          <div>
            <h5 className="font-medium text-green-800">ConfigSelect</h5>
            <p className="text-green-700">Dropdown con icono ✓ para confirmar</p>
          </div>
          <div>
            <h5 className="font-medium text-green-800">ConfigButton</h5>
            <p className="text-green-700">Botón de acción directa</p>
          </div>
        </div>
      </div>

      <div className="mt-4 p-4 bg-amber-50 rounded-lg">
        <h4 className="font-semibold mb-2">🔧 Endpoints específicos por configuración:</h4>
        <ul className="text-sm space-y-1 text-amber-800">
          <li>• <code>device/set/name</code> - Cambiar nombre del dispositivo</li>
          <li>• <code>Sys.SetConfig</code> - Zona horaria y configuraciones del sistema</li>
          <li>• <code>WiFi.SetConfig</code> - Configuraciones de red WiFi</li>
          <li>• <code>Switch.SetConfig</code> - Auto-apagado, límites de potencia, estado inicial</li>
          <li>• <code>PLUGS_UI.SetConfig</code> - LED, brillo, colores (Gen 3)</li>
          <li>• <code>WiFi.Scan</code> - Escanear redes WiFi disponibles</li>
        </ul>
      </div>
    </div>
  );
}; 