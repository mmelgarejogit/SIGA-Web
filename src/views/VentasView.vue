<script setup lang="ts">
import { ref, computed, onMounted, watch } from "vue"
import AppSidebar from "@/components/AppSidebar.vue"
import AppHeader from "@/components/AppHeader.vue"
import BaseModal from "@/components/BaseModal.vue"
import BaseTable from "@/components/BaseTable.vue"
import FilterChips from "@/components/FilterChips.vue"
import SearchInput from "@/components/SearchInput.vue"
import { type Venta, getVentas } from "@/services/ventasService"

const formatPrice = (n: number) =>
  new Intl.NumberFormat("es-PY", { style: "currency", currency: "PYG", maximumFractionDigits: 0 }).format(n)

const formatDate = (s?: string) =>
  s ? new Date(s.includes("T") ? s : s + "T00:00:00").toLocaleDateString("es-PY", { day: "2-digit", month: "short", year: "numeric" }) : "—"

// ── Estado ────────────────────────────────────────────────────────────────────

const ventas      = ref<Venta[]>([])
const totalCount  = ref(0)
const totalPages  = ref(1)
const isLoading   = ref(false)
const currentPage = ref(1)
const pageSize    = 10

const search       = ref("")
const estadoFiltro = ref<string[]>([])
const tipoFiltro   = ref<string[]>([])

const estadoOptions = [
  { value: "Borrador",           label: "Borrador",            dot: "#6B7280" },
  { value: "Confirmada",         label: "Confirmada",          dot: "#7C3AED" },
  { value: "EnProceso",          label: "En proceso",          dot: "#1D4ED8" },
  { value: "ListaParaCobrar",    label: "Lista para cobrar",   dot: "#92400E" },
  { value: "ComprobanteEmitido", label: "Comprobante emitido", dot: "#166534" },
  { value: "Cancelada",          label: "Cancelada",           dot: "#9CA3AF" },
]

const tipoOptions = [
  { value: "Directa",        label: "Directa" },
  { value: "TrabajoAPedido", label: "Trabajo a pedido" },
]

async function loadVentas() {
  isLoading.value = true
  try {
    const res = await getVentas({
      estado:    estadoFiltro.value.length === 1 ? estadoFiltro.value[0] : undefined,
      tipo:      tipoFiltro.value.length === 1   ? tipoFiltro.value[0]   : undefined,
      page:      currentPage.value,
      pageSize,
    })
    ventas.value     = res.items
    totalCount.value = res.totalCount
    totalPages.value = res.totalPages
  } catch {
    ventas.value = []
  } finally {
    isLoading.value = false
  }
}

watch([estadoFiltro, tipoFiltro], () => { currentPage.value = 1; loadVentas() })
onMounted(loadVentas)

const filtered = computed(() => {
  if (!search.value.trim()) return ventas.value
  const q = search.value.toLowerCase()
  return ventas.value.filter(v =>
    v.clienteNombre.toLowerCase().includes(q) ||
    v.numeroComprobante.toLowerCase().includes(q),
  )
})

// ── Paginación ────────────────────────────────────────────────────────────────

const rangeStart = computed(() => totalCount.value === 0 ? 0 : (currentPage.value - 1) * pageSize + 1)
const rangeEnd   = computed(() => Math.min(currentPage.value * pageSize, totalCount.value))

const visiblePages = computed(() => {
  const total = totalPages.value
  const cur   = currentPage.value
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const pages: (number | "...")[] = [1]
  if (cur > 3) pages.push("...")
  for (let p = Math.max(2, cur - 1); p <= Math.min(total - 1, cur + 1); p++) pages.push(p)
  if (cur < total - 2) pages.push("...")
  pages.push(total)
  return pages
})

// ── Badges ────────────────────────────────────────────────────────────────────

function estadoBadge(estado: string) {
  const map: Record<string, { bg: string; text: string; label: string }> = {
    Borrador:           { bg: "#F3F4F6", text: "#6B7280",  label: "Borrador" },
    Confirmada:         { bg: "#EDE9FE", text: "#7C3AED",  label: "Confirmada" },
    EnProceso:          { bg: "#DBEAFE", text: "#1D4ED8",  label: "En proceso" },
    ListaParaCobrar:    { bg: "#FEF3C7", text: "#92400E",  label: "Lista cobrar" },
    ComprobanteEmitido: { bg: "#DCFCE7", text: "#166534",  label: "Emitido" },
    Cancelada:          { bg: "#F3F4F6", text: "#9CA3AF",  label: "Cancelada" },
  }
  return map[estado] ?? { bg: "#F3F4F6", text: "#6B7280", label: estado }
}

function tipoBadge(tipo: string) {
  return tipo === "TrabajoAPedido"
    ? { bg: "#F0FDF4", text: "#166534",  label: "A pedido" }
    : { bg: "#EFF6FF", text: "#1D4ED8",  label: "Directa" }
}

// ── Detalle solo-lectura ────────────────────────────────────────────────────

const showDetalle    = ref(false)
const detalle        = ref<Venta | null>(null)

function openDetalle(v: Venta) {
  detalle.value     = v
  showDetalle.value = true
}

const condicionLabel = (c?: string) => (c === "Credito" ? "Crédito" : "Contado")
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
              {{ totalCount }} venta{{ totalCount !== 1 ? "s" : "" }} registrada{{ totalCount !== 1 ? "s" : "" }} · solo consulta
            </p>
          </div>
        </div>

        <!-- Filtros -->
        <div class="flex items-center justify-between gap-4 mb-6 flex-wrap">
          <div class="flex items-center gap-3 flex-wrap">
            <FilterChips v-model="estadoFiltro" :options="estadoOptions" placeholder="Estado" />
            <FilterChips v-model="tipoFiltro"   :options="tipoOptions"   placeholder="Tipo" />
          </div>
          <SearchInput v-model="search" placeholder="Buscar por cliente o comprobante…" class="w-72" />
        </div>

        <!-- Tabla -->
        <div class="rounded-2xl overflow-hidden" style="background-color: var(--color-surface-container-lowest); box-shadow: 0 2px 12px rgba(0,40,142,0.06)">
          <BaseTable :loading="isLoading" :empty="filtered.length === 0" empty-message="No hay ventas que mostrar">
            <template #head>
              <th class="px-6 py-5 text-left text-xs font-bold uppercase tracking-widest" style="color: var(--color-outline)">Comprobante</th>
              <th class="px-6 py-5 text-left text-xs font-bold uppercase tracking-widest" style="color: var(--color-outline)">Cliente</th>
              <th class="px-6 py-5 text-left text-xs font-bold uppercase tracking-widest" style="color: var(--color-outline)">Tipo</th>
              <th class="px-6 py-5 text-left text-xs font-bold uppercase tracking-widest" style="color: var(--color-outline)">Fecha</th>
              <th class="px-6 py-5 text-left text-xs font-bold uppercase tracking-widest" style="color: var(--color-outline)">Total</th>
              <th class="px-6 py-5 text-left text-xs font-bold uppercase tracking-widest" style="color: var(--color-outline)">Saldo</th>
              <th class="px-6 py-5 text-left text-xs font-bold uppercase tracking-widest" style="color: var(--color-outline)">Estado</th>
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
                <td class="px-6 py-4 text-sm font-medium" style="color: var(--color-on-surface)">{{ v.clienteNombre }}</td>
                <td class="px-6 py-4">
                  <span
                    class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold"
                    :style="`background-color: ${tipoBadge(v.tipo).bg}; color: ${tipoBadge(v.tipo).text}`"
                  >{{ tipoBadge(v.tipo).label }}</span>
                </td>
                <td class="px-6 py-4 text-sm" style="color: var(--color-on-surface-variant)">{{ formatDate(v.fechaVenta) }}</td>
                <td class="px-6 py-4 text-sm font-semibold" style="color: var(--color-on-surface)">{{ formatPrice(v.total) }}</td>
                <td class="px-6 py-4 text-sm">
                  <span v-if="v.saldoPendiente > 0" class="font-medium" style="color: #92400E">{{ formatPrice(v.saldoPendiente) }}</span>
                  <span v-else style="color: var(--color-on-surface-variant)">—</span>
                </td>
                <td class="px-6 py-4">
                  <span
                    class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold"
                    :style="`background-color: ${estadoBadge(v.estado).bg}; color: ${estadoBadge(v.estado).text}`"
                  >{{ estadoBadge(v.estado).label }}</span>
                </td>
              </tr>
            </template>
          </BaseTable>

          <!-- Footer paginador -->
          <div
            v-if="ventas.length > 0"
            class="px-6 py-4 flex items-center justify-between flex-wrap gap-4"
            style="border-top: 1px solid rgba(196, 197, 213, 0.12); background-color: var(--color-surface-container-lowest)"
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

    <!-- ── Modal: Detalle (solo lectura) ──────────────────────────────────────── -->
    <BaseModal :open="showDetalle" size="lg" :title="detalle ? `Venta ${detalle.numeroComprobante}` : 'Detalle'" @close="showDetalle = false">
      <template #body>
        <div v-if="detalle" class="space-y-6">

          <!-- Resumen superior -->
          <div class="flex flex-wrap items-center gap-2">
            <span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold"
              :style="`background-color: ${estadoBadge(detalle.estado).bg}; color: ${estadoBadge(detalle.estado).text}`">{{ estadoBadge(detalle.estado).label }}</span>
            <span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold"
              :style="`background-color: ${tipoBadge(detalle.tipo).bg}; color: ${tipoBadge(detalle.tipo).text}`">{{ tipoBadge(detalle.tipo).label }}</span>
            <span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold" style="background:#F3F4F6;color:#374151">{{ condicionLabel(detalle.condicionVenta) }}</span>
          </div>

          <!-- Datos generales -->
          <div class="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p class="text-xs font-bold uppercase tracking-wider mb-0.5" style="color:var(--color-outline)">Cliente</p>
              <p class="font-medium" style="color:var(--color-on-surface)">{{ detalle.clienteNombre }}</p>
            </div>
            <div>
              <p class="text-xs font-bold uppercase tracking-wider mb-0.5" style="color:var(--color-outline)">Fecha de venta</p>
              <p style="color:var(--color-on-surface)">{{ formatDate(detalle.fechaVenta) }}</p>
            </div>
            <div v-if="detalle.fechaConfirmacion">
              <p class="text-xs font-bold uppercase tracking-wider mb-0.5" style="color:var(--color-outline)">Confirmada</p>
              <p style="color:var(--color-on-surface)">{{ formatDate(detalle.fechaConfirmacion) }}</p>
            </div>
            <div v-if="detalle.fechaComprobante">
              <p class="text-xs font-bold uppercase tracking-wider mb-0.5" style="color:var(--color-outline)">Comprobante</p>
              <p style="color:var(--color-on-surface)">{{ formatDate(detalle.fechaComprobante) }}</p>
            </div>
          </div>

          <!-- Líneas -->
          <div>
            <p class="text-xs font-bold uppercase tracking-wider mb-2" style="color:var(--color-outline)">Detalle</p>
            <div class="rounded-xl overflow-hidden" style="border:1px solid rgba(196,197,213,0.2)">
              <table class="w-full text-sm">
                <thead>
                  <tr style="background:var(--color-surface-container-low)">
                    <th class="text-left px-3 py-2 text-xs font-bold uppercase" style="color:var(--color-outline)">Descripción</th>
                    <th class="text-center px-3 py-2 text-xs font-bold uppercase" style="color:var(--color-outline)">Cant.</th>
                    <th class="text-right px-3 py-2 text-xs font-bold uppercase" style="color:var(--color-outline)">P. Unit.</th>
                    <th class="text-right px-3 py-2 text-xs font-bold uppercase" style="color:var(--color-outline)">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="l in detalle.lineas" :key="l.id" style="border-top:1px solid rgba(196,197,213,0.15)">
                    <td class="px-3 py-2" style="color:var(--color-on-surface)">{{ l.descripcion }}</td>
                    <td class="px-3 py-2 text-center" style="color:var(--color-on-surface-variant)">{{ l.cantidad }}</td>
                    <td class="px-3 py-2 text-right" style="color:var(--color-on-surface-variant)">{{ formatPrice(l.precioUnitario) }}</td>
                    <td class="px-3 py-2 text-right font-semibold" style="color:var(--color-on-surface)">{{ formatPrice(l.subtotal) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- Totales -->
          <div class="flex justify-end">
            <div class="w-64 space-y-1 text-sm">
              <div v-if="detalle.montoExento > 0" class="flex justify-between"><span style="color:var(--color-on-surface-variant)">Exento</span><span style="color:var(--color-on-surface)">{{ formatPrice(detalle.montoExento) }}</span></div>
              <div v-if="detalle.montoGravado5 > 0" class="flex justify-between"><span style="color:var(--color-on-surface-variant)">Gravado 5%</span><span style="color:var(--color-on-surface)">{{ formatPrice(detalle.montoGravado5) }}</span></div>
              <div v-if="detalle.montoGravado10 > 0" class="flex justify-between"><span style="color:var(--color-on-surface-variant)">Gravado 10%</span><span style="color:var(--color-on-surface)">{{ formatPrice(detalle.montoGravado10) }}</span></div>
              <div class="flex justify-between font-bold text-base pt-1" style="border-top:1px solid rgba(196,197,213,0.2)"><span style="color:var(--color-on-surface)">Total</span><span style="color:var(--color-primary)">{{ formatPrice(detalle.total) }}</span></div>
              <div class="flex justify-between"><span style="color:var(--color-on-surface-variant)">Cobrado</span><span style="color:#166534">{{ formatPrice(detalle.totalCobrado) }}</span></div>
              <div v-if="detalle.saldoPendiente > 0" class="flex justify-between font-semibold"><span style="color:#92400E">Saldo</span><span style="color:#92400E">{{ formatPrice(detalle.saldoPendiente) }}</span></div>
            </div>
          </div>

          <!-- Cobros -->
          <div v-if="detalle.cobros.length">
            <p class="text-xs font-bold uppercase tracking-wider mb-2" style="color:var(--color-outline)">Cobros</p>
            <div class="space-y-1.5">
              <div v-for="c in detalle.cobros" :key="c.id" class="flex items-center justify-between text-sm px-3 py-2 rounded-lg" style="background:var(--color-surface-container-low)" :style="c.anulado ? 'opacity:0.5;text-decoration:line-through' : ''">
                <span style="color:var(--color-on-surface-variant)">{{ c.tipo }} · {{ formatDate(c.fecha) }} · {{ c.lineas.map(x => x.metodoPago).join(', ') }}</span>
                <span class="font-semibold" style="color:var(--color-on-surface)">{{ formatPrice(c.montoTotal) }}</span>
              </div>
            </div>
          </div>

          <!-- Comprobante / Factura -->
          <div v-if="detalle.comprobante || detalle.factura" class="grid grid-cols-2 gap-4 text-sm">
            <div v-if="detalle.comprobante" class="p-3 rounded-xl" style="background:#F0FDF4;border:1px solid #BBF7D0">
              <p class="text-xs font-bold uppercase tracking-wider mb-0.5" style="color:#166534">Comprobante</p>
              <p style="color:var(--color-on-surface)">{{ detalle.comprobante.tipo }} · {{ detalle.comprobante.estado }}</p>
            </div>
            <div v-if="detalle.factura" class="p-3 rounded-xl" style="background:#EFF6FF;border:1px solid #BFDBFE">
              <p class="text-xs font-bold uppercase tracking-wider mb-0.5" style="color:#1D4ED8">Factura</p>
              <p style="color:var(--color-on-surface)">{{ detalle.factura.numeroFactura }} · {{ formatPrice(detalle.factura.total) }}</p>
            </div>
          </div>

          <!-- Trabajo a pedido -->
          <div v-if="detalle.trabajoPedido" class="p-3 rounded-xl text-sm" style="background:var(--color-surface-container-low)">
            <p class="text-xs font-bold uppercase tracking-wider mb-1" style="color:var(--color-outline)">Trabajo a pedido</p>
            <p style="color:var(--color-on-surface)">
              {{ detalle.trabajoPedido.tipoLenteNombre }}
              <span v-if="detalle.trabajoPedido.tratamientos.length"> · {{ detalle.trabajoPedido.tratamientos.map(t => t.nombre).join(', ') }}</span>
            </p>
            <p style="color:var(--color-on-surface-variant)">Lab: {{ detalle.trabajoPedido.laboratorioNombre }} · Estado: {{ detalle.trabajoPedido.estado }}</p>
          </div>

          <!-- Observaciones -->
          <div v-if="detalle.observaciones">
            <p class="text-xs font-bold uppercase tracking-wider mb-0.5" style="color:var(--color-outline)">Observaciones</p>
            <p class="text-sm" style="color:var(--color-on-surface-variant)">{{ detalle.observaciones }}</p>
          </div>

        </div>
      </template>
    </BaseModal>
  </div>
</template>
