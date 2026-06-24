import { http } from "@/api/http"

// ── Tipos ──────────────────────────────────────────────────────────────────────

export interface Departamento {
  id: number
  nombre: string
  isActive: boolean
  totalCiudades: number
}

export interface Ciudad {
  id: number
  nombre: string
  departamentoId: number
  departamentoNombre: string
  isActive: boolean
}

export interface CreateDepartamentoRequest {
  nombre: string
}

export interface UpdateDepartamentoRequest {
  nombre: string
  isActive: boolean
}

export interface CreateCiudadRequest {
  nombre: string
  departamentoId: number
}

export interface UpdateCiudadRequest {
  nombre: string
  departamentoId: number
  isActive: boolean
}

// ── Departamentos ────────────────────────────────────────────────────────────────

export async function getDepartamentos(isActive?: boolean): Promise<Departamento[]> {
  const q = isActive !== undefined ? `?isActive=${isActive}` : ""
  const { data } = await http.get<Departamento[]>(`/api/ubicaciones/departamentos${q}`)
  return data
}

export async function createDepartamento(request: CreateDepartamentoRequest): Promise<Departamento> {
  const { data } = await http.post<Departamento>("/api/ubicaciones/departamentos", request)
  return data
}

export async function updateDepartamento(id: number, request: UpdateDepartamentoRequest): Promise<Departamento> {
  const { data } = await http.put<Departamento>(`/api/ubicaciones/departamentos/${id}`, request)
  return data
}

// ── Ciudades ──────────────────────────────────────────────────────────────────────

export async function getCiudades(departamentoId?: number, isActive?: boolean): Promise<Ciudad[]> {
  const params = new URLSearchParams()
  if (departamentoId !== undefined) params.set("departamentoId", String(departamentoId))
  if (isActive !== undefined) params.set("isActive", String(isActive))
  const q = params.toString() ? `?${params}` : ""
  const { data } = await http.get<Ciudad[]>(`/api/ubicaciones/ciudades${q}`)
  return data
}

export async function createCiudad(request: CreateCiudadRequest): Promise<Ciudad> {
  const { data } = await http.post<Ciudad>("/api/ubicaciones/ciudades", request)
  return data
}

export async function updateCiudad(id: number, request: UpdateCiudadRequest): Promise<Ciudad> {
  const { data } = await http.put<Ciudad>(`/api/ubicaciones/ciudades/${id}`, request)
  return data
}
