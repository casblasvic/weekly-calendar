import ResponsiveAgendaView from "@/components/responsive-agenda-view"

export default async function DailyAgendaPage({ params }: { params: { date: string } }) {
  // En Next.js 14, el objeto params completo debe ser esperado primero
  const resolvedParams = await params;
  
  // Ahora podemos acceder a date de manera segura
  const date = resolvedParams.date || "";
  
  return <ResponsiveAgendaView date={date} initialView="day" />
}

