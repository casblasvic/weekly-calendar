"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { MessageCircle, Image, Clock, CheckCircle2 } from "lucide-react"

// Datos de ejemplo
const mockDMs = [
  {
    id: 1,
    username: "maria_garcia",
    avatar: "https://i.pravatar.cc/150?img=1",
    lastMessage: "¿Tienes disponibilidad para mañana?",
    timestamp: "10:30 AM",
    status: "pending",
    messages: [
      { id: 1, sender: "maria_garcia", text: "Hola, me gustaría agendar una cita", time: "10:25 AM" },
      { id: 2, sender: "system", text: "¿Tienes disponibilidad para mañana?", time: "10:30 AM" }
    ]
  },
  {
    id: 2,
    username: "juan_perez",
    avatar: "https://i.pravatar.cc/150?img=2",
    lastMessage: "¡Gracias por la atención!",
    timestamp: "Ayer",
    status: "responded",
    messages: [
      { id: 1, sender: "juan_perez", text: "¡Gracias por la atención!", time: "Ayer" }
    ]
  }
]

const mockPosts = [
  {
    id: 1,
    title: "Nuevo tratamiento facial",
    image: "https://picsum.photos/400/300",
    likes: 45,
    commentCount: 8,
    pendingComments: 3,
    timestamp: "2h",
    comments: [
      { id: 1, username: "ana_smith", text: "¡Me encanta! ¿Cuánto cuesta?", time: "1h" },
      { id: 2, username: "carlos_rod", text: "¿Tienes más fotos?", time: "30m" }
    ]
  },
  {
    id: 2,
    title: "Promoción especial",
    image: "https://picsum.photos/400/301",
    likes: 32,
    commentCount: 5,
    pendingComments: 1,
    timestamp: "5h",
    comments: [
      { id: 1, username: "laura_mart", text: "¿Hasta cuándo es la promoción?", time: "4h" }
    ]
  }
]

export default function InstagramPage() {
  const [selectedDM, setSelectedDM] = useState(mockDMs[0])
  const [selectedPost, setSelectedPost] = useState(mockPosts[0])
  const [newMessage, setNewMessage] = useState("")

  return (
    <div className="p-6">
      <div className="flex items-center gap-3 mb-6">
        <Image className="w-8 h-8 text-pink-600" />
        <h1 className="text-2xl font-semibold">Instagram</h1>
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
                      selectedDM?.id === dm.id ? "bg-purple-50" : ""
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
                              ? "bg-purple-100 text-purple-900"
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
                      selectedPost?.id === post.id ? "bg-purple-50" : ""
                    }`}
                    onClick={() => setSelectedPost(post)}
                  >
                    <div className="flex items-center gap-3">
                      <img src={post.image} alt={post.title} className="w-16 h-16 rounded-lg object-cover" />
                      <div className="flex-1">
                        <h3 className="font-medium">{post.title}</h3>
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <span>{post.likes} likes</span>
                          <span>•</span>
                          <span>{post.commentCount} comentarios</span>
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
                      <span>{selectedPost.likes} likes</span>
                      <span>•</span>
                      <span>{selectedPost.commentCount} comentarios</span>
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