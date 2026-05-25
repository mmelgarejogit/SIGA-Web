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
  type Producto,
  type CategoriaProducto,
  type CreateMovimientoRequest,
  getProductos,
  getCategorias,
  updateStockInfo,
  registrarMovimiento,
} from "@/services/inventarioService"

const auth = useAuthStore()
const canManage = computed(() => auth.hasPermission("gestionar_inventario"))
const API_BASE = import.meta.env.VITE_API_URL ?? ""

// ── Estado ────────────────────────────────────────────────────────────────────

const productos = ref<Producto[]>([])
const categoriasDisponibles = ref<CategoriaProducto[]>([])
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

const columns = [
  { key: "producto", label: "Producto" },
  { key: "precios", label: "Precios" },
  { key: "stock", label: "Stock actual" },
  { key: "minimo", label: "Stock mín." },
  { key: "estado", label: "Estado" },
  { key: "acciones", label: "", align: "right" as const },
]

async function load() {
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
    loadError.value = err instanceof Error ? err.message : "Error al cargar stock."
  } finally {
    isLoading.value = false
  }
}

onMounted(async () => {
  await Promise.all([
    load(),
    getCategorias().then((c) => (categoriasDisponibles.value = c)),
  ])
})

function onSearch(val: string) { search.value = val; page.value = 1; load() }
function onCategoriaChange(val: string[]) { categoriaFilter.value = val; page.value = 1; load() }
function toggleBajoStock() { bajoStockFilter.value = !bajoStockFilter.value; page.value = 1; load() }

// ── Modal Editar Precios/Stock ─────────────────────────────────────────────────

const showEditModal = ref(false)
const editingProducto = ref<Producto | null>(null)
const isEditSaving = ref(false)
const editError = ref("")
const editForm = reactive({ precioCosto: 0, stockMinimo: 0 })

const categoriaDelProducto = computed(() =>
  categoriasDisponibles.value.find((c) => c.nombre === editingProducto.value?.categoria),
)

const precioVentaCalculado = computed(() => {
  const margen = categoriaDelProducto.value?.margen ?? 0
  if (margen <= 0) return null
  return Math.round(editForm.precioCosto * (1 + margen / 100) * 100) / 100
})

function openEdit(p: Producto) {
  editingProducto.value = p
  Object.assign(editForm, { precioCosto: p.precioCosto, stockMinimo: p.stockMinimo })
  editError.value = ""
  showEditModal.value = true
}

async function submitEdit() {
  if (!editingProducto.value) return
  isEditSaving.value = true
  editError.value = ""
  try {
    await updateStockInfo(editingProducto.value.id, {
      precioCosto: editForm.precioCosto,
      stockMinimo: editForm.stockMinimo,
    })
    showEditModal.value = false
    await load()
  } catch (err: unknown) {
    editError.value = err instanceof Error ? err.message : "Error al actualizar."
  } finally {
    isEditSaving.value = false
  }
}

// ── Modal Movimiento ──────────────────────────────────────────────────────────

const showMovModal = ref(false)
const movProducto = ref<Producto | null>(null)
const isMoving = ref(false)
const movError = ref("")
const movForm = reactive<CreateMovimientoRequest>({ tipo: "Entrada", cantidad: 1, motivo: "" })

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
    await load()
  } catch (err: unknown) {
    movError.value = err instanceof Error ? err.message : "Error al registrar movimiento."
  } finally {
    isMoving.value = false
  }
}

// ── Context menu ──────────────────────────────────────────────────────────────

function menuItems(p: Producto): ContextMenuItem[] {
  if (!canManage.value) return []
  return [
    { type: "item", label: "Registrar movimiento", icon: "swap_horiz", action: () => openMovimiento(p) },
    { type: "separator" },
    { type: "item", label: "Editar precios", icon: "edit", action: () => openEdit(p) },
  ]
}

function formatGs(n: number) {
  return n.toLocaleString("es-PY")
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
            <h1 class="text-4xl font-extrabold tracking-tight mb-2">Stock</h1>
            <p class="font-medium" style="color: var(--color-on-surface-variant)">
              {{ totalCount }} producto{{ totalCount !== 1 ? "s" : "" }} en inventario
            </p>
          </div>
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
              :style="bajoStockFilter
                ? 'background-color: #FEF3C7; color: #92400E; border: 1px solid #FDE68A;'
                : 'background-color: var(--color-surface); border: 1px solid var(--color-outline-variant); color: var(--color-on-surface);'"
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
        <div v-if="loadError" class="flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium mb-6"
          style="background-color: var(--color-error-container); color: var(--color-on-error-container)">
          <span class="material-symbols-outlined" style="font-size: 18px">error</span>
          {{ loadError }}
        </div>

        <!-- Tabla -->
        <BaseTable :columns="columns" :items="productos" :loading="isLoading" empty-text="No hay productos.">

          <template #producto="{ item }">
            <div class="flex items-center gap-3">
              <div class="w-9 h-9 rounded-xl overflow-hidden flex items-center justify-center flex-shrink-0"
                style="background-color: var(--color-surface-container-low)">
                <img v-if="item.imagenUrl" :src="API_BASE + item.imagenUrl" :alt="item.nombre"
                  class="w-full h-full object-cover" />
                <span v-else class="material-symbols-outlined" style="font-size: 18px; color: var(--color-primary)">inventory_2</span>
              </div>
              <div>
                <p class="text-sm font-semibold" style="color: var(--color-on-surface)">{{ item.nombre }}</p>
                <p class="text-xs" style="color: var(--color-outline)">{{ item.categoria }}</p>
              </div>
            </div>
          </template>

          <template #precios="{ item }">
            <div class="space-y-0.5">
              <p class="text-xs" style="color: var(--color-outline)">
                Costo: <span class="font-semibold" style="color: var(--color-on-surface)">{{ formatGs(item.precioCosto) }}</span>
              </p>
              <p class="text-xs" style="color: var(--color-outline)">
                Venta: <span class="font-semibold" style="color: var(--color-primary)">{{ formatGs(item.precioVenta) }}</span>
              </p>
            </div>
          </template>

          <template #stock="{ item }">
            <span class="text-sm font-bold"
              :style="item.bajoStock ? 'color: #92400E' : 'color: var(--color-on-surface)'">
              {{ item.stockActual }}
            </span>
          </template>

          <template #minimo="{ item }">
            <span class="text-sm" style="color: var(--color-on-surface-variant)">{{ item.stockMinimo }}</span>
          </template>

          <template #estado="{ item }">
            <span v-if="item.bajoStock"
              class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold"
              style="background-color: #FEF3C7; color: #92400E">
              <span class="material-symbols-outlined" style="font-size: 13px">warning</span>
              Bajo stock
            </span>
            <span v-else
              class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold"
              style="background-color: #dcfce7; color: #166534">
              <span class="material-symbols-outlined" style="font-size: 13px">check_circle</span>
              OK
            </span>
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
            <BaseButton variant="secondary" size="sm" :disabled="page === 1" @click="page--; load()">Anterior</BaseButton>
            <BaseButton variant="secondary" size="sm" :disabled="page === totalPages" @click="page++; load()">Siguiente</BaseButton>
          </div>
        </div>

      </div>
    </main>

    <!-- MODAL EDITAR PRECIOS -->
    <BaseModal :show="showEditModal" title="Editar Precio y Stock Mínimo" size="lg" @close="showEditModal = false">
      <div v-if="editError" class="flex items-center gap-2 rounded-xl px-3 py-2.5 mb-4 text-sm font-medium"
        style="background-color: var(--color-error-container); color: var(--color-on-error-container)">
        <span class="material-symbols-outlined flex-shrink-0" style="font-size: 16px">error</span>
        {{ editError }}
      </div>

      <div class="space-y-4">
        <!-- Info del producto -->
        <div class="flex items-center gap-3 p-3 rounded-xl" style="background-color: var(--color-surface-container-low)">
          <div class="w-10 h-10 rounded-xl overflow-hidden flex items-center justify-center flex-shrink-0"
            style="background-color: var(--color-surface-container-high)">
            <img v-if="editingProducto?.imagenUrl" :src="API_BASE + editingProducto.imagenUrl"
              class="w-full h-full object-cover" />
            <span v-else class="material-symbols-outlined" style="font-size: 18px; color: var(--color-outline)">inventory_2</span>
          </div>
          <div>
            <p class="text-sm font-semibold" style="color: var(--color-on-surface)">{{ editingProducto?.nombre }}</p>
            <p class="text-xs" style="color: var(--color-outline)">{{ editingProducto?.categoria }}</p>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-xs font-bold uppercase tracking-wider mb-1.5" style="color: var(--color-outline)">Precio de Costo</label>
            <input v-model.number="editForm.precioCosto" type="number" min="0" step="1"
              class="w-full px-4 py-3 rounded-xl text-sm outline-none"
              style="border: 1px solid var(--color-outline-variant); color: var(--color-on-surface); background-color: var(--color-surface-container-low)" />
          </div>
          <div>
            <label class="block text-xs font-bold uppercase tracking-wider mb-1.5" style="color: var(--color-outline)">Stock Mínimo</label>
            <input v-model.number="editForm.stockMinimo" type="number" min="0" step="1"
              class="w-full px-4 py-3 rounded-xl text-sm outline-none"
              style="border: 1px solid var(--color-outline-variant); color: var(--color-on-surface); background-color: var(--color-surface-container-low)" />
          </div>
        </div>

        <!-- Precio de venta calculado -->
        <div v-if="categoriaDelProducto" class="rounded-xl p-4"
          style="background-color: var(--color-surface-container-low); border: 1px solid rgba(196,197,213,0.2)">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-xs font-bold uppercase tracking-wider mb-0.5" style="color: var(--color-outline)">
                Precio de venta calculado
              </p>
              <p class="text-xs" style="color: var(--color-outline)">
                Categoría <strong style="color: var(--color-on-surface)">{{ categoriaDelProducto.nombre }}</strong>
                — margen {{ categoriaDelProducto.margen }}%
              </p>
            </div>
            <p v-if="precioVentaCalculado !== null" class="text-xl font-extrabold" style="color: var(--color-primary)">
              {{ formatGs(precioVentaCalculado) }}
            </p>
            <p v-else class="text-sm" style="color: var(--color-outline)">Sin margen definido</p>
          </div>
        </div>
      </div>

      <template #footer>
        <BaseButton variant="secondary" @click="showEditModal = false">Cancelar</BaseButton>
        <BaseButton variant="primary" :disabled="isEditSaving" @click="submitEdit">
          {{ isEditSaving ? "Guardando…" : "Guardar" }}
        </BaseButton>
      </template>
    </BaseModal>

    <!-- MODAL MOVIMIENTO -->
    <BaseModal :show="showMovModal" title="Registrar Movimiento" size="sm" @close="showMovModal = false">
      <p v-if="movProducto" class="text-sm font-semibold mb-4" style="color: var(--color-on-surface)">
        {{ movProducto.nombre }}
        <span class="font-normal ml-2" style="color: var(--color-outline)">Stock actual: {{ movProducto.stockActual }}</span>
      </p>

      <div v-if="movError" class="flex items-center gap-2 rounded-xl px-3 py-2.5 mb-4 text-sm font-medium"
        style="background-color: var(--color-error-container); color: var(--color-on-error-container)">
        <span class="material-symbols-outlined flex-shrink-0" style="font-size: 16px">error</span>
        {{ movError }}
      </div>

      <div class="space-y-4">
        <div>
          <label class="block text-xs font-bold uppercase tracking-wider mb-1.5" style="color: var(--color-outline)">Tipo</label>
          <div class="flex gap-2">
            <button v-for="tipo in ['Entrada', 'Salida', 'Ajuste']" :key="tipo"
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
          <input v-model.number="movForm.cantidad" type="number" min="1"
            class="w-full px-4 py-3 rounded-xl text-sm outline-none"
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
  </div>
</template>
