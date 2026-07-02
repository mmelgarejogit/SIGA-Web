import { http } from "@/api/http"

export type TipoReporte = "ventas" | "compras" | "inventario" | "caja"

export interface ReporteOperativoFiltros {
  desde?: string | null
  hasta?: string | null
  sucursalId?: number | null
  metodoPago?: string | null
  categoria?: string | null
  operadorId?: number | null
  tipoMov?: string | null
  page?: number
  pageSize?: number
}

export type ReporteRow = Record<string, string | number>

export interface ReporteOperativoResult {
  rows: ReporteRow[]
  totalCount: number
  page: number
  pageSize: number
  totales: Record<string, number>
}

function toParams(f: ReporteOperativoFiltros): Record<string, string | number> {
  const p: Record<string, string | number> = {}
  if (f.desde) p.desde = f.desde
  if (f.hasta) p.hasta = f.hasta
  if (f.sucursalId != null) p.sucursalId = f.sucursalId
  if (f.metodoPago) p.metodoPago = f.metodoPago
  if (f.categoria) p.categoria = f.categoria
  if (f.operadorId != null) p.operadorId = f.operadorId
  if (f.tipoMov) p.tipoMov = f.tipoMov
  if (f.page != null) p.page = f.page
  if (f.pageSize != null) p.pageSize = f.pageSize
  return p
}

export async function getReporteOperativo(
  tipo: TipoReporte,
  f: ReporteOperativoFiltros,
): Promise<ReporteOperativoResult> {
  const { data } = await http.get<ReporteOperativoResult>(`/api/reportes/operativo/${tipo}`, {
    params: toParams(f),
  })
  return data
}

/** Descarga el reporte completo (PDF/CSV) generado en el backend. */
export async function exportReporteOperativo(
  tipo: TipoReporte,
  formato: "pdf" | "csv",
  f: ReporteOperativoFiltros,
): Promise<void> {
  const { data } = await http.get<Blob>(`/api/reportes/operativo/${tipo}/export`, {
    params: { ...toParams(f), formato },
    responseType: "blob",
  })
  const mime = formato === "csv" ? "text/csv" : "application/pdf"
  const url = URL.createObjectURL(new Blob([data], { type: mime }))
  const a = document.createElement("a")
  a.href = url
  a.download = `reporte-${tipo}.${formato}`
  a.click()
  URL.revokeObjectURL(url)
}
