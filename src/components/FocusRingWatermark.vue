<script setup lang="ts">
import { ref, onMounted } from "vue"

withDefaults(defineProps<{ size?: number }>(), { size: 380 })

// Eco del hero de login: los anillos entran desenfocados y se asientan en foco.
const focused = ref(false)
onMounted(() => {
  requestAnimationFrame(() => requestAnimationFrame(() => (focused.value = true)))
})
</script>

<template>
  <div
    class="focus-rings"
    :class="{ focused }"
    :style="`width:${size}px;height:${size}px`"
    aria-hidden="true"
  >
    <svg viewBox="0 0 600 600" preserveAspectRatio="xMidYMid slice">
      <circle cx="300" cy="300" r="286" />
      <circle cx="300" cy="300" r="232" />
      <circle cx="300" cy="300" r="180" />
      <circle cx="300" cy="300" r="130" />
      <circle cx="300" cy="300" r="84" class="ring-focal" />
    </svg>
  </div>
</template>

<style scoped>
.focus-rings {
  position: absolute;
  pointer-events: none;
  opacity: 0;
  transform: scale(1.06);
  filter: blur(6px);
  transition:
    opacity 1s var(--ease-standard),
    transform 1.2s var(--ease-standard),
    filter 1s var(--ease-standard);
}
.focus-rings.focused {
  opacity: 1;
  transform: scale(1);
  filter: blur(0);
}
.focus-rings svg {
  width: 100%;
  height: 100%;
  overflow: visible;
}
.focus-rings circle {
  fill: none;
  stroke: var(--color-outline-variant);
  stroke-width: 1;
  opacity: 0.55;
}
.focus-rings .ring-focal {
  stroke: var(--color-secondary);
  stroke-width: 1.5;
  opacity: 0.6;
}

@media (prefers-reduced-motion: reduce) {
  .focus-rings {
    transition: none;
    opacity: 1;
    transform: none;
    filter: none;
  }
}
</style>
