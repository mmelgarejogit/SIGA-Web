export interface MenuChild {
  label: string
  icon: string
  route?: string
  permission?: string
  children?: MenuChild[]
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
    id: "productos",
    label: "Productos",
    icon: "inventory_2",
    permission: "ver_inventario",
    children: [
      {
        label: "Productos",
        icon: "category",
        route: "/productos",
        permission: "ver_inventario",
      },
      {
        label: "Categorías",
        icon: "label",
        route: "/productos/categorias",
        permission: "ver_inventario",
      },
      {
        label: "Marcas",
        icon: "verified",
        route: "/productos/marcas",
        permission: "ver_inventario",
      },
      {
        label: "Modelos",
        icon: "style",
        route: "/productos/modelos",
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
        label: "Por Sucursal",
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
        label: "Ajustes Manuales",
        icon: "tune",
        route: "/stock/ajustes",
        permission: "ver_inventario",
      },
      {
        label: "Transferencias",
        icon: "sync_alt",
        route: "/stock/transferencias",
        permission: "ver_inventario",
      },
      {
        label: "Inventario Físico",
        icon: "fact_check",
        route: "/stock/fisico",
        permission: "ver_inventario",
      },
      {
        label: "Sucursales",
        icon: "store",
        route: "/stock/sucursales",
        permission: "ver_inventario",
      },
    ],
  },
  {
    id: "stock-config",
    label: "Config. Stock",
    icon: "settings",
    permission: "gestionar_configuracion",
    children: [
      {
        label: "Parámetros",
        icon: "tune",
        route: "/stock/config/parametros",
        permission: "gestionar_configuracion",
      },
      {
        label: "Tipos de Ajuste",
        icon: "list_alt",
        route: "/stock/config/tipos-ajuste",
        permission: "gestionar_configuracion",
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
        label: "Aprobación de OC",
        icon: "task_alt",
        route: "/compras/oc/aprobacion",
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
        label: "Proveedores",
        icon: "storefront",
        route: "/productos/proveedores",
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
      {
        label: "Reportes",
        icon: "analytics",
        children: [
          {
            label: "Por tipo y categoría",
            icon: "category",
            route: "/egresos/reportes/tipo-categoria",
            permission: "ver_egresos",
          },
          {
            label: "Por estado",
            icon: "info",
            route: "/egresos/reportes/estado",
            permission: "ver_egresos",
          },
          {
            label: "Por medio de pago",
            icon: "payment",
            route: "/egresos/reportes/medio-pago",
            permission: "ver_egresos",
          },
          {
            label: "Total por período",
            icon: "calendar_month",
            route: "/egresos/reportes/total-periodo",
            permission: "ver_egresos",
          },
        ],
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
        label: "Auditoría",
        icon: "history",
        route: "/admin/auditoria",
        permission: "ver_usuarios",
      },
    ],
  },
]
