<script setup lang="ts">
const days = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"]
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
  .join(" ")

const areaPoints = `20,100 ${points} 260,100`

const formatM = (v: number) => `₲${(v / 1000000).toFixed(1)}M`
</script>

<template>
  <div
    class="rounded-lg overflow-hidden"
    style="
      background-color: var(--color-surface-container-lowest);
      box-shadow: var(--shadow-sm);
      outline: 1px solid var(--color-hairline);
    "
  >
    <div
      class="px-5 py-4 flex justify-between items-center"
      style="border-bottom: 1px solid var(--color-hairline)"
    >
      <div>
        <h2 class="text-base font-bold" style="color: var(--color-on-surface)">
          Resumen de Ventas
        </h2>
        <p class="text-xs font-medium mt-0.5" style="color: var(--color-outline)">Últimos 7 días</p>
      </div>
      <span
        class="text-xs font-bold px-2.5 py-1 rounded-full"
        style="background-color: color-mix(in srgb, var(--color-primary) 10%, transparent); color: var(--color-primary)"
      >
        ₲ 8.35M total
      </span>
    </div>

    <div class="px-5 py-4">
      <svg viewBox="0 0 280 110" class="w-full" preserveAspectRatio="none" style="height: 120px">
        <defs>
          <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="var(--color-primary)" stop-opacity="0.15" />
            <stop offset="100%" stop-color="var(--color-primary)" stop-opacity="0.02" />
          </linearGradient>
        </defs>

        <line x1="20" y1="20" x2="260" y2="20" stroke="var(--color-hairline-strong)" stroke-width="1" />
        <line x1="20" y1="45" x2="260" y2="45" stroke="var(--color-hairline-strong)" stroke-width="1" />
        <line x1="20" y1="70" x2="260" y2="70" stroke="var(--color-hairline-strong)" stroke-width="1" />
        <line x1="20" y1="95" x2="260" y2="95" stroke="var(--color-hairline-strong)" stroke-width="1" />

        <polygon :points="areaPoints" fill="url(#salesGrad)" />

        <polyline
          :points="points"
          fill="none"
          stroke="var(--color-primary)"
          stroke-width="2.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        />

        <circle
          v-for="(v, i) in values"
          :key="i"
          :cx="(i / (values.length - 1)) * 240 + 20"
          :cy="100 - normalize(v)"
          r="3.5"
          fill="var(--color-surface-container-lowest)"
          stroke="var(--color-primary)"
          stroke-width="2"
        />

        <circle
          :cx="(6 / (values.length - 1)) * 240 + 20"
          :cy="100 - normalize(values[6]!)"
          r="5"
          fill="var(--color-primary)"
          stroke="var(--color-surface-container-lowest)"
          stroke-width="2"
        />
      </svg>

      <div class="flex justify-between mt-2">
        <span
          v-for="(day, i) in days"
          :key="day"
          class="text-xs text-center font-medium"
          :style="
            i === 6
              ? 'color: var(--color-primary); font-weight: 700;'
              : 'color: var(--color-outline);'
          "
          style="width: 14.28%"
        >
          {{ day }}
        </span>
      </div>

      <div
        class="grid grid-cols-3 gap-2 mt-5 pt-4"
        style="border-top: 1px solid var(--color-hairline)"
      >
        <div class="text-center">
          <p class="text-xs font-medium" style="color: var(--color-outline)">Mejor día</p>
          <p class="text-sm font-bold mt-0.5" style="color: var(--color-on-surface)">
            {{ formatM(max) }}
          </p>
        </div>
        <div
          class="text-center"
          style="
            border-left: 1px solid var(--color-hairline);
            border-right: 1px solid var(--color-hairline);
          "
        >
          <p class="text-xs font-medium" style="color: var(--color-outline)">Promedio</p>
          <p class="text-sm font-bold mt-0.5" style="color: var(--color-on-surface)">
            {{ formatM(Math.round(values.reduce((a, b) => a + b, 0) / values.length)) }}
          </p>
        </div>
        <div class="text-center">
          <p class="text-xs font-medium" style="color: var(--color-outline)">Hoy</p>
          <p class="text-sm font-bold mt-0.5" style="color: var(--color-on-surface)">
            {{ formatM(values[6]!) }}
          </p>
        </div>
      </div>
    </div>
  </div>
</template>
