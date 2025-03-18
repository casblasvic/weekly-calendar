"use client"
import { MobileDatePicker } from "@/components/mobile/common/date-picker"
import { MobileBottomSheet } from "@/components/mobile/layout/bottom-sheet"

interface MobileDatePickerSheetProps {
  isOpen: boolean
  onClose: () => void
  selectedDate: Date | null
  onDateSelect: (date: Date) => void
  title?: string
}

export function MobileDatePickerSheet({
  isOpen,
  onClose,
  selectedDate,
  onDateSelect,
  title = "Seleccionar fecha",
}: MobileDatePickerSheetProps) {
  return (
    <MobileBottomSheet isOpen={isOpen} onClose={onClose} title={title} height="auto" showClose={true}>
      <MobileDatePicker selectedDate={selectedDate} onDateSelect={onDateSelect} onClose={onClose} />
    </MobileBottomSheet>
  )
}

