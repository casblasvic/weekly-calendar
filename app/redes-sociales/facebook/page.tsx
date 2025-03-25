"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Facebook, MessageCircle, Clock, CheckCircle2 } from "lucide-react"

// Datos de ejemplo para Facebook
const mockDMs = [
  {
    id: 1,
    username: "Ana Martínez",
    avatar: "https://i.pravatar.cc/150?img=3",
    lastMessage: "¿Podrías darme más información sobre los tratamientos?",
    timestamp: "11:30 AM",
    status: "pending",
    messages: [
      { id: 1, sender: "Ana Martínez", text: "Hola, vi vuestra página en Facebook", time: "11:25 AM" },
      { id: 2, sender: "system", text: "¿Podrías darme más información sobre los tratamientos?", time: "11:30 AM" }
    ]
  },
  {
    id: 2,
    username: "Carlos Ruiz",
    avatar: "https://i.pravatar.cc/150?img=4",
    lastMessage: "¡Perfecto, nos vemos mañana!",
    timestamp: "Ayer",
    status: "responded",
    messages: [
      { id: 1, sender: "Carlos Ruiz", text: "¡Perfecto, nos vemos mañana!", time: "Ayer" }
    ]
  }
]

const mockPosts = [
  {
    id: 1,
    title: "¡Nuevo servicio de masajes terapéuticos!",
    image: "https://picsum.photos/400/302",
    likes: 78,
    comments: 12,
    pendingComments: 4,
    timestamp: "3h",
    comments: [
      { id: 1, username: "María García", text: "¿Cuánto cuesta la sesión?", time: "2h" },
      { id: 2, username: "Pedro López", text: "¿Tienen descuentos para parejas?", time: "1h" }
    ]
  },
  {
    id: 2,
    title: "Consejos para el cuidado de la piel",
    image: "https://picsum.photos/400/303",
    likes: 45,
    comments: 8,
    pendingComments: 2,
    timestamp: "6h",
    comments: [
      { id: 1, username: "Laura Torres", text: "¿Qué productos recomiendan?", time: "5h" }
    ]
  }
]

export default function FacebookPage() {
  const [selectedDM, setSelectedDM] = useState(mockDMs[0])
  const [selectedPost, setSelectedPost] = useState(mockPosts[0])
  const [newMessage, setNewMessage] = useState("")

  return (
    <div className="p-6">
      <div className="flex items-center gap-3 mb-6">
        <Facebook className="w-8 h-8 text-blue-600" />
        <h1 className="text-2xl font-semibold">Facebook</h1>
      </div>

      <Tabs defaultValue="dms" className="space-y-4">
        <TabsList>
          <TabsTrigger value="dms">Mensajes</TabsTrigger>
          <TabsTrigger value="posts">Publicaciones</TabsTrigger>
        </TabsList>

        <TabsContent value="dms" className="space-y-4">
          <div className="grid grid-cols-12 gap-4 h-[calc(100vh-200px)]">
            {/* Lista de mensajes */}
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
                      <img src={dm.avatar} alt={dm.username} className="w-10 h-10 rounded-full" />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{dm.username}</span>
                          <span className="text-sm text-gray-500">{dm.timestamp}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-600 truncate">{dm.lastMessage}</span>
                          {dm.status === "pending" ? (
                            <Badge variant="destructive" className="ml-auto">Pendiente</Badge>
                          ) : (
                            <CheckCircle2 className="w-4 h-4 text-green-500 ml-auto" />
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Ventana de chat */}
            <Card className="col-span-8 p-4 flex flex-col">
              {selectedDM ? (
                <>
                  <div className="flex items-center gap-3 mb-4">
                    <img src={selectedDM.avatar} alt={selectedDM.username} className="w-10 h-10 rounded-full" />
                    <div>
                      <h3 className="font-medium">{selectedDM.username}</h3>
                      <span className="text-sm text-gray-500">{selectedDM.status === "pending" ? "Pendiente" : "Respondido"}</span>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto space-y-4 mb-4">
                    {selectedDM.messages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex ${message.sender === "system" ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[70%] rounded-lg p-3 ${
                            message.sender === "system"
                              ? "bg-blue-100 text-blue-900"
                              : "bg-gray-100"
                          }`}
                        >
                          <p>{message.text}</p>
                          <span className="text-xs text-gray-500 mt-1 block">{message.time}</span>
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
                    />
                    <Button>Enviar</Button>
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500">
                  Selecciona una conversación
                </div>
              )}
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="posts" className="space-y-4">
          <div className="grid grid-cols-12 gap-4 h-[calc(100vh-200px)]">
            {/* Lista de publicaciones */}
            <Card className="col-span-4 p-4">
              <div className="space-y-2">
                {mockPosts.map((post) => (
                  <div
                    key={post.id}
                    className={`p-3 rounded-lg cursor-pointer hover:bg-gray-50 ${
                      selectedPost?.id === post.id ? "bg-blue-50" : ""
                    }`}
                    onClick={() => setSelectedPost(post)}
                  >
                    <div className="flex items-center gap-3">
                      <img src={post.image} alt={post.title} className="w-16 h-16 rounded-lg object-cover" />
                      <div className="flex-1">
                        <h3 className="font-medium">{post.title}</h3>
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <span>{post.likes} me gusta</span>
                          <span>•</span>
                          <span>{post.comments} comentarios</span>
                          {post.pendingComments > 0 && (
                            <Badge variant="destructive" className="ml-auto">
                              {post.pendingComments} pendientes
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Detalle de la publicación */}
            <Card className="col-span-8 p-4 flex flex-col">
              {selectedPost ? (
                <>
                  <div className="mb-4">
                    <img src={selectedPost.image} alt={selectedPost.title} className="w-full rounded-lg mb-4" />
                    <h3 className="text-xl font-medium mb-2">{selectedPost.title}</h3>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <span>{post.likes} me gusta</span>
                      <span>•</span>
                      <span>{selectedPost.comments} comentarios</span>
                      <span>•</span>
                      <span>Hace {selectedPost.timestamp}</span>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto space-y-4 mb-4">
                    {selectedPost.comments.map((comment) => (
                      <div key={comment.id} className="flex gap-3">
                        <div className="flex-1 bg-gray-50 rounded-lg p-3">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium">{comment.username}</span>
                            <span className="text-sm text-gray-500">{comment.time}</span>
                          </div>
                          <p>{comment.text}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Escribe un comentario..."
                      className="flex-1 rounded-lg border p-2"
                    />
                    <Button>Responder</Button>
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500">
                  Selecciona una publicación
                </div>
              )}
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
} 