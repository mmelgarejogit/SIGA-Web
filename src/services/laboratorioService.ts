import { useHttp } from "@/composables/useHttp"
import type {
  TrabajoPedidoListDto,
  GestionarTrabajoPedidoRequest,
  EmitirFacturaLaboratorioRequest,
  RegistrarEnvioRequest,
  RegistrarEntregaRequest,
  RegistrarRetrabajoRequest,
} from "@/services/ventasService"

const { get, post, put } = useHttp()

// El ciclo del trabajo a pedido (laboratorio) vive en su propio módulo: /api/laboratorio/*
// El pedido se crea junto con la venta a pedido (VentaService); acá solo se gestiona su ciclo.

export const getPedidos = (estado?: string) => {
  const q = estado ? `?estado=${estado}` : ""
  return get<TrabajoPedidoListDto[]>(`/api/laboratorio/pedidos${q}`)
}

export const gestionarAprobacion = (id: number, data: GestionarTrabajoPedidoRequest) =>
  post<TrabajoPedidoListDto>(`/api/laboratorio/pedidos/${id}/gestionar`, data)

export const registrarEnvio = (id: number, data: RegistrarEnvioRequest = {}) =>
  put<TrabajoPedidoListDto>(`/api/laboratorio/pedidos/${id}/enviar`, data)

export const registrarRecepcion = (id: number) =>
  put<TrabajoPedidoListDto>(`/api/laboratorio/pedidos/${id}/recibir`, {})

export const registrarEntrega = (id: number, data: RegistrarEntregaRequest = {}) =>
  put<TrabajoPedidoListDto>(`/api/laboratorio/pedidos/${id}/entregar`, data)

export const registrarRetrabajo = (id: number, data: RegistrarRetrabajoRequest) =>
  post<TrabajoPedidoListDto>(`/api/laboratorio/pedidos/${id}/retrabajo`, data)

export const emitirFactura = (id: number, data: EmitirFacturaLaboratorioRequest) =>
  post<TrabajoPedidoListDto>(`/api/laboratorio/pedidos/${id}/factura`, data)
