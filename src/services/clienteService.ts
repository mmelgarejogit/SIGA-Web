import { http } from "@/api/http"

export interface PagedResult<T> {
  items: T[]
  totalCount: number
  totalActive: number
  page: number
  pageSize: number
  totalPages: number
}

export type TipoFacturacion = "Fisica" | "Juridica"

export interface GetClientesParams {
  page?: number
  pageSize?: number
  search?: string
  status?: "active" | "inactive"
  tipo?: "fisica" | "juridica"
}

export interface Cliente {
  id: number
  personId: number
  ci: string
  firstName: string
  lastName: string
  birthDate: string
  sexo?: string
  phoneNumber?: string
  personEmail?: string
  tipoFacturacion: TipoFacturacion
  razonSocial?: string
  rucCiFiscal?: string
  direccion?: string
  email?: string
  telefono?: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface PersonLookup {
  personId: number
  ci: string
  firstName: string
  lastName: string
  birthDate: string
  sexo?: string
  phoneNumber?: string
  email?: string
  yaEsCliente: boolean
}

export interface CreateClienteRequest {
  personId?: number
  ci?: string
  firstName?: string
  lastName?: string
  birthDate?: string
  sexo?: string
  phoneNumber?: string
  personEmail?: string
  tipoFacturacion: TipoFacturacion
  razonSocial?: string
  rucCiFiscal?: string
  direccion?: string
  email?: string
  telefono?: string
}

export interface UpdateClienteRequest {
  firstName: string
  lastName: string
  birthDate: string
  sexo?: string
  phoneNumber?: string
  personEmail?: string
  tipoFacturacion: TipoFacturacion
  razonSocial?: string
  rucCiFiscal?: string
  direccion?: string
  email?: string
  telefono?: string
}

export async function getClientes(params: GetClientesParams = {}): Promise<PagedResult<Cliente>> {
  const query = new URLSearchParams()
  if (params.page) query.set("page", String(params.page))
  if (params.pageSize) query.set("pageSize", String(params.pageSize))
  if (params.search) query.set("search", params.search)
  if (params.status) query.set("status", params.status)
  if (params.tipo) query.set("tipo", params.tipo)
  const { data } = await http.get<PagedResult<Cliente>>(`/api/clientes?${query}`)
  return data
}

export async function getClienteById(id: number): Promise<Cliente> {
  const { data } = await http.get<Cliente>(`/api/clientes/${id}`)
  return data
}

export async function buscarPersonaPorCi(ci: string): Promise<PersonLookup | null> {
  const { data } = await http.get<PersonLookup | null>(
    `/api/clientes/buscar-persona?ci=${encodeURIComponent(ci)}`,
  )
  return data
}

export async function createCliente(request: CreateClienteRequest): Promise<Cliente> {
  const { data } = await http.post<Cliente>("/api/clientes", request)
  return data
}

export async function updateCliente(id: number, request: UpdateClienteRequest): Promise<Cliente> {
  const { data } = await http.put<Cliente>(`/api/clientes/${id}`, request)
  return data
}

export async function desactivarCliente(id: number): Promise<void> {
  await http.delete(`/api/clientes/${id}`)
}

export async function activarCliente(id: number): Promise<void> {
  await http.post(`/api/clientes/${id}/activar`)
}
