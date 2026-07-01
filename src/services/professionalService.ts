import { http } from "@/api/http"

export interface Especialidad {
  id: number
  nombre: string
  descripcion?: string
}

export interface Professional {
  id: number
  userId: number
  ci: string
  firstName: string
  lastName: string
  birthDate: string
  phoneNumber?: string
  email: string
  licenseNumber: string
  especialidades: Especialidad[]
  sucursalId?: number
  sucursalNombre?: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface CreateProfessionalRequest {
  ci: string
  firstName: string
  lastName: string
  birthDate: string
  phoneNumber?: string
  email: string
  password: string
  licenseNumber: string
  especialidadIds: number[]
  sucursalId?: number
}

export interface UpdateProfessionalRequest {
  firstName: string
  lastName: string
  phoneNumber?: string
  licenseNumber: string
  especialidadIds: number[]
  sucursalId?: number
  isActive: boolean
}

export async function getProfessionals(): Promise<Professional[]> {
  const { data } = await http.get<Professional[]>("/api/professionals")
  return data
}

export async function getProfessionalById(id: number): Promise<Professional> {
  const { data } = await http.get<Professional>(`/api/professionals/${id}`)
  return data
}

export async function createProfessional(
  request: CreateProfessionalRequest,
): Promise<Professional> {
  const { data } = await http.post<Professional>("/api/professionals", request)
  return data
}

export async function updateProfessional(
  id: number,
  request: UpdateProfessionalRequest,
): Promise<Professional> {
  const { data } = await http.put<Professional>(`/api/professionals/${id}`, request)
  return data
}

export async function deleteProfessional(id: number): Promise<void> {
  await http.delete(`/api/professionals/${id}`)
}

export async function getEspecialidades(): Promise<Especialidad[]> {
  const { data } = await http.get<Especialidad[]>("/api/especialidades")
  return data
}

// ── Horarios ──────────────────────────────────────────────────────────────────

export interface PausaHorario {
  id: number
  horaInicio: string
  horaFin: string
  descripcion?: string
}

export interface HorarioProfesional {
  id: number
  diaSemana: number // 0=Domingo … 6=Sábado (C# DayOfWeek)
  horaInicio: string // "HH:MM:SS"
  horaFin: string
  activo: boolean
  pausas: PausaHorario[]
}

export interface PausaRequest {
  horaInicio: string
  horaFin: string
  descripcion?: string
}

export interface HorarioDiaRequest {
  diaSemana: number
  horaInicio: string
  horaFin: string
  activo: boolean
  pausas: PausaRequest[]
}

export interface SetHorariosRequest {
  horarios: HorarioDiaRequest[]
}

export async function getHorarios(professionalId: number): Promise<HorarioProfesional[]> {
  const { data } = await http.get<HorarioProfesional[]>(
    `/api/professionals/${professionalId}/horarios`,
  )
  return data
}

export async function setHorarios(
  professionalId: number,
  request: SetHorariosRequest,
): Promise<HorarioProfesional[]> {
  const { data } = await http.put<HorarioProfesional[]>(
    `/api/professionals/${professionalId}/horarios`,
    request,
  )
  return data
}
