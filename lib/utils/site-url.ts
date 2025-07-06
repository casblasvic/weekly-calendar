/*
 * 🌐 getSiteUrl — Helper universal para obtener la URL base del SaaS
 * -----------------------------------------------------------------
 * 1. Se usa en seeds, notificaciones y generación de URLs absolutas.
 * 2. Prioridad de resolución:
 *    a) process.env.NEXTAUTH_URL   → configurada en Vercel production.
 *    b) process.env.VERCEL_URL     → fallback automático en deploys.
 *    c) window.location.origin     → durante ejecución en el cliente.
 *    d) http://localhost:3000      → fallback local.
 * 3. Siempre devuelve la URL con protocolo (`https://` si falta).
 * 4. Evita hardcodear dominios en BD; guardamos solo rutas relativas.
 *
 * @see docs/PERSISTENT_CACHE_STRATEGY.md (sección "Site URL Helper")
 */

export function getSiteUrl(): string {
  // Prioridad: NEXTAUTH_URL > VERCEL_URL > window.origin > localhost
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  const envUrl = process.env.NEXTAUTH_URL || process.env.VERCEL_URL;
  if (envUrl) {
    // Asegurar que tiene protocolo
    if (/^https?:\/\//i.test(envUrl)) {
      return envUrl;
    }
    return `https://${envUrl}`;
  }
  return 'http://localhost:3000';
} 