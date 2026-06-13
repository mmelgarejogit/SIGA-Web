<script setup lang="ts">
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
const lineas = ref<{ metodoPago: MetodoPago; monto: number }[]>([{ metodoPago: "Efectivo", monto: 0 }])
const fecha  = ref(new Date().toISOString().slice(0, 10))
const tipo   = ref<TipoCobro>("Cuota")
const totalCobro = computed(() => lineas.value.reduce((s, l) => s + (l.monto || 0), 0))

const isSaving = ref(false)
const opError  = ref("")

function addLinea()           { lineas.value.push({ metodoPago: "Efectivo", monto: 0 }) }
function removeLinea(i: number) { lineas.value.splice(i, 1) }

function resetFormToSaldo() {
  lineas.value = [{ metodoPago: "Efectivo", monto: saldo.value }]
}

async function load() {
  isLoading.value = true
  error.value = ""
  try {
    venta.value = await getVentaById(Number(route.params.id))
    tipo.value  = venta.value.estado === "EnProceso" ? "Seña" : "Cuota"
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
    lineas:  lineas.value.filter(l => l.monto > 0),
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
    <main style="margin-left: var(--sidebar-width); padding-top: 64px">
      <div class="p-8">

        <button class="flex items-center gap-1.5 mb-6 text-sm font-semibold transition-colors hover:opacity-70"
          style="color: var(--color-primary)" @click="router.push('/ventas/cobros-pendientes')">
          <span class="material-symbols-outlined" style="font-size: 18px">arrow_back</span>
          Volver a Cobros Pendientes
        </button>

        <div v-if="isLoading" class="py-16 text-center" style="color: var(--color-outline)">Cargando…</div>
        <div v-else-if="error" class="py-16 text-center" style="color: var(--color-error)">{{ error }}</div>

        <template v-else-if="venta">
          <div class="flex items-center gap-3 mb-8 flex-wrap">
            <h1 class="text-4xl font-extrabold tracking-tight" style="color: var(--color-on-surface)">Cobrar venta</h1>
            <span class="text-2xl font-mono font-bold" style="color: var(--color-primary)">{{ venta.numeroComprobante }}</span>
          </div>

          <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <!-- Cobro -->
            <div class="lg:col-span-2 space-y-6">
              <div v-if="yaCobrado" class="rounded-2xl p-8 text-center" style="background-color: var(--color-surface-container-lowest); box-shadow: 0 2px 12px rgba(0,40,142,0.06)">
                <span class="material-symbols-outlined mb-2" style="font-size: 40px; color: #166534">verified</span>
                <p class="text-lg font-bold" style="color: var(--color-on-surface)">Venta cobrada</p>
                <p class="text-sm" style="color: var(--color-on-surface-variant)">El comprobante ya fue emitido.</p>
                <BaseButton variant="secondary" class="mt-4" @click="router.push(`/ventas/${venta.id}`)">Ver detalle</BaseButton>
              </div>

              <div v-else-if="!puedeCobrar" class="rounded-2xl p-8 text-center" style="background-color: var(--color-surface-container-lowest); box-shadow: 0 2px 12px rgba(0,40,142,0.06)">
                <p class="text-sm" style="color: var(--color-on-surface-variant)">Esta venta no está lista para cobrar (estado actual: {{ venta.estado }}).</p>
              </div>

              <template v-else>
                <!-- Aviso: no hay caja abierta (los cobros en efectivo se rechazan) -->
                <div v-if="!cajaAbierta" class="rounded-2xl p-5 flex items-start justify-between gap-4 flex-wrap" style="background:#FEF3C7;border:1.5px solid #FDE68A">
                  <div class="flex items-start gap-3">
                    <span class="material-symbols-outlined" style="font-size:24px;color:#92400E">point_of_sale</span>
                    <div>
                      <p class="font-bold text-sm" style="color:#92400E">No hay una caja abierta</p>
                      <p class="text-xs mt-0.5" style="color:#B45309">Para registrar cobros en efectivo primero tenés que abrir la caja. Tarjeta, transferencia y cheque sí se pueden registrar.</p>
                    </div>
                  </div>
                  <BaseButton variant="primary" size="sm" @click="router.push('/ventas/cierre')">
                    <span class="material-symbols-outlined" style="font-size:16px">lock_open</span>
                    Abrir caja
                  </BaseButton>
                </div>

                <div class="rounded-2xl p-6" style="background-color: var(--color-surface-container-lowest); box-shadow: 0 2px 12px rgba(0,40,142,0.06)">
                  <h3 class="text-xl font-extrabold mb-4" style="color: var(--color-primary)">Pago</h3>

                  <div class="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <label class="text-xs font-bold uppercase tracking-wider block mb-1.5" style="color: var(--color-outline)">Fecha</label>
                      <input v-model="fecha" type="date" class="w-full px-4 py-3 rounded-xl text-sm outline-none" style="border: 1px solid var(--color-outline-variant); background: var(--color-surface-container-low); color: var(--color-on-surface)" />
                    </div>
                    <div v-if="!isContado">
                      <label class="text-xs font-bold uppercase tracking-wider block mb-1.5" style="color: var(--color-outline)">Tipo</label>
                      <select v-model="tipo" class="w-full px-4 py-3 rounded-xl text-sm outline-none appearance-none" style="border: 1px solid var(--color-outline-variant); background: var(--color-surface-container-low); color: var(--color-on-surface)">
                        <option value="Seña">Seña</option>
                        <option value="Cuota">Cuota</option>
                      </select>
                    </div>
                  </div>

                  <label class="text-xs font-bold uppercase tracking-wider block mb-1.5" style="color: var(--color-outline)">Métodos de pago</label>
                  <div class="space-y-2">
                    <div v-for="(l, i) in lineas" :key="i" class="flex gap-3 items-center">
                      <select v-model="l.metodoPago" class="flex-1 px-4 py-3 rounded-xl text-sm outline-none appearance-none" style="border: 1px solid var(--color-outline-variant); background: var(--color-surface-container-low); color: var(--color-on-surface)">
                        <option v-for="m in METODOS" :key="m" :value="m">{{ m }}</option>
                      </select>
                      <input v-model.number="l.monto" type="number" min="0" placeholder="Monto" class="flex-1 px-4 py-3 rounded-xl text-sm outline-none" style="border: 1px solid var(--color-outline-variant); background: var(--color-surface-container-low); color: var(--color-on-surface)" />
                      <button v-if="lineas.length > 1" class="w-9 h-9 rounded-full flex items-center justify-center" style="background:#FEE2E2;color:#991B1B" @click="removeLinea(i)">
                        <span class="material-symbols-outlined" style="font-size:16px">close</span>
                      </button>
                    </div>
                  </div>
                  <button class="mt-2 text-xs font-semibold flex items-center gap-1" style="color: var(--color-primary)" @click="addLinea">
                    <span class="material-symbols-outlined" style="font-size:14px">add</span> Agregar método
                  </button>

                  <p class="text-sm font-semibold mt-3" style="color: var(--color-primary)">Total a registrar: {{ formatPrice(totalCobro) }}</p>
                  <p v-if="saldo <= 0" class="mt-2 text-xs font-semibold" style="color:#166534">Esta venta ya está totalmente cobrada. Emití el comprobante para cerrarla.</p>
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
                <div v-if="venta.cobros.length" class="rounded-2xl overflow-hidden" style="background-color: var(--color-surface-container-lowest); box-shadow: 0 2px 12px rgba(0,40,142,0.06)">
                  <div class="px-6 py-4" style="border-bottom: 1px solid rgba(196,197,213,0.12)">
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
              <div class="rounded-2xl p-6" style="background-color: var(--color-surface-container-lowest); box-shadow: 0 2px 12px rgba(0,40,142,0.06)">
                <h3 class="text-sm font-bold uppercase tracking-wider mb-4" style="color: var(--color-outline)">Venta</h3>
                <p class="text-sm font-semibold" style="color: var(--color-on-surface)">{{ venta.clienteNombre }}</p>
                <p class="text-xs mb-4" style="color: var(--color-on-surface-variant)">
                  {{ venta.condicionVenta === "Credito" ? "Crédito" : "Contado" }} · {{ formatDate(venta.fechaVenta) }}
                </p>
                <div class="space-y-2 text-sm">
                  <div class="flex justify-between"><span style="color: var(--color-on-surface-variant)">Total</span><span class="font-semibold" style="color: var(--color-on-surface)">{{ formatPrice(venta.total) }}</span></div>
                  <div class="flex justify-between"><span style="color: var(--color-on-surface-variant)">Cobrado</span><span style="color:#166534">{{ formatPrice(venta.totalCobrado) }}</span></div>
                  <div class="flex justify-between font-bold pt-2" style="border-top: 1px solid rgba(196,197,213,0.2)"><span style="color: var(--color-on-surface)">Saldo</span><span style="color:#92400E">{{ formatPrice(saldo) }}</span></div>
                </div>
              </div>
            </div>
          </div>
        </template>
      </div>
    </main>
  </div>
</template>
