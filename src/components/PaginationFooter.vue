<script setup lang="ts">
import { computed } from "vue"

// Footer de paginación del design-system (§14): va dentro del wrapper de la tabla,
// máx 7 botones con ellipsis, página activa en bg-primary.
const props = defineProps<{
  currentPage: number
  totalPages: number
  rangeStart: number
  rangeEnd: number
  total: number
  noun: string
}>()

const emit = defineEmits<{ (e: "update:currentPage", value: number): void }>()

const visiblePages = computed<(number | "...")[]>(() => {
  const total = props.totalPages
  const cur = props.currentPage
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const pages: (number | "...")[] = [1]
  if (cur > 3) pages.push("...")
  for (let p = Math.max(2, cur - 1); p <= Math.min(total - 1, cur + 1); p++) pages.push(p)
  if (cur < total - 2) pages.push("...")
  pages.push(total)
  return pages
})

function go(p: number) {
  if (p < 1 || p > props.totalPages || p === props.currentPage) return
  emit("update:currentPage", p)
}
</script>

<template>
  <div
    class="px-6 py-4 flex items-center justify-between flex-wrap gap-4"
    style="border-top: 1px solid var(--color-hairline-soft); background-color: var(--color-surface-container-lowest)"
  >
    <span class="text-sm" style="color: var(--color-on-surface-variant)">
      Mostrando
      <strong style="color: var(--color-on-surface)">{{ rangeStart }}–{{ rangeEnd }}</strong>
      de
      <strong style="color: var(--color-on-surface)">{{ total }}</strong>
      {{ noun }}
    </span>
    <div v-if="totalPages > 1" class="flex items-center gap-1">
      <button
        @click="go(currentPage - 1)"
        :disabled="currentPage === 1"
        class="w-9 h-9 rounded-full flex items-center justify-center transition-all disabled:opacity-30 hover:bg-surface-container-high"
        style="color: var(--color-on-surface-variant)"
      ><span class="material-symbols-outlined" style="font-size: 18px">chevron_left</span></button>
      <template v-for="(p, i) in visiblePages" :key="i">
        <span
          v-if="p === '...'"
          class="w-9 h-9 flex items-center justify-center text-sm"
          style="color: var(--color-outline)"
          >…</span
        >
        <button
          v-else
          @click="go(p as number)"
          class="w-9 h-9 rounded-full text-sm font-semibold transition-all"
          :class="currentPage === p ? 'bg-primary text-on-primary' : 'text-on-surface-variant hover:bg-surface-container-high'"
        >{{ p }}</button>
      </template>
      <button
        @click="go(currentPage + 1)"
        :disabled="currentPage === totalPages"
        class="w-9 h-9 rounded-full flex items-center justify-center transition-all disabled:opacity-30 hover:bg-surface-container-high"
        style="color: var(--color-on-surface-variant)"
      ><span class="material-symbols-outlined" style="font-size: 18px">chevron_right</span></button>
    </div>
  </div>
</template>
