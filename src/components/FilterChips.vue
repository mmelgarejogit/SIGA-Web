<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from "vue"

export type FilterOption = {
  value: string
  label: string
  dot?: string
}

const props = defineProps<{
  modelValue: string[]
  options: FilterOption[]
  placeholder?: string
}>()

const emit = defineEmits<{
  "update:modelValue": [val: string[]]
}>()

const open = ref(false)
const triggerRef = ref<HTMLElement | null>(null)
const dropRef = ref<HTMLElement | null>(null)

const selected = computed(() => props.modelValue)

function toggle() {
  open.value = !open.value
}

function toggleOption(val: string) {
  const next = selected.value.includes(val)
    ? selected.value.filter((v) => v !== val)
    : [...selected.value, val]
  emit("update:modelValue", next)
}

function removeChip(val: string) {
  emit(
    "update:modelValue",
    selected.value.filter((v) => v !== val),
  )
}

function clear() {
  emit("update:modelValue", [])
  open.value = false
}

function labelOf(val: string) {
  return props.options.find((o) => o.value === val)?.label ?? val
}

function dotOf(val: string) {
  return props.options.find((o) => o.value === val)?.dot
}

function onClickOutside(e: MouseEvent) {
  if (
    triggerRef.value &&
    !triggerRef.value.contains(e.target as Node) &&
    dropRef.value &&
    !dropRef.value.contains(e.target as Node)
  ) {
    open.value = false
  }
}

onMounted(() => document.addEventListener("mousedown", onClickOutside))
onUnmounted(() => document.removeEventListener("mousedown", onClickOutside))
</script>

<template>
  <div class="fc-wrap">
    <!-- Disparador -->
    <div class="fc-trigger-wrap">
      <button
        ref="triggerRef"
        type="button"
        class="fc-trigger"
        :class="{ open }"
        @click="toggle"
        :aria-expanded="open"
      >
        <span class="material-symbols-outlined" style="font-size: 18px">filter_list</span>
        {{ placeholder ?? "Filtrar" }}
        <span v-if="selected.length" class="fc-badge">{{ selected.length }}</span>
        <span
          class="material-symbols-outlined fc-chevron"
          :class="{ rotated: open }"
          style="font-size: 16px"
          >expand_more</span
        >
      </button>

      <!-- Dropdown -->
      <div v-if="open" ref="dropRef" class="fc-dropdown">
        <p class="fc-group-label">{{ placeholder ?? "Estado" }}</p>
        <button
          v-for="opt in options"
          :key="opt.value"
          type="button"
          class="fc-item"
          :class="{ selected: selected.includes(opt.value) }"
          @click="toggleOption(opt.value)"
        >
          <span class="fc-check">
            <span
              v-if="selected.includes(opt.value)"
              class="material-symbols-outlined"
              >check</span
            >
          </span>
          <span v-if="opt.dot" class="fc-dot" :style="`background: ${opt.dot}`"></span>
          {{ opt.label }}
        </button>
        <div v-if="selected.length" class="fc-footer">
          <button type="button" class="fc-clear-dd" @click="clear">Limpiar filtros</button>
        </div>
      </div>
    </div>

    <!-- Chips -->
    <template v-for="val in selected" :key="val">
      <span class="fc-chip">
        <span v-if="dotOf(val)" class="fc-chip-dot" :style="`background: ${dotOf(val)}`"></span>
        {{ labelOf(val) }}
        <button
          type="button"
          class="fc-chip-x"
          @click="removeChip(val)"
          :aria-label="`Quitar ${labelOf(val)}`"
          >×</button
        >
      </span>
    </template>

    <button v-if="selected.length > 1" type="button" class="fc-clear-all" @click="clear">
      Limpiar todo
    </button>
  </div>
</template>

<style scoped>
.fc-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.fc-trigger-wrap {
  position: relative;
}

.fc-trigger {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 36px;
  padding: 0 12px;
  background: var(--color-surface);
  border: 1px solid var(--color-outline-variant);
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  color: var(--color-on-surface);
  cursor: pointer;
  transition: background 0.12s;
  font-family: inherit;
}
.fc-trigger:hover {
  background: var(--color-surface-container-high);
}
.fc-trigger.open {
  border-color: var(--color-primary);
  color: var(--color-primary);
}

.fc-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 17px;
  height: 17px;
  border-radius: 50%;
  background: var(--color-primary);
  color: #fff;
  font-size: 10px;
  font-weight: 700;
}

.fc-chevron {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transform-origin: center;
  transition: transform 0.15s;
}
.fc-chevron.rotated {
  transform: rotate(180deg);
}

.fc-dropdown {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  z-index: 50;
  background: var(--color-surface-container-lowest);
  border: 1px solid var(--color-outline-variant);
  border-radius: 12px;
  padding: 6px;
  min-width: 200px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.fc-group-label {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  color: var(--color-outline);
  padding: 6px 10px 4px;
  margin: 0;
}

.fc-item {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 7px 10px;
  border-radius: 8px;
  border: none;
  background: transparent;
  font-size: 13px;
  font-family: inherit;
  color: var(--color-on-surface);
  cursor: pointer;
  text-align: left;
  transition: background 0.1s;
}
.fc-item:hover {
  background: var(--color-surface-container-high);
}
.fc-item.selected {
  color: var(--color-primary);
  font-weight: 500;
}

.fc-check {
  width: 16px;
  height: 16px;
  border-radius: 4px;
  flex-shrink: 0;
  border: 1.5px solid var(--color-outline-variant);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  color: #fff;
}
.fc-check .material-symbols-outlined {
  font-size: 11px;
  width: 11px;
  height: 11px;
  line-height: 1;
  display: block;
}
.fc-item.selected .fc-check {
  background: var(--color-primary);
  border-color: var(--color-primary);
}

.fc-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.fc-footer {
  border-top: 1px solid var(--color-outline-variant);
  margin-top: 4px;
  padding: 6px 6px 2px;
  display: flex;
  justify-content: flex-end;
  opacity: 0.4;
}
.fc-clear-dd {
  font-size: 12px;
  color: var(--color-on-surface-variant);
  border: none;
  background: none;
  cursor: pointer;
  font-family: inherit;
}
.fc-clear-dd:hover {
  color: var(--color-error);
}

.fc-chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 28px;
  padding: 0 8px;
  background: var(--color-surface-container-low);
  border: 1px solid var(--color-outline-variant);
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
  color: var(--color-on-surface);
  animation: fc-in 0.12s ease;
}
@keyframes fc-in {
  from {
    opacity: 0;
    transform: scale(0.9);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.fc-chip-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
}

.fc-chip-x {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: none;
  background: var(--color-outline-variant);
  color: var(--color-on-surface-variant);
  font-size: 14px;
  cursor: pointer;
  padding: 0;
  line-height: 1;
  transition: background 0.1s;
}
.fc-chip-x:hover {
  background: var(--color-error-container);
  color: var(--color-error);
}

.fc-clear-all {
  font-size: 12px;
  color: var(--color-outline);
  border: none;
  background: none;
  cursor: pointer;
  padding: 0 4px;
  font-family: inherit;
}
.fc-clear-all:hover {
  color: var(--color-error);
}
</style>
