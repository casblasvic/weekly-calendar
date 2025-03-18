import { NewMobileAgenda } from "@/components/mobile/agenda/new-agenda"

// Datos de ejemplo para pruebas
const exampleCabins = [
  { id: 1, code: "A1", color: "#ff0000", isActive: true, order: 1, name: "Cabina A1" },
  { id: 2, code: "B2", color: "#00ff00", isActive: true, order: 2, name: "Cabina B2" },
  { id: 3, code: "C3", color: "#0000ff", isActive: true, order: 3, name: "Cabina C3" },
]

const exampleTimeSlots = ["08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00"]

export default function MobilePage() {
  return (
    <div className="h-screen">
      <NewMobileAgenda cabins={exampleCabins} timeSlots={exampleTimeSlots} />
    </div>
  )
}

