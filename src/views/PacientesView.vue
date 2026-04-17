<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import AppSidebar from '@/components/AppSidebar.vue'
import AppHeader from '@/components/AppHeader.vue'
import { useAuthStore } from '@/stores/auth'
import {
  type Patient,
  type CreatePatientRequest,
  type UpdatePatientRequest,
  type GetPatientsParams,
  getPatients,
  createPatient,
  updatePatient,
  deletePatient,
} from '@/services/patientService'

const auth = useAuthStore()

// ── Estado principal ──────────────────────────────────────────────────────────

const patients    = ref<Patient[]>([])
const isLoading   = ref(false)
const loadError   = ref('')
const totalCount  = ref(0)
const totalActive = ref(0)
const totalPages  = ref(0)

// ── Filtros, búsqueda y paginación ────────────────────────────────────────────

const PAGE_SIZE    = 10
const currentPage  = ref(1)
const activeFilter = ref('todos')
const searchQuery  = ref('')
let   searchTimer  = 0

const filters = [
  { id: 'todos',    label: 'Todos' },
  { id: 'activos',  label: 'Activos' },
  { id: 'inactivos', label: 'Inactivos' },
]

const statusParam = computed<GetPatientsParams['status'] | undefined>(() => {
  if (activeFilter.value === 'activos')   return 'active'
  if (activeFilter.value === 'inactivos') return 'inactive'
  return undefined
})

// Rango visible para el footer ("Mostrando X–Y de Z")
const rangeStart = computed(() => totalCount.value === 0 ? 0 : (currentPage.value - 1) * PAGE_SIZE + 1)
const rangeEnd   = computed(() => Math.min(currentPage.value * PAGE_SIZE, totalCount.value))

// Páginas a mostrar en el paginador (máx 5 botones + ellipsis)
const visiblePages = computed(() => {
  const total = totalPages.value
  const cur   = currentPage.value
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)

  const pages: (number | '...')[] = [1]
  if (cur > 3)       pages.push('...')
  for (let p = Math.max(2, cur - 1); p <= Math.min(total - 1, cur + 1); p++) pages.push(p)
  if (cur < total - 2) pages.push('...')
  pages.push(total)
  return pages
})

// ── Carga con paginación ──────────────────────────────────────────────────────

async function loadPatients() {
  isLoading.value = true
  loadError.value = ''
  try {
    const result = await getPatients({
      page:     currentPage.value,
      pageSize: PAGE_SIZE,
      search:   searchQuery.value.trim() || undefined,
      status:   statusParam.value,
    })
    patients.value    = result.items
    totalCount.value  = result.totalCount
    totalActive.value = result.totalActive
    totalPages.value  = result.totalPages
  } catch (err: unknown) {
    loadError.value = err instanceof Error ? err.message : 'Error al cargar pacientes.'
  } finally {
    isLoading.value = false
  }
}

watch(activeFilter, () => { currentPage.value = 1; loadPatients() })
watch(currentPage,  loadPatients)
watch(searchQuery,  () => {
  clearTimeout(searchTimer)
  searchTimer = window.setTimeout(() => { currentPage.value = 1; loadPatients() }, 350)
})

// ── Helpers ───────────────────────────────────────────────────────────────────

const AVATAR_PALETTE = [
  { bg: 'rgba(0,40,142,0.06)', color: '#00288E' },
  { bg: 'rgba(0,103,128,0.06)', color: '#006780' },
  { bg: 'rgba(32,0,177,0.06)', color: '#2000B1' },
  { bg: 'rgba(117,118,132,0.08)', color: '#757684' },
]

function avatarStyle(p: Patient) {
  const idx = (p.id ?? 0) % AVATAR_PALETTE.length
  return AVATAR_PALETTE[idx]
}

function initials(p: Patient) {
  return `${p.firstName[0] ?? ''}${p.lastName[0] ?? ''}`.toUpperCase()
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })
}

function statusStyle(isActive: boolean) {
  return isActive
    ? { bg: '#dcfce7', dot: '#16a34a', text: '#166534', label: 'Activo' }
    : { bg: '#E0E2E7', dot: '#757684', text: '#444653', label: 'Inactivo' }
}

onMounted(loadPatients)

// ── Validación ────────────────────────────────────────────────────────────────

const ONLY_LETTERS = /^[a-záéíóúüñA-ZÁÉÍÓÚÜÑ\s]+$/
const EMAIL_RE    = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

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
}

function inputStyle(hasError: boolean) {
  return hasError
    ? 'border: 1.5px solid #BA1A1A; color: #181C20; background-color: #FFF8F7;'
    : 'border: 1px solid #C4C5D5; color: #181C20; background-color: #F7F9FE;'
}

// ── Modal Crear ───────────────────────────────────────────────────────────────

const showCreateModal = ref(false)
const createForm = ref<CreatePatientRequest>({
  ci: '',
  firstName: '',
  lastName: '',
  birthDate: '',
  phoneNumber: '',
  email: '',
})
const createErrors = ref<CreateErrors>({})
const createError  = ref('')
const isSavingCreate = ref(false)

function validateCreate(): boolean {
  const e: CreateErrors = {}
  const f = createForm.value

  if (!f.firstName.trim())
    e.firstName = 'El nombre es obligatorio.'
  else if (!ONLY_LETTERS.test(f.firstName.trim()))
    e.firstName = 'Solo se permiten letras y espacios.'
  else if (f.firstName.trim().length > 120)
    e.firstName = 'Máximo 120 caracteres.'

  if (!f.lastName.trim())
    e.lastName = 'El apellido es obligatorio.'
  else if (!ONLY_LETTERS.test(f.lastName.trim()))
    e.lastName = 'Solo se permiten letras y espacios.'
  else if (f.lastName.trim().length > 120)
    e.lastName = 'Máximo 120 caracteres.'

  if (!f.ci.trim())
    e.ci = 'El documento es obligatorio.'
  else if (f.ci.trim().length > 30)
    e.ci = 'Máximo 30 caracteres.'

  if (!f.birthDate)
    e.birthDate = 'La fecha de nacimiento es obligatoria.'

  const hasPhone = !!f.phoneNumber?.trim()
  const hasEmail = !!f.email?.trim()

  if (!hasPhone && !hasEmail)
    e.contact = 'Debe ingresar al menos un dato de contacto: email o teléfono.'
  else if (hasEmail && !EMAIL_RE.test(f.email!.trim()))
    e.email = 'El formato del email no es válido.'

  createErrors.value = e
  return Object.keys(e).length === 0
}

function openCreateModal() {
  createForm.value = { ci: '', firstName: '', lastName: '', birthDate: '', phoneNumber: '', email: '' }
  createErrors.value = {}
  createError.value  = ''
  showCreateModal.value = true
}

async function submitCreate() {
  if (isSavingCreate.value) return
  if (!validateCreate()) return
  createError.value = ''
  isSavingCreate.value = true
  try {
    await createPatient({
      ...createForm.value,
      email:       createForm.value.email       || undefined,
      phoneNumber: createForm.value.phoneNumber || undefined,
    })
    showCreateModal.value = false
    currentPage.value = 1
    await loadPatients()
  } catch (err: unknown) {
    createError.value = err instanceof Error ? err.message : 'Error al crear paciente.'
  } finally {
    isSavingCreate.value = false
  }
}

// ── Modal Editar ──────────────────────────────────────────────────────────────

const showEditModal = ref(false)
const editingId = ref<number | null>(null)
const editForm  = ref<UpdatePatientRequest>({ firstName: '', lastName: '', phoneNumber: '', isActive: true })
const editErrors = ref<EditErrors>({})
const editError  = ref('')
const isSavingEdit = ref(false)

function validateEdit(): boolean {
  const e: EditErrors = {}
  const f = editForm.value

  if (!f.firstName.trim())
    e.firstName = 'El nombre es obligatorio.'
  else if (!ONLY_LETTERS.test(f.firstName.trim()))
    e.firstName = 'Solo se permiten letras y espacios.'

  if (!f.lastName.trim())
    e.lastName = 'El apellido es obligatorio.'
  else if (!ONLY_LETTERS.test(f.lastName.trim()))
    e.lastName = 'Solo se permiten letras y espacios.'

  editErrors.value = e
  return Object.keys(e).length === 0
}

function openEditModal(p: Patient) {
  editingId.value = p.id
  editForm.value = {
    firstName:   p.firstName,
    lastName:    p.lastName,
    phoneNumber: p.phoneNumber ?? '',
    isActive:    p.isActive,
  }
  editErrors.value = {}
  editError.value  = ''
  showEditModal.value = true
}

async function submitEdit() {
  if (isSavingEdit.value || editingId.value === null) return
  if (!validateEdit()) return
  editError.value = ''
  isSavingEdit.value = true
  try {
    await updatePatient(editingId.value, {
      ...editForm.value,
      phoneNumber: editForm.value.phoneNumber || undefined,
    })
    showEditModal.value = false
    await loadPatients()
  } catch (err: unknown) {
    editError.value = err instanceof Error ? err.message : 'Error al actualizar paciente.'
  } finally {
    isSavingEdit.value = false
  }
}

// ── Modal Eliminar ────────────────────────────────────────────────────────────

const showDeleteModal = ref(false)
const deletingPatient = ref<Patient | null>(null)
const isDeleting = ref(false)
const deleteError = ref('')

function openDeleteModal(p: Patient) {
  deletingPatient.value = p
  deleteError.value = ''
  showDeleteModal.value = true
}

async function confirmDelete() {
  if (isDeleting.value || !deletingPatient.value) return
  isDeleting.value = true
  deleteError.value = ''
  try {
    await deletePatient(deletingPatient.value.id)
    showDeleteModal.value = false
    await loadPatients()
  } catch (err: unknown) {
    deleteError.value = err instanceof Error ? err.message : 'Error al desactivar paciente.'
  } finally {
    isDeleting.value = false
  }
}
</script>

<template>
  <div class="min-h-screen" style="background-color: #F7F9FE;">
    <AppSidebar />
    <AppHeader />

    <main style="margin-left: 280px; padding-top: 64px;">
      <div class="px-8 pt-10 pb-12 max-w-7xl mx-auto">

        <!-- Page header -->
        <div class="flex justify-between items-end mb-8">
          <div>
            <h2
              class="text-4xl font-extrabold tracking-tight mb-2"
              style="font-family: 'Plus Jakarta Sans', system-ui, sans-serif; color: #00288E;"
            >Gestión de Pacientes</h2>
            <p class="font-medium" style="color: #444653;">
              Administre la base de datos de pacientes y su historial clínico con precisión.
            </p>
          </div>

          <button
            v-if="auth.hasPermission('crear_paciente')"
            @click="openCreateModal"
            class="flex items-center gap-2 px-8 py-4 rounded-full font-bold transition-all active:scale-95"
            style="background-color: #00288E; color: white; box-shadow: 0 4px 20px rgba(0,40,142,0.2);"
          >
            <span class="material-symbols-outlined" style="width:20px;height:20px;font-size:20px;">person_add</span>
            Añadir Paciente
          </button>
        </div>

        <!-- Filters + Search -->
        <div class="flex items-center justify-between gap-4 mb-8 flex-wrap">
          <div class="flex items-center gap-3 flex-wrap">
            <button
              v-for="f in filters"
              :key="f.id"
              @click="activeFilter = f.id"
              class="px-6 py-2 rounded-full text-sm font-semibold transition-all"
              :style="activeFilter === f.id
                ? 'background-color: #1E40AF; color: #A8B8FF;'
                : 'background-color: #E6E8ED; color: #444653;'"
            >{{ f.label }}</button>
          </div>

          <div class="relative">
            <span
              class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              style="color: #757684; font-size: 18px; width: 18px; height: 18px;"
            >search</span>
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Buscar por nombre, C.I., contacto..."
              class="pl-10 pr-10 py-2.5 rounded-full text-sm outline-none transition-all"
              style="background-color: #F1F4F9; border: 1px solid rgba(196,197,213,0.4); color: #181C20; width: 300px;"
            />
            <button
              v-if="searchQuery"
              @click="searchQuery = ''"
              class="absolute right-3 top-1/2 -translate-y-1/2"
              style="color: #757684;"
            >
              <span class="material-symbols-outlined" style="font-size: 16px; width: 16px; height: 16px;">close</span>
            </button>
          </div>
        </div>

        <!-- Loading -->
        <div v-if="isLoading" class="flex justify-center py-24">
          <svg class="animate-spin w-8 h-8" style="color: #00288E;" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
          </svg>
        </div>

        <!-- Load error -->
        <div
          v-else-if="loadError"
          class="flex items-center gap-2.5 rounded-2xl px-4 py-3 text-sm font-medium"
          style="background-color: #FFDAD6; color: #93000A;"
        >
          <span class="material-symbols-outlined" style="font-size:18px;">error</span>
          {{ loadError }}
        </div>

        <!-- Table -->
        <div
          v-else
          class="rounded-2xl overflow-hidden"
          style="background-color: #ffffff; box-shadow: 0 1px 3px rgba(196,197,213,0.25); outline: 1px solid rgba(196,197,213,0.15);"
        >
          <table class="w-full text-left">
            <thead>
              <tr style="background-color: #F1F4F9;">
                <th class="px-6 py-5 text-xs font-bold uppercase tracking-widest" style="color: #757684;">Nombre del Paciente</th>
                <th class="px-6 py-5 text-xs font-bold uppercase tracking-widest hidden sm:table-cell" style="color: #757684;">C.I.</th>
                <th class="px-6 py-5 text-xs font-bold uppercase tracking-widest hidden md:table-cell" style="color: #757684;">Fecha de Registro</th>
                <th class="px-6 py-5 text-xs font-bold uppercase tracking-widest" style="color: #757684;">Estado</th>
                <th class="px-6 py-5 text-xs font-bold uppercase tracking-widest text-right" style="color: #757684;">Acciones</th>
              </tr>
            </thead>
            <tbody>
              <!-- Empty state -->
              <tr v-if="patients.length === 0">
                <td colspan="5" class="px-6 py-16 text-center text-sm font-medium" style="color: #757684;">
                  No hay pacientes para mostrar.
                </td>
              </tr>

              <tr
                v-for="p in patients"
                :key="p.id"
                class="group transition-colors"
                style="border-top: 1px solid rgba(196,197,213,0.12);"
                onmouseover="this.style.backgroundColor='#F1F4F9'"
                onmouseout="this.style.backgroundColor=''"
              >
                <!-- Nombre -->
                <td class="px-6 py-5">
                  <div class="flex items-center gap-3">
                    <div
                      class="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                      :style="`background-color: ${avatarStyle(p).bg}; color: ${avatarStyle(p).color};`"
                    >{{ initials(p) }}</div>
                    <div>
                      <div class="font-bold text-sm" style="color: #181C20;">{{ p.firstName }} {{ p.lastName }}</div>
                      <div class="text-xs" style="color: #444653;">{{ p.email ?? p.phoneNumber ?? '—' }}</div>
                    </div>
                  </div>
                </td>

                <!-- C.I. -->
                <td class="px-6 py-5 text-sm font-medium tracking-wider hidden sm:table-cell" style="color: #444653;">
                  {{ p.ci }}
                </td>

                <!-- Fecha de Registro -->
                <td class="px-6 py-5 text-sm hidden md:table-cell" style="color: #444653;">
                  {{ formatDate(p.createdAt) }}
                </td>

                <!-- Estado -->
                <td class="px-6 py-5">
                  <span
                    class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider"
                    :style="`background-color: ${statusStyle(p.isActive).bg}; color: ${statusStyle(p.isActive).text};`"
                  >
                    <span class="w-1.5 h-1.5 rounded-full" :style="`background-color: ${statusStyle(p.isActive).dot};`"></span>
                    {{ statusStyle(p.isActive).label }}
                  </span>
                </td>

                <!-- Acciones -->
                <td class="px-6 py-5">
                  <div class="flex justify-end gap-1 opacity-40 group-hover:opacity-100 transition-opacity">
                    <button
                      v-if="auth.hasPermission('editar_paciente')"
                      @click="openEditModal(p)"
                      class="p-2 rounded-full transition-all"
                      style="color: #444653;"
                      onmouseover="this.style.backgroundColor='#DDE1FF'; this.style.color='#00288E';"
                      onmouseout="this.style.backgroundColor=''; this.style.color='#444653';"
                    >
                      <span class="material-symbols-outlined" style="width:20px;height:20px;font-size:20px;">edit</span>
                    </button>
                    <button
                      v-if="auth.hasPermission('desactivar_paciente')"
                      @click="openDeleteModal(p)"
                      class="p-2 rounded-full transition-all"
                      style="color: #444653;"
                      onmouseover="this.style.backgroundColor='#FFDAD6'; this.style.color='#BA1A1A';"
                      onmouseout="this.style.backgroundColor=''; this.style.color='#444653';"
                    >
                      <span class="material-symbols-outlined" style="width:20px;height:20px;font-size:20px;">delete</span>
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>

          <!-- Footer: conteo + paginador -->
          <div
            class="px-6 py-4 flex items-center justify-between flex-wrap gap-4"
            style="border-top: 1px solid rgba(196,197,213,0.12); background-color: #ffffff;"
          >
            <span class="text-sm" style="color: #444653;">
              Mostrando
              <strong style="color:#181C20;">{{ rangeStart }}–{{ rangeEnd }}</strong>
              de
              <strong style="color:#181C20;">{{ totalCount }}</strong>
              pacientes
            </span>

            <div v-if="totalPages > 1" class="flex items-center gap-1">
              <!-- Anterior -->
              <button
                @click="currentPage--"
                :disabled="currentPage === 1"
                class="w-9 h-9 rounded-full flex items-center justify-center transition-all disabled:opacity-30"
                style="color: #444653;"
                onmouseover="if(!this.disabled)this.style.backgroundColor='#E6E8ED'"
                onmouseout="this.style.backgroundColor=''"
              >
                <span class="material-symbols-outlined" style="font-size:18px;">chevron_left</span>
              </button>

              <!-- Números -->
              <template v-for="p in visiblePages" :key="p">
                <span
                  v-if="p === '...'"
                  class="w-9 h-9 flex items-center justify-center text-sm"
                  style="color: #757684;"
                >…</span>
                <button
                  v-else
                  @click="currentPage = p"
                  class="w-9 h-9 rounded-full text-sm font-semibold transition-all"
                  :style="currentPage === p
                    ? 'background-color: #00288E; color: white;'
                    : 'color: #444653;'"
                  :onmouseover="currentPage !== p ? 'this.style.backgroundColor=\'#E6E8ED\'' : ''"
                  :onmouseout="currentPage !== p ? 'this.style.backgroundColor=\'\'' : ''"
                >{{ p }}</button>
              </template>

              <!-- Siguiente -->
              <button
                @click="currentPage++"
                :disabled="currentPage === totalPages"
                class="w-9 h-9 rounded-full flex items-center justify-center transition-all disabled:opacity-30"
                style="color: #444653;"
                onmouseover="if(!this.disabled)this.style.backgroundColor='#E6E8ED'"
                onmouseout="this.style.backgroundColor=''"
              >
                <span class="material-symbols-outlined" style="font-size:18px;">chevron_right</span>
              </button>
            </div>
          </div>
        </div>

        <!-- Bento insight cards -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mt-10">
          <div
            class="p-8 rounded-2xl flex flex-col justify-between"
            style="background-color: #F1F4F9; height: 192px;"
          >
            <span class="material-symbols-outlined" style="color: #00288E; font-size:32px; width:32px; height:32px;">group</span>
            <div>
              <div class="text-3xl font-black" style="font-family: 'Plus Jakarta Sans', system-ui, sans-serif; color: #181C20;">
                {{ totalActive }}
              </div>
              <div class="text-xs font-bold uppercase tracking-widest mt-1" style="color: #757684;">Pacientes Activos</div>
            </div>
          </div>

          <div
            class="p-8 rounded-2xl flex flex-col justify-between"
            style="background-color: #F1F4F9; height: 192px;"
          >
            <span class="material-symbols-outlined" style="color: #006780; font-size:32px; width:32px; height:32px;">history_edu</span>
            <div>
              <div class="text-3xl font-black" style="font-family: 'Plus Jakarta Sans', system-ui, sans-serif; color: #181C20;">
                {{ totalCount }}
              </div>
              <div class="text-xs font-bold uppercase tracking-widest mt-1" style="color: #757684;">Total Registros</div>
            </div>
          </div>

        </div>

      </div>
    </main>

    <!-- FAB -->
    <button
      class="fixed bottom-8 right-8 w-16 h-16 rounded-full shadow-2xl flex items-center justify-center transition-all hover:scale-110 active:scale-95 z-50"
      style="background-color: #006780; color: white; box-shadow: 0 8px 32px rgba(0,103,128,0.35);"
    >
      <span class="material-symbols-outlined" style="font-size:32px; width:32px; height:32px;">qr_code_scanner</span>
    </button>


    <!-- ══════════════════════════════════════════════════
         MODAL: CREAR PACIENTE
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
          v-if="showCreateModal"
          class="fixed inset-0 z-50 flex items-center justify-center p-4"
          style="background-color: rgba(24,28,32,0.5);"
          @click.self="showCreateModal = false"
        >
          <div
            class="w-full max-w-lg rounded-3xl overflow-hidden"
            style="background-color: #ffffff; box-shadow: 0 24px 64px rgba(0,40,142,0.18);"
          >
            <!-- Header modal -->
            <div class="flex items-center justify-between px-8 pt-8 pb-6" style="border-bottom: 1px solid rgba(196,197,213,0.2);">
              <h3 class="text-xl font-extrabold" style="font-family: 'Plus Jakarta Sans', system-ui, sans-serif; color: #00288E;">
                Nuevo Paciente
              </h3>
              <button @click="showCreateModal = false" class="p-1 rounded-full transition-colors" style="color: #757684;">
                <span class="material-symbols-outlined" style="font-size:22px;">close</span>
              </button>
            </div>

            <!-- Body -->
            <form @submit.prevent="submitCreate" class="px-8 py-6 space-y-5 max-h-[70vh] overflow-y-auto">
              <!-- Error -->
              <div
                v-if="createError"
                class="flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium"
                style="background-color: #FFDAD6; color: #93000A;"
              >
                <span class="material-symbols-outlined" style="font-size:18px;">error</span>
                {{ createError }}
              </div>

              <div class="grid grid-cols-2 gap-4">
                <div class="flex flex-col gap-1.5">
                  <label class="text-xs font-bold uppercase tracking-wider" style="color: #757684;">Nombre *</label>
                  <input
                    v-model="createForm.firstName"
                    type="text"
                    placeholder="Ana"
                    class="px-4 py-3 rounded-xl text-sm outline-none transition-all"
                    :style="inputStyle(!!createErrors.firstName)"
                  />
                  <p v-if="createErrors.firstName" class="text-xs font-medium" style="color: #BA1A1A;">{{ createErrors.firstName }}</p>
                </div>
                <div class="flex flex-col gap-1.5">
                  <label class="text-xs font-bold uppercase tracking-wider" style="color: #757684;">Apellido *</label>
                  <input
                    v-model="createForm.lastName"
                    type="text"
                    placeholder="García"
                    class="px-4 py-3 rounded-xl text-sm outline-none transition-all"
                    :style="inputStyle(!!createErrors.lastName)"
                  />
                  <p v-if="createErrors.lastName" class="text-xs font-medium" style="color: #BA1A1A;">{{ createErrors.lastName }}</p>
                </div>
              </div>

              <div class="flex flex-col gap-1.5">
                <label class="text-xs font-bold uppercase tracking-wider" style="color: #757684;">Documento *</label>
                <input
                  v-model="createForm.ci"
                  type="text"
                  placeholder="12345678"
                  class="px-4 py-3 rounded-xl text-sm outline-none transition-all"
                  :style="inputStyle(!!createErrors.ci)"
                />
                <p v-if="createErrors.ci" class="text-xs font-medium" style="color: #BA1A1A;">{{ createErrors.ci }}</p>
              </div>

              <div class="flex flex-col gap-1.5">
                <label class="text-xs font-bold uppercase tracking-wider" style="color: #757684;">Fecha de Nacimiento *</label>
                <input
                  v-model="createForm.birthDate"
                  type="date"
                  class="px-4 py-3 rounded-xl text-sm outline-none transition-all"
                  :style="inputStyle(!!createErrors.birthDate)"
                />
                <p v-if="createErrors.birthDate" class="text-xs font-medium" style="color: #BA1A1A;">{{ createErrors.birthDate }}</p>
              </div>

              <!-- Banner contacto -->
              <div
                v-if="createErrors.contact"
                class="flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium"
                style="background-color: #FFF0C2; color: #7A5000;"
              >
                <span class="material-symbols-outlined" style="font-size:18px;">warning</span>
                {{ createErrors.contact }}
              </div>

              <div class="flex flex-col gap-1.5">
                <label class="text-xs font-bold uppercase tracking-wider" style="color: #757684;">
                  Teléfono
                  <span class="normal-case font-normal tracking-normal ml-1" style="color: #757684;">(requerido si no hay email)</span>
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
                <label class="text-xs font-bold uppercase tracking-wider" style="color: #757684;">
                  Email
                  <span class="normal-case font-normal tracking-normal ml-1" style="color: #757684;">(requerido si no hay teléfono)</span>
                </label>
                <input
                  v-model="createForm.email"
                  type="email"
                  placeholder="paciente@email.com"
                  class="px-4 py-3 rounded-xl text-sm outline-none transition-all"
                  :style="inputStyle(!!createErrors.email || !!createErrors.contact)"
                />
                <p v-if="createErrors.email" class="text-xs font-medium" style="color: #BA1A1A;">{{ createErrors.email }}</p>
              </div>
            </form>

            <!-- Footer modal -->
            <div class="px-8 py-6 flex justify-end gap-3" style="border-top: 1px solid rgba(196,197,213,0.2);">
              <button
                type="button"
                @click="showCreateModal = false"
                class="px-6 py-3 rounded-full text-sm font-bold transition-all"
                style="background-color: #E6E8ED; color: #444653;"
              >Cancelar</button>
              <button
                @click="submitCreate"
                :disabled="isSavingCreate"
                class="flex items-center gap-2 px-6 py-3 rounded-full text-sm font-bold transition-all disabled:opacity-60"
                style="background-color: #00288E; color: white;"
              >
                <svg v-if="isSavingCreate" class="animate-spin w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
                {{ isSavingCreate ? 'Guardando...' : 'Guardar Paciente' }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>


    <!-- ══════════════════════════════════════════════════
         MODAL: EDITAR PACIENTE
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
          v-if="showEditModal"
          class="fixed inset-0 z-50 flex items-center justify-center p-4"
          style="background-color: rgba(24,28,32,0.5);"
          @click.self="showEditModal = false"
        >
          <div
            class="w-full max-w-lg rounded-3xl overflow-hidden"
            style="background-color: #ffffff; box-shadow: 0 24px 64px rgba(0,40,142,0.18);"
          >
            <div class="flex items-center justify-between px-8 pt-8 pb-6" style="border-bottom: 1px solid rgba(196,197,213,0.2);">
              <h3 class="text-xl font-extrabold" style="font-family: 'Plus Jakarta Sans', system-ui, sans-serif; color: #00288E;">
                Editar Paciente
              </h3>
              <button @click="showEditModal = false" class="p-1 rounded-full transition-colors" style="color: #757684;">
                <span class="material-symbols-outlined" style="font-size:22px;">close</span>
              </button>
            </div>

            <form @submit.prevent="submitEdit" class="px-8 py-6 space-y-5">
              <div
                v-if="editError"
                class="flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium"
                style="background-color: #FFDAD6; color: #93000A;"
              >
                <span class="material-symbols-outlined" style="font-size:18px;">error</span>
                {{ editError }}
              </div>

              <div class="grid grid-cols-2 gap-4">
                <div class="flex flex-col gap-1.5">
                  <label class="text-xs font-bold uppercase tracking-wider" style="color: #757684;">Nombre *</label>
                  <input
                    v-model="editForm.firstName"
                    type="text"
                    class="px-4 py-3 rounded-xl text-sm outline-none"
                    :style="inputStyle(!!editErrors.firstName)"
                  />
                  <p v-if="editErrors.firstName" class="text-xs font-medium" style="color: #BA1A1A;">{{ editErrors.firstName }}</p>
                </div>
                <div class="flex flex-col gap-1.5">
                  <label class="text-xs font-bold uppercase tracking-wider" style="color: #757684;">Apellido *</label>
                  <input
                    v-model="editForm.lastName"
                    type="text"
                    class="px-4 py-3 rounded-xl text-sm outline-none"
                    :style="inputStyle(!!editErrors.lastName)"
                  />
                  <p v-if="editErrors.lastName" class="text-xs font-medium" style="color: #BA1A1A;">{{ editErrors.lastName }}</p>
                </div>
              </div>

              <div class="flex flex-col gap-1.5">
                <label class="text-xs font-bold uppercase tracking-wider" style="color: #757684;">Teléfono</label>
                <input
                  v-model="editForm.phoneNumber"
                  type="tel"
                  placeholder="0972123456"
                  class="px-4 py-3 rounded-xl text-sm outline-none"
                  style="border: 1px solid #C4C5D5; color: #181C20; background-color: #F7F9FE;"
                />
              </div>

              <div class="flex items-center justify-between px-4 py-3 rounded-xl" style="background-color: #F1F4F9;">
                <span class="text-sm font-semibold" style="color: #444653;">Cuenta activa</span>
                <button
                  type="button"
                  @click="editForm.isActive = !editForm.isActive"
                  class="relative w-12 h-6 rounded-full transition-all"
                  :style="editForm.isActive ? 'background-color: #00288E;' : 'background-color: #C4C5D5;'"
                >
                  <span
                    class="absolute top-1 w-4 h-4 rounded-full bg-white transition-all"
                    :style="editForm.isActive ? 'left: calc(100% - 1.25rem);' : 'left: 0.25rem;'"
                  ></span>
                </button>
              </div>
            </form>

            <div class="px-8 py-6 flex justify-end gap-3" style="border-top: 1px solid rgba(196,197,213,0.2);">
              <button
                type="button"
                @click="showEditModal = false"
                class="px-6 py-3 rounded-full text-sm font-bold"
                style="background-color: #E6E8ED; color: #444653;"
              >Cancelar</button>
              <button
                @click="submitEdit"
                :disabled="isSavingEdit"
                class="flex items-center gap-2 px-6 py-3 rounded-full text-sm font-bold disabled:opacity-60"
                style="background-color: #00288E; color: white;"
              >
                <svg v-if="isSavingEdit" class="animate-spin w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
                {{ isSavingEdit ? 'Guardando...' : 'Guardar Cambios' }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>


    <!-- ══════════════════════════════════════════════════
         MODAL: CONFIRMAR ELIMINACIÓN
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
          v-if="showDeleteModal"
          class="fixed inset-0 z-50 flex items-center justify-center p-4"
          style="background-color: rgba(24,28,32,0.5);"
          @click.self="showDeleteModal = false"
        >
          <div
            class="w-full max-w-sm rounded-3xl overflow-hidden"
            style="background-color: #ffffff; box-shadow: 0 24px 64px rgba(186,26,26,0.12);"
          >
            <div class="px-8 pt-8 pb-6 text-center">
              <div
                class="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-5"
                style="background-color: #FFDAD6;"
              >
                <span class="material-symbols-outlined" style="color: #BA1A1A; font-size:28px;">person_off</span>
              </div>
              <h3 class="text-lg font-extrabold mb-2" style="font-family: 'Plus Jakarta Sans', system-ui, sans-serif; color: #181C20;">
                Desactivar Paciente
              </h3>
              <p class="text-sm" style="color: #444653;">
                ¿Desactivar a
                <strong style="color:#181C20;">{{ deletingPatient?.firstName }} {{ deletingPatient?.lastName }}</strong>?
                El paciente no podrá iniciar sesión pero sus datos se conservarán.
              </p>

              <div
                v-if="deleteError"
                class="mt-4 flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium"
                style="background-color: #FFDAD6; color: #93000A;"
              >
                <span class="material-symbols-outlined" style="font-size:18px;">error</span>
                {{ deleteError }}
              </div>
            </div>

            <div class="px-8 pb-8 flex gap-3">
              <button
                type="button"
                @click="showDeleteModal = false"
                class="flex-1 py-3 rounded-full text-sm font-bold"
                style="background-color: #E6E8ED; color: #444653;"
              >Cancelar</button>
              <button
                @click="confirmDelete"
                :disabled="isDeleting"
                class="flex-1 flex items-center justify-center gap-2 py-3 rounded-full text-sm font-bold disabled:opacity-60"
                style="background-color: #BA1A1A; color: white;"
              >
                <svg v-if="isDeleting" class="animate-spin w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
                {{ isDeleting ? 'Desactivando...' : 'Desactivar' }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

  </div>
</template>
