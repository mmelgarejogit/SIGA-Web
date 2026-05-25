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
      path: "/inventario/productos",
      name: "inventario-productos",
      component: () => import("@/views/ProductosView.vue"),
      meta: { requiresAuth: true, permission: "ver_inventario", label: "Productos" },
    },
    {
      path: "/inventario/categorias",
      name: "inventario-categorias",
      component: () => import("@/views/CategoriasProductoView.vue"),
      meta: { requiresAuth: true, permission: "ver_inventario", label: "Categorías" },
    },
    {
      path: "/inventario/marcas",
      name: "inventario-marcas",
      component: () => import("@/views/MarcasView.vue"),
      meta: { requiresAuth: true, permission: "ver_inventario", label: "Marcas" },
    },
    {
      path: "/inventario/modelos",
      name: "inventario-modelos",
      component: () => import("@/views/ModelosView.vue"),
      meta: { requiresAuth: true, permission: "ver_inventario", label: "Modelos" },
    },
    {
      path: "/inventario/movimientos",
      name: "inventario-movimientos",
      component: () => import("@/views/MovimientosView.vue"),
      meta: { requiresAuth: true, permission: "ver_inventario", label: "Movimientos de Stock" },
    },
    {
      path: "/inventario/pedidos",
      name: "inventario-pedidos",
      component: () => import("@/views/PedidosView.vue"),
      meta: { requiresAuth: true, permission: "ver_inventario", label: "Órdenes de Compra" },
    },
    {
      path: "/compras/facturas",
      name: "compras-facturas",
      component: () => import("@/views/FacturasCompraView.vue"),
      meta: { requiresAuth: true, permission: "ver_inventario", label: "Facturas de Compra" },
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
      path: "/inventario/proveedores",
      name: "inventario-proveedores",
      component: () => import("@/views/ProveedoresView.vue"),
      meta: { requiresAuth: true, permission: "ver_inventario", label: "Proveedores" },
    },
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
      path: "/egresos/categorias",
      name: "egresos-categorias",
      component: () => import("@/views/CategoriasGastoView.vue"),
      meta: { requiresAuth: true, permission: "ver_egresos", label: "Categorías de Gasto" },
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
    {
      path: "/inventario",
      name: "inventario",
      component: () => import("@/views/ComingSoonView.vue"),
      meta: { requiresAuth: true, permission: "ver_inventario", label: "Inventario" },
    },
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
