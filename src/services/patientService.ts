import { http } from '@/api/http'

export interface PagedResult<T> {
  items: T[]
  totalCount: number
  totalActive: number
  page: number
  pageSize: number
  totalPages: number
}

export interface GetPatientsParams {
  page?: number
  pageSize?: number
  search?: string
  status?: 'active' | 'inactive'
}

export interface Patient {
  id: number
  userId?: number
  ci: string
  firstName: string
  lastName: string
  birthDate: string
  phoneNumber?: string
  email?: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface CreatePatientRequest {
  ci: string
  firstName: string
  lastName: string
  birthDate: string
  phoneNumber?: string
  email?: string
}

export interface UpdatePatientRequest {
  firstName: string
  lastName: string
  dni: string
  birthDate: string
  phoneNumber?: string
  email?: string
  isActive: boolean
}

export async function getPatients(params: GetPatientsParams = {}): Promise<PagedResult<Patient>> {
  const query = new URLSearchParams()
  if (params.page)     query.set('page',     String(params.page))
  if (params.pageSize) query.set('pageSize', String(params.pageSize))
  if (params.search)   query.set('search',   params.search)
  if (params.status)   query.set('status',   params.status)
  const { data } = await http.get<PagedResult<Patient>>(`/api/patients?${query}`)
  return data
}

export async function getPatientById(id: number): Promise<Patient> {
  const { data } = await http.get<Patient>(`/api/patients/${id}`)
  return data
}

export async function createPatient(request: CreatePatientRequest): Promise<Patient> {
  const { data } = await http.post<Patient>('/api/patients', request)
  return data
}

export async function updatePatient(id: number, request: UpdatePatientRequest): Promise<Patient> {
  const { data } = await http.put<Patient>(`/api/patients/${id}`, request)
  return data
}

export async function deletePatient(id: number): Promise<void> {
  await http.delete(`/api/patients/${id}`)
}
