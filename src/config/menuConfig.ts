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
    id: "clientes",
    label: "Clientes",
    icon: "badge",
    route: "/clientes",
    permission: "ver_clientes",
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
    label: "Catálogo",
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
      {
        label: "Tipos de Lente",
        icon: "lens",
        route: "/inventario/tipos-lente",
        permission: "ver_inventario",
      },
      {
        label: "Tratamientos",
        icon: "auto_fix_high",
        route: "/inventario/tratamientos",
        permission: "ver_inventario",
      },
    ],
  },
  {
    id: "stock",
    label: "Inventario",
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
        label: "Aprobaciones Mov.",
        icon: "task_alt",
        route: "/stock/aprobaciones",
        permission: "gestionar_inventario",
      },
      {
        label: "Historial",
        icon: "history",
        route: "/stock/conteos",
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
        label: "Proveedores",
        icon: "storefront",
        route: "/inventario/proveedores",
        permission: "ver_inventario",
      },
      {
        label: "Órdenes de Compra",
        icon: "shopping_cart",
        route: "/compras/oc",
        permission: "ver_inventario",
      },
      {
        label: "Aprobación de OC",
        icon: "task_alt",
        route: "/compras/aprobaciones",
        permission: "aprobar_pedidos",
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
        label: "Pagos Pendientes",
        icon: "payments",
        route: "/egresos/pagos",
        permission: "pagar_egresos",
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
    label: "Ventas",
    icon: "point_of_sale",
    permission: "ver_ventas",
    children: [
      {
        label: "Presupuestos",
        icon: "description",
        route: "/ventas/presupuestos",
        permission: "registrar_venta",
      },
      {
        label: "Nueva Venta",
        icon: "add_shopping_cart",
        route: "/ventas/nueva",
        permission: "registrar_venta",
      },
      {
        label: "Historial",
        icon: "receipt_long",
        route: "/ventas",
        permission: "ver_ventas",
      },
      {
        label: "Cobros Pendientes",
        icon: "pending_actions",
        route: "/ventas/cobros-pendientes",
        permission: "ver_ventas",
      },
      {
        label: "Pedidos a Lab",
        icon: "science",
        route: "/ventas/trabajos-pedido",
        permission: "ver_ventas",
      },
      {
        label: "Aprobaciones Lab",
        icon: "task_alt",
        route: "/ventas/trabajos-pedido/aprobacion",
        permission: "gestionar_ventas",
      },
      {
        label: "Recepciones Lab",
        icon: "inventory",
        route: "/ventas/trabajos-pedido/recepciones",
        permission: "registrar_venta",
      },
      {
        label: "Facturas Lab",
        icon: "receipt_long",
        route: "/ventas/trabajos-pedido/facturas",
        permission: "registrar_venta",
      },
      {
        label: "Historial Facturas",
        icon: "folder_open",
        route: "/ventas/facturas",
        permission: "ver_ventas",
      },
    ],
  },
  {
    id: "caja",
    label: "Caja",
    icon: "payments",
    permission: "ver_ventas",
    children: [
      {
        label: "Cierre de Caja",
        icon: "lock_clock",
        route: "/ventas/cierre",
        permission: "gestionar_ventas",
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
      {
        label: "Especialidades",
        icon: "medical_services",
        route: "/personal/especialidades",
        permission: "ver_especialidades",
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
        label: "Usuarios",
        icon: "manage_accounts",
        route: "/usuarios",
        permission: "ver_usuarios",
      },
      {
        label: "Roles y Permisos",
        icon: "shield_person",
        route: "/roles",
        permission: "ver_roles",
      },
      {
        label: "Configuración",
        icon: "settings",
        route: "/admin/config",
        permission: "gestionar_configuracion",
      },
      {
        label: "Ubicaciones",
        icon: "map",
        route: "/admin/ubicaciones",
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
