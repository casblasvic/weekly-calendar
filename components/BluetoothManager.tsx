'use client';

import React, { useState, useEffect } from 'react';
import { useBluetooth } from '../hooks/useBluetooth';
import { BLUETOOTH_SERVICES } from '../services/bluetoothService';

export default function BluetoothManager() {
  const {
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
  } = useBluetooth();

  const [selectedService, setSelectedService] = useState('CUSTOM');
  const [message, setMessage] = useState('');
  const [receivedData, setReceivedData] = useState<any[]>([]);
  const [isListening, setIsListening] = useState<string[]>([]);

  // Limpiar datos recibidos cuando se cambie de servicio
  useEffect(() => {
    setReceivedData([]);
  }, [selectedService]);

  // Función para conectar a un dispositivo
  const handleConnect = async () => {
    try {
      const serviceConfig = BLUETOOTH_SERVICES[selectedService as keyof typeof BLUETOOTH_SERVICES];
      
      // Filtros específicos según el tipo de servicio
      let filters;
      if (selectedService === 'HEART_RATE') {
        filters = [{ services: [serviceConfig.serviceUUID] }];
      } else if (selectedService === 'BATTERY') {
        filters = [{ services: [serviceConfig.serviceUUID] }];
      } else {
        // Para servicios personalizados, buscar por nombre
        filters = [
          { namePrefix: 'Arduino' },
          { namePrefix: 'ESP32' },
          { namePrefix: 'RaspberryPi' },
          { namePrefix: 'nRF' }
        ];
      }

      await scanAndConnect(filters, serviceConfig);
    } catch (err) {
      console.error('Error conectando:', err);
    }
  };

  // Función para enviar un mensaje
  const handleSendMessage = async (deviceId: string) => {
    if (!message.trim()) return;

    try {
      const serviceConfig = BLUETOOTH_SERVICES[selectedService as keyof typeof BLUETOOTH_SERVICES];
      
      // Intentar parsear como JSON, si no es válido enviar como string
      let dataToSend;
      try {
        dataToSend = JSON.parse(message);
      } catch {
        dataToSend = message;
      }

      await sendData(deviceId, dataToSend, serviceConfig);
      setMessage('');
      
      // Agregar a la lista de datos enviados
      setReceivedData(prev => [...prev, {
        type: 'sent',
        data: dataToSend,
        timestamp: new Date().toLocaleTimeString()
      }]);
    } catch (err) {
      console.error('Error enviando mensaje:', err);
    }
  };

  // Función para leer datos del dispositivo
  const handleReadData = async (deviceId: string) => {
    try {
      const serviceConfig = BLUETOOTH_SERVICES[selectedService as keyof typeof BLUETOOTH_SERVICES];
      const data = await readData(deviceId, serviceConfig);
      
      setReceivedData(prev => [...prev, {
        type: 'read',
        data: data,
        timestamp: new Date().toLocaleTimeString()
      }]);
    } catch (err) {
      console.error('Error leyendo datos:', err);
    }
  };

  // Función para suscribirse a notificaciones
  const handleSubscribeNotifications = async (deviceId: string) => {
    try {
      const serviceConfig = BLUETOOTH_SERVICES[selectedService as keyof typeof BLUETOOTH_SERVICES];
      
      await subscribeToNotifications(deviceId, (data) => {
        setReceivedData(prev => [...prev, {
          type: 'notification',
          data: data,
          timestamp: new Date().toLocaleTimeString()
        }]);
      }, serviceConfig);

      setIsListening(prev => [...prev, deviceId]);
    } catch (err) {
      console.error('Error suscribiéndose a notificaciones:', err);
    }
  };

  // Función para enviar comandos predefinidos
  const handleSendCommand = async (deviceId: string, command: string) => {
    const commands = {
      'led_on': { action: 'led', state: 'on' },
      'led_off': { action: 'led', state: 'off' },
      'get_status': { action: 'status' },
      'get_sensor': { action: 'sensor', type: 'temperature' },
      'reset': { action: 'reset' }
    };

    const commandData = commands[command as keyof typeof commands];
    if (commandData) {
      await sendData(deviceId, commandData);
      
      setReceivedData(prev => [...prev, {
        type: 'sent',
        data: commandData,
        timestamp: new Date().toLocaleTimeString()
      }]);
    }
  };

  if (!isAvailable) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h2 className="text-lg font-semibold text-red-800 mb-2">
            Bluetooth no disponible
          </h2>
          <p className="text-red-600">
            Tu navegador no soporta Web Bluetooth API o Bluetooth está deshabilitado.
          </p>
          <p className="text-sm text-red-500 mt-2">
            Nota: Web Bluetooth solo funciona en Chrome/Edge sobre HTTPS.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-4">
          Gestor de Conexiones Bluetooth
        </h1>
        
        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <div className="flex justify-between items-center">
              <p className="text-red-600">{error}</p>
              <button
                onClick={clearError}
                className="text-red-400 hover:text-red-600"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Service Selection */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Tipo de Servicio Bluetooth:
          </label>
          <select
            value={selectedService}
            onChange={(e) => setSelectedService(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
          >
            {Object.entries(BLUETOOTH_SERVICES).map(([key, service]) => (
              <option key={key} value={key}>
                {service.name}
              </option>
            ))}
          </select>
        </div>

        {/* Connection Controls */}
        <div className="flex gap-4 mb-4">
          <button
            onClick={handleConnect}
            disabled={isScanning || isConnecting}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isScanning ? 'Escaneando...' : isConnecting ? 'Conectando...' : 'Conectar Dispositivo'}
          </button>

          {devices.length > 0 && (
            <button
              onClick={disconnectAll}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
            >
              Desconectar Todos
            </button>
          )}
        </div>
      </div>

      {/* Connected Devices */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">
          Dispositivos Conectados ({devices.length})
        </h2>

        {devices.length === 0 ? (
          <p className="text-gray-500">No hay dispositivos conectados</p>
        ) : (
          <div className="space-y-4">
            {devices.map((device) => (
              <div key={device.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-semibold text-gray-800">{device.name}</h3>
                    <p className="text-sm text-gray-500">ID: {device.id}</p>
                    <span className={`inline-block px-2 py-1 text-xs rounded-full ${
                      device.connected ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {device.connected ? 'Conectado' : 'Desconectado'}
                    </span>
                  </div>
                  
                  <button
                    onClick={() => disconnect(device.id)}
                    className="px-3 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-600"
                  >
                    Desconectar
                  </button>
                </div>

                {/* Device Controls */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2 mb-4">
                  <button
                    onClick={() => handleReadData(device.id)}
                    className="px-3 py-2 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                  >
                    Leer Datos
                  </button>
                  
                  <button
                    onClick={() => handleSubscribeNotifications(device.id)}
                    disabled={isListening.includes(device.id)}
                    className="px-3 py-2 bg-purple-600 text-white text-sm rounded hover:bg-purple-700 disabled:opacity-50"
                  >
                    {isListening.includes(device.id) ? 'Escuchando...' : 'Notificaciones'}
                  </button>

                  <button
                    onClick={() => handleSendCommand(device.id, 'led_on')}
                    className="px-3 py-2 bg-yellow-600 text-white text-sm rounded hover:bg-yellow-700"
                  >
                    LED ON
                  </button>

                  <button
                    onClick={() => handleSendCommand(device.id, 'get_status')}
                    className="px-3 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                  >
                    Estado
                  </button>
                </div>

                {/* Message Input */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Mensaje o JSON (ej: {'action': 'led', 'state': 'on'})"
                    className="flex-1 p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage(device.id)}
                  />
                  <button
                    onClick={() => handleSendMessage(device.id)}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    Enviar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Data Log */}
      {receivedData.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-800">
              Registro de Datos ({receivedData.length})
            </h2>
            <button
              onClick={() => setReceivedData([])}
              className="px-3 py-1 bg-gray-500 text-white text-sm rounded hover:bg-gray-600"
            >
              Limpiar
            </button>
          </div>

          <div className="max-h-64 overflow-y-auto space-y-2">
            {receivedData.slice().reverse().map((item, index) => (
              <div key={index} className={`p-3 rounded-lg border-l-4 ${
                item.type === 'sent' ? 'bg-blue-50 border-blue-400' :
                item.type === 'read' ? 'bg-green-50 border-green-400' :
                'bg-purple-50 border-purple-400'
              }`}>
                <div className="flex justify-between items-start mb-1">
                  <span className={`text-sm font-medium ${
                    item.type === 'sent' ? 'text-blue-800' :
                    item.type === 'read' ? 'text-green-800' :
                    'text-purple-800'
                  }`}>
                    {item.type === 'sent' ? '📤 Enviado' :
                     item.type === 'read' ? '📥 Leído' :
                     '🔔 Notificación'}
                  </span>
                  <span className="text-xs text-gray-500">{item.timestamp}</span>
                </div>
                <pre className="text-sm text-gray-700 whitespace-pre-wrap">
                  {typeof item.data === 'object' ? JSON.stringify(item.data, null, 2) : item.data}
                </pre>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Usage Instructions */}
      <div className="bg-gray-50 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-3">
          Instrucciones de Uso
        </h2>
        <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
          <li>Selecciona el tipo de servicio Bluetooth apropiado para tu dispositivo</li>
          <li>Haz clic en "Conectar Dispositivo" y selecciona tu dispositivo de la lista</li>
          <li>Una vez conectado, puedes leer datos, enviar comandos, o suscribirte a notificaciones</li>
          <li>Los datos JSON se procesan automáticamente</li>
          <li>Ejemplos de comandos: {'{"action": "led", "state": "on"}'} o simples strings</li>
        </ul>
      </div>
    </div>
  );
}