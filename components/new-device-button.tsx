"use client"

import { useRouter } from "next/navigation"
import { Button, type ButtonProps } from "@/components/ui/button"
import { Plus } from "lucide-react"

interface NewDeviceButtonProps extends ButtonProps {
  clinicId: string
}

export function NewDeviceButton({ clinicId, ...props }: NewDeviceButtonProps) {
  const router = useRouter()

  const handleClick = () => {
    router.push(`/configuracion/clinicas/${clinicId}/equipamiento/new`)
  }

  return (
    <Button onClick={handleClick} {...props}>
      <Plus className="h-4 w-4 mr-2" />
      Nuevo dispositivo
    </Button>
  )
}

