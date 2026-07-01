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
import { getTurnos, getMisTurnos, type Turno } from "@/services/turnoService"
import { getProfessionalStats, type ProfessionalDashboardStats, type ConsultaClinica } from "@/services/clinicaService"
import { getReporteVentas, getReporteInventario } from "@/services/reportesService"
import { useAuthStore } from "@/stores/auth"

const router  = useRouter()
const auth    = useAuthStore()

const firstName = computed(() => auth.user?.firstName ?? "")
const specialty = computed(() => auth.user?.specialty ?? "")

const isPatient = computed(
  () => auth.hasPermission("ver_mis_turnos") && !auth.hasPermission("ver_agenda"),
)

const isProfessional = computed(() => !!auth.user?.professionalId)

// ── Helpers ────────────────────────────────────────────────────────────────────

function toDateStr(d: Date): string {
  const y   = d.getFullYear()
  const m   = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

function fmtGs(n: number): string {
  return new Intl.NumberFormat("es-PY", { style: "currency", currency: "PYG", maximumFractionDigits: 0 }).format(n)
}

function weekRangeStr(d: Date): { desde: string; hasta: string } {
  const day = d.getDay()
  const offset = day === 0 ? 6 : day - 1 // lunes = inicio
  const start = new Date(d)
  start.setDate(d.getDate() - offset)
  const end = new Date(start)
  end.setDate(start.getDate() + 6)
  return { desde: toDateStr(start), hasta: toDateStr(end) }
}

function formatFecha(iso: string): string {
  return new Date(iso).toLocaleDateString("es-PY", {
    weekday: "long",
    day:     "numeric",
    month:   "long",
  })
}

function formatHora(iso: string): string {
  const m = iso.match(/T(\d{2}:\d{2})/)
  return m ? m[1]! : ""
}

const greeting = computed(() => {
  const h = new Date().getHours()
  if (h < 12) return "Buenos días"
  if (h < 18) return "Buenas tardes"
  return "Buenas noches"
})

const todayLabel = new Date().toLocaleDateString("es-PY", {
  weekday: "long",
  day:     "numeric",
  month:   "long",
})

// ── Professional data ──────────────────────────────────────────────────────────

const profStats     = ref<ProfessionalDashboardStats | null>(null)
const isProfLoading = ref(false)

async function loadProfessionalData() {
  isProfLoading.value = true
  try {
    profStats.value = await getProfessionalStats()
  } catch {
    profStats.value = null
  } finally {
    isProfLoading.value = false
  }
}

const profKpis = computed(() => [
  {
    title:     "Consultas hoy",
    value:     isProfLoading.value ? "—" : String(profStats.value?.consultasHoy ?? 0),
    icon:      "today",
    badge:     "Hoy",
    badgeType: "neutral" as const,
    iconBg:    "var(--color-primary-fixed)",
    iconColor: "var(--color-primary)",
  },
  {
    title:     "Esta semana",
    value:     isProfLoading.value ? "—" : String(profStats.value?.consultasEstaSemana ?? 0),
    icon:      "date_range",
    badge:     "Semana",
    badgeType: "neutral" as const,
    iconBg:    "var(--color-secondary-fixed)",
    iconColor: "var(--color-secondary)",
  },
  {
    title:     "Este mes",
    value:     isProfLoading.value ? "—" : String(profStats.value?.consultasEsteMes ?? 0),
    icon:      "calendar_month",
    badge:     "Mes",
    badgeType: "neutral" as const,
    iconBg:    "var(--color-tertiary-fixed)",
    iconColor: "var(--color-tertiary)",
  },
  {
    title:     "Pacientes atendidos",
    value:     isProfLoading.value ? "—" : String(profStats.value?.pacientesUnicosEsteMes ?? 0),
    icon:      "group",
    badge:     "Mes",
    badgeType: "neutral" as const,
    iconBg:    "color-mix(in srgb, var(--color-primary) 10%, transparent)",
    iconColor: "var(--color-primary)",
  },
  {
    title:     "Recetas emitidas",
    value:     isProfLoading.value ? "—" : String(profStats.value?.recetasEmitidasEsteMes ?? 0),
    icon:      "medical_services",
    badge:     "Mes",
    badgeType: "neutral" as const,
    iconBg:    "color-mix(in srgb, var(--color-secondary) 10%, transparent)",
    iconColor: "var(--color-secondary)",
  },
])

function profAvatarStyle(id: number) {
  const palette = [
    { bg: "color-mix(in srgb, var(--color-primary) 10%, transparent)",    color: "var(--color-primary)" },
    { bg: "color-mix(in srgb, var(--color-secondary) 10%, transparent)",   color: "var(--color-secondary)" },
    { bg: "color-mix(in srgb, var(--color-tertiary) 10%, transparent)",    color: "var(--color-tertiary)" },
    { bg: "color-mix(in srgb, var(--color-outline) 14%, transparent)", color: "var(--color-outline)" },
  ]
  return palette[id % palette.length] ?? palette[0]!
}

function profInitials(fn: string, ln: string) {
  return `${fn[0] ?? ""}${ln[0] ?? ""}`.toUpperCase()
}

function profFormatDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-AR", {
    day: "2-digit", month: "short", year: "numeric",
  })
}

// ── Staff data ─────────────────────────────────────────────────────────────────

const todayStr            = toDateStr(new Date())
const activePatients      = ref("—")
const todayAppointments   = ref("—")
const ingresosSemana      = ref("—")
const stockCritico        = ref("—")
const isLoadingPatients   = ref(true)
const isLoadingAppts      = ref(true)

async function loadStaffData() {
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
    isLoadingAppts.value = false
  }

  // KPIs de reportes (solo si el usuario tiene permiso para verlos)
  if (auth.hasPermission("ver_reportes")) {
    try {
      const { desde, hasta } = weekRangeStr(new Date())
      const rv = await getReporteVentas({ desde, hasta, agrupacion: "dia" })
      ingresosSemana.value = fmtGs(rv.totalCobrado)
    } catch {
      ingresosSemana.value = "N/D"
    }
    try {
      // El stock crítico es un snapshot; el rango no influye.
      const ri = await getReporteInventario({ desde: todayStr, hasta: todayStr, agrupacion: "dia" })
      stockCritico.value = String(ri.stockCritico)
    } catch {
      stockCritico.value = "N/D"
    }
  }
}

const stockBadge = computed<{ text: string; type: "positive" | "neutral" | "critical" }>(() => {
  const n = Number(stockCritico.value)
  if (Number.isNaN(n)) return { text: "Sin datos", type: "neutral" }
  return n > 0 ? { text: "Atención", type: "critical" } : { text: "Al día", type: "positive" }
})

const kpis = computed(() => [
  {
    title:    "Pacientes Activos",
    value:    activePatients.value,
    icon:     "group",
    badge:    isLoadingPatients.value ? "Cargando..." : "Total",
    badgeType: "neutral" as const,
    iconBg:   "var(--color-primary-fixed)",
    iconColor: "var(--color-primary)",
  },
  {
    title:    "Citas Hoy",
    value:    todayAppointments.value,
    icon:     "calendar_today",
    badge:    isLoadingAppts.value ? "Cargando..." : "Pendientes",
    badgeType: "neutral" as const,
    iconBg:   "var(--color-secondary-fixed)",
    iconColor: "var(--color-secondary)",
  },
  {
    title:    "Ingresos Semanales",
    value:    ingresosSemana.value,
    icon:     "sell",
    badge:    "Esta semana",
    badgeType: "neutral" as const,
    iconBg:   "var(--color-tertiary-fixed)",
    iconColor: "var(--color-tertiary)",
  },
  {
    title:    "Stock Crítico",
    value:    stockCritico.value,
    icon:     "warning",
    badge:    stockBadge.value.text,
    badgeType: stockBadge.value.type,
    iconBg:   "var(--color-error-container)",
    iconColor: "var(--color-error)",
  },
])

// ── FAB (staff) ────────────────────────────────────────────────────────────────

const showFabMenu = ref(false)
const fabRef      = ref<HTMLElement | null>(null)

function toggleFabMenu()  { showFabMenu.value = !showFabMenu.value }
function actionNuevaCita()    { showFabMenu.value = false; router.push("/agenda") }
function actionNuevoPaciente(){ showFabMenu.value = false; router.push("/pacientes") }

function handleClickOutside(e: MouseEvent) {
  if (fabRef.value && !fabRef.value.contains(e.target as Node)) showFabMenu.value = false
}

const fabIconStyle = computed(() =>
  showFabMenu.value
    ? "width:28px;height:28px;font-size:28px;transform:rotate(45deg);display:inline-block;"
    : `width:28px;height:28px;font-size:28px;font-variation-settings:'FILL' 1,'wght' 400,'GRAD' 0,'opsz' 24;`,
)

// ── Patient data ───────────────────────────────────────────────────────────────

const misTurnos     = ref<Turno[]>([])
const isLoadingMios = ref(false)

const proximoTurno = computed(() => {
  const now = new Date()
  return misTurnos.value
    .filter(t => t.estado === "Pendiente" && new Date(t.fechaHora) > now)
    .sort((a, b) => new Date(a.fechaHora).getTime() - new Date(b.fechaHora).getTime())[0] ?? null
})

const turnosRecientes = computed(() =>
  [...misTurnos.value]
    .sort((a, b) => new Date(b.fechaHora).getTime() - new Date(a.fechaHora).getTime())
    .slice(0, 4),
)

async function loadPatientData() {
  isLoadingMios.value = true
  try {
    misTurnos.value = await getMisTurnos()
  } catch {
    misTurnos.value = []
  } finally {
    isLoadingMios.value = false
  }
}

function estadoBadgeClass(estado: string) {
  if (estado === "Pendiente")  return "bg-blue-100 text-blue-700"
  if (estado === "Completado") return "bg-green-100 text-green-700"
  return "bg-red-100 text-red-600"
}

// ── Mount ──────────────────────────────────────────────────────────────────────

onMounted(() => {
  document.addEventListener("mousedown", handleClickOutside)
  if (isPatient.value)        loadPatientData()
  else if (isProfessional.value) loadProfessionalData()
  else                        loadStaffData()
})
onUnmounted(() => document.removeEventListener("mousedown", handleClickOutside))
</script>

<template>
  <div class="min-h-screen" style="background-color: var(--color-surface)">
    <AppSidebar />
    <AppHeader />

    <main style="margin-left: var(--sidebar-width); transition: margin-left 0.25s ease; padding-top: 64px">
      <div class="p-4 sm:p-6 lg:p-8">

        <!-- ══════════════════════════════════════════════════════ -->
        <!--  DASHBOARD PACIENTE                                    -->
        <!-- ══════════════════════════════════════════════════════ -->
        <template v-if="isPatient">

          <!-- Saludo -->
          <div class="mb-8 flex items-end justify-between" style="padding-right: 4rem">
            <div>
              <p class="dash-eyebrow">
                <span class="dash-tick" aria-hidden="true"></span>{{ greeting }}, {{ firstName }}
              </p>
              <h1 class="text-4xl font-extrabold tracking-tight leading-tight">
                Tu salud visual,<br />
                <span style="color: var(--color-primary)">en un vistazo.</span>
              </h1>
            </div>
            <p class="text-sm font-medium capitalize hidden lg:block pb-2"
               style="color: var(--color-outline)">
              {{ todayLabel }}
            </p>
          </div>

          <!-- Grid principal -->
          <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">

            <!-- Próximo turno (2/3 ancho) -->
            <div class="lg:col-span-2 rounded-3xl p-7"
                 style="background-color: var(--color-surface-container-lowest);
                        box-shadow: 0 2px 16px rgba(0,40,142,0.07);">
              <h2 class="text-xs font-bold uppercase tracking-widest mb-5"
                  style="color: var(--color-outline)">
                Próximo turno
              </h2>

              <!-- Loading -->
              <div v-if="isLoadingMios" class="flex items-center gap-3 py-4">
                <div class="w-5 h-5 rounded-full border-2 animate-spin"
                     style="border-color: var(--color-primary); border-top-color: transparent"></div>
                <span class="text-sm" style="color: var(--color-outline)">Cargando...</span>
              </div>

              <!-- Tiene turno próximo -->
              <div v-else-if="proximoTurno">
                <div class="flex items-start gap-5">
                  <div class="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0"
                       style="background-color: var(--color-secondary-fixed)">
                    <span class="material-symbols-outlined"
                          style="color: var(--color-secondary);
                                 font-variation-settings:'FILL' 1,'wght' 400,'GRAD' 0,'opsz' 24;">
                      calendar_month
                    </span>
                  </div>
                  <div class="flex-1">
                    <p class="text-2xl font-extrabold capitalize"
                       style="color: var(--color-on-surface)">
                      {{ formatFecha(proximoTurno.fechaHora) }}
                    </p>
                    <p class="text-base font-semibold mt-1"
                       style="color: var(--color-outline)">
                      {{ formatHora(proximoTurno.fechaHora) }} hs &nbsp;·&nbsp;
                      {{ proximoTurno.professionalNombre }}
                    </p>
                    <p v-if="proximoTurno.motivo" class="text-sm mt-2"
                       style="color: var(--color-outline)">
                      {{ proximoTurno.motivo }}
                    </p>
                  </div>
                  <span class="px-3 py-1 rounded-full text-xs font-bold"
                        :class="estadoBadgeClass(proximoTurno.estado)">
                    {{ proximoTurno.estado }}
                  </span>
                </div>
              </div>

              <!-- Sin turno próximo -->
              <div v-else class="flex flex-col items-center justify-center py-8 gap-3">
                <div class="w-14 h-14 rounded-2xl flex items-center justify-center"
                     style="background-color: var(--color-surface-container-low)">
                  <span class="material-symbols-outlined"
                        style="color: var(--color-outline); font-size: 28px;">
                    event_busy
                  </span>
                </div>
                <p class="text-sm font-medium text-center" style="color: var(--color-outline)">
                  No tenés turnos próximos
                </p>
              </div>

              <!-- Ver todos -->
              <div class="mt-6 pt-5" style="border-top: 1px solid rgba(196,197,213,0.18)">
                <button @click="router.push('/mis-turnos')"
                        class="flex items-center gap-2 text-sm font-bold transition-opacity hover:opacity-70"
                        style="color: var(--color-primary)">
                  <span>Ver todos mis turnos</span>
                  <span class="material-symbols-outlined" style="font-size: 18px">arrow_forward</span>
                </button>
              </div>
            </div>

            <!-- Acciones rápidas (1/3 ancho) -->
            <div class="flex flex-col gap-4">
              <div class="rounded-3xl p-7"
                   style="background-color: var(--color-primary);
                          box-shadow: var(--shadow-lg);">
                <span class="material-symbols-outlined mb-4 block"
                      style="color: rgba(255,255,255,0.7); font-size: 28px;
                             font-variation-settings:'FILL' 1,'wght' 400,'GRAD' 0,'opsz' 24;">
                  edit_calendar
                </span>
                <h3 class="text-lg font-extrabold text-white mb-1">Reservar turno</h3>
                <p class="text-sm mb-5" style="color: rgba(255,255,255,0.65)">
                  Elegí día, horario y profesional disponible.
                </p>
                <button @click="router.push('/mis-turnos')"
                        class="w-full py-3 rounded-full text-sm font-bold transition-all active:scale-95"
                        style="background-color: rgba(255,255,255,0.15);
                               color: white;
                               border: 1.5px solid rgba(255,255,255,0.3);">
                  Reservar ahora
                </button>
              </div>

              <div class="rounded-3xl p-6"
                   style="background-color: var(--color-surface-container-lowest);
                          box-shadow: 0 2px 16px rgba(0,40,142,0.07);">
                <span class="material-symbols-outlined mb-3 block"
                      style="color: var(--color-secondary); font-size: 24px;
                             font-variation-settings:'FILL' 1,'wght' 400,'GRAD' 0,'opsz' 24;">
                  clinical_notes
                </span>
                <h3 class="text-base font-extrabold mb-1"
                    style="color: var(--color-on-surface)">
                  Historial clínico
                </h3>
                <p class="text-sm mb-4" style="color: var(--color-outline)">
                  Consultá tus visitas y recetas anteriores.
                </p>
                <button @click="router.push('/mis-turnos')"
                        class="flex items-center gap-1 text-sm font-bold transition-opacity hover:opacity-70"
                        style="color: var(--color-secondary)">
                  <span>Ver historial</span>
                  <span class="material-symbols-outlined" style="font-size: 16px">arrow_forward</span>
                </button>
              </div>
            </div>

          </div>

          <!-- Turnos recientes -->
          <div v-if="!isLoadingMios && turnosRecientes.length > 0"
               class="mt-6 rounded-3xl overflow-hidden"
               style="background-color: var(--color-surface-container-lowest);
                      box-shadow: 0 2px 16px rgba(0,40,142,0.07);">
            <div class="px-7 py-5" style="border-bottom: 1px solid var(--color-hairline)">
              <h2 class="text-xs font-bold uppercase tracking-widest"
                  style="color: var(--color-outline)">
                Turnos recientes
              </h2>
            </div>
            <div>
              <div v-for="turno in turnosRecientes" :key="turno.id"
                   class="flex items-center gap-4 px-7 py-4 hover:bg-surface-container-low transition-colors"
                   style="border-bottom: 1px solid var(--color-hairline-soft)">
                <div class="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                     style="background-color: var(--color-surface-container-low)">
                  <span class="material-symbols-outlined"
                        style="color: var(--color-outline); font-size: 18px;">
                    calendar_today
                  </span>
                </div>
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-semibold truncate"
                     style="color: var(--color-on-surface)">
                    {{ turno.professionalNombre }}
                  </p>
                  <p class="text-xs capitalize" style="color: var(--color-outline)">
                    {{ formatFecha(turno.fechaHora) }} · {{ formatHora(turno.fechaHora) }} hs
                  </p>
                </div>
                <span class="px-3 py-1 rounded-full text-xs font-bold flex-shrink-0"
                      :class="estadoBadgeClass(turno.estado)">
                  {{ turno.estado }}
                </span>
              </div>
            </div>
          </div>

        </template>

        <!-- ══════════════════════════════════════════════════════ -->
        <!--  DASHBOARD PROFESIONAL                                  -->
        <!-- ══════════════════════════════════════════════════════ -->
        <template v-else-if="isProfessional">

          <div class="mb-10 flex items-end justify-between" style="padding-right: 8rem">
            <div>
              <p class="dash-eyebrow">
                <span class="dash-tick" aria-hidden="true"></span>{{ greeting }}, {{ firstName }}
              </p>
              <h1 class="text-5xl font-extrabold tracking-tight leading-tight">
                Tu actividad,<br />
                <span style="color: var(--color-primary)">de un vistazo.</span>
              </h1>
              <p v-if="specialty" class="mt-3 text-sm font-semibold"
                 style="color: var(--color-outline)">
                {{ specialty }}
              </p>
            </div>
            <div class="text-right pb-2 hidden lg:block">
              <p class="text-sm font-medium capitalize" style="color: var(--color-outline)">
                {{ todayLabel }}
              </p>
            </div>
          </div>

          <!-- KPIs -->
          <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-5 mb-8">
            <KpiCard v-for="kpi in profKpis" :key="kpi.title" v-bind="kpi" />
          </div>

          <!-- Últimas consultas -->
          <div
            class="rounded-3xl overflow-hidden"
            style="
              background-color: var(--color-surface-container-lowest);
              box-shadow: 0 2px 16px rgba(0,40,142,0.07);
            "
          >
            <div
              class="flex items-center justify-between px-7 py-5"
              style="border-bottom: 1px solid var(--color-hairline)"
            >
              <h2 class="text-xs font-bold uppercase tracking-widest"
                  style="color: var(--color-outline)">
                Últimas consultas
              </h2>
              <button
                @click="router.push('/clinica/consultas')"
                class="flex items-center gap-1 text-sm font-bold transition-opacity hover:opacity-70"
                style="color: var(--color-primary)"
              >
                <span>Ver todas</span>
                <span class="material-symbols-outlined" style="font-size: 16px">arrow_forward</span>
              </button>
            </div>

            <!-- Loading -->
            <div v-if="isProfLoading" class="flex items-center gap-3 px-7 py-8">
              <div class="w-5 h-5 rounded-full border-2 animate-spin"
                   style="border-color: var(--color-primary); border-top-color: transparent"></div>
              <span class="text-sm" style="color: var(--color-outline)">Cargando...</span>
            </div>

            <!-- Sin consultas -->
            <div v-else-if="!profStats?.ultimasConsultas.length"
                 class="flex flex-col items-center justify-center py-12 gap-3">
              <div class="w-14 h-14 rounded-2xl flex items-center justify-center"
                   style="background-color: var(--color-surface-container-low)">
                <span class="material-symbols-outlined"
                      style="color: var(--color-outline); font-size: 28px">
                  clinical_notes
                </span>
              </div>
              <p class="text-sm font-medium" style="color: var(--color-outline)">
                No tenés consultas registradas aún
              </p>
            </div>

            <!-- Lista -->
            <div v-else>
              <div
                v-for="c in profStats.ultimasConsultas"
                :key="c.id"
                class="flex items-center gap-4 px-7 py-4 hover:bg-surface-container-low transition-colors"
                style="border-bottom: 1px solid var(--color-hairline-soft)"
              >
                <div
                  class="w-9 h-9 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0"
                  :style="`background-color: ${profAvatarStyle(c.patientId).bg}; color: ${profAvatarStyle(c.patientId).color};`"
                >
                  {{ profInitials(c.patientFirstName, c.patientLastName) }}
                </div>
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-bold truncate" style="color: var(--color-on-surface)">
                    {{ c.patientFirstName }} {{ c.patientLastName }}
                  </p>
                  <p class="text-xs truncate" style="color: var(--color-outline)">
                    {{ c.diagnosticoPrincipal }}
                  </p>
                </div>
                <span
                  v-if="c.receta"
                  class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold flex-shrink-0"
                  style="background-color: var(--color-success-container); color: var(--color-on-success-container)"
                >
                  <span class="material-symbols-outlined" style="font-size: 12px">check</span>
                  Con receta
                </span>
                <span class="text-xs font-medium flex-shrink-0" style="color: var(--color-outline)">
                  {{ profFormatDate(c.fechaConsulta) }}
                </span>
              </div>
            </div>
          </div>

        </template>

        <!-- ══════════════════════════════════════════════════════ -->
        <!--  DASHBOARD STAFF                                       -->
        <!-- ══════════════════════════════════════════════════════ -->
        <template v-else>

          <div class="mb-10 flex items-end justify-between" style="padding-right: 8rem">
            <div>
              <p class="dash-eyebrow">
                <span class="dash-tick" aria-hidden="true"></span>{{ greeting }}, {{ firstName }}
              </p>
              <h1 class="text-5xl font-extrabold tracking-tight leading-tight">
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
              <div v-if="showFabMenu"
                   class="absolute bottom-16 right-0 w-56 rounded-2xl overflow-hidden mb-2"
                   style="background-color: var(--color-surface-container-lowest);
                          box-shadow: 0 8px 32px rgba(0,40,142,0.18);
                          outline: 1px solid var(--color-hairline);">
                <div class="px-4 py-3" style="border-bottom: 1px solid var(--color-hairline)">
                  <p class="text-xs font-bold uppercase tracking-widest"
                     style="color: var(--color-outline)">
                    Acciones rápidas
                  </p>
                </div>
                <div class="py-1.5">
                  <button @click="actionNuevaCita"
                          class="w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold transition-colors text-left hover:bg-surface-container-low"
                          style="color: var(--color-on-surface)">
                    <div class="w-8 h-8 rounded-xl flex items-center justify-center"
                         style="background-color: rgba(0,103,128,0.1)">
                      <span class="material-symbols-outlined"
                            style="color: var(--color-secondary); font-size: 16px">
                        calendar_month
                      </span>
                    </div>
                    Nueva Cita
                  </button>
                  <button @click="actionNuevoPaciente"
                          class="w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold transition-colors text-left hover:bg-surface-container-low"
                          style="color: var(--color-on-surface)">
                    <div class="w-8 h-8 rounded-xl flex items-center justify-center"
                         style="background-color: rgba(0,40,142,0.1)">
                      <span class="material-symbols-outlined"
                            style="color: var(--color-primary); font-size: 16px">
                        person_add
                      </span>
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
              :style="showFabMenu
                ? 'background-color: color-mix(in srgb, var(--color-primary) 80%, black); box-shadow: 0 8px 32px rgba(0,40,142,0.35);'
                : 'background-color: var(--color-primary); box-shadow: 0 8px 32px rgba(0,40,142,0.35);'"
            >
              <span class="material-symbols-outlined" :style="fabIconStyle">add</span>
            </BaseButton>
          </div>

        </template>

      </div>
    </main>
  </div>
</template>

<style scoped>
/* Eco del hero de auth: etiqueta de instrumento (mono) + tick focal cian. */
.dash-eyebrow {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  font-family: var(--font-mono);
  font-size: 0.72rem;
  font-weight: 500;
  letter-spacing: 0.26em;
  text-transform: uppercase;
  color: var(--color-primary);
  margin-bottom: 0.65rem;
}
.dash-tick {
  flex-shrink: 0;
  width: 1.5rem;
  height: 1px;
  background: var(--color-secondary);
}
</style>
