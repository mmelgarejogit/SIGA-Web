import { createRouter, createWebHistory } from "vue-router"
import type { RouteMeta } from "vue-router"
import DashboardView from "@/views/DashboardView.vue"
import LoginView from "@/views/LoginView.vue"
import RegisterView from "@/views/RegisterView.vue"
import PacientesView from "@/views/PacientesView.vue"
import PacienteDetailView from "@/views/PacienteDetailView.vue"
import UsuariosView from "@/views/UsuariosView.vue"
import { useAuthStore } from "@/stores/auth"
import { menuConfig } from "@/config/menuConfig"

declare module "vue-router" {
  interface RouteMeta {
    requiresAuth?: boolean
    requiresGuest?: boolean
    permission?: string
    label?: string
  }
}

function findFirstAccessibleRoute(permissions: string[]): string {
  for (const item of menuConfig) {
    if (item.route && (!item.permission || permissions.includes(item.permission))) {
      return item.route
    }
    if (item.children) {
      for (const child of item.children) {
        if (!child.permission || permissions.includes(child.permission)) {
          return child.route
        }
      }
    }
  }
  return "/"
}

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: "/login",
      name: "login",
      component: LoginView,
      meta: { requiresGuest: true },
    },
    {
      path: "/registro",
      name: "registro",
      component: RegisterView,
      meta: { requiresGuest: true },
    },
    {
      path: "/verificar-email",
      name: "verificar-email",
      component: () => import("@/views/VerifyEmailView.vue"),
    },
    {
      path: "/confirmar-turno",
      name: "confirmar-turno",
      component: () => import("@/views/ConfirmarTurnoView.vue"),
    },
    {
      path: "/",
      name: "dashboard",
      component: DashboardView,
      meta: { requiresAuth: true, permission: "ver_dashboard" },
    },
    {
      path: "/pacientes",
      name: "pacientes",
      component: PacientesView,
      meta: { requiresAuth: true, permission: "ver_pacientes" },
    },
    {
      path: "/pacientes/nuevo",
      name: "paciente-nuevo",
      component: () => import("@/views/PacienteNuevoView.vue"),
      meta: { requiresAuth: true, permission: "crear_paciente" },
    },
    {
      path: "/pacientes/:id",
      name: "paciente-detail",
      component: PacienteDetailView,
      meta: { requiresAuth: true },
    },
    {
      path: "/usuarios",
      name: "usuarios",
      component: UsuariosView,
      meta: { requiresAuth: true, permission: "ver_usuarios" },
    },
    {
      path: "/usuarios/nuevo",
      name: "usuarios-nuevo",
      component: () => import("@/views/UsuarioNuevoView.vue"),
      meta: { requiresAuth: true, permission: "ver_usuarios", label: "Nuevo Usuario" },
    },
    {
      path: "/profesionales",
      name: "profesionales",
      component: () => import("@/views/ProfesionalesView.vue"),
      meta: { requiresAuth: true, permission: "ver_profesionales" },
    },
    {
      path: "/agenda",
      name: "agenda",
      component: () => import("@/views/AgendaView.vue"),
      meta: { requiresAuth: true, permission: "ver_agenda" },
    },
    {
      path: "/agenda/nueva",
      name: "agenda-nueva",
      component: () => import("@/views/AgendaView.vue"),
      meta: { requiresAuth: true, permission: "gestionar_agenda" },
    },
    {
      path: "/recepcion",
      name: "recepcion",
      component: () => import("@/views/RecepcionView.vue"),
      meta: { requiresAuth: true, permission: "ver_recepcion", label: "Recepción" },
    },
    {
      path: "/mis-turnos",
      name: "mis-turnos",
      component: () => import("@/views/MisTurnosView.vue"),
      meta: { requiresAuth: true, permission: "ver_mis_turnos", label: "Mis Turnos" },
    },
    {
      path: "/clinica",
      redirect: "/clinica/consultas",
    },
    {
      path: "/clinica/consultas",
      name: "clinica-consultas",
      component: () => import("@/views/ConsultaListView.vue"),
      meta: { requiresAuth: true, permission: "ver_consultas", label: "Consultas" },
    },
    {
      path: "/clinica/consultas/nueva",
      name: "clinica-consultas-nueva",
      component: () => import("@/views/ConsultaFormView.vue"),
      meta: { requiresAuth: true, permission: "registrar_consulta", label: "Nueva Consulta" },
    },
    {
      path: "/clinica/historial",
      name: "clinica-historial",
      component: () => import("@/views/HistorialClinicoView.vue"),
      meta: { requiresAuth: true, permission: "ver_consultas", label: "Historial Clínico" },
    },
    {
      path: "/clinica/recetas",
      name: "clinica-recetas",
      component: () => import("@/views/ComingSoonView.vue"),
      meta: { requiresAuth: true, permission: "ver_recetas", label: "Recetas" },
    },
    {
      path: "/productos",
      name: "productos",
      component: () => import("@/views/ProductosView.vue"),
      meta: { requiresAuth: true, permission: "ver_inventario", label: "Productos" },
    },
    {
      path: "/productos/categorias",
      name: "productos-categorias",
      component: () => import("@/views/CategoriasProductoView.vue"),
      meta: { requiresAuth: true, permission: "ver_inventario", label: "Categorías" },
    },
    {
      path: "/productos/marcas",
      name: "productos-marcas",
      component: () => import("@/views/MarcasView.vue"),
      meta: { requiresAuth: true, permission: "ver_inventario", label: "Marcas" },
    },
    {
      path: "/productos/modelos",
      name: "productos-modelos",
      component: () => import("@/views/ModelosView.vue"),
      meta: { requiresAuth: true, permission: "ver_inventario", label: "Modelos" },
    },
    { path: "/inventario/productos", redirect: "/productos" },
    { path: "/inventario/categorias", redirect: "/productos/categorias" },
    { path: "/inventario/marcas", redirect: "/productos/marcas" },
    { path: "/inventario/modelos", redirect: "/productos/modelos" },
    {
      path: "/stock",
      name: "stock",
      component: () => import("@/views/StockSucursalView.vue"),
      meta: { requiresAuth: true, permission: "ver_inventario", label: "Stock por Sucursal" },
    },
    {
      path: "/stock/movimientos",
      name: "stock-movimientos",
      component: () => import("@/views/MovimientosInventarioView.vue"),
      meta: { requiresAuth: true, permission: "ver_inventario", label: "Historial de Movimientos" },
    },
    {
      path: "/stock/ajustes",
      name: "stock-ajustes",
      component: () => import("@/views/AjustesView.vue"),
      meta: { requiresAuth: true, permission: "ver_inventario", label: "Ajustes Manuales" },
    },
    {
      path: "/stock/ajustes/nuevo",
      name: "stock-ajustes-nuevo",
      component: () => import("@/views/AjusteFormView.vue"),
      meta: { requiresAuth: true, permission: "ver_inventario", label: "Nuevo Ajuste" },
    },
    {
      path: "/stock/ajustes/:id",
      name: "stock-ajuste-detail",
      component: () => import("@/views/AjusteDetailView.vue"),
      meta: { requiresAuth: true, permission: "ver_inventario", label: "Detalle de Ajuste" },
    },
    {
      path: "/stock/transferencias",
      name: "stock-transferencias",
      component: () => import("@/views/TransferenciasView.vue"),
      meta: { requiresAuth: true, permission: "ver_inventario", label: "Transferencias" },
    },
    {
      path: "/stock/transferencias/nueva",
      name: "stock-transferencias-nueva",
      component: () => import("@/views/TransferenciaFormView.vue"),
      meta: { requiresAuth: true, permission: "ver_inventario", label: "Nueva Transferencia" },
    },
    {
      path: "/stock/transferencias/:id",
      name: "stock-transferencia-detail",
      component: () => import("@/views/TransferenciaDetailView.vue"),
      meta: { requiresAuth: true, permission: "ver_inventario", label: "Detalle de Transferencia" },
    },
    {
      path: "/stock/sucursales",
      name: "stock-sucursales",
      component: () => import("@/views/SucursalesView.vue"),
      meta: { requiresAuth: true, permission: "ver_inventario", label: "Sucursales" },
    },
    {
      path: "/stock/config/parametros",
      name: "stock-parametros",
      component: () => import("@/views/ParametrosStockView.vue"),
      meta: { requiresAuth: true, permission: "gestionar_configuracion", label: "Parámetros de Stock" },
    },
    {
      path: "/stock/config/tipos-ajuste",
      name: "stock-tipos-ajuste",
      component: () => import("@/views/TiposAjusteView.vue"),
      meta: { requiresAuth: true, permission: "gestionar_configuracion", label: "Tipos de Ajuste" },
    },
    {
      path: "/stock/fisico",
      name: "stock-fisico",
      component: () => import("@/views/InventarioFisicoView.vue"),
      meta: { requiresAuth: true, permission: "ver_inventario", label: "Inventario Físico" },
    },
    {
      path: "/stock/fisico/nuevo",
      name: "stock-fisico-nuevo",
      component: () => import("@/views/InventarioFisicoNuevoView.vue"),
      meta: { requiresAuth: true, permission: "gestionar_inventario", label: "Nueva Sesión" },
    },
    {
      path: "/stock/fisico/:id",
      name: "stock-fisico-detail",
      component: () => import("@/views/InventarioFisicoDetailView.vue"),
      meta: { requiresAuth: true, permission: "ver_inventario", label: "Detalle Inventario Físico" },
    },
    {
      path: "/stock/fisico/:id/conteo",
      name: "stock-fisico-conteo",
      component: () => import("@/views/InventarioFisicoConteoView.vue"),
      meta: { requiresAuth: true, permission: "ver_inventario", label: "Hoja de Conteo" },
    },
    { path: "/inventario/movimientos", redirect: "/stock/movimientos" },
    {
      path: "/compras/oc",
      name: "compras-oc",
      component: () => import("@/views/PedidosView.vue"),
      meta: { requiresAuth: true, permission: "ver_inventario", label: "Órdenes de Compra" },
    },
    {
      path: "/inventario/pedidos",
      redirect: "/compras/oc",
    },
    {
      path: "/compras/facturas",
      name: "compras-facturas",
      component: () => import("@/views/FacturasCompraView.vue"),
      meta: { requiresAuth: true, permission: "ver_inventario", label: "Facturas de Compra" },
    },
    {
      path: "/compras/facturas/nueva",
      name: "compras-facturas-nueva",
      component: () => import("@/views/FacturaFormView.vue"),
      meta: { requiresAuth: true, permission: "gestionar_pedidos", label: "Nueva Factura" },
    },
    {
      path: "/compras/facturas/:id",
      name: "compras-facturas-detail",
      component: () => import("@/views/FacturaDetailView.vue"),
      meta: { requiresAuth: true, permission: "ver_inventario", label: "Detalle Factura" },
    },
    {
      path: "/compras/oc/aprobacion",
      name: "compras-oc-aprobacion",
      component: () => import("@/views/OcAprobacionView.vue"),
      meta: { requiresAuth: true, permission: "aprobar_pedidos", label: "Aprobación de OC" },
    },
    {
      path: "/compras/oc/nueva",
      name: "compras-oc-nueva",
      component: () => import("@/views/OcFormView.vue"),
      meta: { requiresAuth: true, permission: "gestionar_pedidos", label: "Nueva Orden de Compra" },
    },
    {
      path: "/compras/oc/:id/editar",
      name: "compras-oc-editar",
      component: () => import("@/views/OcFormView.vue"),
      meta: { requiresAuth: true, permission: "gestionar_pedidos", label: "Editar OC" },
    },
    {
      path: "/compras/recepciones",
      name: "compras-recepciones",
      component: () => import("@/views/RecepcionesView.vue"),
      meta: { requiresAuth: true, permission: "ver_inventario", label: "Recepciones" },
    },
    {
      path: "/compras/recepciones/nueva",
      name: "compras-recepciones-nueva",
      component: () => import("@/views/RecepcionFormView.vue"),
      meta: { requiresAuth: true, permission: "gestionar_pedidos", label: "Nueva Recepción" },
    },
    {
      path: "/compras/recepciones/:id",
      name: "compras-recepciones-detail",
      component: () => import("@/views/RecepcionDetailView.vue"),
      meta: { requiresAuth: true, permission: "ver_inventario", label: "Detalle Recepción" },
    },
    {
      path: "/compras/oc/:id",
      name: "compras-oc-detail",
      component: () => import("@/views/OcDetailView.vue"),
      meta: { requiresAuth: true, permission: "ver_inventario", label: "Detalle OC" },
    },
    {
      path: "/compras/reportes",
      name: "compras-reportes",
      component: () => import("@/views/ComprasReportesView.vue"),
      meta: { requiresAuth: true, permission: "ver_inventario", label: "Reportes de Compras" },
    },
    {
      path: "/productos/proveedores",
      name: "productos-proveedores",
      component: () => import("@/views/ProveedoresView.vue"),
      meta: { requiresAuth: true, permission: "ver_inventario", label: "Proveedores" },
    },
    { path: "/inventario/proveedores", redirect: "/productos/proveedores" },
    {
      path: "/ventas",
      name: "ventas",
      component: () => import("@/views/VentasView.vue"),
      meta: { requiresAuth: true, permission: "ver_ventas", label: "Historial de Ventas" },
    },
    {
      path: "/ventas/nueva",
      name: "ventas-nueva",
      component: () => import("@/views/VentasNuevaView.vue"),
      meta: { requiresAuth: true, permission: "registrar_venta", label: "Nueva Venta" },
    },
    {
      path: "/ventas/cierre",
      name: "ventas-cierre",
      component: () => import("@/views/VentasCierreView.vue"),
      meta: { requiresAuth: true, permission: "ver_ventas", label: "Cierre de Caja" },
    },
    {
      path: "/ventas/devoluciones",
      name: "ventas-devoluciones",
      component: () => import("@/views/ComingSoonView.vue"),
      meta: { requiresAuth: true, permission: "ver_ventas", label: "Devoluciones" },
    },
    {
      path: "/reportes/citas",
      name: "reportes-citas",
      component: () => import("@/views/ComingSoonView.vue"),
      meta: { requiresAuth: true, permission: "ver_reportes", label: "Reportes de Citas" },
    },
    {
      path: "/reportes/ventas",
      name: "reportes-ventas",
      component: () => import("@/views/ComingSoonView.vue"),
      meta: { requiresAuth: true, permission: "ver_reportes", label: "Reportes de Ventas" },
    },
    {
      path: "/reportes/inventario",
      name: "reportes-inventario",
      component: () => import("@/views/ComingSoonView.vue"),
      meta: { requiresAuth: true, permission: "ver_reportes", label: "Reporte de Inventario" },
    },
    {
      path: "/admin/config",
      name: "admin-config",
      component: () => import("@/views/ConfiguracionView.vue"),
      meta: { requiresAuth: true, permission: "gestionar_configuracion", label: "Configuración" },
    },
    {
      path: "/egresos",
      name: "egresos",
      component: () => import("@/views/EgresosView.vue"),
      meta: { requiresAuth: true, permission: "ver_egresos", label: "Egresos" },
    },
    {
      path: "/egresos/nuevo",
      name: "egresos-nuevo",
      component: () => import("@/views/NuevoEgresoView.vue"),
      meta: { requiresAuth: true, permission: "gestionar_egresos", label: "Nueva Solicitud" },
    },
    {
      path: "/egresos/aprobacion",
      name: "egresos-aprobacion",
      component: () => import("@/views/AprobacionEgresosView.vue"),
      meta: { requiresAuth: true, permission: "aprobar_egresos", label: "Aprobación de Egresos" },
    },
    {
      path: "/egresos/pagos",
      name: "egresos-pagos",
      component: () => import("@/views/PagosEgresosView.vue"),
      meta: { requiresAuth: true, permission: "pagar_egresos", label: "Pagos Pendientes" },
    },
    {
      path: "/egresos/categorias",
      name: "egresos-categorias",
      component: () => import("@/views/CategoriasGastoView.vue"),
      meta: { requiresAuth: true, permission: "ver_egresos", label: "Categorías de Gasto" },
    },
    {
      path: "/egresos/pagos/:id",
      name: "egresos-pago",
      component: () => import("@/views/PagoEgresoView.vue"),
      meta: { requiresAuth: true, permission: "pagar_egresos", label: "Registrar Pago" },
    },
    {
      path: "/egresos/:id",
      name: "egresos-detalle",
      component: () => import("@/views/EgresoDetalleView.vue"),
      meta: { requiresAuth: true, permission: "ver_egresos", label: "Detalle de Egreso" },
    },
    {
      path: "/egresos/reportes/tipo-categoria",
      name: "egresos-reportes-tipo-categoria",
      component: () => import("@/views/ComingSoonView.vue"),
      meta: { requiresAuth: true, permission: "ver_egresos", label: "Por tipo y categoría" },
    },
    {
      path: "/egresos/reportes/estado",
      name: "egresos-reportes-estado",
      component: () => import("@/views/ComingSoonView.vue"),
      meta: { requiresAuth: true, permission: "ver_egresos", label: "Por estado" },
    },
    {
      path: "/egresos/reportes/medio-pago",
      name: "egresos-reportes-medio-pago",
      component: () => import("@/views/ComingSoonView.vue"),
      meta: { requiresAuth: true, permission: "ver_egresos", label: "Por medio de pago" },
    },
    {
      path: "/egresos/reportes/total-periodo",
      name: "egresos-reportes-total-periodo",
      component: () => import("@/views/ComingSoonView.vue"),
      meta: { requiresAuth: true, permission: "ver_egresos", label: "Total por período" },
    },
    {
      path: "/personal/empleados",
      name: "personal-empleados",
      component: () => import("@/views/EmpleadosView.vue"),
      meta: { requiresAuth: true, permission: "ver_empleados", label: "Empleados" },
    },
    {
      path: "/personal/empleados/cargos",
      name: "personal-empleados-cargos",
      component: () => import("@/views/CargosEmpleadoView.vue"),
      meta: { requiresAuth: true, permission: "ver_empleados", label: "Cargos de Empleados" },
    },
    {
      path: "/personal/especialidades",
      name: "personal-especialidades",
      component: () => import("@/views/EspecialidadesView.vue"),
      meta: { requiresAuth: true, permission: "ver_especialidades", label: "Especialidades" },
    },
    {
      path: "/roles",
      name: "roles",
      component: () => import("@/views/RolesView.vue"),
      meta: { requiresAuth: true, permission: "ver_roles", label: "Roles y Permisos" },
    },
    {
      path: "/roles/nuevo",
      name: "roles-nuevo",
      component: () => import("@/views/RolFormView.vue"),
      meta: { requiresAuth: true, permission: "crear_rol", label: "Nuevo Rol" },
    },
    {
      path: "/roles/:id/editar",
      name: "roles-editar",
      component: () => import("@/views/RolFormView.vue"),
      meta: { requiresAuth: true, permission: "editar_rol", label: "Editar Rol" },
    },
    {
      path: "/admin/auditoria",
      name: "admin-auditoria",
      component: () => import("@/views/ComingSoonView.vue"),
      meta: { requiresAuth: true, permission: "ver_usuarios", label: "Auditoría" },
    },
    {
      path: "/notificaciones",
      name: "notificaciones",
      component: () => import("@/views/ComingSoonView.vue"),
      meta: { requiresAuth: true, permission: "ver_notificaciones", label: "Notificaciones" },
    },
    { path: "/inventario", redirect: "/productos" },
    {
      path: "/reportes",
      name: "reportes",
      component: () => import("@/views/ComingSoonView.vue"),
      meta: { requiresAuth: true, permission: "ver_reportes", label: "Reportes" },
    },
  ],
})

router.beforeEach((to) => {
  const auth = useAuthStore()

  if (to.meta.requiresAuth && !auth.isAuthenticated) return { name: "login" }

  if (to.meta.requiresGuest && auth.isAuthenticated) {
    const fallback = findFirstAccessibleRoute(auth.user?.permissions ?? [])
    return fallback === "/" ? { name: "dashboard" } : fallback
  }

  if (to.meta.permission && !auth.hasPermission(to.meta.permission)) {
    const fallback = findFirstAccessibleRoute(auth.user?.permissions ?? [])
    // Si no hay ninguna ruta accesible o el fallback es la misma ruta que falló, dejamos pasar
    // para evitar el loop infinito. El contenido de la vista puede manejar el estado vacío.
    if (!fallback || fallback === to.path) return true
    return fallback
  }
})

export default router
