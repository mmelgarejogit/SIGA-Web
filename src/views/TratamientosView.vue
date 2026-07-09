<script setup lang="ts">
import { inputStyle } from "@/composables/useFieldStyles"
import MontoInput from "@/components/MontoInput.vue"
import { ref, computed, onMounted, reactive } from "vue"
import AppSidebar from "@/components/AppSidebar.vue"
import AppHeader from "@/components/AppHeader.vue"
import BaseButton from "@/components/BaseButton.vue"
import BaseModal from "@/components/BaseModal.vue"
import BaseTable from "@/components/BaseTable.vue"
import FilterChips from "@/components/FilterChips.vue"
import RowContextMenu, { type ContextMenuItem } from "@/components/RowContextMenu.vue"
import { useAuthStore } from "@/stores/auth"
import {
  type Tratamiento,
  type CreateTratamientoRequest,
  type UpdateTratamientoRequest,
  getTratamientos,
  createTratamiento,
  updateTratamiento,
  deactivateTratamiento,
} from "@/services/inventarioService"

const auth      = useAuthStore()
const canManage = auth.hasPermission("gestionar_inventario")

const formatPrice = (n: number) =>
  new Intl.NumberFormat("es-PY", { style: "currency", currency: "PYG", maximumFractionDigits: 0 }).format(n)

// ── Estado ─────────────────────────────────────────────────────────────────────

const items     = ref<Tratamiento[]>([])
const isLoading = ref(false)
const loadError = ref("")
const estadoFilter = ref<string[]>([])

const estadoOptions = [
  { value: "activo",   label: "Activos",   dot: "var(--color-on-success-container)" },
  { value: "inactivo", label: "Inactivos", dot: "var(--color-outline)" },
]

const itemsFiltrados = computed(() => {
  currentPage.value = 1
  if (!estadoFilter.value.length) return items.value
  const activo   = estadoFilter.value.includes("activo")
  const inactivo = estadoFilter.value.includes("inactivo")
  if (activo && inactivo) return items.value
  return items.value.filter(i => activo ? i.isActive : !i.isActive)
})

// ── Paginación ─────────────────────────────────────────────────────────────────

const PAGE_SIZE   = 10
const currentPage = ref(1)

const itemsPaginados = computed(() => {
  const start = (currentPage.value - 1) * PAGE_SIZE
  return itemsFiltrados.value.slice(start, start + PAGE_SIZE)
})

const totalCount  = computed(() => itemsFiltrados.value.length)
const totalPages  = computed(() => Math.max(1, Math.ceil(totalCount.value / PAGE_SIZE)))
const rangeStart  = computed(() => totalCount.value === 0 ? 0 : (currentPage.value - 1) * PAGE_SIZE + 1)
const rangeEnd    = computed(() => Math.min(currentPage.value * PAGE_SIZE, totalCount.value))

const visiblePages = computed(() => {
  const total = totalPages.value
  const cur   = currentPage.value
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
  { key: "precio",   label: "Precio" },
  { key: "estado",   label: "Estado" },
  { key: "acciones", label: "", align: "right" as const },
]

async function load() {
  isLoading.value = true
  loadError.value = ""
  try {
    items.value = await getTratamientos()
  } catch (err: unknown) {
    loadError.value = err instanceof Error ? err.message : "Error al cargar tratamientos."
  } finally {
    isLoading.value = false
  }
}

onMounted(load)

// ── Context menu ───────────────────────────────────────────────────────────────

function menuItems(item: Tratamiento): ContextMenuItem[] {
  return [
    ...(canManage ? [{ type: "item" as const, label: "Editar", icon: "edit", action: () => openEdit(item) }] : []),
    ...(canManage && item.isActive ? [
      { type: "separator" as const },
      { type: "item" as const, label: "Desactivar", icon: "delete", action: () => openDeactivate(item), danger: true },
    ] : []),
  ]
}

// ── Modal Crear ────────────────────────────────────────────────────────────────

const showCreate  = ref(false)
const isSaving    = ref(false)
const createError = ref("")
const createForm  = reactive<CreateTratamientoRequest>({ nombre: "", precio: 0 })

function openCreate() {
  Object.assign(createForm, { nombre: "", precio: 0 })
  createError.value = ""
  showCreate.value  = true
}

async function submitCreate() {
  createError.value = ""
  if (!createForm.nombre.trim()) { createError.value = "El nombre es obligatorio."; return }
  if (createForm.precio < 0) { createError.value = "El precio no puede ser negativo."; return }
  isSaving.value = true
  try {
    await createTratamiento({ nombre: createForm.nombre.trim(), precio: createForm.precio })
    showCreate.value = false
    await load()
  } catch (err: unknown) {
    createError.value = err instanceof Error ? err.message : "Error al crear tratamiento."
  } finally {
    isSaving.value = false
  }
}

// ── Modal Editar ───────────────────────────────────────────────────────────────

const showEdit     = ref(false)
const isEditSaving = ref(false)
const editError    = ref("")
const editingItem  = ref<Tratamiento | null>(null)
const editForm     = reactive<UpdateTratamientoRequest>({ nombre: "", precio: 0, isActive: true })

function openEdit(item: Tratamiento) {
  editingItem.value = item
  Object.assign(editForm, { nombre: item.nombre, precio: item.precio, isActive: item.isActive })
  editError.value = ""
  showEdit.value  = true
}

async function submitEdit() {
  editError.value = ""
  if (!editForm.nombre.trim()) { editError.value = "El nombre es obligatorio."; return }
  if (editForm.precio < 0) { editError.value = "El precio no puede ser negativo."; return }
  if (!editingItem.value) return
  isEditSaving.value = true
  try {
    await updateTratamiento(editingItem.value.id, { nombre: editForm.nombre.trim(), precio: editForm.precio, isActive: editForm.isActive })
    showEdit.value = false
    await load()
  } catch (err: unknown) {
    editError.value = err instanceof Error ? err.message : "Error al actualizar tratamiento."
  } finally {
    isEditSaving.value = false
  }
}

// ── Modal Desactivar ───────────────────────────────────────────────────────────

const showDeactivate   = ref(false)
const isDeactivating   = ref(false)
const deactivateError  = ref("")
const deactivatingItem = ref<Tratamiento | null>(null)

function openDeactivate(item: Tratamiento) {
  deactivatingItem.value = item
  deactivateError.value  = ""
  showDeactivate.value   = true
}

async function confirmDeactivate() {
  if (!deactivatingItem.value) return
  isDeactivating.value  = true
  deactivateError.value = ""
  try {
    await deactivateTratamiento(deactivatingItem.value.id)
    showDeactivate.value = false
    await load()
  } catch (err: unknown) {
    deactivateError.value = err instanceof Error ? err.message : "Error al desactivar."
  } finally {
    isDeactivating.value = false
  }
}
</script>

<template>
  <div class="min-h-screen" style="background-color: var(--color-background)">
    <AppSidebar />
    <AppHeader />
    <main style="margin-left: var(--sidebar-width); padding-top: 64px; transition: margin-left 0.25s ease">
      <div class="p-4 sm:p-6 lg:p-8">

        <!-- Header -->
        <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-8">
          <div>
            <h1 class="text-4xl font-extrabold tracking-tight mb-2">Tratamientos</h1>
            <p class="font-medium" style="color: var(--color-on-surface-variant)">
              {{ items.filter(i => i.isActive).length }} tratamiento{{ items.filter(i => i.isActive).length !== 1 ? "s" : "" }} activo{{ items.filter(i => i.isActive).length !== 1 ? "s" : "" }}
            </p>
          </div>
          <BaseButton v-if="canManage" variant="primary" size="lg" @click="openCreate">
            <span class="material-symbols-outlined" style="font-size: 20px">add</span>
            Nuevo Tratamiento
          </BaseButton>
        </div>

        <!-- Filtros -->
        <div class="flex items-center gap-3 mb-6">
          <FilterChips :model-value="estadoFilter" :options="estadoOptions" placeholder="Estado" @update:model-value="estadoFilter = $event" />
        </div>

        <!-- Error -->
        <div v-if="loadError" class="flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium mb-6"
          style="background-color: var(--color-error-container); color: var(--color-on-error-container)">
          <span class="material-symbols-outlined" style="font-size: 18px">error</span>
          {{ loadError }}
        </div>

        <!-- Tabla -->
        <div class="rounded-lg overflow-hidden" style="background-color: var(--color-surface-container-lowest); box-shadow: var(--shadow-sm); outline: 1px solid var(--color-hairline)">
          <BaseTable :columns="columns" :items="itemsPaginados" :loading="isLoading" empty-text="No hay tratamientos registrados.">
            <template #nombre="{ item }">
              <div class="flex items-center gap-3">
                <div class="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style="background-color: var(--color-primary-container)">
                  <span class="material-symbols-outlined" style="font-size: 18px; color: white">auto_fix_high</span>
                </div>
                <span class="text-sm font-semibold" style="color: var(--color-on-surface)">{{ item.nombre }}</span>
              </div>
            </template>
            <template #precio="{ item }">
              <span class="text-sm font-semibold" style="color: var(--color-on-surface)">{{ formatPrice(item.precio) }}</span>
            </template>
            <template #estado="{ item }">
              <span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold"
                :style="item.isActive ? 'background-color:var(--color-success-container);color:var(--color-on-success-container)' : 'background-color:var(--color-surface-container-high);color:var(--color-outline)'">
                {{ item.isActive ? "Activo" : "Inactivo" }}
              </span>
            </template>
            <template #acciones="{ item }">
              <div class="flex justify-end">
                <RowContextMenu :items="menuItems(item)" />
              </div>
            </template>
          </BaseTable>

          <div v-if="itemsPaginados.length > 0" class="px-6 py-4 flex items-center justify-between flex-wrap gap-4"
            style="border-top: 1px solid var(--color-hairline-soft); background-color: var(--color-surface-container-lowest)">
            <span class="text-sm" style="color: var(--color-on-surface-variant)">
              Mostrando <strong style="color: var(--color-on-surface)">{{ rangeStart }}–{{ rangeEnd }}</strong>
              de <strong style="color: var(--color-on-surface)">{{ totalCount }}</strong> tratamientos
            </span>
            <div v-if="totalPages > 1" class="flex items-center gap-1">
              <button @click="currentPage--" :disabled="currentPage === 1"
                class="w-9 h-9 rounded-full flex items-center justify-center transition-all disabled:opacity-30 hover:bg-surface-container-high"
                style="color: var(--color-on-surface-variant)">
                <span class="material-symbols-outlined" style="font-size: 18px">chevron_left</span>
              </button>
              <template v-for="p in visiblePages" :key="p">
                <span v-if="p === '...'" class="w-9 h-9 flex items-center justify-center text-sm" style="color: var(--color-outline)">…</span>
                <button v-else @click="currentPage = (p as number)"
                  class="w-9 h-9 rounded-full text-sm font-semibold transition-all"
                  :class="currentPage === p ? 'bg-primary text-on-primary' : 'text-on-surface-variant hover:bg-surface-container-high'">
                  {{ p }}
                </button>
              </template>
              <button @click="currentPage++" :disabled="currentPage === totalPages"
                class="w-9 h-9 rounded-full flex items-center justify-center transition-all disabled:opacity-30 hover:bg-surface-container-high"
                style="color: var(--color-on-surface-variant)">
                <span class="material-symbols-outlined" style="font-size: 18px">chevron_right</span>
              </button>
            </div>
          </div>
        </div>

      </div>
    </main>

    <!-- Modal Crear -->
    <BaseModal :show="showCreate" title="Nuevo Tratamiento" size="lg" @close="showCreate = false">
      <div v-if="createError" class="flex items-center gap-2 rounded-xl px-3 py-2.5 mb-4 text-sm font-medium"
        style="background-color: var(--color-error-container); color: var(--color-on-error-container)">
        <span class="material-symbols-outlined flex-shrink-0" style="font-size: 16px">error</span>
        {{ createError }}
      </div>
      <div class="space-y-4">
        <div>
          <label class="block text-xs font-bold uppercase tracking-wider mb-1.5" style="color: var(--color-outline)">Nombre *</label>
          <input v-model="createForm.nombre" type="text" placeholder="Ej: Antirreflejo, Fotocromático…"
            class="w-full px-4 h-12 rounded-md text-sm outline-none appearance-none shadow-none transition-all" :style="inputStyle()" />
        </div>
        <div>
          <label class="block text-xs font-bold uppercase tracking-wider mb-1.5" style="color: var(--color-outline)">Precio</label>
          <MontoInput :model-value="createForm.precio ?? null" @update:model-value="createForm.precio = $event ?? 0" placeholder="0" />
          <p class="text-xs mt-1" style="color: var(--color-outline)">Se suma como línea al agregar el tratamiento a una venta.</p>
        </div>
      </div>
      <template #footer>
        <BaseButton variant="secondary" @click="showCreate = false">Cancelar</BaseButton>
        <BaseButton variant="primary" :disabled="isSaving" @click="submitCreate">
          {{ isSaving ? "Creando…" : "Crear tratamiento" }}
        </BaseButton>
      </template>
    </BaseModal>

    <!-- Modal Editar -->
    <BaseModal :show="showEdit" title="Editar Tratamiento" size="lg" @close="showEdit = false">
      <div v-if="editError" class="flex items-center gap-2 rounded-xl px-3 py-2.5 mb-4 text-sm font-medium"
        style="background-color: var(--color-error-container); color: var(--color-on-error-container)">
        <span class="material-symbols-outlined flex-shrink-0" style="font-size: 16px">error</span>
        {{ editError }}
      </div>
      <div class="space-y-4">
        <div>
          <label class="block text-xs font-bold uppercase tracking-wider mb-1.5" style="color: var(--color-outline)">Nombre *</label>
          <input v-model="editForm.nombre" type="text" class="w-full px-4 h-12 rounded-md text-sm outline-none appearance-none shadow-none transition-all"
            :style="inputStyle()" />
        </div>
        <div>
          <label class="block text-xs font-bold uppercase tracking-wider mb-1.5" style="color: var(--color-outline)">Precio</label>
          <MontoInput :model-value="editForm.precio ?? null" @update:model-value="editForm.precio = $event ?? 0" placeholder="0" />
        </div>
        <div class="flex items-center gap-3 p-4 rounded-xl" style="background-color: var(--color-surface-container-low)">
          <input v-model="editForm.isActive" type="checkbox" id="editIsActive" class="w-4 h-4 rounded" />
          <label for="editIsActive" class="text-sm font-medium cursor-pointer" style="color: var(--color-on-surface)">Tratamiento activo</label>
        </div>
      </div>
      <template #footer>
        <BaseButton variant="secondary" @click="showEdit = false">Cancelar</BaseButton>
        <BaseButton variant="primary" :disabled="isEditSaving" @click="submitEdit">
          {{ isEditSaving ? "Guardando…" : "Guardar cambios" }}
        </BaseButton>
      </template>
    </BaseModal>

    <!-- Modal Desactivar -->
    <BaseModal :show="showDeactivate" title="Desactivar Tratamiento" size="sm" @close="showDeactivate = false">
      <div v-if="deactivateError" class="flex items-center gap-2 rounded-xl px-3 py-2.5 mb-4 text-sm font-medium"
        style="background-color: var(--color-error-container); color: var(--color-on-error-container)">
        <span class="material-symbols-outlined flex-shrink-0" style="font-size: 16px">error</span>
        {{ deactivateError }}
      </div>
      <p class="text-sm" style="color: var(--color-on-surface-variant)">
        ¿Desactivar el tratamiento
        <span class="font-semibold" style="color: var(--color-on-surface)">{{ deactivatingItem?.nombre }}</span>?
      </p>
      <template #footer>
        <BaseButton variant="secondary" @click="showDeactivate = false">Cancelar</BaseButton>
        <BaseButton variant="danger" :disabled="isDeactivating" @click="confirmDeactivate">
          {{ isDeactivating ? "Desactivando…" : "Desactivar" }}
        </BaseButton>
      </template>
    </BaseModal>
  </div>
</template>
