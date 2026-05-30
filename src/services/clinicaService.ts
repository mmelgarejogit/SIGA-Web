import { http } from "@/api/http"

export interface PagedResult<T> {
  items: T[]
  totalCount: number
  totalActive: number
  page: number
  pageSize: number
  totalPages: number
}

export interface Receta {
  id: number
  consultaClinicaId: number
  fechaEmision: string
  odEsferico?: number
  odCilindro?: number
  odEje?: number
  odAdicion?: number
  oiEsferico?: number
  oiCilindro?: number
  oiEje?: number
  oiAdicion?: number
  distanciaInterpupilar?: number
  avSinCorreccion?: string
  avConCorreccion?: string
  observaciones?: string
  createdAt: string
  updatedAt: string
}

export interface ConsultaClinica {
  id: number
  patientId: number
  patientFirstName: string
  patientLastName: string
  patientCI: string
  professionalId: number
  professionalFirstName: string
  professionalLastName: string
  citaId?: number
  fechaConsulta: string
  motivo: string
  anamnesis?: string
  examenFisico?: string
  diagnosticoPrincipal: string
  diagnosticoSecundario?: string
  planTratamiento?: string
  observaciones?: string
  estadoId?: number
  estadoNombre?: string
  estadoColor?: string
  receta?: Receta
  createdAt: string
  updatedAt: string
}

export interface CreateRecetaRequest {
  fechaEmision: string
  odEsferico?: number | null
  odCilindro?: number | null
  odEje?: number | null
  odAdicion?: number | null
  oiEsferico?: number | null
  oiCilindro?: number | null
  oiEje?: number | null
  oiAdicion?: number | null
  distanciaInterpupilar?: number | null
  avSinCorreccion?: string
  avConCorreccion?: string
  observaciones?: string
}

export interface CreateConsultaClinicaRequest {
  patientId: number
  professionalId: number
  citaId?: number
  fechaConsulta: string
  motivo: string
  anamnesis?: string
  examenFisico?: string
  diagnosticoPrincipal?: string
  diagnosticoSecundario?: string
  planTratamiento?: string
  observaciones?: string
  estadoConfigId?: number
  receta?: CreateRecetaRequest
}

export interface UpdateConsultaClinicaRequest {
  professionalId: number
  fechaConsulta: string
  motivo: string
  anamnesis?: string
  examenFisico?: string
  diagnosticoPrincipal: string
  diagnosticoSecundario?: string
  planTratamiento?: string
  observaciones?: string
}

export interface GetConsultasParams {
  page?: number
  pageSize?: number
  search?: string
  patientId?: number
  professionalId?: number
}

export async function getConsultas(
  params: GetConsultasParams = {},
): Promise<PagedResult<ConsultaClinica>> {
  const query = new URLSearchParams()
  if (params.page) query.set("page", String(params.page))
  if (params.pageSize) query.set("pageSize", String(params.pageSize))
  if (params.search) query.set("search", params.search)
  if (params.patientId) query.set("patientId", String(params.patientId))
  if (params.professionalId) query.set("professionalId", String(params.professionalId))
  const { data } = await http.get<PagedResult<ConsultaClinica>>(`/api/consultas?${query}`)
  return data
}

export async function getConsultasByPatient(patientId: number): Promise<ConsultaClinica[]> {
  const { data } = await http.get<ConsultaClinica[]>(`/api/consultas/patient/${patientId}`)
  return data
}

export async function getConsultaById(id: number): Promise<ConsultaClinica> {
  const { data } = await http.get<ConsultaClinica>(`/api/consultas/${id}`)
  return data
}

export async function createConsulta(
  request: CreateConsultaClinicaRequest,
): Promise<ConsultaClinica> {
  const { data } = await http.post<ConsultaClinica>("/api/consultas", request)
  return data
}

export async function updateConsulta(
  id: number,
  request: UpdateConsultaClinicaRequest,
): Promise<ConsultaClinica> {
  const { data } = await http.put<ConsultaClinica>(`/api/consultas/${id}`, request)
  return data
}

export async function deleteConsulta(id: number): Promise<void> {
  await http.delete(`/api/consultas/${id}`)
}

export async function createOrUpdateReceta(
  consultaId: number,
  request: CreateRecetaRequest,
): Promise<Receta> {
  const { data } = await http.post<Receta>(`/api/consultas/${consultaId}/receta`, request)
  return data
}

export interface ProfessionalDashboardStats {
  consultasHoy: number
  consultasEstaSemana: number
  consultasEsteMes: number
  pacientesUnicosEsteMes: number
  recetasEmitidasEsteMes: number
  ultimasConsultas: ConsultaClinica[]
}

export async function getProfessionalStats(): Promise<ProfessionalDashboardStats> {
  const { data } = await http.get<ProfessionalDashboardStats>("/api/consultas/profesional/stats")
  return data
}

export async function downloadRecetaPdf(consultaId: number, patientLastName: string): Promise<void> {
  try {
    const { data } = await http.get(`/api/consultas/${consultaId}/receta/pdf`, { responseType: "blob" })
    const url = URL.createObjectURL(new Blob([data], { type: "application/pdf" }))
    const link = document.createElement("a")
    link.href = url
    link.download = `receta_${patientLastName}_${new Date().toISOString().slice(0, 10)}.pdf`
    link.click()
    URL.revokeObjectURL(url)
  } catch (err: any) {
    if (err?.response?.data instanceof Blob) {
      const text = await err.response.data.text()
      try {
        const json = JSON.parse(text)
        throw new Error(json.message ?? text)
      } catch {
        throw new Error(text)
      }
    }
    throw err
  }
}

export async function cambiarEstadoConsulta(id: number, estadoConfigId: number): Promise<ConsultaClinica> {
  const { data } = await http.patch<ConsultaClinica>(`/api/consultas/${id}/estado`, { estadoConfigId })
  return data
}
