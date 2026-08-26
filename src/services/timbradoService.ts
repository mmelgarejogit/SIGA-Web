import { http } from "@/api/http"

export type TipoDocumentoFiscal = "Factura" | "NotaCredito"

export interface Timbrado {
  id: number
  sucursalId: number
  sucursalNombre?: string
  tipo: TipoDocumentoFiscal
  numeroTimbrado: string
  establecimiento: string
  puntoExpedicion: string
  ultimoNumero: number
  proximoNumero: number
  numeroCompletoPreview: string
  numeroDesde: number
  numeroHasta: number | null
  fechaInicioVigencia: string
  fechaFinVigencia: string
  isActive: boolean
  createdAt: string
}

export interface CreateTimbradoRequest {
  sucursalId?: number
  tipo: TipoDocumentoFiscal
  numeroTimbrado: string
  establecimiento: string
  puntoExpedicion: string
  numeroDesde?: number
  numeroHasta?: number | null
  fechaInicioVigencia: string
  fechaFinVigencia: string
}

export interface UpdateTimbradoRequest {
  sucursalId?: number
  tipo: TipoDocumentoFiscal
  numeroTimbrado: string
  establecimiento: string
  puntoExpedicion: string
  numeroDesde?: number
  numeroHasta?: number | null
  fechaInicioVigencia: string
  fechaFinVigencia: string
  isActive: boolean
}

export async function getTimbrados(): Promise<Timbrado[]> {
  const { data } = await http.get<Timbrado[]>("/api/timbrados")
  return data
}

export async function getTimbradosActivos(): Promise<Timbrado[]> {
  const { data } = await http.get<Timbrado[]>("/api/timbrados/activos")
  return data
}

export async function getTimbradoById(id: number): Promise<Timbrado> {
  const { data } = await http.get<Timbrado>(`/api/timbrados/${id}`)
  return data
}

export async function createTimbrado(request: CreateTimbradoRequest): Promise<Timbrado> {
  const { data } = await http.post<Timbrado>("/api/timbrados", request)
  return data
}

export async function updateTimbrado(id: number, request: UpdateTimbradoRequest): Promise<Timbrado> {
  const { data } = await http.put<Timbrado>(`/api/timbrados/${id}`, request)
  return data
}

export async function deactivateTimbrado(id: number): Promise<void> {
  await http.delete(`/api/timbrados/${id}`)
}