import { jsPDF } from "jspdf"
import autoTable from "jspdf-autotable"
import type { TrabajoPedidoListDto } from "@/services/ventasService"
import type { ConfiguracionNegocio } from "@/services/configService"

// ── Paleta ─────────────────────────────────────────────────────────────────────

const PRIMARY: [number, number, number] = [0,   40,  142]
const GRAY:    [number, number, number] = [107, 114, 128]
const DARK:    [number, number, number] = [30,  30,  30]
const BORDER:  [number, number, number] = [196, 197, 213]
const ROW_ALT: [number, number, number] = [248, 249, 254]
const WHITE:   [number, number, number] = [255, 255, 255]

// ── Helpers ────────────────────────────────────────────────────────────────────

function fmtDate(iso?: string) {
  if (!iso) return "—"
  const s = iso.includes("T") ? iso : iso + "T00:00:00"
  return new Date(s).toLocaleDateString("es-PY", { day: "2-digit", month: "2-digit", year: "numeric" })
}

const fmtDiop = (n?: number) =>
  n === undefined || n === null ? "—" : `${n > 0 ? "+" : ""}${n.toFixed(2)}`
const fmtEje = (n?: number) =>
  n === undefined || n === null ? "—" : `${n}°`

function tieneReceta(p: TrabajoPedidoListDto) {
  const r = p.receta
  if (!r) return false
  return [r.odEsferico, r.odCilindro, r.odEje, r.odAdicion, r.oiEsferico, r.oiCilindro, r.oiEje, r.oiAdicion]
    .some(v => v !== undefined && v !== null)
}

// ── Generador ───────────────────────────────────────────────────────────────────

export function useOrdenLaboratorioPdf() {
  function generarOrdenLaboratorio(pedido: TrabajoPedidoListDto, config: ConfiguracionNegocio): void {
    const doc      = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" })
    const pageW    = 210
    const margin   = 15
    const contentW = pageW - margin * 2

    // ── Banda de cabecera ──────────────────────────────────────────────────────
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
    doc.setFontSize(20)
    doc.setTextColor(...WHITE)
    doc.text(pedido.numeroComprobante, pageW - margin, 15, { align: "right" })

    doc.setFont("helvetica", "bold")
    doc.setFontSize(9)
    doc.setTextColor(200, 215, 255)
    doc.text("ORDEN DE TRABAJO", pageW - margin, 24, { align: "right" })

    // ── Destinatario / datos ─────────────────────────────────────────────────────
    let y = 44

    doc.setFont("helvetica", "bold")
    doc.setFontSize(11)
    doc.setTextColor(...PRIMARY)
    doc.text("Laboratorio", margin, y)
    doc.text("Detalles", pageW / 2 + 5, y)
    y += 5

    doc.setFont("helvetica", "bold")
    doc.setFontSize(10)
    doc.setTextColor(...DARK)
    doc.text(pedido.laboratorioNombre || "—", margin, y)

    doc.setFont("helvetica", "normal")
    doc.setFontSize(9)
    doc.setTextColor(...GRAY)
    doc.text("Fecha de envío:", pageW / 2 + 5, y)
    doc.setTextColor(...DARK)
    doc.text(fmtDate(pedido.fechaEnvio ?? new Date().toISOString().slice(0, 10)), pageW / 2 + 40, y)
    y += 5

    doc.setFont("helvetica", "normal")
    doc.setFontSize(9)
    doc.setTextColor(...GRAY)
    doc.text("Cliente:", pageW / 2 + 5, y)
    doc.setTextColor(...DARK)
    doc.text(pedido.clienteNombre, pageW / 2 + 24, y)

    // Separador
    y += 8
    doc.setDrawColor(...BORDER)
    doc.setLineWidth(0.3)
    doc.line(margin, y, pageW - margin, y)
    y += 7

    // ── Especificación del lente ─────────────────────────────────────────────────
    doc.setFont("helvetica", "bold")
    doc.setFontSize(9)
    doc.setTextColor(...GRAY)
    doc.text("ESPECIFICACIÓN DEL LENTE", margin, y)
    y += 6

    const spec = (label: string, value: string) => {
      doc.setFont("helvetica", "bold")
      doc.setFontSize(9)
      doc.setTextColor(...GRAY)
      doc.text(label, margin, y)
      doc.setFont("helvetica", "normal")
      doc.setTextColor(...DARK)
      const lines = doc.splitTextToSize(value || "—", contentW - 40)
      doc.text(lines, margin + 40, y)
      y += Math.max(5, lines.length * 4.8)
    }

    spec("Diseño", pedido.tipoLenteNombre || "—")
    spec("Tratamientos", pedido.tratamientos.length ? pedido.tratamientos.join(", ") : "Sin tratamientos")
    spec("Armazón", pedido.armazonDelCliente ? "Lo trae el cliente" : (pedido.armazonNombre || "—"))

    // ── Prescripción ─────────────────────────────────────────────────────────────
    y += 3
    doc.setFont("helvetica", "bold")
    doc.setFontSize(9)
    doc.setTextColor(...GRAY)
    doc.text("PRESCRIPCIÓN", margin, y)
    y += 3

    if (tieneReceta(pedido)) {
      const r = pedido.receta!
      autoTable(doc, {
        startY: y,
        margin: { left: margin, right: margin },
        head: [["Ojo", "Esférico", "Cilindro", "Eje", "Adición"]],
        body: [
          ["OD", fmtDiop(r.odEsferico), fmtDiop(r.odCilindro), fmtEje(r.odEje), fmtDiop(r.odAdicion)],
          ["OI", fmtDiop(r.oiEsferico), fmtDiop(r.oiCilindro), fmtEje(r.oiEje), fmtDiop(r.oiAdicion)],
        ],
        headStyles: { fillColor: PRIMARY, textColor: WHITE, fontStyle: "bold", fontSize: 8.5, cellPadding: 3 },
        bodyStyles: { fontSize: 9.5, textColor: DARK, cellPadding: 2.5, font: "courier", halign: "right" },
        alternateRowStyles: { fillColor: ROW_ALT },
        columnStyles: { 0: { halign: "left", fontStyle: "bold", font: "helvetica" } },
        tableLineColor: BORDER,
        tableLineWidth: 0.2,
      })
      // @ts-expect-error jspdf-autotable
      y = (doc.lastAutoTable.finalY ?? y) + 5

      if (r.distanciaInterpupilar) {
        doc.setFont("helvetica", "bold")
        doc.setFontSize(9)
        doc.setTextColor(...GRAY)
        doc.text("DIP:", margin, y)
        doc.setFont("helvetica", "normal")
        doc.setTextColor(...DARK)
        doc.text(`${r.distanciaInterpupilar} mm`, margin + 14, y)
        y += 6
      }
      if (r.observaciones) {
        doc.setFont("helvetica", "italic")
        doc.setFontSize(8.5)
        doc.setTextColor(...GRAY)
        const lines = doc.splitTextToSize(`Obs. receta: ${r.observaciones}`, contentW)
        doc.text(lines, margin, y)
        y += lines.length * 4.5
      }
    } else {
      doc.setFont("helvetica", "normal")
      doc.setFontSize(9)
      doc.setTextColor(...GRAY)
      doc.text("La venta no tiene receta cargada.", margin, y + 2)
      y += 8
    }

    // ── Observaciones del pedido ─────────────────────────────────────────────────
    if (pedido.observacion) {
      y += 4
      doc.setFont("helvetica", "bold")
      doc.setFontSize(9)
      doc.setTextColor(...GRAY)
      doc.text("OBSERVACIONES", margin, y)
      y += 5
      doc.setFont("helvetica", "normal")
      doc.setTextColor(...DARK)
      const lines = doc.splitTextToSize(pedido.observacion, contentW)
      doc.text(lines, margin, y)
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
      `Generado el ${fmtDate(new Date().toISOString().slice(0, 10))} · ${config.nombreFantasia}`,
      pageW / 2, footerY + 5, { align: "center" },
    )

    doc.save(`Orden-Lab-${pedido.numeroComprobante}-${pedido.clienteNombre.replace(/\s+/g, "-")}.pdf`)
  }

  return { generarOrdenLaboratorio }
}
