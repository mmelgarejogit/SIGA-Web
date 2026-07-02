<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch } from "vue"
import { useRoute, useRouter } from "vue-router"
import AppSidebar from "@/components/AppSidebar.vue"
import AppHeader from "@/components/AppHeader.vue"
import BaseTable from "@/components/BaseTable.vue"
import BaseButton from "@/components/BaseButton.vue"
import SearchableSelect, { type SelectOption } from "@/components/SearchableSelect.vue"
import { inputStyle } from "@/composables/useFieldStyles"
import { formatGs } from "@/utils/money"
import {
  getReporteOperativo,
  exportReporteOperativo,
  type TipoReporte,
} from "@/services/reportesOperativosService"
import { getSucursales } from "@/services/sucursalService"
import { getCategorias } from "@/services/inventarioService"
import { getAppUsers } from "@/services/userService"

type Fmt = "text" | "money" | "date" | "datetime" | "int"
type FiltroKey = "sucursal" | "metodoPago" | "categoria" | "operador" | "tipo"
interface Col { key: string; label: string; fmt?: Fmt }
interface Total { key: string; label: string; money?: boolean }
interface Cfg {
  titulo: string
  cols: Col[]
  filtros: FiltroKey[]
  tipoOpts?: SelectOption[]
  totales: Total[]
}

const REPORTES: Record<TipoReporte, Cfg> = {
  ventas: {
    titulo: "Reporte de Ventas",
    cols: [
      { key: "fecha", label: "Fecha", fmt: "date" },
      { key: "numeroComprobante", label: "Comprobante" },
      { key: "cliente", label: "Cliente" },
      { key: "tipo", label: "Tipo" },
      { key: "condicion", label: "Condición" },
      { key: "estado", label: "Estado" },
      { key: "vendedor", label: "Vendedor" },
      { key: "sucursal", label: "Sucursal" },
      { key: "total", label: "Total", fmt: "money" },
      { key: "cobrado", label: "Cobrado", fmt: "money" },
      { key: "saldo", label: "Saldo", fmt: "money" },
    ],
    filtros: ["metodoPago", "categoria", "operador", "sucursal"],
    totales: [
      { key: "total", label: "Total", money: true },
      { key: "cobrado", label: "Cobrado", money: true },
      { key: "saldo", label: "Saldo", money: true },
    ],
  },
  compras: {
    titulo: "Reporte de Compras",
    cols: [
      { key: "fecha", label: "Fecha", fmt: "date" },
      { key: "nroFactura", label: "N° Factura" },
      { key: "proveedor", label: "Proveedor" },
      { key: "condicion", label: "Condición" },
      { key: "estado", label: "Estado" },
      { key: "metodoPago", label: "Método pago" },
      { key: "registradoPor", label: "Registrado por" },
      { key: "sucursal", label: "Sucursal" },
      { key: "montoTotal", label: "Monto", fmt: "money" },
    ],
    filtros: ["metodoPago", "categoria", "operador", "sucursal"],
    totales: [{ key: "total", label: "Total", money: true }],
  },
  inventario: {
    titulo: "Movimientos de Inventario",
    cols: [
      { key: "fecha", label: "Fecha", fmt: "datetime" },
      { key: "producto", label: "Producto" },
      { key: "categoria", label: "Categoría" },
      { key: "tipo", label: "Tipo" },
      { key: "cantidad", label: "Cantidad", fmt: "int" },
      { key: "motivo", label: "Motivo" },
      { key: "estado", label: "Estado" },
      { key: "creadoPor", label: "Creado por" },
      { key: "sucursal", label: "Sucursal" },
    ],
    filtros: ["categoria", "operador", "sucursal", "tipo"],
    tipoOpts: [
      { value: "Entrada", label: "Entrada" },
      { value: "Salida", label: "Salida" },
    ],
    totales: [
      { key: "entradas", label: "Entradas (u.)" },
      { key: "salidas", label: "Salidas (u.)" },
    ],
  },
  caja: {
    titulo: "Movimientos de Caja",
    cols: [
      { key: "fecha", label: "Fecha", fmt: "date" },
      { key: "tipo", label: "Tipo" },
      { key: "concepto", label: "Concepto" },
      { key: "metodoPago", label: "Método pago" },
      { key: "registradoPor", label: "Registrado por" },
      { key: "sucursal", label: "Sucursal" },
      { key: "referencia", label: "Referencia" },
      { key: "monto", label: "Monto", fmt: "money" },
    ],
    filtros: ["metodoPago", "operador", "sucursal", "tipo"],
    tipoOpts: [
      { value: "Ingreso", label: "Ingreso" },
      { value: "Egreso", label: "Egreso" },
    ],
    totales: [
      { key: "ingresos", label: "Ingresos", money: true },
      { key: "egresos", label: "Egresos", money: true },
      { key: "neto", label: "Neto", money: true },
    ],
  },
}

const TIPOS: TipoReporte[] = ["ventas", "compras", "inventario", "caja"]

const route = useRoute()
const router = useRouter()

const tipo = computed<TipoReporte>(() =>
  TIPOS.includes(route.params.tipo as TipoReporte) ? (route.params.tipo as TipoReporte) : "ventas",
)
const cfg = computed(() => REPORTES[tipo.value])

// ── Filtros ──────────────────────────────────────────────────────────────────
const filtros = reactive({
  desde: "" as string,
  hasta: "" as string,
  sucursalId: null as number | null,
  metodoPago: null as string | null,
  categoria: null as string | null,
  operadorId: null as number | null,
  tipoMov: null as string | null,
})

const metodoPagoOpts: SelectOption[] = [
  { value: "Efectivo", label: "Efectivo" },
  { value: "Tarjeta", label: "Tarjeta" },
  { value: "Transferencia", label: "Transferencia" },
  { value: "Cheque", label: "Cheque" },
]
const sucursalOpts = ref<SelectOption[]>([])
const categoriaOpts = ref<SelectOption[]>([])
const operadorOpts = ref<SelectOption[]>([])

function has(k: FiltroKey) {
  return cfg.value.filtros.includes(k)
}

// ── Datos ────────────────────────────────────────────────────────────────────
const rows = ref<Record<string, string | number>[]>([])
const totales = ref<Record<string, number>>({})
const totalCount = ref(0)
const loading = ref(false)
const page = ref(1)
const pageSize = 20

async function load() {
  loading.value = true
  try {
    const res = await getReporteOperativo(tipo.value, {
      desde: filtros.desde || null,
      hasta: filtros.hasta || null,
      sucursalId: filtros.sucursalId,
      metodoPago: filtros.metodoPago,
      categoria: filtros.categoria,
      operadorId: filtros.operadorId,
      tipoMov: filtros.tipoMov,
      page: page.value,
      pageSize,
    })
    rows.value = res.rows
    totalCount.value = res.totalCount
    totales.value = res.totales
  } catch {
    rows.value = []
    totalCount.value = 0
    totales.value = {}
  } finally {
    loading.value = false
  }
}

function reload() {
  page.value = 1
  load()
}

function limpiar() {
  Object.assign(filtros, {
    desde: "", hasta: "", sucursalId: null, metodoPago: null,
    categoria: null, operadorId: null, tipoMov: null,
  })
  reload()
}

const exportando = ref<"pdf" | "csv" | null>(null)
async function exportar(formato: "pdf" | "csv") {
  exportando.value = formato
  try {
    await exportReporteOperativo(tipo.value, formato, {
      desde: filtros.desde || null,
      hasta: filtros.hasta || null,
      sucursalId: filtros.sucursalId,
      metodoPago: filtros.metodoPago,
      categoria: filtros.categoria,
      operadorId: filtros.operadorId,
      tipoMov: filtros.tipoMov,
    })
  } finally {
    exportando.value = null
  }
}

// ── Presentación ─────────────────────────────────────────────────────────────
function fmtValue(fmt: Fmt | undefined, v: unknown): string {
  if (v == null || v === "") return "—"
  switch (fmt) {
    case "money":
      return formatGs(Number(v))
    case "date":
      return fmtDate(String(v))
    case "datetime":
      return fmtDateTime(String(v))
    default:
      return String(v)
  }
}
function fmtDate(s: string) {
  const d = new Date(s.length <= 10 ? s + "T00:00:00" : s)
  return d.toLocaleDateString("es-PY", { day: "2-digit", month: "2-digit", year: "numeric" })
}
function fmtDateTime(s: string) {
  return new Date(s).toLocaleString("es-PY", {
    day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
  })
}

const tableColumns = computed(() =>
  cfg.value.cols.map((c) => ({
    key: c.key,
    label: c.label,
    align: (c.fmt === "money" || c.fmt === "int" ? "right" : "left") as "right" | "left",
  })),
)
const displayRows = computed(() =>
  rows.value.map((r) => {
    const o: Record<string, string> = {}
    for (const c of cfg.value.cols) o[c.key] = fmtValue(c.fmt, r[c.key])
    return o
  }),
)
const totalesDisplay = computed(() =>
  cfg.value.totales.map((t) => ({
    label: t.label,
    value: t.money
      ? formatGs(totales.value[t.key] ?? 0)
      : (totales.value[t.key] ?? 0).toLocaleString("es-PY"),
  })),
)

const totalPages = computed(() => Math.max(1, Math.ceil(totalCount.value / pageSize)))
const rangeFrom = computed(() => (totalCount.value === 0 ? 0 : (page.value - 1) * pageSize + 1))
const rangeTo = computed(() => Math.min(page.value * pageSize, totalCount.value))
function prevPage() {
  if (page.value > 1) { page.value--; load() }
}
function nextPage() {
  if (page.value < totalPages.value) { page.value++; load() }
}

onMounted(async () => {
  try {
    const [suc, cat, users] = await Promise.all([getSucursales(true), getCategorias(), getAppUsers()])
    sucursalOpts.value = suc.map((s) => ({ value: s.id, label: s.nombre }))
    categoriaOpts.value = cat.map((c) => ({ value: c.nombre, label: c.nombre }))
    operadorOpts.value = users
      .filter((u) => u.type !== "Paciente")
      .map((u) => ({ value: u.userId, label: `${u.firstName} ${u.lastName}` }))
  } catch { /* filtros de dropdown quedan vacíos si falla */ }
  load()
})

// Cambiar de tipo de reporte (misma vista, distinto param) → resetear y recargar
watch(tipo, () => limpiar())
</script>

<template>
  <div class="min-h-screen" style="background-color: var(--color-background)">
    <AppSidebar />
    <AppHeader />

    <main style="margin-left: var(--sidebar-width); transition: margin-left 0.25s ease; padding-top: 64px">
      <div class="p-4 sm:p-6 lg:p-8">
        <!-- Header -->
        <div class="flex items-start justify-between gap-4 mb-8 flex-wrap">
          <div>
            <button
              class="flex items-center gap-1 text-sm font-semibold mb-2"
              style="color: var(--color-primary)"
              @click="router.push('/reportes')"
            >
              <span class="material-symbols-outlined" style="font-size: 18px">arrow_back</span>
              Reportes
            </button>
            <h1 class="text-4xl font-extrabold tracking-tight mb-2">{{ cfg.titulo }}</h1>
            <p class="font-medium" style="color: var(--color-on-surface-variant)">
              Listado operativo · {{ totalCount }} registro{{ totalCount === 1 ? "" : "s" }}
            </p>
          </div>
          <div class="flex items-center gap-2">
            <BaseButton variant="secondary" :disabled="exportando !== null || loading" @click="exportar('csv')">
              <span class="material-symbols-outlined" style="font-size: 18px">table_view</span>
              {{ exportando === "csv" ? "Generando…" : "CSV" }}
            </BaseButton>
            <BaseButton variant="primary" :disabled="exportando !== null || loading" @click="exportar('pdf')">
              <span class="material-symbols-outlined" style="font-size: 18px">picture_as_pdf</span>
              {{ exportando === "pdf" ? "Generando…" : "PDF" }}
            </BaseButton>
          </div>
        </div>

        <!-- Filtros -->
        <div class="flex items-end gap-3 mb-6 flex-wrap">
          <div class="flex flex-col gap-1">
            <label class="text-xs font-bold uppercase tracking-wider" style="color: var(--color-outline)">Desde</label>
            <input v-model="filtros.desde" type="date"
              class="px-3 h-12 text-sm outline-none appearance-none shadow-none transition-all"
              :style="inputStyle(false)" @change="reload" />
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-xs font-bold uppercase tracking-wider" style="color: var(--color-outline)">Hasta</label>
            <input v-model="filtros.hasta" type="date"
              class="px-3 h-12 text-sm outline-none appearance-none shadow-none transition-all"
              :style="inputStyle(false)" @change="reload" />
          </div>

          <div v-if="has('metodoPago')" class="flex flex-col gap-1 w-44">
            <label class="text-xs font-bold uppercase tracking-wider" style="color: var(--color-outline)">Método pago</label>
            <SearchableSelect :model-value="filtros.metodoPago" :options="metodoPagoOpts"
              null-label="Todos" @update:model-value="filtros.metodoPago = $event as string | null; reload()" />
          </div>
          <div v-if="has('categoria')" class="flex flex-col gap-1 w-48">
            <label class="text-xs font-bold uppercase tracking-wider" style="color: var(--color-outline)">Categoría</label>
            <SearchableSelect :model-value="filtros.categoria" :options="categoriaOpts"
              null-label="Todas" @update:model-value="filtros.categoria = $event as string | null; reload()" />
          </div>
          <div v-if="has('tipo') && cfg.tipoOpts" class="flex flex-col gap-1 w-40">
            <label class="text-xs font-bold uppercase tracking-wider" style="color: var(--color-outline)">Tipo</label>
            <SearchableSelect :model-value="filtros.tipoMov" :options="cfg.tipoOpts"
              null-label="Todos" @update:model-value="filtros.tipoMov = $event as string | null; reload()" />
          </div>
          <div v-if="has('operador')" class="flex flex-col gap-1 w-48">
            <label class="text-xs font-bold uppercase tracking-wider" style="color: var(--color-outline)">Operador</label>
            <SearchableSelect :model-value="filtros.operadorId" :options="operadorOpts"
              null-label="Todos" @update:model-value="filtros.operadorId = $event as number | null; reload()" />
          </div>
          <div v-if="has('sucursal')" class="flex flex-col gap-1 w-44">
            <label class="text-xs font-bold uppercase tracking-wider" style="color: var(--color-outline)">Sucursal</label>
            <SearchableSelect :model-value="filtros.sucursalId" :options="sucursalOpts"
              null-label="Todas" @update:model-value="filtros.sucursalId = $event as number | null; reload()" />
          </div>

          <button
            class="h-12 px-4 rounded-md text-sm font-semibold transition-all"
            style="background-color: var(--color-surface); border: 1px solid var(--color-outline-variant); color: var(--color-on-surface)"
            @click="limpiar"
          >
            Limpiar
          </button>
        </div>

        <!-- Totales -->
        <div class="flex gap-3 mb-6 flex-wrap">
          <div
            v-for="t in totalesDisplay"
            :key="t.label"
            class="px-5 py-3 rounded-lg"
            style="background-color: var(--color-surface-container-lowest); box-shadow: var(--shadow-sm); outline: 1px solid var(--color-hairline)"
          >
            <p class="text-xs font-bold uppercase tracking-wider" style="color: var(--color-outline)">{{ t.label }}</p>
            <p class="text-xl font-extrabold" style="color: var(--color-primary)">{{ t.value }}</p>
          </div>
        </div>

        <!-- Tabla -->
        <BaseTable :columns="tableColumns" :items="displayRows" :loading="loading" empty-message="No hay registros para los filtros aplicados." />

        <!-- Paginación -->
        <div class="flex items-center justify-between mt-6 flex-wrap gap-3">
          <p class="text-sm font-medium" style="color: var(--color-on-surface-variant)">
            Mostrando {{ rangeFrom }}–{{ rangeTo }} de {{ totalCount }}
          </p>
          <div class="flex items-center gap-2">
            <button
              class="w-9 h-9 rounded-full flex items-center justify-center transition-all disabled:opacity-40"
              style="background-color: var(--color-surface-container-high)"
              :disabled="page <= 1" @click="prevPage"
            >
              <span class="material-symbols-outlined" style="font-size: 18px; color: var(--color-on-surface-variant)">chevron_left</span>
            </button>
            <span class="text-sm font-semibold" style="color: var(--color-on-surface)">{{ page }} / {{ totalPages }}</span>
            <button
              class="w-9 h-9 rounded-full flex items-center justify-center transition-all disabled:opacity-40"
              style="background-color: var(--color-surface-container-high)"
              :disabled="page >= totalPages" @click="nextPage"
            >
              <span class="material-symbols-outlined" style="font-size: 18px; color: var(--color-on-surface-variant)">chevron_right</span>
            </button>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>
