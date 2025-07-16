"use client";

import { useEffect } from 'react';

/**
 * ========================================
 * GHOST SOCKET MONITOR PROVIDER
 * ========================================
 * 
 * 🔍 PROVEEDOR DE MONITOR DE SOCKETS FANTASMA
 * Este componente se ejecuta solo en el cliente y se encarga de importar
 * y configurar el sistema de monitoreo de sockets fantasma.
 * 
 * 🎯 PROPÓSITO:
 * - Evitar problemas de SSR al importar useSocket.ts
 * - Configurar el monitor solo en development
 * - Hacer disponible window.ghostSocketMonitor
 * 
 * 📍 INTEGRACIÓN:
 * - Se importa desde el layout principal
 * - Solo se ejecuta en el cliente (use client)
 * - Solo funciona en development
 * 
 * @see lib/utils/ghost-socket-monitor.ts
 */

export function GhostSocketMonitorProvider() {
  useEffect(() => {
    // Solo en development
    if (process.env.NODE_ENV === 'development') {
      // Importación dinámica para evitar problemas de SSR
      import('@/lib/utils/ghost-socket-monitor').catch(() => {
        // Importación opcional, no genera error si falla
        console.warn('Ghost Socket Monitor no pudo ser importado');
      });
    }
  }, []);

  // Este componente no renderiza nada
  return null;
} 