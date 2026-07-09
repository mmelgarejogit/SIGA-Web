<script setup lang="ts">
import { ref, computed, onMounted, watch } from "vue"
import AppSidebar from "@/components/AppSidebar.vue"
import AppHeader from "@/components/AppHeader.vue"
import KpiCard from "@/components/KpiCard.vue"
import DateRangeBar from "@/components/DateRangeBar.vue"
import { getReporteVentas, type ReporteVentas } from "@/services/reportesService"
import { useReporteVentasPdf } from "@/composables/useReporteVentasPdf"
import { getConfiguracion } from "@/services/configService"

// ── Estado ──────────────────────────────────────────────────────────────────
const selectedDate = ref<Date>(new Date())
const viewMode = ref<"dia" | "semana" | "mes">("mes")
const reporte = ref<ReporteVentas | null>(null)
const isLoading = ref(false)
const error = ref("")
const opticaNombre = ref("SIGA-Óptica")

const { generarPdfReporteVentas } = useReporteVentasPdf()

// ── Helpers de formato ──────────────────────────────────────────────────────
function fmt(n: number): string {
  return new Intl.NumberFormat("es-PY", {
    style: "currency",
    currency: "PYG",
    maximumFractionDigits: 0,
  }).format(n)
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
    const offset = day === 0 ? 6 : day - 1 // lunes = inicio
    const start = new Date(date)
    start.setDate(date.getDate() - offset)
    const end = new Date(start)
    end.setDate(start.getDate() + 6)
    return { desde: toYmd(start), hasta: toYmd(end) }
  }
  // mes
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
    reporte.value = await getReporteVentas({ desde, hasta, agrupacion: "dia" })
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
      title: "Facturado",
      value: r ? fmt(r.totalFacturado) : "—",
      icon: "payments",
      badge: "Emitido",
      badgeType: "neutral" as const,
      iconBg: "var(--color-primary-fixed)",
      iconColor: "var(--color-primary)",
    },
    {
      title: "Cobrado (caja)",
      value: r ? fmt(r.totalCobrado) : "—",
      icon: "account_balance_wallet",
      badge: "Caja",
      badgeType: "positive" as const,
      iconBg: "var(--color-secondary-fixed)",
      iconColor: "var(--color-secondary)",
    },
    {
      title: "N° de ventas",
      value: r ? String(r.cantidadVentas) : "—",
      icon: "receipt_long",
      badge: "Comprob.",
      badgeType: "neutral" as const,
      iconBg: "var(--color-tertiary-fixed)",
      iconColor: "var(--color-tertiary)",
    },
    {
      title: "Ticket promedio",
      value: r ? fmt(r.ticketPromedio) : "—",
      icon: "sell",
      badge: "Prom.",
      badgeType: "neutral" as const,
      iconBg: "color-mix(in srgb, var(--color-primary) 10%, transparent)",
      iconColor: "var(--color-primary)",
    },
    {
      title: "Saldo pendiente",
      value: r ? fmt(r.saldoPendiente) : "—",
      icon: "schedule",
      badge: "Por cobrar",
      badgeType: (r && r.saldoPendiente > 0 ? "critical" : "neutral") as "critical" | "neutral",
      iconBg: "var(--color-error-container)",
      iconColor: "var(--color-error)",
    },
  ]
})

const sinDatos = computed(() => {
  const r = reporte.value
  return !!r && r.cantidadVentas === 0 && r.totalCobrado === 0
})

// ── Serie temporal (barras) ───────────────────────────────────────────────────
const serieMax = computed(() => {
  const s = reporte.value?.serieTemporal ?? []
  return Math.max(1, ...s.flatMap((p) => [p.facturado, p.cobrado]))
})
const showTrend = computed(() => (reporte.value?.serieTemporal.length ?? 0) > 1)
const labelEvery = computed(() => {
  const n = reporte.value?.serieTemporal.length ?? 0
  return n <= 16 ? 1 : Math.ceil(n / 12)
})
function pct(v: number): string {
  return `${((v / serieMax.value) * 100).toFixed(1)}%`
}

// ── Dona por método de pago ───────────────────────────────────────────────────
const DONUT_R = 60
const DONUT_C = 2 * Math.PI * DONUT_R
const metodoColors: Record<string, string> = {
  Efectivo: "var(--color-success)",
  Tarjeta: "var(--color-chart-1)",
  Transferencia: "var(--color-tertiary)",
  Cheque: "var(--color-warning)",
}
const donutSegments = computed(() => {
  const items = reporte.value?.porMetodoPago ?? []
  const total = items.reduce((s, m) => s + m.monto, 0)
  let acc = 0
  return items.map((m) => {
    const frac = total > 0 ? m.monto / total : 0
    const seg = {
      metodo: m.metodo,
      monto: m.monto,
      porcentaje: m.porcentaje,
      color: metodoColors[m.metodo] ?? "var(--color-outline)",
      dash: `${frac * DONUT_C} ${DONUT_C}`,
      offset: -acc * DONUT_C,
    }
    acc += frac
    return seg
  })
})

// ── Exportación ───────────────────────────────────────────────────────────────
function exportPdf() {
  if (reporte.value) generarPdfReporteVentas(reporte.value, opticaNombre.value)
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

  push("Reporte de Ventas")
  push("Desde", r.desde, "Hasta", r.hasta)
  push("")
  push("Facturado", r.totalFacturado)
  push("Cobrado (caja)", r.totalCobrado)
  push("Cantidad de ventas", r.cantidadVentas)
  push("Ticket promedio", r.ticketPromedio)
  push("Saldo pendiente", r.saldoPendiente)
  push("Presupuestos creados", r.cantidadPresupuestos)
  push("Tasa de conversion (%)", r.tasaConversion)
  push("")
  push("Por metodo de pago")
  push("Metodo", "Monto", "%")
  r.porMetodoPago.forEach((m) => push(m.metodo, m.monto, m.porcentaje))
  push("")
  push("Por condicion")
  push("Condicion", "Monto", "Cantidad")
  r.porCondicion.forEach((c) => push(c.condicion, c.monto, c.cantidad))
  push("")
  push("Por categoria fiscal")
  push("Categoria", "Monto")
  r.porCategoriaFiscal.forEach((c) => push(c.categoria, c.monto))
  push("")
  push("Top productos")
  push("Producto", "Cantidad", "Monto")
  r.topProductos.forEach((p) => push(p.nombre, p.cantidad, p.monto))
  push("")
  push("Top servicios")
  push("Servicio", "Cantidad", "Monto")
  r.topServicios.forEach((s) => push(s.nombre, s.cantidad, s.monto))
  push("")
  push("Por cajero")
  push("Cajero", "Cobros", "Monto")
  r.porCajero.forEach((c) => push(c.nombre, c.cantidad, c.monto))
  push("")
  push("Serie temporal")
  push("Periodo", "Facturado", "Cobrado")
  r.serieTemporal.forEach((p) => push(p.periodo, p.facturado, p.cobrado))

  const csv = "﻿" + lines.join("\r\n") // BOM → Excel respeta UTF-8
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `Reporte-Ventas-${r.desde}_${r.hasta}.csv`
  a.click()
  URL.revokeObjectURL(url)
}
</script>

<template>
  <div class="min-h-screen" style="background-color: var(--color-background)">
    <AppSidebar />
    <AppHeader />

    <main style="margin-left: var(--sidebar-width); transition: margin-left 0.25s ease; padding-top: 64px">
      <div class="p-4 sm:p-6 lg:p-8">
        <!-- Header -->
        <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-8 gap-4 flex-wrap">
          <div>
            <h1 class="text-4xl font-extrabold tracking-tight mb-2">Reportes de Ventas</h1>
            <p class="font-medium" style="color: var(--color-on-surface-variant)">
              Análisis de facturación, cobros y productos del período
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

        <!-- Selector de período -->
        <div class="mb-6">
          <DateRangeBar v-model="selectedDate" v-model:mode="viewMode" />
        </div>

        <!-- Loading -->
        <div v-if="isLoading" class="flex items-center gap-3 py-20 justify-center">
          <div
            class="w-6 h-6 rounded-full border-2 animate-spin"
            style="border-color: var(--color-primary); border-top-color: transparent"
          ></div>
          <span class="text-sm font-medium" style="color: var(--color-outline)">Cargando reporte...</span>
        </div>

        <!-- Error -->
        <div
          v-else-if="error"
          class="flex flex-col items-center justify-center gap-3 py-20 text-center"
        >
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
          <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-5 mb-8">
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
              <span class="material-symbols-outlined" style="font-size: 28px; color: var(--color-outline)">bar_chart</span>
            </div>
            <p class="text-sm font-medium" style="color: var(--color-outline)">
              No hay ventas registradas en el período seleccionado
            </p>
          </div>

          <template v-else>
            <!-- Tendencia + Dona -->
            <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
              <!-- Tendencia -->
              <div
                class="lg:col-span-2 rounded-2xl p-6"
                style="background-color: var(--color-surface-container-lowest); box-shadow: var(--shadow-sm)"
              >
                <div class="flex items-center justify-between mb-6">
                  <h3 class="text-xl font-extrabold" style="color: var(--color-primary)">Tendencia</h3>
                  <div class="flex items-center gap-4 text-xs font-semibold" style="color: var(--color-outline)">
                    <span class="flex items-center gap-1.5">
                      <span class="w-3 h-3 rounded-sm" style="background-color: var(--color-primary)"></span>
                      Facturado
                    </span>
                    <span class="flex items-center gap-1.5">
                      <span class="w-3 h-3 rounded-sm" style="background-color: var(--color-secondary)"></span>
                      Cobrado
                    </span>
                  </div>
                </div>

                <div v-if="showTrend">
                  <p class="text-xs font-semibold mb-2" style="color: var(--color-outline)">
                    Máx: {{ fmt(serieMax) }}
                  </p>
                  <div class="overflow-x-auto">
                  <div class="flex items-end gap-1" :style="{ height: '200px', minWidth: `max(100%, ${reporte.serieTemporal.length * 36}px)` }">
                    <div
                      v-for="(p, i) in reporte.serieTemporal"
                      :key="i"
                      class="flex-1 min-w-0 flex flex-col items-center justify-end gap-1 h-full"
                      :title="`${p.periodo} · Facturado ${fmt(p.facturado)} · Cobrado ${fmt(p.cobrado)}`"
                    >
                      <div class="w-full flex items-end justify-center gap-0.5 h-full">
                        <div
                          class="rounded-t transition-all"
                          style="width: 42%; background-color: var(--color-primary); min-height: 1px"
                          :style="{ height: pct(p.facturado) }"
                        ></div>
                        <div
                          class="rounded-t transition-all"
                          style="width: 42%; background-color: var(--color-secondary); min-height: 1px"
                          :style="{ height: pct(p.cobrado) }"
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
                </div>
                <div v-else class="flex items-center justify-center" style="height: 200px">
                  <p class="text-sm" style="color: var(--color-outline)">
                    El período de un día no genera tendencia. Probá semana o mes.
                  </p>
                </div>
              </div>

              <!-- Dona método de pago -->
              <div
                class="rounded-2xl p-6"
                style="background-color: var(--color-surface-container-lowest); box-shadow: var(--shadow-sm)"
              >
                <h3 class="text-xl font-extrabold mb-6" style="color: var(--color-primary)">Método de pago</h3>

                <div v-if="donutSegments.length > 0" class="flex flex-col items-center gap-6">
                  <svg viewBox="0 0 160 160" class="w-44 h-44">
                    <g transform="rotate(-90 80 80)">
                      <circle cx="80" cy="80" :r="DONUT_R" fill="none" stroke="var(--color-surface-container-high)" stroke-width="22" />
                      <circle
                        v-for="seg in donutSegments"
                        :key="seg.metodo"
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
                    <text x="80" y="76" text-anchor="middle" style="font-size: 11px; fill: var(--color-outline)">Cobrado</text>
                    <text x="80" y="90" text-anchor="middle" style="font-size: 11px; font-weight: 700; fill: var(--color-on-surface)">
                      {{ reporte.porMetodoPago.length }} medios
                    </text>
                  </svg>

                  <div class="w-full flex flex-col gap-2">
                    <div v-for="seg in donutSegments" :key="seg.metodo" class="flex items-center gap-2 text-sm">
                      <span class="w-3 h-3 rounded-sm flex-shrink-0" :style="`background-color: ${seg.color}`"></span>
                      <span class="flex-1 font-medium" style="color: var(--color-on-surface)">{{ seg.metodo }}</span>
                      <span class="font-bold tabular-nums" style="color: var(--color-on-surface)">{{ seg.porcentaje }}%</span>
                    </div>
                  </div>
                </div>
                <div v-else class="flex items-center justify-center" style="height: 200px">
                  <p class="text-sm" style="color: var(--color-outline)">Sin cobros en el período</p>
                </div>
              </div>
            </div>

            <!-- Condición · Categoría fiscal · Presupuestos -->
            <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
              <!-- Por condición -->
              <div
                class="rounded-2xl p-6"
                style="background-color: var(--color-surface-container-lowest); box-shadow: var(--shadow-sm)"
              >
                <h3 class="text-base font-extrabold mb-4" style="color: var(--color-primary)">Por condición</h3>
                <div v-if="reporte.porCondicion.length" class="flex flex-col gap-3">
                  <div v-for="c in reporte.porCondicion" :key="c.condicion" class="flex items-center justify-between">
                    <div>
                      <p class="text-sm font-semibold" style="color: var(--color-on-surface)">{{ c.condicion }}</p>
                      <p class="text-xs" style="color: var(--color-outline)">{{ c.cantidad }} ventas</p>
                    </div>
                    <span class="text-sm font-bold tabular-nums" style="color: var(--color-on-surface)">{{ fmt(c.monto) }}</span>
                  </div>
                </div>
                <p v-else class="text-sm" style="color: var(--color-outline)">Sin datos</p>
              </div>

              <!-- Por categoría fiscal -->
              <div
                class="rounded-2xl p-6"
                style="background-color: var(--color-surface-container-lowest); box-shadow: var(--shadow-sm)"
              >
                <h3 class="text-base font-extrabold mb-4" style="color: var(--color-primary)">Categoría fiscal</h3>
                <div v-if="reporte.porCategoriaFiscal.length" class="flex flex-col gap-3">
                  <div v-for="c in reporte.porCategoriaFiscal" :key="c.categoria" class="flex items-center justify-between">
                    <p class="text-sm font-semibold" style="color: var(--color-on-surface)">{{ c.categoria }}</p>
                    <span class="text-sm font-bold tabular-nums" style="color: var(--color-on-surface)">{{ fmt(c.monto) }}</span>
                  </div>
                </div>
                <p v-else class="text-sm" style="color: var(--color-outline)">Sin datos</p>
              </div>

              <!-- Presupuestos / conversión -->
              <div
                class="rounded-2xl p-6"
                style="background-color: var(--color-surface-container-lowest); box-shadow: var(--shadow-sm)"
              >
                <h3 class="text-base font-extrabold mb-4" style="color: var(--color-primary)">Presupuestos</h3>
                <div class="flex items-baseline gap-2 mb-1">
                  <span class="text-3xl font-extrabold" style="color: var(--color-on-surface)">{{ reporte.tasaConversion }}%</span>
                  <span class="text-xs font-semibold" style="color: var(--color-outline)">conversión</span>
                </div>
                <p class="text-sm" style="color: var(--color-outline)">
                  {{ reporte.cantidadPresupuestos }} creados en el período
                </p>
              </div>
            </div>

            <!-- Top productos + servicios -->
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              <div
                class="rounded-lg overflow-hidden"
                style="background-color: var(--color-surface-container-lowest); box-shadow: var(--shadow-sm)"
              >
                <div class="px-6 py-5" style="border-bottom: 1px solid var(--color-hairline)">
                  <h3 class="text-base font-extrabold" style="color: var(--color-primary)">Top productos</h3>
                </div>
                <div class="overflow-x-auto"><table class="w-full min-w-[640px] text-sm">
                  <tbody>
                    <tr
                      v-for="(p, i) in reporte.topProductos"
                      :key="i"
                      style="border-bottom: 1px solid var(--color-hairline-soft)"
                    >
                      <td class="px-6 py-3 font-medium" style="color: var(--color-on-surface)">{{ p.nombre }}</td>
                      <td class="px-3 py-3 text-center tabular-nums" style="color: var(--color-outline)">{{ p.cantidad }}</td>
                      <td class="px-6 py-3 text-right font-bold tabular-nums" style="color: var(--color-on-surface)">{{ fmt(p.monto) }}</td>
                    </tr>
                    <tr v-if="!reporte.topProductos.length">
                      <td colspan="3" class="px-6 py-8 text-center" style="color: var(--color-outline)">Sin productos vendidos</td>
                    </tr>
                  </tbody>
                </table></div>
              </div>

              <div
                class="rounded-lg overflow-hidden"
                style="background-color: var(--color-surface-container-lowest); box-shadow: var(--shadow-sm)"
              >
                <div class="px-6 py-5" style="border-bottom: 1px solid var(--color-hairline)">
                  <h3 class="text-base font-extrabold" style="color: var(--color-primary)">Top servicios</h3>
                </div>
                <div class="overflow-x-auto"><table class="w-full min-w-[640px] text-sm">
                  <tbody>
                    <tr
                      v-for="(s, i) in reporte.topServicios"
                      :key="i"
                      style="border-bottom: 1px solid var(--color-hairline-soft)"
                    >
                      <td class="px-6 py-3 font-medium" style="color: var(--color-on-surface)">{{ s.nombre }}</td>
                      <td class="px-3 py-3 text-center tabular-nums" style="color: var(--color-outline)">{{ s.cantidad }}</td>
                      <td class="px-6 py-3 text-right font-bold tabular-nums" style="color: var(--color-on-surface)">{{ fmt(s.monto) }}</td>
                    </tr>
                    <tr v-if="!reporte.topServicios.length">
                      <td colspan="3" class="px-6 py-8 text-center" style="color: var(--color-outline)">Sin servicios vendidos</td>
                    </tr>
                  </tbody>
                </table></div>
              </div>
            </div>

            <!-- Por cajero -->
            <div
              class="rounded-lg overflow-hidden"
              style="background-color: var(--color-surface-container-lowest); box-shadow: var(--shadow-sm)"
            >
              <div class="px-6 py-5" style="border-bottom: 1px solid var(--color-hairline)">
                <h3 class="text-base font-extrabold" style="color: var(--color-primary)">Cobros por cajero</h3>
              </div>
              <div class="overflow-x-auto"><table class="w-full min-w-[640px] text-sm">
                <thead>
                  <tr style="border-bottom: 1px solid var(--color-hairline)">
                    <th class="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider" style="color: var(--color-outline)">Cajero</th>
                    <th class="px-3 py-3 text-center text-xs font-bold uppercase tracking-wider" style="color: var(--color-outline)">Cobros</th>
                    <th class="px-6 py-3 text-right text-xs font-bold uppercase tracking-wider" style="color: var(--color-outline)">Monto</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="(c, i) in reporte.porCajero"
                    :key="i"
                    style="border-bottom: 1px solid var(--color-hairline-soft)"
                  >
                    <td class="px-6 py-3 font-medium" style="color: var(--color-on-surface)">{{ c.nombre }}</td>
                    <td class="px-3 py-3 text-center tabular-nums" style="color: var(--color-outline)">{{ c.cantidad }}</td>
                    <td class="px-6 py-3 text-right font-bold tabular-nums" style="color: var(--color-on-surface)">{{ fmt(c.monto) }}</td>
                  </tr>
                  <tr v-if="!reporte.porCajero.length">
                    <td colspan="3" class="px-6 py-8 text-center" style="color: var(--color-outline)">Sin cobros en el período</td>
                  </tr>
                </tbody>
              </table></div>
            </div>
          </template>
        </template>
      </div>
    </main>
  </div>
</template>
