"use client"

import React, { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { ChevronDown, Bell, UserCircle, Search, Plus, Check, X } from 'lucide-react'
import { ThemeConfig } from '@/app/contexts/theme-context'

interface ThemeTemplateProps {
  theme: ThemeConfig
  className?: string
}

export const ThemeTemplate: React.FC<ThemeTemplateProps> = ({
  theme,
  className,
}) => {
  // Valores predeterminados para el tema
  const defaultValues = {
    primaryColor: '#7c3aed',
    secondaryColor: '#8b5cf6',
    accentColor: '#a78bfa',
    textColor: '#111827',
    backgroundColor: '#ffffff',
    logoUrl: '/placeholder-logo.svg',
    containerBackgroundColor: '#f5f5f5',
    tableHeaderColor: '#ede9fe',
    tabActiveColor: '#8b5cf6',
    cardBackgroundColor: '#ffffff',
    buttonPrimaryColor: '#7c3aed',
    buttonSecondaryColor: '#e5e7eb',
    tableRowHoverColor: '#f5f3ff',
    headerBackgroundColor: '#ede9fe',
    footerBackgroundColor: '#ede9fe',
    sidebarBackgroundColor: '#ede9fe',
    sidebarTextColor: '#111827',
    sidebarHoverColor: '#f5f3ff',
    inputFocusBorderColor: '#7c3aed',
  }
  
  // Combinar tema proporcionado con valores predeterminados
  const safeTheme = { ...defaultValues, ...(theme || {}) }
  
  // Estilo CSS inline basado en los colores del tema
  const themeStyles = {
    primary: safeTheme.primaryColor,
    secondary: safeTheme.secondaryColor,
    accent: safeTheme.accentColor,
    text: safeTheme.textColor,
    background: safeTheme.backgroundColor,
    containerBackground: safeTheme.containerBackgroundColor,
    tableHeader: safeTheme.tableHeaderColor,
    tabActive: safeTheme.tabActiveColor,
    cardBackground: safeTheme.cardBackgroundColor,
    buttonPrimary: safeTheme.buttonPrimaryColor,
    buttonSecondary: safeTheme.buttonSecondaryColor,
    tableRowHover: safeTheme.tableRowHoverColor,
    headerBackground: safeTheme.headerBackgroundColor,
    footerBackground: safeTheme.footerBackgroundColor,
    sidebarBackground: safeTheme.sidebarBackgroundColor,
    sidebarText: safeTheme.sidebarTextColor,
    sidebarHover: safeTheme.sidebarHoverColor,
    inputFocusBorder: safeTheme.inputFocusBorderColor,
  }
  
  const [logoError, setLogoError] = useState(false)
  const [mounted, setMounted] = useState(false)
  
  // Asegurarse de que el componente solo renderiza la imagen en el cliente
  useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <div 
      className={cn('border rounded-lg overflow-hidden shadow-sm', className)}
      style={{ backgroundColor: themeStyles.containerBackground }}
    >
      {/* Header */}
      <div className="p-2 flex items-center justify-between border-b" style={{ backgroundColor: themeStyles.primary }}>
        <div className="flex items-center">
          <div className="h-8 flex items-center justify-center overflow-hidden">
            {mounted ? (
              <>
                {!logoError && safeTheme.logoUrl ? (
                  <img 
                    src={safeTheme.logoUrl} 
                    alt="Logo de la empresa"
                    className="h-8 max-w-[140px] object-contain"
                    onError={() => {
                      // Mostrar texto en lugar de imagen si hay error
                      setLogoError(true);
                    }}
                  />
                ) : (
                  <div className="text-xl font-semibold text-white">LOGO</div>
                )}
              </>
            ) : (
              <div className="text-xl font-semibold text-white">LOGO</div>
            )}
          </div>
          <span className="ml-2 text-xs font-semibold text-white">Vista previa</span>
        </div>
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-white" />
          <UserCircle className="w-4 h-4 text-white" />
        </div>
      </div>
      
      {/* Tabs */}
      <div className="flex border-b p-1 gap-1 text-xs">
        <div className="px-2 py-1 rounded" style={{ backgroundColor: themeStyles.tabActive, color: 'white' }}>
          Pestaña 1
        </div>
        <div className="px-2 py-1 text-gray-700">
          Pestaña 2
        </div>
        <div className="px-2 py-1 text-gray-700">
          Pestaña 3
        </div>
      </div>
      
      {/* Content */}
      <div className="p-3" style={{ backgroundColor: themeStyles.containerBackground }}>
        {/* Button row */}
        <div className="flex gap-2 mb-3">
          <button
            type="button"
            className="px-2 py-1 text-xs rounded-md text-white flex items-center"
            style={{ backgroundColor: themeStyles.primary }}
          >
            <Plus className="w-3 h-3 mr-1" />
            Nuevo
          </button>
          <button
            type="button"
            className="px-2 py-1 text-xs rounded-md border flex items-center"
            style={{ borderColor: themeStyles.secondary, color: themeStyles.secondary }}
          >
            Guardar
          </button>
        </div>

        {/* Card example */}
        <div className="mb-3 rounded-md border p-2 shadow-sm text-xs" style={{ backgroundColor: themeStyles.cardBackground }}>
          <div className="font-medium mb-1">Ejemplo de tarjeta</div>
          <div className="text-gray-500">Este es un ejemplo de tarjeta con fondo personalizado.</div>
        </div>
        
        {/* Search input */}
        <div className="relative mb-3">
          <input
            type="text"
            className="w-full px-2 py-1 text-xs border rounded-md"
            placeholder="Buscar..."
            style={{ 
              borderColor: themeStyles.accent, 
              color: themeStyles.text,
              backgroundColor: 'white'  
            }}
          />
          <Search className="absolute right-2 top-1 w-3 h-3" style={{ color: themeStyles.accent }} />
        </div>
        
        {/* Ejemplo de tabla */}
        <div className="mt-4 mb-3">
          <div className="text-xs font-medium mb-1">Ejemplo de tabla</div>
          <div className="border rounded-md overflow-hidden text-xs">
            <div className="grid grid-cols-3 gap-2" style={{ backgroundColor: themeStyles.tableHeader }}>
              <div className="p-1 font-medium">Nombre</div>
              <div className="p-1 font-medium">Categoría</div>
              <div className="p-1 font-medium">Estado</div>
            </div>
            
            <div className="grid grid-cols-3 gap-2 border-t" style={{ backgroundColor: themeStyles.cardBackground }}>
              <div className="p-1">Producto 1</div>
              <div className="p-1">Electrónica</div>
              <div className="p-1">Activo</div>
            </div>
            
            <div className="grid grid-cols-3 gap-2 border-t" style={{ backgroundColor: themeStyles.cardBackground }}>
              <div className="p-1">Producto 2</div>
              <div className="p-1">Hogar</div>
              <div className="p-1">Inactivo</div>
            </div>
            
            <div className="grid grid-cols-3 gap-2 border-t" style={{ backgroundColor: themeStyles.tableRowHover }}>
              <div className="p-1">Producto 3 (hover)</div>
              <div className="p-1">Ropa</div>
              <div className="p-1">Activo</div>
            </div>
          </div>
        </div>
        
        {/* Buttons */}
        <div className="mt-4 mb-3">
          <div className="text-xs font-medium mb-1">Ejemplo de botones</div>
          <div className="flex space-x-2">
            <button 
              className="px-2 py-1 text-xs rounded-md text-white" 
              style={{ backgroundColor: themeStyles.buttonPrimary }}
            >
              Guardar
            </button>
            <button 
              className="px-2 py-1 text-xs rounded-md" 
              style={{ backgroundColor: themeStyles.buttonSecondary }}
            >
              Cancelar
            </button>
            <button 
              className="px-2 py-1 text-xs rounded-md flex items-center space-x-1" 
              style={{ backgroundColor: themeStyles.buttonSecondary }}
            >
              <span>←</span>
              <span>Volver</span>
            </button>
          </div>
        </div>

        {/* Elementos estructurales */}
        <div className="mt-4 mb-3">
          <div className="text-xs font-medium mb-1">Elementos estructurales</div>
          
          {/* Header */}
          <div className="border rounded-md overflow-hidden mb-2">
            <div className="p-2 flex items-center text-xs text-white" style={{ backgroundColor: themeStyles.headerBackground }}>
              <div className="w-4 h-4 bg-white rounded-sm mr-1"></div>
              <span>Ejemplo de encabezado</span>
            </div>
          </div>
          
          {/* Sidebar y contenido */}
          <div className="border rounded-md overflow-hidden mb-2 flex">
            <div className="w-1/3 p-2 text-xs" style={{ backgroundColor: themeStyles.sidebarBackground, color: themeStyles.sidebarText }}>
              <div className="p-1 mb-1">Elemento de menú 1</div>
              <div className="p-1 mb-1 rounded" style={{ backgroundColor: themeStyles.sidebarHover }}>Elemento de menú 2 (hover)</div>
              <div className="p-1">Elemento de menú 3</div>
            </div>
            <div className="w-2/3 p-2 text-xs" style={{ backgroundColor: themeStyles.containerBackground }}>
              Contenido principal
            </div>
          </div>
          
          {/* Campo con foco */}
          <div className="border rounded-md overflow-hidden mb-2 p-2 text-xs">
            <div className="mb-1">Campo sin foco:</div>
            <div className="border rounded p-1 mb-2">Texto de ejemplo</div>
            <div className="mb-1">Campo con foco:</div>
            <div className="border rounded p-1" style={{ borderColor: themeStyles.inputFocusBorder, boxShadow: `0 0 0 1px ${themeStyles.inputFocusBorder}` }}>
              Texto de ejemplo con foco
            </div>
          </div>
          
          {/* Footer */}
          <div className="border rounded-md overflow-hidden">
            <div className="p-2 text-xs" style={{ backgroundColor: themeStyles.footerBackground }}>
              Ejemplo de pie de página
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 