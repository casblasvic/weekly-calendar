"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { 
  Users, 
  UserPlus, 
  Settings, 
  Shield, 
  MessageSquare,
  Share2,
  Instagram,
  Facebook,
  Twitter,
  Mail,
  MessageCircle,
  ChevronDown,
  MoreVertical,
  Edit,
  Trash2,
  UserCog,
  CheckCircle2,
  XCircle
} from "lucide-react"

// Tipos de permisos
type PermissionLevel = 'coordinator' | 'agent'
type Channel = 'instagram' | 'facebook' | 'twitter' | 'whatsapp' | 'email'
type PermissionType = 'full' | 'messages' | 'posts' | 'comments' | 'analytics'

interface ChannelPermissions {
  channel: Channel
  permissions: PermissionType[]
}

interface UserPermissions {
  userId: string
  name: string
  email: string
  avatar: string
  role: PermissionLevel
  status: 'active' | 'inactive'
  assignedChannels: ChannelPermissions[]
  coordinator?: string // ID del coordinador si es agente
  agents?: string[] // IDs de los agentes si es coordinador
  specializations?: string[] // Especializaciones del agente
  createdAt: string
  lastActive: string
}

// Datos de ejemplo
const mockUsers: UserPermissions[] = [
  {
    userId: "1",
    name: "María García",
    email: "maria.garcia@clinicaestetica.com",
    avatar: "https://i.pravatar.cc/150?img=1",
    role: "coordinator",
    status: "active",
    assignedChannels: [
      {
        channel: "instagram",
        permissions: ["full"]
      },
      {
        channel: "facebook",
        permissions: ["full"]
      },
      {
        channel: "twitter",
        permissions: ["full"]
      },
      {
        channel: "whatsapp",
        permissions: ["full"]
      },
      {
        channel: "email",
        permissions: ["full"]
      }
    ],
    agents: ["2", "3", "4"],
    createdAt: "2024-01-15",
    lastActive: "2024-03-25T10:30:00"
  },
  {
    userId: "2",
    name: "Carlos Ruiz",
    email: "carlos.ruiz@clinicaestetica.com",
    avatar: "https://i.pravatar.cc/150?img=2",
    role: "agent",
    status: "active",
    assignedChannels: [
      {
        channel: "instagram",
        permissions: ["posts", "comments"]
      },
      {
        channel: "facebook",
        permissions: ["posts", "comments"]
      }
    ],
    coordinator: "1",
    specializations: ["Fotografía", "Diseño de contenido"],
    createdAt: "2024-02-01",
    lastActive: "2024-03-25T09:15:00"
  },
  {
    userId: "3",
    name: "Ana Martínez",
    email: "ana.martinez@clinicaestetica.com",
    avatar: "https://i.pravatar.cc/150?img=3",
    role: "agent",
    status: "active",
    assignedChannels: [
      {
        channel: "whatsapp",
        permissions: ["messages"]
      },
      {
        channel: "email",
        permissions: ["messages"]
      }
    ],
    coordinator: "1",
    specializations: ["Atención al cliente", "Gestión de consultas"],
    createdAt: "2024-02-15",
    lastActive: "2024-03-25T11:45:00"
  },
  {
    userId: "4",
    name: "David López",
    email: "david.lopez@clinicaestetica.com",
    avatar: "https://i.pravatar.cc/150?img=4",
    role: "agent",
    status: "active",
    assignedChannels: [
      {
        channel: "instagram",
        permissions: ["messages"]
      },
      {
        channel: "facebook",
        permissions: ["messages"]
      }
    ],
    coordinator: "1",
    specializations: ["Gestión de citas", "Soporte técnico"],
    createdAt: "2024-03-01",
    lastActive: "2024-03-25T08:30:00"
  }
]

export default function CommunityManagersPage() {
  const [selectedUser, setSelectedUser] = useState<UserPermissions | null>(null)
  const [searchQuery, setSearchQuery] = useState("")

  const filteredUsers = mockUsers.filter(user =>
    user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const getChannelIcon = (channel: Channel) => {
    switch (channel) {
      case 'instagram': return <Instagram className="w-4 h-4" />
      case 'facebook': return <Facebook className="w-4 h-4" />
      case 'twitter': return <Twitter className="w-4 h-4" />
      case 'whatsapp': return <MessageCircle className="w-4 h-4" />
      case 'email': return <Mail className="w-4 h-4" />
      default: return null
    }
  }

  const getPermissionBadge = (permission: PermissionType) => {
    const colors = {
      full: "bg-purple-500",
      messages: "bg-blue-500",
      posts: "bg-green-500",
      comments: "bg-yellow-500",
      analytics: "bg-red-500"
    }
    return (
      <Badge className={`${colors[permission]} text-white`}>
        {permission}
      </Badge>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Users className="w-8 h-8 text-purple-600" />
          <h1 className="text-2xl font-semibold">Gestión de Community Managers</h1>
        </div>
        <Button className="bg-purple-600 hover:bg-purple-700">
          <UserPlus className="w-4 h-4 mr-2" />
          Añadir Usuario
        </Button>
      </div>

      <Card className="p-6">
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <Input
                placeholder="Buscar por nombre o email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  Filtros <ChevronDown className="w-4 h-4 ml-2" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem>Activos</DropdownMenuItem>
                <DropdownMenuItem>Inactivos</DropdownMenuItem>
                <DropdownMenuItem>Coordinadores</DropdownMenuItem>
                <DropdownMenuItem>Agentes</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Usuario</TableHead>
                <TableHead>Rol</TableHead>
                <TableHead>Canales Asignados</TableHead>
                <TableHead>Permisos</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Última Actividad</TableHead>
                <TableHead className="w-[100px]">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((user) => (
                <TableRow 
                  key={user.userId}
                  className="cursor-pointer hover:bg-gray-50"
                  onClick={() => setSelectedUser(user)}
                >
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <img
                        src={user.avatar}
                        alt={user.name}
                        className="w-8 h-8 rounded-full"
                      />
                      <div>
                        <div className="font-medium">{user.name}</div>
                        <div className="text-sm text-gray-500">{user.email}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={user.role === 'coordinator' ? 'default' : 'secondary'}>
                      {user.role === 'coordinator' ? 'Coordinador' : 'Agente'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      {user.assignedChannels.map(channel => (
                        <div key={channel.channel} className="flex items-center gap-1">
                          {getChannelIcon(channel.channel)}
                          <span className="text-sm">{channel.channel}</span>
                        </div>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {user.assignedChannels.map(channel => (
                        channel.permissions.map(permission => (
                          <div key={`${channel.channel}-${permission}`} className="flex items-center gap-1">
                            {getChannelIcon(channel.channel)}
                            {getPermissionBadge(permission)}
                          </div>
                        ))
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={user.status === 'active' ? 'success' : 'destructive'}>
                      {user.status === 'active' ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm text-gray-500">
                      {new Date(user.lastActive).toLocaleString()}
                    </div>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem>
                          <Edit className="w-4 h-4 mr-2" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <UserCog className="w-4 h-4 mr-2" />
                          Permisos
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-red-600">
                          <Trash2 className="w-4 h-4 mr-2" />
                          Eliminar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      {selectedUser && (
        <Card className="p-6">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img
                  src={selectedUser.avatar}
                  alt={selectedUser.name}
                  className="w-12 h-12 rounded-full"
                />
                <div>
                  <h2 className="text-xl font-semibold">{selectedUser.name}</h2>
                  <p className="text-gray-500">{selectedUser.email}</p>
                </div>
              </div>
              <Button variant="outline" onClick={() => setSelectedUser(null)}>
                Cerrar
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="font-medium">Información General</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Rol</span>
                    <Badge variant={selectedUser.role === 'coordinator' ? 'default' : 'secondary'}>
                      {selectedUser.role === 'coordinator' ? 'Coordinador' : 'Agente'}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Estado</span>
                    <Badge variant={selectedUser.status === 'active' ? 'success' : 'destructive'}>
                      {selectedUser.status === 'active' ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Fecha de Registro</span>
                    <span>{new Date(selectedUser.createdAt).toLocaleDateString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Última Actividad</span>
                    <span>{new Date(selectedUser.lastActive).toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="font-medium">Permisos por Canal</h3>
                <div className="space-y-4">
                  {selectedUser.assignedChannels.map(channel => (
                    <div key={channel.channel} className="space-y-2">
                      <div className="flex items-center gap-2">
                        {getChannelIcon(channel.channel)}
                        <span className="font-medium capitalize">{channel.channel}</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {channel.permissions.map(permission => (
                          <div key={permission} className="flex items-center gap-1">
                            {getPermissionBadge(permission)}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {selectedUser.role === 'agent' && (
                <div className="space-y-4">
                  <h3 className="font-medium">Coordinador Asignado</h3>
                  <div className="flex items-center gap-3">
                    <img
                      src={mockUsers.find(u => u.userId === selectedUser.coordinator)?.avatar}
                      alt="Coordinador"
                      className="w-8 h-8 rounded-full"
                    />
                    <div>
                      <div className="font-medium">
                        {mockUsers.find(u => u.userId === selectedUser.coordinator)?.name}
                      </div>
                      <div className="text-sm text-gray-500">
                        {mockUsers.find(u => u.userId === selectedUser.coordinator)?.email}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {selectedUser.role === 'coordinator' && selectedUser.agents && (
                <div className="space-y-4">
                  <h3 className="font-medium">Agentes Asignados</h3>
                  <div className="space-y-3">
                    {selectedUser.agents.map(agentId => {
                      const agent = mockUsers.find(u => u.userId === agentId)
                      return agent && (
                        <div key={agentId} className="flex items-center gap-3">
                          <img
                            src={agent.avatar}
                            alt={agent.name}
                            className="w-8 h-8 rounded-full"
                          />
                          <div>
                            <div className="font-medium">{agent.name}</div>
                            <div className="text-sm text-gray-500">{agent.email}</div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {selectedUser.specializations && (
                <div className="space-y-4">
                  <h3 className="font-medium">Especializaciones</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedUser.specializations.map(specialization => (
                      <Badge key={specialization} variant="outline">
                        {specialization}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline">Cancelar</Button>
              <Button className="bg-purple-600 hover:bg-purple-700">
                Guardar Cambios
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  )
} 