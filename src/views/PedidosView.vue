<script setup lang="ts">
import { ref, computed, onMounted, reactive } from "vue"
import { useRouter } from "vue-router"
import AppSidebar from "@/components/AppSidebar.vue"
import AppHeader from "@/components/AppHeader.vue"
import BaseButton from "@/components/BaseButton.vue"
import BaseModal from "@/components/BaseModal.vue"
import BaseTable from "@/components/BaseTable.vue"
import FilterChips from "@/components/FilterChips.vue"
import { useAuthStore } from "@/stores/auth"
import {
  type Proveedor,
  type Producto,
  type CreateProveedorRequest,
  getProveedores,
  getProductos,
  createProveedor,
} from "@/services/inventarioService"
import {
  type PedidoCompras,
  type EstadoPedido,
  getComprasPedidos,
  crearPedido,
} from "@/services/comprasService"

const auth = useAuthStore()
const router = useRouter()
const canManage = computed(() => auth.hasPermission("gestionar_pedidos"))

// ── Estado general ─────────────────────────────────────────────────────────────

const pedidos = ref<PedidoCompras[]>([])
const totalCount = ref(0)
const totalPages = ref(1)
const currentPage = ref(1)
const PAGE_SIZE = 10

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

const proveedores = ref<Proveedor[]>([])
const productos = ref<Producto[]>([])
const isLoading = ref(false)
const loadError = ref("")
const estadoFilter = ref<string[]>([])

const estadoOptions = [
  { value: "Borrador",        label: "Borradores",   dot: "#374151" },
  { value: "Confirmada",      label: "Confirmadas",  dot: "#1e40af" },
  { value: "Facturada",       label: "Facturadas",   dot: "#5b21b6" },
  { value: "RecibidaParcial", label: "Parciales",    dot: "#92400e" },
  { value: "RecibidaTotal",   label: "Recibidas",    dot: "#166534" },
  { value: "Cancelada",       label: "Canceladas",   dot: "#991b1b" },
]

const pedidoColumns = [
  { key: "id", label: "# OC" },
  { key: "proveedor", label: "Proveedor" },
  { key: "fecha", label: "Fecha" },
  { key: "items", label: "Ítems / Total" },
  { key: "estado", label: "Estado" },
  { key: "acciones", label: "", align: "right" as const },
]

function estadoStyle(estado: EstadoPedido) {
  switch (estado) {
    case "Borrador":        return { bg: "#f3f4f6", text: "#374151" }
    case "Confirmada":      return { bg: "#dbeafe", text: "#1e40af" }
    case "Facturada":       return { bg: "#ede9fe", text: "#5b21b6" }
    case "RecibidaParcial": return { bg: "#fef3c7", text: "#92400e" }
    case "RecibidaTotal":   return { bg: "#dcfce7", text: "#166534" }
    case "Cancelada":       return { bg: "#fee2e2", text: "#991b1b" }
    default:                return { bg: "#f3f4f6", text: "#374151" }
  }
}

function estadoLabel(estado: EstadoPedido) {
  switch (estado) {
    case "RecibidaParcial": return "Parcial"
    case "RecibidaTotal":   return "Recibida"
    default:                return estado
  }
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "numeric" })
}

function formatPrice(n: number) {
  return new Intl.NumberFormat("es-PY", { style: "currency", currency: "PYG", maximumFractionDigits: 0 }).format(n)
}

async function load() {
  isLoading.value = true
  loadError.value = ""
  try {
    const [result, prov, prod] = await Promise.all([
      getComprasPedidos({
        estado: estadoFilter.value[0] || undefined,
        page: currentPage.value,
        pageSize: PAGE_SIZE,
      }),
      getProveedores({ pageSize: 200 }).then((r) => r.items),
      getProductos({ pageSize: 500 }).then((r) => r.items),
    ])
    pedidos.value = result.items
    totalCount.value = result.totalCount
    totalPages.value = result.totalPages
    proveedores.value = prov
    productos.value = prod
  } catch (err: unknown) {
    loadError.value = err instanceof Error ? err.message : "Error al cargar datos."
  } finally {
    isLoading.value = false
  }
}

function onFilterChange(v: string[]) {
  estadoFilter.value = v
  currentPage.value = 1
  load()
}

function goToPage(p: number) {
  currentPage.value = p
  load()
}

function openDetail(pedido: PedidoCompras) {
  router.push(`/compras/oc/${pedido.id}`)
}

onMounted(load)

// ── Modal Nuevo Pedido ─────────────────────────────────────────────────────────

const showCreateModal = ref(false)
const isSaving = ref(false)
const createError = ref("")

interface FormItem {
  productoId: number
  cantidad: number
  precioUnitario: number
  _nombre: string
}

const pedidoForm = reactive({ proveedorId: null as number | null, observaciones: "" })
const pedidoItems = ref<FormItem[]>([])

function openCreatePedido() {
  pedidoForm.proveedorId = proveedores.value.find((p) => p.isActive)?.id ?? null
  pedidoForm.observaciones = ""
  pedidoItems.value = []
  createError.value = ""
  showCreateModal.value = true
}

function addItem() {
  const primer = productos.value.find((p) => p.isActive)
  if (!primer) return
  pedidoItems.value.push({
    productoId: primer.id,
    cantidad: 1,
    precioUnitario: primer.precioCosto,
    _nombre: primer.nombre,
  })
}

function removeItem(i: number) {
  pedidoItems.value.splice(i, 1)
}

function onItemProductoChange(i: number, e: Event) {
  const id = Number((e.target as HTMLSelectElement).value)
  const prod = productos.value.find((p) => p.id === id)
  if (prod) {
    pedidoItems.value[i]!.productoId = prod.id
    pedidoItems.value[i]!.precioUnitario = prod.precioCosto
    pedidoItems.value[i]!._nombre = prod.nombre
  }
}

async function submitCreatePedido() {
  if (!pedidoForm.proveedorId) { createError.value = "Seleccioná un proveedor."; return }
  if (pedidoItems.value.length === 0) { createError.value = "Agregá al menos un ítem."; return }

  isSaving.value = true
  createError.value = ""
  try {
    const nuevo = await crearPedido({
      proveedorId: pedidoForm.proveedorId,
      observaciones: pedidoForm.observaciones.trim() || undefined,
      items: pedidoItems.value.map(({ productoId, cantidad, precioUnitario }) => ({
        productoId, cantidad, precioUnitario,
      })),
    })
    showCreateModal.value = false
    router.push(`/compras/oc/${nuevo.id}`)
  } catch (err: unknown) {
    createError.value = err instanceof Error ? err.message : "Error al crear pedido."
  } finally {
    isSaving.value = false
  }
}

// ── Modal Nuevo Proveedor (acceso rápido) ─────────────────────────────────────

const showProveedorModal = ref(false)
const isProvSaving = ref(false)
const provError = ref("")

const emptyProvForm = (): CreateProveedorRequest => ({
  nombre: "",
  razonSocial: undefined,
  ruc: "",
  direccion: undefined,
  ciudad: undefined,
  sitioWeb: undefined,
  facebook: undefined,
  instagram: undefined,
  whatsApp: undefined,
  contactos: [],
})

const provForm = reactive<CreateProveedorRequest>(emptyProvForm())

function openCreateProveedor() {
  Object.assign(provForm, emptyProvForm())
  provError.value = ""
  showProveedorModal.value = true
}

async function submitProveedor() {
  provError.value = ""
  if (!provForm.nombre?.trim()) { provError.value = "El nombre es obligatorio."; return }
  if (!provForm.ruc?.trim()) { provError.value = "El RUC es obligatorio."; return }
  if (!/^\d{1,8}-\d$/.test(provForm.ruc.trim())) { provError.value = "RUC inválido. Formato: 80012345-6"; return }

  isProvSaving.value = true
  try {
    await createProveedor({
      nombre: provForm.nombre.trim(),
      razonSocial: (provForm.razonSocial as string)?.trim() || undefined,
      ruc: provForm.ruc.trim(),
      contactos: [],
    })
    showProveedorModal.value = false
    await load()
  } catch (err: unknown) {
    provError.value = err instanceof Error ? err.message : "Error al crear proveedor."
  } finally {
    isProvSaving.value = false
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
            <h1 class="text-4xl font-extrabold tracking-tight mb-2">Órdenes de Compra</h1>
            <p class="font-medium" style="color: var(--color-on-surface-variant)">
              {{ totalCount }} orden{{ totalCount !== 1 ? "es" : "" }} registrada{{ totalCount !== 1 ? "s" : "" }}
            </p>
          </div>
          <div class="flex items-center gap-3">
            <BaseButton v-if="canManage" variant="secondary" size="lg" @click="openCreateProveedor">
              <span class="material-symbols-outlined" style="width:20px;height:20px;font-size:20px">add_business</span>
              Nuevo Proveedor
            </BaseButton>
            <BaseButton v-if="canManage" variant="primary" size="lg" @click="openCreatePedido">
              <span class="material-symbols-outlined" style="width:20px;height:20px;font-size:20px">add</span>
              Nueva Orden
            </BaseButton>
          </div>
        </div>

        <!-- Filtros -->
        <div class="flex items-center gap-3 mb-6 flex-wrap">
          <FilterChips
            :model-value="estadoFilter"
            :options="estadoOptions"
            placeholder="Estado"
            @update:model-value="onFilterChange"
          />
        </div>

        <!-- Error -->
        <div v-if="loadError" class="flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium mb-6"
          style="background-color: var(--color-error-container); color: var(--color-on-error-container)">
          <span class="material-symbols-outlined" style="font-size: 18px">error</span>
          {{ loadError }}
        </div>

        <!-- Tabla -->
        <div class="rounded-2xl overflow-hidden" style="background-color: var(--color-surface-container-lowest); box-shadow: 0 1px 3px rgba(196, 197, 213, 0.25); outline: 1px solid rgba(196, 197, 213, 0.15);">
          <BaseTable :columns="pedidoColumns" :items="pedidos" :loading="isLoading"
            empty-text="No hay órdenes de compra registradas." @row-click="openDetail">

            <template #id="{ item }">
              <span class="text-sm font-bold" style="color: var(--color-primary)">#{{ item.id }}</span>
            </template>

            <template #proveedor="{ item }">
              <span class="text-sm font-semibold" style="color: var(--color-on-surface)">{{ item.proveedorNombre }}</span>
            </template>

            <template #fecha="{ item }">
              <span class="text-sm" style="color: var(--color-on-surface-variant)">{{ formatDate(item.createdAt) }}</span>
            </template>

            <template #items="{ item }">
              <span class="text-sm" style="color: var(--color-on-surface-variant)">
                {{ item.items.length }} ítem{{ item.items.length !== 1 ? "s" : "" }}
                — {{ formatPrice(item.items.reduce((s: number, i: { cantidad: number; precioUnitario: number }) => s + i.cantidad * i.precioUnitario, 0)) }}
              </span>
            </template>

            <template #estado="{ item }">
              <span
                class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold"
                :style="`background-color: ${estadoStyle(item.estado).bg}; color: ${estadoStyle(item.estado).text}`"
              >{{ estadoLabel(item.estado) }}</span>
            </template>

            <template #acciones="{ item }">
              <div class="flex items-center justify-end">
                <button
                  @click.stop="openDetail(item)"
                  class="w-9 h-9 rounded-full flex items-center justify-center transition-all hover:scale-105 active:scale-95"
                  style="background-color: var(--color-surface-container-high)"
                  title="Ver detalle"
                >
                  <span class="material-symbols-outlined" style="font-size: 18px; color: var(--color-on-surface-variant)">open_in_new</span>
                </button>
              </div>
            </template>
          </BaseTable>

          <!-- Footer paginador -->
          <div
            v-if="pedidos.length > 0"
            class="px-6 py-4 flex items-center justify-between flex-wrap gap-4"
            style="border-top: 1px solid rgba(196, 197, 213, 0.12); background-color: var(--color-surface-container-lowest);"
          >
            <span class="text-sm" style="color: var(--color-on-surface-variant)">
              Mostrando
              <strong style="color: var(--color-on-surface)">{{ rangeStart }}–{{ rangeEnd }}</strong>
              de
              <strong style="color: var(--color-on-surface)">{{ totalCount }}</strong>
              órdenes
            </span>
            <div v-if="totalPages > 1" class="flex items-center gap-1">
              <button
                @click="goToPage(currentPage - 1)"
                :disabled="currentPage === 1"
                class="w-9 h-9 rounded-full flex items-center justify-center transition-all disabled:opacity-30 hover:bg-surface-container-high"
                style="color: var(--color-on-surface-variant)"
              ><span class="material-symbols-outlined" style="font-size: 18px">chevron_left</span></button>
              <template v-for="p in visiblePages" :key="p">
                <span v-if="p === '...'" class="w-9 h-9 flex items-center justify-center text-sm" style="color: var(--color-outline)">…</span>
                <button
                  v-else
                  @click="goToPage(p as number)"
                  class="w-9 h-9 rounded-full text-sm font-semibold transition-all"
                  :class="currentPage === p ? 'bg-primary text-white' : 'text-on-surface-variant hover:bg-surface-container-high'"
                >{{ p }}</button>
              </template>
              <button
                @click="goToPage(currentPage + 1)"
                :disabled="currentPage === totalPages"
                class="w-9 h-9 rounded-full flex items-center justify-center transition-all disabled:opacity-30 hover:bg-surface-container-high"
                style="color: var(--color-on-surface-variant)"
              ><span class="material-symbols-outlined" style="font-size: 18px">chevron_right</span></button>
            </div>
          </div>
        </div>

      </div>
    </main>

    <!-- ── MODAL NUEVA ORDEN ──────────────────────────────────────────────────── -->
    <BaseModal :show="showCreateModal" title="Nueva Orden de Compra" size="xl" @close="showCreateModal = false">
      <div v-if="createError" class="flex items-center gap-2 rounded-xl px-3 py-2.5 mb-4 text-sm font-medium"
        style="background-color: var(--color-error-container); color: var(--color-on-error-container)">
        <span class="material-symbols-outlined flex-shrink-0" style="font-size: 16px">error</span>
        {{ createError }}
      </div>

      <div class="space-y-5">
        <div>
          <div class="flex items-center justify-between mb-1.5">
            <label class="text-xs font-bold uppercase tracking-wider" style="color: var(--color-outline)">Proveedor *</label>
            <button type="button" @click="openCreateProveedor" class="flex items-center gap-1 text-xs font-semibold" style="color: var(--color-primary)">
              <span class="material-symbols-outlined" style="font-size: 16px">add</span>
              Agregar proveedor
            </button>
          </div>
          <select v-model="pedidoForm.proveedorId" class="w-full px-4 py-3 rounded-xl text-sm outline-none"
            style="border: 1px solid var(--color-outline-variant); color: var(--color-on-surface); background: var(--color-surface)">
            <option :value="null" disabled>Seleccioná un proveedor</option>
            <option v-for="p in proveedores.filter(p => p.isActive)" :key="p.id" :value="p.id">{{ p.nombre }}</option>
          </select>
        </div>

        <div>
          <label class="block text-xs font-bold uppercase tracking-wider mb-1.5" style="color: var(--color-outline)">Observaciones</label>
          <input v-model="pedidoForm.observaciones" type="text" placeholder="Opcional"
            class="w-full px-4 py-3 rounded-xl text-sm outline-none"
            style="border: 1px solid var(--color-outline-variant); color: var(--color-on-surface); background: var(--color-surface)" />
        </div>

        <!-- Ítems -->
        <div>
          <div class="flex items-center justify-between mb-2">
            <label class="text-xs font-bold uppercase tracking-wider" style="color: var(--color-outline)">Productos *</label>
            <button @click="addItem" class="flex items-center gap-1 text-xs font-semibold" style="color: var(--color-primary)">
              <span class="material-symbols-outlined" style="font-size: 16px">add</span>
              Agregar producto
            </button>
          </div>

          <div v-if="pedidoItems.length === 0" class="text-sm py-3 text-center rounded-xl"
            style="color: var(--color-outline); background-color: var(--color-surface-container-low)">
            Agregá al menos un producto.
          </div>

          <div v-else class="space-y-2">
            <div v-for="(item, i) in pedidoItems" :key="i"
              class="grid grid-cols-12 gap-2 items-center p-3 rounded-xl"
              style="background-color: var(--color-surface-container-low)">
              <div class="col-span-5">
                <select :value="item.productoId" @change="onItemProductoChange(i, $event)"
                  class="w-full px-3 py-2 rounded-xl text-sm outline-none"
                  style="border: 1px solid var(--color-outline-variant); background: var(--color-surface); color: var(--color-on-surface)">
                  <option v-for="p in productos.filter(p => p.isActive)" :key="p.id" :value="p.id">{{ p.nombre }}</option>
                </select>
              </div>
              <div class="col-span-3">
                <input v-model.number="item.cantidad" type="number" min="1" placeholder="Cant."
                  class="w-full px-3 py-2 rounded-xl text-sm outline-none"
                  style="border: 1px solid var(--color-outline-variant); background: var(--color-surface); color: var(--color-on-surface)" />
              </div>
              <div class="col-span-3">
                <input v-model.number="item.precioUnitario" type="number" min="0" step="1" placeholder="Precio c/u"
                  class="w-full px-3 py-2 rounded-xl text-sm outline-none"
                  style="border: 1px solid var(--color-outline-variant); background: var(--color-surface); color: var(--color-on-surface)" />
              </div>
              <div class="col-span-1 flex justify-center">
                <button @click="removeItem(i)" class="w-7 h-7 rounded-full flex items-center justify-center"
                  style="background-color: var(--color-error-container)">
                  <span class="material-symbols-outlined" style="font-size: 14px; color: var(--color-error)">close</span>
                </button>
              </div>
            </div>
            <div class="text-right text-sm font-bold pt-1" style="color: var(--color-on-surface)">
              Total estimado: {{ formatPrice(pedidoItems.reduce((s, i) => s + i.cantidad * i.precioUnitario, 0)) }}
            </div>
          </div>
        </div>
      </div>

      <template #footer>
        <BaseButton variant="secondary" size="default" @click="showCreateModal = false">Cancelar</BaseButton>
        <BaseButton variant="primary" size="default" :disabled="isSaving" @click="submitCreatePedido">
          {{ isSaving ? "Creando…" : "Crear Borrador" }}
        </BaseButton>
      </template>
    </BaseModal>

    <!-- ── MODAL NUEVO PROVEEDOR ──────────────────────────────────────────────── -->
    <BaseModal :show="showProveedorModal" title="Nuevo Proveedor" size="lg" @close="showProveedorModal = false">
      <div v-if="provError" class="flex items-center gap-2 rounded-xl px-3 py-2.5 mb-4 text-sm font-medium"
        style="background-color: var(--color-error-container); color: var(--color-on-error-container)">
        <span class="material-symbols-outlined flex-shrink-0" style="font-size: 16px">error</span>
        {{ provError }}
      </div>

      <div class="space-y-4">
        <div>
          <label class="block text-xs font-bold uppercase tracking-wider mb-1.5" style="color: var(--color-outline)">Nombre comercial *</label>
          <input v-model="provForm.nombre" type="text" class="w-full px-4 py-3 rounded-xl text-sm outline-none"
            style="border: 1px solid var(--color-outline-variant); color: var(--color-on-surface); background-color: var(--color-surface-container-low)" />
        </div>

        <p class="text-xs font-bold uppercase tracking-wider pt-2" style="color: var(--color-primary)">Datos fiscales</p>

        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-xs font-bold uppercase tracking-wider mb-1.5" style="color: var(--color-outline)">RUC *</label>
            <input v-model="provForm.ruc" type="text" placeholder="80012345-6"
              class="w-full px-4 py-3 rounded-xl text-sm outline-none font-mono"
              style="border: 1px solid var(--color-outline-variant); color: var(--color-on-surface); background-color: var(--color-surface-container-low)" />
          </div>
          <div>
            <label class="block text-xs font-bold uppercase tracking-wider mb-1.5" style="color: var(--color-outline)">Razón social</label>
            <input v-model="provForm.razonSocial" type="text"
              class="w-full px-4 py-3 rounded-xl text-sm outline-none"
              style="border: 1px solid var(--color-outline-variant); color: var(--color-on-surface); background-color: var(--color-surface-container-low)" />
          </div>
        </div>

        <p class="text-xs text-center pt-1" style="color: var(--color-outline)">
          Para agregar contactos y más datos, usá la sección de Proveedores.
        </p>
      </div>

      <template #footer>
        <BaseButton variant="secondary" size="default" @click="showProveedorModal = false">Cancelar</BaseButton>
        <BaseButton variant="primary" size="default" :disabled="isProvSaving" @click="submitProveedor">
          {{ isProvSaving ? "Creando…" : "Crear Proveedor" }}
        </BaseButton>
      </template>
    </BaseModal>

  </div>
</template>
