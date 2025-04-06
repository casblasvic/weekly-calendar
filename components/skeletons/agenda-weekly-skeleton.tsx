import { Skeleton } from "@/components/ui/skeleton"

export function AgendaWeeklySkeleton() {
  const timeSlots = Array.from({ length: 10 }, (_, i) => `${String(9 + i).padStart(2, '0')}:00`); // Esqueleto de 9 a 18
  const days = Array.from({ length: 7 }); // 7 días

  return (
    <div className="flex flex-col h-full bg-white animate-pulse">
      {/* Header Skeleton */}
      <header className="relative z-30 px-4 py-3 bg-white border-b">
        <div className="px-4 py-3">
          <Skeleton className="h-6 mb-4 w-1/2" />
          <Skeleton className="h-4 w-3/4" />
        </div>
        {/* Nav Bar Skeleton (simplificado) */}
        <div className="flex items-center justify-between px-4 py-2 border-t">
          <div className="flex items-center space-x-2">
            <Skeleton className="h-8 w-8 rounded-full" />
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-8 w-8 rounded-full" />
          </div>
          <Skeleton className="h-8 w-20" />
        </div>
      </header>

      {/* Grid Skeleton */}
      <div className="flex-1 overflow-hidden">
        {/* Grid Header */}
        <div className="sticky top-0 z-20 bg-gray-50">
          <div className="grid" style={{ gridTemplateColumns: `80px repeat(${days.length}, 1fr)` }}>
            <div className="p-2 border-r border-b h-14 flex items-center">
              <Skeleton className="h-4 w-10" />
            </div>
            {days.map((_, index) => (
              <div key={`day-header-${index}`} className="p-2 border-r border-b h-14 flex flex-col justify-center">
                <Skeleton className="h-4 w-20 mb-1" />
                <Skeleton className="h-3 w-16" />
              </div>
            ))}
          </div>
        </div>

        {/* Grid Body */}
        <div className="overflow-hidden">
          <div className="grid" style={{ gridTemplateColumns: `80px repeat(${days.length}, 1fr)` }}>
            {/* Time Column */}
            <div className="col-span-1">
              {timeSlots.map((time) => (
                <div key={`time-${time}`} className="flex items-center justify-center p-2 border-b border-r h-10">
                  <Skeleton className="h-4 w-12" />
                </div>
              ))}
            </div>
            {/* Day Columns */}
            {days.map((_, dayIndex) => (
              <div key={`day-col-${dayIndex}`} className="col-span-1 border-r">
                {timeSlots.map((time) => (
                  <div
                    key={`cell-${dayIndex}-${time}`}
                    className="border-b h-10 bg-gray-50/50"
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
} 