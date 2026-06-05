import { jsPDF } from "jspdf"
import autoTable from "jspdf-autotable"
import type { Venta } from "@/services/ventasService"
import type { ConfiguracionNegocio } from "@/services/configService"

// ── Paleta ─────────────────────────────────────────────────────────────────────

const PRIMARY:      [number, number, number] = [0,   40,  142]
const PRIMARY_SOFT: [number, number, number] = [219, 227, 246]
const ACCENT:       [number, number, number] = [146, 64,  14]   // ámbar — presupuesto
const GRAY:         [number, number, number] = [107, 114, 128]
const DARK:         [number, number, number] = [30,  30,  30]
const BORDER:       [number, number, number] = [196, 197, 213]
const ROW_ALT:      [number, number, number] = [248, 249, 254]
const WHITE:        [number, number, number] = [255, 255, 255]

// ── Helpers ────────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return new Intl.NumberFormat("es-PY", { style: "currency", currency: "PYG", maximumFractionDigits: 0 }).format(n)
}

function fmtDate(iso?: string) {
  if (!iso) return "—"
  return new Date(iso + "T00:00:00").toLocaleDateString("es-PY", { day: "2-digit", month: "2-digit", year: "numeric" })
}

// ── Generador ─────────────────────────────────────────────────────────────────

export function usePresupuestoPdf() {
  function generarPdfPresupuesto(venta: Venta, config: ConfiguracionNegocio): void {
    const doc    = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" })
    const pageW  = 210
    const margin = 15
    const contentW = pageW - margin * 2

    // ── Banda de cabecera ──────────────────────────────────────────────────────

    doc.setFillColor(...PRIMARY)
    doc.rect(0, 0, pageW, 35, "F")

    // Nombre de la óptica (izquierda)
    doc.setTextColor(...WHITE)
    doc.setFont("helvetica", "bold")
    doc.setFontSize(16)
    doc.text(config.nombreFantasia, margin, 14)

    if (config.razonSocial) {
      doc.setFont("helvetica", "normal")
      doc.setFontSize(8)
      doc.text(config.razonSocial, margin, 20)
    }

    // Datos contacto óptica
    const contactLines: string[] = []
    if (config.direccion) contactLines.push(config.direccion)
    if (config.telefono)  contactLines.push(`Tel: ${config.telefono}`)
    if (config.email)     contactLines.push(config.email)
    if (config.cuit)      contactLines.push(`RUC: ${config.cuit}`)

    doc.setFont("helvetica", "normal")
    doc.setFontSize(7.5)
    doc.setTextColor(200, 215, 255)
    doc.text(contactLines.join("  ·  "), margin, 27)

    // Tipo documento + número (derecha)
    doc.setFont("helvetica", "bold")
    doc.setFontSize(22)
    doc.setTextColor(...WHITE)
    doc.text(venta.numeroComprobante, pageW - margin, 15, { align: "right" })

    doc.setFont("helvetica", "bold")
    doc.setFontSize(9)
    doc.setTextColor(200, 215, 255)
    doc.text("PRESUPUESTO", pageW - margin, 24, { align: "right" })

    // ── Info presupuesto ───────────────────────────────────────────────────────

    let y = 44

    // Dos columnas: paciente (izq) | fechas (der)
    doc.setFont("helvetica", "bold")
    doc.setFontSize(11)
    doc.setTextColor(...PRIMARY)
    doc.text("Paciente", margin, y)
    doc.text("Detalles", pageW / 2 + 5, y)

    y += 5

    doc.setFont("helvetica", "bold")
    doc.setFontSize(10)
    doc.setTextColor(...DARK)
    doc.text(venta.pacienteNombre, margin, y)

    doc.setFont("helvetica", "normal")
    doc.setFontSize(9)
    doc.setTextColor(...GRAY)
    doc.text("Fecha de emisión:", pageW / 2 + 5, y)
    doc.setTextColor(...DARK)
    doc.text(fmtDate(venta.fechaVenta), pageW / 2 + 38, y)

    y += 5

    const validez = venta.validezDias > 0 ? venta.validezDias : 15

    doc.setFont("helvetica", "normal")
    doc.setFontSize(9)
    doc.setTextColor(...GRAY)
    doc.text("Validez:", pageW / 2 + 5, y)
    doc.setTextColor(...ACCENT)
    doc.setFont("helvetica", "bold")
    doc.text(`${validez} días corridos`, pageW / 2 + 22, y)

    y += 5

    doc.setFont("helvetica", "normal")
    doc.setTextColor(...GRAY)
    doc.text("Condición:", pageW / 2 + 5, y)
    doc.setTextColor(...DARK)
    doc.text(venta.condicionVenta === "Credito" ? "Crédito" : "Contado", pageW / 2 + 25, y)

    if (venta.observaciones) {
      y += 5
      doc.setFont("helvetica", "italic")
      doc.setFontSize(8.5)
      doc.setTextColor(...GRAY)
      const lines = doc.splitTextToSize(`Observaciones: ${venta.observaciones}`, contentW / 2)
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
    if (venta.montoExento > 0)    rows.push(["Exento",          fmt(venta.montoExento),    false])
    if (venta.montoGravado5 > 0)  rows.push(["Gravado 5%",      fmt(venta.montoGravado5),  false])
    if (venta.montoGravado5 > 0)  rows.push(["  IVA 5%",        fmt(Math.round(venta.montoGravado5 / 21)), false])
    if (venta.montoGravado10 > 0) rows.push(["Gravado 10%",     fmt(venta.montoGravado10), false])
    if (venta.montoGravado10 > 0) rows.push(["  IVA 10%",       fmt(Math.round(venta.montoGravado10 / 11)), false])
    rows.push(["TOTAL",           fmt(venta.total),              true])

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

    // ── Nota legal ─────────────────────────────────────────────────────────────

    const noteY = ry + 10
    doc.setFillColor(254, 243, 199)
    doc.roundedRect(margin, noteY, contentW, 12, 2, 2, "F")

    doc.setFont("helvetica", "bold")
    doc.setFontSize(8)
    doc.setTextColor(...ACCENT)
    doc.text("⚠ Este presupuesto no constituye una factura legal.", margin + 5, noteY + 5)

    doc.setFont("helvetica", "normal")
    doc.setFontSize(7.5)
    doc.text(
      `Válido por ${validez} días corridos desde la fecha de emisión. Precios sujetos a cambio sin previo aviso.`,
      margin + 5, noteY + 9.5,
    )

    // ── Pie de página ──────────────────────────────────────────────────────────

    const footerY = 282
    doc.setDrawColor(...BORDER)
    doc.setLineWidth(0.2)
    doc.line(margin, footerY, pageW - margin, footerY)

    doc.setFont("helvetica", "normal")
    doc.setFontSize(7.5)
    doc.setTextColor(...GRAY)
    doc.text(
      `Generado el ${fmtDate(new Date().toISOString().slice(0,10))} · ${config.nombreFantasia}`,
      pageW / 2, footerY + 5, { align: "center" },
    )

    doc.save(`Presupuesto-${venta.numeroComprobante}-${venta.pacienteNombre.replace(/\s+/g, "-")}.pdf`)
  }

  return { generarPdfPresupuesto }
}
