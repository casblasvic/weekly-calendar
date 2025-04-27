"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Search } from "lucide-react"
import { Card } from "@/components/ui/card"
import { IconButton } from "@/components/ui/icon-button"
import { BackButton } from "@/components/ui/button"

interface ConsentForm {
  id: string
  name: string
}

export default function ConsentimientosPage() {
  const [searchTerm, setSearchTerm] = useState("")

  const consentForms: ConsentForm[] = [
    {
      id: "1",
      name: "Condiciones generales y Política de privacidad",
    },
    {
      id: "2",
      name: "Envío de comunicaciones comerciales",
    },
    {
      id: "3",
      name: "Formulario médico",
    },
  ]

  const filteredForms = consentForms.filter((form) => form.name.toLowerCase().includes(searchTerm.toLowerCase()))

  return (
    <div className="space-y-6">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
        <Input
          placeholder="Buscador"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Consent Forms Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[200px] font-medium">Nombre</TableHead>
              <TableHead className="w-[100px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredForms.map((form) => (
              <TableRow key={form.id}>
                <TableCell className="font-medium">{form.name}</TableCell>
                <TableCell className="text-right">
                  <IconButton icon={<Search className="h-4 w-4" />} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {/* Fixed buttons */}
      <div className="fixed bottom-4 right-4 flex items-center gap-2">
        <BackButton>Volver</BackButton>
        <Button className="rounded-full bg-black text-white hover:bg-gray-800">Ayuda</Button>
      </div>
    </div>
  )
}

