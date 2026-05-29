<script setup lang="ts">
import { ref, computed, onMounted, reactive } from "vue"
import { useRouter } from "vue-router"
import AppSidebar from "@/components/AppSidebar.vue"
import AppHeader from "@/components/AppHeader.vue"
import BaseButton from "@/components/BaseButton.vue"
import BaseModal from "@/components/BaseModal.vue"
import BaseTable from "@/components/BaseTable.vue"
import FilterChips from "@/components/FilterChips.vue"
import SearchInput from "@/components/SearchInput.vue"
import RowContextMenu, { type ContextMenuItem } from "@/components/RowContextMenu.vue"
import {
  type Venta,
  type MetodoPago,
  getVentas,
  getVentaById,
  confirmarVenta,
  registrarCobro,
  emitirFactura,
  anularVenta,
} from "@/services/ventasService"

const router = useRouter()

// ── Formato ───────────────────────────────────────────────────────────────────

const formatPrice = (n: number) =>
  new Intl.NumberFormat("es-PY", { style: "currency", currency: "PYG", maximumFractionDigits: 0 }).format(n)

const formatDate = (s?: string) =>
  s ? new Date(s + "T00:00:00").toLocaleDateString("es-PY", { day: "2-digit", month: "short", year: "numeric" }) : "—"

// ── Estado principal ──────────────────────────────────────────────────────────

const ventas = ref<Venta[]>([])
const totalCount = ref(0)
const totalPages = ref(1)
const isLoading = ref(false)
const currentPage = ref(1)
const pageSize = 10

const rangeStart = computed(() =>
  totalCount.value === 0 ? 0 : (currentPage.value - 1) * pageSize + 1,
)
const rangeEnd = computed(() => Math.min(currentPage.value * pageSize, totalCount.value))

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
const search = ref("")

const estadoFiltros = ref<string[]>([])
const estadoOptions = [
  { value: "Abierta",          label: "Abierta",           dot: "#1D4ED8" },
  { value: "Confirmada",       label: "Confirmada",        dot: "#7C3AED" },
  { value: "PendienteDePago",  label: "Pendiente de Pago", dot: "#92400E" },
  { value: "Pagada",           label: "Pagada",            dot: "#166534" },
  { value: "Cobrada",          label: "Cobrada",           dot: "#065F46" },
  { value: "Anulada",          label: "Anulada",           dot: "#9CA3AF" },
]

async function loadVentas() {
  isLoading.value = true
  try {
    const res = await getVentas({
      estado: estadoFiltros.value.length === 1 ? estadoFiltros.value[0] : undefined,
      page: currentPage.value,
      pageSize,
    })
    ventas.value = res.items
    totalCount.value = res.totalCount
    totalPages.value = res.totalPages
  } catch {
    ventas.value = []
  } finally {
    isLoading.value = false
  }
}

const filtered = computed(() => {
  if (!search.value.trim()) return ventas.value
  const q = search.value.toLowerCase()
  return ventas.value.filter(
    (v) =>
      v.pacienteNombre.toLowerCase().includes(q) ||
      v.numeroComprobante.toLowerCase().includes(q),
  )
})

onMounted(loadVentas)

// ── Estado badge ──────────────────────────────────────────────────────────────

function estadoBadge(estado: string) {
  const map: Record<string, { bg: string; text: string; label: string }> = {
    Abierta:         { bg: "#DBEAFE", text: "#1D4ED8", label: "Abierta" },
    Confirmada:      { bg: "#EDE9FE", text: "#7C3AED", label: "Confirmada" },
    PendienteDePago: { bg: "#FEF3C7", text: "#92400E", label: "Pend. Pago" },
    Pagada:          { bg: "#DCFCE7", text: "#166534", label: "Pagada" },
    Cobrada:         { bg: "#D1FAE5", text: "#065F46", label: "Cobrada" },
    Anulada:         { bg: "#F3F4F6", text: "#9CA3AF", label: "Anulada" },
  }
  return map[estado] ?? { bg: "#F3F4F6", text: "#6B7280", label: estado }
}

// ── Detalle modal ─────────────────────────────────────────────────────────────

const showDetalle = ref(false)
const detalleVenta = ref<Venta | null>(null)
const isLoadingDetalle = ref(false)

async function openDetalle(v: Venta) {
  showDetalle.value = true
  isLoadingDetalle.value = true
  try {
    detalleVenta.value = await getVentaById(v.id)
  } catch {
    detalleVenta.value = v
  } finally {
    isLoadingDetalle.value = false
  }
}

// ── Cobro modal ───────────────────────────────────────────────────────────────

const showCobro = ref(false)
const isCobrandо = ref(false)
const cobroError = ref("")
const cobroForm = reactive({
  ventaId: 0,
  monto: 0,
  metodoPago: "Efectivo" as MetodoPago,
  fechaCobro: new Date().toISOString().slice(0, 10),
  referencia: "",
})
const cobroVenta = ref<Venta | null>(null)

function openCobro(v: Venta) {
  cobroVenta.value = v
  cobroForm.ventaId = v.id
  cobroForm.monto = v.saldoPendiente
  cobroForm.metodoPago = "Efectivo"
  cobroForm.fechaCobro = new Date().toISOString().slice(0, 10)
  cobroForm.referencia = ""
  cobroError.value = ""
  showCobro.value = true
}

async function submitCobro() {
  if (cobroForm.monto <= 0) { cobroError.value = "El monto debe ser mayor a 0"; return }
  isCobrandо.value = true
  cobroError.value = ""
  try {
    await registrarCobro({
      ventaId: cobroForm.ventaId,
      monto: cobroForm.monto,
      metodoPago: cobroForm.metodoPago,
      fechaCobro: cobroForm.fechaCobro,
      referencia: cobroForm.referencia || undefined,
    })
    showCobro.value = false
    await loadVentas()
  } catch (e: any) {
    cobroError.value = e?.response?.data?.message ?? "Error al registrar cobro"
  } finally {
    isCobrandо.value = false
  }
}

// ── Factura modal ─────────────────────────────────────────────────────────────

const showFactura = ref(false)
const isEmitiendo = ref(false)
const facturaError = ref("")
const facturaVenta = ref<Venta | null>(null)
const facturaForm = reactive({
  ventaId: 0,
  numeroFactura: "",
  timbrado: "",
  establecimiento: "",
  fechaEmision: new Date().toISOString().slice(0, 10),
  observaciones: "",
})

function openFactura(v: Venta) {
  facturaVenta.value = v
  facturaForm.ventaId = v.id
  facturaForm.numeroFactura = ""
  facturaForm.timbrado = ""
  facturaForm.establecimiento = ""
  facturaForm.fechaEmision = new Date().toISOString().slice(0, 10)
  facturaForm.observaciones = ""
  facturaError.value = ""
  showFactura.value = true
}

async function submitFactura() {
  if (!facturaForm.numeroFactura || !facturaForm.timbrado || !facturaForm.establecimiento) {
    facturaError.value = "Completá los campos obligatorios"; return
  }
  isEmitiendo.value = true
  facturaError.value = ""
  try {
    await emitirFactura({
      ventaId: facturaForm.ventaId,
      numeroFactura: facturaForm.numeroFactura,
      timbrado: facturaForm.timbrado,
      establecimiento: facturaForm.establecimiento,
      fechaEmision: facturaForm.fechaEmision,
      observaciones: facturaForm.observaciones || undefined,
    })
    showFactura.value = false
    await loadVentas()
  } catch (e: any) {
    facturaError.value = e?.response?.data?.message ?? "Error al emitir factura"
  } finally {
    isEmitiendo.value = false
  }
}

// ── Confirmar modal ───────────────────────────────────────────────────────────

const showConfirmar = ref(false)
const isConfirmando = ref(false)
const confirmarVentaObj = ref<Venta | null>(null)

function openConfirmar(v: Venta) {
  confirmarVentaObj.value = v
  showConfirmar.value = true
}

async function submitConfirmar() {
  if (!confirmarVentaObj.value) return
  isConfirmando.value = true
  try {
    await confirmarVenta(confirmarVentaObj.value.id)
    showConfirmar.value = false
    await loadVentas()
  } finally {
    isConfirmando.value = false
  }
}

// ── Anular modal ──────────────────────────────────────────────────────────────

const showAnular = ref(false)
const isAnulando = ref(false)
const anularError = ref("")
const anularVentaObj = ref<Venta | null>(null)
const motivoAnulacion = ref("")

function openAnular(v: Venta) {
  anularVentaObj.value = v
  motivoAnulacion.value = ""
  anularError.value = ""
  showAnular.value = true
}

async function submitAnular() {
  if (!motivoAnulacion.value.trim()) { anularError.value = "Ingresá un motivo"; return }
  if (!anularVentaObj.value) return
  isAnulando.value = true
  anularError.value = ""
  try {
    await anularVenta(anularVentaObj.value.id, { motivo: motivoAnulacion.value })
    showAnular.value = false
    await loadVentas()
  } catch (e: any) {
    anularError.value = e?.response?.data?.message ?? "Error al anular"
  } finally {
    isAnulando.value = false
  }
}

// ── Context menu ──────────────────────────────────────────────────────────────

function canConfirm(v: Venta)  { return v.estado === "Abierta" }
function canCobrar(v: Venta)   { return ["Confirmada", "PendienteDePago"].includes(v.estado) && v.saldoPendiente > 0 }
function canFactura(v: Venta)  { return v.estado !== "Anulada" && !v.factura }
function canAnular(v: Venta)   { return !["Pagada", "Cobrada", "Anulada"].includes(v.estado) }

function menuItems(v: Venta): ContextMenuItem[] {
  const hasGrupo = canConfirm(v) || canCobrar(v) || canFactura(v)

  return [
    { type: "item", label: "Ver detalle", icon: "visibility", action: () => openDetalle(v) },
    ...(hasGrupo || canAnular(v) ? [{ type: "separator" as const }] : []),
    { type: "item", label: "Confirmar",        icon: "check_circle", action: () => openConfirmar(v), hidden: !canConfirm(v) },
    { type: "item", label: "Registrar cobro",  icon: "payments",     action: () => openCobro(v),     hidden: !canCobrar(v) },
    { type: "item", label: "Emitir factura",   icon: "receipt",      action: () => openFactura(v),   hidden: !canFactura(v) },
    ...(hasGrupo && canAnular(v) ? [{ type: "separator" as const }] : []),
    { type: "item", label: "Anular", icon: "cancel", action: () => openAnular(v), hidden: !canAnular(v), danger: true },
  ]
}
</script>

<template>
  <div class="min-h-screen" style="background-color: var(--color-background)">
    <AppSidebar />
    <AppHeader />
    <main style="margin-left: var(--sidebar-width); padding-top: 64px">
      <div class="p-8">

        <!-- Encabezado -->
        <div class="flex items-start justify-between mb-8">
          <div>
            <h1 class="text-4xl font-extrabold tracking-tight mb-2">Historial de Ventas</h1>
            <p class="font-medium" style="color: var(--color-on-surface-variant)">
              {{ totalCount }} venta{{ totalCount !== 1 ? "s" : "" }} registrada{{ totalCount !== 1 ? "s" : "" }}
            </p>
          </div>
          <BaseButton variant="primary" size="lg" @click="router.push('/ventas/nueva')">
            <span class="material-symbols-outlined" style="width:20px;height:20px;font-size:20px">point_of_sale</span>
            Nueva Venta
          </BaseButton>
        </div>

        <!-- Filtros -->
        <div class="flex items-center gap-3 mb-6 flex-wrap">
          <SearchInput v-model="search" placeholder="Buscar por paciente o comprobante…" class="w-80" />
          <FilterChips v-model="estadoFiltros" :options="estadoOptions" placeholder="Estado" @update:modelValue="loadVentas" />
        </div>

        <!-- Tabla -->
        <div class="rounded-2xl overflow-hidden" style="background-color: var(--color-surface-container-lowest); box-shadow: 0 2px 12px rgba(0,40,142,0.06)">
          <BaseTable :loading="isLoading" :empty="filtered.length === 0" empty-message="No hay ventas que mostrar">
            <template #head>
              <th class="px-6 py-5 text-left text-xs font-bold uppercase tracking-widest" style="color: var(--color-outline)">Comprobante</th>
              <th class="px-6 py-5 text-left text-xs font-bold uppercase tracking-widest" style="color: var(--color-outline)">Paciente</th>
              <th class="px-6 py-5 text-left text-xs font-bold uppercase tracking-widest" style="color: var(--color-outline)">Fecha</th>
              <th class="px-6 py-5 text-left text-xs font-bold uppercase tracking-widest" style="color: var(--color-outline)">Total</th>
              <th class="px-6 py-5 text-left text-xs font-bold uppercase tracking-widest" style="color: var(--color-outline)">Cobrado</th>
              <th class="px-6 py-5 text-left text-xs font-bold uppercase tracking-widest" style="color: var(--color-outline)">Estado</th>
              <th class="px-6 py-5 text-left text-xs font-bold uppercase tracking-widest" style="color: var(--color-outline)">Condición</th>
              <th class="px-6 py-5"></th>
            </template>
            <template #body>
              <tr
                v-for="v in filtered"
                :key="v.id"
                class="hover:bg-surface-container-low cursor-pointer"
                style="border-bottom: 1px solid rgba(196,197,213,0.12)"
                @click="openDetalle(v)"
              >
                <td class="px-6 py-4">
                  <span class="text-sm font-mono font-semibold" style="color: var(--color-primary)">{{ v.numeroComprobante }}</span>
                </td>
                <td class="px-6 py-4">
                  <span class="text-sm font-medium" style="color: var(--color-on-surface)">{{ v.pacienteNombre }}</span>
                </td>
                <td class="px-6 py-4 text-sm" style="color: var(--color-on-surface-variant)">{{ formatDate(v.fechaVenta) }}</td>
                <td class="px-6 py-4 text-sm font-semibold" style="color: var(--color-on-surface)">{{ formatPrice(v.total) }}</td>
                <td class="px-6 py-4 text-sm" style="color: var(--color-on-surface-variant)">{{ formatPrice(v.totalCobrado) }}</td>
                <td class="px-6 py-4">
                  <span
                    class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold"
                    :style="`background-color: ${estadoBadge(v.estado).bg}; color: ${estadoBadge(v.estado).text}`"
                  >{{ estadoBadge(v.estado).label }}</span>
                </td>
                <td class="px-6 py-4 text-sm" style="color: var(--color-on-surface-variant)">
                  {{ v.condicionVenta === "Credito" ? "Crédito" : "Contado" }}
                </td>
                <td class="px-6 py-4 text-right" @click.stop>
                  <RowContextMenu :items="menuItems(v)" />
                </td>
              </tr>
            </template>
          </BaseTable>

          <!-- Footer: conteo + paginador -->
          <div
            v-if="ventas.length > 0"
            class="px-6 py-4 flex items-center justify-between flex-wrap gap-4"
            style="border-top: 1px solid rgba(196, 197, 213, 0.12); background-color: var(--color-surface-container-lowest);"
          >
            <span class="text-sm" style="color: var(--color-on-surface-variant)">
              Mostrando
              <strong style="color: var(--color-on-surface)">{{ rangeStart }}–{{ rangeEnd }}</strong>
              de
              <strong style="color: var(--color-on-surface)">{{ totalCount }}</strong>
              ventas
            </span>
            <div v-if="totalPages > 1" class="flex items-center gap-1">
              <button
                @click="currentPage--; loadVentas()"
                :disabled="currentPage === 1"
                class="w-9 h-9 rounded-full flex items-center justify-center transition-all disabled:opacity-30 hover:bg-surface-container-high"
                style="color: var(--color-on-surface-variant)"
              ><span class="material-symbols-outlined" style="font-size: 18px">chevron_left</span></button>
              <template v-for="p in visiblePages" :key="p">
                <span v-if="p === '...'" class="w-9 h-9 flex items-center justify-center text-sm" style="color: var(--color-outline)">…</span>
                <button
                  v-else
                  @click="currentPage = (p as number); loadVentas()"
                  class="w-9 h-9 rounded-full text-sm font-semibold transition-all"
                  :class="currentPage === p ? 'bg-primary text-white' : 'text-on-surface-variant hover:bg-surface-container-high'"
                >{{ p }}</button>
              </template>
              <button
                @click="currentPage++; loadVentas()"
                :disabled="currentPage === totalPages"
                class="w-9 h-9 rounded-full flex items-center justify-center transition-all disabled:opacity-30 hover:bg-surface-container-high"
                style="color: var(--color-on-surface-variant)"
              ><span class="material-symbols-outlined" style="font-size: 18px">chevron_right</span></button>
            </div>
          </div>
        </div>

      </div>
    </main>
  </div>

  <!-- ── Modal Detalle ─────────────────────────────────────────────────────── -->
  <BaseModal :open="showDetalle" size="lg" title="Detalle de Venta" @close="showDetalle = false">
    <template #body>
      <div v-if="isLoadingDetalle" class="py-8 text-center" style="color: var(--color-outline)">Cargando…</div>
      <div v-else-if="detalleVenta" class="space-y-6">

        <!-- Cabecera -->
        <div class="grid grid-cols-2 gap-4">
          <div>
            <p class="text-xs font-bold uppercase tracking-wider mb-1" style="color: var(--color-outline)">Comprobante</p>
            <p class="font-mono font-bold text-lg" style="color: var(--color-primary)">{{ detalleVenta.numeroComprobante }}</p>
          </div>
          <div>
            <p class="text-xs font-bold uppercase tracking-wider mb-1" style="color: var(--color-outline)">Estado</p>
            <span
              class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold"
              :style="`background-color: ${estadoBadge(detalleVenta.estado).bg}; color: ${estadoBadge(detalleVenta.estado).text}`"
            >{{ estadoBadge(detalleVenta.estado).label }}</span>
          </div>
          <div>
            <p class="text-xs font-bold uppercase tracking-wider mb-1" style="color: var(--color-outline)">Paciente</p>
            <p class="text-sm font-semibold" style="color: var(--color-on-surface)">{{ detalleVenta.pacienteNombre }}</p>
          </div>
          <div>
            <p class="text-xs font-bold uppercase tracking-wider mb-1" style="color: var(--color-outline)">Condición</p>
            <p class="text-sm" style="color: var(--color-on-surface)">{{ detalleVenta.condicionVenta === "Credito" ? "Crédito" : "Contado" }}</p>
          </div>
          <div>
            <p class="text-xs font-bold uppercase tracking-wider mb-1" style="color: var(--color-outline)">Fecha</p>
            <p class="text-sm" style="color: var(--color-on-surface)">{{ formatDate(detalleVenta.fechaVenta) }}</p>
          </div>
          <div v-if="detalleVenta.fechaVencimiento">
            <p class="text-xs font-bold uppercase tracking-wider mb-1" style="color: var(--color-outline)">Vencimiento</p>
            <p class="text-sm" style="color: var(--color-on-surface)">{{ formatDate(detalleVenta.fechaVencimiento) }}</p>
          </div>
        </div>

        <!-- Líneas -->
        <div>
          <p class="text-xs font-bold uppercase tracking-wider mb-3" style="color: var(--color-outline)">Líneas</p>
          <div class="rounded-xl overflow-hidden" style="border: 1px solid rgba(196,197,213,0.2)">
            <table class="w-full text-sm">
              <thead>
                <tr style="background-color: var(--color-surface-container-low)">
                  <th class="px-4 py-2 text-left text-xs font-bold uppercase tracking-wider" style="color: var(--color-outline)">Descripción</th>
                  <th class="px-4 py-2 text-right text-xs font-bold uppercase tracking-wider" style="color: var(--color-outline)">Cant.</th>
                  <th class="px-4 py-2 text-right text-xs font-bold uppercase tracking-wider" style="color: var(--color-outline)">P. Unit.</th>
                  <th class="px-4 py-2 text-right text-xs font-bold uppercase tracking-wider" style="color: var(--color-outline)">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="l in detalleVenta.lineas" :key="l.id" style="border-top: 1px solid rgba(196,197,213,0.12)">
                  <td class="px-4 py-2" style="color: var(--color-on-surface)">
                    {{ l.descripcion }}
                    <span class="ml-2 text-xs px-1.5 py-0.5 rounded" style="background: var(--color-surface-container-high); color: var(--color-outline)">{{ l.categoriaFiscal }}</span>
                  </td>
                  <td class="px-4 py-2 text-right" style="color: var(--color-on-surface-variant)">{{ l.cantidad }}</td>
                  <td class="px-4 py-2 text-right" style="color: var(--color-on-surface-variant)">{{ formatPrice(l.precioUnitario) }}</td>
                  <td class="px-4 py-2 text-right font-semibold" style="color: var(--color-on-surface)">{{ formatPrice(l.subtotal) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Totales fiscales -->
        <div class="rounded-xl p-4 space-y-2" style="background-color: var(--color-surface-container-low)">
          <div v-if="detalleVenta.montoExento > 0" class="flex justify-between text-sm">
            <span style="color: var(--color-on-surface-variant)">Exento</span>
            <span style="color: var(--color-on-surface)">{{ formatPrice(detalleVenta.montoExento) }}</span>
          </div>
          <div v-if="detalleVenta.montoGravado5 > 0" class="flex justify-between text-sm">
            <span style="color: var(--color-on-surface-variant)">Gravado 5%</span>
            <span style="color: var(--color-on-surface)">{{ formatPrice(detalleVenta.montoGravado5) }}</span>
          </div>
          <div v-if="detalleVenta.montoGravado10 > 0" class="flex justify-between text-sm">
            <span style="color: var(--color-on-surface-variant)">Gravado 10%</span>
            <span style="color: var(--color-on-surface)">{{ formatPrice(detalleVenta.montoGravado10) }}</span>
          </div>
          <div class="flex justify-between font-bold pt-2" style="border-top: 1px solid rgba(196,197,213,0.2)">
            <span style="color: var(--color-on-surface)">Total</span>
            <span style="color: var(--color-primary)">{{ formatPrice(detalleVenta.total) }}</span>
          </div>
          <div class="flex justify-between text-sm">
            <span style="color: var(--color-on-surface-variant)">Cobrado</span>
            <span class="font-medium" style="color: #166534">{{ formatPrice(detalleVenta.totalCobrado) }}</span>
          </div>
          <div v-if="detalleVenta.saldoPendiente > 0" class="flex justify-between text-sm">
            <span style="color: var(--color-on-surface-variant)">Saldo pendiente</span>
            <span class="font-medium" style="color: #92400E">{{ formatPrice(detalleVenta.saldoPendiente) }}</span>
          </div>
        </div>

        <!-- Cobros -->
        <div v-if="detalleVenta.cobros.length">
          <p class="text-xs font-bold uppercase tracking-wider mb-2" style="color: var(--color-outline)">Cobros</p>
          <div class="space-y-2">
            <div
              v-for="c in detalleVenta.cobros"
              :key="c.id"
              class="flex items-center justify-between px-4 py-2.5 rounded-xl text-sm"
              :style="`background-color: ${c.anulado ? 'var(--color-surface-container-low)' : '#F0FDF4'}; opacity: ${c.anulado ? 0.5 : 1}`"
            >
              <div class="flex items-center gap-2">
                <span class="material-symbols-outlined" style="font-size: 18px; color: #166534">payments</span>
                <span style="color: var(--color-on-surface)">{{ c.metodoPago }} · {{ formatDate(c.fechaCobro) }}</span>
                <span v-if="c.anulado" class="text-xs px-1.5 py-0.5 rounded" style="background: #FEE2E2; color: #991B1B">Anulado</span>
              </div>
              <span class="font-semibold" style="color: #166534">{{ formatPrice(c.monto) }}</span>
            </div>
          </div>
        </div>

        <!-- Factura -->
        <div v-if="detalleVenta.factura">
          <p class="text-xs font-bold uppercase tracking-wider mb-2" style="color: var(--color-outline)">Factura</p>
          <div class="rounded-xl p-4 space-y-2" style="background: #EFF6FF; border: 1px solid #BFDBFE">
            <div class="flex justify-between text-sm">
              <span style="color: #1D4ED8">N° {{ detalleVenta.factura.numeroFactura }}</span>
              <span style="color: var(--color-on-surface-variant)">{{ formatDate(detalleVenta.factura.fechaEmision) }}</span>
            </div>
            <div class="flex justify-between text-sm">
              <span style="color: var(--color-on-surface-variant)">Timbrado {{ detalleVenta.factura.timbrado }}</span>
              <span style="color: var(--color-on-surface-variant)">Est. {{ detalleVenta.factura.establecimiento }}</span>
            </div>
            <div v-if="detalleVenta.factura.iva5 > 0" class="flex justify-between text-sm">
              <span style="color: var(--color-on-surface-variant)">IVA 5%</span>
              <span>{{ formatPrice(detalleVenta.factura.iva5) }}</span>
            </div>
            <div v-if="detalleVenta.factura.iva10 > 0" class="flex justify-between text-sm">
              <span style="color: var(--color-on-surface-variant)">IVA 10%</span>
              <span>{{ formatPrice(detalleVenta.factura.iva10) }}</span>
            </div>
          </div>
        </div>

        <!-- Observaciones -->
        <div v-if="detalleVenta.observaciones">
          <p class="text-xs font-bold uppercase tracking-wider mb-1" style="color: var(--color-outline)">Observaciones</p>
          <p class="text-sm" style="color: var(--color-on-surface-variant)">{{ detalleVenta.observaciones }}</p>
        </div>
      </div>
    </template>
    <template #footer>
      <BaseButton variant="secondary" @click="showDetalle = false">Cerrar</BaseButton>
      <BaseButton v-if="detalleVenta && canCobrar(detalleVenta)" variant="primary" @click="showDetalle = false; openCobro(detalleVenta!)">
        Registrar cobro
      </BaseButton>
    </template>
  </BaseModal>

  <!-- ── Modal Cobro ───────────────────────────────────────────────────────── -->
  <BaseModal :open="showCobro" size="sm" title="Registrar Cobro" @close="showCobro = false">
    <template #body>
      <div class="space-y-4">
        <div v-if="cobroVenta" class="p-3 rounded-xl text-sm" style="background: var(--color-surface-container-low)">
          <p class="font-semibold" style="color: var(--color-on-surface)">{{ cobroVenta.numeroComprobante }}</p>
          <p style="color: var(--color-on-surface-variant)">Saldo pendiente: <strong style="color: #92400E">{{ formatPrice(cobroVenta.saldoPendiente) }}</strong></p>
        </div>
        <div>
          <label class="text-xs font-bold uppercase tracking-wider block mb-1.5" style="color: var(--color-outline)">Monto *</label>
          <input v-model.number="cobroForm.monto" type="number" min="0" class="w-full px-4 py-3 rounded-xl text-sm outline-none" style="border: 1px solid var(--color-outline-variant); background-color: var(--color-surface-container-low); color: var(--color-on-surface)" />
        </div>
        <div>
          <label class="text-xs font-bold uppercase tracking-wider block mb-1.5" style="color: var(--color-outline)">Método de Pago *</label>
          <select v-model="cobroForm.metodoPago" class="w-full px-4 py-3 rounded-xl text-sm outline-none appearance-none" style="border: 1px solid var(--color-outline-variant); background-color: var(--color-surface-container-low); color: var(--color-on-surface)">
            <option>Efectivo</option>
            <option>Tarjeta</option>
            <option>Transferencia</option>
            <option>Cheque</option>
          </select>
        </div>
        <div>
          <label class="text-xs font-bold uppercase tracking-wider block mb-1.5" style="color: var(--color-outline)">Fecha de Cobro *</label>
          <input v-model="cobroForm.fechaCobro" type="date" class="w-full px-4 py-3 rounded-xl text-sm outline-none" style="border: 1px solid var(--color-outline-variant); background-color: var(--color-surface-container-low); color: var(--color-on-surface)" />
        </div>
        <div>
          <label class="text-xs font-bold uppercase tracking-wider block mb-1.5" style="color: var(--color-outline)">Referencia</label>
          <input v-model="cobroForm.referencia" type="text" placeholder="N° transacción, cheque…" class="w-full px-4 py-3 rounded-xl text-sm outline-none" style="border: 1px solid var(--color-outline-variant); background-color: var(--color-surface-container-low); color: var(--color-on-surface)" />
        </div>
        <p v-if="cobroError" class="text-xs font-medium" style="color: var(--color-error)">{{ cobroError }}</p>
      </div>
    </template>
    <template #footer>
      <BaseButton variant="secondary" class="flex-1" @click="showCobro = false">Cancelar</BaseButton>
      <BaseButton variant="primary" class="flex-1" :disabled="isCobrandо" @click="submitCobro">
        {{ isCobrandо ? "Guardando…" : "Registrar cobro" }}
      </BaseButton>
    </template>
  </BaseModal>

  <!-- ── Modal Factura ─────────────────────────────────────────────────────── -->
  <BaseModal :open="showFactura" size="sm" title="Emitir Factura" @close="showFactura = false">
    <template #body>
      <div class="space-y-4">
        <div>
          <label class="text-xs font-bold uppercase tracking-wider block mb-1.5" style="color: var(--color-outline)">N° Factura *</label>
          <input v-model="facturaForm.numeroFactura" type="text" placeholder="001-001-0000001" class="w-full px-4 py-3 rounded-xl text-sm outline-none" style="border: 1px solid var(--color-outline-variant); background-color: var(--color-surface-container-low); color: var(--color-on-surface)" />
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="text-xs font-bold uppercase tracking-wider block mb-1.5" style="color: var(--color-outline)">Timbrado *</label>
            <input v-model="facturaForm.timbrado" type="text" class="w-full px-4 py-3 rounded-xl text-sm outline-none" style="border: 1px solid var(--color-outline-variant); background-color: var(--color-surface-container-low); color: var(--color-on-surface)" />
          </div>
          <div>
            <label class="text-xs font-bold uppercase tracking-wider block mb-1.5" style="color: var(--color-outline)">Establecimiento *</label>
            <input v-model="facturaForm.establecimiento" type="text" placeholder="001-001" class="w-full px-4 py-3 rounded-xl text-sm outline-none" style="border: 1px solid var(--color-outline-variant); background-color: var(--color-surface-container-low); color: var(--color-on-surface)" />
          </div>
        </div>
        <div>
          <label class="text-xs font-bold uppercase tracking-wider block mb-1.5" style="color: var(--color-outline)">Fecha de Emisión *</label>
          <input v-model="facturaForm.fechaEmision" type="date" class="w-full px-4 py-3 rounded-xl text-sm outline-none" style="border: 1px solid var(--color-outline-variant); background-color: var(--color-surface-container-low); color: var(--color-on-surface)" />
        </div>
        <div>
          <label class="text-xs font-bold uppercase tracking-wider block mb-1.5" style="color: var(--color-outline)">Observaciones</label>
          <textarea v-model="facturaForm.observaciones" rows="2" class="w-full px-4 py-3 rounded-xl text-sm outline-none resize-none" style="border: 1px solid var(--color-outline-variant); background-color: var(--color-surface-container-low); color: var(--color-on-surface)"></textarea>
        </div>
        <p v-if="facturaError" class="text-xs font-medium" style="color: var(--color-error)">{{ facturaError }}</p>
      </div>
    </template>
    <template #footer>
      <BaseButton variant="secondary" class="flex-1" @click="showFactura = false">Cancelar</BaseButton>
      <BaseButton variant="primary" class="flex-1" :disabled="isEmitiendo" @click="submitFactura">
        {{ isEmitiendo ? "Emitiendo…" : "Emitir factura" }}
      </BaseButton>
    </template>
  </BaseModal>

  <!-- ── Modal Confirmar ───────────────────────────────────────────────────── -->
  <BaseModal :open="showConfirmar" size="sm" title="Confirmar Venta" @close="showConfirmar = false">
    <template #body>
      <p class="text-sm" style="color: var(--color-on-surface-variant)">
        ¿Confirmás la venta <strong style="color: var(--color-on-surface)">{{ confirmarVentaObj?.numeroComprobante }}</strong>?
        Cambiará al estado <strong>{{ confirmarVentaObj?.condicionVenta === "Credito" ? "Pendiente de Pago" : "Confirmada" }}</strong>.
      </p>
    </template>
    <template #footer>
      <BaseButton variant="secondary" class="flex-1" @click="showConfirmar = false">Cancelar</BaseButton>
      <BaseButton variant="primary" class="flex-1" :disabled="isConfirmando" @click="submitConfirmar">
        {{ isConfirmando ? "Confirmando…" : "Confirmar" }}
      </BaseButton>
    </template>
  </BaseModal>

  <!-- ── Modal Anular ──────────────────────────────────────────────────────── -->
  <BaseModal :open="showAnular" size="sm" title="Anular Venta" @close="showAnular = false">
    <template #body>
      <div class="space-y-4">
        <p class="text-sm" style="color: var(--color-on-surface-variant)">
          Esta acción no se puede deshacer. Ingresá el motivo de la anulación.
        </p>
        <div>
          <label class="text-xs font-bold uppercase tracking-wider block mb-1.5" style="color: var(--color-outline)">Motivo *</label>
          <textarea v-model="motivoAnulacion" rows="3" class="w-full px-4 py-3 rounded-xl text-sm outline-none resize-none" style="border: 1px solid var(--color-outline-variant); background-color: var(--color-surface-container-low); color: var(--color-on-surface)"></textarea>
        </div>
        <p v-if="anularError" class="text-xs font-medium" style="color: var(--color-error)">{{ anularError }}</p>
      </div>
    </template>
    <template #footer>
      <BaseButton variant="secondary" class="flex-1" @click="showAnular = false">Cancelar</BaseButton>
      <BaseButton variant="danger" class="flex-1" :disabled="isAnulando" @click="submitAnular">
        {{ isAnulando ? "Anulando…" : "Anular venta" }}
      </BaseButton>
    </template>
  </BaseModal>
</template>
