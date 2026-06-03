import { http } from "@/api/http"

export type UserType = "Profesional" | "Paciente" | "Administrador" | "Usuario"

let _cache: AppUser[] | null = null

export interface AppUser {
  userId: number
  personId: number
  ci: string
  type: UserType
  firstName: string
  lastName: string
  email?: string
  phoneNumber?: string
  isActive: boolean
  roles: string[]
  sucursalId?: string
  sucursalNombre?: string
  createdAt: string
}

export interface CreateUserRequest {
  ci: string
  firstName: string
  lastName: string
  email: string
  password: string
  birthDate: string
  phoneNumber?: string
}

export async function getAppUsers(forceRefresh = false): Promise<AppUser[]> {
  if (_cache && !forceRefresh) return _cache
  const { data } = await http.get<AppUser[]>("/api/users")
  _cache = data
  return _cache
}

export function clearUsersCache(): void {
  _cache = null
}

export async function deactivateUser(userId: number): Promise<void> {
  await http.delete(`/api/users/${userId}`)
  _cache = null
}

export async function createUser(request: CreateUserRequest): Promise<void> {
  await http.post("/api/auth/register", {
    ci: request.ci,
    firstName: request.firstName,
    lastName: request.lastName,
    email: request.email,
    password: request.password,
    birthDate: request.birthDate,
    phoneNumber: request.phoneNumber,
  })
  _cache = null
}

export async function assignSucursal(userId: number, sucursalId: string | null): Promise<AppUser> {
  const { data } = await http.patch<AppUser>(`/api/users/${userId}/sucursal`, { sucursalId })
  _cache = null
  return data
}
