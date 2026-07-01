<script setup lang="ts">
import { inputStyle } from "@/composables/useFieldStyles"
import { ref, reactive, onMounted } from "vue"
import AppSidebar from "@/components/AppSidebar.vue"
import AppHeader from "@/components/AppHeader.vue"
import BaseButton from "@/components/BaseButton.vue"
import BaseModal from "@/components/BaseModal.vue"
import BaseTable from "@/components/BaseTable.vue"
import RowContextMenu, { type ContextMenuItem } from "@/components/RowContextMenu.vue"
import { useAuthStore } from "@/stores/auth"
import {
  type CategoriaGasto,
  getCategorias,
  crearCategoria,
  actualizarCategoria,
} from "@/services/egresosService"

const auth = useAuthStore()
const canManage = auth.hasPermission("gestionar_egresos")

// ── Estado ─────────────────────────────────────────────────────────────────────

const categorias = ref<CategoriaGasto[]>([])
const isLoading = ref(false)
const loadError = ref("")

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
    categorias.value = await getCategorias()
  } catch (err: unknown) {
    loadError.value = err instanceof Error ? err.message : "Error al cargar categorías."
  } finally {
    isLoading.value = false
  }
}

onMounted(load)

// ── Menú contextual ────────────────────────────────────────────────────────────

function menuItems(c: CategoriaGasto): ContextMenuItem[] {
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

async function toggleActivo(c: CategoriaGasto) {
  try {
    const updated = await actualizarCategoria(c.id, {
      nombre: c.nombre,
      descripcion: c.descripcion,
      activo: !c.activo,
    })
    const idx = categorias.value.findIndex(x => x.id === c.id)
    if (idx !== -1) categorias.value[idx] = updated
  } catch (err: unknown) {
    loadError.value = err instanceof Error ? err.message : "Error al actualizar categoría."
  }
}

// ── Modal Crear ────────────────────────────────────────────────────────────────

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
  if (!createForm.nombre.trim()) { createError.value = "El nombre es obligatorio."; return }
  isSavingCreate.value = true
  createError.value = ""
  try {
    const nueva = await crearCategoria({
      nombre: createForm.nombre.trim(),
      descripcion: createForm.descripcion.trim() || undefined,
    })
    categorias.value = [...categorias.value, nueva]
    showCreate.value = false
  } catch (err: unknown) {
    createError.value = err instanceof Error ? err.message : "Error al crear categoría."
  } finally {
    isSavingCreate.value = false
  }
}

// ── Modal Editar ───────────────────────────────────────────────────────────────

const showEdit = ref(false)
const isSavingEdit = ref(false)
const editError = ref("")
const editingId = ref(0)
const editForm = reactive({ nombre: "", descripcion: "", activo: true })

function openEdit(c: CategoriaGasto) {
  editingId.value = c.id
  Object.assign(editForm, { nombre: c.nombre, descripcion: c.descripcion ?? "", activo: c.activo })
  editError.value = ""
  showEdit.value = true
}

async function submitEdit() {
  if (!editForm.nombre.trim()) { editError.value = "El nombre es obligatorio."; return }
  isSavingEdit.value = true
  editError.value = ""
  try {
    const updated = await actualizarCategoria(editingId.value, {
      nombre: editForm.nombre.trim(),
      descripcion: editForm.descripcion.trim() || undefined,
      activo: editForm.activo,
    })
    const idx = categorias.value.findIndex(x => x.id === editingId.value)
    if (idx !== -1) categorias.value[idx] = updated
    showEdit.value = false
  } catch (err: unknown) {
    editError.value = err instanceof Error ? err.message : "Error al guardar categoría."
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
            <h1 class="text-4xl font-extrabold tracking-tight mb-2">Categorías de Gasto</h1>
            <p class="font-medium" style="color: var(--color-on-surface-variant)">
              {{ categorias.filter(c => c.activo).length }} categoría{{ categorias.filter(c => c.activo).length !== 1 ? "s" : "" }} activa{{ categorias.filter(c => c.activo).length !== 1 ? "s" : "" }}
            </p>
          </div>
          <BaseButton v-if="canManage" variant="primary" size="lg" @click="openCreate">
            <span class="material-symbols-outlined" style="width:20px;height:20px;font-size:20px">add</span>
            Nueva Categoría
          </BaseButton>
        </div>

        <!-- Error -->
        <div v-if="loadError" class="flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium mb-6"
          style="background-color: var(--color-error-container); color: var(--color-on-error-container)">
          <span class="material-symbols-outlined" style="font-size: 18px">error</span>
          {{ loadError }}
        </div>

        <!-- Tabla -->
        <BaseTable :columns="columns" :items="categorias" :loading="isLoading"
          empty-text="No hay categorías registradas.">

          <template #nombre="{ item }">
            <p class="text-sm font-semibold" style="color: var(--color-on-surface)">{{ item.nombre }}</p>
          </template>

          <template #descripcion="{ item }">
            <span class="text-sm" style="color: var(--color-on-surface-variant)">{{ item.descripcion ?? "—" }}</span>
          </template>

          <template #estado="{ item }">
            <span
              class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold"
              :style="item.activo
                ? 'background-color: var(--color-success-container); color: var(--color-on-success-container)'
                : 'background-color: var(--color-surface-container-high); color: var(--color-outline)'"
            >{{ item.activo ? "Activa" : "Inactiva" }}</span>
          </template>

          <template #acciones="{ item }">
            <div class="flex items-center justify-end">
              <RowContextMenu :items="menuItems(item)" />
            </div>
          </template>
        </BaseTable>

      </div>
    </main>

    <!-- ── MODAL CREAR ──────────────────────────────────────────────────────── -->
    <BaseModal :show="showCreate" title="Nueva Categoría" size="sm" @close="showCreate = false">
      <div v-if="createError" class="flex items-center gap-2 rounded-xl px-3 py-2.5 mb-4 text-sm font-medium"
        style="background-color: var(--color-error-container); color: var(--color-on-error-container)">
        <span class="material-symbols-outlined flex-shrink-0" style="font-size: 16px">error</span>
        {{ createError }}
      </div>
      <div class="space-y-4">
        <div>
          <label class="block text-xs font-bold uppercase tracking-wider mb-1.5" style="color: var(--color-outline)">Nombre *</label>
          <input v-model="createForm.nombre" type="text" class="w-full px-4 h-12 rounded-md text-sm outline-none appearance-none shadow-none transition-all" :style="inputStyle()" />
        </div>
        <div>
          <label class="block text-xs font-bold uppercase tracking-wider mb-1.5" style="color: var(--color-outline)">Descripción</label>
          <input v-model="createForm.descripcion" type="text" placeholder="Opcional" class="w-full px-4 h-12 rounded-md text-sm outline-none appearance-none shadow-none transition-all" :style="inputStyle()" />
        </div>
      </div>
      <template #footer>
        <BaseButton variant="secondary" class="flex-1" @click="showCreate = false">Cancelar</BaseButton>
        <BaseButton variant="primary" class="flex-1" :disabled="isSavingCreate" @click="submitCreate">
          <svg v-if="isSavingCreate" class="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          {{ isSavingCreate ? "Creando..." : "Crear Categoría" }}
        </BaseButton>
      </template>
    </BaseModal>

    <!-- ── MODAL EDITAR ─────────────────────────────────────────────────────── -->
    <BaseModal :show="showEdit" title="Editar Categoría" size="sm" @close="showEdit = false">
      <div v-if="editError" class="flex items-center gap-2 rounded-xl px-3 py-2.5 mb-4 text-sm font-medium"
        style="background-color: var(--color-error-container); color: var(--color-on-error-container)">
        <span class="material-symbols-outlined flex-shrink-0" style="font-size: 16px">error</span>
        {{ editError }}
      </div>
      <div class="space-y-4">
        <div>
          <label class="block text-xs font-bold uppercase tracking-wider mb-1.5" style="color: var(--color-outline)">Nombre *</label>
          <input v-model="editForm.nombre" type="text" class="w-full px-4 h-12 rounded-md text-sm outline-none appearance-none shadow-none transition-all" :style="inputStyle()" />
        </div>
        <div>
          <label class="block text-xs font-bold uppercase tracking-wider mb-1.5" style="color: var(--color-outline)">Descripción</label>
          <input v-model="editForm.descripcion" type="text" placeholder="Opcional" class="w-full px-4 h-12 rounded-md text-sm outline-none appearance-none shadow-none transition-all" :style="inputStyle()" />
        </div>
        <div class="flex items-center justify-between p-3 rounded-xl" style="background-color: var(--color-surface-container-low)">
          <div>
            <p class="text-sm font-semibold" style="color: var(--color-on-surface)">Estado</p>
            <p class="text-xs" style="color: var(--color-outline)">{{ editForm.activo ? "La categoría está activa" : "La categoría está inactiva" }}</p>
          </div>
          <button
            type="button"
            @click="editForm.activo = !editForm.activo"
            class="flex-shrink-0"
            :title="editForm.activo ? 'Desactivar' : 'Activar'"
          >
            <span
              class="material-symbols-outlined"
              style="font-size: 32px; transition: color 0.15s"
              :style="editForm.activo ? 'color: var(--color-on-success-container)' : 'color: var(--color-outline)'"
            >{{ editForm.activo ? "toggle_on" : "toggle_off" }}</span>
          </button>
        </div>
      </div>
      <template #footer>
        <BaseButton variant="secondary" class="flex-1" @click="showEdit = false">Cancelar</BaseButton>
        <BaseButton variant="primary" class="flex-1" :disabled="isSavingEdit" @click="submitEdit">
          <svg v-if="isSavingEdit" class="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          {{ isSavingEdit ? "Guardando..." : "Guardar Cambios" }}
        </BaseButton>
      </template>
    </BaseModal>
  </div>
</template>
