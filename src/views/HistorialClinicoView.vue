<script setup lang="ts">
import { ref, computed, watch, onMounted } from "vue"
import AppSidebar from "@/components/AppSidebar.vue"
import AppHeader from "@/components/AppHeader.vue"
import SearchInput from "@/components/SearchInput.vue"
import BaseTable from "@/components/BaseTable.vue"
import { useAuthStore } from "@/stores/auth"
import { type ConsultaClinica, getConsultasByPatient } from "@/services/clinicaService"
import { getPatients, type Patient } from "@/services/patientService"

const auth = useAuthStore()

// ── Patient search ────────────────────────────────────────────────────────

const patientSearch = ref("")
const patientResults = ref<Patient[]>([])
const selectedPatient = ref<Patient | null>(null)
const showPatientDrop = ref(false)
let patientDebounce: ReturnType<typeof setTimeout> | null = null

async function onPatientInput() {
  selectedPatient.value = null
  historyLoaded.value = false
  consultas.value = []
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
  loadHistory()
}

function clearPatient() {
  selectedPatient.value = null
  patientSearch.value = ""
  patientResults.value = []
  showPatientDrop.value = false
  consultas.value = []
  historyLoaded.value = false
}

function onPatientInputBlur() {
  setTimeout(() => {
    showPatientDrop.value = false
  }, 150)
}

// ── History ───────────────────────────────────────────────────────────────

const consultas = ref<ConsultaClinica[]>([])
const isLoading = ref(false)
const historyLoaded = ref(false)
const loadError = ref("")

async function loadHistory() {
  if (!selectedPatient.value) return
  isLoading.value = true
  loadError.value = ""
  try {
    const result = await getConsultasByPatient(selectedPatient.value.id)
    consultas.value = result
    historyLoaded.value = true
  } catch (err: unknown) {
    loadError.value = err instanceof Error ? err.message : "Error al cargar historial."
  } finally {
    isLoading.value = false
  }
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

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

const recetaColumns = [
  { key: "eye", label: "" },
  { key: "esfera", label: "Esfera" },
  { key: "cilindro", label: "Cilindro" },
  { key: "eje", label: "Eje" },
  { key: "adicion", label: "Adición" },
]
</script>

<template>
  <div class="min-h-screen" style="background-color: var(--color-surface)">
    <AppSidebar />
    <AppHeader />

    <main style="margin-left: 280px; padding-top: 64px">
      <div class="p-8">
        <!-- Page header -->
        <div class="mb-8">
          <h1 class="text-4xl font-extrabold tracking-tight mb-2">Historial Clínico</h1>
          <p class="font-medium" style="color: var(--color-on-surface-variant)">
            Consultá el historial completo de un paciente.
          </p>
        </div>

        <!-- Patient selector -->
        <div class="max-w-xl mb-8">
          <div class="flex flex-col gap-1.5 relative">
            <label
              class="text-xs font-bold uppercase tracking-wider"
              style="color: var(--color-outline)"
              >Buscar paciente</label
            >
            <SearchInput
              v-model="patientSearch"
              placeholder="Buscar por nombre o CI..."
              @update:modelValue="onPatientInput"
              @blur="onPatientInputBlur"
            />
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

        <!-- Patient hero card -->
        <div
          v-if="selectedPatient"
          class="flex items-center gap-4 rounded-2xl px-6 py-5 mb-8"
          style="
            background-color: var(--color-surface-container-lowest);
            box-shadow: 0 1px 3px rgba(196, 197, 213, 0.25);
            outline: 1px solid rgba(196, 197, 213, 0.15);
          "
        >
          <div
            class="w-12 h-12 rounded-full flex items-center justify-center text-sm font-black flex-shrink-0"
            :style="`background-color: ${avatarStyle(selectedPatient.id).bg}; color: ${avatarStyle(selectedPatient.id).color};`"
          >
            {{ initials(selectedPatient.firstName, selectedPatient.lastName) }}
          </div>
          <div>
            <div class="text-lg font-extrabold" style="color: var(--color-on-surface)">
              {{ selectedPatient.firstName }} {{ selectedPatient.lastName }}
            </div>
            <div class="text-sm" style="color: var(--color-outline)">
              CI {{ selectedPatient.ci }}
            </div>
          </div>
        </div>

        <!-- Loading -->
        <div v-if="isLoading" class="flex justify-center py-20">
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

        <!-- Error -->
        <div
          v-else-if="loadError"
          class="flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium"
          style="
            background-color: var(--color-error-container);
            color: var(--color-on-error-container);
          "
        >
          <span class="material-symbols-outlined" style="font-size: 18px">error</span>
          {{ loadError }}
        </div>

        <!-- Empty -->
        <div
          v-else-if="historyLoaded && consultas.length === 0"
          class="rounded-2xl py-16 text-center"
          style="
            background-color: var(--color-surface-container-lowest);
            box-shadow: 0 1px 3px rgba(196, 197, 213, 0.25);
          "
        >
          <span
            class="material-symbols-outlined block mx-auto mb-3"
            style="color: var(--color-outline-variant); font-size: 48px"
            >medical_information</span
          >
          <p class="text-sm font-semibold mb-1" style="color: var(--color-outline)">
            Sin consultas registradas
          </p>
          <p class="text-xs" style="color: var(--color-outline-variant)">
            Este paciente no tiene historial clínico aún.
          </p>
        </div>

        <!-- Timeline -->
        <div v-else-if="consultas.length" class="space-y-4">
          <div
            v-for="c in consultas"
            :key="c.id"
            class="rounded-2xl p-6"
            style="
              background-color: var(--color-surface-container-lowest);
              box-shadow: 0 1px 3px rgba(196, 197, 213, 0.25);
              outline: 1px solid rgba(196, 197, 213, 0.15);
            "
          >
            <div class="flex flex-wrap items-start justify-between gap-4 mb-4">
              <div>
                <div class="flex items-center gap-2 mb-1">
                  <span
                    class="material-symbols-outlined"
                    style="color: var(--color-primary); font-size: 18px"
                    >event</span
                  >
                  <span class="text-sm font-bold" style="color: var(--color-primary)">{{
                    formatDate(c.fechaConsulta)
                  }}</span>
                </div>
                <div class="text-xs font-medium" style="color: var(--color-outline)">
                  Profesional:
                  <span style="color: var(--color-on-surface-variant)"
                    >{{ c.professionalFirstName }} {{ c.professionalLastName }}</span
                  >
                </div>
              </div>
              <span
                v-if="c.receta"
                class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold"
                style="background-color: #d1fae5; color: #065f46"
              >
                <span class="material-symbols-outlined" style="font-size: 12px">check</span>
                Con receta
              </span>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3 text-sm">
              <div>
                <span
                  class="text-xs font-bold uppercase tracking-wider block mb-0.5"
                  style="color: var(--color-outline)"
                  >Motivo</span
                >
                <span style="color: var(--color-on-surface)">{{ c.motivo }}</span>
              </div>
              <div v-if="c.anamnesis">
                <span
                  class="text-xs font-bold uppercase tracking-wider block mb-0.5"
                  style="color: var(--color-outline)"
                  >Anamnesis</span
                >
                <span style="color: var(--color-on-surface)">{{ c.anamnesis }}</span>
              </div>
              <div v-if="c.examenFisico">
                <span
                  class="text-xs font-bold uppercase tracking-wider block mb-0.5"
                  style="color: var(--color-outline)"
                  >Examen Físico</span
                >
                <span style="color: var(--color-on-surface)">{{ c.examenFisico }}</span>
              </div>
              <div>
                <span
                  class="text-xs font-bold uppercase tracking-wider block mb-0.5"
                  style="color: var(--color-outline)"
                  >Diagnóstico Principal</span
                >
                <span style="color: var(--color-on-surface)">{{ c.diagnosticoPrincipal }}</span>
              </div>
              <div v-if="c.diagnosticoSecundario">
                <span
                  class="text-xs font-bold uppercase tracking-wider block mb-0.5"
                  style="color: var(--color-outline)"
                  >Diagnóstico Secundario</span
                >
                <span style="color: var(--color-on-surface)">{{ c.diagnosticoSecundario }}</span>
              </div>
              <div v-if="c.planTratamiento">
                <span
                  class="text-xs font-bold uppercase tracking-wider block mb-0.5"
                  style="color: var(--color-outline)"
                  >Plan de Tratamiento</span
                >
                <span style="color: var(--color-on-surface)">{{ c.planTratamiento }}</span>
              </div>
              <div v-if="c.observaciones">
                <span
                  class="text-xs font-bold uppercase tracking-wider block mb-0.5"
                  style="color: var(--color-outline)"
                  >Observaciones</span
                >
                <span style="color: var(--color-on-surface)">{{ c.observaciones }}</span>
              </div>
            </div>

            <!-- Receta detail -->
            <div
              v-if="c.receta"
              class="mt-5 pt-5"
              style="border-top: 1px solid rgba(196, 197, 213, 0.15)"
            >
              <div class="flex items-center gap-2 mb-3">
                <span
                  class="material-symbols-outlined"
                  style="color: var(--color-secondary); font-size: 18px"
                  >visibility</span
                >
                <span
                  class="text-xs font-bold uppercase tracking-wider"
                  style="color: var(--color-secondary)"
                  >Prescripción óptica — {{ formatDate(c.receta.fechaEmision) }}</span
                >
              </div>
              <div class="overflow-x-auto">
                <BaseTable
                  :columns="recetaColumns"
                  :items="[
                    {
                      eye: 'OD',
                      esferico: c.receta.odEsferico,
                      cilindro: c.receta.odCilindro,
                      eje: c.receta.odEje,
                      adicion: c.receta.odAdicion,
                    },
                    {
                      eye: 'OI',
                      esferico: c.receta.oiEsferico,
                      cilindro: c.receta.oiCilindro,
                      eje: c.receta.oiEje,
                      adicion: c.receta.oiAdicion,
                    },
                  ]"
                  :loading="false"
                >
                  <template #eye="{ item }">
                    <span class="font-bold" style="color: var(--color-on-surface)">{{
                      item.eye
                    }}</span>
                  </template>
                  <template #esfera="{ item }">
                    <span style="color: var(--color-on-surface-variant)">{{
                      item.esferico ?? "—"
                    }}</span>
                  </template>
                  <template #cilindro="{ item }">
                    <span style="color: var(--color-on-surface-variant)">{{
                      item.cilindro ?? "—"
                    }}</span>
                  </template>
                  <template #eje="{ item }">
                    <span style="color: var(--color-on-surface-variant)">{{
                      item.eje ?? "—"
                    }}</span>
                  </template>
                  <template #adicion="{ item }">
                    <span style="color: var(--color-on-surface-variant)">{{
                      item.adicion ?? "—"
                    }}</span>
                  </template>
                </BaseTable>
              </div>
              <div class="flex flex-wrap gap-6 mt-3 text-sm">
                <div v-if="c.receta.distanciaInterpupilar != null">
                  <span
                    class="text-xs font-bold uppercase tracking-wider block mb-0.5"
                    style="color: var(--color-outline)"
                    >DIP</span
                  >
                  <span style="color: var(--color-on-surface)"
                    >{{ c.receta.distanciaInterpupilar }} mm</span
                  >
                </div>
                <div v-if="c.receta.avSinCorreccion">
                  <span
                    class="text-xs font-bold uppercase tracking-wider block mb-0.5"
                    style="color: var(--color-outline)"
                    >AV sin corrección</span
                  >
                  <span style="color: var(--color-on-surface)">{{ c.receta.avSinCorreccion }}</span>
                </div>
                <div v-if="c.receta.avConCorreccion">
                  <span
                    class="text-xs font-bold uppercase tracking-wider block mb-0.5"
                    style="color: var(--color-outline)"
                    >AV con corrección</span
                  >
                  <span style="color: var(--color-on-surface)">{{ c.receta.avConCorreccion }}</span>
                </div>
              </div>
              <div v-if="c.receta.observaciones" class="mt-3 text-sm">
                <span
                  class="text-xs font-bold uppercase tracking-wider block mb-0.5"
                  style="color: var(--color-outline)"
                  >Observaciones de receta</span
                >
                <span style="color: var(--color-on-surface)">{{ c.receta.observaciones }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>
