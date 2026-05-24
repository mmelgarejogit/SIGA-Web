<script setup lang="ts">
import { ref, computed, onMounted, reactive } from "vue"
import AppSidebar from "@/components/AppSidebar.vue"
import AppHeader from "@/components/AppHeader.vue"
import BaseButton from "@/components/BaseButton.vue"
import BaseModal from "@/components/BaseModal.vue"
import BaseTable from "@/components/BaseTable.vue"
import FilterChips from "@/components/FilterChips.vue"
import SearchInput from "@/components/SearchInput.vue"
import SearchableSelect from "@/components/SearchableSelect.vue"
import RowContextMenu, { type ContextMenuItem } from "@/components/RowContextMenu.vue"
import { useAuthStore } from "@/stores/auth"
import {
  type Producto,
  type CategoriaProducto,
  type Marca,
  type Modelo,
  type CreateProductoRequest,
  type CreateMovimientoRequest,
  getProductos,
  createProducto,
  updateProducto,
  deactivateProducto,
  registrarMovimiento,
  getCategorias,
  getMarcas,
  getModelos,
} from "@/services/inventarioService"

const auth = useAuthStore()
const canManage = computed(() => auth.hasPermission("gestionar_inventario"))

// ── Estado ────────────────────────────────────────────────────────────────────

const productos = ref<Producto[]>([])
const categoriasDisponibles = ref<CategoriaProducto[]>([])
const marcasDisponibles = ref<Marca[]>([])
const modelosDisponibles = ref<Modelo[]>([])
const isLoading = ref(false)
const loadError = ref("")
const search = ref("")
const categoriaFilter = ref<string[]>([])
const bajoStockFilter = ref(false)
const page = ref(1)
const totalPages = ref(1)
const totalCount = ref(0)

const categoriaOptions = computed(() =>
  categoriasDisponibles.value
    .filter((c) => c.isActive)
    .map((c) => ({ value: c.nombre, label: c.nombre })),
)

const marcaSelectOptions = computed(() =>
  marcasDisponibles.value.filter((m) => m.isActive).map((m) => ({ value: m.id, label: m.nombre })),
)

function modeloSelectOptions(marcaId: number | null) {
  if (!marcaId) return []
  return modelosDisponibles.value
    .filter((m) => m.marcaId === marcaId && m.isActive)
    .map((m) => ({ value: m.id, label: m.nombre }))
}

const columns = [
  { key: "nombre", label: "Producto" },
  { key: "categoria", label: "Categoría" },
  { key: "sku", label: "SKU" },
  { key: "estado", label: "Estado" },
  { key: "acciones", label: "" },
]

async function loadProductos() {
  isLoading.value = true
  loadError.value = ""
  try {
    const result = await getProductos({
      page: page.value,
      pageSize: 20,
      search: search.value || undefined,
      categoria: categoriaFilter.value[0] || undefined,
      bajoStock: bajoStockFilter.value || undefined,
    })
    productos.value = result.items
    totalPages.value = result.totalPages
    totalCount.value = result.totalCount
  } catch (err: unknown) {
    loadError.value = err instanceof Error ? err.message : "Error al cargar productos."
  } finally {
    isLoading.value = false
  }
}

onMounted(async () => {
  await Promise.all([
    loadProductos(),
    getCategorias().then((c) => (categoriasDisponibles.value = c)),
    getMarcas().then((m) => (marcasDisponibles.value = m)),
    getModelos().then((m) => (modelosDisponibles.value = m)),
  ])
})

function onSearch(val: string) {
  search.value = val
  page.value = 1
  loadProductos()
}

function onCategoriaChange(val: string[]) {
  categoriaFilter.value = val
  page.value = 1
  loadProductos()
}

function toggleBajoStock() {
  bajoStockFilter.value = !bajoStockFilter.value
  page.value = 1
  loadProductos()
}

// ── Modal Crear ───────────────────────────────────────────────────────────────

const showCreateModal = ref(false)
const isSaving = ref(false)
const createError = ref("")
const createForm = reactive({
  nombre: "", categoria: "", sku: "",
  marcaId: null as number | null, modeloId: null as number | null,
  color: "", talle: "", descripcion: "",
})

function onCreateMarcaChange() {
  createForm.modeloId = null
}

const createModelosOpts = computed(() =>
  createForm.marcaId
    ? modelosDisponibles.value.filter(m => m.marcaId === createForm.marcaId && m.isActive)
    : []
)

function openCreate() {
  const primeraActiva = categoriasDisponibles.value.find((c) => c.isActive)?.nombre ?? ""
  Object.assign(createForm, {
    nombre: "", categoria: primeraActiva, sku: "",
    marcaId: null, modeloId: null, color: "", talle: "", descripcion: "",
  })
  createError.value = ""
  showCreateModal.value = true
}

async function submitCreate() {
  isSaving.value = true
  createError.value = ""
  try {
    await createProducto({
      nombre: createForm.nombre, categoria: createForm.categoria,
      sku: createForm.sku?.trim() || undefined,
      precioCosto: 0, precioVenta: 0, stockActual: 0, stockMinimo: 0,
      marcaId: createForm.marcaId,
      modeloId: createForm.modeloId,
      color: createForm.color?.trim() || undefined,
      talle: createForm.talle?.trim() || undefined,
      descripcion: createForm.descripcion?.trim() || undefined,
    })
    showCreateModal.value = false
    await loadProductos()
  } catch (err: unknown) {
    createError.value = err instanceof Error ? err.message : "Error al crear producto."
  } finally {
    isSaving.value = false
  }
}

// ── Modal Editar ──────────────────────────────────────────────────────────────

const showEditModal = ref(false)
const selectedProducto = ref<Producto | null>(null)
const isUpdating = ref(false)
const editError = ref("")
const editForm = reactive({
  nombre: "", categoria: "", sku: "", isActive: true,
  marcaId: null as number | null, modeloId: null as number | null,
  color: "", talle: "", descripcion: "",
})

function onEditMarcaChange() {
  editForm.modeloId = null
}

const editModelosOpts = computed(() =>
  editForm.marcaId
    ? modelosDisponibles.value.filter(m => m.marcaId === editForm.marcaId && m.isActive)
    : []
)

function openEdit(p: Producto) {
  selectedProducto.value = p
  Object.assign(editForm, {
    nombre: p.nombre, categoria: p.categoria, sku: p.sku ?? "", isActive: p.isActive,
    marcaId: p.marcaId, modeloId: p.modeloId,
    color: p.color ?? "", talle: p.talle ?? "", descripcion: p.descripcion ?? "",
  })
  editError.value = ""
  showEditModal.value = true
}

async function submitEdit() {
  if (!selectedProducto.value) return
  isUpdating.value = true
  editError.value = ""
  try {
    const p = selectedProducto.value
    await updateProducto(p.id, {
      nombre: editForm.nombre, categoria: editForm.categoria,
      sku: editForm.sku?.trim() || undefined,
      precioCosto: p.precioCosto, precioVenta: p.precioVenta, stockMinimo: p.stockMinimo,
      isActive: editForm.isActive,
      marcaId: editForm.marcaId,
      modeloId: editForm.modeloId,
      color: editForm.color?.trim() || undefined,
      talle: editForm.talle?.trim() || undefined,
      descripcion: editForm.descripcion?.trim() || undefined,
    })
    showEditModal.value = false
    await loadProductos()
  } catch (err: unknown) {
    editError.value = err instanceof Error ? err.message : "Error al actualizar."
  } finally {
    isUpdating.value = false
  }
}

// ── Modal Movimiento ──────────────────────────────────────────────────────────

const showMovModal = ref(false)
const movProducto = ref<Producto | null>(null)
const isMoving = ref(false)
const movError = ref("")
const movForm = reactive<CreateMovimientoRequest>({
  tipo: "Entrada", cantidad: 1, motivo: "",
})

function openMovimiento(p: Producto) {
  movProducto.value = p
  Object.assign(movForm, { tipo: "Entrada", cantidad: 1, motivo: "" })
  movError.value = ""
  showMovModal.value = true
}

async function submitMovimiento() {
  if (!movProducto.value) return
  isMoving.value = true
  movError.value = ""
  try {
    await registrarMovimiento(movProducto.value.id, {
      ...movForm,
      motivo: movForm.motivo?.trim() || undefined,
    })
    showMovModal.value = false
    await loadProductos()
  } catch (err: unknown) {
    movError.value = err instanceof Error ? err.message : "Error al registrar movimiento."
  } finally {
    isMoving.value = false
  }
}

// ── Modal Desactivar ──────────────────────────────────────────────────────────

const showDeactivateModal = ref(false)
const productoToDeactivate = ref<Producto | null>(null)
const isDeactivating = ref(false)
const deactivateError = ref("")

function openDeactivate(p: Producto) {
  productoToDeactivate.value = p
  deactivateError.value = ""
  showDeactivateModal.value = true
}

async function confirmDeactivate() {
  if (!productoToDeactivate.value) return
  isDeactivating.value = true
  deactivateError.value = ""
  try {
    await deactivateProducto(productoToDeactivate.value.id)
    showDeactivateModal.value = false
    await loadProductos()
  } catch (err: unknown) {
    deactivateError.value = err instanceof Error ? err.message : "Error al desactivar."
  } finally {
    isDeactivating.value = false
  }
}

// ── Context menu ──────────────────────────────────────────────────────────────

function menuItems(p: Producto): ContextMenuItem[] {
  return [
    ...(canManage.value
      ? [{ type: "item" as const, label: "Editar", icon: "edit", action: () => openEdit(p) }]
      : []),
    ...(canManage.value && p.isActive
      ? [
          { type: "separator" as const },
          { type: "item" as const, label: "Desactivar", icon: "delete", action: () => openDeactivate(p), danger: true },
        ]
      : []),
  ]
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
            <h1 class="text-4xl font-extrabold tracking-tight mb-2">Productos</h1>
            <p class="font-medium" style="color: var(--color-on-surface-variant)">
              {{ totalCount }} producto{{ totalCount !== 1 ? "s" : "" }} en inventario
            </p>
          </div>
          <BaseButton v-if="canManage" variant="primary" size="lg" @click="openCreate">
            <span class="material-symbols-outlined" style="width:20px;height:20px;font-size:20px">add</span>
            Nuevo Producto
          </BaseButton>
        </div>

        <!-- Filtros -->
        <div class="flex items-center justify-between gap-4 mb-6 flex-wrap">
          <div class="flex items-center gap-3 flex-wrap">
            <FilterChips
              :model-value="categoriaFilter"
              :options="categoriaOptions"
              placeholder="Categoría"
              @update:model-value="onCategoriaChange"
            />
            <button
              @click="toggleBajoStock"
              class="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all"
              :style="
                bajoStockFilter
                  ? 'background-color: #FEF3C7; color: #92400E; border: 1px solid #FDE68A;'
                  : 'background-color: var(--color-surface); border: 1px solid var(--color-outline-variant); color: var(--color-on-surface);'
              "
            >
              <span class="material-symbols-outlined" style="font-size: 18px">warning</span>
              Bajo stock
            </button>
          </div>
          <SearchInput
            :model-value="search"
            placeholder="Buscar por nombre o SKU..."
            class="w-72"
            @update:model-value="onSearch"
          />
        </div>

        <!-- Error -->
        <div
          v-if="loadError"
          class="flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium mb-6"
          style="background-color: var(--color-error-container); color: var(--color-on-error-container)"
        >
          <span class="material-symbols-outlined" style="font-size: 18px">error</span>
          {{ loadError }}
        </div>

        <!-- Tabla -->
        <BaseTable
          :columns="columns"
          :items="productos"
          :loading="isLoading"
          empty-text="No hay productos en el inventario."
        >
          <template #nombre="{ item }">
            <div class="flex items-center gap-3">
              <div
                class="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                style="background-color: var(--color-surface-container-low)"
              >
                <span class="material-symbols-outlined" style="font-size: 18px; color: var(--color-primary)">inventory_2</span>
              </div>
              <p class="text-sm font-semibold" style="color: var(--color-on-surface)">{{ item.nombre }}</p>
            </div>
          </template>

          <template #categoria="{ item }">
            <span class="text-sm" style="color: var(--color-on-surface-variant)">{{ item.categoria }}</span>
          </template>

          <template #sku="{ item }">
            <span class="text-sm font-mono" style="color: var(--color-outline)">{{ item.sku ?? "—" }}</span>
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
            Mostrando {{ productos.length }} de {{ totalCount }} productos
          </p>
          <div v-if="totalPages > 1" class="flex gap-2">
            <BaseButton variant="secondary" size="sm" :disabled="page === 1" @click="page--; loadProductos()">Anterior</BaseButton>
            <BaseButton variant="secondary" size="sm" :disabled="page === totalPages" @click="page++; loadProductos()">Siguiente</BaseButton>
          </div>
        </div>
      </div>
    </main>

    <!-- MODAL CREAR -->
    <BaseModal :show="showCreateModal" title="Nuevo Producto" size="lg" @close="showCreateModal = false">
      <div
        v-if="createError"
        class="flex items-center gap-2 rounded-xl px-3 py-2.5 mb-4 text-sm font-medium"
        style="background-color: var(--color-error-container); color: var(--color-on-error-container)"
      >
        <span class="material-symbols-outlined flex-shrink-0" style="font-size: 16px">error</span>
        {{ createError }}
      </div>

      <form @submit.prevent="submitCreate" class="space-y-4">
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-xs font-bold uppercase tracking-wider mb-1.5" style="color: var(--color-outline)">Nombre *</label>
            <input v-model="createForm.nombre" type="text" required class="w-full px-4 py-3 rounded-xl text-sm outline-none"
              style="border: 1px solid var(--color-outline-variant); color: var(--color-on-surface); background: var(--color-surface)" />
          </div>
          <div>
            <label class="block text-xs font-bold uppercase tracking-wider mb-1.5" style="color: var(--color-outline)">Categoría *</label>
            <SearchableSelect
              :model-value="createForm.categoria || null"
              :options="categoriaOptions"
              placeholder="Seleccioná una categoría"
              @update:model-value="createForm.categoria = String($event ?? '')"
            />
          </div>
        </div>

        <div>
          <label class="block text-xs font-bold uppercase tracking-wider mb-1.5" style="color: var(--color-outline)">SKU / Código</label>
          <input v-model="createForm.sku" type="text" class="w-full px-4 py-3 rounded-xl text-sm outline-none"
            style="border: 1px solid var(--color-outline-variant); color: var(--color-on-surface); background: var(--color-surface)"
            placeholder="Opcional" />
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-xs font-bold uppercase tracking-wider mb-1.5" style="color: var(--color-outline)">Marca</label>
            <SearchableSelect
              :model-value="createForm.marcaId"
              :options="marcaSelectOptions"
              null-label="Sin marca"
              @update:model-value="createForm.marcaId = $event as number | null; onCreateMarcaChange()"
            />
          </div>
          <div>
            <label class="block text-xs font-bold uppercase tracking-wider mb-1.5" style="color: var(--color-outline)">Modelo</label>
            <SearchableSelect
              :model-value="createForm.modeloId"
              :options="modeloSelectOptions(createForm.marcaId)"
              null-label="Sin modelo"
              :disabled="!createForm.marcaId"
              @update:model-value="createForm.modeloId = $event as number | null"
            />
          </div>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-xs font-bold uppercase tracking-wider mb-1.5" style="color: var(--color-outline)">Color</label>
            <input v-model="createForm.color" type="text" placeholder="Opcional"
              class="w-full px-4 py-3 rounded-xl text-sm outline-none"
              style="border: 1px solid var(--color-outline-variant); color: var(--color-on-surface); background: var(--color-surface)" />
          </div>
          <div>
            <label class="block text-xs font-bold uppercase tracking-wider mb-1.5" style="color: var(--color-outline)">Talle</label>
            <input v-model="createForm.talle" type="text" placeholder="Ej: 58-14-135"
              class="w-full px-4 py-3 rounded-xl text-sm outline-none"
              style="border: 1px solid var(--color-outline-variant); color: var(--color-on-surface); background: var(--color-surface)" />
          </div>
        </div>

        <div>
          <label class="block text-xs font-bold uppercase tracking-wider mb-1.5" style="color: var(--color-outline)">Descripción</label>
          <textarea v-model="createForm.descripcion" rows="2" placeholder="Opcional"
            class="w-full px-4 py-3 rounded-xl text-sm outline-none resize-none"
            style="border: 1px solid var(--color-outline-variant); color: var(--color-on-surface); background: var(--color-surface)" />
        </div>

      </form>

      <template #footer>
        <BaseButton variant="secondary" @click="showCreateModal = false">Cancelar</BaseButton>
        <BaseButton variant="primary" :disabled="isSaving" @click="submitCreate">
          {{ isSaving ? "Guardando…" : "Crear Producto" }}
        </BaseButton>
      </template>
    </BaseModal>

    <!-- MODAL EDITAR -->
    <BaseModal :show="showEditModal" title="Editar Producto" size="lg" @close="showEditModal = false">
      <div
        v-if="editError"
        class="flex items-center gap-2 rounded-xl px-3 py-2.5 mb-4 text-sm font-medium"
        style="background-color: var(--color-error-container); color: var(--color-on-error-container)"
      >
        <span class="material-symbols-outlined flex-shrink-0" style="font-size: 16px">error</span>
        {{ editError }}
      </div>

      <form @submit.prevent="submitEdit" class="space-y-4">
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-xs font-bold uppercase tracking-wider mb-1.5" style="color: var(--color-outline)">Nombre *</label>
            <input v-model="editForm.nombre" type="text" required class="w-full px-4 py-3 rounded-xl text-sm outline-none"
              style="border: 1px solid var(--color-outline-variant); color: var(--color-on-surface); background: var(--color-surface)" />
          </div>
          <div>
            <label class="block text-xs font-bold uppercase tracking-wider mb-1.5" style="color: var(--color-outline)">Categoría *</label>
            <SearchableSelect
              :model-value="editForm.categoria || null"
              :options="categoriaOptions"
              placeholder="Seleccioná una categoría"
              @update:model-value="editForm.categoria = String($event ?? '')"
            />
          </div>
        </div>

        <div>
          <label class="block text-xs font-bold uppercase tracking-wider mb-1.5" style="color: var(--color-outline)">SKU / Código</label>
          <input v-model="editForm.sku" type="text" class="w-full px-4 py-3 rounded-xl text-sm outline-none"
            style="border: 1px solid var(--color-outline-variant); color: var(--color-on-surface); background: var(--color-surface)"
            placeholder="Opcional" />
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-xs font-bold uppercase tracking-wider mb-1.5" style="color: var(--color-outline)">Marca</label>
            <SearchableSelect
              :model-value="editForm.marcaId"
              :options="marcaSelectOptions"
              null-label="Sin marca"
              @update:model-value="editForm.marcaId = $event as number | null; onEditMarcaChange()"
            />
          </div>
          <div>
            <label class="block text-xs font-bold uppercase tracking-wider mb-1.5" style="color: var(--color-outline)">Modelo</label>
            <SearchableSelect
              :model-value="editForm.modeloId"
              :options="modeloSelectOptions(editForm.marcaId)"
              null-label="Sin modelo"
              :disabled="!editForm.marcaId"
              @update:model-value="editForm.modeloId = $event as number | null"
            />
          </div>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-xs font-bold uppercase tracking-wider mb-1.5" style="color: var(--color-outline)">Color</label>
            <input v-model="editForm.color" type="text" placeholder="Opcional"
              class="w-full px-4 py-3 rounded-xl text-sm outline-none"
              style="border: 1px solid var(--color-outline-variant); color: var(--color-on-surface); background: var(--color-surface)" />
          </div>
          <div>
            <label class="block text-xs font-bold uppercase tracking-wider mb-1.5" style="color: var(--color-outline)">Talle</label>
            <input v-model="editForm.talle" type="text" placeholder="Ej: 58-14-135"
              class="w-full px-4 py-3 rounded-xl text-sm outline-none"
              style="border: 1px solid var(--color-outline-variant); color: var(--color-on-surface); background: var(--color-surface)" />
          </div>
        </div>

        <div>
          <label class="block text-xs font-bold uppercase tracking-wider mb-1.5" style="color: var(--color-outline)">Descripción</label>
          <textarea v-model="editForm.descripcion" rows="2" placeholder="Opcional"
            class="w-full px-4 py-3 rounded-xl text-sm outline-none resize-none"
            style="border: 1px solid var(--color-outline-variant); color: var(--color-on-surface); background: var(--color-surface)" />
        </div>

        <div class="flex items-center gap-3 p-4 rounded-xl" style="background-color: var(--color-surface-container-low)">
          <input v-model="editForm.isActive" type="checkbox" id="editIsActive" class="w-4 h-4 rounded" />
          <label for="editIsActive" class="text-sm font-medium cursor-pointer" style="color: var(--color-on-surface)">
            Producto activo
          </label>
        </div>
      </form>

      <template #footer>
        <BaseButton variant="secondary" @click="showEditModal = false">Cancelar</BaseButton>
        <BaseButton variant="primary" :disabled="isUpdating" @click="submitEdit">
          {{ isUpdating ? "Guardando…" : "Guardar Cambios" }}
        </BaseButton>
      </template>
    </BaseModal>

    <!-- MODAL MOVIMIENTO -->
    <BaseModal :show="showMovModal" title="Registrar Movimiento" size="sm" @close="showMovModal = false">
      <p v-if="movProducto" class="text-sm font-semibold mb-4" style="color: var(--color-on-surface)">
        {{ movProducto.nombre }}
        <span class="font-normal ml-2" style="color: var(--color-outline)">Stock actual: {{ movProducto.stockActual }}</span>
      </p>

      <div
        v-if="movError"
        class="flex items-center gap-2 rounded-xl px-3 py-2.5 mb-4 text-sm font-medium"
        style="background-color: var(--color-error-container); color: var(--color-on-error-container)"
      >
        <span class="material-symbols-outlined flex-shrink-0" style="font-size: 16px">error</span>
        {{ movError }}
      </div>

      <div class="space-y-4">
        <div>
          <label class="block text-xs font-bold uppercase tracking-wider mb-1.5" style="color: var(--color-outline)">Tipo</label>
          <div class="flex gap-2">
            <button
              v-for="tipo in ['Entrada', 'Salida', 'Ajuste']"
              :key="tipo"
              @click="movForm.tipo = tipo as any"
              class="flex-1 py-2 rounded-xl text-sm font-semibold transition-all"
              :style="movForm.tipo === tipo
                ? 'background-color: var(--color-primary); color: white;'
                : 'background-color: var(--color-surface-container-low); color: var(--color-on-surface-variant); border: 1px solid var(--color-outline-variant);'"
            >{{ tipo }}</button>
          </div>
        </div>

        <div>
          <label class="block text-xs font-bold uppercase tracking-wider mb-1.5" style="color: var(--color-outline)">
            {{ movForm.tipo === "Ajuste" ? "Nuevo stock total" : "Cantidad" }}
          </label>
          <input v-model.number="movForm.cantidad" type="number" min="1" class="w-full px-4 py-3 rounded-xl text-sm outline-none"
            style="border: 1px solid var(--color-outline-variant); color: var(--color-on-surface); background: var(--color-surface)" />
        </div>

        <div>
          <label class="block text-xs font-bold uppercase tracking-wider mb-1.5" style="color: var(--color-outline)">Motivo</label>
          <input v-model="movForm.motivo" type="text" placeholder="Opcional"
            class="w-full px-4 py-3 rounded-xl text-sm outline-none"
            style="border: 1px solid var(--color-outline-variant); color: var(--color-on-surface); background: var(--color-surface)" />
        </div>
      </div>

      <template #footer>
        <BaseButton variant="secondary" @click="showMovModal = false">Cancelar</BaseButton>
        <BaseButton variant="primary" :disabled="isMoving" @click="submitMovimiento">
          {{ isMoving ? "Registrando…" : "Confirmar" }}
        </BaseButton>
      </template>
    </BaseModal>

    <!-- MODAL DESACTIVAR -->
    <BaseModal :show="showDeactivateModal" size="sm" @close="showDeactivateModal = false">
      <div class="text-center">
        <div class="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4"
          style="background-color: var(--color-error-container)">
          <span class="material-symbols-outlined" style="color: var(--color-error); font-size: 28px">delete</span>
        </div>
        <h3 class="text-lg font-extrabold mb-2" style="color: var(--color-on-surface)">Desactivar Producto</h3>
        <p class="text-sm" style="color: var(--color-on-surface-variant)">
          ¿Desactivar <strong style="color: var(--color-on-surface)">{{ productoToDeactivate?.nombre }}</strong>?
          El producto quedará oculto pero sus datos se conservarán.
        </p>
        <p v-if="deactivateError" class="mt-3 text-sm font-medium" style="color: var(--color-error)">{{ deactivateError }}</p>
      </div>
      <template #footer>
        <BaseButton variant="secondary" @click="showDeactivateModal = false">Cancelar</BaseButton>
        <BaseButton variant="danger" :disabled="isDeactivating" @click="confirmDeactivate">
          {{ isDeactivating ? "Desactivando…" : "Desactivar" }}
        </BaseButton>
      </template>
    </BaseModal>
  </div>
</template>
