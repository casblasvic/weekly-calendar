"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { MessageCircle, Phone, Clock, CheckCircle2, Search } from "lucide-react"

// Datos de ejemplo para WhatsApp
const mockChats = [
  {
    id: 1,
    name: "María García",
    phone: "+34 612 345 678",
    avatar: "https://i.pravatar.cc/150?img=7",
    lastMessage: "¿Tienen cita disponible para mañana?",
    timestamp: "10:30 AM",
    status: "pending",
    unread: 2,
    messages: [
      { id: 1, sender: "María García", text: "Hola, me gustaría agendar una cita", time: "10:25 AM", status: "read" },
      { id: 2, sender: "system", text: "¿Qué horario prefieres?", time: "10:28 AM", status: "sent" },
      { id: 3, sender: "María García", text: "¿Tienen cita disponible para mañana?", time: "10:30 AM", status: "unread" }
    ]
  },
  {
    id: 2,
    name: "Juan Pérez",
    phone: "+34 678 901 234",
    avatar: "https://i.pravatar.cc/150?img=8",
    lastMessage: "¡Gracias por la atención!",
    timestamp: "Ayer",
    status: "responded",
    unread: 0,
    messages: [
      { id: 1, sender: "Juan Pérez", text: "¡Gracias por la atención!", time: "Ayer", status: "read" }
    ]
  },
  {
    id: 3,
    name: "Ana Martínez",
    phone: "+34 645 678 901",
    avatar: "https://i.pravatar.cc/150?img=9",
    lastMessage: "¿Cuánto cuesta el tratamiento?",
    timestamp: "Ayer",
    status: "pending",
    unread: 1,
    messages: [
      { id: 1, sender: "Ana Martínez", text: "¿Cuánto cuesta el tratamiento?", time: "Ayer", status: "unread" }
    ]
  }
]

export default function WhatsAppPage() {
  const [selectedChat, setSelectedChat] = useState(mockChats[0])
  const [newMessage, setNewMessage] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [messages, setMessages] = useState(selectedChat?.messages || [])
  const [isTyping, setIsTyping] = useState(false)
  const [lastSeen, setLastSeen] = useState("")

  const filteredChats = mockChats.filter(chat => 
    chat.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    chat.phone.includes(searchQuery)
  )

  const handleSendMessage = () => {
    if (!newMessage.trim()) return

    const newMsg = {
      id: messages.length + 1,
      sender: "system",
      text: newMessage,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: "sent"
    }

    setMessages([...messages, newMsg])
    setNewMessage("")

    // Simular que el usuario está escribiendo
    setIsTyping(true)
    setLastSeen("escribiendo...")

    // Simular respuesta del usuario después de 2-5 segundos
    const randomDelay = Math.floor(Math.random() * 3000) + 2000
    setTimeout(() => {
      setIsTyping(false)
      setLastSeen(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }))
      
      const userResponse = {
        id: messages.length + 2,
        sender: selectedChat.name,
        text: "Gracias por tu mensaje. Te responderé pronto.",
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        status: "unread"
      }
      setMessages(prev => [...prev, userResponse])
    }, randomDelay)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const handleChatSelect = (chat: typeof mockChats[0]) => {
    setSelectedChat(chat)
    setMessages(chat.messages)
    setLastSeen("")
  }

  return (
    <div className="p-6">
      <div className="flex items-center gap-3 mb-6">
        <Phone className="w-8 h-8 text-green-600" />
        <h1 className="text-2xl font-semibold">WhatsApp Business</h1>
      </div>

      <div className="grid grid-cols-12 gap-4 h-[calc(100vh-200px)]">
        {/* Lista de chats */}
        <Card className="col-span-4 p-4">
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Buscar chat..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
          </div>

          <div className="space-y-2">
            {filteredChats.map((chat) => (
              <div
                key={chat.id}
                className={`p-3 rounded-lg cursor-pointer hover:bg-gray-50 ${
                  selectedChat?.id === chat.id ? "bg-green-50" : ""
                }`}
                onClick={() => handleChatSelect(chat)}
              >
                <div className="flex items-center gap-3">
                  <img src={chat.avatar} alt={chat.name} className="w-10 h-10 rounded-full" />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{chat.name}</span>
                      <span className="text-sm text-gray-500">{chat.timestamp}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600 truncate">{chat.lastMessage}</span>
                      {chat.unread > 0 && (
                        <Badge variant="destructive" className="ml-auto">
                          {chat.unread}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Ventana de chat */}
        <Card className="col-span-8 p-4">
          {selectedChat ? (
            <>
              <div className="flex items-center gap-3 mb-4">
                <img src={selectedChat.avatar} alt={selectedChat.name} className="w-10 h-10 rounded-full" />
                <div>
                  <h3 className="font-medium">{selectedChat.name}</h3>
                  <span className="text-sm text-gray-500">
                    {isTyping ? "escribiendo..." : lastSeen ? `última vez ${lastSeen}` : selectedChat.phone}
                  </span>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto space-y-4 mb-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.sender === "system" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[70%] rounded-lg p-3 ${
                        message.sender === "system"
                          ? "bg-green-100 text-green-900"
                          : "bg-gray-100"
                      }`}
                    >
                      <p>{message.text}</p>
                      <div className="flex items-center gap-1 mt-1">
                        <span className="text-xs text-gray-500">{message.time}</span>
                        {message.sender === "system" && (
                          <span className="text-xs text-gray-500">
                            {message.status === "read" ? "✓✓" : message.status === "sent" ? "✓" : ""}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Escribe un mensaje..."
                  className="flex-1 rounded-lg border p-2"
                />
                <Button onClick={handleSendMessage} className="bg-green-600 hover:bg-green-700">
                  Enviar
                </Button>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500">
              Selecciona un chat
            </div>
          )}
        </Card>
      </div>
    </div>
  )
} 