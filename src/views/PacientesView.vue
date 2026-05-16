<script setup lang="ts">
import { ref, computed, watch, onMounted } from "vue"
import { useRouter } from "vue-router"
import AppSidebar from "@/components/AppSidebar.vue"
import AppHeader from "@/components/AppHeader.vue"
import { useAuthStore } from "@/stores/auth"
import {
  type Patient,
  type CreatePatientRequest,
  type UpdatePatientRequest,
  type GetPatientsParams,
  getPatients,
  createPatient,
  updatePatient,
  deletePatient,
} from "@/services/patientService"
import BaseButton from "@/components/BaseButton.vue"
import BaseModal from "@/components/BaseModal.vue"
import BaseTable from "@/components/BaseTable.vue"
import FilterTabs from "@/components/FilterTabs.vue"
import SearchInput from "@/components/SearchInput.vue"

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
const activeFilter = ref("todos")
const searchQuery = ref("")
let searchTimer = 0

const filters = [
  { id: "todos", label: "Todos" },
  { id: "activos", label: "Activos" },
  { id: "inactivos", label: "Inactivos" },
]

const columns = [
  { key: "nombre", label: "Nombre del Paciente" },
  { key: "ci", label: "C.I." },
  { key: "registro", label: "Fecha de Registro" },
  { key: "estado", label: "Estado" },
  { key: "acciones", label: "" },
]

const statusParam = computed<GetPatientsParams["status"] | undefined>(() => {
  if (activeFilter.value === "activos") return "active"
  if (activeFilter.value === "inactivos") return "inactive"
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

watch(activeFilter, () => {
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

const AVATAR_PALETTE = [
  { bg: "rgba(0,40,142,0.06)", color: "var(--color-primary)" },
  { bg: "rgba(0,103,128,0.06)", color: "var(--color-secondary)" },
  { bg: "rgba(32,0,177,0.06)", color: "var(--color-tertiary)" },
  { bg: "rgba(117,118,132,0.08)", color: "var(--color-outline)" },
]

function avatarStyle(p: Patient) {
  const idx = (p.id ?? 0) % AVATAR_PALETTE.length
  return AVATAR_PALETTE[idx]!
}

function initials(p: Patient) {
  return `${p.firstName[0] ?? ""}${p.lastName[0] ?? ""}`.toUpperCase()
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

function statusStyle(isActive: boolean) {
  return isActive
    ? { bg: "#dcfce7", dot: "#16a34a", text: "#166534", label: "Activo" }
    : {
        bg: "var(--color-surface-container-highest)",
        dot: "var(--color-outline)",
        text: "var(--color-on-surface-variant)",
        label: "Inactivo",
      }
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

type EditErrors = {
  firstName?: string
  lastName?: string
  ci?: string
  birthDate?: string
  email?: string
}

function inputStyle(hasError: boolean) {
  return hasError
    ? "border: 1.5px solid var(--color-error); color: var(--color-on-surface); background-color: #FFF8F7;"
    : "border: 1px solid var(--color-outline-variant); color: var(--color-on-surface); background-color: var(--color-surface);"
}

// ── Modal Crear ───────────────────────────────────────────────────────────────

const showCreateModal = ref(false)
const createForm = ref<CreatePatientRequest>({
  ci: "",
  firstName: "",
  lastName: "",
  birthDate: "",
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
const editingId = ref<number | null>(null)
const editForm = ref<UpdatePatientRequest>({
  firstName: "",
  lastName: "",
  ci: "",
  birthDate: "",
  phoneNumber: "",
  email: "",
  isActive: true,
})
const editErrors = ref<EditErrors>({})
const editError = ref("")
const isSavingEdit = ref(false)

function validateEdit(): boolean {
  const e: EditErrors = {}
  const f = editForm.value

  if (!f.firstName.trim()) e.firstName = "El nombre es obligatorio."
  else if (!ONLY_LETTERS.test(f.firstName.trim()))
    e.firstName = "Solo se permiten letras y espacios."

  if (!f.lastName.trim()) e.lastName = "El apellido es obligatorio."
  else if (!ONLY_LETTERS.test(f.lastName.trim())) e.lastName = "Solo se permiten letras y espacios."

  if (!f.ci.trim()) e.ci = "El nro. de cédula es obligatorio."
  else if (f.ci.trim().length > 30) e.ci = "Máximo 30 caracteres."

  if (!f.birthDate) e.birthDate = "La fecha de nacimiento es obligatoria."

  if (f.email?.trim() && !EMAIL_RE.test(f.email.trim()))
    e.email = "El formato del email no es válido."

  editErrors.value = e
  return Object.keys(e).length === 0
}

function openEditModal(p: Patient) {
  editingId.value = p.id
  editForm.value = {
    firstName: p.firstName,
    lastName: p.lastName,
    ci: p.ci,
    birthDate: p.birthDate,
    phoneNumber: p.phoneNumber ?? "",
    email: p.email ?? "",
    isActive: p.isActive,
  }
  editErrors.value = {}
  editError.value = ""
  showEditModal.value = true
}

async function submitEdit() {
  if (isSavingEdit.value || editingId.value === null) return
  if (!validateEdit()) return
  editError.value = ""
  isSavingEdit.value = true
  try {
    await updatePatient(editingId.value, {
      ...editForm.value,
      phoneNumber: editForm.value.phoneNumber || undefined,
      email: editForm.value.email || undefined,
    })
    showEditModal.value = false
    await loadPatients()
  } catch (err: unknown) {
    editError.value = err instanceof Error ? err.message : "Error al actualizar paciente."
  } finally {
    isSavingEdit.value = false
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
  <div class="min-h-screen" style="background-color: var(--color-surface)">
    <AppSidebar />
    <AppHeader />

    <main style="margin-left: var(--sidebar-width); transition: margin-left 0.25s ease; padding-top: 64px">
      <div class="p-8">
        <!-- Page header -->
        <div class="flex justify-between items-end mb-8">
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
          <FilterTabs
            v-model="activeFilter"
            :tabs="[
              { label: 'Todos', value: 'todos' },
              { label: 'Activos', value: 'activos' },
              { label: 'Inactivos', value: 'inactivos' },
            ]"
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
          class="rounded-2xl overflow-hidden"
          style="
            background-color: var(--color-surface-container-lowest);
            box-shadow: 0 1px 3px rgba(196, 197, 213, 0.25);
            outline: 1px solid rgba(196, 197, 213, 0.15);
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
                  :style="`background-color: ${avatarStyle(p).bg}; color: ${avatarStyle(p).color};`"
                >
                  {{ initials(p) }}
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
              <div class="flex justify-end gap-1">
                <BaseButton
                  v-if="auth.hasPermission('editar_paciente')"
                  variant="ghost"
                  size="sm"
                  @click.stop="openEditModal(p)"
                >
                  <span
                    class="material-symbols-outlined"
                    style="width: 20px; height: 20px; font-size: 20px"
                    >edit</span
                  >
                </BaseButton>
                <BaseButton
                  v-if="auth.hasPermission('desactivar_paciente')"
                  variant="ghost"
                  size="sm"
                  @click.stop="openDeleteModal(p)"
                >
                  <span
                    class="material-symbols-outlined"
                    style="width: 20px; height: 20px; font-size: 20px"
                    >delete</span
                  >
                </BaseButton>
              </div>
            </template>
          </BaseTable>

          <!-- Footer: conteo + paginador -->
          <div
            v-if="patients.length > 0"
            class="px-6 py-4 flex items-center justify-between flex-wrap gap-4"
            style="
              border-top: 1px solid rgba(196, 197, 213, 0.12);
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
                class="w-9 h-9 rounded-full flex items-center justify-center transition-all disabled:opacity-30"
                style="color: var(--color-on-surface-variant)"
                onmouseover="
                  if (!this.disabled)
                    this.style.backgroundColor = 'var(--color-surface-container-high)'
                "
                onmouseout="this.style.backgroundColor = ''"
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
                  @click="currentPage = p"
                  class="w-9 h-9 rounded-full text-sm font-semibold transition-all"
                  :style="
                    currentPage === p
                      ? 'background-color: var(--color-primary); color: white;'
                      : 'color: var(--color-on-surface-variant);'
                  "
                  :onmouseover="
                    currentPage !== p
                      ? 'this.style.backgroundColor=\'var(--color-surface-container-high)\''
                      : ''
                  "
                  :onmouseout="currentPage !== p ? 'this.style.backgroundColor=\'\'' : ''"
                >
                  {{ p }}
                </button>
              </template>

              <!-- Siguiente -->
              <button
                @click="currentPage++"
                :disabled="currentPage === totalPages"
                class="w-9 h-9 rounded-full flex items-center justify-center transition-all disabled:opacity-30"
                style="color: var(--color-on-surface-variant)"
                onmouseover="
                  if (!this.disabled)
                    this.style.backgroundColor = 'var(--color-surface-container-high)'
                "
                onmouseout="this.style.backgroundColor = ''"
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

    <!-- FAB -->
    <BaseButton
      variant="primary"
      class="fixed bottom-8 right-8 w-16 h-16 rounded-full shadow-2xl z-50"
      style="box-shadow: 0 8px 32px rgba(0, 103, 128, 0.35)"
    >
      <span class="material-symbols-outlined" style="font-size: 32px; width: 32px; height: 32px"
        >qr_code_scanner</span
      >
    </BaseButton>

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

        <div class="grid grid-cols-2 gap-4">
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
              class="px-4 py-3 rounded-xl text-sm outline-none transition-all"
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
              class="px-4 py-3 rounded-xl text-sm outline-none transition-all"
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
            class="px-4 py-3 rounded-xl text-sm outline-none transition-all"
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
          <input
            v-model="createForm.birthDate"
            type="date"
            class="px-4 py-3 rounded-xl text-sm outline-none transition-all"
            :style="inputStyle(!!createErrors.birthDate)"
          />
          <p
            v-if="createErrors.birthDate"
            class="text-xs font-medium"
            style="color: var(--color-error)"
          >
            {{ createErrors.birthDate }}
          </p>
        </div>

        <!-- Banner contacto -->
        <div
          v-if="createErrors.contact"
          class="flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium"
          style="background-color: #fff0c2; color: #7a5000"
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
            class="px-4 py-3 rounded-xl text-sm outline-none transition-all"
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
            class="px-4 py-3 rounded-xl text-sm outline-none transition-all"
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
      </template>
    </BaseModal>

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
        <BaseButton variant="secondary" @click="showEditModal = false">Cancelar</BaseButton>
        <BaseButton variant="primary" :disabled="isSavingEdit" @click="submitEdit">
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
