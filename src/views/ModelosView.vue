<script setup lang="ts">
import { ref, computed, onMounted, reactive } from "vue"
import AppSidebar from "@/components/AppSidebar.vue"
import AppHeader from "@/components/AppHeader.vue"
import BaseButton from "@/components/BaseButton.vue"
import BaseModal from "@/components/BaseModal.vue"
import BaseTable from "@/components/BaseTable.vue"
import FilterChips from "@/components/FilterChips.vue"
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

const marcaOptions = computed(() =>
  marcas.value.filter(m => m.isActive).map(m => ({ value: String(m.id), label: m.nombre }))
)

const marcaSelectOptions = computed(() =>
  marcas.value.filter(m => m.isActive).map(m => ({ value: m.id, label: m.nombre }))
)

// ── Paginación ─────────────────────────────────────────────────────────────────

const PAGE_SIZE = 15
const page = ref(1)

const modelosPaginados = computed(() => {
  const start = (page.value - 1) * PAGE_SIZE
  return modelosFiltrados.value.slice(start, start + PAGE_SIZE)
})

const totalPages = computed(() => Math.max(1, Math.ceil(modelosFiltrados.value.length / PAGE_SIZE)))

const estadoOptions = [
  { value: "activo",   label: "Activos",   dot: "#166534" },
  { value: "inactivo", label: "Inactivos", dot: "var(--color-outline)" },
]

const modelosFiltrados = computed(() => {
  page.value = 1
  let result = modelos.value

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
          { type: "item" as const, label: "Desactivar", icon: "delete", action: () => openDeactivate(m), danger: true },
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
            <h1 class="text-4xl font-extrabold tracking-tight mb-2" style="color: var(--color-on-surface)">Modelos</h1>
            <p class="font-medium" style="color: var(--color-on-surface-variant)">
              {{ modelos.filter(m => m.isActive).length }} modelo{{ modelos.filter(m => m.isActive).length !== 1 ? "s" : "" }} activo{{ modelos.filter(m => m.isActive).length !== 1 ? "s" : "" }}
            </p>
          </div>
          <BaseButton v-if="canManage" variant="primary" size="lg" @click="openCreate">
            <span class="material-symbols-outlined" style="font-size: 20px">add</span>
            Nuevo Modelo
          </BaseButton>
        </div>

        <!-- Filtros -->
        <div class="flex items-center gap-3 mb-6 flex-wrap">
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

        <!-- Error -->
        <div v-if="loadError" class="flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium mb-6"
          style="background-color: var(--color-error-container); color: var(--color-on-error-container)">
          <span class="material-symbols-outlined" style="font-size: 18px">error</span>
          {{ loadError }}
        </div>

        <!-- Tabla -->
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
              class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold"
              :style="item.isActive
                ? 'background-color: #dcfce7; color: #166534'
                : 'background-color: var(--color-surface-container-high); color: var(--color-outline)'"
            >{{ item.isActive ? "Activo" : "Inactivo" }}</span>
          </template>

          <template #acciones="{ item }">
            <div class="flex justify-end">
              <RowContextMenu :items="menuItems(item)" />
            </div>
          </template>
        </BaseTable>

        <!-- Paginación -->
        <div class="mt-4 flex items-center justify-between">
          <p class="text-sm" style="color: var(--color-on-surface-variant)">
            Mostrando {{ modelosPaginados.length }} de {{ modelosFiltrados.length }} modelos
          </p>
          <div v-if="totalPages > 1" class="flex gap-2">
            <BaseButton variant="secondary" size="sm" :disabled="page === 1" @click="page--">Anterior</BaseButton>
            <BaseButton variant="secondary" size="sm" :disabled="page === totalPages" @click="page++">Siguiente</BaseButton>
          </div>
        </div>

      </div>
    </main>

    <!-- ── MODAL CREAR ───────────────────────────────────────────────────────── -->
    <BaseModal :show="showCreateModal" title="Nuevo Modelo" size="lg" @close="showCreateModal = false">
      <div v-if="createError" class="flex items-center gap-2 rounded-xl px-3 py-2.5 mb-4 text-sm font-medium"
        style="background-color: var(--color-error-container); color: var(--color-on-error-container)">
        <span class="material-symbols-outlined flex-shrink-0" style="font-size: 16px">error</span>
        {{ createError }}
      </div>
      <div class="space-y-4">
        <div>
          <label class="block text-xs font-bold uppercase tracking-wider mb-1.5" style="color: var(--color-outline)">Marca *</label>
          <SearchableSelect
            :model-value="createForm.marcaId || null"
            :options="marcaSelectOptions"
            placeholder="Seleccioná una marca"
            @update:model-value="createForm.marcaId = ($event as number) || 0"
          />
        </div>
        <div>
          <label class="block text-xs font-bold uppercase tracking-wider mb-1.5" style="color: var(--color-outline)">Nombre *</label>
          <input v-model="createForm.nombre" type="text" class="w-full px-4 py-3 rounded-xl text-sm outline-none"
            style="border: 1px solid var(--color-outline-variant); color: var(--color-on-surface); background-color: var(--color-surface-container-low)" />
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
      <div v-if="editError" class="flex items-center gap-2 rounded-xl px-3 py-2.5 mb-4 text-sm font-medium"
        style="background-color: var(--color-error-container); color: var(--color-on-error-container)">
        <span class="material-symbols-outlined flex-shrink-0" style="font-size: 16px">error</span>
        {{ editError }}
      </div>
      <div class="space-y-4">
        <div>
          <label class="block text-xs font-bold uppercase tracking-wider mb-1.5" style="color: var(--color-outline)">Marca *</label>
          <SearchableSelect
            :model-value="editForm.marcaId || null"
            :options="marcaSelectOptions"
            placeholder="Seleccioná una marca"
            @update:model-value="editForm.marcaId = ($event as number) || 0"
          />
        </div>
        <div>
          <label class="block text-xs font-bold uppercase tracking-wider mb-1.5" style="color: var(--color-outline)">Nombre *</label>
          <input v-model="editForm.nombre" type="text" class="w-full px-4 py-3 rounded-xl text-sm outline-none"
            style="border: 1px solid var(--color-outline-variant); color: var(--color-on-surface); background-color: var(--color-surface-container-low)" />
        </div>
        <div class="flex items-center gap-3 p-4 rounded-xl" style="background-color: var(--color-surface-container-low)">
          <input v-model="editForm.isActive" type="checkbox" id="editModeloIsActive" class="w-4 h-4 rounded" />
          <label for="editModeloIsActive" class="text-sm font-medium cursor-pointer" style="color: var(--color-on-surface)">
            Modelo activo
          </label>
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
      <div v-if="deactivateError" class="flex items-center gap-2 rounded-xl px-3 py-2.5 mb-4 text-sm font-medium"
        style="background-color: var(--color-error-container); color: var(--color-on-error-container)">
        <span class="material-symbols-outlined flex-shrink-0" style="font-size: 16px">error</span>
        {{ deactivateError }}
      </div>
      <p class="text-sm" style="color: var(--color-on-surface-variant)">
        ¿Desactivar el modelo
        <span class="font-semibold" style="color: var(--color-on-surface)">{{ deactivatingModelo?.nombre }}</span>
        de <span class="font-semibold" style="color: var(--color-on-surface)">{{ deactivatingModelo?.marcaNombre }}</span>?
      </p>
      <template #footer>
        <BaseButton variant="secondary" size="default" @click="showDeactivateModal = false">Cancelar</BaseButton>
        <BaseButton variant="danger" size="default" :disabled="isDeactivating" @click="confirmDeactivate">
          {{ isDeactivating ? "Desactivando…" : "Desactivar" }}
        </BaseButton>
      </template>
    </BaseModal>
  </div>
</template>
