"use client"; // Necesario para estado y hooks

import React, { useState, useCallback, use } from 'react';
import { useRouter } from 'next/navigation';
import { parse, format } from 'date-fns';
import { es } from 'date-fns/locale'; // Importar locale
import { AgendaLayout } from "@/components/agenda/agenda-layout"; 
import ResponsiveAgendaView from "@/components/responsive-agenda-view";
import { Loader2 } from 'lucide-react';

// Tipar correctamente los params
interface WeeklyAgendaPageProps {
  params: Promise<{ date: string }>; // Marcar params como Promise
}

export default function WeeklyAgendaPage({ params: paramsProp }: WeeklyAgendaPageProps) { // Renombrar params para usar use
  const router = useRouter();
  
  // Desenvolver params usando use()
  const params = use(paramsProp);

  // Usar useState para gestionar la fecha parseada
  const [currentDate, setCurrentDate] = useState<Date | null>(() => {
     try {
      // Parsear la fecha al inicializar el estado
      return parse(params.date, "yyyy-MM-dd", new Date());
    } catch (error) {
      console.error("Error parsing date in WeeklyAgendaPage:", error);
      // Considerar retornar null y manejar estado de error/carga
      return null; 
    }
  });

  // Handler para cambios de fecha desde AgendaNavBar
  const handleDateChange = useCallback((newDate: Date) => {
    if (!newDate || isNaN(newDate.getTime())) return; // Validación básica
    const formattedDate = format(newDate, "yyyy-MM-dd");
    // Actualizar estado local inmediatamente para UI
    setCurrentDate(newDate);
    // Navegar a la nueva URL
    router.push(`/agenda/semana/${formattedDate}`);
  }, [router]);

  // Handler para cambios de vista desde AgendaNavBar
  const handleViewChange = useCallback((newView: 'day' | 'week', date?: Date) => {
    const dateToUse = date || currentDate;
    if (!dateToUse || isNaN(dateToUse.getTime())) return; 

    const formattedDate = format(dateToUse, "yyyy-MM-dd");
    if (newView === 'day') {
      router.push(`/agenda/dia/${formattedDate}`);
    } else if (date && date.getTime() !== currentDate?.getTime()) {
      // Si ya estamos en semana pero la fecha cambió (ej, desde DatePicker)
      handleDateChange(date);
    }
  }, [router, currentDate, handleDateChange]);

  // Mostrar carga o error si la fecha no es válida inicialmente
  if (!currentDate) {
    return <div className="flex items-center justify-center h-screen"><Loader2 className="w-8 h-8 mr-2 animate-spin"/>Error al cargar fecha.</div>;
  }

  return (
    // Envolver con AgendaLayout
    <AgendaLayout
      title="Agenda Semanal"
      date={currentDate} // Pasar objeto Date
      view="week"
      onDateChange={handleDateChange} // Pasar handler
      onViewChange={handleViewChange} // Pasar handler
    >
      {/* ResponsiveAgendaView recibe la fecha original como string */}
      <ResponsiveAgendaView 
        date={params.date} // Usar el param desenvuelto
        initialView="week" 
      />
    </AgendaLayout>
  );
}

