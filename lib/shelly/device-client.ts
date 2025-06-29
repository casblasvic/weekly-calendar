/**
 * ========================================
 * PLUGIN SHELLY - DEVICE CLIENT (LEGACY)
 * ========================================
 * 
 * ⚠️ CLIENTE LEGACY PARA COMPATIBILIDAD
 * Este módulo proporciona compatibilidad con conexiones HTTP locales.
 * NO es la forma recomendada de integración con Shelly.
 * 
 * 🔌 INTEGRACIÓN RECOMENDADA: SHELLY CLOUD
 * - Usar WebSocket Manager para conexiones via Shelly Cloud
 * - NO utilizar conexiones directas a IPs locales
 * - Usar diccionarios de endpoints por generación
 * 
 * 📡 CONFIGURACIÓN DE CONEXIÓN (LEGACY):
 * - Requiere IP local del dispositivo (no recomendado)
 * - Host API: Se obtiene del campo `apiHost` en la tabla `ShellyCredential`
 * - Para uso moderno: Usar WebSocket Commands via Shelly Cloud
 * 
 * 🆔 MAPEO DE DISPOSITIVOS:
 * - deviceId (BD): ID interno almacenado en `SmartPlugDevice.deviceId`
 * - cloudId: ID numérico de Shelly Cloud (se mapea automáticamente via WebSocket)
 * - Para WebSocket Commands: Usar cloudId mapeado, NO el deviceId de BD
 * - El mapeo se construye dinámicamente desde eventos WebSocket
 * 
 * 🏗️ ARQUITECTURA DEL PLUGIN:
 * 1. Credenciales → Tabla `ShellyCredential` (apiHost, tokens)
 * 2. Dispositivos → Tabla `SmartPlugDevice` (deviceId, credentialId)
 * 3. WebSocket Manager → Maneja conexiones y mapeo automático (RECOMENDADO)
 * 4. Device Client → Cliente legacy para HTTP local (COMPATIBILIDAD)
 * 
 * 📊 TABLAS DE BASE DE DATOS:
 * - `ShellyCredential`: Credenciales OAuth2 y apiHost
 * - `SmartPlugDevice`: Dispositivos vinculados (deviceId, credentialId)
 * 
 * 🎯 USO RECOMENDADO:
 * En lugar de este cliente, usar:
 * - WebSocket Manager para control en tiempo real
 * - Diccionarios de endpoints (gen1, gen2, gen3)
 * - WebSocket Commands via Shelly Cloud
 * 
 * 🔄 MIGRACIÓN:
 * Este cliente se mantiene para:
 * - Compatibilidad con código existente
 * - Fallback cuando WebSocket no está disponible
 * - Sincronización inicial de dispositivos
 */

import { SmartPlugDevice, ShellyCredential } from '@prisma/client';
import { 
  UnifiedDeviceCommands, 
  UnifiedDeviceStatus,
  detectDeviceGeneration,
  gen1Endpoints,
  gen1Commands,
  gen1Utils,
  gen2Methods,
  gen2Utils,
  gen3Methods,
  gen3Utils,
  Gen2RPCMessage,
  statusMappers,
  errorHandlers
} from './api/endpoints';
import { ShellyCloudAPI } from './api/cloud-api';
import { decrypt } from './crypto';

export interface ShellyDeviceWithCredential extends SmartPlugDevice {
  shellyCredential: ShellyCredential;
}

export class ShellyDeviceClient {
  private generation: string;
  private accessToken?: string;
  private wsConnection?: WebSocket;
  private rpcIdCounter = 1;
  private shellyDeviceId: string;

  constructor(
    private device: ShellyDeviceWithCredential
  ) {
    this.generation = String(device.generation || '1');
    this.accessToken = device.shellyCredential.accessToken;
    this.shellyDeviceId = device.deviceId;
  }

  /**
   * Encender el dispositivo
   */
  async turnOn(): Promise<void> {
    try {
      // Intentar primero conexión local con timeout corto
      if (this.device.deviceIp) {
        await this.turnOnLocal();
        return;
      }
    } catch (error) {
      console.log(`⚠️ Conexión local falló para ${this.device.deviceId}, intentando Cloud API...`);
    }
    
    // Fallback a Cloud API según la generación
    switch (this.generation) {
      case '1':
      case 'G1':
        await this.turnOnCloud(); // Usa API Gen 1
        break;
      case '2':
      case 'G2':
      case '3':
      case 'G3':
        await this.turnOnGen2Plus(); // Usa API RPC
        break;
      default:
        throw new Error(`Generación ${this.generation} no soportada`);
    }
  }

  /**
   * Apagar el dispositivo
   */
  async turnOff(): Promise<void> {
    try {
      // Intentar primero conexión local con timeout corto
      if (this.device.deviceIp) {
        await this.turnOffLocal();
        return;
      }
    } catch (error) {
      console.log(`⚠️ Conexión local falló para ${this.device.deviceId}, intentando Cloud API...`);
    }
    
    // Fallback a Cloud API según la generación
    switch (this.generation) {
      case '1':
      case 'G1':
        await this.turnOffCloud(); // Usa API Gen 1
        break;
      case '2':
      case 'G2':
      case '3':
      case 'G3':
        await this.turnOffGen2Plus(); // Usa API RPC
        break;
      default:
        throw new Error(`Generación ${this.generation} no soportada`);
    }
  }

  /**
   * Alternar estado del dispositivo
   */
  async toggle(): Promise<boolean> {
    try {
      switch (this.generation) {
        case '1':
        case 'G1':
          return await this.toggleGen1();
        case '2':
        case 'G2':
        case '3':
        case 'G3':
          return await this.toggleGen2Plus();
        default:
          throw new Error(`Generación ${this.generation} no soportada`);
      }
    } catch (error) {
      console.error('Error al alternar dispositivo:', error);
      throw error;
    }
  }

  /**
   * Obtener estado del dispositivo
   */
  async getStatus(): Promise<UnifiedDeviceStatus> {
    try {
      switch (this.generation) {
        case '1':
        case 'G1':
          return await this.getStatusGen1();
        case '2':
        case 'G2':
          return await this.getStatusGen2();
        case '3':
        case 'G3':
          return await this.getStatusGen3();
        default:
          throw new Error(`Generación ${this.generation} no soportada`);
      }
    } catch (error) {
      console.error('Error al obtener estado:', error);
      throw error;
    }
  }

  /**
   * Resetear contadores de energía
   */
  async resetEnergyCounters(): Promise<boolean> {
    try {
      switch (this.generation) {
        case '1':
        case 'G1':
          return await this.resetEnergyGen1();
        case '2':
        case 'G2':
        case '3':
        case 'G3':
          return await this.resetEnergyGen2Plus();
        default:
          throw new Error(`Generación ${this.generation} no soportada`);
      }
    } catch (error) {
      console.error('Error al resetear contadores:', error);
      throw error;
    }
  }

  /**
   * Establecer nombre del dispositivo
   */
  async setDeviceName(name: string): Promise<boolean> {
    try {
      // Primero intentar cambiar el nombre en la nube si tenemos credenciales
      if (this.accessToken && this.device.shellyCredential.apiHost) {
        try {
          const response = await fetch(`${this.device.shellyCredential.apiHost}/device/set/name`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${this.accessToken}`,
              'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams({
              id: this.shellyDeviceId,
              name: name
            }).toString()
          });

          if (!response.ok) {
            console.warn('No se pudo actualizar el nombre en la nube, intentando localmente');
          }
        } catch (error) {
          console.warn('Error al actualizar nombre en la nube:', error);
        }
      }

      // Luego actualizar localmente si es Gen 2/3
      if (this.generation === '1' || this.generation === 'G1') {
        // Gen 1 no soporta nombres locales, solo en la nube
        return true;
      }
      
      const method = gen2Methods.Sys.SetConfig;
      const params = { config: { device: { name } } };
      
      if (this.device.deviceIp) {
        const response = await this.callLocalRPC(method, params);
        return !!response.result;
      }
      
      return true;
    } catch (error) {
      console.error('Error al establecer nombre:', error);
      return false;
    }
  }

  /**
   * Establecer límite de potencia
   */
  async setPowerLimit(limitW: number): Promise<boolean> {
    try {
      if (this.generation === '1' || this.generation === 'G1') {
        // Gen 1 tiene soporte limitado
        return false;
      }
      
      const method = gen2Methods.Switch.SetConfig;
      const params = { id: 0, config: { power_limit: limitW } };
      
      if (this.device.deviceIp) {
        const response = await this.callLocalRPC(method, params);
        return !!response.result;
      } else {
        const response = await this.callCloudRPC(method, params);
        return !!response.result;
      }
    } catch (error) {
      console.error('Error al establecer límite de potencia:', error);
      return false;
    }
  }

  /**
   * Configurar auto-apagado
   */
  async setAutoOff(enabled: boolean, delaySeconds?: number): Promise<boolean> {
    try {
      if (this.generation === '1' || this.generation === 'G1') {
        // Gen 1 usa timer en comandos individuales
        return false;
      }
      
      const method = gen2Methods.Switch.SetConfig;
      const params = { 
        id: 0, 
        config: { 
          auto_off: enabled,
          ...(delaySeconds && { auto_off_delay: delaySeconds })
        } 
      };
      
      if (this.device.deviceIp) {
        const response = await this.callLocalRPC(method, params);
        return !!response.result;
      } else {
        const response = await this.callCloudRPC(method, params);
        return !!response.result;
      }
    } catch (error) {
      console.error('Error al configurar auto-apagado:', error);
      return false;
    }
  }

  /**
   * Configurar auto-encendido
   */
  async setAutoOn(enabled: boolean, delaySeconds?: number): Promise<boolean> {
    try {
      if (this.generation === '1' || this.generation === 'G1') {
        // Gen 1 usa timer en comandos individuales
        return false;
      }
      
      const method = gen2Methods.Switch.SetConfig;
      const params = { 
        id: 0, 
        config: { 
          auto_on: enabled,
          ...(delaySeconds && { auto_on_delay: delaySeconds })
        } 
      };
      
      if (this.device.deviceIp) {
        const response = await this.callLocalRPC(method, params);
        return !!response.result;
      } else {
        const response = await this.callCloudRPC(method, params);
        return !!response.result;
      }
    } catch (error) {
      console.error('Error al configurar auto-encendido:', error);
      return false;
    }
  }

  /**
   * Métodos específicos para Gen 3 - Control de LED
   */
  async setAppointmentLED(isActive: boolean): Promise<boolean> {
    if (this.generation !== '3' && this.generation !== 'G3') {
      return false;
    }

    try {
      const config = gen3Utils.buildAppointmentLEDConfig(isActive);
      const method = gen3Methods.PLUGS_UI.SetConfig;
      
      if (this.device.deviceIp) {
        const response = await this.callLocalRPC(method, config);
        return !!response.result;
      } else {
        const response = await this.callCloudRPC(method, config);
        return !!response.result;
      }
    } catch (error) {
      console.error('Error al configurar LED de cita:', error);
      return false;
    }
  }

  async setAlertLED(alertType: 'overpower' | 'overtemp' | 'fraud'): Promise<boolean> {
    if (this.generation !== '3' && this.generation !== 'G3') {
      return false;
    }

    try {
      const config = gen3Utils.buildAlertLEDConfig(alertType);
      const method = gen3Methods.PLUGS_UI.SetConfig;
      
      if (this.device.deviceIp) {
        const response = await this.callLocalRPC(method, config);
        return !!response.result;
      } else {
        const response = await this.callCloudRPC(method, config);
        return !!response.result;
      }
    } catch (error) {
      console.error('Error al configurar LED de alerta:', error);
      return false;
    }
  }

  /**
   * Implementaciones específicas para Gen 1
   */
  private async turnOnGen1(): Promise<boolean> {
    const url = gen1Endpoints.relay.control(this.device.deviceIp!, 0);
    const params = gen1Commands.turnOn({});
    const fullUrl = gen1Utils.buildUrl(url, params);
    
    const response = await fetch(fullUrl);
    const data = await response.json();
    return data.ison === true;
  }

  private async turnOffGen1(): Promise<boolean> {
    const url = gen1Endpoints.relay.control(this.device.deviceIp!, 0);
    const params = gen1Commands.turnOff({});
    const fullUrl = gen1Utils.buildUrl(url, params);
    
    const response = await fetch(fullUrl);
    const data = await response.json();
    return data.ison === false;
  }

  private async toggleGen1(): Promise<boolean> {
    const url = gen1Endpoints.relay.control(this.device.deviceIp!, 0);
    const params = gen1Commands.toggle({});
    const fullUrl = gen1Utils.buildUrl(url, params);
    
    const response = await fetch(fullUrl);
    const data = await response.json();
    return gen1Utils.isValidResponse(data);
  }

  private async getStatusGen1(): Promise<UnifiedDeviceStatus> {
    const url = gen1Endpoints.status.full(this.device.deviceIp!);
    const response = await fetch(url);
    const data = await response.json();
    return statusMappers.gen1ToUnified(data, this.shellyDeviceId);
  }

  private async resetEnergyGen1(): Promise<boolean> {
    const url = gen1Endpoints.meter.reset(this.device.deviceIp!, 0);
    const response = await fetch(url);
    return response.ok;
  }

  /**
   * Implementaciones para Gen 2/3
   */
  private async turnOnGen2Plus(): Promise<boolean> {
    // Usar WebSocket commands que es más compatible y eficiente
    const { shellyWebSocketManager } = await import('./websocket-manager');
    await shellyWebSocketManager.controlDevice(this.device.credentialId!, this.device.deviceId, 'on');
    return true;
  }

  private async turnOffGen2Plus(): Promise<boolean> {
    // Usar WebSocket commands que es más compatible y eficiente
    const { shellyWebSocketManager } = await import('./websocket-manager');
    await shellyWebSocketManager.controlDevice(this.device.credentialId!, this.device.deviceId, 'off');
    return true;
  }

  private async toggleGen2Plus(): Promise<boolean> {
    const method = gen2Methods.Switch.Toggle;
    const params = { id: 0 };
    
    if (this.device.deviceIp) {
      const response = await this.callLocalRPC(method, params);
      return gen2Utils.isValidRPCResponse(response);
    } else {
      const response = await this.callCloudRPC(method, params);
      return gen2Utils.isValidRPCResponse(response);
    }
  }

  private async getStatusGen2(): Promise<UnifiedDeviceStatus> {
    const statusMethod = gen2Methods.Shelly.GetStatus;
    const infoMethod = gen2Methods.Shelly.GetDeviceInfo;
    
    if (this.device.deviceIp) {
      const [statusResponse, infoResponse] = await Promise.all([
        this.callLocalRPC(statusMethod),
        this.callLocalRPC(infoMethod)
      ]);
      return statusMappers.gen2ToUnified(statusResponse.result, infoResponse.result);
    } else {
      const [statusResponse, infoResponse] = await Promise.all([
        this.callCloudRPC(statusMethod),
        this.callCloudRPC(infoMethod)
      ]);
      return statusMappers.gen2ToUnified(statusResponse.result, infoResponse.result);
    }
  }

  private async getStatusGen3(): Promise<UnifiedDeviceStatus> {
    const statusMethod = gen3Methods.Shelly.GetStatus;
    const infoMethod = gen3Methods.Shelly.GetDeviceInfo;
    
    if (this.device.deviceIp) {
      const [statusResponse, infoResponse] = await Promise.all([
        this.callLocalRPC(statusMethod),
        this.callLocalRPC(infoMethod)
      ]);
      return statusMappers.gen3ToUnified(statusResponse.result, infoResponse.result);
    } else {
      const [statusResponse, infoResponse] = await Promise.all([
        this.callCloudRPC(statusMethod),
        this.callCloudRPC(infoMethod)
      ]);
      return statusMappers.gen3ToUnified(statusResponse.result, infoResponse.result);
    }
  }

  private async resetEnergyGen2Plus(): Promise<boolean> {
    const method = gen2Methods.Switch.ResetCounters;
    const params = { id: 0 };
    
    if (this.device.deviceIp) {
      const response = await this.callLocalRPC(method, params);
      return gen2Utils.isValidRPCResponse(response);
    } else {
      const response = await this.callCloudRPC(method, params);
      return gen2Utils.isValidRPCResponse(response);
    }
  }

  /**
   * Llamadas RPC locales y en la nube
   */
  private async callLocalRPC(method: string, params?: any): Promise<any> {
    const url = gen2Utils.buildHTTPRPCUrl(this.device.deviceIp!, method);
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        id: Date.now(),
        method,
        params: params || {}
      }),
      signal: AbortSignal.timeout(3000) // 3 segundos timeout para local
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    if (data.error) {
      throw new Error(`RPC Error: ${data.error.message}`);
    }

    return data.result;
  }

  private async callCloudRPC(method: string, params?: any): Promise<any> {
    if (!this.accessToken || !this.device.shellyCredential.apiHost) {
      throw new Error('Credenciales de nube no disponibles');
    }

    const devicePath = `/device/rpc/${this.shellyDeviceId}`;
    const url = `${this.device.shellyCredential.apiHost}${devicePath}`;
    
    const body = {
      method,
      params: params || {},
    };

    let response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    // Si hay error 401, intentar refrescar token
    if (response.status === 401) {
      console.log('🔄 Token expirado en Cloud RPC, intentando refrescar...');
      
      try {
        const { decrypt, encrypt } = await import('./crypto');
        const { refreshShellyToken } = await import('./client');
        
        // Obtener credencial actualizada de BD
        const { PrismaClient } = await import('@prisma/client');
        const prisma = new PrismaClient();
        
        const credential = await prisma.shellyCredential.findUnique({
          where: { id: this.device.credentialId! }
        });
        
        if (!credential) {
          throw new Error('Credencial no encontrada');
        }
        
        // Refrescar tokens
        const refreshToken = decrypt(credential.refreshToken);
        const newTokens = await refreshShellyToken(credential.apiHost, refreshToken);
        
        // Actualizar tokens en BD
        await prisma.shellyCredential.update({
          where: { id: credential.id },
          data: {
            accessToken: encrypt(newTokens.access_token),
            refreshToken: encrypt(newTokens.refresh_token),
            status: 'connected'
          }
        });
        
        // Actualizar token local y reintentar
        this.accessToken = newTokens.access_token;
        
        response = await fetch(url, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
        });
        
        console.log('✅ Token refrescado exitosamente');
        
      } catch (refreshError) {
        console.error('❌ Error refrescando token:', refreshError);
        throw new Error(`Token expirado y no se pudo refrescar: ${refreshError instanceof Error ? refreshError.message : 'Error desconocido'}`);
      }
    }

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Cloud RPC error: ${error}`);
    }

    return response.json();
  }

  /**
   * Obtener configuración WiFi
   */
  async getWifiConfig(): Promise<any> {
    try {
      switch (this.generation) {
        case '1':
        case 'G1':
          const url = gen1Endpoints.settings.get(this.device.deviceIp!);
          const response = await fetch(url);
          const data = await response.json();
          return {
            sta: data.wifi_sta,
            sta1: data.wifi_sta1,
            ap: data.wifi_ap,
          };
        case '2':
        case 'G2':
        case '3':
        case 'G3':
          const method = 'Wifi.GetConfig';
          if (this.device.deviceIp) {
            const response = await this.callLocalRPC(method);
            return response.result;
          } else {
            const response = await this.callCloudRPC(method);
            return response.result;
          }
        default:
          throw new Error(`Generación ${this.generation} no soportada`);
      }
    } catch (error) {
      console.error('Error al obtener configuración WiFi:', error);
      throw error;
    }
  }

  /**
   * Establecer configuración WiFi
   */
  async setWifiConfig(config: {
    sta?: { ssid: string; pass?: string; enable: boolean };
    sta1?: { ssid: string; pass?: string; enable: boolean };
    ap?: { enable: boolean };
  }): Promise<void> {
    try {
      switch (this.generation) {
        case '1':
        case 'G1':
          // Gen 1 usa parámetros URL
          const params = new URLSearchParams();
          if (config.sta) {
            params.append('wifi_sta.enabled', config.sta.enable.toString());
            params.append('wifi_sta.ssid', config.sta.ssid);
            if (config.sta.pass) params.append('wifi_sta.key', config.sta.pass);
          }
          if (config.sta1) {
            params.append('wifi_sta1.enabled', config.sta1.enable.toString());
            params.append('wifi_sta1.ssid', config.sta1.ssid);
            if (config.sta1.pass) params.append('wifi_sta1.key', config.sta1.pass);
          }
          if (config.ap !== undefined) {
            params.append('wifi_ap.enabled', config.ap.enable.toString());
          }
          const url = `${gen1Endpoints.settings.set(this.device.deviceIp!)}?${params.toString()}`;
          await fetch(url);
          break;
        case '2':
        case 'G2':
        case '3':
        case 'G3':
          const method = 'Wifi.SetConfig';
          const wifiConfig: any = { config: {} };
          if (config.sta) wifiConfig.config.sta = config.sta;
          if (config.sta1) wifiConfig.config.sta1 = config.sta1;
          if (config.ap) wifiConfig.config.ap = config.ap;
          
          if (this.device.deviceIp) {
            await this.callLocalRPC(method, wifiConfig);
          } else {
            await this.callCloudRPC(method, wifiConfig);
          }
          break;
      }
    } catch (error) {
      console.error('Error al establecer configuración WiFi:', error);
      throw error;
    }
  }

  /**
   * Obtener zona horaria
   */
  async getTimezone(): Promise<string> {
    try {
      switch (this.generation) {
        case '1':
        case 'G1':
          const url = gen1Endpoints.settings.get(this.device.deviceIp!);
          const response = await fetch(url);
          const data = await response.json();
          return data.timezone || 'UTC';
        case '2':
        case 'G2':
        case '3':
        case 'G3':
          const method = 'Sys.GetConfig';
          if (this.device.deviceIp) {
            const response = await this.callLocalRPC(method);
            return response.result?.location?.tz || 'UTC';
          } else {
            const response = await this.callCloudRPC(method);
            return response.result?.location?.tz || 'UTC';
          }
        default:
          throw new Error(`Generación ${this.generation} no soportada`);
      }
    } catch (error) {
      console.error('Error al obtener zona horaria:', error);
      return 'UTC';
    }
  }

  /**
   * Establecer zona horaria
   */
  async setTimezone(timezone: string): Promise<void> {
    try {
      switch (this.generation) {
        case '1':
        case 'G1':
          const url = `${gen1Endpoints.settings.set(this.device.deviceIp!)}?timezone=${encodeURIComponent(timezone)}`;
          await fetch(url);
          break;
        case '2':
        case 'G2':
        case '3':
        case 'G3':
          const method = 'Sys.SetConfig';
          const params = {
            config: {
              location: { tz: timezone }
            }
          };
          if (this.device.deviceIp) {
            await this.callLocalRPC(method, params);
          } else {
            await this.callCloudRPC(method, params);
          }
          break;
      }
    } catch (error) {
      console.error('Error al establecer zona horaria:', error);
      throw error;
    }
  }

  /**
   * Obtener información de actualización
   */
  async getUpdateInfo(): Promise<{ available: boolean; version?: string }> {
    try {
      switch (this.generation) {
        case '1':
        case 'G1':
          const url = `http://${this.device.deviceIp}/ota`;
          const response = await fetch(url);
          const data = await response.json();
          return {
            available: data.has_update,
            version: data.new_version
          };
        case '2':
        case 'G2':
        case '3':
        case 'G3':
          const method = 'Shelly.GetStatus';
          if (this.device.deviceIp) {
            const response = await this.callLocalRPC(method);
            const version = response.result?.sys?.available_updates?.stable?.version;
            return {
              available: !!version,
              version
            };
          } else {
            const response = await this.callCloudRPC(method);
            const version = response.result?.sys?.available_updates?.stable?.version;
            return {
              available: !!version,
              version
            };
          }
        default:
          throw new Error(`Generación ${this.generation} no soportada`);
      }
    } catch (error) {
      console.error('Error al obtener información de actualización:', error);
      return { available: false };
    }
  }

  /**
   * Realizar actualización de firmware
   */
  async performUpdate(): Promise<void> {
    try {
      switch (this.generation) {
        case '1':
        case 'G1':
          const url = `http://${this.device.deviceIp}/ota?update=true`;
          await fetch(url, { method: 'POST' });
          break;
        case '2':
        case 'G2':
        case '3':
        case 'G3':
          const method = 'Shelly.Update';
          const params = { stage: 'stable' };
          if (this.device.deviceIp) {
            await this.callLocalRPC(method, params);
          } else {
            await this.callCloudRPC(method, params);
          }
          break;
      }
    } catch (error) {
      console.error('Error al actualizar firmware:', error);
      throw error;
    }
  }

  /**
   * Establecer actualización automática
   */
  async setAutoUpdate(enabled: boolean): Promise<void> {
    try {
      switch (this.generation) {
        case '1':
        case 'G1':
          const url = `${gen1Endpoints.settings.set(this.device.deviceIp!)}?autoupdate_enabled=${enabled}`;
          await fetch(url);
          break;
        case '2':
        case 'G2':
        case '3':
        case 'G3':
          const method = 'Sys.SetConfig';
          const params = {
            config: {
              device: { 
                fw_update: { 
                  enable: enabled 
                } 
              }
            }
          };
          if (this.device.deviceIp) {
            await this.callLocalRPC(method, params);
          } else {
            await this.callCloudRPC(method, params);
          }
          break;
      }
    } catch (error) {
      console.error('Error al establecer actualización automática:', error);
      throw error;
    }
  }

  private async turnOnLocal(): Promise<void> {
    const gen = String(this.device.generation);
    if (gen === '1') {
      await this.turnOnGen1();
    } else {
      await this.turnOnGen2Plus();
    }
  }

  private async turnOffLocal(): Promise<void> {
    const gen = String(this.device.generation);
    if (gen === '1') {
      await this.turnOffGen1();
    } else {
      await this.turnOffGen2Plus();
    }
  }

  private async turnOnCloud(): Promise<void> {
    const cloudApi = new ShellyCloudAPI(this.device.shellyCredential);
    await cloudApi.controlDevice(this.device.deviceId, 'on');
  }

  private async turnOffCloud(): Promise<void> {
    const cloudApi = new ShellyCloudAPI(this.device.shellyCredential);
    await cloudApi.controlDevice(this.device.deviceId, 'off');
  }
}

/**
 * Factory para crear clientes de dispositivos
 */
export const shellyDeviceClient = {
  async getClient(device: ShellyDeviceWithCredential): Promise<ShellyDeviceClient> {
    return new ShellyDeviceClient(device);
  },

  async detectGeneration(deviceInfo: any): Promise<1 | 2 | 3> {
    return detectDeviceGeneration(deviceInfo);
  },
}; 