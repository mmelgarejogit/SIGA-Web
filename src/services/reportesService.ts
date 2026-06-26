import { useHttp } from "@/composables/useHttp"

const { get } = useHttp()

// ── Tipos (espejo de ReporteVentasDto del backend) ───────────────────────────

export interface SeriePunto {
  periodo: string
  facturado: number
  cobrado: number
}

export interface MetodoPagoMonto {
  metodo: string
  monto: number
  porcentaje: number
}

export interface CondicionMonto {
  condicion: string
  monto: number
  cantidad: number
}

export interface CategoriaFiscalMonto {
  categoria: string
  monto: number
}

export interface RankingItem {
  nombre: string
  cantidad: number
  monto: number
}

export interface CajeroMonto {
  nombre: string
  monto: number
  cantidad: number
}

export interface ReporteVentas {
  desde: string
  hasta: string
  agrupacion: string

  totalFacturado: number
  totalCobrado: number
  cantidadVentas: number
  ticketPromedio: number
  saldoPendiente: number
  cantidadPresupuestos: number
  tasaConversion: number

  serieTemporal: SeriePunto[]
  porMetodoPago: MetodoPagoMonto[]
  porCondicion: CondicionMonto[]
  porCategoriaFiscal: CategoriaFiscalMonto[]
  topProductos: RankingItem[]
  topServicios: RankingItem[]
  porCajero: CajeroMonto[]
}

export type Agrupacion = "dia" | "semana" | "mes"

export const getReporteVentas = (params: {
  desde: string
  hasta: string
  agrupacion: Agrupacion
}) => {
  const q = new URLSearchParams()
  q.set("desde", params.desde)
  q.set("hasta", params.hasta)
  q.set("agrupacion", params.agrupacion)
  return get<ReporteVentas>(`/api/reportes/ventas?${q.toString()}`)
}

// ── Reporte de Citas ──────────────────────────────────────────────────────────

export interface SeriePuntoCitas {
  periodo: string
  turnos: number
  completados: number
}

export interface EstadoCitas {
  estado: string
  cantidad: number
  porcentaje: number
}

export interface ProfesionalCitas {
  nombre: string
  turnos: number
  completados: number
}

export interface ReporteCitas {
  desde: string
  hasta: string
  agrupacion: string

  totalTurnos: number
  completados: number
  cancelados: number
  ausentes: number
  tasaAsistencia: number
  consultas: number
  recetas: number

  serieTemporal: SeriePuntoCitas[]
  porEstado: EstadoCitas[]
  porProfesional: ProfesionalCitas[]
}

export const getReporteCitas = (params: {
  desde: string
  hasta: string
  agrupacion: Agrupacion
}) => {
  const q = new URLSearchParams()
  q.set("desde", params.desde)
  q.set("hasta", params.hasta)
  q.set("agrupacion", params.agrupacion)
  return get<ReporteCitas>(`/api/reportes/citas?${q.toString()}`)
}

// ── Reporte de Inventario ─────────────────────────────────────────────────────

export interface SeriePuntoInventario {
  periodo: string
  entradas: number
  salidas: number
}

export interface CategoriaInventario {
  categoria: string
  productos: number
  valor: number
}

export interface ProductoCritico {
  nombre: string
  stockActual: number
  stockMinimo: number
  faltante: number
}

export interface ProductoValor {
  nombre: string
  stockActual: number
  valor: number
}

export interface ReporteInventario {
  desde: string
  hasta: string
  agrupacion: string

  productosActivos: number
  valorInventario: number
  stockCritico: number
  sinStock: number
  unidadesEnStock: number

  totalEntradas: number
  totalSalidas: number

  serieTemporal: SeriePuntoInventario[]
  porCategoria: CategoriaInventario[]
  productosCriticos: ProductoCritico[]
  topPorValor: ProductoValor[]
}

export const getReporteInventario = (params: {
  desde: string
  hasta: string
  agrupacion: Agrupacion
}) => {
  const q = new URLSearchParams()
  q.set("desde", params.desde)
  q.set("hasta", params.hasta)
  q.set("agrupacion", params.agrupacion)
  return get<ReporteInventario>(`/api/reportes/inventario?${q.toString()}`)
}

// ── Reporte de Compras ────────────────────────────────────────────────────────

export interface SeriePuntoCompras {
  periodo: string
  monto: number
}

export interface EstadoOc {
  estado: string
  cantidad: number
  porcentaje: number
}

export interface ProveedorCompras {
  nombre: string
  facturas: number
  monto: number
}

export interface ReporteCompras {
  desde: string
  hasta: string
  agrupacion: string

  ordenesCompra: number
  montoFacturado: number
  iva: number
  pendientePago: number
  recepciones: number

  serieTemporal: SeriePuntoCompras[]
  porEstadoOc: EstadoOc[]
  porProveedor: ProveedorCompras[]
}

export const getReporteCompras = (params: {
  desde: string
  hasta: string
  agrupacion: Agrupacion
}) => {
  const q = new URLSearchParams()
  q.set("desde", params.desde)
  q.set("hasta", params.hasta)
  q.set("agrupacion", params.agrupacion)
  return get<ReporteCompras>(`/api/reportes/compras?${q.toString()}`)
}
