import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

interface Params {
  deviceId: string;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<Params> }
) {
  const session = await auth();
  if (!session?.user?.systemId) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const { deviceId } = await params;

    // Obtener el dispositivo de la BD
    const device = await prisma.smartPlugDevice.findFirst({
      where: {
        deviceId: deviceId,
        systemId: session.user.systemId
      }
    });

    if (!device) {
      return NextResponse.json({ error: 'Dispositivo no encontrado' }, { status: 404 });
    }

    // Construir configuración actual desde la BD
    const config = {
      timezone: device.timezone,
      autoUpdate: device.autoUpdate,
      wifi: {
        sta: {
          ssid: device.wifiSsid,
          enable: true
        },
        sta1: {
          ssid: device.wifiBackupSsid,
          enable: device.wifiBackupEnabled
        },
        ap: {
          enable: device.apModeEnabled
        }
      },
      switch: {
        auto_off: device.autoOffEnabled,
        auto_off_delay: device.autoOffDelay,
        power_limit: device.powerLimit,
        initial_state: 'off' // Por defecto
      },
      // LED para Gen 3
      ...(device.generation === '3' && {
        plugs_ui: {
          led: {
            mode: device.ledColorMode,
            brightness: device.ledBrightness,
            colors: {
              on: {
                rgb: [device.ledColorR, device.ledColorG, device.ledColorB]
              }
            },
            night_mode: {
              enable: device.ledNightMode
            }
          }
        }
      })
    };

    return NextResponse.json(config);

  } catch (error) {
    console.error('Error al obtener configuración:', error);
    return NextResponse.json({ 
      error: 'Error al obtener configuración',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<Params> }
) {
  const session = await auth();
  if (!session?.user?.systemId) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const { deviceId } = await params;
    const body = await request.json();
    const { endpoint, params: endpointParams } = body;

    // Obtener el dispositivo con sus credenciales
    const device = await prisma.smartPlugDevice.findFirst({
      where: {
        deviceId: deviceId,
        systemId: session.user.systemId
      },
      include: {
        credential: true
      }
    });

    if (!device || !device.credential) {
      return NextResponse.json({ error: 'Dispositivo no encontrado' }, { status: 404 });
    }

    console.log(`🔧 [CONFIG] Configuración solicitada:`, {
      endpoint,
      deviceId,
      params: endpointParams,
      deviceGeneration: device.generation,
      deviceModel: device.modelCode
    });

    // 🎯 ENVIAR CONFIGURACIÓN REAL A SHELLY CLOUD
    let shellyResponse;
    let appliedConfig = {};

    try {
      // 📛 CASO ESPECIAL: CAMBIAR NOMBRE DEL DISPOSITIVO (WebSocket Cloud + fallback RPC local)
      if (endpoint === 'device/set/name') {
        try {
          const { shellyWebSocketManager } = await import('@/lib/shelly/websocket-manager');
          
          if (device.generation === 'G1' || device.generation === '1') {
            // Gen 1: No soporta cambio de nombre
            throw new Error('Gen 1 no soporta cambio de nombre');
          } else {
            // Gen 2/3: Intentar comando WebSocket Cloud primero
            console.log(`🔧 [CONFIG] Intentando comando name via WebSocket Cloud:`, {
              credentialId: device.credential.id,
              deviceId: device.deviceId,
              cloudId: device.cloudId,
              newName: endpointParams.name
            });
            
            try {
              // Intentar comando WebSocket Cloud
              await shellyWebSocketManager.sendNameCommand(
                device.credential.id,
                device.deviceId,
                endpointParams.name
              );
              
              console.log(`✅ [CONFIG] Comando name enviado via WebSocket Cloud`);
              shellyResponse = { success: true, method: 'websocket_cloud' };
              
            } catch (wsError) {
              console.log(`⚠️ [CONFIG] WebSocket Cloud falló, intentando RPC local...`);
              
              // Fallback: Intentar RPC local si el dispositivo tiene IP
              if (device.deviceIp) {
                console.log(`🔧 [CONFIG] Intentando RPC local a ${device.deviceIp}:`, {
                  deviceIp: device.deviceIp,
                  newName: endpointParams.name
                });
                
                const rpcUrl = `http://${device.deviceIp}/rpc/Sys.SetConfig`;
                const rpcBody = {
                  config: {
                    device: {
                      name: endpointParams.name
                    }
                  }
                };
                
                const response = await fetch(rpcUrl, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json'
                  },
                  body: JSON.stringify(rpcBody),
                  signal: AbortSignal.timeout(5000) // 5 segundos timeout
                });
                
                if (!response.ok) {
                  throw new Error(`RPC local falló: ${response.status} ${response.statusText}`);
                }
                
                const result = await response.json();
                console.log(`✅ [CONFIG] RPC local exitoso:`, result);
                
                // Si requiere reinicio, enviarlo
                if (result.restart_required) {
                  console.log(`🔄 [CONFIG] Reiniciando dispositivo...`);
                  await fetch(`http://${device.deviceIp}/rpc/Sys.Reboot`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({}),
                    signal: AbortSignal.timeout(3000)
                  });
                }
                
                shellyResponse = { success: true, method: 'rpc_local', result };
              } else {
                throw new Error(`WebSocket Cloud no soporta cmd:name y no hay IP local disponible: ${wsError instanceof Error ? wsError.message : 'Error desconocido'}`);
              }
            }
          }
          
          appliedConfig = { name: endpointParams.name };
        } catch (nameError) {
          console.error(`❌ [CONFIG] Error en cambio de nombre:`, nameError);
          throw new Error(`Error cambiando nombre del dispositivo: ${nameError instanceof Error ? nameError.message : 'Error desconocido'}`);
        }
      } else {
        // 🔧 OTROS ENDPOINTS: Usar RPC directo a través de HTTP
        // Importar funciones necesarias
        const { decrypt } = await import('@/lib/shelly/crypto');
        
        // Descifrar token de acceso
        const accessToken = decrypt(device.credential.accessToken);
        
        // Construir URL y parámetros según el endpoint
        let url: string;
        let requestBody: any;

        switch (endpoint) {
          case 'Sys.SetConfig':
            // ⏰ CONFIGURAR SISTEMA (zona horaria, etc.) - según generación
            url = `${device.credential.apiHost}/device/rpc/${device.cloudId || deviceId}`;
            
            // Manejar zona horaria según generación
            if (endpointParams['config.location.tz']) {
              if (device.generation === 'G1' || device.generation === '1') {
                // Gen 1: Usar método directo de settings
                requestBody = {
                  method: 'HTTP.GET',
                  params: {
                    url: `/settings?tzautodetect=false&timezone=${encodeURIComponent(endpointParams['config.location.tz'])}`
                  }
                };
              } else {
                // Gen 2/3: Usar Sys.SetConfig con location
                requestBody = {
                  method: 'Sys.SetConfig',
                  params: {
                    config: {
                      location: {
                        tz: endpointParams['config.location.tz']
                      }
                    }
                  }
                };
              }
              appliedConfig = { timezone: endpointParams['config.location.tz'] };
            }
            break;

          case 'WiFi.SetConfig':
            // 📶 CONFIGURAR WIFI - usar RPC via Cloud
            url = `${device.credential.apiHost}/device/rpc/${device.cloudId || deviceId}`;
            
            let wifiConfig: any = {};
            
            // Manejar WiFi principal
            if (endpointParams['config.sta.ssid']) {
              wifiConfig.sta = {
                ssid: endpointParams['config.sta.ssid'],
                enable: true
              };
              appliedConfig = { wifiSsid: endpointParams['config.sta.ssid'] };
            }
            
            // Manejar WiFi backup
            if (endpointParams['config.sta1.enable'] !== undefined) {
              wifiConfig.sta1 = {
                enable: endpointParams['config.sta1.enable']
              };
              appliedConfig = { 
                ...appliedConfig,
                wifiBackupEnabled: endpointParams['config.sta1.enable']
              };
            }
            
            if (endpointParams['config.sta1.ssid']) {
              wifiConfig.sta1 = {
                ...wifiConfig.sta1,
                ssid: endpointParams['config.sta1.ssid']
              };
              appliedConfig = { 
                ...appliedConfig,
                wifiBackupSsid: endpointParams['config.sta1.ssid'] 
              };
            }
            
            // Manejar modo AP
            if (endpointParams['config.ap.enable'] !== undefined) {
              wifiConfig.ap = {
                enable: endpointParams['config.ap.enable']
              };
              appliedConfig = { 
                ...appliedConfig, 
                apModeEnabled: endpointParams['config.ap.enable'] 
              };
            }
            
            requestBody = {
              method: 'WiFi.SetConfig',
              params: {
                config: wifiConfig
              }
            };
            break;

          case 'Switch.SetConfig':
            // 🔌 CONFIGURAR SWITCH/RELÉ - según generación
            url = `${device.credential.apiHost}/device/rpc/${device.cloudId || deviceId}`;
            
            if (device.generation === 'G1' || device.generation === '1') {
              // Gen 1: Usar método directo de settings/relay/0
              let gen1Params: string[] = [];
              
              if (endpointParams['config.auto_off'] !== undefined) {
                gen1Params.push(`auto_off=${endpointParams['config.auto_off'] ? '1' : '0'}`);
                appliedConfig = { autoOffEnabled: endpointParams['config.auto_off'] };
              }
              
              if (endpointParams['config.auto_off_delay']) {
                gen1Params.push(`auto_off_delay=${endpointParams['config.auto_off_delay']}`);
                appliedConfig = { 
                  ...appliedConfig, 
                  autoOffDelay: parseInt(endpointParams['config.auto_off_delay']) 
                };
              }
              
              if (endpointParams['config.initial_state']) {
                const stateMapping = {
                  'restore_last': 'last',
                  'off': 'off',
                  'on': 'on'
                };
                const gen1State = stateMapping[endpointParams['config.initial_state']] || 'off';
                gen1Params.push(`default_state=${gen1State}`);
              }
              
              requestBody = {
                method: 'HTTP.GET',
                params: {
                  url: `/settings/relay/0?${gen1Params.join('&')}`
                }
              };
            } else {
              // Gen 2/3: Usar Switch.SetConfig estándar
              let switchConfig: any = {};
              
              if (endpointParams['config.auto_off'] !== undefined) {
                switchConfig.auto_off = endpointParams['config.auto_off'];
                appliedConfig = { autoOffEnabled: endpointParams['config.auto_off'] };
              }
              
              if (endpointParams['config.auto_off_delay']) {
                switchConfig.auto_off_delay = parseInt(endpointParams['config.auto_off_delay']);
                appliedConfig = { 
                  ...appliedConfig, 
                  autoOffDelay: parseInt(endpointParams['config.auto_off_delay']) 
                };
              }
              
              if (endpointParams['config.power_limit'] !== undefined) {
                switchConfig.power_limit = parseFloat(endpointParams['config.power_limit']);
                appliedConfig = { 
                  ...appliedConfig, 
                  powerLimit: parseFloat(endpointParams['config.power_limit']) 
                };
              }
              
              if (endpointParams['config.initial_state']) {
                switchConfig.initial_state = endpointParams['config.initial_state'];
              }
              
              requestBody = {
                method: 'Switch.SetConfig',
                params: {
                  id: 0,
                  config: switchConfig
                }
              };
            }
            break;

          case 'PLUGS_UI.SetConfig':
            // 💡 CONFIGURAR LED (Gen 3) - usar RPC via Cloud
            url = `${device.credential.apiHost}/device/rpc/${device.cloudId || deviceId}`;
            
            let ledConfig: any = {};
            
            // Manejar modo LED
            if (endpointParams['config.mode']) {
              ledConfig.mode = endpointParams['config.mode'];
              appliedConfig = { ledColorMode: endpointParams['config.mode'] };
            }
            
            // Manejar brillo
            if (endpointParams['config.brightness'] !== undefined) {
              ledConfig.brightness = parseInt(endpointParams['config.brightness']);
              appliedConfig = { 
                ...appliedConfig, 
                ledBrightness: parseInt(endpointParams['config.brightness']) 
              };
            }
            
            // Manejar colores RGB
            if (endpointParams['config.colors.on.rgb[0]'] !== undefined) {
              appliedConfig = { 
                ...appliedConfig, 
                ledColorR: parseInt(endpointParams['config.colors.on.rgb[0]']) 
              };
            }
            if (endpointParams['config.colors.on.rgb[1]'] !== undefined) {
              appliedConfig = { 
                ...appliedConfig, 
                ledColorG: parseInt(endpointParams['config.colors.on.rgb[1]']) 
              };
            }
            if (endpointParams['config.colors.on.rgb[2]'] !== undefined) {
              appliedConfig = { 
                ...appliedConfig, 
                ledColorB: parseInt(endpointParams['config.colors.on.rgb[2]']) 
              };
            }
            
            // Manejar modo nocturno
            if (endpointParams['config.night_mode.enable'] !== undefined) {
              ledConfig.night_mode = {
                enable: endpointParams['config.night_mode.enable']
              };
              appliedConfig = { 
                ...appliedConfig, 
                ledNightMode: endpointParams['config.night_mode.enable'] 
              };
            }
            
            requestBody = {
              method: 'PLUGS_UI.SetConfig',
              params: {
                config: ledConfig
              }
            };
            break;

          default:
            throw new Error(`Endpoint no soportado: ${endpoint}`);
        }

        console.log(`🔧 [CONFIG] Enviando configuración a Shelly Cloud:`, {
          endpoint,
          deviceId,
          cloudId: device.cloudId,
          url,
          config: appliedConfig,
          requestBody
        });

        // Enviar request a Shelly Cloud con el formato correcto
        const requestOptions: RequestInit = {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(requestBody)
        };

        const response = await fetch(url, requestOptions);

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Error de Shelly Cloud (${response.status}): ${errorText}`);
        }

        shellyResponse = await response.json();
        console.log(`✅ [CONFIG] Respuesta de Shelly Cloud:`, shellyResponse);

        // Verificar si hay errores en la respuesta RPC
        if (shellyResponse.error) {
          throw new Error(`Error RPC: ${shellyResponse.error.message || shellyResponse.error}`);
        }
      }

    } catch (shellyError) {
      console.error(`❌ [CONFIG] Error enviando a Shelly Cloud:`, shellyError);
      return NextResponse.json({ 
        error: 'Error al enviar configuración a Shelly Cloud',
        details: shellyError instanceof Error ? shellyError.message : 'Error desconocido'
      }, { status: 400 });
    }

    // 🎯 ACTUALIZAR BD LOCAL CON LA CONFIGURACIÓN APLICADA
    if (Object.keys(appliedConfig).length > 0) {
      await prisma.smartPlugDevice.update({
        where: { id: device.id },
        data: {
          ...appliedConfig,
          updatedAt: new Date()
        }
      });
      
      console.log(`💾 [CONFIG] BD actualizada con:`, appliedConfig);
    }

    return NextResponse.json({ 
      success: true,
      message: 'Configuración actualizada correctamente',
      applied: appliedConfig,
      shellyResponse: shellyResponse || null
    });

  } catch (error) {
    console.error('Error al aplicar configuración:', error);
    return NextResponse.json({ 
      error: 'Error al aplicar configuración',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
} 