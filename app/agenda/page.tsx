import { redirect } from 'next/navigation';
import { format } from 'date-fns';

// Esta página actuará solo como un punto de redirección
export default function AgendaBasePage() {
  // 1. Obtener la fecha actual
  const today = new Date();

  // 2. Formatear la fecha como YYYY-MM-DD
  const formattedDate = format(today, 'yyyy-MM-dd');

  // 3. Construir la URL de la vista semanal actual
  const targetUrl = `/agenda/semana/${formattedDate}`;

  // 4. Redirigir al usuario
  redirect(targetUrl);

  // Nota: El código después de redirect() no se ejecutará porque
  // redirect() lanza una excepción especial de Next.js.
  // Podrías retornar null si quieres ser explícito, pero no es estrictamente necesario.
  // return null;
}

