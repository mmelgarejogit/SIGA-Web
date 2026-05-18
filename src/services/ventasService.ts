import { useHttp } from "@/composables/useHttp"

const { get, post, put } = useHttp()

// ── Tipos ──────────────────────────────────────────────────────────────────────

export type EstadoVenta = "Abierta" | "Confirmada" | "PendienteDePago" | "Pagada" | "Cobrada" | "Anulada"
export type CondicionVenta = "Contado" | "Credito"
export type MetodoPago = "Efectivo" | "Tarjeta" | "Transferencia" | "Cheque"
export type CategoriaFiscal = "Exento" | "Gravado5" | "Gravado10"
export type TipoLinea = "Producto" | "Servicio"
export type TipoMovCaja = "Ingreso" | "Egreso"

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

export interface Cobro {
  id: number
  monto: number
  metodoPago: MetodoPago
  fechaCobro: string
  referencia?: string
  anulado: boolean
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

export interface Venta {
  id: number
  numeroComprobante: string
  patientId: number
  pacienteNombre: string
  recetaId?: number
  estado: EstadoVenta
  condicionVenta: CondicionVenta
  fechaVenta: string
  fechaVencimiento?: string
  montoExento: number
  montoGravado5: number
  montoGravado10: number
  total: number
  totalCobrado: number
  saldoPendiente: number
  observaciones?: string
  lineas: VentaLinea[]
  cobros: Cobro[]
  factura?: FacturaVenta
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

export interface MovimientosPagedResult {
  items: MovimientoCaja[]
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
  condicionVenta: CondicionVenta
  fechaVenta: string
  fechaVencimiento?: string
  observaciones?: string
  lineas: AgregarLineaRequest[]
}

export interface RegistrarCobroRequest {
  ventaId: number
  monto: number
  metodoPago: MetodoPago
  fechaCobro: string
  referencia?: string
}

export interface EmitirFacturaRequest {
  ventaId: number
  numeroFactura: string
  timbrado: string
  establecimiento: string
  fechaEmision: string
  observaciones?: string
}

export interface AnularVentaRequest {
  motivo: string
}

// ── Endpoints ─────────────────────────────────────────────────────────────────

export const getVentas = (params?: {
  estado?: string
  fechaDesde?: string
  fechaHasta?: string
  patientId?: number
  page?: number
  pageSize?: number
}) => {
  const q = new URLSearchParams()
  if (params?.estado) q.set("estado", params.estado)
  if (params?.fechaDesde) q.set("fechaDesde", params.fechaDesde)
  if (params?.fechaHasta) q.set("fechaHasta", params.fechaHasta)
  if (params?.patientId) q.set("patientId", String(params.patientId))
  if (params?.page) q.set("page", String(params.page))
  if (params?.pageSize) q.set("pageSize", String(params.pageSize))
  const qs = q.toString()
  return get<VentasPagedResult>(`/api/ventas${qs ? "?" + qs : ""}`)
}

export const getVentaById = (id: number) => get<Venta>(`/api/ventas/${id}`)

export const crearVenta = (data: CrearVentaRequest) => post<Venta>("/api/ventas", data)

export const confirmarVenta = (id: number) => put<Venta>(`/api/ventas/${id}/confirmar`, {})

export const registrarCobro = (data: RegistrarCobroRequest) =>
  post<Venta>("/api/ventas/cobros", data)

export const emitirFactura = (data: EmitirFacturaRequest) =>
  post<Venta>("/api/ventas/facturas", data)

export const anularVenta = (id: number, data: AnularVentaRequest) =>
  put<Venta>(`/api/ventas/${id}/anular`, data)

export const getResumenCaja = (fecha: string) =>
  get<ResumenCaja>(`/api/caja/resumen?fecha=${fecha}`)

export const getMovimientosCaja = (params?: {
  fechaDesde?: string
  fechaHasta?: string
  tipo?: string
  page?: number
  pageSize?: number
}) => {
  const q = new URLSearchParams()
  if (params?.fechaDesde) q.set("fechaDesde", params.fechaDesde)
  if (params?.fechaHasta) q.set("fechaHasta", params.fechaHasta)
  if (params?.tipo) q.set("tipo", params.tipo)
  if (params?.page) q.set("page", String(params.page))
  if (params?.pageSize) q.set("pageSize", String(params.pageSize))
  const qs = q.toString()
  return get<MovimientosPagedResult>(`/api/caja/movimientos${qs ? "?" + qs : ""}`)
}

export const getServicios = () => get<Servicio[]>("/api/servicios")
