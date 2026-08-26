<script setup lang="ts">
import { inputStyle } from "@/composables/useFieldStyles"
import DateInput from "@/components/DateInput.vue"
import { ref, computed, onMounted } from "vue"
import { useRouter } from "vue-router"
import AppSidebar from "@/components/AppSidebar.vue"
import AppHeader from "@/components/AppHeader.vue"
import BaseButton from "@/components/BaseButton.vue"
import FilterChips from "@/components/FilterChips.vue"
import SearchableSelect from "@/components/SearchableSelect.vue"
import RowContextMenu, { type ContextMenuItem } from "@/components/RowContextMenu.vue"
import BaseTable from "@/components/BaseTable.vue"
import PaginationFooter from "@/components/PaginationFooter.vue"
import {
  getRecepciones,
  type RecepcionListItem,
  type EstadoPedido,
} from "@/services/comprasService"
import { getProveedores, type Proveedor } from "@/services/inventarioService"

const router = useRouter()

const recepciones = ref<RecepcionListItem[]>([])
const totalCount = ref(0)
const currentPage = ref(1)
const PAGE_SIZE = 10
const isLoading = ref(false)

// ── Paginación (design-system §14) — server-side ─────────────────────────────────
const totalPages = computed(() => Math.max(1, Math.ceil(totalCount.value / PAGE_SIZE)))
const rangeStart = computed(() => (totalCount.value === 0 ? 0 : (currentPage.value - 1) * PAGE_SIZE + 1))
const rangeEnd   = computed(() => Math.min(currentPage.value * PAGE_SIZE, totalCount.value))
function irAPagina(p: number) { currentPage.value = p; load() }

const columns = [
  { key: "id", label: "# Rec." },
  { key: "fecha", label: "Fecha" },
  { key: "proveedor", label: "Proveedor" },
  { key: "factura", label: "Factura" },
  { key: "ocEstado", label: "OC / Estado" },
  { key: "items", label: "Ítems" },
  { key: "usuario", label: "Usuario" },
  { key: "acciones", label: "" },
]

const filtroEstado = ref<string[]>([])
const filtroProveedorId = ref<number | null>(null)
const filtroFechaDesde = ref("")
const filtroFechaHasta = ref("")

const proveedores = ref<Proveedor[]>([])

const proveedorOptions = computed(() =>
  proveedores.value.map(p => ({ value: p.id, label: p.nombre, code: p.ruc })),
)

const estadoOpciones = [
  { value: "Facturada",       label: "Facturada",       dot: "var(--color-tertiary)" },
  { value: "RecibidaParcial", label: "Recibida parcial", dot: "var(--color-on-warning-container)" },
  { value: "RecibidaTotal",   label: "Recibida total",   dot: "var(--color-on-success-container)" },
]

onMounted(async () => {
  await loadProveedores()
  await load()
})

async function loadProveedores() {
  try {
    const r = await getProveedores({ pageSize: 200 })
    proveedores.value = Array.isArray(r) ? r : (r.items ?? [])
  } catch { /* */ }
}

async function load() {
  isLoading.value = true
  try {
    const r = await getRecepciones({
      proveedorId: filtroProveedorId.value ?? undefined,
      estadoOC: filtroEstado.value[0],
      fechaDesde: filtroFechaDesde.value || undefined,
      fechaHasta: filtroFechaHasta.value || undefined,
      page: currentPage.value,
      pageSize: PAGE_SIZE,
    })
    recepciones.value = r.items
    totalCount.value = r.totalCount
  } catch {
    recepciones.value = []
  } finally {
    isLoading.value = false
  }
}

function applyFilters() {
  currentPage.value = 1
  load()
}

function clearFechas() {
  filtroFechaDesde.value = ""
  filtroFechaHasta.value = ""
  applyFilters()
}

function formatFilterDate(dateStr: string) {
  return new Date(dateStr + "T12:00:00").toLocaleDateString("es-PY", {
    day: "2-digit", month: "short",
  })
}

function openNueva() {
  router.push("/compras/recepciones/nueva")
}

function formatDate(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("es-PY", {
    day: "2-digit", month: "short", year: "numeric",
  })
}

function estadoOCStyle(estado: EstadoPedido) {
  switch (estado) {
    case "Facturada":       return { bg: "color-mix(in srgb, var(--color-tertiary) 12%, var(--color-surface-container-lowest))", text: "var(--color-tertiary)" }
    case "RecibidaParcial": return { bg: "var(--color-warning-container)", text: "var(--color-on-warning-container)" }
    case "RecibidaTotal":   return { bg: "var(--color-success-container)", text: "var(--color-on-success-container)" }
    default:                return { bg: "var(--color-surface-container)", text: "var(--color-on-surface-variant)" }
  }
}

function estadoOCLabel(estado: EstadoPedido) {
  if (estado === "RecibidaParcial") return "Recibida parcial"
  if (estado === "RecibidaTotal")   return "Recibida total"
  return estado
}

const hayFiltros = computed(() =>
  filtroEstado.value.length > 0 ||
  filtroProveedorId.value !== null ||
  filtroFechaDesde.value !== "" ||
  filtroFechaHasta.value !== "",
)

function rowMenuItems(r: RecepcionListItem): ContextMenuItem[] {
  return [
    {
      type: "item",
      label: "Ver detalle",
      icon: "inventory",
      action: () => router.push(`/compras/recepciones/${r.id}`),
    },
    { type: "separator" },
    {
      type: "item",
      label: `Ver OC #${r.pedidoProveedorId}`,
      icon: "open_in_new",
      action: () => router.push(`/compras/oc/${r.pedidoProveedorId}?from=recepciones`),
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
            <h1 class="text-4xl font-extrabold tracking-tight mb-2">Recepciones de Mercadería</h1>
            <p class="font-medium" style="color: var(--color-on-surface-variant)">
              {{ totalCount }} recepc{{ totalCount === 1 ? 'ión' : 'iones' }} registrada{{ totalCount === 1 ? '' : 's' }}
            </p>
          </div>
          <BaseButton variant="primary" size="lg" @click="openNueva">
            <span class="material-symbols-outlined" style="font-size: 20px">add</span>
            Nueva Recepción
          </BaseButton>
        </div>

        <!-- Filtros -->
        <div class="flex items-center justify-between gap-4 mb-8 flex-wrap">
          <div class="flex items-center gap-3 flex-wrap">
            <FilterChips
              :model-value="filtroEstado"
              :options="estadoOpciones"
              placeholder="Estado de OC"
              @update:model-value="v => { filtroEstado = v; applyFilters() }"
            />

            <div class="fc-prov-filter">
              <SearchableSelect
                :model-value="filtroProveedorId"
                :options="proveedorOptions"
                null-label="Todos los proveedores"
                @update:model-value="filtroProveedorId = $event as number | null; applyFilters()"
              />
            </div>

            <div class="flex items-center gap-1.5">
              <!-- Desde -->
              <div class="flex items-center gap-1">
                <DateInput v-model="filtroFechaDesde" placeholder="Desde" @update:model-value="applyFilters" />
                <button v-if="filtroFechaDesde" class="fc-date-clear" title="Limpiar" @click="filtroFechaDesde = ''; applyFilters()">×</button>
              </div>

              <span style="color: var(--color-outline); font-size: 13px; font-weight: 500">—</span>

              <!-- Hasta -->
              <div class="flex items-center gap-1">
                <DateInput v-model="filtroFechaHasta" placeholder="Hasta" @update:model-value="applyFilters" />
                <button v-if="filtroFechaHasta" class="fc-date-clear" title="Limpiar" @click="filtroFechaHasta = ''; applyFilters()">×</button>
              </div>
            </div>
          </div>
        </div>

        <!-- Tabla -->
        <div class="rounded-lg overflow-hidden" style="background-color: var(--color-surface-container-lowest); box-shadow: var(--shadow-sm)">
        <BaseTable :columns="columns" :items="recepciones" :loading="isLoading" @row-click="r => router.push(`/compras/recepciones/${r.id}`)">
          <template #empty>
            <div class="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
              style="background-color: var(--color-surface-container-low)">
              <span class="material-symbols-outlined text-4xl" style="color: var(--color-outline)">inventory_2</span>
            </div>
            <p class="font-bold text-lg mb-1" style="color: var(--color-on-surface)">
              {{ hayFiltros ? 'Sin resultados' : 'Sin recepciones registradas' }}
            </p>
            <p class="text-sm" style="color: var(--color-on-surface-variant)">
              {{ hayFiltros
                ? 'No hay recepciones que coincidan con los filtros aplicados.'
                : 'Las recepciones se registran cuando llega mercadería de una factura con OC.' }}
            </p>
          </template>
          <template #id="{ item: r }">
            <span class="font-bold text-sm" style="color: var(--color-primary)">#{{ r.id }}</span>
          </template>
          <template #fecha="{ item: r }">
            {{ formatDate(r.fechaRecepcion) }}
          </template>
          <template #proveedor="{ item: r }">
            <span class="font-medium text-sm" style="color: var(--color-on-surface)">{{ r.proveedorNombre }}</span>
          </template>
          <template #factura="{ item: r }">
            <span class="font-mono text-xs font-semibold" style="color: var(--color-on-surface-variant)">
              {{ r.nroFactura ?? "—" }}
            </span>
          </template>
          <template #ocEstado="{ item: r }">
            <div class="flex items-center gap-2">
              <span class="font-mono text-xs font-semibold" style="color: var(--color-primary)">
                OC #{{ r.pedidoProveedorId }}
              </span>
              <span class="px-2 py-0.5 rounded-full text-xs font-bold"
                :style="`background-color: ${estadoOCStyle(r.estadoOC).bg}; color: ${estadoOCStyle(r.estadoOC).text}`">
                {{ estadoOCLabel(r.estadoOC) }}
              </span>
            </div>
          </template>
          <template #items="{ item: r }">
            {{ r.cantidadItems }} ítem{{ r.cantidadItems === 1 ? '' : 's' }} · {{ r.cantidadTotal }} und.
          </template>
          <template #usuario="{ item: r }">
            {{ r.usuarioNombre }}
          </template>
          <template #acciones="{ item: r }">
            <div class="flex justify-end" @click.stop>
              <RowContextMenu :items="rowMenuItems(r)" />
            </div>
          </template>
        </BaseTable>

          <PaginationFooter
            v-if="!isLoading && totalCount > 0"
            :current-page="currentPage"
            :total-pages="totalPages"
            :range-start="rangeStart"
            :range-end="rangeEnd"
            :total="totalCount"
            noun="recepciones"
            @update:current-page="irAPagina"
          />
        </div>

      </div>
    </main>
  </div>
</template>

<style scoped>
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

.fc-date-wrap {
  position: relative;
}

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
  background: var(--color-primary-fixed);
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
