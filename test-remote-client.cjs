/**
 * PRUEBA MANUAL DEL REMOTE CLIENT
 * Ejecutar: node test-remote-client.js
 */

const { io } = require('socket.io-client');

console.log('🧪 [TEST] Iniciando prueba del RemoteClient...');

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'https://socket-server-qleven.up.railway.app';
console.log('🌐 [TEST] Conectando a:', WS_URL);

const socket = io(WS_URL, {
  transports: ['websocket', 'polling'],
  timeout: 20000,
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
});

socket.on('connect', () => {
  console.log('✅ [TEST] Conectado al servidor remoto');
  console.log('🔧 [TEST] Socket ID:', socket.id);
  
  // Enviar mensaje de prueba
  const testMessage = {
    systemId: 'cmd3bvs1e0006y2j6e55sg66o',
    eventName: 'device-update',
    data: {
      deviceId: 'test-device',
      currentPower: 99.9,
      relayOn: true,
      timestamp: Date.now(),
      reason: 'test-message'
    }
  };
  
  console.log('📤 [TEST] Enviando mensaje de prueba:', testMessage);
  socket.emit('broadcast-to-system', testMessage);
  
  console.log('✅ [TEST] Mensaje enviado');
  
  // Cerrar después de 5 segundos
  setTimeout(() => {
    console.log('🔚 [TEST] Cerrando conexión de prueba...');
    socket.disconnect();
    process.exit(0);
  }, 5000);
});

socket.on('disconnect', (reason) => {
  console.log('❌ [TEST] Desconectado. Razón:', reason);
});

socket.on('connect_error', (error) => {
  console.error('❌ [TEST] Error de conexión:', error);
  process.exit(1);
}); 