"use client"

import type React from "react"
import { useState, useCallback } from "react"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Search } from "lucide-react"

interface SearchableTableProps<T> {
  data: T[]
  columns: { key: keyof T; header: string }[]
  searchKeys: (keyof T)[]
}

export function SearchableTable<T>({ data, columns, searchKeys }: SearchableTableProps<T>) {
  const [searchTerm, setSearchTerm] = useState("")

  const handleSearch = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value)
  }, [])

  const filteredData = data.filter((item) =>
    searchKeys.some((key) => String(item[key]).toLowerCase().includes(searchTerm.toLowerCase())),
  )

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input placeholder="Buscador" className="pl-9" value={searchTerm} onChange={handleSearch} />
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((column) => (
                <TableHead key={String(column.key)}>{column.header}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredData.map((item, index) => (
              <TableRow key={index}>
                {columns.map((column) => (
                  <TableCell key={String(column.key)}>{String(item[column.key])}</TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

