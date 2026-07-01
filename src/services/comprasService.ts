import { http } from "@/api/http"
import type { PagedResult } from "@/services/inventarioService"

// ── Tipos ──────────────────────────────────────────────────────────────────────

export type EstadoPedido =
  | "Borrador"
  | "Confirmada"
  | "Facturada"
  | "RecibidaParcial"
  | "RecibidaTotal"
  | "Cancelada"

export interface PedidoItemCompras {
  id: number
  productoId: number
  productoNombre: string
  cantidad: number
  cantidadRecibida: number
  precioUnitario: number
  total: number
}

export interface DevolucionCompras {
  id: number
  itemId: number
  productoNombre: string
  cantidad: number
  motivo: string
  createdAt: string
}

export interface RecepcionItemCompras {
  pedidoItemId: number
  productoNombre: string
  cantidad: number
  lote: string | null
  fechaVencimiento: string | null
  observaciones: string | null
}

export interface RecepcionCompras {
  id: number
  fechaRecepcion: string
  usuarioNombre: string | null
  observaciones: string | null
  createdAt: string
  items: RecepcionItemCompras[]
}

export interface PedidoFactura {
  id: number
  nroFactura: string | null
  montoExento: number
  montoGravado5: number
  montoGravado10: number
  montoTotal: number
  iva5: number
  iva10: number
  condicionVenta: string
  estado: string
  fechaEmision: string
  fechaVencimiento: string | null
  fechaPago: string | null
  observaciones: string | null
}

export interface PedidoCompras {
  id: number
  proveedorId: number
  proveedorNombre: string
  estado: EstadoPedido
  observaciones: string | null
  fechaOrden: string | null
  createdAt: string
  updatedAt: string
  items: PedidoItemCompras[]
  devoluciones: DevolucionCompras[]
  recepciones: RecepcionCompras[]
  factura: PedidoFactura | null
}

// ── Requests ───────────────────────────────────────────────────────────────────

export interface ItemPedidoRequest {
  productoId: number
  cantidad: number
  precioUnitario: number
}

export interface CrearPedidoRequest {
  proveedorId: number
  observaciones?: string
  fechaOrden?: string
  items: ItemPedidoRequest[]
}

export interface RecepcionItemRequest {
  itemId: number
  cantidadRecibida: number
  lote?: string
  fechaVencimiento?: string
  observaciones?: string
}

export interface RegistrarRecepcionRequest {
  facturaCompraId: number
  fechaRecepcion: string
  observaciones?: string
  items: RecepcionItemRequest[]
}

export interface RegistrarDevolucionRequest {
  itemId: number
  cantidad: number
  motivo: string
}

export interface ProveedorSimple {
  id: number
  nombre: string
  ruc: string
  esLaboratorio: boolean
}

// ── Funciones ──────────────────────────────────────────────────────────────────

export async function getLaboratorios(): Promise<ProveedorSimple[]> {
  const res = await http.get<ProveedorSimple[]>("/api/proveedores/laboratorios")
  return res.data
}

export async function getComprasPedidos(params: {
  proveedorId?: number
  estado?: string
  page?: number
  pageSize?: number
} = {}): Promise<PagedResult<PedidoCompras>> {
  const q = new URLSearchParams()
  if (params.proveedorId) q.set("proveedorId", String(params.proveedorId))
  if (params.estado) q.set("estado", params.estado)
  if (params.page) q.set("page", String(params.page))
  if (params.pageSize) q.set("pageSize", String(params.pageSize))
  const { data } = await http.get<PagedResult<PedidoCompras>>(`/api/compras/pedidos?${q}`)
  return data
}

export async function getComprasPedidoById(id: number): Promise<PedidoCompras> {
  const { data } = await http.get<PedidoCompras>(`/api/compras/pedidos/${id}`)
  return data
}

export async function crearPedido(request: CrearPedidoRequest): Promise<PedidoCompras> {
  const { data } = await http.post<PedidoCompras>("/api/compras/pedidos", request)
  return data
}

export async function editarPedido(id: number, request: CrearPedidoRequest): Promise<PedidoCompras> {
  const { data } = await http.put<PedidoCompras>(`/api/compras/pedidos/${id}`, request)
  return data
}

export async function confirmarPedido(id: number): Promise<PedidoCompras> {
  const { data } = await http.put<PedidoCompras>(`/api/compras/pedidos/${id}/confirmar`, {})
  return data
}

export async function registrarFactura(
  id: number,
  request: RegistrarFacturaPedidoRequest,
): Promise<PedidoCompras> {
  const { data } = await http.post<PedidoCompras>(`/api/compras/pedidos/${id}/factura`, request)
  return data
}

export async function registrarDevolucion(
  id: number,
  request: RegistrarDevolucionRequest,
): Promise<DevolucionCompras> {
  const { data } = await http.post<DevolucionCompras>(
    `/api/compras/pedidos/${id}/devolucion`,
    request,
  )
  return data
}

export async function cancelarPedido(id: number): Promise<PedidoCompras> {
  const { data } = await http.put<PedidoCompras>(`/api/compras/pedidos/${id}/cancelar`, {})
  return data
}

// ── Facturas de Compra ─────────────────────────────────────────────────────────

export type EstadoFactura = "Pendiente" | "Pagado" | "Anulado"
export type TipoIva = "Exento" | "Iva5" | "Iva10"

/** Línea individual de una factura (producto/servicio) */
export interface FacturaItemLinea {
  id: number
  productoId: number | null
  descripcion: string
  cantidad: number
  precioUnitario: number
  total: number
  tipoIva: TipoIva
}

/** Factura de compra completa (respuesta de la API) */
export interface FacturaCompraItem {
  id: number
  nroFactura: string | null
  proveedorId: number
  proveedorNombre: string
  pedidoProveedorId: number | null
  montoExento: number
  montoGravado5: number
  montoGravado10: number
  montoTotal: number
  iva5: number
  iva10: number
  condicionVenta: string
  estado: EstadoFactura
  fechaEmision: string
  fechaVencimiento: string | null
  fechaPago: string | null
  observaciones: string | null
  motivoAnulacion: string | null
  createdAt: string
  tieneRecepciones: boolean
  items: FacturaItemLinea[]
}

/** Ítem de línea para enviar en requests */
export interface FacturaItemLineaRequest {
  productoId?: number | null
  descripcion: string
  cantidad: number
  precioUnitario: number
  tipoIva: TipoIva
}

export interface RegistrarFacturaDirectaRequest {
  proveedorId: number
  nroFactura: string
  fechaEmision: string
  fechaVencimiento?: string
  condicionVenta: string
  metodoPago?: string
  observaciones?: string
  items: FacturaItemLineaRequest[]
}

export interface RegistrarFacturaPedidoRequest {
  nroFactura: string
  fechaEmision: string
  fechaVencimiento?: string
  condicionVenta: string
  metodoPago?: string
  observaciones?: string
  /** Si se omite, los ítems se copian automáticamente desde la OC con IVA 10% */
  items?: FacturaItemLineaRequest[]
}

export interface AnularFacturaRequest {
  motivo: string
}

export async function getFacturasCompra(params: {
  proveedorId?: number
  condicionVenta?: string
  estado?: string
  origen?: string
  fechaDesde?: string
  fechaHasta?: string
  search?: string
  page?: number
  pageSize?: number
} = {}): Promise<PagedResult<FacturaCompraItem>> {
  const q = new URLSearchParams()
  if (params.proveedorId) q.set("proveedorId", String(params.proveedorId))
  if (params.condicionVenta) q.set("condicionVenta", params.condicionVenta)
  if (params.estado) q.set("estado", params.estado)
  if (params.origen) q.set("origen", params.origen)
  if (params.fechaDesde) q.set("fechaDesde", params.fechaDesde)
  if (params.fechaHasta) q.set("fechaHasta", params.fechaHasta)
  if (params.search) q.set("search", params.search)
  if (params.page) q.set("page", String(params.page))
  if (params.pageSize) q.set("pageSize", String(params.pageSize))
  const { data } = await http.get<PagedResult<FacturaCompraItem>>(`/api/compras/facturas?${q}`)
  return data
}

export async function registrarFacturaDirecta(
  request: RegistrarFacturaDirectaRequest,
): Promise<FacturaCompraItem> {
  const { data } = await http.post<FacturaCompraItem>("/api/compras/facturas", request)
  return data
}

export async function anularFactura(
  id: number,
  request: AnularFacturaRequest,
): Promise<FacturaCompraItem> {
  const { data } = await http.put<FacturaCompraItem>(`/api/compras/facturas/${id}/anular`, request)
  return data
}

export async function getFacturaById(id: number): Promise<FacturaCompraItem> {
  const { data } = await http.get<FacturaCompraItem>(`/api/compras/facturas/${id}`)
  return data
}

// ── Recepciones de Mercadería ──────────────────────────────────────────────────

export interface RecepcionListItem {
  id: number
  fechaRecepcion: string
  createdAt: string
  pedidoProveedorId: number
  estadoOC: EstadoPedido
  proveedorId: number
  proveedorNombre: string
  facturaCompraId: number | null
  nroFactura: string | null
  usuarioId: number
  usuarioNombre: string
  cantidadItems: number
  cantidadTotal: number
  observaciones: string | null
}

export interface FacturaDisponibleRecepcion {
  id: number
  nroFactura: string
  fechaEmision: string
  pedidoProveedorId: number
  estadoOC: EstadoPedido
  proveedorId: number
  proveedorNombre: string
  itemsPendientes: number
}

export async function getRecepciones(params: {
  proveedorId?: number
  estadoOC?: string
  fechaDesde?: string
  fechaHasta?: string
  page?: number
  pageSize?: number
} = {}): Promise<PagedResult<RecepcionListItem>> {
  const q = new URLSearchParams()
  if (params.proveedorId) q.set("proveedorId", String(params.proveedorId))
  if (params.estadoOC) q.set("estadoOC", params.estadoOC)
  if (params.fechaDesde) q.set("fechaDesde", params.fechaDesde)
  if (params.fechaHasta) q.set("fechaHasta", params.fechaHasta)
  if (params.page) q.set("page", String(params.page))
  if (params.pageSize) q.set("pageSize", String(params.pageSize))
  const { data } = await http.get<PagedResult<RecepcionListItem>>(`/api/compras/recepciones?${q}`)
  return data
}

export interface RecepcionDetalleItem {
  pedidoItemId: number
  productoNombre: string
  cantidad: number
  lote: string | null
  fechaVencimiento: string | null
  observaciones: string | null
}

export interface RecepcionDetalle {
  id: number
  fechaRecepcion: string
  createdAt: string
  pedidoProveedorId: number
  estadoOC: EstadoPedido
  proveedorId: number
  proveedorNombre: string
  facturaCompraId: number | null
  nroFactura: string | null
  usuarioId: number
  usuarioNombre: string
  observaciones: string | null
  items: RecepcionDetalleItem[]
}

export async function getRecepcionById(id: number): Promise<RecepcionDetalle> {
  const { data } = await http.get<RecepcionDetalle>(`/api/compras/recepciones/${id}`)
  return data
}

export async function getFacturasDisponiblesRecepcion(): Promise<FacturaDisponibleRecepcion[]> {
  const { data } = await http.get<FacturaDisponibleRecepcion[]>(`/api/compras/recepciones/facturas-disponibles`)
  return data
}

export async function registrarRecepcion(
  request: RegistrarRecepcionRequest,
): Promise<RecepcionListItem> {
  const { data } = await http.post<RecepcionListItem>(`/api/compras/recepciones`, request)
  return data
}
