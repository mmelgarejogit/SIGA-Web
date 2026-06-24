import { http } from "@/api/http"

export interface Especialidad {
  id: number
  nombre: string
  descripcion?: string
}

export interface EspecialidadRequest {
  nombre: string
  descripcion?: string
}

export async function getEspecialidades(): Promise<Especialidad[]> {
  const { data } = await http.get<Especialidad[]>("/api/especialidades")
  return data
}

export async function createEspecialidad(request: EspecialidadRequest): Promise<Especialidad> {
  const { data } = await http.post<Especialidad>("/api/especialidades", request)
  return data
}

export async function updateEspecialidad(id: number, request: EspecialidadRequest): Promise<Especialidad> {
  const { data } = await http.put<Especialidad>(`/api/especialidades/${id}`, request)
  return data
}

export async function deleteEspecialidad(id: number): Promise<void> {
  await http.delete(`/api/especialidades/${id}`)
}
