<script setup lang="ts">
import DateInput from "@/components/DateInput.vue"
import { ref, computed, onMounted } from "vue"
import { useRouter } from "vue-router"
import AppSidebar from "@/components/AppSidebar.vue"
import AppHeader from "@/components/AppHeader.vue"
import BaseButton from "@/components/BaseButton.vue"
import BaseModal from "@/components/BaseModal.vue"
import FilterChips from "@/components/FilterChips.vue"
import SearchInput from "@/components/SearchInput.vue"
import RowContextMenu, { type ContextMenuItem } from "@/components/RowContextMenu.vue"
import BaseTable from "@/components/BaseTable.vue"
import { type Venta, type Devolucion, getVentas, getVentaById } from "@/services/ventasService"
import { getConfiguracion } from "@/services/configService"
import { useFacturaVentaPdf } from "@/composables/useFacturaVentaPdf"

const router = useRouter()
const pdf = useFacturaVentaPdf()

type TipoDoc = "Factura" | "NotaCredito"

interface ComprobanteRow {
  key: string
  ventaId: number
  tipoDoc: TipoDoc
  numero: string
  subNumero: string
  clienteNombre: string
  tipoVenta: string
  condicion: string
  fecha: string
  total: number
  ivaTotal: number
  devolucionId?: number
}

const ventas      = ref<Venta[]>([])
const isLoading   = ref(false)
const loadError   = ref("")
const search      = ref("")
const isBusy      = ref<string | null>(null)

const columns = [
  { key: "numero", label: "Número" },
  { key: "documento", label: "Documento" },
  { key: "cliente", label: "Cliente" },
  { key: "condicion", label: "Condición" },
  { key: "fecha", label: "Fecha Emisión" },
  { key: "total", label: "Total" },
  { key: "ivaTotal", label: "IVA total" },
  { key: "acciones", label: "" },
]

// ── Filtros ──────────────────────────────────────────────────────────────────
const filtroDoc       = ref<string[]>([])
const filtroCondicion = ref<string[]>([])
const filtroFechaDesde = ref("")
const filtroFechaHasta = ref("")

const docOpciones = [
  { value: "Factura",     label: "Factura",         dot: "var(--color-primary)" },
  { value: "NotaCredito", label: "Nota de Crédito", dot: "var(--color-tertiary)" },
]
const condicionOpciones = [
  { value: "Contado", label: "Contado", dot: "var(--color-info)" },
  { value: "Credito", label: "Crédito", dot: "var(--color-tertiary)" },
]

// ── Filas normalizadas (facturas + notas de crédito) ─────────────────────────
const comprobantes = computed<ComprobanteRow[]>(() => {
  const rows: ComprobanteRow[] = []
  for (const v of ventas.value) {
    if (v.factura) {
      rows.push({
        key: `f-${v.id}`,
        ventaId: v.id,
        tipoDoc: "Factura",
        numero: v.factura.numeroFactura,
        subNumero: `${v.numeroComprobante}${v.factura.timbrado ? " · Timb. " + v.factura.timbrado : ""}`,
        clienteNombre: v.clienteNombre,
        tipoVenta: v.tipo,
        condicion: v.condicionVenta,
        fecha: v.factura.fechaEmision ?? "",
        total: v.factura.total ?? v.total,
        ivaTotal: (v.factura.iva5 ?? 0) + (v.factura.iva10 ?? 0),
      })
    }
    for (const d of v.devoluciones ?? []) {
      if (!d.notaCredito) continue
      const nc = d.notaCredito
      rows.push({
        key: `nc-${nc.id}`,
        ventaId: v.id,
        tipoDoc: "NotaCredito",
        numero: nc.numeroNotaCredito,
        subNumero: `Compensa ${v.factura?.numeroFactura ?? "—"}`,
        clienteNombre: v.clienteNombre,
        tipoVenta: v.tipo,
        condicion: v.condicionVenta,
        fecha: nc.fechaEmision ?? "",
        total: nc.total,
        ivaTotal: Math.round(nc.montoGravado5 / 21) + Math.round(nc.montoGravado10 / 11),
        devolucionId: d.id,
      })
    }
  }
  return rows
})

const comprobantesFiltrados = computed(() => {
  let list = comprobantes.value
  if (filtroDoc.value.length)
    list = list.filter(r => filtroDoc.value.includes(r.tipoDoc))
  if (search.value.trim()) {
    const q = search.value.toLowerCase()
    list = list.filter(r =>
      r.clienteNombre.toLowerCase().includes(q) ||
      r.numero.toLowerCase().includes(q) ||
      r.subNumero.toLowerCase().includes(q),
    )
  }
  if (filtroCondicion.value.length)
    list = list.filter(r => filtroCondicion.value.includes(r.condicion))
  if (filtroFechaDesde.value)
    list = list.filter(r => r.fecha >= filtroFechaDesde.value)
  if (filtroFechaHasta.value)
    list = list.filter(r => r.fecha <= filtroFechaHasta.value)
  return [...list].sort((a, b) => b.fecha.localeCompare(a.fecha))
})

async function load() {
  isLoading.value = true
  loadError.value = ""
  try {
    const result = await getVentas({ pageSize: 500 })
    ventas.value = (result.items ?? []).filter(v =>
      !!v.factura || (v.devoluciones ?? []).some(d => d.notaCredito))
  } catch (err: unknown) {
    loadError.value = err instanceof Error ? err.message : "Error al cargar comprobantes."
  } finally {
    isLoading.value = false
  }
}

onMounted(load)

// ── Formato ──────────────────────────────────────────────────────────────────
const formatPrice = (n: number) =>
  new Intl.NumberFormat("es-PY", { style: "currency", currency: "PYG", maximumFractionDigits: 0 }).format(n)

const formatDate = (s?: string) =>
  s ? new Date(s.includes("T") ? s : s + "T00:00:00").toLocaleDateString("es-PY", { day: "2-digit", month: "short", year: "numeric" }) : "—"

function docBadge(tipoDoc: TipoDoc) {
  return tipoDoc === "NotaCredito"
    ? { text: "Nota de Crédito", bg: "color-mix(in srgb, var(--color-tertiary) 14%, var(--color-surface-container-lowest))", color: "var(--color-tertiary)", icon: "receipt_long" }
    : { text: "Factura",         bg: "var(--color-info-container)", color: "var(--color-on-info-container)", icon: "receipt" }
}

function condicionBadge(c: string) {
  return c === "Credito"
    ? { text: "Crédito", bg: "color-mix(in srgb, var(--color-tertiary) 12%, var(--color-surface-container-lowest))", color: "var(--color-tertiary)" }
    : { text: "Contado", bg: "var(--color-info-container)", color: "var(--color-info)" }
}

// ── PDF: construir doc completo (factura o NC) ────────────────────────────────
async function buildDocFor(row: ComprobanteRow) {
  const [venta, config] = await Promise.all([getVentaById(row.ventaId), getConfiguracion()])
  if (row.tipoDoc === "Factura") return pdf.buildFacturaDoc(venta, config)
  const dev = venta.devoluciones.find(d => d.id === row.devolucionId && d.notaCredito) as Devolucion | undefined
  if (!dev) throw new Error("No se encontró la nota de crédito de la venta.")
  return pdf.buildNotaCreditoDoc(venta, dev, config)
}

function nombreArchivo(row: ComprobanteRow) {
  const prefijo = row.tipoDoc === "Factura" ? "Factura" : "NotaCredito"
  return `${prefijo}-${row.numero}-${row.clienteNombre.replace(/\s+/g, "-")}.pdf`
}

// ── Preview ───────────────────────────────────────────────────────────────────
const showPreview   = ref(false)
const previewUrl    = ref("")
const previewTitle  = ref("")
const previewRow    = ref<ComprobanteRow | null>(null)

async function openPreview(row: ComprobanteRow) {
  if (isBusy.value) return
  isBusy.value = row.key
  loadError.value = ""
  try {
    const doc = await buildDocFor(row)
    if (previewUrl.value) URL.revokeObjectURL(previewUrl.value)
    previewUrl.value   = pdf.previewDoc(doc)
    previewTitle.value = `${row.tipoDoc === "Factura" ? "Factura" : "Nota de Crédito"} ${row.numero}`
    previewRow.value   = row
    showPreview.value  = true
  } catch (e: unknown) {
    loadError.value = e instanceof Error ? e.message : "No se pudo generar la previsualización."
  } finally {
    isBusy.value = null
  }
}

function closePreview() {
  showPreview.value = false
  previewRow.value  = null
  if (previewUrl.value) { URL.revokeObjectURL(previewUrl.value); previewUrl.value = "" }
}

// ── Descarga ──────────────────────────────────────────────────────────────────
async function descargar(row: ComprobanteRow) {
  if (isBusy.value) return
  isBusy.value = row.key
  loadError.value = ""
  try {
    const doc = await buildDocFor(row)
    pdf.descargarDoc(doc, nombreArchivo(row))
  } catch (e: unknown) {
    loadError.value = e instanceof Error ? e.message : "No se pudo generar el PDF."
  } finally {
    isBusy.value = null
  }
}

function descargarDesdePreview() {
  if (previewRow.value) descargar(previewRow.value)
}

// ── Acciones ─────────────────────────────────────────────────────────────────
function menuItems(row: ComprobanteRow): ContextMenuItem[] {
  return [
    { type: "item", label: "Ver venta", icon: "open_in_new", action: () => router.push(`/ventas/${row.ventaId}`) },
    { type: "separator" },
    { type: "item", label: "Visualizar comprobante", icon: "visibility", action: () => openPreview(row) },
    {
      type:   "item",
      label:  isBusy.value === row.key ? "Generando PDF…" : "Descargar PDF",
      icon:   "picture_as_pdf",
      action: () => descargar(row),
    },
  ]
}
</script>

<template>
  <div class="min-h-screen" style="background-color: var(--color-background)">
    <AppSidebar />
    <AppHeader />

    <main style="margin-left: var(--sidebar-width); transition: margin-left 0.25s ease; padding-top: 64px">
      <div class="p-4 sm:p-6 lg:p-8">

        <!-- Header -->
        <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-8">
          <div>
            <h1 class="text-4xl font-extrabold tracking-tight mb-2">Comprobantes de Venta</h1>
            <p class="font-medium" style="color: var(--color-on-surface-variant)">
              Facturas timbradas y notas de crédito emitidas a clientes
            </p>
          </div>
        </div>

        <!-- Filtros -->
        <div class="flex items-center justify-between gap-4 mb-8 flex-wrap">
          <div class="flex items-center gap-3 flex-wrap">
            <FilterChips
              v-model="filtroDoc"
              :options="docOpciones"
              placeholder="Documento"
            />
            <FilterChips
              v-model="filtroCondicion"
              :options="condicionOpciones"
              placeholder="Condición"
            />

            <!-- Date range -->
            <div class="flex items-center gap-1.5">
              <div class="flex items-center gap-1">
                <DateInput v-model="filtroFechaDesde" placeholder="Desde" />
                <button v-if="filtroFechaDesde" class="fv-date-clear" title="Limpiar" @click="filtroFechaDesde = ''">×</button>
              </div>

              <span style="color: var(--color-outline); font-size: 13px; font-weight: 500">—</span>

              <div class="flex items-center gap-1">
                <DateInput v-model="filtroFechaHasta" placeholder="Hasta" />
                <button v-if="filtroFechaHasta" class="fv-date-clear" title="Limpiar" @click="filtroFechaHasta = ''">×</button>
              </div>
            </div>
          </div>

          <SearchInput
            v-model="search"
            placeholder="Buscar por número o cliente…"
            class="w-80"
          />
        </div>

        <!-- Error -->
        <div v-if="loadError" class="flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium mb-6"
          style="background-color: var(--color-error-container); color: var(--color-on-error-container)">
          <span class="material-symbols-outlined" style="font-size: 18px">error</span>
          {{ loadError }}
        </div>

        <!-- Tabla -->
        <BaseTable :columns="columns" :items="comprobantesFiltrados" :loading="isLoading" @row-click="r => router.push(`/ventas/${r.ventaId}`)">
          <template #empty>
            <div class="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
              style="background-color: var(--color-surface-container-low)">
              <span class="material-symbols-outlined text-4xl" style="color: var(--color-outline)">receipt</span>
            </div>
            <p class="font-bold text-lg mb-1" style="color: var(--color-on-surface)">Sin comprobantes</p>
            <p class="text-sm" style="color: var(--color-on-surface-variant)">
              No hay comprobantes que coincidan con los filtros aplicados.
            </p>
          </template>
          <template #numero="{ item: r }">
            <p class="font-mono text-sm font-semibold" style="color: var(--color-on-surface)">
              {{ r.numero }}
            </p>
            <p class="text-xs mt-0.5" style="color: var(--color-outline)">{{ r.subNumero }}</p>
          </template>
          <template #documento="{ item: r }">
            <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold"
              :style="`background-color: ${docBadge(r.tipoDoc).bg}; color: ${docBadge(r.tipoDoc).color}`">
              <span class="material-symbols-outlined" style="font-size: 14px">{{ docBadge(r.tipoDoc).icon }}</span>
              {{ docBadge(r.tipoDoc).text }}
            </span>
          </template>
          <template #cliente="{ item: r }">
            <span class="font-medium text-sm" style="color: var(--color-on-surface)">{{ r.clienteNombre }}</span>
          </template>
          <template #condicion="{ item: r }">
            <span class="px-2.5 py-1 rounded-full text-xs font-bold"
              :style="`background-color: ${condicionBadge(r.condicion).bg}; color: ${condicionBadge(r.condicion).color}`">
              {{ condicionBadge(r.condicion).text }}
            </span>
          </template>
          <template #fecha="{ item: r }">
            {{ formatDate(r.fecha) }}
          </template>
          <template #total="{ item: r }">
            <span class="font-bold text-sm" :style="`color: ${r.tipoDoc === 'NotaCredito' ? 'var(--color-tertiary)' : 'var(--color-primary)'}`">
              {{ r.tipoDoc === 'NotaCredito' ? '−' : '' }}{{ formatPrice(r.total) }}
            </span>
          </template>
          <template #ivaTotal="{ item: r }">
            {{ formatPrice(r.ivaTotal) }}
          </template>
          <template #acciones="{ item: r }">
            <div class="flex justify-end" @click.stop>
              <RowContextMenu :items="menuItems(r)" />
            </div>
          </template>
        </BaseTable>

        <p class="text-sm" style="color: var(--color-on-surface-variant)">
          Mostrando <strong style="color: var(--color-on-surface)">{{ comprobantesFiltrados.length }}</strong>
          de <strong style="color: var(--color-on-surface)">{{ comprobantes.length }}</strong> comprobantes
        </p>

      </div>
    </main>

    <!-- Modal: previsualizar comprobante -->
    <BaseModal :show="showPreview" size="lg" :title="previewTitle" @close="closePreview">
      <template #body>
        <div class="w-full rounded-lg overflow-hidden" style="border: 1px solid var(--color-hairline); height: 70vh; background: var(--color-surface-container-low)">
          <iframe v-if="previewUrl" :src="previewUrl" title="Previsualización de comprobante" class="w-full h-full" style="border: 0"></iframe>
        </div>
      </template>
      <template #footer>
        <BaseButton variant="secondary" @click="closePreview">Cerrar</BaseButton>
        <BaseButton variant="primary" @click="descargarDesdePreview">
          <span class="material-symbols-outlined" style="font-size: 18px">picture_as_pdf</span>
          Descargar PDF
        </BaseButton>
      </template>
    </BaseModal>
  </div>
</template>

<style scoped>
.fv-date-trigger {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 36px;
  padding: 0 12px;
  width: 140px;
  background: var(--color-surface);
  border: 1px solid var(--color-outline-variant);
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  color: var(--color-on-surface);
  font-family: inherit;
  white-space: nowrap;
  cursor: pointer;
  transition: background 0.12s, border-color 0.12s, color 0.12s;
}
.fv-date-trigger:hover:not(.active) {
  background: var(--color-surface-container-high);
}
.fv-date-trigger.active {
  border-color: var(--color-primary);
  color: var(--color-primary);
  background: var(--color-primary-fixed);
}
.fv-date-wrap {
  position: relative;
}
.date-hidden {
  position: absolute;
  left: 0;
  bottom: 0;
  width: 1px;
  height: 1px;
  opacity: 0;
  pointer-events: none;
  border: none;
  padding: 0;
}
.fv-date-clear {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 17px;
  height: 17px;
  border-radius: 50%;
  border: none;
  background: var(--color-outline-variant);
  color: var(--color-on-surface-variant);
  font-size: 15px;
  line-height: 1;
  padding: 0;
  cursor: pointer;
  transition: background 0.1s, color 0.1s;
}
.fv-date-clear:hover {
  background: var(--color-error-container);
  color: var(--color-error);
}
</style>
