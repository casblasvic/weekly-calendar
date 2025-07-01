"use client"

import React, { useState, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'

interface ColorPickerProps {
  color: string
  onChange: (color: string) => void
  label?: string
  className?: string
  disabled?: boolean
}

// ✅ Colores estándar del sistema
const PRESET_COLORS = [
  '#7c3aed', // Purple-600 (primario por defecto)
  '#0ea5e9', // Sky-500
  '#14b8a6', // Teal-500
  '#f97316', // Orange-500
  '#ef4444', // Red-500
  '#22c55e', // Green-500
  '#f59e0b', // Amber-500
  '#8b5cf6', // Purple-500
  '#6366f1', // Indigo-500
  '#ec4899', // Pink-500
  '#111827', // Gray-900
  '#4b5563', // Gray-600
  '#ffffff', // White
]

export const ColorPicker: React.FC<ColorPickerProps> = ({
  color,
  onChange,
  label,
  className,
  disabled = false,
}) => {
  const initialColor = color || '#7c3aed'
  const [selectedColor, setSelectedColor] = useState(initialColor)
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    if (color) {
      setSelectedColor(color)
    }
  }, [color])

  const handleColorChange = (color: string) => {
    setSelectedColor(color)
    onChange(color)
  }

  return (
    <div className={cn('flex flex-col space-y-1.5', className)}>
      {label && <Label>{label}</Label>}
      <Popover open={isOpen && !disabled} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <div
            className={cn(
              'flex h-10 w-full items-center justify-between rounded-md border border-input px-3 py-2 text-sm ring-offset-background focus-within:ring-1 focus:outline-none focus-visible:ring-1 focus-visible:ring-ring', 
              disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
            )}
            onClick={() => !disabled && setIsOpen(true)}
          >
            <div className="flex items-center gap-2">
              <div
                className="h-6 w-6 rounded-md border border-gray-200"
                style={{ backgroundColor: selectedColor }}
              />
              <span>{selectedColor}</span>
            </div>
          </div>
        </PopoverTrigger>
        <PopoverContent className="w-full p-3" align="start">
          <div className="space-y-2">
            <div className="flex flex-wrap gap-2">
              {PRESET_COLORS.map((presetColor) => (
                <button
                  key={presetColor}
                  type="button"
                  className={cn(
                    'h-8 w-8 cursor-pointer rounded-md border',
                    selectedColor === presetColor && 'ring-2 ring-ring ring-offset-2'
                  )}
                  style={{ backgroundColor: presetColor }}
                  onClick={() => handleColorChange(presetColor)}
                />
              ))}
            </div>
            <div className="flex flex-col space-y-1">
              <Label htmlFor="custom-color">Color personalizado</Label>
              <Input
                id="custom-color"
                type="color"
                value={selectedColor || '#000000'}
                onChange={(e) => handleColorChange(e.target.value)}
              />
            </div>
            <div className="flex items-center space-x-2">
              <Label htmlFor="hex-value" className="w-16">Hex</Label>
              <Input
                id="hex-value"
                value={selectedColor || '#000000'}
                onChange={(e) => handleColorChange(e.target.value)}
                className="font-mono"
              />
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
} 