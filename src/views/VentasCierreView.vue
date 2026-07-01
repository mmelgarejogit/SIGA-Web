<script setup lang="ts">
import { ref, computed, onMounted } from "vue"
import { useRouter } from "vue-router"
import { inputStyle } from "@/composables/useFieldStyles"
import MontoInput from "@/components/MontoInput.vue"
import AppSidebar from "@/components/AppSidebar.vue"
import AppHeader from "@/components/AppHeader.vue"
import KpiCard from "@/components/KpiCard.vue"
import BaseModal from "@/components/BaseModal.vue"
import BaseButton from "@/components/BaseButton.vue"
import { useAuthStore } from "@/stores/auth"
import {
  type SesionCaja,
  getSesionActual,
  getAperturaSugerida,
  abrirSesion,
  cerrarSesion,
} from "@/services/ventasService"

const router = useRouter()
const auth   = useAuthStore()
const canManage = auth.hasPermission("gestionar_caja")

// ── Formato ───────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  new Intl.NumberFormat("es-PY", { style: "currency", currency: "PYG", maximumFractionDigits: 0 }).format(Math.abs(n))

const fmtDt = (iso: string) =>
  new Date(iso).toLocaleString("es-PY", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })

const fmtTime = (iso: string) =>
  new Date(iso).toLocaleTimeString("es-PY", { hour: "2-digit", minute: "2-digit" })

// ── Estado ────────────────────────────────────────────────────────────────────

const sesion    = ref<SesionCaja | null>(null)
const isLoading = ref(false)
const loadError = ref("")

async function cargar() {
  isLoading.value = true
  loadError.value = ""
  try {
    sesion.value = await getSesionActual()
  } catch (e: any) {
    loadError.value = e?.message ?? "Error al cargar el estado de caja"
  } finally {
    isLoading.value = false
  }
}

onMounted(cargar)

// ── Filtro movimientos ────────────────────────────────────────────────────────

const tipoFiltro = ref<"todos" | "Ingreso" | "Egreso">("todos")

const movsFiltrados = computed(() => {
  if (!sesion.value) return []
  return tipoFiltro.value === "todos"
    ? sesion.value.movimientos
    : sesion.value.movimientos.filter((m) => m.tipo === tipoFiltro.value)
})

function metodoPagoIcon(m: string) {
  const icons: Record<string, string> = {
    Efectivo: "payments", Tarjeta: "credit_card",
    Transferencia: "account_balance", Cheque: "description",
  }
  return icons[m] ?? "payments"
}

// ── Modal abrir ───────────────────────────────────────────────────────────────

const showAbrir       = ref(false)
const montoInput      = ref<number | null>(0)
const isAbrir         = ref(false)
const abrirError      = ref("")
const aperturaSugerida = ref(0)
const ajusteManual    = ref(false)
const loadingSugerido = ref(false)

// La apertura es automática: tomamos el efectivo del último cierre. El cajero solo confirma.
async function openAbrir() {
  abrirError.value   = ""
  ajusteManual.value = false
  loadingSugerido.value = true
  showAbrir.value    = true
  try {
    aperturaSugerida.value = await getAperturaSugerida()
  } catch {
    aperturaSugerida.value = 0
  } finally {
    montoInput.value = aperturaSugerida.value
    loadingSugerido.value = false
  }
}

async function submitAbrir() {
  let monto: number | undefined
  if (ajusteManual.value) {
    monto = montoInput.value ?? 0
    if (isNaN(monto) || monto < 0) { abrirError.value = "Ingresá un monto válido"; return }
  }
  isAbrir.value    = true
  abrirError.value = ""
  try {
    sesion.value = await abrirSesion(monto)   // undefined → apertura automática
    showAbrir.value = false
    ajusteManual.value = false
  } catch (e) {
    abrirError.value = e instanceof Error ? e.message : "Error al abrir la caja"
  } finally {
    isAbrir.value = false
  }
}

// ── Modal cerrar ──────────────────────────────────────────────────────────────

const showCerrar      = ref(false)
const efectivoContado = ref<number | null>(0)
const observacion     = ref("")
const isCerrar        = ref(false)
const cerrarError     = ref("")
const cierreResult    = ref<SesionCaja | null>(null)

// Efectivo esperado = inicial + ingresos efectivo − egresos efectivo (mismo cálculo que el backend).
const egresosEfectivo = computed(() =>
  sesion.value?.movimientos
    .filter(m => m.tipo === "Egreso" && m.metodoPago === "Efectivo")
    .reduce((s, m) => s + m.monto, 0) ?? 0,
)
const efectivoEsperado = computed(() =>
  Math.max(0, (sesion.value?.montoInicial ?? 0) + (sesion.value?.efectivoIngresos ?? 0) - egresosEfectivo.value),
)
const diferenciaPreview = computed(() => (efectivoContado.value ?? 0) - efectivoEsperado.value)

function abrirCerrar() {
  // Pre-cargamos el conteo con el efectivo esperado: si cuadra, el cajero solo confirma.
  efectivoContado.value = efectivoEsperado.value
  observacion.value     = ""
  cerrarError.value     = ""
  cierreResult.value    = null
  showCerrar.value      = true
}

async function submitCerrar() {
  if (!sesion.value) return
  const contado = efectivoContado.value ?? 0
  if (isNaN(contado) || contado < 0) { cerrarError.value = "Ingresá un monto válido"; return }
  isCerrar.value    = true
  cerrarError.value = ""
  try {
    const resultado = await cerrarSesion(sesion.value.id, contado, observacion.value || undefined)
    cierreResult.value = resultado
    if (resultado.estado === "Cerrada") {
      sesion.value = null
    } else {
      // PendienteAprobacion — recargar para mostrar el banner
      sesion.value = await getSesionActual()
      showCerrar.value = false
    }
  } catch (e: any) {
    cerrarError.value = e?.message ?? "Error al cerrar la caja"
    isCerrar.value = false
  } finally {
    isCerrar.value = false
  }
}

function confirmarCierreYSalir() {
  showCerrar.value = false
  cierreResult.value = null
  router.push("/caja/historial")
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
            <h1 class="text-4xl font-extrabold tracking-tight mb-2">Caja</h1>
            <p class="font-medium" style="color: var(--color-on-surface-variant)">
              <template v-if="sesion">
                Sesión abierta el {{ fmtDt(sesion.fechaApertura) }} por {{ sesion.abiertaPorNombre }}
              </template>
              <template v-else-if="!isLoading">Sin sesión activa</template>
            </p>
          </div>
          <div class="flex items-center gap-3">
            <BaseButton variant="secondary" @click="router.push('/caja/historial')">
              <span class="material-symbols-outlined" style="font-size:18px">history</span>
              Historial
            </BaseButton>
            <template v-if="canManage">
              <BaseButton v-if="!sesion && !isLoading" variant="primary" size="lg" @click="openAbrir">
                <span class="material-symbols-outlined" style="font-size:20px">lock_open</span>
                Abrir caja
              </BaseButton>
              <BaseButton v-if="sesion && sesion.estado === 'Abierta'" variant="danger" size="lg" @click="abrirCerrar">
                <span class="material-symbols-outlined" style="font-size:20px">lock</span>
                Cerrar caja
              </BaseButton>
            </template>
          </div>
        </div>

        <!-- Loading -->
        <div v-if="isLoading" class="py-20 text-center">
          <span class="material-symbols-outlined text-5xl animate-spin block mb-3" style="color: var(--color-outline)">progress_activity</span>
          <p style="color: var(--color-outline)">Cargando estado de caja…</p>
        </div>

        <!-- Error -->
        <div v-else-if="loadError" class="py-16 text-center">
          <span class="material-symbols-outlined text-5xl block mb-3" style="color: var(--color-error)">error</span>
          <p class="font-medium" style="color: var(--color-error)">{{ loadError }}</p>
        </div>

        <!-- Sin sesión -->
        <div v-else-if="!sesion" class="flex flex-col items-center justify-center py-24 gap-6">
          <div class="w-24 h-24 rounded-full flex items-center justify-center" style="background-color: var(--color-surface-container-low)">
            <span class="material-symbols-outlined" style="font-size:48px; color: var(--color-outline)">point_of_sale</span>
          </div>
          <div class="text-center">
            <p class="text-xl font-bold mb-1" style="color: var(--color-on-surface)">No hay una caja abierta</p>
            <p style="color: var(--color-on-surface-variant)">Abrí la caja para poder registrar cobros y movimientos</p>
          </div>
          <BaseButton v-if="canManage" variant="primary" size="lg" @click="openAbrir">
            <span class="material-symbols-outlined" style="font-size:20px">lock_open</span>
            Abrir caja
          </BaseButton>
          <p v-else class="text-sm" style="color: var(--color-outline)">No tenés permiso para abrir la caja</p>
        </div>

        <!-- Sesión activa -->
        <template v-else>

          <!-- Badge estado -->
          <div class="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-6 text-sm font-bold"
               :style="sesion.estado === 'PendienteAprobacion'
                 ? 'background-color: var(--color-warning-container); color: var(--color-on-warning-container)'
                 : 'background-color: var(--color-success-container); color: var(--color-on-success-container)'">
            <span class="w-2 h-2 rounded-full animate-pulse"
                  :class="sesion.estado === 'PendienteAprobacion' ? 'bg-amber-500' : 'bg-green-500'"></span>
            {{ sesion.estado === "PendienteAprobacion" ? "Pendiente de aprobación" : "Caja abierta" }}
          </div>

          <!-- Banner pendiente de aprobación -->
          <div v-if="sesion.estado === 'PendienteAprobacion'"
               class="rounded-2xl p-5 mb-6 flex items-start gap-4"
               style="background-color: var(--color-warning-container); border: 1px solid var(--color-warning-container)">
            <span class="material-symbols-outlined text-3xl flex-shrink-0" style="color: var(--color-warning)">schedule</span>
            <div>
              <p class="font-extrabold mb-1" style="color: var(--color-on-warning-container)">Cierre pendiente de aprobación</p>
              <p class="text-sm" style="color: var(--color-on-warning-container)">
                El arqueo registró una diferencia superior a la tolerancia permitida. Un supervisor debe aprobar o rechazar el cierre.
                Si es rechazado, podrás hacer un nuevo conteo.
              </p>
            </div>
          </div>

          <!-- ── Bloque 1: Posición de efectivo ────────────────────────────── -->
          <h3 class="text-base font-extrabold uppercase tracking-wider mb-3" style="color: var(--color-outline)">Posición de efectivo</h3>
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <KpiCard title="Efectivo inicial" :value="fmt(sesion.montoInicial)" icon="account_balance_wallet" iconBg="color-mix(in srgb, var(--color-tertiary) 12%, var(--color-surface-container-lowest))" iconColor="var(--color-tertiary)" />
            <KpiCard title="Ingresos efectivo" :value="fmt(sesion.efectivoIngresos)" icon="trending_up" iconBg="var(--color-success-container)" iconColor="var(--color-success)" />
            <KpiCard
              title="Egresos efectivo"
              :value="fmt(sesion.movimientos.filter(m => m.tipo === 'Egreso' && m.metodoPago === 'Efectivo').reduce((s, m) => s + m.monto, 0))"
              icon="trending_down" iconBg="var(--color-error-container)" iconColor="var(--color-error)"
            />
            <KpiCard title="Movimientos" :value="String(sesion.cantidadMovimientos)" icon="receipt_long" iconBg="var(--color-info-container)" iconColor="var(--color-info)" />
          </div>


          <!-- Movimientos -->
          <div class="rounded-lg overflow-hidden" style="background-color: var(--color-surface-container-lowest); box-shadow: var(--shadow-sm)">
            <div class="flex items-center justify-between px-6 py-4" style="border-bottom: 1px solid var(--color-hairline)">
              <h3 class="text-xl font-extrabold" style="color: var(--color-primary)">Movimientos de la sesión</h3>
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

            <div v-if="movsFiltrados.length === 0" class="py-16 text-center">
              <span class="material-symbols-outlined text-5xl block mb-3" style="color: var(--color-outline)">receipt_long</span>
              <p style="color: var(--color-outline)">Sin movimientos en esta sesión</p>
            </div>

            <div v-else class="divide-y" style="divide-color: var(--color-hairline-soft)">
              <div
                v-for="m in movsFiltrados"
                :key="m.id"
                class="flex items-center gap-4 px-6 py-4"
              >
                <div
                  class="w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center"
                  :style="`background-color: ${m.tipo === 'Ingreso' ? 'var(--color-success-container)' : 'var(--color-error-container)'}`"
                >
                  <span class="material-symbols-outlined" style="font-size:20px"
                    :style="`color: ${m.tipo === 'Ingreso' ? 'var(--color-on-success-container)' : 'var(--color-on-error-container)'}`">
                    {{ m.tipo === "Ingreso" ? "arrow_downward" : "arrow_upward" }}
                  </span>
                </div>
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-semibold truncate" style="color: var(--color-on-surface)">{{ m.concepto }}</p>
                  <div class="flex items-center gap-2 mt-0.5 flex-wrap">
                    <span class="material-symbols-outlined" style="font-size:14px; color: var(--color-outline)">{{ metodoPagoIcon(m.metodoPago) }}</span>
                    <span class="text-xs" style="color: var(--color-outline)">{{ m.metodoPago }}</span>
                    <span v-if="m.metodoPago !== 'Efectivo'"
                          class="text-xs font-semibold px-2 py-0.5 rounded-full"
                          style="background-color: var(--color-surface-container-high); color: var(--color-outline)">
                      No afecta caja
                    </span>
                    <span v-if="m.referencia" class="text-xs" style="color: var(--color-outline)">· {{ m.referencia }}</span>
                    <span class="text-xs" style="color: var(--color-outline)">· {{ fmtTime(m.createdAt) }}</span>
                  </div>
                </div>
                <p class="text-base font-bold flex-shrink-0"
                   :style="`color: ${m.tipo === 'Ingreso' ? 'var(--color-on-success-container)' : 'var(--color-on-error-container)'}`">
                  {{ m.tipo === "Ingreso" ? "+" : "−" }}{{ fmt(m.monto) }}
                </p>
              </div>
            </div>

            <div v-if="movsFiltrados.length > 0"
                 class="flex items-center justify-between px-6 py-4"
                 style="border-top: 1px solid var(--color-hairline); background-color: var(--color-surface-container-low)">
              <p class="text-sm font-semibold" style="color: var(--color-on-surface-variant)">
                {{ movsFiltrados.length }} movimiento{{ movsFiltrados.length !== 1 ? "s" : "" }}
              </p>
              <p class="text-base font-extrabold" style="color: var(--color-primary)">
                Saldo neto: {{ fmt(sesion.saldoNeto) }}
              </p>
            </div>
          </div>

        </template>

      </div>
    </main>
  </div>

  <!-- Modal abrir caja -->
  <BaseModal :show="showAbrir" title="Abrir caja" size="sm" @close="showAbrir = false">
    <div class="space-y-5">

      <!-- Monto automático -->
      <div v-if="!ajusteManual" class="space-y-3">
        <p class="text-sm" style="color: var(--color-on-surface-variant)">
          La caja arranca automáticamente con el efectivo del último cierre. Confirmá para abrir.
        </p>
        <div class="rounded-xl p-4" style="background-color: var(--color-surface-container-low)">
          <p class="text-xs font-bold uppercase tracking-wider mb-1" style="color: var(--color-outline)">Monto inicial (automático)</p>
          <p v-if="loadingSugerido" class="text-sm" style="color: var(--color-outline)">Calculando…</p>
          <template v-else>
            <p class="text-2xl font-extrabold" style="color: var(--color-primary)">{{ fmt(aperturaSugerida) }}</p>
            <p class="text-xs mt-1" style="color: var(--color-on-surface-variant)">
              {{ aperturaSugerida > 0 ? "Efectivo contado en el último cierre de caja." : "No hay cierres previos: la caja arranca en cero." }}
            </p>
          </template>
        </div>
        <button class="text-xs font-semibold flex items-center gap-1" style="color: var(--color-primary)" @click="ajusteManual = true">
          <span class="material-symbols-outlined" style="font-size:14px">edit</span>
          Ajustar manualmente
        </button>
      </div>

      <!-- Ajuste manual (excepción) -->
      <div v-else class="space-y-1">
        <label class="text-xs font-bold uppercase tracking-wider" style="color: var(--color-outline)">Monto inicial (Gs.)</label>
        <MontoInput :model-value="montoInput" @update:model-value="montoInput = $event" placeholder="0" />
        <button class="text-xs font-semibold flex items-center gap-1 mt-1.5" style="color: var(--color-outline)"
          @click="ajusteManual = false; montoInput = aperturaSugerida">
          <span class="material-symbols-outlined" style="font-size:14px">undo</span>
          Usar monto automático
        </button>
      </div>

      <p v-if="abrirError" class="text-xs font-medium" style="color: var(--color-error)">{{ abrirError }}</p>
    </div>
    <template #footer>
      <BaseButton variant="secondary" @click="showAbrir = false">Cancelar</BaseButton>
      <BaseButton variant="primary" :disabled="isAbrir || loadingSugerido" @click="submitAbrir">
        {{ isAbrir ? "Abriendo…" : "Abrir caja" }}
      </BaseButton>
    </template>
  </BaseModal>

  <!-- Modal cerrar caja -->
  <BaseModal :show="showCerrar" title="Cerrar caja" size="lg" @close="showCerrar = false">

    <!-- Panel resultado post-cierre -->
    <div v-if="cierreResult" class="space-y-4">
      <div class="rounded-2xl p-6 text-center" style="background-color: var(--color-success-container)">
        <span class="material-symbols-outlined text-5xl block mb-3" style="color: var(--color-on-success-container)">check_circle</span>
        <p class="text-lg font-extrabold mb-1" style="color: var(--color-on-success-container)">Caja cerrada correctamente</p>
        <p class="text-sm" style="color: var(--color-on-success-container)">La sesión fue cerrada y registrada en el historial.</p>
      </div>
      <div class="rounded-xl p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
           style="background-color: var(--color-surface-container-low)">
        <div class="text-center">
          <p class="text-xs font-bold uppercase tracking-wider mb-1" style="color: var(--color-outline)">Efectivo contado</p>
          <p class="font-extrabold" style="color: var(--color-on-surface)">{{ fmt(cierreResult.efectivoContado ?? 0) }}</p>
        </div>
        <div class="text-center">
          <p class="text-xs font-bold uppercase tracking-wider mb-1" style="color: var(--color-outline)">Efectivo esperado</p>
          <p class="font-extrabold" style="color: var(--color-on-surface)">{{ fmt(cierreResult.efectivoEsperado ?? 0) }}</p>
        </div>
        <div class="text-center">
          <p class="text-xs font-bold uppercase tracking-wider mb-1" style="color: var(--color-outline)">Diferencia</p>
          <p class="font-extrabold"
             :style="(cierreResult.diferencia ?? 0) === 0 ? 'color:var(--color-on-success-container)' : (cierreResult.diferencia ?? 0) > 0 ? 'color:var(--color-on-info-container)' : 'color:var(--color-on-error-container)'">
            {{ (cierreResult.diferencia ?? 0) > 0 ? "+" : (cierreResult.diferencia ?? 0) < 0 ? "−" : "" }}{{ fmt(cierreResult.diferencia ?? 0) }}
          </p>
        </div>
      </div>
    </div>

    <!-- Formulario de conteo ciego -->
    <div v-else class="space-y-5">
      <p class="text-sm" style="color: var(--color-on-surface-variant)">
        El monto viene pre-cargado con el efectivo esperado. Si coincide con el conteo físico, confirmá; si hay diferencia, ajustalo.
      </p>

      <div class="rounded-xl p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3"
           style="background-color: var(--color-surface-container-low)">
        <div>
          <p class="text-xs font-bold uppercase tracking-wider mb-1" style="color: var(--color-outline)">Monto inicial</p>
          <p class="font-extrabold" style="color: var(--color-on-surface)">{{ fmt(sesion?.montoInicial ?? 0) }}</p>
        </div>
        <div>
          <p class="text-xs font-bold uppercase tracking-wider mb-1" style="color: var(--color-outline)">Ingresos efectivo</p>
          <p class="font-extrabold" style="color: var(--color-on-success-container)">+{{ fmt(sesion?.efectivoIngresos ?? 0) }}</p>
        </div>
        <div>
          <p class="text-xs font-bold uppercase tracking-wider mb-1" style="color: var(--color-outline)">Egresos efectivo</p>
          <p class="font-extrabold" style="color: var(--color-on-error-container)">−{{ fmt(sesion?.movimientos.filter(m => m.tipo === 'Egreso' && m.metodoPago === 'Efectivo').reduce((s, m) => s + m.monto, 0) ?? 0) }}</p>
        </div>
      </div>

      <div class="space-y-1">
        <div class="flex items-center justify-between">
          <label class="text-xs font-bold uppercase tracking-wider" style="color: var(--color-outline)">Efectivo contado (Gs.)</label>
          <span class="text-xs font-semibold" style="color: var(--color-outline)">Esperado: {{ fmt(efectivoEsperado) }}</span>
        </div>
        <MontoInput :model-value="efectivoContado" @update:model-value="efectivoContado = $event" placeholder="0" />
        <p class="text-xs mt-1 font-medium" :style="diferenciaPreview === 0 ? 'color:var(--color-on-success-container)' : 'color:var(--color-on-warning-container)'">
          {{ diferenciaPreview === 0
              ? "✓ Coincide con lo esperado"
              : `Diferencia: ${diferenciaPreview > 0 ? "+" : "−"}${fmt(diferenciaPreview)}` }}
        </p>
      </div>

      <div class="space-y-1">
        <label class="text-xs font-bold uppercase tracking-wider" style="color: var(--color-outline)">
          Observación <span style="color: var(--color-outline); font-weight:400">(opcional)</span>
        </label>
        <textarea
          v-model="observacion"
          rows="2"
          placeholder="Justificación de diferencia, novedades, etc."
          class="w-full px-4 py-3 text-sm outline-none appearance-none shadow-none transition-all resize-none"
          :style="inputStyle()"
        />
      </div>

      <p v-if="cerrarError" class="text-xs font-medium" style="color: var(--color-error)">{{ cerrarError }}</p>
    </div>

    <template #footer>
      <template v-if="cierreResult">
        <BaseButton variant="primary" @click="confirmarCierreYSalir">Ver historial</BaseButton>
      </template>
      <template v-else>
        <BaseButton variant="secondary" @click="showCerrar = false">Cancelar</BaseButton>
        <BaseButton variant="danger" :disabled="isCerrar" @click="submitCerrar">
          {{ isCerrar ? "Cerrando…" : "Confirmar cierre" }}
        </BaseButton>
      </template>
    </template>

  </BaseModal>
</template>
