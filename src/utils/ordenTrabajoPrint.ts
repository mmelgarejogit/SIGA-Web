import type { TrabajoPedidoListDto, MedioEnvioLaboratorio } from "@/services/ventasService"

// Orden de Trabajo imprimible para el laboratorio.
// Genera un documento HTML autocontenido y dispara la impresión del navegador
// (que ofrece "Guardar como PDF"). No usa librerías ni el tema de la app: es un
// documento para papel/PDF, con su propio estilo de impresión.

const fmtDiop = (n?: number) =>
  n === undefined || n === null ? "—" : `${n > 0 ? "+" : ""}${n.toFixed(2)}`
const fmtEje = (n?: number) =>
  n === undefined || n === null ? "—" : `${n}°`

const fmtFecha = (s?: string) =>
  s ? new Date(s.includes("T") ? s : s + "T00:00:00").toLocaleDateString("es-PY", { day: "2-digit", month: "long", year: "numeric" }) : "—"

const medioLabel: Record<MedioEnvioLaboratorio, string> = {
  WhatsApp:  "WhatsApp",
  Email:     "Email",
  Portal:    "Portal del laboratorio",
  Telefono:  "Teléfono",
  EnPersona: "En persona",
  Otro:      "Otro",
}

const esc = (s?: string | null) =>
  (s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")

function buildHtml(p: TrabajoPedidoListDto): string {
  const r = p.receta
  const tieneReceta = !!r && [
    r.odEsferico, r.odCilindro, r.odEje, r.odAdicion,
    r.oiEsferico, r.oiCilindro, r.oiEje, r.oiAdicion,
  ].some(v => v !== undefined && v !== null)

  const armazon = p.armazonDelCliente
    ? "Propio del cliente"
    : (p.armazonNombre || "—")

  const tratamientos = p.tratamientos.length
    ? p.tratamientos.map(esc).join(" · ")
    : "—"

  const recetaRows = tieneReceta ? `
    <table class="receta">
      <thead>
        <tr><th>Ojo</th><th>Esférico</th><th>Cilíndrico</th><th>Eje</th><th>Adición</th></tr>
      </thead>
      <tbody>
        <tr>
          <td class="ojo">OD</td>
          <td>${fmtDiop(r?.odEsferico)}</td>
          <td>${fmtDiop(r?.odCilindro)}</td>
          <td>${fmtEje(r?.odEje)}</td>
          <td>${fmtDiop(r?.odAdicion)}</td>
        </tr>
        <tr>
          <td class="ojo">OI</td>
          <td>${fmtDiop(r?.oiEsferico)}</td>
          <td>${fmtDiop(r?.oiCilindro)}</td>
          <td>${fmtEje(r?.oiEje)}</td>
          <td>${fmtDiop(r?.oiAdicion)}</td>
        </tr>
      </tbody>
    </table>
    <div class="receta-extra">
      <span><strong>DIP:</strong> ${r?.distanciaInterpupilar ? esc(String(r.distanciaInterpupilar)) + " mm" : "—"}</span>
      ${r?.observaciones ? `<span><strong>Obs. receta:</strong> ${esc(r.observaciones)}</span>` : ""}
    </div>
  ` : `<p class="muted">La venta no tiene receta cargada.</p>`

  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8" />
<title>Orden de Trabajo ${esc(p.numeroComprobante)}</title>
<style>
  * { box-sizing: border-box; }
  @page { size: A4; margin: 16mm; }
  body { font-family: -apple-system, "Segoe UI", Roboto, Arial, sans-serif; color: #111; margin: 0; font-size: 13px; line-height: 1.45; }
  .doc { max-width: 720px; margin: 0 auto; }
  header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #111; padding-bottom: 12px; margin-bottom: 18px; }
  header h1 { font-size: 20px; margin: 0 0 2px; letter-spacing: .5px; }
  header .sub { color: #555; font-size: 12px; }
  header .meta { text-align: right; font-size: 12px; }
  header .meta .num { font-size: 16px; font-weight: 700; font-family: ui-monospace, "Courier New", monospace; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px 24px; margin-bottom: 18px; }
  .field .label { text-transform: uppercase; font-size: 10px; letter-spacing: .8px; color: #777; margin-bottom: 2px; }
  .field .val { font-size: 13px; font-weight: 600; }
  .field.full { grid-column: 1 / -1; }
  h2 { font-size: 12px; text-transform: uppercase; letter-spacing: .8px; color: #777; margin: 18px 0 8px; border-bottom: 1px solid #ddd; padding-bottom: 4px; }
  table.receta { width: 100%; border-collapse: collapse; margin-bottom: 6px; }
  table.receta th, table.receta td { border: 1px solid #ccc; padding: 6px 10px; text-align: center; font-variant-numeric: tabular-nums; }
  table.receta th { background: #f3f3f3; font-size: 10px; text-transform: uppercase; letter-spacing: .5px; color: #555; }
  table.receta td.ojo { font-weight: 700; background: #fafafa; }
  .receta-extra { display: flex; gap: 24px; font-size: 12px; color: #333; flex-wrap: wrap; }
  .obs { border: 1px solid #ddd; border-radius: 6px; padding: 8px 10px; font-size: 12px; background: #fafafa; }
  .muted { color: #999; font-style: italic; }
  footer { margin-top: 40px; display: flex; justify-content: space-between; gap: 40px; }
  footer .firma { flex: 1; border-top: 1px solid #999; padding-top: 6px; text-align: center; font-size: 11px; color: #666; }
  .printed { margin-top: 24px; text-align: right; font-size: 10px; color: #aaa; }
  @media print { .no-print { display: none; } }
</style>
</head>
<body>
  <div class="doc">
    <header>
      <div>
        <h1>Orden de Trabajo</h1>
        <div class="sub">Pedido a laboratorio óptico</div>
      </div>
      <div class="meta">
        <div class="num">${esc(p.numeroComprobante)}</div>
        <div>Generada: ${fmtFecha(new Date().toISOString())}</div>
      </div>
    </header>

    <div class="grid">
      <div class="field"><div class="label">Cliente</div><div class="val">${esc(p.clienteNombre)}</div></div>
      <div class="field"><div class="label">Laboratorio</div><div class="val">${esc(p.laboratorioNombre || "—")}</div></div>
      <div class="field"><div class="label">Diseño del lente</div><div class="val">${esc(p.tipoLenteNombre || "—")}</div></div>
      <div class="field"><div class="label">Armazón</div><div class="val">${esc(armazon)}</div></div>
      <div class="field full"><div class="label">Tratamientos</div><div class="val">${tratamientos}</div></div>
      ${p.fechaEstimadaEntrega ? `<div class="field"><div class="label">Entrega estimada</div><div class="val">${fmtFecha(p.fechaEstimadaEntrega)}</div></div>` : ""}
      ${p.medioEnvio ? `<div class="field"><div class="label">Medio de envío</div><div class="val">${medioLabel[p.medioEnvio]}</div></div>` : ""}
    </div>

    <h2>Receta</h2>
    ${recetaRows}

    ${p.observacion ? `<h2>Observación del pedido</h2><div class="obs">${esc(p.observacion)}</div>` : ""}

    <footer>
      <div class="firma">Entregado por</div>
      <div class="firma">Recibido (laboratorio)</div>
    </footer>
    <div class="printed">SIGA — orden de trabajo</div>
  </div>
</body>
</html>`
}

/**
 * Abre la Orden de Trabajo del pedido en un iframe oculto y dispara la impresión.
 * El usuario puede imprimir en papel o "Guardar como PDF" desde el diálogo del navegador.
 */
export function imprimirOrdenTrabajo(pedido: TrabajoPedidoListDto): void {
  const iframe = document.createElement("iframe")
  iframe.style.position = "fixed"
  iframe.style.right = "0"
  iframe.style.bottom = "0"
  iframe.style.width = "0"
  iframe.style.height = "0"
  iframe.style.border = "0"
  document.body.appendChild(iframe)

  const doc = iframe.contentWindow?.document
  if (!doc) { document.body.removeChild(iframe); return }

  doc.open()
  doc.write(buildHtml(pedido))
  doc.close()

  const win = iframe.contentWindow!
  const cleanup = () => { setTimeout(() => iframe.remove(), 500) }

  // Esperar a que el documento renderice antes de imprimir.
  const triggerPrint = () => {
    win.focus()
    win.print()
    cleanup()
  }

  if (doc.readyState === "complete") setTimeout(triggerPrint, 50)
  else win.onload = () => setTimeout(triggerPrint, 50)
}
