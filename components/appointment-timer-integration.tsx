'use client';

import { useState } from 'react';
import { useAppointmentTimer } from '@/hooks/use-appointment-timer';
import { AppointmentEquipmentSelector } from '@/components/appointment-equipment-selector';
import { AppointmentTimerDisplay } from '@/components/appointment-timer-display';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { 
  Play, 
  Pause, 
  Square, 
  Clock,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { EquipmentAvailability, AppointmentUsageStatus } from '@/types/appointments';

interface AppointmentTimerIntegrationProps {
  appointmentId: string;
  appointmentData?: {
    clientName: string;
    serviceName: string;
    estimatedDuration: number;
  };
  onTimerStart?: () => void;
  onTimerComplete?: () => void;
  showInline?: boolean;
  width?: 'narrow' | 'medium' | 'wide';
  className?: string;
}

export function AppointmentTimerIntegration({
  appointmentId,
  appointmentData,
  onTimerStart,
  onTimerComplete,
  showInline = false,
  width = 'medium',
  className
}: AppointmentTimerIntegrationProps) {
  
  // 🔍 LOG BÁSICO: Verificar si este componente se ejecuta
  console.log('🔍 [APPOINTMENT TIMER INTEGRATION] Componente montado/actualizado');
  const [showEquipmentSelector, setShowEquipmentSelector] = useState(false);
  const [availableEquipment, setAvailableEquipment] = useState<EquipmentAvailability[]>([]);
  const [isStarting, setIsStarting] = useState(false);
  const [showPauseDialog, setShowPauseDialog] = useState(false);
  const [pauseReason, setPauseReason] = useState('');

  const {
    timerData,
    isLoading,
    error,
    displayTime,
    isExceeded,
    remainingTime,
    progressPercentage,
    status,
    startTimer,
    pauseTimer,
    resumeTimer,
    finishTimer,
    canStart,
    canPause,
    canResume,
    canFinish,
    isActive,
    isPaused,
    isCompleted
  } = useAppointmentTimer({
    appointmentId,
    autoRefresh: true,
    onTimeExceeded: () => {
      toast.warning('El tiempo estimado ha sido excedido', {
        description: `La cita de ${appointmentData?.clientName} ha superado su duración estimada`,
        duration: 5000
      });
    },
    onError: (errorMessage) => {
      toast.error('Error en cronómetro', {
        description: errorMessage,
        duration: 4000
      });
    }
  });

  const handleStartClick = async () => {
    setIsStarting(true);
    
    try {
      const result = await startTimer();
      
      if (result.requiresEquipmentSelection) {
        // Mostrar selector de equipamiento con botones Power
        setShowEquipmentSelector(true);
      } else {
        toast.success('Cita iniciada correctamente', {
          description: 'Iniciada sin equipamiento',
          duration: 3000
        });
        onTimerStart?.();
      }
    } catch (error) {
      // Error ya manejado por el hook
    } finally {
      setIsStarting(false);
    }
  };

  const handleStartWithoutEquipment = async () => {
    setIsStarting(true);
    
    try {
      const result = await startTimer(true); // skipEquipmentCheck = true
      
      toast.success('Cita iniciada sin equipamiento', {
        description: 'Cronómetro activado correctamente',
        duration: 3000
      });
      
      setShowEquipmentSelector(false);
      onTimerStart?.();
      
    } catch (error) {
      // Error ya manejado por el hook
    } finally {
      setIsStarting(false);
    }
  };

  const handlePauseClick = () => {
    setShowPauseDialog(true);
  };

  const handlePauseConfirm = async () => {
    try {
      await pauseTimer(pauseReason || undefined);
      
      toast.info('Cita pausada', {
        description: pauseReason || 'Cronómetro pausado',
        duration: 3000
      });
      
      setShowPauseDialog(false);
      setPauseReason('');
      
    } catch (error) {
      // Error ya manejado por el hook
    }
  };

  const handleResumeClick = async () => {
    try {
      await resumeTimer();
      
      toast.success('Cita reanudada', {
        description: 'Cronómetro reactivado',
        duration: 3000
      });
      
    } catch (error) {
      // Error ya manejado por el hook
    }
  };

  const handleFinishClick = async () => {
    try {
      const result = await finishTimer();
      
      toast.success('Cita finalizada correctamente', {
        description: `Duración total: ${result.data?.actualMinutes?.toFixed(1) || 0} minutos`,
        duration: 4000
      });
      
      onTimerComplete?.();
      
    } catch (error) {
      // Error ya manejado por el hook
    }
  };

  const estimatedMinutes = timerData?.estimatedMinutes || appointmentData?.estimatedDuration || 0;
  const actualMinutes = timerData ? (
    timerData.actualMinutes || (progressPercentage / 100) * estimatedMinutes
  ) : 0;

  if (showInline) {
    return (
      <>
        <div className={cn("space-y-2", className)}>
          {timerData && (
            <AppointmentTimerDisplay
              status={status as AppointmentUsageStatus}
              displayTime={displayTime}
              isExceeded={isExceeded}
              remainingTime={remainingTime}
              progressPercentage={progressPercentage}
              estimatedMinutes={estimatedMinutes}
              actualMinutes={actualMinutes}
              hasEquipment={!!timerData.equipmentId}
              width={width}
              showProgressBar={true}
            />
          )}
          
          <div className="flex gap-2">
            {canStart && (
              <Button
                size="sm"
                onClick={handleStartClick}
                disabled={isLoading || isStarting}
                className="text-white bg-green-600 hover:bg-green-700"
              >
                {isStarting ? (
                  <div className="flex gap-2 items-center">
                    <div className="w-3 h-3 rounded-full border-2 border-white animate-spin border-t-transparent" />
                    Iniciando...
                  </div>
                ) : (
                  <div className="flex gap-2 items-center">
                    <Play className="w-3 h-3" />
                    Iniciar
                  </div>
                )}
              </Button>
            )}
            
            {canPause && (
              <Button
                size="sm"
                variant="outline"
                onClick={handlePauseClick}
                disabled={isLoading}
                className="text-orange-700 border-orange-300 hover:bg-orange-50"
              >
                <Pause className="mr-1 w-3 h-3" />
                Pausar
              </Button>
            )}
            
            {canResume && (
              <Button
                size="sm"
                onClick={handleResumeClick}
                disabled={isLoading}
                className="text-white bg-orange-600 hover:bg-orange-700"
              >
                <Play className="mr-1 w-3 h-3" />
                Reanudar
              </Button>
            )}
            
            {canFinish && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleFinishClick}
                disabled={isLoading}
                className="text-blue-700 border-blue-300 hover:bg-blue-50"
              >
                <Square className="mr-1 w-3 h-3" />
                Finalizar
              </Button>
            )}
          </div>
          
          {error && (
            <div className="flex gap-2 items-center text-sm text-red-600">
              <AlertTriangle className="w-4 h-4" />
              {error}
            </div>
          )}
        </div>

        <AppointmentEquipmentSelector
          open={showEquipmentSelector}
          onOpenChange={setShowEquipmentSelector}
          appointmentId={appointmentId}
          appointmentClientName={appointmentData?.clientName}
          onStartWithoutEquipment={handleStartWithoutEquipment}
        />

        <Dialog open={showPauseDialog} onOpenChange={setShowPauseDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Pausar Cita</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">
                  Motivo de la pausa (opcional)
                </label>
                <textarea
                  value={pauseReason}
                  onChange={(e) => setPauseReason(e.target.value)}
                  placeholder="Ej: Cliente llegó tarde, problema técnico..."
                  className="p-2 mt-1 w-full h-20 rounded-md border resize-none"
                />
              </div>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShowPauseDialog(false)}
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handlePauseConfirm}
                  className="flex-1 bg-orange-600 hover:bg-orange-700"
                >
                  Pausar
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  return (
    <div className={cn("p-6 space-y-6", className)}>
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Cronómetro de Cita</h2>
          {appointmentData && (
            <p className="text-muted-foreground">
              {appointmentData.clientName} - {appointmentData.serviceName}
            </p>
          )}
        </div>
        
        {timerData && (
          <Badge 
            variant={isActive ? "default" : isPaused ? "secondary" : "outline"}
            className={cn(
              "text-sm px-3 py-1",
              isActive && "bg-green-100 text-green-700",
              isPaused && "bg-orange-100 text-orange-700",
              isCompleted && "bg-blue-100 text-blue-700"
            )}
          >
            {isActive && <Play className="mr-1 w-3 h-3" />}
            {isPaused && <Pause className="mr-1 w-3 h-3" />}
            {isCompleted && <CheckCircle className="mr-1 w-3 h-3" />}
            {isActive ? 'En Progreso' : isPaused ? 'Pausado' : 'Completado'}
          </Badge>
        )}
      </div>
      
      {timerData && (
        <div className="p-6 text-center bg-gray-50 rounded-lg">
          <AppointmentTimerDisplay
            status={status as AppointmentUsageStatus}
            displayTime={displayTime}
            isExceeded={isExceeded}
            remainingTime={remainingTime}
            progressPercentage={progressPercentage}
            estimatedMinutes={estimatedMinutes}
            actualMinutes={actualMinutes}
            hasEquipment={!!timerData.equipmentId}
            width="wide"
            showProgressBar={true}
            className="justify-center"
          />
          
          {appointmentData && (
            <div className="mt-4 text-sm text-muted-foreground">
              Duración estimada: {appointmentData.estimatedDuration} minutos
            </div>
          )}
        </div>
      )}
      
      <div className="flex gap-4 justify-center">
        {canStart && (
          <Button
            size="lg"
            onClick={handleStartClick}
            disabled={isLoading || isStarting}
            className="px-8 text-white bg-green-600 hover:bg-green-700"
          >
            {isStarting ? (
              <div className="flex gap-2 items-center">
                <div className="w-4 h-4 rounded-full border-2 border-white animate-spin border-t-transparent" />
                Iniciando...
              </div>
            ) : (
              <div className="flex gap-2 items-center">
                <Play className="w-4 h-4" />
                Iniciar Cita
              </div>
            )}
          </Button>
        )}
        
        {canPause && (
          <Button
            size="lg"
            variant="outline"
            onClick={handlePauseClick}
            disabled={isLoading}
            className="px-8 text-orange-700 border-orange-300 hover:bg-orange-50"
          >
            <Pause className="mr-2 w-4 h-4" />
            Pausar
          </Button>
        )}
        
        {canResume && (
          <Button
            size="lg"
            onClick={handleResumeClick}
            disabled={isLoading}
            className="px-8 text-white bg-orange-600 hover:bg-orange-700"
          >
            <Play className="mr-2 w-4 h-4" />
            Reanudar
          </Button>
        )}
        
        {canFinish && (
          <Button
            size="lg"
            variant="outline"
            onClick={handleFinishClick}
            disabled={isLoading}
            className="px-8 text-blue-700 border-blue-300 hover:bg-blue-50"
          >
            <Square className="mr-2 w-4 h-4" />
            Finalizar
          </Button>
        )}
      </div>
      
      {error && (
        <div className="p-4 bg-red-50 rounded-lg border border-red-200">
          <div className="flex gap-2 items-center text-red-700">
            <AlertTriangle className="w-5 h-5" />
            <strong>Error:</strong>
          </div>
          <p className="mt-1 text-red-600">{error}</p>
        </div>
      )}
      
      <AppointmentEquipmentSelector
        open={showEquipmentSelector}
        onOpenChange={setShowEquipmentSelector}
        appointmentId={appointmentId}
        appointmentClientName={appointmentData?.clientName}
        onStartWithoutEquipment={handleStartWithoutEquipment}
      />

      <Dialog open={showPauseDialog} onOpenChange={setShowPauseDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Pausar Cita</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">
                Motivo de la pausa (opcional)
              </label>
              <textarea
                value={pauseReason}
                onChange={(e) => setPauseReason(e.target.value)}
                placeholder="Ej: Cliente llegó tarde, problema técnico..."
                className="p-2 mt-1 w-full h-20 rounded-md border resize-none"
              />
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setShowPauseDialog(false)}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                onClick={handlePauseConfirm}
                className="flex-1 bg-orange-600 hover:bg-orange-700"
              >
                Pausar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
} 