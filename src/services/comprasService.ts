import { http } from "@/api/http"
import type { PagedResult } from "@/services/inventarioService"

// ── Tipos ──────────────────────────────────────────────────────────────────────

export type EstadoPedido =
  | "Borrador"
  | "Emitida"
  | "ParcialmenteRecibida"
  | "Recibida"
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
  items: RecepcionItemRequest[]
}

export interface RegistrarDevolucionRequest {
  itemId: number
  cantidad: number
  motivo: string
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

export async function emitirPedido(id: number): Promise<PedidoCompras> {
  const { data } = await http.put<PedidoCompras>(`/api/compras/pedidos/${id}/emitir`, {})
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
