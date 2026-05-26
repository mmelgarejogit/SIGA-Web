import { jsPDF } from "jspdf"
import autoTable from "jspdf-autotable"
import type { PedidoCompras } from "@/services/comprasService"

// ── Helpers ────────────────────────────────────────────────────────────────────

function fmt(n: number): string {
  return new Intl.NumberFormat("es-PY", {
    style: "currency",
    currency: "PYG",
    maximumFractionDigits: 0,
  }).format(n)
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}

function estadoLabel(estado: string): string {
  switch (estado) {
    case "RecibidaParcial": return "Recibida parcial"
    case "RecibidaTotal":   return "Recibida total"
    default:                return estado
  }
}

// ── Paleta ─────────────────────────────────────────────────────────────────────

const PRIMARY:      [number, number, number] = [0,   40,  142]
const PRIMARY_SOFT: [number, number, number] = [219, 227, 246]
const GRAY:         [number, number, number] = [107, 114, 128]
const DARK:         [number, number, number] = [30,  30,  30]
const BORDER:       [number, number, number] = [196, 197, 213]
const ROW_ALT:      [number, number, number] = [248, 249, 254]
const WHITE:        [number, number, number] = [255, 255, 255]

// ── Generador principal ────────────────────────────────────────────────────────

export function useOcPdf() {
  function generarPdfOC(pedido: PedidoCompras): void {
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" })
    const pageW = 210
    const margin = 15
    const contentW = pageW - margin * 2

    // ── Banda de cabecera ──────────────────────────────────────────────────────

    doc.setFillColor(...PRIMARY)
    doc.rect(0, 0, pageW, 35, "F")

    // Nombre del sistema (izquierda)
    doc.setTextColor(...WHITE)
    doc.setFont("helvetica", "bold")
    doc.setFontSize(16)
    doc.text("SIGA", margin, 14)

    doc.setFont("helvetica", "normal")
    doc.setFontSize(8)
    doc.text("Sistema Integral de Gestión para Óptica", margin, 20)

    // Número de OC (derecha)
    doc.setFont("helvetica", "bold")
    doc.setFontSize(22)
    doc.text(`OC #${pedido.id}`, pageW - margin, 15, { align: "right" })

    doc.setFont("helvetica", "normal")
    doc.setFontSize(8)
    doc.setTextColor(200, 215, 255)
    doc.text("ORDEN DE COMPRA", pageW - margin, 22, { align: "right" })

    // ── Info del pedido ────────────────────────────────────────────────────────

    let y = 44

    // Bloque proveedor
    doc.setFont("helvetica", "bold")
    doc.setFontSize(13)
    doc.setTextColor(...PRIMARY)
    doc.text(pedido.proveedorNombre, margin, y)

    y += 7

    // Dos columnas: izquierda fecha / derecha estado
    doc.setFont("helvetica", "normal")
    doc.setFontSize(9)
    doc.setTextColor(...GRAY)

    doc.text("Fecha de emisión:", margin, y)
    doc.setTextColor(...DARK)
    doc.setFont("helvetica", "bold")
    doc.text(fmtDate(pedido.createdAt), margin + 32, y)

    doc.setFont("helvetica", "normal")
    doc.setTextColor(...GRAY)
    doc.text("Estado:", pageW - margin - 50, y)
    doc.setTextColor(...PRIMARY)
    doc.setFont("helvetica", "bold")
    doc.text(estadoLabel(pedido.estado), pageW - margin - 50 + 16, y)

    if (pedido.updatedAt && pedido.updatedAt !== pedido.createdAt) {
      y += 5
      doc.setFont("helvetica", "normal")
      doc.setFontSize(8)
      doc.setTextColor(...GRAY)
      doc.text(`Última actualización: ${fmtDate(pedido.updatedAt)}`, margin, y)
    }

    if (pedido.observaciones) {
      y += 6
      doc.setFont("helvetica", "italic")
      doc.setFontSize(8.5)
      doc.setTextColor(...GRAY)
      // Wrap largo
      const lines = doc.splitTextToSize(`Observaciones: ${pedido.observaciones}`, contentW)
      doc.text(lines, margin, y)
      y += (lines.length - 1) * 4.5
    }

    // Separador
    y += 7
    doc.setDrawColor(...BORDER)
    doc.setLineWidth(0.3)
    doc.line(margin, y, pageW - margin, y)
    y += 6

    // ── Título sección ─────────────────────────────────────────────────────────

    doc.setFont("helvetica", "bold")
    doc.setFontSize(9)
    doc.setTextColor(...GRAY)
    doc.text("DETALLE DE ÍTEMS", margin, y)
    y += 4

    // ── Tabla de ítems ─────────────────────────────────────────────────────────

    const total = pedido.items.reduce((s, i) => s + i.cantidad * i.precioUnitario, 0)

    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      head: [["Producto", "Cant.", "Recibido", "Precio c/u", "Subtotal"]],
      body: pedido.items.map((item) => [
        item.productoNombre,
        { content: item.cantidad.toString(), styles: { halign: "center" } },
        {
          content: item.cantidadRecibida.toString(),
          styles: {
            halign: "center",
            textColor:
              item.cantidadRecibida >= item.cantidad
                ? [22, 101, 52]
                : item.cantidadRecibida > 0
                  ? [146, 64, 14]
                  : GRAY,
            fontStyle: item.cantidadRecibida > 0 ? "bold" : "normal",
          },
        },
        { content: fmt(item.precioUnitario), styles: { halign: "right" } },
        {
          content: fmt(item.cantidad * item.precioUnitario),
          styles: { halign: "right", fontStyle: "bold" },
        },
      ]),
      foot: [
        [
          { content: "", colSpan: 3 },
          {
            content: "TOTAL",
            styles: { halign: "right", fontStyle: "bold", fontSize: 10, textColor: PRIMARY },
          },
          {
            content: fmt(total),
            styles: { halign: "right", fontStyle: "bold", fontSize: 10, textColor: PRIMARY },
          },
        ],
      ],
      headStyles: {
        fillColor: PRIMARY,
        textColor: WHITE,
        fontStyle: "bold",
        fontSize: 8.5,
        cellPadding: 3,
      },
      bodyStyles: {
        fontSize: 9,
        textColor: DARK,
        cellPadding: 2.5,
      },
      footStyles: {
        fillColor: PRIMARY_SOFT,
        textColor: PRIMARY,
        fontStyle: "bold",
        fontSize: 9,
        cellPadding: 3,
      },
      alternateRowStyles: { fillColor: ROW_ALT },
      columnStyles: {
        0: { cellWidth: "auto" },
        1: { cellWidth: 18, halign: "center" },
        2: { cellWidth: 22, halign: "center" },
        3: { cellWidth: 38, halign: "right" },
        4: { cellWidth: 38, halign: "right" },
      },
      tableLineColor: BORDER,
      tableLineWidth: 0.2,
    })

    // ── Pie de página ──────────────────────────────────────────────────────────

    // @ts-expect-error — jspdf-autotable añade lastAutoTable al doc
    const finalY: number = doc.lastAutoTable.finalY ?? 200
    const footerY = finalY + 12

    doc.setDrawColor(...BORDER)
    doc.setLineWidth(0.2)
    doc.line(margin, footerY, pageW - margin, footerY)

    doc.setTextColor(...GRAY)
    doc.setFont("helvetica", "normal")
    doc.setFontSize(7.5)
    doc.text(
      `Generado el ${fmtDate(new Date().toISOString())} · SIGA — Sistema Integral de Gestión para Óptica`,
      pageW / 2,
      footerY + 5,
      { align: "center" },
    )

    // Número de página (si fuera necesario en documentos largos)
    doc.text(`Página 1 de 1`, pageW - margin, footerY + 5, { align: "right" })

    // ── Guardar ────────────────────────────────────────────────────────────────

    const provNombre = pedido.proveedorNombre.replace(/\s+/g, "-").replace(/[^\w-]/g, "")
    doc.save(`OC-${pedido.id}-${provNombre}.pdf`)
  }

  return { generarPdfOC }
}
