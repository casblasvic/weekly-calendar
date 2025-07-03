'use client';

import { useState } from 'react';
import { AppointmentItem } from '@/components/appointment-item';
import { AppointmentTimerIntegration } from '@/components/appointment-timer-integration';
import { AppointmentTimerDisplay } from '@/components/appointment-timer-display';
import { useAppointmentTimer } from '@/hooks/use-appointment-timer';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import type { Appointment } from '@/types/appointments';

interface AppointmentWithTimerProps {
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

export function AppointmentWithTimer({
  appointment,
  onStartAppointment,
  index = 0,
  onClick,
  onDeleteAppointment,
  ...appointmentItemProps
}: AppointmentWithTimerProps) {
  
  // Hook para obtener estado del cronómetro
  const { timerData, status, displayTime, isExceeded, remainingTime } = useAppointmentTimer({
    appointmentId: appointment.id,
    autoRefresh: true
  });

  // Handler para iniciar cita desde el menú de acciones rápidas
  const handleStartClick = async (appointmentId: string) => {
    // Aquí podrías mostrar un modal o iniciar directamente
    onStartAppointment?.(appointmentId);
    
    toast.success('Iniciando cita...', {
      description: `Preparando cronómetro para ${appointment.name}`
    });
  };

  // Determinar el ancho disponible para el cronómetro
  const getTimerWidth = () => {
    if (appointment.duration < 30) return 'narrow';
    if (appointment.duration < 60) return 'medium';
    return 'wide';
  };

  return (
    <div className="relative">
      {/* Componente de cita original con cronómetro integrado */}
      <div className="relative">
        <AppointmentItem
          appointment={appointment}
          index={index}
          onStartAppointment={handleStartClick}
          {...appointmentItemProps}
        />
        
        {/* Cronómetro superpuesto si la cita está iniciada */}
        {timerData && status && (
          <div className="absolute top-2 left-2 z-20">
            <AppointmentTimerDisplay
              status={status}
              displayTime={displayTime}
              isExceeded={isExceeded}
              remainingTime={remainingTime}
              progressPercentage={timerData ? 50 : 0}
              estimatedMinutes={timerData?.estimatedMinutes || appointment.duration}
              actualMinutes={timerData?.actualMinutes || 0}
              hasEquipment={!!timerData.equipmentId}
              width={getTimerWidth()}
            />
          </div>
        )}
      </div>
    </div>
  );
}

// Ejemplo de uso en una vista de agenda
export function AgendaWithTimerExample() {
  const [appointments, setAppointments] = useState<Appointment[]>([
    // Datos de ejemplo...
  ]);

  const handleStartAppointment = async (appointmentId: string) => {
    console.log('Iniciando cita:', appointmentId);
    
    // Aquí implementarías la lógica de inicio
    // Puede mostrar modales, actualizar estado, etc.
  };

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Agenda con Cronómetros</h2>
      
      <div className="grid gap-4">
        {appointments.map((appointment, index) => (
          <Card key={appointment.id} className="p-4">
            <AppointmentWithTimer
              appointment={appointment}
              index={index}
              onStartAppointment={handleStartAppointment}
              onClick={(apt) => console.log('Cita clickeada:', apt)}
              onDeleteAppointment={(id) => console.log('Eliminar:', id)}
            />
          </Card>
        ))}
      </div>
      
      {/* Panel lateral con cronómetros activos */}
      <div className="fixed right-4 top-20 space-y-4 w-80">
        <h3 className="text-lg font-semibold">Cronómetros Activos</h3>
        {appointments.map((appointment) => (
          <AppointmentTimerIntegration
            key={appointment.id}
            appointmentId={appointment.id}
            appointmentData={{
              clientName: appointment.name,
              serviceName: appointment.service || 'Servicio General',
              estimatedDuration: appointment.duration
            }}
            showInline={true}
            width="wide"
            onTimerStart={() => {
              toast.success(`Cronómetro iniciado para ${appointment.name}`);
            }}
            onTimerComplete={() => {
              toast.success(`Cita completada: ${appointment.name}`);
            }}
          />
        ))}
      </div>
    </div>
  );
}

// Ejemplo de modal independiente para cronómetro
export function TimerModalExample() {
  const [selectedAppointment, setSelectedAppointment] = useState<string | null>(null);

  return (
    <div>
      {selectedAppointment && (
        <div className="flex fixed inset-0 z-50 justify-center items-center bg-black/50">
          <div className="mx-4 w-full max-w-2xl bg-white rounded-lg">
            <AppointmentTimerIntegration
              appointmentId={selectedAppointment}
              appointmentData={{
                clientName: 'María García',
                serviceName: 'Tratamiento Facial',
                estimatedDuration: 60
              }}
              showInline={false}
              onTimerComplete={() => {
                setSelectedAppointment(null);
                toast.success('Cita completada exitosamente');
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
} 