import { http } from "@/api/http"

export interface ConfiguracionNegocio {
  nombreFantasia: string
  razonSocial?: string
  cuit?: string
  direccion?: string
  telefono?: string
  email?: string
  sitioWeb?: string
  updatedAt: string
}

export interface UpdateConfiguracionNegocioRequest {
  nombreFantasia: string
  razonSocial?: string
  cuit?: string
  direccion?: string
  telefono?: string
  email?: string
  sitioWeb?: string
}

export async function getConfiguracion(): Promise<ConfiguracionNegocio> {
  const { data } = await http.get<ConfiguracionNegocio>("/api/configuracion")
  return data
}

export async function updateConfiguracion(
  request: UpdateConfiguracionNegocioRequest,
): Promise<ConfiguracionNegocio> {
  const { data } = await http.put<ConfiguracionNegocio>("/api/configuracion", request)
  return data
}
