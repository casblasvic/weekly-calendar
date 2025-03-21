"use client"

import React from 'react'
import { cn } from '@/lib/utils'
import { ThemeConfig } from '@/app/contexts/theme-context'
import { Button } from '@/components/ui/button'

interface ColorPattern {
  name: string
  description: string
  colors: ThemeConfig
}

interface ColorPatternsProps {
  onSelect: (theme: ThemeConfig) => void
  className?: string
}

// Patrones de colores predefinidos
const colorPatterns: ColorPattern[] = [
  {
    name: "Púrpura Corporativo",
    description: "Elegante combinación de púrpuras con acentos claros",
    colors: {
      primaryColor: '#7c3aed',
      secondaryColor: '#8b5cf6',
      accentColor: '#a78bfa',
      textColor: '#111827',
      backgroundColor: '#ffffff',
      logoUrl: '',
      containerBackgroundColor: '#f5f5f5',
      tableHeaderColor: '#ede9fe',
      tabActiveColor: '#8b5cf6',
      cardBackgroundColor: '#ffffff',
      buttonPrimaryColor: '#7c3aed',
      buttonSecondaryColor: '#e5e7eb',
      tableRowHoverColor: '#f5f3ff',
      headerBackgroundColor: '#7c3aed',
      footerBackgroundColor: '#f8f9fa',
      sidebarBackgroundColor: '#f9fafb',
      sidebarTextColor: '#111827',
      sidebarHoverColor: '#f3f4f6',
      inputFocusBorderColor: '#7c3aed',
    }
  },
  {
    name: "Negro & Oro",
    description: "Aspecto de lujo con negro y acentos dorados",
    colors: {
      primaryColor: '#fbbf24',
      secondaryColor: '#f59e0b',
      accentColor: '#fcd34d',
      textColor: '#1f2937',
      backgroundColor: '#ffffff',
      logoUrl: '',
      containerBackgroundColor: '#f8f9fa',
      tableHeaderColor: '#fef3c7',
      tabActiveColor: '#f59e0b',
      cardBackgroundColor: '#ffffff',
      buttonPrimaryColor: '#fbbf24',
      buttonSecondaryColor: '#1f2937',
      tableRowHoverColor: '#fef3c7',
      headerBackgroundColor: '#1f2937',
      footerBackgroundColor: '#f8f9fa',
      sidebarBackgroundColor: '#1f2937',
      sidebarTextColor: '#e5e7eb',
      sidebarHoverColor: '#374151',
      inputFocusBorderColor: '#fbbf24',
    }
  },
  {
    name: "Verde & Marrón",
    description: "Combinación natural inspirada en la tierra",
    colors: {
      primaryColor: '#059669',
      secondaryColor: '#10b981',
      accentColor: '#6b7280',
      textColor: '#1f2937',
      backgroundColor: '#ffffff',
      logoUrl: '',
      containerBackgroundColor: '#f8f9fa',
      tableHeaderColor: '#d1fae5',
      tabActiveColor: '#059669',
      cardBackgroundColor: '#ffffff',
      buttonPrimaryColor: '#059669',
      buttonSecondaryColor: '#d6d3d1',
      tableRowHoverColor: '#ecfdf5',
      headerBackgroundColor: '#78350f',
      footerBackgroundColor: '#f8f9fa',
      sidebarBackgroundColor: '#f5f5f4',
      sidebarTextColor: '#44403c',
      sidebarHoverColor: '#e7e5e4',
      inputFocusBorderColor: '#059669',
    }
  },
  {
    name: "Azul Profesional",
    description: "Tema corporativo en tonos azules",
    colors: {
      primaryColor: '#2563eb',
      secondaryColor: '#3b82f6',
      accentColor: '#60a5fa',
      textColor: '#1f2937',
      backgroundColor: '#ffffff',
      logoUrl: '',
      containerBackgroundColor: '#f9fafb',
      tableHeaderColor: '#dbeafe',
      tabActiveColor: '#3b82f6',
      cardBackgroundColor: '#ffffff',
      buttonPrimaryColor: '#2563eb',
      buttonSecondaryColor: '#e5e7eb',
      tableRowHoverColor: '#eff6ff',
      headerBackgroundColor: '#1e40af',
      footerBackgroundColor: '#f9fafb',
      sidebarBackgroundColor: '#f9fafb',
      sidebarTextColor: '#1f2937',
      sidebarHoverColor: '#eff6ff',
      inputFocusBorderColor: '#2563eb',
    }
  },
  {
    name: "Pastel Suave",
    description: "Combinación de colores pastel para un aspecto amigable",
    colors: {
      primaryColor: '#ec4899',
      secondaryColor: '#f472b6',
      accentColor: '#f9a8d4',
      textColor: '#4b5563',
      backgroundColor: '#ffffff',
      logoUrl: '',
      containerBackgroundColor: '#fdf2f8',
      tableHeaderColor: '#fce7f3',
      tabActiveColor: '#ec4899',
      cardBackgroundColor: '#ffffff',
      buttonPrimaryColor: '#ec4899',
      buttonSecondaryColor: '#f3f4f6',
      tableRowHoverColor: '#fce7f3',
      headerBackgroundColor: '#fbcfe8',
      footerBackgroundColor: '#fdf2f8',
      sidebarBackgroundColor: '#fdf2f8',
      sidebarTextColor: '#4b5563',
      sidebarHoverColor: '#fce7f3',
      inputFocusBorderColor: '#ec4899',
    }
  },
  {
    name: "Gris Minimalista",
    description: "Diseño minimalista con tonos grises y negros",
    colors: {
      primaryColor: '#4b5563',
      secondaryColor: '#6b7280',
      accentColor: '#9ca3af',
      textColor: '#111827',
      backgroundColor: '#ffffff',
      logoUrl: '',
      containerBackgroundColor: '#f9fafb',
      tableHeaderColor: '#f3f4f6',
      tabActiveColor: '#4b5563',
      cardBackgroundColor: '#ffffff',
      buttonPrimaryColor: '#4b5563',
      buttonSecondaryColor: '#e5e7eb',
      tableRowHoverColor: '#f3f4f6',
      headerBackgroundColor: '#374151',
      footerBackgroundColor: '#f9fafb',
      sidebarBackgroundColor: '#f9fafb',
      sidebarTextColor: '#111827',
      sidebarHoverColor: '#f3f4f6',
      inputFocusBorderColor: '#4b5563',
    }
  },
  {
    name: "Teal & Naranja",
    description: "Combinación vibrante de turquesa con acentos naranjas",
    colors: {
      primaryColor: '#0d9488',
      secondaryColor: '#14b8a6',
      accentColor: '#f97316',
      textColor: '#1f2937',
      backgroundColor: '#ffffff',
      logoUrl: '',
      containerBackgroundColor: '#f9fafb',
      tableHeaderColor: '#ccfbf1',
      tabActiveColor: '#0d9488',
      cardBackgroundColor: '#ffffff',
      buttonPrimaryColor: '#0d9488',
      buttonSecondaryColor: '#e5e7eb',
      tableRowHoverColor: '#f0fdfa',
      headerBackgroundColor: '#0f766e',
      footerBackgroundColor: '#f9fafb',
      sidebarBackgroundColor: '#f9fafb',
      sidebarTextColor: '#1f2937',
      sidebarHoverColor: '#f0fdfa',
      inputFocusBorderColor: '#0d9488',
    }
  },
  {
    name: "Rojo & Blanco",
    description: "Esquema clásico con rojo como color principal",
    colors: {
      primaryColor: '#dc2626',
      secondaryColor: '#ef4444',
      accentColor: '#f87171',
      textColor: '#1f2937',
      backgroundColor: '#ffffff',
      logoUrl: '',
      containerBackgroundColor: '#f9fafb',
      tableHeaderColor: '#fee2e2',
      tabActiveColor: '#dc2626',
      cardBackgroundColor: '#ffffff',
      buttonPrimaryColor: '#dc2626',
      buttonSecondaryColor: '#e5e7eb',
      tableRowHoverColor: '#fef2f2',
      headerBackgroundColor: '#b91c1c',
      footerBackgroundColor: '#f9fafb',
      sidebarBackgroundColor: '#f9fafb',
      sidebarTextColor: '#1f2937',
      sidebarHoverColor: '#fef2f2',
      inputFocusBorderColor: '#dc2626',
    }
  }
]

export function ColorPatterns({ onSelect, className }: ColorPatternsProps) {
  return (
    <div className={cn("space-y-4", className)}>
      <h3 className="text-sm font-medium mb-2">Patrones de colores predefinidos</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {colorPatterns.map((pattern, index) => (
          <div key={index} className="border rounded-md p-3 hover:border-primary transition-colors cursor-pointer" onClick={() => {
            const currentLogoUrl = document.documentElement.style.getPropertyValue('--app-logo-url') || '';
            onSelect({...pattern.colors, logoUrl: currentLogoUrl});
          }}>
            <div className="text-sm font-medium mb-1">{pattern.name}</div>
            <p className="text-xs text-muted-foreground mb-2">{pattern.description}</p>
            <div className="flex space-x-1">
              <div className="w-6 h-6 rounded-full" style={{ backgroundColor: pattern.colors.primaryColor }}></div>
              <div className="w-6 h-6 rounded-full" style={{ backgroundColor: pattern.colors.secondaryColor }}></div>
              <div className="w-6 h-6 rounded-full" style={{ backgroundColor: pattern.colors.accentColor }}></div>
              <div className="w-6 h-6 rounded-full" style={{ backgroundColor: pattern.colors.headerBackgroundColor }}></div>
              <div className="w-6 h-6 rounded-full border" style={{ backgroundColor: pattern.colors.sidebarBackgroundColor }}></div>
            </div>
          </div>
        ))}
      </div>
      <div className="flex justify-center mt-3">
        <Button variant="outline" size="sm" className="text-xs" onClick={() => onSelect(colorPatterns[0].colors)}>
          Restaurar predeterminado
        </Button>
      </div>
    </div>
  )
} 