<script setup lang="ts">
import { ref, computed, onMounted, reactive } from "vue"
import AppSidebar from "@/components/AppSidebar.vue"
import AppHeader from "@/components/AppHeader.vue"
import BaseButton from "@/components/BaseButton.vue"
import BaseModal from "@/components/BaseModal.vue"
import BaseTable from "@/components/BaseTable.vue"
import FilterChips from "@/components/FilterChips.vue"
import SearchInput from "@/components/SearchInput.vue"
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
  deleteCategoria,
} from "@/services/inventarioService"

const auth = useAuthStore()
const canManage = auth.hasPermission("gestionar_inventario")

// ── Estado ─────────────────────────────────────────────────────────────────────

const categorias = ref<CategoriaProducto[]>([])
const isLoading = ref(false)
const loadError = ref("")
const estadoFilter = ref<string[]>([])
const searchQuery = ref("")

const estadoOptions = [
  { value: "activa",   label: "Activas",   dot: "var(--color-success)" },
  { value: "inactiva", label: "Inactivas", dot: "var(--color-outline)" },
]

// "Cristal" quedó obsoleto: los lentes ya no son productos con stock. Se conserva el badge
// (tipoStyle) para categorías legacy, pero no se ofrece al dar de alta/editar categorías.
const TIPO_OPTIONS = [
  { value: "Generico", label: "Genérico" },
  { value: "Armazon",  label: "Armazón" },
] as const

const tipoLabel = (t: string) => TIPO_OPTIONS.find(o => o.value === t)?.label ?? t
const tipoStyle = (t: string) =>
  t === "Armazon" ? "background-color: color-mix(in srgb, var(--color-primary) 10%, transparent); color: var(--color-primary)"
  : t === "Cristal" ? "background-color: rgba(0,103,128,0.10); color: var(--color-secondary)"
  : "background-color: var(--color-surface-container-high); color: var(--color-outline)"

// ── Paginación ─────────────────────────────────────────────────────────────────

const PAGE_SIZE = 10
const currentPage = ref(1)

const categoriasFiltradas = computed(() => {
  currentPage.value = 1
  let result = categorias.value

  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase()
    result = result.filter((c) =>
      c.nombre.toLowerCase().includes(q) || c.descripcion?.toLowerCase().includes(q)
    )
  }

  if (estadoFilter.value.length > 0) {
    const soloActivas   = estadoFilter.value.includes("activa")
    const soloInactivas = estadoFilter.value.includes("inactiva")
    if (soloActivas && !soloInactivas) result = result.filter((c) => c.isActive)
    if (soloInactivas && !soloActivas) result = result.filter((c) => !c.isActive)
  }

  return result
})

const categoriasPaginadas = computed(() => {
  const start = (currentPage.value - 1) * PAGE_SIZE
  return categoriasFiltradas.value.slice(start, start + PAGE_SIZE)
})

const totalCount = computed(() => categoriasFiltradas.value.length)
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

const columns = [
  { key: "nombre",      label: "Nombre" },
  { key: "tipo",        label: "Tipo" },
  { key: "descripcion", label: "Descripción" },
  { key: "descuento",   label: "Descuento" },
  { key: "productos",   label: "Productos" },
  { key: "estado",      label: "Estado" },
  { key: "acciones",    label: "", align: "right" as const },
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
          { type: "item" as const, label: "Desactivar", icon: "block", action: () => openDeactivate(cat), danger: true },
        ]
      : []),
    ...(canManage && !cat.isActive
      ? [
          { type: "separator" as const },
          { type: "item" as const, label: "Activar", icon: "check_circle", action: () => openActivate(cat) },
        ]
      : []),
    ...(canManage
      ? [
          { type: "separator" as const },
          { type: "item" as const, label: "Eliminar", icon: "delete_forever", action: () => openDelete(cat), danger: true },
        ]
      : []),
  ]
}

// ── Modal Crear ────────────────────────────────────────────────────────────────

const showCreateModal = ref(false)
const isSaving = ref(false)
const createError = ref("")
const createForm = reactive<CreateCategoriaProductoRequest>({ nombre: "", descripcion: undefined, tipo: "Generico", margen: 0, descuento: 0 })

function openCreate() {
  Object.assign(createForm, { nombre: "", descripcion: "", tipo: "Generico", margen: 0, descuento: 0 })
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
      tipo: createForm.tipo,
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
const editForm = reactive<UpdateCategoriaProductoRequest>({ nombre: "", descripcion: undefined, tipo: "Generico", margen: 0, descuento: 0, isActive: true })

function openEdit(cat: CategoriaProducto) {
  editingCategoria.value = cat
  Object.assign(editForm, { nombre: cat.nombre, descripcion: cat.descripcion ?? "", tipo: cat.tipo, margen: cat.margen, descuento: cat.descuento, isActive: cat.isActive })
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
      tipo: editForm.tipo,
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

// ── Modal Eliminar (permanente) ──────────────────────────────────────────────

const showDeleteModal = ref(false)
const isDeleting = ref(false)
const deleteError = ref("")
const deletingCategoria = ref<CategoriaProducto | null>(null)

function openDelete(cat: CategoriaProducto) {
  deletingCategoria.value = cat
  deleteError.value = ""
  showDeleteModal.value = true
}

async function confirmDelete() {
  if (!deletingCategoria.value) return
  isDeleting.value = true
  deleteError.value = ""
  try {
    await deleteCategoria(deletingCategoria.value.id)
    showDeleteModal.value = false
    await load()
  } catch (err: unknown) {
    deleteError.value = err instanceof Error ? err.message : "Error al eliminar categoría."
  } finally {
    isDeleting.value = false
  }
}

// ── Modal Activar ──────────────────────────────────────────────────────────────

const showActivateModal = ref(false)
const isActivating = ref(false)
const activateError = ref("")
const activatingCategoria = ref<CategoriaProducto | null>(null)

function openActivate(cat: CategoriaProducto) {
  activatingCategoria.value = cat
  activateError.value = ""
  showActivateModal.value = true
}

async function confirmActivate() {
  if (!activatingCategoria.value) return
  isActivating.value = true
  activateError.value = ""
  try {
    const cat = activatingCategoria.value
    await updateCategoria(cat.id, {
      nombre: cat.nombre,
      descripcion: cat.descripcion ?? undefined,
      tipo: cat.tipo,
      margen: cat.margen,
      descuento: cat.descuento,
      isActive: true,
    })
    showActivateModal.value = false
    await load()
  } catch (err: unknown) {
    activateError.value = err instanceof Error ? err.message : "Error al activar categoría."
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
      <div class="p-4 sm:p-6 lg:p-8">

        <!-- Header -->
        <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-8">
          <div>
            <h1 class="text-4xl font-extrabold tracking-tight mb-2">Categorías de Producto</h1>
            <p class="font-medium" style="color: var(--color-on-surface-variant)">
              {{ categorias.filter(c => c.isActive).length }} categoría{{ categorias.filter(c => c.isActive).length !== 1 ? "s" : "" }} activa{{ categorias.filter(c => c.isActive).length !== 1 ? "s" : "" }}
            </p>
          </div>
          <BaseButton v-if="canManage" variant="primary" size="lg" @click="openCreate">
            <span class="material-symbols-outlined" style="width:20px;height:20px;font-size:20px">add</span>
            Nueva Categoría
          </BaseButton>
        </div>

        <!-- Filtros -->
        <div class="flex items-center justify-between gap-4 mb-8 flex-wrap">
          <FilterChips
            :model-value="estadoFilter"
            :options="estadoOptions"
            placeholder="Estado"
            @update:model-value="estadoFilter = $event"
          />
          <SearchInput v-model="searchQuery" placeholder="Buscar por nombre..." />
        </div>

        <!-- Error -->
        <div v-if="loadError" class="flex items-center gap-2.5 rounded-2xl px-4 py-3 text-sm font-medium mb-6"
          style="background-color: var(--color-error-container); color: var(--color-on-error-container)">
          <span class="material-symbols-outlined" style="font-size: 18px">error</span>
          {{ loadError }}
        </div>

        <!-- Tabla -->
        <div class="rounded-2xl overflow-hidden" style="background-color: var(--color-surface-container-lowest); box-shadow: var(--shadow-sm); outline: 1px solid var(--color-hairline);">
          <BaseTable :columns="columns" :items="categoriasPaginadas" :loading="isLoading"
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

            <template #tipo="{ item }">
              <span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold" :style="tipoStyle(item.tipo)">
                {{ tipoLabel(item.tipo) }}
              </span>
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
                  ? 'background-color: var(--color-warning-container); color: var(--color-on-warning-container)'
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
                class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider"
                :style="`background-color: ${statusStyle(item.isActive).bg}; color: ${statusStyle(item.isActive).text};`"
              >
                <span class="w-1.5 h-1.5 rounded-full" :style="`background-color: ${statusStyle(item.isActive).dot};`"></span>
                {{ item.isActive ? "Activa" : "Inactiva" }}
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
            v-if="categoriasPaginadas.length > 0"
            class="px-6 py-4 flex items-center justify-between flex-wrap gap-4"
            style="border-top: 1px solid var(--color-hairline-soft); background-color: var(--color-surface-container-lowest);"
          >
            <span class="text-sm" style="color: var(--color-on-surface-variant)">
              Mostrando
              <strong style="color: var(--color-on-surface)">{{ rangeStart }}–{{ rangeEnd }}</strong>
              de
              <strong style="color: var(--color-on-surface)">{{ totalCount }}</strong>
              categorías
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
    <BaseModal :show="showCreateModal" title="Nueva Categoría" size="lg" @close="showCreateModal = false">
      <div v-if="createError" class="flex items-center gap-2.5 rounded-2xl px-4 py-3 mb-4 text-sm font-medium"
        style="background-color: var(--color-error-container); color: var(--color-on-error-container)">
        <span class="material-symbols-outlined flex-shrink-0" style="font-size: 18px">error</span>
        {{ createError }}
      </div>

      <div class="space-y-5">
        <div class="flex flex-col gap-1.5">
          <label class="text-xs font-bold uppercase tracking-wider" style="color: var(--color-outline)">Nombre *</label>
          <input v-model="createForm.nombre" type="text" class="px-4 h-12 text-sm outline-none appearance-none shadow-none transition-all"
            :style="inputStyle(false)" />
        </div>
        <div class="flex flex-col gap-1.5">
          <label class="text-xs font-bold uppercase tracking-wider" style="color: var(--color-outline)">Tipo *</label>
          <select v-model="createForm.tipo" class="px-4 h-12 text-sm outline-none appearance-none shadow-none transition-all"
            :style="inputStyle(false)">
            <option v-for="o in TIPO_OPTIONS" :key="o.value" :value="o.value">{{ o.label }}</option>
          </select>
          <p class="text-xs" style="color: var(--color-outline)">El tipo Armazón habilita el producto en el flujo de venta a pedido.</p>
        </div>
        <div class="flex flex-col gap-1.5">
          <label class="text-xs font-bold uppercase tracking-wider" style="color: var(--color-outline)">Descripción</label>
          <input v-model="createForm.descripcion" type="text" placeholder="Opcional"
            class="px-4 h-12 text-sm outline-none appearance-none shadow-none transition-all"
            :style="inputStyle(false)" />
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div class="flex flex-col gap-1.5">
            <label class="text-xs font-bold uppercase tracking-wider" style="color: var(--color-outline)">Margen (%)</label>
            <input v-model.number="createForm.margen" type="number" min="0" max="1000" step="0.01" placeholder="0"
              class="px-4 h-12 text-sm outline-none appearance-none shadow-none transition-all"
              :style="inputStyle(false)" />
            <p class="text-xs" style="color: var(--color-outline)">Ganancia sobre el precio de costo</p>
          </div>
          <div class="flex flex-col gap-1.5">
            <label class="text-xs font-bold uppercase tracking-wider" style="color: var(--color-outline)">Descuento (%)</label>
            <input v-model.number="createForm.descuento" type="number" min="0" max="100" step="0.01" placeholder="0"
              class="px-4 h-12 text-sm outline-none appearance-none shadow-none transition-all"
              :style="inputStyle(false)" />
            <p class="text-xs" style="color: var(--color-outline)">Descuento aplicado en ventas</p>
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
      <div v-if="editError" class="flex items-center gap-2.5 rounded-2xl px-4 py-3 mb-4 text-sm font-medium"
        style="background-color: var(--color-error-container); color: var(--color-on-error-container)">
        <span class="material-symbols-outlined flex-shrink-0" style="font-size: 18px">error</span>
        {{ editError }}
      </div>

      <div class="space-y-5">
        <div class="flex flex-col gap-1.5">
          <label class="text-xs font-bold uppercase tracking-wider" style="color: var(--color-outline)">Nombre *</label>
          <input v-model="editForm.nombre" type="text" class="px-4 h-12 text-sm outline-none appearance-none shadow-none transition-all"
            :style="inputStyle(false)" />
        </div>
        <div class="flex flex-col gap-1.5">
          <label class="text-xs font-bold uppercase tracking-wider" style="color: var(--color-outline)">Tipo *</label>
          <select v-model="editForm.tipo" class="px-4 h-12 text-sm outline-none appearance-none shadow-none transition-all"
            :style="inputStyle(false)">
            <option v-for="o in TIPO_OPTIONS" :key="o.value" :value="o.value">{{ o.label }}</option>
          </select>
          <p class="text-xs" style="color: var(--color-outline)">El tipo Armazón habilita el producto en el flujo de venta a pedido.</p>
        </div>
        <div class="flex flex-col gap-1.5">
          <label class="text-xs font-bold uppercase tracking-wider" style="color: var(--color-outline)">Descripción</label>
          <input v-model="editForm.descripcion" type="text" placeholder="Opcional"
            class="px-4 h-12 text-sm outline-none appearance-none shadow-none transition-all"
            :style="inputStyle(false)" />
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div class="flex flex-col gap-1.5">
            <label class="text-xs font-bold uppercase tracking-wider" style="color: var(--color-outline)">Margen (%)</label>
            <input v-model.number="editForm.margen" type="number" min="0" max="1000" step="0.01" placeholder="0"
              class="px-4 h-12 text-sm outline-none appearance-none shadow-none transition-all"
              :style="inputStyle(false)" />
            <p class="text-xs" style="color: var(--color-outline)">Ganancia sobre el precio de costo</p>
          </div>
          <div class="flex flex-col gap-1.5">
            <label class="text-xs font-bold uppercase tracking-wider" style="color: var(--color-outline)">Descuento (%)</label>
            <input v-model.number="editForm.descuento" type="number" min="0" max="100" step="0.01" placeholder="0"
              class="px-4 h-12 text-sm outline-none appearance-none shadow-none transition-all"
              :style="inputStyle(false)" />
            <p class="text-xs" style="color: var(--color-outline)">Descuento aplicado en ventas</p>
          </div>
        </div>
        <div class="flex items-center justify-between px-4 py-3"
             style="border-radius: 12px; background-color: var(--color-surface-container-low)">
          <span class="text-sm font-semibold" style="color: var(--color-on-surface-variant)">Estado</span>
          <span
            class="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold uppercase tracking-wider"
            :style="`border-radius: 6px; background-color: ${statusStyle(editForm.isActive).bg}; color: ${statusStyle(editForm.isActive).text};`"
          >
            <span class="w-1.5 h-1.5" :style="`border-radius: 2px; background-color: ${statusStyle(editForm.isActive).dot};`"></span>
            {{ editForm.isActive ? "Activa" : "Inactiva" }}
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
    <BaseModal :show="showDeactivateModal" title="Desactivar Categoría" size="sm" @close="showDeactivateModal = false">
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
          ¿Desactivar la categoría <strong style="color: var(--color-on-surface)">{{ deactivatingCategoria?.nombre }}</strong>?
          Los productos asignados a ella no se verán afectados.
        </p>
      </div>
      <template #footer>
        <BaseButton variant="secondary" size="default" class="flex-1" @click="showDeactivateModal = false">Cancelar</BaseButton>
        <BaseButton variant="danger" size="default" class="flex-1" :disabled="isDeactivating" @click="confirmDeactivate">
          {{ isDeactivating ? "Desactivando…" : "Desactivar" }}
        </BaseButton>
      </template>
    </BaseModal>

    <!-- ── MODAL ELIMINAR (permanente) ───────────────────────────────────────── -->
    <BaseModal :show="showDeleteModal" title="Eliminar Categoría" size="sm" @close="showDeleteModal = false">
      <div v-if="deleteError" class="flex items-center gap-2.5 rounded-2xl px-4 py-3 mb-4 text-sm font-medium"
        style="background-color: var(--color-error-container); color: var(--color-on-error-container)">
        <span class="material-symbols-outlined flex-shrink-0" style="font-size: 18px">error</span>
        {{ deleteError }}
      </div>
      <div class="text-center">
        <div class="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-5"
             style="background-color: var(--color-error-container)">
          <span class="material-symbols-outlined" style="color: var(--color-error); font-size: 28px">delete_forever</span>
        </div>
        <p class="text-sm" style="color: var(--color-on-surface-variant)">
          ¿Eliminar definitivamente la categoría <strong style="color: var(--color-on-surface)">{{ deletingCategoria?.nombre }}</strong>?
          Esta acción no se puede deshacer. Si tiene productos asignados, desactivala en su lugar.
        </p>
      </div>
      <template #footer>
        <BaseButton variant="secondary" size="default" class="flex-1" @click="showDeleteModal = false">Cancelar</BaseButton>
        <BaseButton variant="danger" size="default" class="flex-1" :disabled="isDeleting" @click="confirmDelete">
          {{ isDeleting ? "Eliminando…" : "Eliminar" }}
        </BaseButton>
      </template>
    </BaseModal>

    <!-- ── MODAL ACTIVAR ─────────────────────────────────────────────────────── -->
    <BaseModal :show="showActivateModal" title="Activar Categoría" size="sm" @close="showActivateModal = false">
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
          ¿Activar la categoría <strong style="color: var(--color-on-surface)">{{ activatingCategoria?.nombre }}</strong>?
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
