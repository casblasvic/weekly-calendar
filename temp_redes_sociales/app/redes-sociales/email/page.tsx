"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { 
  Mail, 
  Send, 
  Star, 
  StarOff, 
  Archive, 
  Trash2, 
  MoreVertical,
  Search,
  Plus,
  Inbox,
  Send as SendIcon,
  Clock,
  FileText,
  Tag,
  AlertCircle,
  CheckSquare,
  Square,
  ChevronDown,
  Filter,
  RefreshCw,
  MoreHorizontal,
  Reply,
  Forward,
  Printer,
  FileDown,
  AlertTriangle,
  ChevronLeft
} from "lucide-react"
import { emailService } from "@/app/services/email.service"
import { Email } from "@/app/types/email"
import { ComposeEmail } from "@/app/components/email/ComposeEmail"
import { toast } from "sonner"
import { EmailOptionsMenu } from "@/app/components/email/EmailOptionsMenu"

const folders = [
  { name: "Recibidos", icon: Inbox, count: 0 },
  { name: "Enviados", icon: SendIcon, count: 0 },
  { name: "Borradores", icon: FileText, count: 0 },
  { name: "Programados", icon: Clock, count: 0 },
  { name: "Spam", icon: AlertCircle, count: 0 },
  { name: "Papelera", icon: Trash2, count: 0 }
]

const labels = [
  { name: "Trabajo", color: "bg-blue-500" },
  { name: "Importante", color: "bg-red-500" },
  { name: "Inventario", color: "bg-green-500" },
  { name: "Personal", color: "bg-purple-500" }
]

export default function EmailPage() {
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedFolder, setSelectedFolder] = useState("Recibidos")
  const [isComposeOpen, setIsComposeOpen] = useState(false)
  const [emails, setEmails] = useState<Email[]>([])
  const [selectedEmails, setSelectedEmails] = useState<Set<string>>(new Set())

  useEffect(() => {
    loadEmails()
  }, [selectedFolder])

  const loadEmails = () => {
    const folderEmails = emailService.getEmails(selectedFolder)
    setEmails(folderEmails)
    
    // Actualizar contadores
    folders.forEach(folder => {
      folder.count = emailService.getEmails(folder.name).length
    })
  }

  const filteredEmails = searchQuery
    ? emailService.searchEmails(searchQuery)
    : emails

  const handleToggleRead = (id: string) => {
    emailService.toggleRead(id, selectedFolder)
    loadEmails()
  }

  const handleToggleStarred = (id: string) => {
    emailService.toggleStarred(id, selectedFolder)
    loadEmails()
  }

  const handleMoveToSpam = (id: string) => {
    emailService.moveToSpam(id, selectedFolder)
    loadEmails()
    toast.success("Correo movido a spam")
  }

  const handleMoveToTrash = (id: string) => {
    emailService.moveToTrash(id, selectedFolder)
    loadEmails()
    toast.success("Correo movido a papelera")
  }

  const handleDeletePermanently = (id: string) => {
    emailService.deletePermanently(id)
    loadEmails()
    toast.success("Correo eliminado permanentemente")
  }

  const handleEmptyTrash = () => {
    emailService.emptyTrash()
    loadEmails()
    toast.success("Papelera vaciada")
  }

  const handleRestoreFromTrash = (id: string) => {
    emailService.restoreFromTrash(id)
    loadEmails()
    toast.success("Correo restaurado")
  }

  const handleSendEmail = () => {
    loadEmails()
    toast.success("Correo enviado")
  }

  const handleSaveDraft = () => {
    loadEmails()
    toast.success("Borrador guardado")
  }

  const handleSelectEmail = (id: string) => {
    const newSelected = new Set(selectedEmails)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedEmails(newSelected)
  }

  const handleSelectAll = () => {
    if (selectedEmails.size === filteredEmails.length) {
      setSelectedEmails(new Set())
    } else {
      setSelectedEmails(new Set(filteredEmails.map(email => email.id)))
    }
  }

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      {/* Panel lateral izquierdo */}
      <div className="w-64 border-r bg-white">
        <div className="p-4">
          <Button 
            className="w-full bg-blue-600 hover:bg-blue-700"
            onClick={() => setIsComposeOpen(true)}
          >
            <Plus className="w-4 h-4 mr-2" />
            Redactar
          </Button>
        </div>
        
        <ScrollArea className="h-[calc(100vh-8rem)]">
          <div className="space-y-1 p-2">
            {folders.map(folder => (
              <Button
                key={folder.name}
                variant={selectedFolder === folder.name ? "secondary" : "ghost"}
                className="w-full justify-start"
                onClick={() => setSelectedFolder(folder.name)}
              >
                <folder.icon className="w-4 h-4 mr-2" />
                {folder.name}
                {folder.count > 0 && (
                  <span className="ml-auto bg-gray-200 rounded-full px-2 text-xs">
                    {folder.count}
                  </span>
                )}
              </Button>
            ))}
          </div>

          <Separator className="my-4" />

          <div className="px-4 py-2">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Etiquetas</span>
              <ChevronDown className="w-4 h-4" />
            </div>
            <div className="space-y-1">
              {labels.map(label => (
                <Button
                  key={label.name}
                  variant="ghost"
                  className="w-full justify-start"
                >
                  <div className={`w-3 h-3 rounded-full mr-2 ${label.color}`} />
                  {label.name}
                </Button>
              ))}
            </div>
          </div>
        </ScrollArea>

        <div className="p-4 border-t">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Almacenamiento</span>
            <span className="text-sm text-gray-500">75%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div className="bg-blue-600 h-2 rounded-full" style={{ width: "75%" }} />
          </div>
        </div>
      </div>

      {/* Panel principal */}
      <div className="flex-1 flex flex-col">
        {/* Barra de búsqueda y filtros */}
        <div className="p-4 border-b">
          <div className="flex items-center gap-2">
            <div className="flex-1 flex items-center bg-gray-100 rounded-full px-4 py-2">
              <Search className="w-4 h-4 text-gray-500 mr-2" />
              <Input
                placeholder="Buscar en correos..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="border-0 bg-transparent focus-visible:ring-0"
              />
            </div>
            <Button variant="ghost" size="icon">
              <Filter className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={loadEmails}>
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Lista de correos */}
        <ScrollArea className="flex-1">
          <div className="divide-y">
            {filteredEmails.map(email => (
              <div
                key={email.id}
                className={`flex items-center gap-4 p-4 hover:bg-gray-50 cursor-pointer ${
                  !email.isRead ? "bg-blue-50" : ""
                } ${selectedEmails.has(email.id) ? "bg-blue-100" : ""}`}
                onClick={() => setSelectedEmail(email)}
              >
                <div className="flex items-center gap-4">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleSelectEmail(email.id)
                    }}
                  >
                    {selectedEmails.has(email.id) ? (
                      <CheckSquare className="w-4 h-4" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleToggleStarred(email.id)
                    }}
                  >
                    {email.isStarred ? (
                      <Star className="w-4 h-4 text-yellow-500" />
                    ) : (
                      <StarOff className="w-4 h-4" />
                    )}
                  </Button>
                </div>

                <img
                  src={email.from.avatar}
                  alt={email.from.name}
                  className="w-8 h-8 rounded-full"
                />

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium truncate">{email.from.name}</span>
                    {email.isImportant && (
                      <AlertTriangle className="w-4 h-4 text-red-500" />
                    )}
                  </div>
                  <div className="text-sm text-gray-500 truncate">
                    {email.subject}
                  </div>
                  <div className="text-sm text-gray-500 truncate">
                    {email.preview}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="text-sm text-gray-500">{email.date}</div>
                  <EmailOptionsMenu
                    emailId={email.id}
                    isStarred={email.isStarred}
                    currentFolder={selectedFolder}
                    onToggleStarred={() => handleToggleStarred(email.id)}
                    onMoveToSpam={() => handleMoveToSpam(email.id)}
                    onMoveToTrash={() => handleMoveToTrash(email.id)}
                    onRestoreFromTrash={() => handleRestoreFromTrash(email.id)}
                    onDeletePermanently={() => handleDeletePermanently(email.id)}
                  />
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Panel de lectura */}
      {selectedEmail && (
        <div className="w-1/2 border-l bg-white relative">
          <Button
            variant="ghost"
            size="icon"
            className="absolute -left-10 top-4 z-10"
            onClick={() => setSelectedEmail(null)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          <div className="p-4 border-b">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">{selectedEmail.subject}</h2>
              <div className="flex items-center gap-2">
                <EmailOptionsMenu
                  emailId={selectedEmail.id}
                  isStarred={selectedEmail.isStarred}
                  currentFolder={selectedFolder}
                  onToggleStarred={() => handleToggleStarred(selectedEmail.id)}
                  onMoveToSpam={() => handleMoveToSpam(selectedEmail.id)}
                  onMoveToTrash={() => handleMoveToTrash(selectedEmail.id)}
                  onRestoreFromTrash={() => handleRestoreFromTrash(selectedEmail.id)}
                  onDeletePermanently={() => handleDeletePermanently(selectedEmail.id)}
                />
              </div>
            </div>

            <div className="flex items-center gap-4">
              <img
                src={selectedEmail.from.avatar}
                alt={selectedEmail.from.name}
                className="w-10 h-10 rounded-full"
              />
              <div>
                <div className="font-medium">{selectedEmail.from.name}</div>
                <div className="text-sm text-gray-500">{selectedEmail.from.email}</div>
              </div>
            </div>
          </div>

          <ScrollArea className="h-[calc(100vh-16rem)]">
            <div className="p-4">
              <div className="prose max-w-none">
                <p>{selectedEmail.content || selectedEmail.preview}</p>
                {selectedEmail.attachments && selectedEmail.attachments.length > 0 && (
                  <div className="mt-4">
                    <h3 className="text-sm font-medium mb-2">Archivos adjuntos:</h3>
                    <div className="space-y-2">
                      {selectedEmail.attachments.map((attachment, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <FileDown className="w-4 h-4" />
                          <a href={attachment.url} className="text-sm text-blue-600 hover:underline">
                            {attachment.name}
                          </a>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </ScrollArea>

          <div className="p-4 border-t">
            <div className="flex items-center gap-2">
              <Button 
                variant="outline"
                onClick={() => {
                  setIsComposeOpen(true)
                  setSelectedEmail(null)
                }}
              >
                <Reply className="w-4 h-4 mr-2" />
                Responder
              </Button>
              <Button variant="outline">
                <Forward className="w-4 h-4 mr-2" />
                Reenviar
              </Button>
              <Button variant="outline">
                <Printer className="w-4 h-4 mr-2" />
                Imprimir
              </Button>
              <Button variant="outline">
                <FileDown className="w-4 h-4 mr-2" />
                Descargar
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Diálogo de redacción */}
      <ComposeEmail
        isOpen={isComposeOpen}
        onClose={() => setIsComposeOpen(false)}
        onSend={handleSendEmail}
        onSaveDraft={handleSaveDraft}
        replyTo={selectedEmail || undefined}
      />

      {/* Botón de vaciar papelera */}
      {selectedFolder === "Papelera" && (
        <Button
          variant="destructive"
          className="fixed bottom-4 right-4"
          onClick={handleEmptyTrash}
        >
          <Trash2 className="w-4 h-4 mr-2" />
          Vaciar papelera
        </Button>
      )}
    </div>
  )
} 