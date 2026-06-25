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
    color: "#1e40af",
    bg: "#dbeafe",
    route: "/reportes/ventas",
    activo: true,
  },
  {
    icon: "event_note",
    title: "Reporte de Citas",
    description:
      "Turnos por estado y profesional, tasa de ausentismo, consultas y recetas emitidas por período.",
    color: "#166534",
    bg: "#dcfce7",
    route: "/reportes/citas",
    activo: true,
  },
  {
    icon: "warehouse",
    title: "Reporte de Inventario",
    description:
      "Stock crítico, valorización del inventario, productos sin rotación y movimientos por período.",
    color: "#92400e",
    bg: "#fef3c7",
    route: "/reportes/inventario",
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
      <div class="p-8">
        <!-- Header -->
        <div class="mb-8">
          <h1 class="text-4xl font-extrabold tracking-tight mb-2">Reportes</h1>
          <p class="font-medium" style="color: var(--color-on-surface-variant)">
            Análisis y estadísticas del sistema
          </p>
        </div>

        <!-- Cards -->
        <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          <component
            :is="reporte.activo ? 'button' : 'div'"
            v-for="reporte in reportes"
            :key="reporte.title"
            type="button"
            class="text-left rounded-2xl p-8 flex flex-col gap-4 transition-all"
            :class="reporte.activo ? 'cursor-pointer hover:scale-[1.02]' : 'cursor-default'"
            :style="`background-color: var(--color-surface-container-lowest); box-shadow: 0 1px 3px rgba(196, 197, 213, 0.25); outline: 1px solid rgba(196, 197, 213, 0.15); ${reporte.activo ? '' : 'opacity: 0.7;'}`"
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
      </div>
    </main>
  </div>
</template>
