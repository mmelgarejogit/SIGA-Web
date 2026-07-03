<script setup lang="ts">
import { inputStyle, avatarStyle, initials, statusStyle } from "@/composables/useFieldStyles"
import { ref, computed, onMounted } from "vue"
import AppSidebar from "@/components/AppSidebar.vue"
import AppHeader from "@/components/AppHeader.vue"
import { useAuthStore } from "@/stores/auth"
import BaseButton from "@/components/BaseButton.vue"
import BaseModal from "@/components/BaseModal.vue"
import BaseTable from "@/components/BaseTable.vue"
import SearchInput from "@/components/SearchInput.vue"
import PasswordInput from "@/components/PasswordInput.vue"
import BirthDateInput from "@/components/BirthDateInput.vue"
import FilterChips from "@/components/FilterChips.vue"
import RowContextMenu, { type ContextMenuItem } from "@/components/RowContextMenu.vue"
import MultiSelect, { type MultiSelectOption } from "@/components/MultiSelect.vue"
import {
  type Professional,
  type Especialidad,
  type CreateProfessionalRequest,
  type UpdateProfessionalRequest,
  type HorarioProfesional,
  type SetHorariosRequest,
  getProfessionals,
  createProfessional,
  updateProfessional,
  deleteProfessional,
  getEspecialidades,
  getHorarios,
  setHorarios,
} from "@/services/professionalService"
import { type Sucursal, getSucursales } from "@/services/sucursalService"

const auth = useAuthStore()
const sucursales = ref<Sucursal[]>([])

// ── Estado principal ──────────────────────────────────────────────────────────

const professionals = ref<Professional[]>([])
const especialidades = ref<Especialidad[]>([])
const isLoading = ref(false)
const loadError = ref("")
const activeFilters = ref<string[]>([])
const searchQuery = ref("")

const statusOptions = [
  { value: "activo",   label: "Activo",   dot: "var(--color-success)" },
  { value: "inactivo", label: "Inactivo", dot: "var(--color-outline)" },
]

// ── Datos derivados ───────────────────────────────────────────────────────────

const filtered = computed(() => {
  let list = professionals.value

  const showActivo   = activeFilters.value.includes("activo")
  const showInactivo = activeFilters.value.includes("inactivo")
  if (showActivo && !showInactivo)   list = list.filter(p => p.isActive)
  else if (showInactivo && !showActivo) list = list.filter(p => !p.isActive)

  const q = searchQuery.value.trim().toLowerCase()
  if (q) {
    list = list.filter(p =>
      p.firstName.toLowerCase().includes(q) ||
      p.lastName.toLowerCase().includes(q) ||
      p.ci.toLowerCase().includes(q) ||
      p.licenseNumber.toLowerCase().includes(q),
    )
  }
  return list
})

const totalActive = computed(() => professionals.value.filter((p) => p.isActive).length)

const especialidadOptions = computed<MultiSelectOption[]>(() =>
  especialidades.value.map(e => ({ value: e.id, label: e.nombre }))
)

const columns = [
  { key: "profesional", label: "Profesional" },
  { key: "ci", label: "C.I." },
  { key: "matricula", label: "Matrícula" },
  { key: "especialidades", label: "Especialidades" },
  { key: "estado", label: "Estado" },
  { key: "acciones", label: "", align: "right" as const },
]

// ── Carga ─────────────────────────────────────────────────────────────────────

async function loadAll() {
  isLoading.value = true
  loadError.value = ""
  try {
    const [profs, specs, sucs] = await Promise.all([getProfessionals(), getEspecialidades(), getSucursales(true)])
    professionals.value = profs
    especialidades.value = specs
    sucursales.value = sucs
  } catch (err: unknown) {
    loadError.value = err instanceof Error ? err.message : "Error al cargar profesionales."
  } finally {
    isLoading.value = false
  }
}

onMounted(loadAll)

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

function menuItems(p: Professional): ContextMenuItem[] {
  return [
    { type: "item", label: "Horario", icon: "schedule", action: () => openHorarioModal(p), hidden: !auth.hasPermission("ver_profesionales") },
    { type: "item", label: "Editar",  icon: "edit",     action: () => openEditModal(p),    hidden: !auth.hasPermission("editar_profesional") },
    { type: "separator" },
    { type: "item", label: "Desactivar", icon: "person_off", action: () => openDeleteModal(p), danger: true, hidden: !auth.hasPermission("editar_profesional") || !p.isActive },
  ]
}

// ── Validación compartida ─────────────────────────────────────────────────────

const ONLY_LETTERS = /^[a-záéíóúüñA-ZÁÉÍÓÚÜÑ\s]+$/
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// ── Modal Crear ───────────────────────────────────────────────────────────────

type CreateErrors = Partial<
  Record<
    "firstName" | "lastName" | "ci" | "birthDate" | "email" | "password" | "licenseNumber",
    string
  >
>

const showCreateModal = ref(false)
const createErrors = ref<CreateErrors>({})
const createError = ref("")
const isSavingCreate = ref(false)
const createEspecialidadIds = ref<number[]>([])

const createForm = ref<CreateProfessionalRequest>({
  ci: "",
  firstName: "",
  lastName: "",
  birthDate: "",
  phoneNumber: "",
  email: "",
  password: "",
  licenseNumber: "",
  especialidadIds: [],
  sucursalId: undefined,
})

function validateCreate(): boolean {
  const e: CreateErrors = {}
  const f = createForm.value

  if (!f.firstName.trim()) e.firstName = "El nombre es obligatorio."
  else if (!ONLY_LETTERS.test(f.firstName.trim()))
    e.firstName = "Solo se permiten letras y espacios."

  if (!f.lastName.trim()) e.lastName = "El apellido es obligatorio."
  else if (!ONLY_LETTERS.test(f.lastName.trim())) e.lastName = "Solo se permiten letras y espacios."

  if (!f.ci.trim()) e.ci = "El nro. de cédula es obligatorio."

  if (!f.birthDate) e.birthDate = "La fecha de nacimiento es obligatoria."

  if (!f.email.trim()) e.email = "El email es obligatorio."
  else if (!EMAIL_RE.test(f.email.trim())) e.email = "El formato del email no es válido."

  if (!f.password.trim()) e.password = "La contraseña es obligatoria."
  else if (f.password.length < 6) e.password = "Mínimo 6 caracteres."

  if (!f.licenseNumber.trim()) e.licenseNumber = "El nro. de matrícula es obligatorio."

  createErrors.value = e
  return Object.keys(e).length === 0
}

function openCreateModal() {
  createForm.value = {
    ci: "",
    firstName: "",
    lastName: "",
    birthDate: "",
    phoneNumber: "",
    email: "",
    password: "",
    licenseNumber: "",
    especialidadIds: [],
    sucursalId: undefined,
  }
  createEspecialidadIds.value = []
  createErrors.value = {}
  createError.value = ""
  showCreateModal.value = true
}

function toggleCreateEspecialidad(id: number) {
  const idx = createEspecialidadIds.value.indexOf(id)
  if (idx === -1) createEspecialidadIds.value.push(id)
  else createEspecialidadIds.value.splice(idx, 1)
}

async function submitCreate() {
  if (isSavingCreate.value) return
  if (!validateCreate()) return
  createError.value = ""
  isSavingCreate.value = true
  try {
    await createProfessional({
      ...createForm.value,
      phoneNumber: createForm.value.phoneNumber || undefined,
      especialidadIds: createEspecialidadIds.value,
    })
    showCreateModal.value = false
    await loadAll()
  } catch (err: unknown) {
    createError.value = err instanceof Error ? err.message : "Error al crear profesional."
  } finally {
    isSavingCreate.value = false
  }
}

// ── Modal Editar ──────────────────────────────────────────────────────────────

type EditErrors = Partial<Record<"firstName" | "lastName" | "licenseNumber", string>>

const showEditModal = ref(false)
const editingId = ref<number | null>(null)
const editErrors = ref<EditErrors>({})
const editError = ref("")
const isSavingEdit = ref(false)
const editEspecialidadIds = ref<number[]>([])

const editForm = ref<UpdateProfessionalRequest>({
  firstName: "",
  lastName: "",
  phoneNumber: "",
  licenseNumber: "",
  especialidadIds: [],
  sucursalId: undefined,
  isActive: true,
})

function validateEdit(): boolean {
  const e: EditErrors = {}
  const f = editForm.value

  if (!f.firstName.trim()) e.firstName = "El nombre es obligatorio."
  else if (!ONLY_LETTERS.test(f.firstName.trim()))
    e.firstName = "Solo se permiten letras y espacios."

  if (!f.lastName.trim()) e.lastName = "El apellido es obligatorio."
  else if (!ONLY_LETTERS.test(f.lastName.trim())) e.lastName = "Solo se permiten letras y espacios."

  if (!f.licenseNumber.trim()) e.licenseNumber = "El nro. de matrícula es obligatorio."

  editErrors.value = e
  return Object.keys(e).length === 0
}

function openEditModal(p: Professional) {
  editingId.value = p.id
  editForm.value = {
    firstName: p.firstName,
    lastName: p.lastName,
    phoneNumber: p.phoneNumber ?? "",
    licenseNumber: p.licenseNumber,
    especialidadIds: p.especialidades.map((e) => e.id),
    sucursalId: p.sucursalId,
    isActive: p.isActive,
  }
  editEspecialidadIds.value = p.especialidades.map((e) => e.id)
  editErrors.value = {}
  editError.value = ""
  showEditModal.value = true
}

function toggleEditEspecialidad(id: number) {
  const idx = editEspecialidadIds.value.indexOf(id)
  if (idx === -1) editEspecialidadIds.value.push(id)
  else editEspecialidadIds.value.splice(idx, 1)
}

async function submitEdit() {
  if (isSavingEdit.value || editingId.value === null) return
  if (!validateEdit()) return
  editError.value = ""
  isSavingEdit.value = true
  try {
    await updateProfessional(editingId.value, {
      ...editForm.value,
      phoneNumber: editForm.value.phoneNumber || undefined,
      especialidadIds: editEspecialidadIds.value,
    })
    showEditModal.value = false
    await loadAll()
  } catch (err: unknown) {
    editError.value = err instanceof Error ? err.message : "Error al actualizar profesional."
  } finally {
    isSavingEdit.value = false
  }
}

// ── Modal Desactivar ──────────────────────────────────────────────────────────

const showDeleteModal = ref(false)
const deletingProfessional = ref<Professional | null>(null)
const isDeleting = ref(false)
const deleteError = ref("")

function openDeleteModal(p: Professional) {
  deletingProfessional.value = p
  deleteError.value = ""
  showDeleteModal.value = true
}

async function confirmDelete() {
  if (isDeleting.value || !deletingProfessional.value) return
  isDeleting.value = true
  deleteError.value = ""
  try {
    await deleteProfessional(deletingProfessional.value.id)
    showDeleteModal.value = false
    await loadAll()
  } catch (err: unknown) {
    deleteError.value = err instanceof Error ? err.message : "Error al desactivar profesional."
  } finally {
    isDeleting.value = false
  }
}

// ── Modal Horario ─────────────────────────────────────────────────────────────

const DIAS = [
  { value: 1, label: "Lunes" },
  { value: 2, label: "Martes" },
  { value: 3, label: "Miércoles" },
  { value: 4, label: "Jueves" },
  { value: 5, label: "Viernes" },
  { value: 6, label: "Sábado" },
  { value: 0, label: "Domingo" },
]

interface DiaForm {
  diaSemana: number
  activo: boolean
  horaInicio: string
  horaFin: string
  pausas: { horaInicio: string; horaFin: string; descripcion: string }[]
}

const showHorarioModal = ref(false)
const horarioProfessional = ref<Professional | null>(null)
const horarioDias = ref<DiaForm[]>([])
const isLoadingHorario = ref(false)
const isSavingHorario = ref(false)
const horarioError = ref("")

function initDias(existing: HorarioProfesional[]): DiaForm[] {
  return DIAS.map((d) => {
    const found = existing.find((h) => h.diaSemana === d.value)
    return {
      diaSemana: d.value,
      activo: found?.activo ?? false,
      horaInicio: found ? found.horaInicio.slice(0, 5) : "08:00",
      horaFin: found ? found.horaFin.slice(0, 5) : "17:00",
      pausas:
        found?.pausas.map((p) => ({
          horaInicio: p.horaInicio.slice(0, 5),
          horaFin: p.horaFin.slice(0, 5),
          descripcion: p.descripcion ?? "",
        })) ?? [],
    }
  })
}

async function openHorarioModal(p: Professional) {
  horarioProfessional.value = p
  horarioError.value = ""
  showHorarioModal.value = true
  isLoadingHorario.value = true
  try {
    const data = await getHorarios(p.id)
    horarioDias.value = initDias(data)
  } catch (err: unknown) {
    horarioError.value = err instanceof Error ? err.message : "Error al cargar horario."
  } finally {
    isLoadingHorario.value = false
  }
}

function addPausa(dia: DiaForm) {
  dia.pausas.push({ horaInicio: "13:00", horaFin: "14:00", descripcion: "" })
}

function removePausa(dia: DiaForm, idx: number) {
  dia.pausas.splice(idx, 1)
}

async function submitHorario() {
  if (isSavingHorario.value || !horarioProfessional.value) return
  isSavingHorario.value = true
  horarioError.value = ""
  try {
    const request: SetHorariosRequest = {
      horarios: horarioDias.value
        .filter((d) => d.activo)
        .map((d) => ({
          diaSemana: d.diaSemana,
          horaInicio: d.horaInicio,
          horaFin: d.horaFin,
          activo: true,
          pausas: d.pausas.map((p) => ({
            horaInicio: p.horaInicio,
            horaFin: p.horaFin,
            descripcion: p.descripcion || undefined,
          })),
        })),
    }
    await setHorarios(horarioProfessional.value.id, request)
    showHorarioModal.value = false
  } catch (err: unknown) {
    horarioError.value = err instanceof Error ? err.message : "Error al guardar horario."
  } finally {
    isSavingHorario.value = false
  }
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
            <h1 class="text-4xl font-extrabold tracking-tight mb-2">Gestión de Profesionales</h1>
            <p class="font-medium" style="color: var(--color-on-surface-variant)">
              Administre el equipo profesional, sus especialidades y disponibilidad horaria.
            </p>
          </div>

          <BaseButton
            v-if="auth.hasPermission('crear_profesional')"
            variant="primary"
            size="lg"
            @click="openCreateModal"
          >
            <span
              class="material-symbols-outlined"
              style="width: 20px; height: 20px; font-size: 20px"
              >person_add</span
            >
            Añadir Profesional
          </BaseButton>
        </div>

        <!-- Filters + Search -->
        <div class="flex items-center justify-between gap-4 mb-8 flex-wrap">
          <FilterChips v-model="activeFilters" :options="statusOptions" placeholder="Estado" />
          <SearchInput v-model="searchQuery" placeholder="Nombre, C.I. o matrícula..." />
        </div>

        <div
          v-if="loadError"
          class="flex items-center gap-2.5 rounded-2xl px-4 py-3 text-sm font-medium"
          style="
            background-color: var(--color-error-container);
            color: var(--color-on-error-container);
          "
        >
          <span class="material-symbols-outlined" style="font-size: 18px">error</span>
          {{ loadError }}
        </div>

        <div
          v-else
          class="rounded-lg overflow-hidden"
          style="
            background-color: var(--color-surface-container-lowest);
            box-shadow: var(--shadow-sm);
            outline: 1px solid var(--color-hairline);
          "
        >
          <BaseTable
            :columns="columns"
            :items="filtered"
            :loading="isLoading"
            emptyText="No hay profesionales para mostrar."
          >
            <template #profesional="{ item: p }">
              <div class="flex items-center gap-3">
                <div
                  class="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                  :style="`background-color: ${avatarStyle(p.id).bg}; color: ${avatarStyle(p.id).color};`"
                >
                  {{ initials(p.firstName, p.lastName) }}
                </div>
                <div>
                  <div class="font-bold text-sm" style="color: var(--color-on-surface)">
                    {{ p.firstName }} {{ p.lastName }}
                  </div>
                  <div class="text-xs" style="color: var(--color-on-surface-variant)">
                    {{ p.email }}
                  </div>
                </div>
              </div>
            </template>
            <template #ci="{ item: p }">
              <span
                class="text-sm font-medium tracking-wider"
                style="color: var(--color-on-surface-variant)"
                >{{ p.ci }}</span
              >
            </template>
            <template #matricula="{ item: p }">
              <span class="text-sm" style="color: var(--color-on-surface-variant)">{{
                p.licenseNumber
              }}</span>
            </template>
            <template #especialidades="{ item: p }">
              <div class="flex flex-wrap gap-1">
                <span
                  v-if="p.especialidades.length === 0"
                  class="text-sm"
                  style="color: var(--color-outline)"
                  >—</span
                >
                <span
                  v-for="esp in p.especialidades"
                  :key="esp.id"
                  class="inline-block px-2.5 py-1 rounded-full text-xs font-semibold"
                  style="background-color: rgba(0, 40, 142, 0.07); color: var(--color-primary)"
                  >{{ esp.nombre }}</span
                >
              </div>
            </template>
            <template #estado="{ item: p }">
              <span
                class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider"
                :style="`background-color: ${statusStyle(p.isActive).bg}; color: ${statusStyle(p.isActive).text};`"
              >
                <span
                  class="w-1.5 h-1.5 rounded-full"
                  :style="`background-color: ${statusStyle(p.isActive).dot};`"
                ></span>
                {{ statusStyle(p.isActive).label }}
              </span>
            </template>
            <template #acciones="{ item: p }">
              <div class="flex justify-end">
                <RowContextMenu :items="menuItems(p)" />
              </div>
            </template>
          </BaseTable>

          <!-- Footer -->
          <div
            class="px-6 py-4"
            style="
              border-top: 1px solid var(--color-hairline-soft);
              background-color: var(--color-surface-container-lowest);
            "
          >
            <span class="text-sm" style="color: var(--color-on-surface-variant)">
              Mostrando
              <strong style="color: var(--color-on-surface)">{{ filtered.length }}</strong>
              de
              <strong style="color: var(--color-on-surface)">{{ professionals.length }}</strong>
              profesionales
            </span>
          </div>
        </div>

        <!-- Bento insight cards -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mt-10">
          <div
            class="p-8 rounded-2xl flex flex-col justify-between"
            style="background-color: var(--color-surface-container-low); height: 192px"
          >
            <span
              class="material-symbols-outlined"
              style="color: var(--color-primary); font-size: 32px; width: 32px; height: 32px"
              >stethoscope</span
            >
            <div>
              <div class="text-3xl font-black" style="color: var(--color-on-surface)">
                {{ totalActive }}
              </div>
              <div
                class="text-xs font-bold uppercase tracking-widest mt-1"
                style="color: var(--color-outline)"
              >
                Profesionales Activos
              </div>
            </div>
          </div>

          <div
            class="p-8 rounded-2xl flex flex-col justify-between"
            style="background-color: var(--color-surface-container-low); height: 192px"
          >
            <span
              class="material-symbols-outlined"
              style="color: var(--color-secondary); font-size: 32px; width: 32px; height: 32px"
              >local_hospital</span
            >
            <div>
              <div class="text-3xl font-black" style="color: var(--color-on-surface)">
                {{ professionals.length }}
              </div>
              <div
                class="text-xs font-bold uppercase tracking-widest mt-1"
                style="color: var(--color-outline)"
              >
                Total Registros
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>

    <BaseModal
      :show="showCreateModal"
      title="Nuevo Profesional"
      size="lg"
      @close="showCreateModal = false"
    >
      <form @submit.prevent="submitCreate" class="space-y-5">
        <div
          v-if="createError"
          class="flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium"
          style="
            background-color: var(--color-error-container);
            color: var(--color-on-error-container);
          "
        >
          <span class="material-symbols-outlined" style="font-size: 18px">error</span>
          {{ createError }}
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div class="flex flex-col gap-1.5">
            <label
              class="text-xs font-bold uppercase tracking-wider"
              style="color: var(--color-outline)"
              >Nombre *</label
            >
            <input
              v-model="createForm.firstName"
              type="text"
              placeholder="Juan"
              class="px-4 h-12 text-sm outline-none appearance-none shadow-none transition-all"
              :style="inputStyle(!!createErrors.firstName)"
            />
            <p
              v-if="createErrors.firstName"
              class="text-xs font-medium"
              style="color: var(--color-error)"
            >
              {{ createErrors.firstName }}
            </p>
          </div>
          <div class="flex flex-col gap-1.5">
            <label
              class="text-xs font-bold uppercase tracking-wider"
              style="color: var(--color-outline)"
              >Apellido *</label
            >
            <input
              v-model="createForm.lastName"
              type="text"
              placeholder="Pérez"
              class="px-4 h-12 text-sm outline-none appearance-none shadow-none transition-all"
              :style="inputStyle(!!createErrors.lastName)"
            />
            <p
              v-if="createErrors.lastName"
              class="text-xs font-medium"
              style="color: var(--color-error)"
            >
              {{ createErrors.lastName }}
            </p>
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div class="flex flex-col gap-1.5">
            <label
              class="text-xs font-bold uppercase tracking-wider"
              style="color: var(--color-outline)"
              >Nro. de Cédula *</label
            >
            <input
              v-model="createForm.ci"
              type="text"
              placeholder="12345678"
              class="px-4 h-12 text-sm outline-none appearance-none shadow-none transition-all"
              :style="inputStyle(!!createErrors.ci)"
            />
            <p v-if="createErrors.ci" class="text-xs font-medium" style="color: var(--color-error)">
              {{ createErrors.ci }}
            </p>
          </div>
          <div class="flex flex-col gap-1.5">
            <label
              class="text-xs font-bold uppercase tracking-wider"
              style="color: var(--color-outline)"
              >Fecha de Nacimiento *</label
            >
            <BirthDateInput v-model="createForm.birthDate" :has-error="!!createErrors.birthDate" />
            <p
              v-if="createErrors.birthDate"
              class="text-xs font-medium"
              style="color: var(--color-error)"
            >
              {{ createErrors.birthDate }}
            </p>
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div class="flex flex-col gap-1.5">
            <label
              class="text-xs font-bold uppercase tracking-wider"
              style="color: var(--color-outline)"
              >Email *</label
            >
            <input
              v-model="createForm.email"
              type="email"
              placeholder="prof@clinica.com"
              class="px-4 h-12 text-sm outline-none appearance-none shadow-none transition-all"
              :style="inputStyle(!!createErrors.email)"
            />
            <p
              v-if="createErrors.email"
              class="text-xs font-medium"
              style="color: var(--color-error)"
            >
              {{ createErrors.email }}
            </p>
          </div>
          <div class="flex flex-col gap-1.5">
            <label
              class="text-xs font-bold uppercase tracking-wider"
              style="color: var(--color-outline)"
              >Teléfono</label
            >
            <input
              v-model="createForm.phoneNumber"
              type="tel"
              placeholder="0972123456"
              class="px-4 h-12 text-sm outline-none appearance-none shadow-none transition-all"
              :style="inputStyle(false)"
            />
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div class="flex flex-col gap-1.5">
            <label
              class="text-xs font-bold uppercase tracking-wider"
              style="color: var(--color-outline)"
              >Contraseña *</label
            >
            <PasswordInput
              v-model="createForm.password"
              placeholder="Mínimo 6 caracteres"
              :error="!!createErrors.password"
            />
            <p
              v-if="createErrors.password"
              class="text-xs font-medium"
              style="color: var(--color-error)"
            >
              {{ createErrors.password }}
            </p>
          </div>
          <div class="flex flex-col gap-1.5">
            <label
              class="text-xs font-bold uppercase tracking-wider"
              style="color: var(--color-outline)"
              >Nro. de Matrícula *</label
            >
            <input
              v-model="createForm.licenseNumber"
              type="text"
              placeholder="MP-12345"
              class="px-4 h-12 text-sm outline-none appearance-none shadow-none transition-all"
              :style="inputStyle(!!createErrors.licenseNumber)"
            />
            <p
              v-if="createErrors.licenseNumber"
              class="text-xs font-medium"
              style="color: var(--color-error)"
            >
              {{ createErrors.licenseNumber }}
            </p>
          </div>
        </div>

        <!-- Especialidades -->
        <div class="flex flex-col gap-1.5">
          <label class="text-xs font-bold uppercase tracking-wider" style="color: var(--color-outline)">Especialidades</label>
          <MultiSelect
            :model-value="createEspecialidadIds"
            :options="especialidadOptions"
            placeholder="Seleccioná especialidades"
            @update:model-value="createEspecialidadIds = $event as number[]"
          />
        </div>

        <!-- Sucursal -->
        <div class="flex flex-col gap-1.5">
          <label class="text-xs font-bold uppercase tracking-wider" style="color: var(--color-outline)">Sucursal</label>
          <select v-model="createForm.sucursalId"
            class="w-full px-4 h-12 text-sm outline-none appearance-none shadow-none"
            :style="inputStyle()">
            <option :value="undefined">— Sin asignar —</option>
            <option v-for="s in sucursales" :key="s.id" :value="s.id">{{ s.nombre }}</option>
          </select>
        </div>
      </form>
      <template #footer>
        <div class="flex justify-between w-full">
          <BaseButton variant="secondary" @click="showCreateModal = false">Cancelar</BaseButton>
          <BaseButton variant="primary" :disabled="isSavingCreate" @click="submitCreate">
            <span v-if="isSavingCreate" class="material-symbols-outlined animate-spin" style="font-size: 18px">progress_activity</span>
            {{ isSavingCreate ? "Guardando..." : "Guardar Profesional" }}
          </BaseButton>
        </div>
      </template>
    </BaseModal>

    <BaseModal
      :show="showEditModal"
      title="Editar Profesional"
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

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div class="flex flex-col gap-1.5">
            <label
              class="text-xs font-bold uppercase tracking-wider"
              style="color: var(--color-outline)"
              >Nombre *</label
            >
            <input
              v-model="editForm.firstName"
              type="text"
              class="px-4 h-12 text-sm outline-none appearance-none shadow-none transition-all"
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
              class="px-4 h-12 text-sm outline-none appearance-none shadow-none transition-all"
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

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
              class="px-4 h-12 text-sm outline-none appearance-none shadow-none transition-all"
              :style="inputStyle(false)"
            />
          </div>
          <div class="flex flex-col gap-1.5">
            <label
              class="text-xs font-bold uppercase tracking-wider"
              style="color: var(--color-outline)"
              >Nro. de Matrícula *</label
            >
            <input
              v-model="editForm.licenseNumber"
              type="text"
              class="px-4 h-12 text-sm outline-none appearance-none shadow-none transition-all"
              :style="inputStyle(!!editErrors.licenseNumber)"
            />
            <p
              v-if="editErrors.licenseNumber"
              class="text-xs font-medium"
              style="color: var(--color-error)"
            >
              {{ editErrors.licenseNumber }}
            </p>
          </div>
        </div>

        <!-- Especialidades -->
        <div class="flex flex-col gap-1.5">
          <label class="text-xs font-bold uppercase tracking-wider" style="color: var(--color-outline)">Especialidades</label>
          <MultiSelect
            :model-value="editEspecialidadIds"
            :options="especialidadOptions"
            placeholder="Seleccioná especialidades"
            @update:model-value="editEspecialidadIds = $event as number[]"
          />
        </div>

        <!-- Sucursal -->
        <div class="flex flex-col gap-1.5">
          <label class="text-xs font-bold uppercase tracking-wider" style="color: var(--color-outline)">Sucursal</label>
          <select v-model="editForm.sucursalId"
            class="w-full px-4 h-12 text-sm outline-none appearance-none shadow-none"
            :style="inputStyle()">
            <option :value="undefined">— Sin asignar —</option>
            <option v-for="s in sucursales" :key="s.id" :value="s.id">{{ s.nombre }}</option>
          </select>
        </div>

        <!-- Cuenta activa -->
        <div
          class="flex items-center gap-3 px-4 py-2.5 rounded-xl cursor-pointer transition-colors hover:bg-surface-container-low"
          style="border: 1px solid var(--color-outline-variant)"
          @click="editForm.isActive = !editForm.isActive">
          <div class="w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all"
            :style="editForm.isActive
              ? 'border-color: var(--color-primary); background-color: var(--color-primary);'
              : 'border-color: var(--color-outline-variant);'">
            <span v-if="editForm.isActive" class="material-symbols-outlined text-on-primary" style="font-size: 12px">check</span>
          </div>
          <span class="text-sm font-medium select-none" style="color: var(--color-on-surface)">Cuenta activa</span>
        </div>
      </form>
      <template #footer>
        <div class="flex justify-between w-full">
          <BaseButton variant="secondary" @click="showEditModal = false">Cancelar</BaseButton>
          <BaseButton variant="primary" :disabled="isSavingEdit" @click="submitEdit">
            <span v-if="isSavingEdit" class="material-symbols-outlined animate-spin" style="font-size: 18px">progress_activity</span>
            {{ isSavingEdit ? "Guardando..." : "Guardar Cambios" }}
          </BaseButton>
        </div>
      </template>
    </BaseModal>

    <BaseModal
      :show="showHorarioModal"
      title="Horario de Trabajo"
      size="lg"
      @close="showHorarioModal = false"
    >
      <p class="text-xs mt-0.5 mb-4" style="color: var(--color-outline)">
        {{ horarioProfessional?.firstName }} {{ horarioProfessional?.lastName }}
      </p>
      <div v-if="isLoadingHorario" class="flex justify-center py-16">
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

      <!-- Body -->
      <div v-else class="px-8 py-6 space-y-3 max-h-[65vh] overflow-y-auto">
        <div
          v-if="horarioError"
          class="flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium"
          style="
            background-color: var(--color-error-container);
            color: var(--color-on-error-container);
          "
        >
          <span class="material-symbols-outlined" style="font-size: 18px">error</span>
          {{ horarioError }}
        </div>

        <!-- Fila por día -->
        <div
          v-for="dia in horarioDias"
          :key="dia.diaSemana"
          class="rounded-2xl overflow-hidden transition-all"
          :style="
            dia.activo
              ? 'background-color: var(--color-surface-container-low);'
              : 'background-color: var(--color-surface); opacity: 0.6;'
          "
        >
          <!-- Encabezado del día -->
          <div class="flex items-center justify-between px-5 py-3">
            <span
              class="text-sm font-bold w-24 flex-shrink-0"
              style="color: var(--color-on-surface)"
            >
              {{ DIAS.find((d) => d.value === dia.diaSemana)?.label }}
            </span>
            <div class="flex items-center gap-3 flex-1 justify-end">
              <template v-if="dia.activo">
                <input
                  v-model="dia.horaInicio"
                  type="time"
                  class="px-3 py-1.5 text-sm outline-none appearance-none shadow-none"
                  style="
                    border-radius: 12px;
                    border: 1px solid var(--color-outline-variant);
                    color: var(--color-on-surface);
                    background-color: var(--color-surface-container-lowest);
                  "
                />
                <span class="text-xs font-medium" style="color: var(--color-outline)">a</span>
                <input
                  v-model="dia.horaFin"
                  type="time"
                  class="px-3 py-1.5 text-sm outline-none appearance-none shadow-none"
                  style="
                    border-radius: 12px;
                    border: 1px solid var(--color-outline-variant);
                    color: var(--color-on-surface);
                    background-color: var(--color-surface-container-lowest);
                  "
                />
              </template>
              <button
                type="button"
                @click="dia.activo = !dia.activo"
                class="relative w-11 h-6 rounded-full transition-all flex-shrink-0"
                :style="
                  dia.activo
                    ? 'background-color: var(--color-primary);'
                    : 'background-color: var(--color-outline-variant);'
                "
              >
                <span
                  class="absolute top-1 w-4 h-4 rounded-full bg-white transition-all"
                  :style="dia.activo ? 'left: calc(100% - 1.25rem);' : 'left: 0.25rem;'"
                ></span>
              </button>
            </div>
          </div>

          <!-- Pausas -->
          <div v-if="dia.activo" class="px-5 pb-3 space-y-2">
            <div v-for="(pausa, idx) in dia.pausas" :key="idx" class="flex items-center gap-2">
              <span
                class="text-xs font-medium w-12 flex-shrink-0"
                style="color: var(--color-outline)"
                >Pausa</span
              >
              <input
                v-model="pausa.horaInicio"
                type="time"
                class="px-3 py-1.5 text-sm outline-none appearance-none shadow-none flex-1"
                style="
                  border: 1px solid var(--color-outline-variant);
                  color: var(--color-on-surface);
                  background-color: var(--color-surface-container-lowest);
                "
              />
              <span class="text-xs" style="color: var(--color-outline)">a</span>
              <input
                v-model="pausa.horaFin"
                type="time"
                class="px-3 py-1.5 text-sm outline-none appearance-none shadow-none flex-1"
                style="
                  border: 1px solid var(--color-outline-variant);
                  color: var(--color-on-surface);
                  background-color: var(--color-surface-container-lowest);
                "
              />
              <input
                v-model="pausa.descripcion"
                type="text"
                placeholder="Ej: Almuerzo"
                class="px-3 py-1.5 text-sm outline-none appearance-none shadow-none flex-1"
                style="
                  border: 1px solid var(--color-outline-variant);
                  color: var(--color-on-surface);
                  background-color: var(--color-surface-container-lowest);
                "
              />
              <button
                type="button"
                @click="removePausa(dia, idx)"
                class="p-1.5 rounded-full flex-shrink-0 transition-all hover:bg-error-container hover:text-error"
                style="color: var(--color-outline)"
              >
                <span
                  class="material-symbols-outlined"
                  style="font-size: 16px; width: 16px; height: 16px"
                  >close</span
                >
              </button>
            </div>

            <button
              type="button"
              @click="addPausa(dia)"
              class="flex items-center gap-1.5 text-xs font-semibold mt-1 transition-all"
              style="color: var(--color-secondary)"
            >
              <span
                class="material-symbols-outlined"
                style="font-size: 15px; width: 15px; height: 15px"
                >add</span
              >
              Agregar pausa
            </button>
          </div>
        </div>
      </div>

      <template #footer>
        <div class="flex justify-between w-full">
          <BaseButton variant="secondary" @click="showHorarioModal = false">Cancelar</BaseButton>
          <BaseButton
            v-if="auth.hasPermission('editar_profesional')"
            variant="primary"
            :disabled="isSavingHorario"
            @click="submitHorario"
          >
            <span v-if="isSavingHorario" class="material-symbols-outlined animate-spin" style="font-size: 18px">progress_activity</span>
            {{ isSavingHorario ? "Guardando..." : "Guardar Horario" }}
          </BaseButton>
        </div>
      </template>
    </BaseModal>

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
          Desactivar Profesional
        </h3>
        <p class="text-sm" style="color: var(--color-on-surface-variant)">
          ¿Desactivar a
          <strong style="color: var(--color-on-surface)"
            >{{ deletingProfessional?.firstName }} {{ deletingProfessional?.lastName }}</strong
          >? No podrá iniciar sesión pero sus datos se conservarán.
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
        <div class="flex justify-between w-full">
          <BaseButton variant="secondary" @click="showDeleteModal = false">Cancelar</BaseButton>
          <BaseButton variant="danger" :disabled="isDeleting" @click="confirmDelete">
            <span v-if="isDeleting" class="material-symbols-outlined animate-spin" style="font-size: 18px">progress_activity</span>
            {{ isDeleting ? "Desactivando..." : "Desactivar" }}
          </BaseButton>
        </div>
      </template>
    </BaseModal>
  </div>
</template>
