<script setup lang="ts">
import { ref, reactive, computed, onMounted } from "vue"
import { useRouter, useRoute } from "vue-router"
import AppSidebar from "@/components/AppSidebar.vue"
import AppHeader from "@/components/AppHeader.vue"
import BaseButton from "@/components/BaseButton.vue"
import BaseTable from "@/components/BaseTable.vue"
import DateInput from "@/components/DateInput.vue"
import { useAuthStore } from "@/stores/auth"
import { type ConsultaClinica, getConsultaById, updateConsulta, createOrUpdateReceta, type UpdateConsultaClinicaRequest } from "@/services/clinicaService"

const auth = useAuthStore()
const router = useRouter()
const route = useRoute()

const consultaId = computed(() => Number(route.params.id))

// ── Datos de la consulta ─────────────────────────────────────────────────

const consulta = ref<ConsultaClinica | null>(null)
const isLoading = ref(true)
const loadError = ref("")

onMounted(async () => {
  try {
    consulta.value = await getConsultaById(consultaId.value)
    populateForm()
  } catch (err: unknown) {
    loadError.value = err instanceof Error ? err.message : "Error al cargar la consulta."
  } finally {
    isLoading.value = false
  }
})

function populateForm() {
  if (!consulta.value) return
  editForm.fechaConsulta = consulta.value.fechaConsulta
  editForm.motivo = consulta.value.motivo
  editForm.anamnesis = consulta.value.anamnesis ?? ""
  editForm.examenFisico = consulta.value.examenFisico ?? ""
  editForm.diagnosticoPrincipal = consulta.value.diagnosticoPrincipal
  editForm.diagnosticoSecundario = consulta.value.diagnosticoSecundario ?? ""
  editForm.planTratamiento = consulta.value.planTratamiento ?? ""
  editForm.observaciones = consulta.value.observaciones ?? ""

  if (consulta.value.receta) {
    withReceta.value = true
    recetaForm.fechaEmision = consulta.value.receta.fechaEmision
    recetaForm.odEsferico = consulta.value.receta.odEsferico?.toString() ?? ""
    recetaForm.odCilindro = consulta.value.receta.odCilindro?.toString() ?? ""
    recetaForm.odEje = consulta.value.receta.odEje?.toString() ?? ""
    recetaForm.odAdicion = consulta.value.receta.odAdicion?.toString() ?? ""
    recetaForm.oiEsferico = consulta.value.receta.oiEsferico?.toString() ?? ""
    recetaForm.oiCilindro = consulta.value.receta.oiCilindro?.toString() ?? ""
    recetaForm.oiEje = consulta.value.receta.oiEje?.toString() ?? ""
    recetaForm.oiAdicion = consulta.value.receta.oiAdicion?.toString() ?? ""
    recetaForm.distanciaInterpupilar = consulta.value.receta.distanciaInterpupilar?.toString() ?? ""
    recetaForm.avSinCorreccion = consulta.value.receta.avSinCorreccion ?? ""
    recetaForm.avConCorreccion = consulta.value.receta.avConCorreccion ?? ""
    recetaForm.observaciones = consulta.value.receta.observaciones ?? ""
  }

  if (consulta.value.anamnesis || consulta.value.examenFisico || consulta.value.diagnosticoSecundario || consulta.value.planTratamiento || consulta.value.observaciones) {
    withDetails.value = true
  }
}

// ── Formulario ────────────────────────────────────────────────────────────

const isSaving = ref(false)
const saveError = ref("")
const withReceta = ref(false)
const withDetails = ref(false)

const editForm = reactive({
  fechaConsulta: "",
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

type EditErrors = {
  fechaConsulta?: string
  motivo?: string
  diagnosticoPrincipal?: string
}
const editErrors = ref<EditErrors>({})

function validateEdit(): boolean {
  const e: EditErrors = {}
  if (!editForm.fechaConsulta) e.fechaConsulta = "La fecha es obligatoria."
  if (!editForm.motivo.trim()) e.motivo = "El motivo es obligatorio."
  if (!editForm.diagnosticoPrincipal.trim())
    e.diagnosticoPrincipal = "El diagnóstico es obligatorio."
  editErrors.value = e
  return Object.keys(e).length === 0
}

function parseOptional(val: string): number | null {
  const n = parseFloat(val)
  return isNaN(n) ? null : n
}

async function submitEdit() {
  if (isSaving.value || !validateEdit()) return
  isSaving.value = true
  saveError.value = ""
  try {
    const payload: UpdateConsultaClinicaRequest = {
      professionalId: consulta.value!.professionalId,
      fechaConsulta: editForm.fechaConsulta,
      motivo: editForm.motivo.trim(),
      anamnesis: editForm.anamnesis.trim() || undefined,
      examenFisico: editForm.examenFisico.trim() || undefined,
      diagnosticoPrincipal: editForm.diagnosticoPrincipal.trim(),
      diagnosticoSecundario: editForm.diagnosticoSecundario.trim() || undefined,
      planTratamiento: editForm.planTratamiento.trim() || undefined,
      observaciones: editForm.observaciones.trim() || undefined,
    }
    await updateConsulta(consultaId.value, payload)
    if (withReceta.value) {
      await createOrUpdateReceta(consultaId.value, {
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
      })
    }
    router.push("/clinica/consultas")
  } catch (err: unknown) {
    saveError.value = err instanceof Error ? err.message : "Error al guardar la consulta."
  } finally {
    isSaving.value = false
  }
}

function onCancel() {
  router.push("/clinica/consultas")
}

// ── Helpers ───────────────────────────────────────────────────────────────

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
              Editar Consulta
            </h2>
          </div>
        </div>

        <!-- Loading -->
        <div v-if="isLoading" class="flex items-center justify-center py-20">
          <span class="material-symbols-outlined animate-spin text-4xl" style="color: var(--color-primary)">progress_activity</span>
        </div>

        <!-- Error de carga -->
        <div v-else-if="loadError" class="flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium"
          style="background-color: var(--color-error-container); color: var(--color-on-error-container)">
          <span class="material-symbols-outlined" style="font-size: 18px">error</span>
          {{ loadError }}
        </div>

        <form v-else @submit.prevent="submitEdit" class="space-y-6">
          <!-- Paciente y Profesional (locked, en la misma fila) -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  Paciente
                </label>
                <div
                  class="flex items-center gap-2 px-4 h-12 text-sm"
                  style="
                    border-radius: 12px;
                    border: 1px solid var(--color-outline-variant);
                    background-color: var(--color-surface-container-low);
                    color: var(--color-on-surface-variant);
                  "
                >
                  <span class="material-symbols-outlined" style="font-size: 16px; color: var(--color-outline)">person</span>
                  {{ consulta?.patientFirstName }} {{ consulta?.patientLastName }}
                </div>
              </div>
            </div>

            <div
              class="rounded-2xl p-6 space-y-5"
              style="
                background-color: var(--color-surface-container-lowest);
                box-shadow: var(--shadow-sm);
                outline: 1px solid var(--color-hairline);
              "
            >
              <h3 class="text-lg font-extrabold" style="color: var(--color-on-surface)">
                Profesional
              </h3>
              <div class="flex flex-col gap-1.5">
                <label
                  class="text-xs font-bold uppercase tracking-wider"
                  style="color: var(--color-outline)"
                >Profesional</label>
                <div
                  class="flex items-center gap-2 px-4 h-12 text-sm"
                  style="
                    border-radius: 12px;
                    border: 1px solid var(--color-outline-variant);
                    background-color: var(--color-surface-container-low);
                    color: var(--color-on-surface-variant);
                  "
                >
                  <span class="material-symbols-outlined" style="font-size: 16px; color: var(--color-outline)">person</span>
                  {{ consulta?.professionalFirstName }} {{ consulta?.professionalLastName }}
                </div>
              </div>
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
              Datos de la Consulta
            </h3>

            <div class="flex flex-col gap-1.5 w-48">
              <label
                class="text-xs font-bold uppercase tracking-wider"
                style="color: var(--color-outline)"
                >Fecha *</label
              >
              <DateInput v-model="editForm.fechaConsulta" :has-error="!!editErrors.fechaConsulta" />
              <p
                v-if="editErrors.fechaConsulta"
                class="text-xs font-medium"
                style="color: var(--color-error)"
              >
                {{ editErrors.fechaConsulta }}
              </p>
            </div>

            <div class="flex flex-col gap-1.5">
              <label
                class="text-xs font-bold uppercase tracking-wider"
                style="color: var(--color-outline)"
                >Motivo de consulta *</label
              >
              <input
                v-model="editForm.motivo"
                type="text"
                class="px-4 h-12 text-sm outline-none appearance-none shadow-none"
                :style="inputStyle(!!editErrors.motivo)"
              />
              <p
                v-if="editErrors.motivo"
                class="text-xs font-medium"
                style="color: var(--color-error)"
              >
                {{ editErrors.motivo }}
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
                  v-model="editForm.anamnesis"
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
                  v-model="editForm.examenFisico"
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
                  v-model="editForm.diagnosticoPrincipal"
                  type="text"
                  class="px-4 h-12 text-sm outline-none appearance-none shadow-none"
                  :style="inputStyle(!!editErrors.diagnosticoPrincipal)"
                />
                <p
                  v-if="editErrors.diagnosticoPrincipal"
                  class="text-xs font-medium"
                  style="color: var(--color-error)"
                >
                  {{ editErrors.diagnosticoPrincipal }}
                </p>
              </div>
              <div v-if="withDetails" class="flex flex-col gap-1.5">
                <label
                  class="text-xs font-bold uppercase tracking-wider"
                  style="color: var(--color-outline)"
                  >Diagnóstico Secundario</label
                >
                <input
                  v-model="editForm.diagnosticoSecundario"
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
                  v-model="editForm.planTratamiento"
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
                  v-model="editForm.observaciones"
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

          <!-- Error banner -->
          <div
            v-if="saveError"
            class="flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium"
            style="
              background-color: var(--color-error-container);
              color: var(--color-on-error-container);
            "
          >
            <span class="material-symbols-outlined" style="font-size: 18px">error</span>
            {{ saveError }}
          </div>

          <!-- Actions -->
          <div class="flex justify-end gap-3 pt-4">
            <BaseButton variant="secondary" size="lg" @click="onCancel">Cancelar</BaseButton>
            <BaseButton variant="primary" size="lg" type="submit" :disabled="isSaving">
              <svg
                v-if="isSaving"
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
              {{ isSaving ? "Guardando..." : "Guardar Cambios" }}
            </BaseButton>
          </div>
        </form>
      </div>
    </main>
  </div>
</template>