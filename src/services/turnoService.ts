import { http } from "@/api/http"

export interface Turno {
  id: number
  professionalId: number
  professionalNombre: string
  patientId: number
  patientNombre: string
  fechaHora: string
  estado: "Pendiente" | "Completado" | "Cancelado"
  solicitudCancelacion: boolean
  motivo?: string
  notas?: string
  createdAt: string
  updatedAt: string
}

export interface SlotDisponible {
  horaInicio: string // "HH:MM:SS"
  horaFin: string
}

export interface CreateTurnoRequest {
  professionalId: number
  patientId: number
  fechaHora: string
  motivo?: string
  notas?: string
}

export interface SelfBookTurnoRequest {
  professionalId: number
  fechaHora: string
  motivo?: string
}

export async function getTurnos(
  params: {
    fecha?: string
    professionalId?: number
    estado?: string
  } = {},
): Promise<Turno[]> {
  const q = new URLSearchParams()
  if (params.fecha) q.set("fecha", params.fecha)
  if (params.professionalId) q.set("professionalId", String(params.professionalId))
  if (params.estado) q.set("estado", params.estado)
  const { data } = await http.get<Turno[]>(`/api/turnos?${q}`)
  return data
}

export async function getSlotsDisponibles(
  professionalId: number,
  fecha: string,
): Promise<SlotDisponible[]> {
  const { data } = await http.get<SlotDisponible[]>(
    `/api/turnos/disponibles?professionalId=${professionalId}&fecha=${fecha}`,
  )
  return data
}

export async function createTurno(request: CreateTurnoRequest): Promise<Turno> {
  const { data } = await http.post<Turno>("/api/turnos", request)
  return data
}

export async function updateTurnoEstado(id: number, estado: string): Promise<Turno> {
  const { data } = await http.put<Turno>(`/api/turnos/${id}/estado`, { estado })
  return data
}

export async function cancelTurno(id: number): Promise<void> {
  await http.delete(`/api/turnos/${id}`)
}

// ── Patient self-scheduling ──

export async function getMisTurnos(): Promise<Turno[]> {
  const { data } = await http.get<Turno[]>("/api/turnos/mis-turnos")
  return data
}

export async function selfBookTurno(request: SelfBookTurnoRequest): Promise<Turno> {
  const { data } = await http.post<Turno>("/api/turnos/self-book", request)
  return data
}

export async function solicitarCancelacionTurno(id: number): Promise<void> {
  await http.post(`/api/turnos/${id}/solicitar-cancelacion`)
}

export async function gestionarCancelacionTurno(id: number, aprobar: boolean): Promise<void> {
  await http.post(`/api/turnos/${id}/gestionar-cancelacion`, { aprobar })
}
