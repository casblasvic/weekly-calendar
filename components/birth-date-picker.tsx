"use client"
import { DatePickerButton } from "./date-picker-button"
import { Controller, type Control } from "react-hook-form"
import { X } from "lucide-react"

interface BirthDatePickerProps {
  control: Control<any>
  name: string
  defaultValue?: Date
  label?: string
}

export function BirthDatePicker({ control, name, defaultValue, label }: BirthDatePickerProps) {
  // Función que siempre devuelve true para permitir seleccionar cualquier día
  const allowAllDays = () => true

  return (
    <Controller
      control={control}
      name={name}
      defaultValue={defaultValue || null}
      render={({ field }) => (
        <div className="relative">
          {label && (
            <label htmlFor={name} className="block text-sm font-medium text-gray-700 mb-1">
              {label}
            </label>
          )}
          <div className="relative">
            <DatePickerButton
              currentDate={field.value}
              setCurrentDate={(date) => field.onChange(date)}
              isDayActive={allowAllDays}
              isFormField={true}
              calendarWidth={220}
              buttonClassName="text-sm pr-8" // Añadir padding a la derecha para el icono
            />
            {field.value && (
              <button
                type="button"
                onClick={() => field.onChange(null)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-gray-200 text-gray-500"
                aria-label="Borrar fecha"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      )}
    />
  )
}

