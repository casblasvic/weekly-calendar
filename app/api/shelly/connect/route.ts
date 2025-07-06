import { NextRequest, NextResponse } from "next/server";
import { prisma, Prisma } from '@/lib/db';
import { auth } from "@/lib/auth";
import { loginShelly, decodeUserApiUrl, getShellyTokens } from "@/lib/shelly/client";
import { encrypt } from "@/lib/shelly/crypto";

// const prisma = new PrismaClient(); // MIGRADO: usar singleton desde @/lib/db

export async function POST(request: NextRequest) {
    const session = await auth();
    if (!session?.user?.systemId) {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    try {
        const body = await request.json();
        const { name, email, password, credentialId } = body;

        // Validaciones
        if (!name || !email || !password) {
            return NextResponse.json({ 
                error: "Todos los campos son requeridos" 
            }, { status: 400 });
        }

        // Obtener clínica del usuario (opcional - puede ser null)
        const userClinic = await prisma.userClinicAssignment.findFirst({
            where: {
                userId: session.user.id
            },
            include: {
                clinic: true
            }
        });

        // Nota: No es obligatorio que el usuario esté asignado a una clínica
        // para conectar su cuenta personal de Shelly

        // Paso 1: Login con Shelly
        console.log('Iniciando login con Shelly...');
        const code = await loginShelly(email, password);
        
        // Paso 2: Decodificar URL de API del código
        console.log('Decodificando API URL...');
        const apiHost = decodeUserApiUrl(code);
        
        // Paso 3: Obtener tokens
        console.log('Obteniendo tokens...');
        const tokens = await getShellyTokens(apiHost, code);
        
        // Paso 4: Cifrar tokens
        const encryptedAccessToken = encrypt(tokens.access_token);
        const encryptedRefreshToken = encrypt(tokens.refresh_token);
        
        // Paso 5: Guardar o actualizar credenciales
        let savedCredentialId: string;
        
        if (credentialId) {
            // Actualizar credenciales existentes
            await prisma.shellyCredential.update({
                where: { id: credentialId },
                data: {
                    name,
                    accessToken: encryptedAccessToken,
                    refreshToken: encryptedRefreshToken,
                    apiHost,
                    status: 'connected',
                    updatedAt: new Date()
                }
            });
            savedCredentialId = credentialId;
        } else {
            // Crear nuevas credenciales
            const newCredential = await prisma.shellyCredential.create({
                data: {
                    name,
                    email,
                    accessToken: encryptedAccessToken,
                    refreshToken: encryptedRefreshToken,
                    apiHost,
                    systemId: session.user.systemId,
                    clinicId: userClinic?.clinicId,
                    status: 'connected'
                }
            });
            savedCredentialId = newCredential.id;
        }

        return NextResponse.json({ 
            success: true,
            message: "Cuenta conectada exitosamente",
            credentialId: savedCredentialId
        });

    } catch (error) {
        console.error('Error al conectar con Shelly:', error);
        
        if (error instanceof Error) {
            if (error.message.includes('wrong_credentials')) {
                return NextResponse.json({ 
                    error: "Email o contraseña incorrectos" 
                }, { status: 401 });
            }
            
            return NextResponse.json({ 
                error: error.message 
            }, { status: 400 });
        }
        
        return NextResponse.json({ 
            error: "Error al conectar con Shelly Cloud" 
        }, { status: 500 });
    }
} 