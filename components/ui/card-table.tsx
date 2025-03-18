import type React from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

interface Column {
  header: string
  accessorKey: string
  cell?: (info: any) => React.ReactNode
}

interface CardTableProps {
  columns: Column[]
  data: any[]
}

export function CardTable({ columns, data }: CardTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          {columns.map((column, index) => (
            <TableHead key={index}>{column.header}</TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((row, rowIndex) => (
          <TableRow key={rowIndex}>
            {columns.map((column, columnIndex) => (
              <TableCell key={columnIndex}>{column.cell ? column.cell({ row }) : row[column.accessorKey]}</TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

