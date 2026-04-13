import { http } from '@/api/http'

export interface Patient {
  id: number
  userId: number
  dni: string
  firstName: string
  lastName: string
  birthDate: string
  phoneNumber?: string
  email: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface CreatePatientRequest {
  dni: string
  firstName: string
  lastName: string
  birthDate: string
  phoneNumber?: string
  email: string
  password: string
}

export interface UpdatePatientRequest {
  firstName: string
  lastName: string
  phoneNumber?: string
  isActive: boolean
}

export async function getPatients(): Promise<Patient[]> {
  const { data } = await http.get<Patient[]>('/api/patients')
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
