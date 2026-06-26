<script setup lang="ts">
import { ref, computed, onMounted, watch } from "vue"
import AppSidebar from "@/components/AppSidebar.vue"
import AppHeader from "@/components/AppHeader.vue"
import BaseButton from "@/components/BaseButton.vue"
import BaseModal from "@/components/BaseModal.vue"
import BaseTable from "@/components/BaseTable.vue"
import {
  type Turno,
  type SelfBookTurnoRequest,
  getMisTurnos,
  getSlotsDisponibles,
  selfBookTurno,
  solicitarCancelacionTurno,
} from "@/services/turnoService"
import { getProfessionals, type Professional } from "@/services/professionalService"

interface SlotConProfesional {
  horaInicio: string
  horaFin: string
  professionalId: number
  professionalNombre: string
}

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

// ── Datos ─────────────────────────────────────────────────────────────────────

const misTurnos = ref<Turno[]>([])
const professionals = ref<Professional[]>([])
const isLoading = ref(false)
const loadError = ref("")

const activeTurno = computed(() => misTurnos.value.find((t) => t.estado === "Pendiente") ?? null)

const historialTurnos = computed(() => misTurnos.value.filter((t) => t.estado !== "Pendiente"))

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

onMounted(async () => {
  await loadMisTurnos()
  try {
    professionals.value = (await getProfessionals()).filter((p) => p.isActive)
  } catch {
    /* no crítico */
  }
})

// ── Cancel request ────────────────────────────────────────────────────────────

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

// ── Self-booking form ─────────────────────────────────────────────────────────

const selectedDate = ref(toDateStr(new Date()))
const slots = ref<SlotConProfesional[]>([])
const isLoadingSlots = ref(false)
const selectedSlot = ref("")
const selectedSlotData = ref<SlotConProfesional | null>(null)
const bookMotivo = ref("")
const isBooking = ref(false)
const bookError = ref("")

const isPastDate = computed(() => selectedDate.value < toDateStr(new Date()))

function selectSlot(slot: SlotConProfesional) {
  selectedSlot.value = slot.horaInicio
  selectedSlotData.value = slot
}

async function loadSlots() {
  slots.value = []
  selectedSlot.value = ""
  selectedSlotData.value = null
  if (!selectedDate.value || isPastDate.value || professionals.value.length === 0) return

  isLoadingSlots.value = true
  try {
    const results = await Promise.all(
      professionals.value.map(async (p) => {
        try {
          const s = await getSlotsDisponibles(p.id, selectedDate.value)
          return s.map((slot) => ({
            ...slot,
            professionalId: p.id,
            professionalNombre: `${p.firstName} ${p.lastName}`,
          }))
        } catch {
          return []
        }
      }),
    )
    const seen = new Set<string>()
    const merged: SlotConProfesional[] = []
    for (const profSlots of results) {
      for (const slot of profSlots) {
        if (!seen.has(slot.horaInicio)) {
          seen.add(slot.horaInicio)
          merged.push(slot)
        }
      }
    }
    slots.value = merged.sort((a, b) => a.horaInicio.localeCompare(b.horaInicio))
  } finally {
    isLoadingSlots.value = false
  }
}

watch(selectedDate, loadSlots)

async function submitBooking() {
  if (!selectedSlotData.value) return
  if (activeTurno.value) {
    bookError.value =
      "Ya tenés un turno activo. Cancelá o completá el existente antes de reservar uno nuevo."
    return
  }

  isBooking.value = true
  bookError.value = ""
  try {
    const payload: SelfBookTurnoRequest = {
      professionalId: selectedSlotData.value.professionalId,
      fechaHora: `${selectedDate.value}T${selectedSlotData.value.horaInicio}Z`,
      motivo: bookMotivo.value.trim() || undefined,
    }
    await selfBookTurno(payload)
    selectedSlot.value = ""
    selectedSlotData.value = null
    bookMotivo.value = ""
    await loadMisTurnos()
  } catch (err: unknown) {
    bookError.value = err instanceof Error ? err.message : "Error al reservar turno."
  } finally {
    isBooking.value = false
  }
}
</script>

<template>
  <div class="min-h-screen" style="background-color: var(--color-surface)">
    <AppSidebar />
    <AppHeader />

    <main style="margin-left: var(--sidebar-width); transition: margin-left 0.25s ease; padding-top: 64px">
      <div class="p-8">
        <!-- Header -->
        <div class="flex justify-between items-end mb-8">
          <div>
            <h1 class="text-4xl font-extrabold tracking-tight mb-2">Mis Turnos</h1>
            <p class="font-medium" style="color: var(--color-on-surface-variant)">
              Reservá y gestioná tus citas médicas.
            </p>
          </div>
        </div>

        <!-- Loading -->
        <div v-if="isLoading" class="flex justify-center py-24">
          <svg
            class="animate-spin w-8 h-8"
            style="color: var(--color-primary)"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
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
        </div>

        <!-- Error -->
        <div
          v-else-if="loadError"
          class="flex items-center gap-2.5 rounded-2xl px-4 py-3 text-sm font-medium mb-6"
          style="
            background-color: var(--color-error-container);
            color: var(--color-on-error-container);
          "
        >
          <span class="material-symbols-outlined" style="font-size: 18px">error</span>
          {{ loadError }}
        </div>

        <template v-else>
          <!-- Active appointment -->
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
                <h3
                  class="text-lg font-bold leading-tight"
                  style="color: var(--color-on-surface); text-decoration: none"
                >
                  Turno Activo
                </h3>
              </div>
              <span
                v-if="activeTurno.solicitudCancelacion"
                class="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold"
                style="background-color: var(--color-warning-container); color: var(--color-on-warning-container)"
              >
                <span
                  class="material-symbols-outlined inline-flex items-center justify-center flex-shrink-0 leading-none"
                  style="font-size: 12px; width: 12px; height: 12px"
                >
                  hourglass_empty
                </span>
                Cancelación solicitada
              </span>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div class="flex flex-col gap-1">
                <span
                  class="text-xs font-bold uppercase tracking-wider"
                  style="color: var(--color-outline)"
                  >Fecha y Hora</span
                >
                <span class="text-sm font-semibold" style="color: var(--color-on-surface)"
                  >{{ formatDateLabel(activeTurno.fechaHora) }} —
                  {{ formatHour(activeTurno.fechaHora) }}</span
                >
              </div>
              <div class="flex flex-col gap-1">
                <span
                  class="text-xs font-bold uppercase tracking-wider"
                  style="color: var(--color-outline)"
                  >Profesional</span
                >
                <span class="text-sm font-semibold" style="color: var(--color-on-surface)">{{
                  activeTurno.professionalNombre
                }}</span>
              </div>
              <div class="flex flex-col gap-1">
                <span
                  class="text-xs font-bold uppercase tracking-wider"
                  style="color: var(--color-outline)"
                  >Motivo</span
                >
                <span class="text-sm font-semibold" style="color: var(--color-on-surface)">{{
                  activeTurno.motivo ?? "—"
                }}</span>
              </div>
            </div>

            <div class="flex items-center justify-between">
              <span
                class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider"
                style="background-color: var(--color-success-container); color: var(--color-on-success-container)"
              >
                <span class="w-1.5 h-1.5 rounded-full" style="background-color: var(--color-on-success-container)"></span>
                Pendiente
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

          <!-- Booking form (only when no active appointment) -->
          <div
            v-else
            class="rounded-2xl p-6 mb-8"
            style="
              background-color: var(--color-surface-container-lowest);
              box-shadow: var(--shadow-sm);
              outline: 1px solid var(--color-hairline);
            "
          >
            <div class="flex items-center gap-2 mb-5">
              <span
                class="material-symbols-outlined inline-flex items-center justify-center flex-shrink-0 leading-none"
                style="color: var(--color-primary); font-size: 20px; width: 20px; height: 20px"
              >
                edit_calendar
              </span>
              <h3
                class="text-lg font-bold leading-tight"
                style="color: var(--color-on-surface); text-decoration: none"
              >
                Reservar Turno
              </h3>
            </div>

            <div
              v-if="bookError"
              class="flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium mb-5"
              style="
                background-color: var(--color-error-container);
                color: var(--color-on-error-container);
              "
            >
              <span class="material-symbols-outlined" style="font-size: 18px">error</span>
              {{ bookError }}
            </div>

            <div class="flex flex-col gap-1.5 mb-5">
              <label
                class="text-xs font-bold uppercase tracking-wider"
                style="color: var(--color-outline)"
                >Fecha *</label
              >
              <input
                v-model="selectedDate"
                type="date"
                :min="toDateStr(new Date())"
                class="px-4 py-3 rounded-xl text-sm outline-none"
                style="
                  border: 1px solid var(--color-outline-variant);
                  background-color: var(--color-surface);
                  color: var(--color-on-surface);
                  max-width: 220px;
                "
              />
            </div>

            <div class="flex flex-col gap-1.5 mb-5">
              <label
                class="text-xs font-bold uppercase tracking-wider"
                style="color: var(--color-outline)"
                >Motivo de consulta</label
              >
              <input
                v-model="bookMotivo"
                type="text"
                placeholder="Ej: revisión anual, dolor de cabeza..."
                class="px-4 py-3 rounded-xl text-sm outline-none"
                style="
                  border: 1px solid var(--color-outline-variant);
                  background-color: var(--color-surface);
                  color: var(--color-on-surface);
                "
              />
            </div>

            <!-- Slots -->
            <div class="mb-5">
              <label
                class="text-xs font-bold uppercase tracking-wider block mb-2"
                style="color: var(--color-outline)"
                >Horarios disponibles</label
              >

              <div v-if="isLoadingSlots" class="flex justify-center py-6">
                <svg
                  class="animate-spin w-6 h-6"
                  style="color: var(--color-primary)"
                  fill="none"
                  viewBox="0 0 24 24"
                >
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
              </div>

              <div v-else-if="isPastDate" class="text-sm py-3" style="color: var(--color-outline)">
                No se pueden reservar turnos en fechas pasadas.
              </div>

              <div
                v-else-if="slots.length === 0"
                class="text-sm py-3"
                style="color: var(--color-outline)"
              >
                No hay horarios disponibles para esta fecha.
              </div>

              <div v-else class="flex flex-wrap gap-2">
                <button
                  v-for="slot in slots"
                  :key="slot.horaInicio"
                  @click="selectSlot(slot)"
                  class="flex flex-col items-center px-4 py-2 rounded-xl text-sm font-semibold transition-all"
                  :style="
                    selectedSlot === slot.horaInicio
                      ? 'background-color: var(--color-primary); color: var(--color-on-primary);'
                      : 'background-color: var(--color-surface-container-low); color: var(--color-on-surface-variant); border: 1px solid var(--color-surface-container-highest);'
                  "
                >
                  <span>{{ slot.horaInicio.slice(0, 5) }}</span>
                  <span
                    class="text-[10px] font-medium mt-0.5 leading-none"
                    :style="selectedSlot === slot.horaInicio ? 'opacity: 0.8' : 'color: var(--color-outline)'"
                  >{{ slot.professionalNombre }}</span>
                </button>
              </div>
            </div>

            <div class="flex justify-end">
              <BaseButton
                variant="primary"
                size="lg"
                :disabled="isBooking || !selectedSlot"
                @click="submitBooking"
              >
                <svg
                  v-if="isBooking"
                  class="animate-spin w-4 h-4"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
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
                {{ isBooking ? "Reservando..." : "Reservar Turno" }}
              </BaseButton>
            </div>
          </div>

          <!-- History -->
          <div v-if="historialTurnos.length > 0">
            <h3 class="text-lg font-extrabold mb-4" style="color: var(--color-on-surface)">
              Historial
            </h3>
            <BaseTable
              :columns="historialColumns"
              :items="historialTurnos"
              empty-text="No hay turnos en el historial."
            >
              <template #fecha="{ item }">
                <span class="text-sm font-semibold" style="color: var(--color-on-surface-variant)">
                  {{ formatDateLabel(item.fechaHora) }} — {{ formatHour(item.fechaHora) }}
                </span>
              </template>
              <template #professional="{ item }">
                <span class="text-sm font-medium" style="color: var(--color-on-surface)">{{
                  item.professionalNombre
                }}</span>
              </template>
              <template #motivo="{ item }">
                <span class="text-sm" style="color: var(--color-on-surface-variant)">{{
                  item.motivo ?? "—"
                }}</span>
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
                  style="
                    background-color: var(--color-surface-container-highest);
                    color: var(--color-on-surface-variant);
                  "
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

    <!-- MODAL: Solicitar cancelación -->
    <BaseModal :show="showCancelReqModal" size="sm" @close="showCancelReqModal = false">
      <div class="text-center">
        <div
          class="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-5"
          style="background-color: var(--color-error-container)"
        >
          <span class="material-symbols-outlined" style="color: var(--color-error); font-size: 28px"
            >cancel</span
          >
        </div>
        <h3 class="text-lg font-extrabold mb-2" style="color: var(--color-on-surface)">
          Solicitar Cancelación
        </h3>
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
          style="
            background-color: var(--color-error-container);
            color: var(--color-on-error-container);
          "
        >
          <span class="material-symbols-outlined" style="font-size: 18px">error</span>
          {{ cancelReqError }}
        </div>
      </div>

      <template #footer>
        <BaseButton
          class="flex-1"
          variant="secondary"
          size="default"
          @click="showCancelReqModal = false"
        >
          Volver
        </BaseButton>
        <BaseButton
          class="flex-1"
          variant="danger"
          size="default"
          :disabled="isRequestingCancel"
          @click="confirmCancelRequest"
        >
          <svg
            v-if="isRequestingCancel"
            class="animate-spin w-4 h-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
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
          {{ isRequestingCancel ? "Solicitando..." : "Solicitar" }}
        </BaseButton>
      </template>
    </BaseModal>
  </div>
</template>
