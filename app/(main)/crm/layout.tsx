'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Users, TrendingUp, Target, BarChart3, Settings } from 'lucide-react'

const crmNavItems = [
  {
    name: 'Leads',
    href: '/crm/leads',
    icon: Users,
    description: 'Gestión de prospectos'
  },
  {
    name: 'Oportunidades',
    href: '/crm/oportunidades',
    icon: TrendingUp,
    description: 'Pipeline de ventas'
  },
  {
    name: 'Campañas',
    href: '/crm/campanas',
    icon: Target,
    description: 'Marketing y campañas'
  },
  {
    name: 'Informes',
    href: '/crm/informes',
    icon: BarChart3,
    description: 'Análisis y métricas'
  },
  {
    name: 'Configuración',
    href: '/crm/configuracion',
    icon: Settings,
    description: 'Ajustes del CRM'
  }
]

export default function CRMLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <div className="flex h-full overflow-hidden">
      {/* Sidebar de navegación CRM */}
      <nav className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex-shrink-0">
        <div className="p-4 h-full overflow-y-auto">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">CRM</h2>
          <ul className="space-y-1">
            {crmNavItems.map((item) => {
              const isActive = pathname === item.href
              const Icon = item.icon
              
              return (
                <li key={item.name}>
                  <Link
                    href={item.href}
                    className={`
                      flex items-center gap-3 px-3 py-2 rounded-lg transition-colors
                      ${isActive 
                        ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400' 
                        : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
                      }
                    `}
                  >
                    <Icon className="h-5 w-5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">{item.name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{item.description}</p>
                    </div>
                  </Link>
                </li>
              )
            })}
          </ul>
        </div>
      </nav>

      {/* Contenido principal con mejor manejo de scroll */}
      <main className="flex-1 overflow-hidden">
        <div className="h-full overflow-y-auto">
          <div className="min-h-full">
            {children}
          </div>
        </div>
      </main>
    </div>
  )
}
