<script setup lang="ts">
import { ref, reactive, computed, onMounted } from "vue"
import { useRouter, useRoute } from "vue-router"
import AppSidebar from "@/components/AppSidebar.vue"
import AppHeader from "@/components/AppHeader.vue"
import BaseButton from "@/components/BaseButton.vue"
import BaseTable from "@/components/BaseTable.vue"
import DateInput from "@/components/DateInput.vue"
import SearchableSelect from "@/components/SearchableSelect.vue"
import { useAuthStore } from "@/stores/auth"
import { type CreateConsultaClinicaRequest, createConsulta } from "@/services/clinicaService"
import { getPatients, type Patient } from "@/services/patientService"
import { getProfessionals, type Professional } from "@/services/professionalService"

const auth = useAuthStore()
const router = useRouter()
const route = useRoute()

const turnoId = ref<number | null>(
  route.query.turnoId ? Number(route.query.turnoId) : null,
)

const consultaId = ref<number | null>(
  route.query.consultaId ? Number(route.query.consultaId) : null,
)

const isFromReception = computed(() => !!consultaId.value)

// ── Profesionales ─────────────────────────────────────────────────────────

const isProfessional = computed(() => !!auth.user?.professionalId)
const professionals = ref<Professional[]>([])
const selectedProfessionalId = ref<number | null>(auth.user?.professionalId ?? null)

// ── Pacientes ─────────────────────────────────────────────────────────────

const patients = ref<Patient[]>([])
const selectedPatientId = ref<number | null>(null)

const selectedPatient = computed(() =>
  patients.value.find(p => p.id === selectedPatientId.value) ?? null,
)

const patientOptions = computed(() =>
  patients.value.map(p => ({
    value: p.id,
    label: `${p.firstName} ${p.lastName}`,
    code: p.ci,
  })),
)

onMounted(async () => {
  const tasks: Promise<unknown>[] = []

  if (!isProfessional.value) {
    tasks.push(
      getProfessionals()
        .then((p) => { professionals.value = p })
        .catch(() => {}),
    )
  }

  tasks.push(
    getPatients({ pageSize: 500, status: "active" })
      .then((res) => {
        patients.value = res.items
        const prePatientId = route.query.patientId ? Number(route.query.patientId) : null
        if (prePatientId) selectedPatientId.value = prePatientId
      })
      .catch(() => {}),
  )

  await Promise.all(tasks)

  if (route.query.motivo) {
    createForm.motivo = String(route.query.motivo)
  }
})


// ── Formulario ────────────────────────────────────────────────────────────

const isCreating = ref(false)
const createError = ref("")
const withReceta = ref(false)
const withDetails = ref(false)

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
  if (!isProfessional.value && !selectedProfessionalId.value)
    e.professional = "Seleccioná un profesional."
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
      citaId: turnoId.value ?? undefined,
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
  { bg: "color-mix(in srgb, var(--color-primary) 10%, transparent)", color: "var(--color-primary)" },
  { bg: "color-mix(in srgb, var(--color-secondary) 10%, transparent)", color: "var(--color-secondary)" },
  { bg: "color-mix(in srgb, var(--color-tertiary) 10%, transparent)", color: "var(--color-tertiary)" },
  { bg: "color-mix(in srgb, var(--color-outline) 14%, transparent)", color: "var(--color-outline)" },
]

function avatarStyle(id: number) {
  return (
    AVATAR_PALETTE[id % AVATAR_PALETTE.length] ??
    AVATAR_PALETTE[0] ?? { bg: "color-mix(in srgb, var(--color-primary) 10%, transparent)", color: "var(--color-primary)" }
  )
}

function initials(fn: string, ln: string) {
  return `${fn[0] ?? ""}${ln[0] ?? ""}`.toUpperCase()
}

const professionalOptions = computed(() =>
  professionals.value.map(p => ({ value: p.id, label: `${p.firstName} ${p.lastName}` })),
)

function inputStyle(hasError: boolean) {
  const base = "border-radius: 12px; "
  return hasError
    ? base + "border: 1.5px solid var(--color-error); color: var(--color-on-surface); background-color: color-mix(in srgb, var(--color-error) 8%, var(--color-surface));"
    : base + "border: 1px solid var(--color-outline-variant); color: var(--color-on-surface); background-color: var(--color-surface);"
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

    <main style="margin-left: var(--sidebar-width); transition: margin-left 0.25s ease; padding-top: 64px">
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

        <form @submit.prevent="submitCreate" class="space-y-6">
          <!-- Paciente -->
          <div
            class="rounded-2xl p-6 space-y-5"
            style="
              background-color: var(--color-surface-container-lowest);
              box-shadow: var(--shadow-sm);
              outline: 1px solid var(--color-hairline);
            "
          >
            <h3 class="text-lg font-extrabold" style="color: var(--color-on-surface)">Paciente</h3>
            <div class="flex flex-col gap-1.5">
              <label class="text-xs font-bold uppercase tracking-wider" style="color: var(--color-outline)">
                Paciente *
              </label>
              <div
                v-if="isFromReception"
                class="flex items-center gap-2 px-4 h-12 text-sm"
                style="
                  border-radius: 12px;
                  border: 1px solid var(--color-outline-variant);
                  background-color: var(--color-surface-container-low);
                  color: var(--color-on-surface-variant);
                "
              >
                <span class="material-symbols-outlined" style="font-size: 16px; color: var(--color-outline)">person</span>
                {{ selectedPatient?.firstName }} {{ selectedPatient?.lastName }}
              </div>
              <SearchableSelect
                v-else
                :model-value="selectedPatientId"
                :options="patientOptions"
                placeholder="Buscar por nombre o CI..."
                @update:model-value="selectedPatientId = $event as number | null"
              />
              <p v-if="createErrors.patient && !isFromReception" class="text-xs font-medium" style="color: var(--color-error)">
                {{ createErrors.patient }}
              </p>
            </div>
          </div>

          <!-- Consulta -->
          <div
            class="rounded-2xl p-6 space-y-5"
            style="
              background-color: var(--color-surface-container-lowest);
              box-shadow: var(--shadow-sm);
              outline: 1px solid var(--color-hairline);
            "
          >
            <h3 class="text-lg font-extrabold" style="color: var(--color-on-surface)">
              Consulta Clínica
            </h3>

            <div class="flex flex-col gap-1.5">
              <label
                class="text-xs font-bold uppercase tracking-wider"
                style="color: var(--color-outline)"
                >Profesional</label
              >

              <!-- Profesional logueado: solo lectura -->
              <div
                v-if="isProfessional"
                class="flex items-center gap-2 px-4 h-12 text-sm appearance-none shadow-none"
                style="
                  border-radius: 12px;
                  border: 1px solid var(--color-outline-variant);
                  background-color: var(--color-surface-container-low);
                  color: var(--color-on-surface-variant);
                "
              >
                <span class="material-symbols-outlined" style="font-size: 16px; color: var(--color-outline)">person</span>
                {{ auth.user?.firstName }} {{ auth.user?.lastName }}
              </div>

              <!-- Admin: selector -->
              <div v-else>
                <SearchableSelect
                  :model-value="selectedProfessionalId"
                  :options="professionalOptions"
                  placeholder="Buscar profesional..."
                  @update:model-value="selectedProfessionalId = $event as number | null"
                />
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
              <DateInput v-model="createForm.fechaConsulta" :has-error="!!createErrors.fechaConsulta" />
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
                class="px-4 h-12 text-sm outline-none appearance-none shadow-none"
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

            <!-- Toggle detalles -->
            <div
              class="flex items-center justify-between px-5 py-3.5 rounded-xl"
              style="background-color: var(--color-surface-container-low)"
            >
              <div class="flex items-center gap-2">
                <span
                  class="material-symbols-outlined"
                  style="color: var(--color-primary); font-size: 18px"
                  >clinical_notes</span
                >
                <span class="text-sm font-semibold" style="color: var(--color-on-surface-variant)"
                  >Incluir detalles de consulta</span
                >
              </div>
              <button
                type="button"
                @click="withDetails = !withDetails"
                class="relative w-11 h-6 rounded-full transition-all"
                :style="
                  withDetails
                    ? 'background-color: var(--color-primary);'
                    : 'background-color: var(--color-outline-variant);'
                "
              >
                <span
                  class="absolute top-1 w-4 h-4 rounded-full bg-white transition-all"
                  :style="withDetails ? 'left: calc(100% - 1.25rem);' : 'left: 0.25rem;'"
                ></span>
              </button>
            </div>

            <div v-if="withDetails" class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div class="flex flex-col gap-1.5">
                <label
                  class="text-xs font-bold uppercase tracking-wider"
                  style="color: var(--color-outline)"
                  >Anamnesis</label
                >
                <textarea
                  v-model="createForm.anamnesis"
                  rows="4"
                  class="px-4 py-3 text-sm outline-none appearance-none shadow-none resize-none"
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
                  class="px-4 py-3 text-sm outline-none appearance-none shadow-none resize-none"
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
                  class="px-4 h-12 text-sm outline-none appearance-none shadow-none"
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
              <div v-if="withDetails" class="flex flex-col gap-1.5">
                <label
                  class="text-xs font-bold uppercase tracking-wider"
                  style="color: var(--color-outline)"
                  >Diagnóstico Secundario</label
                >
                <input
                  v-model="createForm.diagnosticoSecundario"
                  type="text"
                  class="px-4 h-12 text-sm outline-none appearance-none shadow-none"
                  :style="inputStyle(false)"
                />
              </div>
              <div v-if="!withDetails"></div>
            </div>

            <div v-if="withDetails" class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div class="flex flex-col gap-1.5">
                <label
                  class="text-xs font-bold uppercase tracking-wider"
                  style="color: var(--color-outline)"
                  >Plan de Tratamiento</label
                >
                <textarea
                  v-model="createForm.planTratamiento"
                  rows="4"
                  class="px-4 py-3 text-sm outline-none appearance-none shadow-none resize-none"
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
                  class="px-4 py-3 text-sm outline-none appearance-none shadow-none resize-none"
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
              box-shadow: var(--shadow-sm);
              outline: 1px solid var(--color-hairline);
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
              <DateInput v-model="recetaForm.fechaEmision" />
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
                    class="w-20 px-2 py-2 text-sm outline-none appearance-none shadow-none"
                    :style="inputStyle(false)"
                  />
                  <input
                    v-else
                    v-model="recetaForm.oiEsferico"
                    type="text"
                    placeholder="+0.00"
                    class="w-20 px-2 py-2 text-sm outline-none appearance-none shadow-none"
                    :style="inputStyle(false)"
                  />
                </template>
                <template #cilindro="{ item }">
                  <input
                    v-if="item.eye === 'OD'"
                    v-model="recetaForm.odCilindro"
                    type="text"
                    placeholder="-0.00"
                    class="w-20 px-2 py-2 text-sm outline-none appearance-none shadow-none"
                    :style="inputStyle(false)"
                  />
                  <input
                    v-else
                    v-model="recetaForm.oiCilindro"
                    type="text"
                    placeholder="-0.00"
                    class="w-20 px-2 py-2 text-sm outline-none appearance-none shadow-none"
                    :style="inputStyle(false)"
                  />
                </template>
                <template #eje="{ item }">
                  <input
                    v-if="item.eye === 'OD'"
                    v-model="recetaForm.odEje"
                    type="text"
                    placeholder="0"
                    class="w-20 px-2 py-2 text-sm outline-none appearance-none shadow-none"
                    :style="inputStyle(false)"
                  />
                  <input
                    v-else
                    v-model="recetaForm.oiEje"
                    type="text"
                    placeholder="0"
                    class="w-20 px-2 py-2 text-sm outline-none appearance-none shadow-none"
                    :style="inputStyle(false)"
                  />
                </template>
                <template #adicion="{ item }">
                  <input
                    v-if="item.eye === 'OD'"
                    v-model="recetaForm.odAdicion"
                    type="text"
                    placeholder="+0.00"
                    class="w-20 px-2 py-2 text-sm outline-none appearance-none shadow-none"
                    :style="inputStyle(false)"
                  />
                  <input
                    v-else
                    v-model="recetaForm.oiAdicion"
                    type="text"
                    placeholder="+0.00"
                    class="w-20 px-2 py-2 text-sm outline-none appearance-none shadow-none"
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
                  class="px-4 h-12 text-sm outline-none appearance-none shadow-none"
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
                  class="px-4 h-12 text-sm outline-none appearance-none shadow-none"
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
                  class="px-4 h-12 text-sm outline-none appearance-none shadow-none"
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
                class="px-4 py-3 text-sm outline-none appearance-none shadow-none resize-none"
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

<style scoped>
:deep(.ss-trigger) {
  height: 48px;
  border-radius: 12px;
  font-size: 14px;
  background-color: var(--color-surface);
  border-color: var(--color-outline-variant);
}
</style>
