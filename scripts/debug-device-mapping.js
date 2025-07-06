#!/usr/bin/env node

/**
 * 🔍 SCRIPT DE DIAGNÓSTICO - Mapeo de Dispositivos Shelly
 * 
 * Ayuda a identificar por qué un dispositivo recibido por WebSocket
 * no se encuentra en la base de datos.
 */

const { PrismaClient } = require('@prisma/client');
// const prisma = new PrismaClient(); // MIGRADO: usar singleton desde @/lib/db

async function debugDeviceMapping() {
  try {
    console.log('🔍 DIAGNÓSTICO DE MAPEO DE DISPOSITIVOS SHELLY\n');

    // 1. Obtener todas las credenciales Shelly
    const credentials = await prisma.shellyCredential.findMany({
      include: {
        smartPlugs: true
      }
    });

    console.log(`📊 Encontradas ${credentials.length} credenciales Shelly:\n`);

    for (const credential of credentials) {
      console.log(`🔑 Credencial: ${credential.name} (${credential.id})`);
      console.log(`   📍 Host: ${credential.apiHost}`);
      console.log(`   🔌 Dispositivos: ${credential.smartPlugs.length}`);
      
      if (credential.smartPlugs.length > 0) {
        console.log('   📋 Lista de dispositivos:');
        credential.smartPlugs.forEach((device, index) => {
          console.log(`      ${index + 1}. ${device.name}`);
          console.log(`         📱 deviceId: ${device.deviceId}`);
          console.log(`         ☁️  cloudId: ${device.cloudId || 'NO DEFINIDO'}`);
          console.log(`         🔗 Online: ${device.online ? '✅' : '❌'}`);
          console.log(`         📅 Última vez visto: ${device.lastSeenAt || 'NUNCA'}`);
        });
      }
      console.log('');
    }

    // 2. Buscar dispositivos problemáticos (sin cloudId)
    const devicesWithoutCloudId = await prisma.smartPlugDevice.findMany({
      where: {
        cloudId: null
      },
      include: {
        credential: true
      }
    });

    if (devicesWithoutCloudId.length > 0) {
      console.log('⚠️  DISPOSITIVOS SIN CLOUD ID:');
      devicesWithoutCloudId.forEach((device, index) => {
        console.log(`   ${index + 1}. ${device.name} (deviceId: ${device.deviceId})`);
        console.log(`      Credencial: ${device.credential.name}`);
      });
      console.log('');
    }

    // 3. Buscar dispositivos offline hace mucho tiempo
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const staleDevices = await prisma.smartPlugDevice.findMany({
      where: {
        OR: [
          { lastSeenAt: { lt: oneHourAgo } },
          { lastSeenAt: null }
        ]
      },
      include: {
        credential: true
      }
    });

    if (staleDevices.length > 0) {
      console.log('⏰ DISPOSITIVOS OFFLINE > 1 HORA:');
      staleDevices.forEach((device, index) => {
        console.log(`   ${index + 1}. ${device.name} (${device.online ? 'Marcado Online' : 'Marcado Offline'})`);
        console.log(`      Última vez visto: ${device.lastSeenAt || 'NUNCA'}`);
        console.log(`      DeviceId: ${device.deviceId}`);
        console.log(`      CloudId: ${device.cloudId || 'NO DEFINIDO'}`);
      });
      console.log('');
    }

    // 4. Suggestions para resolver problemas
    console.log('💡 SUGERENCIAS PARA RESOLVER PROBLEMAS:\n');
    
    if (devicesWithoutCloudId.length > 0) {
      console.log('1. 🔧 Ejecutar sincronización para mapear cloudIds:');
      console.log('   - Ve a Configuración > Integraciones > Enchufes Inteligentes');
      console.log('   - Click en "Sincronizar" para cada credencial');
      console.log('');
    }

    console.log('2. 🔍 Para dispositivo específico no encontrado:');
    console.log('   - Verifica que el deviceId recibido por WebSocket coincida con el de BD');
    console.log('   - Si es un cloudId numérico, debe mapearse al deviceId real');
    console.log('   - Revisa los logs de auto-mapping en el WebSocket Manager');
    console.log('');

    console.log('3. 📡 Para problemas de WebSocket:');
    console.log('   - Verifica que las credenciales estén activas');
    console.log('   - Verifica que autoReconnect esté habilitado');
    console.log('   - Revisa los logs de conexión WebSocket');

  } catch (error) {
    console.error('❌ Error en diagnóstico:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  debugDeviceMapping();
}

module.exports = { debugDeviceMapping }; 