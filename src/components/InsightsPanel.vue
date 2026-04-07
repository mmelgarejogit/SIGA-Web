<script setup lang="ts">
const topFrames = [
  { name: 'Ray-Ban Wayfarer', sales: '42 vtas', color: '#00288E' },
  { name: 'Oakley Holbrook', sales: '38 vtas', color: '#006780' },
  { name: 'Vogue VO5322', sales: '24 vtas', color: '#2000B1' },
]
</script>

<template>
  <div class="flex flex-col gap-5">
    <!-- Primary insight card -->
    <div
      class="p-6 rounded-2xl text-white relative overflow-hidden"
      style="background: linear-gradient(135deg, #00288E 0%, #1E40AF 100%); box-shadow: 0 8px 32px rgba(0,40,142,0.25);"
    >
      <!-- Lens flare -->
      <div
        class="absolute -right-8 -top-8 w-32 h-32 rounded-full pointer-events-none"
        style="background-color: rgba(255,255,255,0.05); filter: blur(16px);"
      ></div>
      <div
        class="absolute -left-4 bottom-0 w-24 h-24 rounded-full pointer-events-none"
        style="background-color: rgba(59,130,246,0.15); filter: blur(20px);"
      ></div>

      <div class="relative z-10">
        <h4
          class="text-[10px] font-bold uppercase tracking-[0.2em] mb-4"
          style="color: rgba(184,196,255,0.8);"
        >Top Armazones</h4>
        <p class="text-3xl font-bold mb-3">₲ 84.200.000</p>
        <div class="w-full h-1.5 rounded-full mb-2" style="background-color: rgba(255,255,255,0.2);">
          <div class="h-full rounded-full" style="width: 75%; background-color: white;"></div>
        </div>
        <p class="text-xs" style="color: rgba(219,234,254,0.8);">75% de la meta alcanzada para Mayo</p>
      </div>
    </div>

    <!-- Top frames breakdown -->
    <div
      class="p-6 rounded-2xl"
      style="background-color: #F1F4F9;"
    >
      <div class="flex items-center gap-3 mb-5">
        <div
          class="p-2 rounded-xl"
          style="background-color: white;"
        >
          <span class="material-symbols-outlined" style="color: #00288E; width:20px;height:20px;font-size:20px;">trending_up</span>
        </div>
        <h4 class="font-bold text-sm" style="color: #181C20;">Top Armazones</h4>
      </div>

      <ul class="space-y-4">
        <li
          v-for="frame in topFrames"
          :key="frame.name"
          class="flex items-center justify-between"
        >
          <div class="flex items-center gap-2.5">
            <span
              class="w-2 h-2 rounded-full flex-shrink-0"
              :style="`background-color: ${frame.color};`"
            ></span>
            <span class="text-sm" style="color: #444653;">{{ frame.name }}</span>
          </div>
          <span class="text-xs font-bold" style="color: #00288E;">{{ frame.sales }}</span>
        </li>
      </ul>
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
