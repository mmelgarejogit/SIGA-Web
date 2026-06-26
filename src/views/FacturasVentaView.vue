<script setup lang="ts">
import { ref, computed, onMounted } from "vue"
import { useRouter } from "vue-router"
import AppSidebar from "@/components/AppSidebar.vue"
import AppHeader from "@/components/AppHeader.vue"
import FilterChips from "@/components/FilterChips.vue"
import SearchInput from "@/components/SearchInput.vue"
import RowContextMenu, { type ContextMenuItem } from "@/components/RowContextMenu.vue"
import { type Venta, getVentas, getVentaById } from "@/services/ventasService"
import { getConfiguracion } from "@/services/configService"
import { useFacturaVentaPdf } from "@/composables/useFacturaVentaPdf"

const router = useRouter()

const ventas      = ref<Venta[]>([])
const isLoading   = ref(false)
const loadError   = ref("")
const search      = ref("")
const isDownloading = ref<number | null>(null)

// ── Filtros ──────────────────────────────────────────────────────────────────
const filtroTipo      = ref<string[]>([])
const filtroCondicion = ref<string[]>([])
const filtroFechaDesde = ref("")
const filtroFechaHasta = ref("")
const inputDesde = ref<HTMLInputElement | null>(null)
const inputHasta = ref<HTMLInputElement | null>(null)

const tipoOpciones = [
  { value: "Directa",        label: "Directa",   dot: "var(--color-on-info-container)" },
  { value: "TrabajoAPedido", label: "A pedido",  dot: "var(--color-tertiary)" },
]
const condicionOpciones = [
  { value: "Contado", label: "Contado", dot: "#0369a1" },
  { value: "Credito", label: "Crédito", dot: "var(--color-tertiary)" },
]

function openPicker(input: HTMLInputElement | null) {
  if (!input) return
  if (typeof input.showPicker === "function") input.showPicker()
  else input.focus()
}

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
    ? { text: "A pedido", bg: "#F3E8FF", color: "var(--color-tertiary)" }
    : { text: "Directa",  bg: "var(--color-info-container)", color: "var(--color-on-info-container)" }
}

function condicionBadge(c: string) {
  return c === "Credito"
    ? { text: "Crédito", bg: "color-mix(in srgb, var(--color-tertiary) 12%, var(--color-surface-container-lowest))", color: "var(--color-tertiary)" }
    : { text: "Contado", bg: "#EFF6FF", color: "#0369a1" }
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
      <div class="p-8">

        <!-- Header -->
        <div class="flex items-start justify-between mb-8">
          <div>
            <h1 class="text-4xl font-extrabold tracking-tight mb-2">Facturas de Venta</h1>
            <p class="font-medium" style="color: var(--color-on-surface-variant)">
              Historial de facturas timbradas emitidas a clientes
            </p>
          </div>
        </div>

        <!-- Filtros -->
        <div class="flex items-center justify-between gap-4 mb-6 flex-wrap">
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
                <div class="fv-date-wrap">
                  <button type="button" class="fv-date-trigger" :class="{ active: filtroFechaDesde }" @click="openPicker(inputDesde)">
                    <span class="material-symbols-outlined" style="font-size: 15px">calendar_today</span>
                    <span>{{ filtroFechaDesde ? formatFilterDate(filtroFechaDesde) : "Desde" }}</span>
                    <span class="material-symbols-outlined" style="font-size: 14px; opacity: 0.6">expand_more</span>
                  </button>
                  <input ref="inputDesde" type="date" v-model="filtroFechaDesde" class="date-hidden" />
                </div>
                <button v-if="filtroFechaDesde" class="fv-date-clear" title="Limpiar" @click="filtroFechaDesde = ''">×</button>
              </div>

              <span style="color: var(--color-outline); font-size: 13px; font-weight: 500">—</span>

              <div class="flex items-center gap-1">
                <div class="fv-date-wrap">
                  <button type="button" class="fv-date-trigger" :class="{ active: filtroFechaHasta }" @click="openPicker(inputHasta)">
                    <span class="material-symbols-outlined" style="font-size: 15px">event</span>
                    <span>{{ filtroFechaHasta ? formatFilterDate(filtroFechaHasta) : "Hasta" }}</span>
                    <span class="material-symbols-outlined" style="font-size: 14px; opacity: 0.6">expand_more</span>
                  </button>
                  <input ref="inputHasta" type="date" v-model="filtroFechaHasta" class="date-hidden" />
                </div>
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
        <div class="rounded-2xl overflow-hidden mb-4"
          style="background-color: var(--color-surface-container-lowest); box-shadow: var(--shadow-sm); outline: 1px solid var(--color-hairline)">

          <!-- Loading -->
          <div v-if="isLoading" class="p-12 flex justify-center">
            <span class="material-symbols-outlined animate-spin" style="font-size: 32px; color: var(--color-primary)">progress_activity</span>
          </div>

          <!-- Empty -->
          <div v-else-if="ventasFiltradas.length === 0" class="p-12 text-center">
            <div class="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
              style="background-color: var(--color-surface-container-low)">
              <span class="material-symbols-outlined text-4xl" style="color: var(--color-outline)">receipt</span>
            </div>
            <p class="font-bold text-lg mb-1" style="color: var(--color-on-surface)">Sin facturas</p>
            <p class="text-sm" style="color: var(--color-on-surface-variant)">
              No hay facturas que coincidan con los filtros aplicados.
            </p>
          </div>

          <!-- Data -->
          <table v-else class="w-full">
            <thead style="background-color: var(--color-surface-container-low)">
              <tr>
                <th v-for="h in ['Nro. Factura', 'Cliente', 'Tipo', 'Condición', 'Fecha Emisión', 'Total', 'IVA total']"
                  :key="h"
                  class="px-6 py-5 text-left text-xs font-bold uppercase tracking-widest"
                  style="color: var(--color-outline)">
                  {{ h }}
                </th>
                <th class="px-6 py-5" />
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="v in ventasFiltradas"
                :key="v.id"
                class="hover:bg-surface-container-low cursor-pointer"
                style="border-bottom: 1px solid var(--color-hairline-soft)"
                @click="router.push(`/ventas/${v.id}`)"
              >
                <!-- Nro. Factura + comprobante ref -->
                <td class="px-6 py-4">
                  <p class="font-mono text-sm font-semibold" style="color: var(--color-on-surface)">
                    {{ v.factura?.numeroFactura ?? "—" }}
                  </p>
                  <p class="text-xs mt-0.5" style="color: var(--color-outline)">
                    {{ v.numeroComprobante }}
                    <template v-if="v.factura?.timbrado">
                      · Timb. {{ v.factura.timbrado }}
                    </template>
                  </p>
                </td>

                <!-- Cliente -->
                <td class="px-6 py-4">
                  <span class="font-medium text-sm" style="color: var(--color-on-surface)">{{ v.clienteNombre }}</span>
                </td>

                <!-- Tipo -->
                <td class="px-6 py-4">
                  <span class="px-2.5 py-1 rounded-full text-xs font-bold"
                    :style="`background-color: ${tipoBadge(v.tipo).bg}; color: ${tipoBadge(v.tipo).color}`">
                    {{ tipoBadge(v.tipo).text }}
                  </span>
                </td>

                <!-- Condición -->
                <td class="px-6 py-4">
                  <span class="px-2.5 py-1 rounded-full text-xs font-bold"
                    :style="`background-color: ${condicionBadge(v.condicionVenta).bg}; color: ${condicionBadge(v.condicionVenta).color}`">
                    {{ condicionBadge(v.condicionVenta).text }}
                  </span>
                </td>

                <!-- Fecha -->
                <td class="px-6 py-4 text-sm" style="color: var(--color-on-surface-variant)">
                  {{ formatDate(v.factura?.fechaEmision) }}
                </td>

                <!-- Total -->
                <td class="px-6 py-4">
                  <span class="font-bold text-sm" style="color: var(--color-primary)">
                    {{ formatPrice(v.factura?.total ?? v.total) }}
                  </span>
                </td>

                <!-- IVA -->
                <td class="px-6 py-4 text-sm" style="color: var(--color-on-surface-variant)">
                  {{ formatPrice((v.factura?.iva5 ?? 0) + (v.factura?.iva10 ?? 0)) }}
                </td>

                <!-- Acciones -->
                <td class="px-6 py-4" @click.stop>
                  <div class="flex justify-end">
                    <RowContextMenu :items="menuItems(v)" />
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

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
  background: #EEF2FF;
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
