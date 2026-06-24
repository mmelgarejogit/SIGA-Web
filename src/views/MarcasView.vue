<script setup lang="ts">
import { ref, computed, onMounted, reactive } from "vue"
import AppSidebar from "@/components/AppSidebar.vue"
import AppHeader from "@/components/AppHeader.vue"
import BaseButton from "@/components/BaseButton.vue"
import BaseModal from "@/components/BaseModal.vue"
import BaseTable from "@/components/BaseTable.vue"
import FilterChips from "@/components/FilterChips.vue"
import SearchInput from "@/components/SearchInput.vue"
import RowContextMenu, { type ContextMenuItem } from "@/components/RowContextMenu.vue"
import { useAuthStore } from "@/stores/auth"
import {
  type Marca,
  type CreateMarcaRequest,
  type UpdateMarcaRequest,
  getMarcas,
  createMarca,
  updateMarca,
  deactivateMarca,
} from "@/services/inventarioService"

const auth = useAuthStore()
const canManage = auth.hasPermission("gestionar_inventario")

// ── Estado ─────────────────────────────────────────────────────────────────────

const marcas = ref<Marca[]>([])
const isLoading = ref(false)
const loadError = ref("")
const estadoFilter = ref<string[]>([])
const searchQuery = ref("")

const estadoOptions = [
  { value: "activa",   label: "Activas",   dot: "#16a34a" },
  { value: "inactiva", label: "Inactivas", dot: "var(--color-outline)" },
]

const marcasFiltradas = computed(() => {
  currentPage.value = 1
  let result = marcas.value

  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase()
    result = result.filter((m) => m.nombre.toLowerCase().includes(q))
  }

  if (estadoFilter.value.length > 0) {
    const soloActivas   = estadoFilter.value.includes("activa")
    const soloInactivas = estadoFilter.value.includes("inactiva")
    if (soloActivas && !soloInactivas) result = result.filter((m) => m.isActive)
    if (soloInactivas && !soloActivas) result = result.filter((m) => !m.isActive)
  }

  return result
})

// ── Paginación ─────────────────────────────────────────────────────────────────

const PAGE_SIZE = 10
const currentPage = ref(1)

const marcasPaginadas = computed(() => {
  const start = (currentPage.value - 1) * PAGE_SIZE
  return marcasFiltradas.value.slice(start, start + PAGE_SIZE)
})

const totalCount = computed(() => marcasFiltradas.value.length)
const totalPages = computed(() => Math.max(1, Math.ceil(totalCount.value / PAGE_SIZE)))

const rangeStart = computed(() =>
  totalCount.value === 0 ? 0 : (currentPage.value - 1) * PAGE_SIZE + 1,
)
const rangeEnd = computed(() => Math.min(currentPage.value * PAGE_SIZE, totalCount.value))

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

const columns = [
  { key: "nombre",   label: "Nombre" },
  { key: "modelos",  label: "Modelos" },
  { key: "estado",   label: "Estado" },
  { key: "acciones", label: "", align: "right" as const },
]

function inputStyle(hasError: boolean) {
  const base = "border-radius: 12px; "
  return hasError
    ? base + "border: 1.5px solid var(--color-error); color: var(--color-on-surface); background-color: #FFF8F7;"
    : base + "border: 1px solid var(--color-outline-variant); color: var(--color-on-surface); background-color: var(--color-surface);"
}

function statusStyle(isActive: boolean) {
  return isActive
    ? { bg: "#dcfce7", dot: "#16a34a", text: "#166534" }
    : { bg: "var(--color-surface-container-highest)", dot: "var(--color-outline)", text: "var(--color-on-surface-variant)" }
}

async function load() {
  isLoading.value = true
  loadError.value = ""
  try {
    marcas.value = await getMarcas()
  } catch (err: unknown) {
    loadError.value = err instanceof Error ? err.message : "Error al cargar marcas."
  } finally {
    isLoading.value = false
  }
}

onMounted(load)

// ── Context menu ──────────────────────────────────────────────────────────────

function menuItems(m: Marca): ContextMenuItem[] {
  return [
    ...(canManage
      ? [{ type: "item" as const, label: "Editar", icon: "edit", action: () => openEdit(m) }]
      : []),
    ...(canManage && m.isActive
      ? [
          { type: "separator" as const },
          { type: "item" as const, label: "Desactivar", icon: "block", action: () => openDeactivate(m), danger: true },
        ]
      : []),
    ...(canManage && !m.isActive
      ? [
          { type: "separator" as const },
          { type: "item" as const, label: "Activar", icon: "check_circle", action: () => openActivate(m) },
        ]
      : []),
  ]
}

// ── Modal Crear ────────────────────────────────────────────────────────────────

const showCreateModal = ref(false)
const isSaving = ref(false)
const createError = ref("")
const createForm = reactive<CreateMarcaRequest>({ nombre: "" })

function openCreate() {
  Object.assign(createForm, { nombre: "" })
  createError.value = ""
  showCreateModal.value = true
}

async function submitCreate() {
  createError.value = ""
  if (!createForm.nombre.trim()) { createError.value = "El nombre es obligatorio."; return }
  isSaving.value = true
  try {
    await createMarca({ nombre: createForm.nombre.trim() })
    showCreateModal.value = false
    await load()
  } catch (err: unknown) {
    createError.value = err instanceof Error ? err.message : "Error al crear marca."
  } finally {
    isSaving.value = false
  }
}

// ── Modal Editar ───────────────────────────────────────────────────────────────

const showEditModal = ref(false)
const isEditSaving = ref(false)
const editError = ref("")
const editingMarca = ref<Marca | null>(null)
const editForm = reactive<UpdateMarcaRequest>({ nombre: "", isActive: true })

function openEdit(m: Marca) {
  editingMarca.value = m
  Object.assign(editForm, { nombre: m.nombre, isActive: m.isActive })
  editError.value = ""
  showEditModal.value = true
}

async function submitEdit() {
  editError.value = ""
  if (!editForm.nombre.trim()) { editError.value = "El nombre es obligatorio."; return }
  if (!editingMarca.value) return
  isEditSaving.value = true
  try {
    await updateMarca(editingMarca.value.id, { nombre: editForm.nombre.trim(), isActive: editForm.isActive })
    showEditModal.value = false
    await load()
  } catch (err: unknown) {
    editError.value = err instanceof Error ? err.message : "Error al actualizar marca."
  } finally {
    isEditSaving.value = false
  }
}

// ── Modal Desactivar ───────────────────────────────────────────────────────────

const showDeactivateModal = ref(false)
const isDeactivating = ref(false)
const deactivateError = ref("")
const deactivatingMarca = ref<Marca | null>(null)

function openDeactivate(m: Marca) {
  deactivatingMarca.value = m
  deactivateError.value = ""
  showDeactivateModal.value = true
}

async function confirmDeactivate() {
  if (!deactivatingMarca.value) return
  isDeactivating.value = true
  deactivateError.value = ""
  try {
    await deactivateMarca(deactivatingMarca.value.id)
    showDeactivateModal.value = false
    await load()
  } catch (err: unknown) {
    deactivateError.value = err instanceof Error ? err.message : "Error al desactivar marca."
  } finally {
    isDeactivating.value = false
  }
}

// ── Modal Activar ──────────────────────────────────────────────────────────────

const showActivateModal = ref(false)
const isActivating = ref(false)
const activateError = ref("")
const activatingMarca = ref<Marca | null>(null)

function openActivate(m: Marca) {
  activatingMarca.value = m
  activateError.value = ""
  showActivateModal.value = true
}

async function confirmActivate() {
  if (!activatingMarca.value) return
  isActivating.value = true
  activateError.value = ""
  try {
    const m = activatingMarca.value
    await updateMarca(m.id, { nombre: m.nombre, isActive: true })
    showActivateModal.value = false
    await load()
  } catch (err: unknown) {
    activateError.value = err instanceof Error ? err.message : "Error al activar marca."
  } finally {
    isActivating.value = false
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
            <h1 class="text-4xl font-extrabold tracking-tight mb-2">Marcas</h1>
            <p class="font-medium" style="color: var(--color-on-surface-variant)">
              {{ marcas.filter(m => m.isActive).length }} marca{{ marcas.filter(m => m.isActive).length !== 1 ? "s" : "" }} activa{{ marcas.filter(m => m.isActive).length !== 1 ? "s" : "" }}
            </p>
          </div>
          <BaseButton v-if="canManage" variant="primary" size="lg" @click="openCreate">
            <span class="material-symbols-outlined" style="width:20px;height:20px;font-size:20px">add</span>
            Nueva Marca
          </BaseButton>
        </div>

        <!-- Filtros -->
        <div class="flex items-center justify-between gap-4 mb-8 flex-wrap">
          <FilterChips
            :model-value="estadoFilter"
            :options="estadoOptions"
            placeholder="Estado"
            @update:model-value="estadoFilter = $event"
          />
          <SearchInput v-model="searchQuery" placeholder="Buscar por nombre..." />
        </div>

        <!-- Error -->
        <div v-if="loadError" class="flex items-center gap-2.5 rounded-2xl px-4 py-3 text-sm font-medium mb-6"
          style="background-color: var(--color-error-container); color: var(--color-on-error-container)">
          <span class="material-symbols-outlined" style="font-size: 18px">error</span>
          {{ loadError }}
        </div>

        <!-- Tabla -->
        <div class="rounded-2xl overflow-hidden" style="background-color: var(--color-surface-container-lowest); box-shadow: 0 1px 3px rgba(196, 197, 213, 0.25); outline: 1px solid rgba(196, 197, 213, 0.15);">
          <BaseTable :columns="columns" :items="marcasPaginadas" :loading="isLoading"
            empty-text="No hay marcas registradas.">

            <template #nombre="{ item }">
              <div class="flex items-center gap-3">
                <div class="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                  style="background-color: var(--color-primary-container)">
                  <span class="material-symbols-outlined" style="font-size: 18px; color: white">verified</span>
                </div>
                <span class="text-sm font-semibold" style="color: var(--color-on-surface)">{{ item.nombre }}</span>
              </div>
            </template>

            <template #modelos="{ item }">
              <span
                class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold"
                style="background-color: var(--color-surface-container-high); color: var(--color-on-surface-variant)"
              >
                <span class="material-symbols-outlined" style="font-size: 14px">style</span>
                {{ item.totalModelos }}
              </span>
            </template>

            <template #estado="{ item }">
              <span
                class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider"
                :style="`background-color: ${statusStyle(item.isActive).bg}; color: ${statusStyle(item.isActive).text};`"
              >
                <span class="w-1.5 h-1.5 rounded-full" :style="`background-color: ${statusStyle(item.isActive).dot};`"></span>
                {{ item.isActive ? "Activa" : "Inactiva" }}
              </span>
            </template>

            <template #acciones="{ item }">
              <div class="flex justify-end">
                <RowContextMenu :items="menuItems(item)" />
              </div>
            </template>
          </BaseTable>

          <!-- Footer: conteo + paginador -->
          <div
            v-if="marcasPaginadas.length > 0"
            class="px-6 py-4 flex items-center justify-between flex-wrap gap-4"
            style="border-top: 1px solid rgba(196, 197, 213, 0.12); background-color: var(--color-surface-container-lowest);"
          >
            <span class="text-sm" style="color: var(--color-on-surface-variant)">
              Mostrando
              <strong style="color: var(--color-on-surface)">{{ rangeStart }}–{{ rangeEnd }}</strong>
              de
              <strong style="color: var(--color-on-surface)">{{ totalCount }}</strong>
              marcas
            </span>
            <div v-if="totalPages > 1" class="flex items-center gap-1">
              <button
                @click="currentPage--"
                :disabled="currentPage === 1"
                class="w-9 h-9 rounded-full flex items-center justify-center transition-all disabled:opacity-30 hover:bg-surface-container-high"
                style="color: var(--color-on-surface-variant)"
              ><span class="material-symbols-outlined" style="font-size: 18px">chevron_left</span></button>
              <template v-for="p in visiblePages" :key="p">
                <span v-if="p === '...'" class="w-9 h-9 flex items-center justify-center text-sm" style="color: var(--color-outline)">…</span>
                <button
                  v-else
                  @click="currentPage = (p as number)"
                  class="w-9 h-9 rounded-full text-sm font-semibold transition-all"
                  :class="currentPage === p ? 'bg-primary text-white' : 'text-on-surface-variant hover:bg-surface-container-high'"
                >{{ p }}</button>
              </template>
              <button
                @click="currentPage++"
                :disabled="currentPage === totalPages"
                class="w-9 h-9 rounded-full flex items-center justify-center transition-all disabled:opacity-30 hover:bg-surface-container-high"
                style="color: var(--color-on-surface-variant)"
              ><span class="material-symbols-outlined" style="font-size: 18px">chevron_right</span></button>
            </div>
          </div>
        </div>

      </div>
    </main>

    <!-- ── MODAL CREAR ───────────────────────────────────────────────────────── -->
    <BaseModal :show="showCreateModal" title="Nueva Marca" size="lg" @close="showCreateModal = false">
      <div v-if="createError" class="flex items-center gap-2.5 rounded-2xl px-4 py-3 mb-4 text-sm font-medium"
        style="background-color: var(--color-error-container); color: var(--color-on-error-container)">
        <span class="material-symbols-outlined flex-shrink-0" style="font-size: 18px">error</span>
        {{ createError }}
      </div>
      <div class="flex flex-col gap-1.5">
        <label class="text-xs font-bold uppercase tracking-wider" style="color: var(--color-outline)">Nombre *</label>
        <input v-model="createForm.nombre" type="text" class="px-4 h-12 text-sm outline-none appearance-none shadow-none transition-all"
          :style="inputStyle(false)" />
      </div>
      <template #footer>
        <BaseButton variant="secondary" size="default" @click="showCreateModal = false">Cancelar</BaseButton>
        <BaseButton variant="primary" size="default" :disabled="isSaving" @click="submitCreate">
          {{ isSaving ? "Creando…" : "Crear Marca" }}
        </BaseButton>
      </template>
    </BaseModal>

    <!-- ── MODAL EDITAR ──────────────────────────────────────────────────────── -->
    <BaseModal :show="showEditModal" title="Editar Marca" size="lg" @close="showEditModal = false">
      <div v-if="editError" class="flex items-center gap-2.5 rounded-2xl px-4 py-3 mb-4 text-sm font-medium"
        style="background-color: var(--color-error-container); color: var(--color-on-error-container)">
        <span class="material-symbols-outlined flex-shrink-0" style="font-size: 18px">error</span>
        {{ editError }}
      </div>
      <div class="space-y-5">
        <div class="flex flex-col gap-1.5">
          <label class="text-xs font-bold uppercase tracking-wider" style="color: var(--color-outline)">Nombre *</label>
          <input v-model="editForm.nombre" type="text" class="px-4 h-12 text-sm outline-none appearance-none shadow-none transition-all"
            :style="inputStyle(false)" />
        </div>
        <div class="flex items-center justify-between px-4 py-3"
             style="border-radius: 12px; background-color: var(--color-surface-container-low)">
          <span class="text-sm font-semibold" style="color: var(--color-on-surface-variant)">Estado</span>
          <span
            class="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold uppercase tracking-wider"
            :style="`border-radius: 6px; background-color: ${statusStyle(editForm.isActive).bg}; color: ${statusStyle(editForm.isActive).text};`"
          >
            <span class="w-1.5 h-1.5" :style="`border-radius: 2px; background-color: ${statusStyle(editForm.isActive).dot};`"></span>
            {{ editForm.isActive ? "Activa" : "Inactiva" }}
          </span>
        </div>
      </div>
      <template #footer>
        <BaseButton variant="secondary" size="default" @click="showEditModal = false">Cancelar</BaseButton>
        <BaseButton variant="primary" size="default" :disabled="isEditSaving" @click="submitEdit">
          {{ isEditSaving ? "Guardando…" : "Guardar Cambios" }}
        </BaseButton>
      </template>
    </BaseModal>

    <!-- ── MODAL DESACTIVAR ──────────────────────────────────────────────────── -->
    <BaseModal :show="showDeactivateModal" title="Desactivar Marca" size="sm" @close="showDeactivateModal = false">
      <div v-if="deactivateError" class="flex items-center gap-2.5 rounded-2xl px-4 py-3 mb-4 text-sm font-medium"
        style="background-color: var(--color-error-container); color: var(--color-on-error-container)">
        <span class="material-symbols-outlined flex-shrink-0" style="font-size: 18px">error</span>
        {{ deactivateError }}
      </div>
      <div class="text-center">
        <div class="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-5"
             style="background-color: var(--color-error-container)">
          <span class="material-symbols-outlined" style="color: var(--color-error); font-size: 28px">block</span>
        </div>
        <p class="text-sm" style="color: var(--color-on-surface-variant)">
          ¿Desactivar la marca <strong style="color: var(--color-on-surface)">{{ deactivatingMarca?.nombre }}</strong>?
          Los modelos asociados no se verán afectados.
        </p>
      </div>
      <template #footer>
        <BaseButton variant="secondary" size="default" class="flex-1" @click="showDeactivateModal = false">Cancelar</BaseButton>
        <BaseButton variant="danger" size="default" class="flex-1" :disabled="isDeactivating" @click="confirmDeactivate">
          {{ isDeactivating ? "Desactivando…" : "Desactivar" }}
        </BaseButton>
      </template>
    </BaseModal>

    <!-- ── MODAL ACTIVAR ─────────────────────────────────────────────────────── -->
    <BaseModal :show="showActivateModal" title="Activar Marca" size="sm" @close="showActivateModal = false">
      <div v-if="activateError" class="flex items-center gap-2.5 rounded-2xl px-4 py-3 mb-4 text-sm font-medium"
        style="background-color: var(--color-error-container); color: var(--color-on-error-container)">
        <span class="material-symbols-outlined flex-shrink-0" style="font-size: 18px">error</span>
        {{ activateError }}
      </div>
      <div class="text-center">
        <div class="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-5"
             style="background-color: #dcfce7">
          <span class="material-symbols-outlined" style="color: #166534; font-size: 28px">check_circle</span>
        </div>
        <p class="text-sm" style="color: var(--color-on-surface-variant)">
          ¿Activar la marca <strong style="color: var(--color-on-surface)">{{ activatingMarca?.nombre }}</strong>?
        </p>
      </div>
      <template #footer>
        <BaseButton variant="secondary" size="default" class="flex-1" @click="showActivateModal = false">Cancelar</BaseButton>
        <BaseButton variant="primary" size="default" class="flex-1" :disabled="isActivating" @click="confirmActivate">
          {{ isActivating ? "Activando…" : "Activar" }}
        </BaseButton>
      </template>
    </BaseModal>
  </div>
</template>
