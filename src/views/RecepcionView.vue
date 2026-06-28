<script setup lang="ts">
import { ref, onMounted } from "vue"
import { useRouter } from "vue-router"
import AppSidebar from "@/components/AppSidebar.vue"
import AppHeader from "@/components/AppHeader.vue"
import BaseButton from "@/components/BaseButton.vue"
import BaseModal from "@/components/BaseModal.vue"
import BaseTable from "@/components/BaseTable.vue"
import { useAuthStore } from "@/stores/auth"
import { getTurnos, updateTurnoEstado, cancelTurno, type Turno } from "@/services/turnoService"
import { createConsulta } from "@/services/clinicaService"
import { getEstadosByEntidad } from "@/services/estadoConfigService"
import RowContextMenu, { type ContextMenuItem } from "@/components/RowContextMenu.vue"

const auth = useAuthStore()
const router = useRouter()

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

const today = toDateStr(new Date())
const todayLabel = new Date().toLocaleDateString("es-AR", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
})

const turnos = ref<Turno[]>([])
const isLoading = ref(false)
const loadError = ref("")

const columns = [
  { key: "hora", label: "Hora" },
  { key: "profesional", label: "Profesional" },
  { key: "paciente", label: "Paciente" },
  { key: "motivo", label: "Motivo" },
  { key: "acciones", label: "Acciones", align: "right" as const },
]

async function loadTurnos() {
  isLoading.value = true
  loadError.value = ""
  try {
    turnos.value = await getTurnos({ fecha: today, estado: "Presente" })
  } catch (err: unknown) {
    loadError.value = err instanceof Error ? err.message : "Error al cargar los turnos."
  } finally {
    isLoading.value = false
  }
}

onMounted(loadTurnos)

// Cancelar

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

// Menú contextual de fila

function menuItems(t: Turno): ContextMenuItem[] {
  const canConsulta = auth.hasPermission("registrar_consulta")
  const canCancelar = auth.hasPermission("gestionar_agenda")

  return [
    {
      type: "item",
      label: "Iniciar consulta",
      icon: "stethoscope",
      action: () => iniciarConsulta(t),
      hidden: !canConsulta,
    },
    ...(canConsulta && canCancelar ? [{ type: "separator" as const }] : []),
    {
      type: "item",
      label: "Cancelar turno",
      icon: "close",
      action: () => openCancelModal(t),
      danger: true,
      hidden: !canCancelar,
    },
  ]
}

// Iniciar consulta

const isStartingConsulta = ref<number | null>(null)

async function iniciarConsulta(t: Turno) {
  isStartingConsulta.value = t.id
  try {
    // Obtener el estado "Pendiente" de consulta
    const estados = await getEstadosByEntidad("Consulta")
    const estadoPendiente = estados.find(e => e.codigoInterno === "Pendiente")

    // Registrar la consulta con estado Pendiente
    const consulta = await createConsulta({
      patientId:    t.patientId,
      professionalId: t.professionalId,
      citaId:       t.id,
      fechaConsulta: today + "T00:00:00",
      motivo:       t.motivo ?? "Consulta de recepción",
      estadoConfigId: estadoPendiente?.id,
    })

    // Marcar el turno como Completado (no bloquea si falla)
    updateTurnoEstado(t.id, "Completado").catch(() => {})

    // Navegar al formulario para completar los datos clínicos
    router.push({
      path: "/clinica/consultas/nueva",
      query: {
        patientId: String(t.patientId),
        turnoId:   String(t.id),
        consultaId: String(consulta.id),
        ...(t.motivo ? { motivo: t.motivo } : {}),
      },
    })
  } catch {
    // Si falla la creación, navegar al formulario manual
    router.push({
      path: "/clinica/consultas/nueva",
      query: {
        patientId: String(t.patientId),
        turnoId:   String(t.id),
        ...(t.motivo ? { motivo: t.motivo } : {}),
      },
    })
  } finally {
    isStartingConsulta.value = null
  }
}
</script>

<template>
  <div class="min-h-screen" style="background-color: var(--color-background)">
    <AppSidebar />
    <AppHeader />

    <main style="margin-left: var(--sidebar-width); transition: margin-left 0.25s ease; padding-top: 64px">
      <div class="p-4 sm:p-6 lg:p-8">

        <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-8">
          <div>
            <h1 class="text-4xl font-extrabold tracking-tight mb-2">Recepción</h1>
            <p class="text-sm font-medium capitalize" style="color: var(--color-outline)">
              {{ todayLabel }}
            </p>
          </div>
          <BaseButton variant="secondary" size="sm" @click="loadTurnos">
            <span class="material-symbols-outlined" style="font-size: 18px">refresh</span>
            Actualizar
          </BaseButton>
        </div>

        <div class="mb-6">
          <div
            class="inline-flex items-center gap-3 rounded-2xl px-5 py-4"
            style="background: var(--color-surface-container-lowest); border: 1px solid var(--color-surface-container-highest)"
          >
            <div
              class="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
              style="background-color: color-mix(in srgb, var(--color-tertiary) 12%, var(--color-surface-container-lowest))"
            >
              <span class="material-symbols-outlined" style="font-size: 20px; color: var(--color-tertiary)"
                >person_check</span
              >
            </div>
            <div>
              <p class="text-xs font-semibold uppercase tracking-wider" style="color: var(--color-outline)">
                Pacientes en sala
              </p>
              <p class="text-3xl font-bold" style="color: var(--color-tertiary)">{{ turnos.length }}</p>
            </div>
          </div>
        </div>

        <div v-if="loadError" class="px-6 py-4 text-sm font-medium" style="color: var(--color-error)">
          {{ loadError }}
        </div>

        <div
          v-else-if="!isLoading && turnos.length === 0"
          class="rounded-2xl py-16 text-center"
          style="
            background-color: var(--color-surface-container-lowest);
            box-shadow: var(--shadow-sm);
          "
        >
          <span
            class="material-symbols-outlined block mx-auto mb-3"
            style="color: var(--color-outline-variant); font-size: 48px"
            >event_busy</span
          >
          <p class="text-sm font-semibold mb-1" style="color: var(--color-outline)">
            Sin pacientes en sala
          </p>
        </div>

        <BaseTable
          v-else
          :columns="columns"
          :items="turnos"
          :loading="isLoading"
        >
          <template #hora="{ item }">
            <span class="text-sm font-bold" style="color: var(--color-primary); font-variant-numeric: tabular-nums">
              {{ formatHour(item.fechaHora) }}
            </span>
          </template>

          <template #profesional="{ item }">
            <span class="text-sm font-medium" style="color: var(--color-on-surface)">
              {{ item.professionalNombre }}
            </span>
          </template>

          <template #paciente="{ item }">
            <p class="text-sm font-semibold" style="color: var(--color-on-surface)">
              {{ item.patientNombre }}
            </p>
          </template>

          <template #motivo="{ item }">
            <span class="text-sm" style="color: var(--color-on-surface-variant)">
              {{ item.motivo || "Sin motivo" }}
            </span>
          </template>

          <template #acciones="{ item }">
            <div class="flex items-center justify-end">
              <RowContextMenu :items="menuItems(item)" />
            </div>
          </template>
        </BaseTable>

        <div
          v-if="!isLoading && turnos.length > 0"
          class="px-6 py-3 text-xs font-medium"
          style="color: var(--color-outline); border-top: 1px solid var(--color-surface-container-low)"
        >
          {{ turnos.length }} paciente{{ turnos.length !== 1 ? "s" : "" }} en sala
        </div>

      </div>
    </main>

    <BaseModal :show="showCancelModal" size="sm" @close="showCancelModal = false">
      <div class="text-center">
        <div
          class="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3"
          style="background-color: var(--color-error-container)"
        >
          <span class="material-symbols-outlined" style="color: var(--color-error); font-size: 24px">cancel</span>
        </div>
        <h3 class="text-lg font-bold mb-2" style="color: var(--color-on-surface)">Cancelar turno</h3>
        <p class="text-sm mb-5" style="color: var(--color-on-surface-variant)" v-if="turnoToCancel">
          Cancelar el turno de
          <strong>{{ turnoToCancel.patientNombre }}</strong>
          de las <strong>{{ formatHour(turnoToCancel.fechaHora) }}</strong>?
        </p>
        <p v-if="cancelError" class="text-sm font-medium mb-3" style="color: var(--color-error)">{{ cancelError }}</p>
      </div>

      <template #footer>
        <BaseButton class="flex-1" variant="secondary" size="default" @click="showCancelModal = false">
          Volver
        </BaseButton>
        <BaseButton class="flex-1" variant="danger" size="default" :disabled="isCancelling" @click="confirmCancel">
          <svg v-if="isCancelling" class="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          {{ isCancelling ? "Cancelando..." : "Si, cancelar" }}
        </BaseButton>
      </template>
    </BaseModal>
  </div>
</template>
