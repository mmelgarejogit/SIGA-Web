<script setup lang="ts">
import { useRouter } from "vue-router"
import AppSidebar from "@/components/AppSidebar.vue"
import AppHeader from "@/components/AppHeader.vue"

const router = useRouter()

interface ReporteCard {
  icon: string
  title: string
  description: string
  color: string
  bg: string
  route: string
  activo: boolean
}

const reportes: ReporteCard[] = [
  {
    icon: "trending_up",
    title: "Reporte de Ventas",
    description:
      "Facturación y cobros del período, métodos de pago, top productos y servicios, ventas por cajero y conversión de presupuestos.",
    color: "var(--color-on-info-container)",
    bg: "var(--color-info-container)",
    route: "/reportes/ventas",
    activo: true,
  },
  {
    icon: "event_note",
    title: "Reporte de Citas",
    description:
      "Turnos por estado y profesional, tasa de ausentismo, consultas y recetas emitidas por período.",
    color: "var(--color-on-success-container)",
    bg: "var(--color-success-container)",
    route: "/reportes/citas",
    activo: true,
  },
  {
    icon: "warehouse",
    title: "Reporte de Inventario",
    description:
      "Stock crítico, valorización del inventario, productos sin rotación y movimientos por período.",
    color: "var(--color-on-warning-container)",
    bg: "var(--color-warning-container)",
    route: "/reportes/inventario",
    activo: true,
  },
]

const operativos: ReporteCard[] = [
  {
    icon: "receipt_long",
    title: "Ventas",
    description:
      "Listado de ventas con filtros por fecha, método de pago, categoría, vendedor y sucursal. Exportable a PDF y CSV.",
    color: "var(--color-on-info-container)",
    bg: "var(--color-info-container)",
    route: "/reportes/operativo/ventas",
    activo: true,
  },
  {
    icon: "shopping_cart",
    title: "Compras",
    description:
      "Facturas de compra por período, proveedor, método de pago, operador y sucursal. Exportable a PDF y CSV.",
    color: "var(--color-on-success-container)",
    bg: "var(--color-success-container)",
    route: "/reportes/operativo/compras",
    activo: true,
  },
  {
    icon: "inventory",
    title: "Movimientos de inventario",
    description:
      "Entradas y salidas de stock por producto, categoría, tipo, operador y sucursal. Exportable a PDF y CSV.",
    color: "var(--color-on-warning-container)",
    bg: "var(--color-warning-container)",
    route: "/reportes/operativo/inventario",
    activo: true,
  },
  {
    icon: "account_balance_wallet",
    title: "Movimientos de caja",
    description:
      "Ingresos y egresos de caja por método de pago, tipo, operador y sucursal. Exportable a PDF y CSV.",
    color: "var(--color-on-info-container)",
    bg: "var(--color-info-container)",
    route: "/reportes/operativo/caja",
    activo: true,
  },
]

function abrir(reporte: ReporteCard) {
  if (reporte.activo) router.push(reporte.route)
}
</script>

<template>
  <div class="min-h-screen" style="background-color: var(--color-background)">
    <AppSidebar />
    <AppHeader />

    <main style="margin-left: var(--sidebar-width); transition: margin-left 0.25s ease; padding-top: 64px">
      <div class="p-4 sm:p-6 lg:p-8">
        <!-- Header -->
        <div class="mb-8">
          <h1 class="text-4xl font-extrabold tracking-tight mb-2">Reportes</h1>
          <p class="font-medium" style="color: var(--color-on-surface-variant)">
            Análisis y estadísticas del sistema
          </p>
        </div>

        <!-- Análisis y gestión -->
        <h3 class="text-xl font-extrabold mb-4" style="color: var(--color-primary)">Análisis y gestión</h3>
        <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          <component
            :is="reporte.activo ? 'button' : 'div'"
            v-for="reporte in reportes"
            :key="reporte.title"
            type="button"
            class="text-left rounded-2xl p-8 flex flex-col gap-4 transition-all"
            :class="reporte.activo ? 'cursor-pointer hover:scale-[1.02]' : 'cursor-default'"
            :style="`background-color: var(--color-surface-container-lowest); box-shadow: var(--shadow-sm); outline: 1px solid var(--color-hairline); ${reporte.activo ? '' : 'opacity: 0.7;'}`"
            @click="abrir(reporte)"
          >
            <div
              class="w-12 h-12 rounded-2xl flex items-center justify-center"
              :style="`background-color: ${reporte.bg}`"
            >
              <span class="material-symbols-outlined text-2xl" :style="`color: ${reporte.color}`">
                {{ reporte.icon }}
              </span>
            </div>

            <div>
              <h3 class="text-lg font-extrabold mb-1" style="color: var(--color-on-surface)">
                {{ reporte.title }}
              </h3>
              <p class="text-sm leading-relaxed" style="color: var(--color-on-surface-variant)">
                {{ reporte.description }}
              </p>
            </div>

            <div
              v-if="reporte.activo"
              class="flex items-center gap-2 mt-auto pt-2 text-sm font-bold"
              :style="`color: ${reporte.color}`"
            >
              <span>Ver reporte</span>
              <span class="material-symbols-outlined" style="font-size: 18px">arrow_forward</span>
            </div>
            <div
              v-else
              class="flex items-center gap-2 mt-auto pt-2 text-sm font-semibold"
              style="color: var(--color-outline)"
            >
              <span class="material-symbols-outlined" style="font-size: 16px">schedule</span>
              Próximamente
            </div>
          </component>
        </div>

        <!-- Control operativo -->
        <h3 class="text-xl font-extrabold mt-10 mb-4" style="color: var(--color-primary)">Control operativo</h3>
        <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          <button
            v-for="reporte in operativos"
            :key="reporte.title"
            type="button"
            class="text-left rounded-2xl p-8 flex flex-col gap-4 transition-all cursor-pointer hover:scale-[1.02]"
            style="background-color: var(--color-surface-container-lowest); box-shadow: var(--shadow-sm); outline: 1px solid var(--color-hairline)"
            @click="abrir(reporte)"
          >
            <div class="w-12 h-12 rounded-2xl flex items-center justify-center" :style="`background-color: ${reporte.bg}`">
              <span class="material-symbols-outlined text-2xl" :style="`color: ${reporte.color}`">{{ reporte.icon }}</span>
            </div>
            <div>
              <h3 class="text-lg font-extrabold mb-1" style="color: var(--color-on-surface)">{{ reporte.title }}</h3>
              <p class="text-sm leading-relaxed" style="color: var(--color-on-surface-variant)">{{ reporte.description }}</p>
            </div>
            <div class="flex items-center gap-2 mt-auto pt-2 text-sm font-bold" :style="`color: ${reporte.color}`">
              <span>Ver reporte</span>
              <span class="material-symbols-outlined" style="font-size: 18px">arrow_forward</span>
            </div>
          </button>
        </div>
      </div>
    </main>
  </div>
</template>
