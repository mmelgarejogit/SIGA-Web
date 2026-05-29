<script setup lang="ts">
import { ref, computed } from "vue"

const props = defineProps<{
  modelValue: string   // yyyy-mm-dd or ""
  hasError?: boolean
  placeholder?: string
}>()

const emit = defineEmits<{ "update:modelValue": [string] }>()

const inputRef = ref<HTMLInputElement | null>(null)

function openPicker() {
  if (!inputRef.value) return
  if ("showPicker" in inputRef.value) (inputRef.value as any).showPicker()
  else inputRef.value.focus()
}

const displayValue = computed(() => {
  if (!props.modelValue || !/^\d{4}-\d{2}-\d{2}$/.test(props.modelValue)) return ""
  const [y, m, d] = props.modelValue.split("-")
  return `${d}/${m}/${y}`
})

function onChange(e: Event) {
  emit("update:modelValue", (e.target as HTMLInputElement).value)
}

function triggerStyle() {
  if (props.hasError)
    return "border: 1.5px solid var(--color-error); background-color: #FFF8F7;"
  return "border: 1px solid var(--color-outline-variant); background-color: var(--color-surface);"
}
</script>

<template>
  <div class="di-wrap">
    <button type="button" class="di-trigger" :style="triggerStyle()" @click="openPicker">
      <span class="material-symbols-outlined di-icon">calendar_today</span>
      <span class="di-value" :class="{ placeholder: !displayValue }">
        {{ displayValue || placeholder || 'dd/mm/aaaa' }}
      </span>
    </button>
    <input
      ref="inputRef"
      type="date"
      :value="modelValue"
      class="di-hidden"
      @change="onChange"
    />
  </div>
</template>

<style scoped>
.di-wrap {
  position: relative;
  width: 100%;
}

.di-trigger {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 16px;
  height: 48px;
  border-radius: 12px;
  font-size: 14px;
  font-family: inherit;
  color: var(--color-on-surface);
  cursor: pointer;
  text-align: left;
  transition: border-color 0.15s, background-color 0.15s;
}
.di-trigger:hover {
  border-color: var(--color-outline) !important;
}

.di-icon {
  font-size: 18px;
  flex-shrink: 0;
  color: var(--color-outline);
}

.di-value {
  flex: 1;
  text-align: left;
}
.di-value.placeholder {
  color: var(--color-outline);
}

/* Hidden input anchored at bottom-left so the picker opens below the button */
.di-hidden {
  position: absolute;
  left: 0;
  bottom: 0;
  width: 1px;
  height: 1px;
  opacity: 0;
  pointer-events: none;
  border: none;
  padding: 0;
}
</style>
