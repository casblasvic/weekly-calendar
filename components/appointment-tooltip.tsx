import React from 'react';
import { Calendar, Clock, MapPin, Phone, User, Briefcase } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface AppointmentTooltipProps {
  title: string;
  date: Date | string;
  time: string;
  duration: number;
  color: string;
  roomName?: string;
  clientName?: string;
  clientPhone?: string;
  services?: string[];
  height?: number;
}

export const AppointmentTooltip: React.FC<AppointmentTooltipProps> = ({
  title,
  date,
  time,
  duration,
  color,
  roomName,
  clientName,
  clientPhone,
  services = [],
  height
}) => {
  // Formatear la fecha correctamente
  const formattedDate = typeof date === 'string' 
    ? date 
    : format(date, "EEEE, d 'de' MMMM", { locale: es });
  
  // Calcular hora de fin
  const [hours, minutes] = time.split(':').map(Number);
  const totalMinutes = hours * 60 + minutes + duration;
  const endHours = Math.floor(totalMinutes / 60);
  const endMinutes = totalMinutes % 60;
  const endTime = `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`;
  
  return (
    <div
      className="bg-white rounded-lg shadow-xl border border-gray-200 p-3 min-w-[200px] max-w-[280px]"
      style={{
        borderLeft: `4px solid ${color}`,
        minHeight: height ? `${height}px` : 'auto'
      }}
    >
      {/* Título/Nombre del cliente */}
      <div className="font-semibold text-sm text-gray-900 mb-2 truncate">
        {clientName || title}
      </div>
      
      <div className="space-y-1.5 text-xs text-gray-700">
        {/* Fecha */}
        <div className="flex items-start gap-2">
          <Calendar className="w-3.5 h-3.5 text-gray-500 flex-shrink-0 mt-0.5" />
          <span className="break-words">{formattedDate}</span>
        </div>
        
        {/* Hora */}
        <div className="flex items-center gap-2">
          <Clock className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
          <span className="font-medium">{time} - {endTime}</span>
          <span className="text-gray-500">({duration} min)</span>
        </div>
        
        {/* Teléfono */}
        {clientPhone && (
          <div className="flex items-center gap-2">
            <Phone className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
            <span className="truncate">{clientPhone}</span>
          </div>
        )}
        
        {/* Sala/Cabina */}
        {roomName && (
          <div className="flex items-center gap-2">
            <MapPin className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
            <span className="truncate">{roomName}</span>
          </div>
        )}
        
        {/* Servicios */}
        {services.length > 0 && (
          <div className="flex items-start gap-2">
            <Briefcase className="w-3.5 h-3.5 text-gray-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              {services.length === 1 ? (
                <span className="break-words">{services[0]}</span>
              ) : (
                <div className="space-y-0.5">
                  {services.slice(0, 3).map((service, index) => (
                    <div key={index} className="truncate">• {service}</div>
                  ))}
                  {services.length > 3 && (
                    <div className="text-gray-500">+{services.length - 3} más</div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
