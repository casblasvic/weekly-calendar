"use client"; // Necesario para estado y hooks

import React, { useState, useCallback, use } from 'react';
import { useRouter } from 'next/navigation';
import { parse, format } from 'date-fns';
import { es } from 'date-fns/locale';
import { AgendaLayout } from "@/components/agenda/agenda-layout"; 
import ResponsiveAgendaView from "@/components/responsive-agenda-view";
import { Loader2 } from 'lucide-react';

// Tipar correctamente los params
interface DailyAgendaPageProps {
  params: Promise<{ date: string }>; // Marcar params como Promise
}

export default function DailyAgendaPage({ params: paramsProp }: DailyAgendaPageProps) {
  const router = useRouter();

  // Desenvolver params usando use()
  const params = use(paramsProp);

  // Estado para la fecha actual
  const [currentDate, setCurrentDate] = useState<Date | null>(() => {
    try {
      return parse(params.date, "yyyy-MM-dd", new Date());
    } catch (error) {
      console.error("Error parsing date in DailyAgendaPage:", error);
      return null;
    }
  });

  // Handler para cambios de fecha desde AgendaNavBar
  const handleDateChange = useCallback((newDate: Date) => {
    if (!newDate || isNaN(newDate.getTime())) return;
    const formattedDate = format(newDate, "yyyy-MM-dd");
    setCurrentDate(newDate); // Actualizar estado local
    router.push(`/agenda/dia/${formattedDate}`); // Navegar a la nueva URL
  }, [router]);

  // Handler para cambios de vista desde AgendaNavBar
  const handleViewChange = useCallback((newView: 'day' | 'week', date?: Date) => {
    const dateToUse = date || currentDate;
    if (!dateToUse || isNaN(dateToUse.getTime())) return;

    const formattedDate = format(dateToUse, "yyyy-MM-dd");
    if (newView === 'week') {
      router.push(`/agenda/semana/${formattedDate}`);
    } else if (date && date.getTime() !== currentDate?.getTime()) {
      // Si ya estamos en día pero la fecha cambió (ej, desde DatePicker)
      handleDateChange(date);
    }
  }, [router, currentDate, handleDateChange]);

  // Mostrar carga o error si la fecha no es válida
  if (!currentDate) {
    return <div className="flex items-center justify-center h-screen"><Loader2 className="w-8 h-8 mr-2 animate-spin"/>Error al cargar fecha.</div>;
  }

  return (
    <AgendaLayout
      title="Agenda Diaria"
      date={currentDate}
      view="day"
      onDateChange={handleDateChange}
      onViewChange={handleViewChange}
    >
      <ResponsiveAgendaView 
        date={params.date} 
        initialView="day" 
      />
    </AgendaLayout>
  );
}

