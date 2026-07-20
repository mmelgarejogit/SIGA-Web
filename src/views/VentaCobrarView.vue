<script setup lang="ts">
import DateInput from "@/components/DateInput.vue"
import SearchableSelect from "@/components/SearchableSelect.vue"
import MontoInput from "@/components/MontoInput.vue"
import { inputStyle } from "@/composables/useFieldStyles"
import { ref, reactive, computed, onMounted } from "vue"
import { useRoute, useRouter } from "vue-router"
import AppSidebar from "@/components/AppSidebar.vue"
import AppHeader from "@/components/AppHeader.vue"
import BaseButton from "@/components/BaseButton.vue"
import {
  type Venta, type MetodoPago, type TipoCobro,
  getVentaById, registrarCobro, getSesionActual,
} from "@/services/ventasService"

const route  = useRoute()
const router = useRouter()

const formatPrice = (n: number) =>
  new Intl.NumberFormat("es-PY", { style: "currency", currency: "PYG", maximumFractionDigits: 0 }).format(n)
const formatDate = (s?: string) =>
  s ? new Date(s + "T00:00:00").toLocaleDateString("es-PY", { day: "2-digit", month: "short", year: "numeric" }) : "—"

const venta     = ref<Venta | null>(null)
const isLoading = ref(false)
const error     = ref("")
const cajaAbierta = ref(false)

const isContado  = computed(() => venta.value?.condicionVenta === "Contado")
const saldo      = computed(() => venta.value?.saldoPendiente ?? 0)
const yaCobrado  = computed(() => !!venta.value?.comprobante || venta.value?.estado === "ComprobanteEmitido")
const puedeCobrar = computed(() => venta.value?.estado === "ListaParaCobrar" && !venta.value?.comprobante)

// ── Formulario de cobro ──────────────────────────────────────────────────────
const METODOS: MetodoPago[] = ["Efectivo", "Tarjeta", "Transferencia", "Cheque"]
const metodoOptions = computed(() => METODOS.map(m => ({ value: m, label: m })))
const lineas = ref<{ metodoPago: MetodoPago; monto: number; referencia: string }[]>([{ metodoPago: "Efectivo", monto: 0, referencia: "" }])
const fecha  = ref(new Date().toISOString().slice(0, 10))
const tipo   = ref<TipoCobro>("Cuota")
const totalCobro = computed(() => lineas.value.reduce((s, l) => s + (l.monto || 0), 0))

const TIPO_COBRO_OPTIONS = [
  { value: "Seña", label: "Seña" },
  { value: "Cuota", label: "Cuota" },
]

const isSaving = ref(false)
const opError  = ref("")

function addLinea()           { lineas.value.push({ metodoPago: "Efectivo", monto: 0, referencia: "" }) }
function removeLinea(i: number) { lineas.value.splice(i, 1) }

function resetFormToSaldo() {
  lineas.value = [{ metodoPago: "Efectivo", monto: saldo.value, referencia: "" }]
}

async function load() {
  isLoading.value = true
  error.value = ""
  try {
    venta.value = await getVentaById(Number(route.params.id))
    // En una venta a crédito el primer cobro es la seña; los siguientes, cuotas.
    tipo.value  = !isContado.value && venta.value.cobros.length === 0 ? "Seña" : "Cuota"
    resetFormToSaldo()
    // Hay caja disponible solo si la sesión actual está Abierta (PendienteAprobacion no acepta cobros).
    cajaAbierta.value = (await getSesionActual().catch(() => null))?.estado === "Abierta"
  } catch {
    error.value = "No se pudo cargar la venta"
  } finally {
    isLoading.value = false
  }
}

onMounted(load)

async function doRegistrarCobro(): Promise<boolean> {
  if (!venta.value) return false
  if (totalCobro.value <= 0) { opError.value = "El monto total debe ser mayor a 0"; return false }
  if (totalCobro.value > saldo.value) {
    opError.value = `El monto a cobrar (${formatPrice(totalCobro.value)}) supera el saldo pendiente (${formatPrice(saldo.value)})`
    return false
  }
  opError.value = ""
  venta.value = await registrarCobro({
    ventaId: venta.value.id,
    tipo:    tipo.value,
    fecha:   fecha.value,
    lineas:  lineas.value
      .filter(l => l.monto > 0)
      .map(l => ({ metodoPago: l.metodoPago, monto: l.monto, referencia: l.referencia.trim() || undefined })),
  })
  resetFormToSaldo()
  return true
}

// Registrar una seña/cuota/pago y quedarse en la pantalla
async function guardarCobro() {
  isSaving.value = true
  try { await doRegistrarCobro() }
  catch (e) {
    opError.value = e instanceof Error ? e.message : "Error al registrar el cobro"
    // Si el backend rechazó por falta de caja, refrescamos el aviso proactivo.
    if (opError.value.toLowerCase().includes("caja")) cajaAbierta.value = false
  }
  finally { isSaving.value = false }
}

// Ir al paso dedicado de emisión de documento (recibo o factura)
function goEmitir() {
  if (!venta.value) return
  router.push(`/ventas/${venta.value.id}/comprobante`)
}
</script>

<template>
  <div class="min-h-screen" style="background-color: var(--color-background)">
    <AppSidebar />
    <AppHeader />
    <main style="margin-left: var(--sidebar-width); padding-top: 64px; transition: margin-left 0.25s ease">
      <div class="p-4 sm:p-6 lg:p-8">

        <button class="flex items-center gap-1.5 mb-6 text-sm font-semibold transition-colors hover:opacity-70"
          style="color: var(--color-primary)" @click="router.push('/ventas/cobros-pendientes')">
          <span class="material-symbols-outlined" style="font-size: 18px">arrow_back</span>
          Volver a Cobros Pendientes
        </button>

        <div v-if="isLoading" class="py-16 text-center" style="color: var(--color-outline)">Cargando…</div>
        <div v-else-if="error" class="py-16 text-center" style="color: var(--color-error)">{{ error }}</div>

        <template v-else-if="venta">
          <div class="flex items-center gap-3 mb-8 flex-wrap">
            <h1 class="text-4xl font-extrabold tracking-tight mb-2">Cobrar venta</h1>
            <span class="text-2xl font-mono font-bold" style="color: var(--color-primary)">{{ venta.numeroComprobante }}</span>
          </div>

          <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <!-- Cobro -->
            <div class="lg:col-span-2 space-y-6">
              <div v-if="yaCobrado" class="rounded-2xl p-8 text-center" style="background-color: var(--color-surface-container-lowest); box-shadow: var(--shadow-sm)">
                <span class="material-symbols-outlined mb-2" style="font-size: 40px; color: var(--color-on-success-container)">verified</span>
                <p class="text-lg font-bold" style="color: var(--color-on-surface)">Venta cobrada</p>
                <p class="text-sm" style="color: var(--color-on-surface-variant)">El comprobante ya fue emitido.</p>
                <BaseButton variant="secondary" class="mt-4" @click="router.push(`/ventas/${venta.id}`)">Ver detalle</BaseButton>
              </div>

              <div v-else-if="!puedeCobrar" class="rounded-2xl p-8 text-center" style="background-color: var(--color-surface-container-lowest); box-shadow: var(--shadow-sm)">
                <p class="text-sm" style="color: var(--color-on-surface-variant)">Esta venta no está lista para cobrar (estado actual: {{ venta.estado }}).</p>
              </div>

              <template v-else>
                <!-- Aviso: no hay caja abierta -->
                <div v-if="!cajaAbierta" class="rounded-2xl p-5 flex items-start justify-between gap-4 flex-wrap" style="background:var(--color-warning-container);border:1.5px solid var(--color-warning-container)">
                  <div class="flex items-start gap-3">
                    <span class="material-symbols-outlined" style="font-size:24px;color:var(--color-on-warning-container)">point_of_sale</span>
                    <div>
                      <p class="font-bold text-sm" style="color:var(--color-on-warning-container)">No hay una caja abierta</p>
                      <p class="text-xs mt-0.5" style="color:var(--color-on-warning-container)">Todos los cobros (efectivo, tarjeta, transferencia y cheque) requieren una caja abierta.</p>
                    </div>
                  </div>
                  <BaseButton variant="primary" size="sm" @click="router.push('/ventas/cierre')">
                    <span class="material-symbols-outlined" style="font-size:16px">lock_open</span>
                    Abrir caja
                  </BaseButton>
                </div>

                <div class="rounded-2xl p-6" style="background-color: var(--color-surface-container-lowest); box-shadow: var(--shadow-sm)">
                  <h3 class="text-xl font-extrabold mb-4" style="color: var(--color-primary)">Pago</h3>

                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label class="text-xs font-bold uppercase tracking-wider block mb-1.5" style="color: var(--color-outline)">Fecha</label>
                      <DateInput v-model="fecha" />
                    </div>
                    <div v-if="!isContado">
                      <label class="text-xs font-bold uppercase tracking-wider block mb-1.5" style="color: var(--color-outline)">Tipo</label>
                      <SearchableSelect v-model="tipo" :options="TIPO_COBRO_OPTIONS" placeholder="Tipo de cobro" />
                    </div>
                  </div>

                  <label class="text-xs font-bold uppercase tracking-wider block mb-1.5" style="color: var(--color-outline)">Métodos de pago</label>
                  <div class="space-y-2">
                    <div v-for="(l, i) in lineas" :key="i" class="flex gap-3 items-center">
                      <SearchableSelect v-model="l.metodoPago" :options="metodoOptions" class="flex-1" />
                      <MontoInput :model-value="l.monto ?? null" placeholder="Monto" class="flex-1" @update:model-value="l.monto = $event ?? 0" />
                      <input
                        v-if="l.metodoPago !== 'Efectivo'"
                        v-model="l.referencia"
                        type="text"
                        placeholder="Referencia (opcional)"
                        class="flex-1 px-4 h-12 rounded-md text-sm outline-none appearance-none shadow-none transition-all"
                        :style="inputStyle()"
                      />
                      <button v-if="lineas.length > 1" class="w-9 h-9 rounded-full flex items-center justify-center" style="background:var(--color-error-container);color:var(--color-on-error-container)" @click="removeLinea(i)">
                        <span class="material-symbols-outlined" style="font-size:16px">close</span>
                      </button>
                    </div>
                  </div>
                  <button class="mt-2 text-xs font-semibold flex items-center gap-1" style="color: var(--color-primary)" @click="addLinea">
                    <span class="material-symbols-outlined" style="font-size:14px">add</span> Agregar método
                  </button>

                  <p class="text-sm font-semibold mt-3" style="color: var(--color-primary)">Total a registrar: {{ formatPrice(totalCobro) }}</p>
                  <p v-if="saldo <= 0" class="mt-2 text-xs font-semibold" style="color:var(--color-on-success-container)">Esta venta ya está totalmente cobrada. Emití el comprobante para cerrarla.</p>
                  <p v-if="opError" class="mt-2 text-xs font-medium" style="color: var(--color-error)">{{ opError }}</p>

                  <div class="mt-4 flex gap-2 flex-wrap">
                    <BaseButton variant="primary" size="lg" :disabled="isSaving || saldo <= 0" @click="guardarCobro">
                      <span class="material-symbols-outlined" style="font-size:18px">payments</span>
                      {{ isSaving ? "Registrando…" : "Registrar cobro" }}
                    </BaseButton>
                    <BaseButton variant="secondary" size="lg" :disabled="isSaving" @click="goEmitir">
                      <span class="material-symbols-outlined" style="font-size:18px">receipt_long</span>
                      Emitir comprobante
                    </BaseButton>
                  </div>
                </div>

                <!-- Cobros registrados -->
                <div v-if="venta.cobros.length" class="rounded-lg overflow-hidden" style="background-color: var(--color-surface-container-lowest); box-shadow: var(--shadow-sm)">
                  <div class="px-6 py-4" style="border-bottom: 1px solid var(--color-hairline-soft)">
                    <h3 class="text-sm font-bold uppercase tracking-wider" style="color: var(--color-outline)">Cobros registrados</h3>
                  </div>
                  <div class="p-6 space-y-2">
                    <div v-for="c in venta.cobros" :key="c.id" class="flex items-center justify-between text-sm px-3 py-2 rounded-lg" style="background: var(--color-surface-container-low)" :style="c.anulado ? 'opacity:0.5;text-decoration:line-through' : ''">
                      <span style="color: var(--color-on-surface-variant)">{{ c.tipo }} · {{ formatDate(c.fecha) }} · {{ c.lineas.map(x => x.metodoPago).join(', ') }}</span>
                      <span class="font-semibold" style="color: var(--color-on-surface)">{{ formatPrice(c.montoTotal) }}</span>
                    </div>
                  </div>
                </div>
              </template>
            </div>

            <!-- Resumen -->
            <div class="space-y-6">
              <div class="rounded-2xl p-6" style="background-color: var(--color-surface-container-lowest); box-shadow: var(--shadow-sm)">
                <h3 class="text-sm font-bold uppercase tracking-wider mb-4" style="color: var(--color-outline)">Venta</h3>
                <p class="text-sm font-semibold" style="color: var(--color-on-surface)">{{ venta.clienteNombre }}</p>
                <p class="text-xs mb-4" style="color: var(--color-on-surface-variant)">
                  {{ venta.condicionVenta === "Credito" ? "Crédito" : "Contado" }} · {{ formatDate(venta.fechaVenta) }}
                </p>
                <div class="space-y-2 text-sm">
                  <div class="flex justify-between"><span style="color: var(--color-on-surface-variant)">Total</span><span class="font-semibold" style="color: var(--color-on-surface)">{{ formatPrice(venta.total) }}</span></div>
                  <div class="flex justify-between"><span style="color: var(--color-on-surface-variant)">Cobrado</span><span style="color:var(--color-on-success-container)">{{ formatPrice(venta.totalCobrado) }}</span></div>
                  <div class="flex justify-between font-bold pt-2" style="border-top: 1px solid var(--color-hairline)"><span style="color: var(--color-on-surface)">Saldo</span><span style="color:var(--color-on-warning-container)">{{ formatPrice(saldo) }}</span></div>
                </div>
              </div>
            </div>
          </div>
        </template>
      </div>
    </main>
  </div>
</template>
