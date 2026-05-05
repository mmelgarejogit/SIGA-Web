<script setup lang="ts">
import { ref, computed, onMounted, watch, defineComponent, h } from "vue"
import { useRoute, useRouter } from "vue-router"
import AppSidebar from "@/components/AppSidebar.vue"
import AppHeader from "@/components/AppHeader.vue"
import BaseButton from "@/components/BaseButton.vue"
import BaseModal from "@/components/BaseModal.vue"

import {
  type Patient,
  type UpdatePatientRequest,
  getPatientById,
  updatePatient,
  deletePatient,
} from "@/services/patientService"

import { type ConsultaClinica, getConsultasByPatient } from "@/services/clinicaService"

import { type Turno, getTurnos } from "@/services/turnoService"

const TabPending = defineComponent({
  props: {
    icon: { type: String, required: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    accent: { type: String, default: "var(--color-outline)" },
    accentBg: { type: String, default: "rgba(117,118,132,0.06)" },
  },
  setup(props) {
    return () =>
      h(
        "div",
        {
          style:
            "display:flex; flex-direction:column; align-items:center; justify-content:center; min-height:320px; text-align:center; padding:3rem;",
        },
        [
          h(
            "div",
            {
              style: `width:80px; height:80px; border-radius:9999px; background-color:${props.accentBg}; display:flex; align-items:center; justify-content:center; margin-bottom:1.5rem;`,
            },
            [
              h(
                "span",
                {
                  class: "material-symbols-outlined",
                  style: `color:${props.accent}; font-size:36px;`,
                },
                props.icon,
              ),
            ],
          ),
          h(
            "div",
            {
              style:
                "display:inline-flex; align-items:center; gap:6px; background-color:var(--color-surface-container-low); border-radius:9999px; padding:4px 12px; margin-bottom:1rem;",
            },
            [
              h(
                "span",
                {
                  class: "material-symbols-outlined",
                  style: "font-size:12px; color:var(--color-outline);",
                },
                "construction",
              ),
              h(
                "span",
                {
                  style:
                    "font-size:11px; font-weight:700; color:var(--color-outline); text-transform:uppercase; letter-spacing:0.06em;",
                },
                "En desarrollo",
              ),
            ],
          ),
          h(
            "h3",
            {
              style:
                "font-size:1.125rem; font-weight:800; color:var(--color-on-surface); margin-bottom:0.5rem;",
            },
            props.title,
          ),
          h(
            "p",
            {
              style:
                "font-size:0.875rem; color:var(--color-outline); max-width:400px; line-height:1.6;",
            },
            props.description,
          ),
        ],
      )
  },
})

const route = useRoute()
const router = useRouter()

const patientId = computed(() => Number(route.params.id))

// ── Tabs ──────────────────────────────────────────────────────────────────────

type TabId = "info" | "citas" | "clinico" | "ventas"

const tabs: { id: TabId; label: string; icon: string; available: boolean }[] = [
  { id: "info", label: "Información", icon: "badge", available: true },
  { id: "citas", label: "Citas y Turnos", icon: "calendar_month", available: true },
  { id: "clinico", label: "Historial Clínico", icon: "medical_information", available: true },
  { id: "ventas", label: "Ventas", icon: "receipt_long", available: false },
]

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

watch(activeTab, (tab) => {
  if (tab === "clinico" && !consultas.value.length) loadConsultas()
  if (tab === "citas" && !citas.value.length) loadCitas()
})

// ── Helpers ───────────────────────────────────────────────────────────────────

const AVATAR_PALETTE = [
  { bg: "rgba(0,40,142,0.08)", color: "var(--color-primary)" },
  { bg: "rgba(0,103,128,0.08)", color: "var(--color-secondary)" },
  { bg: "rgba(32,0,177,0.08)", color: "var(--color-tertiary)" },
  { bg: "rgba(117,118,132,0.10)", color: "var(--color-outline)" },
]

function avatarStyle(p: Patient) {
  return AVATAR_PALETTE[(p.id ?? 0) % AVATAR_PALETTE.length]!
}

function initials(p: Patient) {
  return `${p.firstName[0] ?? ""}${p.lastName[0] ?? ""}`.toUpperCase()
}

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
    const all = await getTurnos()
    citas.value = all.filter((t) => t.patientId === patientId.value)
  } catch {
    citas.value = []
  } finally {
    isLoadingCitas.value = false
  }
}

watch(activeTab, (tab) => {
  if (tab === "clinico" && !consultas.value.length) loadConsultas()
  if (tab === "citas" && !citas.value.length) loadCitas()
})

// ── Modal Editar ──────────────────────────────────────────────────────────────

const showEditModal = ref(false)
const editForm = ref<UpdatePatientRequest>({
  firstName: "",
  lastName: "",
  ci: "",
  birthDate: "",
  phoneNumber: "",
  email: "",
  isActive: true,
})
const editError = ref("")
const isSavingEdit = ref(false)

type EditErrors = {
  firstName?: string
  lastName?: string
  ci?: string
  birthDate?: string
  email?: string
}
const editErrors = ref<EditErrors>({})

const ONLY_LETTERS = /^[a-záéíóúüñA-ZÁÉÍÓÚÜÑ\s]+$/
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function validateEdit(): boolean {
  const e: EditErrors = {}
  const f = editForm.value
  if (!f.firstName.trim()) e.firstName = "El nombre es obligatorio."
  else if (!ONLY_LETTERS.test(f.firstName.trim())) e.firstName = "Solo letras y espacios."
  if (!f.lastName.trim()) e.lastName = "El apellido es obligatorio."
  else if (!ONLY_LETTERS.test(f.lastName.trim())) e.lastName = "Solo letras y espacios."
  if (!f.ci.trim()) e.ci = "El nro. de cédula es obligatorio."
  else if (f.ci.trim().length > 30) e.ci = "Máximo 30 caracteres."
  if (!f.birthDate) e.birthDate = "La fecha de nacimiento es obligatoria."
  if (f.email?.trim() && !EMAIL_RE.test(f.email.trim()))
    e.email = "El formato del email no es válido."
  editErrors.value = e
  return Object.keys(e).length === 0
}

function openEditModal() {
  if (!patient.value) return
  editForm.value = {
    firstName: patient.value.firstName,
    lastName: patient.value.lastName,
    ci: patient.value.ci,
    birthDate: patient.value.birthDate,
    phoneNumber: patient.value.phoneNumber ?? "",
    email: patient.value.email ?? "",
    isActive: patient.value.isActive,
  }
  editErrors.value = {}
  editError.value = ""
  showEditModal.value = true
}

async function submitEdit() {
  if (isSavingEdit.value) return
  if (!validateEdit()) return
  editError.value = ""
  isSavingEdit.value = true
  try {
    const updated = await updatePatient(patientId.value, {
      ...editForm.value,
      phoneNumber: editForm.value.phoneNumber || undefined,
      email: editForm.value.email || undefined,
    })
    patient.value = updated
    showEditModal.value = false
  } catch (err: unknown) {
    editError.value = err instanceof Error ? err.message : "Error al actualizar paciente."
  } finally {
    isSavingEdit.value = false
  }
}

function inputStyle(hasError: boolean) {
  return hasError
    ? "border: 1.5px solid var(--color-error); color: var(--color-on-surface); background-color: #FFF8F7;"
    : "border: 1px solid var(--color-outline-variant); color: var(--color-on-surface); background-color: var(--color-surface);"
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

    <main style="margin-left: 280px; padding-top: 64px">
      <div class="px-8 pt-10 pb-16 max-w-7xl mx-auto">
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
              box-shadow: 0 1px 3px rgba(196, 197, 213, 0.25);
              outline: 1px solid rgba(196, 197, 213, 0.15);
            "
          >
            <div class="flex items-center gap-6">
              <div
                class="w-20 h-20 rounded-full flex items-center justify-center text-2xl font-black flex-shrink-0"
                :style="`background-color: ${avatarStyle(patient).bg}; color: ${avatarStyle(patient).color};`"
              >
                {{ initials(patient) }}
              </div>

              <div>
                <div class="flex items-center gap-3 flex-wrap mb-1">
                  <h1 class="text-3xl font-extrabold" style="color: var(--color-on-surface)">
                    {{ patient.firstName }} {{ patient.lastName }}
                  </h1>
                  <span
                    class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider"
                    :style="
                      patient.isActive
                        ? 'background-color: #dcfce7; color: #166534;'
                        : 'background-color: var(--color-surface-container-highest); color: var(--color-on-surface-variant);'
                    "
                  >
                    <span
                      class="w-1.5 h-1.5 rounded-full"
                      :style="
                        patient.isActive
                          ? 'background-color: #16a34a;'
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
              <BaseButton variant="secondary" size="default" @click="openEditModal">
                <span class="material-symbols-outlined" style="font-size: 18px">edit</span>
                Editar
              </BaseButton>
              <BaseButton
                v-if="patient.isActive"
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
                box-shadow: 0 1px 3px rgba(196, 197, 213, 0.25);
                outline: 1px solid rgba(196, 197, 213, 0.15);
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
              </dl>
            </div>

            <!-- Contacto -->
            <div
              class="rounded-2xl p-6"
              style="
                background-color: var(--color-surface-container-lowest);
                box-shadow: 0 1px 3px rgba(196, 197, 213, 0.25);
                outline: 1px solid rgba(196, 197, 213, 0.15);
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
                box-shadow: 0 1px 3px rgba(196, 197, 213, 0.25);
                outline: 1px solid rgba(196, 197, 213, 0.15);
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
                          ? 'background-color: #dcfce7; color: #166534;'
                          : 'background-color: var(--color-surface-container-highest); color: var(--color-on-surface-variant);'
                      "
                    >
                      <span
                        class="w-1.5 h-1.5 rounded-full"
                        :style="
                          patient.isActive
                            ? 'background-color: #16a34a;'
                            : 'background-color: var(--color-outline);'
                        "
                      ></span>
                      {{ patient.isActive ? "Activo" : "Inactivo" }}
                    </span>
                  </dd>
                </div>
              </dl>
            </div>
          </div>

          <!-- ── Tab: Citas y Turnos ─────────────────────────────────────────── -->
          <div v-else-if="activeTab === 'citas'">
            <div
              class="rounded-2xl overflow-hidden"
              style="
                background-color: var(--color-surface-container-lowest);
                box-shadow: 0 1px 3px rgba(196, 197, 213, 0.25);
                outline: 1px solid rgba(196, 197, 213, 0.15);
              "
            >
              <div
                class="flex items-center justify-between px-6 py-5"
                style="border-bottom: 1px solid rgba(196, 197, 213, 0.2)"
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

              <div v-else class="divide-y" style="border-color: rgba(196, 197, 213, 0.2)">
                <div
                  v-for="cita in citas"
                  :key="cita.id"
                  class="flex items-center justify-between px-6 py-4 transition-colors"
                  onmouseover="this.style.backgroundColor = 'var(--color-surface)'"
                  onmouseout="this.style.backgroundColor = 'transparent'"
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
            </div>
          </div>

          <!-- ── Tab: Historial Clínico ─────────────────────────────────────── -->
          <div v-else-if="activeTab === 'clinico'">
            <div
              class="rounded-2xl overflow-hidden"
              style="
                background-color: var(--color-surface-container-lowest);
                box-shadow: 0 1px 3px rgba(196, 197, 213, 0.25);
                outline: 1px solid rgba(196, 197, 213, 0.15);
              "
            >
              <!-- Encabezado del historial -->
              <div
                class="flex items-center justify-between px-6 py-5"
                style="border-bottom: 1px solid rgba(196, 197, 213, 0.2)"
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
                style="--tw-divide-opacity: 1; border-color: rgba(196, 197, 213, 0.2)"
              >
                <div
                  v-for="c in consultas"
                  :key="c.id"
                  class="px-6 py-4 flex items-start justify-between gap-4"
                  onmouseover="this.style.backgroundColor = 'var(--color-surface)'"
                  onmouseout="this.style.backgroundColor = 'transparent'"
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
                          style="background-color: #d1fae5; color: #065f46"
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
            </div>
          </div>

          <!-- ── Tab: Ventas ────────────────────────────────────────────────── -->
          <div v-else-if="activeTab === 'ventas'">
            <TabPending
              icon="receipt_long"
              title="Ventas"
              description="El historial de compras y ventas asociadas al paciente estará disponible cuando se implemente el módulo de Ventas."
              accent="var(--color-primary)"
              accent-bg="rgba(0,40,142,0.06)"
            />
          </div>
        </template>
      </div>
    </main>

    <!-- MODAL: EDITAR PACIENTE -->
    <BaseModal
      :show="showEditModal"
      title="Editar Paciente"
      size="lg"
      @close="showEditModal = false"
    >
      <form @submit.prevent="submitEdit" class="space-y-5">
        <div
          v-if="editError"
          class="flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium"
          style="
            background-color: var(--color-error-container);
            color: var(--color-on-error-container);
          "
        >
          <span class="material-symbols-outlined" style="font-size: 18px">error</span>
          {{ editError }}
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div class="flex flex-col gap-1.5">
            <label
              class="text-xs font-bold uppercase tracking-wider"
              style="color: var(--color-outline)"
              >Nombre *</label
            >
            <input
              v-model="editForm.firstName"
              type="text"
              class="px-4 py-3 rounded-xl text-sm outline-none transition-all"
              :style="inputStyle(!!editErrors.firstName)"
            />
            <p
              v-if="editErrors.firstName"
              class="text-xs font-medium"
              style="color: var(--color-error)"
            >
              {{ editErrors.firstName }}
            </p>
          </div>
          <div class="flex flex-col gap-1.5">
            <label
              class="text-xs font-bold uppercase tracking-wider"
              style="color: var(--color-outline)"
              >Apellido *</label
            >
            <input
              v-model="editForm.lastName"
              type="text"
              class="px-4 py-3 rounded-xl text-sm outline-none transition-all"
              :style="inputStyle(!!editErrors.lastName)"
            />
            <p
              v-if="editErrors.lastName"
              class="text-xs font-medium"
              style="color: var(--color-error)"
            >
              {{ editErrors.lastName }}
            </p>
          </div>
        </div>

        <div class="flex flex-col gap-1.5">
          <label
            class="text-xs font-bold uppercase tracking-wider"
            style="color: var(--color-outline)"
            >Nro. de Cédula *</label
          >
          <input
            v-model="editForm.ci"
            type="text"
            class="px-4 py-3 rounded-xl text-sm outline-none transition-all"
            :style="inputStyle(!!editErrors.ci)"
          />
          <p v-if="editErrors.ci" class="text-xs font-medium" style="color: var(--color-error)">
            {{ editErrors.ci }}
          </p>
        </div>

        <div class="flex flex-col gap-1.5">
          <label
            class="text-xs font-bold uppercase tracking-wider"
            style="color: var(--color-outline)"
            >Fecha de Nacimiento *</label
          >
          <input
            v-model="editForm.birthDate"
            type="date"
            class="px-4 py-3 rounded-xl text-sm outline-none transition-all"
            :style="inputStyle(!!editErrors.birthDate)"
          />
          <p
            v-if="editErrors.birthDate"
            class="text-xs font-medium"
            style="color: var(--color-error)"
          >
            {{ editErrors.birthDate }}
          </p>
        </div>

        <div class="flex flex-col gap-1.5">
          <label
            class="text-xs font-bold uppercase tracking-wider"
            style="color: var(--color-outline)"
            >Teléfono</label
          >
          <input
            v-model="editForm.phoneNumber"
            type="tel"
            placeholder="0972123456"
            class="px-4 py-3 rounded-xl text-sm outline-none transition-all"
            :style="inputStyle(false)"
          />
        </div>

        <div class="flex flex-col gap-1.5">
          <label
            class="text-xs font-bold uppercase tracking-wider"
            style="color: var(--color-outline)"
            >Email</label
          >
          <input
            v-model="editForm.email"
            type="email"
            placeholder="paciente@email.com"
            class="px-4 py-3 rounded-xl text-sm outline-none transition-all"
            :style="inputStyle(!!editErrors.email)"
          />
          <p v-if="editErrors.email" class="text-xs font-medium" style="color: var(--color-error)">
            {{ editErrors.email }}
          </p>
        </div>

        <div
          class="flex items-center justify-between px-4 py-3 rounded-xl"
          style="background-color: var(--color-surface-container-low)"
        >
          <span class="text-sm font-semibold" style="color: var(--color-on-surface-variant)"
            >Cuenta activa</span
          >
          <button
            type="button"
            @click="editForm.isActive = !editForm.isActive"
            class="relative w-12 h-6 rounded-full transition-all"
            :style="
              editForm.isActive
                ? 'background-color: var(--color-primary);'
                : 'background-color: var(--color-outline-variant);'
            "
          >
            <span
              class="absolute top-1 w-4 h-4 rounded-full bg-white transition-all"
              :style="editForm.isActive ? 'left: calc(100% - 1.25rem);' : 'left: 0.25rem;'"
            ></span>
          </button>
        </div>
      </form>

      <template #footer>
        <BaseButton variant="secondary" size="default" @click="showEditModal = false"
          >Cancelar</BaseButton
        >
        <BaseButton variant="primary" size="default" :disabled="isSavingEdit" @click="submitEdit">
          <svg
            v-if="isSavingEdit"
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
          {{ isSavingEdit ? "Guardando..." : "Guardar Cambios" }}
        </BaseButton>
      </template>
    </BaseModal>

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
