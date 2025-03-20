/**
 * Calcula el precio sin IVA a partir del precio con IVA y el ID del tipo de IVA
 */
export const calcularPrecioSinIVA = (precioConIVA: number, ivaId: string) => {
  // Esta función necesita acceso a los tipos de IVA, que pueden no estar disponibles aquí
  // Por eso hacemos una implementación más genérica que pueda ser utilizada desde cualquier componente
  
  // Si no hay precio o ID de IVA, devolvemos el mismo precio
  if (!precioConIVA || !ivaId) return precioConIVA;
  
  // En una implementación real, buscaríamos el porcentaje de IVA asociado al ID
  // Por ahora usamos un valor por defecto del 21%
  const porcentajeIVA = 21;
  
  return precioConIVA / (1 + (porcentajeIVA / 100));
}; 