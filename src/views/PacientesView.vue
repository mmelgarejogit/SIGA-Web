<script setup lang="ts">
import { inputStyle, statusStyle, avatarStyle, initials } from "@/composables/useFieldStyles"
import { ref, computed, watch, onMounted } from "vue"
import { useRouter } from "vue-router"
import AppSidebar from "@/components/AppSidebar.vue"
import AppHeader from "@/components/AppHeader.vue"
import { useAuthStore } from "@/stores/auth"
import {
  type Patient,
  type CreatePatientRequest,
  type GetPatientsParams,
  getPatients,
  createPatient,
  deletePatient,
  activatePatient,
} from "@/services/patientService"
import BaseButton from "@/components/BaseButton.vue"
import BaseModal from "@/components/BaseModal.vue"
import BaseTable from "@/components/BaseTable.vue"
import FilterChips from "@/components/FilterChips.vue"
import SearchInput from "@/components/SearchInput.vue"
import RowContextMenu, { type ContextMenuItem } from "@/components/RowContextMenu.vue"
import PacienteEditModal from "@/components/PacienteEditModal.vue"
import BirthDateInput from "@/components/BirthDateInput.vue"
import SearchableSelect from "@/components/SearchableSelect.vue"

const SEXO_OPTIONS = [
  { value: "Masculino", label: "Masculino" },
  { value: "Femenino",  label: "Femenino"  },
  { value: "Otro",      label: "Otro"      },
]

const auth = useAuthStore()
const router = useRouter()

// ── Estado principal ──────────────────────────────────────────────────────────

const patients = ref<Patient[]>([])
const isLoading = ref(false)
const loadError = ref("")
const totalCount = ref(0)
const totalActive = ref(0)
const totalPages = ref(0)

// ── Filtros, búsqueda y paginación ────────────────────────────────────────────

const PAGE_SIZE = 10
const currentPage = ref(1)
const activeFilters = ref<string[]>([])
const searchQuery = ref("")
let searchTimer = 0

const columns = [
  { key: "nombre", label: "Nombre del Paciente" },
  { key: "ci", label: "C.I." },
  { key: "registro", label: "Fecha de Registro" },
  { key: "estado", label: "Estado" },
  { key: "acciones", label: "" },
]

const statusParam = computed<GetPatientsParams["status"] | undefined>(() => {
  const f = activeFilters.value
  if (f.includes("activo") && !f.includes("inactivo")) return "active"
  if (f.includes("inactivo") && !f.includes("activo")) return "inactive"
  return undefined
})

// Rango visible para el footer ("Mostrando X–Y de Z")
const rangeStart = computed(() =>
  totalCount.value === 0 ? 0 : (currentPage.value - 1) * PAGE_SIZE + 1,
)
const rangeEnd = computed(() => Math.min(currentPage.value * PAGE_SIZE, totalCount.value))

// Páginas a mostrar en el paginador (máx 5 botones + ellipsis)
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

// ── Carga con paginación ──────────────────────────────────────────────────────

async function loadPatients() {
  isLoading.value = true
  loadError.value = ""
  try {
    const result = await getPatients({
      page: currentPage.value,
      pageSize: PAGE_SIZE,
      search: searchQuery.value.trim() || undefined,
      status: statusParam.value,
    })
    patients.value = result.items
    totalCount.value = result.totalCount
    totalActive.value = result.totalActive
    totalPages.value = result.totalPages
  } catch (err: unknown) {
    loadError.value = err instanceof Error ? err.message : "Error al cargar pacientes."
  } finally {
    isLoading.value = false
  }
}

watch(activeFilters, () => {
  currentPage.value = 1
  loadPatients()
})
watch(currentPage, loadPatients)
watch(searchQuery, () => {
  clearTimeout(searchTimer)
  searchTimer = window.setTimeout(() => {
    currentPage.value = 1
    loadPatients()
  }, 350)
})

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

onMounted(loadPatients)

// ── Validación ────────────────────────────────────────────────────────────────

const ONLY_LETTERS = /^[a-záéíóúüñA-ZÁÉÍÓÚÜÑ\s]+$/
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

type CreateErrors = {
  firstName?: string
  lastName?: string
  ci?: string
  birthDate?: string
  contact?: string
  email?: string
}


// ── Modal Crear ───────────────────────────────────────────────────────────────

const showCreateModal = ref(false)
const createForm = ref<CreatePatientRequest>({
  ci: "",
  firstName: "",
  lastName: "",
  birthDate: "",
  sexo: "",
  phoneNumber: "",
  email: "",
})
const createErrors = ref<CreateErrors>({})
const createError = ref("")
const isSavingCreate = ref(false)

function validateCreate(): boolean {
  const e: CreateErrors = {}
  const f = createForm.value

  if (!f.firstName.trim()) e.firstName = "El nombre es obligatorio."
  else if (!ONLY_LETTERS.test(f.firstName.trim()))
    e.firstName = "Solo se permiten letras y espacios."
  else if (f.firstName.trim().length > 120) e.firstName = "Máximo 120 caracteres."

  if (!f.lastName.trim()) e.lastName = "El apellido es obligatorio."
  else if (!ONLY_LETTERS.test(f.lastName.trim())) e.lastName = "Solo se permiten letras y espacios."
  else if (f.lastName.trim().length > 120) e.lastName = "Máximo 120 caracteres."

  if (!f.ci.trim()) e.ci = "El nro. de cédula es obligatorio."
  else if (f.ci.trim().length > 30) e.ci = "Máximo 30 caracteres."

  if (!f.birthDate) e.birthDate = "La fecha de nacimiento es obligatoria."

  const hasPhone = !!f.phoneNumber?.trim()
  const hasEmail = !!f.email?.trim()

  if (!hasPhone && !hasEmail)
    e.contact = "Debe ingresar al menos un dato de contacto: email o teléfono."
  else if (hasEmail && !EMAIL_RE.test(f.email!.trim()))
    e.email = "El formato del email no es válido."

  createErrors.value = e
  return Object.keys(e).length === 0
}

function openCreateModal() {
  createForm.value = {
    ci: "",
    firstName: "",
    lastName: "",
    birthDate: "",
    sexo: "",
    phoneNumber: "",
    email: "",
  }
  createErrors.value = {}
  createError.value = ""
  showCreateModal.value = true
}

async function submitCreate() {
  if (isSavingCreate.value) return
  if (!validateCreate()) return
  createError.value = ""
  isSavingCreate.value = true
  try {
    await createPatient({
      ...createForm.value,
      sexo: createForm.value.sexo || undefined,
      email: createForm.value.email || undefined,
      phoneNumber: createForm.value.phoneNumber || undefined,
    })
    showCreateModal.value = false
    currentPage.value = 1
    await loadPatients()
  } catch (err: unknown) {
    createError.value = err instanceof Error ? err.message : "Error al crear paciente."
  } finally {
    isSavingCreate.value = false
  }
}

// ── Modal Editar ──────────────────────────────────────────────────────────────

const showEditModal = ref(false)
const editingPatient = ref<Patient | null>(null)

function openEditModal(p: Patient) {
  editingPatient.value = p
  showEditModal.value = true
}

// ── Menú contextual de fila ───────────────────────────────────────────────────

function menuItems(p: Patient): ContextMenuItem[] {
  // El mismo permiso gobierna dar de baja y reactivar; solo cambia según el estado actual.
  const canToggle   = auth.hasPermission("desactivar_paciente")
  const canDeactivate = canToggle && p.isActive
  const canActivate   = canToggle && !p.isActive
  return [
    {
      type: "item",
      label: "Ver detalle",
      icon: "visibility",
      action: () => router.push(`/pacientes/${p.id}`),
    },
    {
      type: "item",
      label: "Editar",
      icon: "edit",
      action: () => openEditModal(p),
      hidden: !auth.hasPermission("editar_paciente"),
    },
    ...(canDeactivate
      ? [
          { type: "separator" } as const,
          { type: "item", label: "Desactivar", icon: "person_off", action: () => openDeleteModal(p), danger: true } as const,
        ]
      : []),
    ...(canActivate
      ? [
          { type: "separator" } as const,
          { type: "item", label: "Reactivar", icon: "person_check", action: () => reactivar(p) } as const,
        ]
      : []),
  ]
}

const isActivating = ref(false)

async function reactivar(p: Patient) {
  if (isActivating.value) return
  isActivating.value = true
  try {
    await activatePatient(p.id)
    await loadPatients()
  } finally {
    isActivating.value = false
  }
}

// ── Modal Eliminar ────────────────────────────────────────────────────────────

const showDeleteModal = ref(false)
const deletingPatient = ref<Patient | null>(null)
const isDeleting = ref(false)
const deleteError = ref("")

function openDeleteModal(p: Patient) {
  deletingPatient.value = p
  deleteError.value = ""
  showDeleteModal.value = true
}

async function confirmDelete() {
  if (isDeleting.value || !deletingPatient.value) return
  isDeleting.value = true
  deleteError.value = ""
  try {
    await deletePatient(deletingPatient.value.id)
    showDeleteModal.value = false
    await loadPatients()
  } catch (err: unknown) {
    deleteError.value = err instanceof Error ? err.message : "Error al desactivar paciente."
  } finally {
    isDeleting.value = false
  }
}
</script>

<template>
  <div class="min-h-screen" style="background-color: var(--color-background)">
    <AppSidebar />
    <AppHeader />

    <main style="margin-left: var(--sidebar-width); transition: margin-left 0.25s ease; padding-top: 64px">
      <div class="p-4 sm:p-6 lg:p-8">
        <!-- Page header -->
        <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-8">
          <div>
            <h1 class="text-4xl font-extrabold tracking-tight mb-2">Gestión de Pacientes</h1>
            <p class="font-medium" style="color: var(--color-on-surface-variant)">
              Administre la base de datos de pacientes y su historial clínico con precisión.
            </p>
          </div>

          <BaseButton
            v-if="auth.hasPermission('crear_paciente')"
            variant="primary"
            size="lg"
            @click="openCreateModal"
          >
            <span
              class="material-symbols-outlined"
              style="width: 20px; height: 20px; font-size: 20px"
              >person_add</span
            >
            Añadir Paciente
          </BaseButton>
        </div>

        <!-- Filters + Search -->
        <div class="flex items-center justify-between gap-4 mb-8 flex-wrap">
          <FilterChips
            v-model="activeFilters"
            :options="[
              { value: 'activo',   label: 'Activo',   dot: 'var(--color-success)' },
              { value: 'inactivo', label: 'Inactivo', dot: 'var(--color-outline)' },
            ]"
            placeholder="Estado"
          />

          <SearchInput v-model="searchQuery" placeholder="Buscar por nombre, C.I., contacto..." />
        </div>

        <!-- Load error -->
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

        <!-- Table -->
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
            :items="patients"
            :loading="isLoading"
            emptyText="No hay pacientes para mostrar."
            @row-click="(p) => router.push(`/pacientes/${p.id}`)"
          >
            <template #nombre="{ item: p }">
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
                    {{ p.email ?? p.phoneNumber ?? "—" }}
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
            <template #registro="{ item: p }">
              <span class="text-sm" style="color: var(--color-on-surface-variant)">{{
                formatDate(p.createdAt)
              }}</span>
            </template>
            <template #estado="{ item: p }">
              <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider"
                :style="`background-color: ${statusStyle(p.isActive).bg}; color: ${statusStyle(p.isActive).text};`">
                <span class="w-1.5 h-1.5 rounded-full" :style="`background-color: ${statusStyle(p.isActive).dot};`"></span>
                {{ p.isActive ? 'Activo' : 'Inactivo' }}
              </span>
            </template>
            <template #acciones="{ item: p }">
              <div class="flex justify-end">
                <RowContextMenu :items="menuItems(p)" />
              </div>
            </template>
          </BaseTable>

          <!-- Footer: conteo + paginador -->
          <div
            v-if="patients.length > 0"
            class="px-6 py-4 flex items-center justify-between flex-wrap gap-4"
            style="
              border-top: 1px solid var(--color-hairline-soft);
              background-color: var(--color-surface-container-lowest);
            "
          >
            <span class="text-sm" style="color: var(--color-on-surface-variant)">
              Mostrando
              <strong style="color: var(--color-on-surface)"
                >{{ rangeStart }}–{{ rangeEnd }}</strong
              >
              de
              <strong style="color: var(--color-on-surface)">{{ totalCount }}</strong>
              pacientes
            </span>

            <div v-if="totalPages > 1" class="flex items-center gap-1">
              <!-- Anterior -->
              <button
                @click="currentPage--"
                :disabled="currentPage === 1"
                class="w-9 h-9 rounded-full flex items-center justify-center transition-all disabled:opacity-30 hover:bg-surface-container-high"
                style="color: var(--color-on-surface-variant)"
              >
                <span class="material-symbols-outlined" style="font-size: 18px">chevron_left</span>
              </button>

              <!-- Números -->
              <template v-for="p in visiblePages" :key="p">
                <span
                  v-if="p === '...'"
                  class="w-9 h-9 flex items-center justify-center text-sm"
                  style="color: var(--color-outline)"
                  >…</span
                >
                <button
                  v-else
                  @click="currentPage = (p as number)"
                  class="w-9 h-9 rounded-full text-sm font-semibold transition-all"
                  :class="currentPage === p ? 'bg-primary text-on-primary' : 'text-on-surface-variant hover:bg-surface-container-high'"
                >
                  {{ p }}
                </button>
              </template>

              <!-- Siguiente -->
              <button
                @click="currentPage++"
                :disabled="currentPage === totalPages"
                class="w-9 h-9 rounded-full flex items-center justify-center transition-all disabled:opacity-30 hover:bg-surface-container-high"
                style="color: var(--color-on-surface-variant)"
              >
                <span class="material-symbols-outlined" style="font-size: 18px">chevron_right</span>
              </button>
            </div>
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
              >group</span
            >
            <div>
              <div class="text-3xl font-black" style="color: var(--color-on-surface)">
                {{ totalActive }}
              </div>
              <div
                class="text-xs font-bold uppercase tracking-widest mt-1"
                style="color: var(--color-outline)"
              >
                Pacientes Activos
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
              >history_edu</span
            >
            <div>
              <div class="text-3xl font-black" style="color: var(--color-on-surface)">
                {{ totalCount }}
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

    <!-- MODAL: CREAR PACIENTE -->
    <BaseModal
      :show="showCreateModal"
      title="Nuevo Paciente"
      size="lg"
      @close="showCreateModal = false"
    >
      <form @submit.prevent="submitCreate" class="space-y-5">
        <!-- Error -->
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
              placeholder="Ana"
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
              placeholder="García"
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

        <div class="flex flex-col gap-1.5">
          <label class="text-xs font-bold uppercase tracking-wider" style="color: var(--color-outline)">Sexo</label>
          <SearchableSelect
            :model-value="createForm.sexo || null"
            :options="SEXO_OPTIONS"
            :searchable="false"
            null-label="Sin especificar"
            @update:model-value="createForm.sexo = ($event as string) ?? ''"
          />
        </div>

        <!-- Banner contacto -->
        <div
          v-if="createErrors.contact"
          class="flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium"
          style="background-color: var(--color-warning-container); color: var(--color-on-warning-container)"
        >
          <span class="material-symbols-outlined" style="font-size: 18px">warning</span>
          {{ createErrors.contact }}
        </div>

        <div class="flex flex-col gap-1.5">
          <label
            class="text-xs font-bold uppercase tracking-wider"
            style="color: var(--color-outline)"
          >
            Teléfono
            <span
              class="normal-case font-normal tracking-normal ml-1"
              style="color: var(--color-outline)"
              >(requerido si no hay email)</span
            >
          </label>
          <input
            v-model="createForm.phoneNumber"
            type="tel"
            placeholder="0972123456"
            class="px-4 h-12 text-sm outline-none appearance-none shadow-none transition-all"
            :style="inputStyle(!!createErrors.contact)"
          />
        </div>

        <div class="flex flex-col gap-1.5">
          <label
            class="text-xs font-bold uppercase tracking-wider"
            style="color: var(--color-outline)"
          >
            Email
            <span
              class="normal-case font-normal tracking-normal ml-1"
              style="color: var(--color-outline)"
              >(requerido si no hay teléfono)</span
            >
          </label>
          <input
            v-model="createForm.email"
            type="email"
            placeholder="paciente@email.com"
            class="px-4 h-12 text-sm outline-none appearance-none shadow-none transition-all"
            :style="inputStyle(!!createErrors.email || !!createErrors.contact)"
          />
          <p
            v-if="createErrors.email"
            class="text-xs font-medium"
            style="color: var(--color-error)"
          >
            {{ createErrors.email }}
          </p>
        </div>
      </form>

      <template #footer>
        <div class="flex justify-between w-full">
          <BaseButton variant="secondary" @click="showCreateModal = false">Cancelar</BaseButton>
          <BaseButton variant="primary" :disabled="isSavingCreate" @click="submitCreate">
            <svg
              v-if="isSavingCreate"
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
            {{ isSavingCreate ? "Guardando..." : "Guardar Paciente" }}
          </BaseButton>
        </div>
      </template>
    </BaseModal>

    <PacienteEditModal
      :show="showEditModal"
      :patient="editingPatient"
      @close="showEditModal = false"
      @saved="loadPatients"
    />

    <!-- MODAL: ELIMINAR PACIENTE -->
    <BaseModal
      :show="showDeleteModal"
      title="Desactivar Paciente"
      size="sm"
      @close="showDeleteModal = false"
    >
      <div class="text-center">
        <div
          class="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-5"
          style="background-color: var(--color-error-container)"
        >
          <span class="material-symbols-outlined" style="color: var(--color-error); font-size: 28px"
            >person_off</span
          >
        </div>
        <p class="text-sm" style="color: var(--color-on-surface-variant)">
          ¿Desactivar a
          <strong style="color: var(--color-on-surface)"
            >{{ deletingPatient?.firstName }} {{ deletingPatient?.lastName }}</strong
          >? El paciente no podrá iniciar sesión pero sus datos se conservarán.
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
        <BaseButton variant="secondary" class="flex-1" @click="showDeleteModal = false"
          >Cancelar</BaseButton
        >
        <BaseButton variant="danger" class="flex-1" :disabled="isDeleting" @click="confirmDelete">
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
