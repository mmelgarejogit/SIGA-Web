<script setup lang="ts">
import { ref, computed, reactive, onMounted } from "vue"
import { useRouter } from "vue-router"
import AppSidebar from "@/components/AppSidebar.vue"
import AppHeader from "@/components/AppHeader.vue"
import FilterChips from "@/components/FilterChips.vue"
import SearchInput from "@/components/SearchInput.vue"
import BaseButton from "@/components/BaseButton.vue"
import {
  getFacturasCompra,
  registrarFacturaDirecta,
  anularFactura,
  getComprasPedidos,
  type FacturaCompraItem,
  type RegistrarFacturaDirectaRequest,
} from "@/services/comprasService"
import { getProveedores, type Proveedor } from "@/services/inventarioService"

const router = useRouter()

// ── Estado de lista ──────────────────────────────────────────────────────────
const facturas = ref<FacturaCompraItem[]>([])
const totalCount = ref(0)
const currentPage = ref(1)
const pageSize = 20
const isLoading = ref(false)

// ── Filtros ──────────────────────────────────────────────────────────────────
const filtroEstado = ref<string[]>([])
const filtroCondicion = ref<string[]>([])
const filtroOrigen = ref<string[]>([])
const filtroProveedorId = ref<number | undefined>(undefined)
const filtroFechaDesde = ref("")
const filtroFechaHasta = ref("")
const search = ref("")

const estadoOpciones = [
  { value: "vigente", label: "Vigente", dot: "#16a34a" },
  { value: "anulada", label: "Anulada", dot: "#6b7280" },
]
const condicionOpciones = [
  { value: "Contado", label: "Contado", dot: "#0369a1" },
  { value: "Credito", label: "Crédito", dot: "#7c3aed" },
]
const origenOpciones = [
  { value: "ConOC", label: "Con OC", dot: "#1d4ed8" },
  { value: "Directa", label: "Directa", dot: "#9333ea" },
]

// ── Proveedores para filtro/form ─────────────────────────────────────────────
const proveedores = ref<Proveedor[]>([])

onMounted(async () => {
  await loadProveedores()
  await loadFacturas()
})

async function loadProveedores() {
  try {
    const r = await getProveedores({ pageSize: 200 })
    proveedores.value = Array.isArray(r) ? r : (r.items ?? [])
  } catch { /* sin proveedor filter */ }
}

async function loadFacturas() {
  isLoading.value = true
  try {
    const r = await getFacturasCompra({
      proveedorId: filtroProveedorId.value,
      condicionVenta: filtroCondicion.value[0],
      estado: filtroEstado.value[0],
      origen: filtroOrigen.value[0],
      fechaDesde: filtroFechaDesde.value || undefined,
      fechaHasta: filtroFechaHasta.value || undefined,
      search: search.value || undefined,
      page: currentPage.value,
      pageSize,
    })
    facturas.value = r.items
    totalCount.value = r.totalCount
  } catch {
    facturas.value = []
  } finally {
    isLoading.value = false
  }
}

function applyFilters() {
  currentPage.value = 1
  loadFacturas()
}

function clearFiltroFechas() {
  filtroFechaDesde.value = ""
  filtroFechaHasta.value = ""
  applyFilters()
}

// ── Formato ──────────────────────────────────────────────────────────────────
function formatDate(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("es-PY", {
    day: "2-digit", month: "short", year: "numeric",
  })
}
function formatMonto(n: number) {
  return new Intl.NumberFormat("es-PY", { style: "currency", currency: "PYG", minimumFractionDigits: 0 }).format(n)
}

function estadoBadge(estado: string) {
  if (estado === "Anulado") return { text: "Anulada", bg: "#F3F4F6", color: "#6B7280", border: "#D1D5DB" }
  if (estado === "Pagado")  return { text: "Pagada",  bg: "#DCFCE7", color: "#16a34a", border: "#BBF7D0" }
  return { text: "Vigente", bg: "#FEF3C7", color: "#92400E", border: "#FDE68A" }
}

function origenBadge(f: FacturaCompraItem) {
  return f.pedidoProveedorId
    ? { text: "Con OC",  bg: "#DBEAFE", color: "#1d4ed8" }
    : { text: "Directa", bg: "#F3E8FF", color: "#7c3aed" }
}

// ── Modal Nueva Factura ──────────────────────────────────────────────────────
const showNuevaModal = ref(false)
const origen = ref<"ConOC" | "Directa">("Directa")
const pedidosConfirmados = ref<{ id: number; nro: string; proveedorNombre: string }[]>([])
const loadingOCs = ref(false)

const form = reactive<RegistrarFacturaDirectaRequest & { pedidoId?: number }>({
  proveedorId: 0,
  nroFactura: "",
  fechaEmision: "",
  fechaVencimiento: "",
  montoExento: 0,
  montoGravado5: 0,
  montoGravado10: 0,
  condicionVenta: "Contado",
  observaciones: "",
  pedidoId: undefined,
})

const montoTotal = computed(() => form.montoExento + form.montoGravado5 + form.montoGravado10)
const iva5 = computed(() => Math.round(form.montoGravado5 / 21))
const iva10 = computed(() => Math.round(form.montoGravado10 / 11))

const formError = ref("")
const isSaving = ref(false)

async function openNuevaModal() {
  origen.value = "Directa"
  Object.assign(form, {
    proveedorId: 0,
    nroFactura: "",
    fechaEmision: new Date().toISOString().slice(0, 10),
    fechaVencimiento: "",
    montoExento: 0,
    montoGravado5: 0,
    montoGravado10: 0,
    condicionVenta: "Contado",
    observaciones: "",
    pedidoId: undefined,
  })
  formError.value = ""
  showNuevaModal.value = true

  // Pre-cargar OCs confirmadas
  loadingOCs.value = true
  try {
    const r = await getComprasPedidos({ estado: "Confirmada", pageSize: 100 })
    pedidosConfirmados.value = r.items.map(p => ({
      id: p.id,
      nro: `OC #${p.id}`,
      proveedorNombre: p.proveedorNombre,
    }))
  } catch {
    pedidosConfirmados.value = []
  } finally {
    loadingOCs.value = false
  }
}

function onOrigenChange() {
  form.proveedorId = 0
  form.pedidoId = undefined
}

function onPedidoChange() {
  if (form.pedidoId) {
    const pedido = pedidosConfirmados.value.find(p => p.id === Number(form.pedidoId))
    if (pedido) {
      // Proveedor se hereda de la OC — encontramos el ID en proveedores
      const prov = proveedores.value.find(p => p.nombre === pedido.proveedorNombre)
      if (prov) form.proveedorId = prov.id
    }
  }
}

// proveedor nombre derivado para la OC seleccionada
const ocProveedorNombre = computed(() => {
  if (origen.value !== "ConOC" || !form.pedidoId) return ""
  return pedidosConfirmados.value.find(p => p.id === Number(form.pedidoId))?.proveedorNombre ?? ""
})

async function guardarFactura() {
  formError.value = ""
  if (!/^\d{3}-\d{3}-\d{7}$/.test(form.nroFactura)) {
    formError.value = "Formato inválido. Esperado: 001-001-0000001"
    return
  }
  if (!form.fechaEmision) { formError.value = "La fecha de emisión es obligatoria."; return }
  if (form.condicionVenta === "Credito" && !form.fechaVencimiento) {
    formError.value = "La fecha de vencimiento es obligatoria para crédito."; return
  }
  if (montoTotal.value <= 0) { formError.value = "El monto total debe ser mayor a cero."; return }

  if (origen.value === "ConOC") {
    if (!form.pedidoId) { formError.value = "Seleccioná una Orden de Compra."; return }
    // Registrar via endpoint de OC
    try {
      isSaving.value = true
      const { registrarFactura } = await import("@/services/comprasService")
      await registrarFactura(Number(form.pedidoId), {
        nroFactura: form.nroFactura,
        fechaEmision: form.fechaEmision,
        fechaVencimiento: form.condicionVenta === "Credito" ? form.fechaVencimiento : undefined,
        montoExento: form.montoExento,
        montoGravado5: form.montoGravado5,
        montoGravado10: form.montoGravado10,
        condicionVenta: form.condicionVenta,
        observaciones: form.observaciones || undefined,
      })
      showNuevaModal.value = false
      await loadFacturas()
    } catch (err: any) {
      formError.value = err.response?.data?.message ?? err.message ?? "Error al registrar la factura."
    } finally {
      isSaving.value = false
    }
  } else {
    if (!form.proveedorId) { formError.value = "Seleccioná un proveedor."; return }
    try {
      isSaving.value = true
      await registrarFacturaDirecta({
        proveedorId: form.proveedorId,
        nroFactura: form.nroFactura,
        fechaEmision: form.fechaEmision,
        fechaVencimiento: form.condicionVenta === "Credito" ? form.fechaVencimiento : undefined,
        montoExento: form.montoExento,
        montoGravado5: form.montoGravado5,
        montoGravado10: form.montoGravado10,
        condicionVenta: form.condicionVenta,
        observaciones: form.observaciones || undefined,
      })
      showNuevaModal.value = false
      await loadFacturas()
    } catch (err: any) {
      formError.value = err.response?.data?.message ?? err.message ?? "Error al registrar la factura."
    } finally {
      isSaving.value = false
    }
  }
}

// ── Modal Anular ─────────────────────────────────────────────────────────────
const showAnularModal = ref(false)
const anularTarget = ref<FacturaCompraItem | null>(null)
const motivoAnulacion = ref("")
const anularError = ref("")
const isAnulando = ref(false)

function openAnularModal(f: FacturaCompraItem) {
  anularTarget.value = f
  motivoAnulacion.value = ""
  anularError.value = ""
  showAnularModal.value = true
}

async function confirmarAnulacion() {
  if (!motivoAnulacion.value.trim()) { anularError.value = "El motivo es obligatorio."; return }
  if (!anularTarget.value) return

  isAnulando.value = true
  anularError.value = ""
  try {
    await anularFactura(anularTarget.value.id, { motivo: motivoAnulacion.value.trim() })
    showAnularModal.value = false
    await loadFacturas()
  } catch (err: any) {
    anularError.value = err.response?.data?.message ?? err.message ?? "Error al anular."
  } finally {
    isAnulando.value = false
  }
}

// helper style
const inputStyle = (hasError = false) => hasError
  ? "border: 1.5px solid var(--color-error); color: var(--color-on-surface); background-color: #FFF8F7;"
  : "border: 1px solid var(--color-outline-variant); color: var(--color-on-surface); background-color: var(--color-surface-container-low);"
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
            <h1 class="text-4xl font-extrabold tracking-tight mb-2">Facturas de Compra</h1>
            <p class="font-medium" style="color: var(--color-on-surface-variant)">
              Registro y seguimiento de facturas de proveedores
            </p>
          </div>
          <BaseButton variant="primary" size="lg" @click="openNuevaModal">
            <span class="material-symbols-outlined" style="font-size: 20px">add</span>
            Nueva Factura
          </BaseButton>
        </div>

        <!-- Filtros -->
        <div class="flex items-center justify-between gap-4 mb-6 flex-wrap">
          <div class="flex items-center gap-3 flex-wrap">
            <FilterChips
              :model-value="filtroEstado"
              :options="estadoOpciones"
              placeholder="Estado"
              @update:model-value="v => { filtroEstado = v; applyFilters() }"
            />
            <FilterChips
              :model-value="filtroCondicion"
              :options="condicionOpciones"
              placeholder="Condición"
              @update:model-value="v => { filtroCondicion = v; applyFilters() }"
            />
            <FilterChips
              :model-value="filtroOrigen"
              :options="origenOpciones"
              placeholder="Origen"
              @update:model-value="v => { filtroOrigen = v; applyFilters() }"
            />

            <!-- Proveedor -->
            <select
              v-model="filtroProveedorId"
              class="px-3 py-2 rounded-xl text-sm font-medium outline-none transition-all"
              style="border: 1px solid var(--color-outline-variant); background-color: var(--color-surface-container-lowest); color: var(--color-on-surface); min-width: 150px;"
              @change="applyFilters"
            >
              <option :value="undefined">Todos los proveedores</option>
              <option v-for="p in proveedores" :key="p.id" :value="p.id">{{ p.nombre }}</option>
            </select>

            <!-- Fecha desde / hasta -->
            <div class="flex items-center gap-2">
              <input
                v-model="filtroFechaDesde"
                type="date"
                class="px-3 py-2 rounded-xl text-sm outline-none transition-all"
                style="border: 1px solid var(--color-outline-variant); background-color: var(--color-surface-container-lowest); color: var(--color-on-surface);"
                @change="applyFilters"
              />
              <span class="text-sm font-medium" style="color: var(--color-on-surface-variant)">—</span>
              <input
                v-model="filtroFechaHasta"
                type="date"
                class="px-3 py-2 rounded-xl text-sm outline-none transition-all"
                style="border: 1px solid var(--color-outline-variant); background-color: var(--color-surface-container-lowest); color: var(--color-on-surface);"
                @change="applyFilters"
              />
              <button
                v-if="filtroFechaDesde || filtroFechaHasta"
                class="w-7 h-7 rounded-full flex items-center justify-center transition-all hover:scale-105"
                style="background-color: var(--color-surface-container-high)"
                title="Limpiar fechas"
                @click="clearFiltroFechas"
              >
                <span class="material-symbols-outlined" style="font-size: 14px; color: var(--color-on-surface-variant)">close</span>
              </button>
            </div>
          </div>

          <SearchInput
            :model-value="search"
            placeholder="Buscar por Nro. Factura…"
            class="w-72"
            @update:model-value="v => { search = v; applyFilters() }"
          />
        </div>

        <!-- Tabla -->
        <div class="rounded-2xl overflow-hidden mb-4"
          style="background-color: var(--color-surface-container-lowest); box-shadow: 0 1px 3px rgba(196, 197, 213, 0.25); outline: 1px solid rgba(196, 197, 213, 0.15)">

          <!-- Skeleton / vacío -->
          <div v-if="isLoading" class="p-12 flex justify-center">
            <span class="material-symbols-outlined animate-spin" style="font-size: 32px; color: var(--color-primary)">progress_activity</span>
          </div>

          <div v-else-if="facturas.length === 0" class="p-12 text-center">
            <div class="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
              style="background-color: var(--color-surface-container-low)">
              <span class="material-symbols-outlined text-4xl" style="color: var(--color-outline)">receipt</span>
            </div>
            <p class="font-bold text-lg mb-1" style="color: var(--color-on-surface)">Sin facturas</p>
            <p class="text-sm" style="color: var(--color-on-surface-variant)">
              No hay facturas que coincidan con los filtros aplicados.
            </p>
          </div>

          <table v-else class="w-full">
            <thead style="background-color: var(--color-surface-container-low)">
              <tr>
                <th v-for="h in ['Nro. Factura','Proveedor','Origen','Fecha Emisión','Monto Total','Condición','Estado','']"
                  :key="h"
                  class="px-6 py-5 text-left text-xs font-bold uppercase tracking-widest"
                  style="color: var(--color-outline)">
                  {{ h }}
                </th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="f in facturas"
                :key="f.id"
                class="hover:bg-surface-container-low"
                :class="{ 'opacity-60': f.estado === 'Anulado' }"
                style="border-bottom: 1px solid rgba(196, 197, 213, 0.12)"
              >
                <!-- Nro Factura -->
                <td class="px-6 py-4">
                  <span class="font-mono text-sm font-semibold" style="color: var(--color-on-surface)">
                    {{ f.nroFactura ?? "—" }}
                  </span>
                </td>

                <!-- Proveedor -->
                <td class="px-6 py-4">
                  <span class="font-medium text-sm" style="color: var(--color-on-surface)">{{ f.proveedorNombre }}</span>
                </td>

                <!-- Origen -->
                <td class="px-6 py-4">
                  <span class="px-2.5 py-1 rounded-full text-xs font-bold"
                    :style="`background-color: ${origenBadge(f).bg}; color: ${origenBadge(f).color}`">
                    {{ origenBadge(f).text }}
                  </span>
                </td>

                <!-- Fecha -->
                <td class="px-6 py-4 text-sm" style="color: var(--color-on-surface-variant)">
                  {{ formatDate(f.fechaEmision) }}
                </td>

                <!-- Monto -->
                <td class="px-6 py-4">
                  <span class="font-bold text-sm" style="color: var(--color-on-surface)">
                    {{ formatMonto(f.montoTotal) }}
                  </span>
                </td>

                <!-- Condición -->
                <td class="px-6 py-4 text-sm" style="color: var(--color-on-surface-variant)">
                  {{ f.condicionVenta === "Credito" ? "Crédito" : "Contado" }}
                </td>

                <!-- Estado -->
                <td class="px-6 py-4">
                  <span class="px-2.5 py-1 rounded-full text-xs font-bold"
                    :style="`background-color: ${estadoBadge(f.estado).bg}; color: ${estadoBadge(f.estado).color}; border: 1px solid ${estadoBadge(f.estado).border}`">
                    {{ estadoBadge(f.estado).text }}
                  </span>
                </td>

                <!-- Acciones -->
                <td class="px-6 py-4">
                  <div class="flex items-center gap-2">
                    <!-- Ver OC -->
                    <button
                      v-if="f.pedidoProveedorId"
                      class="w-9 h-9 rounded-full flex items-center justify-center transition-all hover:scale-105 active:scale-95 bg-blue-100"
                      title="Ver Orden de Compra"
                      @click="router.push(`/compras/oc/${f.pedidoProveedorId}`)"
                    >
                      <span class="material-symbols-outlined text-blue-700" style="font-size: 18px">open_in_new</span>
                    </button>

                    <!-- Anular -->
                    <button
                      v-if="f.estado !== 'Anulado'"
                      class="w-9 h-9 rounded-full flex items-center justify-center transition-all hover:scale-105 active:scale-95"
                      style="background-color: var(--color-error-container)"
                      title="Anular factura"
                      @click="openAnularModal(f)"
                    >
                      <span class="material-symbols-outlined" style="font-size: 18px; color: var(--color-error)">block</span>
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Footer paginación -->
        <p class="text-sm" style="color: var(--color-on-surface-variant)">
          Mostrando {{ facturas.length }} de {{ totalCount }} facturas
        </p>

      </div>
    </main>

    <!-- ── Modal Nueva Factura ──────────────────────────────────────────────── -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="showNuevaModal" class="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div class="absolute inset-0" style="background-color: rgba(24, 28, 32, 0.5)" @click="showNuevaModal = false" />
          <div class="relative w-full max-w-2xl rounded-3xl overflow-hidden"
            style="background-color: var(--color-surface-container-lowest); box-shadow: 0 24px 64px rgba(0, 40, 142, 0.18);">

            <!-- Header -->
            <div class="flex items-center justify-between px-8 pt-8 pb-6"
              style="border-bottom: 1px solid rgba(196, 197, 213, 0.2)">
              <h3 class="text-xl font-extrabold" style="color: var(--color-primary)">Nueva Factura de Compra</h3>
              <button class="p-1 rounded-full transition-colors" style="color: var(--color-outline)"
                @click="showNuevaModal = false">
                <span class="material-symbols-outlined" style="font-size: 22px">close</span>
              </button>
            </div>

            <!-- Body -->
            <form class="px-8 py-6 space-y-5 max-h-[70vh] overflow-y-auto" @submit.prevent="guardarFactura">

              <!-- Origen -->
              <div>
                <label class="text-xs font-bold uppercase tracking-wider block mb-2" style="color: var(--color-outline)">
                  Origen de la factura
                </label>
                <div class="flex gap-3">
                  <label
                    v-for="opt in [{ v: 'Directa', label: 'Compra directa', icon: 'shopping_bag' }, { v: 'ConOC', label: 'Con OC', icon: 'shopping_cart' }]"
                    :key="opt.v"
                    class="flex-1 flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer transition-all"
                    :style="origen === opt.v
                      ? 'border: 1.5px solid var(--color-primary); background-color: #EEF2FF;'
                      : 'border: 1px solid var(--color-outline-variant); background-color: var(--color-surface-container-low);'"
                  >
                    <input type="radio" :value="opt.v" v-model="origen" class="hidden" @change="onOrigenChange" />
                    <span class="material-symbols-outlined" style="font-size: 20px"
                      :style="`color: ${origen === opt.v ? 'var(--color-primary)' : 'var(--color-on-surface-variant)'}`">
                      {{ opt.icon }}
                    </span>
                    <span class="font-semibold text-sm"
                      :style="`color: ${origen === opt.v ? 'var(--color-primary)' : 'var(--color-on-surface)'}`">
                      {{ opt.label }}
                    </span>
                  </label>
                </div>
              </div>

              <!-- OC selector -->
              <div v-if="origen === 'ConOC'">
                <label class="text-xs font-bold uppercase tracking-wider block mb-1.5" style="color: var(--color-outline)">
                  Orden de Compra <span style="color: var(--color-error)">*</span>
                </label>
                <select
                  v-model="form.pedidoId"
                  class="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all appearance-none"
                  :style="inputStyle(!form.pedidoId && !!formError)"
                  @change="onPedidoChange"
                >
                  <option :value="undefined">{{ loadingOCs ? 'Cargando OCs...' : 'Seleccionar OC...' }}</option>
                  <option v-for="oc in pedidosConfirmados" :key="oc.id" :value="oc.id">
                    {{ oc.nro }} — {{ oc.proveedorNombre }}
                  </option>
                </select>
                <div v-if="pedidosConfirmados.length === 0 && !loadingOCs"
                  class="mt-1 text-xs font-medium" style="color: var(--color-on-surface-variant)">
                  No hay OCs en estado Confirmada disponibles.
                </div>
              </div>

              <!-- Proveedor (solo Directa) -->
              <div v-if="origen === 'Directa'">
                <label class="text-xs font-bold uppercase tracking-wider block mb-1.5" style="color: var(--color-outline)">
                  Proveedor <span style="color: var(--color-error)">*</span>
                </label>
                <select
                  v-model="form.proveedorId"
                  class="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all appearance-none"
                  :style="inputStyle(!form.proveedorId && !!formError)"
                >
                  <option :value="0">Seleccionar proveedor...</option>
                  <option v-for="p in proveedores" :key="p.id" :value="p.id">{{ p.nombre }}</option>
                </select>
              </div>

              <!-- Proveedor (OC, read-only) -->
              <div v-if="origen === 'ConOC' && form.pedidoId">
                <label class="text-xs font-bold uppercase tracking-wider block mb-1.5" style="color: var(--color-outline)">
                  Proveedor
                </label>
                <div class="w-full px-4 py-3 rounded-xl text-sm font-medium"
                  style="background-color: var(--color-surface-container); color: var(--color-on-surface-variant); border: 1px solid var(--color-outline-variant);">
                  {{ ocProveedorNombre }}
                </div>
              </div>

              <!-- Nro Factura -->
              <div>
                <label class="text-xs font-bold uppercase tracking-wider block mb-1.5" style="color: var(--color-outline)">
                  Número de Factura <span style="color: var(--color-error)">*</span>
                </label>
                <input
                  v-model="form.nroFactura"
                  type="text"
                  placeholder="001-001-0000001"
                  class="w-full px-4 py-3 rounded-xl text-sm font-mono outline-none transition-all"
                  :style="inputStyle(false)"
                  maxlength="15"
                />
                <p class="mt-1 text-xs" style="color: var(--color-on-surface-variant)">
                  Formato timbrado: 001-001-0000001
                </p>
              </div>

              <!-- Fechas en fila -->
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="text-xs font-bold uppercase tracking-wider block mb-1.5" style="color: var(--color-outline)">
                    Fecha de Emisión <span style="color: var(--color-error)">*</span>
                  </label>
                  <input
                    v-model="form.fechaEmision"
                    type="date"
                    class="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all"
                    :style="inputStyle(false)"
                  />
                </div>
                <div>
                  <label class="text-xs font-bold uppercase tracking-wider block mb-1.5" style="color: var(--color-outline)">
                    Fecha de Vencimiento
                    <span v-if="form.condicionVenta === 'Credito'" style="color: var(--color-error)">*</span>
                  </label>
                  <input
                    v-model="form.fechaVencimiento"
                    type="date"
                    :disabled="form.condicionVenta !== 'Credito'"
                    class="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all"
                    :style="form.condicionVenta !== 'Credito'
                      ? 'border: 1px solid var(--color-outline-variant); background-color: var(--color-surface-variant); color: var(--color-on-surface-variant); opacity: 0.5;'
                      : inputStyle(false)"
                  />
                </div>
              </div>

              <!-- Condición de pago -->
              <div>
                <label class="text-xs font-bold uppercase tracking-wider block mb-2" style="color: var(--color-outline)">
                  Condición de Pago <span style="color: var(--color-error)">*</span>
                </label>
                <div class="flex gap-3">
                  <label
                    v-for="cond in [{ v: 'Contado', label: 'Contado', icon: 'payments' }, { v: 'Credito', label: 'Crédito', icon: 'credit_card' }]"
                    :key="cond.v"
                    class="flex-1 flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer transition-all"
                    :style="form.condicionVenta === cond.v
                      ? 'border: 1.5px solid var(--color-primary); background-color: #EEF2FF;'
                      : 'border: 1px solid var(--color-outline-variant); background-color: var(--color-surface-container-low);'"
                  >
                    <input type="radio" :value="cond.v" v-model="form.condicionVenta" class="hidden" />
                    <span class="material-symbols-outlined" style="font-size: 20px"
                      :style="`color: ${form.condicionVenta === cond.v ? 'var(--color-primary)' : 'var(--color-on-surface-variant)'}`">
                      {{ cond.icon }}
                    </span>
                    <span class="font-semibold text-sm"
                      :style="`color: ${form.condicionVenta === cond.v ? 'var(--color-primary)' : 'var(--color-on-surface)'}`">
                      {{ cond.label }}
                    </span>
                  </label>
                </div>
              </div>

              <!-- Montos -->
              <div>
                <label class="text-xs font-bold uppercase tracking-wider block mb-2" style="color: var(--color-outline)">
                  Montos
                </label>
                <div class="grid grid-cols-3 gap-3">
                  <div>
                    <label class="text-xs font-semibold block mb-1" style="color: var(--color-on-surface-variant)">
                      Exento
                    </label>
                    <input
                      v-model.number="form.montoExento"
                      type="number"
                      min="0"
                      placeholder="0"
                      class="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all"
                      :style="inputStyle(false)"
                    />
                  </div>
                  <div>
                    <label class="text-xs font-semibold block mb-1" style="color: var(--color-on-surface-variant)">
                      Gravado 5%
                    </label>
                    <input
                      v-model.number="form.montoGravado5"
                      type="number"
                      min="0"
                      placeholder="0"
                      class="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all"
                      :style="inputStyle(false)"
                    />
                  </div>
                  <div>
                    <label class="text-xs font-semibold block mb-1" style="color: var(--color-on-surface-variant)">
                      Gravado 10%
                    </label>
                    <input
                      v-model.number="form.montoGravado10"
                      type="number"
                      min="0"
                      placeholder="0"
                      class="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all"
                      :style="inputStyle(false)"
                    />
                  </div>
                </div>

                <!-- Resumen calculado -->
                <div v-if="montoTotal > 0"
                  class="mt-3 p-4 rounded-xl grid grid-cols-3 gap-3 text-sm"
                  style="background-color: var(--color-surface-container-low); border: 1px solid rgba(196, 197, 213, 0.2)">
                  <div class="text-center">
                    <p class="text-xs font-bold uppercase tracking-wider mb-1" style="color: var(--color-outline)">IVA 5%</p>
                    <p class="font-bold" style="color: var(--color-on-surface)">{{ formatMonto(iva5) }}</p>
                  </div>
                  <div class="text-center">
                    <p class="text-xs font-bold uppercase tracking-wider mb-1" style="color: var(--color-outline)">IVA 10%</p>
                    <p class="font-bold" style="color: var(--color-on-surface)">{{ formatMonto(iva10) }}</p>
                  </div>
                  <div class="text-center">
                    <p class="text-xs font-bold uppercase tracking-wider mb-1" style="color: var(--color-outline)">Total</p>
                    <p class="font-extrabold text-base" style="color: var(--color-primary)">{{ formatMonto(montoTotal) }}</p>
                  </div>
                </div>
              </div>

              <!-- Observaciones -->
              <div>
                <label class="text-xs font-bold uppercase tracking-wider block mb-1.5" style="color: var(--color-outline)">
                  Observaciones
                </label>
                <textarea
                  v-model="form.observaciones"
                  rows="2"
                  placeholder="Notas opcionales sobre la factura…"
                  class="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all resize-none"
                  :style="inputStyle(false)"
                />
              </div>

              <!-- Error general -->
              <p v-if="formError" class="text-sm font-medium" style="color: var(--color-error)">
                {{ formError }}
              </p>
            </form>

            <!-- Footer -->
            <div class="px-8 py-6 flex justify-end gap-3"
              style="border-top: 1px solid rgba(196, 197, 213, 0.2)">
              <BaseButton variant="secondary" @click="showNuevaModal = false" :disabled="isSaving">
                Cancelar
              </BaseButton>
              <BaseButton variant="primary" :disabled="isSaving" @click="guardarFactura">
                <span v-if="isSaving" class="material-symbols-outlined animate-spin" style="font-size: 18px">progress_activity</span>
                <span v-else class="material-symbols-outlined" style="font-size: 18px">save</span>
                {{ isSaving ? "Guardando…" : "Guardar Factura" }}
              </BaseButton>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- ── Modal Anular ───────────────────────────────────────────────────────── -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="showAnularModal" class="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div class="absolute inset-0" style="background-color: rgba(24, 28, 32, 0.5)" @click="showAnularModal = false" />
          <div class="relative w-full max-w-sm rounded-3xl overflow-hidden"
            style="background-color: var(--color-surface-container-lowest); box-shadow: 0 24px 64px rgba(0, 40, 142, 0.18);">

            <div class="flex items-center justify-between px-8 pt-8 pb-6"
              style="border-bottom: 1px solid rgba(196, 197, 213, 0.2)">
              <h3 class="text-xl font-extrabold" style="color: var(--color-error)">Anular Factura</h3>
              <button class="p-1 rounded-full transition-colors" style="color: var(--color-outline)"
                @click="showAnularModal = false">
                <span class="material-symbols-outlined" style="font-size: 22px">close</span>
              </button>
            </div>

            <div class="px-8 py-6 space-y-4">
              <!-- Info factura -->
              <div class="p-4 rounded-xl" style="background-color: var(--color-error-container)">
                <p class="text-sm font-semibold" style="color: var(--color-error)">
                  Vas a anular la factura
                  <strong>{{ anularTarget?.nroFactura ?? "sin número" }}</strong>
                  de <strong>{{ anularTarget?.proveedorNombre }}</strong>.
                </p>
                <p v-if="anularTarget?.pedidoProveedorId" class="text-xs mt-1" style="color: var(--color-error)">
                  La OC asociada volverá a estado Confirmada.
                </p>
              </div>

              <div>
                <label class="text-xs font-bold uppercase tracking-wider block mb-1.5" style="color: var(--color-outline)">
                  Motivo de anulación <span style="color: var(--color-error)">*</span>
                </label>
                <textarea
                  v-model="motivoAnulacion"
                  rows="3"
                  placeholder="Indicá el motivo de la anulación…"
                  class="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all resize-none"
                  :style="inputStyle(!!anularError)"
                  maxlength="500"
                />
                <p v-if="anularError" class="mt-1 text-xs font-medium" style="color: var(--color-error)">
                  {{ anularError }}
                </p>
              </div>
            </div>

            <div class="px-8 py-6 flex justify-end gap-3"
              style="border-top: 1px solid rgba(196, 197, 213, 0.2)">
              <BaseButton variant="secondary" @click="showAnularModal = false" :disabled="isAnulando">
                Cancelar
              </BaseButton>
              <BaseButton variant="danger" :disabled="isAnulando" @click="confirmarAnulacion">
                <span v-if="isAnulando" class="material-symbols-outlined animate-spin" style="font-size: 18px">progress_activity</span>
                <span v-else class="material-symbols-outlined" style="font-size: 18px">block</span>
                {{ isAnulando ? "Anulando…" : "Anular Factura" }}
              </BaseButton>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active { transition: opacity 0.2s ease; }
.fade-enter-from,
.fade-leave-to { opacity: 0; }
</style>
