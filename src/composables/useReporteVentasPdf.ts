import { jsPDF } from "jspdf"
import autoTable from "jspdf-autotable"
import type { ReporteVentas } from "@/services/reportesService"

// ── Paleta ─────────────────────────────────────────────────────────────────────

const PRIMARY: [number, number, number] = [0, 40, 142]
const GRAY:    [number, number, number] = [107, 114, 128]
const DARK:    [number, number, number] = [30, 30, 30]
const BORDER:  [number, number, number] = [196, 197, 213]
const ROW_ALT: [number, number, number] = [248, 249, 254]
const WHITE:   [number, number, number] = [255, 255, 255]

// ── Helpers ────────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return new Intl.NumberFormat("es-PY", {
    style: "currency",
    currency: "PYG",
    maximumFractionDigits: 0,
  }).format(n)
}

function fmtDate(iso?: string) {
  if (!iso) return "—"
  return new Date(iso + "T00:00:00").toLocaleDateString("es-PY", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}

// ── Generador ─────────────────────────────────────────────────────────────────

export function useReporteVentasPdf() {
  function generarPdfReporteVentas(reporte: ReporteVentas, opticaNombre = "SIGA-Óptica"): void {
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" })
    const pageW = 210
    const margin = 15

    // ── Banda de cabecera ──────────────────────────────────────────────────────
    doc.setFillColor(...PRIMARY)
    doc.rect(0, 0, pageW, 32, "F")

    doc.setTextColor(...WHITE)
    doc.setFont("helvetica", "bold")
    doc.setFontSize(16)
    doc.text(opticaNombre, margin, 14)

    doc.setFont("helvetica", "bold")
    doc.setFontSize(13)
    doc.text("REPORTE DE VENTAS", pageW - margin, 13, { align: "right" })

    doc.setFont("helvetica", "normal")
    doc.setFontSize(9)
    doc.setTextColor(200, 215, 255)
    doc.text(`${fmtDate(reporte.desde)}  —  ${fmtDate(reporte.hasta)}`, pageW - margin, 21, { align: "right" })

    // ── KPIs ─────────────────────────────────────────────────────────────────────
    let y = 44
    doc.setFont("helvetica", "bold")
    doc.setFontSize(11)
    doc.setTextColor(...PRIMARY)
    doc.text("Resumen", margin, y)
    y += 4

    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      body: [
        ["Facturado", fmt(reporte.totalFacturado), "Cobrado (caja)", fmt(reporte.totalCobrado)],
        ["N° de ventas", String(reporte.cantidadVentas), "Ticket promedio", fmt(reporte.ticketPromedio)],
        ["Saldo pendiente", fmt(reporte.saldoPendiente), "Conversión presup.", `${reporte.tasaConversion}%`],
      ],
      theme: "grid",
      bodyStyles: { fontSize: 9, textColor: DARK, cellPadding: 2.5 },
      columnStyles: {
        0: { fontStyle: "bold", textColor: GRAY, cellWidth: 40 },
        1: { halign: "right", cellWidth: 50 },
        2: { fontStyle: "bold", textColor: GRAY, cellWidth: 40 },
        3: { halign: "right", cellWidth: 50 },
      },
      tableLineColor: BORDER,
      tableLineWidth: 0.2,
    })

    // @ts-expect-error jspdf-autotable
    y = (doc.lastAutoTable.finalY ?? y) + 10

    // ── Tablas auxiliares ──────────────────────────────────────────────────────
    const sectionTable = (
      titulo: string,
      head: string[],
      body: (string | { content: string; styles?: object })[][],
    ) => {
      if (body.length === 0) return
      if (y > 250) {
        doc.addPage()
        y = 20
      }
      doc.setFont("helvetica", "bold")
      doc.setFontSize(10)
      doc.setTextColor(...PRIMARY)
      doc.text(titulo, margin, y)
      y += 3
      autoTable(doc, {
        startY: y,
        margin: { left: margin, right: margin },
        head: [head],
        body,
        headStyles: { fillColor: PRIMARY, textColor: WHITE, fontStyle: "bold", fontSize: 8.5, cellPadding: 2.5 },
        bodyStyles: { fontSize: 9, textColor: DARK, cellPadding: 2.5 },
        alternateRowStyles: { fillColor: ROW_ALT },
        tableLineColor: BORDER,
        tableLineWidth: 0.2,
      })
      // @ts-expect-error jspdf-autotable
      y = (doc.lastAutoTable.finalY ?? y) + 10
    }

    sectionTable(
      "Por método de pago",
      ["Método", "Monto", "%"],
      reporte.porMetodoPago.map((m) => [
        m.metodo,
        { content: fmt(m.monto), styles: { halign: "right" } },
        { content: `${m.porcentaje}%`, styles: { halign: "right" } },
      ]),
    )

    sectionTable(
      "Top productos",
      ["Producto", "Cant.", "Monto"],
      reporte.topProductos.map((p) => [
        p.nombre,
        { content: String(p.cantidad), styles: { halign: "center" } },
        { content: fmt(p.monto), styles: { halign: "right" } },
      ]),
    )

    sectionTable(
      "Top servicios",
      ["Servicio", "Cant.", "Monto"],
      reporte.topServicios.map((s) => [
        s.nombre,
        { content: String(s.cantidad), styles: { halign: "center" } },
        { content: fmt(s.monto), styles: { halign: "right" } },
      ]),
    )

    sectionTable(
      "Por cajero",
      ["Cajero", "Cobros", "Monto"],
      reporte.porCajero.map((c) => [
        c.nombre,
        { content: String(c.cantidad), styles: { halign: "center" } },
        { content: fmt(c.monto), styles: { halign: "right" } },
      ]),
    )

    // ── Pie de página ──────────────────────────────────────────────────────────
    const footerY = 287
    doc.setDrawColor(...BORDER)
    doc.setLineWidth(0.2)
    doc.line(margin, footerY, pageW - margin, footerY)
    doc.setFont("helvetica", "normal")
    doc.setFontSize(7.5)
    doc.setTextColor(...GRAY)
    doc.text(
      `Generado el ${fmtDate(new Date().toISOString().slice(0, 10))} · ${opticaNombre}`,
      pageW / 2,
      footerY + 5,
      { align: "center" },
    )

    doc.save(`Reporte-Ventas-${reporte.desde}_${reporte.hasta}.pdf`)
  }

  return { generarPdfReporteVentas }
}
