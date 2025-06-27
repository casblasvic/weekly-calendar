import { NextRequest, NextResponse } from "next/server";
import { createClient } from '@supabase/supabase-js';
import { auth } from "@/lib/auth";

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
);

export async function GET(request: NextRequest) {
    const session = await auth();
    if (!session?.user?.systemId) {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });
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