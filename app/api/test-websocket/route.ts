import { NextRequest, NextResponse } from 'next/server';
import { getServerAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerAuthSession();
    
    if (!session?.user?.systemId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    console.log('🧪 TEST WEBSOCKET - Iniciando diagnóstico completo...');

    // 1. Verificar credenciales
    const credentials = await prisma.shellyCredential.findMany({
      include: {
        smartPlugs: {
          where: { excludeFromSync: false }
        }
      }
    });

    console.log(`📊 Credenciales encontradas: ${credentials.length}`);
    credentials.forEach(cred => {
      console.log(`  - ${cred.name}: status=${cred.status}, dispositivos=${cred.smartPlugs.length}`);
    });

    // 2. Verificar conexiones WebSocket
    const connections = await prisma.webSocketConnection.findMany({
      orderBy: { createdAt: 'desc' }
    });

    console.log(`🔗 Conexiones WebSocket: ${connections.length}`);
    connections.forEach(conn => {
      const metadata = conn.metadata as any;
      console.log(`  - ${conn.type}: ${metadata?.alias || 'Sin alias'} (${conn.status})`);
    });

    // 3. Verificar dispositivos
    const devices = await prisma.smartPlugDevice.findMany({
      where: { systemId: session.user.systemId },
      include: { credential: true }
    });

    console.log(`🔌 Dispositivos: ${devices.length}`);
    devices.forEach(device => {
      console.log(`  - ${device.name} (${device.deviceId}): online=${device.online}, relayOn=${device.relayOn}, power=${device.currentPower}W`);
    });

    // 4. Verificar logs recientes
    const recentLogs = await prisma.webSocketLog.findMany({
      where: {
        connection: {
          isNot: null
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: { connection: true }
    });

    console.log(`📝 Logs recientes: ${recentLogs.length}`);
    recentLogs.forEach(log => {
      console.log(`  - ${log.eventType}: ${log.message} (${log.createdAt.toLocaleTimeString()})`);
    });

    return NextResponse.json({
      success: true,
      data: {
        credentials: credentials.length,
        connectedCredentials: credentials.filter(c => c.status === 'connected').length,
        connections: connections.length,
        shellyConnections: connections.filter(c => c.type === 'SHELLY').length,
        socketIoConnections: connections.filter(c => c.type === 'SOCKET_IO').length,
        devices: devices.length,
        onlineDevices: devices.filter(d => d.online).length,
        recentLogs: recentLogs.length,
        details: {
          credentials: credentials.map(c => ({
            name: c.name,
            status: c.status,
            devices: c.smartPlugs.length
          })),
          connections: connections.map(c => {
            const metadata = c.metadata as any;
            return {
              type: c.type,
              alias: metadata?.alias || 'Sin alias',
              status: c.status,
              lastPing: c.lastPingAt
            };
          }),
          devices: devices.map(d => ({
            name: d.name,
            deviceId: d.deviceId,
            online: d.online,
            relayOn: d.relayOn,
            currentPower: d.currentPower,
            credentialName: d.credential?.name
          }))
        }
      }
    });

  } catch (error) {
    console.error('❌ Error en test WebSocket:', error);
    return NextResponse.json(
      { 
        error: 'Error en test', 
        details: error instanceof Error ? error.message : 'Error desconocido' 
      },
      { status: 500 }
    );
  }
} 