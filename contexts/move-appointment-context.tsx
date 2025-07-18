"use client"

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import { format, startOfWeek, endOfWeek, isSameWeek, isSameDay } from 'date-fns'
import { es } from 'date-fns/locale'
import { useQueryClient } from '@tanstack/react-query'
import { getWeekKey } from '@/lib/hooks/use-appointments-query'
import { useClinic } from '@/contexts/clinic-context'
import { validateAppointmentSlot, ValidationResult } from '@/utils/appointment-validation'

// Tipos
interface Appointment {
  id: string
  name: string
  service: string
  startTime: string
  endTime?: string
  date: Date
  duration: number
  roomId: string
  clinicId: string
  color: string
  phone?: string
  services?: any[]
  tags?: string[]
  personId?: string
}

interface AppointmentInMovement {
  appointment: Appointment
  originalDate: Date
  originalTime: string
  originalRoomId: string
}

interface PreviewSlot {
  date: Date
  time: string
  roomId: string
  isValid?: boolean
  conflicts?: any[]
  reason?: string
}

interface MoveAppointmentContextType {
  // Estado principal
  appointmentInMovement: AppointmentInMovement | null
  previewSlot: PreviewSlot | null
  
  // Acciones
  startMovingAppointment: (appointment: Appointment) => void
  cancelMovingAppointment: () => void
  setPreviewSlot: (slot: PreviewSlot | null) => void
  completeMovingAppointment: (targetDate: Date, targetTime: string, targetRoomId: string) => Promise<boolean>
  confirmMove: (targetDate: Date, targetTime: string, targetRoomId: string) => Promise<void>
  
  // ✅ NUEVA: Función para deshacer y volver a la cita original (acepta fecha actual de la vista)
  cancelAndGoBack: (currentViewDate?: Date, viewMode?: 'week' | 'day') => void
  
  // ✅ NUEVAS: Sistema de registro de funciones optimistas
  registerOptimisticFunctions: (functions: {
    updateOptimisticAppointment: (appointmentId: string, updates: any) => void
    invalidateCache: () => Promise<void>
  }) => void
  unregisterOptimisticFunctions: () => void
  
  // Helpers
  isMovingAppointment: boolean
  isValidSlot: (date: Date, time: string, roomId: string, appointments: any[]) => { isValid: boolean; reason?: string }
  validateSlot: (slot: { date: Date; time: string; roomId: string }, appointments: any[]) => ValidationResult | null
}

const MoveAppointmentContext = createContext<MoveAppointmentContextType | undefined>(undefined)

interface MoveAppointmentProviderProps {
  children: ReactNode
  onMoveComplete?: (originalAppointment: Appointment, newDate: Date, newTime: string, newRoomId: string) => Promise<boolean>
  onGoBackToAppointment?: (appointment: Appointment) => void
}

export function MoveAppointmentProvider({ 
  children, 
  onMoveComplete, 
  onGoBackToAppointment
}: MoveAppointmentProviderProps) {
  const [appointmentInMovement, setAppointmentInMovement] = useState<AppointmentInMovement | null>(null)
  const [previewSlot, setPreviewSlot] = useState<PreviewSlot | null>(null)
  const queryClient = useQueryClient()
  const { activeClinic } = useClinic()
  
  // ✅ ESTADO PARA FUNCIONES OPTIMISTAS REGISTRADAS
  const [optimisticFunctions, setOptimisticFunctions] = useState<{
    updateOptimisticAppointment: (appointmentId: string, updates: any) => void
    invalidateCache: () => Promise<void>
  } | null>(null)

  // ✅ FUNCIONES DE REGISTRO
  const registerOptimisticFunctions = useCallback((functions: {
    updateOptimisticAppointment: (appointmentId: string, updates: any) => void
    invalidateCache: () => Promise<void>
  }) => {
    console.log('[MoveAppointment] 📝 Registrando funciones optimistas')
    setOptimisticFunctions(functions)
  }, [])

  const unregisterOptimisticFunctions = useCallback(() => {
    console.log('[MoveAppointment] 🗑️ Desregistrando funciones optimistas')
    setOptimisticFunctions(null)
  }, [])

  // Iniciar movimiento de cita
  const startMovingAppointment = useCallback((appointment: Appointment) => {
    console.log('[MoveAppointment] 🚀 Iniciando movimiento de cita:', appointment.name)
    
    setAppointmentInMovement({
      appointment,
      originalDate: appointment.date,
      originalTime: appointment.startTime,
      originalRoomId: appointment.roomId
    })
    
    // Limpiar preview anterior
    setPreviewSlot(null)
  }, [])

  // Cancelar movimiento
  const cancelMovingAppointment = useCallback(() => {
    console.log('[MoveAppointment] ❌ Cancelando movimiento de cita')
    setAppointmentInMovement(null)
    setPreviewSlot(null)
  }, [])

  // ✅ CORREGIDA: Función para deshacer y volver a la cita ORIGINAL con soporte para vista día/semana
  const cancelAndGoBack = useCallback((currentViewDate?: Date, viewMode?: 'week' | 'day') => {
    if (appointmentInMovement) {
      console.log('[MoveAppointment] 🔄 Cancelando movimiento de cita:', appointmentInMovement.appointment.name)
      
      // ✅ VERIFICAR: Solo redirigir si estamos viendo la misma UNIDAD (día o semana) de la cita ORIGINAL
      const appointmentOriginalDate = appointmentInMovement.originalDate; // ✅ USAR FECHA ORIGINAL, no actual
      const currentDate = currentViewDate || new Date(); // Fallback hoy
      
      const shouldRedirect = (() => {
        if (viewMode === 'day') {
          // Vista diaria: comparar día exacto
          return !isSameDay(appointmentOriginalDate, currentDate);
        }
        // Vista semanal (default)
        return !isSameWeek(appointmentOriginalDate, currentDate);
      })();

      if (!shouldRedirect) {
        console.log('[MoveAppointment] ✅ Ya estamos en la vista correcta - cancelando sin redirección');
      } else {
        // ✅ ESTAMOS en una vista diferente - cancelar Y redirigir AL ORIGEN
        console.log('[MoveAppointment] 🔄 Vista diferente a la ORIGINAL - cancelando y redirigiendo al origen');
        if (onGoBackToAppointment) {
          // ✅ CREAR cita ficticia con la fecha/hora ORIGINAL para navegación
          const originalAppointmentForNav = {
            ...appointmentInMovement.appointment,
            date: appointmentInMovement.originalDate,
            startTime: appointmentInMovement.originalTime
          };
          onGoBackToAppointment(originalAppointmentForNav);
        }
      }
    }
    
    // ✅ SIEMPRE limpiar estado independientemente de si redirigimos o no
    setAppointmentInMovement(null)
    setPreviewSlot(null)
  }, [appointmentInMovement, onGoBackToAppointment])

  // ✅ NUEVA FUNCIÓN: Validar slot usando función centralizada
  const validateSlot = useCallback((slot: { date: Date; time: string; roomId: string }, appointments: any[] = []): ValidationResult | null => {
    if (!appointmentInMovement) {
      return null;
    }

    const { appointment } = appointmentInMovement;
    
    // ✅ ELIMINADO: Check problemático que impedía desplazamientos
    // La función validateAppointmentSlot con excludeAppointmentId ya maneja esto correctamente
    
    // ✅ USAR LISTA DE CITAS RECIBIDA COMO PARÁMETRO Y EXCLUIR CITA EN MOVIMIENTO
    return validateAppointmentSlot({
      targetDate: slot.date,
      targetTime: slot.time,
      duration: appointment.duration,
      roomId: slot.roomId,
      appointments, // ✅ USAR LISTA REAL, NO VACÍA
      excludeAppointmentId: appointment.id, // ✅ EXCLUIR CITA EN MOVIMIENTO PARA PERMITIR DESPLAZAMIENTOS
      activeClinic,
      granularity: 15,
      allowAdjustments: true
    });
  }, [appointmentInMovement, activeClinic]);

  // Validar si un slot es válido para la cita (mantener por compatibilidad)
  const isValidSlot = useCallback((date: Date, time: string, roomId: string, appointments: any[] = []): { isValid: boolean; reason?: string } => {
    const validation = validateSlot({ date, time, roomId }, appointments);
    
    if (!validation) {
      return { isValid: false, reason: 'No hay cita en movimiento' };
    }
    
    return {
      isValid: validation.isValid,
      reason: validation.reason
    };
  }, [validateSlot])

  // Completar movimiento
  const completeMovingAppointment = useCallback(async (
    targetDate: Date, 
    targetTime: string, 
    targetRoomId: string
  ): Promise<boolean> => {
    if (!appointmentInMovement || !onMoveComplete) {
      return false
    }

    const validation = isValidSlot(targetDate, targetTime, targetRoomId)
    if (!validation.isValid) {
      console.error('[MoveAppointment] ❌ Slot inválido:', validation.reason)
      return false
    }

    try {
      console.log('[MoveAppointment] ✅ Completando movimiento...', {
        from: {
          date: format(appointmentInMovement.originalDate, 'dd/MM/yyyy'),
          time: appointmentInMovement.originalTime,
          room: appointmentInMovement.originalRoomId
        },
        to: {
          date: format(targetDate, 'dd/MM/yyyy'),
          time: targetTime,
          room: targetRoomId
        }
      })

      const success = await onMoveComplete(
        appointmentInMovement.appointment,
        targetDate,
        targetTime,
        targetRoomId
      )

      if (success) {
        // Limpiar estado
        setAppointmentInMovement(null)
        setPreviewSlot(null)
        console.log('[MoveAppointment] 🎉 Movimiento completado exitosamente')
      }

      return success
    } catch (error) {
      console.error('[MoveAppointment] ❌ Error al completar movimiento:', error)
      return false
    }
  }, [appointmentInMovement, onMoveComplete, isValidSlot])

  // ✅ FUNCIÓN PRINCIPAL: Confirmar movimiento con renderizado optimista CORRECTO para movimientos entre semanas
  const confirmMove = useCallback(async (
    targetDate: Date, 
    targetTime: string, 
    targetRoomId: string
  ) => {
    if (!appointmentInMovement) {
      console.error('[MoveAppointment] No hay cita en movimiento para confirmar');
      return;
    }

    const { appointment } = appointmentInMovement;
    const originalDate = appointment.date;
    
    console.log('[MoveAppointment] 🎯 Confirmando movimiento:', {
      appointmentId: appointment.id,
      from: { date: originalDate, time: appointment.startTime, roomId: appointment.roomId },
      to: { date: targetDate, time: targetTime, roomId: targetRoomId }
    });

    try {
      // ✅ RENDERIZADO OPTIMISTA INMEDIATO CON MANEJO DE SEMANAS MÚLTIPLES
      console.log('[MoveAppointment] 🚀 Aplicando renderizado optimista inmediato...');
      
      // Calcular nueva hora de fin basada en la duración
      const [hours, minutes] = targetTime.split(':').map(Number);
      const startMinutes = hours * 60 + minutes;
      const endMinutes = startMinutes + appointment.duration;
      const endHours = Math.floor(endMinutes / 60);
      const endMins = endMinutes % 60;
      const newEndTime = `${endHours.toString().padStart(2, '0')}:${endMins.toString().padStart(2, '0')}`;

      // ✅ DETECTAR SI ES MOVIMIENTO ENTRE SEMANAS DIFERENTES
      const isCrosWeekMovement = !isSameWeek(originalDate, targetDate);
      console.log('[MoveAppointment] 🔍 Movimiento entre semanas:', isCrosWeekMovement ? 'SÍ' : 'NO');

      if (isCrosWeekMovement) {
        // ✅ MOVIMIENTO ENTRE SEMANAS: Manejar ambos caches de semana
        console.log('[MoveAppointment] 🔄 Manejando movimiento entre semanas diferentes...');
        
        // Obtener claves de semana para ambas fechas
        const originalWeekKey = getWeekKey(originalDate, 0);
        const targetWeekKey = getWeekKey(targetDate, 0);
        const clinicId = activeClinic?.id?.toString() || null;
        
        console.log('[MoveAppointment] 📅 Semanas involucradas:', {
          original: originalWeekKey,
          target: targetWeekKey,
          clinicId
        });

        // ✅ PASO 1: ELIMINAR de la semana original
        const originalCacheKey = ['appointments', 'week', originalWeekKey, clinicId];
        queryClient.setQueryData(originalCacheKey, (oldData: any) => {
          if (!oldData) return oldData;
          const filteredAppointments = (oldData.appointments || []).filter((apt: any) => apt.id !== appointment.id);
          console.log('[MoveAppointment] ❌ Cita eliminada de semana original:', originalWeekKey);
          return {
            ...oldData,
            appointments: filteredAppointments
          };
        });

        // ✅ PASO 2: AÑADIR a la semana nueva
        const targetCacheKey = ['appointments', 'week', targetWeekKey, clinicId];
        const updatedAppointment = {
          ...appointment,
          date: targetDate,
          startTime: targetTime,
          endTime: newEndTime,
          roomId: targetRoomId,
          id: appointment.id,
          name: appointment.name,
          service: appointment.service,
          duration: appointment.duration,
          color: appointment.color,
          phone: appointment.phone || '',
          services: appointment.services || [],
          tags: appointment.tags || [],
          personId: appointment.personId || '',
          estimatedDurationMinutes: appointment.duration,
          durationMinutes: appointment.duration,
          isDataStable: true
        };
        
        // ✅ LOG: Verificar que los datos críticos se preserven correctamente
        console.log('[MoveAppointment] 🔍 Verificando datos de cita optimista entre semanas:', {
          appointmentId: appointment.id,
          originalName: appointment.name,
          optimisticName: updatedAppointment.name,
          hasPersonId: !!updatedAppointment.personId,
          hasServices: updatedAppointment.services?.length > 0,
          servicesCount: updatedAppointment.services?.length || 0,
          hasPhone: !!updatedAppointment.phone,
          hasColor: !!updatedAppointment.color,
          originalData: {
            name: appointment.name,
            personId: appointment.personId,
            service: appointment.service
          },
          optimisticData: {
            name: updatedAppointment.name,
            personId: updatedAppointment.personId,
            service: updatedAppointment.service
          },
          // ✅ VERIFICAR TODOS LOS CAMPOS CRÍTICOS PARA DEBUGGING
          fullOriginalAppointment: appointment,
          fullOptimisticAppointment: updatedAppointment
        });
        
        queryClient.setQueryData(targetCacheKey, (oldData: any) => {
          if (!oldData) {
            console.log('[MoveAppointment] ➕ Creando cache nuevo para semana destino:', targetWeekKey);
            return {
              appointments: [updatedAppointment]
            };
          }
          const newAppointments = [...(oldData.appointments || []), updatedAppointment];
          console.log('[MoveAppointment] ➕ Cita añadida a semana destino:', targetWeekKey);
          return {
            ...oldData,
            appointments: newAppointments
          };
        });

      } else {
        // ✅ MOVIMIENTO DENTRO DE LA MISMA SEMANA: Usar método tradicional
        console.log('[MoveAppointment] 🔄 Movimiento dentro de la misma semana...');
        
        const updatedAppointment = {
          ...appointment,
          date: targetDate,
          startTime: targetTime,
          endTime: newEndTime,
          roomId: targetRoomId,
          id: appointment.id,
          name: appointment.name,
          service: appointment.service,
          duration: appointment.duration,
          color: appointment.color,
          phone: appointment.phone || '',
          services: appointment.services || [],
          tags: appointment.tags || [],
          personId: appointment.personId || '',
          estimatedDurationMinutes: appointment.duration,
          durationMinutes: appointment.duration,
          isDataStable: true
        };

        if (optimisticFunctions?.updateOptimisticAppointment) {
          console.log('[MoveAppointment] 🚀 Aplicando cambio optimista en misma semana...', {
            appointmentId: appointment.id,
            appointmentName: appointment.name,
            updatedAppointmentName: updatedAppointment.name,
            hasPersonId: !!updatedAppointment.personId,
            hasServices: updatedAppointment.services?.length > 0
          });
          optimisticFunctions.updateOptimisticAppointment(appointment.id, updatedAppointment);
          console.log('[MoveAppointment] ✅ updateOptimisticAppointment ejecutado - cambio visible inmediatamente');
        } else {
          console.warn('[MoveAppointment] ⚠️ No hay funciones optimistas registradas - renderizado no será inmediato');
        }
      }

      // ✅ CERRAR TARJETA INMEDIATAMENTE (UX responsiva)
      setAppointmentInMovement(null);
      setPreviewSlot(null);

      // ✅ LLAMAR API EN BACKGROUND - igual que drag & drop
      console.log('[MoveAppointment] 📡 Llamando API en background...');
      
      const apiData = {
        id: appointment.id,
        date: format(targetDate, 'yyyy-MM-dd'), // Usar formato consistente
        startTime: targetTime,
        endTime: newEndTime,
        roomId: targetRoomId,
        durationMinutes: appointment.duration
      };

      console.log('[MoveAppointment] 📤 Enviando a API:', apiData);

      const response = await fetch('/api/appointments', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(apiData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al mover la cita');
      }

      console.log('[MoveAppointment] ✅ Cita movida exitosamente en API - datos optimistas se sincronizarán automáticamente');
      
    } catch (error) {
      console.error('[MoveAppointment] ❌ Error al mover cita:', error);
      
      // ✅ SOLO REVERTIR EN CASO DE ERROR - invalidar ambas semanas si es necesario
      if (optimisticFunctions?.invalidateCache) {
        console.log('[MoveAppointment] 🔄 Revirtiendo cambios optimistas debido a error API...');
        await optimisticFunctions.invalidateCache(); // Restaurar estado real desde API
      }
      
      // También invalidar ambas semanas si fue movimiento entre semanas
      if (!isSameWeek(originalDate, targetDate)) {
        const originalWeekKey = getWeekKey(originalDate, 0);
        const targetWeekKey = getWeekKey(targetDate, 0);
        await queryClient.invalidateQueries({ queryKey: ['appointments', 'week', originalWeekKey] });
        await queryClient.invalidateQueries({ queryKey: ['appointments', 'week', targetWeekKey] });
        console.log('[MoveAppointment] 🔄 Cache invalidado para ambas semanas');
      }
      
      // Mostrar error al usuario
      alert(`Error al mover la cita: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  }, [appointmentInMovement, optimisticFunctions, queryClient, activeClinic])

  const value: MoveAppointmentContextType = {
    appointmentInMovement,
    previewSlot,
    startMovingAppointment,
    cancelMovingAppointment,
    setPreviewSlot,
    completeMovingAppointment,
    confirmMove,
    cancelAndGoBack,
    isMovingAppointment: !!appointmentInMovement,
    isValidSlot,
    registerOptimisticFunctions,
    unregisterOptimisticFunctions,
    validateSlot
  }

  return (
    <MoveAppointmentContext.Provider value={value}>
      {children}
    </MoveAppointmentContext.Provider>
  )
}

export function useMoveAppointment() {
  const context = useContext(MoveAppointmentContext)
  if (context === undefined) {
    throw new Error('useMoveAppointment must be used within a MoveAppointmentProvider')
  }
  return context
} 