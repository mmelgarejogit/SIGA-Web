<script setup lang="ts">
import { ref, computed, onMounted, watch } from "vue"
import AppSidebar from "@/components/AppSidebar.vue"
import AppHeader from "@/components/AppHeader.vue"
import FilterChips from "@/components/FilterChips.vue"
import SearchInput from "@/components/SearchInput.vue"
import PaginationFooter from "@/components/PaginationFooter.vue"
import { inputStyle } from "@/composables/useFieldStyles"
import {
  type RegistroAuditoria,
  type AuditAccionCatalogo,
  type AuditCategoria,
  getRegistrosAuditoria,
  getAccionesAuditoria,
  accionLabel,
  CATEGORIA_LABELS,
} from "@/services/auditoriaService"

// ── Estado ──────────────────────────────────────────────────────────────────────
const registros = ref<RegistroAuditoria[]>([])
const acciones = ref<AuditAccionCatalogo[]>([])
const isLoading = ref(false)
const loadError = ref("")

const totalCount = ref(0)
const totalPages = ref(1)
const currentPage = ref(1)
const pageSize = 20

// ── Filtros ───────────────────────────────────────────────────────────────────
const categoriaFiltro = ref<string[]>([]) // FilterChips (single-value efectivo)
const accionFiltro = ref("")
const fechaDesde = ref("")
const fechaHasta = ref("")
const search = ref("")

const categoriaOptions = [
  { value: "Seguridad", label: "Seguridad", dot: "var(--color-info)" },
  { value: "Admin", label: "Administración", dot: "var(--color-tertiary)" },
  { value: "Operativo", label: "Operativo", dot: "var(--color-warning)" },
]

// Acciones agrupadas por categoría para el <select> con optgroups.
const accionesPorCategoria = computed(() => {
  const groups: Record<string, AuditAccionCatalogo[]> = { Seguridad: [], Admin: [], Operativo: [] }
  for (const a of acciones.value) (groups[a.categoria] ??= []).push(a)
  return groups
})

const rangeStart = computed(() => (totalCount.value === 0 ? 0 : (currentPage.value - 1) * pageSize + 1))
const rangeEnd = computed(() => Math.min(currentPage.value * pageSize, totalCount.value))

async function load() {
  isLoading.value = true
  loadError.value = ""
  try {
    const res = await getRegistrosAuditoria({
      categoria: categoriaFiltro.value[0],
      accion: accionFiltro.value || undefined,
      fechaDesde: fechaDesde.value || undefined,
      fechaHasta: fechaHasta.value || undefined,
      search: search.value.trim() || undefined,
      page: currentPage.value,
      pageSize,
    })
    registros.value = res.items
    totalCount.value = res.totalCount
    totalPages.value = res.totalPages
  } catch (err: unknown) {
    loadError.value = err instanceof Error ? err.message : "Error al cargar la auditoría."
    registros.value = []
  } finally {
    isLoading.value = false
  }
}

onMounted(async () => {
  try {
    acciones.value = await getAccionesAuditoria()
  } catch {
    acciones.value = []
  }
  await load()
})

// FilterChips es multi-select; acá lo usamos como single-value (nos quedamos con el último).
function onCategoriaChange(vals: string[]) {
  categoriaFiltro.value = vals.length ? [vals[vals.length - 1]!] : []
}

// Recargar en página 1 al cambiar cualquier filtro.
let searchTimer: ReturnType<typeof setTimeout> | undefined
watch([categoriaFiltro, accionFiltro, fechaDesde, fechaHasta], () => {
  currentPage.value = 1
  load()
})
watch(search, () => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    currentPage.value = 1
    load()
  }, 300)
})

function onPageChange(p: number) {
  currentPage.value = p
  load()
}

// ── Helpers de presentación ─────────────────────────────────────────────────────
function formatFechaHora(iso: string) {
  return new Date(iso).toLocaleString("es-AR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function categoriaBadge(categoria: AuditCategoria) {
  const map: Record<AuditCategoria, { bg: string; text: string }> = {
    Seguridad: { bg: "var(--color-info-container)", text: "var(--color-on-info-container)" },
    Admin: {
      bg: "color-mix(in srgb, var(--color-tertiary) 12%, var(--color-surface-container-lowest))",
      text: "var(--color-tertiary)",
    },
    Operativo: { bg: "var(--color-warning-container)", text: "var(--color-on-warning-container)" },
  }
  return map[categoria] ?? { bg: "var(--color-surface-container)", text: "var(--color-outline)" }
}

const hayFiltros = computed(
  () =>
    !!categoriaFiltro.value.length ||
    !!accionFiltro.value ||
    !!fechaDesde.value ||
    !!fechaHasta.value ||
    !!search.value.trim(),
)

function limpiarFiltros() {
  categoriaFiltro.value = []
  accionFiltro.value = ""
  fechaDesde.value = ""
  fechaHasta.value = ""
  search.value = ""
}

// Acceso a labels en template.
const catLabels = CATEGORIA_LABELS
</script>

<template>
  <div class="min-h-screen" style="background-color: var(--color-background)">
    <AppSidebar />
    <AppHeader />
    <main style="margin-left: 280px; padding-top: 64px">
      <div class="p-8">
        <!-- Encabezado -->
        <div class="flex items-start justify-between mb-8">
          <div>
            <h1 class="text-4xl font-extrabold tracking-tight mb-2">Auditoría</h1>
            <p class="font-medium" style="color: var(--color-on-surface-variant)">
              Registro de eventos de seguridad, administración y operaciones sensibles.
            </p>
          </div>
        </div>

        <!-- Filtros -->
        <div class="flex items-center justify-between gap-4 mb-8 flex-wrap">
          <div class="flex items-center gap-3 flex-wrap">
            <FilterChips
              :model-value="categoriaFiltro"
              :options="categoriaOptions"
              placeholder="Categoría"
              @update:model-value="onCategoriaChange"
            />

            <select
              v-model="accionFiltro"
              class="h-11 px-3 rounded-md text-sm outline-none appearance-none"
              :style="inputStyle(false)"
            >
              <option value="">Todas las acciones</option>
              <optgroup
                v-for="(items, cat) in accionesPorCategoria"
                :key="cat"
                :label="catLabels[cat as AuditCategoria]"
              >
                <option v-for="a in items" :key="a.accion" :value="a.accion">
                  {{ accionLabel(a.accion) }}
                </option>
              </optgroup>
            </select>

            <input
              type="date"
              v-model="fechaDesde"
              title="Desde"
              class="h-11 px-3 rounded-md text-sm outline-none"
              :style="inputStyle(false)"
            />
            <input
              type="date"
              v-model="fechaHasta"
              title="Hasta"
              class="h-11 px-3 rounded-md text-sm outline-none"
              :style="inputStyle(false)"
            />

            <button
              v-if="hayFiltros"
              @click="limpiarFiltros"
              class="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all"
              style="
                background-color: var(--color-surface);
                border: 1px solid var(--color-outline-variant);
                color: var(--color-on-surface);
              "
            >
              <span class="material-symbols-outlined" style="font-size: 18px">close</span>
              Limpiar
            </button>
          </div>

          <SearchInput
            :model-value="search"
            placeholder="Buscar por usuario o descripción…"
            class="w-72"
            @update:model-value="(v: string) => (search = v)"
          />
        </div>

        <!-- Tabla -->
        <div
          class="rounded-lg overflow-hidden"
          style="
            background-color: var(--color-surface-container-lowest);
            box-shadow: var(--shadow-sm);
            outline: 1px solid var(--color-hairline);
          "
        >
          <div class="overflow-x-auto">
            <table class="w-full text-left" style="min-width: 900px">
              <thead>
                <tr style="background-color: var(--color-surface-container-low)">
                  <th class="px-6 py-4 text-xs font-bold uppercase tracking-widest" style="color: var(--color-outline)">Fecha y hora</th>
                  <th class="px-6 py-4 text-xs font-bold uppercase tracking-widest" style="color: var(--color-outline)">Usuario</th>
                  <th class="px-6 py-4 text-xs font-bold uppercase tracking-widest" style="color: var(--color-outline)">Categoría</th>
                  <th class="px-6 py-4 text-xs font-bold uppercase tracking-widest" style="color: var(--color-outline)">Acción</th>
                  <th class="px-6 py-4 text-xs font-bold uppercase tracking-widest" style="color: var(--color-outline)">Descripción</th>
                  <th class="px-6 py-4 text-xs font-bold uppercase tracking-widest" style="color: var(--color-outline)">Sucursal</th>
                </tr>
              </thead>
              <tbody>
                <!-- Loading -->
                <tr v-if="isLoading">
                  <td colspan="6" class="px-6 py-16 text-center">
                    <svg class="animate-spin w-7 h-7 mx-auto" style="color: var(--color-primary)" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  </td>
                </tr>

                <!-- Error -->
                <tr v-else-if="loadError">
                  <td colspan="6" class="px-6 py-16 text-center">
                    <p class="text-sm font-semibold" style="color: var(--color-error)">{{ loadError }}</p>
                  </td>
                </tr>

                <!-- Vacío -->
                <tr v-else-if="!registros.length">
                  <td colspan="6" class="px-6 py-16 text-center">
                    <span class="material-symbols-outlined block mx-auto mb-3" style="color: var(--color-outline-variant); font-size: 40px">history</span>
                    <p class="text-sm font-semibold" style="color: var(--color-outline)">
                      {{ hayFiltros ? "Sin resultados para los filtros" : "Sin eventos registrados" }}
                    </p>
                    <p class="text-xs mt-1" style="color: var(--color-outline-variant)">
                      Los eventos auditados aparecerán aquí a medida que ocurran.
                    </p>
                  </td>
                </tr>

                <!-- Filas -->
                <tr
                  v-for="r in registros"
                  v-else
                  :key="r.id"
                  class="hover:bg-surface-container-low transition-colors"
                  style="border-top: 1px solid var(--color-hairline-soft)"
                >
                  <td class="px-6 py-4 text-sm whitespace-nowrap" style="color: var(--color-on-surface-variant)">
                    {{ formatFechaHora(r.fechaHora) }}
                  </td>
                  <td class="px-6 py-4 text-sm font-semibold" style="color: var(--color-on-surface)">
                    {{ r.usuarioNombre }}
                  </td>
                  <td class="px-6 py-4">
                    <span
                      class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold"
                      :style="`background-color: ${categoriaBadge(r.categoria).bg}; color: ${categoriaBadge(r.categoria).text}`"
                    >{{ catLabels[r.categoria] }}</span>
                  </td>
                  <td class="px-6 py-4 text-sm font-medium" style="color: var(--color-on-surface)">
                    {{ accionLabel(r.accion) }}
                  </td>
                  <td class="px-6 py-4 text-sm" style="color: var(--color-on-surface-variant)">
                    {{ r.descripcion }}
                  </td>
                  <td class="px-6 py-4 text-sm" style="color: var(--color-outline)">
                    {{ r.sucursalNombre ?? "—" }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Footer paginador (§14) -->
          <PaginationFooter
            v-if="!isLoading && !loadError && totalCount > 0"
            :current-page="currentPage"
            :total-pages="totalPages"
            :range-start="rangeStart"
            :range-end="rangeEnd"
            :total="totalCount"
            noun="registros"
            @update:current-page="onPageChange"
          />
        </div>
      </div>
    </main>
  </div>
</template>
