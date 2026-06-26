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
  type Marca,
  type Modelo,
  type CreateModeloRequest,
  type UpdateModeloRequest,
  getMarcas,
  getModelos,
  createModelo,
  updateModelo,
  deactivateModelo,
} from "@/services/inventarioService"

const auth = useAuthStore()
const canManage = auth.hasPermission("gestionar_inventario")

// ── Estado ─────────────────────────────────────────────────────────────────────

const modelos = ref<Modelo[]>([])
const marcas = ref<Marca[]>([])
const isLoading = ref(false)
const loadError = ref("")
const marcaFilter = ref<string[]>([])
const estadoFilter = ref<string[]>([])
const searchQuery = ref("")

const marcaOptions = computed(() =>
  marcas.value.filter(m => m.isActive).map(m => ({ value: String(m.id), label: m.nombre }))
)

const marcaSelectOptions = computed(() =>
  marcas.value.filter(m => m.isActive).map(m => ({ value: m.id, label: m.nombre }))
)

// ── Paginación ─────────────────────────────────────────────────────────────────

const PAGE_SIZE = 10
const currentPage = ref(1)

const modelosPaginados = computed(() => {
  const start = (currentPage.value - 1) * PAGE_SIZE
  return modelosFiltrados.value.slice(start, start + PAGE_SIZE)
})

const totalCount = computed(() => modelosFiltrados.value.length)
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

const estadoOptions = [
  { value: "activo",   label: "Activos",   dot: "var(--color-success)" },
  { value: "inactivo", label: "Inactivos", dot: "var(--color-outline)" },
]

const modelosFiltrados = computed(() => {
  currentPage.value = 1
  let result = modelos.value

  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase()
    result = result.filter((m) =>
      m.nombre.toLowerCase().includes(q) || m.marcaNombre?.toLowerCase().includes(q)
    )
  }

  if (marcaFilter.value.length > 0) {
    const ids = marcaFilter.value.map(Number)
    result = result.filter(m => ids.includes(m.marcaId))
  }

  if (estadoFilter.value.length > 0) {
    const soloActivos   = estadoFilter.value.includes("activo")
    const soloInactivos = estadoFilter.value.includes("inactivo")
    if (soloActivos && !soloInactivos) result = result.filter(m => m.isActive)
    if (soloInactivos && !soloActivos) result = result.filter(m => !m.isActive)
  }

  return result
})

const columns = [
  { key: "nombre",   label: "Modelo" },
  { key: "marca",    label: "Marca" },
  { key: "estado",   label: "Estado" },
  { key: "acciones", label: "", align: "right" as const },
]

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

async function load() {
  isLoading.value = true
  loadError.value = ""
  try {
    await Promise.all([
      getModelos().then(d => (modelos.value = d)),
      getMarcas().then(d => (marcas.value = d)),
    ])
  } catch (err: unknown) {
    loadError.value = err instanceof Error ? err.message : "Error al cargar modelos."
  } finally {
    isLoading.value = false
  }
}

onMounted(load)

// ── Context menu ──────────────────────────────────────────────────────────────

function menuItems(m: Modelo): ContextMenuItem[] {
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
const createForm = reactive<CreateModeloRequest>({ nombre: "", marcaId: 0 })

function openCreate() {
  const primeraActiva = marcas.value.find(m => m.isActive)?.id ?? 0
  Object.assign(createForm, { nombre: "", marcaId: primeraActiva })
  createError.value = ""
  showCreateModal.value = true
}

async function submitCreate() {
  createError.value = ""
  if (!createForm.nombre.trim()) { createError.value = "El nombre es obligatorio."; return }
  if (!createForm.marcaId) { createError.value = "La marca es obligatoria."; return }
  isSaving.value = true
  try {
    await createModelo({ nombre: createForm.nombre.trim(), marcaId: createForm.marcaId })
    showCreateModal.value = false
    await load()
  } catch (err: unknown) {
    createError.value = err instanceof Error ? err.message : "Error al crear modelo."
  } finally {
    isSaving.value = false
  }
}

// ── Modal Editar ───────────────────────────────────────────────────────────────

const showEditModal = ref(false)
const isEditSaving = ref(false)
const editError = ref("")
const editingModelo = ref<Modelo | null>(null)
const editForm = reactive<UpdateModeloRequest>({ nombre: "", marcaId: 0, isActive: true })

function openEdit(m: Modelo) {
  editingModelo.value = m
  Object.assign(editForm, { nombre: m.nombre, marcaId: m.marcaId, isActive: m.isActive })
  editError.value = ""
  showEditModal.value = true
}

async function submitEdit() {
  editError.value = ""
  if (!editForm.nombre.trim()) { editError.value = "El nombre es obligatorio."; return }
  if (!editForm.marcaId) { editError.value = "La marca es obligatoria."; return }
  if (!editingModelo.value) return
  isEditSaving.value = true
  try {
    await updateModelo(editingModelo.value.id, {
      nombre: editForm.nombre.trim(), marcaId: editForm.marcaId, isActive: editForm.isActive,
    })
    showEditModal.value = false
    await load()
  } catch (err: unknown) {
    editError.value = err instanceof Error ? err.message : "Error al actualizar modelo."
  } finally {
    isEditSaving.value = false
  }
}

// ── Modal Desactivar ───────────────────────────────────────────────────────────

const showDeactivateModal = ref(false)
const isDeactivating = ref(false)
const deactivateError = ref("")
const deactivatingModelo = ref<Modelo | null>(null)

function openDeactivate(m: Modelo) {
  deactivatingModelo.value = m
  deactivateError.value = ""
  showDeactivateModal.value = true
}

async function confirmDeactivate() {
  if (!deactivatingModelo.value) return
  isDeactivating.value = true
  deactivateError.value = ""
  try {
    await deactivateModelo(deactivatingModelo.value.id)
    showDeactivateModal.value = false
    await load()
  } catch (err: unknown) {
    deactivateError.value = err instanceof Error ? err.message : "Error al desactivar modelo."
  } finally {
    isDeactivating.value = false
  }
}

// ── Modal Activar ──────────────────────────────────────────────────────────────

const showActivateModal = ref(false)
const isActivating = ref(false)
const activateError = ref("")
const activatingModelo = ref<Modelo | null>(null)

function openActivate(m: Modelo) {
  activatingModelo.value = m
  activateError.value = ""
  showActivateModal.value = true
}

async function confirmActivate() {
  if (!activatingModelo.value) return
  isActivating.value = true
  activateError.value = ""
  try {
    const m = activatingModelo.value
    await updateModelo(m.id, { nombre: m.nombre, marcaId: m.marcaId, isActive: true })
    showActivateModal.value = false
    await load()
  } catch (err: unknown) {
    activateError.value = err instanceof Error ? err.message : "Error al activar modelo."
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
            <h1 class="text-4xl font-extrabold tracking-tight mb-2">Modelos</h1>
            <p class="font-medium" style="color: var(--color-on-surface-variant)">
              {{ modelos.filter(m => m.isActive).length }} modelo{{ modelos.filter(m => m.isActive).length !== 1 ? "s" : "" }} activo{{ modelos.filter(m => m.isActive).length !== 1 ? "s" : "" }}
            </p>
          </div>
          <BaseButton v-if="canManage" variant="primary" size="lg" @click="openCreate">
            <span class="material-symbols-outlined" style="width:20px;height:20px;font-size:20px">add</span>
            Nuevo Modelo
          </BaseButton>
        </div>

        <!-- Filtros -->
        <div class="flex items-center justify-between gap-4 mb-8 flex-wrap">
          <div class="flex items-center gap-3 flex-wrap">
            <FilterChips
              :model-value="marcaFilter"
              :options="marcaOptions"
              placeholder="Marca"
              @update:model-value="marcaFilter = $event"
            />
            <FilterChips
              :model-value="estadoFilter"
              :options="estadoOptions"
              placeholder="Estado"
              @update:model-value="estadoFilter = $event"
            />
          </div>
          <SearchInput v-model="searchQuery" placeholder="Buscar por nombre o marca..." />
        </div>

        <!-- Error -->
        <div v-if="loadError" class="flex items-center gap-2.5 rounded-2xl px-4 py-3 text-sm font-medium mb-6"
          style="background-color: var(--color-error-container); color: var(--color-on-error-container)">
          <span class="material-symbols-outlined" style="font-size: 18px">error</span>
          {{ loadError }}
        </div>

        <!-- Tabla -->
        <div class="rounded-2xl overflow-hidden" style="background-color: var(--color-surface-container-lowest); box-shadow: var(--shadow-sm); outline: 1px solid var(--color-hairline);">
          <BaseTable :columns="columns" :items="modelosPaginados" :loading="isLoading"
            empty-text="No hay modelos registrados.">

            <template #nombre="{ item }">
              <div class="flex items-center gap-3">
                <div class="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                  style="background-color: var(--color-surface-container-low)">
                  <span class="material-symbols-outlined" style="font-size: 18px; color: var(--color-primary)">style</span>
                </div>
                <span class="text-sm font-semibold" style="color: var(--color-on-surface)">{{ item.nombre }}</span>
              </div>
            </template>

            <template #marca="{ item }">
              <span class="text-sm" style="color: var(--color-on-surface-variant)">{{ item.marcaNombre }}</span>
            </template>

            <template #estado="{ item }">
              <span
                class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider"
                :style="`background-color: ${statusStyle(item.isActive).bg}; color: ${statusStyle(item.isActive).text};`"
              >
                <span class="w-1.5 h-1.5 rounded-full" :style="`background-color: ${statusStyle(item.isActive).dot};`"></span>
                {{ item.isActive ? "Activo" : "Inactivo" }}
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
            v-if="modelosPaginados.length > 0"
            class="px-6 py-4 flex items-center justify-between flex-wrap gap-4"
            style="border-top: 1px solid var(--color-hairline-soft); background-color: var(--color-surface-container-lowest);"
          >
            <span class="text-sm" style="color: var(--color-on-surface-variant)">
              Mostrando
              <strong style="color: var(--color-on-surface)">{{ rangeStart }}–{{ rangeEnd }}</strong>
              de
              <strong style="color: var(--color-on-surface)">{{ totalCount }}</strong>
              modelos
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
                  :class="currentPage === p ? 'bg-primary text-on-primary' : 'text-on-surface-variant hover:bg-surface-container-high'"
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
    <BaseModal :show="showCreateModal" title="Nuevo Modelo" size="lg" @close="showCreateModal = false">
      <div v-if="createError" class="flex items-center gap-2.5 rounded-2xl px-4 py-3 mb-4 text-sm font-medium"
        style="background-color: var(--color-error-container); color: var(--color-on-error-container)">
        <span class="material-symbols-outlined flex-shrink-0" style="font-size: 18px">error</span>
        {{ createError }}
      </div>
      <div class="space-y-5">
        <div class="flex flex-col gap-1.5">
          <label class="text-xs font-bold uppercase tracking-wider" style="color: var(--color-outline)">Marca *</label>
          <SearchableSelect
            :model-value="createForm.marcaId || null"
            :options="marcaSelectOptions"
            placeholder="Seleccioná una marca"
            @update:model-value="createForm.marcaId = ($event as number) || 0"
          />
        </div>
        <div class="flex flex-col gap-1.5">
          <label class="text-xs font-bold uppercase tracking-wider" style="color: var(--color-outline)">Nombre *</label>
          <input v-model="createForm.nombre" type="text" class="px-4 h-12 text-sm outline-none appearance-none shadow-none transition-all"
            :style="inputStyle(false)" />
        </div>
      </div>
      <template #footer>
        <BaseButton variant="secondary" size="default" @click="showCreateModal = false">Cancelar</BaseButton>
        <BaseButton variant="primary" size="default" :disabled="isSaving" @click="submitCreate">
          {{ isSaving ? "Creando…" : "Crear Modelo" }}
        </BaseButton>
      </template>
    </BaseModal>

    <!-- ── MODAL EDITAR ──────────────────────────────────────────────────────── -->
    <BaseModal :show="showEditModal" title="Editar Modelo" size="lg" @close="showEditModal = false">
      <div v-if="editError" class="flex items-center gap-2.5 rounded-2xl px-4 py-3 mb-4 text-sm font-medium"
        style="background-color: var(--color-error-container); color: var(--color-on-error-container)">
        <span class="material-symbols-outlined flex-shrink-0" style="font-size: 18px">error</span>
        {{ editError }}
      </div>
      <div class="space-y-5">
        <div class="flex flex-col gap-1.5">
          <label class="text-xs font-bold uppercase tracking-wider" style="color: var(--color-outline)">Marca *</label>
          <SearchableSelect
            :model-value="editForm.marcaId || null"
            :options="marcaSelectOptions"
            placeholder="Seleccioná una marca"
            @update:model-value="editForm.marcaId = ($event as number) || 0"
          />
        </div>
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
            {{ editForm.isActive ? "Activo" : "Inactivo" }}
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
    <BaseModal :show="showDeactivateModal" title="Desactivar Modelo" size="sm" @close="showDeactivateModal = false">
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
          ¿Desactivar el modelo
          <strong style="color: var(--color-on-surface)">{{ deactivatingModelo?.nombre }}</strong>
          de <strong style="color: var(--color-on-surface)">{{ deactivatingModelo?.marcaNombre }}</strong>?
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
    <BaseModal :show="showActivateModal" title="Activar Modelo" size="sm" @close="showActivateModal = false">
      <div v-if="activateError" class="flex items-center gap-2.5 rounded-2xl px-4 py-3 mb-4 text-sm font-medium"
        style="background-color: var(--color-error-container); color: var(--color-on-error-container)">
        <span class="material-symbols-outlined flex-shrink-0" style="font-size: 18px">error</span>
        {{ activateError }}
      </div>
      <div class="text-center">
        <div class="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-5"
             style="background-color: var(--color-success-container)">
          <span class="material-symbols-outlined" style="color: var(--color-on-success-container); font-size: 28px">check_circle</span>
        </div>
        <p class="text-sm" style="color: var(--color-on-surface-variant)">
          ¿Activar el modelo
          <strong style="color: var(--color-on-surface)">{{ activatingModelo?.nombre }}</strong>
          de <strong style="color: var(--color-on-surface)">{{ activatingModelo?.marcaNombre }}</strong>?
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
