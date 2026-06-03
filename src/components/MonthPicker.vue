<script setup lang="ts">
import { ref, computed, nextTick, onMounted, onBeforeUnmount } from "vue"

const MONTHS = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"]
const MONTHS_FULL = ["Enero","Febrero","Marzo","Abril","Mayo","Junio",
                     "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"]

const props = defineProps<{
  modelValue: string | undefined | null
  placeholder?: string
  hasError?: boolean
}>()

const emit = defineEmits<{ "update:modelValue": [val: string | null] }>()

const now = new Date()
const isOpen = ref(false)
const viewYear = ref(now.getFullYear())
const triggerRef = ref<HTMLElement | null>(null)
const dropRef = ref<HTMLElement | null>(null)
const dropPos = ref({ top: "0px", left: "0px" })

const selected = computed(() => {
  if (!props.modelValue) return null
  const parts = props.modelValue.split("-")
  return { year: Number(parts[0]), month: Number(parts[1]) - 1 }
})

const formatDisplay = (s: { month: number; year: number }) =>
  `${MONTHS_FULL[s.month]} ${s.year}`

const isSelected = (i: number) =>
  selected.value?.month === i && selected.value?.year === viewYear.value

const isCurrentMonth = (i: number) =>
  i === now.getMonth() && viewYear.value === now.getFullYear()

async function toggle() {
  if (!isOpen.value && triggerRef.value) {
    const rect = triggerRef.value.getBoundingClientRect()
    dropPos.value = {
      top:  `${rect.bottom + 8}px`,
      left: `${Math.max(8, Math.min(rect.left, window.innerWidth - 296))}px`,
    }
    isOpen.value = true
    if (selected.value) viewYear.value = selected.value.year
    await nextTick()
    if (dropRef.value) {
      const dropRect = dropRef.value.getBoundingClientRect()
      if (dropRect.bottom > window.innerHeight - 8) {
        dropPos.value = {
          ...dropPos.value,
          top: `${Math.max(8, rect.top - dropRect.height - 8)}px`,
        }
      }
    }
  } else {
    isOpen.value = false
  }
}

function select(monthIndex: number) {
  const mm = String(monthIndex + 1).padStart(2, "0")
  emit("update:modelValue", `${viewYear.value}-${mm}`)
  isOpen.value = false
}

function clear() {
  emit("update:modelValue", null)
  isOpen.value = false
}

function handleOutside(e: MouseEvent) {
  if (
    triggerRef.value && !triggerRef.value.contains(e.target as Node) &&
    dropRef.value && !dropRef.value.contains(e.target as Node)
  ) isOpen.value = false
}

function handleScroll() { isOpen.value = false }

onMounted(() => {
  document.addEventListener("mousedown", handleOutside)
  window.addEventListener("scroll", handleScroll, true)
})
onBeforeUnmount(() => {
  document.removeEventListener("mousedown", handleOutside)
  window.removeEventListener("scroll", handleScroll, true)
})
</script>

<template>
  <div class="relative w-full">
    <!-- Trigger -->
    <button
      ref="triggerRef"
      type="button"
      @click="toggle"
      class="w-full h-12 px-4 text-sm text-left flex items-center justify-between outline-none appearance-none shadow-none transition-all"
      :style="hasError
        ? 'border-radius: 12px; border: 1.5px solid var(--color-error); background-color: #FFF8F7; color: var(--color-on-surface);'
        : 'border-radius: 12px; border: 1px solid var(--color-outline-variant); background-color: var(--color-surface); color: var(--color-on-surface);'"
    >
      <span :style="!selected ? 'color: var(--color-outline)' : ''">
        {{ selected ? formatDisplay(selected) : (placeholder ?? 'Seleccionar período') }}
      </span>
      <span class="flex items-center gap-1 flex-shrink-0" style="color: var(--color-outline)">
        <span class="material-symbols-outlined" style="font-size: 18px">calendar_month</span>
        <span class="material-symbols-outlined" style="font-size: 16px; transition: transform 0.2s"
          :style="isOpen ? 'transform: rotate(180deg)' : ''">expand_more</span>
      </span>
    </button>

    <!-- Dropdown (teleportado para superponer modales) -->
    <Teleport to="body">
      <Transition name="mp">
        <div v-if="isOpen" ref="dropRef"
          class="mp-drop p-3"
          :style="`top: ${dropPos.top}; left: ${dropPos.left};`">

        <!-- Header año -->
        <div class="flex items-center justify-between mb-3">
          <button type="button" @click="viewYear--"
            class="w-8 h-8 flex items-center justify-center rounded-lg transition-colors hover:bg-surface-container-high"
            style="color: var(--color-on-surface-variant)">
            <span class="material-symbols-outlined" style="font-size: 18px">chevron_left</span>
          </button>
          <span class="text-sm font-bold" style="color: var(--color-on-surface)">{{ viewYear }}</span>
          <button type="button" @click="viewYear++"
            class="w-8 h-8 flex items-center justify-center rounded-lg transition-colors hover:bg-surface-container-high"
            style="color: var(--color-on-surface-variant)">
            <span class="material-symbols-outlined" style="font-size: 18px">chevron_right</span>
          </button>
        </div>

        <!-- Limpiar -->
        <div v-if="selected" class="flex justify-end mb-2">
          <button type="button" @click="clear"
            class="text-xs px-2 py-0.5 transition-colors hover:text-error"
            style="border-radius: 6px; color: var(--color-outline);">
            Limpiar
          </button>
        </div>

        <!-- Grilla de meses -->
        <div class="grid grid-cols-4 gap-1">
          <button
            v-for="(m, i) in MONTHS"
            :key="i"
            type="button"
            @click="select(i)"
            class="h-9 text-xs font-medium transition-colors"
            style="border-radius: 8px"
            :style="isSelected(i)
              ? 'background-color: var(--color-primary); color: var(--color-on-primary);'
              : isCurrentMonth(i)
                ? 'color: var(--color-primary); font-weight: 600;'
                : 'color: var(--color-on-surface);'"
            @mouseover="(e) => { if (!isSelected(i)) (e.target as HTMLElement).style.backgroundColor = 'var(--color-surface-container-high)' }"
            @mouseout="(e) => { if (!isSelected(i)) (e.target as HTMLElement).style.backgroundColor = '' }"
          >
            {{ m }}
          </button>
        </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.mp-drop {
  position: fixed;
  z-index: 9999;
  min-width: 280px;
  border-radius: 12px;
  background-color: var(--color-surface-container-lowest);
  border: 1px solid var(--color-outline-variant);
  box-shadow: 0 8px 24px rgba(0, 40, 142, 0.12);
}
.mp-enter-active, .mp-leave-active { transition: opacity 0.12s, transform 0.12s; }
.mp-enter-from, .mp-leave-to { opacity: 0; transform: translateY(-4px) scale(0.98); }
</style>
