<script setup lang="ts">
import { ref, computed, onMounted, reactive } from "vue"
import { inputStyle, statusStyle } from "@/composables/useFieldStyles"
import AppSidebar from "@/components/AppSidebar.vue"
import AppHeader from "@/components/AppHeader.vue"
import BaseButton from "@/components/BaseButton.vue"
import BaseModal from "@/components/BaseModal.vue"
import BaseTable from "@/components/BaseTable.vue"
import FilterChips from "@/components/FilterChips.vue"
import SearchableSelect from "@/components/SearchableSelect.vue"
import { useAuthStore } from "@/stores/auth"
import RowContextMenu, { type ContextMenuItem } from "@/components/RowContextMenu.vue"
import {
  type MotivoMovimiento,
  type CreateMotivoMovimientoRequest,
  type UpdateMotivoMovimientoRequest,
  getMotivosMovimiento,
  createMotivoMovimiento,
  updateMotivoMovimiento,
  deactivateMotivoMovimiento,
} from "@/services/inventarioService"

const auth = useAuthStore()
const canManage = computed(() => auth.hasPermission("gestionar_inventario"))

// ── Estado ────────────────────────────────────────────────────────────────────

const motivos = ref<MotivoMovimiento[]>([])
const isLoading = ref(false)
const loadError = ref("")
const tipoFilter = ref<string[]>([])

const tipoOptions = [
  { value: "Entrada", label: "Entrada" },
  { value: "Salida", label: "Salida" },
  { value: "Ambos", label: "Ambos" },
]

const columns = [
  { key: "nombre", label: "Nombre" },
  { key: "tipo", label: "Aplica a" },
  { key: "estado", label: "Estado" },
  { key: "acciones", label: "", align: "right" as const },
]

const motivosFiltrados = computed(() => {
  if (!tipoFilter.value.length) return motivos.value
  return motivos.value.filter(
    (m) => tipoFilter.value.includes(m.tipo) || (tipoFilter.value.includes("Entrada") && m.tipo === "Ambos") || (tipoFilter.value.includes("Salida") && m.tipo === "Ambos"),
  )
})

async function load() {
  isLoading.value = true
  loadError.value = ""
  try {
    motivos.value = await getMotivosMovimiento()
  } catch (err: unknown) {
    loadError.value = err instanceof Error ? err.message : "Error al cargar motivos."
  } finally {
    isLoading.value = false
  }
}

onMounted(load)

function onTipoChange(val: string[]) {
  tipoFilter.value = val
}

function menuItems(m: MotivoMovimiento): ContextMenuItem[] {
  return [
    { type: "item", label: "Editar", icon: "edit", action: () => openEdit(m) },
    ...(m.isActive
      ? [{ type: "item" as const, label: "Desactivar", icon: "block", action: () => openDelete(m), danger: true }]
      : []),
  ]
}

// ── Tipo badge ────────────────────────────────────────────────────────────────

function tipoBadgeStyle(tipo: string) {
  if (tipo === "Entrada") return "background-color: var(--color-success-container); color: var(--color-on-success-container)"
  if (tipo === "Salida") return "background-color: var(--color-error-container); color: var(--color-on-error-container)"
  return "background-color: color-mix(in srgb, var(--color-tertiary) 12%, var(--color-surface-container-lowest)); color: var(--color-tertiary)"
}

// ── Modal Crear ───────────────────────────────────────────────────────────────

const showCreateModal = ref(false)
const isCreating = ref(false)
const createError = ref("")
const createForm = reactive<CreateMotivoMovimientoRequest>({ nombre: "", tipo: "Ambos" })

function openCreate() {
  Object.assign(createForm, { nombre: "", tipo: "Ambos" })
  createError.value = ""
  showCreateModal.value = true
}

async function submitCreate() {
  isCreating.value = true
  createError.value = ""
  try {
    await createMotivoMovimiento({ ...createForm })
    showCreateModal.value = false
    await load()
  } catch (err: unknown) {
    createError.value = err instanceof Error ? err.message : "Error al crear motivo."
  } finally {
    isCreating.value = false
  }
}

// ── Modal Editar ──────────────────────────────────────────────────────────────

const showEditModal = ref(false)
const editingMotivo = ref<MotivoMovimiento | null>(null)
const isEditing = ref(false)
const editError = ref("")
const editForm = reactive<UpdateMotivoMovimientoRequest>({ nombre: "", tipo: "Ambos", isActive: true })

function openEdit(m: MotivoMovimiento) {
  editingMotivo.value = m
  Object.assign(editForm, { nombre: m.nombre, tipo: m.tipo, isActive: m.isActive })
  editError.value = ""
  showEditModal.value = true
}

async function submitEdit() {
  if (!editingMotivo.value) return
  isEditing.value = true
  editError.value = ""
  try {
    await updateMotivoMovimiento(editingMotivo.value.id, { ...editForm })
    showEditModal.value = false
    await load()
  } catch (err: unknown) {
    editError.value = err instanceof Error ? err.message : "Error al actualizar motivo."
  } finally {
    isEditing.value = false
  }
}

// ── Modal Desactivar ──────────────────────────────────────────────────────────

const showDeleteModal = ref(false)
const deletingMotivo = ref<MotivoMovimiento | null>(null)
const isDeleting = ref(false)
const deleteError = ref("")

function openDelete(m: MotivoMovimiento) {
  deletingMotivo.value = m
  deleteError.value = ""
  showDeleteModal.value = true
}

async function submitDelete() {
  if (!deletingMotivo.value) return
  isDeleting.value = true
  deleteError.value = ""
  try {
    await deactivateMotivoMovimiento(deletingMotivo.value.id)
    showDeleteModal.value = false
    await load()
  } catch (err: unknown) {
    deleteError.value = err instanceof Error ? err.message : "Error al desactivar motivo."
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
            <h1 class="text-4xl font-extrabold tracking-tight mb-2">Motivos de Movimiento</h1>
            <p class="font-medium" style="color: var(--color-on-surface-variant)">
              {{ motivos.length }} motivo{{ motivos.length !== 1 ? "s" : "" }} configurado{{ motivos.length !== 1 ? "s" : "" }}
            </p>
          </div>
          <BaseButton v-if="canManage" variant="primary" size="lg" @click="openCreate">
            <span class="material-symbols-outlined" style="font-size: 20px">add</span>
            Nuevo Motivo
          </BaseButton>
        </div>

        <!-- Filtros -->
        <div class="flex items-center gap-4 mb-8 flex-wrap">
          <FilterChips
            :model-value="tipoFilter"
            :options="tipoOptions"
            placeholder="Tipo"
            @update:model-value="onTipoChange"
          />
        </div>

        <!-- Error -->
        <div v-if="loadError" class="flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium mb-6"
          style="background-color: var(--color-error-container); color: var(--color-on-error-container)">
          <span class="material-symbols-outlined" style="font-size: 18px">error</span>
          {{ loadError }}
        </div>

        <!-- Tabla -->
        <BaseTable :columns="columns" :items="motivosFiltrados" :loading="isLoading" empty-text="No hay motivos configurados.">

          <template #nombre="{ item }">
            <span class="text-sm font-semibold" style="color: var(--color-on-surface)">{{ item.nombre }}</span>
          </template>

          <template #tipo="{ item }">
            <span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold" :style="tipoBadgeStyle(item.tipo)">
              {{ item.tipo }}
            </span>
          </template>

          <template #estado="{ item }">
            <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider"
              :style="`background-color: ${statusStyle(item.isActive).bg}; color: ${statusStyle(item.isActive).text};`">
              <span class="w-1.5 h-1.5 rounded-full" :style="`background-color: ${statusStyle(item.isActive).dot};`"></span>
              {{ item.isActive ? 'Activo' : 'Inactivo' }}
            </span>
          </template>

          <template #acciones="{ item }">
            <div class="flex items-center justify-end">
              <RowContextMenu v-if="canManage" :items="menuItems(item)" />
            </div>
          </template>
        </BaseTable>

      </div>
    </main>

    <!-- MODAL CREAR -->
    <BaseModal :show="showCreateModal" title="Nuevo Motivo" size="lg" @close="showCreateModal = false">
      <div v-if="createError" class="flex items-center gap-2 rounded-xl px-3 py-2.5 mb-4 text-sm font-medium"
        style="background-color: var(--color-error-container); color: var(--color-on-error-container)">
        <span class="material-symbols-outlined flex-shrink-0" style="font-size: 16px">error</span>
        {{ createError }}
      </div>

      <div class="space-y-4">
        <div>
          <label class="block text-xs font-bold uppercase tracking-wider mb-1.5" style="color: var(--color-outline)">Nombre</label>
          <input v-model="createForm.nombre" type="text" placeholder="Ej. Compra a proveedor"
            class="w-full px-4 h-12 text-sm outline-none appearance-none shadow-none transition-all"
            :style="inputStyle(false)" />
        </div>
        <div>
          <label class="block text-xs font-bold uppercase tracking-wider mb-1.5" style="color: var(--color-outline)">Aplica a</label>
          <SearchableSelect v-model="createForm.tipo" :options="tipoOptions" placeholder="Tipo" />
          <p class="text-xs mt-1" style="color: var(--color-outline)">Define en qué tipo de movimiento estará disponible este motivo.</p>
        </div>
      </div>

      <template #footer>
        <BaseButton variant="secondary" @click="showCreateModal = false">Cancelar</BaseButton>
        <BaseButton variant="primary" :disabled="isCreating" @click="submitCreate">
          {{ isCreating ? "Guardando…" : "Crear" }}
        </BaseButton>
      </template>
    </BaseModal>

    <!-- MODAL EDITAR -->
    <BaseModal :show="showEditModal" title="Editar Motivo" size="lg" @close="showEditModal = false">
      <div v-if="editError" class="flex items-center gap-2 rounded-xl px-3 py-2.5 mb-4 text-sm font-medium"
        style="background-color: var(--color-error-container); color: var(--color-on-error-container)">
        <span class="material-symbols-outlined flex-shrink-0" style="font-size: 16px">error</span>
        {{ editError }}
      </div>

      <div class="space-y-4">
        <div>
          <label class="block text-xs font-bold uppercase tracking-wider mb-1.5" style="color: var(--color-outline)">Nombre</label>
          <input v-model="editForm.nombre" type="text"
            class="w-full px-4 h-12 text-sm outline-none appearance-none shadow-none transition-all"
            :style="inputStyle(false)" />
        </div>
        <div>
          <label class="block text-xs font-bold uppercase tracking-wider mb-1.5" style="color: var(--color-outline)">Aplica a</label>
          <SearchableSelect v-model="editForm.tipo" :options="tipoOptions" placeholder="Tipo" />
        </div>
        <div class="flex items-center gap-3">
          <input id="editMotivoActive" v-model="editForm.isActive" type="checkbox" class="w-4 h-4 rounded" />
          <label for="editMotivoActive" class="text-sm font-medium" style="color: var(--color-on-surface)">Activo</label>
        </div>
      </div>

      <template #footer>
        <BaseButton variant="secondary" @click="showEditModal = false">Cancelar</BaseButton>
        <BaseButton variant="primary" :disabled="isEditing" @click="submitEdit">
          {{ isEditing ? "Guardando…" : "Guardar" }}
        </BaseButton>
      </template>
    </BaseModal>

    <!-- MODAL DESACTIVAR -->
    <BaseModal :show="showDeleteModal" title="Desactivar Motivo" size="sm" @close="showDeleteModal = false">
      <p class="text-sm" style="color: var(--color-on-surface-variant)">
        ¿Desactivar el motivo <strong style="color: var(--color-on-surface)">{{ deletingMotivo?.nombre }}</strong>?
        Ya no estará disponible al registrar movimientos.
      </p>
      <div v-if="deleteError" class="flex items-center gap-2 rounded-xl px-3 py-2.5 mt-3 text-sm font-medium"
        style="background-color: var(--color-error-container); color: var(--color-on-error-container)">
        {{ deleteError }}
      </div>
      <template #footer>
        <BaseButton variant="secondary" @click="showDeleteModal = false">Cancelar</BaseButton>
        <BaseButton variant="danger" :disabled="isDeleting" @click="submitDelete">
          {{ isDeleting ? "Desactivando…" : "Desactivar" }}
        </BaseButton>
      </template>
    </BaseModal>
  </div>
</template>
