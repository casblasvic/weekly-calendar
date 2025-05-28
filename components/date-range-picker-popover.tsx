"use client";

import * as React from "react";
import { CalendarIcon, ChevronLeft, ChevronRight, X } from "lucide-react";
import { format, addDays, startOfMonth, endOfMonth, isSameMonth } from "date-fns";
import { es } from "date-fns/locale";
import { DateRange, DayPicker } from "react-day-picker";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import "react-day-picker/dist/style.css";

// Estilos personalizados para el calendario
const calendarStyles = `
  /* Estilo general del calendario */
  .rdp {
    margin: 0;
    padding: 0;
    width: 100%;
  }

  /* Mes */
  .rdp-month {
    width: 100%;
    position: relative;
  }

  /* Botones de navegación del mes */
  .rdp-nav_button {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    color: #7c3aed;
    background: transparent;
    display: flex;
    align-items: center;
    justify-content: center;
    position: absolute;
    top: 12px;
    z-index: 10;
    cursor: pointer;
    border: none;
    padding: 0;
  }

  .rdp-nav_button:hover {
    background-color: #f5f3ff;
  }

  .rdp-nav_button:focus-visible {
    outline: 2px solid #7c3aed;
    outline-offset: 2px;
  }

  /* Posición específica de los botones de navegación */
  .rdp-nav_button_previous {
    left: 8px;
    top: 8px;
  }

  .rdp-nav_button_next {
    right: 8px;
    top: 8px;
  }

  /* Encabezado del calendario */
  .rdp-caption {
    display: flex;
    height: 56px;
    align-items: center;
    justify-content: center;
    padding: 0 48px;
    position: relative;
    margin-bottom: 8px;
  }

  /* Etiqueta del mes y año */
  .rdp-caption_label {
    font-size: 1rem;
    font-weight: 600;
    color: #7c3aed;
    cursor: pointer;
  }

  /* Selector de mes/año */
  .rdp-dropdown_month,
  .rdp-dropdown_year {
    appearance: none;
    background: transparent;
    border: 0;
    border-radius: 4px;
    padding: 4px 8px;
    font-size: 1rem;
    font-weight: 500;
    color: #7c3aed;
    cursor: pointer;
    margin: 0 4px;
  }

  .rdp-dropdown_month:hover,
  .rdp-dropdown_year:hover {
    background-color: #f5f3ff;
  }

  /* Días de la semana */
  .rdp-head_cell {
    font-size: 0.75rem;
    font-weight: 600;
    color: #6b7280;
    padding: 4px 0;
    text-align: center;
    text-transform: uppercase;
    width: 40px;
    display: flex;
    justify-content: center;
    align-items: center;
  }
  
  /* Tabla y filas */
  .rdp-head_row,
  .rdp-row {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    width: 100%;
  }
  
  /* Personalizar nombres de días de la semana */
  .rdp-head_cell abbr {
    text-decoration: none;
    font-size: 0.75rem;
    letter-spacing: 0.5px;
    font-weight: 600;
    color: transparent;
    position: relative;
  }
  
  /* Forzar nombres específicos para los días con CSS */
  .rdp-head_row .rdp-head_cell:nth-child(1) abbr::after { content: 'LU'; position: absolute; color: #6b7280; left: 0; right: 0; }
  .rdp-head_row .rdp-head_cell:nth-child(2) abbr::after { content: 'MA'; position: absolute; color: #6b7280; left: 0; right: 0; }
  .rdp-head_row .rdp-head_cell:nth-child(3) abbr::after { content: 'MI'; position: absolute; color: #6b7280; left: 0; right: 0; }
  .rdp-head_row .rdp-head_cell:nth-child(4) abbr::after { content: 'JU'; position: absolute; color: #6b7280; left: 0; right: 0; }
  .rdp-head_row .rdp-head_cell:nth-child(5) abbr::after { content: 'VI'; position: absolute; color: #6b7280; left: 0; right: 0; }
  .rdp-head_row .rdp-head_cell:nth-child(6) abbr::after { content: 'SA'; position: absolute; color: #6b7280; left: 0; right: 0; }
  .rdp-head_row .rdp-head_cell:nth-child(7) abbr::after { content: 'DO'; position: absolute; color: #6b7280; left: 0; right: 0; }

  /* Día actual */
  .rdp-day_today {
    font-weight: 700;
    border: 2px solid #7c3aed;
    color: #7c3aed;
  }

  /* Días seleccionados */
  .rdp-day_selected,
  .rdp-day_selected:focus-visible,
  .rdp-day_selected:hover {
    background-color: #7c3aed;
    color: white;
  }

  /* Rango de días entre seleccionados */
  .rdp-day_range_middle {
    background-color: #f3f0ff;
    color: #6b21a8;
  }

  /* Día */
  .rdp-day {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    margin: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.875rem;
    font-weight: 400;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .rdp-day:hover:not(.rdp-day_selected):not(.rdp-day_disabled) {
    background-color: #f5f3ff;
    color: #7c3aed;
  }

  /* Día inicio y fin del rango */
  .rdp-day_range_start,
  .rdp-day_range_end {
    background-color: #7c3aed;
    color: white;
  }

  /* Estilo de la tabla */
  .rdp-table {
    border-collapse: separate;
    border-spacing: 0;
    width: 100%;
  }

  /* Fila de días */
  .rdp-row {
    display: flex;
    justify-content: space-around;
    margin: 4px 0;
  }

  /* Celda */
  .rdp-cell {
    padding: 0;
    text-align: center;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  /* Día fuera del mes */
  .rdp-day_outside {
    opacity: 0.5;
    color: #9ca3af;
  }

  /* Día deshabilitado */
  .rdp-day_disabled {
    opacity: 0.35;
    cursor: not-allowed;
  }
  
  /* Navegación y desplegables */
  .rdp-nav {
    position: relative;
    display: flex;
    justify-content: space-between;
    width: 100%;
    padding: 0 12px;
  }
  
  .rdp-multiple_months .rdp-caption {
    position: relative;
    display: flex;
    justify-content: center;
    height: 40px;
  }
`;

// Componentes personalizados para navegación
function LeftButton(props: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span 
      {...props} 
      className="flex items-center justify-center w-8 h-8 hover:bg-violet-100 rounded-full text-violet-600 transition-colors cursor-pointer"
      role="button"
      aria-label="Mes anterior"
    >
      <ChevronLeft className="h-5 w-5" />
    </span>
  );
}

function RightButton(props: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span 
      {...props} 
      className="flex items-center justify-center w-8 h-8 hover:bg-violet-100 rounded-full text-violet-600 transition-colors cursor-pointer"
      role="button"
      aria-label="Mes siguiente"
    >
      <ChevronRight className="h-5 w-5" />
    </span>
  );
}

// Interfaz para las props del componente
export interface DateRangePickerProps {
  dateRange?: DateRange;
  setDateRange: (dateRange: DateRange | undefined) => void;
  className?: string;
  onApplyFilter?: () => void;
}

export function DateRangePickerPopover({
  className,
  dateRange,
  setDateRange,
  onApplyFilter,
}: DateRangePickerProps) {
  // Estado para controlar la apertura del popover
  const [isOpen, setIsOpen] = React.useState(false);
  // Estado para controlar el mes visible actual (para la navegación)
  const [currentMonth, setCurrentMonth] = React.useState<Date>(dateRange?.from || new Date());
  // Estado para controlar si estamos en medio de seleccionar un rango
  const [isSelectingRange, setIsSelectingRange] = React.useState(false);
  // Estado local para mantener el rango en proceso de selección
  const [internalDateRange, setInternalDateRange] = React.useState<DateRange | undefined>(dateRange);
  // Referencia para rastrear si estamos en un proceso de reseteo
  const isResetting = React.useRef(false);
  
  // Lista de presets para selección rápida
  const presets = [
    {
      label: "Hoy",
      dates: { from: new Date(), to: new Date() }
    },
    {
      label: "Ayer",
      dates: {
        from: new Date(new Date().setDate(new Date().getDate() - 1)),
        to: new Date(new Date().setDate(new Date().getDate() - 1))
      }
    },
    {
      label: "Últimos 7 días",
      dates: {
        from: new Date(new Date().setDate(new Date().getDate() - 6)),
        to: new Date()
      }
    },
    {
      label: "Últimos 30 días",
      dates: {
        from: new Date(new Date().setDate(new Date().getDate() - 29)),
        to: new Date()
      }
    },
    {
      label: "Este mes",
      dates: {
        from: startOfMonth(new Date()),
        to: new Date()
      }
    }
  ];

  // Manejar la selección de un preset
  const handlePresetClick = (dates: DateRange | undefined) => {
    if (!dates) {
      // Si el preset es para limpiar
      resetFilter();
    } else {
      // Si es un preset con fechas
      setInternalDateRange(dates);
      setDateRange(dates);
      
      // Aplicar el filtro
      if (onApplyFilter) {
        setTimeout(() => onApplyFilter(), 50);
      }
    }
    
    // Cerrar el popover
    setIsOpen(false);
  };

  // Controlar el cambio de estado del popover
  const handleOpenChange = (open: boolean) => {
    // Si estamos seleccionando un rango y el popover intenta cerrarse, lo mantenemos abierto
    if (isSelectingRange && !open) {
      return;
    }
    
    // Si no hay condiciones especiales, seguimos el comportamiento normal
    setIsOpen(open);
    
    // Si se cierra el popover y estábamos seleccionando un rango incompleto, cancelamos la selección
    if (!open && isSelectingRange) {
      // Revertimos a la selección anterior
      setInternalDateRange(dateRange);
      setIsSelectingRange(false);
    }
  };

  // Limpiar completamente cualquier rango anterior y manejar la nueva selección si es necesario
  const resetFilter = (newStartDate?: Date) => {
    console.log('[DATE-PICKER-RESET] Iniciando reseteo completo' + (newStartDate ? ' con nueva fecha inicial' : ''));
    console.log('[DATE-PICKER-RESET] Estado actual:', { 
      dateRange, 
      internalDateRange, 
      isSelectingRange, 
      isResetting: isResetting.current 
    });
    
    // Establecer la bandera de reseteo
    isResetting.current = true;
    console.log('[DATE-PICKER-RESET] Bandera isResetting establecida a true');
    
    // Limpiar ambos estados
    setInternalDateRange(undefined);
    setDateRange(undefined);
    console.log('[DATE-PICKER-RESET] Estados interno y externo limpiados');
    
    // Ejecutar el filtro para eliminar cualquier filtrado previo
    if (onApplyFilter) {
      console.log('[DATE-PICKER-RESET] Ejecutando onApplyFilter');
      onApplyFilter();
    }
    
    // Si se proporciona una nueva fecha, la establecemos después de limpiar
    if (newStartDate) {
      // IMPORTANTE: Primero establecemos la nueva fecha
      setTimeout(() => {
        console.log('[DATE-PICKER-RESET] Estableciendo nueva fecha inicial:', newStartDate);
        setInternalDateRange({ from: newStartDate });
        setIsSelectingRange(true);
        setIsOpen(true);
        
        // Solo DESPUÉS restablecemos la bandera
        setTimeout(() => {
          isResetting.current = false;
          console.log('[DATE-PICKER-RESET] Bandera isResetting restablecida a false DESPUÉS de establecer nueva fecha');
        }, 100);
      }, 200);
    } else {
      // Si no hay nueva fecha, simplemente restablecemos la bandera
      setTimeout(() => {
        isResetting.current = false;
        console.log('[DATE-PICKER-RESET] Bandera isResetting restablecida a false (sin nueva fecha)');
      }, 200);
    }
  };
  
  // Manejar la selección de fechas - Lógica simplificada
  const handleSelect = (range: DateRange | undefined) => {
    console.log('[DATE-PICKER-SELECT] Iniciando handleSelect con:', range);
    console.log('[DATE-PICKER-SELECT] Estado actual:', { 
      dateRange, 
      internalDateRange, 
      isSelectingRange, 
      isResetting: isResetting.current 
    });
    
    // Si se limpia la selección (range es null)
    if (!range) {
      console.log('[DATE-PICKER-SELECT] Caso: Limpieza de selección');
      // Limpiar completamente
      resetFilter();
      setIsSelectingRange(false);
      return;
    }
    
    // PUNTO CLAVE: Si ya existe un rango y el usuario hace clic en cualquier fecha
    if (dateRange?.from && dateRange?.to) {
      console.log('[DATE-PICKER-SELECT] Caso: Existe rango completo, iniciando nueva selección con fecha:', range.from);

      // 1. Notificar al padre que el filtro se ha limpiado
      setDateRange(undefined);

      // 2. Ejecutar el filtro inmediatamente para reflejar la limpieza
      if (onApplyFilter) {
        onApplyFilter();
      }

      // 3. Establecer la fecha clicada como nuevo inicio de rango (si existe)
      if (range.from) {
        setInternalDateRange({ from: range.from });
        setIsSelectingRange(true);
        setIsOpen(true); // Mantener el popover abierto para seleccionar fecha fin
      }

      return;
    }
    
    // Caso: Selección de la primera fecha (sin un rango previo)
    if (range.from && !range.to) {
      console.log('[DATE-PICKER-SELECT] Caso: Selección de primera fecha:', range.from);
      setInternalDateRange({ from: range.from });
      setIsSelectingRange(true);
      setIsOpen(true); // Mantener abierto el selector
      return;
    }
    
    // Caso: Selección de rango completo
    if (range.from && range.to) {
      console.log('[DATE-PICKER-SELECT] Caso: Selección de rango completo:', range);
      
      // Ordenar las fechas si es necesario
      const correctedRange = range.from > range.to 
        ? { from: range.to, to: range.from }
        : range;
      
      console.log('[DATE-PICKER-SELECT] Rango corregido:', correctedRange);
      
      // Actualizar ambos estados
      setInternalDateRange(correctedRange);
      setDateRange(correctedRange);
      
      // Finalizar la selección
      setIsSelectingRange(false);
      setIsOpen(false);
      
      // Aplicar el filtro
      if (onApplyFilter) {
        console.log('[DATE-PICKER-SELECT] Ejecutando filtro con rango completo');
        setTimeout(() => onApplyFilter(), 50);
      }
    }
  };

  // Manejar el cambio de mes
  const handleMonthChange = (month: Date) => {
    setCurrentMonth(month);
  };
  
  // Sincronizar el estado interno con el externo cuando cambia desde fuera
  // pero solo si no estamos en proceso de reseteo
  React.useEffect(() => {
    console.log('[DATE-PICKER-SYNC] Efecto dateRange activado');
    console.log('[DATE-PICKER-SYNC] Estado actual:', { 
      dateRange, 
      internalDateRange, 
      isSelectingRange, 
      isResetting: isResetting.current 
    });
    
    if (!isResetting.current) {
      console.log('[DATE-PICKER-SYNC] Sincronizando estado interno con externo:', dateRange);
      setInternalDateRange(dateRange);
    } else {
      console.log('[DATE-PICKER-SYNC] Sincronización omitida debido a reseteo en curso');
    }
  }, [dateRange]);
  
  // Actualizar el estado de selección basado en el rango interno
  React.useEffect(() => {
    console.log('[DATE-PICKER-STATE] Efecto internalDateRange activado:', internalDateRange);
    
    if (internalDateRange?.from && !internalDateRange.to) {
      console.log('[DATE-PICKER-STATE] Estableciendo isSelectingRange a true');
      setIsSelectingRange(true);
    } else {
      console.log('[DATE-PICKER-STATE] Estableciendo isSelectingRange a false');
      setIsSelectingRange(false);
    }
  }, [internalDateRange]);

  // Limpiar la selección (botón X externo)
  const handleClearClick = (e: React.MouseEvent) => { 
    e.stopPropagation(); 
    e.preventDefault();  
    
    // Usar la función de reseteo
    resetFilter();
    setIsSelectingRange(false);
  };
  
  // Limpiar la selección (botón interno)
  const handleInternalClearClick = () => {
    setDateRange(undefined);
    if (onApplyFilter) {
      onApplyFilter();
    }
    // Mantener abierto
    setIsOpen(true);
  };

  // Formatear el rango de fechas para mostrar
  const formatDateRange = () => {
    if (!dateRange?.from) return "Seleccionar fechas";
    
    if (dateRange.to) {
      return `${format(dateRange.from, "dd/MM/yyyy")} - ${format(
        dateRange.to,
        "dd/MM/yyyy"
      )}`;
    }
    
    return format(dateRange.from, "dd/MM/yyyy");
  };

  return (
    <>
      <style>{calendarStyles}</style>
      <div className={cn("flex items-center gap-2", className)}> {/* Changed grid to flex for side-by-side layout */}
        <Popover open={isOpen} onOpenChange={handleOpenChange}>
          <PopoverTrigger asChild>
            <Button
              id="date"
              variant={"outline"}
              className={cn(
                "flex-1 justify-start text-left font-normal", // Use flex-1 to grow and take available space
                !dateRange && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {formatDateRange()}
              {/* X icon is now moved outside PopoverTrigger */}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <div className="relative">
              {/* Ya no necesitamos el botón limpiar interno porque la X externa funciona bien */}
              <DayPicker
                mode="range"
                month={currentMonth}
                onMonthChange={handleMonthChange}
                selected={internalDateRange}
                onSelect={handleSelect}

                numberOfMonths={1}
                locale={es}
                showOutsideDays={true}
                captionLayout="dropdown-buttons"
                showWeekNumber={false}
                fromYear={2010}
                toYear={2040}
                components={{
                  IconLeft: LeftButton,
                  IconRight: RightButton
                }}
                modifiers={{
                  start: dateRange?.from,
                  end: dateRange?.to,
                  today: new Date()
                }}
                disabled={{ before: new Date(2010, 0) }}
                formatters={{ 
                  formatMonthCaption: (date) => format(date, 'MMMM', { locale: es }), 
                  formatYearCaption: (date) => format(date, 'yyyy')
                }}
                styles={{ 
                  caption_dropdowns: { display: 'flex', gap: '8px' }
                }}
                fixedWeeks
                weekStartsOn={1} // Semana comienza en lunes
              />
              
              <div className="p-2 border-t border-slate-100 bg-slate-50">
                <div className="flex justify-center items-center">
                  <div className="flex flex-wrap justify-center gap-1">
                    {presets.map((preset) => (
                      <Button
                        key={preset.label}
                        variant="ghost"
                        size="sm"
                        className="text-xs h-7 px-2 py-1 text-purple-600 hover:bg-purple-100 hover:text-purple-700"
                        onClick={() => handlePresetClick(preset.dates)}
                      >
                        {preset.label}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </PopoverContent>
        </Popover>
        {/* Botón X externo para limpiar el filtro */}
        {dateRange?.from && (
          <Button
            type="button" // Añadir type='button' explícitamente
            variant="ghost" // O el variant que prefieras, ej: outline
            size="icon" // Para que sea pequeño y solo el icono
            onClick={handleClearClick} // El handler simplificado
            className="h-9 w-9 flex-shrink-0 p-0 text-purple-500 hover:text-purple-700" // Ensure fixed size, no shrink, apply text color
            aria-label="Limpiar filtro de fecha"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    </>
  );
}
