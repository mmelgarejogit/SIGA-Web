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
  createdAt: string
}

export interface Proveedor {
  id: number
  nombre: string
  contacto: string | null
  email: string | null
  telefono: string | null
  ruc: string
  timbrado: string
  vigenciaTimbrado: string | null
  establecimiento: string | null
  isActive: boolean
  createdAt: string
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
  stockActual: number
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
  stockMinimo: number
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
  tipo: "Entrada" | "Salida" | "Ajuste"
  cantidad: number
  motivo?: string
}

export interface CreateProveedorRequest {
  nombre: string
  contacto?: string
  email?: string
  telefono?: string
  ruc: string
  timbrado: string
  vigenciaTimbrado?: string
  establecimiento?: string
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

export async function updateStockInfo(id: number, request: UpdateStockInfoRequest): Promise<Producto> {
  const { data } = await http.put<Producto>(`/api/productos/${id}/stock`, request)
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
} = {}): Promise<PagedResult<MovimientoStock>> {
  const q = new URLSearchParams()
  if (params.page) q.set("page", String(params.page))
  if (params.pageSize) q.set("pageSize", String(params.pageSize))
  if (params.tipo) q.set("tipo", params.tipo)
  const { data } = await http.get<PagedResult<MovimientoStock>>(`/api/productos/movimientos?${q}`)
  return data
}

// ── Proveedores ────────────────────────────────────────────────────────────────

export async function getProveedores(search?: string): Promise<Proveedor[]> {
  const q = search ? `?search=${encodeURIComponent(search)}` : ""
  const { data } = await http.get<Proveedor[]>(`/api/proveedores${q}`)
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

export interface UpdateStockInfoRequest {
  precioCosto: number
  stockMinimo: number
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
