<script setup lang="ts">
</script>

<template>
  <div class="flex flex-col gap-5">
    <!-- Ingresos — sin datos -->
    <div
      class="p-6 rounded-2xl relative overflow-hidden"
      style="background: linear-gradient(135deg, #00288E 0%, #1E40AF 100%); box-shadow: 0 8px 32px rgba(0,40,142,0.25);"
    >
      <div class="absolute -right-8 -top-8 w-32 h-32 rounded-full pointer-events-none" style="background-color: rgba(255,255,255,0.05); filter: blur(16px);"></div>
      <div class="relative z-10 flex flex-col items-center justify-center py-4 gap-2 text-center">
        <span class="material-symbols-outlined" style="color: rgba(184,196,255,0.5); font-size:32px;">sell</span>
        <p class="text-sm font-bold" style="color: rgba(255,255,255,0.7);">Ingresos Semanales</p>
        <p class="text-xs" style="color: rgba(184,196,255,0.6);">Sin datos — módulo de Ventas pendiente</p>
      </div>
    </div>

    <!-- Top ventas — sin datos -->
    <div class="p-6 rounded-2xl" style="background-color: #F1F4F9;">
      <div class="flex items-center gap-3 mb-4">
        <div class="p-2 rounded-xl" style="background-color: white;">
          <span class="material-symbols-outlined" style="color: #00288E; width:20px;height:20px;font-size:20px;">trending_up</span>
        </div>
        <h4 class="font-bold text-sm" style="color: #181C20;">Top Productos</h4>
      </div>
      <div class="flex flex-col items-center py-4 gap-2 text-center">
        <span class="material-symbols-outlined" style="color: #C4C5D5; font-size:28px;">inventory_2</span>
        <p class="text-xs font-medium" style="color: #757684;">No hay datos de ventas disponibles</p>
      </div>
    </div>
  </div>
</template>
