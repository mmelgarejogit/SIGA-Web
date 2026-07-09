import { http } from "@/api/http"

export interface PagedResult<T> {
  items: T[]
  totalCount: number
  page: number
  pageSize: number
  totalPages: number
}

export interface Notificacion {
  id: number
  tipo: string
  mensaje: string
  entidadOrigenTipo?: string
  entidadOrigenId?: number
  leido: boolean
  fechaCreacion: string
  fechaLectura?: string
}

export interface GetNotificacionesParams {
  soloNoLeidas?: boolean
  page?: number
  pageSize?: number
}

export async function getNotificaciones(
  params: GetNotificacionesParams = {},
): Promise<PagedResult<Notificacion>> {
  const query = new URLSearchParams()
  if (params.soloNoLeidas) query.set("soloNoLeidas", "true")
  if (params.page) query.set("page", String(params.page))
  if (params.pageSize) query.set("pageSize", String(params.pageSize))
  const { data } = await http.get<PagedResult<Notificacion>>(`/api/notificaciones?${query}`)
  return data
}

export async function getContadorNoLeidas(): Promise<number> {
  const { data } = await http.get<number>("/api/notificaciones/contador")
  return data
}

export async function marcarLeida(id: number): Promise<void> {
  await http.put(`/api/notificaciones/${id}/leer`)
}

export async function marcarTodasLeidas(): Promise<void> {
  await http.put("/api/notificaciones/leer-todas")
}
