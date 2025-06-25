"use client"

import React from 'react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { X, Clock, MapPin, User, Move } from 'lucide-react'
import { useMoveAppointment } from '@/contexts/move-appointment-context'
import { cn } from '@/lib/utils'

interface MoveAppointmentUIProps {
  className?: string
  currentViewDate?: Date
}

export function MoveAppointmentUI({ className, currentViewDate }: MoveAppointmentUIProps) {
  const { 
    appointmentInMovement, 
    previewSlot,
    cancelAndGoBack, 
    isMovingAppointment 
  } = useMoveAppointment()

  if (!isMovingAppointment || !appointmentInMovement) {
    return null
  }

  const { appointment, originalDate, originalTime, originalRoomId } = appointmentInMovement

  const handleCancel = () => {
    const pathname = window.location.pathname
    const viewMode: 'week' | 'day' = pathname.includes('/agenda/dia/') ? 'day' : 'week'
    cancelAndGoBack(currentViewDate, viewMode)
  }

  return (
    <Card className={cn(
      "fixed bottom-4 left-1/2 z-50 mx-4 w-full max-w-md bg-white border-2 border-purple-200 shadow-lg transform -translate-x-1/2",
      className
    )}>
      <div className="p-4">
        {/* Header */}
        <div className="flex justify-between items-center mb-3">
          <div className="flex gap-2 items-center">
            <div 
              className="w-3 h-3 rounded-full animate-pulse"
              style={{ backgroundColor: appointment.color }}
            />
            <span className="text-sm font-medium text-purple-700">
              Moviendo cita
            </span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="w-6 h-6 hover:bg-purple-50"
            onClick={handleCancel}
            title="Cancelar y volver a la cita original"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Información de la cita */}
        <div className="space-y-2">
          <div className="flex gap-2 items-center">
            <User className="w-4 h-4 text-gray-500" />
            <span className="text-sm font-medium">{appointment.name}</span>
          </div>
          
          <div className="flex gap-2 items-center">
            <Clock className="w-4 h-4 text-gray-500" />
            <span className="text-sm text-gray-600">
              {appointment.service} • {appointment.duration}min
            </span>
          </div>

          <div className="flex gap-2 items-center">
            <MapPin className="w-4 h-4 text-gray-500" />
            <span className="text-sm text-gray-600">
              Desde: {format(originalDate, 'dd/MM/yyyy', { locale: es })} a las {originalTime}
            </span>
          </div>

          {/* Preview del nuevo slot si existe */}
          {previewSlot && (
            <div className={cn(
              "flex items-center gap-2 p-2 rounded-md border",
              previewSlot.isValid 
                ? "bg-green-50 border-green-200" 
                : "bg-red-50 border-red-200"
            )}>
              <Move className={cn(
                "h-4 w-4",
                previewSlot.isValid ? "text-green-600" : "text-red-600"
              )} />
              <div className="flex-1">
                <div className="text-sm font-medium">
                  {previewSlot.isValid ? '✓ Mover a:' : '✗ No disponible:'}
                </div>
                <div className="text-xs text-gray-600">
                  {format(previewSlot.date, 'dd/MM/yyyy', { locale: es })} a las {previewSlot.time}
                  {previewSlot.reason && (
                    <span className="ml-2 text-red-600">({previewSlot.reason})</span>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Instrucciones y botones */}
        <div className="pt-3 mt-3 border-t border-gray-100">
          <p className="mb-3 text-xs text-center text-gray-500">
            {previewSlot?.isValid 
              ? 'Haz clic en el slot para mover la cita'
              : 'Navega entre semanas/días y haz clic en un slot disponible'
            }
          </p>
          
          {/* ✅ Botón mejorado con funcionalidad de "deshacer" */}
          <div className="flex justify-center">
            <Button
              variant="outline"
              size="sm"
              className="text-gray-600 hover:text-gray-800 hover:bg-gray-50"
              onClick={handleCancel}
              title="Cancelar y volver automáticamente a la cita original"
            >
              ↶ Cancelar y volver
            </Button>
          </div>
        </div>
      </div>
    </Card>
  )
} 