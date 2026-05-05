<script setup lang="ts">
import { ref, reactive, onMounted } from "vue"
import { useRouter } from "vue-router"
import AppSidebar from "@/components/AppSidebar.vue"
import AppHeader from "@/components/AppHeader.vue"
import BaseButton from "@/components/BaseButton.vue"
import SearchInput from "@/components/SearchInput.vue"
import BaseTable from "@/components/BaseTable.vue"
import { useAuthStore } from "@/stores/auth"
import { type CreateConsultaClinicaRequest, createConsulta } from "@/services/clinicaService"
import { getPatients, type Patient } from "@/services/patientService"
import { getProfessionals, type Professional } from "@/services/professionalService"

const auth = useAuthStore()
const router = useRouter()

// ── Profesionales ─────────────────────────────────────────────────────────

const professionals = ref<Professional[]>([])
const selectedProfessionalId = ref<number | null>(auth.user?.professionalId ?? null)

onMounted(async () => {
  try {
    professionals.value = await getProfessionals()
  } catch {
    /* no crítico */
  }
})

// ── Búsqueda de paciente ──────────────────────────────────────────────────

const patientSearch = ref("")
const patientResults = ref<Patient[]>([])
const selectedPatient = ref<Patient | null>(null)
const showPatientDrop = ref(false)
let patientDebounce: ReturnType<typeof setTimeout> | null = null

async function onPatientInput() {
  selectedPatient.value = null
  if (patientDebounce) clearTimeout(patientDebounce)
  if (patientSearch.value.trim().length < 2) {
    patientResults.value = []
    showPatientDrop.value = false
    return
  }
  patientDebounce = setTimeout(async () => {
    try {
      const result = await getPatients({
        search: patientSearch.value,
        pageSize: 8,
        status: "active",
      })
      patientResults.value = result.items
      showPatientDrop.value = patientResults.value.length > 0
    } catch {
      patientResults.value = []
    }
  }, 300)
}

function selectPatient(p: Patient) {
  selectedPatient.value = p
  patientSearch.value = `${p.firstName} ${p.lastName} — ${p.ci}`
  showPatientDrop.value = false
  patientResults.value = []
}

function clearPatient() {
  selectedPatient.value = null
  patientSearch.value = ""
  patientResults.value = []
  showPatientDrop.value = false
}

function onPatientInputBlur() {
  setTimeout(() => {
    showPatientDrop.value = false
  }, 150)
}

// ── Formulario ────────────────────────────────────────────────────────────

const isCreating = ref(false)
const createError = ref("")
const withReceta = ref(false)

const createForm = reactive({
  fechaConsulta: new Date().toISOString().slice(0, 10),
  motivo: "",
  anamnesis: "",
  examenFisico: "",
  diagnosticoPrincipal: "",
  diagnosticoSecundario: "",
  planTratamiento: "",
  observaciones: "",
})

const recetaForm = reactive({
  fechaEmision: new Date().toISOString().slice(0, 10),
  odEsferico: "",
  odCilindro: "",
  odEje: "",
  odAdicion: "",
  oiEsferico: "",
  oiCilindro: "",
  oiEje: "",
  oiAdicion: "",
  distanciaInterpupilar: "",
  avSinCorreccion: "",
  avConCorreccion: "",
  observaciones: "",
})

type CreateErrors = {
  patient?: string
  professional?: string
  fechaConsulta?: string
  motivo?: string
  diagnosticoPrincipal?: string
}
const createErrors = ref<CreateErrors>({})

function validateCreate(): boolean {
  const e: CreateErrors = {}
  if (!selectedPatient.value) e.patient = "Seleccioná un paciente."
  if (!selectedProfessionalId.value) e.professional = "Seleccioná un profesional."
  if (!createForm.fechaConsulta) e.fechaConsulta = "La fecha es obligatoria."
  if (!createForm.motivo.trim()) e.motivo = "El motivo es obligatorio."
  if (!createForm.diagnosticoPrincipal.trim())
    e.diagnosticoPrincipal = "El diagnóstico es obligatorio."
  createErrors.value = e
  return Object.keys(e).length === 0
}

function parseOptional(val: string): number | null {
  const n = parseFloat(val)
  return isNaN(n) ? null : n
}

async function submitCreate() {
  if (isCreating.value || !validateCreate()) return
  isCreating.value = true
  createError.value = ""
  try {
    const payload: CreateConsultaClinicaRequest = {
      patientId: selectedPatient.value!.id,
      professionalId: selectedProfessionalId.value!,
      fechaConsulta: createForm.fechaConsulta,
      motivo: createForm.motivo.trim(),
      anamnesis: createForm.anamnesis.trim() || undefined,
      examenFisico: createForm.examenFisico.trim() || undefined,
      diagnosticoPrincipal: createForm.diagnosticoPrincipal.trim(),
      diagnosticoSecundario: createForm.diagnosticoSecundario.trim() || undefined,
      planTratamiento: createForm.planTratamiento.trim() || undefined,
      observaciones: createForm.observaciones.trim() || undefined,
    }
    if (withReceta.value) {
      payload.receta = {
        fechaEmision: recetaForm.fechaEmision,
        odEsferico: parseOptional(recetaForm.odEsferico),
        odCilindro: parseOptional(recetaForm.odCilindro),
        odEje: parseOptional(recetaForm.odEje),
        odAdicion: parseOptional(recetaForm.odAdicion),
        oiEsferico: parseOptional(recetaForm.oiEsferico),
        oiCilindro: parseOptional(recetaForm.oiCilindro),
        oiEje: parseOptional(recetaForm.oiEje),
        oiAdicion: parseOptional(recetaForm.oiAdicion),
        distanciaInterpupilar: parseOptional(recetaForm.distanciaInterpupilar),
        avSinCorreccion: recetaForm.avSinCorreccion.trim() || undefined,
        avConCorreccion: recetaForm.avConCorreccion.trim() || undefined,
        observaciones: recetaForm.observaciones.trim() || undefined,
      }
    }
    await createConsulta(payload)
    router.push("/clinica/consultas")
  } catch (err: unknown) {
    createError.value = err instanceof Error ? err.message : "Error al registrar la consulta."
  } finally {
    isCreating.value = false
  }
}

function onCancel() {
  router.push("/clinica/consultas")
}

// ── Helpers ───────────────────────────────────────────────────────────────

const AVATAR_PALETTE = [
  { bg: "rgba(0,40,142,0.08)", color: "var(--color-primary)" },
  { bg: "rgba(0,103,128,0.08)", color: "var(--color-secondary)" },
  { bg: "rgba(32,0,177,0.08)", color: "var(--color-tertiary)" },
  { bg: "rgba(117,118,132,0.10)", color: "var(--color-outline)" },
]

function avatarStyle(id: number) {
  return (
    AVATAR_PALETTE[id % AVATAR_PALETTE.length] ??
    AVATAR_PALETTE[0] ?? { bg: "rgba(0,40,142,0.08)", color: "var(--color-primary)" }
  )
}

function initials(fn: string, ln: string) {
  return `${fn[0] ?? ""}${ln[0] ?? ""}`.toUpperCase()
}

function inputStyle(hasError: boolean) {
  return hasError
    ? "border: 1.5px solid var(--color-error); color: var(--color-on-surface); background-color: #FFF8F7;"
    : "border: 1px solid var(--color-outline-variant); color: var(--color-on-surface); background-color: var(--color-surface);"
}

const recetaColumns = [
  { key: "eye", label: "" },
  { key: "esfera", label: "Esfera" },
  { key: "cilindro", label: "Cilindro" },
  { key: "eje", label: "Eje" },
  { key: "adicion", label: "Adición" },
]

const recetaRows = [{ eye: "OD" }, { eye: "OI" }]
</script>

<template>
  <div class="min-h-screen" style="background-color: var(--color-surface)">
    <AppSidebar />
    <AppHeader />

    <main style="margin-left: 280px; padding-top: 64px">
      <div class="p-8">
        <!-- Header -->
        <div class="flex items-center gap-4 mb-8">
          <BaseButton variant="ghost" size="sm" @click="onCancel">
            <span class="material-symbols-outlined" style="font-size: 24px">arrow_back</span>
          </BaseButton>
          <div>
            <h2 class="text-4xl font-extrabold tracking-tight" style="color: var(--color-primary)">
              Nueva Consulta
            </h2>
          </div>
        </div>

        <!-- Error banner -->
        <div
          v-if="createError"
          class="flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium mb-6"
          style="
            background-color: var(--color-error-container);
            color: var(--color-on-error-container);
          "
        >
          <span class="material-symbols-outlined" style="font-size: 18px">error</span>
          {{ createError }}
        </div>

        <form @submit.prevent="submitCreate" class="space-y-6 max-w-5xl">
          <!-- Paciente -->
          <div
            class="rounded-2xl p-6 space-y-5"
            style="
              background-color: var(--color-surface-container-lowest);
              box-shadow: 0 1px 3px rgba(196, 197, 213, 0.25);
              outline: 1px solid rgba(196, 197, 213, 0.15);
            "
          >
            <h3 class="text-lg font-extrabold" style="color: var(--color-on-surface)">Paciente</h3>
            <div class="flex flex-col gap-1.5 relative">
              <label
                class="text-xs font-bold uppercase tracking-wider"
                style="color: var(--color-outline)"
                >Buscar paciente *</label
              >
              <SearchInput
                v-model="patientSearch"
                placeholder="Buscar por nombre o CI..."
                :error="!!createErrors.patient"
                @update:modelValue="onPatientInput"
                @blur="onPatientInputBlur"
              />
              <p
                v-if="createErrors.patient"
                class="text-xs font-medium"
                style="color: var(--color-error)"
              >
                {{ createErrors.patient }}
              </p>
              <div
                v-if="showPatientDrop"
                class="absolute top-full mt-1 w-full rounded-xl shadow-lg z-10 overflow-hidden"
                style="
                  background-color: var(--color-surface-container-lowest);
                  border: 1px solid rgba(196, 197, 213, 0.4);
                "
              >
                <button
                  v-for="p in patientResults"
                  :key="p.id"
                  type="button"
                  @mousedown.prevent="selectPatient(p)"
                  class="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors"
                  onmouseover="this.style.backgroundColor = 'var(--color-surface)'"
                  onmouseout="this.style.backgroundColor = 'transparent'"
                >
                  <div
                    class="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0"
                    :style="`background-color: ${avatarStyle(p.id).bg}; color: ${avatarStyle(p.id).color};`"
                  >
                    {{ initials(p.firstName, p.lastName) }}
                  </div>
                  <div>
                    <div class="text-sm font-semibold" style="color: var(--color-on-surface)">
                      {{ p.firstName }} {{ p.lastName }}
                    </div>
                    <div class="text-xs" style="color: var(--color-outline)">CI {{ p.ci }}</div>
                  </div>
                </button>
              </div>
            </div>
          </div>

          <!-- Consulta -->
          <div
            class="rounded-2xl p-6 space-y-5"
            style="
              background-color: var(--color-surface-container-lowest);
              box-shadow: 0 1px 3px rgba(196, 197, 213, 0.25);
              outline: 1px solid rgba(196, 197, 213, 0.15);
            "
          >
            <h3 class="text-lg font-extrabold" style="color: var(--color-on-surface)">
              Consulta Clínica
            </h3>

            <div class="flex flex-col gap-1.5">
              <label
                class="text-xs font-bold uppercase tracking-wider"
                style="color: var(--color-outline)"
                >Profesional *</label
              >
              <div class="relative">
                <span
                  class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2"
                  style="color: var(--color-outline); font-size: 16px"
                  >person</span
                >
                <select
                  v-model="selectedProfessionalId"
                  class="w-full pl-9 pr-8 py-3 rounded-xl text-sm outline-none appearance-none"
                  :style="inputStyle(!!createErrors.professional)"
                >
                  <option :value="null" disabled>Seleccioná un profesional...</option>
                  <option v-for="pr in professionals" :key="pr.id" :value="pr.id">
                    {{ pr.firstName }} {{ pr.lastName }}
                  </option>
                </select>
              </div>
              <p
                v-if="createErrors.professional"
                class="text-xs font-medium"
                style="color: var(--color-error)"
              >
                {{ createErrors.professional }}
              </p>
            </div>

            <div class="flex flex-col gap-1.5 w-48">
              <label
                class="text-xs font-bold uppercase tracking-wider"
                style="color: var(--color-outline)"
                >Fecha *</label
              >
              <input
                v-model="createForm.fechaConsulta"
                type="date"
                class="px-4 py-3 rounded-xl text-sm outline-none"
                :style="inputStyle(!!createErrors.fechaConsulta)"
              />
              <p
                v-if="createErrors.fechaConsulta"
                class="text-xs font-medium"
                style="color: var(--color-error)"
              >
                {{ createErrors.fechaConsulta }}
              </p>
            </div>

            <div class="flex flex-col gap-1.5">
              <label
                class="text-xs font-bold uppercase tracking-wider"
                style="color: var(--color-outline)"
                >Motivo de consulta *</label
              >
              <input
                v-model="createForm.motivo"
                type="text"
                class="px-4 py-3 rounded-xl text-sm outline-none"
                :style="inputStyle(!!createErrors.motivo)"
              />
              <p
                v-if="createErrors.motivo"
                class="text-xs font-medium"
                style="color: var(--color-error)"
              >
                {{ createErrors.motivo }}
              </p>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div class="flex flex-col gap-1.5">
                <label
                  class="text-xs font-bold uppercase tracking-wider"
                  style="color: var(--color-outline)"
                  >Anamnesis</label
                >
                <textarea
                  v-model="createForm.anamnesis"
                  rows="4"
                  class="px-4 py-3 rounded-xl text-sm outline-none resize-none"
                  :style="inputStyle(false)"
                ></textarea>
              </div>
              <div class="flex flex-col gap-1.5">
                <label
                  class="text-xs font-bold uppercase tracking-wider"
                  style="color: var(--color-outline)"
                  >Examen Físico</label
                >
                <textarea
                  v-model="createForm.examenFisico"
                  rows="4"
                  class="px-4 py-3 rounded-xl text-sm outline-none resize-none"
                  :style="inputStyle(false)"
                ></textarea>
              </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div class="flex flex-col gap-1.5">
                <label
                  class="text-xs font-bold uppercase tracking-wider"
                  style="color: var(--color-outline)"
                  >Diagnóstico Principal *</label
                >
                <input
                  v-model="createForm.diagnosticoPrincipal"
                  type="text"
                  class="px-4 py-3 rounded-xl text-sm outline-none"
                  :style="inputStyle(!!createErrors.diagnosticoPrincipal)"
                />
                <p
                  v-if="createErrors.diagnosticoPrincipal"
                  class="text-xs font-medium"
                  style="color: var(--color-error)"
                >
                  {{ createErrors.diagnosticoPrincipal }}
                </p>
              </div>
              <div class="flex flex-col gap-1.5">
                <label
                  class="text-xs font-bold uppercase tracking-wider"
                  style="color: var(--color-outline)"
                  >Diagnóstico Secundario</label
                >
                <input
                  v-model="createForm.diagnosticoSecundario"
                  type="text"
                  class="px-4 py-3 rounded-xl text-sm outline-none"
                  :style="inputStyle(false)"
                />
              </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div class="flex flex-col gap-1.5">
                <label
                  class="text-xs font-bold uppercase tracking-wider"
                  style="color: var(--color-outline)"
                  >Plan de Tratamiento</label
                >
                <textarea
                  v-model="createForm.planTratamiento"
                  rows="4"
                  class="px-4 py-3 rounded-xl text-sm outline-none resize-none"
                  :style="inputStyle(false)"
                ></textarea>
              </div>
              <div class="flex flex-col gap-1.5">
                <label
                  class="text-xs font-bold uppercase tracking-wider"
                  style="color: var(--color-outline)"
                  >Observaciones</label
                >
                <textarea
                  v-model="createForm.observaciones"
                  rows="4"
                  class="px-4 py-3 rounded-xl text-sm outline-none resize-none"
                  :style="inputStyle(false)"
                ></textarea>
              </div>
            </div>
          </div>

          <!-- Toggle receta -->
          <div
            class="flex items-center justify-between px-6 py-4 rounded-2xl"
            style="background-color: var(--color-surface-container-low)"
          >
            <div class="flex items-center gap-2">
              <span
                class="material-symbols-outlined"
                style="color: var(--color-secondary); font-size: 18px"
                >medical_services</span
              >
              <span class="text-sm font-semibold" style="color: var(--color-on-surface-variant)"
                >Incluir receta óptica</span
              >
            </div>
            <button
              type="button"
              @click="withReceta = !withReceta"
              class="relative w-12 h-6 rounded-full transition-all"
              :style="
                withReceta
                  ? 'background-color: var(--color-secondary);'
                  : 'background-color: var(--color-outline-variant);'
              "
            >
              <span
                class="absolute top-1 w-4 h-4 rounded-full bg-white transition-all"
                :style="withReceta ? 'left: calc(100% - 1.25rem);' : 'left: 0.25rem;'"
              ></span>
            </button>
          </div>

          <!-- Receta óptica -->
          <div
            v-if="withReceta"
            class="rounded-2xl p-6 space-y-5"
            style="
              background-color: var(--color-surface-container-lowest);
              box-shadow: 0 1px 3px rgba(196, 197, 213, 0.25);
              outline: 1px solid rgba(196, 197, 213, 0.15);
            "
          >
            <div class="flex items-center gap-2 mb-2">
              <span
                class="material-symbols-outlined"
                style="color: var(--color-secondary); font-size: 18px"
                >visibility</span
              >
              <span
                class="text-xs font-bold uppercase tracking-wider"
                style="color: var(--color-secondary)"
                >Prescripción óptica</span
              >
            </div>

            <div class="flex flex-col gap-1.5">
              <label
                class="text-xs font-bold uppercase tracking-wider"
                style="color: var(--color-outline)"
                >Fecha de Emisión</label
              >
              <input
                v-model="recetaForm.fechaEmision"
                type="date"
                class="px-4 py-2.5 rounded-xl text-sm outline-none w-48"
                :style="inputStyle(false)"
              />
            </div>

            <div class="overflow-x-auto">
              <BaseTable :columns="recetaColumns" :items="recetaRows" :loading="false">
                <template #eye="{ item }">
                  <span class="font-bold" style="color: var(--color-on-surface)">{{
                    item.eye
                  }}</span>
                </template>
                <template #esfera="{ item }">
                  <input
                    v-if="item.eye === 'OD'"
                    v-model="recetaForm.odEsferico"
                    type="text"
                    placeholder="+0.00"
                    class="w-20 px-2 py-2 rounded-lg text-sm outline-none"
                    :style="inputStyle(false)"
                  />
                  <input
                    v-else
                    v-model="recetaForm.oiEsferico"
                    type="text"
                    placeholder="+0.00"
                    class="w-20 px-2 py-2 rounded-lg text-sm outline-none"
                    :style="inputStyle(false)"
                  />
                </template>
                <template #cilindro="{ item }">
                  <input
                    v-if="item.eye === 'OD'"
                    v-model="recetaForm.odCilindro"
                    type="text"
                    placeholder="-0.00"
                    class="w-20 px-2 py-2 rounded-lg text-sm outline-none"
                    :style="inputStyle(false)"
                  />
                  <input
                    v-else
                    v-model="recetaForm.oiCilindro"
                    type="text"
                    placeholder="-0.00"
                    class="w-20 px-2 py-2 rounded-lg text-sm outline-none"
                    :style="inputStyle(false)"
                  />
                </template>
                <template #eje="{ item }">
                  <input
                    v-if="item.eye === 'OD'"
                    v-model="recetaForm.odEje"
                    type="text"
                    placeholder="0"
                    class="w-20 px-2 py-2 rounded-lg text-sm outline-none"
                    :style="inputStyle(false)"
                  />
                  <input
                    v-else
                    v-model="recetaForm.oiEje"
                    type="text"
                    placeholder="0"
                    class="w-20 px-2 py-2 rounded-lg text-sm outline-none"
                    :style="inputStyle(false)"
                  />
                </template>
                <template #adicion="{ item }">
                  <input
                    v-if="item.eye === 'OD'"
                    v-model="recetaForm.odAdicion"
                    type="text"
                    placeholder="+0.00"
                    class="w-20 px-2 py-2 rounded-lg text-sm outline-none"
                    :style="inputStyle(false)"
                  />
                  <input
                    v-else
                    v-model="recetaForm.oiAdicion"
                    type="text"
                    placeholder="+0.00"
                    class="w-20 px-2 py-2 rounded-lg text-sm outline-none"
                    :style="inputStyle(false)"
                  />
                </template>
              </BaseTable>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div class="flex flex-col gap-1.5">
                <label
                  class="text-xs font-bold uppercase tracking-wider"
                  style="color: var(--color-outline)"
                  >Distancia Interpupilar</label
                >
                <input
                  v-model="recetaForm.distanciaInterpupilar"
                  type="text"
                  placeholder="mm"
                  class="px-4 py-2.5 rounded-xl text-sm outline-none"
                  :style="inputStyle(false)"
                />
              </div>
              <div class="flex flex-col gap-1.5">
                <label
                  class="text-xs font-bold uppercase tracking-wider"
                  style="color: var(--color-outline)"
                  >AV sin corrección</label
                >
                <input
                  v-model="recetaForm.avSinCorreccion"
                  type="text"
                  placeholder="20/20"
                  class="px-4 py-2.5 rounded-xl text-sm outline-none"
                  :style="inputStyle(false)"
                />
              </div>
              <div class="flex flex-col gap-1.5">
                <label
                  class="text-xs font-bold uppercase tracking-wider"
                  style="color: var(--color-outline)"
                  >AV con corrección</label
                >
                <input
                  v-model="recetaForm.avConCorreccion"
                  type="text"
                  placeholder="20/20"
                  class="px-4 py-2.5 rounded-xl text-sm outline-none"
                  :style="inputStyle(false)"
                />
              </div>
            </div>

            <div class="flex flex-col gap-1.5">
              <label
                class="text-xs font-bold uppercase tracking-wider"
                style="color: var(--color-outline)"
                >Observaciones</label
              >
              <textarea
                v-model="recetaForm.observaciones"
                rows="2"
                class="px-4 py-3 rounded-xl text-sm outline-none resize-none"
                :style="inputStyle(false)"
              ></textarea>
            </div>
          </div>

          <!-- Actions -->
          <div class="flex justify-end gap-3 pt-4">
            <BaseButton variant="secondary" size="lg" @click="onCancel">Cancelar</BaseButton>
            <BaseButton variant="primary" size="lg" type="submit" :disabled="isCreating">
              <svg
                v-if="isCreating"
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
              {{ isCreating ? "Guardando..." : "Guardar Consulta" }}
            </BaseButton>
          </div>
        </form>
      </div>
    </main>
  </div>
</template>
