<script setup lang="ts">
import { inputStyle } from "@/composables/useFieldStyles"
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
  type CreateProveedorRequest,
  createProveedor,
} from "@/services/inventarioService"
import {
  type PedidoCompras,
  type EstadoPedido,
  getComprasPedidos,
  cancelarPedido,
} from "@/services/comprasService"
import RowContextMenu, { type ContextMenuItem } from "@/components/RowContextMenu.vue"

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

const isLoading = ref(false)
const loadError = ref("")
const estadoFilter = ref<string[]>([])

const estadoOptions = [
  { value: "Borrador",        label: "Borradores",   dot: "var(--color-on-surface-variant)" },
  { value: "Confirmada",      label: "Confirmadas",  dot: "var(--color-on-info-container)" },
  { value: "Facturada",       label: "Facturadas",   dot: "var(--color-tertiary)" },
  { value: "RecibidaParcial", label: "Parciales",    dot: "var(--color-on-warning-container)" },
  { value: "RecibidaTotal",   label: "Recibidas",    dot: "var(--color-on-success-container)" },
  { value: "Cancelada",       label: "Canceladas",   dot: "var(--color-on-error-container)" },
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
    case "Borrador":        return { bg: "var(--color-surface-container)", text: "var(--color-on-surface-variant)" }
    case "Confirmada":      return { bg: "var(--color-info-container)", text: "var(--color-on-info-container)" }
    case "Facturada":       return { bg: "color-mix(in srgb, var(--color-tertiary) 12%, var(--color-surface-container-lowest))", text: "var(--color-tertiary)" }
    case "RecibidaParcial": return { bg: "var(--color-warning-container)", text: "var(--color-on-warning-container)" }
    case "RecibidaTotal":   return { bg: "var(--color-success-container)", text: "var(--color-on-success-container)" }
    case "Cancelada":       return { bg: "var(--color-error-container)", text: "var(--color-on-error-container)" }
    default:                return { bg: "var(--color-surface-container)", text: "var(--color-on-surface-variant)" }
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
    const result = await getComprasPedidos({
      estado: estadoFilter.value[0] || undefined,
      page: currentPage.value,
      pageSize: PAGE_SIZE,
    })
    pedidos.value = result.items
    totalCount.value = result.totalCount
    totalPages.value = result.totalPages
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

function openCreatePedido() {
  router.push("/compras/oc/nueva")
}

function openEditPedido(pedido: PedidoCompras) {
  router.push(`/compras/oc/${pedido.id}/editar`)
}

// ── Menú contextual de fila ────────────────────────────────────────────────────

function rowMenuItems(pedido: PedidoCompras): ContextMenuItem[] {
  const esBorrador   = pedido.estado === "Borrador"
  const canGestionar = esBorrador && canManage.value

  return [
    {
      type: "item",
      label: "Ver detalle",
      icon: "open_in_new",
      action: () => openDetail(pedido),
    },
    {
      type: "item",
      label: "Editar OC",
      icon: "edit",
      action: () => openEditPedido(pedido),
      hidden: !canGestionar,
    },
    ...(canGestionar ? [{ type: "separator" as const }] : []),
    {
      type: "item",
      label: "Cancelar OC",
      icon: "cancel",
      action: () => openCancelarModal(pedido),
      danger: true,
      hidden: !canGestionar,
    },
  ]
}

// ── Modal Cancelar OC ──────────────────────────────────────────────────────────

const showCancelarModal = ref(false)
const cancelarTarget = ref<PedidoCompras | null>(null)
const isCancelando = ref(false)
const cancelarError = ref("")

function openCancelarModal(pedido: PedidoCompras) {
  cancelarTarget.value = pedido
  cancelarError.value = ""
  showCancelarModal.value = true
}

async function submitCancelar() {
  if (!cancelarTarget.value) return
  isCancelando.value = true
  cancelarError.value = ""
  try {
    await cancelarPedido(cancelarTarget.value.id)
    showCancelarModal.value = false
    await load()
  } catch (err: unknown) {
    cancelarError.value = err instanceof Error ? err.message : "Error al cancelar la orden."
  } finally {
    isCancelando.value = false
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
  ciudadId: undefined,
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
      <div class="p-4 sm:p-6 lg:p-8">

        <!-- Header -->
        <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-8">
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
        <div class="flex items-center gap-3 mb-8 flex-wrap">
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
        <div class="rounded-lg overflow-hidden" style="background-color: var(--color-surface-container-lowest); box-shadow: var(--shadow-sm); outline: 1px solid var(--color-hairline);">
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
              <div class="flex flex-col gap-1 items-start">
                <span
                  class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold"
                  :style="`background-color: ${estadoStyle(item.estado).bg}; color: ${estadoStyle(item.estado).text}`"
                >{{ estadoLabel(item.estado) }}</span>
                <span v-if="item.estado === 'Borrador'"
                  class="text-xs font-medium"
                  style="color: var(--color-outline)">
                  Pendiente de aprobación
                </span>
              </div>
            </template>

            <template #acciones="{ item }">
              <div class="flex justify-end">
                <RowContextMenu :items="rowMenuItems(item)" />
              </div>
            </template>
          </BaseTable>

          <!-- Footer paginador -->
          <div
            v-if="pedidos.length > 0"
            class="px-6 py-4 flex items-center justify-between flex-wrap gap-4"
            style="border-top: 1px solid var(--color-hairline-soft); background-color: var(--color-surface-container-lowest);"
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
                  :class="currentPage === p ? 'bg-primary text-on-primary' : 'text-on-surface-variant hover:bg-surface-container-high'"
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

    <!-- ── MODAL CANCELAR OC ─────────────────────────────────────────────────── -->
    <BaseModal :show="showCancelarModal" title="Cancelar Orden de Compra" size="sm" @close="showCancelarModal = false">
      <div class="flex flex-col items-center text-center gap-4 py-2">
        <div class="w-14 h-14 rounded-2xl flex items-center justify-center" style="background-color: var(--color-error-container)">
          <span class="material-symbols-outlined" style="font-size: 28px; color: var(--color-error)">cancel</span>
        </div>
        <div>
          <p class="text-sm font-semibold mb-1" style="color: var(--color-on-surface)">
            ¿Cancelar la OC <strong>#{{ cancelarTarget?.id }}</strong>?
          </p>
          <p class="text-sm" style="color: var(--color-on-surface-variant)">
            Esta acción no se puede deshacer. La orden quedará en estado <strong>Cancelada</strong>.
          </p>
        </div>
        <div v-if="cancelarError" class="w-full flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium"
          style="background-color: var(--color-error-container); color: var(--color-on-error-container)">
          <span class="material-symbols-outlined flex-shrink-0" style="font-size: 16px">error</span>
          {{ cancelarError }}
        </div>
      </div>
      <template #footer>
        <BaseButton variant="secondary" @click="showCancelarModal = false" :disabled="isCancelando">Volver</BaseButton>
        <BaseButton variant="danger" :disabled="isCancelando" @click="submitCancelar">
          {{ isCancelando ? "Cancelando…" : "Sí, cancelar" }}
        </BaseButton>
      </template>
    </BaseModal>

    <!-- ── MODAL NUEVO PROVEEDOR ──────────────────────────────────────────────── -->
    <BaseModal :show="showProveedorModal" title="Nuevo Proveedor" size="lg" @close="showProveedorModal = false">
      <div v-if="provError" class="flex items-center gap-2 rounded-2xl px-4 py-3 mb-4 text-sm font-medium"
        style="background-color: var(--color-error-container); color: var(--color-on-error-container)">
        <span class="material-symbols-outlined flex-shrink-0" style="font-size: 18px">error</span>
        {{ provError }}
      </div>

      <div class="space-y-4">
        <div>
          <label class="block text-xs font-bold uppercase tracking-wider mb-1.5" style="color: var(--color-outline)">Nombre comercial *</label>
          <input v-model="provForm.nombre" type="text" class="w-full px-4 h-12 text-sm outline-none appearance-none shadow-none transition-all"
            :style="inputStyle(false)" />
        </div>

        <p class="text-xs font-bold uppercase tracking-wider pt-2" style="color: var(--color-primary)">Datos fiscales</p>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label class="block text-xs font-bold uppercase tracking-wider mb-1.5" style="color: var(--color-outline)">RUC *</label>
            <input v-model="provForm.ruc" type="text" placeholder="80012345-6"
              class="w-full px-4 h-12 text-sm outline-none appearance-none shadow-none transition-all font-mono"
              :style="inputStyle(false)" />
          </div>
          <div>
            <label class="block text-xs font-bold uppercase tracking-wider mb-1.5" style="color: var(--color-outline)">Razón social</label>
            <input v-model="provForm.razonSocial" type="text"
              class="w-full px-4 h-12 text-sm outline-none appearance-none shadow-none transition-all"
              :style="inputStyle(false)" />
          </div>
        </div>

        <p class="text-xs text-center pt-1" style="color: var(--color-outline)">
          Para agregar contactos y más datos, usá la sección de Proveedores.
        </p>
      </div>

      <template #footer>
        <div class="flex justify-between w-full">
          <BaseButton variant="secondary" size="default" @click="showProveedorModal = false">Cancelar</BaseButton>
          <BaseButton variant="primary" size="default" :disabled="isProvSaving" @click="submitProveedor">
            {{ isProvSaving ? "Creando…" : "Crear Proveedor" }}
          </BaseButton>
        </div>
      </template>
    </BaseModal>

  </div>
</template>
