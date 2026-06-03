<script setup lang="ts">
import { ref, watch, computed, nextTick, onMounted, onUnmounted } from "vue"

const MONTHS = [
  "Enero","Febrero","Marzo","Abril","Mayo","Junio",
  "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre",
]

const props = defineProps<{
  modelValue: string   // yyyy-mm-dd o ""
  hasError?: boolean
}>()

const emit = defineEmits<{ "update:modelValue": [string] }>()

// ── Estado interno ────────────────────────────────────────────────────────────

const day   = ref<number | "">("")
const month = ref<number | null>(null)   // 1-12
const year  = ref<number | "">("")

// Parsear prop inicial
watch(() => props.modelValue, (val) => {
  if (val && /^\d{4}-\d{2}-\d{2}$/.test(val)) {
    const [y, m, d] = val.split("-").map(Number)
    year.value  = y
    month.value = m
    day.value   = d
  } else {
    year.value  = ""
    month.value = null
    day.value   = ""
  }
}, { immediate: true })

// Emitir cuando los tres campos son válidos
const currentYear = new Date().getFullYear()

watch([day, month, year], () => {
  const d = Number(day.value)
  const m = month.value
  const y = Number(year.value)
  if (!d || !m || !y) return
  if (d < 1 || d > 31)          return
  if (m < 1 || m > 12)          return
  if (y < 1900 || y > currentYear) return
  const mm = String(m).padStart(2, "0")
  const dd = String(d).padStart(2, "0")
  emit("update:modelValue", `${y}-${mm}-${dd}`)
})

// ── Dropdown de mes ───────────────────────────────────────────────────────────

const monthOpen  = ref(false)
const triggerRef = ref<HTMLElement | null>(null)
const dropRef    = ref<HTMLElement | null>(null)
const dropPos    = ref({ top: "0px", left: "0px" })

async function toggleMonth() {
  if (!monthOpen.value && triggerRef.value) {
    const rect = triggerRef.value.getBoundingClientRect()
    dropPos.value = {
      top:  `${rect.bottom + 6}px`,
      left: `${rect.left}px`,
    }
    monthOpen.value = true
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
  } else {
    monthOpen.value = false
  }
}

function selectMonth(m: number) {
  month.value = m
  monthOpen.value = false
}

function onClickOutside(e: MouseEvent) {
  if (
    triggerRef.value && !triggerRef.value.contains(e.target as Node) &&
    dropRef.value    && !dropRef.value.contains(e.target as Node)
  ) monthOpen.value = false
}

function handleScroll() { monthOpen.value = false }

onMounted(() => {
  document.addEventListener("mousedown", onClickOutside)
  window.addEventListener("scroll", handleScroll, true)
})
onUnmounted(() => {
  document.removeEventListener("mousedown", onClickOutside)
  window.removeEventListener("scroll", handleScroll, true)
})

// ── Estilos ───────────────────────────────────────────────────────────────────

const fieldStyle = computed(() =>
  props.hasError
    ? "border-radius: 12px; border: 1.5px solid var(--color-error); color: var(--color-on-surface); background-color: #FFF8F7;"
    : "border-radius: 12px; border: 1px solid var(--color-outline-variant); color: var(--color-on-surface); background-color: var(--color-surface);"
)
</script>

<template>
  <div class="bdi-wrap">

    <!-- Día -->
    <input
      v-model.number="day"
      type="number"
      min="1"
      max="31"
      placeholder="Día"
      class="bdi-num"
      :style="fieldStyle"
    />

    <!-- Mes -->
    <button
      ref="triggerRef"
      type="button"
      class="bdi-month-trigger"
      :class="{ open: monthOpen }"
      :style="fieldStyle"
      @click="toggleMonth"
    >
      <span :class="{ 'bdi-placeholder': !month }">
        {{ month ? MONTHS[month - 1] : "Mes" }}
      </span>
      <span class="material-symbols-outlined bdi-chevron" :class="{ rotated: monthOpen }" style="font-size: 16px">
        expand_more
      </span>
    </button>

    <!-- Año -->
    <input
      v-model.number="year"
      type="number"
      min="1900"
      :max="currentYear"
      placeholder="Año"
      class="bdi-num bdi-year"
      :style="fieldStyle"
    />

    <!-- Dropdown meses (teleportado) -->
    <Teleport to="body">
      <Transition name="bdi-drop">
        <div
          v-if="monthOpen"
          ref="dropRef"
          class="bdi-dropdown"
          :style="`top: ${dropPos.top}; left: ${dropPos.left};`"
        >
          <button
            v-for="(name, i) in MONTHS"
            :key="i"
            type="button"
            class="bdi-mopt"
            :class="{ selected: month === i + 1 }"
            @click="selectMonth(i + 1)"
          >
            {{ name }}
          </button>
        </div>
      </Transition>
    </Teleport>

  </div>
</template>

<style scoped>
.bdi-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
}

/* Inputs numéricos (día y año) — sin spinner nativo */
.bdi-num {
  height: 48px;
  padding: 0 12px;
  font-size: 14px;
  font-family: inherit;
  outline: none;
  appearance: none;
  -moz-appearance: textfield;
  text-align: center;
  transition: border-color 0.15s;
  flex-shrink: 0;
  width: 72px;
}
.bdi-num::-webkit-outer-spin-button,
.bdi-num::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
.bdi-num:focus { border-color: var(--color-primary) !important; outline: none; }

.bdi-year { width: 88px; }

/* Botón de mes */
.bdi-month-trigger {
  flex: 1;
  height: 48px;
  padding: 0 14px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 4px;
  font-size: 14px;
  font-family: inherit;
  cursor: pointer;
  text-align: left;
  transition: border-color 0.15s;
  color: var(--color-on-surface);
}
.bdi-month-trigger.open { border-color: var(--color-primary) !important; }
.bdi-placeholder { color: var(--color-outline); }

.bdi-chevron {
  color: var(--color-outline);
  transition: transform 0.15s;
  flex-shrink: 0;
}
.bdi-chevron.rotated { transform: rotate(180deg); }

/* Dropdown */
.bdi-dropdown {
  position: fixed;
  z-index: 9999;
  background: var(--color-surface-container-lowest);
  border: 1px solid var(--color-outline-variant);
  border-radius: 12px;
  padding: 6px;
  box-shadow: 0 8px 24px rgba(0, 40, 142, 0.12);
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2px;
  min-width: 220px;
}

.bdi-mopt {
  padding: 8px 12px;
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
.bdi-mopt:hover    { background: var(--color-surface-container-high); }
.bdi-mopt.selected { background: var(--color-primary); color: white; font-weight: 600; }

.bdi-drop-enter-active, .bdi-drop-leave-active { transition: opacity 0.12s, transform 0.12s; }
.bdi-drop-enter-from,   .bdi-drop-leave-to     { opacity: 0; transform: translateY(-4px) scale(0.98); }
</style>
