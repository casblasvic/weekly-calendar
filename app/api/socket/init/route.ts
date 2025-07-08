import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
    try {
        // Hacer una llamada al endpoint socket.js para inicializarlo
        const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';

        // Propagar cookies y cabeceras de autentificación para evitar redirección a /login
        const headers: Record<string, string> = {};
        const cookieHeader = request.headers.get('cookie');
        if (cookieHeader) {
            headers['cookie'] = cookieHeader;
        }

        // También forward de cabecera Authorization si existe
        const authHeader = request.headers.get('authorization');
        if (authHeader) {
            headers['authorization'] = authHeader;
        }

        const socketRes = await fetch(`${baseUrl}/api/socket`, {
            headers,
            // Nos aseguramos de seguir redirects manualmente para verificar éxito
            redirect: 'manual'
        });

        if (socketRes.status >= 300 && socketRes.status < 400) {
            console.warn('[WS_INIT] Redirección detectada al inicializar Socket.io. Es posible que la sesión no sea válida.');
        }
        
        return NextResponse.json({ 
            success: true, 
            message: "Socket.io server inicializado" 
        });
    } catch (error) {
        console.error('Error inicializando Socket.io:', error);
        return NextResponse.json({ 
            error: "Error al inicializar Socket.io" 
        }, { status: 500 });
    }
} 