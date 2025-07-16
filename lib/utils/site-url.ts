/*
 * 🌐 getSiteUrl — Helper universal para obtener la URL base del SaaS
 * -----------------------------------------------------------------
 * 1. Se usa en seeds, notificaciones y generación de URLs absolutas.
 * 2. Prioridad de resolución:
 *    a) process.env.NEXTAUTH_URL   → configurada en Vercel production.
 *    b) process.env.VERCEL_URL     → fallback automático en deploys.
 *    c) window.location.origin     → durante ejecución en el cliente.
 *    d) http://localhost:3000      → fallback local (solo desarrollo).
 * 3. Siempre devuelve la URL con protocolo (`https://` si falta).
 * 4. Evita hardcodear dominios en BD; guardamos solo rutas relativas.
 *
 * @see docs/PERSISTENT_CACHE_STRATEGY.md (sección "Site URL Helper")
 */

export function getSiteUrl(): string {
  // 🌐 Prioridad 1: Cliente (navegador)
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }

  // 🎯 Prioridad 2: NEXTAUTH_URL (variable principal de producción)
  if (process.env.NEXTAUTH_URL) {
    return process.env.NEXTAUTH_URL;
  }

  // 🎯 Prioridad 3: VERCEL_URL (fallback para deploys)
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }

  // ⚠️ Fallback: localhost solo para desarrollo
  console.warn('⚠️ No NEXTAUTH_URL found, using localhost fallback. Set NEXTAUTH_URL for production.');
  return 'http://localhost:3000';
} 