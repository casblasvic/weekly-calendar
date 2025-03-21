"use client"

import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { useRouter } from "next/navigation"
import { ArrowLeft } from "lucide-react"

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "btn-primary",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        secondary: "btn-secondary",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, children, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props}>
        {children}
      </Comp>
    )
  },
)
Button.displayName = "Button"

interface BackButtonProps extends ButtonProps {
  href?: string,
  showIcon?: boolean
}

const BackButton = React.forwardRef<HTMLButtonElement, BackButtonProps>(
  ({ className, variant = "outline", size, asChild = false, children, href, showIcon = true, ...props }, ref) => {
    const router = useRouter()
    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      e.preventDefault()
      if (href) {
        router.push(href)
      } else {
        router.back()
      }
    }

    return (
      <Button 
        className={cn("btn-back", buttonVariants({ variant, size, className }))} 
        ref={ref} 
        onClick={handleClick} 
        {...props}
      >
        {showIcon && <ArrowLeft className="h-4 w-4 mr-2" />}
        {children}
      </Button>
    )
  },
)
BackButton.displayName = "BackButton"

export { Button, buttonVariants, BackButton }

