#!/usr/bin/env node

import { startShellyWorker } from '../lib/shelly/websocket-worker';
import dotenv from 'dotenv';

// Cargar variables de entorno
dotenv.config();

// Configuración del worker
const config = {
    healthCheckInterval: parseInt(process.env.SHELLY_HEALTH_CHECK_INTERVAL || '30000'),
    connectionRetryInterval: parseInt(process.env.SHELLY_RETRY_INTERVAL || '60000'),
    maxRetries: parseInt(process.env.SHELLY_MAX_RETRIES || '3'),
    logLevel: (process.env.SHELLY_LOG_LEVEL || 'info') as 'debug' | 'info' | 'warn' | 'error'
};

console.log('🚀 Iniciando Shelly WebSocket Worker con configuración:', config);

// Iniciar el worker
startShellyWorker(config).catch(error => {
    console.error('❌ Error fatal al iniciar worker:', error);
    process.exit(1);
}); 