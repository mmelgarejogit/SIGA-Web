import { http } from '@/api/http'

export interface LoginCredentials {
  email: string
  password: string
}

export interface LoginResponse {
  email: string
  jwtToken: string
  firstName: string
  lastName: string
  specialty?: string
  roleClaims: string[]
}

export async function login(credentials: LoginCredentials): Promise<LoginResponse> {
  const { data } = await http.post<LoginResponse>('/api/auth/login', credentials)
  return data
}
