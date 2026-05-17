import { useHttp } from "@/composables/useHttp"

const { get, post, put } = useHttp()

export type TipoEgreso = "FacturaCompra" | "Honorario" | "GastoGeneral"
export type EstadoEgreso = "Borrador" | "Pendiente" | "Pagado" | "Anulado"
export type MetodoPago = "Efectivo" | "Tarjeta" | "Transferencia" | "Cheque"

export interface Egreso {
  id: number
  tipo: TipoEgreso
  estado: EstadoEgreso
  monto: number
  concepto: string
  observaciones?: string
  fechaEmision: string
  fechaVencimiento?: string
  fechaPago?: string
  metodoPago?: MetodoPago
  estaVencido: boolean
  createdAt: string

  // FacturaCompra
  nroFactura?: string
  proveedorId?: number
  proveedorNombre?: string
  pedidoProveedorId?: number

  // Honorario
  professionalId?: number
  professionalNombre?: string
  periodo?: string

  // GastoGeneral
  categoriaGastoId?: number
  categoriaGastoNombre?: string
}

export interface CategoriaGasto {
  id: number
  nombre: string
  descripcion?: string
  activo: boolean
}

export interface CrearFacturaCompraRequest {
  proveedorId: number
  pedidoProveedorId?: number
  nroFactura?: string
  monto: number
  concepto: string
  observaciones?: string
  fechaEmision: string
  fechaVencimiento?: string
}

export interface CrearHonorarioRequest {
  professionalId: number
  monto: number
  concepto: string
  periodo?: string
  observaciones?: string
  fechaEmision: string
  fechaVencimiento?: string
}

export interface CrearGastoGeneralRequest {
  categoriaGastoId: number
  monto: number
  concepto: string
  observaciones?: string
  fechaEmision: string
  fechaVencimiento?: string
}

export interface RegistrarPagoRequest {
  metodoPago: MetodoPago
  fechaPago: string
}

export interface AnularEgresoRequest {
  motivo?: string
}

export interface EgresosPagedResult {
  items: Egreso[]
  totalCount: number
  page: number
  pageSize: number
  totalPages: number
}

export const getEgresos = (params?: {
  tipo?: string
  estado?: string
  fechaDesde?: string
  fechaHasta?: string
  soloVencidos?: boolean
  page?: number
  pageSize?: number
}) => {
  const q = new URLSearchParams()
  if (params?.tipo) q.set("tipo", params.tipo)
  if (params?.estado) q.set("estado", params.estado)
  if (params?.fechaDesde) q.set("fechaDesde", params.fechaDesde)
  if (params?.fechaHasta) q.set("fechaHasta", params.fechaHasta)
  if (params?.soloVencidos) q.set("soloVencidos", "true")
  if (params?.page) q.set("page", String(params.page))
  if (params?.pageSize) q.set("pageSize", String(params.pageSize))
  const qs = q.toString()
  return get<EgresosPagedResult>(`/api/egresos${qs ? "?" + qs : ""}`)
}

export const getEgresoById = (id: number) => get<Egreso>(`/api/egresos/${id}`)

export const crearFacturaCompra = (data: CrearFacturaCompraRequest) =>
  post<Egreso>("/api/egresos/facturas", data)

export const crearHonorario = (data: CrearHonorarioRequest) =>
  post<Egreso>("/api/egresos/honorarios", data)

export const crearGastoGeneral = (data: CrearGastoGeneralRequest) =>
  post<Egreso>("/api/egresos/gastos", data)

export const registrarPago = (id: number, data: RegistrarPagoRequest) =>
  put<Egreso>(`/api/egresos/${id}/pago`, data)

export const anularEgreso = (id: number, data: AnularEgresoRequest) =>
  put<Egreso>(`/api/egresos/${id}/anular`, data)

export const getCategorias = () => get<CategoriaGasto[]>("/api/egresos/categorias")

export const crearCategoria = (data: { nombre: string; descripcion?: string }) =>
  post<CategoriaGasto>("/api/egresos/categorias", data)

export const actualizarCategoria = (
  id: number,
  data: { nombre: string; descripcion?: string; activo: boolean },
) => put<CategoriaGasto>(`/api/egresos/categorias/${id}`, data)
