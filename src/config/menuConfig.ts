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
    route: "/pacientes",
    permission: "ver_pacientes",
  },
  {
    id: "agenda",
    label: "Agenda",
    icon: "calendar_month",
    route: "/agenda",
    permission: "ver_agenda",
  },
  {
    id: "mis-turnos",
    label: "Mis Turnos",
    icon: "event_available",
    route: "/mis-turnos",
    permission: "ver_mis_turnos",
  },
  {
    id: "clinica",
    label: "Clínica",
    icon: "medical_services",
    children: [
      {
        label: "Recepción",
        icon: "person_check",
        route: "/recepcion",
        permission: "ver_recepcion",
      },
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
        label: "Categorías",
        icon: "label",
        route: "/inventario/categorias",
        permission: "ver_inventario",
      },
      {
        label: "Marcas",
        icon: "verified",
        route: "/inventario/marcas",
        permission: "ver_inventario",
      },
      {
        label: "Modelos",
        icon: "style",
        route: "/inventario/modelos",
        permission: "ver_inventario",
      },
    ],
  },
  {
    id: "stock",
    label: "Stock",
    icon: "warehouse",
    permission: "ver_inventario",
    children: [
      {
        label: "Niveles de Stock",
        icon: "bar_chart",
        route: "/stock",
        permission: "ver_inventario",
      },
      {
        label: "Movimientos",
        icon: "swap_horiz",
        route: "/stock/movimientos",
        permission: "ver_inventario",
      },
      {
        label: "Motivos",
        icon: "list_alt",
        route: "/stock/motivos",
        permission: "ver_inventario",
      },
      {
        label: "Aprobaciones",
        icon: "task_alt",
        route: "/stock/aprobaciones",
        permission: "gestionar_inventario",
      },
    ],
  },
  {
    id: "compras",
    label: "Compras",
    icon: "local_shipping",
    permission: "ver_inventario",
    children: [
      {
        label: "Órdenes de Compra",
        icon: "shopping_cart",
        route: "/compras/oc",
        permission: "ver_inventario",
      },
      {
        label: "Facturas de Compra",
        icon: "receipt",
        route: "/compras/facturas",
        permission: "ver_inventario",
      },
      {
        label: "Recepciones",
        icon: "inventory",
        route: "/compras/recepciones",
        permission: "ver_inventario",
      },
      {
        label: "Proveedores",
        icon: "storefront",
        route: "/inventario/proveedores",
        permission: "ver_inventario",
      },
      {
        label: "Reportes",
        icon: "analytics",
        route: "/compras/reportes",
        permission: "ver_inventario",
      },
    ],
  },
  {
    id: "egresos",
    label: "Egresos",
    icon: "account_balance_wallet",
    permission: "ver_egresos",
    children: [
      {
        label: "Lista de Egresos",
        icon: "receipt_long",
        route: "/egresos",
        permission: "ver_egresos",
      },
      {
        label: "Nueva Solicitud",
        icon: "add_circle",
        route: "/egresos/nuevo",
        permission: "gestionar_egresos",
      },
      {
        label: "Aprobación",
        icon: "task_alt",
        route: "/egresos/aprobacion",
        permission: "aprobar_egresos",
      },
      {
        label: "Categorías de Gasto",
        icon: "label",
        route: "/egresos/categorias",
        permission: "ver_egresos",
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
    id: "personal",
    label: "Personal",
    icon: "people",
    permission: "ver_profesionales",
    children: [
      {
        label: "Profesionales",
        icon: "stethoscope",
        route: "/profesionales",
        permission: "ver_profesionales",
      },
      {
        label: "Empleados",
        icon: "badge",
        route: "/personal/empleados",
        permission: "ver_empleados",
      },
      {
        label: "Cargos",
        icon: "work",
        route: "/personal/empleados/cargos",
        permission: "ver_empleados",
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
        label: "Configuración",
        icon: "settings",
        route: "/admin/config",
        permission: "gestionar_configuracion",
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
