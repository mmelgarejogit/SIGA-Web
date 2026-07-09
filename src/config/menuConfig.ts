export interface MenuChild {
  label: string
  icon: string
  route?: string
  permission?: string
  /** Sub-grupo anidado (un nivel). Si está presente, este ítem agrupa hojas y no navega. */
  children?: MenuChild[]
}

export interface MenuItem {
  id: string
  label: string
  icon: string
  permission?: string
  children?: MenuChild[]
  route?: string
  /** Zona del sidebar (agrupa varios MenuItem bajo un mismo título). Sin zona = se renderiza suelto. */
  zone?: string
}

/** ¿Este nodo matchea el buscador rápido, por su propia etiqueta o por algún descendiente? */
export function nodeMatchesQuery(node: { label: string; children?: MenuChild[] }, query: string): boolean {
  if (node.label.toLowerCase().includes(query)) return true
  if (node.children) return node.children.some((c) => nodeMatchesQuery(c, query))
  return false
}

export const menuConfig: MenuItem[] = [
  {
    id: "dashboard",
    label: "Panel de Control",
    icon: "dashboard",
    route: "/",
    permission: "ver_dashboard",
    zone: "General",
  },
  {
    id: "notificaciones",
    label: "Notificaciones",
    icon: "notifications",
    route: "/notificaciones",
    permission: "ver_notificaciones",
    zone: "General",
  },
  {
    id: "mis-turnos",
    label: "Mis Turnos",
    icon: "event_available",
    route: "/mis-turnos",
    permission: "ver_mis_turnos",
    zone: "General",
  },
  {
    id: "mi-historial",
    label: "Mi Historial",
    icon: "clinical_notes",
    route: "/mi-historial",
    permission: "ver_mis_turnos",
    zone: "General",
  },
  {
    id: "mis-recetas",
    label: "Mis Recetas",
    icon: "prescriptions",
    route: "/mis-recetas",
    permission: "ver_mis_turnos",
    zone: "General",
  },
  {
    id: "pacientes",
    label: "Pacientes",
    icon: "groups",
    route: "/pacientes",
    permission: "ver_pacientes",
    zone: "Atención",
  },
  {
    id: "agenda",
    label: "Agenda",
    icon: "calendar_month",
    route: "/agenda",
    permission: "ver_agenda",
    zone: "Atención",
  },
  {
    id: "clinica",
    label: "Clínica",
    icon: "medical_services",
    zone: "Atención",
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
    zone: "Óptica",
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
        label: "Armazón",
        icon: "eyeglasses",
        children: [
          { label: "Marcas", icon: "verified", route: "/inventario/marcas", permission: "ver_inventario" },
          { label: "Modelos", icon: "style", route: "/inventario/modelos", permission: "ver_inventario" },
        ],
      },
      {
        label: "Óptico",
        icon: "visibility",
        children: [
          { label: "Tipos de Lente", icon: "lens", route: "/inventario/tipos-lente", permission: "ver_inventario" },
          { label: "Tratamientos", icon: "auto_fix_high", route: "/inventario/tratamientos", permission: "ver_inventario" },
        ],
      },
    ],
  },
  {
    id: "stock",
    label: "Inventario",
    icon: "warehouse",
    permission: "ver_inventario",
    zone: "Óptica",
    children: [
      {
        label: "Configuración",
        icon: "tune",
        children: [
          { label: "Motivos", icon: "list_alt", route: "/stock/motivos", permission: "ver_inventario" },
        ],
      },
      {
        label: "Transacciones",
        icon: "sync_alt",
        children: [
          { label: "Registrar Conteo", icon: "add_task", route: "/stock/conteo/nuevo", permission: "gestionar_inventario" },
          { label: "Movimientos", icon: "swap_horiz", route: "/stock/movimientos", permission: "ver_inventario" },
          { label: "Transferencias", icon: "sync_alt", route: "/stock/transferencias", permission: "transferir_stock" },
        ],
      },
      {
        label: "Consultas",
        icon: "query_stats",
        children: [
          { label: "Niveles de Stock", icon: "bar_chart", route: "/stock", permission: "ver_inventario" },
          { label: "Inventario Físico", icon: "fact_check", route: "/stock/conteos", permission: "ver_inventario" },
          { label: "Aprobaciones", icon: "task_alt", route: "/stock/aprobaciones", permission: "gestionar_inventario" },
        ],
      },
    ],
  },
  {
    id: "compras",
    label: "Compras",
    icon: "local_shipping",
    permission: "ver_inventario",
    zone: "Comercial",
    children: [
      {
        label: "Configuración",
        icon: "tune",
        children: [
          { label: "Proveedores", icon: "storefront", route: "/inventario/proveedores", permission: "ver_inventario" },
        ],
      },
      {
        label: "Transacciones",
        icon: "sync_alt",
        children: [
          { label: "Órdenes de Compra", icon: "shopping_cart", route: "/compras/oc", permission: "ver_inventario" },
          { label: "Aprobación de OC", icon: "task_alt", route: "/compras/aprobaciones", permission: "aprobar_pedidos" },
          { label: "Facturas de Compra", icon: "receipt", route: "/compras/facturas", permission: "ver_inventario" },
          { label: "Recepciones", icon: "inventory", route: "/compras/recepciones", permission: "ver_inventario" },
        ],
      },
      {
        label: "Reportes",
        icon: "analytics",
        children: [
          { label: "Reportes de Compras", icon: "analytics", route: "/compras/reportes", permission: "ver_inventario" },
        ],
      },
    ],
  },
  {
    id: "egresos",
    label: "Egresos",
    icon: "account_balance_wallet",
    permission: "ver_egresos",
    zone: "Comercial",
    children: [
      {
        label: "Configuración",
        icon: "tune",
        children: [
          { label: "Categorías de Gasto", icon: "label", route: "/egresos/categorias", permission: "ver_egresos" },
        ],
      },
      {
        label: "Transacciones",
        icon: "sync_alt",
        children: [
          { label: "Lista de Egresos", icon: "receipt_long", route: "/egresos", permission: "ver_egresos" },
          { label: "Nuevo Egreso", icon: "add_circle", route: "/egresos/nuevo", permission: "gestionar_egresos" },
          { label: "Aprobación", icon: "task_alt", route: "/egresos/aprobacion", permission: "aprobar_egresos" },
          { label: "Pagos Pendientes", icon: "payments", route: "/egresos/pagos", permission: "pagar_egresos" },
        ],
      },
    ],
  },
  {
    id: "ventas",
    label: "Ventas",
    icon: "point_of_sale",
    permission: "ver_ventas",
    zone: "Comercial",
    children: [
      {
        label: "Configuración",
        icon: "tune",
        children: [
          { label: "Timbrados", icon: "verified", route: "/ventas/timbrados", permission: "ver_ventas" },
          { label: "Clientes", icon: "badge", route: "/clientes", permission: "ver_clientes" },
          { label: "Servicios", icon: "medical_services", route: "/ventas/servicios", permission: "ver_ventas" },
        ],
      },
      {
        label: "Transacciones",
        icon: "sync_alt",
        children: [
          { label: "Presupuestos", icon: "description", route: "/ventas/presupuestos", permission: "registrar_venta" },
          { label: "Nueva Venta", icon: "add_shopping_cart", route: "/ventas/nueva", permission: "registrar_venta" },
          { label: "Lista de Ventas", icon: "list_alt", route: "/ventas", permission: "ver_ventas" },
          { label: "Cobros Pendientes", icon: "pending_actions", route: "/ventas/cobros-pendientes", permission: "ver_ventas" },
          { label: "Facturas de Venta", icon: "folder_open", route: "/ventas/facturas", permission: "ver_ventas" },
        ],
      },
    ],
  },
  {
    id: "laboratorio",
    label: "Laboratorio",
    icon: "biotech",
    permission: "ver_laboratorio",
    zone: "Comercial",
    children: [
      { label: "Pedidos",      icon: "science",      route: "/laboratorio/pedidos",      permission: "ver_laboratorio" },
      { label: "Aprobaciones", icon: "task_alt",     route: "/laboratorio/aprobaciones", permission: "gestionar_laboratorio" },
      { label: "Envíos y Recepciones", icon: "import_export", route: "/laboratorio/recepciones", permission: "gestionar_laboratorio" },
      { label: "Facturas",     icon: "receipt_long", route: "/laboratorio/facturas",     permission: "gestionar_laboratorio" },
    ],
  },
  {
    id: "caja",
    label: "Caja",
    icon: "payments",
    permission: "ver_ventas",
    zone: "Comercial",
    children: [
      {
        label: "Caja",
        icon: "point_of_sale",
        route: "/ventas/cierre",
        permission: "ver_ventas",
      },
      {
        label: "Historial de Caja",
        icon: "history",
        route: "/caja/historial",
        permission: "ver_ventas",
      },
      {
        label: "Aprobaciones",
        icon: "task_alt",
        route: "/caja/aprobaciones",
        permission: "aprobar_cierres_caja",
      },
    ],
  },
  {
    id: "reportes",
    label: "Reportes",
    icon: "analytics",
    route: "/reportes",
    permission: "ver_reportes",
    zone: "Gestión",
    children: [
      {
        label: "Reportes gerenciales",
        icon: "insights",
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
        label: "Reportes operativos",
        icon: "fact_check",
        children: [
          {
            label: "Ventas",
            icon: "receipt_long",
            route: "/reportes/operativo/ventas",
            permission: "ver_reportes",
          },
          {
            label: "Compras",
            icon: "shopping_cart",
            route: "/reportes/operativo/compras",
            permission: "ver_reportes",
          },
          {
            label: "Mov. de inventario",
            icon: "inventory",
            route: "/reportes/operativo/inventario",
            permission: "ver_reportes",
          },
          {
            label: "Mov. de caja",
            icon: "account_balance_wallet",
            route: "/reportes/operativo/caja",
            permission: "ver_reportes",
          },
        ],
      },
    ],
  },
  {
    id: "personal",
    label: "Personal",
    icon: "people",
    permission: "ver_profesionales",
    zone: "Gestión",
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
    zone: "Gestión",
    children: [
      {
        label: "Accesos",
        icon: "admin_panel_settings",
        children: [
          { label: "Usuarios", icon: "manage_accounts", route: "/usuarios", permission: "ver_usuarios" },
          { label: "Roles y Permisos", icon: "shield_person", route: "/roles", permission: "ver_roles" },
        ],
      },
      {
        label: "Empresa",
        icon: "domain",
        children: [
          { label: "Configuración", icon: "settings", route: "/admin/config", permission: "gestionar_configuracion" },
          { label: "Sucursales", icon: "store", route: "/admin/sucursales", permission: "ver_sucursales" },
          { label: "Ubicaciones", icon: "map", route: "/admin/ubicaciones", permission: "gestionar_configuracion" },
          { label: "Auditoría", icon: "history", route: "/admin/auditoria", permission: "ver_usuarios" },
        ],
      },
    ],
  },
]

/** Primera ruta (hoja) accesible según permisos, recorriendo subgrupos anidados. Fallback "/". */
export function firstAccessibleRoute(permissions: string[]): string {
  const allowed = (p?: string) => !p || permissions.includes(p)
  const firstLeaf = (children: MenuChild[]): string | null => {
    for (const c of children) {
      if (c.children) {
        const r = firstLeaf(c.children)
        if (r) return r
      } else if (c.route && allowed(c.permission)) {
        return c.route
      }
    }
    return null
  }
  for (const item of menuConfig) {
    if (item.route && allowed(item.permission)) return item.route
    if (item.children) {
      const r = firstLeaf(item.children)
      if (r) return r
    }
  }
  return "/"
}
