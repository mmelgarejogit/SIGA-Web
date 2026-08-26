import { http } from "@/api/http"

export interface NotificacionPreferencia {
  personId: number
  recibirEmail: boolean
  ventanaSilencioInicio?: string | null
  ventanaSilencioFin?: string | null
  updatedAt?: string | null
}

export interface UpdateNotificacionPreferenciaRequest {
  recibirEmail: boolean
  ventanaSilencioInicio?: string | null
  ventanaSilencioFin?: string | null
}

export async function getMisPreferencias(): Promise<NotificacionPreferencia> {
  const { data } = await http.get<NotificacionPreferencia>("/api/notificaciones/preferencias/me")
  return data
}

export async function updateMisPreferencias(
  req: UpdateNotificacionPreferenciaRequest,
): Promise<NotificacionPreferencia> {
  const { data } = await http.put<NotificacionPreferencia>("/api/notificaciones/preferencias/me", req)
  return data
}

export async function getPreferenciasByPersona(personId: number): Promise<NotificacionPreferencia> {
  const { data } = await http.get<NotificacionPreferencia>(`/api/notificaciones/preferencias/persona/${personId}`)
  return data
}

export async function updatePreferenciasByPersona(
  personId: number,
  req: UpdateNotificacionPreferenciaRequest,
): Promise<NotificacionPreferencia> {
  const { data } = await http.put<NotificacionPreferencia>(
    `/api/notificaciones/preferencias/persona/${personId}`,
    req,
  )
  return data
}
