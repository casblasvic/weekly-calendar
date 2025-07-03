'use client';

import { useState } from 'react';
import { AppointmentItem } from '@/components/appointment-item';
import { useAppointmentTimer } from '@/hooks/use-appointment-timer';
import { OverlayProgressBar } from '@/components/appointment-progress-bar';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import type { Appointment } from '@/types/appointments';

interface AppointmentWithProgressProps {
  appointment: Appointment;
  onStartAppointment?: (appointmentId: string) => void;
  onClick?: (appointment: Appointment) => void;
  onDeleteAppointment?: (id: string) => void;
  // Otras props opcionales de AppointmentItem
  index?: number;
  slotDuration?: number;
  onDragStart?: any;
  onDurationChange?: any;
  onTagsUpdate?: any;
  onMoveAppointment?: any;
  onTimeAdjust?: any;
  onClientNameClick?: any;
  dragState?: any;
}

/**
 * 🎯 COMPONENTE PRINCIPAL: AppointmentItem + Cronómetro Integrado
 * 
 * Funcionalidades:
 * - Detección automática de servicios con equipamiento
 * - Barra de progreso visual que se llena en tiempo real
 * - Estados: Verde (activo), Naranja (pausado), Verde completo (terminado)
 * - Adaptativo según tamaño de cita
 */
export function AppointmentWithProgress({
  appointment,
  onStartAppointment,
  index = 0,
  onClick,
  onDeleteAppointment,
  ...appointmentItemProps
}: AppointmentWithProgressProps) {
  
  // Hook para obtener estado del cronómetro en tiempo real
  const { 
    timerData, 
    status, 
    progressPercentage, 
    isExceeded,
    isActive,
    isPaused,
    isCompleted
  } = useAppointmentTimer({
    appointmentId: appointment.id,
    autoRefresh: true
  });

  // Handler para iniciar cita desde el menú de acciones rápidas
  const handleStartClick = async (appointmentId: string) => {
    // 🚀 El sistema maneja automáticamente:
    // 1. Análisis de servicios y requerimientos de equipamiento
    // 2. Mostrar selector si hay dispositivos disponibles
    // 3. Iniciar cronómetro y empezar barra de progreso
    
    onStartAppointment?.(appointmentId);
    
    toast.success('Analizando equipamiento...', {
      description: `Preparando cronómetro para ${appointment.name}`
    });
  };

  // Determinar el ancho disponible para el cronómetro
  const getTimerWidth = () => {
    if (appointment.duration < 30) return 'narrow';   // Citas muy cortas
    if (appointment.duration < 60) return 'medium';   // Citas medianas  
    return 'wide';                                     // Citas largas
  };

  return (
    <div className="relative">
      {/* 🎯 APPOINTMENT ITEM CON INTEGRACIÓN COMPLETA */}
      <div className="relative">
        <AppointmentItem
          appointment={appointment}
          index={index}
          onStartAppointment={handleStartClick}
          {...appointmentItemProps}
        />
        
        {/* 🆕 BARRA DE PROGRESO SUPERPUESTA - FUNCIONALIDAD PRINCIPAL */}
        {timerData && status && (
          <OverlayProgressBar
            status={status}
            progressPercentage={progressPercentage}
            isExceeded={isExceeded}
            className="absolute bottom-0 left-0 right-0 rounded-b-md"
          />
        )}
        
        {/* 🆕 INDICADOR VISUAL DE ESTADO EN ESQUINA */}
        {timerData && (
          <div className="absolute top-2 right-2 z-20">
            <div className={`
              w-3 h-3 rounded-full shadow-sm transition-all
              ${isActive ? 'bg-green-500 animate-pulse' : ''}
              ${isPaused ? 'bg-orange-500' : ''}
              ${isCompleted ? 'bg-blue-500' : ''}
            `} />
          </div>
        )}
      </div>
    </div>
  );
}

// 🎯 EJEMPLO DE VISTA DE AGENDA CON CRONÓMETROS
export function AgendaWithProgressExample() {
  const [appointments, setAppointments] = useState<Appointment[]>([
    {
      id: '1',
      name: 'María García',
      startTime: '10:00',
      endTime: '11:00',
      duration: 60,
      service: 'Depilación Axilas', // 🎯 Servicio con equipamiento
      color: '#10B981',
      date: new Date('2025-01-02'),
      phone: '+34 600 123 456',
      roomId: 'room-1',
      clinicId: 'clinic-1',
      estimatedDurationMinutes: 60 // Para cálculo de progreso
    },
    {
      id: '2', 
      name: 'Ana López',
      startTime: '11:30',
      endTime: '12:00',
      duration: 30,
      service: 'Limpieza Facial', // 🎯 Servicio sin equipamiento
      color: '#8B5CF6',
      date: new Date('2025-01-02'),
      phone: '+34 600 789 012',
      roomId: 'room-1',
      clinicId: 'clinic-1',
      estimatedDurationMinutes: 30
    }
  ]);

  const handleStartAppointment = async (appointmentId: string) => {
    const appointment = appointments.find(apt => apt.id === appointmentId);
    
    if (!appointment) return;

    console.log('🚀 Iniciando cita:', {
      id: appointmentId,
      client: appointment.name,
      service: appointment.service,
      hasEquipment: appointment.service?.includes('Depilación') // Ejemplo de lógica
    });
    
    // 🎯 El hook useAppointmentTimer se encarga del resto:
    // - Detectar si el servicio requiere equipamiento
    // - Mostrar selector de dispositivos si es necesario
    // - Iniciar cronómetro y barra de progreso
    // - Actualizar en tiempo real
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Agenda con Cronómetros</h2>
        <div className="text-sm text-gray-500">
          🟢 Activo • 🟠 Pausado • 🔵 Completado
        </div>
      </div>
      
      {/* 🎯 GRID DE CITAS CON CRONÓMETROS INTEGRADOS */}
      <div className="grid gap-4">
        {appointments.map((appointment, index) => (
          <Card key={appointment.id} className="p-4 hover:shadow-md transition-shadow">
            <AppointmentWithProgress
              appointment={appointment}
              index={index}
              onStartAppointment={handleStartAppointment}
              onClick={(apt) => console.log('Cita clickeada:', apt)}
              onDeleteAppointment={(id) => console.log('Eliminar:', id)}
            />
          </Card>
        ))}
      </div>
      
      {/* 🎯 PANEL DE INFORMACIÓN DE CRONÓMETROS ACTIVOS */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h3 className="text-lg font-semibold mb-4">🕐 Cronómetros Activos</h3>
        
        <div className="space-y-3">
          {appointments.map((appointment) => (
            <TimerStatus key={appointment.id} appointmentId={appointment.id} />
          ))}
        </div>
      </div>
    </div>
  );
}

// 🎯 COMPONENTE PARA MOSTRAR ESTADO DE CRONÓMETRO
function TimerStatus({ appointmentId }: { appointmentId: string }) {
  const { 
    timerData, 
    displayTime, 
    progressPercentage, 
    isActive, 
    isPaused, 
    isCompleted 
  } = useAppointmentTimer({
    appointmentId,
    autoRefresh: true
  });

  if (!timerData) {
    return (
      <div className="text-sm text-gray-400">
        Cita {appointmentId}: Sin cronómetro activo
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between p-3 bg-white rounded border">
      <div className="flex items-center gap-3">
        <div className={`
          w-2 h-2 rounded-full
          ${isActive ? 'bg-green-500 animate-pulse' : ''}
          ${isPaused ? 'bg-orange-500' : ''}
          ${isCompleted ? 'bg-blue-500' : ''}
        `} />
        
        <div>
          <div className="font-medium text-sm">
            Cita {appointmentId}
          </div>
          <div className="text-xs text-gray-500">
            {isActive ? 'En progreso' : isPaused ? 'Pausado' : 'Completado'}
          </div>
        </div>
      </div>
      
      <div className="flex items-center gap-3">
        <div className="text-sm font-mono">
          {displayTime}
        </div>
        
        <div className="w-16 bg-gray-200 rounded-full h-1.5">
          <div 
            className={`
              h-1.5 rounded-full transition-all duration-1000
              ${isActive ? 'bg-green-500' : ''}
              ${isPaused ? 'bg-orange-500' : ''}
              ${isCompleted ? 'bg-blue-500' : ''}
            `}
            style={{ width: `${Math.min(100, progressPercentage)}%` }}
          />
        </div>
        
        <div className="text-xs text-gray-500 w-12 text-right">
          {Math.round(progressPercentage)}%
        </div>
      </div>
    </div>
  );
}

// 🎯 EJEMPLO DE INTEGRACIÓN CON SERVICIOS ESPECÍFICOS
export function EquipmentAwareAppointmentExample() {
  const exampleAppointments = [
    {
      id: 'depilacion-1',
      service: 'Depilación Axilas',
      requiresEquipment: true,
      equipmentType: 'IPL',
      hasSmartPlug: true
    },
    {
      id: 'facial-1', 
      service: 'Limpieza Facial',
      requiresEquipment: false
    },
    {
      id: 'depilacion-2',
      service: 'Depilación Piernas',
      requiresEquipment: true,
      equipmentType: 'Láser',
      hasSmartPlug: true
    }
  ];

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">
        🔌 Detección Automática de Equipamiento
      </h3>
      
      {exampleAppointments.map((example) => (
        <div key={example.id} className="p-4 border rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">{example.service}</div>
              <div className="text-sm text-gray-500">
                {example.requiresEquipment 
                  ? `🔌 Requiere: ${example.equipmentType} ${example.hasSmartPlug ? '(Smart)' : '(Manual)'}`
                  : '✋ Sin equipamiento'
                }
              </div>
            </div>
            
            <div className="text-xs bg-gray-100 px-2 py-1 rounded">
              {example.requiresEquipment 
                ? '→ Mostrar selector de equipos'
                : '→ Iniciar directamente'
              }
            </div>
          </div>
        </div>
      ))}
    </div>
  );
} 