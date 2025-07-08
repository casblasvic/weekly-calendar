// Interfaz para representar un dispositivo Bluetooth
export interface BluetoothDeviceInfo {
  id: string;
  name: string;
  connected: boolean;
  device?: BluetoothDevice;
  server?: BluetoothRemoteGATTServer;
}

// Interfaz para configuración de servicios
export interface BluetoothServiceConfig {
  serviceUUID: string;
  characteristicUUID: string;
  name: string;
}

// Configuraciones comunes de servicios Bluetooth
export const BLUETOOTH_SERVICES = {
  HEART_RATE: {
    serviceUUID: '0000180d-0000-1000-8000-00805f9b34fb',
    characteristicUUID: '00002a37-0000-1000-8000-00805f9b34fb',
    name: 'Heart Rate'
  },
  BATTERY: {
    serviceUUID: '0000180f-0000-1000-8000-00805f9b34fb',
    characteristicUUID: '00002a19-0000-1000-8000-00805f9b34fb',
    name: 'Battery Service'
  },
  DEVICE_INFO: {
    serviceUUID: '0000180a-0000-1000-8000-00805f9b34fb',
    characteristicUUID: '00002a29-0000-1000-8000-00805f9b34fb',
    name: 'Device Information'
  },
  CUSTOM: {
    serviceUUID: '12345678-1234-1234-1234-123456789abc',
    characteristicUUID: '87654321-4321-4321-4321-cba987654321',
    name: 'Custom Service'
  }
};

class BluetoothService {
  private connectedDevices: Map<string, BluetoothDeviceInfo> = new Map();
  private listeners: Map<string, Function[]> = new Map();

  constructor() {
    // Verificar si el navegador soporta Web Bluetooth
    if (!navigator.bluetooth) {
      console.warn('Web Bluetooth API no está disponible en este navegador');
    }
  }

  // Verificar disponibilidad de Bluetooth
  async isBluetoothAvailable(): Promise<boolean> {
    try {
      return await navigator.bluetooth.getAvailability();
    } catch (error) {
      console.error('Error verificando disponibilidad de Bluetooth:', error);
      return false;
    }
  }

  // Escanear y conectar a un dispositivo
  async scanAndConnect(
    filters?: BluetoothLEScanFilter[],
    serviceConfig?: BluetoothServiceConfig
  ): Promise<BluetoothDeviceInfo | null> {
    try {
      // Verificar disponibilidad
      const isAvailable = await this.isBluetoothAvailable();
      if (!isAvailable) {
        throw new Error('Bluetooth no está disponible');
      }

      // Configurar filtros por defecto
      const defaultFilters = filters || [
        { namePrefix: 'Arduino' },
        { namePrefix: 'ESP32' },
        { namePrefix: 'RaspberryPi' },
        { services: [serviceConfig?.serviceUUID || BLUETOOTH_SERVICES.CUSTOM.serviceUUID] }
      ];

      // Configurar servicios opcionales
      const optionalServices = serviceConfig 
        ? [serviceConfig.serviceUUID]
        : Object.values(BLUETOOTH_SERVICES).map(service => service.serviceUUID);

      // Solicitar dispositivo
      const device = await navigator.bluetooth.requestDevice({
        filters: defaultFilters,
        optionalServices: optionalServices
      });

      console.log('Dispositivo seleccionado:', device.name);

      // Conectar al dispositivo
      const deviceInfo = await this.connectToDevice(device, serviceConfig);
      
      return deviceInfo;

    } catch (error) {
      console.error('Error durante el escaneo y conexión:', error);
      this.emitEvent('error', error);
      return null;
    }
  }

  // Conectar a un dispositivo específico
  async connectToDevice(
    device: BluetoothDevice, 
    serviceConfig?: BluetoothServiceConfig
  ): Promise<BluetoothDeviceInfo> {
    try {
      // Agregar listener para desconexión
      device.addEventListener('gattserverdisconnected', () => {
        console.log(`Dispositivo ${device.name} desconectado`);
        this.handleDeviceDisconnection(device.id);
      });

      // Conectar al servidor GATT
      console.log('Conectando al servidor GATT...');
      const server = await device.gatt!.connect();

      // Crear información del dispositivo
      const deviceInfo: BluetoothDeviceInfo = {
        id: device.id,
        name: device.name || 'Dispositivo sin nombre',
        connected: true,
        device: device,
        server: server
      };

      // Guardar dispositivo conectado
      this.connectedDevices.set(device.id, deviceInfo);

      console.log(`Conectado exitosamente a ${device.name}`);
      this.emitEvent('deviceConnected', deviceInfo);

      // Si se especifica configuración de servicio, conectar al servicio
      if (serviceConfig) {
        await this.connectToService(deviceInfo, serviceConfig);
      }

      return deviceInfo;

    } catch (error) {
      console.error('Error conectando al dispositivo:', error);
      throw error;
    }
  }

  // Conectar a un servicio específico
  async connectToService(
    deviceInfo: BluetoothDeviceInfo, 
    serviceConfig: BluetoothServiceConfig
  ): Promise<BluetoothRemoteGATTCharacteristic> {
    try {
      if (!deviceInfo.server) {
        throw new Error('Dispositivo no tiene servidor GATT conectado');
      }

      console.log(`Conectando al servicio ${serviceConfig.name}...`);
      
      // Obtener servicio
      const service = await deviceInfo.server.getPrimaryService(serviceConfig.serviceUUID);
      
      // Obtener característica
      const characteristic = await service.getCharacteristic(serviceConfig.characteristicUUID);
      
      console.log(`Conectado al servicio ${serviceConfig.name}`);
      this.emitEvent('serviceConnected', { deviceInfo, serviceConfig, characteristic });

      return characteristic;

    } catch (error) {
      console.error(`Error conectando al servicio ${serviceConfig.name}:`, error);
      throw error;
    }
  }

  // Leer datos de una característica
  async readCharacteristic(
    deviceId: string, 
    serviceConfig: BluetoothServiceConfig
  ): Promise<any> {
    try {
      const deviceInfo = this.connectedDevices.get(deviceId);
      if (!deviceInfo || !deviceInfo.connected) {
        throw new Error('Dispositivo no conectado');
      }

      const characteristic = await this.connectToService(deviceInfo, serviceConfig);
      const value = await characteristic.readValue();
      
             // Convertir ArrayBuffer a diferentes formatos
       const uint8Array = new Uint8Array(value.buffer);
       const buffer = uint8Array.buffer;
       const data = {
         buffer: buffer,
         uint8Array: uint8Array,
         string: new TextDecoder().decode(uint8Array),
         json: null as any
       };

      // Intentar parsear como JSON
      try {
        data.json = JSON.parse(data.string);
      } catch {
        // No es JSON válido
      }

      console.log('Datos leídos:', data);
      this.emitEvent('dataReceived', { deviceId, data });

      return data;

    } catch (error) {
      console.error('Error leyendo característica:', error);
      throw error;
    }
  }

  // Escribir datos a una característica
  async writeCharacteristic(
    deviceId: string, 
    serviceConfig: BluetoothServiceConfig, 
    data: string | ArrayBuffer | Uint8Array
  ): Promise<void> {
    try {
      const deviceInfo = this.connectedDevices.get(deviceId);
      if (!deviceInfo || !deviceInfo.connected) {
        throw new Error('Dispositivo no conectado');
      }

      const characteristic = await this.connectToService(deviceInfo, serviceConfig);
      
      // Convertir datos al formato correcto
      let buffer: ArrayBuffer;
      if (typeof data === 'string') {
        buffer = new TextEncoder().encode(data).buffer;
      } else if (data instanceof Uint8Array) {
        buffer = data.buffer;
      } else {
        buffer = data;
      }

      await characteristic.writeValue(buffer);
      
      console.log('Datos enviados exitosamente');
      this.emitEvent('dataSent', { deviceId, data });

    } catch (error) {
      console.error('Error escribiendo a característica:', error);
      throw error;
    }
  }

  // Suscribirse a notificaciones
  async subscribeToNotifications(
    deviceId: string,
    serviceConfig: BluetoothServiceConfig,
    callback: (data: any) => void
  ): Promise<void> {
    try {
      const deviceInfo = this.connectedDevices.get(deviceId);
      if (!deviceInfo || !deviceInfo.connected) {
        throw new Error('Dispositivo no conectado');
      }

      const characteristic = await this.connectToService(deviceInfo, serviceConfig);
      
             // Agregar listener para notificaciones
       characteristic.addEventListener('characteristicvaluechanged', (event: any) => {
         const value = event.target.value;
         const uint8Array = new Uint8Array(value.buffer);
         const data = {
           buffer: uint8Array.buffer,
           uint8Array: uint8Array,
           string: new TextDecoder().decode(uint8Array)
         };
        
        callback(data);
        this.emitEvent('notificationReceived', { deviceId, data });
      });

      // Iniciar notificaciones
      await characteristic.startNotifications();
      
      console.log('Suscrito a notificaciones');

    } catch (error) {
      console.error('Error suscribiéndose a notificaciones:', error);
      throw error;
    }
  }

  // Desconectar dispositivo
  async disconnectDevice(deviceId: string): Promise<void> {
    try {
      const deviceInfo = this.connectedDevices.get(deviceId);
      if (deviceInfo && deviceInfo.server) {
        deviceInfo.server.disconnect();
        this.handleDeviceDisconnection(deviceId);
      }
    } catch (error) {
      console.error('Error desconectando dispositivo:', error);
    }
  }

  // Desconectar todos los dispositivos
  async disconnectAllDevices(): Promise<void> {
    const deviceIds = Array.from(this.connectedDevices.keys());
    for (const deviceId of deviceIds) {
      await this.disconnectDevice(deviceId);
    }
  }

  // Obtener dispositivos conectados
  getConnectedDevices(): BluetoothDeviceInfo[] {
    return Array.from(this.connectedDevices.values());
  }

  // Verificar si un dispositivo está conectado
  isDeviceConnected(deviceId: string): boolean {
    const device = this.connectedDevices.get(deviceId);
    return device ? device.connected : false;
  }

  // Manejo de desconexión
  private handleDeviceDisconnection(deviceId: string): void {
    const deviceInfo = this.connectedDevices.get(deviceId);
    if (deviceInfo) {
      deviceInfo.connected = false;
      this.emitEvent('deviceDisconnected', deviceInfo);
      this.connectedDevices.delete(deviceId);
    }
  }

  // Sistema de eventos
  addEventListener(event: string, callback: Function): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }

  removeEventListener(event: string, callback: Function): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      const index = eventListeners.indexOf(callback);
      if (index > -1) {
        eventListeners.splice(index, 1);
      }
    }
  }

  private emitEvent(event: string, data?: any): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.forEach(callback => callback(data));
    }
  }
}

// Instancia singleton del servicio
export const bluetoothService = new BluetoothService();

// Función de utilidad para enviar comandos JSON
export async function sendJSONCommand(
  deviceId: string, 
  command: object, 
  serviceConfig?: BluetoothServiceConfig
): Promise<void> {
  const config = serviceConfig || BLUETOOTH_SERVICES.CUSTOM;
  const jsonString = JSON.stringify(command);
  await bluetoothService.writeCharacteristic(deviceId, config, jsonString);
}

// Función de utilidad para leer datos como JSON
export async function readJSONData(
  deviceId: string, 
  serviceConfig?: BluetoothServiceConfig
): Promise<any> {
  const config = serviceConfig || BLUETOOTH_SERVICES.CUSTOM;
  const data = await bluetoothService.readCharacteristic(deviceId, config);
  return data.json || data.string;
}