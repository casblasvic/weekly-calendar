/**
 * ========================================
 * PLUGIN SHELLY - ARQUITECTURA COMPLETA
 * ========================================
 * 
 * 🔌 INTEGRACIÓN SHELLY CLOUD
 * Este plugin se integra completamente con dispositivos Shelly a través de Shelly Cloud API.
 * NO utiliza conexiones directas a las IPs locales de los dispositivos.
 * 
 * 📡 CONFIGURACIÓN DE CONEXIÓN:
 * - Host API: Se obtiene del campo `apiHost` en la tabla `ShellyCredential`
 * - URL Base: Almacenada en `ShellyCredential.apiHost` (ej: "shelly-103-eu.shelly.cloud")
 * - Autenticación: Tokens OAuth2 almacenados en `ShellyCredential.accessToken`
 * - WebSocket URL: wss://{apiHost}/device/relay
 * 
 * 🆔 MAPEO AUTOMÁTICO DE DISPOSITIVOS:
 * - deviceId (BD): ID interno almacenado en `SmartPlugDevice.deviceId`
 * - cloudId: ID numérico de Shelly Cloud (NO almacenado en BD)
 * - El mapeo se construye automáticamente desde eventos WebSocket
 * - Map interno: deviceIdMapping.set(deviceId, cloudId)
 * - Ejemplo: "b0b21c12dd94" → "194279021665684"
 * 
 * 🏗️ ARQUITECTURA DEL PLUGIN:
 * 
 * 1. 📊 TABLAS DE BASE DE DATOS:
 *    - `ShellyCredential`: Credenciales OAuth2 y apiHost por usuario
 *    - `SmartPlugDevice`: Dispositivos vinculados (deviceId, credentialId, datos)
 *    - `WebSocketConnection`: Estado de conexiones WebSocket activas
 *    - `WebSocketLog`: Logs de eventos y comandos WebSocket
 * 
 * 2. 🔌 GESTIÓN DE CONEXIONES:
 *    - WebSocket Manager: Maneja conexiones persistentes a Shelly Cloud
 *    - Auto-reconexión: Reconecta automáticamente en caso de fallo
 *    - Heartbeat: Mantiene conexiones activas con ping/pong
 *    - Mapeo automático: Construye deviceId → cloudId dinámicamente
 * 
 * 3. 📚 DICCIONARIOS POR GENERACIÓN:
 *    - Gen1: HTTP REST API (limitado, legacy)
 *    - Gen2: RPC JSON-RPC 2.0 + WebSocket Commands (completo)
 *    - Gen3: Hereda Gen2 + funcionalidades LED RGB (avanzado)
 * 
 * 4. ⚡ CONTROL DE DISPOSITIVOS:
 *    - WebSocket Commands: Método prioritario via Shelly Cloud
 *    - HTTP RPC local: Fallback para dispositivos accesibles localmente
 *    - HTTP REST: Compatibilidad con dispositivos Gen1
 * 
 * 5. 🔄 SINCRONIZACIÓN:
 *    - Detección automática de generación del dispositivo
 *    - Sincronización específica por generación
 *    - Actualización de datos en tiempo real via WebSocket
 * 
 * 🎯 FLUJO DE FUNCIONAMIENTO:
 * 
 * 1. **Configuración inicial:**
 *    - Usuario conecta cuenta Shelly Cloud
 *    - Se almacenan credenciales en `ShellyCredential`
 *    - Se obtienen dispositivos y se almacenan en `SmartPlugDevice`
 * 
 * 2. **Conexión WebSocket:**
 *    - WebSocket Manager conecta a Shelly Cloud
 *    - Se establecen conexiones por credencial
 *    - Se reciben eventos StatusOnChange en tiempo real
 * 
 * 3. **Mapeo automático:**
 *    - Eventos WebSocket contienen deviceId y cloudId
 *    - Se construye mapeo automático en memoria
 *    - Map: deviceId (BD) → cloudId (Shelly Cloud)
 * 
 * 4. **Control de dispositivos:**
 *    - UI usa deviceId de la BD
 *    - WebSocket Manager mapea automáticamente a cloudId
 *    - Se envía comando WebSocket usando cloudId correcto
 * 
 * 5. **Actualización de estado:**
 *    - Eventos WebSocket actualizan estado en tiempo real
 *    - Se almacenan cambios en `SmartPlugDevice`
 *    - UI se actualiza automáticamente
 * 
 * 📁 ESTRUCTURA DE ARCHIVOS:
 * 
 * lib/shelly/
 * ├── api/endpoints/
 * │   ├── gen1.ts          # Diccionario Gen1 (HTTP REST)
 * │   ├── gen2.ts          # Diccionario Gen2 (RPC + WebSocket)
 * │   ├── gen3.ts          # Diccionario Gen3 (Gen2 + LED)
 * │   └── index.ts         # Exportaciones unificadas
 * ├── websocket-manager.ts # Gestor principal de WebSocket
 * ├── device-client.ts     # Cliente legacy para HTTP local
 * ├── robust-websocket-manager.ts # Manager robusto con auto-reconexión
 * ├── crypto.ts           # Utilidades de encriptación
 * └── index.ts            # Este archivo - Arquitectura completa
 * 
 * 🚀 VENTAJAS DE ESTA ARQUITECTURA:
 * 
 * ✅ **Sin dependencia de red local**: Todo via Shelly Cloud
 * ✅ **Mapeo automático**: No hardcoding de IDs
 * ✅ **Tiempo real**: WebSocket para eventos instantáneos
 * ✅ **Multi-generación**: Soporte completo Gen1, Gen2, Gen3
 * ✅ **Escalable**: Múltiples usuarios y credenciales
 * ✅ **Robusto**: Auto-reconexión y manejo de errores
 * ✅ **Plugin-ready**: Estructura modular para marketplace
 * 
 * 🔧 USO DEL PLUGIN:
 * 
 * ```typescript
 * // 1. Conectar credencial
 * await shellyWebSocketManager.connectCredential(credentialId);
 * 
 * // 2. Controlar dispositivo (usa mapeo automático)
 * await shellyWebSocketManager.controlDevice(credentialId, deviceId, 'on');
 * 
 * // 3. Sincronizar dispositivo
 * await fetch(`/api/shelly/device/${deviceId}/sync`, { method: 'POST' });
 * 
 * // 4. Configurar dispositivo (específico por generación)
 * const gen2Command = gen2Commands.setDeviceName('Nuevo Nombre');
 * await shellyWebSocketManager.sendCommand(credentialId, deviceId, 
 *   gen2Command.method, gen2Command.params);
 * ```
 * 
 * 📋 REQUISITOS:
 * - Cuenta Shelly Cloud activa
 * - Dispositivos Shelly vinculados a la cuenta
 * - Acceso a internet para conexión WebSocket
 * - Tokens OAuth2 válidos en `ShellyCredential`
 */

// Exportar todos los componentes del plugin
export * from './websocket-manager';
export * from './device-client';
export * from './robust-websocket-manager';
export * from './api/endpoints';

// Tipos principales
export interface UnifiedDeviceStatus {
  relay: {
    isOn: boolean;
    source: string;
  };
  power?: {
    current: number;
    voltage: number;
    total: number;
  };
  energy?: {
    total: number;
    lastMinute: number;
  };
  temperature?: {
    celsius: number;
    fahrenheit: number;
  };
  wifi?: {
    ssid: string;
    rssi: number;
    connected: boolean;
  };
  cloud?: {
    connected: boolean;
  };
  firmware?: {
    version: string;
    hasUpdate: boolean;
  };
}

// Configuración del plugin
export const SHELLY_PLUGIN_CONFIG = {
  name: 'Shelly IoT Integration',
  version: '1.0.0',
  description: 'Integración completa con dispositivos Shelly via Cloud API',
  author: 'SaaS Clínicas',
  supportedGenerations: ['Gen1', 'Gen2', 'Gen3'],
  features: [
    'Control remoto via WebSocket',
    'Mapeo automático de dispositivos',
    'Sincronización en tiempo real',
    'Configuración avanzada por generación',
    'LED RGB para Gen3',
    'Auto-reconexión robusta'
  ],
  requirements: [
    'Cuenta Shelly Cloud',
    'Dispositivos Shelly vinculados',
    'Conexión a internet',
    'Tokens OAuth2 válidos'
  ]
}; 