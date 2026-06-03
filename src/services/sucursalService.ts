import { http } from "@/api/http"

export interface Sucursal {
  id: string
  nombre: string
  codigo: string
  direccion: string | null
  telefono: string | null
  isActive: boolean
  createdAt: string
}

export interface CreateSucursalRequest {
  nombre: string
  codigo: string
  direccion?: string
  telefono?: string
}

export interface UpdateSucursalRequest {
  nombre: string
  codigo: string
  direccion?: string
  telefono?: string
  isActive: boolean
}

export async function getSucursales(isActive?: boolean): Promise<Sucursal[]> {
  const q = isActive != null ? `?isActive=${isActive}` : ""
  const { data } = await http.get<Sucursal[]>(`/api/sucursales${q}`)
  return data
}

export async function getSucursalById(id: string): Promise<Sucursal> {
  const { data } = await http.get<Sucursal>(`/api/sucursales/${id}`)
  return data
}

export async function createSucursal(request: CreateSucursalRequest): Promise<Sucursal> {
  const { data } = await http.post<Sucursal>("/api/sucursales", request)
  return data
}

export async function updateSucursal(id: string, request: UpdateSucursalRequest): Promise<Sucursal> {
  const { data } = await http.put<Sucursal>(`/api/sucursales/${id}`, request)
  return data
}

export async function deactivateSucursal(id: string): Promise<void> {
  await http.delete(`/api/sucursales/${id}`)
}
