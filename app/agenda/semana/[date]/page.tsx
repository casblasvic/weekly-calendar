import AgendaContainer from "@/components/agenda-container"

export default function WeeklyAgendaPage({ params }: { params: { date: string } }) {
  return <AgendaContainer initialDate={params.date} initialView="week" />
}

