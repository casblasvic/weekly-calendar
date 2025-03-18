import type React from "react"
import {
  Home,
  Users,
  Calendar,
  FileText,
  Megaphone,
  BarChart2,
  Package,
  Clock,
  FileIcon,
  GraduationCap,
  Settings,
  Building2,
  UserCog,
  Tags,
  Laptop2,
  Shield,
  Folder,
  Clock4,
  Download,
  Package2,
  Terminal,
  Search,
  UserPlus,
} from "lucide-react"

export interface MenuItem {
  id: string
  label: string
  icon: React.ElementType
  href: string
  badge?: number
  submenu?: MenuItem[]
}

export const menuItems: MenuItem[] = [
  {
    id: "inicio",
    label: "Inicio",
    icon: Home,
    href: "/",
  },
  {
    id: "crm",
    label: "CRM",
    icon: Users,
    href: "/crm",
    submenu: [
      {
        id: "dashboard",
        label: "Dashboard CRM",
        icon: Home,
        href: "/crm",
      },
      {
        id: "leads",
        label: "Leads",
        icon: Users,
        href: "/crm/leads",
      },
      {
        id: "campanas",
        label: "Campañas",
        icon: Megaphone,
        href: "/crm/campanas",
      },
    ],
  },
  {
    id: "clientes",
    label: "Gestión de clientes",
    icon: Users,
    href: "/clientes",
    submenu: [
      {
        id: "busqueda",
        label: "Búsqueda",
        icon: Search,
        href: "/clientes/busqueda",
      },
      {
        id: "busqueda-avanzada",
        label: "Búsqueda avanzada",
        icon: Search,
        href: "/clientes/busqueda-avanzada",
      },
      {
        id: "captacion",
        label: "Captación",
        icon: Users,
        href: "/clientes/captacion",
      },
      {
        id: "nuevo-cliente",
        label: "Nuevo cliente",
        icon: UserPlus,
        href: "/clientes/nuevo",
      },
    ],
  },
  {
    id: "agenda",
    label: "Agenda",
    icon: Calendar,
    href: "/agenda",
    badge: 32,
  },
  {
    id: "facturacion",
    label: "Facturación",
    icon: FileText,
    href: "/facturacion",
    badge: 3,
  },
  {
    id: "marketing",
    label: "Marketing",
    icon: Megaphone,
    href: "/marketing",
  },
  {
    id: "estadisticas",
    label: "Estadísticas",
    icon: BarChart2,
    href: "/estadisticas",
  },
  {
    id: "stock",
    label: "Control de stock",
    icon: Package,
    href: "/stock",
    badge: 1,
  },
  {
    id: "presencia",
    label: "Control de presencia",
    icon: Clock,
    href: "/presencia",
  },
  {
    id: "documentos",
    label: "Documentos",
    icon: FileIcon,
    href: "/documentos",
  },
  {
    id: "academy",
    label: "Academy",
    icon: GraduationCap,
    href: "/academy",
  },
  {
    id: "configuracion",
    label: "Configuración",
    icon: Settings,
    href: "/configuracion",
    submenu: [
      {
        id: "clinicas",
        label: "Clínicas",
        icon: Building2,
        href: "/configuracion/clinicas",
      },
      {
        id: "usuarios",
        label: "Usuarios",
        icon: UserCog,
        href: "/configuracion/usuarios",
      },
      {
        id: "tarifas",
        label: "Tarifas",
        icon: Tags,
        href: "/configuracion/tarifas",
      },
      {
        id: "equipamiento",
        label: "Equipamiento",
        icon: Laptop2,
        href: "/configuracion/equipamiento",
      },
      {
        id: "perfiles",
        label: "Perfiles",
        icon: Shield,
        href: "/configuracion/perfiles",
      },
      {
        id: "catalogos",
        label: "Catálogos",
        icon: Folder,
        href: "/configuracion/catalogos",
        submenu: [
          {
            id: "conceptos",
            label: "Catálogo de conceptos",
            icon: FileIcon,
            href: "/configuracion/catalogos/conceptos",
          },
          {
            id: "bancos",
            label: "Entidades bancarias",
            icon: Building2,
            href: "/configuracion/catalogos/bancos",
          },
          {
            id: "formularios",
            label: "Formularios y consentimientos",
            icon: FileText,
            href: "/configuracion/catalogos/formularios",
          },
          {
            id: "etiquetas",
            label: "Etiquetas para citas",
            icon: Tags,
            href: "/configuracion/catalogos/etiquetas",
          },
        ],
      },
      {
        id: "turnos",
        label: "Turnos de trabajo",
        icon: Clock4,
        href: "/configuracion/turnos",
      },
      {
        id: "importar-datos",
        label: "Importar datos",
        icon: Download,
        href: "/configuracion/importar-datos",
      },
      {
        id: "importar-productos",
        label: "Importar productos",
        icon: Package2,
        href: "/configuracion/importar-productos",
      },
      {
        id: "sistema",
        label: "Sistema",
        icon: Terminal,
        href: "/configuracion/sistema",
      },
      {
        id: "plantillas-horarias",
        label: "Plantillas Horarias",
        icon: Clock4,
        href: "/configuracion/plantillas-horarias",
      },
    ],
  },
]

