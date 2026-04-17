import { http } from '@/api/http'

export type UserType = 'Profesional' | 'Paciente' | 'Usuario'

let _cache: AppUser[] | null = null

export interface AppUser {
  userId: number
  ci: string
  type: UserType
  firstName: string
  lastName: string
  email: string
  isActive: boolean
  createdAt: string
  roles: string[]
}

export async function getAppUsers(forceRefresh = false): Promise<AppUser[]> {
  if (_cache && !forceRefresh) return _cache

  const { data } = await http.get<AppUser[]>('/api/users')
  _cache = data
  return _cache
}

export function clearUsersCache(): void {
  _cache = null
}
