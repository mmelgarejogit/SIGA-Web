<script setup lang="ts">
import { ref, computed, onMounted } from "vue"
import AppSidebar from "@/components/AppSidebar.vue"
import AppHeader from "@/components/AppHeader.vue"
import BaseButton from "@/components/BaseButton.vue"
import BaseModal from "@/components/BaseModal.vue"
import BaseTable from "@/components/BaseTable.vue"
import { inputStyle } from "@/composables/useFieldStyles"
import {
  type Turno,
  type SlotDisponible,
  type ProfesionalDisponible,
  type SelfBookTurnoRequest,
  getMisTurnos,
  getProfesionalesDisponibles,
  getSlotsDisponibles,
  selfBookTurno,
  solicitarCancelacionTurno,
} from "@/services/turnoService"
import { type Sucursal, getSucursales } from "@/services/sucursalService"

// ── Estados que cuentan como "turno activo" (alineado con el backend) ──────────
const ACTIVE_STATES = ["Pendiente", "Confirmado", "Presente"]

const WEEKDAYS = ["lun", "mar", "mié", "jue", "vie", "sáb", "dom"]

// ── Helpers de fecha ──────────────────────────────────────────────────────────

function toDateStr(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

function todayStr(): string {
  return toDateStr(new Date())
}

function formatHour(iso: string): string {
  const match = iso.match(/T(\d{2}:\d{2})/)
  return match ? match[1]! : iso
}

// Toma solo la porción de fecha del ISO (evita corrimientos por zona horaria).
function dateLabelFromStr(dateStr: string): string {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  })
}

function formatDateLabel(iso: string): string {
  return dateLabelFromStr(iso.slice(0, 10))
}

// ── Datos ─────────────────────────────────────────────────────────────────────

const misTurnos = ref<Turno[]>([])
const isLoading = ref(false)
const loadError = ref("")

const activeTurno = computed(
  () => misTurnos.value.find((t) => ACTIVE_STATES.includes(t.estado)) ?? null,
)
const canBook = computed(() => !activeTurno.value)

const historialTurnos = computed(() =>
  misTurnos.value.filter((t) => !ACTIVE_STATES.includes(t.estado)),
)

// Mapa fecha("YYYY-MM-DD") → turnos (excluye cancelados del calendario).
const turnosByDay = computed(() => {
  const map: Record<string, Turno[]> = {}
  for (const t of misTurnos.value) {
    if (t.estado === "Cancelado") continue
    const key = t.fechaHora.slice(0, 10)
    ;(map[key] ??= []).push(t)
  }
  return map
})

const historialColumns = [
  { key: "fecha", label: "Fecha" },
  { key: "professional", label: "Profesional" },
  { key: "motivo", label: "Motivo" },
  { key: "estado", label: "Estado" },
]

async function loadMisTurnos() {
  isLoading.value = true
  loadError.value = ""
  try {
    misTurnos.value = await getMisTurnos()
  } catch (err: unknown) {
    loadError.value = err instanceof Error ? err.message : "Error al cargar turnos."
  } finally {
    isLoading.value = false
  }
}

onMounted(loadMisTurnos)

// ── Calendario mensual ──────────────────────────────────────────────────────────

const currentMonth = ref(new Date(new Date().getFullYear(), new Date().getMonth(), 1))

const monthLabel = computed(() =>
  currentMonth.value.toLocaleDateString("es-AR", { month: "long", year: "numeric" }),
)

interface DayCell {
  dateStr: string
  day: number
  inMonth: boolean
  isToday: boolean
  isPast: boolean
  turnos: Turno[]
}

const calendarCells = computed<DayCell[]>(() => {
  const year = currentMonth.value.getFullYear()
  const month = currentMonth.value.getMonth()
  const first = new Date(year, month, 1)
  const startOffset = (first.getDay() + 6) % 7 // lunes = 0
  const today = todayStr()
  const cells: DayCell[] = []
  for (let i = 0; i < 42; i++) {
    const d = new Date(year, month, 1 - startOffset + i)
    const dateStr = toDateStr(d)
    cells.push({
      dateStr,
      day: d.getDate(),
      inMonth: d.getMonth() === month,
      isToday: dateStr === today,
      isPast: dateStr < today,
      turnos: turnosByDay.value[dateStr] ?? [],
    })
  }
  return cells
})

function prevMonth() {
  currentMonth.value = new Date(currentMonth.value.getFullYear(), currentMonth.value.getMonth() - 1, 1)
}
function nextMonth() {
  currentMonth.value = new Date(currentMonth.value.getFullYear(), currentMonth.value.getMonth() + 1, 1)
}
function goToday() {
  const now = new Date()
  currentMonth.value = new Date(now.getFullYear(), now.getMonth(), 1)
}

function isInteractive(cell: DayCell): boolean {
  return canBook.value && !cell.isPast
}

function dayPillStyle(estado: string): string {
  if (ACTIVE_STATES.includes(estado))
    return "background-color: var(--color-primary); color: var(--color-on-primary);"
  if (estado === "Completado")
    return "background-color: var(--color-success-container); color: var(--color-on-success-container);"
  return "background-color: var(--color-surface-container-highest); color: var(--color-on-surface-variant);"
}

function onDayClick(cell: DayCell) {
  if (!isInteractive(cell)) return
  openBookModal(cell.dateStr)
}

// ── Modal de reserva ────────────────────────────────────────────────────────────

const showBookModal = ref(false)
const selectedDate = ref("")
const sucursales = ref<Sucursal[]>([])
const selectedSucursalId = ref<number | null>(null)
const profesionales = ref<ProfesionalDisponible[]>([])
const isLoadingProfs = ref(false)
const selectedProf = ref<ProfesionalDisponible | null>(null)
const slots = ref<SlotDisponible[]>([])
const isLoadingSlots = ref(false)
const selectedSlot = ref("")
const bookMotivo = ref("")
const isBooking = ref(false)
const bookError = ref("")

async function openBookModal(dateStr: string) {
  selectedDate.value = dateStr
  selectedSucursalId.value = null
  selectedProf.value = null
  profesionales.value = []
  slots.value = []
  selectedSlot.value = ""
  bookMotivo.value = ""
  bookError.value = ""
  showBookModal.value = true

  try {
    sucursales.value = await getSucursales(true)
    // Si hay una sola sucursal, autoseleccionarla y cargar profesionales directamente.
    const unica = sucursales.value[0]
    if (sucursales.value.length === 1 && unica) await selectSucursal(unica.id)
  } catch (err: unknown) {
    bookError.value = err instanceof Error ? err.message : "Error al cargar sucursales."
  }
}

async function selectSucursal(id: number) {
  selectedSucursalId.value = id
  selectedProf.value = null
  slots.value = []
  selectedSlot.value = ""
  isLoadingProfs.value = true
  profesionales.value = []
  bookError.value = ""
  try {
    profesionales.value = await getProfesionalesDisponibles(selectedDate.value, id)
  } catch (err: unknown) {
    bookError.value = err instanceof Error ? err.message : "Error al cargar profesionales."
  } finally {
    isLoadingProfs.value = false
  }
}

async function selectProf(p: ProfesionalDisponible) {
  selectedProf.value = p
  selectedSlot.value = ""
  slots.value = []
  isLoadingSlots.value = true
  try {
    slots.value = await getSlotsDisponibles(p.id, selectedDate.value, selectedSucursalId.value ?? undefined)
  } catch (err: unknown) {
    bookError.value = err instanceof Error ? err.message : "Error al cargar horarios."
  } finally {
    isLoadingSlots.value = false
  }
}

async function submitBooking() {
  if (!selectedSucursalId.value || !selectedProf.value || !selectedSlot.value) return
  isBooking.value = true
  bookError.value = ""
  try {
    const payload: SelfBookTurnoRequest = {
      sucursalId: selectedSucursalId.value,
      professionalId: selectedProf.value.id,
      fechaHora: `${selectedDate.value}T${selectedSlot.value}Z`,
      motivo: bookMotivo.value.trim() || undefined,
    }
    await selfBookTurno(payload)
    showBookModal.value = false
    // Llevar el calendario al mes del turno reservado.
    currentMonth.value = new Date(`${selectedDate.value}T00:00:00`)
    currentMonth.value = new Date(currentMonth.value.getFullYear(), currentMonth.value.getMonth(), 1)
    await loadMisTurnos()
  } catch (err: unknown) {
    bookError.value = err instanceof Error ? err.message : "Error al reservar turno."
  } finally {
    isBooking.value = false
  }
}

// ── Solicitud de cancelación ────────────────────────────────────────────────────

const isRequestingCancel = ref(false)
const cancelReqError = ref("")
const showCancelReqModal = ref(false)
const turnoToCancelRequest = ref<Turno | null>(null)

function openCancelReqModal(t: Turno) {
  turnoToCancelRequest.value = t
  cancelReqError.value = ""
  showCancelReqModal.value = true
}

async function confirmCancelRequest() {
  if (!turnoToCancelRequest.value) return
  isRequestingCancel.value = true
  cancelReqError.value = ""
  try {
    await solicitarCancelacionTurno(turnoToCancelRequest.value.id)
    showCancelReqModal.value = false
    await loadMisTurnos()
  } catch (err: unknown) {
    cancelReqError.value = err instanceof Error ? err.message : "Error al solicitar cancelación."
  } finally {
    isRequestingCancel.value = false
  }
}
</script>

<template>
  <div class="min-h-screen" style="background-color: var(--color-surface)">
    <AppSidebar />
    <AppHeader />

    <main style="margin-left: var(--sidebar-width); transition: margin-left 0.25s ease; padding-top: 64px">
      <div class="p-4 sm:p-6 lg:p-8">
        <!-- Header -->
        <div class="flex flex-wrap justify-between items-end gap-4 mb-8">
          <div>
            <h1 class="text-4xl font-extrabold tracking-tight mb-2">Mis Turnos</h1>
            <p class="font-medium" style="color: var(--color-on-surface-variant)">
              Elegí un día en el calendario para reservar tu cita.
            </p>
          </div>
          <BaseButton
            v-if="canBook && !isLoading"
            variant="primary"
            size="lg"
            @click="openBookModal(todayStr())"
          >
            <span class="material-symbols-outlined" style="font-size: 20px">add</span>
            Reservar turno
          </BaseButton>
        </div>

        <!-- Loading -->
        <div v-if="isLoading" class="flex justify-center py-24">
          <svg class="animate-spin w-8 h-8" style="color: var(--color-primary)" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>

        <!-- Error -->
        <div
          v-else-if="loadError"
          class="flex items-center gap-2.5 rounded-2xl px-4 py-3 text-sm font-medium mb-6"
          style="background-color: var(--color-error-container); color: var(--color-on-error-container)"
        >
          <span class="material-symbols-outlined" style="font-size: 18px">error</span>
          {{ loadError }}
        </div>

        <template v-else>
          <!-- Turno activo -->
          <div
            v-if="activeTurno"
            class="rounded-2xl p-6 mb-8"
            style="
              background-color: var(--color-surface-container-lowest);
              box-shadow: var(--shadow-sm);
              outline: 1px solid var(--color-hairline);
            "
          >
            <div class="flex items-center justify-between mb-4">
              <div class="flex items-center gap-2">
                <span
                  class="material-symbols-outlined inline-flex items-center justify-center flex-shrink-0 leading-none"
                  style="color: var(--color-primary); font-size: 20px; width: 20px; height: 20px"
                >
                  event_available
                </span>
                <h3 class="text-lg font-bold leading-tight" style="color: var(--color-on-surface)">
                  Tu próximo turno
                </h3>
              </div>
              <span
                v-if="activeTurno.solicitudCancelacion"
                class="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold"
                style="background-color: var(--color-warning-container); color: var(--color-on-warning-container)"
              >
                <span class="material-symbols-outlined" style="font-size: 12px; width: 12px; height: 12px">
                  hourglass_empty
                </span>
                Cancelación solicitada
              </span>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div class="flex flex-col gap-1">
                <span class="text-xs font-bold uppercase tracking-wider" style="color: var(--color-outline)">
                  Fecha y Hora
                </span>
                <span class="text-sm font-semibold" style="color: var(--color-on-surface)">
                  {{ formatDateLabel(activeTurno.fechaHora) }} — {{ formatHour(activeTurno.fechaHora) }}
                </span>
              </div>
              <div class="flex flex-col gap-1">
                <span class="text-xs font-bold uppercase tracking-wider" style="color: var(--color-outline)">
                  Profesional
                </span>
                <span class="text-sm font-semibold" style="color: var(--color-on-surface)">
                  {{ activeTurno.professionalNombre }}
                </span>
              </div>
              <div class="flex flex-col gap-1">
                <span class="text-xs font-bold uppercase tracking-wider" style="color: var(--color-outline)">
                  Motivo
                </span>
                <span class="text-sm font-semibold" style="color: var(--color-on-surface)">
                  {{ activeTurno.motivo ?? "—" }}
                </span>
              </div>
            </div>

            <div class="flex items-center justify-between">
              <span
                class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider"
                style="background-color: var(--color-success-container); color: var(--color-on-success-container)"
              >
                <span class="w-1.5 h-1.5 rounded-full" style="background-color: var(--color-on-success-container)"></span>
                {{ activeTurno.estado }}
              </span>

              <BaseButton
                v-if="!activeTurno.solicitudCancelacion"
                variant="danger"
                size="default"
                @click="openCancelReqModal(activeTurno)"
              >
                <span class="material-symbols-outlined" style="font-size: 16px">cancel</span>
                Solicitar Cancelación
              </BaseButton>
            </div>
          </div>

          <!-- Calendario -->
          <div
            class="rounded-2xl p-4 sm:p-6 mb-8"
            style="
              background-color: var(--color-surface-container-lowest);
              box-shadow: var(--shadow-sm);
              outline: 1px solid var(--color-hairline);
            "
          >
            <!-- Barra de navegación del mes -->
            <div class="flex items-center justify-between mb-5">
              <h3 class="text-lg font-extrabold capitalize" style="color: var(--color-on-surface)">
                {{ monthLabel }}
              </h3>
              <div class="flex items-center gap-2">
                <button
                  class="w-9 h-9 rounded-full flex items-center justify-center transition-all hover:scale-105 active:scale-95"
                  style="background-color: var(--color-surface-container-high)"
                  title="Mes anterior"
                  @click="prevMonth"
                >
                  <span class="material-symbols-outlined" style="font-size: 18px; color: var(--color-on-surface-variant)">
                    chevron_left
                  </span>
                </button>
                <button
                  class="px-4 h-9 rounded-full text-sm font-bold transition-all hover:scale-105 active:scale-95"
                  style="background-color: var(--color-surface-container-high); color: var(--color-on-surface-variant)"
                  title="Ir a hoy"
                  @click="goToday"
                >
                  Hoy
                </button>
                <button
                  class="w-9 h-9 rounded-full flex items-center justify-center transition-all hover:scale-105 active:scale-95"
                  style="background-color: var(--color-surface-container-high)"
                  title="Mes siguiente"
                  @click="nextMonth"
                >
                  <span class="material-symbols-outlined" style="font-size: 18px; color: var(--color-on-surface-variant)">
                    chevron_right
                  </span>
                </button>
              </div>
            </div>

            <!-- Encabezado de días -->
            <div class="grid grid-cols-7 mb-2">
              <div
                v-for="wd in WEEKDAYS"
                :key="wd"
                class="text-center text-xs font-bold uppercase tracking-wider py-1"
                style="color: var(--color-outline)"
              >
                {{ wd }}
              </div>
            </div>

            <!-- Grilla de días -->
            <div class="grid grid-cols-7 gap-1 sm:gap-1.5">
              <button
                v-for="cell in calendarCells"
                :key="cell.dateStr"
                type="button"
                :disabled="!isInteractive(cell)"
                class="relative flex flex-col items-center gap-1 rounded-lg py-2 px-1 min-h-[3.25rem] sm:min-h-[4.5rem] transition-all"
                :class="[
                  cell.inMonth ? '' : 'opacity-40',
                  isInteractive(cell) ? 'cursor-pointer hover:bg-surface-container-low' : 'cursor-default',
                ]"
                :style="{
                  color: cell.isPast ? 'var(--color-outline)' : 'var(--color-on-surface)',
                  outline: cell.isToday ? '2px solid var(--color-primary)' : 'none',
                  outlineOffset: '-2px',
                }"
                @click="onDayClick(cell)"
              >
                <span class="text-sm font-semibold leading-none">{{ cell.day }}</span>
                <span
                  v-if="cell.turnos.length"
                  class="px-1.5 py-0.5 rounded-full text-[10px] font-bold leading-none"
                  :style="dayPillStyle(cell.turnos[0]!.estado)"
                >
                  {{ formatHour(cell.turnos[0]!.fechaHora) }}
                </span>
              </button>
            </div>

            <!-- Leyenda -->
            <div class="flex flex-wrap items-center gap-4 mt-5 text-xs" style="color: var(--color-outline)">
              <span class="inline-flex items-center gap-1.5">
                <span class="w-2.5 h-2.5 rounded-full" style="background-color: var(--color-primary)"></span>
                Turno reservado
              </span>
              <span class="inline-flex items-center gap-1.5">
                <span class="w-2.5 h-2.5 rounded-full" style="background-color: var(--color-success-container)"></span>
                Completado
              </span>
              <span v-if="!canBook" class="inline-flex items-center gap-1.5">
                <span class="material-symbols-outlined" style="font-size: 14px">info</span>
                Ya tenés un turno activo. Cancelalo para reservar otro.
              </span>
            </div>
          </div>

          <!-- Historial -->
          <div v-if="historialTurnos.length > 0">
            <h3 class="text-lg font-extrabold mb-4" style="color: var(--color-on-surface)">Historial</h3>
            <BaseTable :columns="historialColumns" :items="historialTurnos" empty-text="No hay turnos en el historial.">
              <template #fecha="{ item }">
                <span class="text-sm font-semibold" style="color: var(--color-on-surface-variant)">
                  {{ formatDateLabel(item.fechaHora) }} — {{ formatHour(item.fechaHora) }}
                </span>
              </template>
              <template #professional="{ item }">
                <span class="text-sm font-medium" style="color: var(--color-on-surface)">
                  {{ item.professionalNombre }}
                </span>
              </template>
              <template #motivo="{ item }">
                <span class="text-sm" style="color: var(--color-on-surface-variant)">{{ item.motivo ?? "—" }}</span>
              </template>
              <template #estado="{ item }">
                <span
                  v-if="item.estado === 'Completado'"
                  class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold"
                  style="background-color: var(--color-success-container); color: var(--color-on-success-container)"
                >
                  <span class="material-symbols-outlined" style="font-size: 12px">check</span>
                  Completado
                </span>
                <span
                  v-else-if="item.estado === 'Cancelado'"
                  class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold"
                  style="background-color: var(--color-surface-container-highest); color: var(--color-on-surface-variant)"
                >
                  <span class="material-symbols-outlined" style="font-size: 12px">cancel</span>
                  Cancelado
                </span>
              </template>
            </BaseTable>
          </div>
        </template>
      </div>
    </main>

    <!-- MODAL: Reservar turno -->
    <BaseModal :show="showBookModal" size="lg" title="Reservar turno" @close="showBookModal = false">
      <p class="text-sm font-semibold capitalize mb-5" style="color: var(--color-on-surface)">
        {{ selectedDate ? dateLabelFromStr(selectedDate) : "" }}
      </p>

      <div
        v-if="bookError"
        class="flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium mb-5"
        style="background-color: var(--color-error-container); color: var(--color-on-error-container)"
      >
        <span class="material-symbols-outlined" style="font-size: 18px">error</span>
        {{ bookError }}
      </div>

      <!-- Paso 1: sucursal (si hay más de una) -->
      <div v-if="sucursales.length > 1" class="mb-5">
        <label class="text-xs font-bold uppercase tracking-wider block mb-2" style="color: var(--color-outline)">
          Sucursal
        </label>
        <div class="flex flex-col gap-2">
          <button
            v-for="s in sucursales"
            :key="s.id"
            type="button"
            class="flex items-center justify-between gap-3 px-4 py-3 rounded-xl text-left transition-all"
            :style="
              selectedSucursalId === s.id
                ? 'background-color: var(--color-primary); color: var(--color-on-primary);'
                : 'background-color: var(--color-surface-container-low); color: var(--color-on-surface); border: 1px solid var(--color-hairline);'
            "
            @click="selectSucursal(s.id)"
          >
            <span class="text-sm font-bold">{{ s.nombre }}</span>
            <span v-if="selectedSucursalId === s.id" class="material-symbols-outlined" style="font-size: 20px">
              check_circle
            </span>
          </button>
        </div>
      </div>

      <!-- Paso 2: profesional -->
      <div v-if="selectedSucursalId" class="mb-5">
        <label class="text-xs font-bold uppercase tracking-wider block mb-2" style="color: var(--color-outline)">
          Profesional
        </label>

        <div v-if="isLoadingProfs" class="flex justify-center py-6">
          <svg class="animate-spin w-6 h-6" style="color: var(--color-primary)" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>

        <div v-else-if="profesionales.length === 0" class="text-sm py-3" style="color: var(--color-outline)">
          No hay profesionales disponibles para esta fecha.
        </div>

        <div v-else class="flex flex-col gap-2">
          <button
            v-for="p in profesionales"
            :key="p.id"
            type="button"
            class="flex items-center justify-between gap-3 px-4 py-3 rounded-xl text-left transition-all"
            :style="
              selectedProf?.id === p.id
                ? 'background-color: var(--color-primary); color: var(--color-on-primary);'
                : 'background-color: var(--color-surface-container-low); color: var(--color-on-surface); border: 1px solid var(--color-hairline);'
            "
            @click="selectProf(p)"
          >
            <span class="flex flex-col">
              <span class="text-sm font-bold">{{ p.nombre }}</span>
              <span
                v-if="p.especialidad"
                class="text-xs"
                :style="selectedProf?.id === p.id ? 'opacity: 0.85' : 'color: var(--color-on-surface-variant)'"
              >
                {{ p.especialidad }}
              </span>
            </span>
            <span v-if="selectedProf?.id === p.id" class="material-symbols-outlined" style="font-size: 20px">
              check_circle
            </span>
          </button>
        </div>
      </div>

      <!-- Paso 2: horario -->
      <div v-if="selectedProf" class="mb-5">
        <label class="text-xs font-bold uppercase tracking-wider block mb-2" style="color: var(--color-outline)">
          Horario disponible
        </label>

        <div v-if="isLoadingSlots" class="flex justify-center py-6">
          <svg class="animate-spin w-6 h-6" style="color: var(--color-primary)" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>

        <div v-else-if="slots.length === 0" class="text-sm py-3" style="color: var(--color-outline)">
          Este profesional no tiene horarios libres ese día.
        </div>

        <div v-else class="flex flex-wrap gap-2">
          <button
            v-for="slot in slots"
            :key="slot.horaInicio"
            type="button"
            class="px-4 py-2 rounded-xl text-sm font-semibold transition-all"
            :style="
              selectedSlot === slot.horaInicio
                ? 'background-color: var(--color-primary); color: var(--color-on-primary);'
                : 'background-color: var(--color-surface-container-low); color: var(--color-on-surface-variant); border: 1px solid var(--color-hairline);'
            "
            @click="selectedSlot = slot.horaInicio"
          >
            {{ slot.horaInicio.slice(0, 5) }}
          </button>
        </div>
      </div>

      <!-- Motivo -->
      <div v-if="selectedProf" class="flex flex-col gap-1.5">
        <label class="text-xs font-bold uppercase tracking-wider" style="color: var(--color-outline)">
          Motivo de consulta
        </label>
        <input
          v-model="bookMotivo"
          type="text"
          placeholder="Ej: revisión anual, control de visión..."
          class="px-4 h-12 rounded-md text-sm outline-none appearance-none shadow-none transition-all"
          :style="inputStyle(false)"
        />
      </div>

      <template #footer>
        <BaseButton variant="secondary" size="default" @click="showBookModal = false">Cancelar</BaseButton>
        <BaseButton
          variant="primary"
          size="default"
          :disabled="isBooking || !selectedProf || !selectedSlot"
          @click="submitBooking"
        >
          <svg v-if="isBooking" class="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          {{ isBooking ? "Reservando..." : "Reservar Turno" }}
        </BaseButton>
      </template>
    </BaseModal>

    <!-- MODAL: Solicitar cancelación -->
    <BaseModal :show="showCancelReqModal" size="sm" @close="showCancelReqModal = false">
      <div class="text-center">
        <div
          class="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-5"
          style="background-color: var(--color-error-container)"
        >
          <span class="material-symbols-outlined" style="color: var(--color-error); font-size: 28px">cancel</span>
        </div>
        <h3 class="text-lg font-extrabold mb-2" style="color: var(--color-on-surface)">Solicitar Cancelación</h3>
        <p class="text-sm" style="color: var(--color-on-surface-variant)">
          ¿Deseás solicitar la cancelación del turno del
          <strong style="color: var(--color-on-surface)">{{
            turnoToCancelRequest ? formatDateLabel(turnoToCancelRequest.fechaHora) : ""
          }}</strong
          >? Un miembro del equipo confirmará la cancelación.
        </p>

        <div
          v-if="cancelReqError"
          class="mt-4 flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium"
          style="background-color: var(--color-error-container); color: var(--color-on-error-container)"
        >
          <span class="material-symbols-outlined" style="font-size: 18px">error</span>
          {{ cancelReqError }}
        </div>
      </div>

      <template #footer>
        <BaseButton class="flex-1" variant="secondary" size="default" @click="showCancelReqModal = false">
          Volver
        </BaseButton>
        <BaseButton
          class="flex-1"
          variant="danger"
          size="default"
          :disabled="isRequestingCancel"
          @click="confirmCancelRequest"
        >
          <svg v-if="isRequestingCancel" class="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          {{ isRequestingCancel ? "Solicitando..." : "Solicitar" }}
        </BaseButton>
      </template>
    </BaseModal>
  </div>
</template>
