import * as React from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: React.ReactNode
}

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(({ className, icon, ...props }, ref) => {
  return (
    <Button
      variant="outline"
      size="icon"
      className={cn("bg-purple-600 text-white hover:bg-purple-700 hover:text-white", className)}
      ref={ref}
      {...props}
    >
      {icon}
    </Button>
  )
})
IconButton.displayName = "IconButton"

