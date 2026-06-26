<script setup lang="ts">
import { ref, onMounted } from "vue"
import { useRouter } from "vue-router"
import { getTurnos, type Turno } from "@/services/turnoService"

const router = useRouter()

function toDateStr(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

const todayStr = toDateStr(new Date())

const turnos = ref<Turno[]>([])
const isLoading = ref(true)

const AVATAR_PALETTE = [
  { bg: "color-mix(in srgb, var(--color-primary) 12%, var(--color-surface-container-lowest))", color: "var(--color-primary)" },
  { bg: "color-mix(in srgb, var(--color-secondary) 12%, var(--color-surface-container-lowest))", color: "var(--color-secondary)" },
  { bg: "color-mix(in srgb, var(--color-tertiary) 12%, var(--color-surface-container-lowest))", color: "var(--color-tertiary)" },
  { bg: "color-mix(in srgb, var(--color-outline) 14%, var(--color-surface-container-lowest))", color: "var(--color-outline)" },
]

const AVATAR_FALLBACK = { bg: "color-mix(in srgb, var(--color-primary) 12%, var(--color-surface-container-lowest))", color: "var(--color-primary)" }

function avatarStyle(id: number) {
  return AVATAR_PALETTE[id % AVATAR_PALETTE.length] ?? AVATAR_FALLBACK
}

function initials(first: string, last: string) {
  return `${first[0] ?? ""}${last[0] ?? ""}`.toUpperCase()
}

function formatHour(iso: string): string {
  const match = iso.match(/T(\d{2}:\d{2})/)
  return match ? match[1]! : iso
}

function estadoStyle(estado: string) {
  switch (estado) {
    case "Pendiente":
      return {
        bg: "var(--color-warning-container)",
        dot: "var(--color-warning)",
        text: "var(--color-on-warning-container)",
      }
    case "Completado":
      return {
        bg: "var(--color-success-container)",
        dot: "var(--color-success)",
        text: "var(--color-on-success-container)",
      }
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

async function loadTurnos() {
  isLoading.value = true
  try {
    turnos.value = await getTurnos({ fecha: todayStr })
  } catch {
    turnos.value = []
  } finally {
    isLoading.value = false
  }
}

onMounted(loadTurnos)
</script>

<template>
  <div
    class="rounded-lg overflow-hidden"
    style="
      background-color: var(--color-surface-container-lowest);
      box-shadow: var(--shadow-sm);
    "
  >
    <!-- Header -->
    <div
      class="px-6 py-5 flex justify-between items-center"
      style="border-bottom: 1px solid var(--color-hairline)"
    >
      <h3 class="text-xl font-bold" style="color: var(--color-on-surface)">
        Próximos Atendimientos
      </h3>
      <button
        @click="router.push('/agenda')"
        class="text-sm font-bold px-4 py-2 rounded-full transition-colors hover:opacity-80"
        style="color: var(--color-primary); background-color: var(--color-primary-fixed)"
      >
        Ver todos
      </button>
    </div>

    <!-- Loading -->
    <div v-if="isLoading" class="flex items-center justify-center py-16">
      <svg
        class="animate-spin w-7 h-7"
        style="color: var(--color-primary)"
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
        <path
          class="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
        />
      </svg>
    </div>

    <!-- Empty -->
    <div
      v-else-if="turnos.length === 0"
      class="flex flex-col items-center justify-center py-16 gap-3"
    >
      <span
        class="material-symbols-outlined"
        style="color: var(--color-outline-variant); font-size: 40px"
        >calendar_month</span
      >
      <p class="text-sm font-semibold" style="color: var(--color-outline)">
        No hay atendimientos para hoy
      </p>
      <p class="text-xs" style="color: var(--color-outline-variant)">
        Los turnos del día aparecerán aquí
      </p>
    </div>

    <!-- Lista -->
    <div v-else class="divide-y" style="border-top: 1px solid var(--color-hairline-soft)">
      <div
        v-for="turno in turnos"
        :key="turno.id"
        class="flex items-center gap-4 px-6 py-4 transition-colors"
        style="border-bottom: 1px solid var(--color-hairline-soft)"
        onmouseover="this.style.backgroundColor = 'var(--color-surface)'"
        onmouseout="this.style.backgroundColor = 'transparent'"
      >
        <!-- Avatar -->
        <div
          class="w-9 h-9 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0"
          :style="`background-color: ${avatarStyle(turno.patientId).bg}; color: ${avatarStyle(turno.patientId).color};`"
        >
          {{
            initials(
              turno.patientNombre.split(" ")[0] ?? "",
              turno.patientNombre.split(" ")[1] ?? "",
            )
          }}
        </div>

        <!-- Info -->
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 mb-0.5">
            <span class="text-sm font-bold" style="color: var(--color-on-surface)">{{
              turno.patientNombre
            }}</span>
            <span
              class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold"
              :style="`background-color: ${estadoStyle(turno.estado).bg}; color: ${estadoStyle(turno.estado).text};`"
            >
              <span
                class="w-1.5 h-1.5 rounded-full flex-shrink-0"
                :style="`background-color: ${estadoStyle(turno.estado).dot};`"
              ></span>
              {{ turno.estado }}
            </span>
          </div>
          <div class="flex items-center gap-3 text-xs" style="color: var(--color-outline)">
            <span class="flex items-center gap-1">
              <span class="material-symbols-outlined" style="font-size: 12px">stethoscope</span>
              {{ turno.professionalNombre }}
            </span>
            <span v-if="turno.motivo" class="truncate max-w-[180px]">{{ turno.motivo }}</span>
          </div>
        </div>

        <!-- Hora -->
        <span
          class="text-sm font-bold flex-shrink-0"
          style="color: var(--color-primary); font-variant-numeric: tabular-nums"
        >
          {{ formatHour(turno.fechaHora) }}
        </span>
      </div>
    </div>

    <!-- Footer count -->
    <div
      v-if="!isLoading && turnos.length > 0"
      class="px-6 py-3 text-xs font-medium"
      style="color: var(--color-outline); border-top: 1px solid var(--color-hairline-soft)"
    >
      {{ turnos.length }} turno{{ turnos.length !== 1 ? "s" : "" }} para hoy
    </div>
  </div>
</template>
