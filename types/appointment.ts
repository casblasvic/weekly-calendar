export interface Appointment {
  id: string;
  name: string; // Nombre del cliente
  service: string; // Nombre(s) del servicio(s)
  date: Date; // Fecha de la cita
  roomId: string; // ID de la cabina/sala
  startTime: string; // Hora de inicio formato "HH:MM"
  duration: number; // Duración en número de slots o minutos (a definir consistencia)
  color: string; // Color para mostrar en la agenda (probablemente de la cabina)
  completed?: boolean; // Opcional: si la cita está completada
  phone?: string; // Opcional: teléfono del cliente
  tags?: string[]; // Opcional: etiquetas/tags
  // Podrían añadirse más campos si son necesarios para la UI
  personId?: string; // ID de la persona
  serviceIds?: string[]; // IDs de los servicios
} 