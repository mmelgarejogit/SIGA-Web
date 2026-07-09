<script setup lang="ts">
import { inputStyle, avatarStyle, initials } from "@/composables/useFieldStyles"
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
  cambiarEstadoConsulta,
} from "@/services/clinicaService"
import { getEstadosByEntidad, type EstadoConfig } from "@/services/estadoConfigService"
import { http } from "@/api/http"
import BaseButton from "@/components/BaseButton.vue"
import BaseModal from "@/components/BaseModal.vue"
import BaseTable from "@/components/BaseTable.vue"
import SearchInput from "@/components/SearchInput.vue"
import RowContextMenu, { type ContextMenuItem } from "@/components/RowContextMenu.vue"
import SearchableSelect from "@/components/SearchableSelect.vue"
import DateInput from "@/components/DateInput.vue"

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

const professionalOptions = computed(() =>
  professionals.value.map(p => ({ value: p.id, label: `${p.firstName} ${p.lastName}` })),
)

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
const filterProfessional = ref<number | null>(null)
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

const PAGE_SIZE = 10

const rangeStart = computed(() =>
  totalCount.value === 0 ? 0 : (currentPage.value - 1) * PAGE_SIZE + 1,
)
const rangeEnd = computed(() => Math.min(currentPage.value * PAGE_SIZE, totalCount.value))

const visiblePages = computed(() => {
  const total = totalPages.value
  const cur = currentPage.value
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const pages: (number | "...")[] = [1]
  if (cur > 3) pages.push("...")
  for (let p = Math.max(2, cur - 1); p <= Math.min(total - 1, cur + 1); p++) pages.push(p)
  if (cur < total - 2) pages.push("...")
  pages.push(total)
  return pages
})

watch([searchQuery, filterProfessional, filterDateFrom, filterDateTo], () => {
  if (searchDebounce) clearTimeout(searchDebounce)
  searchDebounce = setTimeout(() => {
    currentPage.value = 1
    loadConsultas()
  }, 350)
})

// ── Estados de consulta ───────────────────────────────────────────────────

const estadosConsulta = ref<EstadoConfig[]>([])

function estadoById(id: number | undefined) {
  return estadosConsulta.value.find(e => e.id === id)
}

function estadoByCode(code: string) {
  return estadosConsulta.value.find(e => e.codigoInterno === code)
}

// ── Cambio de estado ──────────────────────────────────────────────────────

const isCambiandoEstado = ref(false)

async function cambiarEstado(consulta: ConsultaClinica, codigoDestino: string) {
  const destino = estadoByCode(codigoDestino)
  if (!destino) return
  isCambiandoEstado.value = true
  try {
    const updated = await cambiarEstadoConsulta(consulta.id, destino.id)
    const idx = consultas.value.findIndex(c => c.id === consulta.id)
    if (idx !== -1) consultas.value[idx] = updated
  } catch { /* silencioso */ }
  finally { isCambiandoEstado.value = false }
}

onMounted(() => {
  loadConsultas()
  if (showProfessionalFilter.value) loadProfessionals()
  getEstadosByEntidad("Consulta").then(e => { estadosConsulta.value = e }).catch(() => {})
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

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

const columns = [
  { key: "fecha", label: "Fecha" },
  { key: "paciente", label: "Paciente" },
  { key: "profesional", label: "Profesional" },
  { key: "diagnostico", label: "Diagnóstico" },
  { key: "estado", label: "Estado" },
  { key: "acciones", label: "", align: "right" as const },
]

function rowMenuItems(c: ConsultaClinica): ContextMenuItem[] {
  const canEdit   = auth.hasPermission("editar_consulta")
  const canDelete = auth.hasPermission("eliminar_consulta")
  const codigo    = estadoById(c.estadoId)?.codigoInterno

  return [
    {
      type: "item",
      label: c.receta ? "Ver / Editar receta" : "Agregar receta",
      icon: "medical_services",
      action: () => openRecetaModal(c),
      hidden: !canEdit,
    },
    {
      type: "item",
      label: "Editar consulta",
      icon: "edit",
      action: () => router.push(`/clinica/consultas/${c.id}/editar`),
      hidden: !canEdit,
    },
    // ── Transiciones de estado ──
    ...(canEdit && codigo === "Pendiente" ? [{
      type: "item" as const,
      label: "Abrir consulta",
      icon: "play_circle",
      action: () => cambiarEstado(c, "Abierta"),
    }] : []),
    ...(canEdit && codigo === "Abierta" ? [{
      type: "item" as const,
      label: "Cerrar consulta",
      icon: "check_circle",
      action: () => cambiarEstado(c, "Cerrada"),
    }] : []),
    ...(canEdit && (codigo === "Pendiente" || codigo === "Abierta") ? [
      { type: "separator" as const },
      {
        type: "item" as const,
        label: "Cancelar consulta",
        icon: "cancel",
        danger: true,
        action: () => cambiarEstado(c, "Cancelada"),
      },
    ] : []),
    // ── Eliminar ──
    ...(canDelete ? [
      { type: "separator" as const },
      {
        type: "item" as const,
        label: "Eliminar",
        icon: "delete",
        danger: true,
        action: () => openDeleteModal(c),
      },
    ] : []),
  ]
}
</script>

<template>
  <div class="min-h-screen" style="background-color: var(--color-surface)">
    <AppSidebar />
    <AppHeader />

    <main style="margin-left: var(--sidebar-width); transition: margin-left 0.25s ease; padding-top: 64px">
      <div class="p-4 sm:p-6 lg:p-8">
        <!-- Page header -->
        <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-8">
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
          <div v-if="showProfessionalFilter" class="prof-filter">
            <SearchableSelect
              :model-value="filterProfessional"
              :options="professionalOptions"
              null-label="Todos los profesionales"
              @update:model-value="filterProfessional = $event as number | null"
            />
          </div>
        </div>

        <!-- Table -->
        <div
          class="rounded-lg overflow-hidden"
          style="
            background-color: var(--color-surface-container-lowest);
            box-shadow: var(--shadow-sm);
            outline: 1px solid var(--color-hairline);
          "
        >
          <BaseTable
            :columns="columns"
            :items="consultas"
            :loading="isLoading"
            emptyText="No hay consultas para mostrar."
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
              <div class="flex flex-col gap-1.5">
                <!-- Badge de estado -->
                <span v-if="item.estadoNombre"
                  class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold w-fit"
                  :style="`background-color: ${item.estadoColor}22; color: ${item.estadoColor}`">
                  <span class="w-1.5 h-1.5 rounded-full flex-shrink-0"
                    :style="`background-color: ${item.estadoColor}`"></span>
                  {{ item.estadoNombre }}
                </span>
                <!-- Badge de receta -->
                <span v-if="item.receta"
                  class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold w-fit"
                  style="background-color: var(--color-success-container); color: var(--color-on-success-container)">
                  <span class="material-symbols-outlined" style="font-size: 12px">clinical_notes</span>
                  Con receta
                </span>
              </div>
            </template>

            <template #acciones="{ item }">
              <div class="flex justify-end">
                <RowContextMenu :items="rowMenuItems(item)" />
              </div>
            </template>
          </BaseTable>

          <!-- Footer: conteo + paginador -->
          <div
            v-if="consultas.length > 0"
            class="px-6 py-4 flex items-center justify-between flex-wrap gap-4"
            style="border-top: 1px solid var(--color-hairline-soft); background-color: var(--color-surface-container-lowest);"
          >
            <span class="text-sm" style="color: var(--color-on-surface-variant)">
              Mostrando
              <strong style="color: var(--color-on-surface)">{{ rangeStart }}–{{ rangeEnd }}</strong>
              de
              <strong style="color: var(--color-on-surface)">{{ totalCount }}</strong>
              consultas
            </span>
            <div v-if="totalPages > 1" class="flex items-center gap-1">
              <button
                @click="goToPage(currentPage - 1)"
                :disabled="currentPage === 1"
                class="w-9 h-9 rounded-full flex items-center justify-center transition-all disabled:opacity-30 hover:bg-surface-container-high"
                style="color: var(--color-on-surface-variant)"
              ><span class="material-symbols-outlined" style="font-size: 18px">chevron_left</span></button>
              <template v-for="p in visiblePages" :key="p">
                <span v-if="p === '...'" class="w-9 h-9 flex items-center justify-center text-sm" style="color: var(--color-outline)">…</span>
                <button
                  v-else
                  @click="goToPage(p as number)"
                  class="w-9 h-9 rounded-full text-sm font-semibold transition-all"
                  :class="currentPage === p ? 'bg-primary text-on-primary' : 'text-on-surface-variant hover:bg-surface-container-high'"
                >{{ p }}</button>
              </template>
              <button
                @click="goToPage(currentPage + 1)"
                :disabled="currentPage === totalPages"
                class="w-9 h-9 rounded-full flex items-center justify-center transition-all disabled:opacity-30 hover:bg-surface-container-high"
                style="color: var(--color-on-surface-variant)"
              ><span class="material-symbols-outlined" style="font-size: 18px">chevron_right</span></button>
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
          <p v-if="editErrors.motivo" class="text-xs font-medium" style="color: var(--color-error)">
            {{ editErrors.motivo }}
          </p>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div class="flex flex-col gap-1.5">
            <label
              class="text-xs font-bold uppercase tracking-wider"
              style="color: var(--color-outline)"
              >Anamnesis</label
            >
            <textarea
              v-model="editForm.anamnesis"
              rows="3"
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
              rows="3"
              class="px-4 py-3 text-sm outline-none appearance-none shadow-none resize-none"
              :style="inputStyle(false)"
            ></textarea>
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
          <div class="flex flex-col gap-1.5">
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
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div class="flex flex-col gap-1.5">
            <label
              class="text-xs font-bold uppercase tracking-wider"
              style="color: var(--color-outline)"
              >Plan de Tratamiento</label
            >
            <textarea
              v-model="editForm.planTratamiento"
              rows="3"
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
              rows="3"
              class="px-4 py-3 text-sm outline-none appearance-none shadow-none resize-none"
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
    <BaseModal :show="showRecetaModal" title="Receta Óptica" size="lg" @close="showRecetaModal = false">
      <form @submit.prevent="submitReceta" class="space-y-5">
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
          <DateInput v-model="recetaEditForm.fechaEmision" />
        </div>

        <div class="overflow-x-auto">
          <div class="overflow-x-auto"><table class="w-full min-w-[640px] text-sm">
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
                    class="w-20 px-2 py-2 text-sm outline-none appearance-none shadow-none"
                    :style="inputStyle(false)"
                  />
                </td>
                <td class="py-2 pr-2">
                  <input
                    v-model="recetaEditForm.odCilindro"
                    type="text"
                    placeholder="-0.00"
                    class="w-20 px-2 py-2 text-sm outline-none appearance-none shadow-none"
                    :style="inputStyle(false)"
                  />
                </td>
                <td class="py-2 pr-2">
                  <input
                    v-model="recetaEditForm.odEje"
                    type="text"
                    placeholder="0"
                    class="w-20 px-2 py-2 text-sm outline-none appearance-none shadow-none"
                    :style="inputStyle(false)"
                  />
                </td>
                <td class="py-2 pr-2">
                  <input
                    v-model="recetaEditForm.odAdicion"
                    type="text"
                    placeholder="+0.00"
                    class="w-20 px-2 py-2 text-sm outline-none appearance-none shadow-none"
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
                    class="w-20 px-2 py-2 text-sm outline-none appearance-none shadow-none"
                    :style="inputStyle(false)"
                  />
                </td>
                <td class="py-2 pr-2">
                  <input
                    v-model="recetaEditForm.oiCilindro"
                    type="text"
                    placeholder="-0.00"
                    class="w-20 px-2 py-2 text-sm outline-none appearance-none shadow-none"
                    :style="inputStyle(false)"
                  />
                </td>
                <td class="py-2 pr-2">
                  <input
                    v-model="recetaEditForm.oiEje"
                    type="text"
                    placeholder="0"
                    class="w-20 px-2 py-2 text-sm outline-none appearance-none shadow-none"
                    :style="inputStyle(false)"
                  />
                </td>
                <td class="py-2 pr-2">
                  <input
                    v-model="recetaEditForm.oiAdicion"
                    type="text"
                    placeholder="+0.00"
                    class="w-20 px-2 py-2 text-sm outline-none appearance-none shadow-none"
                    :style="inputStyle(false)"
                  />
                </td>
              </tr>
            </tbody>
          </table></div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
              v-model="recetaEditForm.avSinCorreccion"
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
              v-model="recetaEditForm.avConCorreccion"
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
            v-model="recetaEditForm.observaciones"
            rows="2"
            class="px-4 py-3 text-sm outline-none appearance-none shadow-none resize-none"
            :style="inputStyle(false)"
          ></textarea>
        </div>
      </form>

      <template #footer>
        <div class="w-full flex items-center justify-between">
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
            <BaseButton variant="secondary" @click="showRecetaModal = false">Cancelar</BaseButton>
            <BaseButton variant="primary" :disabled="isSavingReceta" @click="submitReceta">
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
            </BaseButton>
          </div>
        </div>
      </template>
    </BaseModal>

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

<style scoped>
.prof-filter {
  width: 240px;
}
.prof-filter :deep(.ss-trigger) {
  height: 36px;
  font-size: 13px;
  font-weight: 500;
  border-radius: 8px;
  background: var(--color-surface);
}
</style>
