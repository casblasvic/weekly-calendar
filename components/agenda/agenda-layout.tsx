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
          isDayActive={() => true} // Simplificado para el ejemplo
        />
      </header>
      
      <div className="flex-1 overflow-auto relative">
        {children}
      </div>
    </div>
  );
} 