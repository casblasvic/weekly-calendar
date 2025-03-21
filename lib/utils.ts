import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Añade esta función al final del archivo
export function setDatePickerHeaderColor(color: string) {
  document.documentElement.style.setProperty("--header-color", color)
}

/**
 * Generar ID único para archivos y entidades
 * @returns string ID único basado en timestamp y número aleatorio
 */
export function generateId(): string {
  return `${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Formatea una fecha al formato español
 * @param date Fecha a formatear
 * @returns string Fecha formateada
 */
export function formatDate(date: Date): string {
  return date.toLocaleDateString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

/**
 * Formatea un número como moneda (EUR)
 * @param amount Cantidad a formatear
 * @returns string Cantidad formateada como moneda
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR'
  }).format(amount);
}

/**
 * Capitaliza la primera letra de cada palabra
 * @param text Texto a capitalizar
 * @returns string Texto con la primera letra de cada palabra en mayúscula
 */
export function capitalizeWords(text: string): string {
  return text
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

