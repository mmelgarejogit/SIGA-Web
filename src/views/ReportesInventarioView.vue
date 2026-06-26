<script setup lang="ts">
import { ref, computed, onMounted, watch } from "vue"
import AppSidebar from "@/components/AppSidebar.vue"
import AppHeader from "@/components/AppHeader.vue"
import KpiCard from "@/components/KpiCard.vue"
import DateRangeBar from "@/components/DateRangeBar.vue"
import {
  getReporteInventario,
  type ReporteInventario,
  type CategoriaInventario,
} from "@/services/reportesService"
import { useReporteInventarioPdf } from "@/composables/useReporteInventarioPdf"
import { getConfiguracion } from "@/services/configService"

// ── Estado ──────────────────────────────────────────────────────────────────
const selectedDate = ref<Date>(new Date())
const viewMode = ref<"dia" | "semana" | "mes">("mes")
const reporte = ref<ReporteInventario | null>(null)
const isLoading = ref(false)
const error = ref("")
const opticaNombre = ref("SIGA-Óptica")

const { generarPdfReporteInventario } = useReporteInventarioPdf()

// ── Helpers ─────────────────────────────────────────────────────────────────
function fmt(n: number): string {
  return new Intl.NumberFormat("es-PY", {
    style: "currency",
    currency: "PYG",
    maximumFractionDigits: 0,
  }).format(n)
}
function fmtNum(n: number): string {
  return n.toLocaleString("es-PY")
}

function toYmd(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

function periodRange(date: Date, mode: "dia" | "semana" | "mes"): { desde: string; hasta: string } {
  if (mode === "dia") {
    const s = toYmd(date)
    return { desde: s, hasta: s }
  }
  if (mode === "semana") {
    const day = date.getDay()
    const offset = day === 0 ? 6 : day - 1
    const start = new Date(date)
    start.setDate(date.getDate() - offset)
    const end = new Date(start)
    end.setDate(start.getDate() + 6)
    return { desde: toYmd(start), hasta: toYmd(end) }
  }
  const start = new Date(date.getFullYear(), date.getMonth(), 1)
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0)
  return { desde: toYmd(start), hasta: toYmd(end) }
}

// ── Carga ───────────────────────────────────────────────────────────────────
async function load() {
  const { desde, hasta } = periodRange(selectedDate.value, viewMode.value)
  isLoading.value = true
  error.value = ""
  try {
    reporte.value = await getReporteInventario({ desde, hasta, agrupacion: "dia" })
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : "No se pudo cargar el reporte"
    reporte.value = null
  } finally {
    isLoading.value = false
  }
}

watch([selectedDate, viewMode], load)

onMounted(async () => {
  try {
    opticaNombre.value = (await getConfiguracion()).nombreFantasia
  } catch {
    /* nombre por defecto */
  }
  load()
})

// ── KPIs ────────────────────────────────────────────────────────────────────
const kpis = computed(() => {
  const r = reporte.value
  return [
    {
      title: "Productos activos",
      value: r ? fmtNum(r.productosActivos) : "—",
      icon: "category",
      badge: "Catálogo",
      badgeType: "neutral" as const,
      iconBg: "var(--color-primary-fixed)",
      iconColor: "var(--color-primary)",
    },
    {
      title: "Valor de inventario",
      value: r ? fmt(r.valorInventario) : "—",
      icon: "savings",
      badge: "Al costo",
      badgeType: "positive" as const,
      iconBg: "var(--color-success-container)",
      iconColor: "var(--color-on-success-container)",
    },
    {
      title: "Stock crítico",
      value: r ? fmtNum(r.stockCritico) : "—",
      icon: "warning",
      badge: "Bajo mínimo",
      badgeType: (r && r.stockCritico > 0 ? "critical" : "neutral") as "critical" | "neutral",
      iconBg: "var(--color-error-container)",
      iconColor: "var(--color-error)",
    },
    {
      title: "Sin stock",
      value: r ? fmtNum(r.sinStock) : "—",
      icon: "production_quantity_limits",
      badge: "Agotados",
      badgeType: (r && r.sinStock > 0 ? "critical" : "neutral") as "critical" | "neutral",
      iconBg: "var(--color-error-container)",
      iconColor: "var(--color-error)",
    },
    {
      title: "Unidades en stock",
      value: r ? fmtNum(r.unidadesEnStock) : "—",
      icon: "inventory_2",
      badge: "Total",
      badgeType: "neutral" as const,
      iconBg: "#E2DFFF",
      iconColor: "var(--color-tertiary)",
    },
  ]
})

const sinDatos = computed(() => !!reporte.value && reporte.value.productosActivos === 0)

// ── Serie temporal de movimientos (barras) ─────────────────────────────────────
const serieMax = computed(() => {
  const s = reporte.value?.serieTemporal ?? []
  return Math.max(1, ...s.flatMap((p) => [p.entradas, p.salidas]))
})
const hayMovimientos = computed(() => {
  const r = reporte.value
  return !!r && (r.totalEntradas > 0 || r.totalSalidas > 0)
})
const showTrend = computed(() => (reporte.value?.serieTemporal.length ?? 0) > 1 && hayMovimientos.value)
const labelEvery = computed(() => {
  const n = reporte.value?.serieTemporal.length ?? 0
  return n <= 16 ? 1 : Math.ceil(n / 12)
})
function pct(v: number): string {
  return `${((v / serieMax.value) * 100).toFixed(1)}%`
}

// ── Dona por categoría (valor) ─────────────────────────────────────────────────
const DONUT_R = 60
const DONUT_C = 2 * Math.PI * DONUT_R
const CAT_COLORS = [
  "var(--color-on-info-container)", "var(--color-success)", "var(--color-tertiary)", "var(--color-warning)", "var(--color-error)",
  "#0891b2", "#db2777", "#65a30d", "#9333ea", "#0d9488",
]

const catChart = computed<CategoriaInventario[]>(() => {
  const items = reporte.value?.porCategoria ?? []
  if (items.length <= 7) return items
  const top = items.slice(0, 6)
  const rest = items.slice(6)
  return [
    ...top,
    {
      categoria: "Otras",
      productos: rest.reduce((s, c) => s + c.productos, 0),
      valor: rest.reduce((s, c) => s + c.valor, 0),
    },
  ]
})

const donutSegments = computed(() => {
  const items = catChart.value
  const total = items.reduce((s, c) => s + c.valor, 0)
  let acc = 0
  return items.map((c, i) => {
    const frac = total > 0 ? c.valor / total : 0
    const seg = {
      categoria: c.categoria,
      valor: c.valor,
      porcentaje: total > 0 ? Math.round((c.valor / total) * 100) : 0,
      color: CAT_COLORS[i % CAT_COLORS.length],
      dash: `${frac * DONUT_C} ${DONUT_C}`,
      offset: -acc * DONUT_C,
    }
    acc += frac
    return seg
  })
})

// ── Exportación ───────────────────────────────────────────────────────────────
function exportPdf() {
  if (reporte.value) generarPdfReporteInventario(reporte.value, opticaNombre.value)
}

function csvCell(v: string | number): string {
  const s = String(v)
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

function exportCsv() {
  const r = reporte.value
  if (!r) return
  const lines: string[] = []
  const push = (...cols: (string | number)[]) => lines.push(cols.map(csvCell).join(","))

  push("Reporte de Inventario")
  push("Movimientos desde", r.desde, "hasta", r.hasta)
  push("")
  push("Productos activos", r.productosActivos)
  push("Valor de inventario (costo)", r.valorInventario)
  push("Stock critico", r.stockCritico)
  push("Sin stock", r.sinStock)
  push("Unidades en stock", r.unidadesEnStock)
  push("Entradas (periodo)", r.totalEntradas)
  push("Salidas (periodo)", r.totalSalidas)
  push("")
  push("Por categoria")
  push("Categoria", "Productos", "Valor")
  r.porCategoria.forEach((c) => push(c.categoria, c.productos, c.valor))
  push("")
  push("Stock critico")
  push("Producto", "Actual", "Minimo", "Faltante")
  r.productosCriticos.forEach((p) => push(p.nombre, p.stockActual, p.stockMinimo, p.faltante))
  push("")
  push("Top productos por valor")
  push("Producto", "Stock", "Valor")
  r.topPorValor.forEach((p) => push(p.nombre, p.stockActual, p.valor))
  push("")
  push("Movimientos (serie)")
  push("Periodo", "Entradas", "Salidas")
  r.serieTemporal.forEach((p) => push(p.periodo, p.entradas, p.salidas))

  const csv = "﻿" + lines.join("\r\n")
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `Reporte-Inventario-${r.desde}_${r.hasta}.csv`
  a.click()
  URL.revokeObjectURL(url)
}
</script>

<template>
  <div class="min-h-screen" style="background-color: var(--color-background)">
    <AppSidebar />
    <AppHeader />

    <main style="margin-left: var(--sidebar-width); transition: margin-left 0.25s ease; padding-top: 64px">
      <div class="p-8">
        <!-- Header -->
        <div class="flex items-start justify-between mb-8 gap-4 flex-wrap">
          <div>
            <h1 class="text-4xl font-extrabold tracking-tight mb-2">Reporte de Inventario</h1>
            <p class="font-medium" style="color: var(--color-on-surface-variant)">
              Stock actual, valorización y movimientos del período
            </p>
          </div>
          <div class="flex items-center gap-3">
            <button
              @click="exportCsv"
              :disabled="!reporte || isLoading"
              class="flex items-center gap-2 px-5 h-11 rounded-full text-sm font-bold transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
              style="background-color: var(--color-surface-container-high); color: var(--color-on-surface-variant)"
            >
              <span class="material-symbols-outlined" style="font-size: 18px">table_view</span>
              CSV
            </button>
            <button
              @click="exportPdf"
              :disabled="!reporte || isLoading"
              class="flex items-center gap-2 px-5 h-11 rounded-full text-sm font-bold transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
              style="background-color: var(--color-primary); color: var(--color-on-primary); box-shadow: var(--shadow-primary)"
            >
              <span class="material-symbols-outlined" style="font-size: 18px">picture_as_pdf</span>
              PDF
            </button>
          </div>
        </div>

        <!-- Selector de período (afecta solo movimientos) -->
        <div class="mb-2">
          <DateRangeBar v-model="selectedDate" v-model:mode="viewMode" />
        </div>
        <p class="text-xs mb-6" style="color: var(--color-outline)">
          Los KPIs reflejan el <strong>stock actual</strong>; el período aplica a la sección de movimientos.
        </p>

        <!-- Loading -->
        <div v-if="isLoading" class="flex items-center gap-3 py-20 justify-center">
          <div
            class="w-6 h-6 rounded-full border-2 animate-spin"
            style="border-color: var(--color-primary); border-top-color: transparent"
          ></div>
          <span class="text-sm font-medium" style="color: var(--color-outline)">Cargando reporte...</span>
        </div>

        <!-- Error -->
        <div v-else-if="error" class="flex flex-col items-center justify-center gap-3 py-20 text-center">
          <span class="material-symbols-outlined" style="font-size: 40px; color: var(--color-error)">error</span>
          <p class="text-sm font-medium" style="color: var(--color-error)">{{ error }}</p>
          <button
            @click="load"
            class="px-5 h-10 rounded-full text-sm font-bold"
            style="background-color: var(--color-surface-container-high); color: var(--color-on-surface-variant)"
          >
            Reintentar
          </button>
        </div>

        <!-- Contenido -->
        <template v-else-if="reporte">
          <!-- KPIs -->
          <div class="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-5 mb-8">
            <KpiCard v-for="kpi in kpis" :key="kpi.title" v-bind="kpi" />
          </div>

          <!-- Banner sin datos -->
          <div
            v-if="sinDatos"
            class="flex flex-col items-center justify-center gap-3 py-16 rounded-2xl mb-8"
            style="background-color: var(--color-surface-container-lowest); box-shadow: var(--shadow-sm)"
          >
            <div
              class="w-14 h-14 rounded-2xl flex items-center justify-center"
              style="background-color: var(--color-surface-container-low)"
            >
              <span class="material-symbols-outlined" style="font-size: 28px; color: var(--color-outline)">inventory_2</span>
            </div>
            <p class="text-sm font-medium" style="color: var(--color-outline)">
              No hay productos activos en el catálogo
            </p>
          </div>

          <template v-else>
            <!-- Movimientos + Dona categoría -->
            <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
              <!-- Movimientos -->
              <div
                class="lg:col-span-2 rounded-2xl p-6"
                style="background-color: var(--color-surface-container-lowest); box-shadow: var(--shadow-sm)"
              >
                <div class="flex items-center justify-between mb-6">
                  <h3 class="text-xl font-extrabold" style="color: var(--color-primary)">Movimientos del período</h3>
                  <div class="flex items-center gap-4 text-xs font-semibold" style="color: var(--color-outline)">
                    <span class="flex items-center gap-1.5">
                      <span class="w-3 h-3 rounded-sm" style="background-color: var(--color-success)"></span>
                      Entradas
                    </span>
                    <span class="flex items-center gap-1.5">
                      <span class="w-3 h-3 rounded-sm" style="background-color: var(--color-error)"></span>
                      Salidas
                    </span>
                  </div>
                </div>

                <div v-if="showTrend">
                  <p class="text-xs font-semibold mb-2" style="color: var(--color-outline)">Máx: {{ serieMax }}</p>
                  <div class="flex items-end gap-1" style="height: 200px">
                    <div
                      v-for="(p, i) in reporte.serieTemporal"
                      :key="i"
                      class="flex-1 flex flex-col items-center justify-end gap-1 h-full"
                      :title="`${p.periodo} · Entradas ${p.entradas} · Salidas ${p.salidas}`"
                    >
                      <div class="w-full flex items-end justify-center gap-0.5 h-full">
                        <div
                          class="rounded-t transition-all"
                          style="width: 42%; background-color: var(--color-success); min-height: 1px"
                          :style="{ height: pct(p.entradas) }"
                        ></div>
                        <div
                          class="rounded-t transition-all"
                          style="width: 42%; background-color: var(--color-error); min-height: 1px"
                          :style="{ height: pct(p.salidas) }"
                        ></div>
                      </div>
                      <span
                        v-if="i % labelEvery === 0"
                        class="text-[9px] font-medium whitespace-nowrap"
                        style="color: var(--color-outline)"
                        >{{ p.periodo }}</span
                      >
                      <span v-else class="text-[9px]">&nbsp;</span>
                    </div>
                  </div>
                </div>
                <div v-else class="flex flex-col items-center justify-center gap-1" style="height: 200px">
                  <p class="text-sm" style="color: var(--color-outline)">Sin movimientos aprobados en el período</p>
                  <p class="text-xs" style="color: var(--color-outline)">
                    Entradas: {{ reporte.totalEntradas }} · Salidas: {{ reporte.totalSalidas }}
                  </p>
                </div>
              </div>

              <!-- Dona por categoría -->
              <div
                class="rounded-2xl p-6"
                style="background-color: var(--color-surface-container-lowest); box-shadow: var(--shadow-sm)"
              >
                <h3 class="text-xl font-extrabold mb-6" style="color: var(--color-primary)">Valor por categoría</h3>

                <div v-if="donutSegments.length > 0" class="flex flex-col items-center gap-6">
                  <svg viewBox="0 0 160 160" class="w-44 h-44">
                    <g transform="rotate(-90 80 80)">
                      <circle cx="80" cy="80" :r="DONUT_R" fill="none" stroke="var(--color-surface-container-high)" stroke-width="22" />
                      <circle
                        v-for="seg in donutSegments"
                        :key="seg.categoria"
                        cx="80"
                        cy="80"
                        :r="DONUT_R"
                        fill="none"
                        :stroke="seg.color"
                        stroke-width="22"
                        :stroke-dasharray="seg.dash"
                        :stroke-dashoffset="seg.offset"
                      />
                    </g>
                    <text x="80" y="84" text-anchor="middle" style="font-size: 11px; fill: var(--color-outline)">Valor stock</text>
                  </svg>

                  <div class="w-full flex flex-col gap-2">
                    <div v-for="seg in donutSegments" :key="seg.categoria" class="flex items-center gap-2 text-sm">
                      <span class="w-3 h-3 rounded-sm flex-shrink-0" :style="`background-color: ${seg.color}`"></span>
                      <span class="flex-1 font-medium truncate" style="color: var(--color-on-surface)">{{ seg.categoria }}</span>
                      <span class="font-bold tabular-nums" style="color: var(--color-on-surface)">{{ seg.porcentaje }}%</span>
                    </div>
                  </div>
                </div>
                <div v-else class="flex items-center justify-center" style="height: 200px">
                  <p class="text-sm" style="color: var(--color-outline)">Sin valor de stock</p>
                </div>
              </div>
            </div>

            <!-- Stock crítico + Top por valor -->
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <!-- Stock crítico -->
              <div
                class="rounded-2xl overflow-hidden"
                style="background-color: var(--color-surface-container-lowest); box-shadow: var(--shadow-sm)"
              >
                <div class="px-6 py-5" style="border-bottom: 1px solid var(--color-hairline)">
                  <h3 class="text-base font-extrabold" style="color: var(--color-primary)">Stock crítico</h3>
                </div>
                <table class="w-full text-sm">
                  <thead>
                    <tr style="border-bottom: 1px solid var(--color-hairline)">
                      <th class="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider" style="color: var(--color-outline)">Producto</th>
                      <th class="px-3 py-3 text-center text-xs font-bold uppercase tracking-wider" style="color: var(--color-outline)">Actual</th>
                      <th class="px-3 py-3 text-center text-xs font-bold uppercase tracking-wider" style="color: var(--color-outline)">Mín.</th>
                      <th class="px-6 py-3 text-right text-xs font-bold uppercase tracking-wider" style="color: var(--color-outline)">Faltante</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr
                      v-for="(p, i) in reporte.productosCriticos"
                      :key="i"
                      style="border-bottom: 1px solid var(--color-hairline-soft)"
                    >
                      <td class="px-6 py-3 font-medium" style="color: var(--color-on-surface)">{{ p.nombre }}</td>
                      <td class="px-3 py-3 text-center tabular-nums" style="color: var(--color-on-surface)">{{ p.stockActual }}</td>
                      <td class="px-3 py-3 text-center tabular-nums" style="color: var(--color-outline)">{{ p.stockMinimo }}</td>
                      <td class="px-6 py-3 text-right font-bold tabular-nums" style="color: var(--color-error)">{{ p.faltante }}</td>
                    </tr>
                    <tr v-if="!reporte.productosCriticos.length">
                      <td colspan="4" class="px-6 py-8 text-center" style="color: var(--color-outline)">Sin productos bajo mínimo 🎉</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <!-- Top por valor -->
              <div
                class="rounded-2xl overflow-hidden"
                style="background-color: var(--color-surface-container-lowest); box-shadow: var(--shadow-sm)"
              >
                <div class="px-6 py-5" style="border-bottom: 1px solid var(--color-hairline)">
                  <h3 class="text-base font-extrabold" style="color: var(--color-primary)">Top productos por valor</h3>
                </div>
                <table class="w-full text-sm">
                  <thead>
                    <tr style="border-bottom: 1px solid var(--color-hairline)">
                      <th class="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider" style="color: var(--color-outline)">Producto</th>
                      <th class="px-3 py-3 text-center text-xs font-bold uppercase tracking-wider" style="color: var(--color-outline)">Stock</th>
                      <th class="px-6 py-3 text-right text-xs font-bold uppercase tracking-wider" style="color: var(--color-outline)">Valor</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr
                      v-for="(p, i) in reporte.topPorValor"
                      :key="i"
                      style="border-bottom: 1px solid var(--color-hairline-soft)"
                    >
                      <td class="px-6 py-3 font-medium" style="color: var(--color-on-surface)">{{ p.nombre }}</td>
                      <td class="px-3 py-3 text-center tabular-nums" style="color: var(--color-outline)">{{ p.stockActual }}</td>
                      <td class="px-6 py-3 text-right font-bold tabular-nums" style="color: var(--color-on-surface)">{{ fmt(p.valor) }}</td>
                    </tr>
                    <tr v-if="!reporte.topPorValor.length">
                      <td colspan="3" class="px-6 py-8 text-center" style="color: var(--color-outline)">Sin stock valorizado</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </template>
        </template>
      </div>
    </main>
  </div>
</template>
