<script setup lang="ts">
import { ref, onMounted } from "vue"
import { useRouter } from "vue-router"
import AppSidebar from "@/components/AppSidebar.vue"
import AppHeader from "@/components/AppHeader.vue"
import FilterChips from "@/components/FilterChips.vue"
import SearchInput from "@/components/SearchInput.vue"
import BaseButton from "@/components/BaseButton.vue"
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
const filtroProveedorId = ref<number | undefined>(undefined)
const filtroFechaDesde = ref("")
const filtroFechaHasta = ref("")
const search = ref("")

const estadoOpciones = [
  { value: "vigente", label: "Vigente", dot: "#16a34a" },
  { value: "anulada", label: "Anulada", dot: "#6b7280" },
]
const condicionOpciones = [
  { value: "Contado", label: "Contado", dot: "#0369a1" },
  { value: "Credito", label: "Crédito", dot: "#7c3aed" },
]
const origenOpciones = [
  { value: "ConOC", label: "Con OC", dot: "#1d4ed8" },
  { value: "Directa", label: "Directa", dot: "#9333ea" },
]

const proveedores = ref<Proveedor[]>([])

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
      proveedorId: filtroProveedorId.value,
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
  if (estado === "Anulado") return { text: "Anulada", bg: "#F3F4F6", color: "#6B7280", border: "#D1D5DB" }
  if (estado === "Pagado")  return { text: "Pagada",  bg: "#DCFCE7", color: "#16a34a", border: "#BBF7D0" }
  return { text: "Vigente", bg: "#FEF3C7", color: "#92400E", border: "#FDE68A" }
}

function origenBadge(f: FacturaCompraItem) {
  return f.pedidoProveedorId
    ? { text: "Con OC",  bg: "#DBEAFE", color: "#1d4ed8" }
    : { text: "Directa", bg: "#F3E8FF", color: "#7c3aed" }
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

const inputStyle = (hasError = false) => hasError
  ? "border: 1.5px solid var(--color-error); color: var(--color-on-surface); background-color: #FFF8F7;"
  : "border: 1px solid var(--color-outline-variant); color: var(--color-on-surface); background-color: var(--color-surface-container-low);"
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
            <select
              v-model="filtroProveedorId"
              class="px-3 py-2 rounded-xl text-sm font-medium outline-none transition-all"
              style="border: 1px solid var(--color-outline-variant); background-color: var(--color-surface-container-lowest); color: var(--color-on-surface); min-width: 150px;"
              @change="applyFilters"
            >
              <option :value="undefined">Todos los proveedores</option>
              <option v-for="p in proveedores" :key="p.id" :value="p.id">{{ p.nombre }}</option>
            </select>

            <!-- Fecha desde / hasta -->
            <div class="flex items-center gap-2">
              <input
                v-model="filtroFechaDesde"
                type="date"
                class="px-3 py-2 rounded-xl text-sm outline-none transition-all"
                style="border: 1px solid var(--color-outline-variant); background-color: var(--color-surface-container-lowest); color: var(--color-on-surface);"
                @change="applyFilters"
              />
              <span class="text-sm font-medium" style="color: var(--color-on-surface-variant)">—</span>
              <input
                v-model="filtroFechaHasta"
                type="date"
                class="px-3 py-2 rounded-xl text-sm outline-none transition-all"
                style="border: 1px solid var(--color-outline-variant); background-color: var(--color-surface-container-lowest); color: var(--color-on-surface);"
                @change="applyFilters"
              />
              <button
                v-if="filtroFechaDesde || filtroFechaHasta"
                class="w-7 h-7 rounded-full flex items-center justify-center transition-all hover:scale-105"
                style="background-color: var(--color-surface-container-high)"
                title="Limpiar fechas"
                @click="clearFiltroFechas"
              >
                <span class="material-symbols-outlined" style="font-size: 14px; color: var(--color-on-surface-variant)">close</span>
              </button>
            </div>
          </div>

          <SearchInput
            :model-value="search"
            placeholder="Buscar por Nro. Factura…"
            class="w-72"
            @update:model-value="v => { search = v; applyFilters() }"
          />
        </div>

        <!-- Tabla -->
        <div class="rounded-2xl overflow-hidden mb-4"
          style="background-color: var(--color-surface-container-lowest); box-shadow: 0 1px 3px rgba(196, 197, 213, 0.25); outline: 1px solid rgba(196, 197, 213, 0.15)">

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

          <table v-else class="w-full">
            <thead style="background-color: var(--color-surface-container-low)">
              <tr>
                <th v-for="h in ['Nro. Factura','Proveedor','Origen','Fecha Emisión','Monto Total','Condición','Estado','']"
                  :key="h"
                  class="px-6 py-5 text-left text-xs font-bold uppercase tracking-widest"
                  style="color: var(--color-outline)">
                  {{ h }}
                </th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="f in facturas"
                :key="f.id"
                class="hover:bg-surface-container-low"
                :class="{ 'opacity-60': f.estado === 'Anulado' }"
                style="border-bottom: 1px solid rgba(196, 197, 213, 0.12)"
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
                  <div class="flex items-center gap-2">
                    <button
                      v-if="f.pedidoProveedorId"
                      class="w-9 h-9 rounded-full flex items-center justify-center transition-all hover:scale-105 active:scale-95 bg-blue-100"
                      title="Ver Orden de Compra"
                      @click="router.push(`/compras/oc/${f.pedidoProveedorId}`)"
                    >
                      <span class="material-symbols-outlined text-blue-700" style="font-size: 18px">open_in_new</span>
                    </button>

                    <button
                      v-if="f.estado !== 'Anulado'"
                      class="w-9 h-9 rounded-full flex items-center justify-center transition-all hover:scale-105 active:scale-95"
                      style="background-color: var(--color-error-container)"
                      title="Anular factura"
                      @click="openAnularModal(f)"
                    >
                      <span class="material-symbols-outlined" style="font-size: 18px; color: var(--color-error)">block</span>
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
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
            style="background-color: var(--color-surface-container-lowest); box-shadow: 0 24px 64px rgba(0, 40, 142, 0.18);">

            <div class="flex items-center justify-between px-8 pt-8 pb-6"
              style="border-bottom: 1px solid rgba(196, 197, 213, 0.2)">
              <h3 class="text-xl font-extrabold" style="color: var(--color-error)">Anular Factura</h3>
              <button class="p-1 rounded-full transition-colors" style="color: var(--color-outline)"
                @click="showAnularModal = false">
                <span class="material-symbols-outlined" style="font-size: 22px">close</span>
              </button>
            </div>

            <div class="px-8 py-6 space-y-4">
              <div class="p-4 rounded-xl" style="background-color: var(--color-error-container)">
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
                  class="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all resize-none"
                  :style="inputStyle(!!anularError)"
                  maxlength="500"
                />
                <p v-if="anularError" class="mt-1 text-xs font-medium" style="color: var(--color-error)">
                  {{ anularError }}
                </p>
              </div>
            </div>

            <div class="px-8 py-6 flex justify-end gap-3"
              style="border-top: 1px solid rgba(196, 197, 213, 0.2)">
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
</style>
