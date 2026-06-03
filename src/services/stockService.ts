import { http } from "@/api/http"

export interface PagedResult<T> {
  items: T[]
  totalCount: number
  page: number
  pageSize: number
  totalPages: number
}

// ── TipoAjuste ─────────────────────────────────────────────────────────────────

export interface TipoAjuste {
  id: string
  nombre: string
  impacto: "Positivo" | "Negativo" | "Ambos"
  activo: boolean
}

export async function getTiposAjuste(params: { impacto?: string; activo?: boolean } = {}): Promise<TipoAjuste[]> {
  const q = new URLSearchParams()
  if (params.impacto) q.set("impacto", params.impacto)
  if (params.activo != null) q.set("activo", String(params.activo))
  const { data } = await http.get<TipoAjuste[]>(`/api/tipos-ajuste?${q}`)
  return data
}

export async function createTipoAjuste(request: { nombre: string; impacto: string }): Promise<TipoAjuste> {
  const { data } = await http.post<TipoAjuste>("/api/tipos-ajuste", request)
  return data
}

export async function updateTipoAjuste(id: string, request: { nombre: string; impacto: string; activo: boolean }): Promise<TipoAjuste> {
  const { data } = await http.put<TipoAjuste>(`/api/tipos-ajuste/${id}`, request)
  return data
}

export async function deactivateTipoAjuste(id: string): Promise<void> {
  await http.delete(`/api/tipos-ajuste/${id}`)
}

// ── AjusteManual ───────────────────────────────────────────────────────────────

export interface AjusteManual {
  id: string
  sucursalId: string
  sucursalNombre: string
  tipoAjusteId: string
  tipoAjusteNombre: string
  tipoAjusteImpacto: string
  productoVarianteId: string
  productoNombre: string
  varianteSku: string | null
  varianteColor: string | null
  varianteTalle: string | null
  cantidad: number
  observacion: string
  estado: "Pendiente" | "Aprobado" | "Rechazado"
  creadoPorId: number
  creadoPorNombre: string
  aprobadoPorId: number | null
  aprobadoPorNombre: string | null
  observacionResolucion: string | null
  fechaCreacion: string
  fechaResolucion: string | null
}

export interface CreateAjusteRequest {
  sucursalId: string
  tipoAjusteId: string
  productoVarianteId: string
  cantidad: number
  observacion: string
}

export async function getAjustes(params: { page?: number; pageSize?: number; sucursalId?: string; estado?: string } = {}): Promise<PagedResult<AjusteManual>> {
  const q = new URLSearchParams()
  if (params.page)       q.set("page", String(params.page))
  if (params.pageSize)   q.set("pageSize", String(params.pageSize))
  if (params.sucursalId) q.set("sucursalId", params.sucursalId)
  if (params.estado)     q.set("estado", params.estado)
  const { data } = await http.get<PagedResult<AjusteManual>>(`/api/stock/ajustes?${q}`)
  return data
}

export async function getAjusteById(id: string): Promise<AjusteManual> {
  const { data } = await http.get<AjusteManual>(`/api/stock/ajustes/${id}`)
  return data
}

export async function createAjuste(request: CreateAjusteRequest): Promise<AjusteManual> {
  const { data } = await http.post<AjusteManual>("/api/stock/ajustes", request)
  return data
}

export async function resolverAjuste(id: string, accion: "Aprobar" | "Rechazar", observacion?: string): Promise<AjusteManual> {
  const { data } = await http.post<AjusteManual>(`/api/stock/ajustes/${id}/resolver`, { accion, observacion })
  return data
}

// ── Transferencia ──────────────────────────────────────────────────────────────

export interface TransferenciaLinea {
  id: string
  productoVarianteId: string
  productoNombre: string
  sku: string | null
  color: string | null
  talle: string | null
  cantidad: number
}

export interface Transferencia {
  id: string
  sucursalOrigenId: string
  sucursalOrigenNombre: string
  sucursalDestinoId: string
  sucursalDestinoNombre: string
  estado: "Solicitada" | "Aprobada" | "Rechazada"
  solicitadoPorId: number
  solicitadoPorNombre: string
  aprobadoPorId: number | null
  aprobadoPorNombre: string | null
  observacion: string | null
  motivoRechazo: string | null
  fechaCreacion: string
  fechaResolucion: string | null
  lineas: TransferenciaLinea[]
}

export interface CreateTransferenciaRequest {
  sucursalOrigenId: string
  sucursalDestinoId: string
  observacion?: string
  lineas: { productoVarianteId: string; cantidad: number }[]
}

export async function getTransferencias(params: { page?: number; pageSize?: number; sucursalId?: string; estado?: string } = {}): Promise<PagedResult<Transferencia>> {
  const q = new URLSearchParams()
  if (params.page)       q.set("page", String(params.page))
  if (params.pageSize)   q.set("pageSize", String(params.pageSize))
  if (params.sucursalId) q.set("sucursalId", params.sucursalId)
  if (params.estado)     q.set("estado", params.estado)
  const { data } = await http.get<PagedResult<Transferencia>>(`/api/stock/transferencias?${q}`)
  return data
}

export async function getTransferenciaById(id: string): Promise<Transferencia> {
  const { data } = await http.get<Transferencia>(`/api/stock/transferencias/${id}`)
  return data
}

export async function createTransferencia(request: CreateTransferenciaRequest): Promise<Transferencia> {
  const { data } = await http.post<Transferencia>("/api/stock/transferencias", request)
  return data
}

export async function resolverTransferencia(id: string, accion: "Aprobar" | "Rechazar", motivoRechazo?: string): Promise<Transferencia> {
  const { data } = await http.post<Transferencia>(`/api/stock/transferencias/${id}/resolver`, { accion, motivoRechazo })
  return data
}

// ── Movimientos de inventario ──────────────────────────────────────────────────

export interface MovimientoInventario {
  id: string
  productoVarianteId: string
  productoNombre: string
  varianteSku: string | null
  varianteColor: string | null
  varianteTalle: string | null
  sucursalId: string
  sucursalNombre: string
  tipo: "Ingreso" | "Egreso"
  cantidad: number
  fecha: string
  usuarioId: number
  usuarioNombre: string
  origenTipo: string
  referenciaId: string | null
  tipoAjusteNombre: string | null
}

export interface StockPorVariante {
  productoVarianteId: string
  productoNombre: string
  sku: string | null
  color: string | null
  talle: string | null
  sucursalId: string
  sucursalNombre: string
  stockActual: number
  stockMinimo: number | null
  stockMaximo: number | null
  bajoStock: boolean
}

export async function getMovimientos(params: {
  page?: number; pageSize?: number; sucursalId?: string
  productoVarianteId?: string; tipo?: string; origen?: string
} = {}): Promise<PagedResult<MovimientoInventario>> {
  const q = new URLSearchParams()
  if (params.page)               q.set("page", String(params.page))
  if (params.pageSize)           q.set("pageSize", String(params.pageSize))
  if (params.sucursalId)         q.set("sucursalId", params.sucursalId)
  if (params.productoVarianteId) q.set("productoVarianteId", params.productoVarianteId)
  if (params.tipo)               q.set("tipo", params.tipo)
  if (params.origen)             q.set("origen", params.origen)
  const { data } = await http.get<PagedResult<MovimientoInventario>>(`/api/stock/movimientos?${q}`)
  return data
}

export async function getStock(params: { sucursalId?: string; productoVarianteId?: string; bajoStock?: boolean } = {}): Promise<StockPorVariante[]> {
  const q = new URLSearchParams()
  if (params.sucursalId)         q.set("sucursalId", params.sucursalId)
  if (params.productoVarianteId) q.set("productoVarianteId", params.productoVarianteId)
  if (params.bajoStock != null)  q.set("bajoStock", String(params.bajoStock))
  const { data } = await http.get<StockPorVariante[]>(`/api/stock/movimientos/stock?${q}`)
  return data
}

// ── Parámetros de stock ────────────────────────────────────────────────────────

export interface ParametroStock {
  productoVarianteId: string
  productoNombre: string
  varianteSku: string | null
  varianteColor: string | null
  varianteTalle: string | null
  sucursalId: string
  sucursalNombre: string
  stockMinimo: number
  stockMaximo: number
}

export async function getParametrosStock(params: { sucursalId?: string; productoVarianteId?: string } = {}): Promise<ParametroStock[]> {
  const q = new URLSearchParams()
  if (params.sucursalId)         q.set("sucursalId", params.sucursalId)
  if (params.productoVarianteId) q.set("productoVarianteId", params.productoVarianteId)
  const { data } = await http.get<ParametroStock[]>(`/api/stock/parametros?${q}`)
  return data
}

export async function upsertParametroStock(request: {
  productoVarianteId: string; sucursalId: string; stockMinimo: number; stockMaximo: number
}): Promise<ParametroStock> {
  const { data } = await http.put<ParametroStock>("/api/stock/parametros", request)
  return data
}

export async function deleteParametroStock(productoVarianteId: string, sucursalId: string): Promise<void> {
  await http.delete(`/api/stock/parametros?productoVarianteId=${productoVarianteId}&sucursalId=${sucursalId}`)
}
