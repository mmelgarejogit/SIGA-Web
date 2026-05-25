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
}

export interface RecepcionCompras {
  id: number
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
  items: ItemPedidoRequest[]
}

export interface RecepcionItemRequest {
  itemId: number
  cantidadRecibida: number
}

export interface RegistrarRecepcionRequest {
  observaciones?: string
  items: RecepcionItemRequest[]
}

export interface RegistrarDevolucionRequest {
  itemId: number
  cantidad: number
  motivo: string
}

export interface RegistrarFacturaRequest {
  nroFactura: string
  fechaEmision: string
  fechaVencimiento?: string
  montoExento: number
  montoGravado5: number
  montoGravado10: number
  condicionVenta: string
  observaciones?: string
}

// ── Funciones ──────────────────────────────────────────────────────────────────

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

export async function confirmarPedido(id: number): Promise<PedidoCompras> {
  const { data } = await http.put<PedidoCompras>(`/api/compras/pedidos/${id}/confirmar`, {})
  return data
}

export async function registrarFactura(
  id: number,
  request: RegistrarFacturaRequest,
): Promise<PedidoCompras> {
  const { data } = await http.post<PedidoCompras>(`/api/compras/pedidos/${id}/factura`, request)
  return data
}

export async function registrarRecepcion(
  id: number,
  request: RegistrarRecepcionRequest,
): Promise<PedidoCompras> {
  const { data } = await http.post<PedidoCompras>(`/api/compras/pedidos/${id}/recepcion`, request)
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
export type OrigenFactura = "ConOC" | "Directa"

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
}

export interface RegistrarFacturaDirectaRequest {
  proveedorId: number
  nroFactura: string
  fechaEmision: string
  fechaVencimiento?: string
  montoExento: number
  montoGravado5: number
  montoGravado10: number
  condicionVenta: string
  observaciones?: string
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
