<script setup lang="ts">
defineProps<{
  title: string
  value: string
  icon: string
  badge?: string
  badgeType?: "positive" | "neutral" | "critical"
  iconBg: string
  iconColor: string
}>()

const badgeStyle = (type?: string) => {
  if (type === "positive") return "background-color: #dcfce7; color: #166534;"
  if (type === "critical")
    return "background-color: var(--color-error-container); color: var(--color-on-error-container);"
  return "background-color: var(--color-primary-fixed); color: var(--color-primary);"
}
</script>

<template>
  <div
    class="p-6 rounded-2xl transition-transform hover:scale-[1.02] cursor-default"
    style="
      background-color: var(--color-surface-container-lowest);
      box-shadow: 0 1px 3px rgba(196, 197, 213, 0.3);
    "
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
          >{{ icon }}</span
        >
      </div>
      <!-- Badge -->
      <span v-if="badge" class="text-xs font-bold px-2.5 py-1 rounded-full" :style="badgeStyle(badgeType)">{{
        badge
      }}</span>
    </div>

    <h3 class="text-3xl font-bold tracking-tight mb-1" style="color: var(--color-on-surface)">
      {{ value }}
    </h3>
    <p class="text-sm font-medium" style="color: var(--color-outline)">{{ title }}</p>
  </div>
</template>
