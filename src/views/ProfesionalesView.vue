<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import AppSidebar from '@/components/AppSidebar.vue'
import AppHeader from '@/components/AppHeader.vue'
import { useAuthStore } from '@/stores/auth'
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
} from '@/services/professionalService'

const auth = useAuthStore()

// ── Estado principal ──────────────────────────────────────────────────────────

const professionals  = ref<Professional[]>([])
const especialidades = ref<Especialidad[]>([])
const isLoading      = ref(false)
const loadError      = ref('')
const showInactive   = ref(false)
const searchQuery    = ref('')

// ── Datos derivados ───────────────────────────────────────────────────────────

const filtered = computed(() => {
  let list = showInactive.value
    ? professionals.value
    : professionals.value.filter(p => p.isActive)

  const q = searchQuery.value.trim().toLowerCase()
  if (q) {
    list = list.filter(p =>
      p.firstName.toLowerCase().includes(q) ||
      p.lastName.toLowerCase().includes(q)  ||
      p.ci.toLowerCase().includes(q)        ||
      p.licenseNumber.toLowerCase().includes(q)
    )
  }
  return list
})

const totalActive = computed(() => professionals.value.filter(p => p.isActive).length)

// ── Carga ─────────────────────────────────────────────────────────────────────

async function loadAll() {
  isLoading.value = true
  loadError.value = ''
  try {
    const [profs, specs] = await Promise.all([getProfessionals(), getEspecialidades()])
    professionals.value  = profs
    especialidades.value = specs
  } catch (err: unknown) {
    loadError.value = err instanceof Error ? err.message : 'Error al cargar profesionales.'
  } finally {
    isLoading.value = false
  }
}

onMounted(loadAll)

// ── Helpers ───────────────────────────────────────────────────────────────────

const AVATAR_PALETTE = [
  { bg: 'rgba(0,40,142,0.06)',    color: '#00288E' },
  { bg: 'rgba(0,103,128,0.06)',   color: '#006780' },
  { bg: 'rgba(32,0,177,0.06)',    color: '#2000B1' },
  { bg: 'rgba(117,118,132,0.08)', color: '#757684' },
]

function avatarStyle(p: Professional) {
  return AVATAR_PALETTE[(p.id ?? 0) % AVATAR_PALETTE.length]!
}

function initials(p: Professional) {
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

function inputStyle(hasError: boolean) {
  return hasError
    ? 'border: 1.5px solid #BA1A1A; color: #181C20; background-color: #FFF8F7;'
    : 'border: 1px solid #C4C5D5; color: #181C20; background-color: #F7F9FE;'
}

// ── Validación compartida ─────────────────────────────────────────────────────

const ONLY_LETTERS = /^[a-záéíóúüñA-ZÁÉÍÓÚÜÑ\s]+$/
const EMAIL_RE     = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// ── Modal Crear ───────────────────────────────────────────────────────────────

type CreateErrors = Partial<Record<
  'firstName' | 'lastName' | 'ci' | 'birthDate' | 'email' | 'password' | 'licenseNumber', string
>>

const showCreateModal  = ref(false)
const createErrors     = ref<CreateErrors>({})
const createError      = ref('')
const isSavingCreate   = ref(false)
const createEspecialidadIds = ref<number[]>([])

const createForm = ref<CreateProfessionalRequest>({
  ci: '', firstName: '', lastName: '', birthDate: '',
  phoneNumber: '', email: '', password: '',
  licenseNumber: '', especialidadIds: [],
})

function validateCreate(): boolean {
  const e: CreateErrors = {}
  const f = createForm.value

  if (!f.firstName.trim())
    e.firstName = 'El nombre es obligatorio.'
  else if (!ONLY_LETTERS.test(f.firstName.trim()))
    e.firstName = 'Solo se permiten letras y espacios.'

  if (!f.lastName.trim())
    e.lastName = 'El apellido es obligatorio.'
  else if (!ONLY_LETTERS.test(f.lastName.trim()))
    e.lastName = 'Solo se permiten letras y espacios.'

  if (!f.ci.trim())
    e.ci = 'El nro. de cédula es obligatorio.'

  if (!f.birthDate)
    e.birthDate = 'La fecha de nacimiento es obligatoria.'

  if (!f.email.trim())
    e.email = 'El email es obligatorio.'
  else if (!EMAIL_RE.test(f.email.trim()))
    e.email = 'El formato del email no es válido.'

  if (!f.password.trim())
    e.password = 'La contraseña es obligatoria.'
  else if (f.password.length < 6)
    e.password = 'Mínimo 6 caracteres.'

  if (!f.licenseNumber.trim())
    e.licenseNumber = 'El nro. de matrícula es obligatorio.'

  createErrors.value = e
  return Object.keys(e).length === 0
}

function openCreateModal() {
  createForm.value = {
    ci: '', firstName: '', lastName: '', birthDate: '',
    phoneNumber: '', email: '', password: '',
    licenseNumber: '', especialidadIds: [],
  }
  createEspecialidadIds.value = []
  createErrors.value = {}
  createError.value  = ''
  showCreateModal.value = true
}

function toggleCreateEspecialidad(id: number) {
  const idx = createEspecialidadIds.value.indexOf(id)
  if (idx === -1) createEspecialidadIds.value.push(id)
  else            createEspecialidadIds.value.splice(idx, 1)
}

async function submitCreate() {
  if (isSavingCreate.value) return
  if (!validateCreate()) return
  createError.value    = ''
  isSavingCreate.value = true
  try {
    await createProfessional({
      ...createForm.value,
      phoneNumber:     createForm.value.phoneNumber || undefined,
      especialidadIds: createEspecialidadIds.value,
    })
    showCreateModal.value = false
    await loadAll()
  } catch (err: unknown) {
    createError.value = err instanceof Error ? err.message : 'Error al crear profesional.'
  } finally {
    isSavingCreate.value = false
  }
}

// ── Modal Editar ──────────────────────────────────────────────────────────────

type EditErrors = Partial<Record<'firstName' | 'lastName' | 'licenseNumber', string>>

const showEditModal   = ref(false)
const editingId       = ref<number | null>(null)
const editErrors      = ref<EditErrors>({})
const editError       = ref('')
const isSavingEdit    = ref(false)
const editEspecialidadIds = ref<number[]>([])

const editForm = ref<UpdateProfessionalRequest>({
  firstName: '', lastName: '', phoneNumber: '',
  licenseNumber: '', especialidadIds: [], isActive: true,
})

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

  if (!f.licenseNumber.trim())
    e.licenseNumber = 'El nro. de matrícula es obligatorio.'

  editErrors.value = e
  return Object.keys(e).length === 0
}

function openEditModal(p: Professional) {
  editingId.value = p.id
  editForm.value  = {
    firstName:    p.firstName,
    lastName:     p.lastName,
    phoneNumber:  p.phoneNumber ?? '',
    licenseNumber: p.licenseNumber,
    especialidadIds: p.especialidades.map(e => e.id),
    isActive:     p.isActive,
  }
  editEspecialidadIds.value = p.especialidades.map(e => e.id)
  editErrors.value = {}
  editError.value  = ''
  showEditModal.value = true
}

function toggleEditEspecialidad(id: number) {
  const idx = editEspecialidadIds.value.indexOf(id)
  if (idx === -1) editEspecialidadIds.value.push(id)
  else            editEspecialidadIds.value.splice(idx, 1)
}

async function submitEdit() {
  if (isSavingEdit.value || editingId.value === null) return
  if (!validateEdit()) return
  editError.value  = ''
  isSavingEdit.value = true
  try {
    await updateProfessional(editingId.value, {
      ...editForm.value,
      phoneNumber:     editForm.value.phoneNumber || undefined,
      especialidadIds: editEspecialidadIds.value,
    })
    showEditModal.value = false
    await loadAll()
  } catch (err: unknown) {
    editError.value = err instanceof Error ? err.message : 'Error al actualizar profesional.'
  } finally {
    isSavingEdit.value = false
  }
}

// ── Modal Desactivar ──────────────────────────────────────────────────────────

const showDeleteModal      = ref(false)
const deletingProfessional = ref<Professional | null>(null)
const isDeleting           = ref(false)
const deleteError          = ref('')

function openDeleteModal(p: Professional) {
  deletingProfessional.value = p
  deleteError.value = ''
  showDeleteModal.value = true
}

async function confirmDelete() {
  if (isDeleting.value || !deletingProfessional.value) return
  isDeleting.value  = true
  deleteError.value = ''
  try {
    await deleteProfessional(deletingProfessional.value.id)
    showDeleteModal.value = false
    await loadAll()
  } catch (err: unknown) {
    deleteError.value = err instanceof Error ? err.message : 'Error al desactivar profesional.'
  } finally {
    isDeleting.value = false
  }
}

// ── Modal Horario ─────────────────────────────────────────────────────────────

const DIAS = [
  { value: 1, label: 'Lunes' },
  { value: 2, label: 'Martes' },
  { value: 3, label: 'Miércoles' },
  { value: 4, label: 'Jueves' },
  { value: 5, label: 'Viernes' },
  { value: 6, label: 'Sábado' },
  { value: 0, label: 'Domingo' },
]

interface DiaForm {
  diaSemana: number
  activo: boolean
  horaInicio: string
  horaFin: string
  pausas: { horaInicio: string; horaFin: string; descripcion: string }[]
}

const showHorarioModal     = ref(false)
const horarioProfessional  = ref<Professional | null>(null)
const horarioDias          = ref<DiaForm[]>([])
const isLoadingHorario     = ref(false)
const isSavingHorario      = ref(false)
const horarioError         = ref('')

function initDias(existing: HorarioProfesional[]): DiaForm[] {
  return DIAS.map(d => {
    const found = existing.find(h => h.diaSemana === d.value)
    return {
      diaSemana:  d.value,
      activo:     found?.activo ?? false,
      horaInicio: found ? found.horaInicio.slice(0, 5) : '08:00',
      horaFin:    found ? found.horaFin.slice(0, 5)    : '17:00',
      pausas:     found?.pausas.map(p => ({
        horaInicio:  p.horaInicio.slice(0, 5),
        horaFin:     p.horaFin.slice(0, 5),
        descripcion: p.descripcion ?? '',
      })) ?? [],
    }
  })
}

async function openHorarioModal(p: Professional) {
  horarioProfessional.value = p
  horarioError.value        = ''
  showHorarioModal.value    = true
  isLoadingHorario.value    = true
  try {
    const data = await getHorarios(p.id)
    horarioDias.value = initDias(data)
  } catch (err: unknown) {
    horarioError.value = err instanceof Error ? err.message : 'Error al cargar horario.'
  } finally {
    isLoadingHorario.value = false
  }
}

function addPausa(dia: DiaForm) {
  dia.pausas.push({ horaInicio: '13:00', horaFin: '14:00', descripcion: '' })
}

function removePausa(dia: DiaForm, idx: number) {
  dia.pausas.splice(idx, 1)
}

async function submitHorario() {
  if (isSavingHorario.value || !horarioProfessional.value) return
  isSavingHorario.value = true
  horarioError.value    = ''
  try {
    const request: SetHorariosRequest = {
      horarios: horarioDias.value
        .filter(d => d.activo)
        .map(d => ({
          diaSemana:  d.diaSemana,
          horaInicio: d.horaInicio,
          horaFin:    d.horaFin,
          activo:     true,
          pausas:     d.pausas.map(p => ({
            horaInicio:  p.horaInicio,
            horaFin:     p.horaFin,
            descripcion: p.descripcion || undefined,
          })),
        })),
    }
    await setHorarios(horarioProfessional.value.id, request)
    showHorarioModal.value = false
  } catch (err: unknown) {
    horarioError.value = err instanceof Error ? err.message : 'Error al guardar horario.'
  } finally {
    isSavingHorario.value = false
  }
}
</script>

<template>
  <div class="min-h-screen" style="background-color: #F7F9FE;">
    <AppSidebar />
    <AppHeader />

    <main style="margin-left: 280px; padding-top: 64px;">
      <div class="p-8">

        <!-- Page header -->
        <div class="flex justify-between items-end mb-8">
          <div>
            <h2
              class="text-4xl font-extrabold tracking-tight mb-2"
              style="font-family: 'Plus Jakarta Sans', system-ui, sans-serif; color: #00288E;"
            >Gestión de Profesionales</h2>
            <p class="font-medium" style="color: #444653;">
              Administre el equipo profesional, sus especialidades y disponibilidad horaria.
            </p>
          </div>

          <button
            v-if="auth.hasPermission('crear_profesional')"
            @click="openCreateModal"
            class="flex items-center gap-2 px-8 py-4 rounded-full font-bold transition-all active:scale-95"
            style="background-color: #00288E; color: white; box-shadow: 0 4px 20px rgba(0,40,142,0.2);"
          >
            <span class="material-symbols-outlined" style="width:20px;height:20px;font-size:20px;">person_add</span>
            Añadir Profesional
          </button>
        </div>

        <!-- Filters + Search -->
        <div class="flex items-center justify-between gap-4 mb-8 flex-wrap">
          <!-- Toggle inactivos -->
          <button
            @click="showInactive = !showInactive"
            class="flex items-center gap-2 px-5 py-2 rounded-full text-sm font-semibold transition-all"
            :style="showInactive
              ? 'background-color: #1E40AF; color: #A8B8FF;'
              : 'background-color: #E6E8ED; color: #444653;'"
          >
            <span class="material-symbols-outlined" style="font-size:16px;width:16px;height:16px;">
              {{ showInactive ? 'visibility' : 'visibility_off' }}
            </span>
            Mostrar inactivos
          </button>

          <!-- Search -->
          <div class="relative">
            <span
              class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              style="color: #757684; font-size: 18px; width: 18px; height: 18px;"
            >search</span>
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Nombre, C.I. o matrícula..."
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

        <!-- Error -->
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
                <th class="px-6 py-5 text-xs font-bold uppercase tracking-widest" style="color: #757684;">Profesional</th>
                <th class="px-6 py-5 text-xs font-bold uppercase tracking-widest hidden sm:table-cell" style="color: #757684;">C.I.</th>
                <th class="px-6 py-5 text-xs font-bold uppercase tracking-widest hidden md:table-cell" style="color: #757684;">Matrícula</th>
                <th class="px-6 py-5 text-xs font-bold uppercase tracking-widest hidden lg:table-cell" style="color: #757684;">Especialidades</th>
                <th class="px-6 py-5 text-xs font-bold uppercase tracking-widest" style="color: #757684;">Estado</th>
                <th class="px-6 py-5 text-xs font-bold uppercase tracking-widest text-right" style="color: #757684;">Acciones</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="filtered.length === 0">
                <td colspan="6" class="px-6 py-16 text-center text-sm font-medium" style="color: #757684;">
                  No hay profesionales para mostrar.
                </td>
              </tr>

              <tr
                v-for="p in filtered"
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

                <!-- C.I. -->
                <td class="px-6 py-5 text-sm font-medium tracking-wider hidden sm:table-cell" style="color: #444653;">
                  {{ p.ci }}
                </td>

                <!-- Matrícula -->
                <td class="px-6 py-5 text-sm hidden md:table-cell" style="color: #444653;">
                  {{ p.licenseNumber }}
                </td>

                <!-- Especialidades -->
                <td class="px-6 py-5 hidden lg:table-cell">
                  <div class="flex flex-wrap gap-1">
                    <span
                      v-if="p.especialidades.length === 0"
                      class="text-sm"
                      style="color: #757684;"
                    >—</span>
                    <span
                      v-for="esp in p.especialidades"
                      :key="esp.id"
                      class="inline-block px-2.5 py-1 rounded-full text-xs font-semibold"
                      style="background-color: rgba(0,40,142,0.07); color: #00288E;"
                    >{{ esp.nombre }}</span>
                  </div>
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
                      v-if="auth.hasPermission('ver_profesionales')"
                      @click="openHorarioModal(p)"
                      class="p-2 rounded-full transition-all"
                      style="color: #444653;"
                      onmouseover="this.style.backgroundColor='#DCFCE7'; this.style.color='#166534';"
                      onmouseout="this.style.backgroundColor=''; this.style.color='#444653';"
                      title="Gestionar horario"
                    >
                      <span class="material-symbols-outlined" style="width:20px;height:20px;font-size:20px;">schedule</span>
                    </button>
                    <button
                      v-if="auth.hasPermission('editar_profesional')"
                      @click="openEditModal(p)"
                      class="p-2 rounded-full transition-all"
                      style="color: #444653;"
                      onmouseover="this.style.backgroundColor='#DDE1FF'; this.style.color='#00288E';"
                      onmouseout="this.style.backgroundColor=''; this.style.color='#444653';"
                      title="Editar profesional"
                    >
                      <span class="material-symbols-outlined" style="width:20px;height:20px;font-size:20px;">edit</span>
                    </button>
                    <button
                      v-if="auth.hasPermission('editar_profesional') && p.isActive"
                      @click="openDeleteModal(p)"
                      class="p-2 rounded-full transition-all"
                      style="color: #444653;"
                      onmouseover="this.style.backgroundColor='#FFDAD6'; this.style.color='#BA1A1A';"
                      onmouseout="this.style.backgroundColor=''; this.style.color='#444653';"
                      title="Desactivar profesional"
                    >
                      <span class="material-symbols-outlined" style="width:20px;height:20px;font-size:20px;">person_off</span>
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>

          <!-- Footer -->
          <div
            class="px-6 py-4"
            style="border-top: 1px solid rgba(196,197,213,0.12); background-color: #ffffff;"
          >
            <span class="text-sm" style="color: #444653;">
              Mostrando
              <strong style="color:#181C20;">{{ filtered.length }}</strong>
              de
              <strong style="color:#181C20;">{{ professionals.length }}</strong>
              profesionales
            </span>
          </div>
        </div>

        <!-- Bento insight cards -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mt-10">
          <div
            class="p-8 rounded-2xl flex flex-col justify-between"
            style="background-color: #F1F4F9; height: 192px;"
          >
            <span class="material-symbols-outlined" style="color: #00288E; font-size:32px; width:32px; height:32px;">stethoscope</span>
            <div>
              <div class="text-3xl font-black" style="font-family: 'Plus Jakarta Sans', system-ui, sans-serif; color: #181C20;">
                {{ totalActive }}
              </div>
              <div class="text-xs font-bold uppercase tracking-widest mt-1" style="color: #757684;">Profesionales Activos</div>
            </div>
          </div>

          <div
            class="p-8 rounded-2xl flex flex-col justify-between"
            style="background-color: #F1F4F9; height: 192px;"
          >
            <span class="material-symbols-outlined" style="color: #006780; font-size:32px; width:32px; height:32px;">local_hospital</span>
            <div>
              <div class="text-3xl font-black" style="font-family: 'Plus Jakarta Sans', system-ui, sans-serif; color: #181C20;">
                {{ professionals.length }}
              </div>
              <div class="text-xs font-bold uppercase tracking-widest mt-1" style="color: #757684;">Total Registros</div>
            </div>
          </div>
        </div>

      </div>
    </main>

    <!-- ══════════════════════════════════════════════════
         MODAL: CREAR PROFESIONAL
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
            class="w-full max-w-2xl rounded-3xl overflow-hidden"
            style="background-color: #ffffff; box-shadow: 0 24px 64px rgba(0,40,142,0.18);"
          >
            <div class="flex items-center justify-between px-8 pt-8 pb-6" style="border-bottom: 1px solid rgba(196,197,213,0.2);">
              <h3 class="text-xl font-extrabold" style="font-family: 'Plus Jakarta Sans', system-ui, sans-serif; color: #00288E;">
                Nuevo Profesional
              </h3>
              <button @click="showCreateModal = false" class="p-1 rounded-full transition-colors" style="color: #757684;">
                <span class="material-symbols-outlined" style="font-size:22px;">close</span>
              </button>
            </div>

            <form @submit.prevent="submitCreate" class="px-8 py-6 space-y-5 max-h-[70vh] overflow-y-auto">
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
                  <input v-model="createForm.firstName" type="text" placeholder="Juan"
                    class="px-4 py-3 rounded-xl text-sm outline-none transition-all"
                    :style="inputStyle(!!createErrors.firstName)" />
                  <p v-if="createErrors.firstName" class="text-xs font-medium" style="color: #BA1A1A;">{{ createErrors.firstName }}</p>
                </div>
                <div class="flex flex-col gap-1.5">
                  <label class="text-xs font-bold uppercase tracking-wider" style="color: #757684;">Apellido *</label>
                  <input v-model="createForm.lastName" type="text" placeholder="Pérez"
                    class="px-4 py-3 rounded-xl text-sm outline-none transition-all"
                    :style="inputStyle(!!createErrors.lastName)" />
                  <p v-if="createErrors.lastName" class="text-xs font-medium" style="color: #BA1A1A;">{{ createErrors.lastName }}</p>
                </div>
              </div>

              <div class="grid grid-cols-2 gap-4">
                <div class="flex flex-col gap-1.5">
                  <label class="text-xs font-bold uppercase tracking-wider" style="color: #757684;">Nro. de Cédula *</label>
                  <input v-model="createForm.ci" type="text" placeholder="12345678"
                    class="px-4 py-3 rounded-xl text-sm outline-none transition-all"
                    :style="inputStyle(!!createErrors.ci)" />
                  <p v-if="createErrors.ci" class="text-xs font-medium" style="color: #BA1A1A;">{{ createErrors.ci }}</p>
                </div>
                <div class="flex flex-col gap-1.5">
                  <label class="text-xs font-bold uppercase tracking-wider" style="color: #757684;">Fecha de Nacimiento *</label>
                  <input v-model="createForm.birthDate" type="date"
                    class="px-4 py-3 rounded-xl text-sm outline-none transition-all"
                    :style="inputStyle(!!createErrors.birthDate)" />
                  <p v-if="createErrors.birthDate" class="text-xs font-medium" style="color: #BA1A1A;">{{ createErrors.birthDate }}</p>
                </div>
              </div>

              <div class="grid grid-cols-2 gap-4">
                <div class="flex flex-col gap-1.5">
                  <label class="text-xs font-bold uppercase tracking-wider" style="color: #757684;">Email *</label>
                  <input v-model="createForm.email" type="email" placeholder="prof@clinica.com"
                    class="px-4 py-3 rounded-xl text-sm outline-none transition-all"
                    :style="inputStyle(!!createErrors.email)" />
                  <p v-if="createErrors.email" class="text-xs font-medium" style="color: #BA1A1A;">{{ createErrors.email }}</p>
                </div>
                <div class="flex flex-col gap-1.5">
                  <label class="text-xs font-bold uppercase tracking-wider" style="color: #757684;">Teléfono</label>
                  <input v-model="createForm.phoneNumber" type="tel" placeholder="0972123456"
                    class="px-4 py-3 rounded-xl text-sm outline-none transition-all"
                    :style="inputStyle(false)" />
                </div>
              </div>

              <div class="grid grid-cols-2 gap-4">
                <div class="flex flex-col gap-1.5">
                  <label class="text-xs font-bold uppercase tracking-wider" style="color: #757684;">Contraseña *</label>
                  <input v-model="createForm.password" type="password" placeholder="Mínimo 6 caracteres"
                    class="px-4 py-3 rounded-xl text-sm outline-none transition-all"
                    :style="inputStyle(!!createErrors.password)" />
                  <p v-if="createErrors.password" class="text-xs font-medium" style="color: #BA1A1A;">{{ createErrors.password }}</p>
                </div>
                <div class="flex flex-col gap-1.5">
                  <label class="text-xs font-bold uppercase tracking-wider" style="color: #757684;">Nro. de Matrícula *</label>
                  <input v-model="createForm.licenseNumber" type="text" placeholder="MP-12345"
                    class="px-4 py-3 rounded-xl text-sm outline-none transition-all"
                    :style="inputStyle(!!createErrors.licenseNumber)" />
                  <p v-if="createErrors.licenseNumber" class="text-xs font-medium" style="color: #BA1A1A;">{{ createErrors.licenseNumber }}</p>
                </div>
              </div>

              <!-- Especialidades -->
              <div class="flex flex-col gap-2">
                <label class="text-xs font-bold uppercase tracking-wider" style="color: #757684;">Especialidades</label>
                <div class="flex flex-wrap gap-2">
                  <button
                    v-for="esp in especialidades"
                    :key="esp.id"
                    type="button"
                    @click="toggleCreateEspecialidad(esp.id)"
                    class="px-4 py-2 rounded-full text-sm font-semibold transition-all"
                    :style="createEspecialidadIds.includes(esp.id)
                      ? 'background-color: #00288E; color: white;'
                      : 'background-color: #E6E8ED; color: #444653;'"
                  >{{ esp.nombre }}</button>
                </div>
              </div>
            </form>

            <div class="px-8 py-6 flex justify-end gap-3" style="border-top: 1px solid rgba(196,197,213,0.2);">
              <button type="button" @click="showCreateModal = false"
                class="px-6 py-3 rounded-full text-sm font-bold"
                style="background-color: #E6E8ED; color: #444653;">Cancelar</button>
              <button @click="submitCreate" :disabled="isSavingCreate"
                class="flex items-center gap-2 px-6 py-3 rounded-full text-sm font-bold disabled:opacity-60"
                style="background-color: #00288E; color: white;">
                <svg v-if="isSavingCreate" class="animate-spin w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
                {{ isSavingCreate ? 'Guardando...' : 'Guardar Profesional' }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>


    <!-- ══════════════════════════════════════════════════
         MODAL: EDITAR PROFESIONAL
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
            class="w-full max-w-2xl rounded-3xl overflow-hidden"
            style="background-color: #ffffff; box-shadow: 0 24px 64px rgba(0,40,142,0.18);"
          >
            <div class="flex items-center justify-between px-8 pt-8 pb-6" style="border-bottom: 1px solid rgba(196,197,213,0.2);">
              <h3 class="text-xl font-extrabold" style="font-family: 'Plus Jakarta Sans', system-ui, sans-serif; color: #00288E;">
                Editar Profesional
              </h3>
              <button @click="showEditModal = false" class="p-1 rounded-full transition-colors" style="color: #757684;">
                <span class="material-symbols-outlined" style="font-size:22px;">close</span>
              </button>
            </div>

            <form @submit.prevent="submitEdit" class="px-8 py-6 space-y-5 max-h-[70vh] overflow-y-auto">
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
                  <input v-model="editForm.firstName" type="text"
                    class="px-4 py-3 rounded-xl text-sm outline-none transition-all"
                    :style="inputStyle(!!editErrors.firstName)" />
                  <p v-if="editErrors.firstName" class="text-xs font-medium" style="color: #BA1A1A;">{{ editErrors.firstName }}</p>
                </div>
                <div class="flex flex-col gap-1.5">
                  <label class="text-xs font-bold uppercase tracking-wider" style="color: #757684;">Apellido *</label>
                  <input v-model="editForm.lastName" type="text"
                    class="px-4 py-3 rounded-xl text-sm outline-none transition-all"
                    :style="inputStyle(!!editErrors.lastName)" />
                  <p v-if="editErrors.lastName" class="text-xs font-medium" style="color: #BA1A1A;">{{ editErrors.lastName }}</p>
                </div>
              </div>

              <div class="grid grid-cols-2 gap-4">
                <div class="flex flex-col gap-1.5">
                  <label class="text-xs font-bold uppercase tracking-wider" style="color: #757684;">Teléfono</label>
                  <input v-model="editForm.phoneNumber" type="tel" placeholder="0972123456"
                    class="px-4 py-3 rounded-xl text-sm outline-none transition-all"
                    :style="inputStyle(false)" />
                </div>
                <div class="flex flex-col gap-1.5">
                  <label class="text-xs font-bold uppercase tracking-wider" style="color: #757684;">Nro. de Matrícula *</label>
                  <input v-model="editForm.licenseNumber" type="text"
                    class="px-4 py-3 rounded-xl text-sm outline-none transition-all"
                    :style="inputStyle(!!editErrors.licenseNumber)" />
                  <p v-if="editErrors.licenseNumber" class="text-xs font-medium" style="color: #BA1A1A;">{{ editErrors.licenseNumber }}</p>
                </div>
              </div>

              <!-- Especialidades -->
              <div class="flex flex-col gap-2">
                <label class="text-xs font-bold uppercase tracking-wider" style="color: #757684;">Especialidades</label>
                <div class="flex flex-wrap gap-2">
                  <button
                    v-for="esp in especialidades"
                    :key="esp.id"
                    type="button"
                    @click="toggleEditEspecialidad(esp.id)"
                    class="px-4 py-2 rounded-full text-sm font-semibold transition-all"
                    :style="editEspecialidadIds.includes(esp.id)
                      ? 'background-color: #00288E; color: white;'
                      : 'background-color: #E6E8ED; color: #444653;'"
                  >{{ esp.nombre }}</button>
                </div>
              </div>

              <!-- Toggle activo -->
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
              <button type="button" @click="showEditModal = false"
                class="px-6 py-3 rounded-full text-sm font-bold"
                style="background-color: #E6E8ED; color: #444653;">Cancelar</button>
              <button @click="submitEdit" :disabled="isSavingEdit"
                class="flex items-center gap-2 px-6 py-3 rounded-full text-sm font-bold disabled:opacity-60"
                style="background-color: #00288E; color: white;">
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
         MODAL: HORARIO PROFESIONAL
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
          v-if="showHorarioModal"
          class="fixed inset-0 z-50 flex items-center justify-center p-4"
          style="background-color: rgba(24,28,32,0.5);"
          @click.self="showHorarioModal = false"
        >
          <div
            class="w-full max-w-2xl rounded-3xl overflow-hidden"
            style="background-color: #ffffff; box-shadow: 0 24px 64px rgba(0,40,142,0.18);"
          >
            <!-- Header -->
            <div class="flex items-center justify-between px-8 pt-8 pb-6" style="border-bottom: 1px solid rgba(196,197,213,0.2);">
              <div>
                <h3 class="text-xl font-extrabold" style="font-family: 'Plus Jakarta Sans', system-ui, sans-serif; color: #00288E;">
                  Horario de Trabajo
                </h3>
                <p class="text-xs mt-0.5" style="color: #757684;">
                  {{ horarioProfessional?.firstName }} {{ horarioProfessional?.lastName }}
                </p>
              </div>
              <button @click="showHorarioModal = false" class="p-1 rounded-full transition-colors" style="color: #757684;">
                <span class="material-symbols-outlined" style="font-size:22px;">close</span>
              </button>
            </div>

            <!-- Loading -->
            <div v-if="isLoadingHorario" class="flex justify-center py-16">
              <svg class="animate-spin w-7 h-7" style="color: #00288E;" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
            </div>

            <!-- Body -->
            <div v-else class="px-8 py-6 space-y-3 max-h-[65vh] overflow-y-auto">
              <div
                v-if="horarioError"
                class="flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium"
                style="background-color: #FFDAD6; color: #93000A;"
              >
                <span class="material-symbols-outlined" style="font-size:18px;">error</span>
                {{ horarioError }}
              </div>

              <!-- Fila por día -->
              <div
                v-for="dia in horarioDias"
                :key="dia.diaSemana"
                class="rounded-2xl overflow-hidden transition-all"
                :style="dia.activo ? 'background-color: #F1F4F9;' : 'background-color: #F7F9FE; opacity: 0.6;'"
              >
                <!-- Encabezado del día -->
                <div class="flex items-center justify-between px-5 py-3">
                  <span class="text-sm font-bold w-24 flex-shrink-0" style="color: #181C20;">
                    {{ DIAS.find(d => d.value === dia.diaSemana)?.label }}
                  </span>
                  <div class="flex items-center gap-3 flex-1 justify-end">
                    <template v-if="dia.activo">
                      <input
                        v-model="dia.horaInicio"
                        type="time"
                        class="px-3 py-1.5 rounded-xl text-sm outline-none"
                        style="border: 1px solid #C4C5D5; color: #181C20; background-color: #ffffff;"
                      />
                      <span class="text-xs font-medium" style="color: #757684;">a</span>
                      <input
                        v-model="dia.horaFin"
                        type="time"
                        class="px-3 py-1.5 rounded-xl text-sm outline-none"
                        style="border: 1px solid #C4C5D5; color: #181C20; background-color: #ffffff;"
                      />
                    </template>
                    <button
                      type="button"
                      @click="dia.activo = !dia.activo"
                      class="relative w-11 h-6 rounded-full transition-all flex-shrink-0"
                      :style="dia.activo ? 'background-color: #00288E;' : 'background-color: #C4C5D5;'"
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
                  <div
                    v-for="(pausa, idx) in dia.pausas"
                    :key="idx"
                    class="flex items-center gap-2"
                  >
                    <span class="text-xs font-medium w-12 flex-shrink-0" style="color: #757684;">Pausa</span>
                    <input v-model="pausa.horaInicio" type="time"
                      class="px-3 py-1.5 rounded-xl text-sm outline-none flex-1"
                      style="border: 1px solid #C4C5D5; color: #181C20; background-color: #ffffff;" />
                    <span class="text-xs" style="color: #757684;">a</span>
                    <input v-model="pausa.horaFin" type="time"
                      class="px-3 py-1.5 rounded-xl text-sm outline-none flex-1"
                      style="border: 1px solid #C4C5D5; color: #181C20; background-color: #ffffff;" />
                    <input v-model="pausa.descripcion" type="text" placeholder="Ej: Almuerzo"
                      class="px-3 py-1.5 rounded-xl text-sm outline-none flex-1"
                      style="border: 1px solid #C4C5D5; color: #181C20; background-color: #ffffff;" />
                    <button type="button" @click="removePausa(dia, idx)"
                      class="p-1.5 rounded-full flex-shrink-0 transition-all"
                      style="color: #757684;"
                      onmouseover="this.style.backgroundColor='#FFDAD6'; this.style.color='#BA1A1A';"
                      onmouseout="this.style.backgroundColor=''; this.style.color='#757684';">
                      <span class="material-symbols-outlined" style="font-size:16px;width:16px;height:16px;">close</span>
                    </button>
                  </div>

                  <button type="button" @click="addPausa(dia)"
                    class="flex items-center gap-1.5 text-xs font-semibold mt-1 transition-all"
                    style="color: #006780;">
                    <span class="material-symbols-outlined" style="font-size:15px;width:15px;height:15px;">add</span>
                    Agregar pausa
                  </button>
                </div>
              </div>
            </div>

            <!-- Footer -->
            <div v-if="!isLoadingHorario" class="px-8 py-6 flex justify-end gap-3" style="border-top: 1px solid rgba(196,197,213,0.2);">
              <button type="button" @click="showHorarioModal = false"
                class="px-6 py-3 rounded-full text-sm font-bold"
                style="background-color: #E6E8ED; color: #444653;">Cancelar</button>
              <button
                v-if="auth.hasPermission('editar_profesional')"
                @click="submitHorario" :disabled="isSavingHorario"
                class="flex items-center gap-2 px-6 py-3 rounded-full text-sm font-bold disabled:opacity-60"
                style="background-color: #00288E; color: white;">
                <svg v-if="isSavingHorario" class="animate-spin w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
                {{ isSavingHorario ? 'Guardando...' : 'Guardar Horario' }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>


    <!-- ══════════════════════════════════════════════════
         MODAL: CONFIRMAR DESACTIVAR
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
                Desactivar Profesional
              </h3>
              <p class="text-sm" style="color: #444653;">
                ¿Desactivar a
                <strong style="color:#181C20;">{{ deletingProfessional?.firstName }} {{ deletingProfessional?.lastName }}</strong>?
                No podrá iniciar sesión pero sus datos se conservarán.
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
              <button type="button" @click="showDeleteModal = false"
                class="flex-1 py-3 rounded-full text-sm font-bold"
                style="background-color: #E6E8ED; color: #444653;">Cancelar</button>
              <button @click="confirmDelete" :disabled="isDeleting"
                class="flex-1 flex items-center justify-center gap-2 py-3 rounded-full text-sm font-bold disabled:opacity-60"
                style="background-color: #BA1A1A; color: white;">
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
