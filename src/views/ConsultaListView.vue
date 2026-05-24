<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch } from "vue"
import { useRouter } from "vue-router"
import AppSidebar from "@/components/AppSidebar.vue"
import AppHeader from "@/components/AppHeader.vue"
import { useAuthStore } from "@/stores/auth"
import {
  type ConsultaClinica,
  type UpdateConsultaClinicaRequest,
  type CreateRecetaRequest,
  getConsultas,
  updateConsulta,
  deleteConsulta,
  createOrUpdateReceta,
  downloadRecetaPdf,
} from "@/services/clinicaService"
import { http } from "@/api/http"
import BaseButton from "@/components/BaseButton.vue"
import BaseModal from "@/components/BaseModal.vue"
import BaseTable from "@/components/BaseTable.vue"
import SearchInput from "@/components/SearchInput.vue"

const auth = useAuthStore()
const router = useRouter()

const isProfessional = computed(() => !!auth.user?.professionalId)
const showProfessionalFilter = computed(
  () => auth.hasPermission("ver_reportes") && !isProfessional.value,
)

// ── Profesionales (para filtro) ────────────────────────────────────────────

interface Professional {
  id: number
  firstName: string
  lastName: string
  specialty: string
  isActive: boolean
}

const professionals = ref<Professional[]>([])

async function loadProfessionals() {
  try {
    const { data } = await http.get<{ items: Professional[] }>("/api/professionals?pageSize=200")
    professionals.value = (data.items ?? data).filter((p: Professional) => p.isActive)
  } catch {
    /* no crítico */
  }
}

// ── Listado ────────────────────────────────────────────────────────────────

const consultas = ref<ConsultaClinica[]>([])
const isLoading = ref(false)
const currentPage = ref(1)
const totalPages = ref(1)
const totalCount = ref(0)
const searchQuery = ref("")
const filterProfessional = ref(0)
const filterDateFrom = ref("")
const filterDateTo = ref("")
let searchDebounce: ReturnType<typeof setTimeout> | null = null

async function loadConsultas() {
  isLoading.value = true
  try {
    const result = await getConsultas({
      page: currentPage.value,
      pageSize: 10,
      search: searchQuery.value || undefined,
      professionalId: filterProfessional.value || undefined,
    })
    consultas.value = result.items
    totalPages.value = result.totalPages
    totalCount.value = result.totalCount
  } catch {
    /* silencioso */
  } finally {
    isLoading.value = false
  }
}

function goToPage(p: number) {
  if (p < 1 || p > totalPages.value) return
  currentPage.value = p
  loadConsultas()
}

const visiblePages = computed(() => {
  const pages: number[] = []
  const start = Math.max(1, currentPage.value - 1)
  const end = Math.min(totalPages.value, start + 2)
  for (let i = start; i <= end; i++) pages.push(i)
  return pages
})

watch([searchQuery, filterProfessional, filterDateFrom, filterDateTo], () => {
  if (searchDebounce) clearTimeout(searchDebounce)
  searchDebounce = setTimeout(() => {
    currentPage.value = 1
    loadConsultas()
  }, 350)
})

onMounted(() => {
  loadConsultas()
  if (showProfessionalFilter.value) loadProfessionals()
})

// ── Modal: Editar Consulta ────────────────────────────────────────────────

const showEditModal = ref(false)
const isEditing = ref(false)
const editError = ref("")
const selectedConsulta = ref<ConsultaClinica | null>(null)

const editForm = reactive({
  professionalId: 0,
  fechaConsulta: "",
  motivo: "",
  anamnesis: "",
  examenFisico: "",
  diagnosticoPrincipal: "",
  diagnosticoSecundario: "",
  planTratamiento: "",
  observaciones: "",
})

type EditErrors = { fechaConsulta?: string; motivo?: string; diagnosticoPrincipal?: string }
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

function openEditModal(c: ConsultaClinica) {
  selectedConsulta.value = c
  editForm.professionalId = c.professionalId
  editForm.fechaConsulta = c.fechaConsulta.slice(0, 10)
  editForm.motivo = c.motivo
  editForm.anamnesis = c.anamnesis ?? ""
  editForm.examenFisico = c.examenFisico ?? ""
  editForm.diagnosticoPrincipal = c.diagnosticoPrincipal
  editForm.diagnosticoSecundario = c.diagnosticoSecundario ?? ""
  editForm.planTratamiento = c.planTratamiento ?? ""
  editForm.observaciones = c.observaciones ?? ""
  editErrors.value = {}
  editError.value = ""
  showEditModal.value = true
}

async function submitEdit() {
  if (isEditing.value || !validateEdit() || !selectedConsulta.value) return
  isEditing.value = true
  editError.value = ""
  try {
    const payload: UpdateConsultaClinicaRequest = {
      professionalId: editForm.professionalId,
      fechaConsulta: editForm.fechaConsulta,
      motivo: editForm.motivo.trim(),
      anamnesis: editForm.anamnesis.trim() || undefined,
      examenFisico: editForm.examenFisico.trim() || undefined,
      diagnosticoPrincipal: editForm.diagnosticoPrincipal.trim(),
      diagnosticoSecundario: editForm.diagnosticoSecundario.trim() || undefined,
      planTratamiento: editForm.planTratamiento.trim() || undefined,
      observaciones: editForm.observaciones.trim() || undefined,
    }
    await updateConsulta(selectedConsulta.value.id, payload)
    showEditModal.value = false
    loadConsultas()
  } catch (err: unknown) {
    editError.value = err instanceof Error ? err.message : "Error al actualizar la consulta."
  } finally {
    isEditing.value = false
  }
}

// ── Modal: Receta ─────────────────────────────────────────────────────────

const showRecetaModal = ref(false)
const isSavingReceta = ref(false)
const isDownloadingPdf = ref(false)
const recetaError = ref("")
const recetaConsultaId = ref(0)
const recetaConsulta = ref<ConsultaClinica | null>(null)

const recetaEditForm = reactive({
  fechaEmision: "",
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

function openRecetaModal(c: ConsultaClinica) {
  recetaConsultaId.value = c.id
  recetaConsulta.value = c
  const r = c.receta
  recetaEditForm.fechaEmision = r?.fechaEmision ?? c.fechaConsulta.slice(0, 10)
  recetaEditForm.odEsferico = r?.odEsferico != null ? String(r.odEsferico) : ""
  recetaEditForm.odCilindro = r?.odCilindro != null ? String(r.odCilindro) : ""
  recetaEditForm.odEje = r?.odEje != null ? String(r.odEje) : ""
  recetaEditForm.odAdicion = r?.odAdicion != null ? String(r.odAdicion) : ""
  recetaEditForm.oiEsferico = r?.oiEsferico != null ? String(r.oiEsferico) : ""
  recetaEditForm.oiCilindro = r?.oiCilindro != null ? String(r.oiCilindro) : ""
  recetaEditForm.oiEje = r?.oiEje != null ? String(r.oiEje) : ""
  recetaEditForm.oiAdicion = r?.oiAdicion != null ? String(r.oiAdicion) : ""
  recetaEditForm.distanciaInterpupilar =
    r?.distanciaInterpupilar != null ? String(r.distanciaInterpupilar) : ""
  recetaEditForm.avSinCorreccion = r?.avSinCorreccion ?? ""
  recetaEditForm.avConCorreccion = r?.avConCorreccion ?? ""
  recetaEditForm.observaciones = r?.observaciones ?? ""
  recetaError.value = ""
  showRecetaModal.value = true
}

function parseOptional(val: string): number | null {
  const n = parseFloat(val)
  return isNaN(n) ? null : n
}

async function submitReceta() {
  if (isSavingReceta.value) return
  isSavingReceta.value = true
  recetaError.value = ""
  try {
    const payload: CreateRecetaRequest = {
      fechaEmision: recetaEditForm.fechaEmision,
      odEsferico: parseOptional(recetaEditForm.odEsferico),
      odCilindro: parseOptional(recetaEditForm.odCilindro),
      odEje: parseOptional(recetaEditForm.odEje),
      odAdicion: parseOptional(recetaEditForm.odAdicion),
      oiEsferico: parseOptional(recetaEditForm.oiEsferico),
      oiCilindro: parseOptional(recetaEditForm.oiCilindro),
      oiEje: parseOptional(recetaEditForm.oiEje),
      oiAdicion: parseOptional(recetaEditForm.oiAdicion),
      distanciaInterpupilar: parseOptional(recetaEditForm.distanciaInterpupilar),
      avSinCorreccion: recetaEditForm.avSinCorreccion.trim() || undefined,
      avConCorreccion: recetaEditForm.avConCorreccion.trim() || undefined,
      observaciones: recetaEditForm.observaciones.trim() || undefined,
    }
    await createOrUpdateReceta(recetaConsultaId.value, payload)
    showRecetaModal.value = false
    loadConsultas()
  } catch (err: unknown) {
    recetaError.value = err instanceof Error ? err.message : "Error al guardar la receta."
  } finally {
    isSavingReceta.value = false
  }
}

async function downloadPdf() {
  if (isDownloadingPdf.value || !recetaConsulta.value) return
  isDownloadingPdf.value = true
  recetaError.value = ""
  try {
    await downloadRecetaPdf(recetaConsulta.value.id, recetaConsulta.value.patientLastName)
  } catch (err: unknown) {
    recetaError.value = err instanceof Error ? err.message : "Error al generar el PDF."
  } finally {
    isDownloadingPdf.value = false
  }
}

// ── Modal: Eliminar ───────────────────────────────────────────────────────

const showDeleteModal = ref(false)
const isDeleting = ref(false)
const deleteError = ref("")
const consultaToDelete = ref<ConsultaClinica | null>(null)

function openDeleteModal(c: ConsultaClinica) {
  consultaToDelete.value = c
  deleteError.value = ""
  showDeleteModal.value = true
}

async function confirmDelete() {
  if (isDeleting.value || !consultaToDelete.value) return
  isDeleting.value = true
  deleteError.value = ""
  try {
    await deleteConsulta(consultaToDelete.value.id)
    showDeleteModal.value = false
    loadConsultas()
  } catch (err: unknown) {
    deleteError.value = err instanceof Error ? err.message : "Error al eliminar la consulta."
  } finally {
    isDeleting.value = false
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

function inputStyle(hasError: boolean) {
  return hasError
    ? "border: 1.5px solid var(--color-error); color: var(--color-on-surface); background-color: #FFF8F7;"
    : "border: 1px solid var(--color-outline-variant); color: var(--color-on-surface); background-color: var(--color-surface);"
}

const spinnerPath = "M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"

const columns = [
  { key: "fecha", label: "Fecha" },
  { key: "paciente", label: "Paciente" },
  { key: "profesional", label: "Profesional" },
  { key: "diagnostico", label: "Diagnóstico" },
  { key: "estado", label: "Estado" },
  { key: "acciones", label: "" },
]

function handleRowClick(item: ConsultaClinica) {
  // No navigation bound to row click
}
</script>

<template>
  <div class="min-h-screen" style="background-color: var(--color-surface)">
    <AppSidebar />
    <AppHeader />

    <main style="margin-left: var(--sidebar-width); transition: margin-left 0.25s ease; padding-top: 64px">
      <div class="p-8">
        <!-- Page header -->
        <div class="flex items-start justify-between mb-8">
          <div>
            <h1 class="text-4xl font-extrabold tracking-tight mb-2">Consultas</h1>
            <p class="font-medium" style="color: var(--color-on-surface-variant)">
              {{ totalCount }} consulta{{ totalCount !== 1 ? "s" : "" }} registrada{{
                totalCount !== 1 ? "s" : ""
              }}
            </p>
          </div>

          <BaseButton
            v-if="auth.hasPermission('registrar_consulta')"
            variant="primary"
            size="lg"
            @click="router.push('/clinica/consultas/nueva')"
          >
            <span
              class="material-symbols-outlined"
              style="width: 20px; height: 20px; font-size: 20px"
              >add</span
            >
            Nueva Consulta
          </BaseButton>
        </div>

        <!-- Filters -->
        <div class="flex flex-wrap items-center gap-3 mb-5">
          <SearchInput
            v-model="searchQuery"
            placeholder="Buscar por paciente, CI, diagnóstico..."
            class="flex-1 min-w-48"
          />
          <div v-if="showProfessionalFilter" class="relative">
            <span
              class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2"
              style="color: var(--color-outline); font-size: 16px"
              >person</span
            >
            <select
              v-model="filterProfessional"
              class="pl-9 pr-8 py-2.5 rounded-xl text-sm outline-none appearance-none"
              style="
                border: 1px solid var(--color-outline-variant);
                background-color: var(--color-surface-container-lowest);
                color: var(--color-on-surface);
                min-width: 200px;
              "
            >
              <option :value="0">Todos los profesionales</option>
              <option v-for="pr in professionals" :key="pr.id" :value="pr.id">
                {{ pr.firstName }} {{ pr.lastName }}
              </option>
            </select>
          </div>
        </div>

        <!-- Table -->
        <div
          class="rounded-2xl overflow-hidden"
          style="
            background-color: var(--color-surface-container-lowest);
            box-shadow: 0 1px 3px rgba(196, 197, 213, 0.25);
            outline: 1px solid rgba(196, 197, 213, 0.15);
          "
        >
          <BaseTable
            :columns="columns"
            :items="consultas"
            :loading="isLoading"
            emptyText="No hay consultas para mostrar."
            @row-click="handleRowClick"
          >
            <template #fecha="{ item }">
              <span class="text-sm font-semibold" style="color: var(--color-on-surface-variant)">{{
                formatDate(item.fechaConsulta)
              }}</span>
            </template>

            <template #paciente="{ item }">
              <div class="flex items-center gap-3">
                <div
                  class="w-8 h-8 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0"
                  :style="`background-color: ${avatarStyle(item.patientId).bg}; color: ${avatarStyle(item.patientId).color};`"
                >
                  {{ initials(item.patientFirstName, item.patientLastName) }}
                </div>
                <div>
                  <div class="text-sm font-bold" style="color: var(--color-on-surface)">
                    {{ item.patientFirstName }} {{ item.patientLastName }}
                  </div>
                  <div class="text-xs" style="color: var(--color-outline)">
                    CI {{ item.patientCI }}
                  </div>
                </div>
              </div>
            </template>

            <template #profesional="{ item }">
              <span class="text-sm font-medium" style="color: var(--color-on-surface-variant)"
                >{{ item.professionalFirstName }} {{ item.professionalLastName }}</span
              >
            </template>

            <template #diagnostico="{ item }">
              <span class="text-sm" style="color: var(--color-on-surface)">{{
                item.diagnosticoPrincipal
              }}</span>
              <span
                v-if="item.diagnosticoSecundario"
                class="block text-xs mt-0.5"
                style="color: var(--color-outline)"
                >{{ item.diagnosticoSecundario }}</span
              >
            </template>

            <template #estado="{ item }">
              <span
                v-if="item.receta"
                class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold"
                style="background-color: #d1fae5; color: #065f46"
              >
                <span class="material-symbols-outlined" style="font-size: 12px">check</span>
                Con receta
              </span>
              <span v-else class="text-xs" style="color: var(--color-outline-variant)"
                >Sin receta</span
              >
            </template>

            <template #acciones="{ item }">
              <div class="flex items-center justify-end gap-2">
                <button
                  v-if="auth.hasPermission('editar_consulta')"
                  @click.stop="openRecetaModal(item)"
                  class="p-1.5 rounded-lg transition-colors"
                  :title="item.receta ? 'Editar receta' : 'Agregar receta'"
                  style="color: var(--color-outline)"
                  onmouseover="
                    this.style.backgroundColor = 'rgba(0,103,128,0.08)'
                    this.style.color = 'var(--color-secondary)'
                  "
                  onmouseout="
                    this.style.backgroundColor = 'transparent'
                    this.style.color = 'var(--color-outline)'
                  "
                >
                  <span class="material-symbols-outlined" style="font-size: 18px"
                    >medical_services</span
                  >
                </button>
                <button
                  v-if="auth.hasPermission('editar_consulta')"
                  @click.stop="openEditModal(item)"
                  class="p-1.5 rounded-lg transition-colors"
                  title="Editar consulta"
                  style="color: var(--color-outline)"
                  onmouseover="
                    this.style.backgroundColor = 'rgba(0,40,142,0.08)'
                    this.style.color = 'var(--color-primary)'
                  "
                  onmouseout="
                    this.style.backgroundColor = 'transparent'
                    this.style.color = 'var(--color-outline)'
                  "
                >
                  <span class="material-symbols-outlined" style="font-size: 18px">edit</span>
                </button>
                <button
                  v-if="auth.hasPermission('eliminar_consulta')"
                  @click.stop="openDeleteModal(item)"
                  class="p-1.5 rounded-lg transition-colors"
                  title="Eliminar consulta"
                  style="color: var(--color-outline)"
                  onmouseover="
                    this.style.backgroundColor = 'rgba(186,26,26,0.08)'
                    this.style.color = 'var(--color-error)'
                  "
                  onmouseout="
                    this.style.backgroundColor = 'transparent'
                    this.style.color = 'var(--color-outline)'
                  "
                >
                  <span class="material-symbols-outlined" style="font-size: 18px">delete</span>
                </button>
              </div>
            </template>
          </BaseTable>

          <div
            v-if="consultas.length"
            class="flex items-center justify-between px-6 py-4"
            style="border-top: 1px solid rgba(196, 197, 213, 0.2)"
          >
            <span class="text-xs font-medium" style="color: var(--color-outline)"
              >{{ totalCount }} consulta{{ totalCount !== 1 ? "s" : "" }} en total</span
            >
            <div v-if="totalPages > 1" class="flex items-center gap-1">
              <button
                @click="goToPage(currentPage - 1)"
                :disabled="currentPage === 1"
                class="w-8 h-8 rounded-lg flex items-center justify-center disabled:opacity-30"
                style="color: var(--color-outline)"
              >
                <span class="material-symbols-outlined" style="font-size: 18px">chevron_left</span>
              </button>
              <button
                v-for="p in visiblePages"
                :key="p"
                @click="goToPage(p)"
                class="w-8 h-8 rounded-lg text-sm font-bold"
                :style="
                  p === currentPage
                    ? 'background-color: var(--color-primary); color: white;'
                    : 'color: var(--color-outline);'
                "
              >
                {{ p }}
              </button>
              <button
                @click="goToPage(currentPage + 1)"
                :disabled="currentPage === totalPages"
                class="w-8 h-8 rounded-lg flex items-center justify-center disabled:opacity-30"
                style="color: var(--color-outline)"
              >
                <span class="material-symbols-outlined" style="font-size: 18px">chevron_right</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>

    <!-- ══════════════════════════════════════════════════
         MODAL: EDITAR CONSULTA
    ══════════════════════════════════════════════════ -->
    <BaseModal
      :show="showEditModal"
      title="Editar Consulta"
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
          <span class="material-symbols-outlined" style="font-size: 18px">error</span
          >{{ editError }}
        </div>

        <div class="flex flex-col gap-1.5 w-48">
          <label
            class="text-xs font-bold uppercase tracking-wider"
            style="color: var(--color-outline)"
            >Fecha *</label
          >
          <input
            v-model="editForm.fechaConsulta"
            type="date"
            class="px-4 py-3 rounded-xl text-sm outline-none"
            :style="inputStyle(!!editErrors.fechaConsulta)"
          />
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
            class="px-4 py-3 rounded-xl text-sm outline-none"
            :style="inputStyle(!!editErrors.motivo)"
          />
          <p v-if="editErrors.motivo" class="text-xs font-medium" style="color: var(--color-error)">
            {{ editErrors.motivo }}
          </p>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div class="flex flex-col gap-1.5">
            <label
              class="text-xs font-bold uppercase tracking-wider"
              style="color: var(--color-outline)"
              >Anamnesis</label
            >
            <textarea
              v-model="editForm.anamnesis"
              rows="3"
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
              v-model="editForm.examenFisico"
              rows="3"
              class="px-4 py-3 rounded-xl text-sm outline-none resize-none"
              :style="inputStyle(false)"
            ></textarea>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div class="flex flex-col gap-1.5">
            <label
              class="text-xs font-bold uppercase tracking-wider"
              style="color: var(--color-outline)"
              >Diagnóstico Principal *</label
            >
            <input
              v-model="editForm.diagnosticoPrincipal"
              type="text"
              class="px-4 py-3 rounded-xl text-sm outline-none"
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
          <div class="flex flex-col gap-1.5">
            <label
              class="text-xs font-bold uppercase tracking-wider"
              style="color: var(--color-outline)"
              >Diagnóstico Secundario</label
            >
            <input
              v-model="editForm.diagnosticoSecundario"
              type="text"
              class="px-4 py-3 rounded-xl text-sm outline-none"
              :style="inputStyle(false)"
            />
          </div>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div class="flex flex-col gap-1.5">
            <label
              class="text-xs font-bold uppercase tracking-wider"
              style="color: var(--color-outline)"
              >Plan de Tratamiento</label
            >
            <textarea
              v-model="editForm.planTratamiento"
              rows="3"
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
              v-model="editForm.observaciones"
              rows="3"
              class="px-4 py-3 rounded-xl text-sm outline-none resize-none"
              :style="inputStyle(false)"
            ></textarea>
          </div>
        </div>
      </form>

      <template #footer>
        <BaseButton variant="secondary" @click="showEditModal = false">Cancelar</BaseButton>
        <BaseButton variant="primary" :disabled="isEditing" @click="submitEdit">
          <svg v-if="isEditing" class="animate-spin w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          {{ isEditing ? "Guardando..." : "Guardar Cambios" }}
        </BaseButton>
      </template>
    </BaseModal>

    <!-- ══════════════════════════════════════════════════
         MODAL: RECETA
    ══════════════════════════════════════════════════ -->
    <Teleport to="body">
      <Transition
        enter-active-class="transition-all duration-200 ease-out"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-active-class="transition-all duration-150 ease-in"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div
          v-if="showRecetaModal"
          class="fixed inset-0 z-50 flex items-center justify-center p-4"
          style="background-color: rgba(24, 28, 32, 0.5)"
          @click.self="showRecetaModal = false"
        >
          <div
            class="w-full max-w-2xl rounded-3xl overflow-hidden"
            style="
              background-color: var(--color-surface-container-lowest);
              box-shadow: 0 24px 64px rgba(0, 40, 142, 0.18);
            "
          >
            <div
              class="flex items-center justify-between px-8 pt-8 pb-6"
              style="border-bottom: 1px solid rgba(196, 197, 213, 0.2)"
            >
              <h3 class="text-xl font-extrabold" style="color: var(--color-primary)">
                Receta Óptica
              </h3>
              <button @click="showRecetaModal = false" style="color: var(--color-outline)">
                <span class="material-symbols-outlined" style="font-size: 22px">close</span>
              </button>
            </div>

            <form
              @submit.prevent="submitReceta"
              class="px-8 py-6 space-y-5 max-h-[70vh] overflow-y-auto"
            >
              <div
                v-if="recetaError"
                class="flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium"
                style="
                  background-color: var(--color-error-container);
                  color: var(--color-on-error-container);
                "
              >
                <span class="material-symbols-outlined" style="font-size: 18px">error</span
                >{{ recetaError }}
              </div>

              <div class="flex flex-col gap-1.5">
                <label
                  class="text-xs font-bold uppercase tracking-wider"
                  style="color: var(--color-outline)"
                  >Fecha de Emisión</label
                >
                <input
                  v-model="recetaEditForm.fechaEmision"
                  type="date"
                  class="px-4 py-2.5 rounded-xl text-sm outline-none w-48"
                  :style="inputStyle(false)"
                />
              </div>

              <div class="overflow-x-auto">
                <table class="w-full text-sm">
                  <thead>
                    <tr>
                      <th
                        class="text-left py-2 text-xs font-bold uppercase tracking-wider"
                        style="color: var(--color-outline)"
                      ></th>
                      <th
                        class="text-left py-2 text-xs font-bold uppercase tracking-wider"
                        style="color: var(--color-outline)"
                      >
                        Esfera
                      </th>
                      <th
                        class="text-left py-2 text-xs font-bold uppercase tracking-wider"
                        style="color: var(--color-outline)"
                      >
                        Cilindro
                      </th>
                      <th
                        class="text-left py-2 text-xs font-bold uppercase tracking-wider"
                        style="color: var(--color-outline)"
                      >
                        Eje
                      </th>
                      <th
                        class="text-left py-2 text-xs font-bold uppercase tracking-wider"
                        style="color: var(--color-outline)"
                      >
                        Adición
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td class="py-2 font-bold" style="color: var(--color-on-surface)">OD</td>
                      <td class="py-2 pr-2">
                        <input
                          v-model="recetaEditForm.odEsferico"
                          type="text"
                          placeholder="+0.00"
                          class="w-20 px-2 py-2 rounded-lg text-sm outline-none"
                          :style="inputStyle(false)"
                        />
                      </td>
                      <td class="py-2 pr-2">
                        <input
                          v-model="recetaEditForm.odCilindro"
                          type="text"
                          placeholder="-0.00"
                          class="w-20 px-2 py-2 rounded-lg text-sm outline-none"
                          :style="inputStyle(false)"
                        />
                      </td>
                      <td class="py-2 pr-2">
                        <input
                          v-model="recetaEditForm.odEje"
                          type="text"
                          placeholder="0"
                          class="w-20 px-2 py-2 rounded-lg text-sm outline-none"
                          :style="inputStyle(false)"
                        />
                      </td>
                      <td class="py-2 pr-2">
                        <input
                          v-model="recetaEditForm.odAdicion"
                          type="text"
                          placeholder="+0.00"
                          class="w-20 px-2 py-2 rounded-lg text-sm outline-none"
                          :style="inputStyle(false)"
                        />
                      </td>
                    </tr>
                    <tr>
                      <td class="py-2 font-bold" style="color: var(--color-on-surface)">OI</td>
                      <td class="py-2 pr-2">
                        <input
                          v-model="recetaEditForm.oiEsferico"
                          type="text"
                          placeholder="+0.00"
                          class="w-20 px-2 py-2 rounded-lg text-sm outline-none"
                          :style="inputStyle(false)"
                        />
                      </td>
                      <td class="py-2 pr-2">
                        <input
                          v-model="recetaEditForm.oiCilindro"
                          type="text"
                          placeholder="-0.00"
                          class="w-20 px-2 py-2 rounded-lg text-sm outline-none"
                          :style="inputStyle(false)"
                        />
                      </td>
                      <td class="py-2 pr-2">
                        <input
                          v-model="recetaEditForm.oiEje"
                          type="text"
                          placeholder="0"
                          class="w-20 px-2 py-2 rounded-lg text-sm outline-none"
                          :style="inputStyle(false)"
                        />
                      </td>
                      <td class="py-2 pr-2">
                        <input
                          v-model="recetaEditForm.oiAdicion"
                          type="text"
                          placeholder="+0.00"
                          class="w-20 px-2 py-2 rounded-lg text-sm outline-none"
                          :style="inputStyle(false)"
                        />
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div class="grid grid-cols-3 gap-4">
                <div class="flex flex-col gap-1.5">
                  <label
                    class="text-xs font-bold uppercase tracking-wider"
                    style="color: var(--color-outline)"
                    >Distancia Interpupilar</label
                  >
                  <input
                    v-model="recetaEditForm.distanciaInterpupilar"
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
                    v-model="recetaEditForm.avSinCorreccion"
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
                    v-model="recetaEditForm.avConCorreccion"
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
                  v-model="recetaEditForm.observaciones"
                  rows="2"
                  class="px-4 py-3 rounded-xl text-sm outline-none resize-none"
                  :style="inputStyle(false)"
                ></textarea>
              </div>
            </form>

            <div
              class="px-8 py-6 flex items-center justify-between gap-3"
              style="border-top: 1px solid rgba(196, 197, 213, 0.2)"
            >
              <button
                v-if="recetaConsulta?.receta"
                type="button"
                @click="downloadPdf"
                :disabled="isDownloadingPdf"
                class="flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold transition-all disabled:opacity-60"
                style="
                  background-color: rgba(0, 40, 142, 0.07);
                  color: var(--color-primary);
                "
              >
                <svg
                  v-if="isDownloadingPdf"
                  class="animate-spin w-4 h-4"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <span v-else class="material-symbols-outlined" style="font-size: 18px">download</span>
                {{ isDownloadingPdf ? "Generando..." : "Descargar PDF" }}
              </button>
              <div v-else />

              <div class="flex gap-3">
                <button
                  type="button"
                  @click="showRecetaModal = false"
                  class="px-6 py-3 rounded-full text-sm font-bold transition-all"
                  style="
                    background-color: var(--color-surface-container-high);
                    color: var(--color-on-surface-variant);
                  "
                >
                  Cancelar
                </button>
                <button
                  @click="submitReceta"
                  :disabled="isSavingReceta"
                  class="flex items-center gap-2 px-6 py-3 rounded-full text-sm font-bold transition-all disabled:opacity-60"
                  style="background-color: var(--color-primary); color: white"
                >
                  <svg
                    v-if="isSavingReceta"
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
                  {{ isSavingReceta ? "Guardando..." : "Guardar Receta" }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- ══════════════════════════════════════════════════
         MODAL: CONFIRMAR ELIMINACIÓN
    ══════════════════════════════════════════════════ -->
    <BaseModal :show="showDeleteModal" size="sm" @close="showDeleteModal = false">
      <div class="text-center">
        <div
          class="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-5"
          style="background-color: var(--color-error-container)"
        >
          <span class="material-symbols-outlined" style="color: var(--color-error); font-size: 28px"
            >delete</span
          >
        </div>
        <h3 class="text-lg font-extrabold mb-2" style="color: var(--color-on-surface)">
          Eliminar Consulta
        </h3>
        <p class="text-sm" style="color: var(--color-on-surface-variant)">
          ¿Deseás eliminar la consulta de
          <strong style="color: var(--color-on-surface)"
            >{{ consultaToDelete?.patientFirstName }}
            {{ consultaToDelete?.patientLastName }}</strong
          >
          del {{ consultaToDelete ? formatDate(consultaToDelete.fechaConsulta) : "" }}?
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
        <BaseButton variant="secondary" class="flex-1" @click="showDeleteModal = false">Cancelar</BaseButton>
        <BaseButton variant="danger" class="flex-1" :disabled="isDeleting" @click="confirmDelete">
          <svg v-if="isDeleting" class="animate-spin w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          {{ isDeleting ? "Eliminando..." : "Eliminar" }}
        </BaseButton>
      </template>
    </BaseModal>
  </div>
</template>
