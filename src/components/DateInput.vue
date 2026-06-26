<script setup lang="ts">
import { ref, computed, nextTick, onMounted, onBeforeUnmount } from "vue"

const props = defineProps<{
  modelValue: string   // yyyy-mm-dd or ""
  hasError?: boolean
  placeholder?: string
  disabled?: boolean
}>()

const emit = defineEmits<{ "update:modelValue": [string] }>()

// ── Helpers (copiados de DateRangeBar) ────────────────────────────────────────

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

function getMonthGrid(year: number, month: number): Date[] {
  const first = new Date(year, month, 1)
  const dayOfWeek = first.getDay()
  const offset = dayOfWeek === 0 ? 6 : dayOfWeek - 1 // Lunes como primer día
  const start = new Date(year, month, 1 - offset)
  const days: Date[] = []
  for (let i = 0; i < 42; i++) {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    days.push(d)
  }
  return days
}

// ── Estado ────────────────────────────────────────────────────────────────────

const now = new Date()
const isOpen = ref(false)
const calendarMonth = ref(now.getMonth())
const calendarYear = ref(now.getFullYear())
const triggerRef = ref<HTMLElement | null>(null)
const dropRef = ref<HTMLElement | null>(null)
const dropPos = ref({ top: "0px", left: "0px" })

// ── Conversiones ──────────────────────────────────────────────────────────────

const selectedDate = computed<Date | null>(() => {
  if (!props.modelValue || !/^\d{4}-\d{2}-\d{2}$/.test(props.modelValue)) return null
  const [y, m, d] = props.modelValue.split("-").map(Number)
  return new Date(y!, m! - 1, d!)
})

const displayValue = computed(() => {
  if (!selectedDate.value) return ""
  const d = selectedDate.value
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`
})

const calendarMonthLabel = computed(() => {
  const label = new Date(calendarYear.value, calendarMonth.value, 1)
    .toLocaleDateString("es-AR", { month: "long", year: "numeric" })
  return label.charAt(0).toUpperCase() + label.slice(1)
})

const calendarGrid = computed(() => getMonthGrid(calendarYear.value, calendarMonth.value))

// ── Acciones ──────────────────────────────────────────────────────────────────

async function toggle() {
  if (props.disabled) return
  if (!isOpen.value && triggerRef.value) {
    const rect = triggerRef.value.getBoundingClientRect()
    dropPos.value = {
      top:  `${rect.bottom + 8}px`,
      left: `${Math.max(8, Math.min(rect.left, window.innerWidth - 296))}px`,
    }
    isOpen.value = true
    if (selectedDate.value) {
      calendarMonth.value = selectedDate.value.getMonth()
      calendarYear.value  = selectedDate.value.getFullYear()
    }
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

function prevMonth() {
  calendarMonth.value--
  if (calendarMonth.value < 0) { calendarMonth.value = 11; calendarYear.value-- }
}

function nextMonth() {
  calendarMonth.value++
  if (calendarMonth.value > 11) { calendarMonth.value = 0; calendarYear.value++ }
}

function selectDay(day: Date) {
  const y = day.getFullYear()
  const m = String(day.getMonth() + 1).padStart(2, "0")
  const d = String(day.getDate()).padStart(2, "0")
  emit("update:modelValue", `${y}-${m}-${d}`)
  isOpen.value = false
}

function clear() {
  emit("update:modelValue", "")
  isOpen.value = false
}

// ── Click outside ─────────────────────────────────────────────────────────────

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

// ── Estilo del trigger ────────────────────────────────────────────────────────

function triggerStyle() {
  const opacity = props.disabled ? "opacity: 0.4; cursor: not-allowed; " : ""
  if (props.hasError)
    return (
      opacity +
      "border: 1.5px solid var(--color-error); background-color: color-mix(in srgb, var(--color-error) 8%, var(--color-surface));"
    )
  return opacity + "border: 1px solid var(--color-outline-variant); background-color: var(--color-surface);"
}
</script>

<template>
  <div class="di-wrap">
    <!-- Trigger -->
    <button ref="triggerRef" type="button" class="di-trigger" data-field :style="triggerStyle()" @click="toggle">
      <span class="material-symbols-outlined di-icon">calendar_today</span>
      <span class="di-value" :class="{ placeholder: !displayValue }">
        {{ displayValue || placeholder || 'dd/mm/aaaa' }}
      </span>
    </button>

    <!-- Calendario flotante (teleportado para superponer modales) -->
    <Teleport to="body">
      <Transition name="di-cal">
        <div v-if="isOpen" ref="dropRef" class="di-calendar"
          :style="`top: ${dropPos.top}; left: ${dropPos.left};`">
        <!-- Header mes -->
        <div class="flex items-center justify-between mb-3">
          <button type="button" @click="prevMonth"
            class="w-8 h-8 flex items-center justify-center rounded-lg transition-colors hover:bg-surface-container-high">
            <span class="material-symbols-outlined" style="font-size: 16px; color: var(--color-on-surface-variant)">chevron_left</span>
          </button>
          <span class="text-sm font-bold" style="color: var(--color-on-surface)">{{ calendarMonthLabel }}</span>
          <button type="button" @click="nextMonth"
            class="w-8 h-8 flex items-center justify-center rounded-lg transition-colors hover:bg-surface-container-high">
            <span class="material-symbols-outlined" style="font-size: 16px; color: var(--color-on-surface-variant)">chevron_right</span>
          </button>
        </div>

        <!-- Nombres de días -->
        <div class="grid grid-cols-7 gap-1 mb-1">
          <div v-for="wd in ['Lun','Mar','Mié','Jue','Vie','Sáb','Dom']" :key="wd"
            class="text-center text-[10px] font-bold uppercase tracking-wider"
            style="color: var(--color-outline)">
            {{ wd }}
          </div>
        </div>

        <!-- Grilla de días -->
        <div class="grid grid-cols-7 gap-1">
          <button
            v-for="day in calendarGrid"
            :key="day.toISOString()"
            type="button"
            @click="selectDay(day)"
            class="w-8 h-8 rounded-lg text-xs font-medium flex items-center justify-center transition-colors"
            :class="{ 'opacity-40': day.getMonth() !== calendarMonth }"
            :style="selectedDate && isSameDay(day, selectedDate)
              ? 'background-color: var(--color-primary); color: var(--color-on-primary);'
              : isSameDay(day, now) && !(selectedDate && isSameDay(day, selectedDate))
                ? 'color: var(--color-primary); font-weight: 700;'
                : day.getMonth() === calendarMonth
                  ? 'color: var(--color-on-surface);'
                  : 'color: var(--color-outline);'"
          >
            {{ day.getDate() }}
          </button>
        </div>

        <!-- Limpiar -->
        <div v-if="selectedDate" class="flex justify-end mt-2">
          <button type="button" @click="clear"
            class="text-xs px-2 py-0.5 transition-colors hover:text-error"
            style="border-radius: 6px; color: var(--color-outline)">
            Limpiar
          </button>
        </div>
        </div>
      </Transition>
    </Teleport>
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
  border-radius: var(--radius-md);
  font-size: 14px;
  font-family: inherit;
  color: var(--color-on-surface);
  cursor: pointer;
  text-align: left;
  appearance: none;
  box-shadow: none;
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

.di-calendar {
  position: fixed;
  z-index: 9999;
  min-width: 280px;
  padding: 16px;
  border-radius: var(--radius-md);
  background-color: var(--color-surface-container-lowest);
  border: 1px solid var(--color-hairline);
  box-shadow: var(--shadow-lg);
}

.di-cal-enter-active,
.di-cal-leave-active { transition: opacity 0.12s, transform 0.12s; }
.di-cal-enter-from,
.di-cal-leave-to { opacity: 0; transform: translateY(-4px) scale(0.98); }
</style>
