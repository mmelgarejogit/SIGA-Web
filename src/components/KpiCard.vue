<script setup lang="ts">
defineProps<{
  title: string
  value: string
  icon: string
  badge: string
  badgeType: 'positive' | 'neutral' | 'critical'
  iconBg: string
  iconColor: string
}>()

const badgeStyle = (type: string) => {
  if (type === 'positive') return 'background-color: #dcfce7; color: #166534;'
  if (type === 'critical') return 'background-color: #FFDAD6; color: #93000A;'
  return 'background-color: #DDE1FF; color: #00288E;'
}
</script>

<template>
  <div
    class="p-6 rounded-2xl transition-transform hover:scale-[1.02] cursor-default"
    style="background-color: #ffffff; box-shadow: 0 1px 3px rgba(196,197,213,0.3);"
  >
    <div class="flex justify-between items-start mb-5">
      <!-- Icon -->
      <div
        class="w-12 h-12 rounded-2xl flex items-center justify-center"
        :style="`background-color: ${iconBg};`"
      >
        <span
          class="material-symbols-outlined"
          :style="`color: ${iconColor}; font-variation-settings: 'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24;`"
        >{{ icon }}</span>
      </div>
      <!-- Badge -->
      <span
        class="text-xs font-bold px-2.5 py-1 rounded-full"
        :style="badgeStyle(badgeType)"
      >{{ badge }}</span>
    </div>

    <h3 class="text-3xl font-bold tracking-tight mb-1" style="color: #181C20;">{{ value }}</h3>
    <p class="text-sm font-medium" style="color: #757684;">{{ title }}</p>
  </div>
</template>
