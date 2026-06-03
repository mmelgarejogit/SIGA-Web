import { http } from "@/api/http"

// ── Tipos base ─────────────────────────────────────────────────────────────────

export interface PagedResult<T> {
  items: T[]
  totalCount: number
  totalActive?: number
  page: number
  pageSize: number
  totalPages: number
}

// ── Producto ───────────────────────────────────────────────────────────────────

export interface Producto {
  id: number
  nombre: string
  descripcion: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
  categoriaProductoId: number | null
  categoriaNombre: string | null
  descuentoCategoria: number
  marcaId: number | null
  marcaNombre: string | null
  modeloId: number | null
  modeloNombre: string | null
  totalVariantes: number
}

export interface ProductoVariante {
  id: string
  productoId: number
  productoNombre: string
  sku: string | null
  color: string | null
  talle: string | null
  precioCosto: number
  precioVenta: number
  imagenUrl: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface CreateProductoRequest {
  nombre: string
  descripcion?: string
  categoriaProductoId?: number | null
  marcaId?: number | null
  modeloId?: number | null
}

export interface UpdateProductoRequest {
  nombre: string
  descripcion?: string
  categoriaProductoId?: number | null
  marcaId?: number | null
  modeloId?: number | null
  isActive: boolean
}

export interface CreateProductoVarianteRequest {
  productoId: number
  sku?: string
  color?: string
  talle?: string
  precioCosto: number
  precioVenta: number
}

export interface UpdateProductoVarianteRequest {
  sku?: string
  color?: string
  talle?: string
  precioCosto: number
  precioVenta: number
  isActive: boolean
}

// ── Marca / Modelo ─────────────────────────────────────────────────────────────

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

export interface CreateMarcaRequest { nombre: string }
export interface UpdateMarcaRequest { nombre: string; isActive: boolean }
export interface CreateModeloRequest { nombre: string; marcaId: number }
export interface UpdateModeloRequest { nombre: string; marcaId: number; isActive: boolean }

// ── Categoría ──────────────────────────────────────────────────────────────────

export interface CategoriaProducto {
  id: number
  nombre: string
  descripcion: string | null
  margen: number
  descuento: number
  isActive: boolean
  totalProductos: number
}

export interface CreateCategoriaProductoRequest { nombre: string; descripcion?: string; margen: number; descuento: number }
export interface UpdateCategoriaProductoRequest { nombre: string; descripcion?: string; margen: number; descuento: number; isActive: boolean }

// ── Proveedor ──────────────────────────────────────────────────────────────────

export interface ProveedorContacto { id: number; nombre: string; cargo: string | null; telefono: string | null; email: string | null }
export interface Proveedor {
  id: number; nombre: string; razonSocial: string | null; ruc: string; direccion: string | null
  ciudad: string | null; sitioWeb: string | null; facebook: string | null; instagram: string | null
  whatsApp: string | null; isActive: boolean; createdAt: string; contactos: ProveedorContacto[]
}
export interface CreateProveedorRequest {
  nombre: string; razonSocial?: string; ruc: string; direccion?: string; ciudad?: string
  sitioWeb?: string; facebook?: string; instagram?: string; whatsApp?: string
  contactos: { nombre: string; cargo?: string; telefono?: string; email?: string }[]
}

// ── API — Productos ────────────────────────────────────────────────────────────

export async function getProductos(params: { page?: number; pageSize?: number; search?: string; categoriaId?: number; isActive?: boolean } = {}): Promise<PagedResult<Producto>> {
  const q = new URLSearchParams()
  if (params.page)      q.set("page", String(params.page))
  if (params.pageSize)  q.set("pageSize", String(params.pageSize))
  if (params.search)    q.set("search", params.search)
  if (params.categoriaId != null) q.set("categoriaId", String(params.categoriaId))
  if (params.isActive != null)    q.set("isActive", String(params.isActive))
  const { data } = await http.get<PagedResult<Producto>>(`/api/productos?${q}`)
  return data
}

export async function getProductoById(id: number): Promise<Producto> {
  const { data } = await http.get<Producto>(`/api/productos/${id}`)
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

// ── API — Variantes ────────────────────────────────────────────────────────────

export async function getVariantes(productoId: number): Promise<ProductoVariante[]> {
  const { data } = await http.get<ProductoVariante[]>(`/api/productos/${productoId}/variantes`)
  return data
}

export async function createVariante(request: CreateProductoVarianteRequest): Promise<ProductoVariante> {
  const { data } = await http.post<ProductoVariante>("/api/productos/variantes", request)
  return data
}

export async function updateVariante(id: string, request: UpdateProductoVarianteRequest): Promise<ProductoVariante> {
  const { data } = await http.put<ProductoVariante>(`/api/productos/variantes/${id}`, request)
  return data
}

export async function deactivateVariante(id: string): Promise<void> {
  await http.delete(`/api/productos/variantes/${id}`)
}

export async function uploadVarianteImagen(id: string, file: File): Promise<string> {
  const form = new FormData()
  form.append("file", file)
  const { data } = await http.post<string>(`/api/productos/variantes/${id}/imagen`, form, {
    headers: { "Content-Type": "multipart/form-data" },
  })
  return data
}

// ── API — Categorías ───────────────────────────────────────────────────────────

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

// ── API — Marcas ───────────────────────────────────────────────────────────────

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

// ── API — Modelos ──────────────────────────────────────────────────────────────

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

// ── API — Proveedores ──────────────────────────────────────────────────────────

export async function getProveedores(params: { page?: number; pageSize?: number; search?: string; isActive?: boolean } = {}): Promise<PagedResult<Proveedor>> {
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

export async function updateProveedor(id: number, request: CreateProveedorRequest): Promise<Proveedor> {
  const { data } = await http.put<Proveedor>(`/api/proveedores/${id}`, request)
  return data
}

export async function deactivateProveedor(id: number): Promise<void> {
  await http.delete(`/api/proveedores/${id}`)
}
