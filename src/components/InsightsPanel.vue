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

    <!-- Promo card -->
    <div
      class="relative rounded-2xl overflow-hidden cursor-pointer group"
      style="height: 160px;"
    >
      <!-- Gradient placeholder (no external image) -->
      <div
        class="absolute inset-0 transition-transform duration-700 group-hover:scale-110"
        style="background: linear-gradient(135deg, #1E3A5F 0%, #006780 50%, #2000B1 100%);"
      >
        <!-- Decorative lens circles -->
        <div class="absolute top-4 right-8 w-20 h-20 rounded-full" style="border: 2px solid rgba(255,255,255,0.15);"></div>
        <div class="absolute top-8 right-12 w-10 h-10 rounded-full" style="border: 1px solid rgba(255,255,255,0.1);"></div>
        <div class="absolute -bottom-4 left-4 w-24 h-24 rounded-full" style="border: 2px solid rgba(255,255,255,0.08);"></div>
        <span
          class="material-symbols-outlined absolute top-1/2 right-10 -translate-y-1/2 opacity-20"
          style="font-size: 64px; width:64px; height:64px; color:white; font-variation-settings:'FILL' 0,'wght' 100,'GRAD' 0,'opsz' 48;"
        >visibility</span>
      </div>

      <div class="absolute inset-0 flex flex-col justify-end p-4" style="background: linear-gradient(to top, rgba(0,0,0,0.75), transparent);">
        <p class="text-white font-bold text-sm">Colección Primavera</p>
        <p class="text-[10px] uppercase tracking-wider" style="color: rgba(255,255,255,0.65);">
          Llegada de nuevos modelos
        </p>
      </div>

      <button
        class="absolute bottom-4 right-4 w-8 h-8 rounded-full flex items-center justify-center transition-all hover:scale-110"
        style="background-color: white;"
      >
        <span class="material-symbols-outlined" style="color: #00288E; width:16px;height:16px;font-size:16px; font-variation-settings:'FILL' 1,'wght' 400,'GRAD' 0,'opsz' 20;">add</span>
      </button>
    </div>
  </div>
</template>
