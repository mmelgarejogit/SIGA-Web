<script setup lang="ts">
import { inputStyle } from "@/composables/useFieldStyles"
import { ref, computed, onMounted } from "vue"
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
  getEgresos,
  anularEgreso,
  getCategorias,
} from "@/services/egresosService"

const router = useRouter()
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
const totalPages = ref(1)
const isLoading = ref(false)
const loadError = ref("")
const currentPage = ref(1)
const pageSize = 10

const rangeStart = computed(() =>
  totalCount.value === 0 ? 0 : (currentPage.value - 1) * pageSize + 1)
const rangeEnd = computed(() =>
  Math.min(currentPage.value * pageSize, totalCount.value))
const visiblePages = computed(() => {
  const total = totalPages.value
  const cur = currentPage.value
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const pages: (number | '...')[] = [1]
  if (cur > 3) pages.push('...')
  for (let p = Math.max(2, cur - 1); p <= Math.min(total - 1, cur + 1); p++) pages.push(p)
  if (cur < total - 2) pages.push('...')
  pages.push(total)
  return pages
})

const tipoFiltros = ref<string[]>([])
const estadoFiltros = ref<string[]>([])
const soloVencidos = ref(false)

const tipoOptions = [
  { value: "Honorario",          label: "Honorario" },
  { value: "GastoGeneral",       label: "Gasto General" },
  { value: "FacturaCompra",      label: "Factura (compra)" },
  { value: "FacturaLaboratorio", label: "Factura (lab.)" },
]

const estadoOptions = [
  { value: "Pendiente", label: "Pendiente", dot: "var(--color-on-warning-container)" },
  { value: "Aprobado", label: "Aprobado", dot: "var(--color-on-info-container)" },
  { value: "Pagado", label: "Pagado", dot: "var(--color-on-success-container)" },
  { value: "Rechazado", label: "Rechazado", dot: "var(--color-on-error-container)" },
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
    totalPages.value = res.totalPages
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

// ── Helpers de UI ─────────────────────────────────────────────────────────────

function tipoLabel(tipo: string) {
  const map: Record<string, string> = {
    FacturaCompra:      "Factura compra",
    Honorario:          "Honorario",
    GastoGeneral:       "Gasto",
    FacturaLaboratorio: "Factura lab.",
  }
  return map[tipo] ?? tipo
}

function tipoIcon(tipo: string) {
  const map: Record<string, string> = {
    FacturaCompra:      "receipt",
    Honorario:          "person_check",
    GastoGeneral:       "payments",
    FacturaLaboratorio: "science",
  }
  return map[tipo] ?? "attach_money"
}

function tipoColor(tipo: string): { bg: string; color: string } {
  const map: Record<string, { bg: string; color: string }> = {
    FacturaCompra:      { bg: "var(--color-info-container)", color: "var(--color-on-info-container)" },
    Honorario:          { bg: "color-mix(in srgb, var(--color-tertiary) 12%, var(--color-surface-container-lowest))", color: "var(--color-on-tertiary-fixed-variant)" },
    GastoGeneral:       { bg: "var(--color-warning-container)", color: "var(--color-on-warning-container)" },
    FacturaLaboratorio: { bg: "color-mix(in srgb, var(--color-secondary) 12%, var(--color-surface-container-lowest))", color: "var(--color-secondary)" },
  }
  return map[tipo] ?? { bg: "var(--color-surface-container)", color: "var(--color-on-surface-variant)" }
}

function estadoBadgeStyle(estado: string, vencido: boolean) {
  if (vencido && estado !== "Pagado" && estado !== "Anulado" && estado !== "Rechazado")
    return "background-color: var(--color-error-container); color: var(--color-on-error-container)"
  const map: Record<string, string> = {
    Pendiente: "background-color: var(--color-warning-container); color: var(--color-on-warning-container)",
    Aprobado:  "background-color: var(--color-info-container); color: var(--color-on-info-container)",
    Pagado:    "background-color: var(--color-success-container); color: var(--color-on-success-container)",
    Rechazado: "background-color: var(--color-error-container); color: var(--color-on-error-container)",
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
  return [
    { type: "item", label: "Ver detalle", icon: "visibility", action: () => openDetalle(e) },
    {
      type: "item", label: "Anular egreso", icon: "block",
      action: () => openAnular(e),
      hidden: !canManage || e.estado !== "Pendiente",
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
      <div class="p-4 sm:p-6 lg:p-8">

        <!-- Header -->
        <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-8">
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

        <!-- Filtros -->
        <div class="flex items-center gap-3 mb-8 flex-wrap">
          <FilterChips :options="tipoOptions" :modelValue="tipoFiltros" placeholder="Tipo" @update:modelValue="setTipoFiltro" />
          <FilterChips :options="estadoOptions" :modelValue="estadoFiltros" placeholder="Estado" @update:modelValue="setEstadoFiltro" />
          <button
            @click="soloVencidos = !soloVencidos; applyFilter()"
            class="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg text-sm font-medium transition-colors"
            :style="soloVencidos
              ? 'background-color: var(--color-error-container); color: var(--color-on-error-container); border: 1px solid var(--color-error-container)'
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
        <div class="rounded-lg overflow-hidden"
          style="background-color: var(--color-surface-container-lowest);
                 box-shadow: var(--shadow-sm);
                 outline: 1px solid var(--color-hairline)">
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
                  <span v-else-if="item.tipo === 'FacturaLaboratorio'">{{ item.proveedorNombre ?? '—' }} {{ item.nroFactura ? `· ${item.nroFactura}` : '' }}</span>
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

          <!-- Footer paginación -->
          <div v-if="egresos.length > 0"
            class="px-6 py-4 flex items-center justify-between flex-wrap gap-4"
            style="border-top: 1px solid var(--color-hairline-soft); background-color: var(--color-surface-container-lowest)">
            <span class="text-sm" style="color: var(--color-on-surface-variant)">
              Mostrando
              <strong style="color: var(--color-on-surface)">{{ rangeStart }}–{{ rangeEnd }}</strong>
              de
              <strong style="color: var(--color-on-surface)">{{ totalCount }}</strong>
              registros
            </span>
            <div v-if="totalPages > 1" class="flex items-center gap-1">
              <button @click="currentPage--; load()" :disabled="currentPage === 1"
                class="w-9 h-9 rounded-full flex items-center justify-center transition-all disabled:opacity-30 hover:bg-surface-container-high"
                style="color: var(--color-on-surface-variant)">
                <span class="material-symbols-outlined" style="font-size: 18px">chevron_left</span>
              </button>
              <template v-for="p in visiblePages" :key="p">
                <span v-if="p === '...'"
                  class="w-9 h-9 flex items-center justify-center text-sm"
                  style="color: var(--color-outline)">…</span>
                <button v-else
                  @click="currentPage = (p as number); load()"
                  class="w-9 h-9 rounded-full text-sm font-semibold transition-all"
                  :class="currentPage === p ? 'bg-primary text-on-primary' : 'text-on-surface-variant hover:bg-surface-container-high'">
                  {{ p }}
                </button>
              </template>
              <button @click="currentPage++; load()" :disabled="currentPage === totalPages"
                class="w-9 h-9 rounded-full flex items-center justify-center transition-all disabled:opacity-30 hover:bg-surface-container-high"
                style="color: var(--color-on-surface-variant)">
                <span class="material-symbols-outlined" style="font-size: 18px">chevron_right</span>
              </button>
            </div>
          </div>
        </div>

      </div>
    </main>

    <!-- ── MODAL DETALLE ─────────────────────────────────────────────────────── -->
    <BaseModal :show="showDetalle" title="Detalle de Egreso" size="lg" @close="showDetalle = false">
      <div v-if="detalleEgreso" class="space-y-4">
        <div class="flex items-center gap-3 pb-4" style="border-bottom: 1px solid var(--color-hairline)">
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

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <div>
            <p class="text-xs font-bold uppercase tracking-wider mb-0.5" style="color: var(--color-outline)">Fecha de emisión</p>
            <p style="color: var(--color-on-surface)">{{ formatDate(detalleEgreso.fechaEmision) }}</p>
          </div>
          <div v-if="detalleEgreso.fechaVencimiento">
            <p class="text-xs font-bold uppercase tracking-wider mb-0.5" style="color: var(--color-outline)">Vencimiento</p>
            <p :style="detalleEgreso.estaVencido ? 'color: var(--color-error); font-weight: 600' : 'color: var(--color-on-surface)'">
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

          <template v-if="detalleEgreso.tipo === 'FacturaLaboratorio'">
            <div>
              <p class="text-xs font-bold uppercase tracking-wider mb-0.5" style="color: var(--color-outline)">Laboratorio</p>
              <p style="color: var(--color-on-surface)">{{ detalleEgreso.proveedorNombre ?? '—' }}</p>
            </div>
            <div v-if="detalleEgreso.nroFactura">
              <p class="text-xs font-bold uppercase tracking-wider mb-0.5" style="color: var(--color-outline)">N° Factura lab.</p>
              <p class="font-mono" style="color: var(--color-on-surface)">{{ detalleEgreso.nroFactura }}</p>
            </div>
          </template>
        </div>

        <!-- Motivo de rechazo -->
        <div v-if="detalleEgreso.motivoRechazo" class="rounded-2xl p-3" style="background-color: var(--color-error-container)">
          <p class="text-xs font-bold uppercase tracking-wider mb-1" style="color: var(--color-on-error-container)">Motivo de rechazo</p>
          <p class="text-sm" style="color: var(--color-on-error-container)">{{ detalleEgreso.motivoRechazo }}</p>
        </div>

        <div v-if="detalleEgreso.observaciones" class="rounded-2xl p-3" style="background-color: var(--color-surface-container-low)">
          <p class="text-xs font-bold uppercase tracking-wider mb-1" style="color: var(--color-outline)">Observaciones</p>
          <p class="text-sm" style="color: var(--color-on-surface)">{{ detalleEgreso.observaciones }}</p>
        </div>
      </div>

      <template #footer>
        <div class="flex justify-between w-full">
          <BaseButton variant="secondary" @click="showDetalle = false">Cerrar</BaseButton>
          <BaseButton
            v-if="detalleEgreso && canManage && detalleEgreso.estado === 'Pendiente'"
            variant="danger"
            @click="openAnular(detalleEgreso!)"
          >Anular</BaseButton>
        </div>
      </template>
    </BaseModal>

    <!-- ── MODAL ANULAR ──────────────────────────────────────────────────────── -->
    <BaseModal :show="showAnular" title="Anular Egreso" size="sm" @close="showAnular = false">
      <div v-if="anularError" class="flex items-center gap-2 rounded-2xl px-4 py-3 mb-4 text-sm font-medium"
        style="background-color: var(--color-error-container); color: var(--color-on-error-container)">
        <span class="material-symbols-outlined" style="font-size: 18px">error</span>
        {{ anularError }}
      </div>
      <p class="text-sm mb-4" style="color: var(--color-on-surface-variant)">
        Esta acción no se puede deshacer. ¿Estás seguro de que querés anular este egreso?
      </p>
      <div>
        <label class="block text-xs font-bold uppercase tracking-wider mb-1.5" style="color: var(--color-outline)">Motivo (opcional)</label>
        <textarea v-model="anularMotivo" rows="2" class="w-full px-4 py-3 text-sm outline-none appearance-none shadow-none resize-none"
          :style="inputStyle(false)" />
      </div>
      <template #footer>
        <div class="flex justify-between w-full">
          <BaseButton variant="secondary" @click="showAnular = false">Cancelar</BaseButton>
          <BaseButton variant="danger" :disabled="isSavingAnular" @click="submitAnular">
            <span v-if="isSavingAnular" class="material-symbols-outlined animate-spin">progress_activity</span>
            {{ isSavingAnular ? "Anulando..." : "Confirmar Anulación" }}
          </BaseButton>
        </div>
      </template>
    </BaseModal>
  </div>
</template>
