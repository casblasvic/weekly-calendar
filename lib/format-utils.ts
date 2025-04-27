/**
 * Formatea un tamaño en bytes a una representación legible
 */
export function formatBytes(bytes: number, decimals = 2) {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * Formatea un número como moneda.
 * @param amount - La cantidad numérica a formatear.
 * @param currency - El código de moneda ISO 4217 (ej: 'EUR', 'USD'). Por defecto 'EUR'.
 * @param locale - El locale para el formato (ej: 'es-ES', 'en-US'). Por defecto el del navegador.
 */
export function formatCurrency(
  amount: number,
  currency: string = 'EUR', // Moneda por defecto
  locale?: string // Locale opcional
) {
  try {
    return new Intl.NumberFormat(locale, { // Usar locale del navegador por defecto
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch (error) {
    console.error("Error formatting currency:", error);
    // Devolver un valor por defecto o el número original en caso de error
    return `${amount.toFixed(2)} ${currency}`; 
  }
} 