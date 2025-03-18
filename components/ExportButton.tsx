"use client"

import { Button } from "@/components/ui/button"
import { FileDown } from "lucide-react"

interface ExportButtonProps {
  data: any[]
  filename: string
}

export function ExportButton({ data, filename }: ExportButtonProps) {
  const exportToCSV = () => {
    const headers = Object.keys(data[0]).join(",")
    const csv = [headers, ...data.map((row) => Object.values(row).join(","))].join("\n")

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob)
      link.setAttribute("href", url)
      link.setAttribute("download", `${filename}.csv`)
      link.style.visibility = "hidden"
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }
  }

  return (
    <Button
      onClick={exportToCSV}
      variant="outline"
      className="gap-2 text-purple-600 border-purple-200 hover:bg-purple-50"
    >
      <FileDown className="h-4 w-4" />
      Exportar CSV
    </Button>
  )
}

