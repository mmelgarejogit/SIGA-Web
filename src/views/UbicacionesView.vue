<script setup lang="ts">
import { ref, computed, onMounted, reactive } from "vue"
import AppSidebar from "@/components/AppSidebar.vue"
import AppHeader from "@/components/AppHeader.vue"
import BaseButton from "@/components/BaseButton.vue"
import BaseModal from "@/components/BaseModal.vue"
import BaseTable from "@/components/BaseTable.vue"
import FilterChips from "@/components/FilterChips.vue"
import SearchInput from "@/components/SearchInput.vue"
import SearchableSelect from "@/components/SearchableSelect.vue"
import RowContextMenu, { type ContextMenuItem } from "@/components/RowContextMenu.vue"
import { useAuthStore } from "@/stores/auth"
import {
  type Departamento,
  type Ciudad,
  getDepartamentos,
  createDepartamento,
  updateDepartamento,
  getCiudades,
  createCiudad,
  updateCiudad,
} from "@/services/ubicacionService"

const auth = useAuthStore()
const canManage = auth.hasPermission("gestionar_configuracion")

type Tab = "departamentos" | "ciudades"
const activeTab = ref<Tab>("departamentos")

// ── Estado compartido ────────────────────────────────────────────────────────────

const departamentos = ref<Departamento[]>([])
const ciudades = ref<Ciudad[]>([])
const isLoading = ref(false)
const loadError = ref("")

const estadoFilter = ref<string[]>([])
const searchQuery = ref("")
const departamentoFilter = ref<string[]>([])

const estadoOptions = [
  { value: "activo",   label: "Activos",   dot: "var(--color-success)" },
  { value: "inactivo", label: "Inactivos", dot: "var(--color-outline)" },
]

const departamentoChipOptions = computed(() =>
  departamentos.value.filter(d => d.isActive).map(d => ({ value: String(d.id), label: d.nombre })),
)

const departamentoSelectOptions = computed(() =>
  departamentos.value.filter(d => d.isActive).map(d => ({ value: d.id, label: d.nombre })),
)

function inputStyle(hasError: boolean) {
  const base = "border-radius: 12px; "
  return hasError
    ? base + "border: 1.5px solid var(--color-error); color: var(--color-on-surface); background-color: color-mix(in srgb, var(--color-error) 8%, var(--color-surface));"
    : base + "border: 1px solid var(--color-outline-variant); color: var(--color-on-surface); background-color: var(--color-surface);"
}

function statusStyle(isActive: boolean) {
  return isActive
    ? { bg: "var(--color-success-container)", dot: "var(--color-success)", text: "var(--color-on-success-container)" }
    : { bg: "var(--color-surface-container-highest)", dot: "var(--color-outline)", text: "var(--color-on-surface-variant)" }
}

// ── Carga ─────────────────────────────────────────────────────────────────────────

async function load() {
  isLoading.value = true
  loadError.value = ""
  try {
    const [deps, cities] = await Promise.all([getDepartamentos(), getCiudades()])
    departamentos.value = deps
    ciudades.value = cities
  } catch (err: unknown) {
    loadError.value = err instanceof Error ? err.message : "Error al cargar ubicaciones."
  } finally {
    isLoading.value = false
  }
}

onMounted(load)

function switchTab(tab: Tab) {
  activeTab.value = tab
  searchQuery.value = ""
  estadoFilter.value = []
  departamentoFilter.value = []
  currentPage.value = 1
}

// ── Filtrado + paginación ──────────────────────────────────────────────────────────

const PAGE_SIZE = 10
const currentPage = ref(1)

function matchEstado(isActive: boolean) {
  if (estadoFilter.value.length === 0) return true
  const a = estadoFilter.value.includes("activo")
  const i = estadoFilter.value.includes("inactivo")
  if (a && !i) return isActive
  if (i && !a) return !isActive
  return true
}

const departamentosFiltrados = computed(() => {
  currentPage.value = 1
  const q = searchQuery.value.toLowerCase().trim()
  return departamentos.value.filter(d =>
    matchEstado(d.isActive) && (!q || d.nombre.toLowerCase().includes(q)),
  )
})

const ciudadesFiltradas = computed(() => {
  currentPage.value = 1
  const q = searchQuery.value.toLowerCase().trim()
  const depIds = departamentoFilter.value.map(Number)
  return ciudades.value.filter(c =>
    matchEstado(c.isActive)
    && (!q || c.nombre.toLowerCase().includes(q))
    && (depIds.length === 0 || depIds.includes(c.departamentoId)),
  )
})

const filtered = computed(() =>
  activeTab.value === "departamentos" ? departamentosFiltrados.value : ciudadesFiltradas.value,
)

const totalCount = computed(() => filtered.value.length)
const totalPages = computed(() => Math.max(1, Math.ceil(totalCount.value / PAGE_SIZE)))
const rangeStart = computed(() => totalCount.value === 0 ? 0 : (currentPage.value - 1) * PAGE_SIZE + 1)
const rangeEnd = computed(() => Math.min(currentPage.value * PAGE_SIZE, totalCount.value))

const departamentosPaginados = computed(() => {
  const start = (currentPage.value - 1) * PAGE_SIZE
  return departamentosFiltrados.value.slice(start, start + PAGE_SIZE)
})
const ciudadesPaginadas = computed(() => {
  const start = (currentPage.value - 1) * PAGE_SIZE
  return ciudadesFiltradas.value.slice(start, start + PAGE_SIZE)
})

const visiblePages = computed(() => {
  const total = totalPages.value
  const cur = currentPage.value
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const pages: (number | "...")[] = [1]
  if (cur > 3) pages.push("...")
  for (let p = Math.max(2, cur - 1); p <= Math.min(total - 1, cur + 1); p++) pages.push(p)
  if (cur < total - 2) pages.push("...")
  pages.push(total)
  return pages
})

const depColumns = [
  { key: "nombre",   label: "Departamento" },
  { key: "ciudades", label: "Ciudades" },
  { key: "estado",   label: "Estado" },
  { key: "acciones", label: "", align: "right" as const },
]
const ciudadColumns = [
  { key: "nombre",       label: "Ciudad" },
  { key: "departamento", label: "Departamento" },
  { key: "estado",       label: "Estado" },
  { key: "acciones",     label: "", align: "right" as const },
]

// ── Context menus ──────────────────────────────────────────────────────────────────

function depMenuItems(d: Departamento): ContextMenuItem[] {
  return [
    ...(canManage ? [{ type: "item" as const, label: "Editar", icon: "edit", action: () => openEditDep(d) }] : []),
    ...(canManage && d.isActive
      ? [{ type: "separator" as const }, { type: "item" as const, label: "Desactivar", icon: "block", action: () => openToggleDep(d, false), danger: true }]
      : []),
    ...(canManage && !d.isActive
      ? [{ type: "separator" as const }, { type: "item" as const, label: "Activar", icon: "check_circle", action: () => openToggleDep(d, true) }]
      : []),
  ]
}

function ciudadMenuItems(c: Ciudad): ContextMenuItem[] {
  return [
    ...(canManage ? [{ type: "item" as const, label: "Editar", icon: "edit", action: () => openEditCiudad(c) }] : []),
    ...(canManage && c.isActive
      ? [{ type: "separator" as const }, { type: "item" as const, label: "Desactivar", icon: "block", action: () => openToggleCiudad(c, false), danger: true }]
      : []),
    ...(canManage && !c.isActive
      ? [{ type: "separator" as const }, { type: "item" as const, label: "Activar", icon: "check_circle", action: () => openToggleCiudad(c, true) }]
      : []),
  ]
}

// ── Modal Departamento (crear / editar) ─────────────────────────────────────────────

const showDepModal = ref(false)
const isDepSaving = ref(false)
const depError = ref("")
const editingDep = ref<Departamento | null>(null)
const depForm = reactive({ nombre: "", isActive: true })

function openCreateDep() {
  editingDep.value = null
  Object.assign(depForm, { nombre: "", isActive: true })
  depError.value = ""
  showDepModal.value = true
}

function openEditDep(d: Departamento) {
  editingDep.value = d
  Object.assign(depForm, { nombre: d.nombre, isActive: d.isActive })
  depError.value = ""
  showDepModal.value = true
}

async function submitDep() {
  depError.value = ""
  if (!depForm.nombre.trim()) { depError.value = "El nombre es obligatorio."; return }
  isDepSaving.value = true
  try {
    if (editingDep.value) {
      await updateDepartamento(editingDep.value.id, { nombre: depForm.nombre.trim(), isActive: depForm.isActive })
    } else {
      await createDepartamento({ nombre: depForm.nombre.trim() })
    }
    showDepModal.value = false
    await load()
  } catch (err: unknown) {
    depError.value = err instanceof Error ? err.message : "Error al guardar departamento."
  } finally {
    isDepSaving.value = false
  }
}

// ── Modal toggle Departamento ───────────────────────────────────────────────────────

const showToggleDepModal = ref(false)
const isTogglingDep = ref(false)
const toggleDepError = ref("")
const togglingDep = ref<Departamento | null>(null)
const togglingDepTo = ref(true)

function openToggleDep(d: Departamento, to: boolean) {
  togglingDep.value = d
  togglingDepTo.value = to
  toggleDepError.value = ""
  showToggleDepModal.value = true
}

async function confirmToggleDep() {
  if (!togglingDep.value) return
  isTogglingDep.value = true
  toggleDepError.value = ""
  try {
    await updateDepartamento(togglingDep.value.id, { nombre: togglingDep.value.nombre, isActive: togglingDepTo.value })
    showToggleDepModal.value = false
    await load()
  } catch (err: unknown) {
    toggleDepError.value = err instanceof Error ? err.message : "Error al cambiar el estado."
  } finally {
    isTogglingDep.value = false
  }
}

// ── Modal Ciudad (crear / editar) ───────────────────────────────────────────────────

const showCiudadModal = ref(false)
const isCiudadSaving = ref(false)
const ciudadError = ref("")
const editingCiudad = ref<Ciudad | null>(null)
const ciudadForm = reactive({ nombre: "", departamentoId: 0, isActive: true })

function openCreateCiudad() {
  editingCiudad.value = null
  const primero = departamentos.value.find(d => d.isActive)?.id ?? 0
  Object.assign(ciudadForm, { nombre: "", departamentoId: primero, isActive: true })
  ciudadError.value = ""
  showCiudadModal.value = true
}

function openEditCiudad(c: Ciudad) {
  editingCiudad.value = c
  Object.assign(ciudadForm, { nombre: c.nombre, departamentoId: c.departamentoId, isActive: c.isActive })
  ciudadError.value = ""
  showCiudadModal.value = true
}

async function submitCiudad() {
  ciudadError.value = ""
  if (!ciudadForm.nombre.trim()) { ciudadError.value = "El nombre es obligatorio."; return }
  if (!ciudadForm.departamentoId) { ciudadError.value = "El departamento es obligatorio."; return }
  isCiudadSaving.value = true
  try {
    if (editingCiudad.value) {
      await updateCiudad(editingCiudad.value.id, {
        nombre: ciudadForm.nombre.trim(), departamentoId: ciudadForm.departamentoId, isActive: ciudadForm.isActive,
      })
    } else {
      await createCiudad({ nombre: ciudadForm.nombre.trim(), departamentoId: ciudadForm.departamentoId })
    }
    showCiudadModal.value = false
    await load()
  } catch (err: unknown) {
    ciudadError.value = err instanceof Error ? err.message : "Error al guardar ciudad."
  } finally {
    isCiudadSaving.value = false
  }
}

// ── Modal toggle Ciudad ─────────────────────────────────────────────────────────────

const showToggleCiudadModal = ref(false)
const isTogglingCiudad = ref(false)
const toggleCiudadError = ref("")
const togglingCiudad = ref<Ciudad | null>(null)
const togglingCiudadTo = ref(true)

function openToggleCiudad(c: Ciudad, to: boolean) {
  togglingCiudad.value = c
  togglingCiudadTo.value = to
  toggleCiudadError.value = ""
  showToggleCiudadModal.value = true
}

async function confirmToggleCiudad() {
  if (!togglingCiudad.value) return
  isTogglingCiudad.value = true
  toggleCiudadError.value = ""
  try {
    await updateCiudad(togglingCiudad.value.id, {
      nombre: togglingCiudad.value.nombre,
      departamentoId: togglingCiudad.value.departamentoId,
      isActive: togglingCiudadTo.value,
    })
    showToggleCiudadModal.value = false
    await load()
  } catch (err: unknown) {
    toggleCiudadError.value = err instanceof Error ? err.message : "Error al cambiar el estado."
  } finally {
    isTogglingCiudad.value = false
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
            <h1 class="text-4xl font-extrabold tracking-tight mb-2">Ubicaciones</h1>
            <p class="font-medium" style="color: var(--color-on-surface-variant)">
              Departamentos y ciudades de Paraguay.
            </p>
          </div>
          <BaseButton v-if="canManage" variant="primary" size="lg"
            @click="activeTab === 'departamentos' ? openCreateDep() : openCreateCiudad()">
            <span class="material-symbols-outlined" style="width:20px;height:20px;font-size:20px">add</span>
            {{ activeTab === 'departamentos' ? 'Nuevo Departamento' : 'Nueva Ciudad' }}
          </BaseButton>
        </div>

        <!-- Tabs -->
        <div class="flex gap-1 mb-6 p-1 rounded-2xl w-fit" style="background-color: var(--color-surface-container-low)">
          <button
            v-for="tab in [
              { key: 'departamentos', label: 'Departamentos', icon: 'map' },
              { key: 'ciudades', label: 'Ciudades', icon: 'location_city' },
            ]"
            :key="tab.key"
            @click="switchTab(tab.key as Tab)"
            class="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all"
            :style="activeTab === tab.key
              ? 'background-color: var(--color-surface-container-highest); color: var(--color-primary); box-shadow: 0 1px 4px rgba(0,0,0,0.08)'
              : 'color: var(--color-on-surface-variant)'"
          >
            <span class="material-symbols-outlined" style="font-size: 16px">{{ tab.icon }}</span>
            {{ tab.label }}
          </button>
        </div>

        <!-- Filtros -->
        <div class="flex items-center justify-between gap-4 mb-8 flex-wrap">
          <div class="flex items-center gap-3 flex-wrap">
            <FilterChips
              v-if="activeTab === 'ciudades'"
              :model-value="departamentoFilter"
              :options="departamentoChipOptions"
              placeholder="Departamento"
              @update:model-value="departamentoFilter = $event"
            />
            <FilterChips
              :model-value="estadoFilter"
              :options="estadoOptions"
              placeholder="Estado"
              @update:model-value="estadoFilter = $event"
            />
          </div>
          <SearchInput v-model="searchQuery"
            :placeholder="activeTab === 'departamentos' ? 'Buscar departamento...' : 'Buscar ciudad...'" />
        </div>

        <!-- Error -->
        <div v-if="loadError" class="flex items-center gap-2.5 rounded-2xl px-4 py-3 text-sm font-medium mb-6"
          style="background-color: var(--color-error-container); color: var(--color-on-error-container)">
          <span class="material-symbols-outlined" style="font-size: 18px">error</span>
          {{ loadError }}
        </div>

        <!-- Tabla -->
        <div class="rounded-2xl overflow-hidden" style="background-color: var(--color-surface-container-lowest); box-shadow: var(--shadow-sm); outline: 1px solid var(--color-hairline);">

          <!-- DEPARTAMENTOS -->
          <BaseTable v-if="activeTab === 'departamentos'"
            :columns="depColumns" :items="departamentosPaginados" :loading="isLoading"
            empty-text="No hay departamentos registrados.">
            <template #nombre="{ item }">
              <div class="flex items-center gap-3">
                <div class="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                  style="background-color: var(--color-primary-container)">
                  <span class="material-symbols-outlined" style="font-size: 18px; color: white">map</span>
                </div>
                <span class="text-sm font-semibold" style="color: var(--color-on-surface)">{{ item.nombre }}</span>
              </div>
            </template>
            <template #ciudades="{ item }">
              <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold"
                style="background-color: var(--color-surface-container-high); color: var(--color-on-surface-variant)">
                <span class="material-symbols-outlined" style="font-size: 14px">location_city</span>
                {{ item.totalCiudades }}
              </span>
            </template>
            <template #estado="{ item }">
              <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider"
                :style="`background-color: ${statusStyle(item.isActive).bg}; color: ${statusStyle(item.isActive).text};`">
                <span class="w-1.5 h-1.5 rounded-full" :style="`background-color: ${statusStyle(item.isActive).dot};`"></span>
                {{ item.isActive ? "Activo" : "Inactivo" }}
              </span>
            </template>
            <template #acciones="{ item }">
              <div class="flex justify-end"><RowContextMenu :items="depMenuItems(item)" /></div>
            </template>
          </BaseTable>

          <!-- CIUDADES -->
          <BaseTable v-else
            :columns="ciudadColumns" :items="ciudadesPaginadas" :loading="isLoading"
            empty-text="No hay ciudades registradas.">
            <template #nombre="{ item }">
              <div class="flex items-center gap-3">
                <div class="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                  style="background-color: var(--color-surface-container-low)">
                  <span class="material-symbols-outlined" style="font-size: 18px; color: var(--color-primary)">location_city</span>
                </div>
                <span class="text-sm font-semibold" style="color: var(--color-on-surface)">{{ item.nombre }}</span>
              </div>
            </template>
            <template #departamento="{ item }">
              <span class="text-sm" style="color: var(--color-on-surface-variant)">{{ item.departamentoNombre }}</span>
            </template>
            <template #estado="{ item }">
              <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider"
                :style="`background-color: ${statusStyle(item.isActive).bg}; color: ${statusStyle(item.isActive).text};`">
                <span class="w-1.5 h-1.5 rounded-full" :style="`background-color: ${statusStyle(item.isActive).dot};`"></span>
                {{ item.isActive ? "Activo" : "Inactivo" }}
              </span>
            </template>
            <template #acciones="{ item }">
              <div class="flex justify-end"><RowContextMenu :items="ciudadMenuItems(item)" /></div>
            </template>
          </BaseTable>

          <!-- Footer: conteo + paginador -->
          <div v-if="filtered.length > 0"
            class="px-6 py-4 flex items-center justify-between flex-wrap gap-4"
            style="border-top: 1px solid var(--color-hairline-soft); background-color: var(--color-surface-container-lowest);">
            <span class="text-sm" style="color: var(--color-on-surface-variant)">
              Mostrando
              <strong style="color: var(--color-on-surface)">{{ rangeStart }}–{{ rangeEnd }}</strong>
              de <strong style="color: var(--color-on-surface)">{{ totalCount }}</strong>
              {{ activeTab === 'departamentos' ? 'departamentos' : 'ciudades' }}
            </span>
            <div v-if="totalPages > 1" class="flex items-center gap-1">
              <button @click="currentPage--" :disabled="currentPage === 1"
                class="w-9 h-9 rounded-full flex items-center justify-center transition-all disabled:opacity-30 hover:bg-surface-container-high"
                style="color: var(--color-on-surface-variant)">
                <span class="material-symbols-outlined" style="font-size: 18px">chevron_left</span></button>
              <template v-for="p in visiblePages" :key="p">
                <span v-if="p === '...'" class="w-9 h-9 flex items-center justify-center text-sm" style="color: var(--color-outline)">…</span>
                <button v-else @click="currentPage = (p as number)"
                  class="w-9 h-9 rounded-full text-sm font-semibold transition-all"
                  :class="currentPage === p ? 'bg-primary text-on-primary' : 'text-on-surface-variant hover:bg-surface-container-high'">{{ p }}</button>
              </template>
              <button @click="currentPage++" :disabled="currentPage === totalPages"
                class="w-9 h-9 rounded-full flex items-center justify-center transition-all disabled:opacity-30 hover:bg-surface-container-high"
                style="color: var(--color-on-surface-variant)">
                <span class="material-symbols-outlined" style="font-size: 18px">chevron_right</span></button>
            </div>
          </div>
        </div>

      </div>
    </main>

    <!-- ── MODAL DEPARTAMENTO ─────────────────────────────────────────────────── -->
    <BaseModal :show="showDepModal" :title="editingDep ? 'Editar Departamento' : 'Nuevo Departamento'" size="lg" @close="showDepModal = false">
      <div v-if="depError" class="flex items-center gap-2.5 rounded-2xl px-4 py-3 mb-4 text-sm font-medium"
        style="background-color: var(--color-error-container); color: var(--color-on-error-container)">
        <span class="material-symbols-outlined flex-shrink-0" style="font-size: 18px">error</span>
        {{ depError }}
      </div>
      <div class="space-y-5">
        <div class="flex flex-col gap-1.5">
          <label class="text-xs font-bold uppercase tracking-wider" style="color: var(--color-outline)">Nombre *</label>
          <input v-model="depForm.nombre" type="text" class="px-4 h-12 text-sm outline-none appearance-none shadow-none transition-all"
            :style="inputStyle(false)" />
        </div>
        <div v-if="editingDep" class="flex items-center justify-between px-4 py-3" style="border-radius: 12px; background-color: var(--color-surface-container-low)">
          <span class="text-sm font-semibold" style="color: var(--color-on-surface-variant)">Estado</span>
          <span class="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold uppercase tracking-wider"
            :style="`border-radius: 6px; background-color: ${statusStyle(depForm.isActive).bg}; color: ${statusStyle(depForm.isActive).text};`">
            <span class="w-1.5 h-1.5" :style="`border-radius: 2px; background-color: ${statusStyle(depForm.isActive).dot};`"></span>
            {{ depForm.isActive ? "Activo" : "Inactivo" }}
          </span>
        </div>
      </div>
      <template #footer>
        <BaseButton variant="secondary" size="default" @click="showDepModal = false">Cancelar</BaseButton>
        <BaseButton variant="primary" size="default" :disabled="isDepSaving" @click="submitDep">
          {{ isDepSaving ? "Guardando…" : (editingDep ? "Guardar Cambios" : "Crear Departamento") }}
        </BaseButton>
      </template>
    </BaseModal>

    <!-- ── MODAL TOGGLE DEPARTAMENTO ──────────────────────────────────────────── -->
    <BaseModal :show="showToggleDepModal" :title="togglingDepTo ? 'Activar Departamento' : 'Desactivar Departamento'" size="sm" @close="showToggleDepModal = false">
      <div v-if="toggleDepError" class="flex items-center gap-2.5 rounded-2xl px-4 py-3 mb-4 text-sm font-medium"
        style="background-color: var(--color-error-container); color: var(--color-on-error-container)">
        <span class="material-symbols-outlined flex-shrink-0" style="font-size: 18px">error</span>
        {{ toggleDepError }}
      </div>
      <div class="text-center">
        <div class="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-5"
          :style="togglingDepTo ? 'background-color: var(--color-success-container)' : 'background-color: var(--color-error-container)'">
          <span class="material-symbols-outlined" :style="togglingDepTo ? 'color: var(--color-on-success-container); font-size: 28px' : 'color: var(--color-error); font-size: 28px'">
            {{ togglingDepTo ? 'check_circle' : 'block' }}
          </span>
        </div>
        <p class="text-sm" style="color: var(--color-on-surface-variant)">
          ¿{{ togglingDepTo ? 'Activar' : 'Desactivar' }} el departamento
          <strong style="color: var(--color-on-surface)">{{ togglingDep?.nombre }}</strong>?
        </p>
      </div>
      <template #footer>
        <BaseButton variant="secondary" size="default" class="flex-1" @click="showToggleDepModal = false">Cancelar</BaseButton>
        <BaseButton :variant="togglingDepTo ? 'primary' : 'danger'" size="default" class="flex-1" :disabled="isTogglingDep" @click="confirmToggleDep">
          {{ isTogglingDep ? "Procesando…" : (togglingDepTo ? "Activar" : "Desactivar") }}
        </BaseButton>
      </template>
    </BaseModal>

    <!-- ── MODAL CIUDAD ───────────────────────────────────────────────────────── -->
    <BaseModal :show="showCiudadModal" :title="editingCiudad ? 'Editar Ciudad' : 'Nueva Ciudad'" size="lg" @close="showCiudadModal = false">
      <div v-if="ciudadError" class="flex items-center gap-2.5 rounded-2xl px-4 py-3 mb-4 text-sm font-medium"
        style="background-color: var(--color-error-container); color: var(--color-on-error-container)">
        <span class="material-symbols-outlined flex-shrink-0" style="font-size: 18px">error</span>
        {{ ciudadError }}
      </div>
      <div class="space-y-5">
        <div class="flex flex-col gap-1.5">
          <label class="text-xs font-bold uppercase tracking-wider" style="color: var(--color-outline)">Departamento *</label>
          <SearchableSelect
            :model-value="ciudadForm.departamentoId || null"
            :options="departamentoSelectOptions"
            placeholder="Seleccioná un departamento"
            @update:model-value="ciudadForm.departamentoId = ($event as number) || 0"
          />
        </div>
        <div class="flex flex-col gap-1.5">
          <label class="text-xs font-bold uppercase tracking-wider" style="color: var(--color-outline)">Nombre *</label>
          <input v-model="ciudadForm.nombre" type="text" class="px-4 h-12 text-sm outline-none appearance-none shadow-none transition-all"
            :style="inputStyle(false)" />
        </div>
        <div v-if="editingCiudad" class="flex items-center justify-between px-4 py-3" style="border-radius: 12px; background-color: var(--color-surface-container-low)">
          <span class="text-sm font-semibold" style="color: var(--color-on-surface-variant)">Estado</span>
          <span class="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold uppercase tracking-wider"
            :style="`border-radius: 6px; background-color: ${statusStyle(ciudadForm.isActive).bg}; color: ${statusStyle(ciudadForm.isActive).text};`">
            <span class="w-1.5 h-1.5" :style="`border-radius: 2px; background-color: ${statusStyle(ciudadForm.isActive).dot};`"></span>
            {{ ciudadForm.isActive ? "Activo" : "Inactivo" }}
          </span>
        </div>
      </div>
      <template #footer>
        <BaseButton variant="secondary" size="default" @click="showCiudadModal = false">Cancelar</BaseButton>
        <BaseButton variant="primary" size="default" :disabled="isCiudadSaving" @click="submitCiudad">
          {{ isCiudadSaving ? "Guardando…" : (editingCiudad ? "Guardar Cambios" : "Crear Ciudad") }}
        </BaseButton>
      </template>
    </BaseModal>

    <!-- ── MODAL TOGGLE CIUDAD ────────────────────────────────────────────────── -->
    <BaseModal :show="showToggleCiudadModal" :title="togglingCiudadTo ? 'Activar Ciudad' : 'Desactivar Ciudad'" size="sm" @close="showToggleCiudadModal = false">
      <div v-if="toggleCiudadError" class="flex items-center gap-2.5 rounded-2xl px-4 py-3 mb-4 text-sm font-medium"
        style="background-color: var(--color-error-container); color: var(--color-on-error-container)">
        <span class="material-symbols-outlined flex-shrink-0" style="font-size: 18px">error</span>
        {{ toggleCiudadError }}
      </div>
      <div class="text-center">
        <div class="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-5"
          :style="togglingCiudadTo ? 'background-color: var(--color-success-container)' : 'background-color: var(--color-error-container)'">
          <span class="material-symbols-outlined" :style="togglingCiudadTo ? 'color: var(--color-on-success-container); font-size: 28px' : 'color: var(--color-error); font-size: 28px'">
            {{ togglingCiudadTo ? 'check_circle' : 'block' }}
          </span>
        </div>
        <p class="text-sm" style="color: var(--color-on-surface-variant)">
          ¿{{ togglingCiudadTo ? 'Activar' : 'Desactivar' }} la ciudad
          <strong style="color: var(--color-on-surface)">{{ togglingCiudad?.nombre }}</strong>?
        </p>
      </div>
      <template #footer>
        <BaseButton variant="secondary" size="default" class="flex-1" @click="showToggleCiudadModal = false">Cancelar</BaseButton>
        <BaseButton :variant="togglingCiudadTo ? 'primary' : 'danger'" size="default" class="flex-1" :disabled="isTogglingCiudad" @click="confirmToggleCiudad">
          {{ isTogglingCiudad ? "Procesando…" : (togglingCiudadTo ? "Activar" : "Desactivar") }}
        </BaseButton>
      </template>
    </BaseModal>
  </div>
</template>
