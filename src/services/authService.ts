import { http } from "@/api/http"

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
  professionalId?: number
  roleClaims: string[]
  permissions: string[]
}

export interface RegisterPatientRequest {
  ci: string
  firstName: string
  lastName: string
  birthDate: string
  phoneNumber?: string
  email: string
  password: string
  hCaptchaToken: string
}

export interface RegisterResponse {
  email: string
  firstName: string
  lastName: string
}

export async function login(credentials: LoginCredentials): Promise<LoginResponse> {
  const { data } = await http.post<LoginResponse>("/api/auth/login", credentials)
  return data
}

export async function registerPatient(data: RegisterPatientRequest): Promise<RegisterResponse> {
  const { data: response } = await http.post<RegisterResponse>("/api/auth/register/patient", data)
  return response
}

export async function verifyEmail(token: string): Promise<void> {
  await http.get("/api/auth/verify-email", { params: { token } })
}
