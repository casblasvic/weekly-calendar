// Definimos los colores para cada día de la semana (0 = domingo, 1 = lunes, etc.)
export const getDayBackgroundColor = (dayIndex: number): string => {
  // Alternamos entre morado oscuro y morado claro
  return dayIndex % 2 === 0
    ? "bg-purple-100" // Morado claro
    : "bg-purple-50" // Morado más claro
}

// Color para los bordes de la tabla
export const getGridBorderColor = (): string => {
  return "border-purple-300" // Violeta oscuro coherente con el color global
}

// Para obtener el color de texto que contraste bien con el fondo
export const getDayTextColor = (dayIndex: number): string => {
  return "text-gray-800" // Color de texto estándar para todos los días
}

