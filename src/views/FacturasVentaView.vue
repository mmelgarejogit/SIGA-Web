<script setup lang="ts">
import DateInput from "@/components/DateInput.vue"
import { ref, computed, onMounted } from "vue"
import { useRouter } from "vue-router"
import AppSidebar from "@/components/AppSidebar.vue"
import AppHeader from "@/components/AppHeader.vue"
import FilterChips from "@/components/FilterChips.vue"
import SearchInput from "@/components/SearchInput.vue"
import RowContextMenu, { type ContextMenuItem } from "@/components/RowContextMenu.vue"
import BaseTable from "@/components/BaseTable.vue"
import { type Venta, getVentas, getVentaById } from "@/services/ventasService"
import { getConfiguracion } from "@/services/configService"
import { useFacturaVentaPdf } from "@/composables/useFacturaVentaPdf"

const router = useRouter()

const ventas      = ref<Venta[]>([])
const isLoading   = ref(false)
const loadError   = ref("")
const search      = ref("")
const isDownloading = ref<number | null>(null)

const columns = [
  { key: "nroFactura", label: "Nro. Factura" },
  { key: "cliente", label: "Cliente" },
  { key: "tipo", label: "Tipo" },
  { key: "condicion", label: "Condición" },
  { key: "fecha", label: "Fecha Emisión" },
  { key: "total", label: "Total" },
  { key: "ivaTotal", label: "IVA total" },
  { key: "acciones", label: "" },
]

// ── Filtros ──────────────────────────────────────────────────────────────────
const filtroTipo      = ref<string[]>([])
const filtroCondicion = ref<string[]>([])
const filtroFechaDesde = ref("")
const filtroFechaHasta = ref("")

const tipoOpciones = [
  { value: "Directa",        label: "Directa",   dot: "var(--color-on-info-container)" },
  { value: "TrabajoAPedido", label: "A pedido",  dot: "var(--color-tertiary)" },
]
const condicionOpciones = [
  { value: "Contado", label: "Contado", dot: "var(--color-info)" },
  { value: "Credito", label: "Crédito", dot: "var(--color-tertiary)" },
]


function formatFilterDate(d: string) {
  return new Date(d + "T12:00:00").toLocaleDateString("es-PY", { day: "2-digit", month: "short" })
}

// ── Datos filtrados ──────────────────────────────────────────────────────────
const ventasFiltradas = computed(() => {
  let list = ventas.value
  if (search.value.trim()) {
    const q = search.value.toLowerCase()
    list = list.filter(v =>
      v.clienteNombre.toLowerCase().includes(q) ||
      v.numeroComprobante.toLowerCase().includes(q) ||
      (v.factura?.numeroFactura ?? "").toLowerCase().includes(q),
    )
  }
  if (filtroTipo.value.length)
    list = list.filter(v => filtroTipo.value.includes(v.tipo))
  if (filtroCondicion.value.length)
    list = list.filter(v => filtroCondicion.value.includes(v.condicionVenta))
  if (filtroFechaDesde.value)
    list = list.filter(v => (v.factura?.fechaEmision ?? "") >= filtroFechaDesde.value)
  if (filtroFechaHasta.value)
    list = list.filter(v => (v.factura?.fechaEmision ?? "") <= filtroFechaHasta.value)
  return list
})

async function load() {
  isLoading.value = true
  loadError.value = ""
  try {
    const result = await getVentas({ pageSize: 500 })
    ventas.value = (result.items ?? []).filter(v => !!v.factura)
  } catch (err: unknown) {
    loadError.value = err instanceof Error ? err.message : "Error al cargar facturas."
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

function tipoBadge(tipo: string) {
  return tipo === "TrabajoAPedido"
    ? { text: "A pedido", bg: "var(--color-tertiary-fixed)", color: "var(--color-tertiary)" }
    : { text: "Directa",  bg: "var(--color-info-container)", color: "var(--color-on-info-container)" }
}

function condicionBadge(c: string) {
  return c === "Credito"
    ? { text: "Crédito", bg: "color-mix(in srgb, var(--color-tertiary) 12%, var(--color-surface-container-lowest))", color: "var(--color-tertiary)" }
    : { text: "Contado", bg: "var(--color-info-container)", color: "var(--color-info)" }
}

// ── Acciones ─────────────────────────────────────────────────────────────────
function menuItems(item: Venta): ContextMenuItem[] {
  return [
    { type: "item", label: "Ver venta",    icon: "open_in_new",    action: () => router.push(`/ventas/${item.id}`) },
    { type: "separator" },
    {
      type:   "item",
      label:  isDownloading.value === item.id ? "Generando PDF…" : "Descargar PDF",
      icon:   "picture_as_pdf",
      action: () => descargarPdf(item),
    },
  ]
}

async function descargarPdf(item: Venta) {
  if (isDownloading.value === item.id) return
  isDownloading.value = item.id
  try {
    const [ventaCompleta, config] = await Promise.all([
      getVentaById(item.id),
      getConfiguracion(),
    ])
    const { generarPdfFactura } = useFacturaVentaPdf()
    generarPdfFactura(ventaCompleta, config)
  } catch {
    // silently fail — user can retry
  } finally {
    isDownloading.value = null
  }
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
            <h1 class="text-4xl font-extrabold tracking-tight mb-2">Facturas de Venta</h1>
            <p class="font-medium" style="color: var(--color-on-surface-variant)">
              Historial de facturas timbradas emitidas a clientes
            </p>
          </div>
        </div>

        <!-- Filtros -->
        <div class="flex items-center justify-between gap-4 mb-8 flex-wrap">
          <div class="flex items-center gap-3 flex-wrap">
            <FilterChips
              v-model="filtroTipo"
              :options="tipoOpciones"
              placeholder="Tipo"
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
            placeholder="Buscar por factura, comprobante o cliente…"
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
        <BaseTable :columns="columns" :items="ventasFiltradas" :loading="isLoading" @row-click="v => router.push(`/ventas/${v.id}`)">
          <template #empty>
            <div class="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
              style="background-color: var(--color-surface-container-low)">
              <span class="material-symbols-outlined text-4xl" style="color: var(--color-outline)">receipt</span>
            </div>
            <p class="font-bold text-lg mb-1" style="color: var(--color-on-surface)">Sin facturas</p>
            <p class="text-sm" style="color: var(--color-on-surface-variant)">
              No hay facturas que coincidan con los filtros aplicados.
            </p>
          </template>
          <template #nroFactura="{ item: v }">
            <p class="font-mono text-sm font-semibold" style="color: var(--color-on-surface)">
              {{ v.factura?.numeroFactura ?? "—" }}
            </p>
            <p class="text-xs mt-0.5" style="color: var(--color-outline)">
              {{ v.numeroComprobante }}
              <template v-if="v.factura?.timbrado">
                · Timb. {{ v.factura.timbrado }}
              </template>
            </p>
          </template>
          <template #cliente="{ item: v }">
            <span class="font-medium text-sm" style="color: var(--color-on-surface)">{{ v.clienteNombre }}</span>
          </template>
          <template #tipo="{ item: v }">
            <span class="px-2.5 py-1 rounded-full text-xs font-bold"
              :style="`background-color: ${tipoBadge(v.tipo).bg}; color: ${tipoBadge(v.tipo).color}`">
              {{ tipoBadge(v.tipo).text }}
            </span>
          </template>
          <template #condicion="{ item: v }">
            <span class="px-2.5 py-1 rounded-full text-xs font-bold"
              :style="`background-color: ${condicionBadge(v.condicionVenta).bg}; color: ${condicionBadge(v.condicionVenta).color}`">
              {{ condicionBadge(v.condicionVenta).text }}
            </span>
          </template>
          <template #fecha="{ item: v }">
            {{ formatDate(v.factura?.fechaEmision) }}
          </template>
          <template #total="{ item: v }">
            <span class="font-bold text-sm" style="color: var(--color-primary)">
              {{ formatPrice(v.factura?.total ?? v.total) }}
            </span>
          </template>
          <template #ivaTotal="{ item: v }">
            {{ formatPrice((v.factura?.iva5 ?? 0) + (v.factura?.iva10 ?? 0)) }}
          </template>
          <template #acciones="{ item: v }">
            <div class="flex justify-end" @click.stop>
              <RowContextMenu :items="menuItems(v)" />
            </div>
          </template>
        </BaseTable>

        <p class="text-sm" style="color: var(--color-on-surface-variant)">
          Mostrando <strong style="color: var(--color-on-surface)">{{ ventasFiltradas.length }}</strong>
          de <strong style="color: var(--color-on-surface)">{{ ventas.length }}</strong> facturas
        </p>

      </div>
    </main>
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
