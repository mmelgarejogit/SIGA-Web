<script setup lang="ts">
import { ref, computed, onMounted, reactive } from "vue"
import { useRoute, useRouter } from "vue-router"
import AppSidebar from "@/components/AppSidebar.vue"
import AppHeader from "@/components/AppHeader.vue"
import BaseButton from "@/components/BaseButton.vue"
import BaseModal from "@/components/BaseModal.vue"
import SearchableSelect from "@/components/SearchableSelect.vue"
import { useAuthStore } from "@/stores/auth"
import {
  type PedidoCompras,
  type PedidoItemCompras,
  type EstadoPedido,
  getComprasPedidoById,
  registrarDevolucion,
} from "@/services/comprasService"
import { useOcPdf } from "@/composables/useOcPdf"

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const canManage = computed(() => auth.hasPermission("gestionar_pedidos"))

const { generarPdfOC } = useOcPdf()

const ocId = Number(route.params.id)
const backRoutes: Record<string, { to: string; label: string }> = {
  aprobacion:  { to: "/compras/aprobaciones", label: "Aprobación de OC" },
  facturas:    { to: "/compras/facturas",      label: "Facturas de Compra" },
  recepciones: { to: "/compras/recepciones",   label: "Recepciones" },
}
const backKey = String(route.query.from ?? "")
const backTo    = backRoutes[backKey]?.to    ?? "/compras/oc"
const backLabel = backRoutes[backKey]?.label ?? "Órdenes de Compra"

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

function formatDateOnly(date: string) {
  const [y, m, d] = date.split("-").map(Number)
  return new Date(y, m - 1, d).toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "numeric" })
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

const devolucionItemOptions = computed(() =>
  itemsConRecepcion().map(i => ({
    value: i.id,
    label: `${i.productoNombre} (recibidos: ${i.cantidadRecibida})`,
  })),
)

function inputStyle(hasError = false) {
  const base = "border-radius: 12px; "
  return hasError
    ? base + "border: 1.5px solid var(--color-error); color: var(--color-on-surface); background-color: #FFF8F7;"
    : base + "border: 1px solid var(--color-outline-variant); color: var(--color-on-surface); background-color: var(--color-surface-container-low);"
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
              @click="router.push(backTo)"
              class="flex items-center gap-1.5 text-sm font-semibold mb-4 transition-all hover:opacity-75"
              style="color: var(--color-primary)"
            >
              <span class="material-symbols-outlined" style="font-size: 18px">arrow_back</span>
              {{ backLabel }}
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
                  <span v-if="pedido.fechaOrden"> · Fecha orden: {{ formatDateOnly(pedido.fechaOrden) }}</span>
                  <span v-if="pedido.observaciones" class="italic"> · {{ pedido.observaciones }}</span>
                </p>
              </div>

              <!-- Acciones -->
              <div class="flex items-center gap-2 flex-wrap">
                <BaseButton variant="secondary" size="lg" @click="generarPdfOC(pedido)">
                  <span class="material-symbols-outlined" style="font-size: 18px">download</span>
                  Descargar PDF
                </BaseButton>

                <BaseButton
                  v-if="canManage && (pedido.estado === 'RecibidaTotal' || pedido.estado === 'RecibidaParcial')"
                  variant="secondary" size="lg"
                  @click="openDevolucionModal"
                >
                  <span class="material-symbols-outlined" style="font-size: 18px">undo</span>
                  Registrar Devolución
                </BaseButton>
              </div>
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
                <p class="text-sm max-w-md" style="color: var(--color-on-surface-variant)">
                  La carga de facturas se realiza desde el módulo <strong>Facturas de Compra</strong>,
                  eligiendo origen "Con OC" y seleccionando esta orden.
                </p>
              </div>
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
                <p class="text-sm max-w-md" style="color: var(--color-on-surface-variant)">
                  La carga de recepciones se realiza desde el módulo <strong>Recepciones</strong>,
                  eligiendo la factura asociada a esta OC.
                </p>
              </div>
            </div>

            <div v-else class="space-y-4">
              <div v-for="rec in pedido.recepciones" :key="rec.id"
                class="rounded-2xl overflow-hidden"
                style="background-color: var(--color-surface-container-lowest); box-shadow: 0 1px 3px rgba(196, 197, 213, 0.25); outline: 1px solid rgba(196, 197, 213, 0.15)">

                <div class="px-6 py-4 flex items-center justify-between flex-wrap gap-3"
                  style="border-bottom: 1px solid rgba(196,197,213,0.12)">
                  <div class="flex items-center gap-3">
                    <span class="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                      style="background-color: var(--color-primary); color: #fff">
                      #{{ rec.id }}
                    </span>
                    <span class="text-sm font-semibold" style="color: var(--color-on-surface)">
                      Recepcionado el {{ formatDate(rec.fechaRecepcion) }}
                    </span>
                  </div>
                  <span v-if="rec.usuarioNombre" class="text-xs font-medium px-2.5 py-1 rounded-full"
                    style="background-color: var(--color-surface-container-low); color: var(--color-on-surface-variant)">
                    <span class="material-symbols-outlined align-middle mr-1" style="font-size: 14px">person</span>
                    {{ rec.usuarioNombre }}
                  </span>
                </div>

                <p v-if="rec.observaciones" class="px-6 py-2 text-xs italic"
                  style="color: var(--color-on-surface-variant); background-color: var(--color-surface-container-low)">
                  {{ rec.observaciones }}
                </p>

                <div class="divide-y" style="--tw-divide-opacity: 0.12; border-color: rgba(196,197,213,var(--tw-divide-opacity))">
                  <div v-for="item in rec.items" :key="item.pedidoItemId"
                    class="px-6 py-3 flex items-start justify-between text-sm gap-4">
                    <div class="flex-1 min-w-0">
                      <p style="color: var(--color-on-surface)">{{ item.productoNombre }}</p>
                      <p v-if="item.lote || item.fechaVencimiento" class="text-xs mt-0.5" style="color: var(--color-on-surface-variant)">
                        <span v-if="item.lote">Lote <strong>{{ item.lote }}</strong></span>
                        <span v-if="item.lote && item.fechaVencimiento"> · </span>
                        <span v-if="item.fechaVencimiento">Vto. {{ formatDate(item.fechaVencimiento) }}</span>
                      </p>
                      <p v-if="item.observaciones" class="text-xs italic mt-0.5" style="color: var(--color-on-surface-variant)">
                        {{ item.observaciones }}
                      </p>
                    </div>
                    <span class="font-bold whitespace-nowrap" style="color: var(--color-primary)">+{{ item.cantidad }} und.</span>
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

    <!-- ── MODAL DEVOLUCIÓN ──────────────────────────────────────────────────── -->
    <BaseModal :show="showDevolucionModal" title="Registrar Devolución" size="lg" @close="showDevolucionModal = false">
      <div v-if="devolucionError" class="flex items-center gap-2 rounded-2xl px-4 py-3 mb-4 text-sm font-medium"
        style="background-color: var(--color-error-container); color: var(--color-on-error-container)">
        <span class="material-symbols-outlined flex-shrink-0" style="font-size: 18px">error</span>
        {{ devolucionError }}
      </div>

      <div class="space-y-4">
        <div>
          <label class="block text-xs font-bold uppercase tracking-wider mb-1.5" style="color: var(--color-outline)">Producto a devolver *</label>
          <SearchableSelect
            :model-value="devolucionForm.itemId"
            :options="devolucionItemOptions"
            null-label="Seleccioná un ítem"
            @update:model-value="devolucionForm.itemId = $event as number | null"
          />
        </div>
        <div>
          <label class="block text-xs font-bold uppercase tracking-wider mb-1.5" style="color: var(--color-outline)">Cantidad *</label>
          <input v-model.number="devolucionForm.cantidad" type="number" min="1" :max="maxDevolucion()"
            class="w-full px-4 h-12 text-sm outline-none appearance-none shadow-none transition-all"
            :style="inputStyle(false)" />
          <p class="text-xs mt-1" style="color: var(--color-outline)">Máximo: {{ maxDevolucion() }}</p>
        </div>
        <div>
          <label class="block text-xs font-bold uppercase tracking-wider mb-1.5" style="color: var(--color-outline)">Motivo *</label>
          <input v-model="devolucionForm.motivo" type="text" placeholder="Defecto, daño, error de pedido..."
            class="w-full px-4 h-12 text-sm outline-none appearance-none shadow-none transition-all"
            :style="inputStyle(false)" />
        </div>
      </div>

      <template #footer>
        <div class="flex justify-between w-full">
          <BaseButton variant="secondary" size="default" @click="showDevolucionModal = false">Cancelar</BaseButton>
          <BaseButton variant="danger" size="default" :disabled="isDevolucionSaving" @click="submitDevolucion">
            {{ isDevolucionSaving ? "Registrando…" : "Confirmar Devolución" }}
          </BaseButton>
        </div>
      </template>
    </BaseModal>

  </div>
</template>

<style scoped>
:deep(.ss-trigger) {
  height: 48px;
  border-radius: 12px;
  font-size: 14px;
}
</style>
