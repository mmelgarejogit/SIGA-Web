import type { Producto, Tratamiento } from "@/services/inventarioService"
import type { ProveedorSimple } from "@/services/comprasService"
import type { AgregarLineaRequest, CrearVentaTrabajoPedidoRequest } from "@/services/ventasService"

export interface OpticaTratamientoSel {
  tratamiento: Tratamiento
  precio: number
}

/** Estado de la config óptica de un trabajo a pedido (armazón + lente + tratamientos + lab). */
export interface OpticaState {
  armazon: Producto | null
  armazonPrecio: number
  armazonDelCliente: boolean
  // El lente (cristal) ya no es un producto: se especifica por diseño (TipoLente) + precio.
  tipoLenteId: number | null
  tipoLenteNombre: string
  lentePrecio: number
  tratamientos: OpticaTratamientoSel[]
  laboratorio: ProveedorSimple | null
}

export function emptyOptica(): OpticaState {
  return {
    armazon: null,
    armazonPrecio: 0,
    armazonDelCliente: false,
    tipoLenteId: null,
    tipoLenteNombre: "",
    lentePrecio: 0,
    tratamientos: [],
    laboratorio: null,
  }
}

export type LineaUI = AgregarLineaRequest & { descripcion: string }

/** Convierte la selección óptica en líneas de venta (armazón + lente + tratamientos). */
export function opticaLineas(s: OpticaState): LineaUI[] {
  const lineas: LineaUI[] = []
  if (s.armazon && !s.armazonDelCliente) {
    lineas.push({
      tipo: "Producto", productoId: s.armazon.id, descripcion: s.armazon.nombre,
      cantidad: 1, precioUnitario: s.armazonPrecio, descuento: 0, categoriaFiscal: "Gravado10",
    })
  }
  // El lente se emite como línea tipo Lente, sin productoId: no descuenta stock (se pide al lab).
  if (s.tipoLenteId) {
    lineas.push({
      tipo: "Lente", descripcion: s.tipoLenteNombre ? `Lente ${s.tipoLenteNombre}` : "Lente",
      cantidad: 1, precioUnitario: s.lentePrecio, descuento: 0, categoriaFiscal: "Gravado10",
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
    tipoLenteId: s.tipoLenteId ?? null,
    tratamientoIds: s.tratamientos.map(t => t.tratamiento.id),
    armazonProductoId: s.armazonDelCliente ? null : (s.armazon?.id ?? null),
    armazonDelCliente: s.armazonDelCliente,
    laboratorioProveedorId: s.laboratorio?.id ?? null,
  }
}
