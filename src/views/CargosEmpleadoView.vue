<script setup lang="ts">
import { ref, reactive, computed, onMounted } from "vue"
import AppSidebar from "@/components/AppSidebar.vue"
import AppHeader from "@/components/AppHeader.vue"
import BaseButton from "@/components/BaseButton.vue"
import BaseModal from "@/components/BaseModal.vue"
import BaseTable from "@/components/BaseTable.vue"
import RowContextMenu, { type ContextMenuItem } from "@/components/RowContextMenu.vue"
import FilterChips from "@/components/FilterChips.vue"
import SearchInput from "@/components/SearchInput.vue"
import { useAuthStore } from "@/stores/auth"
import {
  type CargoEmpleado,
  getCargos,
  crearCargo,
  actualizarCargo,
} from "@/services/empleadosService"

const auth = useAuthStore()
const canManage = auth.hasPermission("gestionar_empleados")

// ── Estado ──────────────────────────────────────────────────────────────────────

const cargos = ref<CargoEmpleado[]>([])
const isLoading = ref(false)
const loadError = ref("")
const activeFilters = ref<string[]>([])
const searchQuery = ref("")

const statusOptions = [
  { value: "activo",   label: "Activo",   dot: "var(--color-success)" },
  { value: "inactivo", label: "Inactivo", dot: "var(--color-outline)" },
]

const filteredCargos = computed(() => {
  let list = cargos.value
  const showActivo   = activeFilters.value.includes("activo")
  const showInactivo = activeFilters.value.includes("inactivo")
  if (showActivo && !showInactivo)      list = list.filter(c => c.activo)
  else if (showInactivo && !showActivo) list = list.filter(c => !c.activo)
  const q = searchQuery.value.trim().toLowerCase()
  if (q) list = list.filter(c => c.nombre.toLowerCase().includes(q))
  return list
})

const columns = [
  { key: "nombre", label: "Nombre" },
  { key: "descripcion", label: "Descripción" },
  { key: "estado", label: "Estado" },
  { key: "acciones", label: "", align: "right" as const },
]

async function load() {
  isLoading.value = true
  loadError.value = ""
  try {
    cargos.value = await getCargos()
  } catch (err: unknown) {
    loadError.value = err instanceof Error ? err.message : "Error al cargar cargos."
  } finally {
    isLoading.value = false
  }
}

onMounted(load)

// ── Menú contextual ─────────────────────────────────────────────────────────────

function menuItems(c: CargoEmpleado): ContextMenuItem[] {
  return [
    { type: "item", label: "Editar", icon: "edit", action: () => openEdit(c), hidden: !canManage },
    ...(canManage ? [{ type: "separator" as const }] : []),
    {
      type: "item",
      label: c.activo ? "Desactivar" : "Activar",
      icon: c.activo ? "toggle_off" : "toggle_on",
      action: () => toggleActivo(c),
      danger: c.activo,
      hidden: !canManage,
    },
  ]
}

async function toggleActivo(c: CargoEmpleado) {
  try {
    const updated = await actualizarCargo(c.id, {
      nombre: c.nombre,
      descripcion: c.descripcion,
      activo: !c.activo,
    })
    const idx = cargos.value.findIndex((x) => x.id === c.id)
    if (idx !== -1) cargos.value[idx] = updated
  } catch (err: unknown) {
    loadError.value = err instanceof Error ? err.message : "Error al actualizar cargo."
  }
}

// ── Modal Crear ─────────────────────────────────────────────────────────────────

const showCreate = ref(false)
const isSavingCreate = ref(false)
const createError = ref("")
const createForm = reactive({ nombre: "", descripcion: "" })

function openCreate() {
  Object.assign(createForm, { nombre: "", descripcion: "" })
  createError.value = ""
  showCreate.value = true
}

async function submitCreate() {
  if (!createForm.nombre.trim()) {
    createError.value = "El nombre es obligatorio."
    return
  }
  isSavingCreate.value = true
  createError.value = ""
  try {
    const nuevo = await crearCargo({
      nombre: createForm.nombre.trim(),
      descripcion: createForm.descripcion.trim() || undefined,
    })
    cargos.value = [...cargos.value, nuevo]
    showCreate.value = false
  } catch (err: unknown) {
    createError.value = err instanceof Error ? err.message : "Error al crear cargo."
  } finally {
    isSavingCreate.value = false
  }
}

// ── Modal Editar ─────────────────────────────────────────────────────────────────

const showEdit = ref(false)
const isSavingEdit = ref(false)
const editError = ref("")
const editingId = ref(0)
const editForm = reactive({ nombre: "", descripcion: "", activo: true })

function openEdit(c: CargoEmpleado) {
  editingId.value = c.id
  Object.assign(editForm, { nombre: c.nombre, descripcion: c.descripcion ?? "", activo: c.activo })
  editError.value = ""
  showEdit.value = true
}

function inputStyle(hasError = false) {
  const base = 'border-radius: 12px; '
  return hasError
    ? base + 'border: 1.5px solid var(--color-error); color: var(--color-on-surface); background-color: color-mix(in srgb, var(--color-error) 8%, var(--color-surface));'
    : base + 'border: 1px solid var(--color-outline-variant); color: var(--color-on-surface); background-color: var(--color-surface);'
}

async function submitEdit() {
  if (!editForm.nombre.trim()) {
    editError.value = "El nombre es obligatorio."
    return
  }
  isSavingEdit.value = true
  editError.value = ""
  try {
    const updated = await actualizarCargo(editingId.value, {
      nombre: editForm.nombre.trim(),
      descripcion: editForm.descripcion.trim() || undefined,
      activo: editForm.activo,
    })
    const idx = cargos.value.findIndex((x) => x.id === editingId.value)
    if (idx !== -1) cargos.value[idx] = updated
    showEdit.value = false
  } catch (err: unknown) {
    editError.value = err instanceof Error ? err.message : "Error al guardar cargo."
  } finally {
    isSavingEdit.value = false
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
            <h1 class="text-4xl font-extrabold tracking-tight mb-2">Cargos de Empleados</h1>
            <p class="font-medium" style="color: var(--color-on-surface-variant)">
              {{ cargos.filter((c) => c.activo).length }} cargo{{ cargos.filter((c) => c.activo).length !== 1 ? "s" : "" }} activo{{ cargos.filter((c) => c.activo).length !== 1 ? "s" : "" }}
            </p>
          </div>
          <BaseButton v-if="canManage" variant="primary" size="lg" @click="openCreate">
            <span class="material-symbols-outlined" style="width: 20px; height: 20px; font-size: 20px">add</span>
            Nuevo Cargo
          </BaseButton>
        </div>

        <!-- Filters + Search -->
        <div class="flex items-center justify-between gap-4 mb-8 flex-wrap">
          <FilterChips v-model="activeFilters" :options="statusOptions" placeholder="Estado" />
          <SearchInput v-model="searchQuery" placeholder="Buscar cargo..." />
        </div>

        <!-- Error -->
        <div v-if="loadError"
          class="flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium mb-6"
          style="background-color: var(--color-error-container); color: var(--color-on-error-container)">
          <span class="material-symbols-outlined" style="font-size: 18px">error</span>
          {{ loadError }}
        </div>

        <!-- Tabla -->
        <BaseTable :columns="columns" :items="filteredCargos" :loading="isLoading" empty-text="No hay cargos para mostrar.">
          <template #nombre="{ item }">
            <p class="text-sm font-semibold" style="color: var(--color-on-surface)">{{ item.nombre }}</p>
          </template>

          <template #descripcion="{ item }">
            <span class="text-sm" style="color: var(--color-on-surface-variant)">{{ item.descripcion ?? "—" }}</span>
          </template>

          <template #estado="{ item }">
            <span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold"
              :style="item.activo
                ? 'background-color: var(--color-success-container); color: var(--color-on-success-container)'
                : 'background-color: var(--color-surface-container-high); color: var(--color-outline)'">
              {{ item.activo ? "Activo" : "Inactivo" }}
            </span>
          </template>

          <template #acciones="{ item }">
            <div class="flex items-center justify-end">
              <RowContextMenu :items="menuItems(item)" />
            </div>
          </template>
        </BaseTable>

      </div>
    </main>

    <!-- ── MODAL CREAR ──────────────────────────────────────────────────────────── -->
    <BaseModal :show="showCreate" title="Nuevo Cargo" size="sm" @close="showCreate = false">
      <div v-if="createError"
        class="flex items-center gap-2 rounded-2xl px-4 py-3 mb-4 text-sm font-medium"
        style="background-color: var(--color-error-container); color: var(--color-on-error-container)">
        <span class="material-symbols-outlined" style="font-size: 18px">error</span>
        {{ createError }}
      </div>
      <div class="space-y-4">
        <div>
          <label class="block text-xs font-bold uppercase tracking-wider mb-1.5" style="color: var(--color-outline)">Nombre *</label>
          <input v-model="createForm.nombre" type="text" class="w-full px-4 h-12 text-sm outline-none appearance-none shadow-none"
            :style="inputStyle(false)" />
        </div>
        <div>
          <label class="block text-xs font-bold uppercase tracking-wider mb-1.5" style="color: var(--color-outline)">Descripción</label>
          <input v-model="createForm.descripcion" type="text" placeholder="Opcional" class="w-full px-4 h-12 text-sm outline-none appearance-none shadow-none"
            :style="inputStyle(false)" />
        </div>
      </div>
      <template #footer>
        <div class="flex justify-between w-full">
          <BaseButton variant="secondary" @click="showCreate = false">Cancelar</BaseButton>
          <BaseButton variant="primary" :disabled="isSavingCreate" @click="submitCreate">
            <span v-if="isSavingCreate" class="material-symbols-outlined animate-spin">progress_activity</span>
            {{ isSavingCreate ? "Creando..." : "Crear Cargo" }}
          </BaseButton>
        </div>
      </template>
    </BaseModal>

    <!-- ── MODAL EDITAR ──────────────────────────────────────────────────────────── -->
    <BaseModal :show="showEdit" title="Editar Cargo" size="sm" @close="showEdit = false">
      <div v-if="editError"
        class="flex items-center gap-2 rounded-2xl px-4 py-3 mb-4 text-sm font-medium"
        style="background-color: var(--color-error-container); color: var(--color-on-error-container)">
        <span class="material-symbols-outlined" style="font-size: 18px">error</span>
        {{ editError }}
      </div>
      <div class="space-y-4">
        <div>
          <label class="block text-xs font-bold uppercase tracking-wider mb-1.5" style="color: var(--color-outline)">Nombre *</label>
          <input v-model="editForm.nombre" type="text" class="w-full px-4 h-12 text-sm outline-none appearance-none shadow-none"
            :style="inputStyle(false)" />
        </div>
        <div>
          <label class="block text-xs font-bold uppercase tracking-wider mb-1.5" style="color: var(--color-outline)">Descripción</label>
          <input v-model="editForm.descripcion" type="text" placeholder="Opcional" class="w-full px-4 h-12 text-sm outline-none appearance-none shadow-none"
            :style="inputStyle(false)" />
        </div>
        <div class="flex items-center justify-between p-3 rounded-2xl"
          style="background-color: var(--color-surface-container-low)">
          <div>
            <p class="text-sm font-semibold" style="color: var(--color-on-surface)">Estado</p>
            <p class="text-xs" style="color: var(--color-outline)">
              {{ editForm.activo ? "El cargo está activo" : "El cargo está inactivo" }}
            </p>
          </div>
          <button type="button" @click="editForm.activo = !editForm.activo" class="flex-shrink-0"
            :title="editForm.activo ? 'Desactivar' : 'Activar'">
            <span class="material-symbols-outlined" style="font-size: 32px; transition: color 0.15s"
              :style="editForm.activo ? 'color: var(--color-on-success-container)' : 'color: var(--color-outline)'">
              {{ editForm.activo ? "toggle_on" : "toggle_off" }}
            </span>
          </button>
        </div>
      </div>
      <template #footer>
        <div class="flex justify-between w-full">
          <BaseButton variant="secondary" @click="showEdit = false">Cancelar</BaseButton>
          <BaseButton variant="primary" :disabled="isSavingEdit" @click="submitEdit">
            <span v-if="isSavingEdit" class="material-symbols-outlined animate-spin">progress_activity</span>
            {{ isSavingEdit ? "Guardando..." : "Guardar Cambios" }}
          </BaseButton>
        </div>
      </template>
    </BaseModal>
  </div>
</template>
