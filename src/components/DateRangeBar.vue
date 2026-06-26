<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from "vue"

const props = defineProps<{
  modelValue: Date
  mode: "dia" | "semana" | "mes"
}>()

const emit = defineEmits<{
  (e: "update:modelValue", value: Date): void
  (e: "update:mode", value: "dia" | "semana" | "mes"): void
}>()

// ── Helpers ───────────────────────────────────────────────────────────────────

const MONTHS_SHORT = [
  "Ene", "Feb", "Mar", "Abr", "May", "Jun",
  "Jul", "Ago", "Sep", "Oct", "Nov", "Dic",
]
const WEEKDAYS_SHORT = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"]

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

function startOfDay(d: Date): Date {
  const r = new Date(d)
  r.setHours(0, 0, 0, 0)
  return r
}

function getMonthGrid(year: number, month: number): Date[] {
  const first = new Date(year, month, 1)
  const dayOfWeek = first.getDay()
  const offset = dayOfWeek === 0 ? 6 : dayOfWeek - 1 // Mon-based
  const start = new Date(year, month, 1 - offset)
  const days: Date[] = []
  for (let i = 0; i < 42; i++) {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    days.push(d)
  }
  return days
}

// ── Label formatting ────────────────────────────────────────────────────────

const labelText = computed(() => {
  const d = props.modelValue
  if (props.mode === "dia") {
    const today = startOfDay(new Date())
    const target = startOfDay(d)
    const diff = (target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    const month = MONTHS_SHORT[d.getMonth()]
    const day = d.getDate()
    if (diff === 0) return `Hoy — ${day} ${month}`
    if (diff === 1) return `Mañana — ${day} ${month}`
    if (diff === -1) return `Ayer — ${day} ${month}`
    const wd = WEEKDAYS_SHORT[d.getDay()]
    return `${wd} ${day} ${month}`
  }
  if (props.mode === "semana") {
    const day = d.getDay()
    const offset = day === 0 ? 6 : day - 1
    const s = new Date(d)
    s.setDate(d.getDate() - offset)
    const e = new Date(s)
    e.setDate(s.getDate() + 6)
    const sDay = s.getDate()
    const eDay = e.getDate()
    const sMonth = MONTHS_SHORT[s.getMonth()]
    const eMonth = MONTHS_SHORT[e.getMonth()]
    const year = e.getFullYear()
    if (s.getMonth() === e.getMonth()) {
      return `${sDay}–${eDay} ${sMonth} ${year}`
    }
    return `${sDay} ${sMonth} – ${eDay} ${eMonth} ${year}`
  }
  // mes
  const monthName = d.toLocaleDateString("es-AR", { month: "long", year: "numeric" })
  return monthName.charAt(0).toUpperCase() + monthName.slice(1)
})

// ── Navigation ──────────────────────────────────────────────────────────────

function prev() {
  const d = new Date(props.modelValue)
  if (props.mode === "dia") d.setDate(d.getDate() - 1)
  else if (props.mode === "semana") d.setDate(d.getDate() - 7)
  else if (props.mode === "mes") d.setMonth(d.getMonth() - 1)
  emit("update:modelValue", d)
}

function next() {
  const d = new Date(props.modelValue)
  if (props.mode === "dia") d.setDate(d.getDate() + 1)
  else if (props.mode === "semana") d.setDate(d.getDate() + 7)
  else if (props.mode === "mes") d.setMonth(d.getMonth() + 1)
  emit("update:modelValue", d)
}

function goToToday() {
  emit("update:modelValue", new Date())
}

const showHoyButton = computed(() => props.mode === "dia" && !isSameDay(props.modelValue, new Date()))

// ── Mode switch ─────────────────────────────────────────────────────────────

const modes: { value: "dia" | "semana" | "mes"; label: string }[] = [
  { value: "dia", label: "Día" },
  { value: "semana", label: "Semana" },
  { value: "mes", label: "Mes" },
]

function setMode(m: "dia" | "semana" | "mes") {
  if (m === "mes") return // disabled until API supports range
  emit("update:mode", m)
}

// ── Mini calendar ───────────────────────────────────────────────────────────

const showCalendar = ref(false)
const calendarMonth = ref(props.modelValue.getMonth())
const calendarYear = ref(props.modelValue.getFullYear())
const barRef = ref<HTMLDivElement | null>(null)

watch(
  () => props.modelValue,
  (d) => {
    calendarMonth.value = d.getMonth()
    calendarYear.value = d.getFullYear()
  },
)

function toggleCalendar() {
  showCalendar.value = !showCalendar.value
  if (showCalendar.value) {
    calendarMonth.value = props.modelValue.getMonth()
    calendarYear.value = props.modelValue.getFullYear()
  }
}

function prevCalendarMonth() {
  calendarMonth.value--
  if (calendarMonth.value < 0) {
    calendarMonth.value = 11
    calendarYear.value--
  }
}

function nextCalendarMonth() {
  calendarMonth.value++
  if (calendarMonth.value > 11) {
    calendarMonth.value = 0
    calendarYear.value++
  }
}

function selectDay(day: Date) {
  emit("update:modelValue", day)
  showCalendar.value = false
}

function isInSelectedWeek(day: Date): boolean {
  const selected = props.modelValue
  const dayOfWeek = selected.getDay()
  const offset = dayOfWeek === 0 ? 6 : dayOfWeek - 1
  const weekStart = startOfDay(new Date(selected))
  weekStart.setDate(selected.getDate() - offset)
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekStart.getDate() + 6)
  weekEnd.setHours(23, 59, 59, 999)
  const d = startOfDay(day)
  return d >= weekStart && d <= weekEnd
}

function isInSelectedMonth(day: Date): boolean {
  return (
    day.getMonth() === props.modelValue.getMonth() &&
    day.getFullYear() === props.modelValue.getFullYear()
  )
}

const calendarGrid = computed(() => getMonthGrid(calendarYear.value, calendarMonth.value))

const calendarMonthLabel = computed(() => {
  return new Date(calendarYear.value, calendarMonth.value, 1).toLocaleDateString("es-AR", {
    month: "long",
    year: "numeric",
  })
})

// Click outside to close
function onDocumentClick(e: MouseEvent) {
  if (!barRef.value?.contains(e.target as Node)) {
    showCalendar.value = false
  }
}

onMounted(() => document.addEventListener("mousedown", onDocumentClick))
onUnmounted(() => document.removeEventListener("mousedown", onDocumentClick))
</script>

<template>
  <div ref="barRef" class="relative inline-flex">
    <!-- Bar -->
    <div class="flex items-center gap-3 flex-wrap">
      <!-- Date navigator -->
      <div
        class="flex items-center overflow-hidden"
        style="border-radius: var(--radius-md); border: 1px solid var(--color-outline-variant); background: var(--color-surface)"
      >
        <button
          @click="prev"
          class="flex items-center justify-center px-2 transition-colors hover:bg-surface-container-high"
          style="height: 36px; width: 36px"
          title="Anterior"
        >
          <span
            class="material-symbols-outlined"
            style="font-size: 18px; color: var(--color-on-surface-variant)"
          >
            chevron_left
          </span>
        </button>

        <button
          @click="toggleCalendar"
          class="flex items-center justify-center px-3 text-sm font-semibold transition-colors hover:bg-surface-container-high"
          style="height: 36px; color: var(--color-on-surface); min-width: 120px"
        >
          {{ labelText }}
        </button>

        <button
          @click="next"
          class="flex items-center justify-center px-2 transition-colors hover:bg-surface-container-high"
          style="height: 36px; width: 36px"
          title="Siguiente"
        >
          <span
            class="material-symbols-outlined"
            style="font-size: 18px; color: var(--color-on-surface-variant)"
          >
            chevron_right
          </span>
        </button>
      </div>

      <!-- Hoy -->
      <button
        v-if="showHoyButton"
        @click="goToToday"
        class="px-4 text-sm font-semibold transition-colors hover:bg-surface-container-high"
        style="height: 36px; border-radius: var(--radius-md); border: 1px solid var(--color-outline-variant); background: var(--color-surface); color: var(--color-on-surface)"
      >
        Hoy
      </button>

      <!-- Mode segmented -->
      <div
        class="flex items-center overflow-hidden"
        style="border-radius: var(--radius-md); border: 1px solid var(--color-outline-variant); background: var(--color-surface)"
      >
        <button
          v-for="m in modes"
          :key="m.value"
          @click="setMode(m.value)"
          class="px-4 text-sm font-semibold transition-colors"
          :class="[
            props.mode === m.value
              ? ''
              : 'text-on-surface-variant hover:bg-surface-container-high',
            m.value === 'mes' ? 'opacity-50 cursor-not-allowed' : '',
          ]"
          :style="[
            props.mode === m.value
              ? { background: 'var(--color-primary)', color: 'var(--color-on-primary)' }
              : {},
            { height: '36px' },
          ]"
          :title="m.value === 'mes' ? 'Próximamente' : undefined"
        >
          {{ m.label }}
        </button>
      </div>
    </div>

    <!-- Mini calendar (floating dropdown) -->
    <div
      v-if="showCalendar"
      class="absolute p-4 z-50"
      style="top: calc(100% + 8px); left: 0; border-radius: var(--radius-md); background: var(--color-surface-container-lowest); border: 1px solid var(--color-hairline); box-shadow: var(--shadow-lg); min-width: 280px"
    >
      <!-- Calendar header -->
      <div class="flex items-center justify-between mb-3">
        <button
          @click="prevCalendarMonth"
          class="w-8 h-8 flex items-center justify-center rounded-lg transition-colors hover:bg-surface-container-high"
        >
          <span class="material-symbols-outlined" style="font-size: 16px; color: var(--color-on-surface-variant)">
            chevron_left
          </span>
        </button>
        <span class="text-sm font-bold" style="color: var(--color-on-surface)">
          {{ calendarMonthLabel }}
        </span>
        <button
          @click="nextCalendarMonth"
          class="w-8 h-8 flex items-center justify-center rounded-lg transition-colors hover:bg-surface-container-high"
        >
          <span class="material-symbols-outlined" style="font-size: 16px; color: var(--color-on-surface-variant)">
            chevron_right
          </span>
        </button>
      </div>

      <!-- Day names -->
      <div class="grid grid-cols-7 gap-1 mb-1">
        <div
          v-for="wd in ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']"
          :key="wd"
          class="text-center text-[10px] font-bold uppercase tracking-wider"
          style="color: var(--color-outline)"
        >
          {{ wd }}
        </div>
      </div>

      <!-- Days grid -->
      <div class="grid grid-cols-7 gap-1">
        <button
          v-for="day in calendarGrid"
          :key="day.toISOString()"
          @click="selectDay(day)"
          class="w-8 h-8 rounded-lg text-xs font-medium flex items-center justify-center transition-colors"
          :class="{
            'opacity-40': day.getMonth() !== calendarMonth,
          }"
          :style="[
            isSameDay(day, props.modelValue)
              ? { background: 'var(--color-primary)', color: 'white' }
              : {},
            props.mode === 'semana' && isInSelectedWeek(day) && !isSameDay(day, props.modelValue)
              ? { background: 'color-mix(in srgb, var(--color-primary) 15%, transparent)' }
              : {},
            props.mode === 'mes' && isInSelectedMonth(day) && !isSameDay(day, props.modelValue)
              ? { background: 'color-mix(in srgb, var(--color-primary) 15%, transparent)' }
              : {},
            !isSameDay(day, props.modelValue) &&
            !(props.mode === 'semana' && isInSelectedWeek(day)) &&
            !(props.mode === 'mes' && isInSelectedMonth(day))
              ? { color: day.getMonth() === calendarMonth ? 'var(--color-on-surface)' : 'var(--color-outline)' }
              : {},
          ]"
        >
          {{ day.getDate() }}
        </button>
      </div>
    </div>
  </div>
</template>
