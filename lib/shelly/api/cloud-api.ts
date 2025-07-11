interface ShellyCredential {
  id: string;
  accessToken: string;
  apiHost: string; // ej: https://shelly-47-eu.shelly.cloud
}

export class ShellyCloudAPI {
  private credential: ShellyCredential;

  constructor(credential: ShellyCredential) {
    this.credential = credential;
  }

  async controlDevice(deviceId: string, action: 'on' | 'off'): Promise<void> {
    // Extraer server ID del apiHost (ej: shelly-47-eu)
    const serverMatch = this.credential.apiHost.match(/shelly-(\d+)-(\w+)/);
    if (!serverMatch) {
      throw new Error(`Formato de apiHost inválido: ${this.credential.apiHost}`);
    }
    
    const url = `${this.credential.apiHost}/device/relay/control`;
    
    let response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.credential.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        id: deviceId,
        channel: 0,
        turn: action
      }),
      signal: AbortSignal.timeout(10000) // 10 segundos timeout
    });

    // Si hay error 401, intentar refrescar token
    if (response.status === 401) {
      console.log('🔄 Token expirado en Cloud API, intentando refrescar...');
      
      try {
        await this.refreshToken();
        
        // Reintentar con el nuevo token
        response = await fetch(url, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.credential.accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            id: deviceId,
            channel: 0,
            turn: action
          }),
          signal: AbortSignal.timeout(10000)
        });
        
        console.log('✅ Token refrescado exitosamente en Cloud API');
        
      } catch (refreshError) {
        console.error('❌ Error refrescando token en Cloud API:', refreshError);
        throw new Error(`Token expirado y no se pudo refrescar: ${refreshError instanceof Error ? refreshError.message : 'Error desconocido'}`);
      }
    }

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Error en Cloud API: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    if (!result.isok) {
      throw new Error(`Cloud API falló: ${result.errors?.join(', ') || 'Error desconocido'}`);
    }
  }

  async getDeviceStatus(deviceId: string): Promise<any> {
    const url = `${this.credential.apiHost}/device/status?id=${deviceId}`;
    
    let response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${this.credential.accessToken}`,
      },
      signal: AbortSignal.timeout(10000)
    });

    // Si hay error 401, intentar refrescar token
    if (response.status === 401) {
      console.log('🔄 Token expirado en getDeviceStatus, intentando refrescar...');
      
      try {
        await this.refreshToken();
        
        // Reintentar con el nuevo token
        response = await fetch(url, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${this.credential.accessToken}`,
          },
          signal: AbortSignal.timeout(10000)
        });
        
        console.log('✅ Token refrescado exitosamente en getDeviceStatus');
        
      } catch (refreshError) {
        console.error('❌ Error refrescando token en getDeviceStatus:', refreshError);
        throw new Error(`Token expirado y no se pudo refrescar: ${refreshError instanceof Error ? refreshError.message : 'Error desconocido'}`);
      }
    }

    if (!response.ok) {
      const errorText = await response.text();
      
      // 🎯 MANEJO ESPECÍFICO DE ERRORES DE PERMISOS
      if (response.status === 400) {
        try {
          const errorData = JSON.parse(errorText);
          if (errorData.errors?.no_permissions) {
            // Error de permisos - crear un error más específico
            const permissionError = new Error(`Sin permisos para acceder al dispositivo ${deviceId}`);
            (permissionError as any).code = 'NO_PERMISSIONS';
            (permissionError as any).status = 400;
            (permissionError as any).deviceId = deviceId;
            throw permissionError;
          }
        } catch (parseError) {
          // Si no se puede parsear, continuar con el error genérico
        }
      }
      
      // 🎯 MANEJO ESPECÍFICO DEL ERROR 429 (TOO_MANY_REQUESTS)
      if (response.status === 429) {
        try {
          const errorData = JSON.parse(errorText);
          const rateLimitError = new Error(`Rate limit excedido para dispositivo ${deviceId}: ${errorData.error || 'Too many requests'}`);
          (rateLimitError as any).code = 'RATE_LIMIT_EXCEEDED';
          (rateLimitError as any).status = 429;
          (rateLimitError as any).deviceId = deviceId;
          (rateLimitError as any).retryAfter = response.headers.get('Retry-After') || '60'; // Default 60 segundos
          throw rateLimitError;
        } catch (parseError) {
          // Si no se puede parsear, crear error genérico de rate limit
          const rateLimitError = new Error(`Rate limit excedido para dispositivo ${deviceId}`);
          (rateLimitError as any).code = 'RATE_LIMIT_EXCEEDED';
          (rateLimitError as any).status = 429;
          (rateLimitError as any).deviceId = deviceId;
          throw rateLimitError;
        }
      }
      
      throw new Error(`Error obteniendo estado: ${response.status} - ${errorText}`);
    }

    return await response.json();
  }

  private async refreshToken(): Promise<void> {
    const { decrypt, encrypt } = await import('../crypto');
    const { refreshShellyToken } = await import('../client');
    
    // Obtener credencial actualizada de BD
    const { prisma } = await import('@/lib/db');
    
    const credential = await prisma.shellyCredential.findUnique({
      where: { id: this.credential.id }
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
    
    // Actualizar token local
    this.credential.accessToken = newTokens.access_token;
  }
} 