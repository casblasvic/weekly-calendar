export function DateDisplay({ date }: { date: Date }) {
  return (
    <div className="text-sm text-gray-500">
      <span className="capitalize">{format(date, "EEEE", { locale: es })}</span>
      {" "}
      <span>{format(date, "d 'de' MMMM 'de' yyyy", { locale: es })}</span>
    </div>
  );
} 