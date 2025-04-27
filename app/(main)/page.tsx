"use client"

import { Button } from "@/components/ui/button"
import Link from "next/link"

export default function HomePage() {
  return (
    <div className="container mx-auto py-12 px-4">
      <header className="mb-12 text-center">
        <h1 className="text-3xl font-bold mb-4">Sistema de Gestión de Clínicas</h1>
        <p className="text-gray-600 max-w-2xl mx-auto">
          Bienvenido al sistema de gestión. Seleccione una de las opciones a continuación para comenzar.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
        <Card
          title="Gestión de Tarifas"
          description="Administre tarifas, familias y servicios"
          icon="📊"
          href="/configuracion/tarifas"
        />
        <Card
          title="Servicios Tarifa General 2024"
          description="Ver servicios de la tarifa principal"
          icon="💼"
          href="/configuracion/tarifas/servicios/tarifa-1"
        />
        <Card
          title="Gestión de Familias"
          description="Administrar familias (acceder desde una tarifa)"
          icon="🗂️"
          href="/configuracion/tarifas"
        />
        {/* Puedes añadir más tarjetas según necesites */}
      </div>
    </div>
  )
}

function Card({ title, description, icon, href }: { title: string; description: string; icon: string; href: string }) {
  return (
    <div className="border rounded-lg p-6 hover:shadow-lg transition-shadow bg-white">
      <div className="text-4xl mb-4">{icon}</div>
      <h2 className="text-xl font-semibold mb-2">{title}</h2>
      <p className="text-gray-600 mb-4">{description}</p>
      <Link href={href}>
        <Button className="w-full">Acceder</Button>
      </Link>
    </div>
  )
}

