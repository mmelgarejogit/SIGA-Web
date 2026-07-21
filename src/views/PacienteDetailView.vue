<script setup lang="ts">
import { inputStyle, avatarStyle, initials } from "@/composables/useFieldStyles"
import { ref, computed, onMounted, watch, reactive } from "vue"
import { useRoute, useRouter } from "vue-router"
import AppSidebar from "@/components/AppSidebar.vue"
import AppHeader from "@/components/AppHeader.vue"
import BaseButton from "@/components/BaseButton.vue"
import BaseModal from "@/components/BaseModal.vue"
import PaginationFooter from "@/components/PaginationFooter.vue"
import { useAuthStore } from "@/stores/auth"

import {
  type Patient,
  getPatientById,
  deletePatient,
} from "@/services/patientService"
import PacienteEditModal from "@/components/PacienteEditModal.vue"

import { type ConsultaClinica, getConsultasByPatient } from "@/services/clinicaService"

import { type Turno, getTurnos } from "@/services/turnoService"

import { type Venta, type EstadoVenta, getVentas } from "@/services/ventasService"

import {
  type NotificacionPreferencia,
  getPreferenciasByPersona,
  updatePreferenciasByPersona,
} from "@/services/notificacionPreferenciaService"

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const patientId = computed(() => Number(route.params.id))

// ── Tabs ──────────────────────────────────────────────────────────────────────

type TabId = "info" | "citas" | "clinico" | "ventas" | "preferencias"

const ALL_TABS: { id: TabId; label: string; icon: string; available: boolean; permission: string | null }[] = [
  { id: "info",    label: "Información",     icon: "badge",               available: true,  permission: null },
  { id: "citas",   label: "Citas y Turnos",  icon: "calendar_month",      available: true,  permission: "ver_agenda" },
  { id: "clinico", label: "Historial Clínico", icon: "medical_information", available: true, permission: "ver_historia_clinica" },
  { id: "ventas",  label: "Ventas",           icon: "receipt_long",        available: true,  permission: "ver_ventas" },
  { id: "preferencias", label: "Notificaciones", icon: "notifications", available: true, permission: "gestionar_notificaciones" },
]

const tabs = computed(() =>
  ALL_TABS.filter((t) => t.permission === null || auth.hasPermission(t.permission)),
)

const activeTab = ref<TabId>("info")

// ── Estado ────────────────────────────────────────────────────────────────────

const patient = ref<Patient | null>(null)
const isLoading = ref(false)
const loadError = ref("")

async function loadPatient() {
  isLoading.value = true
  loadError.value = ""
  try {
    patient.value = await getPatientById(patientId.value)
  } catch (err: unknown) {
    loadError.value = err instanceof Error ? err.message : "Error al cargar el paciente."
  } finally {
    isLoading.value = false
  }
}

onMounted(loadPatient)

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  })
}

function formatConsultaDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

function formatHour(iso: string): string {
  const match = iso.match(/T(\d{2}:\d{2})/)
  return match ? match[1]! : iso
}

function estadoStyle(estado: string) {
  switch (estado) {
    case "Pendiente":
      return { bg: "var(--color-warning-container)", dot: "var(--color-warning)", text: "var(--color-on-warning-container)" }
    case "Completado":
      return { bg: "var(--color-success-container)", dot: "var(--color-success)", text: "var(--color-on-success-container)" }
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

function calcAge(birthDateIso: string): number {
  const birth = new Date(birthDateIso)
  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  const m = today.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--
  return age
}

// ── Historial Clínico ─────────────────────────────────────────────────────────

const consultas = ref<ConsultaClinica[]>([])
const isLoadingConsultas = ref(false)

async function loadConsultas() {
  if (!patientId.value) return
  isLoadingConsultas.value = true
  try {
    consultas.value = await getConsultasByPatient(patientId.value)
  } catch {
    // silencioso
  } finally {
    isLoadingConsultas.value = false
  }
}

// ── Citas y Turnos del Paciente ───────────────────────────────────────────────

const citas = ref<Turno[]>([])
const isLoadingCitas = ref(false)

async function loadCitas() {
  if (!patientId.value) return
  isLoadingCitas.value = true
  try {
    citas.value = await getTurnos({ patientId: patientId.value })
  } catch {
    citas.value = []
  } finally {
    isLoadingCitas.value = false
  }
}

// ── Ventas del Paciente ───────────────────────────────────────────────────────

const ventas = ref<Venta[]>([])
const isLoadingVentas = ref(false)
const ventasLoaded = ref(false)

async function loadVentas() {
  if (!patient.value) return
  isLoadingVentas.value = true
  try {
    const res = await getVentas({ personId: patient.value.personId, pageSize: 100 })
    ventas.value = res.items
  } catch {
    ventas.value = []
  } finally {
    ventasLoaded.value = true
    isLoadingVentas.value = false
  }
}

// Ventas "reales" para el resumen: excluye borradores (presupuestos) y canceladas.
const ventasReales = computed(() =>
  ventas.value.filter((v) => v.estado !== "Borrador" && v.estado !== "Cancelada"),
)

const totalComprado = computed(() => ventasReales.value.reduce((acc, v) => acc + v.total, 0))
const saldoPendiente = computed(() => ventasReales.value.reduce((acc, v) => acc + v.saldoPendiente, 0))

const formatPrice = (n: number) =>
  new Intl.NumberFormat("es-PY", { style: "currency", currency: "PYG", maximumFractionDigits: 0 }).format(n)

// fechaVenta viene como "yyyy-MM-dd" (sin hora): agregar T00:00:00 para que se
// interprete en hora local y no reste un día por el offset UTC.
const formatVentaDate = (s: string) =>
  new Date(s.includes("T") ? s : s + "T00:00:00").toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })

function ventaEstadoBadge(estado: EstadoVenta | string) {
  const map: Record<string, { bg: string; text: string; label: string }> = {
    Borrador:           { bg: "var(--color-surface-container)", text: "var(--color-outline)", label: "Presupuesto" },
    Confirmada:         { bg: "color-mix(in srgb, var(--color-tertiary) 12%, var(--color-surface-container-lowest))", text: "var(--color-tertiary)", label: "Confirmada" },
    EnProceso:          { bg: "var(--color-info-container)", text: "var(--color-on-info-container)", label: "En proceso" },
    ListaParaCobrar:    { bg: "var(--color-warning-container)", text: "var(--color-on-warning-container)", label: "Lista cobrar" },
    ComprobanteEmitido: { bg: "var(--color-success-container)", text: "var(--color-on-success-container)", label: "Emitido" },
    Cancelada:          { bg: "var(--color-surface-container)", text: "var(--color-outline)", label: "Cancelada" },
  }
  return map[estado] ?? { bg: "var(--color-surface-container)", text: "var(--color-outline)", label: estado }
}

function goToVenta(id: number) {
  router.push(`/ventas/${id}`)
}

// ── Paginación client-side (footer §14 del design-system) ─────────────────────
// Los tabs cargan el set completo del paciente; acá lo dividimos en páginas de 10.
function useClientPagination<T>(source: () => T[], pageSize = 10) {
  const currentPage = ref(1)
  const totalPages = computed(() => Math.max(1, Math.ceil(source().length / pageSize)))
  const pageItems = computed(() =>
    source().slice((currentPage.value - 1) * pageSize, currentPage.value * pageSize),
  )
  const rangeStart = computed(() => (source().length === 0 ? 0 : (currentPage.value - 1) * pageSize + 1))
  const rangeEnd = computed(() => Math.min(currentPage.value * pageSize, source().length))
  // Si el origen se achica tras una recarga, no dejar la página fuera de rango.
  watch(totalPages, (tp) => {
    if (currentPage.value > tp) currentPage.value = tp
  })
  return reactive({ currentPage, totalPages, pageItems, rangeStart, rangeEnd })
}

const ventasPager = useClientPagination<Venta>(() => ventas.value)
const citasPager = useClientPagination<Turno>(() => citas.value)
const consultasPager = useClientPagination<ConsultaClinica>(() => consultas.value)

watch(activeTab, (tab) => {
  if (tab === "clinico" && !consultas.value.length) loadConsultas()
  if (tab === "citas" && !citas.value.length) loadCitas()
  if (tab === "ventas" && !ventasLoaded.value) loadVentas()
  if (tab === "preferencias" && !preferencia.value) loadPreferencia()
})

// ── Preferencias de notificación ─────────────────────────────────────────────

const preferencia = ref<NotificacionPreferencia | null>(null)
const isLoadingPreferencia = ref(false)
const isSavingPreferencia = ref(false)
const preferenciaError = ref("")
const preferenciaSaved = ref(false)

const recibirEmail = ref(true)
const usaVentanaSilencio = ref(false)
const ventanaInicio = ref("21:00")
const ventanaFin = ref("08:00")

async function loadPreferencia() {
  if (!patient.value) return
  isLoadingPreferencia.value = true
  preferenciaError.value = ""
  try {
    preferencia.value = await getPreferenciasByPersona(patient.value.personId)
    recibirEmail.value = preferencia.value.recibirEmail
    usaVentanaSilencio.value = !!preferencia.value.ventanaSilencioInicio
    if (preferencia.value.ventanaSilencioInicio) ventanaInicio.value = preferencia.value.ventanaSilencioInicio.slice(0, 5)
    if (preferencia.value.ventanaSilencioFin) ventanaFin.value = preferencia.value.ventanaSilencioFin.slice(0, 5)
  } catch (err: unknown) {
    preferenciaError.value = err instanceof Error ? err.message : "Error al cargar las preferencias."
  } finally {
    isLoadingPreferencia.value = false
  }
}

async function savePreferencia() {
  if (!patient.value || isSavingPreferencia.value) return
  isSavingPreferencia.value = true
  preferenciaError.value = ""
  preferenciaSaved.value = false
  try {
    preferencia.value = await updatePreferenciasByPersona(patient.value.personId, {
      recibirEmail: recibirEmail.value,
      ventanaSilencioInicio: usaVentanaSilencio.value ? `${ventanaInicio.value}:00` : null,
      ventanaSilencioFin: usaVentanaSilencio.value ? `${ventanaFin.value}:00` : null,
    })
    preferenciaSaved.value = true
  } catch (err: unknown) {
    preferenciaError.value = err instanceof Error ? err.message : "Error al guardar las preferencias."
  } finally {
    isSavingPreferencia.value = false
  }
}

// ── Modal Editar ──────────────────────────────────────────────────────────────

const showEditModal = ref(false)

function openEditModal() {
  showEditModal.value = true
}

// ── Modal Desactivar ──────────────────────────────────────────────────────────

const showDeleteModal = ref(false)
const isDeleting = ref(false)
const deleteError = ref("")

async function confirmDelete() {
  if (isDeleting.value || !patient.value) return
  isDeleting.value = true
  deleteError.value = ""
  try {
    await deletePatient(patient.value.id)
    showDeleteModal.value = false
    router.push("/pacientes")
  } catch (err: unknown) {
    deleteError.value = err instanceof Error ? err.message : "Error al desactivar paciente."
  } finally {
    isDeleting.value = false
  }
}
</script>

<template>
  <div class="min-h-screen" style="background-color: var(--color-surface)">
    <AppSidebar />
    <AppHeader />

    <main style="margin-left: var(--sidebar-width); transition: margin-left 0.25s ease; padding-top: 64px">
      <div class="p-4 sm:p-6 lg:p-8">
        <!-- Breadcrumb / Back -->
        <BaseButton variant="ghost" size="sm" class="mb-8" @click="router.push('/pacientes')">
          <span class="material-symbols-outlined" style="font-size: 18px">arrow_back</span>
          Gestión de Pacientes
        </BaseButton>

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
          class="flex items-center gap-2.5 rounded-2xl px-4 py-3 text-sm font-medium"
          style="
            background-color: var(--color-error-container);
            color: var(--color-on-error-container);
          "
        >
          <span class="material-symbols-outlined" style="font-size: 18px">error</span>
          {{ loadError }}
        </div>

        <template v-else-if="patient">
          <!-- ── Hero Card ──────────────────────────────────────────────────── -->
          <div
            class="rounded-3xl p-8 mb-6 flex items-center justify-between gap-6 flex-wrap"
            style="
              background-color: var(--color-surface-container-lowest);
              box-shadow: var(--shadow-sm);
              outline: 1px solid var(--color-hairline);
            "
          >
            <div class="flex items-center gap-6">
              <div
                class="w-20 h-20 rounded-full flex items-center justify-center text-2xl font-black flex-shrink-0"
                :style="`background-color: ${avatarStyle(patient.id).bg}; color: ${avatarStyle(patient.id).color};`"
              >
                {{ initials(patient.firstName, patient.lastName) }}
              </div>

              <div>
                <div class="flex items-center gap-3 flex-wrap mb-1">
                  <h1 class="text-4xl font-extrabold tracking-tight mb-2">
                    {{ patient.firstName }} {{ patient.lastName }}
                  </h1>
                  <span
                    class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider"
                    :style="
                      patient.isActive
                        ? 'background-color: var(--color-success-container); color: var(--color-on-success-container);'
                        : 'background-color: var(--color-surface-container-highest); color: var(--color-on-surface-variant);'
                    "
                  >
                    <span
                      class="w-1.5 h-1.5 rounded-full"
                      :style="
                        patient.isActive
                          ? 'background-color: var(--color-success);'
                          : 'background-color: var(--color-outline);'
                      "
                    ></span>
                    {{ patient.isActive ? "Activo" : "Inactivo" }}
                  </span>
                </div>
                <p class="text-sm font-medium" style="color: var(--color-outline)">
                  Nro. de Cédula {{ patient.ci }}
                  <span class="mx-2" style="color: var(--color-outline-variant)">·</span>
                  {{ calcAge(patient.birthDate) }} años
                  <span class="mx-2" style="color: var(--color-outline-variant)">·</span>
                  Paciente #{{ patient.id }}
                </p>
              </div>
            </div>

            <!-- Acciones -->
            <div class="flex items-center gap-3">
              <BaseButton
                v-if="auth.hasPermission('editar_paciente')"
                variant="secondary"
                size="default"
                @click="openEditModal"
              >
                <span class="material-symbols-outlined" style="font-size: 18px">edit</span>
                Editar
              </BaseButton>
              <BaseButton
                v-if="patient.isActive && auth.hasPermission('desactivar_paciente')"
                variant="danger"
                size="default"
                @click="showDeleteModal = true"
              >
                <span class="material-symbols-outlined" style="font-size: 18px">person_off</span>
                Desactivar
              </BaseButton>
            </div>
          </div>

          <!-- ── Tab bar ────────────────────────────────────────────────────── -->
          <div
            class="flex items-center gap-1 mb-6 p-1 rounded-2xl w-fit"
            style="background-color: var(--color-surface-container-high)"
          >
            <button
              v-for="tab in tabs"
              :key="tab.id"
              @click="activeTab = tab.id"
              class="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all"
              :style="
                activeTab === tab.id
                  ? 'background-color: var(--color-surface-container-lowest); color: var(--color-primary); box-shadow: 0 1px 4px rgba(0,40,142,0.1);'
                  : 'background-color: transparent; color: var(--color-outline);'
              "
            >
              <span
                class="material-symbols-outlined"
                style="font-size: 16px; width: 16px; height: 16px"
                >{{ tab.icon }}</span
              >
              {{ tab.label }}
              <span
                v-if="!tab.available"
                class="text-xs font-bold px-1.5 py-0.5 rounded-full"
                style="
                  background-color: rgba(117, 118, 132, 0.12);
                  color: var(--color-outline);
                  font-size: 10px;
                  letter-spacing: 0.04em;
                "
                >Pronto</span
              >
            </button>
          </div>

          <!-- ── Tab: Información ───────────────────────────────────────────── -->
          <div v-if="activeTab === 'info'" class="grid grid-cols-1 md:grid-cols-3 gap-6">
            <!-- Datos Personales -->
            <div
              class="rounded-2xl p-6"
              style="
                background-color: var(--color-surface-container-lowest);
                box-shadow: var(--shadow-sm);
                outline: 1px solid var(--color-hairline);
              "
            >
              <div class="flex items-center gap-2 mb-5">
                <span
                  class="material-symbols-outlined"
                  style="color: var(--color-primary); font-size: 20px"
                  >badge</span
                >
                <h2
                  class="text-xs font-bold uppercase tracking-widest"
                  style="color: var(--color-outline)"
                >
                  Datos Personales
                </h2>
              </div>
              <dl class="space-y-4">
                <div>
                  <dt
                    class="text-xs font-semibold uppercase tracking-wider mb-0.5"
                    style="color: var(--color-outline)"
                  >
                    Nombre completo
                  </dt>
                  <dd class="text-sm font-bold" style="color: var(--color-on-surface)">
                    {{ patient.firstName }} {{ patient.lastName }}
                  </dd>
                </div>
                <div>
                  <dt
                    class="text-xs font-semibold uppercase tracking-wider mb-0.5"
                    style="color: var(--color-outline)"
                  >
                    Nro. de Cédula
                  </dt>
                  <dd
                    class="text-sm font-bold tracking-wider"
                    style="color: var(--color-on-surface)"
                  >
                    {{ patient.ci }}
                  </dd>
                </div>
                <div>
                  <dt
                    class="text-xs font-semibold uppercase tracking-wider mb-0.5"
                    style="color: var(--color-outline)"
                  >
                    Fecha de Nacimiento
                  </dt>
                  <dd class="text-sm font-bold" style="color: var(--color-on-surface)">
                    {{ formatDate(patient.birthDate) }}
                  </dd>
                </div>
                <div>
                  <dt
                    class="text-xs font-semibold uppercase tracking-wider mb-0.5"
                    style="color: var(--color-outline)"
                  >
                    Edad
                  </dt>
                  <dd class="text-sm font-bold" style="color: var(--color-on-surface)">
                    {{ calcAge(patient.birthDate) }} años
                  </dd>
                </div>
                <div>
                  <dt
                    class="text-xs font-semibold uppercase tracking-wider mb-0.5"
                    style="color: var(--color-outline)"
                  >
                    Sexo
                  </dt>
                  <dd class="text-sm font-bold" style="color: var(--color-on-surface)">
                    <span v-if="patient.sexo">{{ patient.sexo }}</span>
                    <span v-else style="color: var(--color-outline-variant)">Sin especificar</span>
                  </dd>
                </div>
              </dl>
            </div>

            <!-- Contacto -->
            <div
              class="rounded-2xl p-6"
              style="
                background-color: var(--color-surface-container-lowest);
                box-shadow: var(--shadow-sm);
                outline: 1px solid var(--color-hairline);
              "
            >
              <div class="flex items-center gap-2 mb-5">
                <span
                  class="material-symbols-outlined"
                  style="color: var(--color-secondary); font-size: 20px"
                  >contact_phone</span
                >
                <h2
                  class="text-xs font-bold uppercase tracking-widest"
                  style="color: var(--color-outline)"
                >
                  Contacto
                </h2>
              </div>
              <dl class="space-y-4">
                <div>
                  <dt
                    class="text-xs font-semibold uppercase tracking-wider mb-0.5"
                    style="color: var(--color-outline)"
                  >
                    Teléfono
                  </dt>
                  <dd class="text-sm font-bold" style="color: var(--color-on-surface)">
                    <span v-if="patient.phoneNumber">{{ patient.phoneNumber }}</span>
                    <span v-else style="color: var(--color-outline-variant)">No registrado</span>
                  </dd>
                </div>
                <div>
                  <dt
                    class="text-xs font-semibold uppercase tracking-wider mb-0.5"
                    style="color: var(--color-outline)"
                  >
                    Email
                  </dt>
                  <dd class="text-sm font-bold" style="color: var(--color-on-surface)">
                    <span v-if="patient.email">{{ patient.email }}</span>
                    <span v-else style="color: var(--color-outline-variant)">No registrado</span>
                  </dd>
                </div>
              </dl>
            </div>

            <!-- Registro -->
            <div
              class="rounded-2xl p-6"
              style="
                background-color: var(--color-surface-container-lowest);
                box-shadow: var(--shadow-sm);
                outline: 1px solid var(--color-hairline);
              "
            >
              <div class="flex items-center gap-2 mb-5">
                <span
                  class="material-symbols-outlined"
                  style="color: var(--color-outline); font-size: 20px"
                  >schedule</span
                >
                <h2
                  class="text-xs font-bold uppercase tracking-widest"
                  style="color: var(--color-outline)"
                >
                  Registro
                </h2>
              </div>
              <dl class="space-y-4">
                <div>
                  <dt
                    class="text-xs font-semibold uppercase tracking-wider mb-0.5"
                    style="color: var(--color-outline)"
                  >
                    Fecha de Alta
                  </dt>
                  <dd class="text-sm font-bold" style="color: var(--color-on-surface)">
                    {{ formatDate(patient.createdAt) }}
                  </dd>
                </div>
                <div>
                  <dt
                    class="text-xs font-semibold uppercase tracking-wider mb-0.5"
                    style="color: var(--color-outline)"
                  >
                    Última Actualización
                  </dt>
                  <dd class="text-sm font-bold" style="color: var(--color-on-surface)">
                    {{ formatDate(patient.updatedAt) }}
                  </dd>
                </div>
                <div>
                  <dt
                    class="text-xs font-semibold uppercase tracking-wider mb-0.5"
                    style="color: var(--color-outline)"
                  >
                    Estado
                  </dt>
                  <dd>
                    <span
                      class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider"
                      :style="
                        patient.isActive
                          ? 'background-color: var(--color-success-container); color: var(--color-on-success-container);'
                          : 'background-color: var(--color-surface-container-highest); color: var(--color-on-surface-variant);'
                      "
                    >
                      <span
                        class="w-1.5 h-1.5 rounded-full"
                        :style="
                          patient.isActive
                            ? 'background-color: var(--color-success);'
                            : 'background-color: var(--color-outline);'
                        "
                      ></span>
                      {{ patient.isActive ? "Activo" : "Inactivo" }}
                    </span>
                  </dd>
                </div>
              </dl>
            </div>

          </div><!-- fin grid tab Información -->

          <!-- ── Tab: Citas y Turnos ─────────────────────────────────────────── -->
          <div v-else-if="activeTab === 'citas'">
            <div
              class="rounded-lg overflow-hidden"
              style="
                background-color: var(--color-surface-container-lowest);
                box-shadow: var(--shadow-sm);
                outline: 1px solid var(--color-hairline);
              "
            >
              <div
                class="flex items-center justify-between px-6 py-5"
                style="border-bottom: 1px solid var(--color-hairline)"
              >
                <div class="flex items-center gap-2">
                  <span
                    class="material-symbols-outlined"
                    style="color: var(--color-secondary); font-size: 20px"
                    >calendar_month</span
                  >
                  <h2
                    class="text-sm font-bold uppercase tracking-widest"
                    style="color: var(--color-outline)"
                  >
                    Citas y Turnos
                  </h2>
                </div>
                <BaseButton variant="secondary" size="sm" @click="() => router.push('/agenda')">
                  <span class="material-symbols-outlined" style="font-size: 14px">open_in_new</span>
                  Ver en Agenda
                </BaseButton>
              </div>

              <div v-if="isLoadingCitas" class="flex justify-center py-16">
                <svg
                  class="animate-spin w-7 h-7"
                  style="color: var(--color-secondary)"
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

              <div v-else-if="!citas.length" class="py-16 text-center">
                <span
                  class="material-symbols-outlined block mx-auto mb-3"
                  style="color: var(--color-outline-variant); font-size: 40px"
                  >event_busy</span
                >
                <p class="text-sm font-semibold" style="color: var(--color-outline)">
                  Sin citas registradas
                </p>
                <p class="text-xs mt-1" style="color: var(--color-outline-variant)">
                  Las citas aparecerán aquí una vez agendadas.
                </p>
              </div>

              <div v-else class="divide-y" style="border-color: var(--color-hairline)">
                <div
                  v-for="cita in citasPager.pageItems"
                  :key="cita.id"
                  class="flex items-center justify-between px-6 py-4 transition-colors hover:bg-surface"
                >
                  <div class="flex items-center gap-4 flex-1 min-w-0">
                    <div
                      class="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                      :style="`background-color: ${estadoStyle(cita.estado).bg};`"
                    >
                      <span
                        class="material-symbols-outlined"
                        :style="`color: ${estadoStyle(cita.estado).text}; font-size:18px;`"
                        >event</span
                      >
                    </div>
                    <div class="min-w-0">
                      <div class="flex items-center gap-2 flex-wrap mb-0.5">
                        <span class="text-sm font-bold" style="color: var(--color-on-surface)">{{
                          formatHour(cita.fechaHora)
                        }}</span>
                        <span
                          class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold"
                          :style="`background-color: ${estadoStyle(cita.estado).bg}; color: ${estadoStyle(cita.estado).text};`"
                        >
                          <span
                            class="w-1.5 h-1.5 rounded-full flex-shrink-0"
                            :style="`background-color: ${estadoStyle(cita.estado).dot};`"
                          ></span>
                          {{ cita.estado }}
                        </span>
                      </div>
                      <p class="text-xs truncate" style="color: var(--color-outline)">
                        {{ cita.professionalNombre }}
                        <span
                          v-if="cita.motivo"
                          class="mx-1.5"
                          style="color: var(--color-outline-variant)"
                          >·</span
                        >
                        {{ cita.motivo }}
                      </p>
                    </div>
                  </div>
                  <span
                    class="text-xs font-semibold flex-shrink-0"
                    style="color: var(--color-outline)"
                    >{{ formatDate(cita.fechaHora) }}</span
                  >
                </div>
              </div>

              <!-- Footer paginador (§14) -->
              <PaginationFooter
                v-if="!isLoadingCitas && citas.length"
                v-model:current-page="citasPager.currentPage"
                :total-pages="citasPager.totalPages"
                :range-start="citasPager.rangeStart"
                :range-end="citasPager.rangeEnd"
                :total="citas.length"
                noun="citas"
              />
            </div>
          </div>

          <!-- ── Tab: Historial Clínico ─────────────────────────────────────── -->
          <div v-else-if="activeTab === 'clinico'">
            <div
              class="rounded-lg overflow-hidden"
              style="
                background-color: var(--color-surface-container-lowest);
                box-shadow: var(--shadow-sm);
                outline: 1px solid var(--color-hairline);
              "
            >
              <!-- Encabezado del historial -->
              <div
                class="flex items-center justify-between px-6 py-5"
                style="border-bottom: 1px solid var(--color-hairline)"
              >
                <div class="flex items-center gap-2">
                  <span
                    class="material-symbols-outlined"
                    style="color: var(--color-tertiary); font-size: 20px"
                    >medical_information</span
                  >
                  <h2
                    class="text-sm font-bold uppercase tracking-widest"
                    style="color: var(--color-outline)"
                  >
                    Historial Clínico
                  </h2>
                </div>
                <BaseButton
                  variant="secondary"
                  size="sm"
                  @click="() => router.push({ path: '/clinica' })"
                >
                  <span class="material-symbols-outlined" style="font-size: 14px">open_in_new</span>
                  Ver en Clínica
                </BaseButton>
              </div>

              <!-- Loading -->
              <div v-if="isLoadingConsultas" class="flex justify-center py-16">
                <svg
                  class="animate-spin w-7 h-7"
                  style="color: var(--color-tertiary)"
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

              <!-- Vacío -->
              <div v-else-if="!consultas.length" class="py-16 text-center">
                <span
                  class="material-symbols-outlined block mx-auto mb-3"
                  style="color: var(--color-outline-variant); font-size: 40px"
                  >medical_information</span
                >
                <p class="text-sm font-semibold" style="color: var(--color-outline)">
                  Sin consultas registradas
                </p>
                <p class="text-xs mt-1" style="color: var(--color-outline-variant)">
                  Las consultas aparecerán aquí una vez registradas.
                </p>
              </div>

              <!-- Lista de consultas -->
              <div
                v-else
                class="divide-y"
                style="--tw-divide-opacity: 1; border-color: var(--color-hairline)"
              >
                <div
                  v-for="c in consultasPager.pageItems"
                  :key="c.id"
                  class="px-6 py-4 flex items-start justify-between gap-4 hover:bg-surface"
                >
                  <div class="flex items-start gap-4 flex-1 min-w-0">
                    <div
                      class="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                      style="background-color: rgba(32, 0, 177, 0.06)"
                    >
                      <span
                        class="material-symbols-outlined"
                        style="color: var(--color-tertiary); font-size: 18px"
                        >description</span
                      >
                    </div>
                    <div class="min-w-0">
                      <div class="flex items-center gap-2 flex-wrap mb-0.5">
                        <span class="text-sm font-bold" style="color: var(--color-on-surface)">{{
                          c.diagnosticoPrincipal
                        }}</span>
                        <span
                          v-if="c.receta"
                          class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold"
                          style="background-color: var(--color-success-container); color: var(--color-on-success-container)"
                        >
                          <span class="material-symbols-outlined" style="font-size: 10px"
                            >check</span
                          >
                          Con receta
                        </span>
                      </div>
                      <p class="text-xs truncate" style="color: var(--color-outline)">
                        {{ c.motivo }}
                        <span class="mx-1.5" style="color: var(--color-outline-variant)">·</span>
                        {{ c.professionalFirstName }} {{ c.professionalLastName }}
                      </p>
                    </div>
                  </div>
                  <span
                    class="text-xs font-semibold flex-shrink-0"
                    style="color: var(--color-outline)"
                    >{{ formatConsultaDate(c.fechaConsulta) }}</span
                  >
                </div>
              </div>

              <!-- Footer paginador (§14) -->
              <PaginationFooter
                v-if="!isLoadingConsultas && consultas.length"
                v-model:current-page="consultasPager.currentPage"
                :total-pages="consultasPager.totalPages"
                :range-start="consultasPager.rangeStart"
                :range-end="consultasPager.rangeEnd"
                :total="consultas.length"
                noun="consultas"
              />
            </div>
          </div>

          <!-- ── Tab: Ventas ────────────────────────────────────────────────── -->
          <div v-else-if="activeTab === 'ventas'">
            <!-- Resumen -->
            <div v-if="ventasLoaded && ventasReales.length" class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              <div
                class="rounded-lg px-6 py-5"
                style="background-color: var(--color-surface-container-lowest); box-shadow: var(--shadow-sm); outline: 1px solid var(--color-hairline)"
              >
                <p class="text-xs font-bold uppercase tracking-widest mb-1" style="color: var(--color-outline)">
                  Total comprado
                </p>
                <p class="text-2xl font-extrabold" style="color: var(--color-on-surface)">
                  {{ formatPrice(totalComprado) }}
                </p>
              </div>
              <div
                class="rounded-lg px-6 py-5"
                style="background-color: var(--color-surface-container-lowest); box-shadow: var(--shadow-sm); outline: 1px solid var(--color-hairline)"
              >
                <p class="text-xs font-bold uppercase tracking-widest mb-1" style="color: var(--color-outline)">
                  Saldo pendiente
                </p>
                <p
                  class="text-2xl font-extrabold"
                  :style="{ color: saldoPendiente > 0 ? 'var(--color-on-warning-container)' : 'var(--color-on-surface)' }"
                >
                  {{ formatPrice(saldoPendiente) }}
                </p>
              </div>
            </div>

            <!-- Lista de ventas -->
            <div
              class="rounded-lg overflow-hidden"
              style="
                background-color: var(--color-surface-container-lowest);
                box-shadow: var(--shadow-sm);
                outline: 1px solid var(--color-hairline);
              "
            >
              <!-- Encabezado -->
              <div
                class="flex items-center justify-between px-6 py-5"
                style="border-bottom: 1px solid var(--color-hairline)"
              >
                <div class="flex items-center gap-2">
                  <span
                    class="material-symbols-outlined"
                    style="color: var(--color-primary); font-size: 20px"
                    >receipt_long</span
                  >
                  <h2
                    class="text-sm font-bold uppercase tracking-widest"
                    style="color: var(--color-outline)"
                  >
                    Ventas y Presupuestos
                  </h2>
                </div>
                <BaseButton
                  variant="secondary"
                  size="sm"
                  @click="() => router.push({ path: '/ventas' })"
                >
                  <span class="material-symbols-outlined" style="font-size: 14px">open_in_new</span>
                  Ver en Ventas
                </BaseButton>
              </div>

              <!-- Loading -->
              <div v-if="isLoadingVentas" class="flex justify-center py-16">
                <svg
                  class="animate-spin w-7 h-7"
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

              <!-- Vacío -->
              <div v-else-if="!ventas.length" class="py-16 text-center">
                <span
                  class="material-symbols-outlined block mx-auto mb-3"
                  style="color: var(--color-outline-variant); font-size: 40px"
                  >receipt_long</span
                >
                <p class="text-sm font-semibold" style="color: var(--color-outline)">
                  Sin ventas registradas
                </p>
                <p class="text-xs mt-1" style="color: var(--color-outline-variant)">
                  Las ventas y presupuestos de este paciente aparecerán aquí.
                </p>
              </div>

              <!-- Lista -->
              <div
                v-else
                class="divide-y"
                style="--tw-divide-opacity: 1; border-color: var(--color-hairline)"
              >
                <button
                  v-for="v in ventasPager.pageItems"
                  :key="v.id"
                  type="button"
                  class="w-full px-6 py-4 flex items-center justify-between gap-4 text-left hover:bg-surface transition-colors"
                  @click="goToVenta(v.id)"
                >
                  <div class="flex items-center gap-4 flex-1 min-w-0">
                    <div
                      class="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                      style="background-color: rgba(0, 40, 142, 0.06)"
                    >
                      <span
                        class="material-symbols-outlined"
                        style="color: var(--color-primary); font-size: 18px"
                        >{{ v.tipo === "TrabajoAPedido" ? "visibility" : "shopping_bag" }}</span
                      >
                    </div>
                    <div class="min-w-0">
                      <div class="flex items-center gap-2 flex-wrap mb-0.5">
                        <span class="text-sm font-bold" style="color: var(--color-on-surface)">{{
                          v.numeroComprobante || "Presupuesto"
                        }}</span>
                        <span
                          class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold"
                          :style="`background-color: ${ventaEstadoBadge(v.estado).bg}; color: ${ventaEstadoBadge(v.estado).text}`"
                          >{{ ventaEstadoBadge(v.estado).label }}</span
                        >
                      </div>
                      <p class="text-xs" style="color: var(--color-outline)">
                        {{ formatVentaDate(v.fechaVenta) }}
                        <template v-if="v.saldoPendiente > 0">
                          <span class="mx-1.5" style="color: var(--color-outline-variant)">·</span>
                          <span style="color: var(--color-on-warning-container)"
                            >Saldo {{ formatPrice(v.saldoPendiente) }}</span
                          >
                        </template>
                      </p>
                    </div>
                  </div>
                  <div class="flex items-center gap-3 flex-shrink-0">
                    <span class="text-sm font-bold" style="color: var(--color-on-surface)">{{
                      formatPrice(v.total)
                    }}</span>
                    <span
                      class="material-symbols-outlined"
                      style="color: var(--color-outline-variant); font-size: 20px"
                      >chevron_right</span
                    >
                  </div>
                </button>
              </div>

              <!-- Footer paginador (§14) -->
              <PaginationFooter
                v-if="!isLoadingVentas && ventas.length"
                v-model:current-page="ventasPager.currentPage"
                :total-pages="ventasPager.totalPages"
                :range-start="ventasPager.rangeStart"
                :range-end="ventasPager.rangeEnd"
                :total="ventas.length"
                noun="ventas"
              />
            </div>
          </div>

          <!-- ── Tab: Preferencias de notificación ─────────────────────────── -->
          <div v-else-if="activeTab === 'preferencias'">
            <div
              class="rounded-2xl p-6 max-w-xl"
              style="
                background-color: var(--color-surface-container-lowest);
                box-shadow: var(--shadow-sm);
                outline: 1px solid var(--color-hairline);
              "
            >
              <div class="flex items-center gap-2 mb-5">
                <span class="material-symbols-outlined" style="color: var(--color-primary); font-size: 20px">notifications</span>
                <h2 class="text-xs font-bold uppercase tracking-widest" style="color: var(--color-outline)">
                  Preferencias de notificación
                </h2>
              </div>

              <div v-if="isLoadingPreferencia" class="flex justify-center py-10">
                <svg class="animate-spin w-6 h-6" style="color: var(--color-primary)" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              </div>

              <template v-else>
                <div class="flex items-center justify-between py-3" style="border-bottom: 1px solid var(--color-hairline-soft)">
                  <div>
                    <p class="text-sm font-bold" style="color: var(--color-on-surface)">Recordatorios y avisos por email</p>
                    <p class="text-xs mt-0.5" style="color: var(--color-outline)">Turnos, cambios de cita y avisos de pickup.</p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    :aria-checked="recibirEmail"
                    @click="recibirEmail = !recibirEmail"
                    class="relative flex-shrink-0 transition-colors duration-200"
                    style="width: 44px; height: 24px; border-radius: var(--radius-xs)"
                    :style="recibirEmail ? 'background-color: var(--color-primary);' : 'background-color: var(--color-outline-variant);'"
                  >
                    <span
                      class="absolute bg-white transition-all duration-200"
                      style="top: 4px; width: 16px; height: 16px; border-radius: 3px"
                      :style="recibirEmail ? 'left: 24px;' : 'left: 4px;'"
                    ></span>
                  </button>
                </div>

                <div class="flex items-center justify-between py-3" style="border-bottom: 1px solid var(--color-hairline-soft)">
                  <div>
                    <p class="text-sm font-bold" style="color: var(--color-on-surface)">Ventana de silencio</p>
                    <p class="text-xs mt-0.5" style="color: var(--color-outline)">No enviar avisos no urgentes en este horario.</p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    :aria-checked="usaVentanaSilencio"
                    @click="usaVentanaSilencio = !usaVentanaSilencio"
                    class="relative flex-shrink-0 transition-colors duration-200"
                    style="width: 44px; height: 24px; border-radius: var(--radius-xs)"
                    :style="usaVentanaSilencio ? 'background-color: var(--color-primary);' : 'background-color: var(--color-outline-variant);'"
                  >
                    <span
                      class="absolute bg-white transition-all duration-200"
                      style="top: 4px; width: 16px; height: 16px; border-radius: 3px"
                      :style="usaVentanaSilencio ? 'left: 24px;' : 'left: 4px;'"
                    ></span>
                  </button>
                </div>

                <div v-if="usaVentanaSilencio" class="flex items-center gap-4 py-4">
                  <div class="flex-1">
                    <label class="text-xs font-bold uppercase tracking-wider" style="color: var(--color-outline)">Desde</label>
                    <input v-model="ventanaInicio" type="time" class="mt-1 px-4 h-12 rounded-md text-sm outline-none w-full" :style="inputStyle(false)" />
                  </div>
                  <div class="flex-1">
                    <label class="text-xs font-bold uppercase tracking-wider" style="color: var(--color-outline)">Hasta</label>
                    <input v-model="ventanaFin" type="time" class="mt-1 px-4 h-12 rounded-md text-sm outline-none w-full" :style="inputStyle(false)" />
                  </div>
                </div>

                <p v-if="preferenciaError" class="text-xs font-medium mt-4" style="color: var(--color-error)">{{ preferenciaError }}</p>
                <p v-if="preferenciaSaved" class="text-xs font-medium mt-4" style="color: var(--color-success)">Preferencias guardadas.</p>

                <div class="pt-5">
                  <BaseButton variant="primary" size="default" :disabled="isSavingPreferencia" @click="savePreferencia">
                    {{ isSavingPreferencia ? "Guardando..." : "Guardar" }}
                  </BaseButton>
                </div>
              </template>
            </div>
          </div>
        </template>
      </div>
    </main>

    <PacienteEditModal
      :show="showEditModal"
      :patient="patient"
      @close="showEditModal = false"
      @saved="p => { patient = p }"
    />

    <!-- MODAL: CONFIRMAR DESACTIVACIÓN -->
    <BaseModal :show="showDeleteModal" size="sm" @close="showDeleteModal = false">
      <div class="text-center">
        <div
          class="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-5"
          style="background-color: var(--color-error-container)"
        >
          <span class="material-symbols-outlined" style="color: var(--color-error); font-size: 28px"
            >person_off</span
          >
        </div>
        <h3 class="text-lg font-extrabold mb-2" style="color: var(--color-on-surface)">
          Desactivar Paciente
        </h3>
        <p class="text-sm" style="color: var(--color-on-surface-variant)">
          ¿Desactivar a
          <strong style="color: var(--color-on-surface)"
            >{{ patient?.firstName }} {{ patient?.lastName }}</strong
          >? Sus datos se conservarán pero el paciente quedará inactivo.
        </p>
        <div
          v-if="deleteError"
          class="mt-4 flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium"
          style="
            background-color: var(--color-error-container);
            color: var(--color-on-error-container);
          "
        >
          <span class="material-symbols-outlined" style="font-size: 18px">error</span>
          {{ deleteError }}
        </div>
      </div>

      <template #footer>
        <BaseButton
          variant="secondary"
          size="default"
          class="flex-1"
          @click="showDeleteModal = false"
          >Cancelar</BaseButton
        >
        <BaseButton
          variant="danger"
          size="default"
          class="flex-1"
          :disabled="isDeleting"
          @click="confirmDelete"
        >
          <svg
            v-if="isDeleting"
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
          {{ isDeleting ? "Desactivando..." : "Desactivar" }}
        </BaseButton>
      </template>
    </BaseModal>
  </div>
</template>
