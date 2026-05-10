<script setup lang="ts">
import { ref, computed, onMounted, reactive } from "vue"
import AppSidebar from "@/components/AppSidebar.vue"
import AppHeader from "@/components/AppHeader.vue"
import BaseButton from "@/components/BaseButton.vue"
import BaseModal from "@/components/BaseModal.vue"
import BaseTable from "@/components/BaseTable.vue"
import FilterTabs from "@/components/FilterTabs.vue"
import SearchInput from "@/components/SearchInput.vue"
import { useAuthStore } from "@/stores/auth"
import {
  type Producto,
  type CreateProductoRequest,
  type CreateMovimientoRequest,
  getProductos,
  createProducto,
  updateProducto,
  deactivateProducto,
  registrarMovimiento,
} from "@/services/inventarioService"

const auth = useAuthStore()
const canManage = computed(() => auth.hasPermission("gestionar_inventario"))

const CATEGORIAS = ["Marcos", "Lentes Oftálmicos", "Lentes de Contacto", "Soluciones", "Accesorios", "Otros"]

// ── Estado ────────────────────────────────────────────────────────────────────

const productos = ref<Producto[]>([])
const isLoading = ref(false)
const loadError = ref("")
const search = ref("")
const categoriaFilter = ref("")
const bajoStockFilter = ref(false)
const page = ref(1)
const totalPages = ref(1)
const totalCount = ref(0)

const categoriaTabs = [
  { value: "", label: "Todas" },
  ...CATEGORIAS.map((c) => ({ value: c, label: c })),
]

const columns = [
  { key: "nombre", label: "Producto" },
  { key: "categoria", label: "Categoría" },
  { key: "sku", label: "SKU" },
  { key: "precios", label: "Precios" },
  { key: "stock", label: "Stock" },
  { key: "acciones", label: "Acciones", align: "right" as const },
]

async function loadProductos() {
  isLoading.value = true
  loadError.value = ""
  try {
    const result = await getProductos({
      page: page.value,
      pageSize: 20,
      search: search.value || undefined,
      categoria: categoriaFilter.value || undefined,
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

onMounted(loadProductos)

function onSearch(val: string) {
  search.value = val
  page.value = 1
  loadProductos()
}

function onCategoriaChange(val: string) {
  categoriaFilter.value = val
  page.value = 1
  loadProductos()
}

function toggleBajoStock() {
  bajoStockFilter.value = !bajoStockFilter.value
  page.value = 1
  loadProductos()
}

// ── Formato ───────────────────────────────────────────────────────────────────

function formatPrice(n: number) {
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(n)
}

// ── Modal Crear ───────────────────────────────────────────────────────────────

const showCreateModal = ref(false)
const isSaving = ref(false)
const createError = ref("")
const createForm = reactive<CreateProductoRequest>({
  nombre: "", categoria: "", sku: "", precioCosto: 0, precioVenta: 0,
  stockActual: 0, stockMinimo: 0,
})

function openCreate() {
  Object.assign(createForm, {
    nombre: "", categoria: CATEGORIAS[0], sku: "", precioCosto: 0,
    precioVenta: 0, stockActual: 0, stockMinimo: 0,
  })
  createError.value = ""
  showCreateModal.value = true
}

async function submitCreate() {
  isSaving.value = true
  createError.value = ""
  try {
    await createProducto({ ...createForm, sku: createForm.sku?.trim() || undefined })
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
  nombre: "", categoria: "", sku: "", precioCosto: 0, precioVenta: 0, stockMinimo: 0,
})

function openEdit(p: Producto) {
  selectedProducto.value = p
  Object.assign(editForm, {
    nombre: p.nombre, categoria: p.categoria, sku: p.sku ?? "",
    precioCosto: p.precioCosto, precioVenta: p.precioVenta, stockMinimo: p.stockMinimo,
  })
  editError.value = ""
  showEditModal.value = true
}

async function submitEdit() {
  if (!selectedProducto.value) return
  isUpdating.value = true
  editError.value = ""
  try {
    await updateProducto(selectedProducto.value.id, {
      ...editForm,
      sku: editForm.sku?.trim() || undefined,
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
</script>

<template>
  <div class="min-h-screen" style="background-color: var(--color-background)">
    <AppSidebar />
    <AppHeader />

    <main style="margin-left: 280px; padding-top: 64px">
      <div class="p-8">
        <!-- Header -->
        <div class="flex items-start justify-between mb-8">
          <div>
            <h1 class="text-4xl font-extrabold tracking-tight mb-2">Productos</h1>
            <p class="text-sm font-medium" style="color: var(--color-outline)">
              {{ totalCount }} producto{{ totalCount !== 1 ? "s" : "" }} en inventario
            </p>
          </div>
          <BaseButton v-if="canManage" variant="primary" size="default" @click="openCreate">
            <span class="material-symbols-outlined" style="font-size: 18px">add</span>
            Nuevo Producto
          </BaseButton>
        </div>

        <!-- Filtros -->
        <div class="flex items-center gap-3 mb-4 flex-wrap">
          <SearchInput
            :model-value="search"
            placeholder="Buscar por nombre o SKU..."
            @update:model-value="onSearch"
          />
          <button
            @click="toggleBajoStock"
            class="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold transition-all"
            :style="
              bajoStockFilter
                ? 'background-color: #FEF3C7; color: #92400E;'
                : 'background-color: var(--color-surface-container-high); color: var(--color-on-surface-variant);'
            "
          >
            <span class="material-symbols-outlined" style="font-size: 16px">warning</span>
            Bajo stock
          </button>
        </div>

        <FilterTabs
          :model-value="categoriaFilter"
          :tabs="categoriaTabs"
          class="mb-6"
          @update:model-value="onCategoriaChange"
        />

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
              <div>
                <p class="text-sm font-semibold" style="color: var(--color-on-surface)">{{ item.nombre }}</p>
                <span
                  v-if="!item.isActive"
                  class="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"
                  style="background-color: var(--color-surface-container-highest); color: var(--color-outline)"
                >Inactivo</span>
              </div>
            </div>
          </template>

          <template #categoria="{ item }">
            <span class="text-sm" style="color: var(--color-on-surface-variant)">{{ item.categoria }}</span>
          </template>

          <template #sku="{ item }">
            <span class="text-sm font-mono" style="color: var(--color-outline)">{{ item.sku ?? "—" }}</span>
          </template>

          <template #precios="{ item }">
            <div class="flex flex-col gap-0.5">
              <span class="text-xs" style="color: var(--color-outline)">Costo: {{ formatPrice(item.precioCosto) }}</span>
              <span class="text-sm font-semibold" style="color: var(--color-on-surface)">Venta: {{ formatPrice(item.precioVenta) }}</span>
            </div>
          </template>

          <template #stock="{ item }">
            <div class="flex items-center gap-2">
              <span
                class="text-sm font-bold"
                :style="item.bajoStock ? 'color: #D97706' : 'color: var(--color-on-surface)'"
              >{{ item.stockActual }}</span>
              <span class="text-xs" style="color: var(--color-outline)">/ mín {{ item.stockMinimo }}</span>
              <span
                v-if="item.bajoStock"
                class="material-symbols-outlined"
                style="font-size: 16px; color: #D97706"
                title="Bajo stock"
              >warning</span>
            </div>
          </template>

          <template #acciones="{ item }">
            <div class="flex items-center justify-end gap-1.5">
              <button
                v-if="canManage && item.isActive"
                @click.stop="openMovimiento(item)"
                class="w-8 h-8 rounded-full flex items-center justify-center transition-colors hover:opacity-80"
                style="background-color: #dcfce7"
                title="Registrar movimiento de stock"
              >
                <span class="material-symbols-outlined" style="font-size: 16px; color: #16a34a">swap_horiz</span>
              </button>
              <button
                v-if="canManage"
                @click.stop="openEdit(item)"
                class="w-8 h-8 rounded-full flex items-center justify-center transition-colors hover:opacity-80"
                style="background-color: var(--color-surface-container-low)"
                title="Editar producto"
              >
                <span class="material-symbols-outlined" style="font-size: 16px; color: var(--color-on-surface-variant)">edit</span>
              </button>
              <button
                v-if="canManage && item.isActive"
                @click.stop="openDeactivate(item)"
                class="w-8 h-8 rounded-full flex items-center justify-center transition-colors hover:opacity-80"
                style="background-color: var(--color-error-container)"
                title="Desactivar producto"
              >
                <span class="material-symbols-outlined" style="font-size: 16px; color: var(--color-error)">delete</span>
              </button>
            </div>
          </template>
        </BaseTable>

        <!-- Paginación -->
        <div v-if="totalPages > 1" class="flex items-center justify-center gap-2 mt-6">
          <BaseButton variant="secondary" size="sm" :disabled="page === 1" @click="page--; loadProductos()">
            <span class="material-symbols-outlined" style="font-size: 18px">chevron_left</span>
          </BaseButton>
          <span class="text-sm font-medium" style="color: var(--color-on-surface-variant)">
            {{ page }} / {{ totalPages }}
          </span>
          <BaseButton variant="secondary" size="sm" :disabled="page === totalPages" @click="page++; loadProductos()">
            <span class="material-symbols-outlined" style="font-size: 18px">chevron_right</span>
          </BaseButton>
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
            <select v-model="createForm.categoria" class="w-full px-4 py-3 rounded-xl text-sm outline-none"
              style="border: 1px solid var(--color-outline-variant); color: var(--color-on-surface); background: var(--color-surface)">
              <option v-for="c in CATEGORIAS" :key="c" :value="c">{{ c }}</option>
            </select>
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
            <label class="block text-xs font-bold uppercase tracking-wider mb-1.5" style="color: var(--color-outline)">Precio de costo *</label>
            <input v-model.number="createForm.precioCosto" type="number" min="0" step="0.01" required
              class="w-full px-4 py-3 rounded-xl text-sm outline-none"
              style="border: 1px solid var(--color-outline-variant); color: var(--color-on-surface); background: var(--color-surface)" />
          </div>
          <div>
            <label class="block text-xs font-bold uppercase tracking-wider mb-1.5" style="color: var(--color-outline)">Precio de venta *</label>
            <input v-model.number="createForm.precioVenta" type="number" min="0" step="0.01" required
              class="w-full px-4 py-3 rounded-xl text-sm outline-none"
              style="border: 1px solid var(--color-outline-variant); color: var(--color-on-surface); background: var(--color-surface)" />
          </div>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-xs font-bold uppercase tracking-wider mb-1.5" style="color: var(--color-outline)">Stock inicial</label>
            <input v-model.number="createForm.stockActual" type="number" min="0" required
              class="w-full px-4 py-3 rounded-xl text-sm outline-none"
              style="border: 1px solid var(--color-outline-variant); color: var(--color-on-surface); background: var(--color-surface)" />
          </div>
          <div>
            <label class="block text-xs font-bold uppercase tracking-wider mb-1.5" style="color: var(--color-outline)">Stock mínimo</label>
            <input v-model.number="createForm.stockMinimo" type="number" min="0" required
              class="w-full px-4 py-3 rounded-xl text-sm outline-none"
              style="border: 1px solid var(--color-outline-variant); color: var(--color-on-surface); background: var(--color-surface)" />
          </div>
        </div>
      </form>

      <template #footer>
        <BaseButton class="flex-1" variant="secondary" size="default" @click="showCreateModal = false">Cancelar</BaseButton>
        <BaseButton class="flex-1" variant="primary" size="default" :disabled="isSaving" @click="submitCreate">
          <svg v-if="isSaving" class="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          {{ isSaving ? "Guardando..." : "Crear Producto" }}
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
            <select v-model="editForm.categoria" class="w-full px-4 py-3 rounded-xl text-sm outline-none"
              style="border: 1px solid var(--color-outline-variant); color: var(--color-on-surface); background: var(--color-surface)">
              <option v-for="c in CATEGORIAS" :key="c" :value="c">{{ c }}</option>
            </select>
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
            <label class="block text-xs font-bold uppercase tracking-wider mb-1.5" style="color: var(--color-outline)">Precio de costo *</label>
            <input v-model.number="editForm.precioCosto" type="number" min="0" step="0.01" required
              class="w-full px-4 py-3 rounded-xl text-sm outline-none"
              style="border: 1px solid var(--color-outline-variant); color: var(--color-on-surface); background: var(--color-surface)" />
          </div>
          <div>
            <label class="block text-xs font-bold uppercase tracking-wider mb-1.5" style="color: var(--color-outline)">Precio de venta *</label>
            <input v-model.number="editForm.precioVenta" type="number" min="0" step="0.01" required
              class="w-full px-4 py-3 rounded-xl text-sm outline-none"
              style="border: 1px solid var(--color-outline-variant); color: var(--color-on-surface); background: var(--color-surface)" />
          </div>
        </div>

        <div>
          <label class="block text-xs font-bold uppercase tracking-wider mb-1.5" style="color: var(--color-outline)">Stock mínimo</label>
          <input v-model.number="editForm.stockMinimo" type="number" min="0" required
            class="w-full px-4 py-3 rounded-xl text-sm outline-none"
            style="border: 1px solid var(--color-outline-variant); color: var(--color-on-surface); background: var(--color-surface)" />
        </div>
      </form>

      <template #footer>
        <BaseButton class="flex-1" variant="secondary" size="default" @click="showEditModal = false">Cancelar</BaseButton>
        <BaseButton class="flex-1" variant="primary" size="default" :disabled="isUpdating" @click="submitEdit">
          <svg v-if="isUpdating" class="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          {{ isUpdating ? "Guardando..." : "Guardar Cambios" }}
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
        <BaseButton class="flex-1" variant="secondary" size="default" @click="showMovModal = false">Cancelar</BaseButton>
        <BaseButton class="flex-1" variant="primary" size="default" :disabled="isMoving" @click="submitMovimiento">
          <svg v-if="isMoving" class="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          {{ isMoving ? "Registrando..." : "Confirmar" }}
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
        <BaseButton class="flex-1" variant="secondary" size="default" @click="showDeactivateModal = false">Cancelar</BaseButton>
        <BaseButton class="flex-1" variant="danger" size="default" :disabled="isDeactivating" @click="confirmDeactivate">
          <svg v-if="isDeactivating" class="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          {{ isDeactivating ? "Desactivando..." : "Desactivar" }}
        </BaseButton>
      </template>
    </BaseModal>
  </div>
</template>
