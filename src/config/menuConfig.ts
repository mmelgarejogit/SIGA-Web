export interface MenuChild {
  label: string
  icon: string
  route: string
  permission?: string
}

export interface MenuItem {
  id: string
  label: string
  icon: string
  permission?: string
  children?: MenuChild[]
  route?: string
}

export const menuConfig: MenuItem[] = [
  {
    id: "dashboard",
    label: "Panel de Control",
    icon: "dashboard",
    route: "/",
    permission: "ver_dashboard",
  },
  {
    id: "notificaciones",
    label: "Notificaciones",
    icon: "notifications",
    route: "/notificaciones",
    permission: "ver_notificaciones",
  },
  {
    id: "pacientes",
    label: "Pacientes",
    icon: "groups",
    permission: "ver_pacientes",
    children: [
      {
        label: "Lista de Pacientes",
        icon: "list",
        route: "/pacientes",
        permission: "ver_pacientes",
      },
      {
        label: "Registrar Paciente",
        icon: "person_add",
        route: "/pacientes/nuevo",
        permission: "crear_paciente",
      },
    ],
  },
  {
    id: "agenda",
    label: "Agenda",
    icon: "calendar_month",
    permission: "ver_calendario",
    children: [
      {
        label: "Vista Semanal",
        icon: "view_week",
        route: "/agenda",
        permission: "ver_calendario",
      },
      {
        label: "Nueva Cita",
        icon: "edit_calendar",
        route: "/agenda/nueva",
        permission: "gestionar_agenda",
      },
      {
        label: "Mis Turnos",
        icon: "event_available",
        route: "/mis-turnos",
        permission: "ver_mis_turnos",
      },
    ],
  },
  {
    id: "clinica",
    label: "Clínica",
    icon: "medical_services",
    permission: "ver_consultas",
    children: [
      {
        label: "Consultas",
        icon: "stethoscope",
        route: "/clinica/consultas",
        permission: "ver_consultas",
      },
      {
        label: "Historial",
        icon: "clinical_notes",
        route: "/clinica/historial",
        permission: "ver_consultas",
      },
    ],
  },
  {
    id: "inventario",
    label: "Inventario",
    icon: "inventory_2",
    permission: "ver_inventario",
    children: [
      {
        label: "Productos",
        icon: "category",
        route: "/inventario/productos",
        permission: "ver_inventario",
      },
      {
        label: "Movimientos de Stock",
        icon: "swap_horiz",
        route: "/inventario/movimientos",
        permission: "ver_inventario",
      },
      {
        label: "Pedidos a Proveedores",
        icon: "local_shipping",
        route: "/inventario/pedidos",
        permission: "ver_inventario",
      },
    ],
  },
  {
    id: "ventas",
    label: "Ventas y Caja",
    icon: "payments",
    permission: "ver_ventas",
    children: [
      {
        label: "Nueva Venta",
        icon: "point_of_sale",
        route: "/ventas/nueva",
        permission: "registrar_venta",
      },
      {
        label: "Historial de Ventas",
        icon: "receipt_long",
        route: "/ventas",
        permission: "ver_ventas",
      },
      {
        label: "Cierre de Caja",
        icon: "lock_clock",
        route: "/ventas/cierre",
        permission: "ver_ventas",
      },
      {
        label: "Devoluciones",
        icon: "undo",
        route: "/ventas/devoluciones",
        permission: "ver_ventas",
      },
    ],
  },
  {
    id: "reportes",
    label: "Reportes",
    icon: "analytics",
    permission: "ver_reportes",
    children: [
      {
        label: "Reportes de Citas",
        icon: "event_note",
        route: "/reportes/citas",
        permission: "ver_reportes",
      },
      {
        label: "Reportes de Ventas",
        icon: "trending_up",
        route: "/reportes/ventas",
        permission: "ver_reportes",
      },
      {
        label: "Reporte de Inventario",
        icon: "warehouse",
        route: "/reportes/inventario",
        permission: "ver_reportes",
      },
    ],
  },
  {
    id: "admin",
    label: "Administración",
    icon: "manage_accounts",
    permission: "ver_usuarios",
    children: [
      {
        label: "Usuarios y Roles",
        icon: "shield_person",
        route: "/usuarios",
        permission: "ver_usuarios",
      },
      {
        label: "Profesionales",
        icon: "stethoscope",
        route: "/profesionales",
        permission: "ver_profesionales",
      },
      {
        label: "Configuración",
        icon: "settings",
        route: "/admin/config",
        permission: "ver_usuarios",
      },
      {
        label: "Auditoría",
        icon: "history",
        route: "/admin/auditoria",
        permission: "ver_usuarios",
      },
    ],
  },
]
