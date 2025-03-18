import AgendaContainer from "@/components/agenda-container"

export default function DailyAgendaPage({ params }: { params: { date: string } }) {
  return <AgendaContainer initialDate={params.date} initialView="day" />
}

