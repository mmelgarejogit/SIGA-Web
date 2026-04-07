<script setup lang="ts">
const days = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
const values = [850000, 1200000, 950000, 1400000, 1100000, 1600000, 1250000]

const max = Math.max(...values)
const min = Math.min(...values)

const normalize = (v: number) => ((v - min) / (max - min)) * 70 + 10

const points = values
  .map((v, i) => {
    const x = (i / (values.length - 1)) * 240 + 20
    const y = 100 - normalize(v)
    return `${x},${y}`
  })
  .join(' ')

const areaPoints = `20,100 ${points} 260,100`

const formatM = (v: number) => `₲${(v / 1000000).toFixed(1)}M`
</script>

<template>
  <div class="bg-white rounded-xl border border-slate-200 shadow-sm h-full">
    <div class="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
      <div>
        <h2 class="text-base font-semibold text-[#1E3A5F]">Resumen de Ventas</h2>
        <p class="text-xs text-slate-500 mt-0.5">Últimos 7 días</p>
      </div>
      <span class="text-xs bg-[#F0F4FF] text-[#1E40AF] font-semibold px-2.5 py-1 rounded-full">
        ₲ 8.35M total
      </span>
    </div>

    <div class="px-5 py-4">
      <!-- SVG Chart -->
      <svg viewBox="0 0 280 110" class="w-full" preserveAspectRatio="none" style="height: 120px;">
        <defs>
          <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#3B82F6" stop-opacity="0.25" />
            <stop offset="100%" stop-color="#3B82F6" stop-opacity="0.02" />
          </linearGradient>
        </defs>

        <!-- Grid lines -->
        <line x1="20" y1="20" x2="260" y2="20" stroke="#f1f5f9" stroke-width="1" />
        <line x1="20" y1="45" x2="260" y2="45" stroke="#f1f5f9" stroke-width="1" />
        <line x1="20" y1="70" x2="260" y2="70" stroke="#f1f5f9" stroke-width="1" />
        <line x1="20" y1="95" x2="260" y2="95" stroke="#f1f5f9" stroke-width="1" />

        <!-- Area fill -->
        <polygon :points="areaPoints" fill="url(#salesGrad)" />

        <!-- Line -->
        <polyline
          :points="points"
          fill="none"
          stroke="#3B82F6"
          stroke-width="2.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        />

        <!-- Dots -->
        <circle
          v-for="(v, i) in values"
          :key="i"
          :cx="(i / (values.length - 1)) * 240 + 20"
          :cy="100 - normalize(v)"
          r="3.5"
          fill="white"
          stroke="#3B82F6"
          stroke-width="2"
        />

        <!-- Today dot highlight -->
        <circle
          :cx="(6 / (values.length - 1)) * 240 + 20"
          :cy="100 - normalize(values[6])"
          r="5"
          fill="#1E40AF"
          stroke="white"
          stroke-width="2"
        />
      </svg>

      <!-- Labels -->
      <div class="flex justify-between mt-2">
        <span
          v-for="(day, i) in days"
          :key="day"
          :class="['text-xs text-center', i === 6 ? 'text-[#1E40AF] font-bold' : 'text-slate-400']"
          style="width: 14.28%"
        >
          {{ day }}
        </span>
      </div>

      <!-- Stats row -->
      <div class="grid grid-cols-3 gap-2 mt-5 pt-4 border-t border-slate-100">
        <div class="text-center">
          <p class="text-xs text-slate-500">Mejor día</p>
          <p class="text-sm font-bold text-[#1E3A5F] mt-0.5">{{ formatM(max) }}</p>
        </div>
        <div class="text-center border-x border-slate-100">
          <p class="text-xs text-slate-500">Promedio</p>
          <p class="text-sm font-bold text-[#1E3A5F] mt-0.5">
            {{ formatM(Math.round(values.reduce((a, b) => a + b, 0) / values.length)) }}
          </p>
        </div>
        <div class="text-center">
          <p class="text-xs text-slate-500">Hoy</p>
          <p class="text-sm font-bold text-[#1E40AF] mt-0.5">{{ formatM(values[6]) }}</p>
        </div>
      </div>
    </div>
  </div>
</template>
