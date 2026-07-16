import { createRouter, createWebHistory } from "vue-router"
import type { RouteMeta } from "vue-router"
import DashboardView from "@/views/DashboardView.vue"
import LoginView from "@/views/LoginView.vue"
import RegisterView from "@/views/RegisterView.vue"
import PacientesView from "@/views/PacientesView.vue"
import PacienteDetailView from "@/views/PacienteDetailView.vue"
import UsuariosView from "@/views/UsuariosView.vue"
import { useAuthStore } from "@/stores/auth"
import { firstAccessibleRoute } from "@/config/menuConfig"

declare module "vue-router" {
  interface RouteMeta {
    requiresAuth?: boolean
    requiresGuest?: boolean
    permission?: string
    label?: string
  }
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
      path: "/cambiar-contrasena",
      name: "cambiar-contrasena",
      component: () => import("@/views/CambiarContrasenaObligatoriaView.vue"),
      meta: { requiresAuth: true },
    },
    {
      path: "/verificar-email",
      name: "verificar-email",
      component: () => import("@/views/VerifyEmailView.vue"),
    },
    {
      path: "/olvide-contrasena",
      name: "olvide-contrasena",
      component: () => import("@/views/OlvideContrasenaView.vue"),
      meta: { requiresGuest: true },
    },
    {
      path: "/restablecer-contrasena",
      name: "restablecer-contrasena",
      component: () => import("@/views/RestablecerContrasenaView.vue"),
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
      path: "/clientes",
      name: "clientes",
      component: () => import("@/views/ClientesView.vue"),
      meta: { requiresAuth: true, permission: "ver_clientes" },
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
      path: "/mi-historial",
      name: "mi-historial",
      component: () => import("@/views/MiHistorialView.vue"),
      meta: { requiresAuth: true, permission: "ver_mis_turnos", label: "Mi Historial" },
    },
    {
      path: "/mis-recetas",
      name: "mis-recetas",
      component: () => import("@/views/MisRecetasView.vue"),
      meta: { requiresAuth: true, permission: "ver_mis_turnos", label: "Mis Recetas" },
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
      path: "/clinica/consultas/:id/editar",
      name: "clinica-consultas-editar",
      component: () => import("@/views/ConsultaEditView.vue"),
      meta: { requiresAuth: true, permission: "editar_consulta", label: "Editar Consulta" },
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
      path: "/inventario/tipos-lente",
      name: "inventario-tipos-lente",
      component: () => import("@/views/TipoLentesView.vue"),
      meta: { requiresAuth: true, permission: "ver_inventario", label: "Tipos de Lente" },
    },
    {
      path: "/inventario/tratamientos",
      name: "inventario-tratamientos",
      component: () => import("@/views/TratamientosView.vue"),
      meta: { requiresAuth: true, permission: "ver_inventario", label: "Tratamientos" },
    },
    {
      path: "/stock",
      name: "stock",
      component: () => import("@/views/StockView.vue"),
      meta: { requiresAuth: true, permission: "ver_inventario", label: "Niveles de Stock" },
    },
    {
      path: "/stock/movimientos",
      name: "stock-movimientos",
      component: () => import("@/views/MovimientosView.vue"),
      meta: { requiresAuth: true, permission: "ver_inventario", label: "Movimientos de Stock" },
    },
    {
      path: "/stock/movimientos/nuevo",
      name: "stock-movimientos-nuevo",
      component: () => import("@/views/MovimientoFormView.vue"),
      meta: { requiresAuth: true, permission: "gestionar_inventario", label: "Nuevo Movimiento" },
    },
    {
      path: "/stock/motivos",
      name: "stock-motivos",
      component: () => import("@/views/MotivosMovimientoView.vue"),
      meta: { requiresAuth: true, permission: "ver_inventario", label: "Motivos de Movimiento" },
    },
    {
      path: "/stock/aprobaciones",
      name: "stock-aprobaciones",
      component: () => import("@/views/AprobacionesView.vue"),
      meta: { requiresAuth: true, permission: "gestionar_inventario", label: "Aprobaciones" },
    },
    {
      path: "/stock/conteos",
      name: "stock-conteos",
      component: () => import("@/views/ConteoAprobacionView.vue"),
      meta: { requiresAuth: true, permission: "gestionar_inventario", label: "Historial" },
    },
    {
      path: "/stock/conteos/:id",
      name: "stock-conteo-revisar",
      component: () => import("@/views/ConteoRevisarView.vue"),
      meta: { requiresAuth: true, permission: "gestionar_inventario", label: "Revisión de Inventario" },
    },
    {
      path: "/stock/conteo/nuevo",
      name: "stock-conteo-nuevo",
      component: () => import("@/views/ConteoFormView.vue"),
      meta: { requiresAuth: true, permission: "ver_inventario", label: "Nuevo Inventario" },
    },
    {
      path: "/inventario/movimientos",
      redirect: "/stock/movimientos",
    },
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
      path: "/compras/aprobaciones",
      name: "compras-aprobaciones",
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
      component: () => import("@/views/ReportesComprasView.vue"),
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
      meta: { requiresAuth: true, permission: "ver_ventas", label: "Lista de Ventas" },
    },
    {
      path: "/ventas/nueva",
      name: "ventas-nueva",
      component: () => import("@/views/VentasNuevaView.vue"),
      meta: { requiresAuth: true, permission: "registrar_venta", label: "Nueva Venta" },
    },
    {
      path: "/ventas/presupuestos",
      name: "ventas-presupuestos",
      component: () => import("@/views/PresupuestosView.vue"),
      meta: { requiresAuth: true, permission: "registrar_venta", label: "Presupuestos" },
    },
    {
      path: "/ventas/presupuestos/nuevo",
      name: "ventas-presupuesto-nuevo",
      component: () => import("@/views/PresupuestoNuevoView.vue"),
      meta: { requiresAuth: true, permission: "registrar_venta", label: "Nuevo Presupuesto" },
    },
    {
      path: "/laboratorio/pedidos",
      name: "laboratorio-pedidos",
      component: () => import("@/views/TrabajosPedidoView.vue"),
      meta: { requiresAuth: true, permission: "ver_laboratorio", label: "Pedidos a Laboratorio" },
    },
    {
      path: "/laboratorio/aprobaciones",
      name: "laboratorio-aprobaciones",
      component: () => import("@/views/TrabajosPedidoAprobacionView.vue"),
      meta: { requiresAuth: true, permission: "gestionar_laboratorio", label: "Aprobaciones Lab" },
    },
    {
      path: "/laboratorio/recepciones",
      name: "laboratorio-recepciones",
      component: () => import("@/views/TrabajosPedidoRecepcionesView.vue"),
      meta: { requiresAuth: true, permission: "gestionar_laboratorio", label: "Envíos y Recepciones" },
    },
    {
      path: "/laboratorio/facturas",
      name: "laboratorio-facturas",
      component: () => import("@/views/TrabajosPedidoFacturasView.vue"),
      meta: { requiresAuth: true, permission: "gestionar_laboratorio", label: "Facturas Lab" },
    },
    {
      path: "/ventas/cobros-pendientes",
      name: "ventas-cobros-pendientes",
      component: () => import("@/views/CobrosPendientesView.vue"),
      meta: { requiresAuth: true, permission: "ver_ventas", label: "Cobros Pendientes" },
    },
    {
      path: "/ventas/devoluciones",
      name: "ventas-devoluciones",
      component: () => import("@/views/DevolucionesPendientesView.vue"),
      meta: { requiresAuth: true, permission: "gestionar_ventas", label: "Devoluciones" },
    },
    {
      path: "/ventas/:id(\\d+)/cobrar",
      name: "venta-cobrar",
      component: () => import("@/views/VentaCobrarView.vue"),
      meta: { requiresAuth: true, permission: "registrar_venta", label: "Cobrar Venta" },
    },
    {
      path: "/ventas/:id(\\d+)/comprobante",
      name: "venta-comprobante",
      component: () => import("@/views/VentaComprobanteView.vue"),
      meta: { requiresAuth: true, permission: "registrar_venta", label: "Emitir Documento" },
    },
    {
      path: "/ventas/:id(\\d+)",
      name: "venta-detalle",
      component: () => import("@/views/VentaDetalleView.vue"),
      meta: { requiresAuth: true, permission: "ver_ventas", label: "Detalle de Venta" },
    },
    {
      path: "/ventas/facturas",
      name: "ventas-facturas",
      component: () => import("@/views/FacturasVentaView.vue"),
      meta: { requiresAuth: true, permission: "ver_ventas", label: "Historial de Facturas" },
    },
    {
      path: "/ventas/timbrados",
      name: "ventas-timbrados",
      component: () => import("@/views/TimbradosView.vue"),
      meta: { requiresAuth: true, permission: "ver_ventas", label: "Timbrados" },
    },
    {
      path: "/ventas/servicios",
      name: "ventas-servicios",
      component: () => import("@/views/ServiciosView.vue"),
      meta: { requiresAuth: true, permission: "ver_ventas", label: "Servicios" },
    },
    {
      path: "/ventas/cierre",
      name: "ventas-cierre",
      component: () => import("@/views/VentasCierreView.vue"),
      meta: { requiresAuth: true, permission: "ver_ventas", label: "Caja" },
    },
    {
      path: "/caja/historial",
      name: "caja-historial",
      component: () => import("@/views/CajaHistorialView.vue"),
      meta: { requiresAuth: true, permission: "ver_ventas", label: "Historial de Caja" },
    },
    {
      path: "/caja/aprobaciones",
      name: "caja-aprobaciones",
      component: () => import("@/views/CajaAprobacionesView.vue"),
      meta: { requiresAuth: true, permission: "aprobar_cierres_caja", label: "Aprobaciones de Caja" },
    },
    {
      path: "/reportes/citas",
      name: "reportes-citas",
      component: () => import("@/views/ReportesCitasView.vue"),
      meta: { requiresAuth: true, permission: "ver_reportes", label: "Reportes de Citas" },
    },
    {
      path: "/reportes/ventas",
      name: "reportes-ventas",
      component: () => import("@/views/ReportesVentasView.vue"),
      meta: { requiresAuth: true, permission: "ver_reportes", label: "Reportes de Ventas" },
    },
    {
      path: "/reportes/inventario",
      name: "reportes-inventario",
      component: () => import("@/views/ReportesInventarioView.vue"),
      meta: { requiresAuth: true, permission: "ver_reportes", label: "Reporte de Inventario" },
    },
    {
      path: "/reportes/operativo/:tipo",
      name: "reportes-operativo",
      component: () => import("@/views/ReporteOperativoView.vue"),
      meta: { requiresAuth: true, permission: "ver_reportes", label: "Reporte operativo" },
    },
    {
      path: "/admin/config",
      name: "admin-config",
      component: () => import("@/views/ConfiguracionView.vue"),
      meta: { requiresAuth: true, permission: "gestionar_configuracion", label: "Configuración" },
    },
    {
      path: "/admin/ubicaciones",
      name: "admin-ubicaciones",
      component: () => import("@/views/UbicacionesView.vue"),
      meta: { requiresAuth: true, permission: "gestionar_configuracion", label: "Ubicaciones" },
    },
    {
      path: "/admin/sucursales",
      name: "admin-sucursales",
      component: () => import("@/views/SucursalesView.vue"),
      meta: { requiresAuth: true, permission: "ver_sucursales", label: "Sucursales" },
    },
    {
      path: "/stock/transferencias",
      name: "stock-transferencias",
      component: () => import("@/views/TransferenciasView.vue"),
      meta: { requiresAuth: true, permission: "transferir_stock", label: "Transferencias" },
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
      meta: { requiresAuth: true, permission: "gestionar_egresos", label: "Nuevo Egreso" },
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
      component: () => import("@/views/NotificacionesView.vue"),
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
      component: () => import("@/views/ReportesHubView.vue"),
      meta: { requiresAuth: true, permission: "ver_reportes", label: "Reportes" },
    },
  ],
})

router.beforeEach((to) => {
  const auth = useAuthStore()

  if (to.meta.requiresAuth && !auth.isAuthenticated) return { name: "login" }

  if (auth.isAuthenticated && auth.user?.mustChangePassword && to.path !== "/cambiar-contrasena") {
    return "/cambiar-contrasena"
  }

  if (to.meta.requiresGuest && auth.isAuthenticated) {
    const fallback = firstAccessibleRoute(auth.user?.permissions ?? [])
    return fallback === "/" ? { name: "dashboard" } : fallback
  }

  if (to.meta.permission && !auth.hasPermission(to.meta.permission)) {
    const fallback = firstAccessibleRoute(auth.user?.permissions ?? [])
    // Si no hay ninguna ruta accesible o el fallback es la misma ruta que falló, dejamos pasar
    // para evitar el loop infinito. El contenido de la vista puede manejar el estado vacío.
    if (!fallback || fallback === to.path) return true
    return fallback
  }
})

export default router
