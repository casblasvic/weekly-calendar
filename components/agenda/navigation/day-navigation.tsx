export function DayNavigation({
  currentDate,
  onPrevDay,
  onNextDay,
  onToday
}: {
  currentDate: Date,
  onPrevDay: () => void,
  onNextDay: () => void,
  onToday: () => void
}) {
  return (
    <div className="flex items-center gap-2">
      <Button variant="ghost" size="icon" onClick={onPrevDay} className="text-purple-600">
        <ChevronLeft className="w-4 h-4" />
      </Button>
      
      <Button variant="ghost" size="icon" onClick={onToday} className="text-purple-600">
        <CalendarDays className="w-4 h-4" />
      </Button>
      
      <Button variant="ghost" size="icon" onClick={onNextDay} className="text-purple-600">
        <ChevronRight className="w-4 h-4" />
      </Button>
    </div>
  );
} 