"use client"

import { useState, useCallback } from "react"
import { Button, BackButton } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useDropzone } from "react-dropzone"
import { CustomDatePicker } from "@/components/custom-date-picker"

interface FileWithPreview extends File {
  preview?: string
}

export default function FotografiasPage() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [selectedService, setSelectedService] = useState("")
  const [comments, setComments] = useState("")
  const [files, setFiles] = useState<FileWithPreview[]>([])

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setFiles(
      acceptedFiles.map((file) =>
        Object.assign(file, {
          preview: URL.createObjectURL(file),
        }),
      ),
    )
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/*": [".jpeg", ".jpg", ".png"],
    },
    maxSize: 50 * 1024 * 1024, // 50MB
    multiple: true,
  })

  const handleSubmit = () => {
    // Handle form submission
    console.log({
      service: selectedService,
      date: selectedDate,
      comments,
      files,
    })
  }

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <form className="space-y-6">
          {/* Service Selection */}
          <div className="space-y-2">
            <Label htmlFor="service">Servicio</Label>
            <Select value={selectedService} onValueChange={setSelectedService}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar servicio" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cavitation">Cavitation</SelectItem>
                <SelectItem value="massage">Massage</SelectItem>
                <SelectItem value="facial">Facial</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Date Selection */}
          <div className="space-y-2">
            <Label htmlFor="date">Fecha</Label>
            <div className="relative">
              <CustomDatePicker
                value={selectedDate}
                onChange={(date) => setSelectedDate(date || new Date())}
                onBlur={() => {}}
                name="date"
              />
            </div>
          </div>

          {/* Comments */}
          <div className="space-y-2">
            <Label htmlFor="comments">Comentarios</Label>
            <Textarea
              id="comments"
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              className="min-h-[100px] resize-none"
            />
          </div>

          {/* File Upload Zone */}
          <div className="space-y-2">
            <Label>Fotografías</Label>
            <div
              {...getRootProps()}
              className={`
                border-2 border-dashed rounded-lg p-8
                transition-colors duration-200 ease-in-out
                text-center cursor-pointer
                ${isDragActive ? "border-purple-400 bg-purple-50" : "border-gray-300 hover:border-purple-400"}
              `}
            >
              <input {...getInputProps()} />
              <div className="space-y-2">
                <div className="flex justify-center">
                  <div className="rounded-full bg-purple-100 p-2">
                    <svg className="h-6 w-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                  </div>
                </div>
                <div className="text-sm text-gray-600">
                  {isDragActive ? (
                    <p>Suelta los archivos aquí...</p>
                  ) : (
                    <p>Haz click para seleccionar un archivo o arrastra y suéltalo aquí</p>
                  )}
                </div>
                <p className="text-xs text-gray-500">Tamaño de archivo máximo: 50 MB</p>
              </div>
            </div>
          </div>

          {/* Preview Area */}
          {files.length > 0 && (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
              {files.map((file) => (
                <div key={file.name} className="relative aspect-square">
                  <img
                    src={file.preview || "/placeholder.svg"}
                    alt={file.name}
                    className="h-full w-full rounded-lg object-cover"
                    onLoad={() => {
                      URL.revokeObjectURL(file.preview || "")
                    }}
                  />
                </div>
              ))}
            </div>
          )}
        </form>
      </Card>

      {/* Action Buttons */}
      <div className="fixed bottom-4 right-4 flex items-center gap-2">
        <BackButton>Volver</BackButton>
        <Button className="bg-purple-600 hover:bg-purple-700" onClick={handleSubmit}>
          Guardar
        </Button>
        <Button className="rounded-full bg-black text-white hover:bg-gray-800">Ayuda</Button>
      </div>
    </div>
  )
}

