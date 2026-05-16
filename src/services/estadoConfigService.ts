import { http } from "@/api/http"

export interface EstadoConfig {
  id: number
  entidad: string
  nombre: string
  color: string
  codigoInterno?: string
  esProtegido: boolean
  orden: number
}

export interface CreateEstadoConfigRequest {
  entidad: string
  nombre: string
  color: string
  orden: number
}

export interface UpdateEstadoConfigRequest {
  nombre: string
  color: string
  orden: number
}

export async function getEstadosByEntidad(entidad?: string): Promise<EstadoConfig[]> {
  const params = entidad ? { entidad } : {}
  const { data } = await http.get<EstadoConfig[]>("/api/estados-config", { params })
  return data
}

export async function createEstado(request: CreateEstadoConfigRequest): Promise<EstadoConfig> {
  const { data } = await http.post<EstadoConfig>("/api/estados-config", request)
  return data
}

export async function updateEstado(id: number, request: UpdateEstadoConfigRequest): Promise<EstadoConfig> {
  const { data } = await http.put<EstadoConfig>(`/api/estados-config/${id}`, request)
  return data
}

export async function deleteEstado(id: number): Promise<void> {
  await http.delete(`/api/estados-config/${id}`)
}
