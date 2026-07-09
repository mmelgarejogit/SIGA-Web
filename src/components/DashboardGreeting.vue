<script setup lang="ts">
import FocusRingWatermark from "@/components/FocusRingWatermark.vue"

defineProps<{ greeting: string; name: string; todayLabel: string }>()
</script>

<template>
  <div class="relative mb-10 overflow-hidden">
    <FocusRingWatermark class="hidden lg:block" style="right: -110px; top: -150px" :size="380" />

    <div class="relative flex flex-wrap items-end justify-between gap-4" style="z-index: 1">
      <div>
        <p class="dash-eyebrow">
          <span class="dash-tick" aria-hidden="true"></span>{{ greeting }}, {{ name }}
        </p>
        <h1 class="text-5xl font-extrabold tracking-tight leading-tight">
          <slot />
        </h1>
        <p v-if="$slots.sub" class="mt-3 text-sm font-semibold" style="color: var(--color-outline)">
          <slot name="sub" />
        </p>
      </div>
      <p class="text-sm font-medium capitalize hidden lg:block pb-2" style="color: var(--color-outline)">
        {{ todayLabel }}
      </p>
    </div>
  </div>
</template>

<style scoped>
/* Eco del hero de auth: etiqueta de instrumento (mono) + tick focal cian. */
.dash-eyebrow {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  font-family: var(--font-mono);
  font-size: 0.72rem;
  font-weight: 500;
  letter-spacing: 0.26em;
  text-transform: uppercase;
  color: var(--color-primary);
  margin-bottom: 0.65rem;
}
.dash-tick {
  flex-shrink: 0;
  width: 1.5rem;
  height: 1px;
  background: var(--color-secondary);
}
</style>
