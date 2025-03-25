"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Twitter, MessageCircle, Image, Clock, CheckCircle2 } from "lucide-react"

// Datos de ejemplo para Twitter
const mockDMs = [
  {
    id: 1,
    username: "juan_perez",
    avatar: "https://i.pravatar.cc/150?img=2",
    lastMessage: "¿Cuál es el horario de atención?",
    timestamp: "09:15 AM",
    status: "pending",
    messages: [
      {
        id: 1,
        content: "¿Cuál es el horario de atención?",
        timestamp: "09:15 AM",
        sender: "juan_perez"
      }
    ]
  },
  {
    id: 2,
    username: "maria_lopez",
    avatar: "https://i.pravatar.cc/150?img=4",
    lastMessage: "Gracias por la información",
    timestamp: "Ayer",
    status: "read",
    messages: [
      {
        id: 1,
        content: "Gracias por la información",
        timestamp: "Ayer",
        sender: "maria_lopez"
      }
    ]
  }
]

const mockPosts = [
  {
    id: 1,
    content: "Nuevo servicio disponible: Tratamiento facial",
    image: "https://picsum.photos/400/300",
    timestamp: "Hace 2 horas",
    status: "published",
    likes: 12,
    comments: 3
  },
  {
    id: 2,
    content: "¡Gran día en la clínica!",
    image: "https://picsum.photos/400/301",
    timestamp: "Hace 5 horas",
    status: "scheduled",
    scheduledTime: "Mañana 10:00 AM",
    likes: 0,
    comments: 0
  }
]

export default function TwitterPage() {
  const [selectedDM, setSelectedDM] = useState(mockDMs[0])
  const [newMessage, setNewMessage] = useState("")

  const handleSendMessage = () => {
    if (!newMessage.trim()) return

    const message = {
      id: Date.now(),
      content: newMessage,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      sender: "usuario"
    }

    setSelectedDM(prev => ({
      ...prev,
      messages: [...prev.messages, message],
      lastMessage: newMessage,
      timestamp: message.timestamp,
      status: "pending"
    }))

    setNewMessage("")
  }

  return (
    <div className="p-6">
      <div className="flex items-center gap-3 mb-6">
        <Twitter className="w-8 h-8 text-blue-400" />
        <h1 className="text-2xl font-semibold">Twitter</h1>
      </div>

      <Tabs defaultValue="dms" className="space-y-4">
        <TabsList>
          <TabsTrigger value="dms">Mensajes Directos</TabsTrigger>
          <TabsTrigger value="posts">Publicaciones</TabsTrigger>
        </TabsList>

        <TabsContent value="dms" className="space-y-4">
          <div className="grid grid-cols-12 gap-4 h-[calc(100vh-200px)]">
            {/* Lista de DMs */}
            <Card className="col-span-4 p-4">
              <div className="space-y-2">
                {mockDMs.map((dm) => (
                  <div
                    key={dm.id}
                    className={`p-3 rounded-lg cursor-pointer hover:bg-gray-50 ${
                      selectedDM?.id === dm.id ? "bg-blue-50" : ""
                    }`}
                    onClick={() => setSelectedDM(dm)}
                  >
                    <div className="flex items-center gap-3">
                      <img
                        src={dm.avatar}
                        alt={dm.username}
                        className="w-10 h-10 rounded-full"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="font-medium truncate">{dm.username}</span>
                          <span className="text-xs text-gray-500">{dm.timestamp}</span>
                        </div>
                        <p className="text-sm text-gray-600 truncate">{dm.lastMessage}</p>
                        {dm.status === "pending" && (
                          <Badge variant="secondary" className="mt-1">
                            Nuevo
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Chat */}
            <Card className="col-span-8 p-4 flex flex-col">
              <div className="flex items-center gap-3 mb-4">
                <img
                  src={selectedDM.avatar}
                  alt={selectedDM.username}
                  className="w-10 h-10 rounded-full"
                />
                <div>
                  <h3 className="font-medium">{selectedDM.username}</h3>
                  <p className="text-sm text-gray-500">
                    {selectedDM.status === "read" ? "Leído" : "No leído"}
                  </p>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto space-y-4 mb-4">
                {selectedDM.messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${
                      message.sender === "usuario" ? "justify-end" : "justify-start"
                    }`}
                  >
                    <div
                      className={`max-w-[70%] rounded-lg p-3 ${
                        message.sender === "usuario"
                          ? "bg-blue-500 text-white"
                          : "bg-gray-100"
                      }`}
                    >
                      <p>{message.content}</p>
                      <span className="text-xs mt-1 block opacity-70">
                        {message.timestamp}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Escribe un mensaje..."
                  className="flex-1 rounded-lg border p-2"
                  onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
                />
                <Button onClick={handleSendMessage}>Enviar</Button>
              </div>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="posts" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {mockPosts.map((post) => (
              <Card key={post.id} className="p-4">
                <div className="space-y-4">
                  <img
                    src={post.image}
                    alt="Post"
                    className="w-full h-48 object-cover rounded-lg"
                  />
                  <div>
                    <p className="text-sm text-gray-600">{post.content}</p>
                    <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                      <span>{post.timestamp}</span>
                      {post.status === "scheduled" && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {post.scheduledTime}
                        </span>
                      )}
                      {post.status === "published" && (
                        <span className="flex items-center gap-1">
                          <CheckCircle2 className="w-4 h-4" />
                          Publicado
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 mt-2">
                      <span className="text-sm text-gray-500">
                        {post.likes} Me gusta
                      </span>
                      <span className="text-sm text-gray-500">
                        {post.comments} Comentarios
                      </span>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
} 