import { useClinic } from "@/contexts/clinic-context";
import { WeekSchedule } from "@/types/schedule";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { AgendaNavBar } from "@/components/agenda-nav-bar";

// Componente simple para mostrar la fecha
const DateDisplay = ({ date }: { date: Date }) => (
  <p className="text-gray-500">
    {format(date, "EEEE, d 'de' MMMM 'de' yyyy", { locale: es })}
  </p>
);

export function AgendaLayout({
  title,
  children,
  date,
  view,
  onViewChange,
  onDateChange
}: {
  title: string,
  children: React.ReactNode,
  date: Date,
  view: 'day' | 'week',
  onViewChange: (view: 'day' | 'week', date?: Date) => void,
  onDateChange: (date: Date) => void
}) {
  const { activeClinic } = useClinic();
  
  // Función para convertir el día en español a clave en inglés
  const getDayKey = (date: Date) => {
    const day = format(date, "EEEE", { locale: es }).toLowerCase();
    const dayMap = {
      lunes: "monday",
      martes: "tuesday",
      miércoles: "wednesday",
      jueves: "thursday",
      viernes: "friday",
      sábado: "saturday",
      domingo: "sunday",
    } as const;
    return dayMap[day as keyof typeof dayMap] || day;
  };
  
  // Función para verificar si un día está activo en la configuración
  const isDayActive = (date: Date) => {
    // Usar la propiedad correcta para obtener el horario
    const schedule = activeClinic?.linkedScheduleTemplate?.blocks || activeClinic?.independentScheduleBlocks;
    
    if (!schedule || schedule.length === 0) return true; // Si no hay horario definido, permitir todos los días
    
    try {
      const dayKey = getDayKey(date);
      
      // Verificar si hay algún bloque para este día
      const hasBlocksForDay = schedule.some(block => 
        block.dayOfWeek.toLowerCase() === dayKey
      );
      
      if (!hasBlocksForDay) return false;
      
      // Si hay bloques para este día, está activo
      return true;
    } catch (error) {
      console.error("[AgendaLayout] Error checking if day is active:", error);
      return true; // En caso de error, permitir todos los días
    }
  };

  return (
    <div className="flex flex-col h-screen bg-white">
      <header className="px-4 py-3 z-30 relative bg-white border-b">
        <div className="px-4 py-3">
          <h1 className="text-2xl font-medium mb-4">{title}</h1>
          <DateDisplay date={date} />
        </div>
        
        <AgendaNavBar
          currentDate={date}
          setCurrentDate={onDateChange}
          view={view}
          onViewChange={onViewChange}
          isDayActive={isDayActive}
        />
      </header>
      
      <div className="flex-1 overflow-auto relative">
        {children}
      </div>
    </div>
  );
} 