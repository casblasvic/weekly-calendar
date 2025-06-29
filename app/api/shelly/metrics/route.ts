import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

// Verificar variables de entorno al cargar el módulo
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

let supabase: any = null;

if (supabaseUrl && supabaseKey) {
    try {
        const { createClient } = require('@supabase/supabase-js');
        supabase = createClient(supabaseUrl, supabaseKey);
    } catch (error) {
        console.warn('Supabase no disponible para métricas:', error);
    }
}

export async function GET(request: NextRequest) {
    const session = await auth();
    if (!session?.user?.systemId) {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // Si no hay Supabase configurado, devolver métricas por defecto
    if (!supabase) {
        return NextResponse.json({
            totalConnections: 0,
            activeConnections: 0,
            failedConnections: 0,
            messagesReceived: 0,
            messagesSent: 0,
            lastHealthCheck: new Date(),
            note: "Métricas no disponibles - Supabase no configurado"
        });
    }

    try {
        // Obtener métricas del worker desde Supabase
        const { data, error } = await supabase
            .from('websocket_metrics')
            .select('*')
            .eq('id', 'shelly-worker')
            .single();

        if (error || !data) {
            // Si no hay métricas, devolver valores por defecto
            return NextResponse.json({
                totalConnections: 0,
                activeConnections: 0,
                failedConnections: 0,
                messagesReceived: 0,
                messagesSent: 0,
                lastHealthCheck: new Date()
            });
        }

        return NextResponse.json(data.metrics);

    } catch (error) {
        console.error('Error obteniendo métricas:', error);
        return NextResponse.json({ 
            error: "Error al obtener métricas" 
        }, { status: 500 });
    }
} 