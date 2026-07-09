<script setup lang="ts">
import { inputStyle } from "@/composables/useFieldStyles"
import { ref, reactive, computed, onMounted } from "vue"
import AppSidebar from "@/components/AppSidebar.vue"
import AppHeader from "@/components/AppHeader.vue"
import BaseModal from "@/components/BaseModal.vue"
import BaseButton from "@/components/BaseButton.vue"
import BaseTable from "@/components/BaseTable.vue"
import SearchInput from "@/components/SearchInput.vue"
import SearchableSelect from "@/components/SearchableSelect.vue"
import RowContextMenu, { type ContextMenuItem } from "@/components/RowContextMenu.vue"
import { useAuthStore } from "@/stores/auth"
import {
  type Sucursal,
  getSucursales,
  createSucursal,
  updateSucursal,
  deleteSucursal,
} from "@/services/sucursalService"
import { type Ciudad, getCiudades } from "@/services/ubicacionService"

const auth = useAuthStore()
const canEdit = auth.hasPermission("gestionar_sucursales")

const sucursales = ref<Sucursal[]>([])
const ciudades = ref<Ciudad[]>([])
const isLoading = ref(false)
const searchQuery = ref("")

const columns = [
  { key: "nombre", label: "Nombre" },
  { key: "codigo", label: "Código" },
  { key: "ciudad", label: "Ciudad" },
  { key: "estado", label: "Estado" },
  { key: "acciones", label: "" },
]

const filtered = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  if (!q) return sucursales.value
  return sucursales.value.filter(
    s => s.nombre.toLowerCase().includes(q) || s.codigo.toLowerCase().includes(q),
  )
})

function menuItems(s: Sucursal): ContextMenuItem[] {
  return [
    { type: "item", label: "Editar", icon: "edit", action: () => openEditModal(s), hidden: !canEdit },
    { type: "separator" },
    s.isActive
      ? { type: "item", label: "Desactivar", icon: "block", action: () => openDeactivateModal(s), danger: true, hidden: !canEdit }
      : { type: "item", label: "Activar", icon: "check_circle", action: () => reactivate(s), hidden: !canEdit },
  ]
}

async function load() {
  isLoading.value = true
  try {
    const [s, c] = await Promise.all([getSucursales(), getCiudades(undefined, true)])
    sucursales.value = s
    ciudades.value = c
  } catch {
    /* silencioso */
  } finally {
    isLoading.value = false
  }
}

onMounted(load)

const ciudadSelectOptions = computed(() => [
  { value: null as number | null, label: "Sin ciudad" },
  ...ciudades.value.map(c => ({ value: c.id, label: c.nombre })),
])

// ── Form compartido (crear / editar) ────────────────────────────────────────────
function emptyForm() {
  return {
    nombre: "",
    codigo: "",
    direccion: "",
    telefono: "",
    email: "",
    ciudadId: "" as number | "",
    establecimiento: "",
  }
}

function buildRequest(form: ReturnType<typeof emptyForm>, isActive?: boolean) {
  return {
    nombre:          form.nombre.trim(),
    codigo:          form.codigo.trim(),
    direccion:       form.direccion.trim() || undefined,
    telefono:        form.telefono.trim() || undefined,
    email:           form.email.trim() || undefined,
    ciudadId:        form.ciudadId === "" ? undefined : Number(form.ciudadId),
    establecimiento: form.establecimiento.trim() || undefined,
    ...(isActive !== undefined ? { isActive } : {}),
  }
}

// ── Crear ─────────────────────────────────────────────────────────────────────
const showCreateModal = ref(false)
const isCreating = ref(false)
const createError = ref("")
const createForm = reactive(emptyForm())

function openCreateModal() {
  Object.assign(createForm, emptyForm())
  createError.value = ""
  showCreateModal.value = true
}

async function submitCreate() {
  if (isCreating.value || !createForm.nombre.trim() || !createForm.codigo.trim()) return
  isCreating.value = true
  createError.value = ""
  try {
    await createSucursal(buildRequest(createForm))
    showCreateModal.value = false
    load()
  } catch (err: unknown) {
    createError.value = err instanceof Error ? err.message : "Error al crear."
  } finally {
    isCreating.value = false
  }
}

// ── Editar ────────────────────────────────────────────────────────────────────
const showEditModal = ref(false)
const isEditing = ref(false)
const editError = ref("")
const editingId = ref(0)
const editingIsActive = ref(true)
const editForm = reactive(emptyForm())

function openEditModal(s: Sucursal) {
  editingId.value = s.id
  editingIsActive.value = s.isActive
  Object.assign(editForm, {
    nombre:          s.nombre,
    codigo:          s.codigo,
    direccion:       s.direccion ?? "",
    telefono:        s.telefono ?? "",
    email:           s.email ?? "",
    ciudadId:        s.ciudadId ?? "",
    establecimiento: s.establecimiento ?? "",
  })
  editError.value = ""
  showEditModal.value = true
}

async function submitEdit() {
  if (isEditing.value || !editForm.nombre.trim() || !editForm.codigo.trim()) return
  isEditing.value = true
  editError.value = ""
  try {
    await updateSucursal(editingId.value, buildRequest(editForm, editingIsActive.value))
    showEditModal.value = false
    load()
  } catch (err: unknown) {
    editError.value = err instanceof Error ? err.message : "Error al editar."
  } finally {
    isEditing.value = false
  }
}

// ── Activar / Desactivar ────────────────────────────────────────────────────────
const showDeactivateModal = ref(false)
const isDeactivating = ref(false)
const deactivateError = ref("")
const deactivating = ref<Sucursal | null>(null)

function openDeactivateModal(s: Sucursal) {
  deactivating.value = s
  deactivateError.value = ""
  showDeactivateModal.value = true
}

async function confirmDeactivate() {
  if (isDeactivating.value || !deactivating.value) return
  isDeactivating.value = true
  deactivateError.value = ""
  try {
    await deleteSucursal(deactivating.value.id)
    showDeactivateModal.value = false
    load()
  } catch (err: unknown) {
    deactivateError.value = err instanceof Error ? err.message : "Error al desactivar."
  } finally {
    isDeactivating.value = false
  }
}

async function reactivate(s: Sucursal) {
  try {
    await updateSucursal(s.id, {
      nombre:          s.nombre,
      codigo:          s.codigo,
      direccion:       s.direccion,
      telefono:        s.telefono,
      email:           s.email,
      ciudadId:        s.ciudadId,
      establecimiento: s.establecimiento,
      isActive:        true,
    })
    load()
  } catch {
    /* silencioso */
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
            <h1 class="text-4xl font-extrabold tracking-tight mb-2">Sucursales</h1>
            <p class="font-medium" style="color: var(--color-on-surface-variant)">
              {{ sucursales.length }} sucursal{{ sucursales.length !== 1 ? "es" : "" }} registrada{{ sucursales.length !== 1 ? "s" : "" }}
            </p>
          </div>
          <BaseButton v-if="canEdit" variant="primary" size="lg" @click="openCreateModal">
            <span class="material-symbols-outlined" style="font-size: 20px; width: 20px; height: 20px">add</span>
            Nueva Sucursal
          </BaseButton>
        </div>

        <!-- Search -->
        <div class="flex items-center justify-end mb-8">
          <SearchInput v-model="searchQuery" placeholder="Buscar sucursal..." />
        </div>

        <!-- Loading -->
        <div v-if="isLoading" class="flex justify-center py-24">
          <svg class="animate-spin w-8 h-8" style="color: var(--color-primary)" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>

        <!-- Tabla -->
        <template v-else>
          <div class="rounded-lg overflow-hidden"
            style="background-color: var(--color-surface-container-lowest); border: 1px solid var(--color-hairline)">

            <BaseTable :columns="columns" :items="filtered" :loading="false">
            <template #empty>
              <span class="material-symbols-outlined" style="font-size: 40px; color: var(--color-outline-variant)">store</span>
              <p class="mt-3 text-sm font-medium" style="color: var(--color-outline)">No hay sucursales registradas.</p>
            </template>
            <template #nombre="{ item: s }">
              <div class="flex items-center gap-3">
                <div class="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                  style="background-color: color-mix(in srgb, var(--color-primary) 10%, transparent)">
                  <span class="material-symbols-outlined" style="font-size: 18px; color: var(--color-primary)">store</span>
                </div>
                <span class="text-sm font-semibold" style="color: var(--color-on-surface)">{{ s.nombre }}</span>
              </div>
            </template>
            <template #estado="{ item: s }">
              <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold"
                :style="s.isActive
                  ? 'background-color: var(--color-success-container); color: var(--color-on-success-container)'
                  : 'background-color: var(--color-surface-container-high); color: var(--color-outline)'">
                <span class="w-1.5 h-1.5 rounded-full" :style="`background-color: ${s.isActive ? 'var(--color-success)' : 'var(--color-outline)'}`"></span>
                {{ s.isActive ? "Activa" : "Inactiva" }}
              </span>
            </template>
            <template #acciones="{ item: s }">
              <div class="flex justify-end">
                <RowContextMenu :items="menuItems(s)" />
              </div>
            </template>
          </BaseTable>

            <div v-if="filtered.length > 0" class="px-6 py-4"
              style="border-top: 1px solid var(--color-hairline-soft)">
              <span class="text-sm" style="color: var(--color-on-surface-variant)">
                <strong style="color: var(--color-on-surface)">{{ sucursales.length }}</strong>
                sucursal{{ sucursales.length !== 1 ? "es" : "" }}
              </span>
            </div>
          </div>
        </template>

      </div>
    </main>

    <!-- Modal crear -->
    <BaseModal :show="showCreateModal" title="Nueva Sucursal" size="lg" @close="showCreateModal = false">
      <div class="space-y-4">
        <div v-if="createError" class="flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium"
          style="background-color: var(--color-error-container); color: var(--color-on-error-container)">
          <span class="material-symbols-outlined" style="font-size: 18px">error</span>
          {{ createError }}
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div class="flex flex-col gap-1.5">
            <label class="text-xs font-bold uppercase tracking-wider" style="color: var(--color-outline)">Nombre *</label>
            <input v-model="createForm.nombre" type="text" placeholder="Ej: Casa Central"
              class="w-full px-4 h-12 text-sm outline-none appearance-none shadow-none" :style="inputStyle()" />
          </div>
          <div class="flex flex-col gap-1.5">
            <label class="text-xs font-bold uppercase tracking-wider" style="color: var(--color-outline)">Código *</label>
            <input v-model="createForm.codigo" type="text" placeholder="Ej: CC"
              class="w-full px-4 h-12 text-sm outline-none appearance-none shadow-none" :style="inputStyle()" />
          </div>
          <div class="flex flex-col gap-1.5 sm:col-span-2">
            <label class="text-xs font-bold uppercase tracking-wider" style="color: var(--color-outline)">Dirección</label>
            <input v-model="createForm.direccion" type="text"
              class="w-full px-4 h-12 text-sm outline-none appearance-none shadow-none" :style="inputStyle()" />
          </div>
          <div class="flex flex-col gap-1.5">
            <label class="text-xs font-bold uppercase tracking-wider" style="color: var(--color-outline)">Teléfono</label>
            <input v-model="createForm.telefono" type="text"
              class="w-full px-4 h-12 text-sm outline-none appearance-none shadow-none" :style="inputStyle()" />
          </div>
          <div class="flex flex-col gap-1.5">
            <label class="text-xs font-bold uppercase tracking-wider" style="color: var(--color-outline)">Email</label>
            <input v-model="createForm.email" type="email"
              class="w-full px-4 h-12 text-sm outline-none appearance-none shadow-none" :style="inputStyle()" />
          </div>
          <div class="flex flex-col gap-1.5">
            <label class="text-xs font-bold uppercase tracking-wider" style="color: var(--color-outline)">Ciudad</label>
            <SearchableSelect
              :model-value="createForm.ciudadId === '' ? null : createForm.ciudadId"
              :options="ciudadSelectOptions"
              null-label="Sin ciudad"
              @update:model-value="createForm.ciudadId = $event !== null ? Number($event) : ''"
            />
          </div>
          <div class="flex flex-col gap-1.5">
            <label class="text-xs font-bold uppercase tracking-wider" style="color: var(--color-outline)">Establecimiento</label>
            <input v-model="createForm.establecimiento" type="text" placeholder="Ej: 001"
              class="w-full px-4 h-12 text-sm outline-none appearance-none shadow-none" :style="inputStyle()" />
          </div>
        </div>
      </div>
      <template #footer>
        <div class="flex justify-between w-full">
          <BaseButton variant="secondary" @click="showCreateModal = false">Cancelar</BaseButton>
          <BaseButton variant="primary" :disabled="isCreating" @click="submitCreate">
            <span v-if="isCreating" class="material-symbols-outlined animate-spin" style="font-size: 18px">progress_activity</span>
            {{ isCreating ? "Guardando..." : "Crear" }}
          </BaseButton>
        </div>
      </template>
    </BaseModal>

    <!-- Modal editar -->
    <BaseModal :show="showEditModal" title="Editar Sucursal" size="lg" @close="showEditModal = false">
      <div class="space-y-4">
        <div v-if="editError" class="flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium"
          style="background-color: var(--color-error-container); color: var(--color-on-error-container)">
          <span class="material-symbols-outlined" style="font-size: 18px">error</span>
          {{ editError }}
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div class="flex flex-col gap-1.5">
            <label class="text-xs font-bold uppercase tracking-wider" style="color: var(--color-outline)">Nombre *</label>
            <input v-model="editForm.nombre" type="text"
              class="w-full px-4 h-12 text-sm outline-none appearance-none shadow-none" :style="inputStyle()" />
          </div>
          <div class="flex flex-col gap-1.5">
            <label class="text-xs font-bold uppercase tracking-wider" style="color: var(--color-outline)">Código *</label>
            <input v-model="editForm.codigo" type="text"
              class="w-full px-4 h-12 text-sm outline-none appearance-none shadow-none" :style="inputStyle()" />
          </div>
          <div class="flex flex-col gap-1.5 sm:col-span-2">
            <label class="text-xs font-bold uppercase tracking-wider" style="color: var(--color-outline)">Dirección</label>
            <input v-model="editForm.direccion" type="text"
              class="w-full px-4 h-12 text-sm outline-none appearance-none shadow-none" :style="inputStyle()" />
          </div>
          <div class="flex flex-col gap-1.5">
            <label class="text-xs font-bold uppercase tracking-wider" style="color: var(--color-outline)">Teléfono</label>
            <input v-model="editForm.telefono" type="text"
              class="w-full px-4 h-12 text-sm outline-none appearance-none shadow-none" :style="inputStyle()" />
          </div>
          <div class="flex flex-col gap-1.5">
            <label class="text-xs font-bold uppercase tracking-wider" style="color: var(--color-outline)">Email</label>
            <input v-model="editForm.email" type="email"
              class="w-full px-4 h-12 text-sm outline-none appearance-none shadow-none" :style="inputStyle()" />
          </div>
          <div class="flex flex-col gap-1.5">
            <label class="text-xs font-bold uppercase tracking-wider" style="color: var(--color-outline)">Ciudad</label>
            <SearchableSelect
              :model-value="editForm.ciudadId === '' ? null : editForm.ciudadId"
              :options="ciudadSelectOptions"
              null-label="Sin ciudad"
              @update:model-value="editForm.ciudadId = $event !== null ? Number($event) : ''"
            />
          </div>
          <div class="flex flex-col gap-1.5">
            <label class="text-xs font-bold uppercase tracking-wider" style="color: var(--color-outline)">Establecimiento</label>
            <input v-model="editForm.establecimiento" type="text"
              class="w-full px-4 h-12 text-sm outline-none appearance-none shadow-none" :style="inputStyle()" />
          </div>
        </div>
      </div>
      <template #footer>
        <div class="flex justify-between w-full">
          <BaseButton variant="secondary" @click="showEditModal = false">Cancelar</BaseButton>
          <BaseButton variant="primary" :disabled="isEditing" @click="submitEdit">
            <span v-if="isEditing" class="material-symbols-outlined animate-spin" style="font-size: 18px">progress_activity</span>
            {{ isEditing ? "Guardando..." : "Guardar" }}
          </BaseButton>
        </div>
      </template>
    </BaseModal>

    <!-- Modal desactivar -->
    <BaseModal :show="showDeactivateModal" title="Desactivar Sucursal" size="sm" @close="showDeactivateModal = false">
      <p class="text-sm mb-4" style="color: var(--color-on-surface-variant)">
        ¿Deseás desactivar <strong style="color: var(--color-on-surface)">{{ deactivating?.nombre }}</strong>?
        No se podrá asignar a nuevos usuarios ni operaciones mientras esté inactiva.
      </p>
      <div v-if="deactivateError" class="flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium"
        style="background-color: var(--color-error-container); color: var(--color-on-error-container)">
        <span class="material-symbols-outlined flex-shrink-0" style="font-size: 18px">error</span>
        {{ deactivateError }}
      </div>
      <template #footer>
        <div class="flex justify-between w-full">
          <BaseButton variant="secondary" @click="showDeactivateModal = false">Cancelar</BaseButton>
          <BaseButton variant="danger" :disabled="isDeactivating" @click="confirmDeactivate">
            <span v-if="isDeactivating" class="material-symbols-outlined animate-spin">progress_activity</span>
            {{ isDeactivating ? "Desactivando..." : "Desactivar" }}
          </BaseButton>
        </div>
      </template>
    </BaseModal>
  </div>
</template>
