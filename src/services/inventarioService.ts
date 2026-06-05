import { http } from "@/api/http"

// ── Tipos ──────────────────────────────────────────────────────────────────────

export interface Producto {
  id: number
  nombre: string
  categoria: string
  sku: string | null
  precioCosto: number
  precioVenta: number
  stockActual: number
  stockMinimo: number
  stockMaximo: number | null
  bajoStock: boolean
  isActive: boolean
  descuentoCategoria: number
  createdAt: string
  updatedAt: string
  marcaId: number | null
  marcaNombre: string | null
  modeloId: number | null
  modeloNombre: string | null
  color: string | null
  talle: string | null
  descripcion: string | null
  imagenUrl: string | null
}

export interface Marca {
  id: number
  nombre: string
  isActive: boolean
  totalModelos: number
}

export interface Modelo {
  id: number
  nombre: string
  marcaId: number
  marcaNombre: string
  isActive: boolean
}

export interface MovimientoStock {
  id: number
  productoId: number
  productoNombre: string
  tipo: "Entrada" | "Salida" | "Ajuste"
  cantidad: number
  motivo: string | null
  motivoMovimientoId: number | null
  fechaMovimiento: string
  creadoPorNombre: string | null
  estado: "Pendiente" | "Aprobado" | "Rechazado"
  aprobadoPorNombre: string | null
  fechaAprobacion: string | null
  observacionesAprobacion: string | null
  createdAt: string
}

export interface MotivoMovimiento {
  id: number
  nombre: string
  tipo: "Entrada" | "Salida" | "Ambos"
  isActive: boolean
  createdAt: string
}

export interface ProveedorContacto {
  id: number
  nombre: string
  cargo: string | null
  telefono: string | null
  email: string | null
}

export interface Proveedor {
  id: number
  nombre: string
  razonSocial: string | null
  ruc: string
  direccion: string | null
  ciudad: string | null
  sitioWeb: string | null
  facebook: string | null
  instagram: string | null
  whatsApp: string | null
  esLaboratorio: boolean
  isActive: boolean
  createdAt: string
  contactos: ProveedorContacto[]
}

export interface PedidoItem {
  id: number
  productoId: number
  productoNombre: string
  cantidad: number
  precioUnitario: number
}

export interface Pedido {
  id: number
  proveedorId: number
  proveedorNombre: string
  estado: "Pendiente" | "Enviado" | "Recibido" | "Cancelado"
  observaciones: string | null
  createdAt: string
  updatedAt: string
  items: PedidoItem[]
}

export interface PagedResult<T> {
  items: T[]
  totalCount: number
  totalActive: number
  page: number
  pageSize: number
  totalPages: number
}

// ── Requests ───────────────────────────────────────────────────────────────────

export interface CreateProductoRequest {
  nombre: string
  categoria: string
  sku?: string
  precioCosto: number
  precioVenta: number
  stockMinimo: number
  marcaId?: number | null
  modeloId?: number | null
  color?: string
  talle?: string
  descripcion?: string
}

export interface UpdateProductoRequest {
  nombre: string
  categoria: string
  sku?: string
  precioCosto: number
  precioVenta: number
  isActive: boolean
  marcaId?: number | null
  modeloId?: number | null
  color?: string
  talle?: string
  descripcion?: string
}

export interface CreateMarcaRequest {
  nombre: string
}

export interface UpdateMarcaRequest {
  nombre: string
  isActive: boolean
}

export interface CreateModeloRequest {
  nombre: string
  marcaId: number
}

export interface UpdateModeloRequest {
  nombre: string
  marcaId: number
  isActive: boolean
}

export interface CreateMovimientoRequest {
  tipo: "Entrada" | "Salida"
  cantidad: number
  motivoMovimientoId?: number
  fechaMovimiento?: string
}

export interface AprobarRechazarMovimientoRequest {
  estado: "Aprobado" | "Rechazado"
  observaciones?: string
}

export interface CreateMotivoMovimientoRequest {
  nombre: string
  tipo: "Entrada" | "Salida" | "Ambos"
}

export interface UpdateMotivoMovimientoRequest {
  nombre: string
  tipo: "Entrada" | "Salida" | "Ambos"
  isActive: boolean
}

export interface CreateProveedorContactoRequest {
  nombre: string
  cargo?: string
  telefono?: string
  email?: string
}

export interface CreateProveedorRequest {
  nombre: string
  razonSocial?: string
  ruc: string
  direccion?: string
  ciudad?: string
  sitioWeb?: string
  facebook?: string
  instagram?: string
  whatsApp?: string
  esLaboratorio?: boolean
  contactos: CreateProveedorContactoRequest[]
}

export interface CreatePedidoItemRequest {
  productoId: number
  cantidad: number
  precioUnitario: number
}

export interface CreatePedidoRequest {
  proveedorId: number
  observaciones?: string
  items: CreatePedidoItemRequest[]
}

// ── Productos ──────────────────────────────────────────────────────────────────

export async function getProductos(params: {
  page?: number
  pageSize?: number
  search?: string
  categoria?: string
  bajoStock?: boolean
} = {}): Promise<PagedResult<Producto>> {
  const q = new URLSearchParams()
  if (params.page) q.set("page", String(params.page))
  if (params.pageSize) q.set("pageSize", String(params.pageSize))
  if (params.search) q.set("search", params.search)
  if (params.categoria) q.set("categoria", params.categoria)
  if (params.bajoStock != null) q.set("bajoStock", String(params.bajoStock))
  const { data } = await http.get<PagedResult<Producto>>(`/api/productos?${q}`)
  return data
}

export async function createProducto(request: CreateProductoRequest): Promise<Producto> {
  const { data } = await http.post<Producto>("/api/productos", request)
  return data
}

export async function updateProducto(id: number, request: UpdateProductoRequest): Promise<Producto> {
  const { data } = await http.put<Producto>(`/api/productos/${id}`, request)
  return data
}

export async function deactivateProducto(id: number): Promise<void> {
  await http.delete(`/api/productos/${id}`)
}

export async function updateStockConfig(id: number, request: UpdateStockConfigRequest): Promise<Producto> {
  const { data } = await http.put<Producto>(`/api/productos/${id}/stock-config`, request)
  return data
}

export async function uploadProductoImagen(id: number, file: File): Promise<string> {
  const form = new FormData()
  form.append("file", file)
  const { data } = await http.post<string>(`/api/productos/${id}/imagen`, form, {
    headers: { "Content-Type": "multipart/form-data" },
  })
  return data
}

export async function deleteProductoImagen(id: number): Promise<void> {
  await http.delete(`/api/productos/${id}/imagen`)
}

// ── Movimientos ────────────────────────────────────────────────────────────────

export async function registrarMovimiento(
  productoId: number,
  request: CreateMovimientoRequest,
): Promise<MovimientoStock> {
  const { data } = await http.post<MovimientoStock>(
    `/api/productos/${productoId}/movimientos`,
    request,
  )
  return data
}

export async function getMovimientos(params: {
  page?: number
  pageSize?: number
  tipo?: string
  estado?: string
} = {}): Promise<PagedResult<MovimientoStock>> {
  const q = new URLSearchParams()
  if (params.page) q.set("page", String(params.page))
  if (params.pageSize) q.set("pageSize", String(params.pageSize))
  if (params.tipo) q.set("tipo", params.tipo)
  if (params.estado) q.set("estado", params.estado)
  const { data } = await http.get<PagedResult<MovimientoStock>>(`/api/productos/movimientos?${q}`)
  return data
}

export async function aprobarRechazarMovimiento(
  id: number,
  request: AprobarRechazarMovimientoRequest,
): Promise<MovimientoStock> {
  const { data } = await http.patch<MovimientoStock>(`/api/productos/movimientos/${id}/estado`, request)
  return data
}

// ── Proveedores ────────────────────────────────────────────────────────────────

export async function getProveedores(params: {
  page?: number
  pageSize?: number
  search?: string
  isActive?: boolean
} = {}): Promise<PagedResult<Proveedor>> {
  const q = new URLSearchParams()
  if (params.page)     q.set("page", String(params.page))
  if (params.pageSize) q.set("pageSize", String(params.pageSize))
  if (params.search)   q.set("search", params.search)
  if (params.isActive != null) q.set("isActive", String(params.isActive))
  const { data } = await http.get<PagedResult<Proveedor>>(`/api/proveedores?${q}`)
  return data
}

export async function createProveedor(request: CreateProveedorRequest): Promise<Proveedor> {
  const { data } = await http.post<Proveedor>("/api/proveedores", request)
  return data
}

export async function updateProveedor(
  id: number,
  request: CreateProveedorRequest,
): Promise<Proveedor> {
  const { data } = await http.put<Proveedor>(`/api/proveedores/${id}`, request)
  return data
}

export async function deactivateProveedor(id: number): Promise<void> {
  await http.delete(`/api/proveedores/${id}`)
}

// ── Pedidos ────────────────────────────────────────────────────────────────────

export async function getPedidos(params: {
  proveedorId?: number
  estado?: string
} = {}): Promise<Pedido[]> {
  const q = new URLSearchParams()
  if (params.proveedorId) q.set("proveedorId", String(params.proveedorId))
  if (params.estado) q.set("estado", params.estado)
  const { data } = await http.get<Pedido[]>(`/api/proveedores/pedidos?${q}`)
  return data
}

export async function createPedido(request: CreatePedidoRequest): Promise<Pedido> {
  const { data } = await http.post<Pedido>("/api/proveedores/pedidos", request)
  return data
}

export async function updatePedidoEstado(id: number, estado: string): Promise<Pedido> {
  const { data } = await http.put<Pedido>(`/api/proveedores/pedidos/${id}/estado`, { estado })
  return data
}

export async function cancelPedido(id: number): Promise<void> {
  await http.delete(`/api/proveedores/pedidos/${id}`)
}

// ── Categorías de producto ─────────────────────────────────────────────────────

export interface CategoriaProducto {
  id: number
  nombre: string
  descripcion: string | null
  margen: number
  descuento: number
  isActive: boolean
  totalProductos: number
}

export interface CreateCategoriaProductoRequest {
  nombre: string
  descripcion?: string
  margen: number
  descuento: number
}

export interface UpdateCategoriaProductoRequest {
  nombre: string
  descripcion?: string
  margen: number
  descuento: number
  isActive: boolean
}

export interface UpdateStockConfigRequest {
  precioCosto: number
  stockMinimo: number
  stockMaximo?: number | null
}

export async function getCategorias(): Promise<CategoriaProducto[]> {
  const { data } = await http.get<CategoriaProducto[]>("/api/productos/categorias")
  return data
}

export async function createCategoria(request: CreateCategoriaProductoRequest): Promise<CategoriaProducto> {
  const { data } = await http.post<CategoriaProducto>("/api/productos/categorias", request)
  return data
}

export async function updateCategoria(id: number, request: UpdateCategoriaProductoRequest): Promise<CategoriaProducto> {
  const { data } = await http.put<CategoriaProducto>(`/api/productos/categorias/${id}`, request)
  return data
}

export async function deactivateCategoria(id: number): Promise<void> {
  await http.delete(`/api/productos/categorias/${id}`)
}

// ── Marcas ─────────────────────────────────────────────────────────────────────

export async function getMarcas(): Promise<Marca[]> {
  const { data } = await http.get<Marca[]>("/api/marcas")
  return data
}

export async function createMarca(request: CreateMarcaRequest): Promise<Marca> {
  const { data } = await http.post<Marca>("/api/marcas", request)
  return data
}

export async function updateMarca(id: number, request: UpdateMarcaRequest): Promise<Marca> {
  const { data } = await http.put<Marca>(`/api/marcas/${id}`, request)
  return data
}

export async function deactivateMarca(id: number): Promise<void> {
  await http.delete(`/api/marcas/${id}`)
}

// ── Modelos ────────────────────────────────────────────────────────────────────

export async function getModelos(marcaId?: number): Promise<Modelo[]> {
  const q = marcaId != null ? `?marcaId=${marcaId}` : ""
  const { data } = await http.get<Modelo[]>(`/api/marcas/modelos${q}`)
  return data
}

export async function createModelo(request: CreateModeloRequest): Promise<Modelo> {
  const { data } = await http.post<Modelo>("/api/marcas/modelos", request)
  return data
}

export async function updateModelo(id: number, request: UpdateModeloRequest): Promise<Modelo> {
  const { data } = await http.put<Modelo>(`/api/marcas/modelos/${id}`, request)
  return data
}

export async function deactivateModelo(id: number): Promise<void> {
  await http.delete(`/api/marcas/modelos/${id}`)
}

// ── Stock Lotes ────────────────────────────────────────────────────────────────

export interface StockLote {
  id: number
  productoId: number
  productoNombre: string
  productoSku?: string
  marcaNombre?: string
  modeloNombre?: string
  lote: string
  fechaVencimiento?: string
  cantidadInicial: number
  fechaIngreso: string
  recepcionItemId: number
}

export interface ConteoItemRequest {
  loteId: number
  cantidadFisica: number
}

export interface RegistrarConteoRequest {
  items: ConteoItemRequest[]
  observaciones?: string
}

export interface ConteoInventarioDto {
  id: number
  creadoPorNombre: string
  fechaConteo: string
  estado: string
  observaciones?: string
  aprobadoPorNombre?: string
  fechaAprobacion?: string
  observacionesAprobacion?: string
  totalLineas: number
  lineasConDiferencia: number
}

export interface ConteoLineaDto {
  id: number
  productoId: number
  productoNombre: string
  productoSku?: string
  productoCategoria?: string
  cantidadSistema: number
  cantidadFisica: number
  diferencia: number
}

export interface ConteoInventarioDetalleDto extends ConteoInventarioDto {
  lineas: ConteoLineaDto[]
}

export interface GestionarConteoRequest {
  accion: string
  observaciones?: string
}

export async function getStockLotes(params?: { productoId?: number; vencidos?: boolean }): Promise<StockLote[]> {
  const q = new URLSearchParams()
  if (params?.productoId != null) q.set("productoId", String(params.productoId))
  if (params?.vencidos != null) q.set("vencidos", String(params.vencidos))
  const { data } = await http.get<StockLote[]>(`/api/stock/lotes${q.toString() ? "?" + q : ""}`)
  return data
}

export async function registrarConteo(request: RegistrarConteoRequest): Promise<ConteoInventarioDto> {
  const { data } = await http.post<ConteoInventarioDto>("/api/stock/lotes/conteo", request)
  return data
}

export async function getConteos(estado?: string): Promise<ConteoInventarioDto[]> {
  const q = estado ? `?estado=${estado}` : ""
  const { data } = await http.get<ConteoInventarioDto[]>(`/api/stock/lotes/conteos${q}`)
  return data
}

export async function getConteoById(id: number): Promise<ConteoInventarioDetalleDto> {
  const { data } = await http.get<ConteoInventarioDetalleDto>(`/api/stock/lotes/conteos/${id}`)
  return data
}

export async function gestionarConteo(id: number, request: GestionarConteoRequest): Promise<ConteoInventarioDto> {
  const { data } = await http.post<ConteoInventarioDto>(`/api/stock/lotes/conteos/${id}/gestionar`, request)
  return data
}

// ── Motivos de Movimiento ──────────────────────────────────────────────────────

export async function getMotivosMovimiento(tipo?: string): Promise<MotivoMovimiento[]> {
  const q = tipo ? `?tipo=${tipo}` : ""
  const { data } = await http.get<MotivoMovimiento[]>(`/api/motivos-movimiento${q}`)
  return data
}

export async function createMotivoMovimiento(request: CreateMotivoMovimientoRequest): Promise<MotivoMovimiento> {
  const { data } = await http.post<MotivoMovimiento>("/api/motivos-movimiento", request)
  return data
}

export async function updateMotivoMovimiento(id: number, request: UpdateMotivoMovimientoRequest): Promise<MotivoMovimiento> {
  const { data } = await http.put<MotivoMovimiento>(`/api/motivos-movimiento/${id}`, request)
  return data
}

export async function deactivateMotivoMovimiento(id: number): Promise<void> {
  await http.delete(`/api/motivos-movimiento/${id}`)
}

// ── Tipos de Lente ─────────────────────────────────────────────────────────────

export interface TipoLente {
  id: number
  nombre: string
  isActive: boolean
  createdAt: string
}

export interface CreateTipoLenteRequest { nombre: string }
export interface UpdateTipoLenteRequest { nombre: string; isActive: boolean }

export async function getTiposLente(): Promise<TipoLente[]> {
  const { data } = await http.get<TipoLente[]>("/api/tipos-lente")
  return data
}

export async function createTipoLente(request: CreateTipoLenteRequest): Promise<TipoLente> {
  const { data } = await http.post<TipoLente>("/api/tipos-lente", request)
  return data
}

export async function updateTipoLente(id: number, request: UpdateTipoLenteRequest): Promise<TipoLente> {
  const { data } = await http.put<TipoLente>(`/api/tipos-lente/${id}`, request)
  return data
}

export async function deactivateTipoLente(id: number): Promise<void> {
  await http.delete(`/api/tipos-lente/${id}`)
}

// ── Tratamientos ───────────────────────────────────────────────────────────────

export interface Tratamiento {
  id: number
  nombre: string
  isActive: boolean
  createdAt: string
}

export interface CreateTratamientoRequest { nombre: string }
export interface UpdateTratamientoRequest { nombre: string; isActive: boolean }

export async function getTratamientos(): Promise<Tratamiento[]> {
  const { data } = await http.get<Tratamiento[]>("/api/tratamientos")
  return data
}

export async function createTratamiento(request: CreateTratamientoRequest): Promise<Tratamiento> {
  const { data } = await http.post<Tratamiento>("/api/tratamientos", request)
  return data
}

export async function updateTratamiento(id: number, request: UpdateTratamientoRequest): Promise<Tratamiento> {
  const { data } = await http.put<Tratamiento>(`/api/tratamientos/${id}`, request)
  return data
}

export async function deactivateTratamiento(id: number): Promise<void> {
  await http.delete(`/api/tratamientos/${id}`)
}
