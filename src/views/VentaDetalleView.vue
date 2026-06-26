<script setup lang="ts">
import { ref, computed, onMounted } from "vue"
import { useRoute, useRouter } from "vue-router"
import AppSidebar from "@/components/AppSidebar.vue"
import AppHeader from "@/components/AppHeader.vue"
import BaseButton from "@/components/BaseButton.vue"
import BaseModal from "@/components/BaseModal.vue"
import { useAuthStore } from "@/stores/auth"
import {
  type Venta, type TipoDevolucion,
  getVentaById, confirmarVenta, cancelarVenta,
  solicitarDevolucion, gestionarDevolucion,
} from "@/services/ventasService"
import { registrarEnvio, registrarRecepcion } from "@/services/laboratorioService"

const route  = useRoute()
const router = useRouter()
const auth   = useAuthStore()

const canManage = computed(() => auth.hasPermission("gestionar_ventas"))

const formatPrice = (n: number) =>
  new Intl.NumberFormat("es-PY", { style: "currency", currency: "PYG", maximumFractionDigits: 0 }).format(n)

const formatDate = (s?: string) =>
  s ? new Date(s + "T00:00:00").toLocaleDateString("es-PY", { day: "2-digit", month: "short", year: "numeric" }) : "—"

// ── Datos ─────────────────────────────────────────────────────────────────────

const venta     = ref<Venta | null>(null)
const isLoading = ref(false)
const error     = ref("")

async function load() {
  isLoading.value = true
  error.value = ""
  try {
    venta.value = await getVentaById(Number(route.params.id))
  } catch {
    error.value = "No se pudo cargar la venta"
  } finally {
    isLoading.value = false
  }
}

onMounted(load)

// ── Badges ────────────────────────────────────────────────────────────────────

function estadoBadge(estado: string) {
  const map: Record<string, { bg: string; text: string; label: string }> = {
    Borrador:           { bg: "var(--color-surface-container)", text: "var(--color-outline)",  label: "Borrador" },
    Confirmada:         { bg: "color-mix(in srgb, var(--color-tertiary) 12%, var(--color-surface-container-lowest))", text: "var(--color-tertiary)",  label: "Confirmada" },
    EnProceso:          { bg: "var(--color-info-container)", text: "var(--color-on-info-container)",  label: "En proceso" },
    ListaParaCobrar:    { bg: "var(--color-warning-container)", text: "var(--color-on-warning-container)",  label: "Lista para cobrar" },
    ComprobanteEmitido: { bg: "var(--color-success-container)", text: "var(--color-on-success-container)",  label: "Comprobante emitido" },
    Cancelada:          { bg: "var(--color-surface-container)", text: "var(--color-outline)",  label: "Cancelada" },
  }
  return map[estado] ?? { bg: "var(--color-surface-container)", text: "var(--color-outline)", label: estado }
}

function estadoTPBadge(estado: string) {
  const map: Record<string, { bg: string; text: string; label: string }> = {
    PendienteEnvio: { bg: "var(--color-warning-container)", text: "var(--color-on-warning-container)", label: "Pendiente envío" },
    Enviado:        { bg: "var(--color-info-container)", text: "var(--color-on-info-container)", label: "Enviado al lab" },
    Recibido:       { bg: "var(--color-success-container)", text: "var(--color-on-success-container)", label: "Recibido" },
  }
  return map[estado] ?? { bg: "var(--color-surface-container)", text: "var(--color-outline)", label: estado }
}

function estadoDevBadge(estado: string) {
  const map: Record<string, { bg: string; text: string; label: string }> = {
    Pendiente:  { bg: "var(--color-warning-container)", text: "var(--color-on-warning-container)", label: "Pendiente" },
    Confirmada: { bg: "var(--color-success-container)", text: "var(--color-on-success-container)", label: "Confirmada" },
    Rechazada:  { bg: "var(--color-error-container)", text: "var(--color-on-error-container)", label: "Rechazada" },
  }
  return map[estado] ?? { bg: "var(--color-surface-container)", text: "var(--color-outline)", label: estado }
}

// ── Flags de estado ───────────────────────────────────────────────────────────

const puedeCancelar         = computed(() => ["Borrador", "Confirmada", "EnProceso"].includes(venta.value?.estado ?? ""))
const puedeConfirmar        = computed(() => venta.value?.estado === "Borrador")
const puedeEnviarLab        = computed(() => venta.value?.trabajoPedido?.estado === "PendienteEnvio")
const puedeRecibirLab       = computed(() => venta.value?.trabajoPedido?.estado === "Enviado")
const puedeDevolver         = computed(() => venta.value?.estado === "ComprobanteEmitido")
const puedeEmitirDoc        = computed(() => venta.value?.estado === "ListaParaCobrar" && !venta.value?.comprobante && !venta.value?.factura)

// ── Modal: Confirmar ──────────────────────────────────────────────────────────

const showConfirmar    = ref(false)
const isConfirmando    = ref(false)

async function submitConfirmar() {
  if (!venta.value) return
  isConfirmando.value = true
  try {
    venta.value = await confirmarVenta(venta.value.id)
    showConfirmar.value = false
  } finally {
    isConfirmando.value = false
  }
}

// ── Modal: Cancelar ───────────────────────────────────────────────────────────

const showCancelar  = ref(false)
const isCancelando  = ref(false)
const motivoCancel  = ref("")
const cancelError   = ref("")

async function submitCancelar() {
  if (!venta.value) return
  isCancelando.value = true
  cancelError.value  = ""
  try {
    venta.value = await cancelarVenta(venta.value.id, { motivo: motivoCancel.value || undefined })
    showCancelar.value = false
  } catch (e: any) {
    cancelError.value = e?.response?.data?.message ?? "Error al cancelar"
  } finally {
    isCancelando.value = false
  }
}

// ── Envío / Recepción lab (confirmación simple) ───────────────────────────────

const showEnvioLab    = ref(false)
const showRecepcionLab = ref(false)
const isLabOp         = ref(false)
const labObservacion  = ref("")

async function submitEnvioLab() {
  if (!venta.value) return
  isLabOp.value = true
  try {
    await registrarEnvio(venta.value.trabajoPedido!.id)
    await load()
    showEnvioLab.value = false
  } finally {
    isLabOp.value = false
  }
}

async function submitRecepcionLab() {
  if (!venta.value) return
  isLabOp.value = true
  try {
    await registrarRecepcion(venta.value.trabajoPedido!.id)
    await load()
    showRecepcionLab.value = false
  } finally {
    isLabOp.value = false
  }
}

// ── Modal: Devolución ─────────────────────────────────────────────────────────

const showDevolucion  = ref(false)
const isDevolviendo   = ref(false)
const devError        = ref("")
const devTipo         = ref<TipoDevolucion>("Devolucion")
const devMotivo       = ref("")
const devLineas       = ref([{ productoDevueltoId: 0, cantidadDevuelta: 1, productoNuevoId: undefined as number | undefined, cantidadNueva: undefined as number | undefined }])

function addDevLinea() { devLineas.value.push({ productoDevueltoId: 0, cantidadDevuelta: 1, productoNuevoId: undefined, cantidadNueva: undefined }) }
function removeDevLinea(i: number) { devLineas.value.splice(i, 1) }

async function submitDevolucion() {
  if (!venta.value) return
  if (!devMotivo.value.trim()) { devError.value = "El motivo es obligatorio"; return }
  isDevolviendo.value = true
  devError.value      = ""
  try {
    await solicitarDevolucion(venta.value.id, {
      tipo:   devTipo.value,
      motivo: devMotivo.value,
      lineas: devLineas.value.filter(l => l.productoDevueltoId > 0),
    })
    showDevolucion.value = false
    await load()
  } catch (e: any) {
    devError.value = e?.response?.data?.message ?? "Error al registrar devolución"
  } finally {
    isDevolviendo.value = false
  }
}

// ── Modal: Gestionar devolución ───────────────────────────────────────────────

const showGestionDev      = ref(false)
const isGestionando       = ref(false)
const gestionDevId        = ref(0)
const gestionDevAccion    = ref<"Confirmar" | "Rechazar">("Confirmar")
const gestionDevObs       = ref("")
const gestionDevError     = ref("")

function openGestionDev(devId: number, accion: "Confirmar" | "Rechazar") {
  gestionDevId.value     = devId
  gestionDevAccion.value = accion
  gestionDevObs.value    = ""
  gestionDevError.value  = ""
  showGestionDev.value   = true
}

async function submitGestionDev() {
  isGestionando.value   = true
  gestionDevError.value = ""
  try {
    await gestionarDevolucion(gestionDevId.value, {
      accion:               gestionDevAccion.value,
      observacionesRevision: gestionDevObs.value || undefined,
    })
    showGestionDev.value = false
    await load()
  } catch (e: any) {
    gestionDevError.value = e?.response?.data?.message ?? "Error al gestionar devolución"
  } finally {
    isGestionando.value = false
  }
}
</script>

<template>
  <div class="min-h-screen" style="background-color: var(--color-background)">
    <AppSidebar />
    <AppHeader />
    <main style="margin-left: var(--sidebar-width); padding-top: 64px">
      <div class="p-8">

        <!-- Volver -->
        <button
          class="flex items-center gap-1.5 mb-6 text-sm font-semibold transition-colors hover:opacity-70"
          style="color: var(--color-primary)"
          @click="router.back()"
        >
          <span class="material-symbols-outlined" style="font-size: 18px">arrow_back</span>
          Volver
        </button>

        <!-- Loading / Error -->
        <div v-if="isLoading" class="py-16 text-center" style="color: var(--color-outline)">Cargando venta…</div>
        <div v-else-if="error" class="py-16 text-center" style="color: var(--color-error)">{{ error }}</div>

        <template v-else-if="venta">

          <!-- Encabezado -->
          <div class="flex items-start justify-between mb-8 flex-wrap gap-4">
            <div>
              <div class="flex items-center gap-3 mb-2 flex-wrap">
                <h1 class="text-4xl font-extrabold tracking-tight font-mono" style="color: var(--color-primary)">
                  {{ venta.numeroComprobante }}
                </h1>
                <span
                  class="px-3 py-1 rounded-full text-sm font-semibold"
                  :style="`background-color: ${estadoBadge(venta.estado).bg}; color: ${estadoBadge(venta.estado).text}`"
                >{{ estadoBadge(venta.estado).label }}</span>
                <span
                  class="px-2.5 py-0.5 rounded-full text-xs font-semibold"
                  :style="venta.tipo === 'TrabajoAPedido' ? 'background:#F0FDF4;color:var(--color-on-success-container)' : 'background:#EFF6FF;color:var(--color-on-info-container)'"
                >{{ venta.tipo === "TrabajoAPedido" ? "Trabajo a pedido" : "Directa" }}</span>
              </div>
              <p class="font-medium" style="color: var(--color-on-surface-variant)">
                {{ venta.clienteNombre }} · {{ venta.condicionVenta === "Credito" ? "Crédito" : "Contado" }} · {{ formatDate(venta.fechaVenta) }}
              </p>
            </div>

            <!-- Acciones -->
            <div class="flex items-center gap-2 flex-wrap">
              <BaseButton v-if="puedeConfirmar" variant="primary" @click="showConfirmar = true">
                <span class="material-symbols-outlined" style="font-size:18px">check_circle</span>
                Confirmar
              </BaseButton>
              <BaseButton v-if="puedeEnviarLab" variant="primary" @click="labObservacion = ''; showEnvioLab = true">
                <span class="material-symbols-outlined" style="font-size:18px">local_shipping</span>
                Registrar envío
              </BaseButton>
              <BaseButton v-if="puedeRecibirLab" variant="primary" @click="labObservacion = ''; showRecepcionLab = true">
                <span class="material-symbols-outlined" style="font-size:18px">inventory</span>
                Registrar recepción
              </BaseButton>
              <BaseButton v-if="puedeDevolver" variant="secondary" @click="devMotivo = ''; devLineas = [{ productoDevueltoId: 0, cantidadDevuelta: 1, productoNuevoId: undefined, cantidadNueva: undefined }]; showDevolucion = true">
                <span class="material-symbols-outlined" style="font-size:18px">undo</span>
                Devolver / Cambiar
              </BaseButton>
              <BaseButton v-if="puedeEmitirDoc" variant="primary" @click="router.push(`/ventas/${venta!.id}/comprobante`)">
                <span class="material-symbols-outlined" style="font-size:18px">receipt_long</span>
                Emitir comprobante
              </BaseButton>
              <BaseButton v-if="puedeCancelar" variant="danger" @click="motivoCancel = ''; cancelError = ''; showCancelar = true">
                <span class="material-symbols-outlined" style="font-size:18px">cancel</span>
                Cancelar
              </BaseButton>
            </div>
          </div>

          <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">

            <!-- Columna principal -->
            <div class="lg:col-span-2 space-y-6">

              <!-- Líneas -->
              <div class="rounded-2xl overflow-hidden" style="background-color: var(--color-surface-container-lowest); box-shadow: var(--shadow-sm)">
                <div class="px-6 py-4" style="border-bottom: 1px solid var(--color-hairline-soft)">
                  <h3 class="text-sm font-bold uppercase tracking-wider" style="color: var(--color-outline)">Líneas de venta</h3>
                </div>
                <table class="w-full text-sm">
                  <thead>
                    <tr style="background-color: var(--color-surface-container-low)">
                      <th class="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider" style="color: var(--color-outline)">Descripción</th>
                      <th class="px-6 py-3 text-right text-xs font-bold uppercase tracking-wider" style="color: var(--color-outline)">Cant.</th>
                      <th class="px-6 py-3 text-right text-xs font-bold uppercase tracking-wider" style="color: var(--color-outline)">P. Unit.</th>
                      <th class="px-6 py-3 text-right text-xs font-bold uppercase tracking-wider" style="color: var(--color-outline)">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="l in venta.lineas" :key="l.id" style="border-top: 1px solid var(--color-hairline-soft)">
                      <td class="px-6 py-3" style="color: var(--color-on-surface)">
                        {{ l.descripcion }}
                        <span class="ml-2 text-xs px-1.5 py-0.5 rounded" style="background: var(--color-surface-container-high); color: var(--color-outline)">{{ l.categoriaFiscal }}</span>
                      </td>
                      <td class="px-6 py-3 text-right" style="color: var(--color-on-surface-variant)">{{ l.cantidad }}</td>
                      <td class="px-6 py-3 text-right" style="color: var(--color-on-surface-variant)">{{ formatPrice(l.precioUnitario) }}</td>
                      <td class="px-6 py-3 text-right font-semibold" style="color: var(--color-on-surface)">{{ formatPrice(l.subtotal) }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <!-- Cobros -->
              <div v-if="venta.cobros.length || venta.condicionVenta === 'Credito'" class="rounded-2xl overflow-hidden" style="background-color: var(--color-surface-container-lowest); box-shadow: var(--shadow-sm)">
                <div class="px-6 py-4" style="border-bottom: 1px solid var(--color-hairline-soft)">
                  <h3 class="text-sm font-bold uppercase tracking-wider" style="color: var(--color-outline)">Cobros</h3>
                </div>
                <div class="p-6 space-y-3">
                  <div v-if="!venta.cobros.length" class="text-sm" style="color: var(--color-outline)">Sin cobros registrados.</div>
                  <div
                    v-for="c in venta.cobros" :key="c.id"
                    class="rounded-xl p-4"
                    :style="`background-color: ${c.anulado ? 'var(--color-surface-container-low)' : '#F0FDF4'}; opacity: ${c.anulado ? 0.5 : 1}`"
                  >
                    <div class="flex items-center justify-between mb-2">
                      <div class="flex items-center gap-2">
                        <span class="text-xs px-2 py-0.5 rounded-full font-semibold" style="background:var(--color-success-container);color:var(--color-on-success-container)">{{ c.tipo }}</span>
                        <span class="text-xs" style="color: var(--color-on-surface-variant)">{{ formatDate(c.fecha) }}</span>
                        <span v-if="c.anulado" class="text-xs px-1.5 py-0.5 rounded" style="background:var(--color-error-container);color:var(--color-on-error-container)">Anulado</span>
                      </div>
                      <span class="font-bold" style="color:var(--color-on-success-container)">{{ formatPrice(c.montoTotal) }}</span>
                    </div>
                    <div class="flex gap-3 flex-wrap">
                      <span v-for="l in c.lineas" :key="l.id" class="text-xs px-2 py-1 rounded-lg" style="background:var(--color-surface-container-low); color: var(--color-on-surface-variant)">
                        {{ l.metodoPago }}: {{ formatPrice(l.monto) }}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Trabajo a pedido -->
              <div v-if="venta.trabajoPedido" class="rounded-2xl overflow-hidden" style="background-color: var(--color-surface-container-lowest); box-shadow: var(--shadow-sm)">
                <div class="px-6 py-4 flex items-center justify-between" style="border-bottom: 1px solid var(--color-hairline-soft)">
                  <h3 class="text-sm font-bold uppercase tracking-wider" style="color: var(--color-outline)">Pedido al laboratorio</h3>
                  <span
                    class="px-2.5 py-1 rounded-full text-xs font-semibold"
                    :style="`background-color: ${estadoTPBadge(venta.trabajoPedido.estado).bg}; color: ${estadoTPBadge(venta.trabajoPedido.estado).text}`"
                  >{{ estadoTPBadge(venta.trabajoPedido.estado).label }}</span>
                </div>
                <div class="p-6 grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p class="text-xs font-bold uppercase tracking-wider mb-1" style="color: var(--color-outline)">Laboratorio</p>
                    <p style="color: var(--color-on-surface)">{{ venta.trabajoPedido.laboratorioNombre }}</p>
                  </div>
                  <div v-if="venta.trabajoPedido.tipoLenteNombre">
                    <p class="text-xs font-bold uppercase tracking-wider mb-1" style="color: var(--color-outline)">Lente</p>
                    <p style="color: var(--color-on-surface)">{{ venta.trabajoPedido.tipoLenteNombre }}</p>
                  </div>
                  <div v-if="venta.trabajoPedido.tratamientos.length">
                    <p class="text-xs font-bold uppercase tracking-wider mb-1" style="color: var(--color-outline)">Tratamientos</p>
                    <div class="flex flex-wrap gap-1.5">
                      <span
                        v-for="t in venta.trabajoPedido.tratamientos"
                        :key="t.id"
                        class="px-2 py-0.5 rounded-full text-xs font-medium"
                        style="background:color-mix(in srgb, var(--color-tertiary) 12%, var(--color-surface-container-lowest));color:var(--color-tertiary)"
                      >{{ t.nombre }}</span>
                    </div>
                  </div>
                  <div v-if="venta.trabajoPedido.armazonProductoNombre || venta.trabajoPedido.armazonDelCliente">
                    <p class="text-xs font-bold uppercase tracking-wider mb-1" style="color: var(--color-outline)">Armazón</p>
                    <p style="color: var(--color-on-surface)">{{ venta.trabajoPedido.armazonDelCliente ? "Propio del cliente" : venta.trabajoPedido.armazonProductoNombre }}</p>
                  </div>
                  <div v-if="venta.trabajoPedido.fechaEnvio">
                    <p class="text-xs font-bold uppercase tracking-wider mb-1" style="color: var(--color-outline)">Fecha envío</p>
                    <p style="color: var(--color-on-surface)">{{ formatDate(venta.trabajoPedido.fechaEnvio) }}</p>
                  </div>
                  <div v-if="venta.trabajoPedido.fechaRecepcion">
                    <p class="text-xs font-bold uppercase tracking-wider mb-1" style="color: var(--color-outline)">Fecha recepción</p>
                    <p style="color: var(--color-on-surface)">{{ formatDate(venta.trabajoPedido.fechaRecepcion) }}</p>
                  </div>
                  <div v-if="venta.trabajoPedido.observacion" class="col-span-2">
                    <p class="text-xs font-bold uppercase tracking-wider mb-1" style="color: var(--color-outline)">Observación</p>
                    <p style="color: var(--color-on-surface-variant)">{{ venta.trabajoPedido.observacion }}</p>
                  </div>
                </div>
              </div>

              <!-- Devoluciones -->
              <div v-if="venta.devoluciones.length" class="rounded-2xl overflow-hidden" style="background-color: var(--color-surface-container-lowest); box-shadow: var(--shadow-sm)">
                <div class="px-6 py-4" style="border-bottom: 1px solid var(--color-hairline-soft)">
                  <h3 class="text-sm font-bold uppercase tracking-wider" style="color: var(--color-outline)">Devoluciones</h3>
                </div>
                <div class="p-6 space-y-4">
                  <div v-for="d in venta.devoluciones" :key="d.id" class="rounded-xl p-4" style="border: 1px solid var(--color-hairline)">
                    <div class="flex items-start justify-between mb-3">
                      <div>
                        <span class="text-xs font-semibold px-2 py-0.5 rounded-full mr-2" style="background:var(--color-warning-container);color:var(--color-on-warning-container)">{{ d.tipo }}</span>
                        <span class="text-xs" style="color:var(--color-on-surface-variant)">{{ d.solicitadoPorNombre }}</span>
                      </div>
                      <div class="flex items-center gap-2">
                        <span
                          class="text-xs px-2 py-0.5 rounded-full font-semibold"
                          :style="`background-color: ${estadoDevBadge(d.estado).bg}; color: ${estadoDevBadge(d.estado).text}`"
                        >{{ estadoDevBadge(d.estado).label }}</span>
                        <template v-if="d.estado === 'Pendiente' && canManage">
                          <button class="w-7 h-7 rounded-full flex items-center justify-center bg-green-100 hover:scale-105 transition-all" title="Confirmar" @click="openGestionDev(d.id, 'Confirmar')">
                            <span class="material-symbols-outlined text-green-700" style="font-size:14px">check</span>
                          </button>
                          <button class="w-7 h-7 rounded-full flex items-center justify-center bg-red-100 hover:scale-105 transition-all" title="Rechazar" @click="openGestionDev(d.id, 'Rechazar')">
                            <span class="material-symbols-outlined text-red-600" style="font-size:14px">close</span>
                          </button>
                        </template>
                      </div>
                    </div>
                    <p class="text-sm mb-3" style="color:var(--color-on-surface-variant)">{{ d.motivo }}</p>
                    <div class="space-y-1">
                      <div v-for="l in d.lineas" :key="l.id" class="text-xs flex gap-2" style="color:var(--color-on-surface-variant)">
                        <span>↩ {{ l.cantidadDevuelta }}x {{ l.productoDevueltoNombre }}</span>
                        <span v-if="l.productoNuevoNombre">→ {{ l.cantidadNueva }}x {{ l.productoNuevoNombre }}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

            </div>

            <!-- Columna lateral: resumen financiero -->
            <div class="space-y-6">

              <!-- Totales -->
              <div class="rounded-2xl p-6 space-y-3" style="background-color: var(--color-surface-container-lowest); box-shadow: var(--shadow-sm)">
                <h3 class="text-sm font-bold uppercase tracking-wider mb-4" style="color: var(--color-outline)">Resumen</h3>
                <div v-if="venta.montoExento > 0" class="flex justify-between text-sm">
                  <span style="color:var(--color-on-surface-variant)">Exento</span>
                  <span style="color:var(--color-on-surface)">{{ formatPrice(venta.montoExento) }}</span>
                </div>
                <div v-if="venta.montoGravado5 > 0" class="flex justify-between text-sm">
                  <span style="color:var(--color-on-surface-variant)">Gravado 5%</span>
                  <span style="color:var(--color-on-surface)">{{ formatPrice(venta.montoGravado5) }}</span>
                </div>
                <div v-if="venta.montoGravado10 > 0" class="flex justify-between text-sm">
                  <span style="color:var(--color-on-surface-variant)">Gravado 10%</span>
                  <span style="color:var(--color-on-surface)">{{ formatPrice(venta.montoGravado10) }}</span>
                </div>
                <div class="flex justify-between font-bold text-base pt-2" style="border-top: 1px solid var(--color-hairline)">
                  <span style="color:var(--color-on-surface)">Total</span>
                  <span style="color:var(--color-primary)">{{ formatPrice(venta.total) }}</span>
                </div>
                <template v-if="venta.condicionVenta === 'Credito'">
                  <div class="flex justify-between text-sm">
                    <span style="color:var(--color-on-surface-variant)">Seña</span>
                    <span style="color:var(--color-on-success-container)">{{ formatPrice(venta.montoSeña) }}</span>
                  </div>
                  <div class="flex justify-between text-sm">
                    <span style="color:var(--color-on-surface-variant)">Total cobrado</span>
                    <span style="color:var(--color-on-success-container)">{{ formatPrice(venta.totalCobrado) }}</span>
                  </div>
                  <div v-if="venta.saldoPendiente > 0" class="flex justify-between text-sm font-semibold">
                    <span style="color:var(--color-on-warning-container)">Saldo pendiente</span>
                    <span style="color:var(--color-on-warning-container)">{{ formatPrice(venta.saldoPendiente) }}</span>
                  </div>
                </template>
              </div>

              <!-- Comprobante emitido -->
              <div v-if="venta.comprobante" class="rounded-2xl p-6" style="background:#F0FDF4; border: 1px solid #BBF7D0">
                <h3 class="text-sm font-bold uppercase tracking-wider mb-3" style="color:var(--color-on-success-container)">Comprobante</h3>
                <p class="text-sm font-semibold mb-1" style="color:var(--color-on-success-container)">{{ venta.comprobante.tipo }}</p>
                <p class="text-xs" style="color:var(--color-on-surface-variant)">Emitido: {{ new Date(venta.comprobante.fechaEmision).toLocaleDateString("es-PY") }}</p>
                <div v-if="venta.comprobante.estado === 'Anulado'" class="mt-2 text-xs px-2 py-1 rounded" style="background:var(--color-error-container);color:var(--color-on-error-container)">
                  Anulado: {{ venta.comprobante.motivoAnulacion }}
                </div>
              </div>

              <!-- Factura emitida -->
              <div v-if="venta.factura" class="rounded-2xl p-6" style="background:#EFF6FF; border: 1px solid #BFDBFE">
                <h3 class="text-sm font-bold uppercase tracking-wider mb-3" style="color:var(--color-on-info-container)">Factura</h3>
                <p class="text-sm font-semibold" style="color:var(--color-on-info-container)">N° {{ venta.factura.numeroFactura }}</p>
                <p class="text-xs mt-1" style="color:var(--color-on-surface-variant)">Timbrado {{ venta.factura.timbrado }} · Est. {{ venta.factura.establecimiento }}</p>
                <p class="text-xs mt-1" style="color:var(--color-on-surface-variant)">{{ formatDate(venta.factura.fechaEmision) }}</p>
                <div class="mt-3 pt-3 space-y-1" style="border-top:1px solid rgba(191,219,254,0.5)">
                  <div v-if="venta.factura.iva5 > 0" class="flex justify-between text-xs" style="color:var(--color-on-surface-variant)">
                    <span>IVA 5%</span><span>{{ formatPrice(venta.factura.iva5) }}</span>
                  </div>
                  <div v-if="venta.factura.iva10 > 0" class="flex justify-between text-xs" style="color:var(--color-on-surface-variant)">
                    <span>IVA 10%</span><span>{{ formatPrice(venta.factura.iva10) }}</span>
                  </div>
                </div>
              </div>

              <!-- Observaciones -->
              <div v-if="venta.observaciones" class="rounded-2xl p-5" style="background:var(--color-surface-container-lowest); box-shadow: var(--shadow-sm)">
                <h3 class="text-xs font-bold uppercase tracking-wider mb-2" style="color:var(--color-outline)">Observaciones</h3>
                <p class="text-sm" style="color:var(--color-on-surface-variant)">{{ venta.observaciones }}</p>
              </div>

            </div>
          </div>
        </template>

      </div>
    </main>
  </div>

  <!-- ── Modal: Confirmar venta ───────────────────────────────────────────── -->
  <BaseModal :open="showConfirmar" size="sm" title="Confirmar Venta" @close="showConfirmar = false">
    <template #body>
      <p class="text-sm" style="color:var(--color-on-surface-variant)">
        ¿Confirmás la venta <strong style="color:var(--color-on-surface)">{{ venta?.numeroComprobante }}</strong>?
        <span v-if="venta?.tipo === 'Directa'"> Pasará a <strong>Lista para cobrar</strong>.</span>
        <span v-else> Pasará a <strong>En proceso</strong> (pendiente del laboratorio).</span>
      </p>
    </template>
    <template #footer>
      <BaseButton variant="secondary" class="flex-1" @click="showConfirmar = false">Cancelar</BaseButton>
      <BaseButton variant="primary" class="flex-1" :disabled="isConfirmando" @click="submitConfirmar">
        {{ isConfirmando ? "Confirmando…" : "Confirmar" }}
      </BaseButton>
    </template>
  </BaseModal>

  <!-- ── Modal: Cancelar venta ────────────────────────────────────────────── -->
  <BaseModal :open="showCancelar" size="sm" title="Cancelar Venta" @close="showCancelar = false">
    <template #body>
      <div class="space-y-4">
        <p class="text-sm" style="color:var(--color-on-surface-variant)">Esta acción no se puede deshacer. La venta pasará a estado <strong>Cancelada</strong>.</p>
        <div>
          <label class="text-xs font-bold uppercase tracking-wider block mb-1.5" style="color:var(--color-outline)">Motivo (opcional)</label>
          <textarea v-model="motivoCancel" rows="3" class="w-full px-4 py-3 rounded-xl text-sm outline-none resize-none" style="border:1px solid var(--color-outline-variant);background:var(--color-surface-container-low);color:var(--color-on-surface)"></textarea>
        </div>
        <p v-if="cancelError" class="text-xs font-medium" style="color:var(--color-error)">{{ cancelError }}</p>
      </div>
    </template>
    <template #footer>
      <BaseButton variant="secondary" class="flex-1" @click="showCancelar = false">Volver</BaseButton>
      <BaseButton variant="danger" class="flex-1" :disabled="isCancelando" @click="submitCancelar">
        {{ isCancelando ? "Cancelando…" : "Cancelar venta" }}
      </BaseButton>
    </template>
  </BaseModal>

  <!-- ── Modal: Enviar al laboratorio ─────────────────────────────────────── -->
  <BaseModal :open="showEnvioLab" size="sm" title="Registrar Envío al Laboratorio" @close="showEnvioLab = false">
    <template #body>
      <div class="space-y-4">
        <p class="text-sm" style="color:var(--color-on-surface-variant)">Se registrará el envío del pedido al laboratorio <strong>{{ venta?.trabajoPedido?.laboratorioNombre }}</strong>.</p>
        <div>
          <label class="text-xs font-bold uppercase tracking-wider block mb-1.5" style="color:var(--color-outline)">Observación (opcional)</label>
          <textarea v-model="labObservacion" rows="2" class="w-full px-4 py-3 rounded-xl text-sm outline-none resize-none" style="border:1px solid var(--color-outline-variant);background:var(--color-surface-container-low);color:var(--color-on-surface)"></textarea>
        </div>
      </div>
    </template>
    <template #footer>
      <BaseButton variant="secondary" class="flex-1" @click="showEnvioLab = false">Cancelar</BaseButton>
      <BaseButton variant="primary" class="flex-1" :disabled="isLabOp" @click="submitEnvioLab">
        {{ isLabOp ? "Registrando…" : "Registrar envío" }}
      </BaseButton>
    </template>
  </BaseModal>

  <!-- ── Modal: Recepción del laboratorio ─────────────────────────────────── -->
  <BaseModal :open="showRecepcionLab" size="sm" title="Registrar Recepción del Laboratorio" @close="showRecepcionLab = false">
    <template #body>
      <div class="space-y-4">
        <p class="text-sm" style="color:var(--color-on-surface-variant)">
          Se registrará la recepción de los lentes desde el laboratorio. La venta pasará automáticamente a <strong>Lista para cobrar</strong>.
        </p>
        <div>
          <label class="text-xs font-bold uppercase tracking-wider block mb-1.5" style="color:var(--color-outline)">Observación (opcional)</label>
          <textarea v-model="labObservacion" rows="2" class="w-full px-4 py-3 rounded-xl text-sm outline-none resize-none" style="border:1px solid var(--color-outline-variant);background:var(--color-surface-container-low);color:var(--color-on-surface)"></textarea>
        </div>
      </div>
    </template>
    <template #footer>
      <BaseButton variant="secondary" class="flex-1" @click="showRecepcionLab = false">Cancelar</BaseButton>
      <BaseButton variant="primary" class="flex-1" :disabled="isLabOp" @click="submitRecepcionLab">
        {{ isLabOp ? "Registrando…" : "Registrar recepción" }}
      </BaseButton>
    </template>
  </BaseModal>

  <!-- ── Modal: Solicitar devolución ──────────────────────────────────────── -->
  <BaseModal :open="showDevolucion" size="lg" title="Devolución / Cambio" @close="showDevolucion = false">
    <template #body>
      <div class="space-y-5">
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="text-xs font-bold uppercase tracking-wider block mb-1.5" style="color:var(--color-outline)">Tipo *</label>
            <select v-model="devTipo" class="w-full px-4 py-3 rounded-xl text-sm outline-none appearance-none" style="border:1px solid var(--color-outline-variant);background:var(--color-surface-container-low);color:var(--color-on-surface)">
              <option value="Devolucion">Devolución (reembolso)</option>
              <option value="Cambio">Cambio (otro producto)</option>
            </select>
          </div>
        </div>
        <div>
          <label class="text-xs font-bold uppercase tracking-wider block mb-1.5" style="color:var(--color-outline)">Motivo *</label>
          <textarea v-model="devMotivo" rows="2" class="w-full px-4 py-3 rounded-xl text-sm outline-none resize-none" style="border:1px solid var(--color-outline-variant);background:var(--color-surface-container-low);color:var(--color-on-surface)"></textarea>
        </div>

        <!-- Líneas -->
        <div>
          <div class="flex items-center justify-between mb-2">
            <label class="text-xs font-bold uppercase tracking-wider" style="color:var(--color-outline)">Productos a devolver *</label>
            <button class="text-xs font-semibold flex items-center gap-1" style="color:var(--color-primary)" @click="addDevLinea">
              <span class="material-symbols-outlined" style="font-size:14px">add</span> Agregar línea
            </button>
          </div>
          <div class="space-y-3">
            <div v-for="(l, i) in devLineas" :key="i" class="rounded-xl p-3 space-y-2" style="background:var(--color-surface-container-low)">
              <div class="flex gap-3 items-center">
                <select
                  v-model.number="l.productoDevueltoId"
                  class="flex-1 px-3 py-2 rounded-lg text-sm outline-none appearance-none"
                  style="border:1px solid var(--color-outline-variant);background:var(--color-surface-container-lowest);color:var(--color-on-surface)"
                >
                  <option :value="0" disabled>Producto a devolver…</option>
                  <option
                    v-for="linea in venta?.lineas.filter(ln => ln.productoId)"
                    :key="linea.productoId!"
                    :value="linea.productoId"
                  >{{ linea.descripcion }}</option>
                </select>
                <input
                  v-model.number="l.cantidadDevuelta"
                  type="number" min="1" placeholder="Cant."
                  class="w-20 px-3 py-2 rounded-lg text-sm outline-none text-center"
                  style="border:1px solid var(--color-outline-variant);background:var(--color-surface-container-lowest);color:var(--color-on-surface)"
                />
                <button v-if="devLineas.length > 1" class="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style="background:var(--color-error-container);color:var(--color-on-error-container)" @click="removeDevLinea(i)">
                  <span class="material-symbols-outlined" style="font-size:14px">close</span>
                </button>
              </div>
              <div v-if="devTipo === 'Cambio'" class="flex gap-3 items-center">
                <select
                  v-model.number="l.productoNuevoId"
                  class="flex-1 px-3 py-2 rounded-lg text-sm outline-none appearance-none"
                  style="border:1px solid var(--color-outline-variant);background:var(--color-surface-container-lowest);color:var(--color-on-surface)"
                >
                  <option :value="undefined" disabled>Producto de reemplazo…</option>
                  <option
                    v-for="linea in venta?.lineas.filter(ln => ln.productoId)"
                    :key="linea.productoId!"
                    :value="linea.productoId"
                  >{{ linea.descripcion }}</option>
                </select>
                <input
                  v-model.number="l.cantidadNueva"
                  type="number" min="1" placeholder="Cant."
                  class="w-20 px-3 py-2 rounded-lg text-sm outline-none text-center"
                  style="border:1px solid var(--color-outline-variant);background:var(--color-surface-container-lowest);color:var(--color-on-surface)"
                />
              </div>
            </div>
          </div>
          <p class="text-xs mt-1" style="color:var(--color-outline)">Solo se pueden devolver productos con stock (no servicios ni lentes a pedido).</p>
        </div>

        <p v-if="devError" class="text-xs font-medium" style="color:var(--color-error)">{{ devError }}</p>
      </div>
    </template>
    <template #footer>
      <BaseButton variant="secondary" class="flex-1" @click="showDevolucion = false">Cancelar</BaseButton>
      <BaseButton variant="primary" class="flex-1" :disabled="isDevolviendo" @click="submitDevolucion">
        {{ isDevolviendo ? "Enviando…" : "Solicitar devolución" }}
      </BaseButton>
    </template>
  </BaseModal>

  <!-- ── Modal: Gestionar devolución ──────────────────────────────────────── -->
  <BaseModal :open="showGestionDev" size="sm" :title="gestionDevAccion === 'Confirmar' ? 'Confirmar Devolución' : 'Rechazar Devolución'" @close="showGestionDev = false">
    <template #body>
      <div class="space-y-4">
        <p class="text-sm" style="color:var(--color-on-surface-variant)">
          <span v-if="gestionDevAccion === 'Confirmar'">Al confirmar se aplicarán los movimientos de stock y caja correspondientes.</span>
          <span v-else>La devolución quedará rechazada sin impacto en stock ni caja.</span>
        </p>
        <div>
          <label class="text-xs font-bold uppercase tracking-wider block mb-1.5" style="color:var(--color-outline)">Observaciones</label>
          <textarea v-model="gestionDevObs" rows="2" class="w-full px-4 py-3 rounded-xl text-sm outline-none resize-none" style="border:1px solid var(--color-outline-variant);background:var(--color-surface-container-low);color:var(--color-on-surface)"></textarea>
        </div>
        <p v-if="gestionDevError" class="text-xs font-medium" style="color:var(--color-error)">{{ gestionDevError }}</p>
      </div>
    </template>
    <template #footer>
      <BaseButton variant="secondary" class="flex-1" @click="showGestionDev = false">Cancelar</BaseButton>
      <BaseButton :variant="gestionDevAccion === 'Confirmar' ? 'primary' : 'danger'" class="flex-1" :disabled="isGestionando" @click="submitGestionDev">
        {{ isGestionando ? "Procesando…" : gestionDevAccion }}
      </BaseButton>
    </template>
  </BaseModal>
</template>
