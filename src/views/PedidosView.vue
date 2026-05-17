<script setup lang="ts">
import { ref, computed, onMounted, reactive } from "vue"
import AppSidebar from "@/components/AppSidebar.vue"
import AppHeader from "@/components/AppHeader.vue"
import BaseButton from "@/components/BaseButton.vue"
import BaseModal from "@/components/BaseModal.vue"
import BaseTable from "@/components/BaseTable.vue"
import FilterTabs from "@/components/FilterTabs.vue"
import { useAuthStore } from "@/stores/auth"
import {
  type Pedido,
  type PedidoItem,
  type Proveedor,
  type Producto,
  getProveedores,
  getProductos,
  createProveedor,
} from "@/services/inventarioService"
import {
  type PedidoCompras,
  type PedidoItemCompras,
  type EstadoPedido,
  getComprasPedidos,
  crearPedido,
  emitirPedido,
  registrarRecepcion,
  registrarDevolucion,
  cancelarPedido,
} from "@/services/comprasService"

const auth = useAuthStore()
const canManage = computed(() => auth.hasPermission("gestionar_pedidos"))

// ── Estado general ─────────────────────────────────────────────────────────────

const pedidos = ref<PedidoCompras[]>([])
const totalCount = ref(0)
const totalPages = ref(1)
const currentPage = ref(1)
const PAGE_SIZE = 20

const proveedores = ref<Proveedor[]>([])
const productos = ref<Producto[]>([])
const isLoading = ref(false)
const loadError = ref("")
const estadoFilter = ref("")

const estadoTabs = [
  { value: "", label: "Todos" },
  { value: "Borrador", label: "Borradores" },
  { value: "Emitida", label: "Emitidas" },
  { value: "ParcialmenteRecibida", label: "Parciales" },
  { value: "Recibida", label: "Recibidas" },
  { value: "Cancelada", label: "Canceladas" },
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
    case "Borrador":             return { bg: "#f3f4f6", text: "#374151" }
    case "Emitida":              return { bg: "#dbeafe", text: "#1e40af" }
    case "ParcialmenteRecibida": return { bg: "#fef3c7", text: "#92400e" }
    case "Recibida":             return { bg: "#dcfce7", text: "#166534" }
    case "Cancelada":            return { bg: "#fee2e2", text: "#991b1b" }
    default:                     return { bg: "#f3f4f6", text: "#374151" }
  }
}

function estadoLabel(estado: EstadoPedido) {
  return estado === "ParcialmenteRecibida" ? "Parcial" : estado
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "numeric" })
}

function formatPrice(n: number) {
  return new Intl.NumberFormat("es-PY", { style: "currency", currency: "PYG", maximumFractionDigits: 0 }).format(n)
}

function pedidoTotal(p: PedidoCompras) {
  return p.items.reduce((s, i) => s + i.cantidad * i.precioUnitario, 0)
}

async function load() {
  isLoading.value = true
  loadError.value = ""
  try {
    const [result, prov, prod] = await Promise.all([
      getComprasPedidos({
        estado: estadoFilter.value || undefined,
        page: currentPage.value,
        pageSize: PAGE_SIZE,
      }),
      getProveedores(),
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

function onFilterChange(v: string) {
  estadoFilter.value = v
  currentPage.value = 1
  load()
}

function goToPage(p: number) {
  currentPage.value = p
  load()
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
    await crearPedido({
      proveedorId: pedidoForm.proveedorId,
      observaciones: pedidoForm.observaciones.trim() || undefined,
      items: pedidoItems.value.map(({ productoId, cantidad, precioUnitario }) => ({
        productoId, cantidad, precioUnitario,
      })),
    })
    showCreateModal.value = false
    currentPage.value = 1
    estadoFilter.value = ""
    await load()
  } catch (err: unknown) {
    createError.value = err instanceof Error ? err.message : "Error al crear pedido."
  } finally {
    isSaving.value = false
  }
}

// ── Modal Detalle ──────────────────────────────────────────────────────────────

const showDetailModal = ref(false)
const detailPedido = ref<PedidoCompras | null>(null)
const detailError = ref("")
const isActionLoading = ref(false)

function openDetail(pedido: PedidoCompras) {
  detailPedido.value = pedido
  detailError.value = ""
  showDetailModal.value = true
}

function itemPendiente(item: PedidoItemCompras) {
  return item.cantidad - item.cantidadRecibida
}

async function onEmitir() {
  if (!detailPedido.value) return
  isActionLoading.value = true
  detailError.value = ""
  try {
    detailPedido.value = await emitirPedido(detailPedido.value.id)
    await load()
  } catch (err: unknown) {
    detailError.value = err instanceof Error ? err.message : "Error al emitir."
  } finally {
    isActionLoading.value = false
  }
}

async function onCancelar() {
  if (!detailPedido.value) return
  isActionLoading.value = true
  detailError.value = ""
  try {
    detailPedido.value = await cancelarPedido(detailPedido.value.id)
    await load()
  } catch (err: unknown) {
    detailError.value = err instanceof Error ? err.message : "Error al cancelar."
  } finally {
    isActionLoading.value = false
  }
}

// ── Modal Recepción ────────────────────────────────────────────────────────────

const showRecepcionModal = ref(false)
const recepcionError = ref("")
const isRecepcionSaving = ref(false)
const recepcionItems = ref<{ itemId: number; productoNombre: string; maximo: number; cantidadRecibida: number }[]>([])

function openRecepcion() {
  if (!detailPedido.value) return
  recepcionItems.value = detailPedido.value.items
    .filter((i) => itemPendiente(i) > 0)
    .map((i) => ({
      itemId: i.id,
      productoNombre: i.productoNombre,
      maximo: itemPendiente(i),
      cantidadRecibida: itemPendiente(i),
    }))
  recepcionError.value = ""
  showRecepcionModal.value = true
}

async function submitRecepcion() {
  if (!detailPedido.value) return
  const itemsValidos = recepcionItems.value.filter((i) => i.cantidadRecibida > 0)
  if (itemsValidos.length === 0) { recepcionError.value = "Ingresá al menos una cantidad mayor a cero."; return }

  isRecepcionSaving.value = true
  recepcionError.value = ""
  try {
    detailPedido.value = await registrarRecepcion(detailPedido.value.id, {
      items: itemsValidos.map(({ itemId, cantidadRecibida }) => ({ itemId, cantidadRecibida })),
    })
    showRecepcionModal.value = false
    await load()
  } catch (err: unknown) {
    recepcionError.value = err instanceof Error ? err.message : "Error al registrar recepción."
  } finally {
    isRecepcionSaving.value = false
  }
}

// ── Modal Devolución ───────────────────────────────────────────────────────────

const showDevolucionModal = ref(false)
const devolucionError = ref("")
const isDevolucionSaving = ref(false)
const devolucionForm = reactive({ itemId: null as number | null, cantidad: 1, motivo: "" })

function openDevolucion() {
  if (!detailPedido.value) return
  const primerItem = detailPedido.value.items.find((i) => i.cantidadRecibida > 0)
  devolucionForm.itemId = primerItem?.id ?? null
  devolucionForm.cantidad = 1
  devolucionForm.motivo = ""
  devolucionError.value = ""
  showDevolucionModal.value = true
}

function itemsConRecepcion() {
  return detailPedido.value?.items.filter((i) => i.cantidadRecibida > 0) ?? []
}

function maxDevolucion() {
  return detailPedido.value?.items.find((i) => i.id === devolucionForm.itemId)?.cantidadRecibida ?? 1
}

async function submitDevolucion() {
  if (!detailPedido.value) return
  if (!devolucionForm.itemId) { devolucionError.value = "Seleccioná un ítem."; return }
  if (devolucionForm.cantidad <= 0) { devolucionError.value = "La cantidad debe ser mayor a cero."; return }
  if (!devolucionForm.motivo.trim()) { devolucionError.value = "El motivo es obligatorio."; return }

  isDevolucionSaving.value = true
  devolucionError.value = ""
  try {
    await registrarDevolucion(detailPedido.value.id, {
      itemId: devolucionForm.itemId,
      cantidad: devolucionForm.cantidad,
      motivo: devolucionForm.motivo.trim(),
    })
    const { getComprasPedidoById } = await import("@/services/comprasService")
    detailPedido.value = await getComprasPedidoById(detailPedido.value.id)
    showDevolucionModal.value = false
    await load()
  } catch (err: unknown) {
    devolucionError.value = err instanceof Error ? err.message : "Error al registrar devolución."
  } finally {
    isDevolucionSaving.value = false
  }
}

// ── Modal Nuevo Proveedor (acceso rápido desde esta vista) ────────────────────

const showProveedorModal = ref(false)
const isProvSaving = ref(false)
const provError = ref("")
const provForm = reactive({ nombre: "", contacto: "", email: "", telefono: "" })

function openCreateProveedor() {
  Object.assign(provForm, { nombre: "", contacto: "", email: "", telefono: "" })
  provError.value = ""
  showProveedorModal.value = true
}

async function submitProveedor() {
  if (!provForm.nombre.trim()) { provError.value = "El nombre es obligatorio."; return }
  isProvSaving.value = true
  provError.value = ""
  try {
    const nuevo = await createProveedor({
      nombre: provForm.nombre.trim(),
      contacto: provForm.contacto.trim() || undefined,
      email: provForm.email.trim() || undefined,
      telefono: provForm.telefono.trim() || undefined,
    })
    showProveedorModal.value = false
    await load()
    // Autoseleccionar el proveedor recién creado en el formulario de nueva orden
    pedidoForm.proveedorId = nuevo.id
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
            <p class="text-sm font-medium" style="color: var(--color-outline)">
              {{ totalCount }} orden{{ totalCount !== 1 ? "es" : "" }} registrada{{ totalCount !== 1 ? "s" : "" }}
            </p>
          </div>
          <div class="flex gap-2">
            <BaseButton v-if="canManage" variant="secondary" size="default" @click="openCreateProveedor">
              <span class="material-symbols-outlined" style="font-size: 18px">add_business</span>
              Nuevo Proveedor
            </BaseButton>
            <BaseButton v-if="canManage" variant="primary" size="default" @click="openCreatePedido">
              <span class="material-symbols-outlined" style="font-size: 18px">add</span>
              Nueva Orden
            </BaseButton>
          </div>
        </div>

        <!-- Filtros de estado -->
        <FilterTabs :model-value="estadoFilter" :tabs="estadoTabs" class="mb-4"
          @update:model-value="onFilterChange" />

        <!-- Error -->
        <div v-if="loadError" class="flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium mb-6"
          style="background-color: var(--color-error-container); color: var(--color-on-error-container)">
          <span class="material-symbols-outlined" style="font-size: 18px">error</span>
          {{ loadError }}
        </div>

        <!-- Tabla -->
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
                — {{ formatPrice(item.items.reduce((s: number, i: PedidoItem) => s + i.cantidad * i.precioUnitario, 0)) }}
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
                class="w-8 h-8 rounded-full flex items-center justify-center hover:opacity-80"
                style="background-color: var(--color-surface-container-low)"
                title="Ver detalle"
              >
                <span class="material-symbols-outlined" style="font-size: 16px; color: var(--color-on-surface-variant)">open_in_new</span>
              </button>
            </div>
          </template>
        </BaseTable>

        <!-- Paginación -->
        <div v-if="totalPages > 1" class="flex items-center justify-between mt-4">
          <span class="text-sm" style="color: var(--color-outline)">
            Página {{ currentPage }} de {{ totalPages }}
          </span>
          <div class="flex gap-2">
            <BaseButton variant="secondary" size="sm" :disabled="currentPage <= 1" @click="goToPage(currentPage - 1)">
              <span class="material-symbols-outlined" style="font-size: 16px">chevron_left</span>
            </BaseButton>
            <BaseButton variant="secondary" size="sm" :disabled="currentPage >= totalPages" @click="goToPage(currentPage + 1)">
              <span class="material-symbols-outlined" style="font-size: 16px">chevron_right</span>
            </BaseButton>
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
          <label class="block text-xs font-bold uppercase tracking-wider mb-1.5" style="color: var(--color-outline)">Proveedor *</label>
          <div class="flex gap-2">
            <select v-model="pedidoForm.proveedorId" class="flex-1 px-4 py-3 rounded-xl text-sm outline-none"
              style="border: 1px solid var(--color-outline-variant); color: var(--color-on-surface); background: var(--color-surface)">
              <option :value="null" disabled>Seleccioná un proveedor</option>
              <option v-for="p in proveedores.filter(p => p.isActive)" :key="p.id" :value="p.id">{{ p.nombre }}</option>
            </select>
            <button
              type="button"
              @click="openCreateProveedor"
              class="flex-shrink-0 w-12 rounded-xl flex items-center justify-center transition-colors hover:opacity-80"
              style="background-color: var(--color-surface-container-low); border: 1px solid var(--color-outline-variant)"
              title="Agregar nuevo proveedor"
            >
              <span class="material-symbols-outlined" style="font-size: 20px; color: var(--color-primary)">add_business</span>
            </button>
          </div>
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
        <BaseButton class="flex-1" variant="secondary" size="default" @click="showCreateModal = false">Cancelar</BaseButton>
        <BaseButton class="flex-1" variant="primary" size="default" :disabled="isSaving" @click="submitCreatePedido">
          <svg v-if="isSaving" class="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          {{ isSaving ? "Creando..." : "Crear Borrador" }}
        </BaseButton>
      </template>
    </BaseModal>

    <!-- ── MODAL DETALLE ──────────────────────────────────────────────────────── -->
    <BaseModal :show="showDetailModal" title="Detalle de Orden" size="xl" @close="showDetailModal = false">
      <template v-if="detailPedido">
        <div v-if="detailError" class="flex items-center gap-2 rounded-xl px-3 py-2.5 mb-4 text-sm font-medium"
          style="background-color: var(--color-error-container); color: var(--color-on-error-container)">
          <span class="material-symbols-outlined flex-shrink-0" style="font-size: 16px">error</span>
          {{ detailError }}
        </div>

        <!-- Cabecera -->
        <div class="flex items-start justify-between mb-5">
          <div>
            <p class="text-xs font-bold uppercase tracking-wider mb-1" style="color: var(--color-outline)">Orden #{{ detailPedido.id }}</p>
            <p class="text-lg font-extrabold" style="color: var(--color-on-surface)">{{ detailPedido.proveedorNombre }}</p>
            <p class="text-sm mt-0.5" style="color: var(--color-on-surface-variant)">{{ formatDate(detailPedido.createdAt) }}</p>
            <p v-if="detailPedido.observaciones" class="text-sm mt-1 italic" style="color: var(--color-on-surface-variant)">
              {{ detailPedido.observaciones }}
            </p>
          </div>
          <span
            class="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-bold"
            :style="`background-color: ${estadoStyle(detailPedido.estado).bg}; color: ${estadoStyle(detailPedido.estado).text}`"
          >{{ estadoLabel(detailPedido.estado) }}</span>
        </div>

        <!-- Ítems -->
        <p class="text-xs font-bold uppercase tracking-wider mb-2" style="color: var(--color-outline)">Ítems</p>
        <div class="rounded-2xl overflow-hidden mb-5" style="border: 1px solid rgba(196,197,213,0.2)">
          <table class="w-full text-sm">
            <thead>
              <tr style="background-color: var(--color-surface-container-low)">
                <th class="text-left px-4 py-3 text-xs font-bold uppercase tracking-wider" style="color: var(--color-outline)">Producto</th>
                <th class="text-right px-4 py-3 text-xs font-bold uppercase tracking-wider" style="color: var(--color-outline)">Pedido</th>
                <th class="text-right px-4 py-3 text-xs font-bold uppercase tracking-wider" style="color: var(--color-outline)">Recibido</th>
                <th class="text-right px-4 py-3 text-xs font-bold uppercase tracking-wider" style="color: var(--color-outline)">Precio c/u</th>
                <th class="text-right px-4 py-3 text-xs font-bold uppercase tracking-wider" style="color: var(--color-outline)">Total</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in detailPedido.items" :key="item.id" style="border-top: 1px solid rgba(196,197,213,0.12)">
                <td class="px-4 py-3 font-medium" style="color: var(--color-on-surface)">{{ item.productoNombre }}</td>
                <td class="px-4 py-3 text-right" style="color: var(--color-on-surface-variant)">{{ item.cantidad }}</td>
                <td class="px-4 py-3 text-right">
                  <span :style="item.cantidadRecibida >= item.cantidad
                    ? 'color: #166534; font-weight: 600'
                    : item.cantidadRecibida > 0
                      ? 'color: #92400e; font-weight: 600'
                      : 'color: var(--color-on-surface-variant)'">
                    {{ item.cantidadRecibida }}
                  </span>
                </td>
                <td class="px-4 py-3 text-right" style="color: var(--color-on-surface-variant)">{{ formatPrice(item.precioUnitario) }}</td>
                <td class="px-4 py-3 text-right font-semibold" style="color: var(--color-on-surface)">{{ formatPrice(item.cantidad * item.precioUnitario) }}</td>
              </tr>
            </tbody>
            <tfoot>
              <tr style="border-top: 1px solid rgba(196,197,213,0.3); background-color: var(--color-surface-container-low)">
                <td colspan="4" class="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider" style="color: var(--color-outline)">Total Orden</td>
                <td class="px-4 py-3 text-right font-extrabold" style="color: var(--color-primary)">{{ formatPrice(pedidoTotal(detailPedido)) }}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        <!-- Devoluciones -->
        <template v-if="detailPedido.devoluciones.length > 0">
          <p class="text-xs font-bold uppercase tracking-wider mb-2" style="color: var(--color-outline)">Devoluciones</p>
          <div class="space-y-2 mb-5">
            <div v-for="dev in detailPedido.devoluciones" :key="dev.id"
              class="flex items-center justify-between px-4 py-3 rounded-xl text-sm"
              style="background-color: #fee2e2">
              <div>
                <span class="font-semibold" style="color: #991b1b">{{ dev.productoNombre }}</span>
                <span class="ml-2" style="color: #b91c1c">· {{ dev.cantidad }} und.</span>
                <span class="ml-2 italic" style="color: #991b1b">{{ dev.motivo }}</span>
              </div>
              <span class="text-xs" style="color: #b91c1c">{{ formatDate(dev.createdAt) }}</span>
            </div>
          </div>
        </template>

        <!-- Acciones según estado -->
        <div v-if="canManage" class="flex flex-wrap gap-2">
          <BaseButton
            v-if="detailPedido.estado === 'Borrador'"
            variant="primary" size="sm" :disabled="isActionLoading"
            @click="onEmitir"
          >
            <span class="material-symbols-outlined" style="font-size: 16px">send</span>
            Emitir al proveedor
          </BaseButton>

          <BaseButton
            v-if="detailPedido.estado === 'Emitida' || detailPedido.estado === 'ParcialmenteRecibida'"
            variant="secondary" size="sm"
            @click="openRecepcion"
          >
            <span class="material-symbols-outlined" style="font-size: 16px">inventory</span>
            Registrar recepción
          </BaseButton>

          <BaseButton
            v-if="detailPedido.estado === 'Recibida' || detailPedido.estado === 'ParcialmenteRecibida'"
            variant="secondary" size="sm"
            @click="openDevolucion"
          >
            <span class="material-symbols-outlined" style="font-size: 16px">undo</span>
            Registrar devolución
          </BaseButton>

          <BaseButton
            v-if="detailPedido.estado !== 'Recibida' && detailPedido.estado !== 'Cancelada'"
            variant="danger" size="sm" :disabled="isActionLoading"
            @click="onCancelar"
          >
            <span class="material-symbols-outlined" style="font-size: 16px">cancel</span>
            Cancelar orden
          </BaseButton>
        </div>
      </template>

      <template #footer>
        <BaseButton class="flex-1" variant="secondary" size="default" @click="showDetailModal = false">Cerrar</BaseButton>
      </template>
    </BaseModal>

    <!-- ── MODAL RECEPCIÓN ────────────────────────────────────────────────────── -->
    <BaseModal :show="showRecepcionModal" title="Registrar Recepción" size="md" @close="showRecepcionModal = false">
      <div v-if="recepcionError" class="flex items-center gap-2 rounded-xl px-3 py-2.5 mb-4 text-sm font-medium"
        style="background-color: var(--color-error-container); color: var(--color-on-error-container)">
        <span class="material-symbols-outlined flex-shrink-0" style="font-size: 16px">error</span>
        {{ recepcionError }}
      </div>

      <p class="text-sm mb-4" style="color: var(--color-on-surface-variant)">
        Ingresá la cantidad recibida por ítem. Podés recibir menos de lo pedido (recepción parcial).
      </p>

      <div class="space-y-3">
        <div v-for="item in recepcionItems" :key="item.itemId"
          class="flex items-center gap-3 p-3 rounded-xl"
          style="background-color: var(--color-surface-container-low)">
          <div class="flex-1 min-w-0">
            <p class="text-sm font-semibold truncate" style="color: var(--color-on-surface)">{{ item.productoNombre }}</p>
            <p class="text-xs" style="color: var(--color-outline)">Pendiente: {{ item.maximo }}</p>
          </div>
          <input v-model.number="item.cantidadRecibida" type="number" :min="0" :max="item.maximo"
            class="w-24 px-3 py-2 rounded-xl text-sm text-right outline-none"
            style="border: 1px solid var(--color-outline-variant); background: var(--color-surface); color: var(--color-on-surface)" />
        </div>
      </div>

      <template #footer>
        <BaseButton class="flex-1" variant="secondary" size="default" @click="showRecepcionModal = false">Cancelar</BaseButton>
        <BaseButton class="flex-1" variant="primary" size="default" :disabled="isRecepcionSaving" @click="submitRecepcion">
          <svg v-if="isRecepcionSaving" class="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          {{ isRecepcionSaving ? "Guardando..." : "Confirmar Recepción" }}
        </BaseButton>
      </template>
    </BaseModal>

    <!-- ── MODAL DEVOLUCIÓN ───────────────────────────────────────────────────── -->
    <BaseModal :show="showDevolucionModal" title="Registrar Devolución" size="md" @close="showDevolucionModal = false">
      <div v-if="devolucionError" class="flex items-center gap-2 rounded-xl px-3 py-2.5 mb-4 text-sm font-medium"
        style="background-color: var(--color-error-container); color: var(--color-on-error-container)">
        <span class="material-symbols-outlined flex-shrink-0" style="font-size: 16px">error</span>
        {{ devolucionError }}
      </div>

      <div class="space-y-4">
        <div>
          <label class="block text-xs font-bold uppercase tracking-wider mb-1.5" style="color: var(--color-outline)">Producto a devolver *</label>
          <select v-model="devolucionForm.itemId" class="w-full px-4 py-3 rounded-xl text-sm outline-none"
            style="border: 1px solid var(--color-outline-variant); color: var(--color-on-surface); background: var(--color-surface)">
            <option :value="null" disabled>Seleccioná un ítem</option>
            <option v-for="item in itemsConRecepcion()" :key="item.id" :value="item.id">
              {{ item.productoNombre }} (recibidos: {{ item.cantidadRecibida }})
            </option>
          </select>
        </div>
        <div>
          <label class="block text-xs font-bold uppercase tracking-wider mb-1.5" style="color: var(--color-outline)">Cantidad *</label>
          <input v-model.number="devolucionForm.cantidad" type="number" min="1" :max="maxDevolucion()"
            class="w-full px-4 py-3 rounded-xl text-sm outline-none"
            style="border: 1px solid var(--color-outline-variant); color: var(--color-on-surface); background: var(--color-surface)" />
          <p class="text-xs mt-1" style="color: var(--color-outline)">Máximo: {{ maxDevolucion() }}</p>
        </div>
        <div>
          <label class="block text-xs font-bold uppercase tracking-wider mb-1.5" style="color: var(--color-outline)">Motivo *</label>
          <input v-model="devolucionForm.motivo" type="text" placeholder="Defecto, daño, error de pedido..."
            class="w-full px-4 py-3 rounded-xl text-sm outline-none"
            style="border: 1px solid var(--color-outline-variant); color: var(--color-on-surface); background: var(--color-surface)" />
        </div>
      </div>

      <template #footer>
        <BaseButton class="flex-1" variant="secondary" size="default" @click="showDevolucionModal = false">Cancelar</BaseButton>
        <BaseButton class="flex-1" variant="danger" size="default" :disabled="isDevolucionSaving" @click="submitDevolucion">
          <svg v-if="isDevolucionSaving" class="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          {{ isDevolucionSaving ? "Registrando..." : "Confirmar Devolución" }}
        </BaseButton>
      </template>
    </BaseModal>

    <!-- ── MODAL NUEVO PROVEEDOR (acceso rápido) ──────────────────────────────── -->
    <BaseModal :show="showProveedorModal" title="Nuevo Proveedor" size="md" @close="showProveedorModal = false">
      <div v-if="provError" class="flex items-center gap-2 rounded-xl px-3 py-2.5 mb-4 text-sm font-medium"
        style="background-color: var(--color-error-container); color: var(--color-on-error-container)">
        <span class="material-symbols-outlined flex-shrink-0" style="font-size: 16px">error</span>
        {{ provError }}
      </div>

      <div class="space-y-4">
        <div>
          <label class="block text-xs font-bold uppercase tracking-wider mb-1.5" style="color: var(--color-outline)">Nombre *</label>
          <input v-model="provForm.nombre" type="text" class="w-full px-4 py-3 rounded-xl text-sm outline-none"
            style="border: 1px solid var(--color-outline-variant); color: var(--color-on-surface); background: var(--color-surface)" />
        </div>
        <div>
          <label class="block text-xs font-bold uppercase tracking-wider mb-1.5" style="color: var(--color-outline)">Persona de contacto</label>
          <input v-model="provForm.contacto" type="text" class="w-full px-4 py-3 rounded-xl text-sm outline-none"
            style="border: 1px solid var(--color-outline-variant); color: var(--color-on-surface); background: var(--color-surface)" />
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-xs font-bold uppercase tracking-wider mb-1.5" style="color: var(--color-outline)">Email</label>
            <input v-model="provForm.email" type="email" class="w-full px-4 py-3 rounded-xl text-sm outline-none"
              style="border: 1px solid var(--color-outline-variant); color: var(--color-on-surface); background: var(--color-surface)" />
          </div>
          <div>
            <label class="block text-xs font-bold uppercase tracking-wider mb-1.5" style="color: var(--color-outline)">Teléfono</label>
            <input v-model="provForm.telefono" type="text" class="w-full px-4 py-3 rounded-xl text-sm outline-none"
              style="border: 1px solid var(--color-outline-variant); color: var(--color-on-surface); background: var(--color-surface)" />
          </div>
        </div>
      </div>

      <template #footer>
        <BaseButton class="flex-1" variant="secondary" size="default" @click="showProveedorModal = false">Cancelar</BaseButton>
        <BaseButton class="flex-1" variant="primary" size="default" :disabled="isProvSaving" @click="submitProveedor">
          <svg v-if="isProvSaving" class="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          {{ isProvSaving ? "Creando..." : "Crear Proveedor" }}
        </BaseButton>
      </template>
    </BaseModal>

  </div>
</template>
