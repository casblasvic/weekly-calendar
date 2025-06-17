"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { PlusCircle, ArrowLeft, Tag, Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table"
import { useAppointmentTags } from "@/contexts/appointment-tags-context"

export default function AppointmentTagsPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const router = useRouter()
  const { tags, loading, error, deleteTag, fetchTags } = useAppointmentTags()
  const [isDeleting, setIsDeleting] = useState<string | null>(null)

  // Ya no necesitamos forzar recarga porque el contexto ya carga automáticamente
  // y usa caché cuando está disponible

  // Filtrar etiquetas por búsqueda
  const filteredTags = tags.filter(tag => 
    tag.isActive && (
      searchQuery === "" ||
      tag.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tag.id.toLowerCase().includes(searchQuery.toLowerCase())
    )
  )

  const handleDelete = async (tag: typeof tags[0]) => {
    if (!confirm(`¿Estás seguro de que quieres eliminar la etiqueta "${tag.name}"?`)) {
      return
    }
    
    setIsDeleting(tag.id)
    const success = await deleteTag(tag.id)
    if (!success) {
      alert('Error al eliminar la etiqueta')
    }
    setIsDeleting(null)
  }

  return (
    <div className="container mx-auto p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Tag className="h-6 w-6" />
          Etiquetas para Citas
        </h1>
        <Link href="/configuracion/catalogos">
          <Button variant="outline" size="sm" className="gap-1">
            <ArrowLeft className="h-4 w-4" />
            Volver
          </Button>
        </Link>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-md">
          {error}
        </div>
      )}

      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Input
            placeholder="Buscar etiquetas..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[120px]">ID</TableHead>
              <TableHead>Nombre</TableHead>
              <TableHead>Descripción</TableHead>
              <TableHead className="w-[120px]">Color</TableHead>
              <TableHead className="text-right w-[100px]">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && tags.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                  <p className="mt-2 text-muted-foreground">Cargando etiquetas...</p>
                </TableCell>
              </TableRow>
            ) : filteredTags.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8">
                  {searchQuery ? "No se encontraron etiquetas" : "No hay etiquetas creadas"}
                </TableCell>
              </TableRow>
            ) : (
              filteredTags.map((tag) => (
                <TableRow key={tag.id}>
                  <TableCell className="font-mono text-xs">{tag.id.slice(0, 8)}</TableCell>
                  <TableCell>{tag.name}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {tag.description || '-'}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-6 h-6 rounded-full border" 
                        style={{ backgroundColor: tag.color }}
                      />
                      <span className="text-sm font-mono">{tag.color}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => router.push(`/configuracion/catalogos/etiquetas/${tag.id}`)}
                        disabled={isDeleting === tag.id}
                      >
                        <svg 
                          xmlns="http://www.w3.org/2000/svg" 
                          width="16" 
                          height="16" 
                          viewBox="0 0 24 24" 
                          fill="none" 
                          stroke="currentColor" 
                          strokeWidth="2" 
                          strokeLinecap="round" 
                          strokeLinejoin="round"
                        >
                          <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(tag)}
                        disabled={isDeleting === tag.id}
                      >
                        {isDeleting === tag.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <svg 
                            xmlns="http://www.w3.org/2000/svg" 
                            width="16" 
                            height="16" 
                            viewBox="0 0 24 24" 
                            fill="none" 
                            stroke="#EF4444" 
                            strokeWidth="2" 
                            strokeLinecap="round" 
                            strokeLinejoin="round"
                          >
                            <path d="M3 6h18" />
                            <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                            <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                            <line x1="10" x2="10" y1="11" y2="17" />
                            <line x1="14" x2="14" y1="11" y2="17" />
                          </svg>
                        )}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="fixed bottom-6 right-6 flex gap-2">
        <Button 
          onClick={() => router.push('/configuracion/catalogos')}
          variant="outline"
          className="shadow-md"
        >
          Cancelar
        </Button>
        <Button
          onClick={() => router.push('/configuracion/catalogos/etiquetas/nueva')}
          className="bg-purple-600 hover:bg-purple-700 shadow-md gap-1"
        >
          <PlusCircle className="h-4 w-4" />
          Nueva Etiqueta
        </Button>
      </div>
    </div>
  )
}
