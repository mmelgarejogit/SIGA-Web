import { http } from "@/api/http"

export interface InventarioFisicoLinea {
  id: string
  productoVarianteId: string
  productoNombre: string
  varianteSku: string | null
  varianteColor: string | null
  varianteTalle: string | null
  cantidadSistema: number | null  // null en vista Encargado (conteo ciego)
  cantidadContada: number | null
  diferencia: number | null
}

export interface InventarioFisico {
  id: string
  sucursalId: string
  sucursalNombre: string
  estado: "Borrador" | "EnConteo" | "Cerrado" | "Aprobado" | "Cancelado"
  alcance: "Total" | "Parcial"
  filtroCategoriaId: number | null
  filtroCategoriaNombre: string | null
  fechaInicioConteo: string | null
  iniciadoPorId: number
  iniciadoPorNombre: string
  ejecutadoPorId: number | null
  ejecutadoPorNombre: string | null
  aprobadoPorId: number | null
  aprobadoPorNombre: string | null
  observacion: string | null
  createdAt: string
  fechaResolucion: string | null
  totalLineas: number
  lineasContadas: number
  lineasConDiferencia: number
  lineas: InventarioFisicoLinea[]
}

export interface PagedResult<T> {
  items: T[]
  totalCount: number
  page: number
  pageSize: number
  totalPages: number
}

export interface CreateInventarioFisicoRequest {
  sucursalId: string
  alcance: "Total" | "Parcial"
  filtroCategoriaId?: number | null
  observacion?: string
}

export interface GuardarConteosRequest {
  lineas: { lineaId: string; cantidadContada: number | null }[]
}

export async function getInventariosFisicos(params: {
  page?: number; pageSize?: number; sucursalId?: string; estado?: string
} = {}): Promise<PagedResult<InventarioFisico>> {
  const q = new URLSearchParams()
  if (params.page)       q.set("page", String(params.page))
  if (params.pageSize)   q.set("pageSize", String(params.pageSize))
  if (params.sucursalId) q.set("sucursalId", params.sucursalId)
  if (params.estado)     q.set("estado", params.estado)
  const { data } = await http.get<PagedResult<InventarioFisico>>(`/api/stock/fisico?${q}`)
  return data
}

// Admin — incluye cantidad_sistema
export async function getInventarioFisicoById(id: string): Promise<InventarioFisico> {
  const { data } = await http.get<InventarioFisico>(`/api/stock/fisico/${id}`)
  return data
}

// Encargado — oculta cantidad_sistema (conteo ciego)
export async function getHojaConteo(id: string): Promise<InventarioFisico> {
  const { data } = await http.get<InventarioFisico>(`/api/stock/fisico/${id}/conteo`)
  return data
}

export async function createInventarioFisico(request: CreateInventarioFisicoRequest): Promise<InventarioFisico> {
  const { data } = await http.post<InventarioFisico>("/api/stock/fisico", request)
  return data
}

export async function iniciarConteo(id: string): Promise<InventarioFisico> {
  const { data } = await http.post<InventarioFisico>(`/api/stock/fisico/${id}/iniciar`)
  return data
}

export async function guardarConteos(id: string, request: GuardarConteosRequest): Promise<InventarioFisico> {
  const { data } = await http.put<InventarioFisico>(`/api/stock/fisico/${id}/conteos`, request)
  return data
}

export async function cerrarInventario(id: string): Promise<InventarioFisico> {
  const { data } = await http.post<InventarioFisico>(`/api/stock/fisico/${id}/cerrar`)
  return data
}

export async function aprobarInventario(id: string): Promise<InventarioFisico> {
  const { data } = await http.post<InventarioFisico>(`/api/stock/fisico/${id}/aprobar`)
  return data
}

export async function cancelarInventario(id: string): Promise<InventarioFisico> {
  const { data } = await http.post<InventarioFisico>(`/api/stock/fisico/${id}/cancelar`)
  return data
}
