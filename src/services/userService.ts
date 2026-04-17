import { http } from '@/api/http'

export type UserType = 'Profesional' | 'Paciente'

// Cache de módulo: sobrevive navegaciones, se resetea al recargar la página.
let _cache: AppUser[] | null = null

export interface AppUser {
  userId: number
  entityId: number
  type: UserType
  firstName: string
  lastName: string
  email: string
  dni: string
  isActive: boolean
  createdAt: string
}

interface PatientItem {
  id: number
  userId: number
  dni: string
  firstName: string
  lastName: string
  email: string
  isActive: boolean
  createdAt: string
}

interface ProfessionalItem {
  id: number
  userId: number
  dni: string
  firstName: string
  lastName: string
  email: string
  isActive: boolean
  createdAt: string
}

export async function getAppUsers(forceRefresh = false): Promise<AppUser[]> {
  if (_cache && !forceRefresh) return _cache

  const [patientsRes, professionalsRes] = await Promise.all([
    http.get<PatientItem[]>('/api/patients'),
    http.get<ProfessionalItem[]>('/api/professionals'),
  ])

  const professionals: AppUser[] = professionalsRes.data.map((p) => ({
    userId: p.userId,
    entityId: p.id,
    type: 'Profesional',
    firstName: p.firstName,
    lastName: p.lastName,
    email: p.email,
    dni: p.dni,
    isActive: p.isActive,
    createdAt: p.createdAt,
  }))

  const patients: AppUser[] = patientsRes.data.map((p) => ({
    userId: p.userId,
    entityId: p.id,
    type: 'Paciente',
    firstName: p.firstName,
    lastName: p.lastName,
    email: p.email,
    dni: p.dni,
    isActive: p.isActive,
    createdAt: p.createdAt,
  }))

  _cache = [...professionals, ...patients]
  return _cache
}

/** Invalida el cache para forzar una nueva llamada en la próxima visita. */
export function clearUsersCache(): void {
  _cache = null
}
