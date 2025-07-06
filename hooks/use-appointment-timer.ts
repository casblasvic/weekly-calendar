import { useState, useEffect, useCallback, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useSocketStatus } from '@/app/contexts/socket-status-context';
import { 
  calculateActualMinutes, 
  getCurrentPauseDuration, 
  formatTimerDisplay,
  isTimeExceeded,
  getRemainingTime,
  getProgressPercentage
} from '@/utils/appointment-timer-utils';
import type { AppointmentTimerData, AppointmentUsageStatus } from '@/types/appointments';

interface UseAppointmentTimerProps {
  appointmentId: string;
  autoRefresh?: boolean;
  onTimeExceeded?: () => void;
  onError?: (error: string) => void;
}

interface AppointmentTimerState {
  timerData: AppointmentTimerData | null;
  isLoading: boolean;
  error: string | null;
  currentTime: number; // Segundos totales transcurridos
  displayTime: string; // Formato MM:SS
  isExceeded: boolean;
  remainingTime: number;
  progressPercentage: number; // 🆕 Progreso 0-100+%
  status: AppointmentUsageStatus | null;
}

export function useAppointmentTimer({
  appointmentId,
  autoRefresh = true,
  onTimeExceeded,
  onError
}: UseAppointmentTimerProps) {
  const { data: session } = useSession();
  const { setStatus } = useSocketStatus();
  const [state, setState] = useState<AppointmentTimerState>({
    timerData: null,
    isLoading: false,
    error: null,
    currentTime: 0,
    displayTime: '00:00',
    isExceeded: false,
    remainingTime: 0,
    progressPercentage: 0, // 🆕 Inicializar progreso
    status: null
  });

  const lastExceededRef = useRef(false);
  const socketRef = useRef<any>(null);

  // Función para obtener datos del timer desde la API
  const fetchTimerData = useCallback(async () => {
    if (!session?.user?.systemId || !appointmentId) return;

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const response = await fetch(`/api/appointments/${appointmentId}/timer`);
      
      if (!response.ok) {
        if (response.status === 404) {
          // No hay timer activo para esta cita
          setState(prev => ({
            ...prev,
            timerData: null,
            isLoading: false,
            status: null,
            currentTime: 0,
            displayTime: '00:00',
            progressPercentage: 0 // 🆕 Reset progreso
          }));
          return;
        }
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      const timerData: AppointmentTimerData = {
        ...data,
        startedAt: new Date(data.startedAt),
        endedAt: data.endedAt ? new Date(data.endedAt) : undefined,
        pausedAt: data.pausedAt ? new Date(data.pausedAt) : undefined
      };

      setState(prev => ({
        ...prev,
        timerData,
        isLoading: false,
        status: timerData.currentStatus as AppointmentUsageStatus
      }));

      // ✅ ACTUALIZAR TIEMPO INMEDIATAMENTE al obtener datos
      updateCurrentTimeFromData(timerData);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      setState(prev => ({ ...prev, error: errorMessage, isLoading: false }));
      onError?.(errorMessage);
    }
  }, [appointmentId, session?.user?.systemId, onError]);

  // ✅ FUNCIÓN PARA ACTUALIZAR TIEMPO DESDE DATOS (sin timer artificial)
  const updateCurrentTimeFromData = useCallback((timerData: AppointmentTimerData) => {
    if (!timerData) return;

    let currentMinutes: number;

    if (timerData.currentStatus === 'PAUSED') {
      // Si está pausado, calcular hasta el momento de la pausa
      const timerUntilPause = {
        ...timerData,
        endedAt: timerData.pausedAt
      };
      currentMinutes = calculateActualMinutes(timerUntilPause);
    } else if (timerData.currentStatus === 'ACTIVE') {
      // Si está activo, calcular tiempo actual
      currentMinutes = calculateActualMinutes(timerData);
    } else {
      // Si está completado, usar el tiempo final
      currentMinutes = timerData.actualMinutes || calculateActualMinutes(timerData);
    }

    const currentSeconds = Math.floor(currentMinutes * 60);
    const displayTime = formatTimerDisplay(currentMinutes);
    const isExceeded = isTimeExceeded({ ...timerData, actualMinutes: currentMinutes });
    const remainingTime = getRemainingTime({ ...timerData, actualMinutes: currentMinutes });
    
    // 🆕 Calcular progreso en tiempo real
    const progressPercentage = getProgressPercentage({ ...timerData, actualMinutes: currentMinutes });

    setState(prev => ({
      ...prev,
      currentTime: currentSeconds,
      displayTime,
      isExceeded,
      remainingTime,
      progressPercentage // 🆕 Actualizar progreso
    }));

    // Disparar callback si se excede el tiempo por primera vez
    if (isExceeded && !lastExceededRef.current && onTimeExceeded) {
      lastExceededRef.current = true;
      onTimeExceeded();
    } else if (!isExceeded) {
      lastExceededRef.current = false;
    }
  }, [onTimeExceeded]);

  // 🚀 WEBSOCKET TIEMPO REAL - Eliminar timers completamente
  useEffect(() => {
    if (!session?.user?.systemId || !appointmentId) return;

    console.log('[AppointmentTimer] 📡 Conectando WebSocket para tiempo real...');

    const connectWebSocket = async () => {
      try {
        // Crear conexión Socket.IO al servidor externo (Railway)
        const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? window.location.origin;

        console.log(`[AppointmentTimer] 🔗 Conectando a ${WS_URL}/socket.io`);
        setStatus('connecting');

        const { io } = await import('socket.io-client');
        socketRef.current = io(WS_URL, {
          path: '/socket.io',        // Ruta estándar en Railway
          transports: ['websocket'], // WebSocket puro, sin fallback polling
          auth: {
            systemId: session.user.systemId,
            userId: session.user.id
          }
        });

        socketRef.current.on('connect', () => {
          console.log('✅ [AppointmentTimer] Conectado a tiempo real');
          setStatus('connected');
        });

        // 🎯 ESCUCHAR UPDATES DE CRONÓMETRO EN TIEMPO REAL
        socketRef.current.on('appointment-timer-update', (update: any) => {
          console.log('[AppointmentTimer] 📡 Timer update recibido:', update);
          
          if (update.appointmentId === appointmentId) {
            // ✅ ACTUALIZAR ESTADO DIRECTAMENTE desde WebSocket
            const timerData: AppointmentTimerData = {
              ...update.timerData,
              startedAt: new Date(update.timerData.startedAt),
              endedAt: update.timerData.endedAt ? new Date(update.timerData.endedAt) : undefined,
              pausedAt: update.timerData.pausedAt ? new Date(update.timerData.pausedAt) : undefined
            };

            setState(prev => ({
              ...prev,
              timerData,
              status: timerData.currentStatus as AppointmentUsageStatus
            }));

            updateCurrentTimeFromData(timerData);
          }
        });

        // 🎯 ESCUCHAR UPDATES DE EQUIPAMIENTO RELACIONADO
        socketRef.current.on('device-update', (update: any) => {
          // Solo loggear si afecta a este cronómetro
          if (state.timerData?.deviceId === update.deviceId) {
            console.log('[AppointmentTimer] 🔧 Dispositivo actualizado:', update);
            // No necesitamos hacer nada más, el estado del dispositivo se maneja en otros componentes
          }
        });

        socketRef.current.on('disconnect', (reason: string) => {
          console.log('[AppointmentTimer] Socket desconectado', reason);
          setStatus('disconnected');
        });

      } catch (error) {
        console.error('[AppointmentTimer] Error de conexión', error);
        setStatus('disconnected');
      }
    };

    connectWebSocket();

    return () => {
      if (socketRef.current) {
        console.log('[AppointmentTimer] 🔌 Desconectando WebSocket...');
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [session?.user?.systemId, session?.user?.id, appointmentId, updateCurrentTimeFromData, state.timerData?.deviceId, setStatus]);

  // ✅ CARGA INICIAL DE DATOS (una sola vez)
  useEffect(() => {
    fetchTimerData();
  }, [fetchTimerData]);

  // Funciones de control
  const startTimer = useCallback(async (skipEquipmentCheck = false) => {
    try {
      const response = await fetch(`/api/appointments/${appointmentId}/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          withoutEquipment: skipEquipmentCheck,
          skipEquipmentCheck 
        })
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Error al iniciar cita');
      }

      // Si requiere selección de equipamiento, retornar las opciones
      if (result.requiresEquipmentSelection) {
        return result;
      }

      // ✅ NO HACER fetchTimerData - el WebSocket se encargará de la actualización
      console.log('[AppointmentTimer] ✅ Timer iniciado, esperando update via WebSocket...');
      return result;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      setState(prev => ({ ...prev, error: errorMessage }));
      throw error;
    }
  }, [appointmentId]);

  const pauseTimer = useCallback(async (reason?: string) => {
    try {
      const response = await fetch(`/api/appointments/${appointmentId}/pause`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason })
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Error al pausar cita');
      }

      // ✅ NO HACER fetchTimerData - el WebSocket se encargará de la actualización
      console.log('[AppointmentTimer] ⏸️ Timer pausado, esperando update via WebSocket...');
      return result;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      setState(prev => ({ ...prev, error: errorMessage }));
      throw error;
    }
  }, [appointmentId]);

  const resumeTimer = useCallback(async () => {
    try {
      const response = await fetch(`/api/appointments/${appointmentId}/resume`, {
        method: 'POST'
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Error al reanudar cita');
      }

      // ✅ NO HACER fetchTimerData - el WebSocket se encargará de la actualización
      console.log('[AppointmentTimer] ▶️ Timer reanudado, esperando update via WebSocket...');
      return result;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      setState(prev => ({ ...prev, error: errorMessage }));
      throw error;
    }
  }, [appointmentId]);

  const finishTimer = useCallback(async (reason?: string) => {
    try {
      const response = await fetch(`/api/appointments/${appointmentId}/finish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason })
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Error al finalizar cita');
      }

      // ✅ NO HACER fetchTimerData - el WebSocket se encargará de la actualización
      console.log('[AppointmentTimer] 🏁 Timer finalizado, esperando update via WebSocket...');
      return result;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      setState(prev => ({ ...prev, error: errorMessage }));
      throw error;
    }
  }, [appointmentId]);

  return {
    // Estado
    ...state,
    
    // Acciones
    startTimer,
    pauseTimer,
    resumeTimer,
    finishTimer,
    refreshData: fetchTimerData,
    
    // Utilidades
    canStart: !state.timerData && !state.isLoading,
    canPause: state.status === 'ACTIVE',
    canResume: state.status === 'PAUSED',
    canFinish: state.status === 'ACTIVE' || state.status === 'PAUSED',
    isActive: state.status === 'ACTIVE',
    isPaused: state.status === 'PAUSED',
    isCompleted: state.status === 'COMPLETED'
  };
} 