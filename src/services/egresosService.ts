import { useHttp } from "@/composables/useHttp"

const { get, post, put } = useHttp()

export type TipoEgreso = "FacturaCompra" | "Honorario" | "GastoGeneral" | "Salario" | "FacturaLaboratorio"
export type EstadoEgreso = "Borrador" | "Pendiente" | "Aprobado" | "Rechazado" | "Pagado" | "Anulado"
export type MetodoPago = "Efectivo" | "Tarjeta" | "Transferencia" | "Cheque"
export type CondicionVenta = "Contado" | "Credito"

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
  motivoRechazo?: string
  fechaAprobacion?: string
  nroComprobante?: string
  pagoExterno: boolean
  motivoPagoExterno?: string
  createdAt: string

  // FacturaCompra — referencia
  nroFactura?: string
  proveedorId?: number
  proveedorNombre?: string
  pedidoProveedorId?: number

  // FacturaCompra — desglose fiscal
  montoExento?: number
  montoGravado5?: number
  montoGravado10?: number
  iva5?: number
  iva10?: number
  montoTotal?: number
  condicionVenta?: CondicionVenta

  // Honorario
  professionalId?: number
  professionalNombre?: string
  periodo?: string

  // GastoGeneral
  categoriaGastoId?: number
  categoriaGastoNombre?: string

  // Salario
  empleadoId?: number
  empleadoNombre?: string

  // FacturaLaboratorio
  facturaLaboratorioId?: number
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
  concepto: string
  observaciones?: string
  fechaEmision: string
  fechaVencimiento?: string
  montoExento: number
  montoGravado5: number
  montoGravado10: number
  condicionVenta: CondicionVenta
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

export interface CrearSalarioRequest {
  empleadoId: number
  monto: number
  concepto: string
  periodo?: string
  observaciones?: string
  fechaEmision: string
  fechaVencimiento?: string
}

export interface RegistrarPagoRequest {
  metodoPago: MetodoPago
  fechaPago: string
  nroComprobante?: string
  observaciones?: string
  esExterno?: boolean
  motivoExterno?: string
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

export const crearSalario = (data: CrearSalarioRequest) =>
  post<Egreso>("/api/egresos/salarios", data)

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
