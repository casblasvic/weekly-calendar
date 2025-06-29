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

    // 🎯 APLICAR CONFIGURACIÓN SEGÚN EL ENDPOINT
    let updateData: any = {};
    let deviceConfigChanged = false;
    
    // Mapear los parámetros según el endpoint
    if (endpoint === 'device/set/name' && endpointParams.name) {
      updateData.name = endpointParams.name;
      deviceConfigChanged = true;
    }
    
    if (endpoint === 'Sys.SetConfig' && endpointParams.config?.location?.tz) {
      updateData.timezone = endpointParams.config.location.tz;
      deviceConfigChanged = true;
    }
    
    if (endpoint === 'WiFi.SetConfig' && endpointParams.config) {
      if (endpointParams.config.sta) {
        updateData.wifiSsid = endpointParams.config.sta.ssid;
      }
      if (endpointParams.config.sta1) {
        updateData.wifiBackupEnabled = endpointParams.config.sta1.enable;
        updateData.wifiBackupSsid = endpointParams.config.sta1.ssid;
      }
      if (endpointParams.config.ap !== undefined) {
        updateData.apModeEnabled = endpointParams.config.ap.enable;
      }
      deviceConfigChanged = true;
    }

    if (endpoint === 'Switch.SetConfig' && endpointParams.config) {
      if (endpointParams.config.auto_off !== undefined) {
        updateData.autoOffEnabled = endpointParams.config.auto_off;
      }
      if (endpointParams.config.auto_off_delay) {
        updateData.autoOffDelay = endpointParams.config.auto_off_delay;
      }
      if (endpointParams.config.power_limit !== undefined) {
        updateData.powerLimit = endpointParams.config.power_limit;
      }
      deviceConfigChanged = true;
    }

    // Actualizar en la BD local
    if (deviceConfigChanged && Object.keys(updateData).length > 0) {
      await prisma.smartPlugDevice.update({
        where: { id: device.id },
        data: {
          ...updateData,
          updatedAt: new Date()
        }
      });
    }

    return NextResponse.json({ 
      success: true,
      message: 'Configuración actualizada',
      applied: updateData
    });

  } catch (error) {
    console.error('Error al aplicar configuración:', error);
    return NextResponse.json({ 
      error: 'Error al aplicar configuración',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
} 