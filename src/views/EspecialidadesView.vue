<script setup lang="ts">
import { ref, reactive, computed, onMounted } from "vue"
import AppSidebar from "@/components/AppSidebar.vue"
import AppHeader from "@/components/AppHeader.vue"
import BaseModal from "@/components/BaseModal.vue"
import BaseButton from "@/components/BaseButton.vue"
import SearchInput from "@/components/SearchInput.vue"
import RowContextMenu, { type ContextMenuItem } from "@/components/RowContextMenu.vue"
import { useAuthStore } from "@/stores/auth"
import {
  type Especialidad,
  getEspecialidades,
  createEspecialidad,
  updateEspecialidad,
  deleteEspecialidad,
} from "@/services/especialidadService"

const auth = useAuthStore()
const canEdit = auth.hasPermission("gestionar_especialidades")

const especialidades = ref<Especialidad[]>([])
const isLoading = ref(false)
const searchQuery = ref("")

const filtered = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  if (!q) return especialidades.value
  return especialidades.value.filter(e => e.nombre.toLowerCase().includes(q))
})

function menuItems(esp: Especialidad): ContextMenuItem[] {
  return [
    { type: "item", label: "Editar",   icon: "edit",   action: () => openEditModal(esp),   hidden: !canEdit },
    { type: "separator" },
    { type: "item", label: "Eliminar", icon: "delete", action: () => openDeleteModal(esp), danger: true, hidden: !canEdit },
  ]
}

async function load() {
  isLoading.value = true
  try {
    especialidades.value = await getEspecialidades()
  } catch {
    /* silencioso */
  } finally {
    isLoading.value = false
  }
}

onMounted(load)

function inputStyle(hasError = false) {
  const base = "border-radius: 12px; "
  return hasError
    ? base + "border: 1.5px solid var(--color-error); color: var(--color-on-surface); background-color: color-mix(in srgb, var(--color-error) 8%, var(--color-surface));"
    : base + "border: 1px solid var(--color-outline-variant); color: var(--color-on-surface); background-color: var(--color-surface-container-low);"
}

// ── Crear ─────────────────────────────────────────────────────────────────────

const showCreateModal = ref(false)
const isCreating = ref(false)
const createError = ref("")
const createForm = reactive({ nombre: "", descripcion: "" })

function openCreateModal() {
  createForm.nombre = ""
  createForm.descripcion = ""
  createError.value = ""
  showCreateModal.value = true
}

async function submitCreate() {
  if (isCreating.value || !createForm.nombre.trim()) return
  isCreating.value = true
  createError.value = ""
  try {
    await createEspecialidad({
      nombre:      createForm.nombre.trim(),
      descripcion: createForm.descripcion.trim() || undefined,
    })
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
const editForm = reactive({ nombre: "", descripcion: "" })

function openEditModal(esp: Especialidad) {
  editingId.value = esp.id
  editForm.nombre = esp.nombre
  editForm.descripcion = esp.descripcion ?? ""
  editError.value = ""
  showEditModal.value = true
}

async function submitEdit() {
  if (isEditing.value || !editForm.nombre.trim()) return
  isEditing.value = true
  editError.value = ""
  try {
    await updateEspecialidad(editingId.value, {
      nombre:      editForm.nombre.trim(),
      descripcion: editForm.descripcion.trim() || undefined,
    })
    showEditModal.value = false
    load()
  } catch (err: unknown) {
    editError.value = err instanceof Error ? err.message : "Error al editar."
  } finally {
    isEditing.value = false
  }
}

// ── Eliminar ──────────────────────────────────────────────────────────────────

const showDeleteModal = ref(false)
const isDeleting = ref(false)
const deleteError = ref("")
const deletingEsp = ref<Especialidad | null>(null)

function openDeleteModal(esp: Especialidad) {
  deletingEsp.value = esp
  deleteError.value = ""
  showDeleteModal.value = true
}

async function confirmDelete() {
  if (isDeleting.value || !deletingEsp.value) return
  isDeleting.value = true
  deleteError.value = ""
  try {
    await deleteEspecialidad(deletingEsp.value.id)
    showDeleteModal.value = false
    load()
  } catch (err: unknown) {
    deleteError.value = err instanceof Error ? err.message : "Error al eliminar."
  } finally {
    isDeleting.value = false
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
            <h1 class="text-4xl font-extrabold tracking-tight mb-2">Especialidades</h1>
            <p class="font-medium" style="color: var(--color-on-surface-variant)">
              {{ especialidades.length }} especialidad{{ especialidades.length !== 1 ? "es" : "" }} registrada{{ especialidades.length !== 1 ? "s" : "" }}
            </p>
          </div>
          <BaseButton v-if="canEdit" variant="primary" size="lg" @click="openCreateModal">
            <span class="material-symbols-outlined" style="font-size: 20px; width: 20px; height: 20px">add</span>
            Nueva Especialidad
          </BaseButton>
        </div>

        <!-- Search -->
        <div class="flex items-center justify-end mb-8">
          <SearchInput v-model="searchQuery" placeholder="Buscar especialidad..." />
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
          <div class="rounded-2xl overflow-hidden"
            style="background-color: var(--color-surface-container-lowest); border: 1px solid var(--color-hairline)">

            <div v-if="filtered.length === 0" class="py-16 text-center">
              <span class="material-symbols-outlined" style="font-size: 40px; color: var(--color-outline-variant)">medical_services</span>
              <p class="mt-3 text-sm font-medium" style="color: var(--color-outline)">No hay especialidades registradas.</p>
            </div>

            <div v-else class="overflow-x-auto"><table class="w-full min-w-[640px]">
              <thead>
                <tr style="background-color: var(--color-surface-container-low)">
                  <th class="px-6 py-5 text-left text-xs font-bold uppercase tracking-widest" style="color: var(--color-outline)">Nombre</th>
                  <th class="px-6 py-5 text-left text-xs font-bold uppercase tracking-widest" style="color: var(--color-outline)">Descripción</th>
                  <th class="px-6 py-5"></th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="esp in filtered" :key="esp.id"
                  class="hover:bg-surface-container-low transition-colors"
                  style="border-top: 1px solid var(--color-hairline-soft)">
                  <td class="px-6 py-4">
                    <div class="flex items-center gap-3">
                      <div class="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                        style="background-color: color-mix(in srgb, var(--color-primary) 10%, transparent)">
                        <span class="material-symbols-outlined" style="font-size: 18px; color: var(--color-primary)">medical_services</span>
                      </div>
                      <span class="text-sm font-semibold" style="color: var(--color-on-surface)">{{ esp.nombre }}</span>
                    </div>
                  </td>
                  <td class="px-6 py-4">
                    <span class="text-sm" style="color: var(--color-on-surface-variant)">{{ esp.descripcion || "—" }}</span>
                  </td>
                  <td class="px-6 py-4">
                    <div class="flex justify-end">
                      <RowContextMenu :items="menuItems(esp)" />
                    </div>
                  </td>
                </tr>
              </tbody>
            </table></div>

            <!-- Footer conteo -->
            <div v-if="filtered.length > 0" class="px-6 py-4"
              style="border-top: 1px solid var(--color-hairline-soft)">
              <span class="text-sm" style="color: var(--color-on-surface-variant)">
                <strong style="color: var(--color-on-surface)">{{ especialidades.length }}</strong>
                especialidad{{ especialidades.length !== 1 ? "es" : "" }}
              </span>
            </div>
          </div>
        </template>

      </div>
    </main>

    <!-- Modal crear -->
    <BaseModal :show="showCreateModal" title="Nueva Especialidad" size="lg" @close="showCreateModal = false">
      <div class="space-y-4">
        <div v-if="createError" class="flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium"
          style="background-color: var(--color-error-container); color: var(--color-on-error-container)">
          <span class="material-symbols-outlined" style="font-size: 18px">error</span>
          {{ createError }}
        </div>
        <div class="flex flex-col gap-1.5">
          <label class="text-xs font-bold uppercase tracking-wider" style="color: var(--color-outline)">Nombre *</label>
          <input v-model="createForm.nombre" type="text" placeholder="Ej: Optometría"
            class="w-full px-4 h-12 text-sm outline-none appearance-none shadow-none" :style="inputStyle()" />
        </div>
        <div class="flex flex-col gap-1.5">
          <label class="text-xs font-bold uppercase tracking-wider" style="color: var(--color-outline)">Descripción</label>
          <textarea v-model="createForm.descripcion" rows="2"
            class="w-full px-4 py-3 text-sm outline-none appearance-none shadow-none resize-none" :style="inputStyle()" />
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
    <BaseModal :show="showEditModal" title="Editar Especialidad" size="lg" @close="showEditModal = false">
      <div class="space-y-4">
        <div v-if="editError" class="flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium"
          style="background-color: var(--color-error-container); color: var(--color-on-error-container)">
          <span class="material-symbols-outlined" style="font-size: 18px">error</span>
          {{ editError }}
        </div>
        <div class="flex flex-col gap-1.5">
          <label class="text-xs font-bold uppercase tracking-wider" style="color: var(--color-outline)">Nombre *</label>
          <input v-model="editForm.nombre" type="text"
            class="w-full px-4 h-12 text-sm outline-none appearance-none shadow-none" :style="inputStyle()" />
        </div>
        <div class="flex flex-col gap-1.5">
          <label class="text-xs font-bold uppercase tracking-wider" style="color: var(--color-outline)">Descripción</label>
          <textarea v-model="editForm.descripcion" rows="2"
            class="w-full px-4 py-3 text-sm outline-none appearance-none shadow-none resize-none" :style="inputStyle()" />
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

    <!-- Modal eliminar -->
    <BaseModal :show="showDeleteModal" title="Eliminar Especialidad" size="sm" @close="showDeleteModal = false">
      <p class="text-sm mb-4" style="color: var(--color-on-surface-variant)">
        ¿Deseás eliminar <strong style="color: var(--color-on-surface)">{{ deletingEsp?.nombre }}</strong>?
        Esta acción no se puede deshacer.
      </p>
      <div v-if="deleteError" class="flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium"
        style="background-color: var(--color-error-container); color: var(--color-on-error-container)">
        <span class="material-symbols-outlined flex-shrink-0" style="font-size: 18px">error</span>
        {{ deleteError }}
      </div>
      <template #footer>
        <div class="flex justify-between w-full">
          <BaseButton variant="secondary" @click="showDeleteModal = false">Cancelar</BaseButton>
          <BaseButton variant="danger" :disabled="isDeleting" @click="confirmDelete">
            <span v-if="isDeleting" class="material-symbols-outlined animate-spin">progress_activity</span>
            {{ isDeleting ? "Eliminando..." : "Eliminar" }}
          </BaseButton>
        </div>
      </template>
    </BaseModal>
  </div>
</template>
