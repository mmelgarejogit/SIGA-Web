<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from "vue"

export interface MultiSelectOption {
  value: number | string
  label: string
}

const props = withDefaults(defineProps<{
  modelValue: (number | string)[]
  options: MultiSelectOption[]
  placeholder?: string
  hasError?: boolean
  disabled?: boolean
}>(), {
  placeholder: "Seleccioná opciones",
  hasError: false,
  disabled: false,
})

const emit = defineEmits<{ "update:modelValue": [v: (number | string)[]] }>()

const open      = ref(false)
const search    = ref("")
const triggerRef = ref<HTMLElement | null>(null)
const dropRef    = ref<HTMLElement | null>(null)
const dropPos    = ref({ top: "0px", left: "0px", width: "0px" })

const triggerLabel = computed(() => {
  if (props.modelValue.length === 0) return null
  if (props.modelValue.length === 1)
    return props.options.find(o => o.value === props.modelValue[0])?.label ?? null
  return `${props.modelValue.length} seleccionados`
})

const filteredOptions = computed(() => {
  const q = search.value.toLowerCase().trim()
  if (!q) return props.options
  return props.options.filter(o => o.label.toLowerCase().includes(q))
})

function isSelected(val: number | string) {
  return props.modelValue.includes(val)
}

function toggleOption(val: number | string) {
  const next = isSelected(val)
    ? props.modelValue.filter(v => v !== val)
    : [...props.modelValue, val]
  emit("update:modelValue", next)
}

function clear() {
  emit("update:modelValue", [])
}

async function toggle() {
  if (props.disabled) return
  if (!open.value && triggerRef.value) {
    const rect = triggerRef.value.getBoundingClientRect()
    // Abrir debajo por defecto
    dropPos.value = {
      top:   `${rect.bottom + 6}px`,
      left:  `${Math.max(8, rect.left)}px`,
      width: `${rect.width}px`,
    }
    open.value = true
    search.value = ""
    // Medir altura real y corregir si se sale del viewport
    await nextTick()
    if (dropRef.value) {
      const dropRect = dropRef.value.getBoundingClientRect()
      if (dropRect.bottom > window.innerHeight - 8) {
        dropPos.value = {
          ...dropPos.value,
          top: `${Math.max(8, rect.top - dropRect.height - 6)}px`,
        }
      }
    }
    inputRef.value?.focus()
  } else {
    open.value = false
    search.value = ""
  }
}

const inputRef = ref<HTMLInputElement | null>(null)

function onClickOutside(e: MouseEvent) {
  if (
    triggerRef.value && !triggerRef.value.contains(e.target as Node) &&
    dropRef.value    && !dropRef.value.contains(e.target as Node)
  ) {
    open.value = false
    search.value = ""
  }
}

function handleScroll() { open.value = false }

onMounted(() => {
  document.addEventListener("mousedown", onClickOutside)
  window.addEventListener("scroll", handleScroll, true)
})
onUnmounted(() => {
  document.removeEventListener("mousedown", onClickOutside)
  window.removeEventListener("scroll", handleScroll, true)
})
</script>

<template>
  <div class="ms-wrap">
    <!-- Trigger -->
    <button
      ref="triggerRef"
      type="button"
      class="ms-trigger"
      :class="{ open, disabled, error: hasError }"
      :disabled="disabled"
      @click="toggle"
    >
      <span class="ms-value" :class="{ placeholder: !triggerLabel }">
        {{ triggerLabel ?? placeholder }}
      </span>
      <span v-if="modelValue.length > 0" class="ms-badge">{{ modelValue.length }}</span>
      <span class="material-symbols-outlined ms-chevron" :class="{ rotated: open }" style="font-size: 18px">
        expand_more
      </span>
    </button>

    <!-- Dropdown teleportado al body para superar overflow de modales -->
    <Teleport to="body">
      <Transition name="ms-drop">
        <div
          v-if="open"
          ref="dropRef"
          class="ms-dropdown"
          :style="`top: ${dropPos.top}; left: ${dropPos.left}; width: ${dropPos.width};`"
        >
          <!-- Búsqueda -->
          <div class="ms-search-wrap">
            <span class="material-symbols-outlined" style="font-size: 16px; color: var(--color-outline)">search</span>
            <input
              ref="inputRef"
              v-model="search"
              type="text"
              class="ms-search-input"
              placeholder="Buscar..."
              @keydown.esc="open = false"
            />
          </div>

          <!-- Opciones -->
          <div class="ms-list">
            <div v-if="filteredOptions.length === 0" class="ms-empty">Sin resultados</div>
            <button
              v-for="opt in filteredOptions"
              :key="String(opt.value)"
              type="button"
              class="ms-option"
              :class="{ selected: isSelected(opt.value) }"
              @click="toggleOption(opt.value)"
            >
              <div class="ms-check" :class="{ checked: isSelected(opt.value) }">
                <span v-if="isSelected(opt.value)" class="material-symbols-outlined" style="font-size: 12px; color: white">check</span>
              </div>
              <span class="ms-option-label">{{ opt.label }}</span>
            </button>
          </div>

          <!-- Footer limpiar -->
          <div v-if="modelValue.length > 0" class="ms-footer">
            <button type="button" class="ms-clear" @click="clear">Limpiar selección</button>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.ms-wrap { position: relative; width: 100%; }

.ms-trigger {
  width: 100%; display: flex; align-items: center; gap: 6px;
  padding: 0 16px; height: 48px;
  border-radius: 12px;
  border: 1px solid var(--color-outline-variant);
  background: var(--color-surface);
  color: var(--color-on-surface);
  font-size: 14px; font-family: inherit;
  cursor: pointer; text-align: left;
  transition: border-color 0.15s;
}
.ms-trigger:hover:not(.disabled) { border-color: var(--color-outline); }
.ms-trigger.open  { border-color: var(--color-primary); outline: none; }
.ms-trigger.error { border: 1.5px solid var(--color-error); background-color: #FFF8F7; }
.ms-trigger.disabled { opacity: 0.45; cursor: not-allowed; background: var(--color-surface-container-low); }

.ms-value { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ms-value.placeholder { color: var(--color-outline); }

.ms-badge {
  display: inline-flex; align-items: center; justify-content: center;
  min-width: 20px; height: 20px; padding: 0 5px; border-radius: 10px;
  background: var(--color-primary); color: #fff;
  font-size: 11px; font-weight: 700; flex-shrink: 0;
}

.ms-chevron { flex-shrink: 0; color: var(--color-outline); transition: transform 0.15s; }
.ms-chevron.rotated { transform: rotate(180deg); }

.ms-dropdown {
  position: fixed;
  z-index: 9999;
  background: var(--color-surface-container-lowest);
  border: 1px solid var(--color-outline-variant);
  border-radius: 14px;
  box-shadow: 0 8px 24px rgba(0, 40, 142, 0.12);
  overflow: hidden;
}

.ms-search-wrap {
  display: flex; align-items: center; gap: 8px; padding: 8px 12px;
  border-bottom: 1px solid var(--color-outline-variant);
}
.ms-search-input {
  flex: 1; border: none; outline: none; background: transparent;
  font-size: 13px; color: var(--color-on-surface); font-family: inherit;
}
.ms-search-input::placeholder { color: var(--color-outline); }

.ms-list { max-height: 220px; overflow-y: auto; padding: 4px; }

.ms-option {
  width: 100%; display: flex; align-items: center; gap: 10px;
  padding: 8px 10px; border-radius: 8px;
  border: none; background: transparent;
  font-size: 13px; font-family: inherit;
  color: var(--color-on-surface); cursor: pointer; text-align: left;
  transition: background 0.1s;
}
.ms-option:hover    { background: var(--color-surface-container-low); }
.ms-option.selected { color: var(--color-primary); }

.ms-check {
  width: 16px; height: 16px; border-radius: 4px; flex-shrink: 0;
  border: 1.5px solid var(--color-outline-variant);
  display: flex; align-items: center; justify-content: center;
}
.ms-option.selected .ms-check { background: var(--color-primary); border-color: var(--color-primary); }

.ms-option-label { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

.ms-empty { font-size: 13px; color: var(--color-outline); text-align: center; padding: 16px; }

.ms-footer { border-top: 1px solid var(--color-outline-variant); padding: 6px 8px; display: flex; justify-content: flex-end; }
.ms-clear {
  font-size: 12px; color: var(--color-outline); border: none; background: none;
  cursor: pointer; font-family: inherit; padding: 2px 6px; border-radius: 4px;
  transition: color 0.1s;
}
.ms-clear:hover { color: var(--color-error); }

.ms-drop-enter-active, .ms-drop-leave-active { transition: opacity 0.12s, transform 0.12s; }
.ms-drop-enter-from,  .ms-drop-leave-to      { opacity: 0; transform: translateY(-4px) scale(0.98); }
</style>
