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