import { useHttp } from "@/composables/useHttp"

const { get, post, put, delete: del } = useHttp()

// ── Tipos ──────────────────────────────────────────────────────────────────────

export type EstadoVenta =
  | "Borrador"
  | "Confirmada"
  | "EnProceso"
  | "ListaParaCobrar"
  | "ComprobanteEmitido"
  | "Cancelada"

export type TipoVenta      = "Directa" | "TrabajoAPedido"
export type CondicionVenta = "Contado" | "Credito"
export type MetodoPago     = "Efectivo" | "Tarjeta" | "Transferencia" | "Cheque"
export type TipoCobro      = "Seña" | "Cuota"
export type TipoDevolucion = "Devolucion" | "Cambio"
export type EstadoDevolucion = "Pendiente" | "Confirmada" | "Rechazada"
export type CategoriaFiscal = "Exento" | "Gravado5" | "Gravado10"
export type TipoLinea       = "Producto" | "Servicio" | "Lente"
export type TipoMovCaja     = "Ingreso" | "Egreso"
export type EstadoTrabajoPedido = "PendienteAprobacion" | "PendienteEnvio" | "Enviado" | "Recibido" | "Rechazado"
export type MedioEnvioLaboratorio = "WhatsApp" | "Email" | "Portal" | "Telefono" | "EnPersona" | "Otro"

export interface VentaLinea {
  id: number
  tipo: TipoLinea
  productoId?: number
  servicioId?: number
  descripcion: string
  cantidad: number
  precioUnitario: number
  descuento: number
  categoriaFiscal: CategoriaFiscal
  subtotal: number
}

export interface CobroLinea {
  id: number
  metodoPago: MetodoPago
  monto: number
  referencia?: string
}

export interface Cobro {
  id: number
  tipo: TipoCobro
  montoTotal: number
  fecha: string
  anulado: boolean
  lineas: CobroLinea[]
  createdAt: string
}

export interface FacturaVenta {
  id: number
  numeroFactura: string
  timbrado: string
  establecimiento: string
  montoExento: number
  montoGravado5: number
  montoGravado10: number
  iva5: number
  iva10: number
  total: number
  fechaEmision: string
  observaciones?: string
}

export interface Comprobante {
  id: number
  tipo: string
  estado: string
  motivoAnulacion?: string
  fechaEmision: string
  fechaAnulacion?: string
}

export interface TrabajoPedidoTratamiento {
  id: number
  nombre: string
}

export interface TrabajoPedido {
  id: number
  recetaId?: number
  tipoLenteId?: number
  tipoLenteNombre?: string
  tratamientos: TrabajoPedidoTratamiento[]
  armazonProductoId?: number
  armazonProductoNombre?: string
  armazonDelCliente: boolean
  laboratorioProveedorId?: number
  laboratorioNombre?: string
  estado: EstadoTrabajoPedido
  fechaEnvio?: string
  fechaRecepcion?: string
  observacion?: string
  createdAt: string
}

export interface DevolucionLinea {
  id: number
  productoDevueltoId: number
  productoDevueltoNombre: string
  cantidadDevuelta: number
  productoNuevoId?: number
  productoNuevoNombre?: string
  cantidadNueva?: number
}

export interface NotaCredito {
  id: number
  numeroNotaCredito: string
  timbrado: string
  montoExento: number
  montoGravado5: number
  montoGravado10: number
  total: number
  fechaEmision: string
}

export interface Devolucion {
  id: number
  ventaId: number
  numeroComprobante: string
  clienteNombre: string
  tipo: TipoDevolucion
  estado: EstadoDevolucion
  motivo: string
  solicitadoPorNombre: string
  confirmadoPorNombre?: string
  observacionesRevision?: string
  fechaRevision?: string
  lineas: DevolucionLinea[]
  notaCredito?: NotaCredito | null
  createdAt: string
}

export interface Venta {
  id: number
  numeroComprobante: string
  sucursalId: number
  sucursalNombre?: string
  clienteId?: number
  clienteNombre: string
  recetaId?: number
  estado: EstadoVenta
  tipo: TipoVenta
  condicionVenta: CondicionVenta
  fechaVenta: string
  validezDias: number
  fechaConfirmacion?: string
  fechaComprobante?: string
  montoExento: number
  montoGravado5: number
  montoGravado10: number
  total: number
  montoSeña: number
  totalCobrado: number
  saldoPendiente: number
  cantidadCuotas?: number
  frecuenciaCuotasDias?: number
  montoCuota?: number
  cuotasPagadas?: number
  proximaCuotaVencimiento?: string
  cuotaVencida: boolean
  observaciones?: string
  lineas: VentaLinea[]
  cobros: Cobro[]
  factura?: FacturaVenta
  comprobante?: Comprobante
  trabajoPedido?: TrabajoPedido
  devoluciones: Devolucion[]
  createdAt: string
}

export interface MovimientoCaja {
  id: number
  tipo: TipoMovCaja
  monto: number
  concepto: string
  metodoPago: MetodoPago
  ventaId?: number
  egresoId?: number
  fecha: string
  referencia?: string
  createdAt: string
}

export interface ResumenCaja {
  fecha: string
  totalIngresos: number
  totalEgresos: number
  saldoNeto: number
  efectivoTotal: number
  tarjetaTotal: number
  transferenciaTotal: number
  chequeTotal: number
  cantidadVentas: number
  movimientos: MovimientoCaja[]
}

export interface VentasPagedResult {
  items: Venta[]
  totalCount: number
  page: number
  pageSize: number
  totalPages: number
}

export interface ServicioTarifa {
  id: number
  professionalId?: number
  professionalNombre?: string
  especialidadId?: number
  especialidadNombre?: string
  precio: number
}

export interface Servicio {
  id: number
  nombre: string
  descripcion?: string
  precio: number
  isActive: boolean
  tarifas: ServicioTarifa[]
}

// ── Requests ──────────────────────────────────────────────────────────────────

export interface AgregarLineaRequest {
  tipo: TipoLinea
  productoId?: number
  servicioId?: number
  descripcion?: string
  cantidad: number
  precioUnitario: number
  descuento: number
  categoriaFiscal: CategoriaFiscal
}

export interface CrearVentaTrabajoPedidoRequest {
  tipoLenteId?: number | null
  tratamientoIds: number[]
  armazonProductoId?: number | null
  armazonDelCliente: boolean
  laboratorioProveedorId?: number | null
  observacion?: string
}

export interface CrearVentaRequest {
  clienteId?: number
  recetaId?: number
  tipo: TipoVenta
  condicionVenta: CondicionVenta
  fechaVenta: string
  validezDias?: number
  // Plan de cuotas (opcional, solo aplica si condicionVenta === "Credito")
  cantidadCuotas?: number
  frecuenciaCuotasDias?: number
  observaciones?: string
  lineas: AgregarLineaRequest[]
  trabajoPedido?: CrearVentaTrabajoPedidoRequest
}

export interface ActualizarVentaRequest {
  condicionVenta: CondicionVenta
  fechaVenta: string
  cantidadCuotas?: number
  frecuenciaCuotasDias?: number
  observaciones?: string
  lineas: AgregarLineaRequest[]
  laboratorioProveedorId?: number | null
}

export interface CobroLineaRequest {
  metodoPago: MetodoPago
  monto: number
  referencia?: string
}

export interface RegistrarCobroRequest {
  ventaId: number
  tipo: TipoCobro
  fecha: string
  lineas: CobroLineaRequest[]
}

export interface EmitirFacturaRequest {
  ventaId: number
  timbradoId: number
  fechaEmision: string
  observaciones?: string
}

export interface CancelarVentaRequest {
  motivo?: string
}

export interface CrearTrabajoPedidoRequest {
  ventaId: number
  recetaId: number
  tipoLenteId: number
  tratamientoIds: number[]
  armazonProductoId?: number
  laboratorioProveedorId: number
  observacion?: string
}

export interface DevolucionLineaRequest {
  productoDevueltoId: number
  cantidadDevuelta: number
  productoNuevoId?: number
  cantidadNueva?: number
}

export interface SolicitarDevolucionRequest {
  tipo: TipoDevolucion
  motivo: string
  lineas: DevolucionLineaRequest[]
}

export interface GestionarDevolucionRequest {
  accion: "Confirmar" | "Rechazar"
  observacionesRevision?: string
}

// ── Endpoints ─────────────────────────────────────────────────────────────────

export const getVentas = (params?: {
  estado?: string
  tipo?: string
  fechaDesde?: string
  fechaHasta?: string
  clienteId?: number
  page?: number
  pageSize?: number
}) => {
  const q = new URLSearchParams()
  if (params?.estado)     q.set("estado",     params.estado)
  if (params?.tipo)       q.set("tipo",        params.tipo)
  if (params?.fechaDesde) q.set("fechaDesde",  params.fechaDesde)
  if (params?.fechaHasta) q.set("fechaHasta",  params.fechaHasta)
  if (params?.clienteId)  q.set("clienteId",   String(params.clienteId))
  if (params?.page)       q.set("page",        String(params.page))
  if (params?.pageSize)   q.set("pageSize",    String(params.pageSize))
  const qs = q.toString()
  return get<VentasPagedResult>(`/api/ventas${qs ? "?" + qs : ""}`)
}

export const getVentaById = (id: number) =>
  get<Venta>(`/api/ventas/${id}`)

export const crearVenta = (data: CrearVentaRequest) =>
  post<Venta>("/api/ventas", data)

export const actualizarVenta = (id: number, data: ActualizarVentaRequest) =>
  put<Venta>(`/api/ventas/${id}`, data)

export const confirmarVenta = (id: number) =>
  put<Venta>(`/api/ventas/${id}/confirmar`, {})

export const cancelarVenta = (id: number, data: CancelarVentaRequest) =>
  put<Venta>(`/api/ventas/${id}/cancelar`, data)

export const eliminarPresupuesto = (id: number) =>
  del(`/api/ventas/${id}`)

export const getPresupuestos = (clienteId?: number) => {
  const q = new URLSearchParams({ estado: "Borrador", pageSize: "100" })
  if (clienteId) q.set("clienteId", String(clienteId))
  return get<VentasPagedResult>(`/api/ventas?${q}`)
}

export const registrarCobro = (data: RegistrarCobroRequest) =>
  post<Venta>("/api/ventas/cobros", data)

export const emitirComprobante = (id: number) =>
  post<Venta>(`/api/ventas/${id}/comprobante`, {})

export const emitirFactura = (data: EmitirFacturaRequest) =>
  post<Venta>("/api/ventas/facturas", data)

// Trabajo a pedido — tipos (el flujo vive en laboratorioService)
export interface FacturaLaboratorioDto {
  id: number
  numeroFactura: string
  timbrado?: string
  fechaEmision: string
  monto: number
  observaciones?: string
  emitidoPorNombre: string
  createdAt: string
}

export interface RecetaRef {
  fechaEmision: string
  odEsferico?: number
  odCilindro?: number
  odEje?: number
  odAdicion?: number
  oiEsferico?: number
  oiCilindro?: number
  oiEje?: number
  oiAdicion?: number
  distanciaInterpupilar?: number
  observaciones?: string
}

export interface TrabajoPedidoListDto {
  id: number
  ventaId: number
  numeroComprobante: string
  clienteNombre: string
  tipoLenteNombre: string
  tratamientos: string[]
  laboratorioNombre: string
  estado: EstadoTrabajoPedido
  observacionAprobacion?: string
  aprobadoPorNombre?: string
  fechaEnvio?: string
  fechaEstimadaEntrega?: string
  medioEnvio?: MedioEnvioLaboratorio
  fechaRecepcion?: string
  observacion?: string
  factura?: FacturaLaboratorioDto
  createdAt: string
  // Referencia de la venta (datos que el laboratorio necesita para fabricar).
  // El lente se describe por tipoLenteNombre (diseño) + tratamientos.
  armazonNombre?: string
  armazonDelCliente: boolean
  receta?: RecetaRef
}

export interface GestionarTrabajoPedidoRequest {
  accion: "Aprobar" | "Rechazar"
  observacion?: string
}

export interface RegistrarEnvioRequest {
  fechaEstimadaEntrega?: string   // "yyyy-MM-dd"
  medioEnvio?: MedioEnvioLaboratorio
}

export interface EmitirFacturaLaboratorioRequest {
  numeroFactura: string
  timbrado?: string
  fechaEmision: string
  monto: number
  observaciones?: string
}


// Devoluciones
export const solicitarDevolucion = (ventaId: number, data: SolicitarDevolucionRequest) =>
  post<Devolucion>(`/api/ventas/${ventaId}/devoluciones`, data)

export const getDevoluciones = (ventaId: number) =>
  get<Devolucion[]>(`/api/ventas/${ventaId}/devoluciones`)

export const getDevolucionesPendientes = () =>
  get<Devolucion[]>(`/api/ventas/devoluciones/pendientes`)

export const gestionarDevolucion = (devolucionId: number, data: GestionarDevolucionRequest) =>
  post<Devolucion>(`/api/ventas/devoluciones/${devolucionId}/gestionar`, data)

// Caja — resumen
export const getCobrosPendientes = () =>
  get<Venta[]>("/api/ventas/cobros-pendientes")

export const getResumenCaja = (fecha: string) =>
  get<ResumenCaja>(`/api/caja/resumen?fecha=${fecha}`)

export const getServicios = () =>
  get<Servicio[]>("/api/servicios")

export interface CreateServicioRequest {
  nombre: string
  descripcion?: string
  precio: number
}

export interface UpdateServicioRequest {
  nombre: string
  descripcion?: string
  precio: number
  isActive: boolean
}

export const createServicio = (data: CreateServicioRequest) =>
  post<Servicio>("/api/servicios", data)

export const updateServicio = (id: number, data: UpdateServicioRequest) =>
  put<Servicio>(`/api/servicios/${id}`, data)

export const deactivateServicio = (id: number) =>
  del(`/api/servicios/${id}`)

export interface CreateServicioTarifaRequest {
  professionalId?: number
  especialidadId?: number
  precio: number
}

export interface PrecioResuelto {
  precio: number
  origen: "profesional" | "especialidad" | "base"
}

export const addServicioTarifa = (servicioId: number, data: CreateServicioTarifaRequest) =>
  post<Servicio>(`/api/servicios/${servicioId}/tarifas`, data)

export const removeServicioTarifa = (tarifaId: number) =>
  del(`/api/servicios/tarifas/${tarifaId}`)

export const resolvePrecioServicio = (servicioId: number, professionalId?: number) =>
  get<PrecioResuelto>(`/api/servicios/${servicioId}/precio${professionalId ? `?professionalId=${professionalId}` : ""}`)

// ── Sesiones de caja ──────────────────────────────────────────────────────────

export type EstadoSesionCaja = "Abierta" | "Cerrada" | "PendienteAprobacion"

export interface SesionCaja {
  id: number
  estado: EstadoSesionCaja
  montoInicial: number
  abiertaPorNombre: string
  fechaApertura: string
  cerradaPorNombre?: string
  fechaCierre?: string
  efectivoContado?: number
  efectivoEsperado?: number
  diferencia?: number
  observacionCierre?: string
  aprobadoPorNombre?: string
  fechaAprobacion?: string
  motivoRechazo?: string
  totalIngresos: number
  totalEgresos: number
  saldoNeto: number
  efectivoIngresos: number
  tarjetaTotal: number
  transferenciaTotal: number
  chequeTotal: number
  cantidadMovimientos: number
  movimientos: MovimientoCaja[]
}

export interface SesionCajaListItem {
  id: number
  estado: EstadoSesionCaja
  montoInicial: number
  abiertaPorNombre: string
  fechaApertura: string
  cerradaPorNombre?: string
  fechaCierre?: string
  efectivoContado?: number
  efectivoEsperado?: number
  diferencia?: number
  aprobadoPorNombre?: string
  fechaAprobacion?: string
  motivoRechazo?: string
  totalIngresos: number
  totalEgresos: number
  saldoNeto: number
}

export interface SesionesPagedResult {
  items: SesionCajaListItem[]
  totalCount: number
  page: number
  pageSize: number
  totalPages: number
}

export const getSesionActual = () =>
  get<SesionCaja | null>("/api/caja/sesion-actual")

// Sin monto → apertura automática (el backend toma el efectivo del último cierre).
export const abrirSesion = (montoInicial?: number) =>
  post<SesionCaja>("/api/caja/sesiones", { montoInicial: montoInicial ?? null })

// Efectivo sugerido para abrir (= efectivo contado del último cierre).
export const getAperturaSugerida = () =>
  get<number>("/api/caja/apertura-sugerida")

export const cerrarSesion = (id: number, efectivoContado: number, observacion?: string) =>
  post<SesionCaja>(`/api/caja/sesiones/${id}/cerrar`, { efectivoContado, observacion })

export const getSesionById = (id: number) =>
  get<SesionCaja>(`/api/caja/sesiones/${id}`)

export const getSesiones = (page = 1, pageSize = 20, estado?: string) => {
  const q = new URLSearchParams({ page: String(page), pageSize: String(pageSize) })
  if (estado) q.set("estado", estado)
  return get<SesionesPagedResult>(`/api/caja/sesiones?${q}`)
}

export const aprobarCierre = (id: number) =>
  post<SesionCaja>(`/api/caja/sesiones/${id}/aprobar-cierre`, {})

export const rechazarCierre = (id: number, motivo: string) =>
  post<SesionCaja>(`/api/caja/sesiones/${id}/rechazar-cierre`, { motivo })
