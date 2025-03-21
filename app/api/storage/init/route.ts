import { NextResponse } from 'next/server';
import { initializeServerStorage } from '@/lib/init-storage';

/**
 * Inicializa la estructura de carpetas para almacenamiento de archivos
 * Se puede llamar al iniciar el sistema o cuando se crea una nueva clínica
 */
export async function POST(req: Request) {
  try {
    const { clinicId } = await req.json();
    const result = initializeServerStorage(clinicId);
    
    if (result.success) {
      return NextResponse.json({ 
        success: true, 
        message: clinicId ? `Estructura creada para clínica ${clinicId}` : 'Estructura base creada' 
      });
    } else {
      throw new Error(result.error || 'Error desconocido');
    }
  } catch (error: any) {
    console.error('Error al crear estructura de carpetas:', error);
    return NextResponse.json(
      { success: false, error: error.message }, 
      { status: 500 }
    );
  }
} 