"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, Calendar, Users, BarChart3 } from "lucide-react"
import { cn } from "@/lib/utils"

export function MobileNavigation() {
  const pathname = usePathname()

  const items = [
    {
      href: "/",
      label: "Inicio",
      icon: Home,
    },
    {
      href: "/agenda",
      label: "Agenda",
      icon: Calendar,
    },
    {
      href: "/clientes",
      label: "Clientes",
      icon: Users,
    },
    {
      href: "/estadisticas",
      label: "Estadísticas",
      icon: BarChart3,
    },
  ]

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 h-16 bg-white border-t md:hidden">
      <nav className="h-full">
        <ul className="h-full grid grid-cols-4 items-center">
          {items.map((item) => (
            <li key={item.href} className="h-full">
              <Link
                href={item.href}
                className={cn(
                  "flex h-full flex-col items-center justify-center gap-1",
                  pathname === item.href ? "text-purple-600" : "text-gray-500 hover:text-purple-600",
                )}
              >
                <item.icon className="h-5 w-5" />
                <span className="text-xs">{item.label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  )
}

