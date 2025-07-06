#!/usr/bin/env node

/**
 * 🔍 VERIFICAR Y SUGERIR CORRECCIONES DE CLOUDID
 * 
 * Este script analiza todos los dispositivos y sugiere correcciones
 * para aquellos que tienen cloudId igual a deviceId (probablemente incorrecto)
 */

import { prisma } from '@/lib/db';

async function verifyAllCloudIds() {
  try {
    console.log('🔍 Analizando todos los dispositivos Shelly...\n');
    
    const devices = await prisma.smartPlugDevice.findMany({
      include: {
        credential: true
      },
      orderBy: {
        name: 'asc'
      }
    });
    
    console.log(`📊 Total dispositivos: ${devices.length}\n`);
    
    const suspicious = [];
    
    devices.forEach(device => {
      // Si cloudId es igual a deviceId, probablemente está mal
      if (device.cloudId === device.deviceId) {
        suspicious.push(device);
      }
    });
    
    if (suspicious.length === 0) {
      console.log('✅ Todos los dispositivos parecen tener cloudIds correctos.\n');
      return;
    }
    
    console.log(`⚠️  Encontrados ${suspicious.length} dispositivos con cloudId sospechoso:\n`);
    
    suspicious.forEach((device, index) => {
      console.log(`${index + 1}. ${device.name}`);
      console.log(`   ID: ${device.id}`);
      console.log(`   DeviceId: ${device.deviceId}`);
      console.log(`   CloudId: ${device.cloudId} ⚠️`);
      console.log(`   Online: ${device.online}`);
      console.log(`   Credencial: ${device.credential?.name || 'N/A'}`);
      console.log('');
    });
    
    console.log('💡 SUGERENCIA: Los dispositivos con cloudId igual a deviceId');
    console.log('   probablemente necesitan actualización manual del cloudId.');
    console.log('   El cloudId real se obtiene del WebSocket de Shelly Cloud.\n');
    
    // Mostrar dispositivos que SÍ tienen cloudId diferente (como referencia)
    const correct = devices.filter(d => d.cloudId !== d.deviceId && d.cloudId);
    if (correct.length > 0) {
      console.log('✅ Ejemplos de dispositivos con cloudId correcto:\n');
      correct.slice(0, 3).forEach(device => {
        console.log(`   ${device.name}:`);
        console.log(`   DeviceId: ${device.deviceId} → CloudId: ${device.cloudId}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

verifyAllCloudIds(); 