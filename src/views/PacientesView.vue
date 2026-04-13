<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import AppSidebar from '@/components/AppSidebar.vue'
import AppHeader from '@/components/AppHeader.vue'
import {
  type Patient,
  type CreatePatientRequest,
  type UpdatePatientRequest,
  getPatients,
  createPatient,
  updatePatient,
  deletePatient,
} from '@/services/patientService'

// ── Estado principal ──────────────────────────────────────────────────────────

const patients = ref<Patient[]>([])
const isLoading = ref(false)
const loadError = ref('')

// ── Filtros ───────────────────────────────────────────────────────────────────

const activeFilter = ref('todos')
const filters = [
  { id: 'todos', label: 'Todos' },
  { id: 'activos', label: 'Activos' },
  { id: 'inactivos', label: 'Inactivos' },
]

const filteredPatients = computed(() => {
  if (activeFilter.value === 'activos') return patients.value.filter((p) => p.isActive)
  if (activeFilter.value === 'inactivos') return patients.value.filter((p) => !p.isActive)
  return patients.value
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

// ── Carga inicial ─────────────────────────────────────────────────────────────

async function loadPatients() {
  isLoading.value = true
  loadError.value = ''
  try {
    patients.value = await getPatients()
  } catch (err: unknown) {
    loadError.value = err instanceof Error ? err.message : 'Error al cargar pacientes.'
  } finally {
    isLoading.value = false
  }
}

onMounted(loadPatients)

// ── Modal Crear ───────────────────────────────────────────────────────────────

const showCreateModal = ref(false)
const createForm = ref<CreatePatientRequest>({
  dni: '',
  firstName: '',
  lastName: '',
  birthDate: '',
  phoneNumber: '',
  email: '',
  password: '',
})
const createError = ref('')
const isSavingCreate = ref(false)

function openCreateModal() {
  createForm.value = { dni: '', firstName: '', lastName: '', birthDate: '', phoneNumber: '', email: '', password: '' }
  createError.value = ''
  showCreateModal.value = true
}

async function submitCreate() {
  if (isSavingCreate.value) return
  createError.value = ''
  isSavingCreate.value = true
  try {
    const created = await createPatient({
      ...createForm.value,
      phoneNumber: createForm.value.phoneNumber || undefined,
    })
    patients.value.unshift(created)
    showCreateModal.value = false
  } catch (err: unknown) {
    createError.value = err instanceof Error ? err.message : 'Error al crear paciente.'
  } finally {
    isSavingCreate.value = false
  }
}

// ── Modal Editar ──────────────────────────────────────────────────────────────

const showEditModal = ref(false)
const editingId = ref<number | null>(null)
const editForm = ref<UpdatePatientRequest>({ firstName: '', lastName: '', phoneNumber: '', isActive: true })
const editError = ref('')
const isSavingEdit = ref(false)

function openEditModal(p: Patient) {
  editingId.value = p.id
  editForm.value = {
    firstName: p.firstName,
    lastName: p.lastName,
    phoneNumber: p.phoneNumber ?? '',
    isActive: p.isActive,
  }
  editError.value = ''
  showEditModal.value = true
}

async function submitEdit() {
  if (isSavingEdit.value || editingId.value === null) return
  editError.value = ''
  isSavingEdit.value = true
  try {
    const updated = await updatePatient(editingId.value, {
      ...editForm.value,
      phoneNumber: editForm.value.phoneNumber || undefined,
    })
    const idx = patients.value.findIndex((p) => p.id === editingId.value)
    if (idx !== -1) patients.value[idx] = updated
    showEditModal.value = false
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
    // Soft delete: actualizar isActive en local en vez de eliminar la fila
    const idx = patients.value.findIndex((p) => p.id === deletingPatient.value!.id)
    if (idx !== -1) patients.value[idx].isActive = false
    showDeleteModal.value = false
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
            @click="openCreateModal"
            class="flex items-center gap-2 px-8 py-4 rounded-full font-bold transition-all active:scale-95"
            style="background-color: #00288E; color: white; box-shadow: 0 4px 20px rgba(0,40,142,0.2);"
          >
            <span class="material-symbols-outlined" style="width:20px;height:20px;font-size:20px;">person_add</span>
            Añadir Paciente
          </button>
        </div>

        <!-- Filters -->
        <div class="flex items-center gap-3 mb-8 flex-wrap">
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
                <th class="px-6 py-5 text-xs font-bold uppercase tracking-widest hidden sm:table-cell" style="color: #757684;">DNI</th>
                <th class="px-6 py-5 text-xs font-bold uppercase tracking-widest hidden md:table-cell" style="color: #757684;">Fecha de Registro</th>
                <th class="px-6 py-5 text-xs font-bold uppercase tracking-widest" style="color: #757684;">Estado</th>
                <th class="px-6 py-5 text-xs font-bold uppercase tracking-widest text-right" style="color: #757684;">Acciones</th>
              </tr>
            </thead>
            <tbody>
              <!-- Empty state -->
              <tr v-if="filteredPatients.length === 0">
                <td colspan="5" class="px-6 py-16 text-center text-sm font-medium" style="color: #757684;">
                  No hay pacientes para mostrar.
                </td>
              </tr>

              <tr
                v-for="p in filteredPatients"
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
                      <div class="text-xs" style="color: #444653;">{{ p.email }}</div>
                    </div>
                  </div>
                </td>

                <!-- DNI -->
                <td class="px-6 py-5 text-sm font-medium tracking-wider hidden sm:table-cell" style="color: #444653;">
                  {{ p.dni }}
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
                      @click="openEditModal(p)"
                      class="p-2 rounded-full transition-all"
                      style="color: #444653;"
                      onmouseover="this.style.backgroundColor='#DDE1FF'; this.style.color='#00288E';"
                      onmouseout="this.style.backgroundColor=''; this.style.color='#444653';"
                    >
                      <span class="material-symbols-outlined" style="width:20px;height:20px;font-size:20px;">edit</span>
                    </button>
                    <button
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

          <!-- Footer conteo -->
          <div
            class="px-6 py-4 flex items-center"
            style="border-top: 1px solid rgba(196,197,213,0.12); background-color: #ffffff;"
          >
            <span class="text-sm" style="color: #444653;">
              Mostrando <strong style="color:#181C20;">{{ filteredPatients.length }}</strong> de
              <strong style="color:#181C20;">{{ patients.length }}</strong> pacientes
            </span>
          </div>
        </div>

        <!-- Bento insight cards -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mt-10">
          <div
            class="p-8 rounded-2xl flex flex-col justify-between"
            style="background-color: #F1F4F9; height: 192px;"
          >
            <span class="material-symbols-outlined" style="color: #00288E; font-size:32px; width:32px; height:32px;">group</span>
            <div>
              <div class="text-3xl font-black" style="font-family: 'Plus Jakarta Sans', system-ui, sans-serif; color: #181C20;">
                {{ patients.filter(p => p.isActive).length }}
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
                {{ patients.length }}
              </div>
              <div class="text-xs font-bold uppercase tracking-widest mt-1" style="color: #757684;">Total Registros</div>
            </div>
          </div>

          <div
            class="p-8 rounded-2xl flex flex-col justify-between"
            style="background: linear-gradient(135deg, #00288E 0%, #1E40AF 100%); height: 192px; box-shadow: 0 8px 24px rgba(0,40,142,0.25);"
          >
            <span class="material-symbols-outlined" style="color: #DDE1FF; font-size:32px; width:32px; height:32px;">contact_support</span>
            <div>
              <div class="text-sm font-medium mb-1" style="color: rgba(221,225,255,0.75);">Recordatorios Pendientes</div>
              <div class="text-lg font-bold text-white leading-snug">
                Enviar avisos de retiro de lentes a 12 pacientes.
              </div>
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
                    required
                    type="text"
                    placeholder="Ana"
                    class="px-4 py-3 rounded-xl text-sm outline-none transition-all"
                    style="border: 1px solid #C4C5D5; color: #181C20; background-color: #F7F9FE;"
                  />
                </div>
                <div class="flex flex-col gap-1.5">
                  <label class="text-xs font-bold uppercase tracking-wider" style="color: #757684;">Apellido *</label>
                  <input
                    v-model="createForm.lastName"
                    required
                    type="text"
                    placeholder="García"
                    class="px-4 py-3 rounded-xl text-sm outline-none transition-all"
                    style="border: 1px solid #C4C5D5; color: #181C20; background-color: #F7F9FE;"
                  />
                </div>
              </div>

              <div class="flex flex-col gap-1.5">
                <label class="text-xs font-bold uppercase tracking-wider" style="color: #757684;">DNI *</label>
                <input
                  v-model="createForm.dni"
                  required
                  type="text"
                  placeholder="12345678"
                  class="px-4 py-3 rounded-xl text-sm outline-none transition-all"
                  style="border: 1px solid #C4C5D5; color: #181C20; background-color: #F7F9FE;"
                />
              </div>

              <div class="flex flex-col gap-1.5">
                <label class="text-xs font-bold uppercase tracking-wider" style="color: #757684;">Fecha de Nacimiento *</label>
                <input
                  v-model="createForm.birthDate"
                  required
                  type="date"
                  class="px-4 py-3 rounded-xl text-sm outline-none transition-all"
                  style="border: 1px solid #C4C5D5; color: #181C20; background-color: #F7F9FE;"
                />
              </div>

              <div class="flex flex-col gap-1.5">
                <label class="text-xs font-bold uppercase tracking-wider" style="color: #757684;">Teléfono</label>
                <input
                  v-model="createForm.phoneNumber"
                  type="tel"
                  placeholder="+54 11 1234-5678"
                  class="px-4 py-3 rounded-xl text-sm outline-none transition-all"
                  style="border: 1px solid #C4C5D5; color: #181C20; background-color: #F7F9FE;"
                />
              </div>

              <div class="flex flex-col gap-1.5">
                <label class="text-xs font-bold uppercase tracking-wider" style="color: #757684;">Email *</label>
                <input
                  v-model="createForm.email"
                  required
                  type="email"
                  placeholder="paciente@email.com"
                  class="px-4 py-3 rounded-xl text-sm outline-none transition-all"
                  style="border: 1px solid #C4C5D5; color: #181C20; background-color: #F7F9FE;"
                />
              </div>

              <div class="flex flex-col gap-1.5">
                <label class="text-xs font-bold uppercase tracking-wider" style="color: #757684;">Contraseña *</label>
                <input
                  v-model="createForm.password"
                  required
                  type="password"
                  placeholder="••••••••"
                  class="px-4 py-3 rounded-xl text-sm outline-none transition-all"
                  style="border: 1px solid #C4C5D5; color: #181C20; background-color: #F7F9FE;"
                />
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
                    required
                    type="text"
                    class="px-4 py-3 rounded-xl text-sm outline-none"
                    style="border: 1px solid #C4C5D5; color: #181C20; background-color: #F7F9FE;"
                  />
                </div>
                <div class="flex flex-col gap-1.5">
                  <label class="text-xs font-bold uppercase tracking-wider" style="color: #757684;">Apellido *</label>
                  <input
                    v-model="editForm.lastName"
                    required
                    type="text"
                    class="px-4 py-3 rounded-xl text-sm outline-none"
                    style="border: 1px solid #C4C5D5; color: #181C20; background-color: #F7F9FE;"
                  />
                </div>
              </div>

              <div class="flex flex-col gap-1.5">
                <label class="text-xs font-bold uppercase tracking-wider" style="color: #757684;">Teléfono</label>
                <input
                  v-model="editForm.phoneNumber"
                  type="tel"
                  placeholder="+54 11 1234-5678"
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
