<script setup lang="ts">
import { ref, reactive, computed, onMounted } from "vue"
import { useRouter } from "vue-router"
import AppSidebar from "@/components/AppSidebar.vue"
import AppHeader from "@/components/AppHeader.vue"
import BaseButton from "@/components/BaseButton.vue"
import BaseModal from "@/components/BaseModal.vue"
import BaseTable from "@/components/BaseTable.vue"
import FilterChips from "@/components/FilterChips.vue"
import RowContextMenu, { type ContextMenuItem } from "@/components/RowContextMenu.vue"
import { useAuthStore } from "@/stores/auth"
import {
  type Egreso,
  type MetodoPago,
  getEgresos,
  registrarPago,
  aprobarEgreso,
  rechazarEgreso,
  anularEgreso,
  getCategorias,
} from "@/services/egresosService"

const router = useRouter()
const auth = useAuthStore()
const canManage = auth.hasPermission("gestionar_egresos")
const canAprobar = auth.hasPermission("aprobar_egresos")
const canPagar = auth.hasPermission("pagar_egresos")

// ── Formato ───────────────────────────────────────────────────────────────────

const formatPrice = (n: number) =>
  new Intl.NumberFormat("es-PY", { style: "currency", currency: "PYG", maximumFractionDigits: 0 }).format(n)

const formatDate = (s?: string) =>
  s ? new Date(s + "T00:00:00").toLocaleDateString("es-PY", { day: "2-digit", month: "short", year: "numeric" }) : "—"

// ── Estado principal ──────────────────────────────────────────────────────────

const egresos = ref<Egreso[]>([])
const totalCount = ref(0)
const isLoading = ref(false)
const loadError = ref("")
const currentPage = ref(1)
const pageSize = 10

const tipoFiltros = ref<string[]>([])
const estadoFiltros = ref<string[]>([])
const soloVencidos = ref(false)

const tipoOptions = [
  { value: "Honorario", label: "Honorario" },
  { value: "GastoGeneral", label: "Gasto General" },
  { value: "FacturaCompra", label: "Factura (hist.)" },
]

const estadoOptions = [
  { value: "Pendiente", label: "Pendiente", dot: "#92400E" },
  { value: "Aprobado", label: "Aprobado", dot: "#1D4ED8" },
  { value: "Pagado", label: "Pagado", dot: "#166534" },
  { value: "Rechazado", label: "Rechazado", dot: "#991B1B" },
  { value: "Anulado", label: "Anulado", dot: "var(--color-outline)" },
]

function setTipoFiltro(val: string[]) {
  const added = val.find(v => !tipoFiltros.value.includes(v))
  tipoFiltros.value = added ? [added] : val
  applyFilter()
}

function setEstadoFiltro(val: string[]) {
  const added = val.find(v => !estadoFiltros.value.includes(v))
  estadoFiltros.value = added ? [added] : val
  applyFilter()
}

const columns = [
  { key: "tipo", label: "Tipo" },
  { key: "concepto", label: "Concepto" },
  { key: "monto", label: "Monto", align: "right" as const },
  { key: "fechaEmision", label: "Emisión" },
  { key: "estado", label: "Estado" },
  { key: "acciones", label: "", align: "right" as const },
]

async function load() {
  isLoading.value = true
  loadError.value = ""
  try {
    const params: Record<string, unknown> = { page: currentPage.value, pageSize }
    if (tipoFiltros.value.length === 1) params.tipo = tipoFiltros.value[0]
    if (estadoFiltros.value.length === 1) params.estado = estadoFiltros.value[0]
    if (soloVencidos.value) params.soloVencidos = true
    const res = await getEgresos(params as Parameters<typeof getEgresos>[0])
    egresos.value = res.items
    totalCount.value = res.totalCount
  } catch (err: unknown) {
    loadError.value = err instanceof Error ? err.message : "Error al cargar egresos."
  } finally {
    isLoading.value = false
  }
}

onMounted(load)

function applyFilter() {
  currentPage.value = 1
  load()
}

// ── KPIs ──────────────────────────────────────────────────────────────────────

const totalPendiente = computed(() =>
  egresos.value.filter(e => e.estado === "Pendiente").reduce((s, e) => s + e.monto, 0))
const totalAprobado = computed(() =>
  egresos.value.filter(e => e.estado === "Aprobado").reduce((s, e) => s + e.monto, 0))
const cantAprobados = computed(() => egresos.value.filter(e => e.estado === "Aprobado").length)

// ── Helpers de UI ─────────────────────────────────────────────────────────────

function tipoLabel(tipo: string) {
  const map: Record<string, string> = {
    FacturaCompra: "Factura",
    Honorario: "Honorario",
    GastoGeneral: "Gasto",
  }
  return map[tipo] ?? tipo
}

function tipoIcon(tipo: string) {
  const map: Record<string, string> = {
    FacturaCompra: "receipt",
    Honorario: "person_check",
    GastoGeneral: "payments",
  }
  return map[tipo] ?? "attach_money"
}

function tipoColor(tipo: string): { bg: string; color: string } {
  const map: Record<string, { bg: string; color: string }> = {
    FacturaCompra: { bg: "#DBEAFE", color: "#1D4ED8" },
    Honorario: { bg: "#EDE9FE", color: "#6D28D9" },
    GastoGeneral: { bg: "#FEF3C7", color: "#92400E" },
  }
  return map[tipo] ?? { bg: "#F3F4F6", color: "#374151" }
}

function estadoBadgeStyle(estado: string, vencido: boolean) {
  if (vencido && estado !== "Pagado" && estado !== "Anulado" && estado !== "Rechazado")
    return "background-color: #FEE2E2; color: #991B1B"
  const map: Record<string, string> = {
    Pendiente: "background-color: #FEF3C7; color: #92400E",
    Aprobado:  "background-color: #DBEAFE; color: #1D4ED8",
    Pagado:    "background-color: #DCFCE7; color: #166534",
    Rechazado: "background-color: #FEE2E2; color: #991B1B",
    Anulado:   "background-color: var(--color-surface-container-high); color: var(--color-outline)",
    Borrador:  "background-color: var(--color-surface-container-high); color: var(--color-outline)",
  }
  return map[estado] ?? ""
}

function estadoLabel(e: Egreso) {
  if (e.estaVencido && e.estado !== "Pagado" && e.estado !== "Anulado" && e.estado !== "Rechazado") return "Vencido"
  return e.estado
}

// ── Modal detalle ─────────────────────────────────────────────────────────────

const showDetalle = ref(false)
const detalleEgreso = ref<Egreso | null>(null)

function openDetalle(e: Egreso) {
  detalleEgreso.value = e
  showDetalle.value = true
}

// ── Modal registrar pago ──────────────────────────────────────────────────────

const showPago = ref(false)
const isSavingPago = ref(false)
const pagoError = ref("")
const pagoEgresoId = ref(0)
const pagoForm = reactive({
  metodoPago: "Efectivo" as MetodoPago,
  fechaPago: new Date().toISOString().slice(0, 10),
  nroComprobante: "",
  observaciones: "",
})

function openPago(e: Egreso) {
  pagoEgresoId.value = e.id
  Object.assign(pagoForm, {
    metodoPago: "Efectivo",
    fechaPago: new Date().toISOString().slice(0, 10),
    nroComprobante: "",
    observaciones: "",
  })
  pagoError.value = ""
  showPago.value = true
}

async function submitPago() {
  isSavingPago.value = true
  pagoError.value = ""
  try {
    await registrarPago(pagoEgresoId.value, {
      metodoPago: pagoForm.metodoPago,
      fechaPago: pagoForm.fechaPago,
      nroComprobante: pagoForm.nroComprobante.trim() || undefined,
      observaciones: pagoForm.observaciones.trim() || undefined,
    })
    showPago.value = false
    showDetalle.value = false
    await load()
  } catch (err: unknown) {
    pagoError.value = err instanceof Error ? err.message : "Error al registrar pago."
  } finally {
    isSavingPago.value = false
  }
}

// ── Modal aprobar ─────────────────────────────────────────────────────────────

const showAprobar = ref(false)
const isSavingAprobar = ref(false)
const aprobarError = ref("")
const aprobarEgresoId = ref(0)

function openAprobar(e: Egreso) {
  aprobarEgresoId.value = e.id
  aprobarError.value = ""
  showAprobar.value = true
}

async function submitAprobar() {
  isSavingAprobar.value = true
  aprobarError.value = ""
  try {
    await aprobarEgreso(aprobarEgresoId.value)
    showAprobar.value = false
    showDetalle.value = false
    await load()
  } catch (err: unknown) {
    aprobarError.value = err instanceof Error ? err.message : "Error al aprobar egreso."
  } finally {
    isSavingAprobar.value = false
  }
}

// ── Modal rechazar ────────────────────────────────────────────────────────────

const showRechazar = ref(false)
const isSavingRechazar = ref(false)
const rechazarError = ref("")
const rechazarEgresoId = ref(0)
const rechazarMotivo = ref("")

function openRechazar(e: Egreso) {
  rechazarEgresoId.value = e.id
  rechazarMotivo.value = ""
  rechazarError.value = ""
  showRechazar.value = true
}

async function submitRechazar() {
  if (!rechazarMotivo.value.trim()) { rechazarError.value = "El motivo es obligatorio."; return }
  isSavingRechazar.value = true
  rechazarError.value = ""
  try {
    await rechazarEgreso(rechazarEgresoId.value, { motivo: rechazarMotivo.value.trim() })
    showRechazar.value = false
    showDetalle.value = false
    await load()
  } catch (err: unknown) {
    rechazarError.value = err instanceof Error ? err.message : "Error al rechazar egreso."
  } finally {
    isSavingRechazar.value = false
  }
}

// ── Modal anular ──────────────────────────────────────────────────────────────

const showAnular = ref(false)
const isSavingAnular = ref(false)
const anularError = ref("")
const anularEgresoId = ref(0)
const anularMotivo = ref("")

function openAnular(e: Egreso) {
  anularEgresoId.value = e.id
  anularMotivo.value = ""
  anularError.value = ""
  showAnular.value = true
}

async function submitAnular() {
  isSavingAnular.value = true
  anularError.value = ""
  try {
    await anularEgreso(anularEgresoId.value, { motivo: anularMotivo.value.trim() || undefined })
    showAnular.value = false
    showDetalle.value = false
    await load()
  } catch (err: unknown) {
    anularError.value = err instanceof Error ? err.message : "Error al anular egreso."
  } finally {
    isSavingAnular.value = false
  }
}

// ── Menú contextual ───────────────────────────────────────────────────────────

function menuItems(e: Egreso): ContextMenuItem[] {
  const isPendiente = e.estado === "Pendiente"
  const isAprobado = e.estado === "Aprobado"
  const isFinalizado = e.estado === "Pagado" || e.estado === "Anulado" || e.estado === "Rechazado"

  return [
    { type: "item", label: "Ver detalle", icon: "visibility", action: () => openDetalle(e) },
    { type: "separator" },
    {
      type: "item", label: "Aprobar", icon: "check_circle",
      action: () => openAprobar(e),
      hidden: !canAprobar || !isPendiente,
    },
    {
      type: "item", label: "Rechazar", icon: "cancel",
      action: () => openRechazar(e),
      hidden: !canAprobar || !isPendiente,
      danger: true,
    },
    {
      type: "item", label: "Registrar pago", icon: "payments",
      action: () => openPago(e),
      hidden: !canPagar || !isAprobado,
    },
    {
      type: "item", label: "Anular egreso", icon: "block",
      action: () => openAnular(e),
      hidden: !canManage || isFinalizado || isAprobado,
      danger: true,
    },
  ]
}
</script>

<template>
  <div class="min-h-screen" style="background-color: var(--color-background)">
    <AppSidebar />
    <AppHeader />

    <main style="margin-left: var(--sidebar-width); transition: margin-left 0.25s ease; padding-top: 64px">
      <div class="p-8">

        <!-- Header -->
        <div class="flex items-start justify-between mb-8">
          <div>
            <h1 class="text-4xl font-extrabold tracking-tight mb-2">Egresos</h1>
            <p class="font-medium" style="color: var(--color-on-surface-variant)">
              {{ totalCount }} egreso{{ totalCount !== 1 ? "s" : "" }} registrado{{ totalCount !== 1 ? "s" : "" }}
            </p>
          </div>
          <BaseButton v-if="canManage" variant="primary" size="lg" @click="router.push('/egresos/nuevo')">
            <span class="material-symbols-outlined" style="width:20px;height:20px;font-size:20px">add</span>
            Nueva Solicitud
          </BaseButton>
        </div>

        <!-- KPIs -->
        <div class="grid grid-cols-3 gap-4 mb-6">
          <div class="rounded-2xl p-5" style="background-color: var(--color-surface-container-lowest); border: 1px solid rgba(196,197,213,0.2)">
            <p class="text-xs font-bold uppercase tracking-wider mb-1" style="color: var(--color-outline)">Pendiente de aprobación</p>
            <p class="text-2xl font-extrabold" style="color: var(--color-on-surface)">{{ formatPrice(totalPendiente) }}</p>
          </div>
          <div class="rounded-2xl p-5" style="background-color: #EFF6FF; border: 1px solid rgba(196,197,213,0.2)">
            <p class="text-xs font-bold uppercase tracking-wider mb-1" style="color: #1D4ED8">Aprobados pendientes de pago</p>
            <p class="text-2xl font-extrabold" style="color: #1D4ED8">{{ formatPrice(totalAprobado) }}</p>
          </div>
          <div class="rounded-2xl p-5" style="background-color: var(--color-surface-container-lowest); border: 1px solid rgba(196,197,213,0.2)">
            <p class="text-xs font-bold uppercase tracking-wider mb-1" style="color: var(--color-outline)">Aprobados sin pagar</p>
            <p class="text-2xl font-extrabold" style="color: var(--color-on-surface)">{{ cantAprobados }}</p>
          </div>
        </div>

        <!-- Filtros -->
        <div class="flex items-center gap-3 mb-6 flex-wrap">
          <FilterChips :options="tipoOptions" :modelValue="tipoFiltros" placeholder="Tipo" @update:modelValue="setTipoFiltro" />
          <FilterChips :options="estadoOptions" :modelValue="estadoFiltros" placeholder="Estado" @update:modelValue="setEstadoFiltro" />
          <button
            @click="soloVencidos = !soloVencidos; applyFilter()"
            class="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg text-sm font-medium transition-colors"
            :style="soloVencidos
              ? 'background-color: #FEE2E2; color: #991B1B; border: 1px solid #FCA5A5'
              : 'background-color: var(--color-surface); border: 1px solid var(--color-outline-variant); color: var(--color-on-surface)'"
          >
            <span class="material-symbols-outlined" style="font-size: 16px">schedule</span>
            Vencidos
          </button>
        </div>

        <!-- Error -->
        <div v-if="loadError" class="flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium mb-6"
          style="background-color: var(--color-error-container); color: var(--color-on-error-container)">
          <span class="material-symbols-outlined" style="font-size: 18px">error</span>
          {{ loadError }}
        </div>

        <!-- Tabla -->
        <BaseTable :columns="columns" :items="egresos" :loading="isLoading" empty-text="No hay egresos registrados.">

          <template #tipo="{ item }">
            <div class="flex items-center gap-2">
              <span class="w-9 h-9 rounded-full flex-shrink-0"
                :style="`background-color: ${tipoColor(item.tipo).bg}; display: flex; align-items: center; justify-content: center`">
                <span class="material-symbols-outlined" :style="`font-size: 18px; color: ${tipoColor(item.tipo).color}`">{{ tipoIcon(item.tipo) }}</span>
              </span>
              <span class="text-xs font-bold" :style="`color: ${tipoColor(item.tipo).color}`">{{ tipoLabel(item.tipo) }}</span>
            </div>
          </template>

          <template #concepto="{ item }">
            <div>
              <p class="text-sm font-semibold" style="color: var(--color-on-surface)">{{ item.concepto }}</p>
              <p class="text-xs" style="color: var(--color-outline)">
                <span v-if="item.tipo === 'FacturaCompra'">{{ item.proveedorNombre ?? '—' }}</span>
                <span v-else-if="item.tipo === 'Honorario'">{{ item.professionalNombre ?? '—' }} {{ item.periodo ? `· ${item.periodo}` : '' }}</span>
                <span v-else>{{ item.categoriaGastoNombre ?? '—' }}</span>
              </p>
            </div>
          </template>

          <template #monto="{ item }">
            <span class="text-sm font-bold" style="color: var(--color-on-surface)">{{ formatPrice(item.monto) }}</span>
          </template>

          <template #fechaEmision="{ item }">
            <span class="text-sm" style="color: var(--color-on-surface-variant)">{{ formatDate(item.fechaEmision) }}</span>
          </template>

          <template #estado="{ item }">
            <span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold"
              :style="estadoBadgeStyle(item.estado, item.estaVencido)">{{ estadoLabel(item) }}</span>
          </template>

          <template #acciones="{ item }">
            <div class="flex items-center justify-end">
              <RowContextMenu :items="menuItems(item)" />
            </div>
          </template>
        </BaseTable>

        <!-- Paginación -->
        <div v-if="totalCount > pageSize" class="flex items-center justify-between mt-4">
          <p class="text-sm" style="color: var(--color-outline)">
            Mostrando {{ (currentPage - 1) * pageSize + 1 }}–{{ Math.min(currentPage * pageSize, totalCount) }} de {{ totalCount }}
          </p>
          <div class="flex gap-2">
            <BaseButton variant="secondary" size="sm" :disabled="currentPage === 1" @click="currentPage--; load()">
              <span class="material-symbols-outlined" style="font-size: 18px">chevron_left</span>
            </BaseButton>
            <BaseButton variant="secondary" size="sm" :disabled="currentPage * pageSize >= totalCount" @click="currentPage++; load()">
              <span class="material-symbols-outlined" style="font-size: 18px">chevron_right</span>
            </BaseButton>
          </div>
        </div>

      </div>
    </main>

    <!-- ── MODAL DETALLE ─────────────────────────────────────────────────────── -->
    <BaseModal :show="showDetalle" title="Detalle de Egreso" size="lg" @close="showDetalle = false">
      <div v-if="detalleEgreso" class="space-y-4">
        <div class="flex items-center gap-3 pb-4" style="border-bottom: 1px solid rgba(196,197,213,0.2)">
          <span class="w-12 h-12 rounded-2xl flex items-center justify-center"
            :style="`background-color: ${tipoColor(detalleEgreso.tipo).bg}`">
            <span class="material-symbols-outlined" :style="`font-size: 22px; color: ${tipoColor(detalleEgreso.tipo).color}`">{{ tipoIcon(detalleEgreso.tipo) }}</span>
          </span>
          <div>
            <p class="font-extrabold text-lg" style="color: var(--color-on-surface)">{{ detalleEgreso.concepto }}</p>
            <p class="text-sm" style="color: var(--color-outline)">{{ tipoLabel(detalleEgreso.tipo) }}</p>
          </div>
          <div class="ml-auto text-right">
            <p class="text-2xl font-extrabold" style="color: var(--color-primary)">{{ formatPrice(detalleEgreso.monto) }}</p>
            <span class="inline-flex px-2.5 py-0.5 rounded-full text-xs font-bold" :style="estadoBadgeStyle(detalleEgreso.estado, detalleEgreso.estaVencido)">
              {{ estadoLabel(detalleEgreso) }}
            </span>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p class="text-xs font-bold uppercase tracking-wider mb-0.5" style="color: var(--color-outline)">Fecha de emisión</p>
            <p style="color: var(--color-on-surface)">{{ formatDate(detalleEgreso.fechaEmision) }}</p>
          </div>
          <div v-if="detalleEgreso.fechaVencimiento">
            <p class="text-xs font-bold uppercase tracking-wider mb-0.5" style="color: var(--color-outline)">Vencimiento</p>
            <p :style="detalleEgreso.estaVencido ? 'color: #DC2626; font-weight: 600' : 'color: var(--color-on-surface)'">
              {{ formatDate(detalleEgreso.fechaVencimiento) }}
            </p>
          </div>
          <div v-if="detalleEgreso.fechaAprobacion">
            <p class="text-xs font-bold uppercase tracking-wider mb-0.5" style="color: var(--color-outline)">Fecha de aprobación</p>
            <p style="color: var(--color-on-surface)">{{ formatDate(detalleEgreso.fechaAprobacion) }}</p>
          </div>
          <div v-if="detalleEgreso.fechaPago">
            <p class="text-xs font-bold uppercase tracking-wider mb-0.5" style="color: var(--color-outline)">Fecha de pago</p>
            <p style="color: var(--color-on-surface)">{{ formatDate(detalleEgreso.fechaPago) }}</p>
          </div>
          <div v-if="detalleEgreso.metodoPago">
            <p class="text-xs font-bold uppercase tracking-wider mb-0.5" style="color: var(--color-outline)">Método de pago</p>
            <p style="color: var(--color-on-surface)">{{ detalleEgreso.metodoPago }}</p>
          </div>
          <div v-if="detalleEgreso.nroComprobante">
            <p class="text-xs font-bold uppercase tracking-wider mb-0.5" style="color: var(--color-outline)">N° Comprobante</p>
            <p class="font-mono" style="color: var(--color-on-surface)">{{ detalleEgreso.nroComprobante }}</p>
          </div>

          <template v-if="detalleEgreso.tipo === 'Honorario'">
            <div>
              <p class="text-xs font-bold uppercase tracking-wider mb-0.5" style="color: var(--color-outline)">Profesional</p>
              <p style="color: var(--color-on-surface)">{{ detalleEgreso.professionalNombre ?? '—' }}</p>
            </div>
            <div v-if="detalleEgreso.periodo">
              <p class="text-xs font-bold uppercase tracking-wider mb-0.5" style="color: var(--color-outline)">Período</p>
              <p style="color: var(--color-on-surface)">{{ detalleEgreso.periodo }}</p>
            </div>
          </template>

          <template v-if="detalleEgreso.tipo === 'GastoGeneral'">
            <div>
              <p class="text-xs font-bold uppercase tracking-wider mb-0.5" style="color: var(--color-outline)">Categoría</p>
              <p style="color: var(--color-on-surface)">{{ detalleEgreso.categoriaGastoNombre ?? '—' }}</p>
            </div>
          </template>

          <template v-if="detalleEgreso.tipo === 'FacturaCompra'">
            <div>
              <p class="text-xs font-bold uppercase tracking-wider mb-0.5" style="color: var(--color-outline)">Proveedor</p>
              <p style="color: var(--color-on-surface)">{{ detalleEgreso.proveedorNombre ?? '—' }}</p>
            </div>
            <div v-if="detalleEgreso.nroFactura">
              <p class="text-xs font-bold uppercase tracking-wider mb-0.5" style="color: var(--color-outline)">N° Factura</p>
              <p class="font-mono" style="color: var(--color-on-surface)">{{ detalleEgreso.nroFactura }}</p>
            </div>
          </template>
        </div>

        <!-- Motivo de rechazo -->
        <div v-if="detalleEgreso.motivoRechazo" class="rounded-xl p-3" style="background-color: #FEF2F2">
          <p class="text-xs font-bold uppercase tracking-wider mb-1" style="color: #991B1B">Motivo de rechazo</p>
          <p class="text-sm" style="color: #991B1B">{{ detalleEgreso.motivoRechazo }}</p>
        </div>

        <div v-if="detalleEgreso.observaciones" class="rounded-xl p-3" style="background-color: var(--color-surface-container-low)">
          <p class="text-xs font-bold uppercase tracking-wider mb-1" style="color: var(--color-outline)">Observaciones</p>
          <p class="text-sm" style="color: var(--color-on-surface)">{{ detalleEgreso.observaciones }}</p>
        </div>
      </div>

      <template #footer>
        <BaseButton
          v-if="detalleEgreso && canAprobar && detalleEgreso.estado === 'Pendiente'"
          variant="danger" size="default"
          @click="openRechazar(detalleEgreso!)"
        >Rechazar</BaseButton>
        <BaseButton
          v-if="detalleEgreso && canAprobar && detalleEgreso.estado === 'Pendiente'"
          variant="primary" size="default"
          @click="openAprobar(detalleEgreso!)"
        >Aprobar</BaseButton>
        <BaseButton
          v-if="detalleEgreso && canPagar && detalleEgreso.estado === 'Aprobado'"
          variant="primary" size="default"
          @click="openPago(detalleEgreso!)"
        >Registrar Pago</BaseButton>
        <BaseButton
          v-if="detalleEgreso && canManage && detalleEgreso.estado === 'Pendiente'"
          variant="danger" size="default"
          @click="openAnular(detalleEgreso!)"
        >Anular</BaseButton>
        <BaseButton
          v-if="!detalleEgreso || (detalleEgreso.estado !== 'Pendiente' && detalleEgreso.estado !== 'Aprobado')"
          variant="secondary" size="default"
          @click="showDetalle = false"
        >Cerrar</BaseButton>
      </template>
    </BaseModal>

    <!-- ── MODAL APROBAR ─────────────────────────────────────────────────────── -->
    <BaseModal :show="showAprobar" title="Aprobar Egreso" size="sm" @close="showAprobar = false">
      <div v-if="aprobarError" class="flex items-center gap-2 rounded-xl px-3 py-2.5 mb-4 text-sm font-medium"
        style="background-color: var(--color-error-container); color: var(--color-on-error-container)">
        <span class="material-symbols-outlined flex-shrink-0" style="font-size: 16px">error</span>
        {{ aprobarError }}
      </div>
      <p class="text-sm" style="color: var(--color-on-surface-variant)">
        ¿Confirmás la aprobación de este egreso? El responsable de caja podrá registrar el pago.
      </p>
      <template #footer>
        <BaseButton variant="secondary" class="flex-1" @click="showAprobar = false">Cancelar</BaseButton>
        <BaseButton variant="primary" class="flex-1" :disabled="isSavingAprobar" @click="submitAprobar">
          <svg v-if="isSavingAprobar" class="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          {{ isSavingAprobar ? "Aprobando..." : "Confirmar Aprobación" }}
        </BaseButton>
      </template>
    </BaseModal>

    <!-- ── MODAL RECHAZAR ────────────────────────────────────────────────────── -->
    <BaseModal :show="showRechazar" title="Rechazar Egreso" size="sm" @close="showRechazar = false">
      <div v-if="rechazarError" class="flex items-center gap-2 rounded-xl px-3 py-2.5 mb-4 text-sm font-medium"
        style="background-color: var(--color-error-container); color: var(--color-on-error-container)">
        <span class="material-symbols-outlined flex-shrink-0" style="font-size: 16px">error</span>
        {{ rechazarError }}
      </div>
      <div class="space-y-3">
        <p class="text-sm" style="color: var(--color-on-surface-variant)">
          El egreso será rechazado y no podrá reactivarse. Un usuario podrá crear uno nuevo si es necesario.
        </p>
        <div>
          <label class="block text-xs font-bold uppercase tracking-wider mb-1.5" style="color: var(--color-outline)">Motivo *</label>
          <textarea v-model="rechazarMotivo" rows="3" class="w-full px-4 py-3 rounded-xl text-sm outline-none resize-none"
            style="border: 1px solid var(--color-outline-variant); color: var(--color-on-surface); background-color: var(--color-surface-container-low)"
            placeholder="Explicá el motivo del rechazo..." />
        </div>
      </div>
      <template #footer>
        <BaseButton variant="secondary" class="flex-1" @click="showRechazar = false">Cancelar</BaseButton>
        <BaseButton variant="danger" class="flex-1" :disabled="isSavingRechazar" @click="submitRechazar">
          <svg v-if="isSavingRechazar" class="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          {{ isSavingRechazar ? "Rechazando..." : "Confirmar Rechazo" }}
        </BaseButton>
      </template>
    </BaseModal>

    <!-- ── MODAL REGISTRAR PAGO ──────────────────────────────────────────────── -->
    <BaseModal :show="showPago" title="Registrar Pago" size="sm" @close="showPago = false">
      <div v-if="pagoError" class="flex items-center gap-2 rounded-xl px-3 py-2.5 mb-4 text-sm font-medium"
        style="background-color: var(--color-error-container); color: var(--color-on-error-container)">
        <span class="material-symbols-outlined flex-shrink-0" style="font-size: 16px">error</span>
        {{ pagoError }}
      </div>
      <div class="space-y-4">
        <div>
          <label class="block text-xs font-bold uppercase tracking-wider mb-1.5" style="color: var(--color-outline)">Método de pago *</label>
          <select v-model="pagoForm.metodoPago" class="w-full px-4 py-3 rounded-xl text-sm outline-none appearance-none"
            style="border: 1px solid var(--color-outline-variant); color: var(--color-on-surface); background-color: var(--color-surface-container-low)">
            <option value="Efectivo">Efectivo</option>
            <option value="Tarjeta">Tarjeta</option>
            <option value="Transferencia">Transferencia</option>
            <option value="Cheque">Cheque</option>
          </select>
        </div>
        <div>
          <label class="block text-xs font-bold uppercase tracking-wider mb-1.5" style="color: var(--color-outline)">Fecha de pago *</label>
          <input v-model="pagoForm.fechaPago" type="date" class="w-full px-4 py-3 rounded-xl text-sm outline-none"
            style="border: 1px solid var(--color-outline-variant); color: var(--color-on-surface); background-color: var(--color-surface-container-low)" />
        </div>
        <div>
          <label class="block text-xs font-bold uppercase tracking-wider mb-1.5" style="color: var(--color-outline)">N° Comprobante</label>
          <input v-model="pagoForm.nroComprobante" type="text" placeholder="Opcional" class="w-full px-4 py-3 rounded-xl text-sm outline-none"
            style="border: 1px solid var(--color-outline-variant); color: var(--color-on-surface); background-color: var(--color-surface-container-low)" />
        </div>
        <div>
          <label class="block text-xs font-bold uppercase tracking-wider mb-1.5" style="color: var(--color-outline)">Observaciones</label>
          <textarea v-model="pagoForm.observaciones" rows="2" placeholder="Opcional" class="w-full px-4 py-3 rounded-xl text-sm outline-none resize-none"
            style="border: 1px solid var(--color-outline-variant); color: var(--color-on-surface); background-color: var(--color-surface-container-low)" />
        </div>
      </div>
      <template #footer>
        <BaseButton variant="secondary" class="flex-1" @click="showPago = false">Cancelar</BaseButton>
        <BaseButton variant="primary" class="flex-1" :disabled="isSavingPago" @click="submitPago">
          <svg v-if="isSavingPago" class="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          {{ isSavingPago ? "Registrando..." : "Confirmar Pago" }}
        </BaseButton>
      </template>
    </BaseModal>

    <!-- ── MODAL ANULAR ──────────────────────────────────────────────────────── -->
    <BaseModal :show="showAnular" title="Anular Egreso" size="sm" @close="showAnular = false">
      <div v-if="anularError" class="flex items-center gap-2 rounded-xl px-3 py-2.5 mb-4 text-sm font-medium"
        style="background-color: var(--color-error-container); color: var(--color-on-error-container)">
        <span class="material-symbols-outlined flex-shrink-0" style="font-size: 16px">error</span>
        {{ anularError }}
      </div>
      <p class="text-sm mb-4" style="color: var(--color-on-surface-variant)">
        Esta acción no se puede deshacer. ¿Estás seguro de que querés anular este egreso?
      </p>
      <div>
        <label class="block text-xs font-bold uppercase tracking-wider mb-1.5" style="color: var(--color-outline)">Motivo (opcional)</label>
        <textarea v-model="anularMotivo" rows="2" class="w-full px-4 py-3 rounded-xl text-sm outline-none resize-none"
          style="border: 1px solid var(--color-outline-variant); color: var(--color-on-surface); background-color: var(--color-surface-container-low)" />
      </div>
      <template #footer>
        <BaseButton variant="secondary" class="flex-1" @click="showAnular = false">Cancelar</BaseButton>
        <BaseButton variant="danger" class="flex-1" :disabled="isSavingAnular" @click="submitAnular">
          <svg v-if="isSavingAnular" class="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          {{ isSavingAnular ? "Anulando..." : "Confirmar Anulación" }}
        </BaseButton>
      </template>
    </BaseModal>
  </div>
</template>
