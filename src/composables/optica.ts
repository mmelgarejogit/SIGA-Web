import type { Producto, Tratamiento } from "@/services/inventarioService"
import type { ProveedorSimple } from "@/services/comprasService"
import type { AgregarLineaRequest, CrearVentaTrabajoPedidoRequest } from "@/services/ventasService"

export interface OpticaTratamientoSel {
  tratamiento: Tratamiento
  precio: number
}

/** Estado de la config óptica de un trabajo a pedido (armazón + cristal + tratamientos + lab). */
export interface OpticaState {
  armazon: Producto | null
  armazonPrecio: number
  armazonDelCliente: boolean
  cristal: Producto | null
  cristalPrecio: number
  tratamientos: OpticaTratamientoSel[]
  laboratorio: ProveedorSimple | null
  tipoLenteId: number | null
}

export function emptyOptica(): OpticaState {
  return {
    armazon: null,
    armazonPrecio: 0,
    armazonDelCliente: false,
    cristal: null,
    cristalPrecio: 0,
    tratamientos: [],
    laboratorio: null,
    tipoLenteId: null,
  }
}

export type LineaUI = AgregarLineaRequest & { descripcion: string }

/** Convierte la selección óptica en líneas de venta (armazón + cristal + tratamientos). */
export function opticaLineas(s: OpticaState): LineaUI[] {
  const lineas: LineaUI[] = []
  if (s.armazon && !s.armazonDelCliente) {
    lineas.push({
      tipo: "Producto", productoId: s.armazon.id, descripcion: s.armazon.nombre,
      cantidad: 1, precioUnitario: s.armazonPrecio, descuento: 0, categoriaFiscal: "Gravado10",
    })
  }
  if (s.cristal) {
    lineas.push({
      tipo: "Producto", productoId: s.cristal.id, descripcion: s.cristal.nombre,
      cantidad: 1, precioUnitario: s.cristalPrecio, descuento: 0, categoriaFiscal: "Gravado10",
    })
  }
  for (const t of s.tratamientos) {
    lineas.push({
      tipo: "Servicio", descripcion: t.tratamiento.nombre,
      cantidad: 1, precioUnitario: t.precio, descuento: 0, categoriaFiscal: "Gravado10",
    })
  }
  return lineas
}

export function opticaTotal(s: OpticaState): number {
  return opticaLineas(s).reduce((sum, l) => sum + (l.cantidad * l.precioUnitario - l.descuento), 0)
}

export function opticaTrabajoPedido(s: OpticaState): CrearVentaTrabajoPedidoRequest {
  return {
    cristalProductoId: s.cristal?.id ?? null,
    tipoLenteId: s.tipoLenteId ?? null,
    tratamientoIds: s.tratamientos.map(t => t.tratamiento.id),
    armazonProductoId: s.armazonDelCliente ? null : (s.armazon?.id ?? null),
    armazonDelCliente: s.armazonDelCliente,
    laboratorioProveedorId: s.laboratorio?.id ?? null,
  }
}
