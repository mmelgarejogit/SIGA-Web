<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, reactive } from "vue"
import AppSidebar from "@/components/AppSidebar.vue"
import AppHeader from "@/components/AppHeader.vue"
import BaseButton from "@/components/BaseButton.vue"
import BaseModal from "@/components/BaseModal.vue"
import BaseTable from "@/components/BaseTable.vue"
import FilterChips from "@/components/FilterChips.vue"
import SearchInput from "@/components/SearchInput.vue"
import SearchableSelect from "@/components/SearchableSelect.vue"
import { useAuthStore } from "@/stores/auth"
import {
  type Producto,
  type ProductoVariante,
  type CategoriaProducto,
  type Marca,
  type Modelo,
  getProductos,
  createProducto,
  updateProducto,
  deactivateProducto,
  getVariantes,
  createVariante,
  updateVariante,
  deactivateVariante,
  getCategorias,
  getMarcas,
  getModelos,
} from "@/services/inventarioService"

const auth = useAuthStore()
const canManage = computed(() => auth.hasPermission("gestionar_inventario"))

// ── Datos de apoyo ─────────────────────────────────────────────────────────────

const categorias = ref<CategoriaProducto[]>([])
const marcas = ref<Marca[]>([])
const modelos = ref<Modelo[]>([])

const categoriaOpts = computed(() =>
  categorias.value.filter(c => c.isActive).map(c => ({ value: String(c.id), label: c.nombre })),
)
const marcaOpts = computed(() =>
  marcas.value.filter(m => m.isActive).map(m => ({ value: m.id, label: m.nombre })),
)
function modeloOpts(marcaId: number | null) {
  if (!marcaId) return []
  return modelos.value.filter(m => m.marcaId === marcaId && m.isActive).map(m => ({ value: m.id, label: m.nombre }))
}

// ── Lista de productos ─────────────────────────────────────────────────────────

const productos = ref<Producto[]>([])
const isLoading = ref(false)
const loadError = ref("")
const search = ref("")
const categoriaFilter = ref<string[]>([])
const currentPage = ref(1)
const totalPages = ref(1)
const totalCount = ref(0)
const PAGE_SIZE = 20

const rangeStart = computed(() => totalCount.value === 0 ? 0 : (currentPage.value - 1) * PAGE_SIZE + 1)
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

async function loadProductos() {
  isLoading.value = true
  loadError.value = ""
  try {
    const result = await getProductos({
      page: currentPage.value,
      pageSize: PAGE_SIZE,
      search: search.value || undefined,
      categoriaId: categoriaFilter.value[0] ? Number(categoriaFilter.value[0]) : undefined,
    })
    productos.value = result.items
    totalPages.value = result.totalPages
    totalCount.value = result.totalCount
  } catch {
    loadError.value = "Error al cargar productos."
  } finally {
    isLoading.value = false
  }
}

function onSearch(val: string) { search.value = val; currentPage.value = 1; loadProductos() }
function onCategoriaChange(val: string[]) { categoriaFilter.value = val; currentPage.value = 1; loadProductos() }

// ── Panel detalle ──────────────────────────────────────────────────────────────

const showDetail = ref(false)
const detailProducto = ref<Producto | null>(null)
const detailVariantes = ref<ProductoVariante[]>([])
const loadingVariantes = ref(false)

async function openDetail(p: Producto) {
  detailProducto.value = p
  showDetail.value = true
  loadingVariantes.value = true
  try { detailVariantes.value = await getVariantes(p.id) }
  finally { loadingVariantes.value = false }
}

function closeDetail() { showDetail.value = false }
function onEscape(e: KeyboardEvent) { if (e.key === "Escape") closeDetail() }

// ── Modal Crear Producto ───────────────────────────────────────────────────────

const showCreateModal = ref(false)
const isSaving = ref(false)
const createError = ref("")
const createForm = reactive({
  nombre: "",
  descripcion: "",
  categoriaProductoId: null as number | null,
  marcaId: null as number | null,
  modeloId: null as number | null,
})

function openCreate() {
  Object.assign(createForm, { nombre: "", descripcion: "", categoriaProductoId: null, marcaId: null, modeloId: null })
  createError.value = ""
  showCreateModal.value = true
}

async function submitCreate() {
  if (!createForm.nombre.trim()) { createError.value = "El nombre es obligatorio."; return }
  isSaving.value = true; createError.value = ""
  try {
    await createProducto({
      nombre: createForm.nombre.trim(),
      descripcion: createForm.descripcion.trim() || undefined,
      categoriaProductoId: createForm.categoriaProductoId,
      marcaId: createForm.marcaId,
      modeloId: createForm.modeloId,
    })
    showCreateModal.value = false
    await loadProductos()
  } catch (e: any) { createError.value = e?.response?.data?.message ?? "Error al crear el producto." }
  finally { isSaving.value = false }
}

// ── Modal Editar Producto ──────────────────────────────────────────────────────

const showEditModal = ref(false)
const selectedProducto = ref<Producto | null>(null)
const isUpdating = ref(false)
const editError = ref("")
const editForm = reactive({
  nombre: "",
  descripcion: "",
  categoriaProductoId: null as number | null,
  marcaId: null as number | null,
  modeloId: null as number | null,
  isActive: true,
})

function openEdit(p: Producto) {
  selectedProducto.value = p
  Object.assign(editForm, {
    nombre: p.nombre,
    descripcion: p.descripcion ?? "",
    categoriaProductoId: p.categoriaProductoId,
    marcaId: p.marcaId,
    modeloId: p.modeloId,
    isActive: p.isActive,
  })
  editError.value = ""
  showEditModal.value = true
}

async function submitEdit() {
  if (!selectedProducto.value) return
  if (!editForm.nombre.trim()) { editError.value = "El nombre es obligatorio."; return }
  isUpdating.value = true; editError.value = ""
  try {
    await updateProducto(selectedProducto.value.id, {
      nombre: editForm.nombre.trim(),
      descripcion: editForm.descripcion.trim() || undefined,
      categoriaProductoId: editForm.categoriaProductoId,
      marcaId: editForm.marcaId,
      modeloId: editForm.modeloId,
      isActive: editForm.isActive,
    })
    showEditModal.value = false
    // Refresh detalle si está abierto
    if (showDetail.value && detailProducto.value?.id === selectedProducto.value.id) {
      const updated = await getProductos({ page: 1, pageSize: 1 }).then(() => null).catch(() => null)
      void updated
    }
    await loadProductos()
  } catch (e: any) { editError.value = e?.response?.data?.message ?? "Error al actualizar." }
  finally { isUpdating.value = false }
}

// ── Modal Desactivar Producto ──────────────────────────────────────────────────

const showDeactivateModal = ref(false)
const productoToDeactivate = ref<Producto | null>(null)
const isDeactivating = ref(false)

function openDeactivate(p: Producto) { productoToDeactivate.value = p; showDeactivateModal.value = true }

async function confirmDeactivate() {
  if (!productoToDeactivate.value) return
  isDeactivating.value = true
  try {
    await deactivateProducto(productoToDeactivate.value.id)
    showDeactivateModal.value = false
    closeDetail()
    await loadProductos()
  } finally { isDeactivating.value = false }
}

// ── Modal Variante ─────────────────────────────────────────────────────────────

const showVarianteModal = ref(false)
const selectedVariante = ref<ProductoVariante | null>(null)
const isSavingVariante = ref(false)
const varianteError = ref("")
const varianteForm = reactive({
  sku: "",
  color: "",
  talle: "",
  precioCosto: 0,
  precioVenta: 0,
})

function openCreateVariante() {
  selectedVariante.value = null
  Object.assign(varianteForm, { sku: "", color: "", talle: "", precioCosto: 0, precioVenta: 0 })
  varianteError.value = ""
  showVarianteModal.value = true
}

function openEditVariante(v: ProductoVariante) {
  selectedVariante.value = v
  Object.assign(varianteForm, { sku: v.sku ?? "", color: v.color ?? "", talle: v.talle ?? "", precioCosto: v.precioCosto, precioVenta: v.precioVenta })
  varianteError.value = ""
  showVarianteModal.value = true
}

async function submitVariante() {
  if (!detailProducto.value) return
  if (varianteForm.precioCosto < 0 || varianteForm.precioVenta < 0) {
    varianteError.value = "Los precios no pueden ser negativos."
    return
  }
  isSavingVariante.value = true; varianteError.value = ""
  try {
    if (selectedVariante.value) {
      await updateVariante(selectedVariante.value.id, {
        sku: varianteForm.sku.trim() || undefined,
        color: varianteForm.color.trim() || undefined,
        talle: varianteForm.talle.trim() || undefined,
        precioCosto: varianteForm.precioCosto,
        precioVenta: varianteForm.precioVenta,
        isActive: true,
      })
    } else {
      await createVariante({
        productoId: detailProducto.value.id,
        sku: varianteForm.sku.trim() || undefined,
        color: varianteForm.color.trim() || undefined,
        talle: varianteForm.talle.trim() || undefined,
        precioCosto: varianteForm.precioCosto,
        precioVenta: varianteForm.precioVenta,
      })
    }
    showVarianteModal.value = false
    detailVariantes.value = await getVariantes(detailProducto.value.id)
    await loadProductos()
  } catch (e: any) { varianteError.value = e?.response?.data?.message ?? "Error al guardar." }
  finally { isSavingVariante.value = false }
}

async function handleDeactivateVariante(v: ProductoVariante) {
  if (!detailProducto.value) return
  await deactivateVariante(v.id)
  detailVariantes.value = await getVariantes(detailProducto.value.id)
  await loadProductos()
}

// ── Helpers de formato ─────────────────────────────────────────────────────────

const avatarColors = [
  { bg: "#DBEAFE", color: "#1E40AF" }, { bg: "#D1FAE5", color: "#065F46" },
  { bg: "#EDE9FE", color: "#5B21B6" }, { bg: "#FEE2E2", color: "#991B1B" },
  { bg: "#FEF3C7", color: "#92400E" },
]
const avatarStyle = (id: number) => avatarColors[id % avatarColors.length]

const formatPrice = (n: number) =>
  new Intl.NumberFormat("es-PY", { style: "currency", currency: "PYG", maximumFractionDigits: 0 }).format(n)

// ── Init ───────────────────────────────────────────────────────────────────────

onMounted(async () => {
  await Promise.all([
    loadProductos(),
    getCategorias().then(c => (categorias.value = c)),
    getMarcas().then(m => (marcas.value = m)),
    getModelos().then(m => (modelos.value = m)),
  ])
  document.addEventListener("keydown", onEscape)
})

onUnmounted(() => document.removeEventListener("keydown", onEscape))
</script>

<template>
  <div class="min-h-screen" style="background-color: var(--color-background)">
    <AppSidebar />
    <AppHeader />

    <main style="margin-left: 280px; padding-top: 64px">
      <div class="p-8">

        <!-- Encabezado -->
        <div class="flex items-start justify-between mb-8">
          <div>
            <h1 class="text-4xl font-extrabold tracking-tight mb-2">Productos</h1>
            <p class="font-medium" style="color: var(--color-on-surface-variant)">
              {{ totalCount }} producto{{ totalCount !== 1 ? "s" : "" }} registrado{{ totalCount !== 1 ? "s" : "" }}
            </p>
          </div>
          <BaseButton v-if="canManage" variant="primary" size="lg" @click="openCreate">
            <span class="material-symbols-outlined" style="font-size: 20px">add</span>
            Nuevo Producto
          </BaseButton>
        </div>

        <!-- Filtros -->
        <div class="flex items-center justify-between gap-4 mb-6 flex-wrap">
          <FilterChips :model-value="categoriaFilter" :options="categoriaOpts" placeholder="Categoría" @update:model-value="onCategoriaChange" />
          <SearchInput :model-value="search" placeholder="Buscar por nombre…" class="w-72" @update:model-value="onSearch" />
        </div>

        <!-- Error -->
        <div v-if="loadError" class="flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium mb-6" style="background-color: var(--color-error-container); color: var(--color-on-error-container)">
          <span class="material-symbols-outlined" style="font-size: 18px">error</span>
          {{ loadError }}
        </div>

        <!-- Tabla -->
        <div class="rounded-2xl overflow-hidden" style="background-color: var(--color-surface-container-lowest); box-shadow: 0 1px 3px rgba(196,197,213,0.25); outline: 1px solid rgba(196,197,213,0.15)">
          <BaseTable :loading="isLoading" empty-text="No hay productos registrados.">
            <template #header>
              <th class="px-6 py-5 text-left text-xs font-bold uppercase tracking-widest" style="color: var(--color-outline)">Producto</th>
              <th class="px-6 py-5 text-left text-xs font-bold uppercase tracking-widest" style="color: var(--color-outline)">Categoría</th>
              <th class="px-6 py-5 text-left text-xs font-bold uppercase tracking-widest" style="color: var(--color-outline)">Marca / Modelo</th>
              <th class="px-6 py-5 text-center text-xs font-bold uppercase tracking-widest" style="color: var(--color-outline)">Variantes</th>
              <th class="px-6 py-5 text-left text-xs font-bold uppercase tracking-widest" style="color: var(--color-outline)">Estado</th>
              <th class="px-6 py-5" />
            </template>
            <template #body>
              <tr
                v-for="p in productos"
                :key="p.id"
                class="hover:bg-surface-container-low border-b cursor-pointer"
                style="border-color: rgba(196,197,213,0.12)"
                @click="openDetail(p)"
              >
                <td class="px-6 py-4">
                  <div class="flex items-center gap-3">
                    <div class="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-sm font-extrabold"
                      :style="`background-color:${avatarStyle(p.id).bg};color:${avatarStyle(p.id).color}`">
                      {{ p.nombre.charAt(0).toUpperCase() }}
                    </div>
                    <div>
                      <p class="text-sm font-semibold" style="color: var(--color-on-surface)">{{ p.nombre }}</p>
                      <p v-if="p.descripcion" class="text-xs mt-0.5 truncate max-w-[220px]" style="color: var(--color-outline)">{{ p.descripcion }}</p>
                    </div>
                  </div>
                </td>
                <td class="px-6 py-4 text-sm" style="color: var(--color-on-surface-variant)">{{ p.categoriaNombre ?? "—" }}</td>
                <td class="px-6 py-4 text-sm" style="color: var(--color-on-surface-variant)">
                  <span v-if="p.marcaNombre">{{ p.marcaNombre }}<span v-if="p.modeloNombre"> · {{ p.modeloNombre }}</span></span>
                  <span v-else>—</span>
                </td>
                <td class="px-6 py-4 text-center">
                  <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold" style="background-color: var(--color-surface-container-high); color: var(--color-primary)">
                    <span class="material-symbols-outlined" style="font-size: 14px">layers</span>
                    {{ p.totalVariantes }}
                  </span>
                </td>
                <td class="px-6 py-4">
                  <span class="px-3 py-1 rounded-full text-xs font-semibold"
                    :class="p.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'">
                    {{ p.isActive ? "Activo" : "Inactivo" }}
                  </span>
                </td>
                <td class="px-6 py-4">
                  <div v-if="canManage" class="flex items-center gap-2 justify-end" @click.stop>
                    <button class="w-9 h-9 rounded-full flex items-center justify-center transition-all hover:scale-105 active:scale-95" style="background-color: var(--color-surface-container-high)" @click="openEdit(p)" title="Editar">
                      <span class="material-symbols-outlined" style="font-size: 18px; color: var(--color-on-surface-variant)">edit</span>
                    </button>
                    <button v-if="p.isActive" class="w-9 h-9 rounded-full flex items-center justify-center transition-all hover:scale-105 active:scale-95" style="background-color: var(--color-error-container)" @click="openDeactivate(p)" title="Desactivar">
                      <span class="material-symbols-outlined" style="font-size: 18px; color: var(--color-error)">block</span>
                    </button>
                  </div>
                </td>
              </tr>
            </template>
          </BaseTable>

          <!-- Footer paginación -->
          <div v-if="productos.length > 0" class="px-6 py-4 flex items-center justify-between flex-wrap gap-4" style="border-top: 1px solid rgba(196,197,213,0.12)">
            <span class="text-sm" style="color: var(--color-on-surface-variant)">
              Mostrando <strong>{{ rangeStart }}–{{ rangeEnd }}</strong> de <strong>{{ totalCount }}</strong>
            </span>
            <div v-if="totalPages > 1" class="flex items-center gap-1">
              <button @click="currentPage--; loadProductos()" :disabled="currentPage === 1" class="w-9 h-9 rounded-full flex items-center justify-center transition-all disabled:opacity-30" style="color: var(--color-on-surface-variant)">
                <span class="material-symbols-outlined" style="font-size: 18px">chevron_left</span>
              </button>
              <template v-for="pg in visiblePages" :key="pg">
                <span v-if="pg === '...'" class="w-9 h-9 flex items-center justify-center text-sm" style="color: var(--color-outline)">…</span>
                <button v-else @click="currentPage = (pg as number); loadProductos()" class="w-9 h-9 rounded-full text-sm font-semibold transition-all"
                  :style="currentPage === pg ? 'background-color:var(--color-primary);color:white' : 'color:var(--color-on-surface-variant)'">
                  {{ pg }}
                </button>
              </template>
              <button @click="currentPage++; loadProductos()" :disabled="currentPage === totalPages" class="w-9 h-9 rounded-full flex items-center justify-center transition-all disabled:opacity-30" style="color: var(--color-on-surface-variant)">
                <span class="material-symbols-outlined" style="font-size: 18px">chevron_right</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>

    <!-- ── PANEL DETALLE ────────────────────────────────────────────────────────── -->
    <Teleport to="body">
      <Transition name="detail-overlay">
        <div v-if="showDetail" class="fixed inset-0 z-40" style="background-color: rgba(24,28,32,0.35)" @click.self="closeDetail" />
      </Transition>
      <Transition name="detail-panel">
        <aside v-if="showDetail && detailProducto" class="fixed top-0 right-0 h-screen z-50 flex flex-col overflow-hidden"
          style="width: 440px; background-color: var(--color-surface-container-lowest); box-shadow: -8px 0 40px rgba(0,40,142,0.12)">

          <!-- Header -->
          <div class="flex items-center justify-between px-6 pt-6 pb-4 flex-shrink-0" style="border-bottom: 1px solid rgba(196,197,213,0.2)">
            <div>
              <h3 class="text-lg font-extrabold truncate pr-4" style="color: var(--color-primary)">{{ detailProducto.nombre }}</h3>
              <p v-if="detailProducto.descripcion" class="text-xs mt-1 truncate" style="color: var(--color-outline)">{{ detailProducto.descripcion }}</p>
            </div>
            <button @click="closeDetail" class="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-colors hover:bg-surface-container-high" style="color: var(--color-outline)">
              <span class="material-symbols-outlined" style="font-size: 20px">close</span>
            </button>
          </div>

          <!-- Body scrollable -->
          <div class="flex-1 overflow-y-auto px-6 py-5 space-y-5">

            <!-- Info del producto -->
            <div>
              <p class="text-xs font-bold uppercase tracking-wider mb-2" style="color: var(--color-outline)">Información</p>
              <div class="rounded-2xl overflow-hidden" style="border: 1px solid rgba(196,197,213,0.2)">
                <div v-for="row in [
                  { label: 'Categoría', value: detailProducto.categoriaNombre ?? '—' },
                  { label: 'Marca',     value: detailProducto.marcaNombre ?? '—' },
                  { label: 'Modelo',    value: detailProducto.modeloNombre ?? '—' },
                  { label: 'Estado',    value: detailProducto.isActive ? 'Activo' : 'Inactivo' },
                ]" :key="row.label"
                  class="flex items-center justify-between px-4 py-3" style="border-bottom: 1px solid rgba(196,197,213,0.12)">
                  <span class="text-xs font-bold uppercase tracking-wider" style="color: var(--color-outline)">{{ row.label }}</span>
                  <span class="text-sm font-medium" style="color: var(--color-on-surface)">{{ row.value }}</span>
                </div>
              </div>
            </div>

            <!-- Variantes -->
            <div>
              <div class="flex items-center justify-between mb-2">
                <p class="text-xs font-bold uppercase tracking-wider" style="color: var(--color-outline)">Variantes ({{ detailVariantes.length }})</p>
                <button v-if="canManage" @click="openCreateVariante" class="flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-full transition-all hover:scale-105" style="background-color: var(--color-surface-container-high); color: var(--color-primary)">
                  <span class="material-symbols-outlined" style="font-size: 14px">add</span>
                  Agregar
                </button>
              </div>

              <div v-if="loadingVariantes" class="text-center py-6 text-xs" style="color: var(--color-outline)">Cargando variantes…</div>

              <div v-else-if="detailVariantes.length === 0" class="text-center py-6 rounded-2xl" style="background-color: var(--color-surface-container-low); border: 1px dashed rgba(196,197,213,0.4)">
                <span class="material-symbols-outlined text-3xl mb-1" style="color: var(--color-outline)">layers</span>
                <p class="text-xs" style="color: var(--color-outline)">Sin variantes. Agregá la primera.</p>
              </div>

              <div v-else class="space-y-2">
                <div v-for="v in detailVariantes" :key="v.id" class="flex items-center gap-3 px-4 py-3 rounded-xl" style="background-color: var(--color-surface-container-low); border: 1px solid rgba(196,197,213,0.15)">
                  <div class="flex-1 min-w-0">
                    <p class="text-sm font-semibold truncate" style="color: var(--color-on-surface)">
                      {{ [v.color, v.talle].filter(Boolean).join(" · ") || "Variante única" }}
                    </p>
                    <div class="flex items-center gap-3 mt-0.5">
                      <span v-if="v.sku" class="text-xs font-mono" style="color: var(--color-outline)">{{ v.sku }}</span>
                      <span class="text-xs" style="color: var(--color-on-surface-variant)">{{ formatPrice(v.precioVenta) }}</span>
                      <span class="px-1.5 py-0.5 rounded-full text-xs font-semibold" :class="v.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'">
                        {{ v.isActive ? "Activa" : "Inactiva" }}
                      </span>
                    </div>
                  </div>
                  <div v-if="canManage" class="flex gap-1.5 flex-shrink-0">
                    <button @click="openEditVariante(v)" class="w-8 h-8 rounded-full flex items-center justify-center transition-all hover:scale-105" style="background-color: var(--color-surface-container-high)" title="Editar variante">
                      <span class="material-symbols-outlined" style="font-size: 15px; color: var(--color-on-surface-variant)">edit</span>
                    </button>
                    <button v-if="v.isActive" @click="handleDeactivateVariante(v)" class="w-8 h-8 rounded-full flex items-center justify-center transition-all hover:scale-105" style="background-color: var(--color-error-container)" title="Desactivar variante">
                      <span class="material-symbols-outlined" style="font-size: 15px; color: var(--color-error)">block</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

          </div>

          <!-- Footer acciones -->
          <div v-if="canManage" class="flex gap-3 px-6 py-4 flex-shrink-0" style="border-top: 1px solid rgba(196,197,213,0.2)">
            <BaseButton variant="secondary" size="default" class="flex-1" @click="openEdit(detailProducto!); closeDetail()">
              <span class="material-symbols-outlined" style="font-size: 18px">edit</span>
              Editar
            </BaseButton>
            <BaseButton v-if="detailProducto!.isActive" variant="danger" size="default" class="flex-1" @click="openDeactivate(detailProducto!); closeDetail()">
              <span class="material-symbols-outlined" style="font-size: 18px">block</span>
              Desactivar
            </BaseButton>
          </div>
        </aside>
      </Transition>
    </Teleport>

    <!-- MODAL CREAR PRODUCTO -->
    <BaseModal :show="showCreateModal" title="Nuevo Producto" size="lg" @close="showCreateModal = false">
      <div v-if="createError" class="flex items-center gap-2 rounded-xl px-3 py-2.5 mb-4 text-sm font-medium" style="background-color: var(--color-error-container); color: var(--color-on-error-container)">
        <span class="material-symbols-outlined flex-shrink-0" style="font-size: 16px">error</span>
        {{ createError }}
      </div>

      <div class="space-y-4">
        <div>
          <label class="block text-xs font-bold uppercase tracking-wider mb-1.5" style="color: var(--color-outline)">Nombre *</label>
          <input v-model="createForm.nombre" type="text" class="w-full px-4 py-3 rounded-xl text-sm outline-none" style="border: 1px solid var(--color-outline-variant); color: var(--color-on-surface); background: var(--color-surface-container-low)" />
        </div>
        <div>
          <label class="block text-xs font-bold uppercase tracking-wider mb-1.5" style="color: var(--color-outline)">Descripción</label>
          <textarea v-model="createForm.descripcion" rows="2" placeholder="Opcional" class="w-full px-4 py-3 rounded-xl text-sm outline-none resize-none" style="border: 1px solid var(--color-outline-variant); color: var(--color-on-surface); background: var(--color-surface-container-low)" />
        </div>
        <div>
          <label class="block text-xs font-bold uppercase tracking-wider mb-1.5" style="color: var(--color-outline)">Categoría</label>
          <SearchableSelect :model-value="createForm.categoriaProductoId" :options="categorias.filter(c => c.isActive).map(c => ({ value: c.id, label: c.nombre }))" null-label="Sin categoría" @update:model-value="createForm.categoriaProductoId = $event as number | null" />
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-xs font-bold uppercase tracking-wider mb-1.5" style="color: var(--color-outline)">Marca</label>
            <SearchableSelect :model-value="createForm.marcaId" :options="marcaOpts" null-label="Sin marca" @update:model-value="createForm.marcaId = $event as number | null; createForm.modeloId = null" />
          </div>
          <div>
            <label class="block text-xs font-bold uppercase tracking-wider mb-1.5" style="color: var(--color-outline)">Modelo</label>
            <SearchableSelect :model-value="createForm.modeloId" :options="modeloOpts(createForm.marcaId)" null-label="Sin modelo" :disabled="!createForm.marcaId" @update:model-value="createForm.modeloId = $event as number | null" />
          </div>
        </div>
      </div>

      <template #footer>
        <BaseButton variant="secondary" @click="showCreateModal = false">Cancelar</BaseButton>
        <BaseButton variant="primary" :disabled="isSaving" @click="submitCreate">{{ isSaving ? "Guardando…" : "Crear Producto" }}</BaseButton>
      </template>
    </BaseModal>

    <!-- MODAL EDITAR PRODUCTO -->
    <BaseModal :show="showEditModal" title="Editar Producto" size="lg" @close="showEditModal = false">
      <div v-if="editError" class="flex items-center gap-2 rounded-xl px-3 py-2.5 mb-4 text-sm font-medium" style="background-color: var(--color-error-container); color: var(--color-on-error-container)">
        <span class="material-symbols-outlined flex-shrink-0" style="font-size: 16px">error</span>
        {{ editError }}
      </div>

      <div class="space-y-4">
        <div>
          <label class="block text-xs font-bold uppercase tracking-wider mb-1.5" style="color: var(--color-outline)">Nombre *</label>
          <input v-model="editForm.nombre" type="text" class="w-full px-4 py-3 rounded-xl text-sm outline-none" style="border: 1px solid var(--color-outline-variant); color: var(--color-on-surface); background: var(--color-surface-container-low)" />
        </div>
        <div>
          <label class="block text-xs font-bold uppercase tracking-wider mb-1.5" style="color: var(--color-outline)">Descripción</label>
          <textarea v-model="editForm.descripcion" rows="2" placeholder="Opcional" class="w-full px-4 py-3 rounded-xl text-sm outline-none resize-none" style="border: 1px solid var(--color-outline-variant); color: var(--color-on-surface); background: var(--color-surface-container-low)" />
        </div>
        <div>
          <label class="block text-xs font-bold uppercase tracking-wider mb-1.5" style="color: var(--color-outline)">Categoría</label>
          <SearchableSelect :model-value="editForm.categoriaProductoId" :options="categorias.filter(c => c.isActive).map(c => ({ value: c.id, label: c.nombre }))" null-label="Sin categoría" @update:model-value="editForm.categoriaProductoId = $event as number | null" />
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-xs font-bold uppercase tracking-wider mb-1.5" style="color: var(--color-outline)">Marca</label>
            <SearchableSelect :model-value="editForm.marcaId" :options="marcaOpts" null-label="Sin marca" @update:model-value="editForm.marcaId = $event as number | null; editForm.modeloId = null" />
          </div>
          <div>
            <label class="block text-xs font-bold uppercase tracking-wider mb-1.5" style="color: var(--color-outline)">Modelo</label>
            <SearchableSelect :model-value="editForm.modeloId" :options="modeloOpts(editForm.marcaId)" null-label="Sin modelo" :disabled="!editForm.marcaId" @update:model-value="editForm.modeloId = $event as number | null" />
          </div>
        </div>
        <label class="flex items-center gap-3 cursor-pointer px-4 py-3 rounded-xl" style="background-color: var(--color-surface-container-low)">
          <input v-model="editForm.isActive" type="checkbox" class="w-4 h-4 rounded" />
          <span class="text-sm font-medium">Producto activo</span>
        </label>
      </div>

      <template #footer>
        <BaseButton variant="secondary" @click="showEditModal = false">Cancelar</BaseButton>
        <BaseButton variant="primary" :disabled="isUpdating" @click="submitEdit">{{ isUpdating ? "Guardando…" : "Guardar Cambios" }}</BaseButton>
      </template>
    </BaseModal>

    <!-- MODAL VARIANTE -->
    <BaseModal :show="showVarianteModal" :title="selectedVariante ? 'Editar Variante' : 'Nueva Variante'" size="lg" @close="showVarianteModal = false">
      <div v-if="varianteError" class="flex items-center gap-2 rounded-xl px-3 py-2.5 mb-4 text-sm font-medium" style="background-color: var(--color-error-container); color: var(--color-on-error-container)">
        <span class="material-symbols-outlined flex-shrink-0" style="font-size: 16px">error</span>
        {{ varianteError }}
      </div>

      <div class="space-y-4">
        <div class="grid grid-cols-3 gap-4">
          <div>
            <label class="block text-xs font-bold uppercase tracking-wider mb-1.5" style="color: var(--color-outline)">SKU</label>
            <input v-model="varianteForm.sku" type="text" placeholder="Opcional" class="w-full px-4 py-3 rounded-xl text-sm outline-none" style="border: 1px solid var(--color-outline-variant); color: var(--color-on-surface); background: var(--color-surface-container-low)" />
          </div>
          <div>
            <label class="block text-xs font-bold uppercase tracking-wider mb-1.5" style="color: var(--color-outline)">Color</label>
            <input v-model="varianteForm.color" type="text" placeholder="Ej: Negro" class="w-full px-4 py-3 rounded-xl text-sm outline-none" style="border: 1px solid var(--color-outline-variant); color: var(--color-on-surface); background: var(--color-surface-container-low)" />
          </div>
          <div>
            <label class="block text-xs font-bold uppercase tracking-wider mb-1.5" style="color: var(--color-outline)">Talle</label>
            <input v-model="varianteForm.talle" type="text" placeholder="Ej: 58-14-135" class="w-full px-4 py-3 rounded-xl text-sm outline-none" style="border: 1px solid var(--color-outline-variant); color: var(--color-on-surface); background: var(--color-surface-container-low)" />
          </div>
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-xs font-bold uppercase tracking-wider mb-1.5" style="color: var(--color-outline)">Precio de Costo</label>
            <input v-model.number="varianteForm.precioCosto" type="number" min="0" class="w-full px-4 py-3 rounded-xl text-sm outline-none" style="border: 1px solid var(--color-outline-variant); color: var(--color-on-surface); background: var(--color-surface-container-low)" />
          </div>
          <div>
            <label class="block text-xs font-bold uppercase tracking-wider mb-1.5" style="color: var(--color-outline)">Precio de Venta</label>
            <input v-model.number="varianteForm.precioVenta" type="number" min="0" class="w-full px-4 py-3 rounded-xl text-sm outline-none" style="border: 1px solid var(--color-outline-variant); color: var(--color-on-surface); background: var(--color-surface-container-low)" />
          </div>
        </div>
      </div>

      <template #footer>
        <BaseButton variant="secondary" @click="showVarianteModal = false">Cancelar</BaseButton>
        <BaseButton variant="primary" :disabled="isSavingVariante" @click="submitVariante">{{ isSavingVariante ? "Guardando…" : (selectedVariante ? "Guardar" : "Crear Variante") }}</BaseButton>
      </template>
    </BaseModal>

    <!-- MODAL DESACTIVAR -->
    <BaseModal :show="showDeactivateModal" size="sm" @close="showDeactivateModal = false">
      <div class="text-center">
        <div class="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4" style="background-color: var(--color-error-container)">
          <span class="material-symbols-outlined" style="color: var(--color-error); font-size: 28px">block</span>
        </div>
        <h3 class="text-lg font-extrabold mb-2">Desactivar Producto</h3>
        <p class="text-sm" style="color: var(--color-on-surface-variant)">
          ¿Desactivar <strong>{{ productoToDeactivate?.nombre }}</strong>?<br>
          Sus variantes y datos se conservarán.
        </p>
      </div>
      <template #footer>
        <BaseButton variant="secondary" class="flex-1" @click="showDeactivateModal = false">Cancelar</BaseButton>
        <BaseButton variant="danger" class="flex-1" :disabled="isDeactivating" @click="confirmDeactivate">
          {{ isDeactivating ? "Desactivando…" : "Desactivar" }}
        </BaseButton>
      </template>
    </BaseModal>
  </div>
</template>

<style scoped>
.detail-panel-enter-active,
.detail-panel-leave-active {
  transition: transform 0.28s cubic-bezier(0.4, 0, 0.2, 1);
}
.detail-panel-enter-from,
.detail-panel-leave-to {
  transform: translateX(100%);
}
.detail-overlay-enter-active,
.detail-overlay-leave-active {
  transition: opacity 0.25s ease;
}
.detail-overlay-enter-from,
.detail-overlay-leave-to {
  opacity: 0;
}
</style>
