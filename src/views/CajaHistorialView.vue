<script setup lang="ts">
import { ref, onMounted } from "vue"
import { useRouter } from "vue-router"
import AppSidebar from "@/components/AppSidebar.vue"
import AppHeader from "@/components/AppHeader.vue"
import BaseModal from "@/components/BaseModal.vue"
import BaseButton from "@/components/BaseButton.vue"
import BaseTable from "@/components/BaseTable.vue"
import { type SesionCajaListItem, type SesionCaja, getSesiones, getSesionById } from "@/services/ventasService"
import RowContextMenu, { type ContextMenuItem } from "@/components/RowContextMenu.vue"

const router = useRouter()

// ── Formato ───────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  new Intl.NumberFormat("es-PY", { style: "currency", currency: "PYG", maximumFractionDigits: 0 }).format(Math.abs(n))

const fmtSigned = (n: number) => {
  const prefix = n > 0 ? "+" : n < 0 ? "−" : ""
  return prefix + fmt(n)
}

const fmtDt = (iso: string) =>
  new Date(iso).toLocaleString("es-PY", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })

const fmtTime = (iso: string) =>
  new Date(iso).toLocaleTimeString("es-PY", { hour: "2-digit", minute: "2-digit" })

// ── Lista ─────────────────────────────────────────────────────────────────────

const sesiones   = ref<SesionCajaListItem[]>([])
const total      = ref(0)
const page       = ref(1)
const isLoading  = ref(false)
const loadError  = ref("")

async function cargar() {
  isLoading.value = true
  loadError.value = ""
  try {
    const res = await getSesiones(page.value, 20)
    sesiones.value = res.items
    total.value    = res.totalCount
  } catch (e: any) {
    loadError.value = e?.message ?? "Error al cargar el historial"
  } finally {
    isLoading.value = false
  }
}

onMounted(cargar)

// ── Detalle ───────────────────────────────────────────────────────────────────

const showDetalle    = ref(false)
const detalle        = ref<SesionCaja | null>(null)
const isLoadDetalle  = ref(false)
const detalleError   = ref("")

async function verDetalle(s: SesionCajaListItem) {
  isLoadDetalle.value = true
  showDetalle.value   = true
  detalle.value       = null
  detalleError.value  = ""
  try {
    detalle.value = await getSesionById(s.id)
  } catch (e: any) {
    detalleError.value = e?.message ?? "Error al cargar el detalle"
  } finally {
    isLoadDetalle.value = false
  }
}

function metodoPagoIcon(m: string) {
  const icons: Record<string, string> = {
    Efectivo: "payments", Tarjeta: "credit_card",
    Transferencia: "account_balance", Cheque: "description",
  }
  return icons[m] ?? "payments"
}

function duracion(apertura: string, cierre?: string): string {
  if (!cierre) return "—"
  const diff = new Date(cierre).getTime() - new Date(apertura).getTime()
  const h = Math.floor(diff / 3600000)
  const m = Math.floor((diff % 3600000) / 60000)
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}
</script>

<template>
  <div class="min-h-screen" style="background-color: var(--color-background)">
    <AppSidebar />
    <AppHeader />
    <main style="margin-left: var(--sidebar-width); padding-top: 64px; transition: margin-left 0.25s ease">
      <div class="p-4 sm:p-6 lg:p-8">

        <!-- Encabezado -->
        <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-8">
          <div>
            <h1 class="text-4xl font-extrabold tracking-tight mb-2">Historial de Caja</h1>
            <p class="font-medium" style="color: var(--color-on-surface-variant)">
              {{ total }} sesión{{ total !== 1 ? "es" : "" }} registrada{{ total !== 1 ? "s" : "" }}
            </p>
          </div>
          <BaseButton variant="secondary" @click="router.push('/ventas/cierre')">
            <span class="material-symbols-outlined" style="font-size:18px">point_of_sale</span>
            Ir a caja
          </BaseButton>
        </div>

        <!-- Loading -->
        <div v-if="isLoading" class="py-20 text-center">
          <span class="material-symbols-outlined text-5xl animate-spin block mb-3" style="color: var(--color-outline)">progress_activity</span>
          <p style="color: var(--color-outline)">Cargando historial…</p>
        </div>

        <!-- Error -->
        <div v-else-if="loadError" class="py-16 text-center">
          <span class="material-symbols-outlined text-5xl block mb-3" style="color: var(--color-error)">error</span>
          <p class="font-medium" style="color: var(--color-error)">{{ loadError }}</p>
        </div>

        <!-- Tabla -->
        <template v-else>
          <BaseTable
            :loading="isLoading"
            :empty="sesiones.length === 0"
            empty-message="No hay sesiones registradas"
          >
            <template #head>
              <th class="px-6 py-5 text-xs font-bold uppercase tracking-widest" style="color: var(--color-outline)">Apertura</th>
              <th class="px-6 py-5 text-xs font-bold uppercase tracking-widest" style="color: var(--color-outline)">Cierre</th>
              <th class="px-6 py-5 text-xs font-bold uppercase tracking-widest" style="color: var(--color-outline)">Duración</th>
              <th class="px-6 py-5 text-xs font-bold uppercase tracking-widest" style="color: var(--color-outline)">Abierta por</th>
              <th class="px-6 py-5 text-xs font-bold uppercase tracking-widest" style="color: var(--color-outline)">Cerrada por</th>
              <th class="px-6 py-5 text-xs font-bold uppercase tracking-widest" style="color: var(--color-outline)">Ingresos</th>
              <th class="px-6 py-5 text-xs font-bold uppercase tracking-widest" style="color: var(--color-outline)">Egresos</th>
              <th class="px-6 py-5 text-xs font-bold uppercase tracking-widest" style="color: var(--color-outline)">Saldo</th>
              <th class="px-6 py-5 text-xs font-bold uppercase tracking-widest" style="color: var(--color-outline)">Estado</th>
              <th class="px-6 py-5"></th>
            </template>

            <template #body>
              <tr
                v-for="s in sesiones"
                :key="s.id"
                class="hover:bg-surface-container-low transition-colors"
                style="border-bottom: 1px solid var(--color-hairline-soft)"
              >
                <td class="px-6 py-4 text-sm font-medium" style="color: var(--color-on-surface)">
                  {{ fmtDt(s.fechaApertura) }}
                </td>
                <td class="px-6 py-4 text-sm" style="color: var(--color-on-surface-variant)">
                  {{ s.fechaCierre ? fmtDt(s.fechaCierre) : "—" }}
                </td>
                <td class="px-6 py-4 text-sm" style="color: var(--color-on-surface-variant)">
                  {{ duracion(s.fechaApertura, s.fechaCierre) }}
                </td>
                <td class="px-6 py-4 text-sm" style="color: var(--color-on-surface)">{{ s.abiertaPorNombre }}</td>
                <td class="px-6 py-4 text-sm" style="color: var(--color-on-surface-variant)">{{ s.cerradaPorNombre ?? "—" }}</td>
                <td class="px-6 py-4 text-sm font-semibold" style="color: var(--color-on-success-container)">{{ fmt(s.totalIngresos) }}</td>
                <td class="px-6 py-4 text-sm font-semibold" style="color: var(--color-on-error-container)">{{ fmt(s.totalEgresos) }}</td>
                <td class="px-6 py-4 text-sm font-bold" style="color: var(--color-primary)">{{ fmt(s.saldoNeto) }}</td>
                <td class="px-6 py-4">
                  <span
                    class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold"
                    :style="s.estado === 'Abierta'
                      ? 'background-color:var(--color-success-container); color:var(--color-on-success-container)'
                      : 'background-color:var(--color-surface-container-high); color:var(--color-on-surface-variant)'"
                  >
                    <span v-if="s.estado === 'Abierta'" class="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                    {{ s.estado }}
                  </span>
                </td>
                <td class="px-6 py-4">
                  <div class="flex items-center justify-end">
                    <RowContextMenu :items="[{ type: 'item', label: 'Ver detalle', icon: 'visibility', action: () => verDetalle(s) }] as ContextMenuItem[]" />
                  </div>
                </td>
              </tr>
            </template>
          </BaseTable>

          <p class="mt-4 text-sm" style="color: var(--color-on-surface-variant)">
            Mostrando {{ sesiones.length }} de {{ total }} sesiones
          </p>
        </template>

      </div>
    </main>
  </div>

  <!-- Modal detalle sesión -->
  <BaseModal :show="showDetalle" title="Detalle de sesión" size="lg" @close="showDetalle = false">
    <div v-if="isLoadDetalle" class="py-10 text-center">
      <span class="material-symbols-outlined animate-spin block mb-2" style="color: var(--color-outline)">progress_activity</span>
    </div>

    <div v-else-if="detalleError" class="py-10 text-center">
      <span class="material-symbols-outlined text-4xl block mb-2" style="color: var(--color-error)">error</span>
      <p class="text-sm font-medium" style="color: var(--color-error)">{{ detalleError }}</p>
    </div>

    <div v-else-if="detalle" class="space-y-5">
      <!-- Info general -->
      <div class="rounded-xl p-4 grid grid-cols-1 sm:grid-cols-2 gap-4" style="background-color: var(--color-surface-container-low)">
        <div>
          <p class="text-xs font-bold uppercase tracking-wider mb-1" style="color: var(--color-outline)">Apertura</p>
          <p class="text-sm font-semibold" style="color: var(--color-on-surface)">{{ fmtDt(detalle.fechaApertura) }}</p>
          <p class="text-xs mt-0.5" style="color: var(--color-on-surface-variant)">por {{ detalle.abiertaPorNombre }}</p>
        </div>
        <div>
          <p class="text-xs font-bold uppercase tracking-wider mb-1" style="color: var(--color-outline)">Cierre</p>
          <template v-if="detalle.fechaCierre">
            <p class="text-sm font-semibold" style="color: var(--color-on-surface)">{{ fmtDt(detalle.fechaCierre) }}</p>
            <p class="text-xs mt-0.5" style="color: var(--color-on-surface-variant)">por {{ detalle.cerradaPorNombre }}</p>
          </template>
          <p v-else class="text-sm" style="color: var(--color-on-surface-variant)">Sesión aún abierta</p>
        </div>
        <div>
          <p class="text-xs font-bold uppercase tracking-wider mb-1" style="color: var(--color-outline)">Monto inicial</p>
          <p class="text-sm font-bold" style="color: var(--color-on-surface)">{{ fmt(detalle.montoInicial) }}</p>
        </div>
        <div>
          <p class="text-xs font-bold uppercase tracking-wider mb-1" style="color: var(--color-outline)">Duración</p>
          <p class="text-sm font-bold" style="color: var(--color-on-surface)">{{ duracion(detalle.fechaApertura, detalle.fechaCierre) }}</p>
        </div>
      </div>

      <!-- Resumen financiero -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <div class="rounded-xl p-4 text-center" style="background-color: var(--color-success-container)">
          <p class="text-xs font-bold uppercase tracking-wider mb-2" style="color: var(--color-on-success-container)">Ingresos</p>
          <p class="text-lg font-extrabold" style="color: var(--color-on-success-container)">{{ fmt(detalle.totalIngresos) }}</p>
        </div>
        <div class="rounded-xl p-4 text-center" style="background-color: var(--color-error-container)">
          <p class="text-xs font-bold uppercase tracking-wider mb-2" style="color: var(--color-on-error-container)">Egresos</p>
          <p class="text-lg font-extrabold" style="color: var(--color-on-error-container)">{{ fmt(detalle.totalEgresos) }}</p>
        </div>
        <div class="rounded-xl p-4 text-center" style="background-color: var(--color-info-container)">
          <p class="text-xs font-bold uppercase tracking-wider mb-2" style="color: var(--color-on-info-container)">Saldo neto</p>
          <p class="text-lg font-extrabold" style="color: var(--color-on-info-container)">{{ fmt(detalle.saldoNeto) }}</p>
        </div>
      </div>

      <!-- Arqueo (solo si hay cierre) -->
      <div v-if="detalle.fechaCierre" class="rounded-xl p-4 space-y-3" style="background-color: var(--color-surface-container-low)">
        <p class="text-xs font-bold uppercase tracking-wider" style="color: var(--color-outline)">Arqueo de efectivo</p>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-center">
          <div>
            <p class="text-xs mb-1" style="color: var(--color-on-surface-variant)">Esperado</p>
            <p class="font-bold" style="color: var(--color-on-surface)">{{ fmt(detalle.efectivoEsperado ?? 0) }}</p>
          </div>
          <div>
            <p class="text-xs mb-1" style="color: var(--color-on-surface-variant)">Contado</p>
            <p class="font-bold" style="color: var(--color-on-surface)">{{ fmt(detalle.efectivoContado ?? 0) }}</p>
          </div>
          <div>
            <p class="text-xs mb-1" style="color: var(--color-on-surface-variant)">Diferencia</p>
            <p class="text-xs font-bold mb-0.5"
               :style="(detalle.diferencia ?? 0) === 0 ? 'color:var(--color-on-success-container)' : (detalle.diferencia ?? 0) > 0 ? 'color:var(--color-on-info-container)' : 'color:var(--color-on-error-container)'">
              {{ (detalle.diferencia ?? 0) === 0 ? "Cuadrada" : (detalle.diferencia ?? 0) > 0 ? "Sobrante" : "Faltante" }}
            </p>
            <p class="font-bold"
               :style="(detalle.diferencia ?? 0) === 0 ? 'color:var(--color-on-success-container)' : (detalle.diferencia ?? 0) > 0 ? 'color:var(--color-on-info-container)' : 'color:var(--color-on-error-container)'">
              {{ fmtSigned(detalle.diferencia ?? 0) }}
            </p>
          </div>
        </div>
        <div v-if="detalle.observacionCierre" class="pt-2" style="border-top: 1px solid var(--color-hairline)">
          <p class="text-xs font-bold uppercase tracking-wider mb-1" style="color: var(--color-outline)">Observación</p>
          <p class="text-sm" style="color: var(--color-on-surface)">{{ detalle.observacionCierre }}</p>
        </div>
      </div>

      <!-- Movimientos -->
      <div v-if="detalle.movimientos.length > 0">
        <p class="text-xs font-bold uppercase tracking-wider mb-3" style="color: var(--color-outline)">
          Movimientos ({{ detalle.movimientos.length }})
        </p>
        <div class="rounded-xl overflow-hidden" style="border: 1px solid var(--color-hairline)">
          <div
            v-for="m in detalle.movimientos"
            :key="m.id"
            class="flex items-center gap-3 px-4 py-3"
            style="border-bottom: 1px solid var(--color-hairline-soft)"
          >
            <div
              class="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center"
              :style="`background-color: ${m.tipo === 'Ingreso' ? 'var(--color-success-container)' : 'var(--color-error-container)'}`"
            >
              <span class="material-symbols-outlined" style="font-size:16px"
                :style="`color: ${m.tipo === 'Ingreso' ? 'var(--color-on-success-container)' : 'var(--color-on-error-container)'}`">
                {{ m.tipo === "Ingreso" ? "arrow_downward" : "arrow_upward" }}
              </span>
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-xs font-semibold truncate" style="color: var(--color-on-surface)">{{ m.concepto }}</p>
              <div class="flex items-center gap-1.5 mt-0.5">
                <span class="material-symbols-outlined" style="font-size:12px; color: var(--color-outline)">{{ metodoPagoIcon(m.metodoPago) }}</span>
                <span class="text-xs" style="color: var(--color-outline)">{{ m.metodoPago }} · {{ fmtTime(m.createdAt) }}</span>
              </div>
            </div>
            <p class="text-sm font-bold flex-shrink-0"
               :style="`color: ${m.tipo === 'Ingreso' ? 'var(--color-on-success-container)' : 'var(--color-on-error-container)'}`">
              {{ m.tipo === "Ingreso" ? "+" : "−" }}{{ fmt(m.monto) }}
            </p>
          </div>
        </div>
      </div>
    </div>

    <template #footer>
      <BaseButton variant="secondary" @click="showDetalle = false">Cerrar</BaseButton>
    </template>
  </BaseModal>
</template>
