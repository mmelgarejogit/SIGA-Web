<script setup lang="ts">
import { ref, computed, onMounted } from "vue"
import { useRouter, useRoute } from "vue-router"
import AppSidebar from "@/components/AppSidebar.vue"
import AppHeader from "@/components/AppHeader.vue"
import BaseTable from "@/components/BaseTable.vue"
import BaseModal from "@/components/BaseModal.vue"
import BaseButton from "@/components/BaseButton.vue"
import SearchInput from "@/components/SearchInput.vue"
import RowContextMenu, { type ContextMenuItem } from "@/components/RowContextMenu.vue"
import { type Venta, type MetodoPago, getCobrosPendientes, registrarCobro } from "@/services/ventasService"

const router = useRouter()
const route  = useRoute()

const formatPrice = (n: number) =>
  new Intl.NumberFormat("es-PY", { style: "currency", currency: "PYG", maximumFractionDigits: 0 }).format(n)

const formatDate = (s?: string) =>
  s ? new Date(s + "T00:00:00").toLocaleDateString("es-PY", { day: "2-digit", month: "short", year: "numeric" }) : "—"

// ── Datos ──────────────────────────────────────────────────────────────────────

const ventas    = ref<Venta[]>([])
const isLoading = ref(false)
const search    = ref("")

async function load() {
  isLoading.value = true
  try {
    ventas.value = await getCobrosPendientes()
  } catch {
    ventas.value = []
  } finally {
    isLoading.value = false
  }
}

onMounted(async () => {
  await load()
  // Si venimos de generar una venta, abrir directo el cobro de esa venta
  const ventaId = Number(route.query.venta)
  if (ventaId) {
    const v = ventas.value.find(x => x.id === ventaId)
    if (v) openCobro(v)
  }
})

// ── Registrar cobro ─────────────────────────────────────────────────────────────

const showCobro      = ref(false)
const isCobro        = ref(false)
const cobroError     = ref("")
const selectedVenta  = ref<Venta | null>(null)
const cobroLineas    = ref<{ metodoPago: MetodoPago; monto: number }[]>([{ metodoPago: "Efectivo", monto: 0 }])
const cobroFecha     = ref(new Date().toISOString().slice(0, 10))
const cobroTipo      = ref<"Seña" | "Cuota">("Cuota")

function openCobro(v: Venta) {
  selectedVenta.value = v
  cobroLineas.value   = [{ metodoPago: "Efectivo", monto: v.saldoPendiente }]
  cobroFecha.value    = new Date().toISOString().slice(0, 10)
  cobroTipo.value     = v.estado === "EnProceso" ? "Seña" : "Cuota"
  cobroError.value    = ""
  showCobro.value     = true
}

function addCobroLinea()              { cobroLineas.value.push({ metodoPago: "Efectivo", monto: 0 }) }
function removeCobroLinea(i: number)  { cobroLineas.value.splice(i, 1) }
const totalCobro = computed(() => cobroLineas.value.reduce((s, l) => s + (l.monto || 0), 0))

async function submitCobro() {
  if (!selectedVenta.value) return
  if (totalCobro.value <= 0) { cobroError.value = "El monto total debe ser mayor a 0"; return }
  isCobro.value    = true
  cobroError.value = ""
  try {
    await registrarCobro({
      ventaId: selectedVenta.value.id,
      tipo:    cobroTipo.value,
      fecha:   cobroFecha.value,
      lineas:  cobroLineas.value.filter(l => l.monto > 0),
    })
    showCobro.value = false
    await load()
  } catch (e: any) {
    cobroError.value = e?.response?.data?.message ?? "Error al registrar cobro"
  } finally {
    isCobro.value = false
  }
}

// ── Filtro y agrupación ────────────────────────────────────────────────────────

const filtered = computed(() => {
  if (!search.value.trim()) return ventas.value
  const q = search.value.toLowerCase()
  return ventas.value.filter(v =>
    v.clienteNombre.toLowerCase().includes(q) ||
    v.numeroComprobante.toLowerCase().includes(q),
  )
})

// Total de saldo pendiente de todas las ventas visibles
const totalSaldo = computed(() =>
  filtered.value.reduce((s, v) => s + v.saldoPendiente, 0),
)

// Agrupado por paciente para el resumen
const porPaciente = computed(() => {
  const map = new Map<string, { nombre: string; ventas: number; saldo: number }>()
  for (const v of filtered.value) {
    const entry = map.get(v.clienteNombre) ?? { nombre: v.clienteNombre, ventas: 0, saldo: 0 }
    entry.ventas++
    entry.saldo += v.saldoPendiente
    map.set(v.clienteNombre, entry)
  }
  return [...map.values()].sort((a, b) => b.saldo - a.saldo)
})

// ── Estado badge ───────────────────────────────────────────────────────────────

function estadoBadge(estado: string) {
  const map: Record<string, { bg: string; text: string; label: string }> = {
    Confirmada:         { bg: "#EDE9FE", text: "#7C3AED",  label: "Confirmada" },
    EnProceso:          { bg: "#DBEAFE", text: "#1D4ED8",  label: "En proceso" },
    ListaParaCobrar:    { bg: "#FEF3C7", text: "#92400E",  label: "Lista cobrar" },
    ComprobanteEmitido: { bg: "#DCFCE7", text: "#166534",  label: "Emitido" },
  }
  return map[estado] ?? { bg: "#F3F4F6", text: "#6B7280", label: estado }
}

// ── Semáforo de antigüedad ────────────────────────────────────────────────────

function antiguedadColor(fechaVenta: string): { color: string; label: string } {
  const dias = Math.floor((Date.now() - new Date(fechaVenta + "T00:00:00").getTime()) / 86_400_000)
  if (dias <= 7)  return { color: "#166534", label: `${dias}d` }
  if (dias <= 30) return { color: "#92400E", label: `${dias}d` }
  return { color: "#991B1B", label: `${dias}d` }
}

// ── Context menu ───────────────────────────────────────────────────────────────

function menuItems(v: Venta): ContextMenuItem[] {
  return [
    { type: "item", label: "Registrar cobro",  icon: "payments",   action: () => openCobro(v) },
    { type: "separator" },
    { type: "item", label: "Ver detalle",      icon: "visibility", action: () => router.push(`/ventas/${v.id}`) },
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
            <h1 class="text-4xl font-extrabold tracking-tight mb-2">Cobros Pendientes</h1>
            <p class="font-medium" style="color: var(--color-on-surface-variant)">
              {{ filtered.length }} venta{{ filtered.length !== 1 ? "s" : "" }} con saldo pendiente
            </p>
          </div>
          <!-- Total global -->
          <div class="rounded-2xl px-6 py-4 text-right" style="background-color: var(--color-surface-container-lowest); box-shadow: 0 2px 12px rgba(0,40,142,0.06)">
            <p class="text-xs font-bold uppercase tracking-wider mb-1" style="color: var(--color-outline)">Saldo total pendiente</p>
            <p class="text-2xl font-extrabold" style="color: #92400E">{{ formatPrice(totalSaldo) }}</p>
          </div>
        </div>

        <div class="grid grid-cols-1 xl:grid-cols-4 gap-6">

          <!-- Tabla principal -->
          <div class="xl:col-span-3 space-y-4">

            <!-- Filtros -->
            <div class="flex items-center justify-end">
              <SearchInput v-model="search" placeholder="Buscar por cliente o comprobante…" class="w-72" />
            </div>

            <div class="rounded-2xl overflow-hidden" style="background-color: var(--color-surface-container-lowest); box-shadow: 0 2px 12px rgba(0,40,142,0.06)">
              <BaseTable :loading="isLoading" :empty="filtered.length === 0" empty-message="Sin cobros pendientes">
                <template #head>
                  <th class="px-6 py-5 text-left text-xs font-bold uppercase tracking-widest" style="color: var(--color-outline)">Comprobante</th>
                  <th class="px-6 py-5 text-left text-xs font-bold uppercase tracking-widest" style="color: var(--color-outline)">Cliente</th>
                  <th class="px-6 py-5 text-left text-xs font-bold uppercase tracking-widest" style="color: var(--color-outline)">Fecha</th>
                  <th class="px-6 py-5 text-left text-xs font-bold uppercase tracking-widest" style="color: var(--color-outline)">Antigüedad</th>
                  <th class="px-6 py-5 text-left text-xs font-bold uppercase tracking-widest" style="color: var(--color-outline)">Total</th>
                  <th class="px-6 py-5 text-left text-xs font-bold uppercase tracking-widest" style="color: var(--color-outline)">Cobrado</th>
                  <th class="px-6 py-5 text-left text-xs font-bold uppercase tracking-widest" style="color: var(--color-outline)">Saldo</th>
                  <th class="px-6 py-5 text-left text-xs font-bold uppercase tracking-widest" style="color: var(--color-outline)">Estado</th>
                  <th class="px-6 py-5"></th>
                </template>
                <template #body>
                  <tr
                    v-for="v in filtered"
                    :key="v.id"
                    class="hover:bg-surface-container-low cursor-pointer"
                    style="border-bottom: 1px solid rgba(196,197,213,0.12)"
                    @click="openCobro(v)"
                  >
                    <td class="px-6 py-4">
                      <span class="text-sm font-mono font-semibold" style="color: var(--color-primary)">{{ v.numeroComprobante }}</span>
                    </td>
                    <td class="px-6 py-4 text-sm font-medium" style="color: var(--color-on-surface)">{{ v.clienteNombre }}</td>
                    <td class="px-6 py-4 text-sm" style="color: var(--color-on-surface-variant)">{{ formatDate(v.fechaVenta) }}</td>
                    <td class="px-6 py-4">
                      <span
                        class="text-xs font-bold px-2 py-1 rounded-full"
                        :style="`background: ${antiguedadColor(v.fechaVenta).color}22; color: ${antiguedadColor(v.fechaVenta).color}`"
                      >{{ antiguedadColor(v.fechaVenta).label }}</span>
                    </td>
                    <td class="px-6 py-4 text-sm" style="color: var(--color-on-surface-variant)">{{ formatPrice(v.total) }}</td>
                    <td class="px-6 py-4 text-sm" style="color: #166534">{{ formatPrice(v.totalCobrado) }}</td>
                    <td class="px-6 py-4">
                      <span class="text-sm font-bold" style="color: #92400E">{{ formatPrice(v.saldoPendiente) }}</span>
                    </td>
                    <td class="px-6 py-4">
                      <span
                        class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold"
                        :style="`background-color: ${estadoBadge(v.estado).bg}; color: ${estadoBadge(v.estado).text}`"
                      >{{ estadoBadge(v.estado).label }}</span>
                    </td>
                    <td class="px-6 py-4 text-right" @click.stop>
                      <RowContextMenu :items="menuItems(v)" />
                    </td>
                  </tr>
                </template>
              </BaseTable>
            </div>

          </div>

          <!-- Panel lateral: resumen por paciente -->
          <div class="xl:col-span-1">
            <div class="rounded-2xl overflow-hidden sticky top-24" style="background-color: var(--color-surface-container-lowest); box-shadow: 0 2px 12px rgba(0,40,142,0.06)">
              <div class="px-5 py-4" style="border-bottom: 1px solid rgba(196,197,213,0.12)">
                <h3 class="text-sm font-bold uppercase tracking-wider" style="color: var(--color-outline)">Por cliente</h3>
              </div>
              <div class="divide-y" style="divide-color: rgba(196,197,213,0.12); max-height: 480px; overflow-y: auto">
                <div v-if="!porPaciente.length" class="px-5 py-4 text-sm" style="color: var(--color-outline)">
                  Sin datos
                </div>
                <button
                  v-for="p in porPaciente"
                  :key="p.nombre"
                  class="w-full px-5 py-3.5 text-left transition-colors hover:bg-surface-container-low"
                  @click="search = p.nombre"
                >
                  <div class="flex items-start justify-between gap-2">
                    <div class="min-w-0">
                      <p class="text-sm font-semibold truncate" style="color: var(--color-on-surface)">{{ p.nombre }}</p>
                      <p class="text-xs mt-0.5" style="color: var(--color-on-surface-variant)">
                        {{ p.ventas }} venta{{ p.ventas !== 1 ? "s" : "" }}
                      </p>
                    </div>
                    <span class="text-sm font-bold flex-shrink-0" style="color: #92400E">{{ formatPrice(p.saldo) }}</span>
                  </div>
                </button>
              </div>
            </div>
          </div>

        </div>
      </div>
    </main>

    <!-- ── Modal: Registrar cobro ────────────────────────────────────────────── -->
    <BaseModal :open="showCobro" size="lg" title="Registrar Cobro" @close="showCobro = false">
      <template #body>
        <div class="space-y-5">
          <div v-if="selectedVenta" class="p-3 rounded-xl text-sm" style="background:var(--color-surface-container-low)">
            <p class="font-semibold" style="color:var(--color-on-surface)">{{ selectedVenta.numeroComprobante }} · {{ selectedVenta.clienteNombre }}</p>
            <p style="color:var(--color-on-surface-variant)">Saldo pendiente: <strong style="color:#92400E">{{ formatPrice(selectedVenta.saldoPendiente) }}</strong></p>
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="text-xs font-bold uppercase tracking-wider block mb-1.5" style="color:var(--color-outline)">Tipo *</label>
              <select v-model="cobroTipo" class="w-full px-4 py-3 rounded-xl text-sm outline-none appearance-none" style="border:1px solid var(--color-outline-variant);background:var(--color-surface-container-low);color:var(--color-on-surface)">
                <option value="Cuota">Cuota</option>
                <option value="Seña">Seña</option>
              </select>
            </div>
            <div>
              <label class="text-xs font-bold uppercase tracking-wider block mb-1.5" style="color:var(--color-outline)">Fecha *</label>
              <input v-model="cobroFecha" type="date" class="w-full px-4 py-3 rounded-xl text-sm outline-none" style="border:1px solid var(--color-outline-variant);background:var(--color-surface-container-low);color:var(--color-on-surface)" />
            </div>
          </div>

          <!-- Líneas de pago -->
          <div>
            <div class="flex items-center justify-between mb-2">
              <label class="text-xs font-bold uppercase tracking-wider" style="color:var(--color-outline)">Métodos de pago *</label>
              <button class="text-xs font-semibold flex items-center gap-1" style="color:var(--color-primary)" @click="addCobroLinea">
                <span class="material-symbols-outlined" style="font-size:14px">add</span> Agregar método
              </button>
            </div>
            <div class="space-y-2">
              <div v-for="(l, i) in cobroLineas" :key="i" class="flex gap-3 items-center">
                <select v-model="l.metodoPago" class="flex-1 px-4 py-3 rounded-xl text-sm outline-none appearance-none" style="border:1px solid var(--color-outline-variant);background:var(--color-surface-container-low);color:var(--color-on-surface)">
                  <option>Efectivo</option>
                  <option>Tarjeta</option>
                  <option>Transferencia</option>
                  <option>Cheque</option>
                </select>
                <input v-model.number="l.monto" type="number" min="0" placeholder="Monto" class="flex-1 px-4 py-3 rounded-xl text-sm outline-none" style="border:1px solid var(--color-outline-variant);background:var(--color-surface-container-low);color:var(--color-on-surface)" />
                <button v-if="cobroLineas.length > 1" class="w-8 h-8 rounded-full flex items-center justify-center" style="background:#FEE2E2;color:#991B1B" @click="removeCobroLinea(i)">
                  <span class="material-symbols-outlined" style="font-size:14px">close</span>
                </button>
              </div>
            </div>
            <p class="text-sm font-semibold mt-2" style="color:var(--color-primary)">Total: {{ formatPrice(totalCobro) }}</p>
          </div>

          <p v-if="cobroError" class="text-xs font-medium" style="color:var(--color-error)">{{ cobroError }}</p>
        </div>
      </template>
      <template #footer>
        <BaseButton variant="secondary" class="flex-1" @click="showCobro = false">Cancelar</BaseButton>
        <BaseButton variant="primary" class="flex-1" :disabled="isCobro" @click="submitCobro">
          {{ isCobro ? "Registrando…" : "Registrar cobro" }}
        </BaseButton>
      </template>
    </BaseModal>
  </div>
</template>
