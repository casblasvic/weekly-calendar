import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
    try {
        // Hacer una llamada al endpoint socket.js para inicializarlo
        const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
        await fetch(`${baseUrl}/api/socket`);
        
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