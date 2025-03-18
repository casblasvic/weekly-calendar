"use client"

import { addMonths } from "date-fns"
import { MobileDatePicker } from "./mobile-date-picker"
import { MobileBottomSheet } from "@/components/mobile-bottom-sheet"
import { useState } from "react"

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
  const [viewDate, setViewDate] = useState(selectedDate || new Date())

  const handleDateSelect = (date: Date) => {
    onDateSelect(date)
    onClose()
  }

  const handlePrevMonth = () => {
    setViewDate((prevDate) => addMonths(prevDate, -1))
  }

  const handleNextMonth = () => {
    setViewDate((prevDate) => addMonths(prevDate, 1))
  }

  return (
    <MobileBottomSheet isOpen={isOpen} onClose={onClose} title={title} height="auto" showClose={true}>
      <MobileDatePicker
        selectedDate={selectedDate}
        onDateSelect={handleDateSelect}
        onPrevMonth={handlePrevMonth}
        onNextMonth={handleNextMonth}
      />
    </MobileBottomSheet>
  )
}

