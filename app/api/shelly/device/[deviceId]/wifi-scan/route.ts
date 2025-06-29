import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auth } from '@/lib/auth';

interface Params {
  deviceId: string;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<Params> }
) {
  try {
    const session = await auth();
    if (!session?.user?.systemId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { deviceId } = await params;

    // Buscar el dispositivo y su cuenta Shelly
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

    const { credential } = device;
    const apiHost = credential.apiHost?.replace('wss://', 'https://').replace('/rpc', '') || 'https://shelly-103-eu.shelly.cloud';

    // Usar cloudId si está disponible, sino deviceId original
    const targetId = device.cloudId || deviceId;

    // Descifrar token de acceso
    const { decrypt } = await import('@/lib/shelly/crypto');
    const accessToken = decrypt(credential.accessToken);

    // Escanear redes WiFi disponibles
    const scanResponse = await fetch(`${apiHost}/device/rpc/${targetId}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        method: 'WiFi.Scan',
        params: {}
      })
    });

    if (!scanResponse.ok) {
      const errorText = await scanResponse.text();
      console.error('Error en escaneo WiFi:', errorText);
      return NextResponse.json({ 
        error: 'Error al escanear redes WiFi',
        details: errorText 
      }, { status: scanResponse.status });
    }

    const scanResult = await scanResponse.json();

    // Verificar si hay error en la respuesta RPC
    if (scanResult.error) {
      return NextResponse.json({ 
        error: 'Error en dispositivo Shelly',
        details: scanResult.error 
      }, { status: 400 });
    }

    // Procesar las redes encontradas
    const networks = scanResult.result?.networks || [];
    
    // Filtrar y formatear las redes
    const formattedNetworks = networks
      .filter((network: any) => network.ssid && network.ssid.trim() !== '') // Filtrar SSIDs vacíos
      .map((network: any) => ({
        ssid: network.ssid,
        rssi: network.rssi || -100,
        security: network.auth || 'Open',
        channel: network.channel || 0
      }))
      .sort((a: any, b: any) => b.rssi - a.rssi); // Ordenar por intensidad de señal

    return NextResponse.json({
      success: true,
      networks: formattedNetworks,
      deviceId: targetId,
      scannedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error en escaneo WiFi:', error);
    return NextResponse.json({ 
      error: 'Error interno del servidor',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
} 