<script setup lang="ts">
import { ref, computed, onMounted } from "vue"
import { useRouter } from "vue-router"
import AppSidebar from "@/components/AppSidebar.vue"
import AppHeader from "@/components/AppHeader.vue"
import FilterChips from "@/components/FilterChips.vue"
import SearchInput from "@/components/SearchInput.vue"
import SearchableSelect from "@/components/SearchableSelect.vue"
import BaseButton from "@/components/BaseButton.vue"
import RowContextMenu, { type ContextMenuItem } from "@/components/RowContextMenu.vue"
import {
  getFacturasCompra,
  anularFactura,
  type FacturaCompraItem,
} from "@/services/comprasService"
import { getProveedores, type Proveedor } from "@/services/inventarioService"

const router = useRouter()

// ── Estado de lista ──────────────────────────────────────────────────────────
const facturas = ref<FacturaCompraItem[]>([])
const totalCount = ref(0)
const currentPage = ref(1)
const pageSize = 20
const isLoading = ref(false)

// ── Filtros ──────────────────────────────────────────────────────────────────
const filtroEstado = ref<string[]>([])
const filtroCondicion = ref<string[]>([])
const filtroOrigen = ref<string[]>([])
const filtroProveedorId = ref<number | null>(null)
const filtroFechaDesde = ref("")
const filtroFechaHasta = ref("")
const search = ref("")

const estadoOpciones = [
  { value: "vigente", label: "Vigente", dot: "var(--color-success)" },
  { value: "anulada", label: "Anulada", dot: "var(--color-outline)" },
]
const condicionOpciones = [
  { value: "Contado", label: "Contado", dot: "#0369a1" },
  { value: "Credito", label: "Crédito", dot: "var(--color-tertiary)" },
]
const origenOpciones = [
  { value: "ConOC", label: "Con OC", dot: "var(--color-on-info-container)" },
  { value: "Directa", label: "Directa", dot: "#9333ea" },
]

const proveedores = ref<Proveedor[]>([])
const inputDesde = ref<HTMLInputElement | null>(null)
const inputHasta = ref<HTMLInputElement | null>(null)

function openPicker(input: HTMLInputElement | null) {
  if (!input) return
  if (typeof input.showPicker === "function") input.showPicker()
  else input.focus()
}

const proveedorOptions = computed(() =>
  proveedores.value.map(p => ({ value: p.id, label: p.nombre, code: p.ruc })),
)

onMounted(async () => {
  await loadProveedores()
  await loadFacturas()
})

async function loadProveedores() {
  try {
    const r = await getProveedores({ pageSize: 200 })
    proveedores.value = Array.isArray(r) ? r : (r.items ?? [])
  } catch { /* sin filtro proveedor */ }
}

async function loadFacturas() {
  isLoading.value = true
  try {
    const r = await getFacturasCompra({
      proveedorId: filtroProveedorId.value ?? undefined,
      condicionVenta: filtroCondicion.value[0],
      estado: filtroEstado.value[0],
      origen: filtroOrigen.value[0],
      fechaDesde: filtroFechaDesde.value || undefined,
      fechaHasta: filtroFechaHasta.value || undefined,
      search: search.value || undefined,
      page: currentPage.value,
      pageSize,
    })
    facturas.value = r.items
    totalCount.value = r.totalCount
  } catch {
    facturas.value = []
  } finally {
    isLoading.value = false
  }
}

function applyFilters() {
  currentPage.value = 1
  loadFacturas()
}

function clearFiltroFechas() {
  filtroFechaDesde.value = ""
  filtroFechaHasta.value = ""
  applyFilters()
}

function formatFilterDate(dateStr: string) {
  return new Date(dateStr + "T12:00:00").toLocaleDateString("es-PY", {
    day: "2-digit", month: "short",
  })
}

function openNuevaFactura() {
  router.push("/compras/facturas/nueva")
}

// ── Formato ──────────────────────────────────────────────────────────────────
function formatDate(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("es-PY", {
    day: "2-digit", month: "short", year: "numeric",
  })
}
function formatMonto(n: number) {
  return new Intl.NumberFormat("es-PY", { style: "currency", currency: "PYG", minimumFractionDigits: 0 }).format(n)
}

function estadoBadge(estado: string) {
  if (estado === "Anulado") return { text: "Anulada", bg: "var(--color-surface-container)", color: "var(--color-outline)", border: "var(--color-outline-variant)" }
  if (estado === "Pagado")  return { text: "Pagada",  bg: "var(--color-success-container)", color: "var(--color-success)", border: "#BBF7D0" }
  return { text: "Vigente", bg: "var(--color-warning-container)", color: "var(--color-on-warning-container)", border: "var(--color-warning-container)" }
}

function origenBadge(f: FacturaCompraItem) {
  return f.pedidoProveedorId
    ? { text: "Con OC",  bg: "var(--color-info-container)", color: "var(--color-on-info-container)" }
    : { text: "Directa", bg: "#F3E8FF", color: "var(--color-tertiary)" }
}

// ── Modal Anular ─────────────────────────────────────────────────────────────
const showAnularModal = ref(false)
const anularTarget = ref<FacturaCompraItem | null>(null)
const motivoAnulacion = ref("")
const anularError = ref("")
const isAnulando = ref(false)

function openAnularModal(f: FacturaCompraItem) {
  anularTarget.value = f
  motivoAnulacion.value = ""
  anularError.value = ""
  showAnularModal.value = true
}

async function confirmarAnulacion() {
  if (!motivoAnulacion.value.trim()) { anularError.value = "El motivo es obligatorio."; return }
  if (!anularTarget.value) return

  isAnulando.value = true
  anularError.value = ""
  try {
    await anularFactura(anularTarget.value.id, { motivo: motivoAnulacion.value.trim() })
    showAnularModal.value = false
    await loadFacturas()
  } catch (err: any) {
    anularError.value = err.response?.data?.message ?? err.message ?? "Error al anular."
  } finally {
    isAnulando.value = false
  }
}

function inputStyle(hasError = false) {
  const base = "border-radius: 12px; "
  return hasError
    ? base + "border: 1.5px solid var(--color-error); color: var(--color-on-surface); background-color: color-mix(in srgb, var(--color-error) 8%, var(--color-surface));"
    : base + "border: 1px solid var(--color-outline-variant); color: var(--color-on-surface); background-color: var(--color-surface-container-low);"
}

// ── Context menu ─────────────────────────────────────────────────────────────
function menuItems(f: FacturaCompraItem): ContextMenuItem[] {
  const hasOC     = !!f.pedidoProveedorId
  const canAnular = f.estado !== "Anulado"

  return [
    {
      type: "item",
      label: "Ver detalle",
      icon: "receipt_long",
      action: () => router.push(`/compras/facturas/${f.id}`),
    },
    {
      type: "item",
      label: "Ver Orden de Compra",
      icon: "open_in_new",
      hidden: !hasOC,
      action: () => router.push(`/compras/oc/${f.pedidoProveedorId}?from=facturas`),
    },
    ...((hasOC || true) && canAnular ? [{ type: "separator" as const }] : []),
    {
      type: "item",
      label: "Anular Factura",
      icon: "block",
      danger: true,
      hidden: !canAnular,
      action: () => openAnularModal(f),
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
            <h1 class="text-4xl font-extrabold tracking-tight mb-2">Facturas de Compra</h1>
            <p class="font-medium" style="color: var(--color-on-surface-variant)">
              Registro y seguimiento de facturas de proveedores
            </p>
          </div>
          <BaseButton variant="primary" size="lg" @click="openNuevaFactura">
            <span class="material-symbols-outlined" style="font-size: 20px">add</span>
            Nueva Factura
          </BaseButton>
        </div>

        <!-- Filtros -->
        <div class="flex items-center justify-between gap-4 mb-6 flex-wrap">
          <div class="flex items-center gap-3 flex-wrap">
            <FilterChips
              :model-value="filtroEstado"
              :options="estadoOpciones"
              placeholder="Estado"
              @update:model-value="v => { filtroEstado = v; applyFilters() }"
            />
            <FilterChips
              :model-value="filtroCondicion"
              :options="condicionOpciones"
              placeholder="Condición"
              @update:model-value="v => { filtroCondicion = v; applyFilters() }"
            />
            <FilterChips
              :model-value="filtroOrigen"
              :options="origenOpciones"
              placeholder="Origen"
              @update:model-value="v => { filtroOrigen = v; applyFilters() }"
            />

            <!-- Proveedor -->
            <div class="fc-prov-filter">
              <SearchableSelect
                :model-value="filtroProveedorId"
                :options="proveedorOptions"
                null-label="Todos los proveedores"
                @update:model-value="filtroProveedorId = $event as number | null; applyFilters()"
              />
            </div>

            <!-- Fecha desde / hasta -->
            <div class="flex items-center gap-1.5">
              <!-- Desde -->
              <div class="flex items-center gap-1">
                <div class="fc-date-wrap">
                  <button type="button" class="fc-date-trigger" :class="{ active: filtroFechaDesde }" @click="openPicker(inputDesde)">
                    <span class="material-symbols-outlined" style="font-size: 15px">calendar_today</span>
                    <span>{{ filtroFechaDesde ? formatFilterDate(filtroFechaDesde) : 'Desde' }}</span>
                    <span class="material-symbols-outlined" style="font-size: 14px; opacity: 0.6">expand_more</span>
                  </button>
                  <input ref="inputDesde" type="date" v-model="filtroFechaDesde" class="date-hidden" @change="applyFilters" />
                </div>
                <button v-if="filtroFechaDesde" class="fc-date-clear" title="Limpiar" @click="filtroFechaDesde = ''; applyFilters()">×</button>
              </div>

              <span style="color: var(--color-outline); font-size: 13px; font-weight: 500">—</span>

              <!-- Hasta -->
              <div class="flex items-center gap-1">
                <div class="fc-date-wrap">
                  <button type="button" class="fc-date-trigger" :class="{ active: filtroFechaHasta }" @click="openPicker(inputHasta)">
                    <span class="material-symbols-outlined" style="font-size: 15px">event</span>
                    <span>{{ filtroFechaHasta ? formatFilterDate(filtroFechaHasta) : 'Hasta' }}</span>
                    <span class="material-symbols-outlined" style="font-size: 14px; opacity: 0.6">expand_more</span>
                  </button>
                  <input ref="inputHasta" type="date" v-model="filtroFechaHasta" class="date-hidden" @change="applyFilters" />
                </div>
                <button v-if="filtroFechaHasta" class="fc-date-clear" title="Limpiar" @click="filtroFechaHasta = ''; applyFilters()">×</button>
              </div>
            </div>
          </div>

          <SearchInput
            :model-value="search"
            placeholder="Buscar por Nro. Factura…"
            class="w-full sm:w-72"
            @update:model-value="v => { search = v; applyFilters() }"
          />
        </div>

        <!-- Tabla -->
        <div class="rounded-2xl overflow-hidden mb-4"
          style="background-color: var(--color-surface-container-lowest); box-shadow: var(--shadow-sm); outline: 1px solid var(--color-hairline)">

          <div v-if="isLoading" class="p-12 flex justify-center">
            <span class="material-symbols-outlined animate-spin" style="font-size: 32px; color: var(--color-primary)">progress_activity</span>
          </div>

          <div v-else-if="facturas.length === 0" class="p-12 text-center">
            <div class="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
              style="background-color: var(--color-surface-container-low)">
              <span class="material-symbols-outlined text-4xl" style="color: var(--color-outline)">receipt</span>
            </div>
            <p class="font-bold text-lg mb-1" style="color: var(--color-on-surface)">Sin facturas</p>
            <p class="text-sm" style="color: var(--color-on-surface-variant)">
              No hay facturas que coincidan con los filtros aplicados.
            </p>
          </div>

          <div v-else class="overflow-x-auto"><table class="w-full min-w-[640px]">
            <thead style="background-color: var(--color-surface-container-low)">
              <tr>
                <th v-for="h in ['Nro. Factura','Proveedor','Origen','Fecha Emisión','Monto Total','Condición','Estado']"
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
                v-for="f in facturas"
                :key="f.id"
                class="hover:bg-surface-container-low cursor-pointer"
                :class="{ 'opacity-60': f.estado === 'Anulado' }"
                style="border-bottom: 1px solid var(--color-hairline-soft)"
                @click.self="router.push(`/compras/facturas/${f.id}`)"
              >
                <td class="px-6 py-4">
                  <span class="font-mono text-sm font-semibold" style="color: var(--color-on-surface)">
                    {{ f.nroFactura ?? "—" }}
                  </span>
                </td>

                <td class="px-6 py-4">
                  <span class="font-medium text-sm" style="color: var(--color-on-surface)">{{ f.proveedorNombre }}</span>
                </td>

                <td class="px-6 py-4">
                  <span class="px-2.5 py-1 rounded-full text-xs font-bold"
                    :style="`background-color: ${origenBadge(f).bg}; color: ${origenBadge(f).color}`">
                    {{ origenBadge(f).text }}
                  </span>
                </td>

                <td class="px-6 py-4 text-sm" style="color: var(--color-on-surface-variant)">
                  {{ formatDate(f.fechaEmision) }}
                </td>

                <td class="px-6 py-4">
                  <span class="font-bold text-sm" style="color: var(--color-on-surface)">
                    {{ formatMonto(f.montoTotal) }}
                  </span>
                </td>

                <td class="px-6 py-4 text-sm" style="color: var(--color-on-surface-variant)">
                  {{ f.condicionVenta === "Credito" ? "Crédito" : "Contado" }}
                </td>

                <td class="px-6 py-4">
                  <span class="px-2.5 py-1 rounded-full text-xs font-bold"
                    :style="`background-color: ${estadoBadge(f.estado).bg}; color: ${estadoBadge(f.estado).color}; border: 1px solid ${estadoBadge(f.estado).border}`">
                    {{ estadoBadge(f.estado).text }}
                  </span>
                </td>

                <td class="px-6 py-4">
                  <div class="flex justify-end">
                    <RowContextMenu :items="menuItems(f)" />
                  </div>
                </td>
              </tr>
            </tbody>
          </table></div>
        </div>

        <p class="text-sm" style="color: var(--color-on-surface-variant)">
          Mostrando {{ facturas.length }} de {{ totalCount }} facturas
        </p>

      </div>
    </main>

    <!-- ── Modal Anular ───────────────────────────────────────────────────────── -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="showAnularModal" class="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div class="absolute inset-0" style="background-color: rgba(24, 28, 32, 0.5)" @click="showAnularModal = false" />
          <div class="relative w-full max-w-sm rounded-3xl overflow-hidden"
            style="background-color: var(--color-surface-container-lowest); box-shadow: var(--shadow-xl);">

            <div class="flex items-center justify-between px-8 pt-8 pb-6"
              style="border-bottom: 1px solid var(--color-hairline)">
              <h3 class="text-xl font-extrabold" style="color: var(--color-error)">Anular Factura</h3>
              <button class="p-1 rounded-full transition-colors" style="color: var(--color-outline)"
                @click="showAnularModal = false">
                <span class="material-symbols-outlined" style="font-size: 22px">close</span>
              </button>
            </div>

            <div class="px-8 py-6 space-y-4">
              <div class="p-4 rounded-2xl" style="background-color: var(--color-error-container)">
                <p class="text-sm font-semibold" style="color: var(--color-error)">
                  Vas a anular la factura
                  <strong>{{ anularTarget?.nroFactura ?? "sin número" }}</strong>
                  de <strong>{{ anularTarget?.proveedorNombre }}</strong>.
                </p>
                <p v-if="anularTarget?.pedidoProveedorId" class="text-xs mt-1" style="color: var(--color-error)">
                  La OC asociada volverá a estado Confirmada.
                </p>
              </div>

              <div>
                <label class="text-xs font-bold uppercase tracking-wider block mb-1.5" style="color: var(--color-outline)">
                  Motivo de anulación <span style="color: var(--color-error)">*</span>
                </label>
                <textarea
                  v-model="motivoAnulacion"
                  rows="3"
                  placeholder="Indicá el motivo de la anulación…"
                  class="w-full px-4 py-3 text-sm outline-none appearance-none shadow-none transition-all resize-none"
                  :style="inputStyle(!!anularError)"
                  maxlength="500"
                />
                <p v-if="anularError" class="mt-1 text-xs font-medium" style="color: var(--color-error)">
                  {{ anularError }}
                </p>
              </div>
            </div>

            <div class="px-8 py-6 flex justify-between"
              style="border-top: 1px solid var(--color-hairline)">
              <BaseButton variant="secondary" @click="showAnularModal = false" :disabled="isAnulando">
                Cancelar
              </BaseButton>
              <BaseButton variant="danger" :disabled="isAnulando" @click="confirmarAnulacion">
                <span v-if="isAnulando" class="material-symbols-outlined animate-spin" style="font-size: 18px">progress_activity</span>
                <span v-else class="material-symbols-outlined" style="font-size: 18px">block</span>
                {{ isAnulando ? "Anulando…" : "Anular Factura" }}
              </BaseButton>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active { transition: opacity 0.2s ease; }
.fade-enter-from,
.fade-leave-to { opacity: 0; }

/* Proveedor filter — mismo alto que FilterChips trigger (36px) */
.fc-prov-filter {
  width: 240px;
}
.fc-prov-filter :deep(.ss-trigger) {
  height: 36px;
  font-size: 13px;
  font-weight: 500;
  border-radius: 8px;
  background: var(--color-surface);
}

/* Date filter buttons */
.fc-date-trigger {
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
.fc-date-trigger:hover:not(.active) {
  background: var(--color-surface-container-high);
}
.fc-date-trigger.active {
  border-color: var(--color-primary);
  color: var(--color-primary);
  background: #EEF2FF;
}

/* Wrapper so the hidden input is anchored at the button position */
.fc-date-wrap {
  position: relative;
}

/* Hidden input — sits at bottom-left of the trigger so the picker opens below it */
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

/* Clear (×) button next to each date trigger */
.fc-date-clear {
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
.fc-date-clear:hover {
  background: var(--color-error-container);
  color: var(--color-error);
}
</style>
