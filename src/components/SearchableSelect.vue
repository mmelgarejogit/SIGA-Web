<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from "vue"

export interface SelectOption {
  value: number | string | null
  label: string
  code?: string
}

const props = withDefaults(defineProps<{
  modelValue: number | string | null | undefined
  options: SelectOption[]
  placeholder?: string
  nullLabel?: string
  disabled?: boolean
  searchable?: boolean
}>(), {
  searchable: true,
})

const emit = defineEmits<{ "update:modelValue": [v: number | string | null] }>()

const open = ref(false)
const search = ref("")
const containerRef = ref<HTMLElement | null>(null)
const inputRef = ref<HTMLInputElement | null>(null)

const selected = computed(() =>
  props.modelValue != null
    ? props.options.find((o) => o.value === props.modelValue) ?? null
    : null,
)

const filtered = computed(() => {
  if (!props.searchable) return props.options
  const q = search.value.toLowerCase().trim()
  if (!q) return props.options
  return props.options.filter(
    (o) =>
      o.label.toLowerCase().includes(q) ||
      (o.code && o.code.toLowerCase().includes(q)),
  )
})

async function toggle() {
  if (props.disabled) return
  open.value = !open.value
  if (open.value) {
    search.value = ""
    if (props.searchable) {
      await nextTick()
      inputRef.value?.focus()
    }
  }
}

function select(val: number | string | null) {
  emit("update:modelValue", val)
  open.value = false
  search.value = ""
}

function onClickOutside(e: MouseEvent) {
  if (containerRef.value && !containerRef.value.contains(e.target as Node)) {
    open.value = false
    search.value = ""
  }
}

onMounted(() => document.addEventListener("mousedown", onClickOutside))
onUnmounted(() => document.removeEventListener("mousedown", onClickOutside))
</script>

<template>
  <div ref="containerRef" class="ss-wrap" :class="{ disabled }">
    <!-- Trigger -->
    <button
      type="button"
      class="ss-trigger"
      :class="{ open, disabled }"
      :disabled="disabled"
      @click="toggle"
    >
      <span class="ss-value" :class="{ placeholder: !selected }">
        {{ selected ? selected.label : (nullLabel ?? placeholder ?? "Seleccioná una opción") }}
      </span>
      <span v-if="selected && selected.code" class="ss-code">{{ selected.code }}</span>
      <span class="material-symbols-outlined ss-chevron" :class="{ rotated: open }" style="font-size: 18px">
        expand_more
      </span>
    </button>

    <!-- Dropdown -->
    <div v-if="open" class="ss-dropdown">
      <!-- Search (solo si searchable) -->
      <div v-if="props.searchable" class="ss-search-wrap">
        <span class="material-symbols-outlined" style="font-size: 16px; color: var(--color-outline)">search</span>
        <input
          ref="inputRef"
          v-model="search"
          type="text"
          class="ss-search-input"
          placeholder="Buscar..."
          @keydown.esc="open = false"
        />
      </div>

      <!-- Options -->
      <div class="ss-list">
        <!-- Null option -->
        <button
          v-if="nullLabel !== undefined"
          type="button"
          class="ss-option"
          :class="{ active: modelValue == null }"
          @click="select(null)"
        >
          <span class="ss-option-label">{{ nullLabel }}</span>
        </button>

        <template v-if="filtered.length > 0">
          <button
            v-for="opt in filtered"
            :key="String(opt.value)"
            type="button"
            class="ss-option"
            :class="{ active: opt.value === modelValue }"
            @click="select(opt.value)"
          >
            <span class="ss-option-label">{{ opt.label }}</span>
            <span v-if="opt.code" class="ss-option-code">{{ opt.code }}</span>
          </button>
        </template>
        <p v-else class="ss-empty">Sin resultados</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.ss-wrap {
  position: relative;
  width: 100%;
}

.ss-trigger {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0 16px;
  height: 48px;
  border-radius: 12px;
  border: 1px solid var(--color-outline-variant);
  background: var(--color-surface);
  color: var(--color-on-surface);
  font-size: 14px;
  font-family: inherit;
  cursor: pointer;
  text-align: left;
  transition: border-color 0.15s;
}
.ss-trigger:hover:not(.disabled) {
  border-color: var(--color-outline);
}
.ss-trigger.open {
  border-color: var(--color-primary);
  outline: none;
}
.ss-trigger.disabled {
  opacity: 0.45;
  cursor: not-allowed;
  background: var(--color-surface-container-low);
}

.ss-value {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.ss-value.placeholder {
  color: var(--color-outline);
}

.ss-code {
  font-size: 11px;
  font-weight: 600;
  font-family: monospace;
  color: var(--color-outline);
  background: var(--color-surface-container-high);
  padding: 1px 6px;
  border-radius: 4px;
  flex-shrink: 0;
}

.ss-chevron {
  flex-shrink: 0;
  color: var(--color-outline);
  transition: transform 0.15s;
}
.ss-chevron.rotated {
  transform: rotate(180deg);
}

.ss-dropdown {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  right: 0;
  z-index: 200;
  background: var(--color-surface-container-lowest);
  border: 1px solid var(--color-outline-variant);
  border-radius: 14px;
  box-shadow: 0 8px 24px rgba(0, 40, 142, 0.12);
  overflow: hidden;
}

.ss-search-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-bottom: 1px solid var(--color-outline-variant);
}

.ss-search-input {
  flex: 1;
  border: none;
  outline: none;
  background: transparent;
  font-size: 13px;
  color: var(--color-on-surface);
  font-family: inherit;
}
.ss-search-input::placeholder {
  color: var(--color-outline);
}

.ss-list {
  max-height: 220px;
  overflow-y: auto;
  padding: 4px;
}

.ss-option {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 8px 10px;
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
.ss-option:hover {
  background: var(--color-surface-container-low);
}
.ss-option.active {
  background: var(--color-primary-container);
  color: white;
  font-weight: 600;
}

.ss-option-label {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ss-option-code {
  font-size: 11px;
  font-weight: 600;
  font-family: monospace;
  color: var(--color-outline);
  background: var(--color-surface-container-high);
  padding: 1px 6px;
  border-radius: 4px;
  flex-shrink: 0;
}
.ss-option.active .ss-option-code {
  background: rgba(255, 255, 255, 0.2);
  color: white;
}

.ss-empty {
  font-size: 13px;
  color: var(--color-outline);
  text-align: center;
  padding: 16px;
  margin: 0;
}
</style>
