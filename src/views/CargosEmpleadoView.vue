<script setup lang="ts">
import { ref, reactive, onMounted } from "vue"
import AppSidebar from "@/components/AppSidebar.vue"
import AppHeader from "@/components/AppHeader.vue"
import BaseButton from "@/components/BaseButton.vue"
import BaseModal from "@/components/BaseModal.vue"
import BaseTable from "@/components/BaseTable.vue"
import RowContextMenu, { type ContextMenuItem } from "@/components/RowContextMenu.vue"
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
      <div class="p-8">

        <!-- Header -->
        <div class="flex items-start justify-between mb-8">
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

        <!-- Error -->
        <div v-if="loadError"
          class="flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium mb-6"
          style="background-color: var(--color-error-container); color: var(--color-on-error-container)">
          <span class="material-symbols-outlined" style="font-size: 18px">error</span>
          {{ loadError }}
        </div>

        <!-- Tabla -->
        <BaseTable :columns="columns" :items="cargos" :loading="isLoading" empty-text="No hay cargos registrados.">
          <template #nombre="{ item }">
            <p class="text-sm font-semibold" style="color: var(--color-on-surface)">{{ item.nombre }}</p>
          </template>

          <template #descripcion="{ item }">
            <span class="text-sm" style="color: var(--color-on-surface-variant)">{{ item.descripcion ?? "—" }}</span>
          </template>

          <template #estado="{ item }">
            <span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold"
              :style="item.activo
                ? 'background-color: #dcfce7; color: #166534'
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
        class="flex items-center gap-2 rounded-xl px-3 py-2.5 mb-4 text-sm font-medium"
        style="background-color: var(--color-error-container); color: var(--color-on-error-container)">
        <span class="material-symbols-outlined flex-shrink-0" style="font-size: 16px">error</span>
        {{ createError }}
      </div>
      <div class="space-y-4">
        <div>
          <label class="block text-xs font-bold uppercase tracking-wider mb-1.5" style="color: var(--color-outline)">Nombre *</label>
          <input v-model="createForm.nombre" type="text" class="w-full px-4 py-3 rounded-xl text-sm outline-none"
            style="border: 1px solid var(--color-outline-variant); color: var(--color-on-surface); background-color: var(--color-surface-container-low)" />
        </div>
        <div>
          <label class="block text-xs font-bold uppercase tracking-wider mb-1.5" style="color: var(--color-outline)">Descripción</label>
          <input v-model="createForm.descripcion" type="text" placeholder="Opcional" class="w-full px-4 py-3 rounded-xl text-sm outline-none"
            style="border: 1px solid var(--color-outline-variant); color: var(--color-on-surface); background-color: var(--color-surface-container-low)" />
        </div>
      </div>
      <template #footer>
        <BaseButton variant="secondary" class="flex-1" @click="showCreate = false">Cancelar</BaseButton>
        <BaseButton variant="primary" class="flex-1" :disabled="isSavingCreate" @click="submitCreate">
          <svg v-if="isSavingCreate" class="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          {{ isSavingCreate ? "Creando..." : "Crear Cargo" }}
        </BaseButton>
      </template>
    </BaseModal>

    <!-- ── MODAL EDITAR ──────────────────────────────────────────────────────────── -->
    <BaseModal :show="showEdit" title="Editar Cargo" size="sm" @close="showEdit = false">
      <div v-if="editError"
        class="flex items-center gap-2 rounded-xl px-3 py-2.5 mb-4 text-sm font-medium"
        style="background-color: var(--color-error-container); color: var(--color-on-error-container)">
        <span class="material-symbols-outlined flex-shrink-0" style="font-size: 16px">error</span>
        {{ editError }}
      </div>
      <div class="space-y-4">
        <div>
          <label class="block text-xs font-bold uppercase tracking-wider mb-1.5" style="color: var(--color-outline)">Nombre *</label>
          <input v-model="editForm.nombre" type="text" class="w-full px-4 py-3 rounded-xl text-sm outline-none"
            style="border: 1px solid var(--color-outline-variant); color: var(--color-on-surface); background-color: var(--color-surface-container-low)" />
        </div>
        <div>
          <label class="block text-xs font-bold uppercase tracking-wider mb-1.5" style="color: var(--color-outline)">Descripción</label>
          <input v-model="editForm.descripcion" type="text" placeholder="Opcional" class="w-full px-4 py-3 rounded-xl text-sm outline-none"
            style="border: 1px solid var(--color-outline-variant); color: var(--color-on-surface); background-color: var(--color-surface-container-low)" />
        </div>
        <div class="flex items-center justify-between p-3 rounded-xl"
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
              :style="editForm.activo ? 'color: #166534' : 'color: var(--color-outline)'">
              {{ editForm.activo ? "toggle_on" : "toggle_off" }}
            </span>
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
