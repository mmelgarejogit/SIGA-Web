import { http } from "@/api/http"

export interface Sucursal {
  id: number
  nombre: string
  codigo: string
  direccion?: string
  telefono?: string
  email?: string
  ciudadId?: number
  ciudadNombre?: string
  establecimiento?: string
  isActive: boolean
}

export interface SucursalRequest {
  nombre: string
  codigo: string
  direccion?: string
  telefono?: string
  email?: string
  ciudadId?: number
  establecimiento?: string
  isActive?: boolean
}

export async function getSucursales(soloActivas = false): Promise<Sucursal[]> {
  const q = soloActivas ? "?soloActivas=true" : ""
  const { data } = await http.get<Sucursal[]>(`/api/sucursales${q}`)
  return data
}

export async function createSucursal(request: SucursalRequest): Promise<Sucursal> {
  const { data } = await http.post<Sucursal>("/api/sucursales", request)
  return data
}

export async function updateSucursal(id: number, request: SucursalRequest): Promise<Sucursal> {
  const { data } = await http.put<Sucursal>(`/api/sucursales/${id}`, request)
  return data
}

export async function deleteSucursal(id: number): Promise<void> {
  await http.delete(`/api/sucursales/${id}`)
}
