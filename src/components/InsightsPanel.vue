<script setup lang="ts">
import { ref, onMounted } from "vue"
import { useRouter } from "vue-router"
import { getPatients, type Patient } from "@/services/patientService"
import { getTurnos } from "@/services/turnoService"

const router = useRouter()

function toDateStr(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

const recentPatients = ref<Patient[]>([])
const isLoading = ref(true)
const todayStr = toDateStr(new Date())
const todayTurnosCount = ref(0)

async function loadData() {
  isLoading.value = true
  try {
    const [pts, turnos] = await Promise.all([
      getPatients({ page: 1, pageSize: 5 }),
      getTurnos({ fecha: todayStr }),
    ])
    recentPatients.value = pts.items
    todayTurnosCount.value = turnos.filter((t) => t.estado === "Pendiente").length
  } catch {
    recentPatients.value = []
  } finally {
    isLoading.value = false
  }
}

onMounted(loadData)

function initials(first: string, last: string) {
  return `${first[0] ?? ""}${last[0] ?? ""}`.toUpperCase()
}

const AVATAR_PALETTE = [
  { bg: "rgba(0,40,142,0.08)", color: "var(--color-primary)" },
  { bg: "rgba(0,103,128,0.08)", color: "var(--color-secondary)" },
  { bg: "rgba(32,0,177,0.08)", color: "var(--color-tertiary)" },
  { bg: "rgba(117,118,132,0.10)", color: "var(--color-outline)" },
]

const AVATAR_FALLBACK = { bg: "rgba(0,40,142,0.08)", color: "var(--color-primary)" }

function avatarStyle(id: number) {
  return AVATAR_PALETTE[id % AVATAR_PALETTE.length] ?? AVATAR_FALLBACK
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-AR", { day: "2-digit", month: "short" })
}
</script>

<template>
  <div class="flex flex-col gap-5">
    <!-- Card 1: Stats del día -->
    <div
      class="p-5 rounded-2xl relative overflow-hidden"
      style="
        background: linear-gradient(
          135deg,
          var(--color-primary) 0%,
          var(--color-primary-container) 100%
        );
        box-shadow: 0 8px 32px rgba(0, 40, 142, 0.25);
      "
    >
      <div
        class="absolute -right-8 -top-8 w-32 h-32 rounded-full pointer-events-none"
        style="background-color: rgba(255, 255, 255, 0.05); filter: blur(16px)"
      ></div>
      <div class="relative z-10">
        <div class="flex items-center gap-2 mb-3">
          <span
            class="material-symbols-outlined"
            style="color: rgba(184, 196, 255, 0.7); font-size: 18px"
            >calendar_month</span
          >
          <span class="text-sm font-bold" style="color: rgba(184, 196, 255, 0.8)"
            >Resumen del día</span
          >
        </div>
        <div v-if="isLoading" class="flex items-center gap-2">
          <svg
            class="animate-spin w-4 h-4"
            style="color: rgba(184, 196, 255, 0.6)"
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
          <span class="text-xs" style="color: rgba(184, 196, 255, 0.6)">Cargando...</span>
        </div>
        <div v-else class="flex gap-6">
          <div>
            <p class="text-3xl font-black" style="color: white">{{ todayTurnosCount }}</p>
            <p class="text-xs font-semibold mt-0.5" style="color: rgba(184, 196, 255, 0.7)">
              Turnos pendientes
            </p>
          </div>
          <div class="w-px" style="background-color: rgba(255, 255, 255, 0.15)"></div>
          <div>
            <p class="text-3xl font-black" style="color: white">{{ recentPatients.length }}</p>
            <p class="text-xs font-semibold mt-0.5" style="color: rgba(184, 196, 255, 0.7)">
              Pacientes nuevos
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- Card 2: Últimos pacientes -->
    <div
      class="p-5 rounded-2xl"
      style="
        background-color: var(--color-surface-container-lowest);
        box-shadow: 0 1px 3px rgba(196, 197, 213, 0.3);
      "
    >
      <div class="flex items-center justify-between mb-4">
        <div class="flex items-center gap-2">
          <div class="p-1.5 rounded-lg" style="background-color: rgba(0, 40, 142, 0.08)">
            <span
              class="material-symbols-outlined"
              style="color: var(--color-primary); font-size: 16px"
              >group</span
            >
          </div>
          <h4 class="font-bold text-sm" style="color: var(--color-on-surface)">
            Últimos Pacientes
          </h4>
        </div>
        <button
          @click="router.push('/pacientes')"
          class="text-xs font-semibold transition-colors hover:opacity-80"
          style="color: var(--color-primary)"
        >
          Ver todos →
        </button>
      </div>

      <div v-if="isLoading" class="flex items-center justify-center py-8 gap-2">
        <svg
          class="animate-spin w-5 h-5"
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
        <span class="text-xs" style="color: var(--color-outline)">Cargando...</span>
      </div>

      <div
        v-else-if="recentPatients.length === 0"
        class="flex flex-col items-center py-6 gap-2 text-center"
      >
        <span
          class="material-symbols-outlined"
          style="color: var(--color-outline-variant); font-size: 24px"
          >person_off</span
        >
        <p class="text-xs" style="color: var(--color-outline)">No hay pacientes registrados</p>
      </div>

      <div v-else class="flex flex-col gap-0.5">
        <div
          v-for="patient in recentPatients"
          :key="patient.id"
          class="flex items-center gap-3 py-2 px-2 rounded-xl transition-colors cursor-pointer"
          style="border-bottom: 1px solid rgba(196, 197, 213, 0.08)"
          onmouseover="this.style.backgroundColor = 'var(--color-surface)'"
          onmouseout="this.style.backgroundColor = 'transparent'"
          @click="router.push(`/pacientes/${patient.id}`)"
        >
          <div
            class="w-8 h-8 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0"
            :style="`background-color: ${avatarStyle(patient.id)?.bg ?? 'rgba(0,40,142,0.08)'}; color: ${avatarStyle(patient.id)?.color ?? 'var(--color-primary)'};`"
          >
            {{ initials(patient.firstName, patient.lastName) }}
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-semibold truncate" style="color: var(--color-on-surface)">
              {{ patient.firstName }} {{ patient.lastName }}
            </p>
            <p class="text-xs" style="color: var(--color-outline)">CI {{ patient.ci }}</p>
          </div>
          <span class="text-xs flex-shrink-0" style="color: var(--color-outline-variant)">{{
            formatDate(patient.createdAt)
          }}</span>
        </div>
      </div>
    </div>
  </div>
</template>
