<script setup lang="ts">
import { ref, computed, onMounted, reactive } from "vue"
import { useRoute, useRouter } from "vue-router"
import AppSidebar from "@/components/AppSidebar.vue"
import AppHeader from "@/components/AppHeader.vue"
import BaseButton from "@/components/BaseButton.vue"
import BaseModal from "@/components/BaseModal.vue"
import { useAuthStore } from "@/stores/auth"
import {
  type PedidoCompras,
  type PedidoItemCompras,
  type EstadoPedido,
  getComprasPedidoById,
  confirmarPedido,
  registrarFactura,
  registrarRecepcion,
  registrarDevolucion,
  cancelarPedido,
} from "@/services/comprasService"

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const canManage = computed(() => auth.hasPermission("gestionar_pedidos"))

const ocId = Number(route.params.id)

// ── Estado principal ───────────────────────────────────────────────────────────

const pedido = ref<PedidoCompras | null>(null)
const isLoading = ref(true)
const loadError = ref("")
const activeTab = ref<"detalle" | "factura" | "recepciones" | "devoluciones">("detalle")

async function load() {
  isLoading.value = true
  loadError.value = ""
  try {
    pedido.value = await getComprasPedidoById(ocId)
  } catch (err: unknown) {
    loadError.value = err instanceof Error ? err.message : "Error al cargar la orden."
  } finally {
    isLoading.value = false
  }
}

onMounted(load)

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "numeric" })
}

function formatPrice(n: number) {
  return new Intl.NumberFormat("es-PY", { style: "currency", currency: "PYG", maximumFractionDigits: 0 }).format(n)
}

function pedidoTotal() {
  return (pedido.value?.items ?? []).reduce((s, i) => s + i.cantidad * i.precioUnitario, 0)
}

function itemPendiente(item: PedidoItemCompras) {
  return item.cantidad - item.cantidadRecibida
}

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
    case "RecibidaParcial": return "Recibida parcial"
    case "RecibidaTotal":   return "Recibida total"
    default:                return estado
  }
}

// ── Acción: Confirmar ──────────────────────────────────────────────────────────

const isConfirmando = ref(false)
const confirmError = ref("")

async function onConfirmar() {
  if (!pedido.value) return
  isConfirmando.value = true
  confirmError.value = ""
  try {
    pedido.value = await confirmarPedido(pedido.value.id)
  } catch (err: unknown) {
    confirmError.value = err instanceof Error ? err.message : "Error al confirmar."
  } finally {
    isConfirmando.value = false
  }
}

// ── Acción: Cancelar ──────────────────────────────────────────────────────────

const isCancelando = ref(false)
const cancelError = ref("")
const showCancelModal = ref(false)

async function onCancelar() {
  if (!pedido.value) return
  isCancelando.value = true
  cancelError.value = ""
  try {
    pedido.value = await cancelarPedido(pedido.value.id)
    showCancelModal.value = false
  } catch (err: unknown) {
    cancelError.value = err instanceof Error ? err.message : "Error al cancelar."
  } finally {
    isCancelando.value = false
  }
}

// ── Acción: Registrar Factura ─────────────────────────────────────────────────

const showFacturaModal = ref(false)
const isFacturaSaving = ref(false)
const facturaError = ref("")

const facturaForm = reactive({
  nroFactura: "",
  fechaEmision: new Date().toISOString().slice(0, 10),
  fechaVencimiento: "",
  condicionVenta: "Contado",
  montoExento: 0,
  montoGravado5: 0,
  montoGravado10: 0,
  observaciones: "",
})

const montoTotalFactura = computed(() =>
  facturaForm.montoExento + facturaForm.montoGravado5 + facturaForm.montoGravado10,
)
const iva5Calculado = computed(() => Math.round(facturaForm.montoGravado5 / 21))
const iva10Calculado = computed(() => Math.round(facturaForm.montoGravado10 / 11))

function openFacturaModal() {
  facturaForm.nroFactura = ""
  facturaForm.fechaEmision = new Date().toISOString().slice(0, 10)
  facturaForm.fechaVencimiento = ""
  facturaForm.condicionVenta = "Contado"
  facturaForm.montoExento = 0
  facturaForm.montoGravado5 = 0
  facturaForm.montoGravado10 = 0
  facturaForm.observaciones = ""
  facturaError.value = ""
  showFacturaModal.value = true
}

async function submitFactura() {
  if (!pedido.value) return
  const nroRegex = /^\d{3}-\d{3}-\d{7}$/
  if (!nroRegex.test(facturaForm.nroFactura.trim())) {
    facturaError.value = "Formato inválido. Esperado: 001-001-0000001"
    return
  }
  if (!facturaForm.fechaEmision) { facturaError.value = "La fecha de emisión es obligatoria."; return }
  if (facturaForm.montoExento <= 0 && facturaForm.montoGravado5 <= 0 && facturaForm.montoGravado10 <= 0) {
    facturaError.value = "Al menos un monto debe ser mayor a 0."
    return
  }
  if (facturaForm.condicionVenta === "Credito" && !facturaForm.fechaVencimiento) {
    facturaError.value = "La fecha de vencimiento es obligatoria para crédito."
    return
  }

  isFacturaSaving.value = true
  facturaError.value = ""
  try {
    pedido.value = await registrarFactura(pedido.value.id, {
      nroFactura: facturaForm.nroFactura.trim(),
      fechaEmision: facturaForm.fechaEmision,
      fechaVencimiento: facturaForm.fechaVencimiento || undefined,
      condicionVenta: facturaForm.condicionVenta,
      montoExento: facturaForm.montoExento,
      montoGravado5: facturaForm.montoGravado5,
      montoGravado10: facturaForm.montoGravado10,
      observaciones: facturaForm.observaciones.trim() || undefined,
    })
    showFacturaModal.value = false
    activeTab.value = "factura"
  } catch (err: unknown) {
    facturaError.value = err instanceof Error ? err.message : "Error al registrar factura."
  } finally {
    isFacturaSaving.value = false
  }
}

// ── Acción: Registrar Recepción ───────────────────────────────────────────────

const showRecepcionModal = ref(false)
const isRecepcionSaving = ref(false)
const recepcionError = ref("")
const recepcionObservaciones = ref("")
const recepcionItems = ref<{ itemId: number; productoNombre: string; maximo: number; cantidadRecibida: number }[]>([])

function openRecepcionModal() {
  if (!pedido.value) return
  recepcionItems.value = pedido.value.items
    .filter((i) => itemPendiente(i) > 0)
    .map((i) => ({
      itemId: i.id,
      productoNombre: i.productoNombre,
      maximo: itemPendiente(i),
      cantidadRecibida: itemPendiente(i),
    }))
  recepcionObservaciones.value = ""
  recepcionError.value = ""
  showRecepcionModal.value = true
}

async function submitRecepcion() {
  if (!pedido.value) return
  const itemsValidos = recepcionItems.value.filter((i) => i.cantidadRecibida > 0)
  if (itemsValidos.length === 0) { recepcionError.value = "Ingresá al menos una cantidad mayor a cero."; return }

  isRecepcionSaving.value = true
  recepcionError.value = ""
  try {
    pedido.value = await registrarRecepcion(pedido.value.id, {
      observaciones: recepcionObservaciones.value.trim() || undefined,
      items: itemsValidos.map(({ itemId, cantidadRecibida }) => ({ itemId, cantidadRecibida })),
    })
    showRecepcionModal.value = false
    activeTab.value = "recepciones"
  } catch (err: unknown) {
    recepcionError.value = err instanceof Error ? err.message : "Error al registrar recepción."
  } finally {
    isRecepcionSaving.value = false
  }
}

// ── Acción: Registrar Devolución ──────────────────────────────────────────────

const showDevolucionModal = ref(false)
const isDevolucionSaving = ref(false)
const devolucionError = ref("")
const devolucionForm = reactive({ itemId: null as number | null, cantidad: 1, motivo: "" })

function openDevolucionModal() {
  if (!pedido.value) return
  const primerItem = pedido.value.items.find((i) => i.cantidadRecibida > 0)
  devolucionForm.itemId = primerItem?.id ?? null
  devolucionForm.cantidad = 1
  devolucionForm.motivo = ""
  devolucionError.value = ""
  showDevolucionModal.value = true
}

function itemsConRecepcion() {
  return pedido.value?.items.filter((i) => i.cantidadRecibida > 0) ?? []
}

function maxDevolucion() {
  return pedido.value?.items.find((i) => i.id === devolucionForm.itemId)?.cantidadRecibida ?? 1
}

async function submitDevolucion() {
  if (!pedido.value || !devolucionForm.itemId) { devolucionError.value = "Seleccioná un ítem."; return }
  if (devolucionForm.cantidad <= 0) { devolucionError.value = "La cantidad debe ser mayor a cero."; return }
  if (!devolucionForm.motivo.trim()) { devolucionError.value = "El motivo es obligatorio."; return }

  isDevolucionSaving.value = true
  devolucionError.value = ""
  try {
    await registrarDevolucion(pedido.value.id, {
      itemId: devolucionForm.itemId,
      cantidad: devolucionForm.cantidad,
      motivo: devolucionForm.motivo.trim(),
    })
    pedido.value = await getComprasPedidoById(pedido.value.id)
    showDevolucionModal.value = false
    activeTab.value = "devoluciones"
  } catch (err: unknown) {
    devolucionError.value = err instanceof Error ? err.message : "Error al registrar devolución."
  } finally {
    isDevolucionSaving.value = false
  }
}
</script>

<template>
  <div class="min-h-screen" style="background-color: var(--color-background)">
    <AppSidebar />
    <AppHeader />

    <main style="margin-left: var(--sidebar-width); transition: margin-left 0.25s ease; padding-top: 64px">
      <div class="p-8">

        <!-- Loading -->
        <div v-if="isLoading" class="flex items-center justify-center py-20">
          <span class="material-symbols-outlined animate-spin text-4xl" style="color: var(--color-primary)">progress_activity</span>
        </div>

        <!-- Error -->
        <div v-else-if="loadError" class="flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium"
          style="background-color: var(--color-error-container); color: var(--color-on-error-container)">
          <span class="material-symbols-outlined" style="font-size: 18px">error</span>
          {{ loadError }}
        </div>

        <template v-else-if="pedido">

          <!-- Breadcrumb + Header -->
          <div class="mb-8">
            <button
              @click="router.push('/inventario/pedidos')"
              class="flex items-center gap-1.5 text-sm font-semibold mb-4 transition-all hover:opacity-75"
              style="color: var(--color-primary)"
            >
              <span class="material-symbols-outlined" style="font-size: 18px">arrow_back</span>
              Órdenes de Compra
            </button>

            <div class="flex items-start justify-between">
              <div>
                <div class="flex items-center gap-3 mb-1">
                  <h1 class="text-4xl font-extrabold tracking-tight">OC #{{ pedido.id }}</h1>
                  <span
                    class="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-bold"
                    :style="`background-color: ${estadoStyle(pedido.estado).bg}; color: ${estadoStyle(pedido.estado).text}`"
                  >{{ estadoLabel(pedido.estado) }}</span>
                </div>
                <p class="font-medium" style="color: var(--color-on-surface-variant)">
                  {{ pedido.proveedorNombre }} · {{ formatDate(pedido.createdAt) }}
                  <span v-if="pedido.observaciones" class="italic"> · {{ pedido.observaciones }}</span>
                </p>
              </div>

              <!-- Acciones según estado -->
              <div v-if="canManage" class="flex items-center gap-2 flex-wrap">
                <BaseButton
                  v-if="pedido.estado === 'Borrador'"
                  variant="primary" size="lg" :disabled="isConfirmando"
                  @click="onConfirmar"
                >
                  <span class="material-symbols-outlined" style="font-size: 18px">send</span>
                  {{ isConfirmando ? "Confirmando…" : "Confirmar OC" }}
                </BaseButton>

                <BaseButton
                  v-if="pedido.estado === 'Confirmada'"
                  variant="primary" size="lg"
                  @click="openFacturaModal"
                >
                  <span class="material-symbols-outlined" style="font-size: 18px">receipt</span>
                  Registrar Factura
                </BaseButton>

                <BaseButton
                  v-if="pedido.estado === 'Facturada' || pedido.estado === 'RecibidaParcial'"
                  variant="secondary" size="lg"
                  @click="openRecepcionModal"
                >
                  <span class="material-symbols-outlined" style="font-size: 18px">inventory</span>
                  Registrar Recepción
                </BaseButton>

                <BaseButton
                  v-if="pedido.estado === 'RecibidaTotal' || pedido.estado === 'RecibidaParcial'"
                  variant="secondary" size="lg"
                  @click="openDevolucionModal"
                >
                  <span class="material-symbols-outlined" style="font-size: 18px">undo</span>
                  Registrar Devolución
                </BaseButton>

                <BaseButton
                  v-if="pedido.estado !== 'RecibidaTotal' && pedido.estado !== 'Cancelada'"
                  variant="danger" size="lg"
                  @click="showCancelModal = true"
                >
                  <span class="material-symbols-outlined" style="font-size: 18px">cancel</span>
                  Cancelar OC
                </BaseButton>
              </div>
            </div>

            <!-- Error de acción -->
            <div v-if="confirmError" class="mt-3 flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium"
              style="background-color: var(--color-error-container); color: var(--color-on-error-container)">
              <span class="material-symbols-outlined flex-shrink-0" style="font-size: 16px">error</span>
              {{ confirmError }}
            </div>
          </div>

          <!-- Tabs -->
          <div class="flex gap-1 mb-6 p-1 rounded-2xl w-fit"
            style="background-color: var(--color-surface-container-low)">
            <button
              v-for="tab in [
                { key: 'detalle', label: 'Detalle', icon: 'description' },
                { key: 'factura', label: 'Factura', icon: 'receipt', badge: pedido.factura ? '✓' : null },
                { key: 'recepciones', label: 'Recepciones', icon: 'inventory', badge: pedido.recepciones.length || null },
                { key: 'devoluciones', label: 'Devoluciones', icon: 'undo', badge: pedido.devoluciones.length || null },
              ]"
              :key="tab.key"
              @click="activeTab = (tab.key as typeof activeTab)"
              class="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all"
              :style="activeTab === tab.key
                ? 'background-color: var(--color-surface-container-highest); color: var(--color-primary); box-shadow: 0 1px 4px rgba(0,0,0,0.08)'
                : 'color: var(--color-on-surface-variant)'"
            >
              <span class="material-symbols-outlined" style="font-size: 16px">{{ tab.icon }}</span>
              {{ tab.label }}
              <span v-if="tab.badge" class="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-xs font-bold"
                :style="activeTab === tab.key
                  ? 'background-color: var(--color-primary); color: #fff'
                  : 'background-color: var(--color-outline-variant); color: var(--color-on-surface-variant)'"
              >{{ tab.badge }}</span>
            </button>
          </div>

          <!-- ─── TAB: DETALLE ──────────────────────────────────────────────── -->
          <div v-show="activeTab === 'detalle'">
            <div class="rounded-2xl overflow-hidden"
              style="background-color: var(--color-surface-container-lowest); box-shadow: 0 1px 3px rgba(196, 197, 213, 0.25); outline: 1px solid rgba(196, 197, 213, 0.15);">
              <table class="w-full text-sm">
                <thead>
                  <tr style="background-color: var(--color-surface-container-low)">
                    <th class="text-left px-6 py-4 text-xs font-bold uppercase tracking-wider" style="color: var(--color-outline)">Producto</th>
                    <th class="text-right px-6 py-4 text-xs font-bold uppercase tracking-wider" style="color: var(--color-outline)">Pedido</th>
                    <th class="text-right px-6 py-4 text-xs font-bold uppercase tracking-wider" style="color: var(--color-outline)">Recibido</th>
                    <th class="text-right px-6 py-4 text-xs font-bold uppercase tracking-wider" style="color: var(--color-outline)">Precio c/u</th>
                    <th class="text-right px-6 py-4 text-xs font-bold uppercase tracking-wider" style="color: var(--color-outline)">Total</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="item in pedido.items" :key="item.id"
                    style="border-top: 1px solid rgba(196,197,213,0.12)">
                    <td class="px-6 py-4 font-medium" style="color: var(--color-on-surface)">{{ item.productoNombre }}</td>
                    <td class="px-6 py-4 text-right" style="color: var(--color-on-surface-variant)">{{ item.cantidad }}</td>
                    <td class="px-6 py-4 text-right">
                      <span :style="item.cantidadRecibida >= item.cantidad
                        ? 'color: #166534; font-weight: 600'
                        : item.cantidadRecibida > 0
                          ? 'color: #92400e; font-weight: 600'
                          : 'color: var(--color-on-surface-variant)'">
                        {{ item.cantidadRecibida }}
                      </span>
                    </td>
                    <td class="px-6 py-4 text-right" style="color: var(--color-on-surface-variant)">{{ formatPrice(item.precioUnitario) }}</td>
                    <td class="px-6 py-4 text-right font-semibold" style="color: var(--color-on-surface)">{{ formatPrice(item.cantidad * item.precioUnitario) }}</td>
                  </tr>
                </tbody>
                <tfoot>
                  <tr style="border-top: 1px solid rgba(196,197,213,0.3); background-color: var(--color-surface-container-low)">
                    <td colspan="4" class="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider" style="color: var(--color-outline)">Total Orden</td>
                    <td class="px-6 py-4 text-right font-extrabold" style="color: var(--color-primary); font-size: 1rem">{{ formatPrice(pedidoTotal()) }}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          <!-- ─── TAB: FACTURA ──────────────────────────────────────────────── -->
          <div v-show="activeTab === 'factura'">

            <!-- Sin factura -->
            <div v-if="!pedido.factura"
              class="rounded-2xl p-10 flex flex-col items-center justify-center text-center gap-4"
              style="background-color: var(--color-surface-container-lowest); outline: 1px solid rgba(196,197,213,0.15)">
              <span class="material-symbols-outlined text-5xl" style="color: var(--color-outline)">receipt_long</span>
              <div>
                <p class="font-bold text-lg mb-1" style="color: var(--color-on-surface)">Sin factura registrada</p>
                <p class="text-sm" style="color: var(--color-on-surface-variant)">
                  {{ pedido.estado === 'Confirmada'
                    ? 'Confirmá la recepción de la factura del proveedor para avanzar a la siguiente etapa.'
                    : 'La factura se registra una vez que la OC está en estado Confirmada.' }}
                </p>
              </div>
              <BaseButton
                v-if="canManage && pedido.estado === 'Confirmada'"
                variant="primary" size="lg"
                @click="openFacturaModal"
              >
                <span class="material-symbols-outlined" style="font-size: 18px">add</span>
                Registrar Factura
              </BaseButton>
            </div>

            <!-- Con factura -->
            <div v-else class="rounded-2xl overflow-hidden"
              style="background-color: var(--color-surface-container-lowest); box-shadow: 0 1px 3px rgba(196, 197, 213, 0.25); outline: 1px solid rgba(196, 197, 213, 0.15)">

              <!-- Header factura -->
              <div class="px-6 py-5 flex items-start justify-between"
                style="border-bottom: 1px solid rgba(196,197,213,0.12)">
                <div>
                  <p class="text-xs font-bold uppercase tracking-wider mb-0.5" style="color: var(--color-outline)">Nro. de Factura</p>
                  <p class="text-2xl font-extrabold font-mono" style="color: var(--color-on-surface)">
                    {{ pedido.factura.nroFactura || "—" }}
                  </p>
                </div>
                <div class="flex flex-col items-end gap-2">
                  <span class="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-bold"
                    :style="pedido.factura.estado === 'Pagado'
                      ? 'background-color: #dcfce7; color: #166534'
                      : pedido.factura.estado === 'Anulado'
                        ? 'background-color: #fee2e2; color: #991b1b'
                        : 'background-color: #fef3c7; color: #92400e'">
                    {{ pedido.factura.estado }}
                  </span>
                  <span class="text-sm font-semibold" style="color: var(--color-on-surface-variant)">
                    {{ pedido.factura.condicionVenta }}
                  </span>
                </div>
              </div>

              <!-- Fechas -->
              <div class="grid grid-cols-3 gap-0" style="border-bottom: 1px solid rgba(196,197,213,0.12)">
                <div class="px-6 py-4">
                  <p class="text-xs font-bold uppercase tracking-wider mb-0.5" style="color: var(--color-outline)">Fecha de emisión</p>
                  <p class="text-sm font-semibold" style="color: var(--color-on-surface)">{{ formatDate(pedido.factura.fechaEmision) }}</p>
                </div>
                <div class="px-6 py-4" style="border-left: 1px solid rgba(196,197,213,0.12)">
                  <p class="text-xs font-bold uppercase tracking-wider mb-0.5" style="color: var(--color-outline)">Vencimiento</p>
                  <p class="text-sm font-semibold" style="color: var(--color-on-surface)">{{ pedido.factura.fechaVencimiento ? formatDate(pedido.factura.fechaVencimiento) : "—" }}</p>
                </div>
                <div class="px-6 py-4" style="border-left: 1px solid rgba(196,197,213,0.12)">
                  <p class="text-xs font-bold uppercase tracking-wider mb-0.5" style="color: var(--color-outline)">Fecha de pago</p>
                  <p class="text-sm font-semibold" style="color: var(--color-on-surface)">{{ pedido.factura.fechaPago ? formatDate(pedido.factura.fechaPago) : "—" }}</p>
                </div>
              </div>

              <!-- Montos -->
              <div class="px-6 py-5">
                <p class="text-xs font-bold uppercase tracking-wider mb-4" style="color: var(--color-outline)">Detalle de montos</p>
                <div class="space-y-2 max-w-sm">
                  <div class="flex justify-between text-sm">
                    <span style="color: var(--color-on-surface-variant)">Exento</span>
                    <span class="font-semibold" style="color: var(--color-on-surface)">{{ formatPrice(pedido.factura.montoExento) }}</span>
                  </div>
                  <div class="flex justify-between text-sm">
                    <span style="color: var(--color-on-surface-variant)">Gravado 5%</span>
                    <span class="font-semibold" style="color: var(--color-on-surface)">{{ formatPrice(pedido.factura.montoGravado5) }}</span>
                  </div>
                  <div class="flex justify-between text-sm">
                    <span style="color: var(--color-on-surface-variant)">IVA 5%</span>
                    <span class="font-medium" style="color: var(--color-on-surface-variant)">{{ formatPrice(pedido.factura.iva5) }}</span>
                  </div>
                  <div class="flex justify-between text-sm">
                    <span style="color: var(--color-on-surface-variant)">Gravado 10%</span>
                    <span class="font-semibold" style="color: var(--color-on-surface)">{{ formatPrice(pedido.factura.montoGravado10) }}</span>
                  </div>
                  <div class="flex justify-between text-sm">
                    <span style="color: var(--color-on-surface-variant)">IVA 10%</span>
                    <span class="font-medium" style="color: var(--color-on-surface-variant)">{{ formatPrice(pedido.factura.iva10) }}</span>
                  </div>
                  <div class="flex justify-between text-sm font-extrabold pt-2"
                    style="border-top: 1px solid rgba(196,197,213,0.2); color: var(--color-primary)">
                    <span>Total</span>
                    <span>{{ formatPrice(pedido.factura.montoTotal) }}</span>
                  </div>
                </div>

                <p v-if="pedido.factura.observaciones" class="mt-4 text-sm italic" style="color: var(--color-on-surface-variant)">
                  {{ pedido.factura.observaciones }}
                </p>
              </div>
            </div>
          </div>

          <!-- ─── TAB: RECEPCIONES ──────────────────────────────────────────── -->
          <div v-show="activeTab === 'recepciones'">
            <div v-if="pedido.recepciones.length === 0"
              class="rounded-2xl p-10 flex flex-col items-center gap-3 text-center"
              style="background-color: var(--color-surface-container-lowest); outline: 1px solid rgba(196,197,213,0.15)">
              <span class="material-symbols-outlined text-5xl" style="color: var(--color-outline)">inventory_2</span>
              <div>
                <p class="font-bold text-lg mb-1" style="color: var(--color-on-surface)">Sin recepciones registradas</p>
                <p class="text-sm" style="color: var(--color-on-surface-variant)">
                  {{ pedido.estado === 'Facturada' || pedido.estado === 'RecibidaParcial'
                    ? 'Registrá la llegada de mercadería desde el encabezado de la página.'
                    : 'La recepción de mercadería se habilitará luego de registrar la factura.' }}
                </p>
              </div>
            </div>

            <div v-else class="space-y-4">
              <div v-for="rec in pedido.recepciones" :key="rec.id"
                class="rounded-2xl overflow-hidden"
                style="background-color: var(--color-surface-container-lowest); box-shadow: 0 1px 3px rgba(196, 197, 213, 0.25); outline: 1px solid rgba(196, 197, 213, 0.15)">

                <div class="px-6 py-4 flex items-center justify-between"
                  style="border-bottom: 1px solid rgba(196,197,213,0.12)">
                  <div class="flex items-center gap-3">
                    <span class="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                      style="background-color: var(--color-primary); color: #fff">
                      #{{ rec.id }}
                    </span>
                    <span class="text-sm font-semibold" style="color: var(--color-on-surface)">{{ formatDate(rec.createdAt) }}</span>
                    <span v-if="rec.observaciones" class="text-sm italic" style="color: var(--color-on-surface-variant)">
                      · {{ rec.observaciones }}
                    </span>
                  </div>
                </div>

                <div class="divide-y" style="--tw-divide-opacity: 0.12; border-color: rgba(196,197,213,var(--tw-divide-opacity))">
                  <div v-for="item in rec.items" :key="item.pedidoItemId"
                    class="px-6 py-3 flex items-center justify-between text-sm">
                    <span style="color: var(--color-on-surface)">{{ item.productoNombre }}</span>
                    <span class="font-bold" style="color: var(--color-primary)">+{{ item.cantidad }} und.</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- ─── TAB: DEVOLUCIONES ─────────────────────────────────────────── -->
          <div v-show="activeTab === 'devoluciones'">
            <div v-if="pedido.devoluciones.length === 0"
              class="rounded-2xl p-10 flex flex-col items-center gap-3 text-center"
              style="background-color: var(--color-surface-container-lowest); outline: 1px solid rgba(196,197,213,0.15)">
              <span class="material-symbols-outlined text-5xl" style="color: var(--color-outline)">undo</span>
              <div>
                <p class="font-bold text-lg mb-1" style="color: var(--color-on-surface)">Sin devoluciones registradas</p>
                <p class="text-sm" style="color: var(--color-on-surface-variant)">
                  Las devoluciones se registran después de haber recibido mercadería.
                </p>
              </div>
            </div>

            <div v-else class="rounded-2xl overflow-hidden"
              style="background-color: var(--color-surface-container-lowest); box-shadow: 0 1px 3px rgba(196, 197, 213, 0.25); outline: 1px solid rgba(196, 197, 213, 0.15)">
              <table class="w-full text-sm">
                <thead>
                  <tr style="background-color: var(--color-surface-container-low)">
                    <th class="text-left px-6 py-4 text-xs font-bold uppercase tracking-wider" style="color: var(--color-outline)">Producto</th>
                    <th class="text-center px-6 py-4 text-xs font-bold uppercase tracking-wider" style="color: var(--color-outline)">Cantidad</th>
                    <th class="text-left px-6 py-4 text-xs font-bold uppercase tracking-wider" style="color: var(--color-outline)">Motivo</th>
                    <th class="text-right px-6 py-4 text-xs font-bold uppercase tracking-wider" style="color: var(--color-outline)">Fecha</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="dev in pedido.devoluciones" :key="dev.id"
                    style="border-top: 1px solid rgba(196,197,213,0.12)">
                    <td class="px-6 py-4 font-medium" style="color: var(--color-on-surface)">{{ dev.productoNombre }}</td>
                    <td class="px-6 py-4 text-center">
                      <span class="font-bold" style="color: #991b1b">−{{ dev.cantidad }}</span>
                    </td>
                    <td class="px-6 py-4 italic" style="color: var(--color-on-surface-variant)">{{ dev.motivo }}</td>
                    <td class="px-6 py-4 text-right text-sm" style="color: var(--color-on-surface-variant)">{{ formatDate(dev.createdAt) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

        </template>
      </div>
    </main>

    <!-- ── MODAL CANCELAR ────────────────────────────────────────────────────── -->
    <BaseModal :show="showCancelModal" title="Cancelar Orden de Compra" size="sm" @close="showCancelModal = false">
      <p class="text-sm" style="color: var(--color-on-surface-variant)">
        ¿Estás seguro que querés cancelar la OC #{{ ocId }}? Esta acción no se puede deshacer.
      </p>
      <div v-if="cancelError" class="mt-3 flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium"
        style="background-color: var(--color-error-container); color: var(--color-on-error-container)">
        {{ cancelError }}
      </div>
      <template #footer>
        <BaseButton variant="secondary" size="default" @click="showCancelModal = false">Cerrar</BaseButton>
        <BaseButton variant="danger" size="default" :disabled="isCancelando" @click="onCancelar">
          {{ isCancelando ? "Cancelando…" : "Sí, cancelar" }}
        </BaseButton>
      </template>
    </BaseModal>

    <!-- ── MODAL FACTURA ─────────────────────────────────────────────────────── -->
    <BaseModal :show="showFacturaModal" title="Registrar Factura del Proveedor" size="lg" @close="showFacturaModal = false">
      <div v-if="facturaError" class="flex items-center gap-2 rounded-xl px-3 py-2.5 mb-4 text-sm font-medium"
        style="background-color: var(--color-error-container); color: var(--color-on-error-container)">
        <span class="material-symbols-outlined flex-shrink-0" style="font-size: 16px">error</span>
        {{ facturaError }}
      </div>

      <div class="space-y-5">
        <!-- Nro Factura -->
        <div>
          <label class="block text-xs font-bold uppercase tracking-wider mb-1.5" style="color: var(--color-outline)">Nro. de Factura Timbrada *</label>
          <input
            v-model="facturaForm.nroFactura"
            type="text"
            placeholder="001-001-0000001"
            class="w-full px-4 py-3 rounded-xl text-sm outline-none font-mono tracking-wider"
            style="border: 1px solid var(--color-outline-variant); color: var(--color-on-surface); background-color: var(--color-surface-container-low)"
          />
          <p class="text-xs mt-1" style="color: var(--color-outline)">Formato: 001-001-0000001</p>
        </div>

        <!-- Fechas y condición -->
        <div class="grid grid-cols-3 gap-4">
          <div>
            <label class="block text-xs font-bold uppercase tracking-wider mb-1.5" style="color: var(--color-outline)">Fecha emisión *</label>
            <input v-model="facturaForm.fechaEmision" type="date"
              class="w-full px-4 py-3 rounded-xl text-sm outline-none"
              style="border: 1px solid var(--color-outline-variant); color: var(--color-on-surface); background-color: var(--color-surface-container-low)" />
          </div>
          <div>
            <label class="block text-xs font-bold uppercase tracking-wider mb-1.5" style="color: var(--color-outline)">Condición</label>
            <select v-model="facturaForm.condicionVenta"
              class="w-full px-4 py-3 rounded-xl text-sm outline-none"
              style="border: 1px solid var(--color-outline-variant); color: var(--color-on-surface); background-color: var(--color-surface-container-low)">
              <option value="Contado">Contado</option>
              <option value="Credito">Crédito</option>
            </select>
          </div>
          <div>
            <label class="block text-xs font-bold uppercase tracking-wider mb-1.5" style="color: var(--color-outline)">Vencimiento <span v-if="facturaForm.condicionVenta === 'Credito'">*</span></label>
            <input v-model="facturaForm.fechaVencimiento" type="date"
              :disabled="facturaForm.condicionVenta !== 'Credito'"
              class="w-full px-4 py-3 rounded-xl text-sm outline-none disabled:opacity-40"
              style="border: 1px solid var(--color-outline-variant); color: var(--color-on-surface); background-color: var(--color-surface-container-low)" />
          </div>
        </div>

        <!-- Montos -->
        <div>
          <label class="block text-xs font-bold uppercase tracking-wider mb-3" style="color: var(--color-outline)">Montos *</label>
          <div class="grid grid-cols-3 gap-4">
            <div>
              <label class="block text-xs mb-1" style="color: var(--color-on-surface-variant)">Exento (₲)</label>
              <input v-model.number="facturaForm.montoExento" type="number" min="0" step="1"
                class="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                style="border: 1px solid var(--color-outline-variant); color: var(--color-on-surface); background-color: var(--color-surface-container-low)" />
            </div>
            <div>
              <label class="block text-xs mb-1" style="color: var(--color-on-surface-variant)">Gravado 5% (₲)</label>
              <input v-model.number="facturaForm.montoGravado5" type="number" min="0" step="1"
                class="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                style="border: 1px solid var(--color-outline-variant); color: var(--color-on-surface); background-color: var(--color-surface-container-low)" />
            </div>
            <div>
              <label class="block text-xs mb-1" style="color: var(--color-on-surface-variant)">Gravado 10% (₲)</label>
              <input v-model.number="facturaForm.montoGravado10" type="number" min="0" step="1"
                class="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                style="border: 1px solid var(--color-outline-variant); color: var(--color-on-surface); background-color: var(--color-surface-container-low)" />
            </div>
          </div>

          <!-- Totales calculados -->
          <div class="mt-4 p-3 rounded-xl flex flex-wrap gap-4 text-sm"
            style="background-color: var(--color-surface-container-low)">
            <span style="color: var(--color-on-surface-variant)">
              IVA 5%: <strong style="color: var(--color-on-surface)">{{ formatPrice(iva5Calculado) }}</strong>
            </span>
            <span style="color: var(--color-on-surface-variant)">
              IVA 10%: <strong style="color: var(--color-on-surface)">{{ formatPrice(iva10Calculado) }}</strong>
            </span>
            <span class="font-bold" style="color: var(--color-primary)">
              Total: {{ formatPrice(montoTotalFactura) }}
            </span>
          </div>
        </div>

        <!-- Observaciones -->
        <div>
          <label class="block text-xs font-bold uppercase tracking-wider mb-1.5" style="color: var(--color-outline)">Observaciones</label>
          <input v-model="facturaForm.observaciones" type="text" placeholder="Opcional"
            class="w-full px-4 py-3 rounded-xl text-sm outline-none"
            style="border: 1px solid var(--color-outline-variant); color: var(--color-on-surface); background-color: var(--color-surface-container-low)" />
        </div>
      </div>

      <template #footer>
        <BaseButton variant="secondary" size="default" @click="showFacturaModal = false">Cancelar</BaseButton>
        <BaseButton variant="primary" size="default" :disabled="isFacturaSaving" @click="submitFactura">
          {{ isFacturaSaving ? "Registrando…" : "Registrar Factura" }}
        </BaseButton>
      </template>
    </BaseModal>

    <!-- ── MODAL RECEPCIÓN ───────────────────────────────────────────────────── -->
    <BaseModal :show="showRecepcionModal" title="Registrar Recepción de Mercadería" size="lg" @close="showRecepcionModal = false">
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

      <div class="mt-4">
        <label class="block text-xs font-bold uppercase tracking-wider mb-1.5" style="color: var(--color-outline)">Observaciones</label>
        <input v-model="recepcionObservaciones" type="text" placeholder="Opcional"
          class="w-full px-4 py-3 rounded-xl text-sm outline-none"
          style="border: 1px solid var(--color-outline-variant); color: var(--color-on-surface); background-color: var(--color-surface-container-low)" />
      </div>

      <template #footer>
        <BaseButton variant="secondary" size="default" @click="showRecepcionModal = false">Cancelar</BaseButton>
        <BaseButton variant="primary" size="default" :disabled="isRecepcionSaving" @click="submitRecepcion">
          {{ isRecepcionSaving ? "Guardando…" : "Confirmar Recepción" }}
        </BaseButton>
      </template>
    </BaseModal>

    <!-- ── MODAL DEVOLUCIÓN ──────────────────────────────────────────────────── -->
    <BaseModal :show="showDevolucionModal" title="Registrar Devolución" size="lg" @close="showDevolucionModal = false">
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
        <BaseButton variant="secondary" size="default" @click="showDevolucionModal = false">Cancelar</BaseButton>
        <BaseButton variant="danger" size="default" :disabled="isDevolucionSaving" @click="submitDevolucion">
          {{ isDevolucionSaving ? "Registrando…" : "Confirmar Devolución" }}
        </BaseButton>
      </template>
    </BaseModal>

  </div>
</template>
