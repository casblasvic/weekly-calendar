"use client"

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
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

// Definir el contexto
export interface ThemeContextType {
  theme: ThemeConfig;
  updateTheme: (newTheme: Partial<ThemeConfig>) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: defaultTheme,
  updateTheme: () => {},
});

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme debe usarse dentro de un ThemeProvider');
  }
  return context;
};

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<ThemeConfig>(defaultTheme);

  // Cargar el tema del almacenamiento local cuando se monta el componente
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
      try {
        const parsedTheme = JSON.parse(savedTheme);
        setTheme(parsedTheme);
      } catch (error) {
        console.error('Error parsing theme from localStorage:', error);
      }
    }
  }, []);

  // Actualizar las variables CSS del tema cuando cambie
  useEffect(() => {
    // Actualizar variables CSS para el tema
    document.documentElement.style.setProperty('--theme-primary', theme.primaryColor);
    document.documentElement.style.setProperty('--theme-secondary', theme.secondaryColor);
    document.documentElement.style.setProperty('--theme-accent', theme.accentColor);
    document.documentElement.style.setProperty('--theme-text', theme.textColor);
    document.documentElement.style.setProperty('--theme-background', theme.backgroundColor);
    document.documentElement.style.setProperty('--theme-header-bg', theme.headerBackgroundColor);
    document.documentElement.style.setProperty('--theme-sidebar-bg', theme.sidebarBackgroundColor);
    document.documentElement.style.setProperty('--theme-button-bg', theme.buttonPrimaryColor);
    document.documentElement.style.setProperty('--theme-button-text', '#ffffff');
    
    // También guardamos el tema en localStorage
    localStorage.setItem('theme', JSON.stringify(theme));
  }, [theme]);

  // Función para actualizar el tema
  const updateTheme = useCallback((newTheme: Partial<ThemeConfig>) => {
    setTheme(prevTheme => ({ ...prevTheme, ...newTheme }));
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, updateTheme }}>
      {children}
    </ThemeContext.Provider>
  );
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