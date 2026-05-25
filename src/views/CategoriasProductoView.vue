<script setup lang="ts">
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
  type CategoriaProducto,
  type CreateCategoriaProductoRequest,
  type UpdateCategoriaProductoRequest,
  getCategorias,
  createCategoria,
  updateCategoria,
  deactivateCategoria,
} from "@/services/inventarioService"

const auth = useAuthStore()
const canManage = auth.hasPermission("gestionar_inventario")

// ── Estado ─────────────────────────────────────────────────────────────────────

const categorias = ref<CategoriaProducto[]>([])
const isLoading = ref(false)
const loadError = ref("")
const estadoFilter = ref<string[]>([])

const estadoOptions = [
  { value: "activa",   label: "Activas",   dot: "#166534" },
  { value: "inactiva", label: "Inactivas", dot: "var(--color-outline)" },
]

const categoriasFiltradas = computed(() => {
  if (estadoFilter.value.length === 0) return categorias.value
  const soloActivas   = estadoFilter.value.includes("activa")
  const soloInactivas = estadoFilter.value.includes("inactiva")
  if (soloActivas && soloInactivas) return categorias.value
  if (soloActivas)   return categorias.value.filter((c) => c.isActive)
  if (soloInactivas) return categorias.value.filter((c) => !c.isActive)
  return categorias.value
})

const columns = [
  { key: "nombre", label: "Nombre" },
  { key: "descripcion", label: "Descripción" },
  { key: "descuento", label: "Descuento" },
  { key: "productos", label: "Productos" },
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

// ── Context menu ──────────────────────────────────────────────────────────────

function menuItems(cat: CategoriaProducto): ContextMenuItem[] {
  return [
    ...(canManage
      ? [{ type: "item" as const, label: "Editar", icon: "edit", action: () => openEdit(cat) }]
      : []),
    ...(canManage && cat.isActive
      ? [
          { type: "separator" as const },
          { type: "item" as const, label: "Desactivar", icon: "delete", action: () => openDeactivate(cat), danger: true },
        ]
      : []),
  ]
}

// ── Modal Crear ────────────────────────────────────────────────────────────────

const showCreateModal = ref(false)
const isSaving = ref(false)
const createError = ref("")
const createForm = reactive<CreateCategoriaProductoRequest>({ nombre: "", descripcion: undefined, margen: 0, descuento: 0 })

function openCreate() {
  Object.assign(createForm, { nombre: "", descripcion: "", margen: 0, descuento: 0 })
  createError.value = ""
  showCreateModal.value = true
}

async function submitCreate() {
  createError.value = ""
  if (!createForm.nombre.trim()) { createError.value = "El nombre es obligatorio."; return }
  isSaving.value = true
  try {
    await createCategoria({
      nombre: createForm.nombre.trim(),
      descripcion: (createForm.descripcion as string)?.trim() || undefined,
      margen: createForm.margen,
      descuento: createForm.descuento,
    })
    showCreateModal.value = false
    await load()
  } catch (err: unknown) {
    createError.value = err instanceof Error ? err.message : "Error al crear categoría."
  } finally {
    isSaving.value = false
  }
}

// ── Modal Editar ───────────────────────────────────────────────────────────────

const showEditModal = ref(false)
const isEditSaving = ref(false)
const editError = ref("")
const editingCategoria = ref<CategoriaProducto | null>(null)
const editForm = reactive<UpdateCategoriaProductoRequest>({ nombre: "", descripcion: undefined, margen: 0, descuento: 0, isActive: true })

function openEdit(cat: CategoriaProducto) {
  editingCategoria.value = cat
  Object.assign(editForm, { nombre: cat.nombre, descripcion: cat.descripcion ?? "", margen: cat.margen, descuento: cat.descuento, isActive: cat.isActive })
  editError.value = ""
  showEditModal.value = true
}

async function submitEdit() {
  editError.value = ""
  if (!editForm.nombre.trim()) { editError.value = "El nombre es obligatorio."; return }
  if (!editingCategoria.value) return
  isEditSaving.value = true
  try {
    await updateCategoria(editingCategoria.value.id, {
      nombre: editForm.nombre.trim(),
      descripcion: (editForm.descripcion as string)?.trim() || undefined,
      margen: editForm.margen,
      descuento: editForm.descuento,
      isActive: editForm.isActive,
    })
    showEditModal.value = false
    await load()
  } catch (err: unknown) {
    editError.value = err instanceof Error ? err.message : "Error al actualizar categoría."
  } finally {
    isEditSaving.value = false
  }
}

// ── Modal Desactivar ───────────────────────────────────────────────────────────

const showDeactivateModal = ref(false)
const isDeactivating = ref(false)
const deactivateError = ref("")
const deactivatingCategoria = ref<CategoriaProducto | null>(null)

function openDeactivate(cat: CategoriaProducto) {
  deactivatingCategoria.value = cat
  deactivateError.value = ""
  showDeactivateModal.value = true
}

async function confirmDeactivate() {
  if (!deactivatingCategoria.value) return
  isDeactivating.value = true
  deactivateError.value = ""
  try {
    await deactivateCategoria(deactivatingCategoria.value.id)
    showDeactivateModal.value = false
    await load()
  } catch (err: unknown) {
    deactivateError.value = err instanceof Error ? err.message : "Error al desactivar categoría."
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
            <h1 class="text-4xl font-extrabold tracking-tight mb-2" style="color: var(--color-on-surface)">Categorías de Producto</h1>
            <p class="font-medium" style="color: var(--color-on-surface-variant)">
              {{ categorias.filter(c => c.isActive).length }} categoría{{ categorias.filter(c => c.isActive).length !== 1 ? "s" : "" }} activa{{ categorias.filter(c => c.isActive).length !== 1 ? "s" : "" }}
            </p>
          </div>
          <BaseButton v-if="canManage" variant="primary" size="lg" @click="openCreate">
            <span class="material-symbols-outlined" style="font-size: 20px">add</span>
            Nueva Categoría
          </BaseButton>
        </div>

        <!-- Filtros -->
        <div class="flex items-center gap-3 mb-6 flex-wrap">
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
        <BaseTable :columns="columns" :items="categoriasFiltradas" :loading="isLoading"
          empty-text="No hay categorías registradas.">

          <template #nombre="{ item }">
            <div class="flex items-center gap-3">
              <div class="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                style="background-color: var(--color-primary-container)">
                <span class="material-symbols-outlined" style="font-size: 18px; color: white">label</span>
              </div>
              <span class="text-sm font-semibold" style="color: var(--color-on-surface)">{{ item.nombre }}</span>
            </div>
          </template>

          <template #descripcion="{ item }">
            <span class="text-sm" style="color: var(--color-on-surface-variant)">
              {{ item.descripcion ?? "—" }}
            </span>
          </template>

          <template #descuento="{ item }">
            <span
              class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold"
              :style="item.descuento > 0
                ? 'background-color: #FEF3C7; color: #92400E'
                : 'background-color: var(--color-surface-container-high); color: var(--color-outline)'"
            >
              <span class="material-symbols-outlined" style="font-size: 13px">percent</span>
              {{ item.descuento > 0 ? item.descuento + "%" : "Sin descuento" }}
            </span>
          </template>

          <template #productos="{ item }">
            <span
              class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold"
              style="background-color: var(--color-surface-container-high); color: var(--color-on-surface-variant)"
            >
              <span class="material-symbols-outlined" style="font-size: 14px">inventory_2</span>
              {{ item.totalProductos }}
            </span>
          </template>

          <template #estado="{ item }">
            <span
              class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold"
              :style="item.isActive
                ? 'background-color: #dcfce7; color: #166534'
                : 'background-color: var(--color-surface-container-high); color: var(--color-outline)'"
            >{{ item.isActive ? "Activa" : "Inactiva" }}</span>
          </template>

          <template #acciones="{ item }">
            <div class="flex justify-end">
              <RowContextMenu :items="menuItems(item)" />
            </div>
          </template>
        </BaseTable>

      </div>
    </main>

    <!-- ── MODAL CREAR ───────────────────────────────────────────────────────── -->
    <BaseModal :show="showCreateModal" title="Nueva Categoría" size="lg" @close="showCreateModal = false">
      <div v-if="createError" class="flex items-center gap-2 rounded-xl px-3 py-2.5 mb-4 text-sm font-medium"
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
          <input v-model="createForm.descripcion" type="text" placeholder="Opcional"
            class="w-full px-4 py-3 rounded-xl text-sm outline-none"
            style="border: 1px solid var(--color-outline-variant); color: var(--color-on-surface); background-color: var(--color-surface-container-low)" />
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-xs font-bold uppercase tracking-wider mb-1.5" style="color: var(--color-outline)">Margen (%)</label>
            <input v-model.number="createForm.margen" type="number" min="0" max="1000" step="0.01" placeholder="0"
              class="w-full px-4 py-3 rounded-xl text-sm outline-none"
              style="border: 1px solid var(--color-outline-variant); color: var(--color-on-surface); background-color: var(--color-surface-container-low)" />
            <p class="text-xs mt-1" style="color: var(--color-outline)">Ganancia sobre el precio de costo</p>
          </div>
          <div>
            <label class="block text-xs font-bold uppercase tracking-wider mb-1.5" style="color: var(--color-outline)">Descuento (%)</label>
            <input v-model.number="createForm.descuento" type="number" min="0" max="100" step="0.01" placeholder="0"
              class="w-full px-4 py-3 rounded-xl text-sm outline-none"
              style="border: 1px solid var(--color-outline-variant); color: var(--color-on-surface); background-color: var(--color-surface-container-low)" />
            <p class="text-xs mt-1" style="color: var(--color-outline)">Descuento aplicado en ventas</p>
          </div>
        </div>
      </div>

      <template #footer>
        <BaseButton variant="secondary" size="default" @click="showCreateModal = false">Cancelar</BaseButton>
        <BaseButton variant="primary" size="default" :disabled="isSaving" @click="submitCreate">
          {{ isSaving ? "Creando…" : "Crear Categoría" }}
        </BaseButton>
      </template>
    </BaseModal>

    <!-- ── MODAL EDITAR ──────────────────────────────────────────────────────── -->
    <BaseModal :show="showEditModal" title="Editar Categoría" size="lg" @close="showEditModal = false">
      <div v-if="editError" class="flex items-center gap-2 rounded-xl px-3 py-2.5 mb-4 text-sm font-medium"
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
          <input v-model="editForm.descripcion" type="text" placeholder="Opcional"
            class="w-full px-4 py-3 rounded-xl text-sm outline-none"
            style="border: 1px solid var(--color-outline-variant); color: var(--color-on-surface); background-color: var(--color-surface-container-low)" />
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-xs font-bold uppercase tracking-wider mb-1.5" style="color: var(--color-outline)">Margen (%)</label>
            <input v-model.number="editForm.margen" type="number" min="0" max="1000" step="0.01" placeholder="0"
              class="w-full px-4 py-3 rounded-xl text-sm outline-none"
              style="border: 1px solid var(--color-outline-variant); color: var(--color-on-surface); background-color: var(--color-surface-container-low)" />
            <p class="text-xs mt-1" style="color: var(--color-outline)">Ganancia sobre el precio de costo</p>
          </div>
          <div>
            <label class="block text-xs font-bold uppercase tracking-wider mb-1.5" style="color: var(--color-outline)">Descuento (%)</label>
            <input v-model.number="editForm.descuento" type="number" min="0" max="100" step="0.01" placeholder="0"
              class="w-full px-4 py-3 rounded-xl text-sm outline-none"
              style="border: 1px solid var(--color-outline-variant); color: var(--color-on-surface); background-color: var(--color-surface-container-low)" />
            <p class="text-xs mt-1" style="color: var(--color-outline)">Descuento aplicado en ventas</p>
          </div>
        </div>
        <div class="flex items-center gap-3 p-4 rounded-xl" style="background-color: var(--color-surface-container-low)">
          <input v-model="editForm.isActive" type="checkbox" id="editIsActive" class="w-4 h-4 rounded" />
          <label for="editIsActive" class="text-sm font-medium cursor-pointer" style="color: var(--color-on-surface)">
            Categoría activa
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
    <BaseModal :show="showDeactivateModal" title="Desactivar Categoría" size="sm" @close="showDeactivateModal = false">
      <div v-if="deactivateError" class="flex items-center gap-2 rounded-xl px-3 py-2.5 mb-4 text-sm font-medium"
        style="background-color: var(--color-error-container); color: var(--color-on-error-container)">
        <span class="material-symbols-outlined flex-shrink-0" style="font-size: 16px">error</span>
        {{ deactivateError }}
      </div>
      <p class="text-sm" style="color: var(--color-on-surface-variant)">
        ¿Desactivar la categoría
        <span class="font-semibold" style="color: var(--color-on-surface)">{{ deactivatingCategoria?.nombre }}</span>?
        Los productos asignados a ella no se verán afectados.
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
