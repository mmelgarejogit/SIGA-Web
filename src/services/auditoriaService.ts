import { useHttp } from "@/composables/useHttp"

const { get } = useHttp()

export type AuditCategoria = "Seguridad" | "Admin" | "Operativo"

export interface RegistroAuditoria {
  id: number
  fechaHora: string // ISO 8601 (UTC)
  categoria: AuditCategoria
  accion: string
  userId?: number
  usuarioNombre: string
  entidad?: string
  entidadId?: number
  descripcion: string
  sucursalId?: number
  sucursalNombre?: string
  ipAddress?: string
}

export interface AuditAccionCatalogo {
  accion: string
  categoria: AuditCategoria
}

export interface RegistrosPagedResult {
  items: RegistroAuditoria[]
  totalCount: number
  page: number
  pageSize: number
  totalPages: number
}

// ── Etiquetas legibles (el backend expone los nombres del enum) ─────────────────
export const CATEGORIA_LABELS: Record<AuditCategoria, string> = {
  Seguridad: "Seguridad",
  Admin: "Administración",
  Operativo: "Operativo",
}

export const ACCION_LABELS: Record<string, string> = {
  LoginExitoso: "Inició sesión",
  LoginFallido: "Intento de login fallido",
  PasswordCambiado: "Cambió su contraseña",
  PasswordReseteado: "Reseteó una contraseña",
  UsuarioDesactivado: "Desactivó un usuario",
  RolAsignado: "Asignó un rol",
  RolQuitado: "Quitó un rol",
  RolCreado: "Creó un rol",
  RolActualizado: "Editó un rol",
  RolEliminado: "Eliminó un rol",
  VentaAnulada: "Anuló una venta",
  DevolucionAprobada: "Aprobó una devolución",
  DevolucionRechazada: "Rechazó una devolución",
  CierreCajaAprobado: "Aprobó un cierre de caja",
  CierreCajaRechazado: "Rechazó un cierre de caja",
}

// Etiqueta con fallback: si aparece una acción nueva no mapeada, se muestra su nombre crudo.
export const accionLabel = (accion: string) => ACCION_LABELS[accion] ?? accion

export const getRegistrosAuditoria = (params?: {
  categoria?: string
  accion?: string
  userId?: number
  fechaDesde?: string
  fechaHasta?: string
  search?: string
  page?: number
  pageSize?: number
}) => {
  const q = new URLSearchParams()
  if (params?.categoria)  q.set("categoria",  params.categoria)
  if (params?.accion)     q.set("accion",     params.accion)
  if (params?.userId)     q.set("userId",     String(params.userId))
  if (params?.fechaDesde) q.set("fechaDesde", params.fechaDesde)
  if (params?.fechaHasta) q.set("fechaHasta", params.fechaHasta)
  if (params?.search)     q.set("search",     params.search)
  if (params?.page)       q.set("page",       String(params.page))
  if (params?.pageSize)   q.set("pageSize",   String(params.pageSize))
  const qs = q.toString()
  return get<RegistrosPagedResult>(`/api/auditoria${qs ? "?" + qs : ""}`)
}

export const getAccionesAuditoria = () =>
  get<AuditAccionCatalogo[]>("/api/auditoria/acciones")
