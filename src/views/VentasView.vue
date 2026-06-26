<script setup lang="ts">
import { ref, computed, onMounted, watch } from "vue"
import { useRouter } from "vue-router"
import AppSidebar from "@/components/AppSidebar.vue"
import AppHeader from "@/components/AppHeader.vue"
import BaseTable from "@/components/BaseTable.vue"
import FilterChips from "@/components/FilterChips.vue"
import SearchInput from "@/components/SearchInput.vue"
import { type Venta, getVentas } from "@/services/ventasService"

const router = useRouter()

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
  { value: "Borrador",           label: "Borrador",            dot: "var(--color-outline)" },
  { value: "Confirmada",         label: "Confirmada",          dot: "var(--color-tertiary)" },
  { value: "EnProceso",          label: "En proceso",          dot: "var(--color-on-info-container)" },
  { value: "ListaParaCobrar",    label: "Lista para cobrar",   dot: "var(--color-on-warning-container)" },
  { value: "ComprobanteEmitido", label: "Comprobante emitido", dot: "var(--color-on-success-container)" },
  { value: "Cancelada",          label: "Cancelada",           dot: "var(--color-outline)" },
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
    Borrador:           { bg: "var(--color-surface-container)", text: "var(--color-outline)",  label: "Borrador" },
    Confirmada:         { bg: "color-mix(in srgb, var(--color-tertiary) 12%, var(--color-surface-container-lowest))", text: "var(--color-tertiary)",  label: "Confirmada" },
    EnProceso:          { bg: "var(--color-info-container)", text: "var(--color-on-info-container)",  label: "En proceso" },
    ListaParaCobrar:    { bg: "var(--color-warning-container)", text: "var(--color-on-warning-container)",  label: "Lista cobrar" },
    ComprobanteEmitido: { bg: "var(--color-success-container)", text: "var(--color-on-success-container)",  label: "Emitido" },
    Cancelada:          { bg: "var(--color-surface-container)", text: "var(--color-outline)",  label: "Cancelada" },
  }
  return map[estado] ?? { bg: "var(--color-surface-container)", text: "var(--color-outline)", label: estado }
}

function tipoBadge(tipo: string) {
  return tipo === "TrabajoAPedido"
    ? { bg: "#F0FDF4", text: "var(--color-on-success-container)",  label: "A pedido" }
    : { bg: "#EFF6FF", text: "var(--color-on-info-container)",  label: "Directa" }
}

// ── Navegación al detalle ────────────────────────────────────────────────────

function goDetalle(v: Venta) {
  router.push(`/ventas/${v.id}`)
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
            <h1 class="text-4xl font-extrabold tracking-tight mb-2">Lista de Ventas</h1>
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
        <div class="rounded-2xl overflow-hidden" style="background-color: var(--color-surface-container-lowest); box-shadow: var(--shadow-sm)">
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
                style="border-bottom: 1px solid var(--color-hairline-soft)"
                @click="goDetalle(v)"
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
                  <span v-if="v.saldoPendiente > 0" class="font-medium" style="color: var(--color-on-warning-container)">{{ formatPrice(v.saldoPendiente) }}</span>
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
            style="border-top: 1px solid var(--color-hairline-soft); background-color: var(--color-surface-container-lowest)"
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
                  :class="currentPage === p ? 'bg-primary text-on-primary' : 'text-on-surface-variant hover:bg-surface-container-high'"
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
</template>
