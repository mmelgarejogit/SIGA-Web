<script setup lang="ts">
import { ref, computed, onMounted, watch, reactive } from 'vue'
import AppSidebar from '@/components/AppSidebar.vue'
import AppHeader from '@/components/AppHeader.vue'
import { useAuthStore } from '@/stores/auth'
import {
  getTurnos, getSlotsDisponibles, createTurno, updateTurnoEstado, cancelTurno,
  type Turno, type SlotDisponible,
} from '@/services/turnoService'
import { getProfessionals, type Professional } from '@/services/professionalService'
import { getPatients, type Patient } from '@/services/patientService'

const auth = useAuthStore()

// ── Helpers de fecha ──────────────────────────────────────────────────────────

function toDateStr(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function formatHour(iso: string): string {
  const match = iso.match(/T(\d{2}:\d{2})/)
  return match ? match[1]! : iso
}

// ── Navegación de fecha ───────────────────────────────────────────────────────

const selectedDate = ref(new Date())

const selectedDateInput = computed({
  get: () => toDateStr(selectedDate.value),
  set: (v) => { selectedDate.value = new Date(v + 'T12:00:00') },
})

const selectedDateLabel = computed(() =>
  selectedDate.value.toLocaleDateString('es-AR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
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
function goToToday() { selectedDate.value = new Date() }

// ── Filtros ───────────────────────────────────────────────────────────────────

const selectedProfessionalId = ref<number | null>(null)
const estadoFilter           = ref<string>('')

const estadoTabs = [
  { value: '',           label: 'Todos' },
  { value: 'Pendiente',  label: 'Pendientes' },
  { value: 'Completado', label: 'Completados' },
  { value: 'Cancelado',  label: 'Cancelados' },
]

// ── Datos ─────────────────────────────────────────────────────────────────────

const turnos        = ref<Turno[]>([])
const professionals = ref<Professional[]>([])
const patients      = ref<Patient[]>([])
const isLoading     = ref(false)
const loadError     = ref('')

const filteredTurnos = computed(() =>
  estadoFilter.value ? turnos.value.filter(t => t.estado === estadoFilter.value) : turnos.value
)

const stats = computed(() => ({
  total:       turnos.value.length,
  pendientes:  turnos.value.filter(t => t.estado === 'Pendiente').length,
  completados: turnos.value.filter(t => t.estado === 'Completado').length,
  cancelados:  turnos.value.filter(t => t.estado === 'Cancelado').length,
}))

async function loadTurnos() {
  isLoading.value = true
  loadError.value = ''
  try {
    turnos.value = await getTurnos({
      fecha:          toDateStr(selectedDate.value),
      professionalId: selectedProfessionalId.value ?? undefined,
    })
  } catch (err: unknown) {
    loadError.value = err instanceof Error ? err.message : 'Error al cargar turnos.'
  } finally {
    isLoading.value = false
  }
}

async function loadInit() {
  try {
    const [profs, pts] = await Promise.all([
      getProfessionals(),
      getPatients({ pageSize: 500 }),
    ])
    professionals.value = profs.filter(p => p.isActive)
    patients.value      = pts.items
  } catch { /* silent */ }
  await loadTurnos()
}

onMounted(loadInit)
watch([selectedDate, selectedProfessionalId], loadTurnos)

// ── Estilos ───────────────────────────────────────────────────────────────────

function estadoStyle(estado: string) {
  switch (estado) {
    case 'Pendiente':  return { bg: '#FEF3C7', dot: '#D97706', text: '#92400E' }
    case 'Completado': return { bg: '#dcfce7', dot: '#16a34a', text: '#166534' }
    case 'Cancelado':  return { bg: '#E0E2E7', dot: '#757684', text: '#444653' }
    default:           return { bg: '#E0E2E7', dot: '#757684', text: '#444653' }
  }
}

// ── Modal Nuevo Turno ─────────────────────────────────────────────────────────

const showCreateModal     = ref(false)
const createError         = ref('')
const isSavingCreate      = ref(false)
const slots               = ref<SlotDisponible[]>([])
const isLoadingSlots      = ref(false)
const isPastDate          = ref(false)
const patientSearch       = ref('')
const showPatientDropdown = ref(false)
const selectedPatient     = ref<Patient | null>(null)

const createForm = reactive({
  professionalId: null as number | null,
  fecha:          '',
  slot:           '',
  motivo:         '',
  notas:          '',
})

const filteredPatients = computed(() => {
  const q = patientSearch.value.trim().toLowerCase()
  if (!q) return patients.value.slice(0, 8)
  return patients.value
    .filter(p =>
      `${p.firstName} ${p.lastName}`.toLowerCase().includes(q) ||
      p.ci.toLowerCase().includes(q)
    )
    .slice(0, 8)
})

function formatSlot(s: SlotDisponible): string {
  return `${s.horaInicio.slice(0, 5)} - ${s.horaFin.slice(0, 5)}`
}

async function loadSlots() {
  slots.value     = []
  createForm.slot = ''
  isPastDate.value = false

  if (!createForm.professionalId || !createForm.fecha) return

  if (createForm.fecha < toDateStr(new Date())) {
    isPastDate.value = true
    return
  }

  isLoadingSlots.value = true
  try {
    slots.value     = await getSlotsDisponibles(createForm.professionalId, createForm.fecha)
  } catch {
    slots.value = []
  } finally {
    isLoadingSlots.value = false
  }
}

watch(() => [createForm.professionalId, createForm.fecha], () => {
  if (showCreateModal.value) loadSlots()
})

function openCreateModal() {
  createForm.professionalId = selectedProfessionalId.value
  createForm.fecha          = toDateStr(selectedDate.value)
  createForm.slot           = ''
  createForm.motivo         = ''
  createForm.notas          = ''
  createError.value         = ''
  patientSearch.value       = ''
  selectedPatient.value     = null
  slots.value               = []
  showCreateModal.value     = true
  if (createForm.professionalId && createForm.fecha) loadSlots()
}

function selectPatient(p: Patient) {
  selectedPatient.value     = p
  patientSearch.value       = `${p.firstName} ${p.lastName}`
  showPatientDropdown.value = false
}

function onPatientBlur() {
  setTimeout(() => { showPatientDropdown.value = false }, 150)
}

async function submitCreate() {
  createError.value = ''
  if (!createForm.professionalId)  { createError.value = 'Seleccioná un profesional.'; return }
  if (!createForm.fecha)           { createError.value = 'Seleccioná una fecha.'; return }
  if (!createForm.slot)            { createError.value = 'Seleccioná un horario disponible.'; return }
  if (!selectedPatient.value)      { createError.value = 'Seleccioná un paciente.'; return }

  isSavingCreate.value = true
  try {
    await createTurno({
      professionalId: createForm.professionalId,
      patientId:      selectedPatient.value.id,
      fechaHora:      `${createForm.fecha}T${createForm.slot}Z`,
      motivo:         createForm.motivo.trim() || undefined,
      notas:          createForm.notas.trim()  || undefined,
    })
    showCreateModal.value = false
    // Navegar al día del turno creado para asegurar que se muestre
    selectedDate.value = new Date(createForm.fecha + 'T12:00:00')
    selectedProfessionalId.value = createForm.professionalId
    await loadTurnos()
  } catch (err: unknown) {
    createError.value = err instanceof Error ? err.message : 'Error al crear el turno.'
  } finally {
    isSavingCreate.value = false
  }
}

// ── Completar / Cancelar ──────────────────────────────────────────────────────

const showCancelModal = ref(false)
const turnoToCancel   = ref<Turno | null>(null)
const isCancelling    = ref(false)
const cancelError     = ref('')

function openCancelModal(t: Turno) {
  turnoToCancel.value   = t
  cancelError.value     = ''
  showCancelModal.value = true
}

async function confirmCancel() {
  if (!turnoToCancel.value) return
  isCancelling.value = true
  cancelError.value  = ''
  try {
    await cancelTurno(turnoToCancel.value.id)
    showCancelModal.value = false
    await loadTurnos()
  } catch (err: unknown) {
    cancelError.value = err instanceof Error ? err.message : 'Error al cancelar el turno.'
  } finally {
    isCancelling.value = false
  }
}

async function completarTurno(t: Turno) {
  try {
    await updateTurnoEstado(t.id, 'Completado')
    await loadTurnos()
  } catch { /* silent */ }
}
</script>

<template>
  <div>
    <AppHeader />
    <AppSidebar />

    <main
      class="ml-[280px] pt-16 min-h-screen"
      style="background-color: #F7F9FE; color: #181C20; font-family: 'Manrope', system-ui, sans-serif;"
    >
      <div class="max-w-6xl mx-auto px-8 py-8">

        <!-- ── HEADER ──────────────────────────────────────────────────── -->
        <div class="flex items-start justify-between mb-8">
          <div>
            <h1
              class="text-3xl font-bold tracking-tight mb-1"
              style="font-family: 'Plus Jakarta Sans', system-ui, sans-serif; color: #181C20;"
            >Agenda</h1>
            <p class="text-sm font-medium capitalize" style="color: #757684;">{{ selectedDateLabel }}</p>
          </div>
          <button
            v-if="auth.hasPermission('gestionar_agenda')"
            @click="openCreateModal"
            class="flex items-center gap-2 h-11 px-5 rounded-full font-semibold text-sm transition-all active:scale-95"
            style="background-color: #00288E; color: white; box-shadow: 0 4px 16px rgba(0,40,142,0.2);"
          >
            <span class="material-symbols-outlined" style="font-size: 18px;">add</span>
            Nuevo Turno
          </button>
        </div>

        <!-- ── CONTROLES ───────────────────────────────────────────────── -->
        <div class="flex items-center gap-3 mb-6 flex-wrap">
          <!-- Navegación de fecha -->
          <div
            class="flex items-center rounded-2xl overflow-hidden"
            style="background: white; border: 1px solid #E0E2E7;"
          >
            <button
              @click="prevDay"
              class="px-3 py-2 hover:bg-[#F7F9FE] transition-colors"
              title="Día anterior"
            >
              <span class="material-symbols-outlined" style="font-size: 20px; color: #444653;">chevron_left</span>
            </button>
            <input
              type="date"
              v-model="selectedDateInput"
              class="px-2 py-2 text-sm font-semibold outline-none"
              style="color: #181C20; background: transparent; min-width: 145px;"
            />
            <button
              @click="nextDay"
              class="px-3 py-2 hover:bg-[#F7F9FE] transition-colors"
              title="Día siguiente"
            >
              <span class="material-symbols-outlined" style="font-size: 20px; color: #444653;">chevron_right</span>
            </button>
          </div>

          <button
            v-if="!isToday"
            @click="goToToday"
            class="px-4 py-2 rounded-full text-sm font-semibold transition-colors hover:opacity-80"
            style="background-color: #E8EDFF; color: #00288E;"
          >Hoy</button>

          <!-- Filtro por profesional -->
          <select
            v-model="selectedProfessionalId"
            class="px-4 py-2 rounded-2xl text-sm font-medium outline-none"
            style="background: white; border: 1px solid #E0E2E7; color: #181C20; min-width: 220px;"
          >
            <option :value="null">Todos los profesionales</option>
            <option v-for="p in professionals" :key="p.id" :value="p.id">
              {{ p.firstName }} {{ p.lastName }}
            </option>
          </select>
        </div>

        <!-- ── STATS CARDS ─────────────────────────────────────────────── -->
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div class="rounded-2xl p-4" style="background: white; border: 1px solid #E0E2E7;">
            <p class="text-xs font-semibold uppercase tracking-wider mb-2" style="color: #757684;">Total</p>
            <p class="text-3xl font-bold" style="color: #181C20;">{{ stats.total }}</p>
          </div>
          <div class="rounded-2xl p-4" style="background: white; border: 1px solid #E0E2E7;">
            <p class="text-xs font-semibold uppercase tracking-wider mb-2" style="color: #757684;">Pendientes</p>
            <p class="text-3xl font-bold" style="color: #D97706;">{{ stats.pendientes }}</p>
          </div>
          <div class="rounded-2xl p-4" style="background: white; border: 1px solid #E0E2E7;">
            <p class="text-xs font-semibold uppercase tracking-wider mb-2" style="color: #757684;">Completados</p>
            <p class="text-3xl font-bold" style="color: #16a34a;">{{ stats.completados }}</p>
          </div>
          <div class="rounded-2xl p-4" style="background: white; border: 1px solid #E0E2E7;">
            <p class="text-xs font-semibold uppercase tracking-wider mb-2" style="color: #757684;">Cancelados</p>
            <p class="text-3xl font-bold" style="color: #757684;">{{ stats.cancelados }}</p>
          </div>
        </div>

        <!-- ── FILTRO ESTADO ───────────────────────────────────────────── -->
        <div class="flex gap-2 mb-4">
          <button
            v-for="tab in estadoTabs"
            :key="tab.value"
            @click="estadoFilter = tab.value"
            class="px-4 py-1.5 rounded-full text-sm font-semibold transition-colors"
            :style="estadoFilter === tab.value
              ? 'background-color: #00288E; color: white;'
              : 'background-color: white; color: #444653; border: 1px solid #E0E2E7;'"
          >{{ tab.label }}</button>
        </div>

        <!-- ── TABLA ───────────────────────────────────────────────────── -->
        <div class="rounded-2xl overflow-hidden" style="background: white; border: 1px solid #E0E2E7;">

          <!-- Loading -->
          <div v-if="isLoading" class="flex items-center justify-center py-16">
            <svg class="animate-spin w-6 h-6" style="color: #00288E;" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
          </div>

          <!-- Error -->
          <div v-else-if="loadError" class="px-6 py-4 text-sm font-medium" style="color: #BA1A1A;">
            {{ loadError }}
          </div>

          <!-- Empty -->
          <div v-else-if="filteredTurnos.length === 0" class="flex flex-col items-center justify-center py-16 gap-3">
            <span class="material-symbols-outlined" style="font-size: 48px; color: #C4C5D5;">calendar_today</span>
            <p class="text-sm font-medium" style="color: #757684;">
              {{ turnos.length === 0 ? 'No hay turnos para este día' : 'No hay turnos con ese estado' }}
            </p>
          </div>

          <!-- Tabla con datos -->
          <table v-else class="w-full">
            <thead>
              <tr style="border-bottom: 1px solid #E0E2E7;">
                <th class="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider" style="color: #757684;">Hora</th>
                <th class="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider" style="color: #757684;">Profesional</th>
                <th class="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider" style="color: #757684;">Paciente</th>
                <th class="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider" style="color: #757684;">Motivo</th>
                <th class="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider" style="color: #757684;">Estado</th>
                <th class="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider" style="color: #757684;">Acciones</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="turno in filteredTurnos"
                :key="turno.id"
                class="transition-colors hover:bg-[#F7F9FE]"
                style="border-bottom: 1px solid #F0F1F5;"
              >
                <!-- Hora -->
                <td class="px-6 py-4">
                  <span class="text-sm font-bold" style="color: #00288E; font-variant-numeric: tabular-nums;">
                    {{ formatHour(turno.fechaHora) }}
                  </span>
                </td>

                <!-- Profesional -->
                <td class="px-6 py-4">
                  <span class="text-sm font-medium" style="color: #181C20;">{{ turno.professionalNombre }}</span>
                </td>

                <!-- Paciente -->
                <td class="px-6 py-4">
                  <span class="text-sm font-medium" style="color: #181C20;">{{ turno.patientNombre }}</span>
                </td>

                <!-- Motivo -->
                <td class="px-6 py-4">
                  <span class="text-sm" style="color: #444653;">{{ turno.motivo || '—' }}</span>
                </td>

                <!-- Estado badge -->
                <td class="px-6 py-4">
                  <span
                    class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
                    :style="`background-color: ${estadoStyle(turno.estado).bg}; color: ${estadoStyle(turno.estado).text};`"
                  >
                    <span
                      class="w-1.5 h-1.5 rounded-full flex-shrink-0"
                      :style="`background-color: ${estadoStyle(turno.estado).dot};`"
                    ></span>
                    {{ turno.estado }}
                  </span>
                </td>

                <!-- Acciones -->
                <td class="px-6 py-4">
                  <div class="flex items-center justify-end gap-1.5">
                    <button
                      v-if="turno.estado === 'Pendiente' && auth.hasPermission('gestionar_agenda')"
                      @click="completarTurno(turno)"
                      class="w-8 h-8 rounded-full flex items-center justify-center transition-colors hover:opacity-80"
                      style="background-color: #dcfce7;"
                      title="Marcar como completado"
                    >
                      <span class="material-symbols-outlined" style="font-size: 16px; color: #16a34a;">check</span>
                    </button>
                    <button
                      v-if="turno.estado !== 'Cancelado' && auth.hasPermission('gestionar_agenda')"
                      @click="openCancelModal(turno)"
                      class="w-8 h-8 rounded-full flex items-center justify-center transition-colors hover:opacity-80"
                      style="background-color: #FFDAD6;"
                      title="Cancelar turno"
                    >
                      <span class="material-symbols-outlined" style="font-size: 16px; color: #BA1A1A;">close</span>
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>

          <!-- Footer -->
          <div
            v-if="!isLoading && filteredTurnos.length > 0"
            class="px-6 py-3 text-xs font-medium"
            style="color: #757684; border-top: 1px solid #F0F1F5;"
          >
            Mostrando {{ filteredTurnos.length }} turno{{ filteredTurnos.length !== 1 ? 's' : '' }}
            <template v-if="estadoFilter"> · filtrado por <strong>{{ estadoFilter }}</strong></template>
          </div>
        </div>

      </div>
    </main>

    <!-- ── MODAL NUEVO TURNO ──────────────────────────────────────────────── -->
    <Teleport to="body">
      <Transition name="fade">
        <div
          v-if="showCreateModal"
          class="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          <div class="absolute inset-0 bg-black/40 backdrop-blur-sm" @click="showCreateModal = false" />

          <div
            class="relative bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl"
            style="max-height: 90vh; overflow-y: auto;"
          >
            <!-- Header modal -->
            <div class="flex items-center justify-between mb-5">
              <h3 class="text-lg font-bold" style="font-family: 'Plus Jakarta Sans', system-ui, sans-serif; color: #181C20;">
                Nuevo Turno
              </h3>
              <button
                @click="showCreateModal = false"
                class="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#F7F9FE] transition-colors"
              >
                <span class="material-symbols-outlined" style="font-size: 18px; color: #757684;">close</span>
              </button>
            </div>

            <!-- Error -->
            <Transition name="fade">
              <div
                v-if="createError"
                class="flex items-center gap-2 rounded-xl px-3 py-2.5 mb-4 text-sm font-medium"
                style="background-color: #FFDAD6; color: #93000A;"
              >
                <span class="material-symbols-outlined flex-shrink-0" style="font-size: 16px;">error</span>
                {{ createError }}
              </div>
            </Transition>

            <form @submit.prevent="submitCreate" class="space-y-4">

              <!-- Profesional -->
              <div>
                <label class="block text-xs font-semibold mb-1.5" style="color: #757684;">Profesional</label>
                <select
                  v-model="createForm.professionalId"
                  class="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                  style="border: 1px solid #C4C5D5; color: #181C20; background: #F7F9FE;"
                >
                  <option :value="null" disabled>Seleccioná un profesional</option>
                  <option v-for="p in professionals" :key="p.id" :value="p.id">
                    {{ p.firstName }} {{ p.lastName }}
                  </option>
                </select>
              </div>

              <!-- Fecha -->
              <div>
                <label class="block text-xs font-semibold mb-1.5" style="color: #757684;">Fecha</label>
                <input
                  v-model="createForm.fecha"
                  type="date"
                  :min="toDateStr(new Date())"
                  class="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                  style="border: 1px solid #C4C5D5; color: #181C20; background: #F7F9FE;"
                />
              </div>

              <!-- Horario disponible -->
              <div>
                <label class="block text-xs font-semibold mb-1.5" style="color: #757684;">Horario</label>
                <div v-if="isLoadingSlots" class="text-xs py-1" style="color: #757684;">Cargando horarios...</div>
                <div v-else-if="!createForm.professionalId || !createForm.fecha" class="text-xs py-1" style="color: #C4C5D5;">
                  Seleccioná profesional y fecha primero
                </div>
                <div
                  v-else-if="isPastDate"
                  class="flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-medium"
                  style="background-color: #FEF3C7; color: #92400E;"
                >
                  <span class="material-symbols-outlined flex-shrink-0" style="font-size: 14px;">event_busy</span>
                  No se pueden reservar turnos en fechas pasadas
                </div>
                <div v-else-if="slots.length === 0" class="text-xs py-1 font-medium" style="color: #D97706;">
                  El profesional no tiene horario disponible ese día
                </div>
                <select
                  v-else
                  v-model="createForm.slot"
                  class="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                  style="border: 1px solid #C4C5D5; color: #181C20; background: #F7F9FE;"
                >
                  <option value="" disabled>Seleccioná un horario</option>
                  <option v-for="s in slots" :key="s.horaInicio" :value="s.horaInicio">
                    {{ formatSlot(s) }}
                  </option>
                </select>
              </div>

              <!-- Paciente con autocomplete -->
              <div class="relative">
                <label class="block text-xs font-semibold mb-1.5" style="color: #757684;">Paciente</label>
                <input
                  v-model="patientSearch"
                  type="text"
                  placeholder="Buscar por nombre o CI..."
                  @focus="showPatientDropdown = true"
                  @blur="onPatientBlur"
                  class="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                  style="border: 1px solid #C4C5D5; color: #181C20; background: #F7F9FE;"
                />
                <div
                  v-if="showPatientDropdown && filteredPatients.length > 0"
                  class="absolute left-0 right-0 z-20 mt-1 rounded-xl shadow-lg overflow-hidden"
                  style="background: white; border: 1px solid #E0E2E7; max-height: 180px; overflow-y: auto;"
                >
                  <button
                    v-for="p in filteredPatients"
                    :key="p.id"
                    type="button"
                    @click="selectPatient(p)"
                    class="w-full text-left px-3 py-2 text-sm hover:bg-[#F7F9FE] transition-colors"
                  >
                    <span class="font-medium" style="color: #181C20;">{{ p.firstName }} {{ p.lastName }}</span>
                    <span class="ml-2 text-xs" style="color: #757684;">{{ p.ci }}</span>
                  </button>
                </div>
              </div>

              <!-- Motivo -->
              <div>
                <label class="block text-xs font-semibold mb-1.5" style="color: #757684;">
                  Motivo <span class="font-normal" style="color: #C4C5D5;">(opcional)</span>
                </label>
                <input
                  v-model="createForm.motivo"
                  type="text"
                  placeholder="Ej: Control anual, adaptación de lentes..."
                  class="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                  style="border: 1px solid #C4C5D5; color: #181C20; background: #F7F9FE;"
                />
              </div>

              <!-- Notas -->
              <div>
                <label class="block text-xs font-semibold mb-1.5" style="color: #757684;">
                  Notas internas <span class="font-normal" style="color: #C4C5D5;">(opcional)</span>
                </label>
                <textarea
                  v-model="createForm.notas"
                  rows="2"
                  placeholder="Notas para el staff..."
                  class="w-full px-3 py-2.5 rounded-xl text-sm outline-none resize-none"
                  style="border: 1px solid #C4C5D5; color: #181C20; background: #F7F9FE;"
                />
              </div>

              <!-- Botones -->
              <div class="flex gap-3 pt-2">
                <button
                  type="button"
                  @click="showCreateModal = false"
                  class="flex-1 h-11 rounded-full text-sm font-semibold transition-colors hover:opacity-80"
                  style="background-color: #F0F1F5; color: #444653;"
                >Cancelar</button>
                <button
                  type="submit"
                  :disabled="isSavingCreate"
                  class="flex-1 h-11 rounded-full text-sm font-semibold flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-70"
                  style="background-color: #00288E; color: white;"
                >
                  <svg v-if="isSavingCreate" class="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  {{ isSavingCreate ? 'Guardando...' : 'Confirmar Turno' }}
                </button>
              </div>
            </form>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- ── MODAL CANCELAR TURNO ───────────────────────────────────────────── -->
    <Teleport to="body">
      <Transition name="fade">
        <div
          v-if="showCancelModal"
          class="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          <div class="absolute inset-0 bg-black/40 backdrop-blur-sm" @click="showCancelModal = false" />
          <div class="relative bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl text-center">

            <div
              class="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3"
              style="background-color: #FFDAD6;"
            >
              <span class="material-symbols-outlined" style="color: #BA1A1A; font-size: 24px;">cancel</span>
            </div>

            <h3 class="text-lg font-bold mb-2" style="font-family: 'Plus Jakarta Sans', system-ui, sans-serif; color: #181C20;">
              Cancelar turno
            </h3>
            <p class="text-sm mb-5" style="color: #444653;" v-if="turnoToCancel">
              ¿Cancelar el turno de
              <strong>{{ turnoToCancel.patientNombre }}</strong>
              a las <strong>{{ formatHour(turnoToCancel.fechaHora) }}</strong>?
            </p>

            <p v-if="cancelError" class="text-sm font-medium mb-3" style="color: #BA1A1A;">{{ cancelError }}</p>

            <div class="flex gap-3">
              <button
                @click="showCancelModal = false"
                class="flex-1 h-11 rounded-full text-sm font-semibold transition-colors hover:opacity-80"
                style="background-color: #F0F1F5; color: #444653;"
              >Volver</button>
              <button
                @click="confirmCancel"
                :disabled="isCancelling"
                class="flex-1 h-11 rounded-full text-sm font-semibold flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-70"
                style="background-color: #BA1A1A; color: white;"
              >
                <svg v-if="isCancelling" class="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
                {{ isCancelling ? 'Cancelando...' : 'Sí, cancelar' }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

  </div>
</template>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 0.2s ease; }
.fade-enter-from, .fade-leave-to       { opacity: 0; }
</style>
