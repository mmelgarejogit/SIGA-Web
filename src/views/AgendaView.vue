<script setup lang="ts">
import { ref, computed, onMounted, watch, reactive } from "vue"
import AppSidebar from "@/components/AppSidebar.vue"
import AppHeader from "@/components/AppHeader.vue"
import BaseButton from "@/components/BaseButton.vue"
import BaseModal from "@/components/BaseModal.vue"
import BaseTable from "@/components/BaseTable.vue"
import FilterTabs from "@/components/FilterTabs.vue"
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

const selectedDateInput = computed({
  get: () => toDateStr(selectedDate.value),
  set: (v) => {
    selectedDate.value = new Date(v + "T12:00:00")
  },
})

const selectedDateLabel = computed(() =>
  selectedDate.value.toLocaleDateString("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }),
)

const isToday = computed(() => toDateStr(selectedDate.value) === toDateStr(new Date()))

function prevDay() {
  const d = new Date(selectedDate.value)
  d.setDate(d.getDate() - 1)
  selectedDate.value = d
}
function nextDay() {
  const d = new Date(selectedDate.value)
  d.setDate(d.getDate() + 1)
  selectedDate.value = d
}
function goToToday() {
  selectedDate.value = new Date()
}

// ── Filtros ───────────────────────────────────────────────────────────────────

const selectedProfessionalId = ref<number | null>(null)
const estadoFilter = ref<string>("")

const estadoTabs = [
  { value: "", label: "Todos" },
  { value: "Pendiente", label: "Pendientes" },
  { value: "Completado", label: "Completados" },
  { value: "Cancelado", label: "Cancelados" },
]

const turnoColumns = [
  { key: "hora", label: "Hora" },
  { key: "professional", label: "Profesional" },
  { key: "paciente", label: "Paciente" },
  { key: "motivo", label: "Motivo" },
  { key: "estado", label: "Estado" },
  { key: "acciones", label: "Acciones", align: "right" as const },
]

const tableEmptyText = computed(() =>
  turnos.value.length === 0 ? "No hay turnos para este día" : "No hay turnos con ese estado",
)

// ── Datos ─────────────────────────────────────────────────────────────────────

const turnos = ref<Turno[]>([])
const professionals = ref<Professional[]>([])
const patients = ref<Patient[]>([])
const isLoading = ref(false)
const loadError = ref("")

const filteredTurnos = computed(() =>
  estadoFilter.value ? turnos.value.filter((t) => t.estado === estadoFilter.value) : turnos.value,
)

const stats = computed(() => ({
  total: turnos.value.length,
  pendientes: turnos.value.filter((t) => t.estado === "Pendiente").length,
  completados: turnos.value.filter((t) => t.estado === "Completado").length,
  cancelados: turnos.value.filter((t) => t.estado === "Cancelado").length,
  solicitudes: turnos.value.filter((t) => t.solicitudCancelacion).length,
}))

async function loadTurnos() {
  isLoading.value = true
  loadError.value = ""
  try {
    turnos.value = await getTurnos({
      fecha: toDateStr(selectedDate.value),
      professionalId: selectedProfessionalId.value ?? undefined,
    })
  } catch (err: unknown) {
    loadError.value = err instanceof Error ? err.message : "Error al cargar turnos."
  } finally {
    isLoading.value = false
  }
}

async function loadInit() {
  try {
    const [profs, pts] = await Promise.all([getProfessionals(), getPatients({ pageSize: 500 })])
    professionals.value = profs.filter((p) => p.isActive)
    patients.value = pts.items
  } catch {
    /* silent */
  }
  await loadTurnos()
}

onMounted(loadInit)
watch([selectedDate, selectedProfessionalId], loadTurnos)

// ── Estilos ───────────────────────────────────────────────────────────────────

function estadoStyle(estado: string) {
  switch (estado) {
    case "Pendiente":
      return { bg: "#FEF3C7", dot: "#D97706", text: "#92400E" }
    case "Completado":
      return { bg: "#dcfce7", dot: "#16a34a", text: "#166534" }
    case "Cancelado":
      return {
        bg: "var(--color-surface-container-highest)",
        dot: "var(--color-outline)",
        text: "var(--color-on-surface-variant)",
      }
    default:
      return {
        bg: "var(--color-surface-container-highest)",
        dot: "var(--color-outline)",
        text: "var(--color-on-surface-variant)",
      }
  }
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

async function completarTurno(t: Turno) {
  try {
    await updateTurnoEstado(t.id, "Completado")
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
</script>

<template>
  <div class="min-h-screen" style="background-color: var(--color-background)">
    <AppSidebar />
    <AppHeader />

    <main style="margin-left: 280px; padding-top: 64px">
      <div class="p-8">
        <!-- ── HEADER ──────────────────────────────────────────────────── -->
        <div class="flex items-start justify-between mb-8">
          <div>
            <h1 class="text-4xl font-extrabold tracking-tight mb-2">Agenda</h1>
            <p class="text-sm font-medium capitalize" style="color: var(--color-outline)">
              {{ selectedDateLabel }}
            </p>
          </div>
          <BaseButton
            v-if="auth.hasPermission('gestionar_agenda')"
            variant="primary"
            size="default"
            @click="openCreateModal"
          >
            <span class="material-symbols-outlined" style="font-size: 18px">add</span>
            Nuevo Turno
          </BaseButton>
        </div>

        <!-- ── CONTROLES ───────────────────────────────────────────────── -->
        <div class="flex items-center gap-3 mb-6 flex-wrap">
          <!-- Navegación de fecha -->
          <div
            class="flex items-center rounded-2xl overflow-hidden"
            style="background: white; border: 1px solid var(--color-surface-container-highest)"
          >
            <button
              @click="prevDay"
              class="px-3 py-2 hover:bg-[var(--color-surface)] transition-colors"
              title="Día anterior"
            >
              <span
                class="material-symbols-outlined"
                style="font-size: 20px; color: var(--color-on-surface-variant)"
                >chevron_left</span
              >
            </button>
            <input
              type="date"
              v-model="selectedDateInput"
              class="px-2 py-2 text-sm font-semibold outline-none"
              style="color: var(--color-on-surface); background: transparent; min-width: 145px"
            />
            <button
              @click="nextDay"
              class="px-3 py-2 hover:bg-[var(--color-surface)] transition-colors"
              title="Día siguiente"
            >
              <span
                class="material-symbols-outlined"
                style="font-size: 20px; color: var(--color-on-surface-variant)"
                >chevron_right</span
              >
            </button>
          </div>

          <BaseButton v-if="!isToday" variant="secondary" size="sm" @click="goToToday">
            Hoy
          </BaseButton>

          <!-- Filtro por profesional -->
          <select
            v-model="selectedProfessionalId"
            class="px-4 py-2 rounded-2xl text-sm font-medium outline-none"
            style="
              background: white;
              border: 1px solid var(--color-surface-container-highest);
              color: var(--color-on-surface);
              min-width: 220px;
            "
          >
            <option :value="null">Todos los profesionales</option>
            <option v-for="p in professionals" :key="p.id" :value="p.id">
              {{ p.firstName }} {{ p.lastName }}
            </option>
          </select>
        </div>

        <!-- ── STATS CARDS ─────────────────────────────────────────────── -->
        <div class="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          <div
            class="rounded-2xl p-4"
            style="background: white; border: 1px solid var(--color-surface-container-highest)"
          >
            <p
              class="text-xs font-semibold uppercase tracking-wider mb-2"
              style="color: var(--color-outline)"
            >
              Total
            </p>
            <p class="text-3xl font-bold" style="color: var(--color-on-surface)">
              {{ stats.total }}
            </p>
          </div>
          <div
            class="rounded-2xl p-4"
            style="background: white; border: 1px solid var(--color-surface-container-highest)"
          >
            <p
              class="text-xs font-semibold uppercase tracking-wider mb-2"
              style="color: var(--color-outline)"
            >
              Pendientes
            </p>
            <p class="text-3xl font-bold" style="color: #d97706">{{ stats.pendientes }}</p>
          </div>
          <div
            class="rounded-2xl p-4"
            style="background: white; border: 1px solid var(--color-surface-container-highest)"
          >
            <p
              class="text-xs font-semibold uppercase tracking-wider mb-2"
              style="color: var(--color-outline)"
            >
              Completados
            </p>
            <p class="text-3xl font-bold" style="color: #16a34a">{{ stats.completados }}</p>
          </div>
          <div
            class="rounded-2xl p-4"
            style="background: white; border: 1px solid var(--color-surface-container-highest)"
          >
            <p
              class="text-xs font-semibold uppercase tracking-wider mb-2"
              style="color: var(--color-outline)"
            >
              Cancelados
            </p>
            <p class="text-3xl font-bold" style="color: var(--color-outline)">
              {{ stats.cancelados }}
            </p>
          </div>
          <div
            class="rounded-2xl p-4"
            style="background: white; border: 1px solid var(--color-surface-container-highest)"
          >
            <p
              class="text-xs font-semibold uppercase tracking-wider mb-2"
              style="color: var(--color-outline)"
            >
              Solicitudes
            </p>
            <p class="text-3xl font-bold" style="color: var(--color-error)">
              {{ stats.solicitudes }}
            </p>
          </div>
        </div>

        <!-- ── FILTRO ESTADO ───────────────────────────────────────────── -->
        <FilterTabs v-model="estadoFilter" :tabs="estadoTabs" class="mb-4" />

        <!-- ── TABLA ───────────────────────────────────────────────────── -->
        <div
          v-if="loadError"
          class="px-6 py-4 text-sm font-medium"
          style="color: var(--color-error)"
        >
          {{ loadError }}
        </div>

        <BaseTable
          v-else
          :columns="turnoColumns"
          :items="filteredTurnos"
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
                :style="`background-color: ${estadoStyle(item.estado).bg}; color: ${estadoStyle(item.estado).text};`"
              >
                <span
                  class="w-1.5 h-1.5 rounded-full flex-shrink-0"
                  :style="`background-color: ${estadoStyle(item.estado).dot};`"
                ></span>
                {{ item.estado }}
              </span>
              <span
                v-if="item.solicitudCancelacion"
                class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider"
                style="background-color: #fef3c7; color: #92400e"
              >
                <span class="material-symbols-outlined" style="font-size: 10px"
                  >hourglass_empty</span
                >
                Solicita cancelar
              </span>
            </div>
          </template>

          <template #acciones="{ item }">
            <div class="flex items-center justify-end gap-1.5">
              <button
                v-if="item.solicitudCancelacion && auth.hasPermission('gestionar_agenda')"
                @click.stop="openGestionarModal(item)"
                class="w-8 h-8 rounded-full flex items-center justify-center transition-colors hover:opacity-80"
                style="background-color: #fef3c7"
                title="Gestionar solicitud de cancelación"
              >
                <span class="material-symbols-outlined" style="font-size: 16px; color: #92400e"
                  >assignment</span
                >
              </button>
              <button
                v-if="item.estado === 'Pendiente' && auth.hasPermission('gestionar_agenda')"
                @click.stop="completarTurno(item)"
                class="w-8 h-8 rounded-full flex items-center justify-center transition-colors hover:opacity-80"
                style="background-color: #dcfce7"
                title="Marcar como completado"
              >
                <span class="material-symbols-outlined" style="font-size: 16px; color: #16a34a"
                  >check</span
                >
              </button>
              <button
                v-if="item.estado !== 'Cancelado' && auth.hasPermission('gestionar_agenda')"
                @click.stop="openCancelModal(item)"
                class="w-8 h-8 rounded-full flex items-center justify-center transition-colors hover:opacity-80"
                style="background-color: var(--color-error-container)"
                title="Cancelar turno"
              >
                <span
                  class="material-symbols-outlined"
                  style="font-size: 16px; color: var(--color-error)"
                  >close</span
                >
              </button>
            </div>
          </template>
        </BaseTable>

        <!-- Footer -->
        <div
          v-if="!isLoading && filteredTurnos.length > 0"
          class="px-6 py-3 text-xs font-medium"
          style="color: var(--color-outline); border-top: 1px solid #f0f1f5"
        >
          Mostrando {{ filteredTurnos.length }} turno{{ filteredTurnos.length !== 1 ? "s" : "" }}
          <template v-if="estadoFilter">
            · filtrado por <strong>{{ estadoFilter }}</strong></template
          >
        </div>
      </div>
    </main>

    <!-- ── MODAL NUEVO TURNO ──────────────────────────────────────────────── -->
    <BaseModal
      :show="showCreateModal"
      title="Nuevo Turno"
      size="md"
      @close="showCreateModal = false"
    >
      <Transition name="fade">
        <div
          v-if="createError"
          class="flex items-center gap-2 rounded-xl px-3 py-2.5 mb-4 text-sm font-medium"
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
          <label class="block text-xs font-semibold mb-1.5" style="color: var(--color-outline)"
            >Profesional</label
          >
          <select
            v-model="createForm.professionalId"
            class="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
            style="
              border: 1px solid var(--color-outline-variant);
              color: var(--color-on-surface);
              background: var(--color-surface);
            "
          >
            <option :value="null" disabled>Seleccioná un profesional</option>
            <option v-for="p in professionals" :key="p.id" :value="p.id">
              {{ p.firstName }} {{ p.lastName }}
            </option>
          </select>
        </div>

        <!-- Fecha -->
        <div>
          <label class="block text-xs font-semibold mb-1.5" style="color: var(--color-outline)"
            >Fecha</label
          >
          <input
            v-model="createForm.fecha"
            type="date"
            :min="toDateStr(new Date())"
            class="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
            style="
              border: 1px solid var(--color-outline-variant);
              color: var(--color-on-surface);
              background: var(--color-surface);
            "
          />
        </div>

        <!-- Horario disponible -->
        <div>
          <label class="block text-xs font-semibold mb-1.5" style="color: var(--color-outline)"
            >Horario</label
          >
          <div v-if="isLoadingSlots" class="text-xs py-1" style="color: var(--color-outline)">
            Cargando horarios...
          </div>
          <div
            v-else-if="!createForm.professionalId || !createForm.fecha"
            class="text-xs py-1"
            style="color: var(--color-outline-variant)"
          >
            Seleccioná profesional y fecha primero
          </div>
          <div
            v-else-if="isPastDate"
            class="flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-medium"
            style="background-color: #fef3c7; color: #92400e"
          >
            <span class="material-symbols-outlined flex-shrink-0" style="font-size: 14px"
              >event_busy</span
            >
            No se pueden reservar turnos en fechas pasadas
          </div>
          <div
            v-else-if="slots.length === 0"
            class="text-xs py-1 font-medium"
            style="color: #d97706"
          >
            El profesional no tiene horario disponible ese día
          </div>
          <select
            v-else
            v-model="createForm.slot"
            class="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
            style="
              border: 1px solid var(--color-outline-variant);
              color: var(--color-on-surface);
              background: var(--color-surface);
            "
          >
            <option value="" disabled>Seleccioná un horario</option>
            <option v-for="s in slots" :key="s.horaInicio" :value="s.horaInicio">
              {{ formatSlot(s) }}
            </option>
          </select>
        </div>

        <!-- Paciente con autocomplete -->
        <div class="relative">
          <label class="block text-xs font-semibold mb-1.5" style="color: var(--color-outline)"
            >Paciente</label
          >
          <input
            v-model="patientSearch"
            type="text"
            placeholder="Buscar por nombre o CI..."
            @focus="showPatientDropdown = true"
            @blur="onPatientBlur"
            class="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
            style="
              border: 1px solid var(--color-outline-variant);
              color: var(--color-on-surface);
              background: var(--color-surface);
            "
          />
          <div
            v-if="showPatientDropdown && filteredPatients.length > 0"
            class="absolute left-0 right-0 z-20 mt-1 rounded-xl shadow-lg overflow-hidden"
            style="
              background: white;
              border: 1px solid var(--color-surface-container-highest);
              max-height: 180px;
              overflow-y: auto;
            "
          >
            <button
              v-for="p in filteredPatients"
              :key="p.id"
              type="button"
              @click="selectPatient(p)"
              class="w-full text-left px-3 py-2 text-sm hover:bg-[var(--color-surface)] transition-colors"
            >
              <span class="font-medium" style="color: var(--color-on-surface)"
                >{{ p.firstName }} {{ p.lastName }}</span
              >
              <span class="ml-2 text-xs" style="color: var(--color-outline)">{{ p.ci }}</span>
            </button>
          </div>
        </div>

        <!-- Motivo -->
        <div>
          <label class="block text-xs font-semibold mb-1.5" style="color: var(--color-outline)">
            Motivo
            <span class="font-normal" style="color: var(--color-outline-variant)">(opcional)</span>
          </label>
          <input
            v-model="createForm.motivo"
            type="text"
            placeholder="Ej: Control anual, adaptación de lentes..."
            class="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
            style="
              border: 1px solid var(--color-outline-variant);
              color: var(--color-on-surface);
              background: var(--color-surface);
            "
          />
        </div>

        <!-- Notas -->
        <div>
          <label class="block text-xs font-semibold mb-1.5" style="color: var(--color-outline)">
            Notas internas
            <span class="font-normal" style="color: var(--color-outline-variant)">(opcional)</span>
          </label>
          <textarea
            v-model="createForm.notas"
            rows="2"
            placeholder="Notas para el staff..."
            class="w-full px-3 py-2.5 rounded-xl text-sm outline-none resize-none"
            style="
              border: 1px solid var(--color-outline-variant);
              color: var(--color-on-surface);
              background: var(--color-surface);
            "
          />
        </div>
      </form>

      <template #footer>
        <BaseButton
          class="flex-1"
          variant="secondary"
          size="default"
          @click="showCreateModal = false"
        >
          Cancelar
        </BaseButton>
        <BaseButton
          class="flex-1"
          variant="primary"
          size="default"
          :disabled="isSavingCreate"
          @click="submitCreate"
        >
          <svg v-if="isSavingCreate" class="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
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
          {{ isSavingCreate ? "Guardando..." : "Confirmar Turno" }}
        </BaseButton>
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
        <div
          class="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3"
          style="background-color: #fef3c7"
        >
          <span class="material-symbols-outlined" style="color: #92400e; font-size: 24px"
            >assignment</span
          >
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
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
