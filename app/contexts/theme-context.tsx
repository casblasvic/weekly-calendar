"use client"

import React, { createContext, useContext, useEffect, useState } from 'react'
import { useLocalStorage } from '@/app/hooks/use-local-storage'

// Definir la estructura del tema
export interface ThemeConfig {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  textColor: string;
  backgroundColor: string;
  logoUrl: string;
  
  // Nuevos elementos configurables
  containerBackgroundColor: string; // Fondo del contenedor principal
  tableHeaderColor: string;         // Color de cabeceras de tablas
  tabActiveColor: string;           // Color de pestañas activas
  cardBackgroundColor: string;      // Fondo de las tarjetas
  
  // Botones y elementos interactivos
  buttonPrimaryColor: string;       // Color de botones primarios
  buttonSecondaryColor: string;     // Color de botones secundarios
  tableRowHoverColor: string;       // Color de hover en filas de tabla
  
  // Elementos estructurales
  headerBackgroundColor: string;    // Color de fondo del encabezado
  footerBackgroundColor: string;    // Color de fondo del pie de página
  sidebarBackgroundColor: string;   // Color de fondo de la barra lateral
  sidebarTextColor: string;         // Color del texto en la barra lateral
  sidebarHoverColor: string;        // Color de hover en elementos de menú
  inputFocusBorderColor: string;    // Color del borde cuando un campo tiene foco
}

// Tema predeterminado - morado
const defaultTheme: ThemeConfig = {
  primaryColor: '#7c3aed', // Purple-600
  secondaryColor: '#8b5cf6', // Purple-500
  accentColor: '#a78bfa', // Purple-400
  textColor: '#111827', // Gray-900
  backgroundColor: '#ffffff', // White
  logoUrl: '/logo.png', // Logo predeterminado
  
  // Valores predeterminados para los nuevos elementos
  containerBackgroundColor: '#f5f5f5', // Gris claro
  tableHeaderColor: '#ede9fe',         // Violeta muy claro (purple-100)
  tabActiveColor: '#8b5cf6',           // Violeta (purple-500)
  cardBackgroundColor: '#ffffff',      // Blanco
  
  // Valores para botones y elementos interactivos
  buttonPrimaryColor: '#7c3aed',       // Violeta (purple-600)
  buttonSecondaryColor: '#e5e7eb',     // Gris claro
  tableRowHoverColor: '#f5f3ff',       // Violeta muy claro (purple-50)
  
  // Valores para elementos estructurales
  headerBackgroundColor: '#7c3aed',    // Violeta (purple-600)
  footerBackgroundColor: '#f8f9fa',    // Gris muy claro
  sidebarBackgroundColor: '#f9fafb',   // Gris muy claro
  sidebarTextColor: '#111827',         // Gris oscuro
  sidebarHoverColor: '#f3f4f6',        // Gris claro hover
  inputFocusBorderColor: '#7c3aed',    // Violeta (purple-600)
}

// Crear el contexto
interface ThemeContextType {
  theme: ThemeConfig;
  setTheme: (theme: ThemeConfig) => void;
  updateThemeProperty: <K extends keyof ThemeConfig>(property: K, value: ThemeConfig[K]) => void;
  resetTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export const useTheme = () => {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme debe ser usado dentro de un ThemeProvider')
  }
  return context
}

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Usar localStorage para persistir el tema
  const [storedTheme, setStoredTheme] = useLocalStorage<ThemeConfig>('app-theme', defaultTheme)
  const [theme, setThemeState] = useState<ThemeConfig>(storedTheme)

  // Sincronizar el tema con localStorage
  useEffect(() => {
    setStoredTheme(theme)
    applyThemeToDOM(theme)
  }, [theme, setStoredTheme])

  // Cargar el tema inicial
  useEffect(() => {
    setThemeState(storedTheme)
    applyThemeToDOM(storedTheme)
  }, [storedTheme])

  // Aplicar el tema al DOM usando variables CSS
  const applyThemeToDOM = (theme: ThemeConfig) => {
    const root = document.documentElement
    
    // Garantizar que todos los valores del tema estén definidos
    const safeTheme = {
      ...defaultTheme,
      ...theme
    }
    
    // Convertir colores hex a rgba para transparencia
    const hexToRgba = (hex: string, alpha: number = 1) => {
      try {
        // Verificar si el color es válido
        if (!hex || typeof hex !== 'string' || !hex.startsWith('#') || hex.length !== 7) {
          return `rgba(124, 58, 237, ${alpha})`; // Valor predeterminado
        }
        
        // Simple conversión para obtener rgba
        const r = parseInt(hex.slice(1, 3), 16)
        const g = parseInt(hex.slice(3, 5), 16)
        const b = parseInt(hex.slice(5, 7), 16)
        return `rgba(${r}, ${g}, ${b}, ${alpha})`
      } catch (e) {
        console.error('Error en conversión hexToRgba:', e)
        return `rgba(124, 58, 237, ${alpha})` // Color morado predeterminado
      }
    }
    
    // Actualizar variables CSS
    root.style.setProperty('--primary', safeTheme.primaryColor)
    root.style.setProperty('--secondary', safeTheme.secondaryColor)
    root.style.setProperty('--accent', safeTheme.accentColor)
    root.style.setProperty('--foreground', safeTheme.textColor)
    root.style.setProperty('--background', safeTheme.backgroundColor)
    
    // Logourl como variable CSS - Solo aplicar si no es una URL de blob
    // Las URLs de blob no se pueden persistir entre sesiones
    if (safeTheme.logoUrl && !safeTheme.logoUrl.startsWith('blob:')) {
      root.style.setProperty('--app-logo-url', safeTheme.logoUrl)
    }
    
    // Nuevas variables CSS para los elementos adicionales
    root.style.setProperty('--container-background', safeTheme.containerBackgroundColor)
    root.style.setProperty('--table-header', safeTheme.tableHeaderColor)
    root.style.setProperty('--tab-active', safeTheme.tabActiveColor)
    root.style.setProperty('--card-background', safeTheme.cardBackgroundColor)
    
    // Variables para botones y elementos interactivos
    root.style.setProperty('--button-primary', safeTheme.buttonPrimaryColor)
    root.style.setProperty('--button-primary-hover', adjustColor(safeTheme.buttonPrimaryColor, -10)) // Más oscuro para hover
    root.style.setProperty('--button-secondary', safeTheme.buttonSecondaryColor)
    root.style.setProperty('--button-secondary-hover', adjustColor(safeTheme.buttonSecondaryColor, -10))
    root.style.setProperty('--table-hover', hexToRgba(safeTheme.primaryColor, 0.05)) // 5% de opacidad del color primario
    
    // Variables para elementos estructurales
    root.style.setProperty('--header-background', safeTheme.headerBackgroundColor)
    root.style.setProperty('--footer-background', safeTheme.footerBackgroundColor)
    root.style.setProperty('--sidebar-background', safeTheme.sidebarBackgroundColor)
    root.style.setProperty('--sidebar-text', safeTheme.sidebarTextColor)
    root.style.setProperty('--sidebar-hover', safeTheme.sidebarHoverColor)
    root.style.setProperty('--input-focus-border', safeTheme.inputFocusBorderColor)
    
    // Actualizar colores específicos usados en la app
    root.style.setProperty('--ring', safeTheme.primaryColor)
    
    // Preservar algunos colores críticos para la UI
    root.style.setProperty('--primary-foreground', '#ffffff') // Texto blanco para el color primario
    root.style.setProperty('--secondary-foreground', '#111827') // Texto oscuro para el color secundario
    
    // Configurar colores para tipos específicos de la UI
    root.style.setProperty('--purple-600', safeTheme.primaryColor)
    root.style.setProperty('--purple-500', safeTheme.secondaryColor)
    root.style.setProperty('--purple-400', safeTheme.accentColor)
    
    // Aplicar colores a clases específicas de UI
    document.body.style.setProperty('--card-bg', safeTheme.cardBackgroundColor)
  }
  
  // Función auxiliar para ajustar un color (oscurecer o aclarar)
  const adjustColor = (color: string, amount: number): string => {
    // Implementación simple para oscurecer o aclarar un color
    try {
      // Verificar si el color es válido antes de procesarlo
      if (!color || typeof color !== 'string') {
        return defaultTheme.primaryColor; // Valor predeterminado en caso de error
      }
      
      const hex = color.replace('#', '')
      
      // Verificar que el formato del hex sea válido (6 caracteres hex)
      if (!/^[0-9A-Fa-f]{6}$/.test(hex)) {
        return color; // Devolver el color original si no es un hex válido
      }
      
      const r = Math.max(0, Math.min(255, parseInt(hex.slice(0, 2), 16) + amount))
      const g = Math.max(0, Math.min(255, parseInt(hex.slice(2, 4), 16) + amount))
      const b = Math.max(0, Math.min(255, parseInt(hex.slice(4, 6), 16) + amount))
      
      return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
    } catch (e) {
      console.error('Error ajustando color:', e)
      return color || defaultTheme.primaryColor
    }
  }

  // Actualizar el tema completo
  const setTheme = (newTheme: ThemeConfig) => {
    setThemeState(newTheme)
  }

  // Actualizar una propiedad específica del tema
  const updateThemeProperty = <K extends keyof ThemeConfig>(property: K, value: ThemeConfig[K]) => {
    setThemeState(prev => ({
      ...prev,
      [property]: value
    }))
  }

  // Restablecer el tema a los valores predeterminados
  const resetTheme = () => {
    setThemeState(defaultTheme)
  }

  return (
    <ThemeContext.Provider
      value={{
        theme,
        setTheme,
        updateThemeProperty,
        resetTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  )
}

// Hook personalizado para transformar colores (puede expandirse para conversión hex-hsl)
export const useColorTransform = () => {
  const hexToRGB = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 0, g: 0, b: 0 }
  }

  return { hexToRGB }
} 