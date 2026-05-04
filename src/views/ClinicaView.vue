<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch } from 'vue'
import AppSidebar from '@/components/AppSidebar.vue'
import AppHeader from '@/components/AppHeader.vue'
import { useAuthStore } from '@/stores/auth'
import {
  type ConsultaClinica,
  type CreateConsultaClinicaRequest,
  type UpdateConsultaClinicaRequest,
  type CreateRecetaRequest,
  getConsultas,
  createConsulta,
  updateConsulta,
  deleteConsulta,
  createOrUpdateReceta,
} from '@/services/clinicaService'
import { getPatients, type Patient } from '@/services/patientService'
import { http } from '@/api/http'

const auth = useAuthStore()

// ── Profesionales (para filtro de historial) ───────────────────────────────

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
    const { data } = await http.get<{ items: Professional[] }>('/api/professionals?pageSize=200')
    professionals.value = (data.items ?? data).filter((p: Professional) => p.isActive)
  } catch { /* no crítico */ }
}

// ── Tabs ───────────────────────────────────────────────────────────────────

const activeTab = ref<'mis-consultas' | 'historial'>('mis-consultas')

// ── Mis Consultas ──────────────────────────────────────────────────────────

const misConsultas    = ref<ConsultaClinica[]>([])
const isLoadingMis    = ref(false)
const misPage         = ref(1)
const misTotalPages   = ref(1)
const misTotalCount   = ref(0)

async function loadMisConsultas() {
  isLoadingMis.value = true
  try {
    const result = await getConsultas({
      page:           misPage.value,
      pageSize:       10,
      professionalId: auth.user?.professionalId,
    })
    misConsultas.value  = result.items
    misTotalPages.value = result.totalPages
    misTotalCount.value = result.totalCount
  } catch { /* silencioso */ } finally {
    isLoadingMis.value = false
  }
}

function goToMisPage(p: number) {
  if (p < 1 || p > misTotalPages.value) return
  misPage.value = p
  loadMisConsultas()
}

const misVisiblePages = computed(() => {
  const pages: number[] = []
  const start = Math.max(1, misPage.value - 1)
  const end   = Math.min(misTotalPages.value, start + 2)
  for (let i = start; i <= end; i++) pages.push(i)
  return pages
})

// ── Historial Clínico ──────────────────────────────────────────────────────

const consultas           = ref<ConsultaClinica[]>([])
const isLoading           = ref(false)
const currentPage         = ref(1)
const totalPages          = ref(1)
const totalCount          = ref(0)
const historialLoaded     = ref(false)
const searchQuery         = ref('')
const filterProfessional  = ref(0)
let   searchDebounce: ReturnType<typeof setTimeout> | null = null

async function loadHistorial() {
  isLoading.value = true
  try {
    const result = await getConsultas({
      page:           currentPage.value,
      pageSize:       10,
      search:         searchQuery.value || undefined,
      professionalId: filterProfessional.value || undefined,
    })
    consultas.value  = result.items
    totalPages.value = result.totalPages
    totalCount.value = result.totalCount
  } catch { /* silencioso */ } finally {
    isLoading.value = false
  }
}

function goToPage(p: number) {
  if (p < 1 || p > totalPages.value) return
  currentPage.value = p
  loadHistorial()
}

const visiblePages = computed(() => {
  const pages: number[] = []
  const start = Math.max(1, currentPage.value - 1)
  const end   = Math.min(totalPages.value, start + 2)
  for (let i = start; i <= end; i++) pages.push(i)
  return pages
})

watch([searchQuery, filterProfessional], () => {
  if (searchDebounce) clearTimeout(searchDebounce)
  searchDebounce = setTimeout(() => { currentPage.value = 1; loadHistorial() }, 350)
})

watch(activeTab, (tab) => {
  if (tab === 'historial' && !historialLoaded.value) {
    historialLoaded.value = true
    loadHistorial()
  }
})

function reloadAll() {
  loadMisConsultas()
  if (historialLoaded.value) loadHistorial()
}

onMounted(() => { loadMisConsultas(); loadProfessionals() })

// ── Búsqueda de paciente (modal crear) ────────────────────────────────────

const patientSearch   = ref('')
const patientResults  = ref<Patient[]>([])
const selectedPatient = ref<Patient | null>(null)
const showPatientDrop = ref(false)
let   patientDebounce: ReturnType<typeof setTimeout> | null = null

async function onPatientInput() {
  selectedPatient.value = null
  if (patientDebounce) clearTimeout(patientDebounce)
  if (patientSearch.value.trim().length < 2) { patientResults.value = []; showPatientDrop.value = false; return }
  patientDebounce = setTimeout(async () => {
    try {
      const result = await getPatients({ search: patientSearch.value, pageSize: 8, status: 'active' })
      patientResults.value = result.items
      showPatientDrop.value = patientResults.value.length > 0
    } catch { patientResults.value = [] }
  }, 300)
}

function selectPatient(p: Patient) {
  selectedPatient.value = p
  patientSearch.value   = `${p.firstName} ${p.lastName} — ${p.ci}`
  showPatientDrop.value = false
  patientResults.value  = []
}

function clearPatient() {
  selectedPatient.value = null
  patientSearch.value   = ''
  patientResults.value  = []
  showPatientDrop.value = false
}

function onPatientInputBlur() {
  setTimeout(() => { showPatientDrop.value = false }, 150)
}

// ── Modal: Nueva Consulta ─────────────────────────────────────────────────

const showCreateModal = ref(false)
const isCreating      = ref(false)
const createError     = ref('')
const withReceta      = ref(false)

const createForm = reactive({
  fechaConsulta: new Date().toISOString().slice(0, 10),
  motivo: '',
  anamnesis: '',
  examenFisico: '',
  diagnosticoPrincipal: '',
  diagnosticoSecundario: '',
  planTratamiento: '',
  observaciones: '',
})

const recetaForm = reactive({
  fechaEmision: new Date().toISOString().slice(0, 10),
  odEsferico: '', odCilindro: '', odEje: '', odAdicion: '',
  oiEsferico: '', oiCilindro: '', oiEje: '', oiAdicion: '',
  distanciaInterpupilar: '',
  avSinCorreccion: '', avConCorreccion: '',
  observaciones: '',
})

type CreateErrors = { patient?: string; fechaConsulta?: string; motivo?: string; diagnosticoPrincipal?: string }
const createErrors = ref<CreateErrors>({})

function validateCreate(): boolean {
  const e: CreateErrors = {}
  if (!selectedPatient.value)                   e.patient              = 'Seleccioná un paciente.'
  if (!createForm.fechaConsulta)                e.fechaConsulta        = 'La fecha es obligatoria.'
  if (!createForm.motivo.trim())                e.motivo               = 'El motivo es obligatorio.'
  if (!createForm.diagnosticoPrincipal.trim())  e.diagnosticoPrincipal = 'El diagnóstico es obligatorio.'
  createErrors.value = e
  return Object.keys(e).length === 0
}

function openCreateModal() {
  createForm.fechaConsulta        = new Date().toISOString().slice(0, 10)
  createForm.motivo               = ''
  createForm.anamnesis            = ''
  createForm.examenFisico         = ''
  createForm.diagnosticoPrincipal = ''
  createForm.diagnosticoSecundario= ''
  createForm.planTratamiento      = ''
  createForm.observaciones        = ''
  Object.assign(recetaForm, { fechaEmision: new Date().toISOString().slice(0, 10), odEsferico: '', odCilindro: '', odEje: '', odAdicion: '', oiEsferico: '', oiCilindro: '', oiEje: '', oiAdicion: '', distanciaInterpupilar: '', avSinCorreccion: '', avConCorreccion: '', observaciones: '' })
  clearPatient()
  withReceta.value      = false
  createErrors.value    = {}
  createError.value     = ''
  showCreateModal.value = true
}

function parseOptional(val: string): number | null {
  const n = parseFloat(val)
  return isNaN(n) ? null : n
}

async function submitCreate() {
  if (isCreating.value || !validateCreate()) return
  const profId = auth.user?.professionalId
  if (!profId) { createError.value = 'No tenés un perfil de profesional asociado a tu cuenta.'; return }
  isCreating.value = true
  createError.value = ''
  try {
    const payload: CreateConsultaClinicaRequest = {
      patientId:            selectedPatient.value!.id,
      professionalId:       profId,
      fechaConsulta:        createForm.fechaConsulta,
      motivo:               createForm.motivo.trim(),
      anamnesis:            createForm.anamnesis.trim() || undefined,
      examenFisico:         createForm.examenFisico.trim() || undefined,
      diagnosticoPrincipal: createForm.diagnosticoPrincipal.trim(),
      diagnosticoSecundario:createForm.diagnosticoSecundario.trim() || undefined,
      planTratamiento:      createForm.planTratamiento.trim() || undefined,
      observaciones:        createForm.observaciones.trim() || undefined,
    }
    if (withReceta.value) {
      payload.receta = {
        fechaEmision:         recetaForm.fechaEmision,
        odEsferico:           parseOptional(recetaForm.odEsferico),
        odCilindro:           parseOptional(recetaForm.odCilindro),
        odEje:                parseOptional(recetaForm.odEje),
        odAdicion:            parseOptional(recetaForm.odAdicion),
        oiEsferico:           parseOptional(recetaForm.oiEsferico),
        oiCilindro:           parseOptional(recetaForm.oiCilindro),
        oiEje:                parseOptional(recetaForm.oiEje),
        oiAdicion:            parseOptional(recetaForm.oiAdicion),
        distanciaInterpupilar:parseOptional(recetaForm.distanciaInterpupilar),
        avSinCorreccion:      recetaForm.avSinCorreccion.trim() || undefined,
        avConCorreccion:      recetaForm.avConCorreccion.trim() || undefined,
        observaciones:        recetaForm.observaciones.trim() || undefined,
      }
    }
    await createConsulta(payload)
    showCreateModal.value = false
    reloadAll()
  } catch (err: unknown) {
    createError.value = err instanceof Error ? err.message : 'Error al registrar la consulta.'
  } finally {
    isCreating.value = false
  }
}

// ── Modal: Editar Consulta ────────────────────────────────────────────────

const showEditModal    = ref(false)
const isEditing        = ref(false)
const editError        = ref('')
const selectedConsulta = ref<ConsultaClinica | null>(null)

const editForm = reactive({
  professionalId: 0,
  fechaConsulta: '',
  motivo: '',
  anamnesis: '',
  examenFisico: '',
  diagnosticoPrincipal: '',
  diagnosticoSecundario: '',
  planTratamiento: '',
  observaciones: '',
})

type EditErrors = { fechaConsulta?: string; motivo?: string; diagnosticoPrincipal?: string }
const editErrors = ref<EditErrors>({})

function validateEdit(): boolean {
  const e: EditErrors = {}
  if (!editForm.fechaConsulta)               e.fechaConsulta        = 'La fecha es obligatoria.'
  if (!editForm.motivo.trim())               e.motivo               = 'El motivo es obligatorio.'
  if (!editForm.diagnosticoPrincipal.trim()) e.diagnosticoPrincipal = 'El diagnóstico es obligatorio.'
  editErrors.value = e
  return Object.keys(e).length === 0
}

function openEditModal(c: ConsultaClinica) {
  selectedConsulta.value = c
  editForm.professionalId        = c.professionalId
  editForm.fechaConsulta         = c.fechaConsulta.slice(0, 10)
  editForm.motivo                = c.motivo
  editForm.anamnesis             = c.anamnesis ?? ''
  editForm.examenFisico          = c.examenFisico ?? ''
  editForm.diagnosticoPrincipal  = c.diagnosticoPrincipal
  editForm.diagnosticoSecundario = c.diagnosticoSecundario ?? ''
  editForm.planTratamiento       = c.planTratamiento ?? ''
  editForm.observaciones         = c.observaciones ?? ''
  editErrors.value = {}
  editError.value  = ''
  showEditModal.value = true
}

async function submitEdit() {
  if (isEditing.value || !validateEdit() || !selectedConsulta.value) return
  isEditing.value = true
  editError.value = ''
  try {
    const payload: UpdateConsultaClinicaRequest = {
      professionalId:       editForm.professionalId,
      fechaConsulta:        editForm.fechaConsulta,
      motivo:               editForm.motivo.trim(),
      anamnesis:            editForm.anamnesis.trim() || undefined,
      examenFisico:         editForm.examenFisico.trim() || undefined,
      diagnosticoPrincipal: editForm.diagnosticoPrincipal.trim(),
      diagnosticoSecundario:editForm.diagnosticoSecundario.trim() || undefined,
      planTratamiento:      editForm.planTratamiento.trim() || undefined,
      observaciones:        editForm.observaciones.trim() || undefined,
    }
    await updateConsulta(selectedConsulta.value.id, payload)
    showEditModal.value = false
    reloadAll()
  } catch (err: unknown) {
    editError.value = err instanceof Error ? err.message : 'Error al actualizar la consulta.'
  } finally {
    isEditing.value = false
  }
}

// ── Modal: Receta ─────────────────────────────────────────────────────────

const showRecetaModal   = ref(false)
const isSavingReceta    = ref(false)
const recetaError       = ref('')
const recetaConsultaId  = ref(0)

const recetaEditForm = reactive({
  fechaEmision: '',
  odEsferico: '', odCilindro: '', odEje: '', odAdicion: '',
  oiEsferico: '', oiCilindro: '', oiEje: '', oiAdicion: '',
  distanciaInterpupilar: '',
  avSinCorreccion: '', avConCorreccion: '',
  observaciones: '',
})

function openRecetaModal(c: ConsultaClinica) {
  recetaConsultaId.value = c.id
  const r = c.receta
  recetaEditForm.fechaEmision          = r?.fechaEmision ?? c.fechaConsulta.slice(0, 10)
  recetaEditForm.odEsferico            = r?.odEsferico != null ? String(r.odEsferico) : ''
  recetaEditForm.odCilindro            = r?.odCilindro != null ? String(r.odCilindro) : ''
  recetaEditForm.odEje                 = r?.odEje      != null ? String(r.odEje)      : ''
  recetaEditForm.odAdicion             = r?.odAdicion  != null ? String(r.odAdicion)  : ''
  recetaEditForm.oiEsferico            = r?.oiEsferico != null ? String(r.oiEsferico) : ''
  recetaEditForm.oiCilindro            = r?.oiCilindro != null ? String(r.oiCilindro) : ''
  recetaEditForm.oiEje                 = r?.oiEje      != null ? String(r.oiEje)      : ''
  recetaEditForm.oiAdicion             = r?.oiAdicion  != null ? String(r.oiAdicion)  : ''
  recetaEditForm.distanciaInterpupilar = r?.distanciaInterpupilar != null ? String(r.distanciaInterpupilar) : ''
  recetaEditForm.avSinCorreccion       = r?.avSinCorreccion ?? ''
  recetaEditForm.avConCorreccion       = r?.avConCorreccion ?? ''
  recetaEditForm.observaciones         = r?.observaciones   ?? ''
  recetaError.value      = ''
  showRecetaModal.value  = true
}

async function submitReceta() {
  if (isSavingReceta.value) return
  isSavingReceta.value = true
  recetaError.value    = ''
  try {
    const payload: CreateRecetaRequest = {
      fechaEmision:         recetaEditForm.fechaEmision,
      odEsferico:           parseOptional(recetaEditForm.odEsferico),
      odCilindro:           parseOptional(recetaEditForm.odCilindro),
      odEje:                parseOptional(recetaEditForm.odEje),
      odAdicion:            parseOptional(recetaEditForm.odAdicion),
      oiEsferico:           parseOptional(recetaEditForm.oiEsferico),
      oiCilindro:           parseOptional(recetaEditForm.oiCilindro),
      oiEje:                parseOptional(recetaEditForm.oiEje),
      oiAdicion:            parseOptional(recetaEditForm.oiAdicion),
      distanciaInterpupilar:parseOptional(recetaEditForm.distanciaInterpupilar),
      avSinCorreccion:      recetaEditForm.avSinCorreccion.trim() || undefined,
      avConCorreccion:      recetaEditForm.avConCorreccion.trim() || undefined,
      observaciones:        recetaEditForm.observaciones.trim()   || undefined,
    }
    await createOrUpdateReceta(recetaConsultaId.value, payload)
    showRecetaModal.value = false
    reloadAll()
  } catch (err: unknown) {
    recetaError.value = err instanceof Error ? err.message : 'Error al guardar la receta.'
  } finally {
    isSavingReceta.value = false
  }
}

// ── Modal: Eliminar ───────────────────────────────────────────────────────

const showDeleteModal  = ref(false)
const isDeleting       = ref(false)
const deleteError      = ref('')
const consultaToDelete = ref<ConsultaClinica | null>(null)

function openDeleteModal(c: ConsultaClinica) {
  consultaToDelete.value = c
  deleteError.value      = ''
  showDeleteModal.value  = true
}

async function confirmDelete() {
  if (isDeleting.value || !consultaToDelete.value) return
  isDeleting.value  = true
  deleteError.value = ''
  try {
    await deleteConsulta(consultaToDelete.value.id)
    showDeleteModal.value = false
    reloadAll()
  } catch (err: unknown) {
    deleteError.value = err instanceof Error ? err.message : 'Error al eliminar la consulta.'
  } finally {
    isDeleting.value = false
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────

const AVATAR_PALETTE = [
  { bg: 'rgba(0,40,142,0.08)',    color: '#00288E' },
  { bg: 'rgba(0,103,128,0.08)',   color: '#006780' },
  { bg: 'rgba(32,0,177,0.08)',    color: '#2000B1' },
  { bg: 'rgba(117,118,132,0.10)', color: '#757684' },
]

function avatarStyle(id: number) {
  return AVATAR_PALETTE[id % AVATAR_PALETTE.length] ?? AVATAR_PALETTE[0] ?? { bg: 'rgba(0,40,142,0.08)', color: '#00288E' }
}

function initials(fn: string, ln: string) { return `${fn[0] ?? ''}${ln[0] ?? ''}`.toUpperCase() }

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })
}

function inputStyle(hasError: boolean) {
  return hasError
    ? 'border: 1.5px solid #BA1A1A; color: #181C20; background-color: #FFF8F7;'
    : 'border: 1px solid #C4C5D5; color: #181C20; background-color: #F7F9FE;'
}

const spinnerPath = 'M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z'
</script>

<template>
  <div class="min-h-screen" style="background-color: #F7F9FE;">
    <AppSidebar />
    <AppHeader />

    <main style="margin-left: 280px; padding-top: 64px;">
      <div class="p-8 max-w-7xl mx-auto">

        <!-- ── Encabezado ──────────────────────────────────────────────── -->
        <div class="flex items-center justify-between mb-6">
          <div>
            <h1
              class="text-3xl font-extrabold mb-1"
              style="font-family: 'Plus Jakarta Sans', system-ui, sans-serif; color: #181C20;"
            >Clínica</h1>
            <p class="text-sm font-medium" style="color: #757684;">
              <template v-if="activeTab === 'mis-consultas'">
                {{ misTotalCount }} consulta{{ misTotalCount !== 1 ? 's' : '' }} propia{{ misTotalCount !== 1 ? 's' : '' }}
              </template>
              <template v-else>
                {{ totalCount }} consulta{{ totalCount !== 1 ? 's' : '' }} en total
              </template>
            </p>
          </div>

          <button
            v-if="activeTab === 'mis-consultas' && auth.user?.professionalId"
            @click="openCreateModal"
            class="flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold transition-all active:scale-95"
            style="background-color: #00288E; color: white;"
          >
            <span class="material-symbols-outlined" style="font-size:18px;">add</span>
            Nueva Consulta
          </button>
        </div>

        <!-- ── Tabs ───────────────────────────────────────────────────── -->
        <div class="flex gap-1 p-1 rounded-2xl mb-6 inline-flex" style="background-color: rgba(196,197,213,0.18);">
          <button
            @click="activeTab = 'mis-consultas'"
            class="px-5 py-2 rounded-xl text-sm font-bold transition-all"
            :style="activeTab === 'mis-consultas'
              ? 'background-color: #ffffff; color: #00288E; box-shadow: 0 1px 4px rgba(0,40,142,0.10);'
              : 'color: #757684;'"
          >
            <span class="material-symbols-outlined align-middle mr-1" style="font-size:16px; vertical-align: -3px;">stethoscope</span>
            Mis Consultas
          </button>
          <button
            @click="activeTab = 'historial'"
            class="px-5 py-2 rounded-xl text-sm font-bold transition-all"
            :style="activeTab === 'historial'
              ? 'background-color: #ffffff; color: #00288E; box-shadow: 0 1px 4px rgba(0,40,142,0.10);'
              : 'color: #757684;'"
          >
            <span class="material-symbols-outlined align-middle mr-1" style="font-size:16px; vertical-align: -3px;">history</span>
            Historial Clínico
          </button>
        </div>

        <!-- ══════════════════════════════════════════════
             TAB: MIS CONSULTAS
        ══════════════════════════════════════════════ -->
        <div v-if="activeTab === 'mis-consultas'">

          <!-- Sin perfil profesional -->
          <div
            v-if="!auth.user?.professionalId"
            class="rounded-2xl py-16 text-center"
            style="background-color: #ffffff; box-shadow: 0 1px 3px rgba(196,197,213,0.25);"
          >
            <span class="material-symbols-outlined block mx-auto mb-3" style="color: #C4C5D5; font-size:48px;">person_off</span>
            <p class="text-sm font-semibold mb-1" style="color: #757684;">Tu cuenta no tiene perfil de profesional</p>
            <p class="text-xs" style="color: #C4C5D5;">Pedí al administrador que te asigne el rol correspondiente.</p>
          </div>

          <!-- Tabla Mis Consultas -->
          <div
            v-else
            class="rounded-2xl overflow-hidden"
            style="background-color: #ffffff; box-shadow: 0 1px 3px rgba(196,197,213,0.25); outline: 1px solid rgba(196,197,213,0.15);"
          >
            <div v-if="isLoadingMis" class="flex justify-center items-center py-20">
              <svg class="animate-spin w-7 h-7" style="color: #00288E;" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                <path class="opacity-75" fill="currentColor" :d="spinnerPath"/>
              </svg>
            </div>

            <div v-else-if="!misConsultas.length" class="py-20 text-center">
              <span class="material-symbols-outlined block mx-auto mb-3" style="color: #C4C5D5; font-size:48px;">medical_information</span>
              <p class="text-sm font-semibold mb-1" style="color: #757684;">No tenés consultas registradas</p>
              <p class="text-xs" style="color: #C4C5D5;">Usá el botón "Nueva Consulta" para registrar la primera.</p>
            </div>

            <table v-else class="w-full">
              <thead>
                <tr style="border-bottom: 1px solid rgba(196,197,213,0.25);">
                  <th class="px-6 py-3.5 text-left text-xs font-bold uppercase tracking-wider" style="color: #757684;">Fecha</th>
                  <th class="px-6 py-3.5 text-left text-xs font-bold uppercase tracking-wider" style="color: #757684;">Paciente</th>
                  <th class="px-6 py-3.5 text-left text-xs font-bold uppercase tracking-wider" style="color: #757684;">Diagnóstico</th>
                  <th class="px-6 py-3.5 text-left text-xs font-bold uppercase tracking-wider" style="color: #757684;">Receta</th>
                  <th class="px-6 py-3.5 text-right text-xs font-bold uppercase tracking-wider" style="color: #757684;">Acciones</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="c in misConsultas"
                  :key="c.id"
                  style="border-bottom: 1px solid rgba(196,197,213,0.12);"
                  onmouseover="this.style.backgroundColor='#F7F9FE'"
                  onmouseout="this.style.backgroundColor='transparent'"
                >
                  <td class="px-6 py-4">
                    <span class="text-sm font-semibold" style="color: #444653;">{{ formatDate(c.fechaConsulta) }}</span>
                  </td>
                  <td class="px-6 py-4">
                    <div class="flex items-center gap-3">
                      <div
                        class="w-8 h-8 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0"
                        :style="`background-color: ${avatarStyle(c.patientId).bg}; color: ${avatarStyle(c.patientId).color};`"
                      >{{ initials(c.patientFirstName, c.patientLastName) }}</div>
                      <div>
                        <div class="text-sm font-bold" style="color: #181C20;">{{ c.patientFirstName }} {{ c.patientLastName }}</div>
                        <div class="text-xs" style="color: #757684;">CI {{ c.patientCI }}</div>
                      </div>
                    </div>
                  </td>
                  <td class="px-6 py-4 max-w-xs">
                    <span class="text-sm" style="color: #181C20;">{{ c.diagnosticoPrincipal }}</span>
                    <span v-if="c.diagnosticoSecundario" class="block text-xs mt-0.5" style="color: #757684;">{{ c.diagnosticoSecundario }}</span>
                  </td>
                  <td class="px-6 py-4">
                    <span
                      v-if="c.receta"
                      class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold"
                      style="background-color: #D1FAE5; color: #065F46;"
                    >
                      <span class="material-symbols-outlined" style="font-size:12px;">check</span>
                      Con receta
                    </span>
                    <span v-else class="text-xs" style="color: #C4C5D5;">Sin receta</span>
                  </td>
                  <td class="px-6 py-4">
                    <div class="flex items-center justify-end gap-2">
                      <button
                        @click="openRecetaModal(c)"
                        class="p-1.5 rounded-lg transition-colors"
                        :title="c.receta ? 'Editar receta' : 'Agregar receta'"
                        style="color: #757684;"
                        onmouseover="this.style.backgroundColor='rgba(0,103,128,0.08)'; this.style.color='#006780'"
                        onmouseout="this.style.backgroundColor='transparent'; this.style.color='#757684'"
                      >
                        <span class="material-symbols-outlined" style="font-size:18px;">medical_services</span>
                      </button>
                      <button
                        @click="openEditModal(c)"
                        class="p-1.5 rounded-lg transition-colors"
                        title="Editar consulta"
                        style="color: #757684;"
                        onmouseover="this.style.backgroundColor='rgba(0,40,142,0.08)'; this.style.color='#00288E'"
                        onmouseout="this.style.backgroundColor='transparent'; this.style.color='#757684'"
                      >
                        <span class="material-symbols-outlined" style="font-size:18px;">edit</span>
                      </button>
                      <button
                        @click="openDeleteModal(c)"
                        class="p-1.5 rounded-lg transition-colors"
                        title="Eliminar consulta"
                        style="color: #757684;"
                        onmouseover="this.style.backgroundColor='rgba(186,26,26,0.08)'; this.style.color='#BA1A1A'"
                        onmouseout="this.style.backgroundColor='transparent'; this.style.color='#757684'"
                      >
                        <span class="material-symbols-outlined" style="font-size:18px;">delete</span>
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>

            <div
              v-if="misConsultas.length"
              class="flex items-center justify-between px-6 py-4"
              style="border-top: 1px solid rgba(196,197,213,0.2);"
            >
              <span class="text-xs font-medium" style="color: #757684;">{{ misTotalCount }} consulta{{ misTotalCount !== 1 ? 's' : '' }}</span>
              <div v-if="misTotalPages > 1" class="flex items-center gap-1">
                <button @click="goToMisPage(misPage - 1)" :disabled="misPage === 1" class="w-8 h-8 rounded-lg flex items-center justify-center disabled:opacity-30" style="color: #757684;">
                  <span class="material-symbols-outlined" style="font-size:18px;">chevron_left</span>
                </button>
                <button
                  v-for="p in misVisiblePages" :key="p"
                  @click="goToMisPage(p)"
                  class="w-8 h-8 rounded-lg text-sm font-bold"
                  :style="p === misPage ? 'background-color: #00288E; color: white;' : 'color: #757684;'"
                >{{ p }}</button>
                <button @click="goToMisPage(misPage + 1)" :disabled="misPage === misTotalPages" class="w-8 h-8 rounded-lg flex items-center justify-center disabled:opacity-30" style="color: #757684;">
                  <span class="material-symbols-outlined" style="font-size:18px;">chevron_right</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- ══════════════════════════════════════════════
             TAB: HISTORIAL CLÍNICO
        ══════════════════════════════════════════════ -->
        <div v-if="activeTab === 'historial'">

          <!-- Filtros -->
          <div class="flex flex-wrap items-center gap-3 mb-5">
            <div class="relative flex-1 min-w-48">
              <span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2" style="color: #757684; font-size:18px;">search</span>
              <input
                v-model="searchQuery"
                type="text"
                placeholder="Buscar por paciente, CI, diagnóstico..."
                class="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm outline-none"
                style="border: 1px solid #C4C5D5; background-color: #ffffff; color: #181C20;"
              />
            </div>
            <div class="relative">
              <span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2" style="color: #757684; font-size:16px;">person</span>
              <select
                v-model="filterProfessional"
                class="pl-9 pr-8 py-2.5 rounded-xl text-sm outline-none appearance-none"
                style="border: 1px solid #C4C5D5; background-color: #ffffff; color: #181C20; min-width: 200px;"
              >
                <option :value="0">Todos los profesionales</option>
                <option v-for="pr in professionals" :key="pr.id" :value="pr.id">
                  {{ pr.firstName }} {{ pr.lastName }}
                </option>
              </select>
            </div>
          </div>

          <!-- Tabla Historial -->
          <div
            class="rounded-2xl overflow-hidden"
            style="background-color: #ffffff; box-shadow: 0 1px 3px rgba(196,197,213,0.25); outline: 1px solid rgba(196,197,213,0.15);"
          >
            <div v-if="isLoading" class="flex justify-center items-center py-20">
              <svg class="animate-spin w-7 h-7" style="color: #00288E;" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                <path class="opacity-75" fill="currentColor" :d="spinnerPath"/>
              </svg>
            </div>

            <div v-else-if="!consultas.length" class="py-20 text-center">
              <span class="material-symbols-outlined block mx-auto mb-3" style="color: #C4C5D5; font-size:48px;">search_off</span>
              <p class="text-sm font-semibold" style="color: #757684;">No se encontraron consultas</p>
            </div>

            <table v-else class="w-full">
              <thead>
                <tr style="border-bottom: 1px solid rgba(196,197,213,0.25);">
                  <th class="px-6 py-3.5 text-left text-xs font-bold uppercase tracking-wider" style="color: #757684;">Fecha</th>
                  <th class="px-6 py-3.5 text-left text-xs font-bold uppercase tracking-wider" style="color: #757684;">Paciente</th>
                  <th class="px-6 py-3.5 text-left text-xs font-bold uppercase tracking-wider" style="color: #757684;">Profesional</th>
                  <th class="px-6 py-3.5 text-left text-xs font-bold uppercase tracking-wider" style="color: #757684;">Diagnóstico</th>
                  <th class="px-6 py-3.5 text-left text-xs font-bold uppercase tracking-wider" style="color: #757684;">Receta</th>
                  <th class="px-6 py-3.5 text-right text-xs font-bold uppercase tracking-wider" style="color: #757684;">Acciones</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="c in consultas"
                  :key="c.id"
                  style="border-bottom: 1px solid rgba(196,197,213,0.12);"
                  onmouseover="this.style.backgroundColor='#F7F9FE'"
                  onmouseout="this.style.backgroundColor='transparent'"
                >
                  <td class="px-6 py-4">
                    <span class="text-sm font-semibold" style="color: #444653;">{{ formatDate(c.fechaConsulta) }}</span>
                  </td>
                  <td class="px-6 py-4">
                    <div class="flex items-center gap-3">
                      <div
                        class="w-8 h-8 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0"
                        :style="`background-color: ${avatarStyle(c.patientId).bg}; color: ${avatarStyle(c.patientId).color};`"
                      >{{ initials(c.patientFirstName, c.patientLastName) }}</div>
                      <div>
                        <div class="text-sm font-bold" style="color: #181C20;">{{ c.patientFirstName }} {{ c.patientLastName }}</div>
                        <div class="text-xs" style="color: #757684;">CI {{ c.patientCI }}</div>
                      </div>
                    </div>
                  </td>
                  <td class="px-6 py-4">
                    <span class="text-sm font-medium" style="color: #444653;">{{ c.professionalFirstName }} {{ c.professionalLastName }}</span>
                  </td>
                  <td class="px-6 py-4 max-w-xs">
                    <span class="text-sm" style="color: #181C20;">{{ c.diagnosticoPrincipal }}</span>
                    <span v-if="c.diagnosticoSecundario" class="block text-xs mt-0.5" style="color: #757684;">{{ c.diagnosticoSecundario }}</span>
                  </td>
                  <td class="px-6 py-4">
                    <span
                      v-if="c.receta"
                      class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold"
                      style="background-color: #D1FAE5; color: #065F46;"
                    >
                      <span class="material-symbols-outlined" style="font-size:12px;">check</span>
                      Con receta
                    </span>
                    <span v-else class="text-xs" style="color: #C4C5D5;">Sin receta</span>
                  </td>
                  <td class="px-6 py-4">
                    <div class="flex items-center justify-end gap-2">
                      <button
                        @click="openRecetaModal(c)"
                        class="p-1.5 rounded-lg transition-colors"
                        :title="c.receta ? 'Editar receta' : 'Agregar receta'"
                        style="color: #757684;"
                        onmouseover="this.style.backgroundColor='rgba(0,103,128,0.08)'; this.style.color='#006780'"
                        onmouseout="this.style.backgroundColor='transparent'; this.style.color='#757684'"
                      >
                        <span class="material-symbols-outlined" style="font-size:18px;">medical_services</span>
                      </button>
                      <button
                        @click="openEditModal(c)"
                        class="p-1.5 rounded-lg transition-colors"
                        title="Editar consulta"
                        style="color: #757684;"
                        onmouseover="this.style.backgroundColor='rgba(0,40,142,0.08)'; this.style.color='#00288E'"
                        onmouseout="this.style.backgroundColor='transparent'; this.style.color='#757684'"
                      >
                        <span class="material-symbols-outlined" style="font-size:18px;">edit</span>
                      </button>
                      <button
                        @click="openDeleteModal(c)"
                        class="p-1.5 rounded-lg transition-colors"
                        title="Eliminar consulta"
                        style="color: #757684;"
                        onmouseover="this.style.backgroundColor='rgba(186,26,26,0.08)'; this.style.color='#BA1A1A'"
                        onmouseout="this.style.backgroundColor='transparent'; this.style.color='#757684'"
                      >
                        <span class="material-symbols-outlined" style="font-size:18px;">delete</span>
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>

            <div
              v-if="consultas.length"
              class="flex items-center justify-between px-6 py-4"
              style="border-top: 1px solid rgba(196,197,213,0.2);"
            >
              <span class="text-xs font-medium" style="color: #757684;">{{ totalCount }} consulta{{ totalCount !== 1 ? 's' : '' }} en total</span>
              <div v-if="totalPages > 1" class="flex items-center gap-1">
                <button @click="goToPage(currentPage - 1)" :disabled="currentPage === 1" class="w-8 h-8 rounded-lg flex items-center justify-center disabled:opacity-30" style="color: #757684;">
                  <span class="material-symbols-outlined" style="font-size:18px;">chevron_left</span>
                </button>
                <button
                  v-for="p in visiblePages" :key="p"
                  @click="goToPage(p)"
                  class="w-8 h-8 rounded-lg text-sm font-bold"
                  :style="p === currentPage ? 'background-color: #00288E; color: white;' : 'color: #757684;'"
                >{{ p }}</button>
                <button @click="goToPage(currentPage + 1)" :disabled="currentPage === totalPages" class="w-8 h-8 rounded-lg flex items-center justify-center disabled:opacity-30" style="color: #757684;">
                  <span class="material-symbols-outlined" style="font-size:18px;">chevron_right</span>
                </button>
              </div>
            </div>
          </div>
        </div>

      </div>
    </main>


    <!-- ══════════════════════════════════════════════════
         MODAL: NUEVA CONSULTA
    ══════════════════════════════════════════════════ -->
    <Teleport to="body">
      <Transition enter-active-class="transition-all duration-200 ease-out" enter-from-class="opacity-0" enter-to-class="opacity-100"
                  leave-active-class="transition-all duration-150 ease-in" leave-from-class="opacity-100" leave-to-class="opacity-0">
        <div
          v-if="showCreateModal"
          class="fixed inset-0 z-50 flex items-center justify-center p-4"
          style="background-color: rgba(24,28,32,0.5);"
          @click.self="showCreateModal = false"
        >
          <div
            class="w-full max-w-2xl rounded-3xl overflow-hidden"
            style="background-color: #ffffff; box-shadow: 0 24px 64px rgba(0,40,142,0.18);"
          >
            <div class="flex items-center justify-between px-8 pt-8 pb-6" style="border-bottom: 1px solid rgba(196,197,213,0.2);">
              <h3 class="text-xl font-extrabold" style="font-family: 'Plus Jakarta Sans', system-ui, sans-serif; color: #00288E;">
                Nueva Consulta Clínica
              </h3>
              <button @click="showCreateModal = false" style="color: #757684;">
                <span class="material-symbols-outlined" style="font-size:22px;">close</span>
              </button>
            </div>

            <form @submit.prevent="submitCreate" class="px-8 py-6 space-y-5 max-h-[70vh] overflow-y-auto">
              <div v-if="createError" class="flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium" style="background-color: #FFDAD6; color: #93000A;">
                <span class="material-symbols-outlined" style="font-size:18px;">error</span>{{ createError }}
              </div>

              <!-- Paciente (búsqueda) -->
              <div class="flex flex-col gap-1.5 relative">
                <label class="text-xs font-bold uppercase tracking-wider" style="color: #757684;">Paciente *</label>
                <div class="relative">
                  <span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2" style="color: #757684; font-size:16px;">search</span>
                  <input
                    v-model="patientSearch"
                    @input="onPatientInput"
                    @blur="onPatientInputBlur"
                    type="text"
                    placeholder="Buscar por nombre o CI..."
                    class="w-full pl-9 pr-9 py-3 rounded-xl text-sm outline-none"
                    :style="inputStyle(!!createErrors.patient)"
                  />
                  <button v-if="selectedPatient || patientSearch" type="button" @click="clearPatient"
                    class="absolute right-3 top-1/2 -translate-y-1/2" style="color: #757684;">
                    <span class="material-symbols-outlined" style="font-size:16px;">close</span>
                  </button>
                </div>
                <p v-if="createErrors.patient" class="text-xs font-medium" style="color: #BA1A1A;">{{ createErrors.patient }}</p>
                <div
                  v-if="showPatientDrop"
                  class="absolute top-full mt-1 w-full rounded-xl shadow-lg z-10 overflow-hidden"
                  style="background-color: #ffffff; border: 1px solid rgba(196,197,213,0.4);"
                >
                  <button
                    v-for="p in patientResults"
                    :key="p.id"
                    type="button"
                    @mousedown.prevent="selectPatient(p)"
                    class="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors"
                    onmouseover="this.style.backgroundColor='#F7F9FE'"
                    onmouseout="this.style.backgroundColor='transparent'"
                  >
                    <div
                      class="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0"
                      :style="`background-color: ${avatarStyle(p.id).bg}; color: ${avatarStyle(p.id).color};`"
                    >{{ initials(p.firstName, p.lastName) }}</div>
                    <div>
                      <div class="text-sm font-semibold" style="color: #181C20;">{{ p.firstName }} {{ p.lastName }}</div>
                      <div class="text-xs" style="color: #757684;">CI {{ p.ci }}</div>
                    </div>
                  </button>
                </div>
              </div>

              <!-- Fecha -->
              <div class="flex flex-col gap-1.5 w-48">
                <label class="text-xs font-bold uppercase tracking-wider" style="color: #757684;">Fecha *</label>
                <input v-model="createForm.fechaConsulta" type="date" class="px-4 py-3 rounded-xl text-sm outline-none" :style="inputStyle(!!createErrors.fechaConsulta)" />
                <p v-if="createErrors.fechaConsulta" class="text-xs font-medium" style="color: #BA1A1A;">{{ createErrors.fechaConsulta }}</p>
              </div>

              <!-- Motivo -->
              <div class="flex flex-col gap-1.5">
                <label class="text-xs font-bold uppercase tracking-wider" style="color: #757684;">Motivo de consulta *</label>
                <input v-model="createForm.motivo" type="text" class="px-4 py-3 rounded-xl text-sm outline-none" :style="inputStyle(!!createErrors.motivo)" />
                <p v-if="createErrors.motivo" class="text-xs font-medium" style="color: #BA1A1A;">{{ createErrors.motivo }}</p>
              </div>

              <!-- Anamnesis + Examen Físico -->
              <div class="grid grid-cols-2 gap-4">
                <div class="flex flex-col gap-1.5">
                  <label class="text-xs font-bold uppercase tracking-wider" style="color: #757684;">Anamnesis</label>
                  <textarea v-model="createForm.anamnesis" rows="3" class="px-4 py-3 rounded-xl text-sm outline-none resize-none" :style="inputStyle(false)"></textarea>
                </div>
                <div class="flex flex-col gap-1.5">
                  <label class="text-xs font-bold uppercase tracking-wider" style="color: #757684;">Examen Físico</label>
                  <textarea v-model="createForm.examenFisico" rows="3" class="px-4 py-3 rounded-xl text-sm outline-none resize-none" :style="inputStyle(false)"></textarea>
                </div>
              </div>

              <!-- Diagnósticos -->
              <div class="grid grid-cols-2 gap-4">
                <div class="flex flex-col gap-1.5">
                  <label class="text-xs font-bold uppercase tracking-wider" style="color: #757684;">Diagnóstico Principal *</label>
                  <input v-model="createForm.diagnosticoPrincipal" type="text" class="px-4 py-3 rounded-xl text-sm outline-none" :style="inputStyle(!!createErrors.diagnosticoPrincipal)" />
                  <p v-if="createErrors.diagnosticoPrincipal" class="text-xs font-medium" style="color: #BA1A1A;">{{ createErrors.diagnosticoPrincipal }}</p>
                </div>
                <div class="flex flex-col gap-1.5">
                  <label class="text-xs font-bold uppercase tracking-wider" style="color: #757684;">Diagnóstico Secundario</label>
                  <input v-model="createForm.diagnosticoSecundario" type="text" class="px-4 py-3 rounded-xl text-sm outline-none" :style="inputStyle(false)" />
                </div>
              </div>

              <!-- Plan + Observaciones -->
              <div class="grid grid-cols-2 gap-4">
                <div class="flex flex-col gap-1.5">
                  <label class="text-xs font-bold uppercase tracking-wider" style="color: #757684;">Plan de Tratamiento</label>
                  <textarea v-model="createForm.planTratamiento" rows="3" class="px-4 py-3 rounded-xl text-sm outline-none resize-none" :style="inputStyle(false)"></textarea>
                </div>
                <div class="flex flex-col gap-1.5">
                  <label class="text-xs font-bold uppercase tracking-wider" style="color: #757684;">Observaciones</label>
                  <textarea v-model="createForm.observaciones" rows="3" class="px-4 py-3 rounded-xl text-sm outline-none resize-none" :style="inputStyle(false)"></textarea>
                </div>
              </div>

              <!-- Toggle receta -->
              <div class="flex items-center justify-between px-4 py-3 rounded-xl" style="background-color: #F1F4F9;">
                <div class="flex items-center gap-2">
                  <span class="material-symbols-outlined" style="color: #006780; font-size:18px;">medical_services</span>
                  <span class="text-sm font-semibold" style="color: #444653;">Incluir receta óptica</span>
                </div>
                <button
                  type="button"
                  @click="withReceta = !withReceta"
                  class="relative w-12 h-6 rounded-full transition-all"
                  :style="withReceta ? 'background-color: #006780;' : 'background-color: #C4C5D5;'"
                >
                  <span
                    class="absolute top-1 w-4 h-4 rounded-full bg-white transition-all"
                    :style="withReceta ? 'left: calc(100% - 1.25rem);' : 'left: 0.25rem;'"
                  ></span>
                </button>
              </div>

              <!-- Receta óptica (condicional) -->
              <div v-if="withReceta" class="rounded-2xl p-4 space-y-4" style="background-color: #F7F9FE; border: 1px solid rgba(0,103,128,0.15);">
                <div class="flex items-center gap-2 mb-2">
                  <span class="material-symbols-outlined" style="color: #006780; font-size:18px;">visibility</span>
                  <span class="text-xs font-bold uppercase tracking-wider" style="color: #006780;">Prescripción óptica</span>
                </div>
                <div class="flex flex-col gap-1.5">
                  <label class="text-xs font-bold uppercase tracking-wider" style="color: #757684;">Fecha de Emisión</label>
                  <input v-model="recetaForm.fechaEmision" type="date" class="px-4 py-2.5 rounded-xl text-sm outline-none w-48" :style="inputStyle(false)" />
                </div>
                <div class="overflow-x-auto">
                  <table class="w-full text-sm">
                    <thead>
                      <tr>
                        <th class="text-left py-1.5 pr-4 text-xs font-bold uppercase tracking-wider" style="color: #757684; width:40px;"></th>
                        <th class="text-center py-1.5 px-2 text-xs font-bold uppercase tracking-wider" style="color: #757684;">Esférico</th>
                        <th class="text-center py-1.5 px-2 text-xs font-bold uppercase tracking-wider" style="color: #757684;">Cilindro</th>
                        <th class="text-center py-1.5 px-2 text-xs font-bold uppercase tracking-wider" style="color: #757684;">Eje</th>
                        <th class="text-center py-1.5 px-2 text-xs font-bold uppercase tracking-wider" style="color: #757684;">Adición</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td class="pr-4 py-1.5 text-xs font-bold" style="color: #181C20;">OD</td>
                        <td class="px-1 py-1"><input v-model="recetaForm.odEsferico" type="number" step="0.25" placeholder="0.00" class="w-full px-2 py-1.5 rounded-lg text-sm text-center outline-none" :style="inputStyle(false)" /></td>
                        <td class="px-1 py-1"><input v-model="recetaForm.odCilindro" type="number" step="0.25" placeholder="0.00" class="w-full px-2 py-1.5 rounded-lg text-sm text-center outline-none" :style="inputStyle(false)" /></td>
                        <td class="px-1 py-1"><input v-model="recetaForm.odEje"      type="number" step="1"    placeholder="0"    class="w-full px-2 py-1.5 rounded-lg text-sm text-center outline-none" :style="inputStyle(false)" /></td>
                        <td class="px-1 py-1"><input v-model="recetaForm.odAdicion"  type="number" step="0.25" placeholder="0.00" class="w-full px-2 py-1.5 rounded-lg text-sm text-center outline-none" :style="inputStyle(false)" /></td>
                      </tr>
                      <tr>
                        <td class="pr-4 py-1.5 text-xs font-bold" style="color: #181C20;">OI</td>
                        <td class="px-1 py-1"><input v-model="recetaForm.oiEsferico" type="number" step="0.25" placeholder="0.00" class="w-full px-2 py-1.5 rounded-lg text-sm text-center outline-none" :style="inputStyle(false)" /></td>
                        <td class="px-1 py-1"><input v-model="recetaForm.oiCilindro" type="number" step="0.25" placeholder="0.00" class="w-full px-2 py-1.5 rounded-lg text-sm text-center outline-none" :style="inputStyle(false)" /></td>
                        <td class="px-1 py-1"><input v-model="recetaForm.oiEje"      type="number" step="1"    placeholder="0"    class="w-full px-2 py-1.5 rounded-lg text-sm text-center outline-none" :style="inputStyle(false)" /></td>
                        <td class="px-1 py-1"><input v-model="recetaForm.oiAdicion"  type="number" step="0.25" placeholder="0.00" class="w-full px-2 py-1.5 rounded-lg text-sm text-center outline-none" :style="inputStyle(false)" /></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <div class="grid grid-cols-3 gap-3">
                  <div class="flex flex-col gap-1">
                    <label class="text-xs font-bold uppercase tracking-wider" style="color: #757684;">D.I. (mm)</label>
                    <input v-model="recetaForm.distanciaInterpupilar" type="number" step="0.5" placeholder="63.0" class="px-3 py-2 rounded-xl text-sm outline-none" :style="inputStyle(false)" />
                  </div>
                  <div class="flex flex-col gap-1">
                    <label class="text-xs font-bold uppercase tracking-wider" style="color: #757684;">AV sin corrección</label>
                    <input v-model="recetaForm.avSinCorreccion" type="text" placeholder="20/200" class="px-3 py-2 rounded-xl text-sm outline-none" :style="inputStyle(false)" />
                  </div>
                  <div class="flex flex-col gap-1">
                    <label class="text-xs font-bold uppercase tracking-wider" style="color: #757684;">AV con corrección</label>
                    <input v-model="recetaForm.avConCorreccion" type="text" placeholder="20/20" class="px-3 py-2 rounded-xl text-sm outline-none" :style="inputStyle(false)" />
                  </div>
                </div>
                <div class="flex flex-col gap-1">
                  <label class="text-xs font-bold uppercase tracking-wider" style="color: #757684;">Observaciones de receta</label>
                  <textarea v-model="recetaForm.observaciones" rows="2" class="px-4 py-2 rounded-xl text-sm outline-none resize-none" :style="inputStyle(false)"></textarea>
                </div>
              </div>
            </form>

            <div class="px-8 py-6 flex justify-end gap-3" style="border-top: 1px solid rgba(196,197,213,0.2);">
              <button type="button" @click="showCreateModal = false" class="px-6 py-3 rounded-full text-sm font-bold" style="background-color: #E6E8ED; color: #444653;">Cancelar</button>
              <button @click="submitCreate" :disabled="isCreating" class="flex items-center gap-2 px-6 py-3 rounded-full text-sm font-bold disabled:opacity-60" style="background-color: #00288E; color: white;">
                <svg v-if="isCreating" class="animate-spin w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" :d="spinnerPath"/></svg>
                {{ isCreating ? 'Registrando...' : 'Registrar Consulta' }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>


    <!-- ══════════════════════════════════════════════════
         MODAL: EDITAR CONSULTA
    ══════════════════════════════════════════════════ -->
    <Teleport to="body">
      <Transition enter-active-class="transition-all duration-200 ease-out" enter-from-class="opacity-0" enter-to-class="opacity-100"
                  leave-active-class="transition-all duration-150 ease-in" leave-from-class="opacity-100" leave-to-class="opacity-0">
        <div v-if="showEditModal" class="fixed inset-0 z-50 flex items-center justify-center p-4" style="background-color: rgba(24,28,32,0.5);" @click.self="showEditModal = false">
          <div class="w-full max-w-2xl rounded-3xl overflow-hidden" style="background-color: #ffffff; box-shadow: 0 24px 64px rgba(0,40,142,0.18);">
            <div class="flex items-center justify-between px-8 pt-8 pb-6" style="border-bottom: 1px solid rgba(196,197,213,0.2);">
              <div>
                <h3 class="text-xl font-extrabold" style="font-family: 'Plus Jakarta Sans', system-ui, sans-serif; color: #00288E;">Editar Consulta</h3>
                <p v-if="selectedConsulta" class="text-sm mt-0.5" style="color: #757684;">
                  {{ selectedConsulta.patientFirstName }} {{ selectedConsulta.patientLastName }} · {{ formatDate(selectedConsulta.fechaConsulta) }}
                </p>
              </div>
              <button @click="showEditModal = false" style="color: #757684;"><span class="material-symbols-outlined" style="font-size:22px;">close</span></button>
            </div>

            <form @submit.prevent="submitEdit" class="px-8 py-6 space-y-5 max-h-[70vh] overflow-y-auto">
              <div v-if="editError" class="flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium" style="background-color: #FFDAD6; color: #93000A;">
                <span class="material-symbols-outlined" style="font-size:18px;">error</span>{{ editError }}
              </div>

              <div class="flex flex-col gap-1.5 w-48">
                <label class="text-xs font-bold uppercase tracking-wider" style="color: #757684;">Fecha *</label>
                <input v-model="editForm.fechaConsulta" type="date" class="px-4 py-3 rounded-xl text-sm outline-none" :style="inputStyle(!!editErrors.fechaConsulta)" />
                <p v-if="editErrors.fechaConsulta" class="text-xs font-medium" style="color: #BA1A1A;">{{ editErrors.fechaConsulta }}</p>
              </div>

              <div class="flex flex-col gap-1.5">
                <label class="text-xs font-bold uppercase tracking-wider" style="color: #757684;">Motivo *</label>
                <input v-model="editForm.motivo" type="text" class="px-4 py-3 rounded-xl text-sm outline-none" :style="inputStyle(!!editErrors.motivo)" />
                <p v-if="editErrors.motivo" class="text-xs font-medium" style="color: #BA1A1A;">{{ editErrors.motivo }}</p>
              </div>

              <div class="grid grid-cols-2 gap-4">
                <div class="flex flex-col gap-1.5">
                  <label class="text-xs font-bold uppercase tracking-wider" style="color: #757684;">Anamnesis</label>
                  <textarea v-model="editForm.anamnesis" rows="3" class="px-4 py-3 rounded-xl text-sm outline-none resize-none" :style="inputStyle(false)"></textarea>
                </div>
                <div class="flex flex-col gap-1.5">
                  <label class="text-xs font-bold uppercase tracking-wider" style="color: #757684;">Examen Físico</label>
                  <textarea v-model="editForm.examenFisico" rows="3" class="px-4 py-3 rounded-xl text-sm outline-none resize-none" :style="inputStyle(false)"></textarea>
                </div>
              </div>

              <div class="grid grid-cols-2 gap-4">
                <div class="flex flex-col gap-1.5">
                  <label class="text-xs font-bold uppercase tracking-wider" style="color: #757684;">Diagnóstico Principal *</label>
                  <input v-model="editForm.diagnosticoPrincipal" type="text" class="px-4 py-3 rounded-xl text-sm outline-none" :style="inputStyle(!!editErrors.diagnosticoPrincipal)" />
                  <p v-if="editErrors.diagnosticoPrincipal" class="text-xs font-medium" style="color: #BA1A1A;">{{ editErrors.diagnosticoPrincipal }}</p>
                </div>
                <div class="flex flex-col gap-1.5">
                  <label class="text-xs font-bold uppercase tracking-wider" style="color: #757684;">Diagnóstico Secundario</label>
                  <input v-model="editForm.diagnosticoSecundario" type="text" class="px-4 py-3 rounded-xl text-sm outline-none" :style="inputStyle(false)" />
                </div>
              </div>

              <div class="grid grid-cols-2 gap-4">
                <div class="flex flex-col gap-1.5">
                  <label class="text-xs font-bold uppercase tracking-wider" style="color: #757684;">Plan de Tratamiento</label>
                  <textarea v-model="editForm.planTratamiento" rows="3" class="px-4 py-3 rounded-xl text-sm outline-none resize-none" :style="inputStyle(false)"></textarea>
                </div>
                <div class="flex flex-col gap-1.5">
                  <label class="text-xs font-bold uppercase tracking-wider" style="color: #757684;">Observaciones</label>
                  <textarea v-model="editForm.observaciones" rows="3" class="px-4 py-3 rounded-xl text-sm outline-none resize-none" :style="inputStyle(false)"></textarea>
                </div>
              </div>
            </form>

            <div class="px-8 py-6 flex justify-end gap-3" style="border-top: 1px solid rgba(196,197,213,0.2);">
              <button type="button" @click="showEditModal = false" class="px-6 py-3 rounded-full text-sm font-bold" style="background-color: #E6E8ED; color: #444653;">Cancelar</button>
              <button @click="submitEdit" :disabled="isEditing" class="flex items-center gap-2 px-6 py-3 rounded-full text-sm font-bold disabled:opacity-60" style="background-color: #00288E; color: white;">
                <svg v-if="isEditing" class="animate-spin w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" :d="spinnerPath"/></svg>
                {{ isEditing ? 'Guardando...' : 'Guardar Cambios' }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>


    <!-- ══════════════════════════════════════════════════
         MODAL: RECETA ÓPTICA
    ══════════════════════════════════════════════════ -->
    <Teleport to="body">
      <Transition enter-active-class="transition-all duration-200 ease-out" enter-from-class="opacity-0" enter-to-class="opacity-100"
                  leave-active-class="transition-all duration-150 ease-in" leave-from-class="opacity-100" leave-to-class="opacity-0">
        <div v-if="showRecetaModal" class="fixed inset-0 z-50 flex items-center justify-center p-4" style="background-color: rgba(24,28,32,0.5);" @click.self="showRecetaModal = false">
          <div class="w-full max-w-xl rounded-3xl overflow-hidden" style="background-color: #ffffff; box-shadow: 0 24px 64px rgba(0,103,128,0.18);">
            <div class="flex items-center justify-between px-8 pt-8 pb-6" style="border-bottom: 1px solid rgba(196,197,213,0.2);">
              <h3 class="text-xl font-extrabold" style="font-family: 'Plus Jakarta Sans', system-ui, sans-serif; color: #006780;">Receta Óptica</h3>
              <button @click="showRecetaModal = false" style="color: #757684;"><span class="material-symbols-outlined" style="font-size:22px;">close</span></button>
            </div>

            <form @submit.prevent="submitReceta" class="px-8 py-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div v-if="recetaError" class="flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium" style="background-color: #FFDAD6; color: #93000A;">
                <span class="material-symbols-outlined" style="font-size:18px;">error</span>{{ recetaError }}
              </div>

              <div class="flex flex-col gap-1.5">
                <label class="text-xs font-bold uppercase tracking-wider" style="color: #757684;">Fecha de Emisión</label>
                <input v-model="recetaEditForm.fechaEmision" type="date" class="px-4 py-3 rounded-xl text-sm outline-none w-48" :style="inputStyle(false)" />
              </div>

              <div class="overflow-x-auto">
                <table class="w-full text-sm">
                  <thead>
                    <tr>
                      <th class="text-left py-1.5 pr-4 text-xs font-bold uppercase tracking-wider" style="color: #757684; width:40px;"></th>
                      <th class="text-center py-1.5 px-2 text-xs font-bold uppercase tracking-wider" style="color: #757684;">Esférico</th>
                      <th class="text-center py-1.5 px-2 text-xs font-bold uppercase tracking-wider" style="color: #757684;">Cilindro</th>
                      <th class="text-center py-1.5 px-2 text-xs font-bold uppercase tracking-wider" style="color: #757684;">Eje</th>
                      <th class="text-center py-1.5 px-2 text-xs font-bold uppercase tracking-wider" style="color: #757684;">Adición</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td class="pr-4 py-1.5 text-xs font-bold" style="color: #181C20;">OD</td>
                      <td class="px-1 py-1"><input v-model="recetaEditForm.odEsferico" type="number" step="0.25" placeholder="0.00" class="w-full px-2 py-1.5 rounded-lg text-sm text-center outline-none" :style="inputStyle(false)" /></td>
                      <td class="px-1 py-1"><input v-model="recetaEditForm.odCilindro" type="number" step="0.25" placeholder="0.00" class="w-full px-2 py-1.5 rounded-lg text-sm text-center outline-none" :style="inputStyle(false)" /></td>
                      <td class="px-1 py-1"><input v-model="recetaEditForm.odEje"      type="number" step="1"    placeholder="0"    class="w-full px-2 py-1.5 rounded-lg text-sm text-center outline-none" :style="inputStyle(false)" /></td>
                      <td class="px-1 py-1"><input v-model="recetaEditForm.odAdicion"  type="number" step="0.25" placeholder="0.00" class="w-full px-2 py-1.5 rounded-lg text-sm text-center outline-none" :style="inputStyle(false)" /></td>
                    </tr>
                    <tr>
                      <td class="pr-4 py-1.5 text-xs font-bold" style="color: #181C20;">OI</td>
                      <td class="px-1 py-1"><input v-model="recetaEditForm.oiEsferico" type="number" step="0.25" placeholder="0.00" class="w-full px-2 py-1.5 rounded-lg text-sm text-center outline-none" :style="inputStyle(false)" /></td>
                      <td class="px-1 py-1"><input v-model="recetaEditForm.oiCilindro" type="number" step="0.25" placeholder="0.00" class="w-full px-2 py-1.5 rounded-lg text-sm text-center outline-none" :style="inputStyle(false)" /></td>
                      <td class="px-1 py-1"><input v-model="recetaEditForm.oiEje"      type="number" step="1"    placeholder="0"    class="w-full px-2 py-1.5 rounded-lg text-sm text-center outline-none" :style="inputStyle(false)" /></td>
                      <td class="px-1 py-1"><input v-model="recetaEditForm.oiAdicion"  type="number" step="0.25" placeholder="0.00" class="w-full px-2 py-1.5 rounded-lg text-sm text-center outline-none" :style="inputStyle(false)" /></td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div class="grid grid-cols-3 gap-3">
                <div class="flex flex-col gap-1">
                  <label class="text-xs font-bold uppercase tracking-wider" style="color: #757684;">D.I. (mm)</label>
                  <input v-model="recetaEditForm.distanciaInterpupilar" type="number" step="0.5" placeholder="63.0" class="px-3 py-2 rounded-xl text-sm outline-none" :style="inputStyle(false)" />
                </div>
                <div class="flex flex-col gap-1">
                  <label class="text-xs font-bold uppercase tracking-wider" style="color: #757684;">AV sin corrección</label>
                  <input v-model="recetaEditForm.avSinCorreccion" type="text" placeholder="20/200" class="px-3 py-2 rounded-xl text-sm outline-none" :style="inputStyle(false)" />
                </div>
                <div class="flex flex-col gap-1">
                  <label class="text-xs font-bold uppercase tracking-wider" style="color: #757684;">AV con corrección</label>
                  <input v-model="recetaEditForm.avConCorreccion" type="text" placeholder="20/20" class="px-3 py-2 rounded-xl text-sm outline-none" :style="inputStyle(false)" />
                </div>
              </div>

              <div class="flex flex-col gap-1">
                <label class="text-xs font-bold uppercase tracking-wider" style="color: #757684;">Observaciones</label>
                <textarea v-model="recetaEditForm.observaciones" rows="2" class="px-4 py-2 rounded-xl text-sm outline-none resize-none" :style="inputStyle(false)"></textarea>
              </div>
            </form>

            <div class="px-8 py-6 flex justify-end gap-3" style="border-top: 1px solid rgba(196,197,213,0.2);">
              <button type="button" @click="showRecetaModal = false" class="px-6 py-3 rounded-full text-sm font-bold" style="background-color: #E6E8ED; color: #444653;">Cancelar</button>
              <button @click="submitReceta" :disabled="isSavingReceta" class="flex items-center gap-2 px-6 py-3 rounded-full text-sm font-bold disabled:opacity-60" style="background-color: #006780; color: white;">
                <svg v-if="isSavingReceta" class="animate-spin w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" :d="spinnerPath"/></svg>
                {{ isSavingReceta ? 'Guardando...' : 'Guardar Receta' }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>


    <!-- ══════════════════════════════════════════════════
         MODAL: CONFIRMAR ELIMINAR
    ══════════════════════════════════════════════════ -->
    <Teleport to="body">
      <Transition enter-active-class="transition-all duration-200 ease-out" enter-from-class="opacity-0" enter-to-class="opacity-100"
                  leave-active-class="transition-all duration-150 ease-in" leave-from-class="opacity-100" leave-to-class="opacity-0">
        <div v-if="showDeleteModal" class="fixed inset-0 z-50 flex items-center justify-center p-4" style="background-color: rgba(24,28,32,0.5);" @click.self="showDeleteModal = false">
          <div class="w-full max-w-sm rounded-3xl overflow-hidden" style="background-color: #ffffff; box-shadow: 0 24px 64px rgba(186,26,26,0.12);">
            <div class="px-8 pt-8 pb-6 text-center">
              <div class="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-5" style="background-color: #FFDAD6;">
                <span class="material-symbols-outlined" style="color: #BA1A1A; font-size:28px;">delete</span>
              </div>
              <h3 class="text-lg font-extrabold mb-2" style="font-family: 'Plus Jakarta Sans', system-ui, sans-serif; color: #181C20;">Eliminar Consulta</h3>
              <p class="text-sm" style="color: #444653;">
                ¿Eliminar la consulta del
                <strong style="color:#181C20;">{{ formatDate(consultaToDelete?.fechaConsulta ?? '') }}</strong>
                para
                <strong style="color:#181C20;">{{ consultaToDelete?.patientFirstName }} {{ consultaToDelete?.patientLastName }}</strong>?
                Esta acción no se puede deshacer.
              </p>
              <div v-if="deleteError" class="mt-4 flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium" style="background-color: #FFDAD6; color: #93000A;">
                <span class="material-symbols-outlined" style="font-size:18px;">error</span>{{ deleteError }}
              </div>
            </div>
            <div class="px-8 pb-8 flex gap-3">
              <button type="button" @click="showDeleteModal = false" class="flex-1 py-3 rounded-full text-sm font-bold" style="background-color: #E6E8ED; color: #444653;">Cancelar</button>
              <button @click="confirmDelete" :disabled="isDeleting" class="flex-1 flex items-center justify-center gap-2 py-3 rounded-full text-sm font-bold disabled:opacity-60" style="background-color: #BA1A1A; color: white;">
                <svg v-if="isDeleting" class="animate-spin w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" :d="spinnerPath"/></svg>
                {{ isDeleting ? 'Eliminando...' : 'Eliminar' }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

  </div>
</template>
