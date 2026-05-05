<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from "vue"
import { useRouter } from "vue-router"
import AppSidebar from "@/components/AppSidebar.vue"
import AppHeader from "@/components/AppHeader.vue"
import KpiCard from "@/components/KpiCard.vue"
import TodayAppointments from "@/components/TodayAppointments.vue"
import InsightsPanel from "@/components/InsightsPanel.vue"
import BaseButton from "@/components/BaseButton.vue"
import { getPatients } from "@/services/patientService"
import { getTurnos } from "@/services/turnoService"
import { useAuthStore } from "@/stores/auth"

const router = useRouter()

const authStore = useAuthStore()
const firstName = computed(() => authStore.user?.firstName ?? "")

function toDateStr(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

const todayStr = toDateStr(new Date())

const activePatients = ref("—")
const todayAppointments = ref("—")
const isLoadingPatients = ref(true)
const isLoadingAppointments = ref(true)

async function loadDashboardData() {
  try {
    const result = await getPatients({ page: 1, pageSize: 1 })
    activePatients.value = result.totalActive.toLocaleString("es-PY")
  } catch {
    activePatients.value = "N/D"
  } finally {
    isLoadingPatients.value = false
  }

  try {
    const turnos = await getTurnos({ fecha: todayStr })
    todayAppointments.value = String(turnos.length)
  } catch {
    todayAppointments.value = "N/D"
  } finally {
    isLoadingAppointments.value = false
  }
}

onMounted(loadDashboardData)

const kpis = computed(() => [
  {
    title: "Pacientes Activos",
    value: activePatients.value,
    icon: "group",
    badge: isLoadingPatients.value ? "Cargando..." : "Total",
    badgeType: "neutral" as const,
    iconBg: "var(--color-primary-fixed)",
    iconColor: "var(--color-primary)",
  },
  {
    title: "Citas Hoy",
    value: todayAppointments.value,
    icon: "calendar_today",
    badge: isLoadingAppointments.value ? "Cargando..." : "Pendientes",
    badgeType: "neutral" as const,
    iconBg: "var(--color-secondary-fixed)",
    iconColor: "var(--color-secondary)",
  },
  {
    title: "Ingresos Semanales",
    value: "—",
    icon: "sell",
    badge: "Sin datos",
    badgeType: "neutral" as const,
    iconBg: "#E2DFFF",
    iconColor: "var(--color-tertiary)",
  },
  {
    title: "Stock Crítico",
    value: "—",
    icon: "warning",
    badge: "Sin datos",
    badgeType: "neutral" as const,
    iconBg: "var(--color-error-container)",
    iconColor: "var(--color-error)",
  },
])

const greeting = computed(() => {
  const h = new Date().getHours()
  if (h < 12) return "Buenos días"
  if (h < 18) return "Buenas tardes"
  return "Buenas noches"
})

const todayLabel = new Date().toLocaleDateString("es-PY", {
  weekday: "long",
  day: "numeric",
  month: "long",
})

// ── FAB Menu ─────────────────────────────────────────────────────────────────────

const showFabMenu = ref(false)
const fabRef = ref<HTMLElement | null>(null)

function toggleFabMenu() {
  showFabMenu.value = !showFabMenu.value
}

function handleClickOutside(e: MouseEvent) {
  if (fabRef.value && !fabRef.value.contains(e.target as Node)) showFabMenu.value = false
}

onMounted(() => document.addEventListener("mousedown", handleClickOutside))
onUnmounted(() => document.removeEventListener("mousedown", handleClickOutside))

function actionNuevaCita() {
  showFabMenu.value = false
  router.push("/agenda")
}

function actionNuevoPaciente() {
  showFabMenu.value = false
  router.push("/pacientes")
}

const fabIconStyle = computed(() =>
  showFabMenu.value
    ? "width:28px;height:28px;font-size:28px;transform:rotate(45deg);display:inline-block;"
    : `width:28px;height:28px;font-size:28px;font-variation-settings:'FILL' 1,'wght' 400,'GRAD' 0,'opsz' 24;`,
)
</script>

<template>
  <div class="min-h-screen" style="background-color: var(--color-surface)">
    <AppSidebar />
    <AppHeader />

    <main style="margin-left: 280px; padding-top: 64px">
      <div class="p-8">
        <div class="mb-10 flex items-end justify-between" style="padding-right: 8rem">
          <div>
            <p
              class="text-sm font-bold uppercase tracking-[0.2em] mb-2"
              style="color: var(--color-primary)"
            >
              {{ greeting }}, {{ firstName }}
            </p>
            <h1
              class="text-5xl font-extrabold tracking-tight leading-tight"
              style="color: var(--color-on-surface)"
            >
              Su óptica en<br />
              <span style="color: var(--color-primary)">foco absoluto.</span>
            </h1>
          </div>
          <div class="text-right pb-2 hidden lg:block">
            <p class="text-sm font-medium capitalize" style="color: var(--color-outline)">
              {{ todayLabel }}
            </p>
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 mb-8">
          <KpiCard v-for="kpi in kpis" :key="kpi.title" v-bind="kpi" />
        </div>

        <div class="flex gap-6">
          <div class="flex-1 min-w-0">
            <TodayAppointments />
          </div>
          <div class="w-80 flex-shrink-0">
            <InsightsPanel />
          </div>
        </div>
      </div>
    </main>

    <!-- FAB -->
    <div ref="fabRef" class="fixed bottom-8 right-8 z-50">
      <Transition
        enter-active-class="transition-all duration-150 ease-out"
        enter-from-class="opacity-0 scale-90"
        enter-to-class="opacity-100 scale-100"
        leave-active-class="transition-all duration-100 ease-in"
        leave-from-class="opacity-100 scale-100"
        leave-to-class="opacity-0 scale-90"
      >
        <div
          v-if="showFabMenu"
          class="absolute bottom-16 right-0 w-56 rounded-2xl overflow-hidden mb-2"
          style="
            background-color: var(--color-surface-container-lowest);
            box-shadow: 0 8px 32px rgba(0, 40, 142, 0.18);
            outline: 1px solid rgba(196, 197, 213, 0.2);
          "
        >
          <div class="px-4 py-3" style="border-bottom: 1px solid rgba(196, 197, 213, 0.15)">
            <p
              class="text-xs font-bold uppercase tracking-widest"
              style="color: var(--color-outline)"
            >
              Acciones rápidas
            </p>
          </div>
          <div class="py-1.5">
            <button
              @click="actionNuevaCita"
              class="w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold transition-colors text-left"
              style="color: var(--color-on-surface)"
              onmouseover="this.style.backgroundColor = 'var(--color-surface)'"
              onmouseout="this.style.backgroundColor = ''"
            >
              <div
                class="w-8 h-8 rounded-xl flex items-center justify-center"
                style="background-color: rgba(0, 103, 128, 0.1)"
              >
                <span
                  class="material-symbols-outlined"
                  style="color: var(--color-secondary); font-size: 16px"
                  >calendar_month</span
                >
              </div>
              Nueva Cita
            </button>
            <button
              @click="actionNuevoPaciente"
              class="w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold transition-colors text-left"
              style="color: var(--color-on-surface)"
              onmouseover="this.style.backgroundColor = 'var(--color-surface)'"
              onmouseout="this.style.backgroundColor = ''"
            >
              <div
                class="w-8 h-8 rounded-xl flex items-center justify-center"
                style="background-color: rgba(0, 40, 142, 0.1)"
              >
                <span
                  class="material-symbols-outlined"
                  style="color: var(--color-primary); font-size: 16px"
                  >person_add</span
                >
              </div>
              Nuevo Paciente
            </button>
          </div>
        </div>
      </Transition>

      <BaseButton
        variant="primary"
        @click="toggleFabMenu"
        class="w-14 h-14 shadow-2xl hover:scale-105 z-50"
        :style="
          showFabMenu
            ? 'background-color: #1E3A5F; box-shadow: 0 8px 32px rgba(0,40,142,0.35);'
            : 'background-color: var(--color-primary); box-shadow: 0 8px 32px rgba(0,40,142,0.35);'
        "
      >
        <span class="material-symbols-outlined" :style="fabIconStyle">add</span>
      </BaseButton>
    </div>
  </div>
</template>
