<script setup lang="ts">
import { ref, computed, onMounted } from "vue"
import AppSidebar from "@/components/AppSidebar.vue"
import AppHeader from "@/components/AppHeader.vue"
import KpiCard from "@/components/KpiCard.vue"
import { type ResumenCaja, type MovimientoCaja, getResumenCaja } from "@/services/ventasService"

// ── Formato ───────────────────────────────────────────────────────────────────

const formatPrice = (n: number) =>
  new Intl.NumberFormat("es-PY", { style: "currency", currency: "PYG", maximumFractionDigits: 0 }).format(n)

const formatDate = (s: string) =>
  new Date(s + "T00:00:00").toLocaleDateString("es-PY", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })

const formatTime = (iso: string) =>
  new Date(iso).toLocaleTimeString("es-PY", { hour: "2-digit", minute: "2-digit" })

// ── Estado ────────────────────────────────────────────────────────────────────

const fecha = ref(new Date().toISOString().slice(0, 10))
const resumen = ref<ResumenCaja | null>(null)
const isLoading = ref(false)
const loadError = ref("")

async function cargar() {
  isLoading.value = true
  loadError.value = ""
  try {
    resumen.value = await getResumenCaja(fecha.value)
  } catch (e: any) {
    loadError.value = e?.response?.data?.message ?? "Error al cargar el resumen"
    resumen.value = null
  } finally {
    isLoading.value = false
  }
}

onMounted(cargar)

// ── Movimientos filtrados ─────────────────────────────────────────────────────

const tipoFiltro = ref<"todos" | "Ingreso" | "Egreso">("todos")

const movimientosFiltrados = computed(() => {
  if (!resumen.value) return []
  return tipoFiltro.value === "todos"
    ? resumen.value.movimientos
    : resumen.value.movimientos.filter((m) => m.tipo === tipoFiltro.value)
})

// ── Método de pago icon ───────────────────────────────────────────────────────

function metodoPagoIcon(m: string) {
  const icons: Record<string, string> = {
    Efectivo: "payments",
    Tarjeta: "credit_card",
    Transferencia: "account_balance",
    Cheque: "description",
  }
  return icons[m] ?? "payments"
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
            <h1 class="text-4xl font-extrabold tracking-tight" style="color: var(--color-on-surface)">Cierre de Caja</h1>
            <p v-if="resumen" class="mt-1 font-medium capitalize" style="color: var(--color-on-surface-variant)">
              {{ formatDate(resumen.fecha) }}
            </p>
          </div>
          <!-- Selector de fecha -->
          <div class="flex items-center gap-3">
            <input
              v-model="fecha"
              type="date"
              class="px-4 py-2.5 rounded-xl text-sm outline-none"
              style="border: 1px solid var(--color-outline-variant); background-color: var(--color-surface-container-lowest); color: var(--color-on-surface)"
              @change="cargar"
            />
            <button
              @click="cargar"
              class="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all hover:scale-105"
              style="background-color: var(--color-primary); color: var(--color-on-primary)"
            >
              <span class="material-symbols-outlined" style="font-size: 18px">refresh</span>
              Actualizar
            </button>
          </div>
        </div>

        <!-- Loading -->
        <div v-if="isLoading" class="py-20 text-center">
          <span class="material-symbols-outlined text-5xl animate-spin block mb-3" style="color: var(--color-outline)">progress_activity</span>
          <p style="color: var(--color-outline)">Cargando resumen…</p>
        </div>

        <!-- Error -->
        <div v-else-if="loadError" class="py-16 text-center">
          <span class="material-symbols-outlined text-5xl block mb-3" style="color: var(--color-error)">error</span>
          <p class="font-medium" style="color: var(--color-error)">{{ loadError }}</p>
        </div>

        <template v-else-if="resumen">

          <!-- KPI Cards -->
          <div class="grid grid-cols-4 gap-4 mb-8">
            <KpiCard
              title="Ingresos"
              :value="formatPrice(resumen.totalIngresos)"
              icon="trending_up"
              iconBg="#D1FAE5"
              iconColor="#065F46"
            />
            <KpiCard
              title="Egresos"
              :value="formatPrice(resumen.totalEgresos)"
              icon="trending_down"
              iconBg="#FEE2E2"
              iconColor="#991B1B"
            />
            <KpiCard
              title="Saldo Neto"
              :value="formatPrice(resumen.saldoNeto)"
              icon="account_balance_wallet"
              iconBg="#DBEAFE"
              iconColor="#1D4ED8"
            />
            <KpiCard
              title="Ventas del día"
              :value="String(resumen.cantidadVentas)"
              icon="point_of_sale"
              iconBg="#EDE9FE"
              iconColor="#7C3AED"
            />
          </div>

          <!-- Desglose por método de pago -->
          <div class="grid grid-cols-4 gap-4 mb-8">
            <div
              v-for="(label, key, i) in { efectivoTotal: 'Efectivo', tarjetaTotal: 'Tarjeta', transferenciaTotal: 'Transferencia', chequeTotal: 'Cheque' }"
              :key="key"
              class="rounded-2xl p-5"
              style="background-color: var(--color-surface-container-lowest); box-shadow: 0 2px 12px rgba(0,40,142,0.06)"
            >
              <div class="flex items-center gap-2 mb-3">
                <span class="material-symbols-outlined" style="font-size: 20px; color: var(--color-outline)">
                  {{ metodoPagoIcon(label) }}
                </span>
                <p class="text-xs font-bold uppercase tracking-wider" style="color: var(--color-outline)">{{ label }}</p>
              </div>
              <p class="text-xl font-extrabold" style="color: var(--color-on-surface)">
                {{ formatPrice((resumen as any)[key]) }}
              </p>
            </div>
          </div>

          <!-- Movimientos -->
          <div class="rounded-2xl overflow-hidden" style="background-color: var(--color-surface-container-lowest); box-shadow: 0 2px 12px rgba(0,40,142,0.06)">
            <!-- Header tabla con filtro -->
            <div class="flex items-center justify-between px-6 py-4" style="border-bottom: 1px solid rgba(196,197,213,0.15)">
              <h3 class="text-xl font-extrabold" style="color: var(--color-primary)">Movimientos</h3>
              <div class="flex gap-2">
                <button
                  v-for="opt in [{ value: 'todos', label: 'Todos' }, { value: 'Ingreso', label: 'Ingresos' }, { value: 'Egreso', label: 'Egresos' }]"
                  :key="opt.value"
                  @click="tipoFiltro = opt.value as any"
                  class="px-4 py-1.5 rounded-full text-sm font-semibold transition-all"
                  :style="tipoFiltro === opt.value
                    ? 'background: var(--color-primary); color: var(--color-on-primary)'
                    : 'background: var(--color-surface-container-high); color: var(--color-on-surface-variant)'"
                >{{ opt.label }}</button>
              </div>
            </div>

            <!-- Sin movimientos -->
            <div v-if="movimientosFiltrados.length === 0" class="py-16 text-center">
              <span class="material-symbols-outlined text-5xl block mb-3" style="color: var(--color-outline)">receipt_long</span>
              <p style="color: var(--color-outline)">Sin movimientos para este día</p>
            </div>

            <!-- Lista -->
            <div v-else class="divide-y" style="divide-color: rgba(196,197,213,0.12)">
              <div
                v-for="m in movimientosFiltrados"
                :key="m.id"
                class="flex items-center gap-4 px-6 py-4 hover:bg-surface-container-low transition-colors"
              >
                <!-- Ícono tipo -->
                <div
                  class="w-10 h-10 rounded-full flex-shrink-0"
                  :style="`display: flex; align-items: center; justify-content: center; background-color: ${m.tipo === 'Ingreso' ? '#D1FAE5' : '#FEE2E2'}`"
                >
                  <span
                    class="material-symbols-outlined"
                    style="font-size: 20px"
                    :style="`color: ${m.tipo === 'Ingreso' ? '#065F46' : '#991B1B'}`"
                  >{{ m.tipo === "Ingreso" ? "arrow_downward" : "arrow_upward" }}</span>
                </div>

                <!-- Concepto -->
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-semibold truncate" style="color: var(--color-on-surface)">{{ m.concepto }}</p>
                  <div class="flex items-center gap-2 mt-0.5">
                    <span class="text-xs" style="color: var(--color-outline)">{{ m.metodoPago }}</span>
                    <span v-if="m.referencia" class="text-xs" style="color: var(--color-outline)">· {{ m.referencia }}</span>
                    <span class="text-xs" style="color: var(--color-outline)">· {{ formatTime(m.createdAt) }}</span>
                  </div>
                </div>

                <!-- Monto -->
                <p
                  class="text-base font-bold flex-shrink-0"
                  :style="`color: ${m.tipo === 'Ingreso' ? '#065F46' : '#991B1B'}`"
                >
                  {{ m.tipo === "Ingreso" ? "+" : "−" }}{{ formatPrice(m.monto) }}
                </p>
              </div>
            </div>

            <!-- Footer totales -->
            <div
              v-if="movimientosFiltrados.length > 0"
              class="flex items-center justify-between px-6 py-4"
              style="border-top: 1px solid rgba(196,197,213,0.15); background-color: var(--color-surface-container-low)"
            >
              <p class="text-sm font-semibold" style="color: var(--color-on-surface-variant)">
                {{ movimientosFiltrados.length }} movimiento{{ movimientosFiltrados.length !== 1 ? "s" : "" }}
              </p>
              <p class="text-base font-extrabold" style="color: var(--color-primary)">
                Neto: {{ formatPrice(resumen.saldoNeto) }}
              </p>
            </div>
          </div>

        </template>

      </div>
    </main>
  </div>
</template>
