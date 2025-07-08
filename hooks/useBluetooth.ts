import { useState, useEffect, useCallback } from 'react';
import { 
  bluetoothService, 
  BluetoothDeviceInfo, 
  BluetoothServiceConfig,
  BLUETOOTH_SERVICES 
} from '../services/bluetoothService';

interface UseBluetoothReturn {
  // Estado
  devices: BluetoothDeviceInfo[];
  isScanning: boolean;
  isConnecting: boolean;
  isAvailable: boolean;
  error: string | null;
  
  // Funciones
  scanAndConnect: (filters?: BluetoothLEScanFilter[], serviceConfig?: BluetoothServiceConfig) => Promise<BluetoothDeviceInfo | null>;
  disconnect: (deviceId: string) => Promise<void>;
  disconnectAll: () => Promise<void>;
  sendData: (deviceId: string, data: string | object, serviceConfig?: BluetoothServiceConfig) => Promise<void>;
  readData: (deviceId: string, serviceConfig?: BluetoothServiceConfig) => Promise<any>;
  subscribeToNotifications: (deviceId: string, callback: (data: any) => void, serviceConfig?: BluetoothServiceConfig) => Promise<void>;
  clearError: () => void;
}

export function useBluetooth(): UseBluetoothReturn {
  const [devices, setDevices] = useState<BluetoothDeviceInfo[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isAvailable, setIsAvailable] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Verificar disponibilidad al montar el componente
  useEffect(() => {
    const checkAvailability = async () => {
      try {
        const available = await bluetoothService.isBluetoothAvailable();
        setIsAvailable(available);
      } catch (err) {
        console.error('Error checking Bluetooth availability:', err);
        setIsAvailable(false);
      }
    };

    checkAvailability();
  }, []);

  // Event listeners para el servicio Bluetooth
  useEffect(() => {
    const handleDeviceConnected = (deviceInfo: BluetoothDeviceInfo) => {
      setDevices(prev => {
        const index = prev.findIndex(d => d.id === deviceInfo.id);
        if (index >= 0) {
          const newDevices = [...prev];
          newDevices[index] = deviceInfo;
          return newDevices;
        } else {
          return [...prev, deviceInfo];
        }
      });
      setIsConnecting(false);
      setError(null);
    };

    const handleDeviceDisconnected = (deviceInfo: BluetoothDeviceInfo) => {
      setDevices(prev => prev.filter(d => d.id !== deviceInfo.id));
    };

    const handleError = (err: any) => {
      setError(err.message || 'Error de Bluetooth desconocido');
      setIsScanning(false);
      setIsConnecting(false);
    };

    // Agregar listeners
    bluetoothService.addEventListener('deviceConnected', handleDeviceConnected);
    bluetoothService.addEventListener('deviceDisconnected', handleDeviceDisconnected);
    bluetoothService.addEventListener('error', handleError);

    // Cleanup
    return () => {
      bluetoothService.removeEventListener('deviceConnected', handleDeviceConnected);
      bluetoothService.removeEventListener('deviceDisconnected', handleDeviceDisconnected);
      bluetoothService.removeEventListener('error', handleError);
    };
  }, []);

  // Escanear y conectar
  const scanAndConnect = useCallback(async (
    filters?: BluetoothLEScanFilter[], 
    serviceConfig?: BluetoothServiceConfig
  ): Promise<BluetoothDeviceInfo | null> => {
    if (!isAvailable) {
      setError('Bluetooth no está disponible');
      return null;
    }

    setIsScanning(true);
    setIsConnecting(true);
    setError(null);

    try {
      const deviceInfo = await bluetoothService.scanAndConnect(filters, serviceConfig);
      setIsScanning(false);
      return deviceInfo;
    } catch (err: any) {
      setError(err.message || 'Error durante la conexión');
      setIsScanning(false);
      setIsConnecting(false);
      return null;
    }
  }, [isAvailable]);

  // Desconectar dispositivo
  const disconnect = useCallback(async (deviceId: string): Promise<void> => {
    try {
      await bluetoothService.disconnectDevice(deviceId);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Error al desconectar');
    }
  }, []);

  // Desconectar todos los dispositivos
  const disconnectAll = useCallback(async (): Promise<void> => {
    try {
      await bluetoothService.disconnectAllDevices();
      setDevices([]);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Error al desconectar todos los dispositivos');
    }
  }, []);

  // Enviar datos
  const sendData = useCallback(async (
    deviceId: string, 
    data: string | object, 
    serviceConfig?: BluetoothServiceConfig
  ): Promise<void> => {
    try {
      const config = serviceConfig || BLUETOOTH_SERVICES.CUSTOM;
      
      if (typeof data === 'object') {
        const jsonString = JSON.stringify(data);
        await bluetoothService.writeCharacteristic(deviceId, config, jsonString);
      } else {
        await bluetoothService.writeCharacteristic(deviceId, config, data);
      }
      
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Error enviando datos');
    }
  }, []);

  // Leer datos
  const readData = useCallback(async (
    deviceId: string, 
    serviceConfig?: BluetoothServiceConfig
  ): Promise<any> => {
    try {
      const config = serviceConfig || BLUETOOTH_SERVICES.CUSTOM;
      const data = await bluetoothService.readCharacteristic(deviceId, config);
      setError(null);
      return data;
    } catch (err: any) {
      setError(err.message || 'Error leyendo datos');
      return null;
    }
  }, []);

     // Suscribirse a notificaciones
   const subscribeToNotifications = useCallback(async (
     deviceId: string,
     callback: (data: any) => void,
     serviceConfig?: BluetoothServiceConfig
   ): Promise<void> => {
     try {
       const config = serviceConfig || BLUETOOTH_SERVICES.CUSTOM;
       await bluetoothService.subscribeToNotifications(deviceId, config, callback);
       setError(null);
     } catch (err: any) {
       setError(err.message || 'Error suscribiéndose a notificaciones');
     }
   }, []);

  // Limpiar error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    devices,
    isScanning,
    isConnecting,
    isAvailable,
    error,
    scanAndConnect,
    disconnect,
    disconnectAll,
    sendData,
    readData,
    subscribeToNotifications,
    clearError
  };
}

// Hook especializado para dispositivos específicos
export function useBluetoothDevice(deviceType: keyof typeof BLUETOOTH_SERVICES) {
  const bluetooth = useBluetooth();
  const serviceConfig = BLUETOOTH_SERVICES[deviceType];

  const connectToDeviceType = useCallback(async () => {
    return await bluetooth.scanAndConnect(undefined, serviceConfig);
  }, [bluetooth, serviceConfig]);

  const sendCommand = useCallback(async (deviceId: string, command: object) => {
    return await bluetooth.sendData(deviceId, command, serviceConfig);
  }, [bluetooth, serviceConfig]);

  const readDeviceData = useCallback(async (deviceId: string) => {
    return await bluetooth.readData(deviceId, serviceConfig);
  }, [bluetooth, serviceConfig]);

  return {
    ...bluetooth,
    serviceConfig,
    connectToDeviceType,
    sendCommand,
    readDeviceData
  };
}