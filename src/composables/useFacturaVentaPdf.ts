import { jsPDF } from "jspdf"
import autoTable from "jspdf-autotable"
import type { Venta, Devolucion } from "@/services/ventasService"
import type { ConfiguracionNegocio } from "@/services/configService"

const PRIMARY:      [number, number, number] = [0,   40,  142]
const PRIMARY_SOFT: [number, number, number] = [219, 227, 246]
const ACCENT:       [number, number, number] = [146, 64,  14]
const GRAY:         [number, number, number] = [107, 114, 128]
const DARK:         [number, number, number] = [30,  30,  30]
const BORDER:       [number, number, number] = [196, 197, 213]
const ROW_ALT:      [number, number, number] = [248, 249, 254]
const WHITE:        [number, number, number] = [255, 255, 255]

function fmt(n: number) {
  return new Intl.NumberFormat("es-PY", { style: "currency", currency: "PYG", maximumFractionDigits: 0 }).format(n)
}

function fmtDate(iso?: string) {
  if (!iso) return "—"
  return new Date(iso + "T00:00:00").toLocaleDateString("es-PY", { day: "2-digit", month: "2-digit", year: "numeric" })
}

/** Banda de cabecera común (nombre, contacto, número y etiqueta del documento). */
function cabecera(
  doc: jsPDF, config: ConfiguracionNegocio, pageW: number, margin: number,
  numeroDoc: string, etiqueta: string,
) {
  doc.setFillColor(...PRIMARY)
  doc.rect(0, 0, pageW, 35, "F")

  doc.setTextColor(...WHITE)
  doc.setFont("helvetica", "bold")
  doc.setFontSize(16)
  doc.text(config.nombreFantasia, margin, 14)

  if (config.razonSocial) {
    doc.setFont("helvetica", "normal")
    doc.setFontSize(8)
    doc.text(config.razonSocial, margin, 20)
  }

  const contactLines: string[] = []
  if (config.direccion) contactLines.push(config.direccion)
  if (config.telefono)  contactLines.push(`Tel: ${config.telefono}`)
  if (config.email)     contactLines.push(config.email)
  if (config.cuit)      contactLines.push(`RUC: ${config.cuit}`)

  doc.setFont("helvetica", "normal")
  doc.setFontSize(7.5)
  doc.setTextColor(200, 215, 255)
  doc.text(contactLines.join("  ·  "), margin, 27)

  doc.setFont("helvetica", "bold")
  doc.setFontSize(22)
  doc.setTextColor(...WHITE)
  doc.text(numeroDoc, pageW - margin, 15, { align: "right" })

  doc.setFont("helvetica", "bold")
  doc.setFontSize(9)
  doc.setTextColor(200, 215, 255)
  doc.text(etiqueta, pageW - margin, 24, { align: "right" })
}

export function useFacturaVentaPdf() {
  /** Construye el PDF de la factura y devuelve el documento jsPDF (sin descargar). */
  function buildFacturaDoc(venta: Venta, config: ConfiguracionNegocio): jsPDF {
    const doc    = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" })
    const pageW  = 210
    const margin = 15
    const contentW = pageW - margin * 2

    const factura = venta.factura

    // ── Banda de cabecera ──────────────────────────────────────────────────────

    cabecera(doc, config, pageW, margin,
      factura?.numeroFactura ?? venta.numeroComprobante, "FACTURA TIMBRADA")

    // ── Info timbrado ──────────────────────────────────────────────────────────

    let y = 44

    doc.setFont("helvetica", "bold")
    doc.setFontSize(11)
    doc.setTextColor(...PRIMARY)
    doc.text("Timbrado", margin, y)
    doc.text("Cliente", pageW / 2 + 5, y)

    y += 5

    doc.setFont("helvetica", "bold")
    doc.setFontSize(10)
    doc.setTextColor(...DARK)
    doc.text(`N° ${factura?.timbrado ?? "—"}/${factura?.establecimiento ?? "—"}-${factura?.numeroFactura?.split("-").slice(-1)[0] ?? ""}`, margin, y)

    doc.setFont("helvetica", "bold")
    doc.setFontSize(10)
    doc.setTextColor(...DARK)
    doc.text(venta.clienteNombre, pageW / 2 + 5, y)

    y += 5

    doc.setFont("helvetica", "normal")
    doc.setFontSize(9)
    doc.setTextColor(...GRAY)
    doc.text("Establecimiento:", margin, y)
    doc.setTextColor(...DARK)
    doc.text(factura?.establecimiento ?? "—", margin + 30, y)

    y += 5

    doc.setFont("helvetica", "normal")
    doc.setFontSize(9)
    doc.setTextColor(...GRAY)
    doc.text("Fecha de emisión:", margin, y)
    doc.setTextColor(...DARK)
    doc.text(fmtDate(factura?.fechaEmision), margin + 30, y)

    doc.text("Condición:", pageW / 2 + 5, y)
    doc.setTextColor(...DARK)
    doc.text(venta.condicionVenta === "Credito" ? "Crédito" : "Contado", pageW / 2 + 25, y)

    if (factura?.observaciones) {
      y += 5
      doc.setFont("helvetica", "italic")
      doc.setFontSize(8.5)
      doc.setTextColor(...GRAY)
      const lines = doc.splitTextToSize(`Observaciones: ${factura.observaciones}`, contentW)
      doc.text(lines, margin, y)
      y += (lines.length - 1) * 4.5
    }

    // Separador
    y += 8
    doc.setDrawColor(...BORDER)
    doc.setLineWidth(0.3)
    doc.line(margin, y, pageW - margin, y)
    y += 6

    // ── Tabla de ítems ─────────────────────────────────────────────────────────

    doc.setFont("helvetica", "bold")
    doc.setFontSize(9)
    doc.setTextColor(...GRAY)
    doc.text("DETALLE", margin, y)
    y += 4

    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      head: [["Descripción", "Cant.", "Precio c/u", "Desc.", "Subtotal"]],
      body: venta.lineas.map(l => [
        l.descripcion,
        { content: l.cantidad.toString(), styles: { halign: "center" } },
        { content: fmt(l.precioUnitario), styles: { halign: "right" } },
        { content: l.descuento > 0 ? fmt(l.descuento) : "—", styles: { halign: "right" } },
        { content: fmt(l.subtotal), styles: { halign: "right", fontStyle: "bold" } },
      ]),
      headStyles: {
        fillColor: PRIMARY,
        textColor: WHITE,
        fontStyle: "bold",
        fontSize: 8.5,
        cellPadding: 3,
      },
      bodyStyles: { fontSize: 9, textColor: DARK, cellPadding: 2.5 },
      alternateRowStyles: { fillColor: ROW_ALT },
      columnStyles: {
        0: { cellWidth: "auto" },
        1: { cellWidth: 16, halign: "center" },
        2: { cellWidth: 38, halign: "right" },
        3: { cellWidth: 24, halign: "right" },
        4: { cellWidth: 38, halign: "right" },
      },
      tableLineColor: BORDER,
      tableLineWidth: 0.2,
    })

    // @ts-expect-error jspdf-autotable
    const finalY: number = doc.lastAutoTable.finalY ?? 200

    // ── Resumen fiscal ─────────────────────────────────────────────────────────

    let ry = finalY + 8
    const summaryX = pageW - margin - 70

    const rows: Array<[string, string, boolean]> = []
    if ((factura?.montoExento ?? 0) > 0)    rows.push(["Exento",          fmt(factura!.montoExento),    false])
    if ((factura?.montoGravado5 ?? 0) > 0)  rows.push(["Gravado 5%",      fmt(factura!.montoGravado5),  false])
    if ((factura?.montoGravado5 ?? 0) > 0)  rows.push(["  IVA 5%",        fmt(Math.round(factura!.montoGravado5 / 21)), false])
    if ((factura?.montoGravado10 ?? 0) > 0) rows.push(["Gravado 10%",     fmt(factura!.montoGravado10), false])
    if ((factura?.montoGravado10 ?? 0) > 0) rows.push(["  IVA 10%",       fmt(Math.round(factura!.montoGravado10 / 11)), false])
    rows.push(["TOTAL",           fmt(factura?.total ?? venta.total),  true])

    for (const [label, value, bold] of rows) {
      const labelColor: [number, number, number] = bold ? PRIMARY : GRAY
      const valueColor: [number, number, number] = bold ? PRIMARY : DARK
      doc.setFont("helvetica", bold ? "bold" : "normal")
      doc.setFontSize(bold ? 10 : 9)
      doc.setTextColor(...labelColor)
      doc.text(label, summaryX, ry)
      doc.setTextColor(...valueColor)
      doc.text(value, pageW - margin, ry, { align: "right" })
      ry += bold ? 6 : 5
    }

    // ── Pie de página ──────────────────────────────────────────────────────────

    const footerY = 282
    doc.setDrawColor(...BORDER)
    doc.setLineWidth(0.2)
    doc.line(margin, footerY, pageW - margin, footerY)

    doc.setFont("helvetica", "normal")
    doc.setFontSize(7.5)
    doc.setTextColor(...GRAY)
    doc.text(
      `Generado el ${fmtDate(new Date().toISOString().slice(0,10))} · ${config.nombreFantasia} · Timbrado: ${factura?.timbrado ?? "—"}/${factura?.establecimiento ?? "—"}`,
      pageW / 2, footerY + 5, { align: "center" },
    )

    return doc
  }

  /** Construye el PDF de la Nota de Crédito asociada a una devolución. */
  function buildNotaCreditoDoc(venta: Venta, devolucion: Devolucion, config: ConfiguracionNegocio): jsPDF {
    const nc = devolucion.notaCredito!
    const doc    = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" })
    const pageW  = 210
    const margin = 15
    const contentW = pageW - margin * 2

    cabecera(doc, config, pageW, margin, nc.numeroNotaCredito, "NOTA DE CRÉDITO")

    // ── Info timbrado / referencia ───────────────────────────────────────────────
    let y = 44

    doc.setFont("helvetica", "bold")
    doc.setFontSize(11)
    doc.setTextColor(...PRIMARY)
    doc.text("Timbrado", margin, y)
    doc.text("Cliente", pageW / 2 + 5, y)

    y += 5
    doc.setFont("helvetica", "bold")
    doc.setFontSize(10)
    doc.setTextColor(...DARK)
    doc.text(`N° ${nc.timbrado}`, margin, y)
    doc.text(venta.clienteNombre, pageW / 2 + 5, y)

    y += 5
    doc.setFont("helvetica", "normal")
    doc.setFontSize(9)
    doc.setTextColor(...GRAY)
    doc.text("Fecha de emisión:", margin, y)
    doc.setTextColor(...DARK)
    doc.text(fmtDate(nc.fechaEmision), margin + 30, y)

    y += 5
    doc.setTextColor(...GRAY)
    doc.text("Compensa factura:", margin, y)
    doc.setTextColor(...ACCENT)
    doc.setFont("helvetica", "bold")
    doc.text(venta.factura?.numeroFactura ?? "—", margin + 33, y)

    doc.setFont("helvetica", "italic")
    doc.setFontSize(8.5)
    doc.setTextColor(...GRAY)
    const motivo = doc.splitTextToSize(`Motivo: ${devolucion.motivo}`, contentW / 2)
    doc.text(motivo, pageW / 2 + 5, y)

    // Separador
    y += 8
    doc.setDrawColor(...BORDER)
    doc.setLineWidth(0.3)
    doc.line(margin, y, pageW - margin, y)
    y += 6

    // ── Detalle de productos devueltos ───────────────────────────────────────────
    doc.setFont("helvetica", "bold")
    doc.setFontSize(9)
    doc.setTextColor(...GRAY)
    doc.text("PRODUCTOS DEVUELTOS", margin, y)
    y += 4

    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      head: [["Producto devuelto", "Cant."]],
      body: devolucion.lineas.map(l => [
        l.productoDevueltoNombre,
        { content: l.cantidadDevuelta.toString(), styles: { halign: "center" } },
      ]),
      headStyles: { fillColor: PRIMARY, textColor: WHITE, fontStyle: "bold", fontSize: 8.5, cellPadding: 3 },
      bodyStyles: { fontSize: 9, textColor: DARK, cellPadding: 2.5 },
      alternateRowStyles: { fillColor: ROW_ALT },
      columnStyles: { 0: { cellWidth: "auto" }, 1: { cellWidth: 24, halign: "center" } },
      tableLineColor: BORDER,
      tableLineWidth: 0.2,
    })

    // @ts-expect-error jspdf-autotable
    const finalY: number = doc.lastAutoTable.finalY ?? 200

    // ── Resumen del crédito ──────────────────────────────────────────────────────
    let ry = finalY + 8
    const summaryX = pageW - margin - 70

    const rows: Array<[string, string, boolean]> = []
    if (nc.montoExento > 0)    rows.push(["Exento",      fmt(nc.montoExento),                      false])
    if (nc.montoGravado5 > 0)  rows.push(["Gravado 5%",  fmt(nc.montoGravado5),                    false])
    if (nc.montoGravado5 > 0)  rows.push(["  IVA 5%",    fmt(Math.round(nc.montoGravado5 / 21)),   false])
    if (nc.montoGravado10 > 0) rows.push(["Gravado 10%", fmt(nc.montoGravado10),                   false])
    if (nc.montoGravado10 > 0) rows.push(["  IVA 10%",   fmt(Math.round(nc.montoGravado10 / 11)),  false])
    rows.push(["TOTAL CRÉDITO", fmt(nc.total), true])

    for (const [label, value, bold] of rows) {
      const labelColor: [number, number, number] = bold ? ACCENT : GRAY
      const valueColor: [number, number, number] = bold ? ACCENT : DARK
      doc.setFont("helvetica", bold ? "bold" : "normal")
      doc.setFontSize(bold ? 10 : 9)
      doc.setTextColor(...labelColor)
      doc.text(label, summaryX, ry)
      doc.setTextColor(...valueColor)
      doc.text(value, pageW - margin, ry, { align: "right" })
      ry += bold ? 6 : 5
    }

    // ── Pie de página ────────────────────────────────────────────────────────────
    const footerY = 282
    doc.setDrawColor(...BORDER)
    doc.setLineWidth(0.2)
    doc.line(margin, footerY, pageW - margin, footerY)

    doc.setFont("helvetica", "normal")
    doc.setFontSize(7.5)
    doc.setTextColor(...GRAY)
    doc.text(
      `Generado el ${fmtDate(new Date().toISOString().slice(0,10))} · ${config.nombreFantasia} · La factura original mantiene su validez; esta nota la compensa.`,
      pageW / 2, footerY + 5, { align: "center" },
    )

    return doc
  }

  /** Descarga el documento con el nombre indicado. */
  function descargarDoc(doc: jsPDF, nombreArchivo: string): void {
    doc.save(nombreArchivo)
  }

  /** Devuelve una URL de blob para previsualizar el PDF en un iframe. */
  function previewDoc(doc: jsPDF): string {
    return doc.output("bloburl") as unknown as string
  }

  return { buildFacturaDoc, buildNotaCreditoDoc, descargarDoc, previewDoc }
}