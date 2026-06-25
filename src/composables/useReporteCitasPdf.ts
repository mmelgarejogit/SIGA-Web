import { jsPDF } from "jspdf"
import autoTable from "jspdf-autotable"
import type { ReporteCitas } from "@/services/reportesService"

// ── Paleta ─────────────────────────────────────────────────────────────────────

const PRIMARY: [number, number, number] = [0, 40, 142]
const GRAY:    [number, number, number] = [107, 114, 128]
const DARK:    [number, number, number] = [30, 30, 30]
const BORDER:  [number, number, number] = [196, 197, 213]
const ROW_ALT: [number, number, number] = [248, 249, 254]
const WHITE:   [number, number, number] = [255, 255, 255]

function fmtDate(iso?: string) {
  if (!iso) return "—"
  return new Date(iso + "T00:00:00").toLocaleDateString("es-PY", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}

export function useReporteCitasPdf() {
  function generarPdfReporteCitas(reporte: ReporteCitas, opticaNombre = "SIGA-Óptica"): void {
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
    doc.text("REPORTE DE CITAS", pageW - margin, 13, { align: "right" })

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
        ["Turnos totales", String(reporte.totalTurnos), "Completados", String(reporte.completados)],
        ["Cancelados", String(reporte.cancelados), "Ausentes", String(reporte.ausentes)],
        ["Tasa de asistencia", `${reporte.tasaAsistencia}%`, "Consultas", String(reporte.consultas)],
        ["Recetas emitidas", String(reporte.recetas), "", ""],
      ],
      theme: "grid",
      bodyStyles: { fontSize: 9, textColor: DARK, cellPadding: 2.5 },
      columnStyles: {
        0: { fontStyle: "bold", textColor: GRAY, cellWidth: 45 },
        1: { halign: "right", cellWidth: 45 },
        2: { fontStyle: "bold", textColor: GRAY, cellWidth: 45 },
        3: { halign: "right", cellWidth: 45 },
      },
      tableLineColor: BORDER,
      tableLineWidth: 0.2,
    })

    // @ts-expect-error jspdf-autotable
    y = (doc.lastAutoTable.finalY ?? y) + 10

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
      "Por estado",
      ["Estado", "Cantidad", "%"],
      reporte.porEstado.map((e) => [
        e.estado,
        { content: String(e.cantidad), styles: { halign: "center" } },
        { content: `${e.porcentaje}%`, styles: { halign: "right" } },
      ]),
    )

    sectionTable(
      "Por profesional",
      ["Profesional", "Turnos", "Completados"],
      reporte.porProfesional.map((p) => [
        p.nombre,
        { content: String(p.turnos), styles: { halign: "center" } },
        { content: String(p.completados), styles: { halign: "center" } },
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

    doc.save(`Reporte-Citas-${reporte.desde}_${reporte.hasta}.pdf`)
  }

  return { generarPdfReporteCitas }
}
