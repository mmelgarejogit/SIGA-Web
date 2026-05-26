<script setup lang="ts">
import AppSidebar from "@/components/AppSidebar.vue"
import AppHeader from "@/components/AppHeader.vue"

const reportes = [
  {
    icon: "shopping_cart",
    title: "Órdenes de Compra",
    description: "Resumen de OC por estado, proveedor y período. Total de compras confirmadas y canceladas.",
    color: "#1e40af",
    bg: "#dbeafe",
  },
  {
    icon: "receipt",
    title: "Facturas de Compra",
    description: "Listado de facturas registradas, montos de IVA, pendientes de pago y vencimientos próximos.",
    color: "#5b21b6",
    bg: "#ede9fe",
  },
  {
    icon: "inventory",
    title: "Recepciones de Mercadería",
    description: "Historial de recepciones por proveedor y producto. Comparativo pedido vs. recibido.",
    color: "#166534",
    bg: "#dcfce7",
  },
  {
    icon: "undo",
    title: "Devoluciones a Proveedores",
    description: "Registro de devoluciones, motivos más frecuentes e impacto en stock.",
    color: "#92400e",
    bg: "#fef3c7",
  },
]
</script>

<template>
  <div class="min-h-screen" style="background-color: var(--color-background)">
    <AppSidebar />
    <AppHeader />

    <main style="margin-left: var(--sidebar-width); transition: margin-left 0.25s ease; padding-top: 64px">
      <div class="p-8">

        <!-- Header -->
        <div class="mb-8">
          <h1 class="text-4xl font-extrabold tracking-tight mb-2">Reportes de Compras</h1>
          <p class="font-medium" style="color: var(--color-on-surface-variant)">
            Análisis y estadísticas del módulo de compras
          </p>
        </div>

        <!-- Cards de reportes -->
        <div class="grid grid-cols-2 gap-6">
          <div v-for="reporte in reportes" :key="reporte.title"
            class="rounded-2xl p-8 flex flex-col gap-4 cursor-default"
            style="background-color: var(--color-surface-container-lowest); box-shadow: 0 1px 3px rgba(196, 197, 213, 0.25); outline: 1px solid rgba(196, 197, 213, 0.15)">

            <div class="w-12 h-12 rounded-2xl flex items-center justify-center"
              :style="`background-color: ${reporte.bg}`">
              <span class="material-symbols-outlined text-2xl"
                :style="`color: ${reporte.color}`">{{ reporte.icon }}</span>
            </div>

            <div>
              <h3 class="text-lg font-extrabold mb-1" style="color: var(--color-on-surface)">{{ reporte.title }}</h3>
              <p class="text-sm leading-relaxed" style="color: var(--color-on-surface-variant)">{{ reporte.description }}</p>
            </div>

            <div class="flex items-center gap-2 mt-auto pt-2 text-sm font-semibold"
              :style="`color: ${reporte.color}`">
              <span class="material-symbols-outlined" style="font-size: 16px">schedule</span>
              Próximamente
            </div>
          </div>
        </div>

      </div>
    </main>
  </div>
</template>
