<script setup lang="ts">
import { ref, reactive, computed, onMounted } from "vue"
import AppSidebar from "@/components/AppSidebar.vue"
import AppHeader from "@/components/AppHeader.vue"
import BaseButton from "@/components/BaseButton.vue"
import BaseModal from "@/components/BaseModal.vue"
import BaseTable from "@/components/BaseTable.vue"
import { useAuthStore } from "@/stores/auth"
import {
  type Egreso,
  type CategoriaGasto,
  type MetodoPago,
  getEgresos,
  crearFacturaCompra,
  crearHonorario,
  crearGastoGeneral,
  registrarPago,
  anularEgreso,
  getCategorias,
} from "@/services/egresosService"
import { getProveedores, type Proveedor } from "@/services/inventarioService"
import { getProfessionals, type Professional } from "@/services/professionalService"

const auth = useAuthStore()
const canManage = auth.hasPermission("gestionar_egresos")

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
const pageSize = 20

const tipoFiltro = ref<string>("Todos")
const estadoFiltro = ref<string>("Todos")
const soloVencidos = ref(false)

const tipoTabs = [
  { key: "Todos", label: "Todos" },
  { key: "FacturaCompra", label: "Facturas" },
  { key: "Honorario", label: "Honorarios" },
  { key: "GastoGeneral", label: "Gastos" },
]

const estadoTabs = [
  { key: "Todos", label: "Todos" },
  { key: "Pendiente", label: "Pendiente" },
  { key: "Pagado", label: "Pagado" },
  { key: "Anulado", label: "Anulado" },
]

const columns = [
  { key: "tipo", label: "Tipo" },
  { key: "concepto", label: "Concepto" },
  { key: "monto", label: "Monto", align: "right" as const },
  { key: "fechaEmision", label: "Emisión" },
  { key: "vencimiento", label: "Vencimiento" },
  { key: "estado", label: "Estado" },
  { key: "acciones", label: "", align: "right" as const },
]

async function load() {
  isLoading.value = true
  loadError.value = ""
  try {
    const params: Record<string, unknown> = { page: currentPage.value, pageSize }
    if (tipoFiltro.value !== "Todos") params.tipo = tipoFiltro.value
    if (estadoFiltro.value !== "Todos") params.estado = estadoFiltro.value
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

onMounted(async () => {
  await Promise.all([load(), loadCatalogos()])
})

function applyFilter() {
  currentPage.value = 1
  load()
}

// ── Catálogos ─────────────────────────────────────────────────────────────────

const categorias = ref<CategoriaGasto[]>([])
const proveedores = ref<Proveedor[]>([])
const profesionales = ref<Professional[]>([])

async function loadCatalogos() {
  const [cats, provs, profs] = await Promise.allSettled([
    getCategorias(),
    getProveedores(),
    getProfessionals(),
  ])
  if (cats.status === "fulfilled") categorias.value = cats.value
  if (provs.status === "fulfilled") proveedores.value = provs.value
  if (profs.status === "fulfilled") {
    const data = profs.value as unknown
    if (Array.isArray(data)) profesionales.value = data as Professional[]
    else if (data && typeof data === "object" && "items" in data)
      profesionales.value = (data as { items: Professional[] }).items
  }
}

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
  if (vencido && estado !== "Pagado" && estado !== "Anulado")
    return "background-color: #FEE2E2; color: #991B1B"
  const map: Record<string, string> = {
    Pendiente: "background-color: #FEF3C7; color: #92400E",
    Pagado: "background-color: #DCFCE7; color: #166534",
    Anulado: "background-color: var(--color-surface-container-high); color: var(--color-outline)",
    Borrador: "background-color: var(--color-surface-container-high); color: var(--color-outline)",
  }
  return map[estado] ?? ""
}

function estadoLabel(e: Egreso) {
  if (e.estaVencido && e.estado !== "Pagado" && e.estado !== "Anulado") return "Vencido"
  return e.estado
}

// ── Modal detalle ─────────────────────────────────────────────────────────────

const showDetalle = ref(false)
const detalleEgreso = ref<Egreso | null>(null)

function openDetalle(e: Egreso) {
  detalleEgreso.value = e
  showDetalle.value = true
}

// ── Modal nueva factura ───────────────────────────────────────────────────────

const showFactura = ref(false)
const isSavingFactura = ref(false)
const facturaError = ref("")
const facturaForm = reactive({
  proveedorId: 0,
  pedidoProveedorId: undefined as number | undefined,
  nroFactura: "",
  monto: 0,
  concepto: "",
  observaciones: "",
  fechaEmision: new Date().toISOString().slice(0, 10),
  fechaVencimiento: "",
})

function openFactura() {
  Object.assign(facturaForm, {
    proveedorId: 0,
    pedidoProveedorId: undefined,
    nroFactura: "",
    monto: 0,
    concepto: "",
    observaciones: "",
    fechaEmision: new Date().toISOString().slice(0, 10),
    fechaVencimiento: "",
  })
  facturaError.value = ""
  showFactura.value = true
}

async function submitFactura() {
  if (!facturaForm.proveedorId) { facturaError.value = "Seleccioná un proveedor."; return }
  if (!facturaForm.concepto.trim()) { facturaError.value = "El concepto es obligatorio."; return }
  if (!facturaForm.monto || facturaForm.monto <= 0) { facturaError.value = "El monto debe ser mayor a 0."; return }
  isSavingFactura.value = true
  facturaError.value = ""
  try {
    await crearFacturaCompra({
      proveedorId: facturaForm.proveedorId,
      pedidoProveedorId: facturaForm.pedidoProveedorId || undefined,
      nroFactura: facturaForm.nroFactura.trim() || undefined,
      monto: facturaForm.monto,
      concepto: facturaForm.concepto.trim(),
      observaciones: facturaForm.observaciones.trim() || undefined,
      fechaEmision: facturaForm.fechaEmision,
      fechaVencimiento: facturaForm.fechaVencimiento || undefined,
    })
    showFactura.value = false
    await load()
  } catch (err: unknown) {
    facturaError.value = err instanceof Error ? err.message : "Error al crear factura."
  } finally {
    isSavingFactura.value = false
  }
}

// ── Modal nuevo honorario ─────────────────────────────────────────────────────

const showHonorario = ref(false)
const isSavingHonorario = ref(false)
const honorarioError = ref("")
const honorarioForm = reactive({
  professionalId: 0,
  monto: 0,
  concepto: "",
  periodo: "",
  observaciones: "",
  fechaEmision: new Date().toISOString().slice(0, 10),
  fechaVencimiento: "",
})

function openHonorario() {
  Object.assign(honorarioForm, {
    professionalId: 0,
    monto: 0,
    concepto: "",
    periodo: "",
    observaciones: "",
    fechaEmision: new Date().toISOString().slice(0, 10),
    fechaVencimiento: "",
  })
  honorarioError.value = ""
  showHonorario.value = true
}

async function submitHonorario() {
  if (!honorarioForm.professionalId) { honorarioError.value = "Seleccioná un profesional."; return }
  if (!honorarioForm.concepto.trim()) { honorarioError.value = "El concepto es obligatorio."; return }
  if (!honorarioForm.monto || honorarioForm.monto <= 0) { honorarioError.value = "El monto debe ser mayor a 0."; return }
  isSavingHonorario.value = true
  honorarioError.value = ""
  try {
    await crearHonorario({
      professionalId: honorarioForm.professionalId,
      monto: honorarioForm.monto,
      concepto: honorarioForm.concepto.trim(),
      periodo: honorarioForm.periodo.trim() || undefined,
      observaciones: honorarioForm.observaciones.trim() || undefined,
      fechaEmision: honorarioForm.fechaEmision,
      fechaVencimiento: honorarioForm.fechaVencimiento || undefined,
    })
    showHonorario.value = false
    await load()
  } catch (err: unknown) {
    honorarioError.value = err instanceof Error ? err.message : "Error al crear honorario."
  } finally {
    isSavingHonorario.value = false
  }
}

// ── Modal nuevo gasto general ─────────────────────────────────────────────────

const showGasto = ref(false)
const isSavingGasto = ref(false)
const gastoError = ref("")
const gastoForm = reactive({
  categoriaGastoId: 0,
  monto: 0,
  concepto: "",
  observaciones: "",
  fechaEmision: new Date().toISOString().slice(0, 10),
  fechaVencimiento: "",
})

function openGasto() {
  Object.assign(gastoForm, {
    categoriaGastoId: 0,
    monto: 0,
    concepto: "",
    observaciones: "",
    fechaEmision: new Date().toISOString().slice(0, 10),
    fechaVencimiento: "",
  })
  gastoError.value = ""
  showGasto.value = true
}

async function submitGasto() {
  if (!gastoForm.categoriaGastoId) { gastoError.value = "Seleccioná una categoría."; return }
  if (!gastoForm.concepto.trim()) { gastoError.value = "El concepto es obligatorio."; return }
  if (!gastoForm.monto || gastoForm.monto <= 0) { gastoError.value = "El monto debe ser mayor a 0."; return }
  isSavingGasto.value = true
  gastoError.value = ""
  try {
    await crearGastoGeneral({
      categoriaGastoId: gastoForm.categoriaGastoId,
      monto: gastoForm.monto,
      concepto: gastoForm.concepto.trim(),
      observaciones: gastoForm.observaciones.trim() || undefined,
      fechaEmision: gastoForm.fechaEmision,
      fechaVencimiento: gastoForm.fechaVencimiento || undefined,
    })
    showGasto.value = false
    await load()
  } catch (err: unknown) {
    gastoError.value = err instanceof Error ? err.message : "Error al crear gasto."
  } finally {
    isSavingGasto.value = false
  }
}

// ── Modal registrar pago ──────────────────────────────────────────────────────

const showPago = ref(false)
const isSavingPago = ref(false)
const pagoError = ref("")
const pagoEgresoId = ref(0)
const pagoForm = reactive({
  metodoPago: "Efectivo" as MetodoPago,
  fechaPago: new Date().toISOString().slice(0, 10),
})

function openPago(e: Egreso) {
  pagoEgresoId.value = e.id
  pagoForm.metodoPago = "Efectivo"
  pagoForm.fechaPago = new Date().toISOString().slice(0, 10)
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

// ── Acciones rápidas ──────────────────────────────────────────────────────────

function canPay(e: Egreso) {
  return canManage && e.estado !== "Pagado" && e.estado !== "Anulado"
}

function canCancel(e: Egreso) {
  return canManage && e.estado !== "Pagado" && e.estado !== "Anulado"
}

// ── KPIs ──────────────────────────────────────────────────────────────────────

const totalPendiente = computed(() =>
  egresos.value.filter(e => e.estado === "Pendiente").reduce((s, e) => s + e.monto, 0))
const totalVencido = computed(() =>
  egresos.value.filter(e => e.estaVencido).reduce((s, e) => s + e.monto, 0))
const cantVencidos = computed(() => egresos.value.filter(e => e.estaVencido).length)
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
            <p class="text-sm font-medium" style="color: var(--color-outline)">
              {{ totalCount }} egreso{{ totalCount !== 1 ? "s" : "" }} registrado{{ totalCount !== 1 ? "s" : "" }}
            </p>
          </div>
          <div v-if="canManage" class="flex gap-2">
            <BaseButton variant="secondary" size="default" @click="openGasto">
              <span class="material-symbols-outlined" style="font-size: 18px">payments</span>
              Gasto General
            </BaseButton>
            <BaseButton variant="secondary" size="default" @click="openHonorario">
              <span class="material-symbols-outlined" style="font-size: 18px">person_check</span>
              Honorario
            </BaseButton>
            <BaseButton variant="primary" size="default" @click="openFactura">
              <span class="material-symbols-outlined" style="font-size: 18px">receipt</span>
              Nueva Factura
            </BaseButton>
          </div>
        </div>

        <!-- KPIs -->
        <div class="grid grid-cols-3 gap-4 mb-6">
          <div class="rounded-2xl p-5" style="background-color: var(--color-surface-container-lowest); border: 1px solid rgba(196,197,213,0.2)">
            <p class="text-xs font-bold uppercase tracking-wider mb-1" style="color: var(--color-outline)">Pendiente de pago</p>
            <p class="text-2xl font-extrabold" style="color: var(--color-on-surface)">{{ formatPrice(totalPendiente) }}</p>
          </div>
          <div class="rounded-2xl p-5" style="background-color: #FEF2F2; border: 1px solid rgba(196,197,213,0.2)">
            <p class="text-xs font-bold uppercase tracking-wider mb-1" style="color: #991B1B">Monto vencido</p>
            <p class="text-2xl font-extrabold" style="color: #991B1B">{{ formatPrice(totalVencido) }}</p>
          </div>
          <div class="rounded-2xl p-5" style="background-color: var(--color-surface-container-lowest); border: 1px solid rgba(196,197,213,0.2)">
            <p class="text-xs font-bold uppercase tracking-wider mb-1" style="color: var(--color-outline)">Vencidos</p>
            <p class="text-2xl font-extrabold" style="color: var(--color-on-surface)">{{ cantVencidos }}</p>
          </div>
        </div>

        <!-- Filtros tipo -->
        <div class="flex items-center gap-3 mb-4 flex-wrap">
          <div class="flex gap-2">
            <button
              v-for="tab in tipoTabs"
              :key="tab.key"
              @click="tipoFiltro = tab.key; applyFilter()"
              class="px-5 py-2 rounded-full text-sm font-semibold transition-all"
              :style="tipoFiltro === tab.key
                ? 'background-color: var(--color-primary); color: var(--color-on-primary)'
                : 'background-color: var(--color-surface-container-high); color: var(--color-on-surface-variant)'"
            >{{ tab.label }}</button>
          </div>
          <div class="flex gap-2 ml-4">
            <button
              v-for="tab in estadoTabs"
              :key="tab.key"
              @click="estadoFiltro = tab.key; applyFilter()"
              class="px-4 py-1.5 rounded-full text-xs font-semibold transition-all"
              :style="estadoFiltro === tab.key
                ? 'background-color: var(--color-secondary); color: #fff'
                : 'background-color: var(--color-surface-container-high); color: var(--color-on-surface-variant)'"
            >{{ tab.label }}</button>
          </div>
          <button
            @click="soloVencidos = !soloVencidos; applyFilter()"
            class="ml-auto px-4 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center gap-1"
            :style="soloVencidos
              ? 'background-color: #FEE2E2; color: #991B1B'
              : 'background-color: var(--color-surface-container-high); color: var(--color-on-surface-variant)'"
          >
            <span class="material-symbols-outlined" style="font-size: 14px">schedule</span>
            Solo vencidos
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
              <span
                class="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                :style="`background-color: ${tipoColor(item.tipo).bg}`"
              >
                <span class="material-symbols-outlined" :style="`font-size: 16px; color: ${tipoColor(item.tipo).color}`">{{ tipoIcon(item.tipo) }}</span>
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

          <template #vencimiento="{ item }">
            <span v-if="item.fechaVencimiento"
              class="text-sm font-medium"
              :style="item.estaVencido ? 'color: #DC2626' : 'color: var(--color-on-surface-variant)'"
            >
              {{ formatDate(item.fechaVencimiento) }}
            </span>
            <span v-else class="text-sm" style="color: var(--color-outline)">—</span>
          </template>

          <template #estado="{ item }">
            <span
              class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold"
              :style="estadoBadgeStyle(item.estado, item.estaVencido)"
            >{{ estadoLabel(item) }}</span>
          </template>

          <template #acciones="{ item }">
            <div class="flex items-center justify-end gap-1">
              <button
                @click.stop="openDetalle(item)"
                class="w-8 h-8 rounded-full flex items-center justify-center hover:opacity-80"
                style="background-color: var(--color-surface-container-low)"
                title="Ver detalle"
              >
                <span class="material-symbols-outlined" style="font-size: 16px; color: var(--color-on-surface-variant)">visibility</span>
              </button>
              <button
                v-if="canPay(item)"
                @click.stop="openPago(item)"
                class="w-8 h-8 rounded-full flex items-center justify-center hover:opacity-80"
                style="background-color: #DCFCE7"
                title="Registrar pago"
              >
                <span class="material-symbols-outlined" style="font-size: 16px; color: #166534">payments</span>
              </button>
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
    <BaseModal :show="showDetalle" title="Detalle de Egreso" size="md" @close="showDetalle = false">
      <div v-if="detalleEgreso" class="space-y-4">
        <div class="flex items-center gap-3 pb-4" style="border-bottom: 1px solid rgba(196,197,213,0.2)">
          <span
            class="w-12 h-12 rounded-2xl flex items-center justify-center"
            :style="`background-color: ${tipoColor(detalleEgreso.tipo).bg}`"
          >
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
          <div v-if="detalleEgreso.fechaPago">
            <p class="text-xs font-bold uppercase tracking-wider mb-0.5" style="color: var(--color-outline)">Fecha de pago</p>
            <p style="color: var(--color-on-surface)">{{ formatDate(detalleEgreso.fechaPago) }}</p>
          </div>
          <div v-if="detalleEgreso.metodoPago">
            <p class="text-xs font-bold uppercase tracking-wider mb-0.5" style="color: var(--color-outline)">Método de pago</p>
            <p style="color: var(--color-on-surface)">{{ detalleEgreso.metodoPago }}</p>
          </div>

          <!-- FacturaCompra -->
          <template v-if="detalleEgreso.tipo === 'FacturaCompra'">
            <div>
              <p class="text-xs font-bold uppercase tracking-wider mb-0.5" style="color: var(--color-outline)">Proveedor</p>
              <p style="color: var(--color-on-surface)">{{ detalleEgreso.proveedorNombre ?? '—' }}</p>
            </div>
            <div v-if="detalleEgreso.nroFactura">
              <p class="text-xs font-bold uppercase tracking-wider mb-0.5" style="color: var(--color-outline)">N° Factura</p>
              <p style="color: var(--color-on-surface)">{{ detalleEgreso.nroFactura }}</p>
            </div>
          </template>

          <!-- Honorario -->
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

          <!-- GastoGeneral -->
          <template v-if="detalleEgreso.tipo === 'GastoGeneral'">
            <div>
              <p class="text-xs font-bold uppercase tracking-wider mb-0.5" style="color: var(--color-outline)">Categoría</p>
              <p style="color: var(--color-on-surface)">{{ detalleEgreso.categoriaGastoNombre ?? '—' }}</p>
            </div>
          </template>
        </div>

        <div v-if="detalleEgreso.observaciones" class="rounded-xl p-3" style="background-color: var(--color-surface-container-low)">
          <p class="text-xs font-bold uppercase tracking-wider mb-1" style="color: var(--color-outline)">Observaciones</p>
          <p class="text-sm" style="color: var(--color-on-surface)">{{ detalleEgreso.observaciones }}</p>
        </div>
      </div>

      <template #footer>
        <BaseButton v-if="detalleEgreso && canCancel(detalleEgreso)" variant="danger" size="default" @click="openAnular(detalleEgreso!)">
          Anular
        </BaseButton>
        <BaseButton v-if="detalleEgreso && canPay(detalleEgreso)" variant="primary" size="default" @click="openPago(detalleEgreso!)">
          Registrar Pago
        </BaseButton>
        <BaseButton v-if="!detalleEgreso || (!canPay(detalleEgreso) && !canCancel(detalleEgreso))" class="flex-1" variant="secondary" size="default" @click="showDetalle = false">
          Cerrar
        </BaseButton>
      </template>
    </BaseModal>

    <!-- ── MODAL NUEVA FACTURA ───────────────────────────────────────────────── -->
    <BaseModal :show="showFactura" title="Nueva Factura de Compra" size="lg" @close="showFactura = false">
      <div v-if="facturaError" class="flex items-center gap-2 rounded-xl px-3 py-2.5 mb-4 text-sm font-medium"
        style="background-color: var(--color-error-container); color: var(--color-on-error-container)">
        <span class="material-symbols-outlined flex-shrink-0" style="font-size: 16px">error</span>
        {{ facturaError }}
      </div>
      <div class="space-y-4">
        <div>
          <label class="block text-xs font-bold uppercase tracking-wider mb-1.5" style="color: var(--color-outline)">Proveedor *</label>
          <select v-model="facturaForm.proveedorId" class="w-full px-4 py-3 rounded-xl text-sm outline-none appearance-none"
            style="border: 1px solid var(--color-outline-variant); color: var(--color-on-surface); background: var(--color-surface)">
            <option :value="0" disabled>Seleccionar proveedor</option>
            <option v-for="p in proveedores" :key="p.id" :value="p.id">{{ p.nombre }}</option>
          </select>
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-xs font-bold uppercase tracking-wider mb-1.5" style="color: var(--color-outline)">N° Factura</label>
            <input v-model="facturaForm.nroFactura" type="text" placeholder="Opcional" class="w-full px-4 py-3 rounded-xl text-sm outline-none"
              style="border: 1px solid var(--color-outline-variant); color: var(--color-on-surface); background: var(--color-surface)" />
          </div>
          <div>
            <label class="block text-xs font-bold uppercase tracking-wider mb-1.5" style="color: var(--color-outline)">Monto (Gs.) *</label>
            <input v-model.number="facturaForm.monto" type="number" step="1" min="0" class="w-full px-4 py-3 rounded-xl text-sm outline-none"
              style="border: 1px solid var(--color-outline-variant); color: var(--color-on-surface); background: var(--color-surface)" />
          </div>
        </div>
        <div>
          <label class="block text-xs font-bold uppercase tracking-wider mb-1.5" style="color: var(--color-outline)">Concepto *</label>
          <input v-model="facturaForm.concepto" type="text" class="w-full px-4 py-3 rounded-xl text-sm outline-none"
            style="border: 1px solid var(--color-outline-variant); color: var(--color-on-surface); background: var(--color-surface)" />
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-xs font-bold uppercase tracking-wider mb-1.5" style="color: var(--color-outline)">Fecha de emisión *</label>
            <input v-model="facturaForm.fechaEmision" type="date" class="w-full px-4 py-3 rounded-xl text-sm outline-none"
              style="border: 1px solid var(--color-outline-variant); color: var(--color-on-surface); background: var(--color-surface)" />
          </div>
          <div>
            <label class="block text-xs font-bold uppercase tracking-wider mb-1.5" style="color: var(--color-outline)">Vencimiento</label>
            <input v-model="facturaForm.fechaVencimiento" type="date" class="w-full px-4 py-3 rounded-xl text-sm outline-none"
              style="border: 1px solid var(--color-outline-variant); color: var(--color-on-surface); background: var(--color-surface)" />
          </div>
        </div>
        <div>
          <label class="block text-xs font-bold uppercase tracking-wider mb-1.5" style="color: var(--color-outline)">Observaciones</label>
          <textarea v-model="facturaForm.observaciones" rows="2" class="w-full px-4 py-3 rounded-xl text-sm outline-none resize-none"
            style="border: 1px solid var(--color-outline-variant); color: var(--color-on-surface); background: var(--color-surface)" />
        </div>
      </div>
      <template #footer>
        <BaseButton class="flex-1" variant="secondary" size="default" @click="showFactura = false">Cancelar</BaseButton>
        <BaseButton class="flex-1" variant="primary" size="default" :disabled="isSavingFactura" @click="submitFactura">
          <svg v-if="isSavingFactura" class="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          {{ isSavingFactura ? "Guardando..." : "Crear Factura" }}
        </BaseButton>
      </template>
    </BaseModal>

    <!-- ── MODAL NUEVO HONORARIO ─────────────────────────────────────────────── -->
    <BaseModal :show="showHonorario" title="Nuevo Honorario" size="lg" @close="showHonorario = false">
      <div v-if="honorarioError" class="flex items-center gap-2 rounded-xl px-3 py-2.5 mb-4 text-sm font-medium"
        style="background-color: var(--color-error-container); color: var(--color-on-error-container)">
        <span class="material-symbols-outlined flex-shrink-0" style="font-size: 16px">error</span>
        {{ honorarioError }}
      </div>
      <div class="space-y-4">
        <div>
          <label class="block text-xs font-bold uppercase tracking-wider mb-1.5" style="color: var(--color-outline)">Profesional *</label>
          <select v-model="honorarioForm.professionalId" class="w-full px-4 py-3 rounded-xl text-sm outline-none appearance-none"
            style="border: 1px solid var(--color-outline-variant); color: var(--color-on-surface); background: var(--color-surface)">
            <option :value="0" disabled>Seleccionar profesional</option>
            <option v-for="p in profesionales" :key="p.id" :value="p.id">{{ p.firstName }} {{ p.lastName }}</option>
          </select>
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-xs font-bold uppercase tracking-wider mb-1.5" style="color: var(--color-outline)">Monto (Gs.) *</label>
            <input v-model.number="honorarioForm.monto" type="number" step="1" min="0" class="w-full px-4 py-3 rounded-xl text-sm outline-none"
              style="border: 1px solid var(--color-outline-variant); color: var(--color-on-surface); background: var(--color-surface)" />
          </div>
          <div>
            <label class="block text-xs font-bold uppercase tracking-wider mb-1.5" style="color: var(--color-outline)">Período</label>
            <input v-model="honorarioForm.periodo" type="text" placeholder="Ej: Mayo 2025" class="w-full px-4 py-3 rounded-xl text-sm outline-none"
              style="border: 1px solid var(--color-outline-variant); color: var(--color-on-surface); background: var(--color-surface)" />
          </div>
        </div>
        <div>
          <label class="block text-xs font-bold uppercase tracking-wider mb-1.5" style="color: var(--color-outline)">Concepto *</label>
          <input v-model="honorarioForm.concepto" type="text" class="w-full px-4 py-3 rounded-xl text-sm outline-none"
            style="border: 1px solid var(--color-outline-variant); color: var(--color-on-surface); background: var(--color-surface)" />
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-xs font-bold uppercase tracking-wider mb-1.5" style="color: var(--color-outline)">Fecha de emisión *</label>
            <input v-model="honorarioForm.fechaEmision" type="date" class="w-full px-4 py-3 rounded-xl text-sm outline-none"
              style="border: 1px solid var(--color-outline-variant); color: var(--color-on-surface); background: var(--color-surface)" />
          </div>
          <div>
            <label class="block text-xs font-bold uppercase tracking-wider mb-1.5" style="color: var(--color-outline)">Vencimiento</label>
            <input v-model="honorarioForm.fechaVencimiento" type="date" class="w-full px-4 py-3 rounded-xl text-sm outline-none"
              style="border: 1px solid var(--color-outline-variant); color: var(--color-on-surface); background: var(--color-surface)" />
          </div>
        </div>
        <div>
          <label class="block text-xs font-bold uppercase tracking-wider mb-1.5" style="color: var(--color-outline)">Observaciones</label>
          <textarea v-model="honorarioForm.observaciones" rows="2" class="w-full px-4 py-3 rounded-xl text-sm outline-none resize-none"
            style="border: 1px solid var(--color-outline-variant); color: var(--color-on-surface); background: var(--color-surface)" />
        </div>
      </div>
      <template #footer>
        <BaseButton class="flex-1" variant="secondary" size="default" @click="showHonorario = false">Cancelar</BaseButton>
        <BaseButton class="flex-1" variant="primary" size="default" :disabled="isSavingHonorario" @click="submitHonorario">
          <svg v-if="isSavingHonorario" class="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          {{ isSavingHonorario ? "Guardando..." : "Crear Honorario" }}
        </BaseButton>
      </template>
    </BaseModal>

    <!-- ── MODAL NUEVO GASTO GENERAL ─────────────────────────────────────────── -->
    <BaseModal :show="showGasto" title="Nuevo Gasto General" size="lg" @close="showGasto = false">
      <div v-if="gastoError" class="flex items-center gap-2 rounded-xl px-3 py-2.5 mb-4 text-sm font-medium"
        style="background-color: var(--color-error-container); color: var(--color-on-error-container)">
        <span class="material-symbols-outlined flex-shrink-0" style="font-size: 16px">error</span>
        {{ gastoError }}
      </div>
      <div class="space-y-4">
        <div>
          <label class="block text-xs font-bold uppercase tracking-wider mb-1.5" style="color: var(--color-outline)">Categoría *</label>
          <select v-model="gastoForm.categoriaGastoId" class="w-full px-4 py-3 rounded-xl text-sm outline-none appearance-none"
            style="border: 1px solid var(--color-outline-variant); color: var(--color-on-surface); background: var(--color-surface)">
            <option :value="0" disabled>Seleccionar categoría</option>
            <option v-for="c in categorias.filter(c => c.activo)" :key="c.id" :value="c.id">{{ c.nombre }}</option>
          </select>
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-xs font-bold uppercase tracking-wider mb-1.5" style="color: var(--color-outline)">Monto (Gs.) *</label>
            <input v-model.number="gastoForm.monto" type="number" step="1" min="0" class="w-full px-4 py-3 rounded-xl text-sm outline-none"
              style="border: 1px solid var(--color-outline-variant); color: var(--color-on-surface); background: var(--color-surface)" />
          </div>
          <div>
            <label class="block text-xs font-bold uppercase tracking-wider mb-1.5" style="color: var(--color-outline)">Fecha de emisión *</label>
            <input v-model="gastoForm.fechaEmision" type="date" class="w-full px-4 py-3 rounded-xl text-sm outline-none"
              style="border: 1px solid var(--color-outline-variant); color: var(--color-on-surface); background: var(--color-surface)" />
          </div>
        </div>
        <div>
          <label class="block text-xs font-bold uppercase tracking-wider mb-1.5" style="color: var(--color-outline)">Concepto *</label>
          <input v-model="gastoForm.concepto" type="text" class="w-full px-4 py-3 rounded-xl text-sm outline-none"
            style="border: 1px solid var(--color-outline-variant); color: var(--color-on-surface); background: var(--color-surface)" />
        </div>
        <div>
          <label class="block text-xs font-bold uppercase tracking-wider mb-1.5" style="color: var(--color-outline)">Vencimiento</label>
          <input v-model="gastoForm.fechaVencimiento" type="date" class="w-full px-4 py-3 rounded-xl text-sm outline-none"
            style="border: 1px solid var(--color-outline-variant); color: var(--color-on-surface); background: var(--color-surface)" />
        </div>
        <div>
          <label class="block text-xs font-bold uppercase tracking-wider mb-1.5" style="color: var(--color-outline)">Observaciones</label>
          <textarea v-model="gastoForm.observaciones" rows="2" class="w-full px-4 py-3 rounded-xl text-sm outline-none resize-none"
            style="border: 1px solid var(--color-outline-variant); color: var(--color-on-surface); background: var(--color-surface)" />
        </div>
      </div>
      <template #footer>
        <BaseButton class="flex-1" variant="secondary" size="default" @click="showGasto = false">Cancelar</BaseButton>
        <BaseButton class="flex-1" variant="primary" size="default" :disabled="isSavingGasto" @click="submitGasto">
          <svg v-if="isSavingGasto" class="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          {{ isSavingGasto ? "Guardando..." : "Crear Gasto" }}
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
            style="border: 1px solid var(--color-outline-variant); color: var(--color-on-surface); background: var(--color-surface)">
            <option value="Efectivo">Efectivo</option>
            <option value="Tarjeta">Tarjeta</option>
            <option value="Transferencia">Transferencia</option>
            <option value="Cheque">Cheque</option>
          </select>
        </div>
        <div>
          <label class="block text-xs font-bold uppercase tracking-wider mb-1.5" style="color: var(--color-outline)">Fecha de pago *</label>
          <input v-model="pagoForm.fechaPago" type="date" class="w-full px-4 py-3 rounded-xl text-sm outline-none"
            style="border: 1px solid var(--color-outline-variant); color: var(--color-on-surface); background: var(--color-surface)" />
        </div>
      </div>
      <template #footer>
        <BaseButton class="flex-1" variant="secondary" size="default" @click="showPago = false">Cancelar</BaseButton>
        <BaseButton class="flex-1" variant="primary" size="default" :disabled="isSavingPago" @click="submitPago">
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
          style="border: 1px solid var(--color-outline-variant); color: var(--color-on-surface); background: var(--color-surface)" />
      </div>
      <template #footer>
        <BaseButton class="flex-1" variant="secondary" size="default" @click="showAnular = false">Cancelar</BaseButton>
        <BaseButton class="flex-1" variant="danger" size="default" :disabled="isSavingAnular" @click="submitAnular">
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
