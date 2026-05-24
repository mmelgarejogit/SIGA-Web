<script setup lang="ts">
import { ref, reactive, computed, onMounted } from "vue"
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
  type CategoriaGasto,
  type MetodoPago,
  getEgresos,
  crearFacturaCompra,
  crearHonorario,
  crearGastoGeneral,
  registrarPago,
  anularEgreso,
  getCategorias,
  crearCategoria,
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

const tipoFiltros = ref<string[]>([])
const estadoFiltros = ref<string[]>([])
const soloVencidos = ref(false)

const tipoOptions = [
  { value: "FacturaCompra", label: "Factura" },
  { value: "Honorario", label: "Honorario" },
  { value: "GastoGeneral", label: "Gasto General" },
]

const estadoOptions = [
  { value: "Pendiente", label: "Pendiente", dot: "#92400E" },
  { value: "Pagado", label: "Pagado", dot: "#166534" },
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
  { key: "vencimiento", label: "Vencimiento" },
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

// ── Modal nuevo egreso (unificado) ────────────────────────────────────────────

type TipoNuevo = "FacturaCompra" | "Honorario" | "GastoGeneral"

const tiposNuevo: { key: TipoNuevo; label: string; icon: string }[] = [
  { key: "FacturaCompra", label: "Factura de Compra", icon: "receipt" },
  { key: "Honorario", label: "Honorario", icon: "person_check" },
  { key: "GastoGeneral", label: "Gasto General", icon: "payments" },
]

const showNuevoEgreso = ref(false)
const isSavingNuevo = ref(false)
const nuevoError = ref("")
const nuevoForm = reactive({
  tipo: "FacturaCompra" as TipoNuevo,
  // Honorario / GastoGeneral
  monto: 0,
  concepto: "",
  observaciones: "",
  fechaEmision: new Date().toISOString().slice(0, 10),
  fechaVencimiento: "",
  // FacturaCompra
  proveedorId: 0,
  nroFactura: "",
  montoExento: 0,
  montoGravado5: 0,
  montoGravado10: 0,
  condicionVenta: "Contado" as "Contado" | "Credito",
  // Honorario
  professionalId: 0,
  periodo: "",
  // GastoGeneral
  categoriaGastoId: 0,
})

const iva5Preview = computed(() => Math.round(nuevoForm.montoGravado5 / 21))
const iva10Preview = computed(() => Math.round(nuevoForm.montoGravado10 / 11))
const totalPreview = computed(() => nuevoForm.montoExento + nuevoForm.montoGravado5 + nuevoForm.montoGravado10)

function openNuevoEgreso() {
  Object.assign(nuevoForm, {
    tipo: "FacturaCompra" as TipoNuevo,
    monto: 0,
    concepto: "",
    observaciones: "",
    fechaEmision: new Date().toISOString().slice(0, 10),
    fechaVencimiento: "",
    proveedorId: 0,
    nroFactura: "",
    montoExento: 0,
    montoGravado5: 0,
    montoGravado10: 0,
    condicionVenta: "Contado" as "Contado" | "Credito",
    professionalId: 0,
    periodo: "",
    categoriaGastoId: 0,
  })
  nuevoError.value = ""
  showNuevoEgreso.value = true
}

async function submitNuevoEgreso() {
  nuevoError.value = ""
  if (!nuevoForm.concepto.trim()) { nuevoError.value = "El concepto es obligatorio."; return }
  if (nuevoForm.tipo === "FacturaCompra") {
    if (!nuevoForm.proveedorId) { nuevoError.value = "Seleccioná un proveedor."; return }
    if (totalPreview.value <= 0) { nuevoError.value = "Al menos un monto (Exento, Gravado 5% o Gravado 10%) debe ser mayor a 0."; return }
  } else {
    if (!nuevoForm.monto || nuevoForm.monto <= 0) { nuevoError.value = "El monto debe ser mayor a 0."; return }
  }
  if (nuevoForm.tipo === "Honorario" && !nuevoForm.professionalId) { nuevoError.value = "Seleccioná un profesional."; return }
  if (nuevoForm.tipo === "GastoGeneral" && !nuevoForm.categoriaGastoId) { nuevoError.value = "Seleccioná una categoría."; return }

  isSavingNuevo.value = true
  try {
    const commonBase = {
      concepto: nuevoForm.concepto.trim(),
      observaciones: nuevoForm.observaciones.trim() || undefined,
      fechaEmision: nuevoForm.fechaEmision,
      fechaVencimiento: nuevoForm.fechaVencimiento || undefined,
    }
    if (nuevoForm.tipo === "FacturaCompra") {
      await crearFacturaCompra({
        ...commonBase,
        proveedorId: nuevoForm.proveedorId,
        nroFactura: nuevoForm.nroFactura.trim() || undefined,
        montoExento: nuevoForm.montoExento,
        montoGravado5: nuevoForm.montoGravado5,
        montoGravado10: nuevoForm.montoGravado10,
        condicionVenta: nuevoForm.condicionVenta,
      })
    } else if (nuevoForm.tipo === "Honorario") {
      await crearHonorario({
        ...commonBase,
        monto: nuevoForm.monto,
        professionalId: nuevoForm.professionalId,
        periodo: nuevoForm.periodo.trim() || undefined,
      })
    } else {
      await crearGastoGeneral({
        ...commonBase,
        monto: nuevoForm.monto,
        categoriaGastoId: nuevoForm.categoriaGastoId,
      })
    }
    showNuevoEgreso.value = false
    await load()
  } catch (err: unknown) {
    nuevoError.value = err instanceof Error ? err.message : "Error al crear egreso."
  } finally {
    isSavingNuevo.value = false
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

// ── Menú contextual de fila ───────────────────────────────────────────────────

function canPay(e: Egreso) {
  return canManage && e.estado !== "Pagado" && e.estado !== "Anulado"
}

function canCancel(e: Egreso) {
  return canManage && e.estado !== "Pagado" && e.estado !== "Anulado"
}

function menuItems(e: Egreso): ContextMenuItem[] {
  const hasActions = canPay(e) || canCancel(e)
  return [
    { type: "item", label: "Ver detalle", icon: "visibility", action: () => openDetalle(e) },
    ...(hasActions ? [{ type: "separator" } as ContextMenuItem] : []),
    { type: "item", label: "Registrar pago", icon: "payments", action: () => openPago(e), hidden: !canPay(e) },
    { type: "item", label: "Anular egreso", icon: "cancel", action: () => openAnular(e), hidden: !canCancel(e), danger: true },
  ]
}

// ── Modal nueva categoría (acceso rápido desde nuevo egreso) ─────────────────

const showCategoriaModal = ref(false)
const isCatSaving = ref(false)
const catError = ref("")
const catForm = reactive({ nombre: "", descripcion: "" })

function openCreateCategoria() {
  Object.assign(catForm, { nombre: "", descripcion: "" })
  catError.value = ""
  showCategoriaModal.value = true
}

async function submitCategoria() {
  if (!catForm.nombre.trim()) { catError.value = "El nombre es obligatorio."; return }
  isCatSaving.value = true
  catError.value = ""
  try {
    const nueva = await crearCategoria({
      nombre: catForm.nombre.trim(),
      descripcion: catForm.descripcion.trim() || undefined,
    })
    categorias.value = [...categorias.value, nueva]
    nuevoForm.categoriaGastoId = nueva.id
    showCategoriaModal.value = false
  } catch (err: unknown) {
    catError.value = err instanceof Error ? err.message : "Error al crear categoría."
  } finally {
    isCatSaving.value = false
  }
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
            <p class="font-medium" style="color: var(--color-on-surface-variant)">
              {{ totalCount }} egreso{{ totalCount !== 1 ? "s" : "" }} registrado{{ totalCount !== 1 ? "s" : "" }}
            </p>
          </div>
          <BaseButton v-if="canManage" variant="primary" size="lg" @click="openNuevoEgreso">
            <span class="material-symbols-outlined" style="width:20px;height:20px;font-size:20px">add</span>
            Nuevo Egreso
          </BaseButton>
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

        <!-- Filtros -->
        <div class="flex items-center gap-3 mb-6 flex-wrap">
          <FilterChips
            :options="tipoOptions"
            :modelValue="tipoFiltros"
            placeholder="Tipo"
            @update:modelValue="setTipoFiltro"
          />
          <FilterChips
            :options="estadoOptions"
            :modelValue="estadoFiltros"
            placeholder="Estado"
            @update:modelValue="setEstadoFiltro"
          />
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
              <span
                class="w-9 h-9 rounded-full flex-shrink-0"
                :style="`background-color: ${tipoColor(item.tipo).bg}; display: flex; align-items: center; justify-content: center`"
              >
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

          <template v-if="detalleEgreso.tipo === 'FacturaCompra'">
            <div>
              <p class="text-xs font-bold uppercase tracking-wider mb-0.5" style="color: var(--color-outline)">Proveedor</p>
              <p style="color: var(--color-on-surface)">{{ detalleEgreso.proveedorNombre ?? '—' }}</p>
            </div>
            <div v-if="detalleEgreso.nroFactura">
              <p class="text-xs font-bold uppercase tracking-wider mb-0.5" style="color: var(--color-outline)">N° Factura</p>
              <p class="font-mono" style="color: var(--color-on-surface)">{{ detalleEgreso.nroFactura }}</p>
            </div>
            <div v-if="detalleEgreso.condicionVenta">
              <p class="text-xs font-bold uppercase tracking-wider mb-0.5" style="color: var(--color-outline)">Condición</p>
              <p style="color: var(--color-on-surface)">{{ detalleEgreso.condicionVenta }}</p>
            </div>
          </template>

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
        </div>

        <!-- Desglose fiscal FacturaCompra -->
        <div v-if="detalleEgreso.tipo === 'FacturaCompra' && detalleEgreso.montoTotal != null"
          class="rounded-xl p-4" style="background-color: var(--color-surface-container-low)">
          <p class="text-xs font-bold uppercase tracking-wider mb-3" style="color: var(--color-primary)">Desglose fiscal</p>
          <div class="space-y-1.5 text-sm">
            <div class="flex justify-between">
              <span style="color: var(--color-on-surface-variant)">Monto exento</span>
              <span class="font-medium" style="color: var(--color-on-surface)">{{ formatPrice(detalleEgreso.montoExento ?? 0) }}</span>
            </div>
            <div class="flex justify-between">
              <span style="color: var(--color-on-surface-variant)">Gravado 5%</span>
              <span class="font-medium" style="color: var(--color-on-surface)">{{ formatPrice(detalleEgreso.montoGravado5 ?? 0) }}</span>
            </div>
            <div class="flex justify-between">
              <span style="color: var(--color-on-surface-variant)">IVA 5%</span>
              <span class="font-medium" style="color: var(--color-on-surface)">{{ formatPrice(detalleEgreso.iva5 ?? 0) }}</span>
            </div>
            <div class="flex justify-between">
              <span style="color: var(--color-on-surface-variant)">Gravado 10%</span>
              <span class="font-medium" style="color: var(--color-on-surface)">{{ formatPrice(detalleEgreso.montoGravado10 ?? 0) }}</span>
            </div>
            <div class="flex justify-between">
              <span style="color: var(--color-on-surface-variant)">IVA 10%</span>
              <span class="font-medium" style="color: var(--color-on-surface)">{{ formatPrice(detalleEgreso.iva10 ?? 0) }}</span>
            </div>
            <div class="flex justify-between pt-1.5" style="border-top: 1px solid rgba(196,197,213,0.3)">
              <span class="font-bold" style="color: var(--color-primary)">Total</span>
              <span class="font-bold" style="color: var(--color-primary)">{{ formatPrice(detalleEgreso.montoTotal ?? 0) }}</span>
            </div>
          </div>
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
        <BaseButton v-if="!detalleEgreso || (!canPay(detalleEgreso) && !canCancel(detalleEgreso))" variant="secondary" size="default" @click="showDetalle = false">
          Cerrar
        </BaseButton>
      </template>
    </BaseModal>

    <!-- ── MODAL NUEVO EGRESO ────────────────────────────────────────────────── -->
    <BaseModal :show="showNuevoEgreso" title="Nuevo Egreso" size="lg" @close="showNuevoEgreso = false">
      <div v-if="nuevoError" class="flex items-center gap-2 rounded-xl px-3 py-2.5 mb-4 text-sm font-medium"
        style="background-color: var(--color-error-container); color: var(--color-on-error-container)">
        <span class="material-symbols-outlined flex-shrink-0" style="font-size: 16px">error</span>
        {{ nuevoError }}
      </div>

      <!-- Selector de tipo -->
      <div class="grid grid-cols-3 gap-3 mb-6">
        <button
          v-for="t in tiposNuevo"
          :key="t.key"
          @click="nuevoForm.tipo = t.key"
          class="flex flex-col items-center gap-2 px-4 py-4 rounded-2xl transition-all"
          :style="nuevoForm.tipo === t.key
            ? `background-color: ${tipoColor(t.key).bg}; border: 2px solid ${tipoColor(t.key).color}`
            : 'background-color: var(--color-surface-container-low); border: 2px solid transparent'"
        >
          <span
            class="w-10 h-10 rounded-full flex items-center justify-center"
            :style="`background-color: ${nuevoForm.tipo === t.key ? tipoColor(t.key).color : 'var(--color-surface-container-high)'}`"
          >
            <span class="material-symbols-outlined" :style="`font-size: 20px; color: ${nuevoForm.tipo === t.key ? '#fff' : 'var(--color-on-surface-variant)'}`">{{ t.icon }}</span>
          </span>
          <span class="text-xs font-bold text-center leading-tight" :style="`color: ${nuevoForm.tipo === t.key ? tipoColor(t.key).color : 'var(--color-on-surface-variant)'}`">
            {{ t.label }}
          </span>
        </button>
      </div>

      <div class="space-y-4">
        <!-- Campo específico por tipo -->
        <div v-if="nuevoForm.tipo === 'FacturaCompra'">
          <label class="block text-xs font-bold uppercase tracking-wider mb-1.5" style="color: var(--color-outline)">Proveedor *</label>
          <select v-model="nuevoForm.proveedorId" class="w-full px-4 py-3 rounded-xl text-sm outline-none appearance-none"
            style="border: 1px solid var(--color-outline-variant); color: var(--color-on-surface); background-color: var(--color-surface-container-low)">
            <option :value="0" disabled>Seleccionar proveedor</option>
            <option v-for="p in proveedores" :key="p.id" :value="p.id">{{ p.nombre }}</option>
          </select>
        </div>

        <div v-if="nuevoForm.tipo === 'Honorario'">
          <label class="block text-xs font-bold uppercase tracking-wider mb-1.5" style="color: var(--color-outline)">Profesional *</label>
          <select v-model="nuevoForm.professionalId" class="w-full px-4 py-3 rounded-xl text-sm outline-none appearance-none"
            style="border: 1px solid var(--color-outline-variant); color: var(--color-on-surface); background-color: var(--color-surface-container-low)">
            <option :value="0" disabled>Seleccionar profesional</option>
            <option v-for="p in profesionales" :key="p.id" :value="p.id">{{ p.firstName }} {{ p.lastName }}</option>
          </select>
        </div>

        <div v-if="nuevoForm.tipo === 'GastoGeneral'">
          <label class="block text-xs font-bold uppercase tracking-wider mb-1.5" style="color: var(--color-outline)">Categoría *</label>
          <div class="flex gap-2">
            <select v-model="nuevoForm.categoriaGastoId" class="flex-1 px-4 py-3 rounded-xl text-sm outline-none appearance-none"
              style="border: 1px solid var(--color-outline-variant); color: var(--color-on-surface); background-color: var(--color-surface-container-low)">
              <option :value="0" disabled>Seleccionar categoría</option>
              <option v-for="c in categorias.filter(c => c.activo)" :key="c.id" :value="c.id">{{ c.nombre }}</option>
            </select>
            <button
              type="button"
              @click="openCreateCategoria"
              class="flex-shrink-0 w-12 rounded-xl flex items-center justify-center transition-colors hover:opacity-80"
              style="background-color: var(--color-surface-container-low); border: 1px solid var(--color-outline-variant)"
              title="Agregar nueva categoría"
            >
              <span class="material-symbols-outlined" style="font-size: 20px; color: var(--color-primary)">add</span>
            </button>
          </div>
        </div>

        <!-- Campos extra por tipo -->
        <template v-if="nuevoForm.tipo === 'FacturaCompra'">
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-bold uppercase tracking-wider mb-1.5" style="color: var(--color-outline)">N° Factura</label>
              <input v-model="nuevoForm.nroFactura" type="text" placeholder="001-001-0000001" class="w-full px-4 py-3 rounded-xl text-sm outline-none font-mono"
                style="border: 1px solid var(--color-outline-variant); color: var(--color-on-surface); background-color: var(--color-surface-container-low)" />
            </div>
            <div>
              <label class="block text-xs font-bold uppercase tracking-wider mb-1.5" style="color: var(--color-outline)">Condición *</label>
              <select v-model="nuevoForm.condicionVenta" class="w-full px-4 py-3 rounded-xl text-sm outline-none appearance-none"
                style="border: 1px solid var(--color-outline-variant); color: var(--color-on-surface); background-color: var(--color-surface-container-low)">
                <option value="Contado">Contado</option>
                <option value="Credito">Crédito</option>
              </select>
            </div>
          </div>

          <p class="text-xs font-bold uppercase tracking-wider pt-1" style="color: var(--color-primary)">Desglose fiscal (Gs.)</p>

          <div class="grid grid-cols-3 gap-3">
            <div>
              <label class="block text-xs font-bold uppercase tracking-wider mb-1.5" style="color: var(--color-outline)">Exento</label>
              <input v-model.number="nuevoForm.montoExento" type="number" step="1" min="0" class="w-full px-4 py-3 rounded-xl text-sm outline-none"
                style="border: 1px solid var(--color-outline-variant); color: var(--color-on-surface); background-color: var(--color-surface-container-low)" />
            </div>
            <div>
              <label class="block text-xs font-bold uppercase tracking-wider mb-1.5" style="color: var(--color-outline)">Gravado 5%</label>
              <input v-model.number="nuevoForm.montoGravado5" type="number" step="1" min="0" class="w-full px-4 py-3 rounded-xl text-sm outline-none"
                style="border: 1px solid var(--color-outline-variant); color: var(--color-on-surface); background-color: var(--color-surface-container-low)" />
            </div>
            <div>
              <label class="block text-xs font-bold uppercase tracking-wider mb-1.5" style="color: var(--color-outline)">Gravado 10%</label>
              <input v-model.number="nuevoForm.montoGravado10" type="number" step="1" min="0" class="w-full px-4 py-3 rounded-xl text-sm outline-none"
                style="border: 1px solid var(--color-outline-variant); color: var(--color-on-surface); background-color: var(--color-surface-container-low)" />
            </div>
          </div>

          <!-- Preview IVA -->
          <div v-if="totalPreview > 0" class="rounded-xl p-4 grid grid-cols-3 gap-2 text-center" style="background-color: var(--color-surface-container-low)">
            <div>
              <p class="text-xs font-bold uppercase tracking-wider mb-0.5" style="color: var(--color-outline)">IVA 5%</p>
              <p class="text-sm font-bold" style="color: var(--color-on-surface)">{{ formatPrice(iva5Preview) }}</p>
            </div>
            <div>
              <p class="text-xs font-bold uppercase tracking-wider mb-0.5" style="color: var(--color-outline)">IVA 10%</p>
              <p class="text-sm font-bold" style="color: var(--color-on-surface)">{{ formatPrice(iva10Preview) }}</p>
            </div>
            <div>
              <p class="text-xs font-bold uppercase tracking-wider mb-0.5" style="color: var(--color-primary)">Total</p>
              <p class="text-sm font-bold" style="color: var(--color-primary)">{{ formatPrice(totalPreview) }}</p>
            </div>
          </div>
        </template>

        <div v-if="nuevoForm.tipo === 'Honorario'">
          <label class="block text-xs font-bold uppercase tracking-wider mb-1.5" style="color: var(--color-outline)">Período</label>
          <input v-model="nuevoForm.periodo" type="text" placeholder="Ej: Mayo 2025" class="w-full px-4 py-3 rounded-xl text-sm outline-none"
            style="border: 1px solid var(--color-outline-variant); color: var(--color-on-surface); background-color: var(--color-surface-container-low)" />
        </div>

        <!-- Campos comunes -->
        <div>
          <label class="block text-xs font-bold uppercase tracking-wider mb-1.5" style="color: var(--color-outline)">Concepto *</label>
          <input v-model="nuevoForm.concepto" type="text" class="w-full px-4 py-3 rounded-xl text-sm outline-none"
            style="border: 1px solid var(--color-outline-variant); color: var(--color-on-surface); background-color: var(--color-surface-container-low)" />
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div v-if="nuevoForm.tipo !== 'FacturaCompra'">
            <label class="block text-xs font-bold uppercase tracking-wider mb-1.5" style="color: var(--color-outline)">Monto (Gs.) *</label>
            <input v-model.number="nuevoForm.monto" type="number" step="1" min="0" class="w-full px-4 py-3 rounded-xl text-sm outline-none"
              style="border: 1px solid var(--color-outline-variant); color: var(--color-on-surface); background-color: var(--color-surface-container-low)" />
          </div>
          <div :class="nuevoForm.tipo !== 'FacturaCompra' ? '' : 'col-span-2'">
            <label class="block text-xs font-bold uppercase tracking-wider mb-1.5" style="color: var(--color-outline)">Fecha de emisión *</label>
            <input v-model="nuevoForm.fechaEmision" type="date" class="w-full px-4 py-3 rounded-xl text-sm outline-none"
              style="border: 1px solid var(--color-outline-variant); color: var(--color-on-surface); background-color: var(--color-surface-container-low)" />
          </div>
        </div>

        <div>
          <label class="block text-xs font-bold uppercase tracking-wider mb-1.5" style="color: var(--color-outline)">Vencimiento</label>
          <input v-model="nuevoForm.fechaVencimiento" type="date" class="w-full px-4 py-3 rounded-xl text-sm outline-none"
            style="border: 1px solid var(--color-outline-variant); color: var(--color-on-surface); background-color: var(--color-surface-container-low)" />
        </div>

        <div>
          <label class="block text-xs font-bold uppercase tracking-wider mb-1.5" style="color: var(--color-outline)">Observaciones</label>
          <textarea v-model="nuevoForm.observaciones" rows="2" class="w-full px-4 py-3 rounded-xl text-sm outline-none resize-none"
            style="border: 1px solid var(--color-outline-variant); color: var(--color-on-surface); background-color: var(--color-surface-container-low)" />
        </div>
      </div>

      <template #footer>
        <BaseButton variant="secondary" size="default" @click="showNuevoEgreso = false">Cancelar</BaseButton>
        <BaseButton variant="primary" size="default" :disabled="isSavingNuevo" @click="submitNuevoEgreso">
          <svg v-if="isSavingNuevo" class="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          {{ isSavingNuevo ? "Guardando..." : "Crear Egreso" }}
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
      </div>
      <template #footer>
        <BaseButton variant="secondary" size="default" @click="showPago = false">Cancelar</BaseButton>
        <BaseButton variant="primary" size="default" :disabled="isSavingPago" @click="submitPago">
          <svg v-if="isSavingPago" class="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          {{ isSavingPago ? "Registrando..." : "Confirmar Pago" }}
        </BaseButton>
      </template>
    </BaseModal>

    <!-- ── MODAL NUEVA CATEGORÍA (acceso rápido) ────────────────────────────── -->
    <BaseModal :show="showCategoriaModal" title="Nueva Categoría" size="sm" @close="showCategoriaModal = false">
      <div v-if="catError" class="flex items-center gap-2 rounded-xl px-3 py-2.5 mb-4 text-sm font-medium"
        style="background-color: var(--color-error-container); color: var(--color-on-error-container)">
        <span class="material-symbols-outlined flex-shrink-0" style="font-size: 16px">error</span>
        {{ catError }}
      </div>
      <div class="space-y-4">
        <div>
          <label class="block text-xs font-bold uppercase tracking-wider mb-1.5" style="color: var(--color-outline)">Nombre *</label>
          <input v-model="catForm.nombre" type="text" class="w-full px-4 py-3 rounded-xl text-sm outline-none"
            style="border: 1px solid var(--color-outline-variant); color: var(--color-on-surface); background-color: var(--color-surface-container-low)" />
        </div>
        <div>
          <label class="block text-xs font-bold uppercase tracking-wider mb-1.5" style="color: var(--color-outline)">Descripción</label>
          <input v-model="catForm.descripcion" type="text" placeholder="Opcional" class="w-full px-4 py-3 rounded-xl text-sm outline-none"
            style="border: 1px solid var(--color-outline-variant); color: var(--color-on-surface); background-color: var(--color-surface-container-low)" />
        </div>
      </div>
      <template #footer>
        <BaseButton variant="secondary" size="default" @click="showCategoriaModal = false">Cancelar</BaseButton>
        <BaseButton variant="primary" size="default" :disabled="isCatSaving" @click="submitCategoria">
          <svg v-if="isCatSaving" class="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          {{ isCatSaving ? "Creando..." : "Crear Categoría" }}
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
        <BaseButton variant="secondary" size="default" @click="showAnular = false">Cancelar</BaseButton>
        <BaseButton variant="danger" size="default" :disabled="isSavingAnular" @click="submitAnular">
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
