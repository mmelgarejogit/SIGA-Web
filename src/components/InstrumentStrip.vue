<script setup lang="ts">
export interface InstrumentStat {
  label: string
  value: string
  hint?: string
  tone?: "neutral" | "positive" | "critical"
}

const props = defineProps<{ stats: InstrumentStat[] }>()

const toneColor: Record<NonNullable<InstrumentStat["tone"]>, string> = {
  neutral: "var(--color-outline)",
  positive: "var(--color-success)",
  critical: "var(--color-error)",
}
function hintColor(tone?: InstrumentStat["tone"]) {
  return toneColor[tone ?? "neutral"]
}
</script>

<template>
  <div class="instrument-strip" :style="`--strip-cols: ${props.stats.length}`">
    <div v-for="s in stats" :key="s.label" class="instrument-cell">
      <span class="instrument-label">{{ s.label }}</span>
      <span class="instrument-value">{{ s.value }}</span>
      <span v-if="s.hint" class="instrument-hint" :style="`color: ${hintColor(s.tone)}`">{{ s.hint }}</span>
    </div>
  </div>
</template>

<style scoped>
.instrument-strip {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1px;
  background-color: var(--color-hairline);
  border-radius: var(--radius-3xl);
  overflow: hidden;
  box-shadow: var(--shadow-lg);
}
@media (min-width: 1280px) {
  .instrument-strip {
    grid-template-columns: repeat(var(--strip-cols), 1fr);
  }
}

.instrument-cell {
  background-color: var(--color-surface-container-lowest);
  padding: 1.25rem 1.1rem;
  min-width: 0;
}
@media (min-width: 640px) {
  .instrument-cell {
    padding: 1.6rem 1.75rem;
  }
}

.instrument-label {
  display: block;
  font-family: var(--font-mono);
  font-size: 0.66rem;
  font-weight: 600;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--color-outline);
  margin-bottom: 0.7rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.instrument-value {
  display: block;
  font-family: var(--font-mono);
  font-size: clamp(1.15rem, 4vw, 2rem);
  font-weight: 700;
  letter-spacing: -0.01em;
  font-variant-numeric: tabular-nums;
  color: var(--color-on-surface);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.instrument-hint {
  display: block;
  margin-top: 0.4rem;
  font-family: var(--font-body);
  font-size: 0.75rem;
  font-weight: 700;
}
</style>
