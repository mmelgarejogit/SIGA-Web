import { useHttp } from "@/composables/useHttp"

const { get, post, put } = useHttp()

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
export type TipoLinea       = "Producto" | "Servicio"
export type TipoMovCaja     = "Ingreso" | "Egreso"
export type EstadoTrabajoPedido = "PendienteAprobacion" | "PendienteEnvio" | "Enviado" | "Recibido" | "Rechazado"

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
  recetaId: number
  tipoLenteId: number
  tipoLenteNombre: string
  tratamientos: TrabajoPedidoTratamiento[]
  armazonProductoId?: number
  armazonProductoNombre?: string
  laboratorioProveedorId: number
  laboratorioNombre: string
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

export interface Devolucion {
  id: number
  ventaId: number
  numeroComprobante: string
  tipo: TipoDevolucion
  estado: EstadoDevolucion
  motivo: string
  solicitadoPorNombre: string
  confirmadoPorNombre?: string
  observacionesRevision?: string
  fechaRevision?: string
  lineas: DevolucionLinea[]
  createdAt: string
}

export interface Venta {
  id: number
  numeroComprobante: string
  patientId: number
  pacienteNombre: string
  recetaId?: number
  estado: EstadoVenta
  tipo: TipoVenta
  condicionVenta: CondicionVenta
  fechaVenta: string
  fechaConfirmacion?: string
  fechaComprobante?: string
  montoExento: number
  montoGravado5: number
  montoGravado10: number
  total: number
  montoSeña: number
  totalCobrado: number
  saldoPendiente: number
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

export interface Servicio {
  id: number
  nombre: string
  descripcion?: string
  precio: number
  isActive: boolean
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

export interface CrearVentaRequest {
  patientId: number
  recetaId?: number
  tipo: TipoVenta
  condicionVenta: CondicionVenta
  fechaVenta: string
  observaciones?: string
  lineas: AgregarLineaRequest[]
}

export interface CobroLineaRequest {
  metodoPago: MetodoPago
  monto: number
}

export interface RegistrarCobroRequest {
  ventaId: number
  tipo: TipoCobro
  fecha: string
  lineas: CobroLineaRequest[]
}

export interface EmitirFacturaRequest {
  ventaId: number
  numeroFactura: string
  timbrado: string
  establecimiento: string
  fechaEmision: string
  observaciones?: string
}

export interface CancelarVentaRequest {
  motivo?: string
}

export interface CrearTrabajoPedidoRequest {
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
  patientId?: number
  page?: number
  pageSize?: number
}) => {
  const q = new URLSearchParams()
  if (params?.estado)     q.set("estado",     params.estado)
  if (params?.tipo)       q.set("tipo",        params.tipo)
  if (params?.fechaDesde) q.set("fechaDesde",  params.fechaDesde)
  if (params?.fechaHasta) q.set("fechaHasta",  params.fechaHasta)
  if (params?.patientId)  q.set("patientId",   String(params.patientId))
  if (params?.page)       q.set("page",        String(params.page))
  if (params?.pageSize)   q.set("pageSize",    String(params.pageSize))
  const qs = q.toString()
  return get<VentasPagedResult>(`/api/ventas${qs ? "?" + qs : ""}`)
}

export const getVentaById = (id: number) =>
  get<Venta>(`/api/ventas/${id}`)

export const crearVenta = (data: CrearVentaRequest) =>
  post<Venta>("/api/ventas", data)

export const confirmarVenta = (id: number) =>
  put<Venta>(`/api/ventas/${id}/confirmar`, {})

export const cancelarVenta = (id: number, data: CancelarVentaRequest) =>
  put<Venta>(`/api/ventas/${id}/cancelar`, data)

export const eliminarPresupuesto = (id: number) =>
  useHttp().del(`/api/ventas/${id}`)

export const getPresupuestos = (patientId?: number) => {
  const q = new URLSearchParams({ estado: "Borrador", pageSize: "100" })
  if (patientId) q.set("patientId", String(patientId))
  return get<VentasPagedResult>(`/api/ventas?${q}`)
}

export const registrarCobro = (data: RegistrarCobroRequest) =>
  post<Venta>("/api/ventas/cobros", data)

export const emitirComprobante = (id: number) =>
  post<Venta>(`/api/ventas/${id}/comprobante`, {})

export const emitirFactura = (data: EmitirFacturaRequest) =>
  post<Venta>("/api/ventas/facturas", data)

// Trabajo a pedido — desde venta
export const crearTrabajoPedido = (ventaId: number, data: CrearTrabajoPedidoRequest) =>
  post<Venta>(`/api/ventas/${ventaId}/trabajo-pedido`, data)

// Trabajo a pedido — vistas globales
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

export interface TrabajoPedidoListDto {
  id: number
  ventaId: number
  numeroComprobante: string
  pacienteNombre: string
  tipoLenteNombre: string
  tratamientos: string[]
  laboratorioNombre: string
  estado: EstadoTrabajoPedido
  observacionAprobacion?: string
  aprobadoPorNombre?: string
  fechaEnvio?: string
  fechaRecepcion?: string
  observacion?: string
  factura?: FacturaLaboratorioDto
  createdAt: string
}

export interface GestionarTrabajoPedidoRequest {
  accion: "Aprobar" | "Rechazar"
  observacion?: string
}

export interface EmitirFacturaLaboratorioRequest {
  numeroFactura: string
  timbrado?: string
  fechaEmision: string
  monto: number
  observaciones?: string
}

export const getTrabajosPedido = (estado?: string) => {
  const q = estado ? `?estado=${estado}` : ""
  return get<TrabajoPedidoListDto[]>(`/api/ventas/trabajos-pedido${q}`)
}

export const gestionarAprobacionTP = (id: number, data: GestionarTrabajoPedidoRequest) =>
  post<TrabajoPedidoListDto>(`/api/ventas/trabajos-pedido/${id}/gestionar`, data)

export const registrarEnvioLab = (id: number) =>
  put<TrabajoPedidoListDto>(`/api/ventas/trabajos-pedido/${id}/enviar`, {})

export const registrarRecepcionLab = (id: number) =>
  put<TrabajoPedidoListDto>(`/api/ventas/trabajos-pedido/${id}/recibir`, {})

export const emitirFacturaLaboratorio = (id: number, data: EmitirFacturaLaboratorioRequest) =>
  post<TrabajoPedidoListDto>(`/api/ventas/trabajos-pedido/${id}/factura`, data)

// Devoluciones
export const solicitarDevolucion = (ventaId: number, data: SolicitarDevolucionRequest) =>
  post<Devolucion>(`/api/ventas/${ventaId}/devoluciones`, data)

export const getDevoluciones = (ventaId: number) =>
  get<Devolucion[]>(`/api/ventas/${ventaId}/devoluciones`)

export const gestionarDevolucion = (devolucionId: number, data: GestionarDevolucionRequest) =>
  post<Devolucion>(`/api/ventas/devoluciones/${devolucionId}/gestionar`, data)

// Caja
export const getCobrosPendientes = () =>
  get<Venta[]>("/api/ventas/cobros-pendientes")

export const getResumenCaja = (fecha: string) =>
  get<ResumenCaja>(`/api/caja/resumen?fecha=${fecha}`)

export const getServicios = () =>
  get<Servicio[]>("/api/servicios")
