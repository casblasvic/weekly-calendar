#!/usr/bin/env node

/**
 * 🔧 FIX URGENTE: Actualizar cloudId de Rideau cafc
 * 
 * El problema: WebSocket envía deviceId '79530328999834' pero BD tiene cloudId '48551902479a'
 * Necesitamos actualizar el cloudId para que coincida con lo que envía WebSocket
 */

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function fixRideauCafcCloudId() {
  try {
    console.log('🔍 Buscando dispositivo Rideau cafc...\n');
    
    // Buscar el dispositivo por su MAC
    const device = await prisma.smartPlugDevice.findFirst({
      where: {
        OR: [
          { deviceId: '48551902479a' },
          { deviceId: '48551902479A' },
          { name: 'Rideau cafc' }
        ]
      }
    });
    
    if (!device) {
      console.error('❌ No se encontró el dispositivo Rideau cafc');
      process.exit(1);
    }
    
    console.log('✅ Dispositivo encontrado:');
    console.log(`   ID: ${device.id}`);
    console.log(`   Nombre: ${device.name}`);
    console.log(`   DeviceId: ${device.deviceId}`);
    console.log(`   CloudId actual: ${device.cloudId}`);
    console.log(`   Online: ${device.online}\n`);
    
    // Actualizar cloudId
    const updated = await prisma.smartPlugDevice.update({
      where: { id: device.id },
      data: { 
        cloudId: '79530328999834',
        online: true // Aprovechamos para marcarlo online
      }
    });
    
    console.log('🎯 CloudId actualizado exitosamente:');
    console.log(`   CloudId nuevo: ${updated.cloudId}`);
    console.log(`   Online: ${updated.online}\n`);
    
    console.log('✅ ¡PROBLEMA RESUELTO! El dispositivo ahora debería sincronizarse correctamente.');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixRideauCafcCloudId(); 