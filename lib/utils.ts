import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Añade esta función al final del archivo
export function setDatePickerHeaderColor(color: string) {
  document.documentElement.style.setProperty("--header-color", color)
}

