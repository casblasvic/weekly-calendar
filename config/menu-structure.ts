import type React from "react"
import {
  Home,
  Users,
  Calendar,
  CalendarCheck2,
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
  HardDrive,
  Briefcase,
  Database,
  CircleDollarSign,
  Wrench,
  LayoutDashboard,
  Receipt,
  Boxes,
  ShoppingCart,
  Tag,
  Building,
  CreditCard,
  Wallet,
  SquareTerminal,
  Landmark,
  ClipboardList,
  Archive,
  Gift,
  ArrowRightLeft,
  Bell,
  Webhook,
  Zap,
  Network,
  Cpu,
  Link2,
  Store,
  Plug
} from "lucide-react"

export interface MenuItem {
  id: string
  label: string
  icon?: React.ElementType
  activeIcon?: React.ElementType
  href?: string
  submenu?: MenuItem[]
  permissions?: string[]
  isExternal?: boolean
  badge?: number | string | boolean | undefined
  activePaths?: string[]
  dataTestId?: string
  isDisabled?: boolean
  disabledReason?: string
}

// Función helper para procesar el menú con estados de desactivación
export function processMenuItemsWithIntegrations(
  items: MenuItem[],
  integrationCheckers: {
    isShellyActive: boolean;
    hasActiveIoTModules: boolean;
    isModuleActive: (pattern: string) => boolean;
    hasActiveCategoryModules: (category: string) => boolean;
  }
): MenuItem[] {
  return items.map(item => {
    // Procesar submenús recursivamente
    let processedSubmenu = item.submenu;
    if (item.submenu) {
      processedSubmenu = processMenuItemsWithIntegrations(item.submenu, integrationCheckers);
    }

    // Aplicar lógica de desactivación específica
    let isDisabled = false;
    let disabledReason = '';

    // Deshabilitar "Dispositivos IoT" si no hay módulos IoT activos
    if (item.id === 'dispositivos-iot') {
      if (!integrationCheckers.hasActiveIoTModules) {
        isDisabled = true;
        disabledReason = 'No hay módulos de dispositivos IoT activados';
      }
    }

    // Deshabilitar "Enchufes Inteligentes" si el módulo Shelly no está activo
    if (item.id === 'enchufes-inteligentes') {
      if (!integrationCheckers.isShellyActive) {
        isDisabled = true;
        disabledReason = 'El módulo Control Inteligente (Shelly) no está activado';
      }
    }

    return {
      ...item,
      submenu: processedSubmenu,
      isDisabled,
      disabledReason,
    };
  });
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
        id: "contactos",
        label: "Contactos",
        icon: Users,
        href: "/contactos",
      },
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
  },
  {
    id: "facturacion",
    label: "Facturación",
    icon: FileText,
    href: "/facturacion",
    submenu: [
      {
        id: "listado-tickets",
        label: "Listado de tickets",
        icon: Receipt,
        href: "/facturacion/tickets",
      },
      {
        id: "busqueda-facturacion",
        label: "Búsqueda",
        icon: Search,
        href: "/facturacion/busqueda",
      },
      {
        id: "pagos-aplazados",
        label: "Pagos aplazados",
        icon: Wallet,
        href: "/facturacion/pagos-aplazados",
      },
      {
        id: "anticipos",
        label: "Anticipos",
        icon: CircleDollarSign,
        href: "/facturacion/anticipos",
      },
      {
        id: "cheques-regalo",
        label: "Cheques regalo",
        icon: Gift,
        href: "/facturacion/cheques-regalo",
      },
      {
        id: "pagos-financiados",
        label: "Pagos financiados",
        icon: Landmark,
        href: "/facturacion/pagos-financiados",
      },
      {
        id: "flujo-caja",
        label: "Flujo de caja",
        icon: BarChart2,
        href: "/facturacion/flujo-caja",
      },
      {
        id: "recibos-pendientes",
        label: "Recibos pendientes",
        icon: Bell,
        href: "/facturacion/recibos-pendientes",
      },
      {
        id: "remesas",
        label: "Remesas",
        icon: ArrowRightLeft,
        href: "/facturacion/remesas",
      },
      {
        id: "presupuestos",
        label: "Presupuestos",
        icon: ClipboardList,
        href: "/facturacion/presupuestos",
      },
      {
        id: "cajas-dia",
        label: "Cajas del día",
        icon: Archive,
        href: "/facturacion/cajas-dia",
      },
    ],
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
        id: "sociedades_mercantiles",
        label: "Sociedades Mercantiles",
        icon: Landmark,
        href: "/configuracion/sociedades",
      },
      {
        id: "contabilidad",
        label: "Contabilidad",
        icon: ClipboardList, 
        href: "/configuracion/contabilidad",
        submenu: [
          {
            id: "plan-cuentas",
            label: "Plan de Cuentas",
            icon: Landmark,
            href: "/configuracion/contabilidad",
          },
          {
            id: "gastos",
            label: "Gastos",
            icon: Receipt,
            href: "/configuracion/contabilidad/gastos",
          },
        ],
      },
      {
        id: "usuarios",
        label: "Usuarios",
        icon: UserCog,
        href: "/configuracion/usuarios",
      },
      {
        id: "proveedores",
        label: "Proveedores",
        icon: Building2,
        href: "/configuracion/proveedores",
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
        id: "iva",
        label: "Tipos de IVA",
        icon: CircleDollarSign,
        href: "/configuracion/iva",
      },
      {
        id: "familias",
        label: "Familias (Categorías)",
        icon: Folder,
        href: "/configuracion/familias",
      },
      {
        id: "servicios",
        label: "Servicios",
        icon: Wrench,
        href: "/configuracion/servicios",
      },
      {
        id: "productos",
        label: "Productos",
        icon: Package,
        href: "/configuracion/productos",
      },
      {
        id: "paquetes",
        label: "Paquetes",
        icon: Package2,
        href: "/configuracion/paquetes",
      },
      {
        id: "bonos",
        label: "Bonos",
        icon: Tags,
        href: "/configuracion/bonos",
      },
      {
        id: "promotions",
        label: "Promociones",
        icon: Tags,
        href: "/configuracion/promociones",
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
      {
        id: "config-bancos",
        label: "Bancos",
        href: "/configuracion/bancos",
        icon: Landmark,
      },
      {
        id: "config-metodos-pago",
        label: "Métodos de Pago",
        href: "/configuracion/metodos-pago",
        icon: CreditCard,
      },
      {
        id: "config-cuentas-bancarias",
        label: "Cuentas Bancarias",
        href: "/configuracion/cuentas-bancarias",
        icon: Wallet,
      },
      {
        id: "config-terminales-pos",
        label: "Terminales POS",
        href: "/configuracion/terminales-pos",
        icon: SquareTerminal,
      },
      {
        id: "integraciones",
        label: "Integraciones",
        icon: Link2,
        href: "/configuracion/integraciones",
        submenu: [
          {
            id: "marketplace",
            label: "Marketplace de Apps",
            icon: Store,
            href: "/configuracion/integraciones",
          },
          {
            id: "webhooks",
            label: "Webhooks Manuales",
            icon: Webhook,
            href: "/configuracion/integraciones/webhooks",
          },
          {
            id: "websocket-manager",
            label: "WebSocket Manager",
            icon: Network,
            href: "/configuracion/integraciones/websocket-manager",
          },
          {
            id: "dispositivos-iot",
            label: "Dispositivos IoT",
            icon: Cpu,
            submenu: [
              {
                id: "enchufes-inteligentes",
                label: "Enchufes Inteligentes",
                icon: Plug,
                href: "/configuracion/integraciones/EquiposIot/EnchufesInteligentes",
              }
            ]
          },
        ],
      },
    ],
  },
]
