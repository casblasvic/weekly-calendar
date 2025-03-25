import { NextResponse } from 'next/server';
import { emailSyncService } from '@/app/services/email-sync.service';

export async function POST(request: Request) {
  try {
    // Aquí va la lógica del servicio de email
    const result = await emailSyncService.syncEmails();
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error('Error en sincronización de email:', error);
    return NextResponse.json(
      { success: false, error: 'Error en sincronización' },
      { status: 500 }
    );
  }
} 