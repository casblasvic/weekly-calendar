export function calculateAppointmentTop(appointment, timeSlots, rowHeight = 40) {
  const startTimeIndex = timeSlots.indexOf(appointment.startTime);
  if (startTimeIndex === -1) return 0;
  return startTimeIndex * rowHeight;
}

export function calculateAppointmentLeft(appointment, cabins) {
  const cabinIndex = cabins.findIndex(c => c.id === appointment.roomId);
  if (cabinIndex === -1) return 0;
  
  // Calcular posición considerando el ancho de la columna de hora (primera columna)
  const hourColumnWidth = 80; // Ancho de la columna de hora en px
  const cabinWidth = `calc((100% - ${hourColumnWidth}px) / ${cabins.length})`;
  
  return `calc(${hourColumnWidth}px + (${cabinWidth} * ${cabinIndex}))`;
}

export function calculateAppointmentWidth(appointment, cabins) {
  return `calc((100% - 80px) / ${cabins.length})`;
}

export function calculateAppointmentHeight(appointment, rowHeight = 40) {
  // La duración es en slots de 15 minutos
  return appointment.duration * rowHeight;
}

export function calculateCurrentTimePosition(timeSlots, openTime, closeTime) {
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const currentTimeString = `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`;
  
  // Si el tiempo actual está fuera del horario, no mostrar
  if (currentTimeString < openTime || currentTimeString > closeTime) {
    return -100; // Fuera de la vista
  }
  
  // Encontrar el slot de tiempo más cercano
  let closestIndex = 0;
  let smallestDiff = Infinity;
  
  timeSlots.forEach((slot, index) => {
    const [slotHour, slotMinute] = slot.split(':').map(Number);
    const slotMinutes = slotHour * 60 + slotMinute;
    const currentMinutes = currentHour * 60 + currentMinute;
    const diff = Math.abs(currentMinutes - slotMinutes);
    
    if (diff < smallestDiff) {
      smallestDiff = diff;
      closestIndex = index;
    }
  });
  
  // Calcular posición exacta
  const rowHeight = 40;
  const basePosition = closestIndex * rowHeight;
  
  // Ajustar por la posición dentro del slot
  const [slotHour, slotMinute] = timeSlots[closestIndex].split(':').map(Number);
  const slotMinutes = slotHour * 60 + slotMinute;
  const currentMinutes = currentHour * 60 + currentMinute;
  const minuteRatio = (currentMinutes - slotMinutes) / 15; // 15 min por slot
  
  return basePosition + (minuteRatio * rowHeight);
} 