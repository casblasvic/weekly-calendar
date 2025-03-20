"use client"

import { Button } from "@/components/ui/button"
import { Tooltip } from "@/components/ui/tooltip"
import { HelpCircle } from "lucide-react"

interface HelpButtonProps {
  content: React.ReactNode
}

export function HelpButton({ content, ...props }: HelpButtonProps) {
  return (
    <Tooltip content={content}>
      <Button variant="outline" size="icon" className="h-8 w-8" {...props}>
        <HelpCircle className="h-4 w-4" />
      </Button>
    </Tooltip>
  )
} 