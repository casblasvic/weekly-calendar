# 📱 Guía de Conexión Bluetooth - Código Completo

## 🚀 Características Principales

Este código proporciona una solución completa para conectar y comunicarse con dispositivos Bluetooth desde una aplicación web usando la **Web Bluetooth API**.

### ✨ Funcionalidades incluidas:
- ✅ Escaneo y conexión automática a dispositivos
- ✅ Lectura y escritura de datos
- ✅ Suscripción a notificaciones en tiempo real
- ✅ Soporte para múltiples dispositivos simultáneos
- ✅ Manejo robusto de errores
- ✅ Servicios Bluetooth predefinidos (Heart Rate, Battery, Custom)
- ✅ Hook de React para integración fácil
- ✅ Componente de demostración completo

## 📁 Archivos Creados

```
📦 Tu Proyecto
├── 📂 services/
│   └── 📄 bluetoothService.ts      # Servicio principal de Bluetooth
├── 📂 types/
│   └── 📄 bluetooth.d.ts          # Definiciones de tipos TypeScript
├── 📂 hooks/
│   └── 📄 useBluetooth.ts          # Hook de React
├── 📂 components/
│   └── 📄 BluetoothManager.tsx     # Componente de demostración
└── 📄 BLUETOOTH_GUIDE.md           # Esta guía
```

## 🔧 Instalación y Configuración

### 1. Requisitos Previos
- ✅ Navegador compatible (Chrome, Edge, Opera)
- ✅ Conexión HTTPS (obligatorio para Web Bluetooth)
- ✅ Next.js con TypeScript
- ✅ Tailwind CSS (para el componente de demostración)

### 2. Verificar Compatibilidad
```typescript
// Verificar si el navegador soporta Bluetooth
if ('bluetooth' in navigator) {
  console.log('✅ Bluetooth soportado');
} else {
  console.log('❌ Bluetooth no soportado');
}
```

## 📖 Guía de Uso

### 🔸 Uso Básico del Servicio

```typescript
import { bluetoothService, BLUETOOTH_SERVICES } from './services/bluetoothService';

// 1. Conectar a un dispositivo
const device = await bluetoothService.scanAndConnect();

// 2. Enviar datos
await bluetoothService.writeCharacteristic(
  device.id, 
  BLUETOOTH_SERVICES.CUSTOM, 
  'Hola dispositivo!'
);

// 3. Leer datos
const data = await bluetoothService.readCharacteristic(
  device.id, 
  BLUETOOTH_SERVICES.CUSTOM
);

// 4. Suscribirse a notificaciones
await bluetoothService.subscribeToNotifications(
  device.id,
  BLUETOOTH_SERVICES.CUSTOM,
  (data) => {
    console.log('Datos recibidos:', data);
  }
);
```

### 🔸 Uso con React Hook

```typescript
import { useBluetooth } from './hooks/useBluetooth';

function MyBluetoothComponent() {
  const {
    devices,
    isScanning,
    isAvailable,
    error,
    scanAndConnect,
    sendData,
    readData
  } = useBluetooth();

  const handleConnect = async () => {
    await scanAndConnect();
  };

  const handleSendMessage = async (deviceId: string) => {
    await sendData(deviceId, { action: 'led', state: 'on' });
  };

  return (
    <div>
      {!isAvailable && <p>Bluetooth no disponible</p>}
      {error && <p>Error: {error}</p>}
      
      <button onClick={handleConnect} disabled={isScanning}>
        {isScanning ? 'Escaneando...' : 'Conectar'}
      </button>

      {devices.map(device => (
        <div key={device.id}>
          <h3>{device.name}</h3>
          <button onClick={() => handleSendMessage(device.id)}>
            Enviar Comando
          </button>
        </div>
      ))}
    </div>
  );
}
```

### 🔸 Comandos JSON Avanzados

```typescript
// Enviar comando estructurado
await sendData(deviceId, {
  action: 'sensor',
  type: 'temperature',
  interval: 1000
});

// Comando para controlar LED
await sendData(deviceId, {
  action: 'led',
  pin: 13,
  state: 'on',
  brightness: 255
});

// Solicitar datos del sensor
await sendData(deviceId, {
  action: 'get',
  sensor: 'all'
});
```

## 🎯 Servicios Bluetooth Predefinidos

### CUSTOM (Por defecto)
```typescript
const CUSTOM = {
  serviceUUID: '12345678-1234-1234-1234-123456789abc',
  characteristicUUID: '87654321-4321-4321-4321-cba987654321',
  name: 'Custom Service'
};
```

### HEART_RATE
```typescript
const HEART_RATE = {
  serviceUUID: '0000180d-0000-1000-8000-00805f9b34fb',
  characteristicUUID: '00002a37-0000-1000-8000-00805f9b34fb',
  name: 'Heart Rate'
};
```

### BATTERY
```typescript
const BATTERY = {
  serviceUUID: '0000180f-0000-1000-8000-00805f9b34fb',
  characteristicUUID: '00002a19-0000-1000-8000-00805f9b34fb',
  name: 'Battery Service'
};
```

## 🛠 Ejemplos de Dispositivos Compatibles

### Arduino/ESP32
```cpp
// Ejemplo de código Arduino para ESP32
#include "BLEDevice.h"
#include "BLEServer.h"
#include "BLEUtils.h"
#include "BLE2902.h"

#define SERVICE_UUID        "12345678-1234-1234-1234-123456789abc"
#define CHARACTERISTIC_UUID "87654321-4321-4321-4321-cba987654321"

void setup() {
  BLEDevice::init("ESP32-Device");
  BLEServer *pServer = BLEDevice::createServer();
  
  BLEService *pService = pServer->createService(SERVICE_UUID);
  BLECharacteristic *pCharacteristic = pService->createCharacteristic(
    CHARACTERISTIC_UUID,
    BLECharacteristic::PROPERTY_READ |
    BLECharacteristic::PROPERTY_WRITE |
    BLECharacteristic::PROPERTY_NOTIFY
  );

  pService->start();
  pServer->getAdvertising()->start();
}
```

### Raspberry Pi
```python
# Ejemplo con BlueZ en Python
import bluetooth
from bluetooth import BluetoothSocket, RFCOMM

server_sock = BluetoothSocket(RFCOMM)
server_sock.bind(("", bluetooth.PORT_ANY))
server_sock.listen(1)

port = server_sock.getsockname()[1]
bluetooth.advertise_service(
    server_sock, "CustomBluetoothService",
    service_id="12345678-1234-1234-1234-123456789abc",
    service_classes=[bluetooth.SERIAL_PORT_CLASS],
    profiles=[bluetooth.SERIAL_PORT_PROFILE]
)
```

## 🔧 Filtros de Búsqueda Personalizados

```typescript
// Buscar dispositivos específicos por nombre
const filters = [
  { namePrefix: 'Arduino' },
  { namePrefix: 'ESP32' },
  { name: 'Mi-Dispositivo-Exacto' }
];

// Buscar por servicios específicos
const filters = [
  { services: ['12345678-1234-1234-1234-123456789abc'] }
];

// Buscar por datos del fabricante
const filters = [
  { 
    manufacturerData: [{
      companyIdentifier: 0x004C, // Apple
      dataPrefix: new Uint8Array([0x10, 0x05])
    }]
  }
];

await scanAndConnect(filters, serviceConfig);
```

## 🚨 Manejo de Errores Comunes

### Error: "Bluetooth not available"
```typescript
if (!navigator.bluetooth) {
  console.error('Este navegador no soporta Web Bluetooth');
  // Mostrar mensaje al usuario
}
```

### Error: "User cancelled the requestDevice() chooser"
```typescript
try {
  const device = await bluetoothService.scanAndConnect();
} catch (error) {
  if (error.name === 'NotFoundError') {
    console.log('Usuario canceló la selección');
  }
}
```

### Error: "Connection lost"
```typescript
bluetoothService.addEventListener('deviceDisconnected', (device) => {
  console.log(`Dispositivo ${device.name} desconectado`);
  // Intentar reconexión automática
  setTimeout(() => {
    bluetoothService.connectToDevice(device.device);
  }, 5000);
});
```

## 📊 Formatos de Datos Soportados

### Entrada (Envío)
- ✅ String: `"Hola mundo"`
- ✅ JSON: `{ "action": "led", "state": "on" }`
- ✅ ArrayBuffer: `new ArrayBuffer(8)`
- ✅ Uint8Array: `new Uint8Array([1, 2, 3, 4])`

### Salida (Recepción)
```typescript
{
  buffer: ArrayBuffer,      // Datos binarios
  uint8Array: Uint8Array,   // Array de bytes
  string: string,           // Texto decodificado
  json: object | null       // JSON parseado (si es válido)
}
```

## 🎨 Personalización del Componente

```typescript
// Crear tu propio componente personalizado
import { useBluetooth } from './hooks/useBluetooth';

function CustomBluetoothDevice() {
  const { devices, scanAndConnect, sendData } = useBluetooth();

  const sendCustomCommand = async (deviceId: string) => {
    // Tu lógica personalizada aquí
    await sendData(deviceId, {
      timestamp: Date.now(),
      command: 'status',
      parameters: { sensor: 'temperature' }
    });
  };

  return (
    <div className="custom-bluetooth-interface">
      {/* Tu UI personalizada */}
    </div>
  );
}
```

## 🌟 Casos de Uso Comunes

### 1. Control de IoT
```typescript
// Controlar dispositivos domóticos
await sendData(deviceId, {
  device: 'light',
  room: 'living_room',
  action: 'dim',
  level: 50
});
```

### 2. Recolección de Sensores
```typescript
// Solicitar datos de sensores
await subscribeToNotifications(deviceId, (data) => {
  const sensorData = data.json;
  console.log(`Temperatura: ${sensorData.temperature}°C`);
  console.log(`Humedad: ${sensorData.humidity}%`);
}, BLUETOOTH_SERVICES.CUSTOM);
```

### 3. Control de Robótica
```typescript
// Comandos de movimiento
await sendData(deviceId, {
  action: 'move',
  direction: 'forward',
  speed: 80,
  duration: 2000
});
```

## 🔒 Consideraciones de Seguridad

- ✅ **HTTPS Obligatorio**: Web Bluetooth solo funciona en conexiones seguras
- ✅ **Permisos del Usuario**: Siempre requiere interacción del usuario
- ✅ **Validación de Datos**: Valida todos los datos recibidos
- ✅ **Timeout**: Implementa timeouts para operaciones
- ✅ **Autenticación**: Considera autenticación a nivel de aplicación

## 🐛 Debugging y Logs

```typescript
// Habilitar logs detallados
bluetoothService.addEventListener('dataReceived', (event) => {
  console.log('📥 Datos recibidos:', event);
});

bluetoothService.addEventListener('dataSent', (event) => {
  console.log('📤 Datos enviados:', event);
});

bluetoothService.addEventListener('error', (error) => {
  console.error('❌ Error Bluetooth:', error);
});
```

## 📱 Compatibilidad de Navegadores

| Navegador | Soporte | Notas |
|-----------|---------|-------|
| Chrome 56+ | ✅ | Completo |
| Edge 79+ | ✅ | Completo |
| Opera 43+ | ✅ | Completo |
| Firefox | ❌ | No soportado |
| Safari | ❌ | No soportado |
| Mobile Chrome | ✅ | Android 6.0+ |
| Mobile Safari | ❌ | No soportado |

## 🚀 Próximos Pasos

1. **Prueba el Componente de Demostración**
   - Importa `BluetoothManager` en tu página
   - Verifica que funcione con un dispositivo de prueba

2. **Personaliza para tu Caso de Uso**
   - Modifica los servicios UUID según tu dispositivo
   - Adapta los comandos a tu protocolo específico

3. **Optimiza la UX**
   - Agrega indicadores de estado más específicos
   - Implementa reconexión automática
   - Guarda configuraciones en localStorage

4. **Expande la Funcionalidad**
   - Agrega más servicios Bluetooth estándar
   - Implementa streaming de datos en tiempo real
   - Crea perfiles para diferentes tipos de dispositivos

¡Ya tienes todo el código necesario para conectarte a dispositivos Bluetooth! 🎉