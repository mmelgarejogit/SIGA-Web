<script setup lang="ts">
import { ref, computed, onMounted, defineComponent, h } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppSidebar from '@/components/AppSidebar.vue'
import AppHeader from '@/components/AppHeader.vue'

import {
  type Patient,
  type UpdatePatientRequest,
  getPatientById,
  updatePatient,
  deletePatient,
} from '@/services/patientService'

const TabPending = defineComponent({
  props: {
    icon:        { type: String, required: true },
    title:       { type: String, required: true },
    description: { type: String, required: true },
    accent:      { type: String, default: '#757684' },
    accentBg:    { type: String, default: 'rgba(117,118,132,0.06)' },
  },
  setup(props) {
    return () => h('div', {
      style: 'display:flex; flex-direction:column; align-items:center; justify-content:center; min-height:320px; text-align:center; padding:3rem;',
    }, [
      h('div', {
        style: `width:80px; height:80px; border-radius:9999px; background-color:${props.accentBg}; display:flex; align-items:center; justify-content:center; margin-bottom:1.5rem;`,
      }, [
        h('span', { class: 'material-symbols-outlined', style: `color:${props.accent}; font-size:36px;` }, props.icon),
      ]),
      h('div', {
        style: 'display:inline-flex; align-items:center; gap:6px; background-color:#F1F4F9; border-radius:9999px; padding:4px 12px; margin-bottom:1rem;',
      }, [
        h('span', { class: 'material-symbols-outlined', style: 'font-size:12px; color:#757684;' }, 'construction'),
        h('span', { style: 'font-size:11px; font-weight:700; color:#757684; text-transform:uppercase; letter-spacing:0.06em;' }, 'En desarrollo'),
      ]),
      h('h3', {
        style: "font-family:'Plus Jakarta Sans',system-ui,sans-serif; font-size:1.125rem; font-weight:800; color:#181C20; margin-bottom:0.5rem;",
      }, props.title),
      h('p', { style: 'font-size:0.875rem; color:#757684; max-width:400px; line-height:1.6;' }, props.description),
    ])
  },
})

const route  = useRoute()
const router = useRouter()

const patientId = computed(() => Number(route.params.id))

// ── Tabs ──────────────────────────────────────────────────────────────────────

type TabId = 'info' | 'citas' | 'clinico' | 'ventas'

const tabs: { id: TabId; label: string; icon: string; available: boolean }[] = [
  { id: 'info',    label: 'Información',      icon: 'badge',              available: true  },
  { id: 'citas',   label: 'Citas y Turnos',   icon: 'calendar_month',     available: false },
  { id: 'clinico', label: 'Historial Clínico', icon: 'medical_information', available: false },
  { id: 'ventas',  label: 'Ventas',            icon: 'receipt_long',       available: false },
]

const activeTab = ref<TabId>('info')

// ── Estado ────────────────────────────────────────────────────────────────────

const patient   = ref<Patient | null>(null)
const isLoading = ref(false)
const loadError = ref('')

async function loadPatient() {
  isLoading.value = true
  loadError.value = ''
  try {
    patient.value = await getPatientById(patientId.value)
  } catch (err: unknown) {
    loadError.value = err instanceof Error ? err.message : 'Error al cargar el paciente.'
  } finally {
    isLoading.value = false
  }
}

onMounted(loadPatient)

// ── Helpers ───────────────────────────────────────────────────────────────────

const AVATAR_PALETTE = [
  { bg: 'rgba(0,40,142,0.08)', color: '#00288E' },
  { bg: 'rgba(0,103,128,0.08)', color: '#006780' },
  { bg: 'rgba(32,0,177,0.08)', color: '#2000B1' },
  { bg: 'rgba(117,118,132,0.10)', color: '#757684' },
]

function avatarStyle(p: Patient) {
  return AVATAR_PALETTE[(p.id ?? 0) % AVATAR_PALETTE.length]
}

function initials(p: Patient) {
  return `${p.firstName[0] ?? ''}${p.lastName[0] ?? ''}`.toUpperCase()
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' })
}

function calcAge(birthDateIso: string): number {
  const birth = new Date(birthDateIso)
  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  const m = today.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--
  return age
}

// ── Modal Editar ──────────────────────────────────────────────────────────────

const showEditModal  = ref(false)
const editForm       = ref<UpdatePatientRequest>({ firstName: '', lastName: '', dni: '', birthDate: '', phoneNumber: '', email: '', isActive: true })
const editError      = ref('')
const isSavingEdit   = ref(false)

type EditErrors = { firstName?: string; lastName?: string; dni?: string; birthDate?: string; email?: string }
const editErrors = ref<EditErrors>({})

const ONLY_LETTERS = /^[a-záéíóúüñA-ZÁÉÍÓÚÜÑ\s]+$/
const EMAIL_RE     = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function validateEdit(): boolean {
  const e: EditErrors = {}
  const f = editForm.value
  if (!f.firstName.trim())                         e.firstName = 'El nombre es obligatorio.'
  else if (!ONLY_LETTERS.test(f.firstName.trim())) e.firstName = 'Solo letras y espacios.'
  if (!f.lastName.trim())                          e.lastName  = 'El apellido es obligatorio.'
  else if (!ONLY_LETTERS.test(f.lastName.trim()))  e.lastName  = 'Solo letras y espacios.'
  if (!f.dni.trim())                               e.dni       = 'El nro. de cédula es obligatorio.'
  else if (f.dni.trim().length > 30)               e.dni       = 'Máximo 30 caracteres.'
  if (!f.birthDate)                                e.birthDate = 'La fecha de nacimiento es obligatoria.'
  if (f.email?.trim() && !EMAIL_RE.test(f.email.trim())) e.email = 'El formato del email no es válido.'
  editErrors.value = e
  return Object.keys(e).length === 0
}

function openEditModal() {
  if (!patient.value) return
  editForm.value = {
    firstName:   patient.value.firstName,
    lastName:    patient.value.lastName,
    dni:         patient.value.dni,
    birthDate:   patient.value.birthDate,
    phoneNumber: patient.value.phoneNumber ?? '',
    email:       patient.value.email ?? '',
    isActive:    patient.value.isActive,
  }
  editErrors.value = {}
  editError.value  = ''
  showEditModal.value = true
}

async function submitEdit() {
  if (isSavingEdit.value) return
  if (!validateEdit()) return
  editError.value  = ''
  isSavingEdit.value = true
  try {
    const updated = await updatePatient(patientId.value, {
      ...editForm.value,
      phoneNumber: editForm.value.phoneNumber || undefined,
      email:       editForm.value.email       || undefined,
    })
    patient.value = updated
    showEditModal.value = false
  } catch (err: unknown) {
    editError.value = err instanceof Error ? err.message : 'Error al actualizar paciente.'
  } finally {
    isSavingEdit.value = false
  }
}

function inputStyle(hasError: boolean) {
  return hasError
    ? 'border: 1.5px solid #BA1A1A; color: #181C20; background-color: #FFF8F7;'
    : 'border: 1px solid #C4C5D5; color: #181C20; background-color: #F7F9FE;'
}

// ── Modal Desactivar ──────────────────────────────────────────────────────────

const showDeleteModal = ref(false)
const isDeleting      = ref(false)
const deleteError     = ref('')

async function confirmDelete() {
  if (isDeleting.value || !patient.value) return
  isDeleting.value = true
  deleteError.value = ''
  try {
    await deletePatient(patient.value.id)
    showDeleteModal.value = false
    router.push('/pacientes')
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
      <div class="px-8 pt-10 pb-16 max-w-7xl mx-auto">

        <!-- Breadcrumb / Back -->
        <button
          @click="router.push('/pacientes')"
          class="flex items-center gap-1.5 mb-8 text-sm font-semibold transition-colors"
          style="color: #757684;"
          onmouseover="this.style.color='#00288E'"
          onmouseout="this.style.color='#757684'"
        >
          <span class="material-symbols-outlined" style="font-size:18px;">arrow_back</span>
          Gestión de Pacientes
        </button>

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

        <template v-else-if="patient">

          <!-- ── Hero Card ──────────────────────────────────────────────────── -->
          <div
            class="rounded-3xl p-8 mb-6 flex items-center justify-between gap-6 flex-wrap"
            style="background-color: #ffffff; box-shadow: 0 1px 3px rgba(196,197,213,0.25); outline: 1px solid rgba(196,197,213,0.15);"
          >
            <div class="flex items-center gap-6">
              <div
                class="w-20 h-20 rounded-full flex items-center justify-center text-2xl font-black flex-shrink-0"
                :style="`background-color: ${avatarStyle(patient).bg}; color: ${avatarStyle(patient).color};`"
              >{{ initials(patient) }}</div>

              <div>
                <div class="flex items-center gap-3 flex-wrap mb-1">
                  <h1
                    class="text-3xl font-extrabold"
                    style="font-family: 'Plus Jakarta Sans', system-ui, sans-serif; color: #181C20;"
                  >{{ patient.firstName }} {{ patient.lastName }}</h1>
                  <span
                    class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider"
                    :style="patient.isActive
                      ? 'background-color: #dcfce7; color: #166534;'
                      : 'background-color: #E0E2E7; color: #444653;'"
                  >
                    <span
                      class="w-1.5 h-1.5 rounded-full"
                      :style="patient.isActive ? 'background-color: #16a34a;' : 'background-color: #757684;'"
                    ></span>
                    {{ patient.isActive ? 'Activo' : 'Inactivo' }}
                  </span>
                </div>
                <p class="text-sm font-medium" style="color: #757684;">
                  Nro. de Cédula {{ patient.dni }}
                  <span class="mx-2" style="color: #C4C5D5;">·</span>
                  {{ calcAge(patient.birthDate) }} años
                  <span class="mx-2" style="color: #C4C5D5;">·</span>
                  Paciente #{{ patient.id }}
                </p>
              </div>
            </div>

            <!-- Acciones -->
            <div class="flex items-center gap-3">
              <button
                @click="openEditModal"
                class="flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold transition-all active:scale-95"
                style="background-color: #E6E8ED; color: #444653;"
                onmouseover="this.style.backgroundColor='#DDE1FF'; this.style.color='#00288E';"
                onmouseout="this.style.backgroundColor='#E6E8ED'; this.style.color='#444653';"
              >
                <span class="material-symbols-outlined" style="font-size:18px;">edit</span>
                Editar
              </button>
              <button
                v-if="patient.isActive"
                @click="showDeleteModal = true"
                class="flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold transition-all active:scale-95"
                style="background-color: #FFDAD6; color: #BA1A1A;"
                onmouseover="this.style.backgroundColor='#BA1A1A'; this.style.color='white';"
                onmouseout="this.style.backgroundColor='#FFDAD6'; this.style.color='#BA1A1A';"
              >
                <span class="material-symbols-outlined" style="font-size:18px;">person_off</span>
                Desactivar
              </button>
            </div>
          </div>

          <!-- ── Tab bar ────────────────────────────────────────────────────── -->
          <div
            class="flex items-center gap-1 mb-6 p-1 rounded-2xl w-fit"
            style="background-color: #E6E8ED;"
          >
            <button
              v-for="tab in tabs"
              :key="tab.id"
              @click="activeTab = tab.id"
              class="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all"
              :style="activeTab === tab.id
                ? 'background-color: #ffffff; color: #00288E; box-shadow: 0 1px 4px rgba(0,40,142,0.1);'
                : 'background-color: transparent; color: #757684;'"
            >
              <span class="material-symbols-outlined" style="font-size:16px; width:16px; height:16px;">{{ tab.icon }}</span>
              {{ tab.label }}
              <span
                v-if="!tab.available"
                class="text-xs font-bold px-1.5 py-0.5 rounded-full"
                style="background-color: rgba(117,118,132,0.12); color: #757684; font-size: 10px; letter-spacing: 0.04em;"
              >Pronto</span>
            </button>
          </div>

          <!-- ── Tab: Información ───────────────────────────────────────────── -->
          <div v-if="activeTab === 'info'" class="grid grid-cols-1 md:grid-cols-3 gap-6">

            <!-- Datos Personales -->
            <div
              class="rounded-2xl p-6"
              style="background-color: #ffffff; box-shadow: 0 1px 3px rgba(196,197,213,0.25); outline: 1px solid rgba(196,197,213,0.15);"
            >
              <div class="flex items-center gap-2 mb-5">
                <span class="material-symbols-outlined" style="color: #00288E; font-size:20px;">badge</span>
                <h2 class="text-xs font-bold uppercase tracking-widest" style="color: #757684;">Datos Personales</h2>
              </div>
              <dl class="space-y-4">
                <div>
                  <dt class="text-xs font-semibold uppercase tracking-wider mb-0.5" style="color: #757684;">Nombre completo</dt>
                  <dd class="text-sm font-bold" style="color: #181C20;">{{ patient.firstName }} {{ patient.lastName }}</dd>
                </div>
                <div>
                  <dt class="text-xs font-semibold uppercase tracking-wider mb-0.5" style="color: #757684;">Nro. de Cédula</dt>
                  <dd class="text-sm font-bold tracking-wider" style="color: #181C20;">{{ patient.dni }}</dd>
                </div>
                <div>
                  <dt class="text-xs font-semibold uppercase tracking-wider mb-0.5" style="color: #757684;">Fecha de Nacimiento</dt>
                  <dd class="text-sm font-bold" style="color: #181C20;">{{ formatDate(patient.birthDate) }}</dd>
                </div>
                <div>
                  <dt class="text-xs font-semibold uppercase tracking-wider mb-0.5" style="color: #757684;">Edad</dt>
                  <dd class="text-sm font-bold" style="color: #181C20;">{{ calcAge(patient.birthDate) }} años</dd>
                </div>
              </dl>
            </div>

            <!-- Contacto -->
            <div
              class="rounded-2xl p-6"
              style="background-color: #ffffff; box-shadow: 0 1px 3px rgba(196,197,213,0.25); outline: 1px solid rgba(196,197,213,0.15);"
            >
              <div class="flex items-center gap-2 mb-5">
                <span class="material-symbols-outlined" style="color: #006780; font-size:20px;">contact_phone</span>
                <h2 class="text-xs font-bold uppercase tracking-widest" style="color: #757684;">Contacto</h2>
              </div>
              <dl class="space-y-4">
                <div>
                  <dt class="text-xs font-semibold uppercase tracking-wider mb-0.5" style="color: #757684;">Teléfono</dt>
                  <dd class="text-sm font-bold" style="color: #181C20;">
                    <span v-if="patient.phoneNumber">{{ patient.phoneNumber }}</span>
                    <span v-else style="color: #C4C5D5;">No registrado</span>
                  </dd>
                </div>
                <div>
                  <dt class="text-xs font-semibold uppercase tracking-wider mb-0.5" style="color: #757684;">Email</dt>
                  <dd class="text-sm font-bold" style="color: #181C20;">
                    <span v-if="patient.email">{{ patient.email }}</span>
                    <span v-else style="color: #C4C5D5;">No registrado</span>
                  </dd>
                </div>
              </dl>
            </div>

            <!-- Registro -->
            <div
              class="rounded-2xl p-6"
              style="background-color: #ffffff; box-shadow: 0 1px 3px rgba(196,197,213,0.25); outline: 1px solid rgba(196,197,213,0.15);"
            >
              <div class="flex items-center gap-2 mb-5">
                <span class="material-symbols-outlined" style="color: #757684; font-size:20px;">schedule</span>
                <h2 class="text-xs font-bold uppercase tracking-widest" style="color: #757684;">Registro</h2>
              </div>
              <dl class="space-y-4">
                <div>
                  <dt class="text-xs font-semibold uppercase tracking-wider mb-0.5" style="color: #757684;">Fecha de Alta</dt>
                  <dd class="text-sm font-bold" style="color: #181C20;">{{ formatDate(patient.createdAt) }}</dd>
                </div>
                <div>
                  <dt class="text-xs font-semibold uppercase tracking-wider mb-0.5" style="color: #757684;">Última Actualización</dt>
                  <dd class="text-sm font-bold" style="color: #181C20;">{{ formatDate(patient.updatedAt) }}</dd>
                </div>
                <div>
                  <dt class="text-xs font-semibold uppercase tracking-wider mb-0.5" style="color: #757684;">Estado</dt>
                  <dd>
                    <span
                      class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider"
                      :style="patient.isActive
                        ? 'background-color: #dcfce7; color: #166534;'
                        : 'background-color: #E0E2E7; color: #444653;'"
                    >
                      <span
                        class="w-1.5 h-1.5 rounded-full"
                        :style="patient.isActive ? 'background-color: #16a34a;' : 'background-color: #757684;'"
                      ></span>
                      {{ patient.isActive ? 'Activo' : 'Inactivo' }}
                    </span>
                  </dd>
                </div>
              </dl>
            </div>
          </div>

          <!-- ── Tab: Citas y Turnos ─────────────────────────────────────────── -->
          <div v-else-if="activeTab === 'citas'">
            <TabPending
              icon="calendar_month"
              title="Citas y Turnos"
              description="El historial de citas y turnos del paciente estará disponible cuando se implemente el módulo de Agendamiento."
              accent="#006780"
              accent-bg="rgba(0,103,128,0.06)"
            />
          </div>

          <!-- ── Tab: Historial Clínico ─────────────────────────────────────── -->
          <div v-else-if="activeTab === 'clinico'">
            <TabPending
              icon="medical_information"
              title="Historial Clínico"
              description="Las consultas clínicas, diagnósticos y recetas del paciente estarán disponibles cuando se implemente el módulo Clínico."
              accent="#2000B1"
              accent-bg="rgba(32,0,177,0.06)"
            />
          </div>

          <!-- ── Tab: Ventas ────────────────────────────────────────────────── -->
          <div v-else-if="activeTab === 'ventas'">
            <TabPending
              icon="receipt_long"
              title="Ventas"
              description="El historial de compras y ventas asociadas al paciente estará disponible cuando se implemente el módulo de Ventas."
              accent="#00288E"
              accent-bg="rgba(0,40,142,0.06)"
            />
          </div>

        </template>
      </div>
    </main>


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
              <button @click="showEditModal = false" class="p-1 rounded-full" style="color: #757684;">
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
                  <input
                    v-model="editForm.firstName"
                    type="text"
                    class="px-4 py-3 rounded-xl text-sm outline-none transition-all"
                    :style="inputStyle(!!editErrors.firstName)"
                  />
                  <p v-if="editErrors.firstName" class="text-xs font-medium" style="color: #BA1A1A;">{{ editErrors.firstName }}</p>
                </div>
                <div class="flex flex-col gap-1.5">
                  <label class="text-xs font-bold uppercase tracking-wider" style="color: #757684;">Apellido *</label>
                  <input
                    v-model="editForm.lastName"
                    type="text"
                    class="px-4 py-3 rounded-xl text-sm outline-none transition-all"
                    :style="inputStyle(!!editErrors.lastName)"
                  />
                  <p v-if="editErrors.lastName" class="text-xs font-medium" style="color: #BA1A1A;">{{ editErrors.lastName }}</p>
                </div>
              </div>

              <div class="flex flex-col gap-1.5">
                <label class="text-xs font-bold uppercase tracking-wider" style="color: #757684;">Nro. de Cédula *</label>
                <input
                  v-model="editForm.dni"
                  type="text"
                  class="px-4 py-3 rounded-xl text-sm outline-none transition-all"
                  :style="inputStyle(!!editErrors.dni)"
                />
                <p v-if="editErrors.dni" class="text-xs font-medium" style="color: #BA1A1A;">{{ editErrors.dni }}</p>
              </div>

              <div class="flex flex-col gap-1.5">
                <label class="text-xs font-bold uppercase tracking-wider" style="color: #757684;">Fecha de Nacimiento *</label>
                <input
                  v-model="editForm.birthDate"
                  type="date"
                  class="px-4 py-3 rounded-xl text-sm outline-none transition-all"
                  :style="inputStyle(!!editErrors.birthDate)"
                />
                <p v-if="editErrors.birthDate" class="text-xs font-medium" style="color: #BA1A1A;">{{ editErrors.birthDate }}</p>
              </div>

              <div class="flex flex-col gap-1.5">
                <label class="text-xs font-bold uppercase tracking-wider" style="color: #757684;">Teléfono</label>
                <input
                  v-model="editForm.phoneNumber"
                  type="tel"
                  placeholder="0972123456"
                  class="px-4 py-3 rounded-xl text-sm outline-none transition-all"
                  :style="inputStyle(false)"
                />
              </div>

              <div class="flex flex-col gap-1.5">
                <label class="text-xs font-bold uppercase tracking-wider" style="color: #757684;">Email</label>
                <input
                  v-model="editForm.email"
                  type="email"
                  placeholder="paciente@email.com"
                  class="px-4 py-3 rounded-xl text-sm outline-none transition-all"
                  :style="inputStyle(!!editErrors.email)"
                />
                <p v-if="editErrors.email" class="text-xs font-medium" style="color: #BA1A1A;">{{ editErrors.email }}</p>
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
         MODAL: CONFIRMAR DESACTIVACIÓN
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
                <strong style="color:#181C20;">{{ patient?.firstName }} {{ patient?.lastName }}</strong>?
                Sus datos se conservarán pero el paciente quedará inactivo.
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
