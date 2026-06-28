import { http } from "@/api/http"

export interface TransferenciaItem {
  productoId: number
  productoNombre: string
  cantidad: number
}

export interface Transferencia {
  id: number
  sucursalOrigenId: number
  sucursalOrigenNombre: string
  sucursalDestinoId: number
  sucursalDestinoNombre: string
  fecha: string
  estado: "Pendiente" | "Aceptada" | "Rechazada"
  creadoPorNombre?: string
  recibidoPorNombre?: string
  observaciones?: string
  items: TransferenciaItem[]
  createdAt: string
}

export interface CreateTransferenciaRequest {
  sucursalOrigenId?: number
  sucursalDestinoId: number
  observaciones?: string
  items: { productoId: number; cantidad: number }[]
}

export async function getTransferencias(estado?: string): Promise<Transferencia[]> {
  const q = estado ? `?estado=${estado}` : ""
  const { data } = await http.get<Transferencia[]>(`/api/transferencias${q}`)
  return data
}

export async function createTransferencia(request: CreateTransferenciaRequest): Promise<Transferencia> {
  const { data } = await http.post<Transferencia>("/api/transferencias", request)
  return data
}

export async function gestionarTransferencia(
  id: number,
  aceptar: boolean,
  observaciones?: string,
): Promise<Transferencia> {
  const { data } = await http.post<Transferencia>(`/api/transferencias/${id}/gestionar`, {
    aceptar,
    observaciones,
  })
  return data
}
