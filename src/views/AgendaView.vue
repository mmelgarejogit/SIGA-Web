<script setup lang="ts">
import { ref, computed, onMounted, watch, reactive } from "vue"
import { inputStyle } from "@/composables/useFieldStyles"
import AppSidebar from "@/components/AppSidebar.vue"
import AppHeader from "@/components/AppHeader.vue"
import BaseButton from "@/components/BaseButton.vue"
import BaseModal from "@/components/BaseModal.vue"
import BaseTable from "@/components/BaseTable.vue"
import FilterChips from "@/components/FilterChips.vue"
import PaginationFooter from "@/components/PaginationFooter.vue"
import { useClientPagination } from "@/composables/useClientPagination"
import { useAuthStore } from "@/stores/auth"
import {
  getTurnos,
  getSlotsDisponibles,
  createTurno,
  updateTurnoEstado,
  cancelTurno,
  gestionarCancelacionTurno,
  type Turno,
  type SlotDisponible,
} from "@/services/turnoService"
import { getProfessionals, type Professional } from "@/services/professionalService"
import { getPatients, type Patient } from "@/services/patientService"
import DateRangeBar from "@/components/DateRangeBar.vue"
import RowContextMenu, { type ContextMenuItem } from "@/components/RowContextMenu.vue"
import SearchableSelect from "@/components/SearchableSelect.vue"
import DateInput from "@/components/DateInput.vue"

const auth = useAuthStore()

// ── Helpers de fecha ──────────────────────────────────────────────────────────

function toDateStr(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

function formatHour(iso: string): string {
  const match = iso.match(/T(\d{2}:\d{2})/)
  return match ? match[1]! : iso
}

function formatDateLabel(iso: string): string {
  return new Date(iso).toLocaleDateString("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  })
}

// ── Navegación de fecha ───────────────────────────────────────────────────────

const selectedDate = ref(new Date())
const viewMode = ref<"dia" | "semana" | "mes">("dia")

const selectedDateLabel = computed(() =>
  selectedDate.value.toLocaleDateString("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }),
)

const rangeStart = computed(() => {
  const d = new Date(selectedDate.value)
  if (viewMode.value === "dia") return d
  if (viewMode.value === "semana") {
    const day = d.getDay()
    d.setDate(d.getDate() - day)
    return d
  }
  return new Date(d.getFullYear(), d.getMonth(), 1)
})

const rangeEnd = computed(() => {
  const d = new Date(selectedDate.value)
  if (viewMode.value === "dia") return d
  if (viewMode.value === "semana") {
    const day = d.getDay()
    d.setDate(d.getDate() + (6 - day))
    return d
  }
  return new Date(d.getFullYear(), d.getMonth() + 1, 0)
})

const headerSubtitle = computed(() => {
  if (viewMode.value === "dia") return selectedDateLabel.value
  if (viewMode.value === "semana") {
    const s = rangeStart.value
    const e = rangeEnd.value
    return `Semana del ${s.getDate()} al ${e.getDate()} de ${s.toLocaleDateString("es-AR", { month: "long" })}`
  }
  const label = selectedDate.value.toLocaleDateString("es-AR", { month: "long", year: "numeric" })
  return label.charAt(0).toUpperCase() + label.slice(1)
})

// ── Grilla mensual ──────────────────────────────────────────────────────────────

// 42 días (6 semanas, base lunes) que cubren el mes de selectedDate.
const monthGrid = computed<Date[]>(() => {
  const d = selectedDate.value
  const first = new Date(d.getFullYear(), d.getMonth(), 1)
  const dow = first.getDay() // 0=Dom
  const offset = dow === 0 ? 6 : dow - 1 // base lunes
  const start = new Date(d.getFullYear(), d.getMonth(), 1 - offset)
  return Array.from({ length: 42 }, (_, i) => {
    const day = new Date(start)
    day.setDate(start.getDate() + i)
    return day
  })
})

// Turnos agrupados por fecha (yyyy-mm-dd) para pintar la grilla sin recalcular por celda.
const turnosPorDia = computed(() => {
  const map = new Map<string, Turno[]>()
  for (const t of turnos.value) {
    const key = t.fechaHora.slice(0, 10)
    const arr = map.get(key)
    if (arr) arr.push(t)
    else map.set(key, [t])
  }
  return map
})

const WEEKDAY_HEADERS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"]

function turnosDelDia(day: Date): Turno[] {
  return turnosPorDia.value.get(toDateStr(day)) ?? []
}

function isToday(day: Date): boolean {
  return toDateStr(day) === toDateStr(new Date())
}

function inSelectedMonth(day: Date): boolean {
  return day.getMonth() === selectedDate.value.getMonth()
}

// Click en una celda → ir al día.
function openDay(day: Date) {
  selectedDate.value = new Date(day)
  viewMode.value = "dia"
}

// ── Filtros ───────────────────────────────────────────────────────────────────

const selectedProfessionalId = ref<number | null>(null)
const estadoFilter = ref<string>("")
const estadoFilterChips = ref<string[]>([])

const estadoOptions = [
  { value: "Pendiente", label: "Pendientes", dot: "var(--color-tertiary)" },
  { value: "Confirmado", label: "Confirmados", dot: "var(--color-primary)" },
  { value: "Presente", label: "En sala", dot: "var(--color-secondary)" },
  { value: "Completado", label: "Completados", dot: "var(--color-on-primary-container)" },
  { value: "Cancelado", label: "Cancelados", dot: "var(--color-outline)" },
]

watch(estadoFilterChips, (val) => {
  estadoFilter.value = val[0] ?? ""
  loadTurnos()
})

const turnoColumns = [
  { key: "hora", label: "Hora" },
  { key: "professional", label: "Profesional" },
  { key: "paciente", label: "Paciente" },
  { key: "motivo", label: "Motivo" },
  { key: "estado", label: "Estado" },
  { key: "acciones", label: "Acciones", align: "right" as const },
]

const tableEmptyText = computed(() =>
  viewMode.value === "semana" ? "No hay turnos para esta semana" : "No hay turnos para este día",
)

// ── Datos ─────────────────────────────────────────────────────────────────────

const turnos = ref<Turno[]>([])
const professionals = ref<Professional[]>([])
const patients = ref<Patient[]>([])
const isLoading = ref(false)
const loadError = ref("")

// La vista mensual es una grilla de calendario y no se pagina; la tabla de día y
// semana sí, sobre el set ya cargado (una sola consulta por rango).
const turnosPager = useClientPagination<Turno>(() => turnos.value)

const stats = computed(() => ({
  total: turnos.value.length,
  pendientes: turnos.value.filter((t) => t.estado === "Pendiente").length,
  confirmados: turnos.value.filter((t) => t.estado === "Confirmado").length,
  presentes: turnos.value.filter((t) => t.estado === "Presente").length,
  completados: turnos.value.filter((t) => t.estado === "Completado").length,
  cancelados: turnos.value.filter((t) => t.estado === "Cancelado").length,
}))

async function loadTurnos() {
  isLoading.value = true
  loadError.value = ""
  try {
    if (viewMode.value === "dia") {
      turnos.value = await getTurnos({
        fecha: toDateStr(selectedDate.value),
        professionalId: selectedProfessionalId.value ?? undefined,
        estado: estadoFilter.value || undefined,
      })
    } else {
      // Semana y mes: una sola consulta por rango. En mes se trae toda la grilla
      // (42 celdas, incluye días de meses vecinos) para que cada celda muestre su conteo real.
      const [start, end] = viewMode.value === "semana"
        ? [rangeStart.value, rangeEnd.value]
        : [monthGrid.value[0]!, monthGrid.value[monthGrid.value.length - 1]!]
      turnos.value = await getTurnos({
        desde: toDateStr(start),
        hasta: toDateStr(end),
        professionalId: selectedProfessionalId.value ?? undefined,
        estado: estadoFilter.value || undefined,
      })
    }
  } catch (err: unknown) {
    loadError.value = err instanceof Error ? err.message : "Error al cargar turnos."
  } finally {
    // Cambiar de día, semana o filtro es un listado nuevo: arrancar desde la página 1.
    turnosPager.currentPage = 1
    isLoading.value = false
  }
}

async function loadInit() {
  try {
    // Solo activos: a un paciente inactivo (archivado) el backend no permite agendarle,
    // así que tampoco tiene que aparecer en el selector.
    const [profs, pts] = await Promise.all([
      getProfessionals(),
      getPatients({ pageSize: 500, status: "active" }),
    ])
    professionals.value = profs.filter((p) => p.isActive)
    patients.value = pts.items
  } catch {
    /* silent */
  }
  await loadTurnos()
}

const professionalOptions = computed(() =>
  professionals.value.map(p => ({ value: p.id, label: `${p.firstName} ${p.lastName}` })),
)

const slotOptions = computed(() =>
  slots.value.map(s => ({ value: s.horaInicio, label: formatSlot(s) })),
)

onMounted(loadInit)
watch([selectedDate, selectedProfessionalId, viewMode], loadTurnos)

// ── Estilos ───────────────────────────────────────────────────────────────────

const ESTADO_BADGE: Record<string, string> = {
  Pendiente:  "bg-amber-50 text-amber-700",
  Confirmado: "bg-blue-100 text-blue-700",
  Presente:   "bg-violet-100 text-violet-700",
  Completado: "bg-green-100 text-green-700",
  Cancelado:  "bg-surface-container-high text-on-surface-variant",
}

const ESTADO_DOT: Record<string, string> = {
  Pendiente:  "bg-amber-500",
  Confirmado: "bg-blue-600",
  Presente:   "bg-violet-600",
  Completado: "bg-green-600",
  Cancelado:  "bg-on-surface-variant",
}

// ── Modal Nuevo Turno ─────────────────────────────────────────────────────────

const showCreateModal = ref(false)
const createError = ref("")
const isSavingCreate = ref(false)
const slots = ref<SlotDisponible[]>([])
const isLoadingSlots = ref(false)
const isPastDate = ref(false)
const patientSearch = ref("")
const showPatientDropdown = ref(false)
const selectedPatient = ref<Patient | null>(null)

const createForm = reactive({
  professionalId: null as number | null,
  fecha: "",
  slot: "",
  motivo: "",
  notas: "",
})

const filteredPatients = computed(() => {
  const q = patientSearch.value.trim().toLowerCase()
  if (!q) return patients.value.slice(0, 8)
  return patients.value
    .filter(
      (p) =>
        `${p.firstName} ${p.lastName}`.toLowerCase().includes(q) || p.ci.toLowerCase().includes(q),
    )
    .slice(0, 8)
})

function formatSlot(s: SlotDisponible): string {
  return `${s.horaInicio.slice(0, 5)} - ${s.horaFin.slice(0, 5)}`
}

async function loadSlots() {
  slots.value = []
  createForm.slot = ""
  isPastDate.value = false

  if (!createForm.professionalId || !createForm.fecha) return

  if (createForm.fecha < toDateStr(new Date())) {
    isPastDate.value = true
    return
  }

  isLoadingSlots.value = true
  try {
    slots.value = await getSlotsDisponibles(createForm.professionalId, createForm.fecha)
  } catch {
    slots.value = []
  } finally {
    isLoadingSlots.value = false
  }
}

watch(
  () => [createForm.professionalId, createForm.fecha],
  () => {
    if (showCreateModal.value) loadSlots()
  },
)

function openCreateModal() {
  createForm.professionalId = selectedProfessionalId.value
  createForm.fecha = toDateStr(selectedDate.value)
  createForm.slot = ""
  createForm.motivo = ""
  createForm.notas = ""
  createError.value = ""
  patientSearch.value = ""
  selectedPatient.value = null
  slots.value = []
  showCreateModal.value = true
  if (createForm.professionalId && createForm.fecha) loadSlots()
}

function selectPatient(p: Patient) {
  selectedPatient.value = p
  patientSearch.value = `${p.firstName} ${p.lastName}`
  showPatientDropdown.value = false
}

function onPatientBlur() {
  setTimeout(() => {
    showPatientDropdown.value = false
  }, 150)
}

async function submitCreate() {
  createError.value = ""
  if (!createForm.professionalId) {
    createError.value = "Seleccioná un profesional."
    return
  }
  if (!createForm.fecha) {
    createError.value = "Seleccioná una fecha."
    return
  }
  if (!createForm.slot) {
    createError.value = "Seleccioná un horario disponible."
    return
  }
  if (!selectedPatient.value) {
    createError.value = "Seleccioná un paciente."
    return
  }

  isSavingCreate.value = true
  try {
    await createTurno({
      professionalId: createForm.professionalId,
      patientId: selectedPatient.value.id,
      fechaHora: `${createForm.fecha}T${createForm.slot}Z`,
      motivo: createForm.motivo.trim() || undefined,
      notas: createForm.notas.trim() || undefined,
    })
    showCreateModal.value = false
    // Navegar al día del turno creado para asegurar que se muestre
    selectedDate.value = new Date(createForm.fecha + "T12:00:00")
    selectedProfessionalId.value = createForm.professionalId
    await loadTurnos()
  } catch (err: unknown) {
    createError.value = err instanceof Error ? err.message : "Error al crear el turno."
  } finally {
    isSavingCreate.value = false
  }
}

// ── Completar / Cancelar ──────────────────────────────────────────────────────

const showCancelModal = ref(false)
const turnoToCancel = ref<Turno | null>(null)
const isCancelling = ref(false)
const cancelError = ref("")

function openCancelModal(t: Turno) {
  turnoToCancel.value = t
  cancelError.value = ""
  showCancelModal.value = true
}

async function confirmCancel() {
  if (!turnoToCancel.value) return
  isCancelling.value = true
  cancelError.value = ""
  try {
    await cancelTurno(turnoToCancel.value.id)
    showCancelModal.value = false
    await loadTurnos()
  } catch (err: unknown) {
    cancelError.value = err instanceof Error ? err.message : "Error al cancelar el turno."
  } finally {
    isCancelling.value = false
  }
}

async function confirmarLlegada(t: Turno) {
  try {
    await updateTurnoEstado(t.id, "Presente")
    await loadTurnos()
  } catch {
    /* silent */
  }
}

// ── Gestionar solicitud de cancelación ────────────────────────────────────────

const showGestionarModal = ref(false)
const turnoToGestionar = ref<Turno | null>(null)
const isGestionando = ref(false)
const gestionarError = ref("")

function openGestionarModal(t: Turno) {
  turnoToGestionar.value = t
  gestionarError.value = ""
  showGestionarModal.value = true
}

async function confirmGestionar(aprobar: boolean) {
  if (!turnoToGestionar.value) return
  isGestionando.value = true
  gestionarError.value = ""
  try {
    await gestionarCancelacionTurno(turnoToGestionar.value.id, aprobar)
    showGestionarModal.value = false
    await loadTurnos()
  } catch (err: unknown) {
    gestionarError.value = err instanceof Error ? err.message : "Error al gestionar la solicitud."
  } finally {
    isGestionando.value = false
  }
}

// ── Menú contextual de fila ───────────────────────────────────────────────────

function menuItems(t: Turno): ContextMenuItem[] {
  const canGestionar = t.solicitudCancelacion && auth.hasPermission("gestionar_agenda")
  const canConfirmar = (t.estado === "Pendiente" || t.estado === "Confirmado") && auth.hasPermission("gestionar_agenda")
  const hasTopActions = canGestionar || canConfirmar

  return [
    {
      type: "item",
      label: "Gestionar solicitud",
      icon: "assignment",
      action: () => openGestionarModal(t),
      hidden: !canGestionar,
    },
    {
      type: "item",
      label: "Confirmar llegada",
      icon: "person_check",
      action: () => confirmarLlegada(t),
      hidden: !canConfirmar,
    },
    ...(hasTopActions ? [{ type: "separator" } as ContextMenuItem] : []),
    {
      type: "item",
      label: "Cancelar turno",
      icon: "close",
      action: () => openCancelModal(t),
      danger: true,
      // No se cancela un turno ya realizado (Completado) ni uno ya cancelado.
      hidden: !(["Pendiente", "Confirmado", "Presente"].includes(t.estado) && auth.hasPermission("gestionar_agenda")),
    },
  ]
}
</script>

<template>
  <div class="min-h-screen" style="background-color: var(--color-background)">
    <AppSidebar />
    <AppHeader />

    <main style="margin-left: var(--sidebar-width); transition: margin-left 0.25s ease; padding-top: 64px">
      <div class="p-4 sm:p-6 lg:p-8">
        <!-- ── HEADER ──────────────────────────────────────────────────── -->
        <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-8">
          <div>
            <h1 class="text-4xl font-extrabold tracking-tight mb-2">Agenda</h1>
            <p class="font-medium" style="color: var(--color-on-surface-variant)">
              {{ headerSubtitle }}
            </p>
          </div>
          <BaseButton
            v-if="auth.hasPermission('gestionar_agenda')"
            variant="primary"
            size="lg"
            @click="openCreateModal"
          >
            <span class="material-symbols-outlined" style="width:20px;height:20px;font-size:20px">add</span>
            Nuevo Turno
          </BaseButton>
        </div>

        <!-- ── CONTROLES ───────────────────────────────────────────────── -->
        <div class="flex items-center gap-3 mb-8 flex-wrap">
          <DateRangeBar v-model="selectedDate" v-model:mode="viewMode" />

          <!-- Filtro por profesional -->
          <div class="agenda-prof-filter">
            <SearchableSelect
              :model-value="selectedProfessionalId"
              :options="professionalOptions"
              null-label="Todos los profesionales"
              @update:model-value="selectedProfessionalId = $event as number | null"
            />
          </div>
        </div>

        <!-- ── STATS CARDS ─────────────────────────────────────────────── -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
          <div
            v-for="card in [
              { key: 'total', label: 'Total', value: stats.total, color: 'var(--color-on-surface)' },
              { key: 'pendientes', label: 'Pendientes', value: stats.pendientes, color: 'var(--color-tertiary)' },
              { key: 'confirmados', label: 'Confirmados', value: stats.confirmados, color: 'var(--color-primary)' },
              { key: 'presentes', label: 'En sala', value: stats.presentes, color: 'var(--color-secondary)' },
              { key: 'completados', label: 'Completados', value: stats.completados, color: 'var(--color-on-primary-container)' },
              { key: 'cancelados', label: 'Cancelados', value: stats.cancelados, color: 'var(--color-outline)' },
            ]"
            :key="card.key"
            class="rounded-2xl p-4"
            style="
              background-color: var(--color-surface-container-lowest);
              box-shadow: var(--shadow-sm);
            "
          >
            <p class="text-xs font-semibold uppercase tracking-wider mb-2" style="color: var(--color-outline)">
              {{ card.label }}
            </p>
            <p class="text-3xl font-bold" :style="{ color: card.color }">{{ card.value }}</p>
          </div>
        </div>

        <!-- ── FILTRO ESTADO ───────────────────────────────────────────── -->
        <div class="mb-4">
          <FilterChips
            v-model="estadoFilterChips"
            :options="estadoOptions"
            placeholder="Estado"
          />
        </div>

        <!-- ── TABLA ───────────────────────────────────────────────────── -->
        <div
          v-if="loadError"
          class="px-6 py-4 text-sm font-medium"
          style="color: var(--color-error)"
        >
          {{ loadError }}
        </div>

        <!-- ── VISTA MENSUAL (grilla de calendario) ──────────────────────── -->
        <div v-else-if="viewMode === 'mes'" class="p-4">
          <div class="grid grid-cols-7 gap-2 mb-2">
            <div
              v-for="wd in WEEKDAY_HEADERS"
              :key="wd"
              class="text-center text-xs font-bold uppercase tracking-wider"
              style="color: var(--color-outline)"
            >
              {{ wd }}
            </div>
          </div>
          <div class="grid grid-cols-7 gap-2">
            <button
              v-for="day in monthGrid"
              :key="day.toISOString()"
              @click="openDay(day)"
              class="text-left rounded-lg p-2 min-h-[96px] flex flex-col gap-1 transition-colors hover:bg-surface-container-low"
              :style="{
                border: isToday(day) ? '1px solid var(--color-primary)' : '1px solid var(--color-hairline-soft)',
                background: inSelectedMonth(day) ? 'var(--color-surface-container-lowest)' : 'transparent',
                opacity: inSelectedMonth(day) ? 1 : 0.45,
              }"
              :title="`Ver turnos del ${day.getDate()}`"
            >
              <div class="flex items-center justify-between">
                <span
                  class="text-xs font-bold"
                  :style="{ color: isToday(day) ? 'var(--color-primary)' : 'var(--color-on-surface)' }"
                >{{ day.getDate() }}</span>
                <span
                  v-if="turnosDelDia(day).length"
                  class="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                  style="background: var(--color-primary); color: var(--color-on-primary)"
                >{{ turnosDelDia(day).length }}</span>
              </div>
              <div class="flex flex-col gap-0.5 overflow-hidden">
                <span
                  v-for="t in turnosDelDia(day).slice(0, 3)"
                  :key="t.id"
                  class="text-[10px] leading-tight truncate flex items-center gap-1"
                  :title="`${formatHour(t.fechaHora)} · ${t.patientNombre} · ${t.estado}`"
                >
                  <span
                    class="w-1.5 h-1.5 rounded-full flex-shrink-0"
                    :class="ESTADO_DOT[t.estado] ?? 'bg-outline-variant'"
                  ></span>
                  <span class="truncate" style="color: var(--color-on-surface-variant)">
                    {{ formatHour(t.fechaHora) }} {{ t.patientNombre }}
                  </span>
                </span>
                <span
                  v-if="turnosDelDia(day).length > 3"
                  class="text-[10px] font-semibold"
                  style="color: var(--color-primary)"
                >+{{ turnosDelDia(day).length - 3 }} más</span>
              </div>
            </button>
          </div>
        </div>

        <BaseTable
          v-else
          :columns="turnoColumns"
          :items="turnosPager.pageItems"
          :loading="isLoading"
          :empty-text="tableEmptyText"
        >
          <template #hora="{ item }">
            <span
              class="text-sm font-bold"
              style="color: var(--color-primary); font-variant-numeric: tabular-nums"
            >
              {{ formatHour(item.fechaHora) }}
            </span>
          </template>

          <template #professional="{ item }">
            <span class="text-sm font-medium" style="color: var(--color-on-surface)">
              {{ item.professionalNombre }}
            </span>
          </template>

          <template #paciente="{ item }">
            <span class="text-sm font-medium" style="color: var(--color-on-surface)">
              {{ item.patientNombre }}
            </span>
          </template>

          <template #motivo="{ item }">
            <span class="text-sm" style="color: var(--color-on-surface-variant)">{{
              item.motivo || "—"
            }}</span>
          </template>

          <template #estado="{ item }">
            <div class="flex items-center gap-2">
              <span
                class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
                :class="ESTADO_BADGE[item.estado] ?? 'bg-surface-container-high text-on-surface-variant'"
              >
                <span
                  class="w-1.5 h-1.5 rounded-full flex-shrink-0"
                  :class="ESTADO_DOT[item.estado] ?? 'bg-outline-variant'"
                ></span>
                {{ item.estado }}
              </span>
              <span
                v-if="item.solicitudCancelacion"
                class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-50 text-amber-800"
              >
                <span class="material-symbols-outlined" style="font-size: 10px">hourglass_empty</span>
                Solicita cancelar
              </span>
            </div>
          </template>

          <template #acciones="{ item }">
            <div class="flex items-center justify-end">
              <RowContextMenu v-if="item.estado !== 'Cancelado'" :items="menuItems(item)" />
            </div>
          </template>
        </BaseTable>

        <!-- Footer: solo en día y semana; la vista mensual no se pagina. -->
        <PaginationFooter
          v-if="!isLoading && viewMode !== 'mes' && turnos.length > 0"
          v-model:current-page="turnosPager.currentPage"
          :total-pages="turnosPager.totalPages"
          :range-start="turnosPager.rangeStart"
          :range-end="turnosPager.rangeEnd"
          :total="turnos.length"
          noun="turnos"
        />
      </div>
    </main>

    <!-- ── MODAL NUEVO TURNO ──────────────────────────────────────────────── -->
    <BaseModal
      :show="showCreateModal"
      title="Nuevo Turno"
      size="lg"
      @close="showCreateModal = false"
    >
      <Transition name="fade">
        <div
          v-if="createError"
          class="flex items-center gap-2 rounded-2xl px-4 py-3 mb-4 text-sm font-medium"
          style="
            background-color: var(--color-error-container);
            color: var(--color-on-error-container);
          "
        >
          <span class="material-symbols-outlined flex-shrink-0" style="font-size: 16px">error</span>
          {{ createError }}
        </div>
      </Transition>

      <form @submit.prevent="submitCreate" class="space-y-4">

        <!-- Profesional -->
        <div>
          <label class="block text-xs font-bold uppercase tracking-wider mb-1.5" style="color: var(--color-outline)">Profesional</label>
          <div class="modal-field">
            <SearchableSelect
              :model-value="createForm.professionalId"
              :options="professionalOptions"
              placeholder="Buscar profesional..."
              @update:model-value="createForm.professionalId = $event as number | null"
            />
          </div>
        </div>

        <!-- Fecha -->
        <div>
          <label class="block text-xs font-bold uppercase tracking-wider mb-1.5" style="color: var(--color-outline)">Fecha</label>
          <DateInput v-model="createForm.fecha" />
        </div>

        <!-- Horario disponible -->
        <div>
          <label class="block text-xs font-bold uppercase tracking-wider mb-1.5" style="color: var(--color-outline)">Horario</label>
          <div v-if="isLoadingSlots" class="text-xs py-1" style="color: var(--color-outline)">
            Cargando horarios...
          </div>
          <div v-else-if="!createForm.professionalId || !createForm.fecha" class="text-xs py-1"
            style="color: var(--color-outline-variant)">
            Seleccioná profesional y fecha primero
          </div>
          <div v-else-if="isPastDate"
            class="flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-amber-50 text-amber-800"
            style="border-radius: 12px">
            <span class="material-symbols-outlined flex-shrink-0" style="font-size: 14px">event_busy</span>
            No se pueden reservar turnos en fechas pasadas
          </div>
          <div v-else-if="slots.length === 0" class="text-xs py-1 font-medium text-amber-600">
            El profesional no tiene horario disponible ese día
          </div>
          <div v-else class="modal-field">
            <SearchableSelect
              :model-value="createForm.slot"
              :options="slotOptions"
              placeholder="Seleccioná un horario"
              @update:model-value="createForm.slot = $event as string"
            />
          </div>
        </div>

        <!-- Paciente con autocomplete -->
        <div class="relative">
          <label class="block text-xs font-bold uppercase tracking-wider mb-1.5" style="color: var(--color-outline)">Paciente</label>
          <input
            v-model="patientSearch"
            type="text"
            placeholder="Buscar por nombre o CI..."
            @focus="showPatientDropdown = true"
            @blur="onPatientBlur"
            class="w-full px-4 h-12 text-sm outline-none appearance-none shadow-none"
            :style="inputStyle()"
          />
          <div v-if="showPatientDropdown && filteredPatients.length > 0"
            class="absolute left-0 right-0 z-20 mt-1 shadow-lg overflow-hidden"
            style="border-radius: 12px; background-color: var(--color-surface-container-lowest); border: 1px solid var(--color-outline-variant); max-height: 180px; overflow-y: auto;">
            <button v-for="p in filteredPatients" :key="p.id" type="button"
              @mousedown.prevent="selectPatient(p)"
              class="w-full text-left px-3 py-2 text-sm hover:bg-surface-container-low transition-colors">
              <span class="font-medium" style="color: var(--color-on-surface)">{{ p.firstName }} {{ p.lastName }}</span>
              <span class="ml-2 text-xs" style="color: var(--color-outline)">{{ p.ci }}</span>
            </button>
          </div>
        </div>

        <!-- Motivo -->
        <div>
          <label class="block text-xs font-bold uppercase tracking-wider mb-1.5" style="color: var(--color-outline)">
            Motivo
            <span class="normal-case font-normal tracking-normal" style="color: var(--color-outline-variant)">(opcional)</span>
          </label>
          <input
            v-model="createForm.motivo"
            type="text"
            placeholder="Ej: Control anual, adaptación de lentes..."
            class="w-full px-4 h-12 text-sm outline-none appearance-none shadow-none"
            :style="inputStyle()"
          />
        </div>

        <!-- Notas -->
        <div>
          <label class="block text-xs font-bold uppercase tracking-wider mb-1.5" style="color: var(--color-outline)">
            Notas internas
            <span class="normal-case font-normal tracking-normal" style="color: var(--color-outline-variant)">(opcional)</span>
          </label>
          <textarea
            v-model="createForm.notas"
            rows="2"
            placeholder="Notas para el staff..."
            class="w-full px-4 py-3 text-sm outline-none appearance-none shadow-none resize-none"
            :style="inputStyle()"
          />
        </div>
      </form>

      <template #footer>
        <div class="flex justify-between w-full">
          <BaseButton variant="secondary" size="default" @click="showCreateModal = false">Cancelar</BaseButton>
          <BaseButton variant="primary" size="default" :disabled="isSavingCreate" @click="submitCreate">
            <span v-if="isSavingCreate" class="material-symbols-outlined animate-spin" style="font-size: 18px">progress_activity</span>
            {{ isSavingCreate ? "Guardando..." : "Confirmar Turno" }}
          </BaseButton>
        </div>
      </template>
    </BaseModal>

    <!-- ── MODAL CANCELAR TURNO ───────────────────────────────────────────── -->
    <BaseModal :show="showCancelModal" size="sm" @close="showCancelModal = false">
      <div class="text-center">
        <div
          class="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3"
          style="background-color: var(--color-error-container)"
        >
          <span class="material-symbols-outlined" style="color: var(--color-error); font-size: 24px"
            >cancel</span
          >
        </div>

        <h3 class="text-lg font-bold mb-2" style="color: var(--color-on-surface)">
          Cancelar turno
        </h3>
        <p class="text-sm mb-5" style="color: var(--color-on-surface-variant)" v-if="turnoToCancel">
          ¿Cancelar el turno de
          <strong>{{ turnoToCancel.patientNombre }}</strong>
          a las <strong>{{ formatHour(turnoToCancel.fechaHora) }}</strong
          >?
        </p>

        <p v-if="cancelError" class="text-sm font-medium mb-3" style="color: var(--color-error)">
          {{ cancelError }}
        </p>
      </div>

      <template #footer>
        <BaseButton
          class="flex-1"
          variant="secondary"
          size="default"
          @click="showCancelModal = false"
        >
          Volver
        </BaseButton>
        <BaseButton
          class="flex-1"
          variant="danger"
          size="default"
          :disabled="isCancelling"
          @click="confirmCancel"
        >
          <svg v-if="isCancelling" class="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
            <circle
              class="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              stroke-width="4"
            />
            <path
              class="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
          {{ isCancelling ? "Cancelando..." : "Sí, cancelar" }}
        </BaseButton>
      </template>
    </BaseModal>

    <!-- ── MODAL GESTIONAR SOLICITUD DE CANCELACIÓN ──────────────────────── -->
    <BaseModal :show="showGestionarModal" size="sm" @close="showGestionarModal = false">
      <div class="text-center">
        <div class="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 bg-amber-50">
          <span class="material-symbols-outlined text-amber-800" style="font-size: 24px">assignment</span>
        </div>

        <h3 class="text-lg font-bold mb-2" style="color: var(--color-on-surface)">
          Solicitud de Cancelación
        </h3>
        <p
          class="text-sm mb-5"
          style="color: var(--color-on-surface-variant)"
          v-if="turnoToGestionar"
        >
          <strong>{{ turnoToGestionar.patientNombre }}</strong> solicitó cancelar el turno del
          {{ formatDateLabel(turnoToGestionar.fechaHora) }} a las
          {{ formatHour(turnoToGestionar.fechaHora) }}.
        </p>

        <p v-if="gestionarError" class="text-sm font-medium mb-3" style="color: var(--color-error)">
          {{ gestionarError }}
        </p>
      </div>

      <template #footer>
        <BaseButton
          class="flex-1"
          variant="secondary"
          size="default"
          @click="showGestionarModal = false"
        >
          Volver
        </BaseButton>
        <BaseButton
          class="flex-1"
          variant="secondary"
          size="default"
          :disabled="isGestionando"
          @click="confirmGestionar(false)"
        >
          Rechazar
        </BaseButton>
        <BaseButton
          class="flex-1"
          variant="danger"
          size="default"
          :disabled="isGestionando"
          @click="confirmGestionar(true)"
        >
          <svg v-if="isGestionando" class="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
            <circle
              class="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              stroke-width="4"
            />
            <path
              class="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
          Aprobar
        </BaseButton>
      </template>
    </BaseModal>
  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active { transition: opacity 0.2s ease; }
.fade-enter-from,
.fade-leave-to { opacity: 0; }

/* Filtro de profesional en la barra de controles */
.agenda-prof-filter {
  width: 240px;
}
.agenda-prof-filter :deep(.ss-trigger) {
  height: 36px;
  font-size: 13px;
  font-weight: 500;
  border-radius: 8px;
  background: var(--color-surface);
}

/* SearchableSelect dentro del modal: misma altura que los inputs (48px) */
.modal-field :deep(.ss-trigger) {
  height: 48px;
  border-radius: 12px;
  font-size: 14px;
  background-color: var(--color-surface-container-low);
  border-color: var(--color-outline-variant);
}
</style>
