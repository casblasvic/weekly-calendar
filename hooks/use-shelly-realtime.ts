import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

// Configurar cliente Supabase para tiempo real
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

interface SmartPlugDevice {
    id: string;
    name: string;
    deviceId: string;
    online: boolean;
    relayOn: boolean;
    currentPower?: number;
    voltage?: number;
    temperature?: number;
    wifiRssi?: number;
    lastSeenAt?: string;
    updatedAt: string;
}

interface RealtimeUpdate {
    eventType: 'INSERT' | 'UPDATE' | 'DELETE';
    new?: SmartPlugDevice;
    old?: SmartPlugDevice;
}

export function useShellyRealtime(systemId: string) {
    const [updates, setUpdates] = useState<RealtimeUpdate[]>([]);
    const [isConnected, setIsConnected] = useState(false);
    const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

    useEffect(() => {
        if (!systemId) return;

        console.log('🔄 Iniciando conexión en tiempo real para dispositivos Shelly...');

        // Configurar suscripción a cambios en SmartPlugDevice
        const channel = supabase
            .channel(`smart-plug-devices-${systemId}`)
            .on(
                'postgres_changes',
                {
                    event: '*', // Escuchar todos los eventos
                    schema: 'public',
                    table: 'SmartPlugDevice',
                    filter: `systemId=eq.${systemId}` // Solo dispositivos de este sistema
                },
                (payload) => {
                    console.log('📡 Cambio detectado en dispositivo Shelly:', payload);
                    
                    const update: RealtimeUpdate = {
                        eventType: payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE',
                        new: payload.new as SmartPlugDevice,
                        old: payload.old as SmartPlugDevice
                    };

                    setUpdates(prev => [...prev, update]);
                    setLastUpdate(new Date());
                }
            )
            .subscribe((status) => {
                console.log('📡 Estado de suscripción Shelly:', status);
                setIsConnected(status === 'SUBSCRIBED');
            });

        // Cleanup
        return () => {
            console.log('🔄 Desconectando tiempo real Shelly...');
            supabase.removeChannel(channel);
        };
    }, [systemId]);

    // Función para limpiar actualizaciones procesadas
    const clearUpdates = () => {
        setUpdates([]);
    };

    return {
        updates,
        isConnected,
        lastUpdate,
        clearUpdates
    };
} 