"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  onSearch?: (searchTerm: string) => void
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, onChange, onSearch, value, defaultValue, ...props }, ref) => {
    // Determinar si es un input controlado o no controlado
    const isControlled = value !== undefined;
    
    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      if (onChange) {
        onChange(event)
      }
      if (onSearch) {
        onSearch(event.target.value)
      }
    }

    // Usar solo value o defaultValue según corresponda
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:border-purple-600 focus-visible:ring-1 focus-visible:ring-purple-600 disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        onChange={handleChange}
        ref={ref}
        {...(isControlled ? { value } : { defaultValue })}
        {...props}
      />
    )
  },
)
Input.displayName = "Input"

export { Input }

