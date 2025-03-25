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
  Briefcase,
  Database,
  CircleDollarSign,
  MessageCircle,
  Share2,
  Instagram,
  Facebook,
  Twitter,
  Mail,
  HardDrive,
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
    icon: Briefcase,
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
        icon: FileText,
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
        id: "almacenamiento",
        label: "Almacenamiento",
        icon: HardDrive,
        href: "/configuracion/almacenamiento",
      },
      {
        id: "database",
        label: "Bases de datos",
        icon: Database,
        href: "/configuracion/database",
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
  {
    id: "menu-prueba",
    label: "Menú Prueba",
    icon: MessageCircle,
    href: "/menu-prueba",
    submenu: [
      {
        id: "submenu1",
        label: "Submenú 1",
        icon: MessageCircle,
        href: "/menu-prueba/submenu1"
      },
      {
        id: "submenu2",
        label: "Submenú 2",
        icon: MessageCircle,
        href: "/menu-prueba/submenu2"
      }
    ]
  },
  {
    id: "redes-sociales",
    label: "Redes Sociales",
    icon: Share2,
    href: "/redes-sociales",
    submenu: [
      {
        id: "dashboard",
        label: "Dashboard",
        icon: BarChart2,
        href: "/redes-sociales/dashboard"
      },
      {
        id: "instagram",
        label: "Instagram",
        icon: Instagram,
        href: "/redes-sociales/instagram"
      },
      {
        id: "facebook",
        label: "Facebook",
        icon: Facebook,
        href: "/redes-sociales/facebook"
      },
      {
        id: "twitter",
        label: "Twitter",
        icon: Twitter,
        href: "/redes-sociales/twitter"
      },
      {
        id: "whatsapp",
        label: "WhatsApp",
        icon: MessageCircle,
        href: "/redes-sociales/whatsapp"
      },
      {
        id: "email",
        label: "Email",
        icon: Mail,
        href: "/redes-sociales/email"
      },
      {
        id: "configuracion",
        label: "Configuración",
        icon: Settings,
        href: "/redes-sociales/configuracion"
      },
      {
        id: "community-managers",
        label: "Community Managers",
        icon: Users,
        href: "/redes-sociales/configuracion/community-managers"
      }
    ]
  },
]

