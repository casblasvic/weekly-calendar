// Funciones auxiliares para generación de códigos de clínica y subcuentas

// Función para generar código de clínica a partir del nombre
export function generateClinicCode(clinicName: string): string {
  const words = clinicName.split(/\s+/);
  
  if (words.length === 1) {
    // Si es una sola palabra, tomar las primeras 3-4 letras
    return clinicName.substring(0, 4).toUpperCase();
  } else if (words.length === 2) {
    // Si son dos palabras, tomar las primeras 2 letras de cada una
    return (words[0].substring(0, 2) + words[1].substring(0, 2)).toUpperCase();
  } else {
    // Si son más de dos palabras, tomar la primera letra de cada una (máximo 4)
    return words
      .slice(0, 4)
      .map(word => word[0])
      .join('')
      .toUpperCase();
  }
}

// Función para generar el siguiente número de subcuenta
export function generateNextSubaccountNumber(parentAccountNumber: string): string {
  // Si ya tiene punto, incrementar el último número
  if (parentAccountNumber.includes('.')) {
    const parts = parentAccountNumber.split('.');
    const lastPart = parts[parts.length - 1];
    const lastNumber = parseInt(lastPart, 10);
    
    if (!isNaN(lastNumber)) {
      parts[parts.length - 1] = String(lastNumber + 1).padStart(lastPart.length, '0');
      return parts.join('.');
    }
  }
  
  // Si no tiene punto o no se pudo parsear, agregar .001
  return `${parentAccountNumber}.001`;
}
