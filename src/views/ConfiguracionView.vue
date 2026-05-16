<script setup lang="ts">
import { ref, reactive, computed, onMounted } from "vue"
import AppSidebar from "@/components/AppSidebar.vue"
import AppHeader from "@/components/AppHeader.vue"
import BaseModal from "@/components/BaseModal.vue"
import { useAuthStore } from "@/stores/auth"
import {
  type ConfiguracionNegocio,
  getConfiguracion,
  updateConfiguracion,
} from "@/services/configService"
import {
  type Especialidad,
  getEspecialidades,
  createEspecialidad,
  updateEspecialidad,
  deleteEspecialidad,
} from "@/services/especialidadService"
import {
  type EstadoConfig,
  getEstadosByEntidad,
  createEstado,
  updateEstado,
  deleteEstado,
} from "@/services/estadoConfigService"

const auth = useAuthStore()
const canEdit = auth.hasPermission("gestionar_configuracion")
const canEditEsp = auth.hasPermission("gestionar_especialidades")

// ── Tabs ──────────────────────────────────────────────────────────────────────

const activeTab = ref<"negocio" | "especialidades" | "estados">("negocio")

// ── Tab Negocio ───────────────────────────────────────────────────────────────

const isLoadingNegocio = ref(false)
const isSavingNegocio = ref(false)
const negocioError = ref("")
const negocioSuccess = ref(false)

const negocioForm = reactive({
  nombreFantasia: "",
  razonSocial: "",
  cuit: "",
  direccion: "",
  telefono: "",
  email: "",
  sitioWeb: "",
})

function fillNegocioForm(data: ConfiguracionNegocio) {
  negocioForm.nombreFantasia = data.nombreFantasia ?? ""
  negocioForm.razonSocial    = data.razonSocial ?? ""
  negocioForm.cuit           = data.cuit ?? ""
  negocioForm.direccion      = data.direccion ?? ""
  negocioForm.telefono       = data.telefono ?? ""
  negocioForm.email          = data.email ?? ""
  negocioForm.sitioWeb       = data.sitioWeb ?? ""
}

async function loadNegocio() {
  isLoadingNegocio.value = true
  try {
    const data = await getConfiguracion()
    fillNegocioForm(data)
  } catch {
    /* silencioso */
  } finally {
    isLoadingNegocio.value = false
  }
}

async function saveNegocio() {
  if (isSavingNegocio.value) return
  isSavingNegocio.value = true
  negocioError.value = ""
  negocioSuccess.value = false
  try {
    await updateConfiguracion({
      nombreFantasia: negocioForm.nombreFantasia.trim(),
      razonSocial:    negocioForm.razonSocial.trim() || undefined,
      cuit:           negocioForm.cuit.trim() || undefined,
      direccion:      negocioForm.direccion.trim() || undefined,
      telefono:       negocioForm.telefono.trim() || undefined,
      email:          negocioForm.email.trim() || undefined,
      sitioWeb:       negocioForm.sitioWeb.trim() || undefined,
    })
    negocioSuccess.value = true
    setTimeout(() => { negocioSuccess.value = false }, 3000)
  } catch (err: unknown) {
    negocioError.value = err instanceof Error ? err.message : "Error al guardar."
  } finally {
    isSavingNegocio.value = false
  }
}

// ── Tab Especialidades ────────────────────────────────────────────────────────

const especialidades = ref<Especialidad[]>([])
const isLoadingEsp = ref(false)

async function loadEspecialidades() {
  isLoadingEsp.value = true
  try {
    especialidades.value = await getEspecialidades()
  } catch {
    /* silencioso */
  } finally {
    isLoadingEsp.value = false
  }
}

const showCreateEspModal = ref(false)
const isCreatingEsp = ref(false)
const createEspError = ref("")
const createEspForm = reactive({ nombre: "", descripcion: "" })

function openCreateEspModal() {
  createEspForm.nombre = ""
  createEspForm.descripcion = ""
  createEspError.value = ""
  showCreateEspModal.value = true
}

async function submitCreateEsp() {
  if (isCreatingEsp.value || !createEspForm.nombre.trim()) return
  isCreatingEsp.value = true
  createEspError.value = ""
  try {
    await createEspecialidad({
      nombre:      createEspForm.nombre.trim(),
      descripcion: createEspForm.descripcion.trim() || undefined,
    })
    showCreateEspModal.value = false
    loadEspecialidades()
  } catch (err: unknown) {
    createEspError.value = err instanceof Error ? err.message : "Error al crear."
  } finally {
    isCreatingEsp.value = false
  }
}

const showEditEspModal = ref(false)
const isEditingEsp = ref(false)
const editEspError = ref("")
const editingEspId = ref(0)
const editEspForm = reactive({ nombre: "", descripcion: "" })

function openEditEspModal(esp: Especialidad) {
  editingEspId.value = esp.id
  editEspForm.nombre = esp.nombre
  editEspForm.descripcion = esp.descripcion ?? ""
  editEspError.value = ""
  showEditEspModal.value = true
}

async function submitEditEsp() {
  if (isEditingEsp.value || !editEspForm.nombre.trim()) return
  isEditingEsp.value = true
  editEspError.value = ""
  try {
    await updateEspecialidad(editingEspId.value, {
      nombre:      editEspForm.nombre.trim(),
      descripcion: editEspForm.descripcion.trim() || undefined,
    })
    showEditEspModal.value = false
    loadEspecialidades()
  } catch (err: unknown) {
    editEspError.value = err instanceof Error ? err.message : "Error al editar."
  } finally {
    isEditingEsp.value = false
  }
}

const showDeleteEspModal = ref(false)
const isDeletingEsp = ref(false)
const deleteEspError = ref("")
const especialidadToDelete = ref<Especialidad | null>(null)

function openDeleteEspModal(esp: Especialidad) {
  especialidadToDelete.value = esp
  deleteEspError.value = ""
  showDeleteEspModal.value = true
}

async function confirmDeleteEsp() {
  if (isDeletingEsp.value || !especialidadToDelete.value) return
  isDeletingEsp.value = true
  deleteEspError.value = ""
  try {
    await deleteEspecialidad(especialidadToDelete.value.id)
    showDeleteEspModal.value = false
    loadEspecialidades()
  } catch (err: unknown) {
    deleteEspError.value = err instanceof Error ? err.message : "Error al eliminar."
  } finally {
    isDeletingEsp.value = false
  }
}

// ── Tab Estados ───────────────────────────────────────────────────────────────

const activeEntidad = ref<"Turno" | "Pedido" | "Consulta">("Turno")
const allEstados = ref<EstadoConfig[]>([])
const isLoadingEstados = ref(false)

const estadosFiltrados = computed(() =>
  allEstados.value.filter(e => e.entidad === activeEntidad.value)
)

async function loadEstados() {
  isLoadingEstados.value = true
  try {
    allEstados.value = await getEstadosByEntidad()
  } catch {
    /* silencioso */
  } finally {
    isLoadingEstados.value = false
  }
}

// Modal crear estado
const showCreateEstadoModal = ref(false)
const isCreatingEstado = ref(false)
const createEstadoError = ref("")
const createEstadoForm = reactive({ nombre: "", color: "#3B82F6", orden: 10 })

function openCreateEstadoModal() {
  createEstadoForm.nombre = ""
  createEstadoForm.color = "#3B82F6"
  createEstadoForm.orden = (estadosFiltrados.value.length + 1) * 10
  createEstadoError.value = ""
  showCreateEstadoModal.value = true
}

async function submitCreateEstado() {
  if (isCreatingEstado.value || !createEstadoForm.nombre.trim()) return
  isCreatingEstado.value = true
  createEstadoError.value = ""
  try {
    await createEstado({
      entidad: activeEntidad.value,
      nombre:  createEstadoForm.nombre.trim(),
      color:   createEstadoForm.color,
      orden:   createEstadoForm.orden,
    })
    showCreateEstadoModal.value = false
    loadEstados()
  } catch (err: unknown) {
    createEstadoError.value = err instanceof Error ? err.message : "Error al crear."
  } finally {
    isCreatingEstado.value = false
  }
}

// Modal editar estado
const showEditEstadoModal = ref(false)
const isEditingEstado = ref(false)
const editEstadoError = ref("")
const editingEstado = ref<EstadoConfig | null>(null)
const editEstadoForm = reactive({ nombre: "", color: "#3B82F6", orden: 1 })

function openEditEstadoModal(estado: EstadoConfig) {
  editingEstado.value = estado
  editEstadoForm.nombre = estado.nombre
  editEstadoForm.color  = estado.color
  editEstadoForm.orden  = estado.orden
  editEstadoError.value = ""
  showEditEstadoModal.value = true
}

async function submitEditEstado() {
  if (isEditingEstado.value || !editingEstado.value || !editEstadoForm.nombre.trim()) return
  isEditingEstado.value = true
  editEstadoError.value = ""
  try {
    await updateEstado(editingEstado.value.id, {
      nombre: editEstadoForm.nombre.trim(),
      color:  editEstadoForm.color,
      orden:  editEstadoForm.orden,
    })
    showEditEstadoModal.value = false
    loadEstados()
  } catch (err: unknown) {
    editEstadoError.value = err instanceof Error ? err.message : "Error al editar."
  } finally {
    isEditingEstado.value = false
  }
}

// Modal eliminar estado
const showDeleteEstadoModal = ref(false)
const isDeletingEstado = ref(false)
const deleteEstadoError = ref("")
const estadoToDelete = ref<EstadoConfig | null>(null)

function openDeleteEstadoModal(estado: EstadoConfig) {
  estadoToDelete.value = estado
  deleteEstadoError.value = ""
  showDeleteEstadoModal.value = true
}

async function confirmDeleteEstado() {
  if (isDeletingEstado.value || !estadoToDelete.value) return
  isDeletingEstado.value = true
  deleteEstadoError.value = ""
  try {
    await deleteEstado(estadoToDelete.value.id)
    showDeleteEstadoModal.value = false
    loadEstados()
  } catch (err: unknown) {
    deleteEstadoError.value = err instanceof Error ? err.message : "Error al eliminar."
  } finally {
    isDeletingEstado.value = false
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function inputStyle(hasError = false) {
  return hasError
    ? "border: 1.5px solid var(--color-error); color: var(--color-on-surface); background-color: #FFF8F7;"
    : "border: 1px solid var(--color-outline-variant); color: var(--color-on-surface); background-color: var(--color-surface-container-low);"
}

const entidadLabel: Record<string, string> = {
  Turno: "Turnos",
  Pedido: "Pedidos",
  Consulta: "Consultas",
}

// ── Init ──────────────────────────────────────────────────────────────────────

onMounted(() => {
  loadNegocio()
  loadEspecialidades()
  loadEstados()
})
</script>

<template>
  <div class="min-h-screen" style="background-color: var(--color-background)">
    <AppSidebar />
    <AppHeader />

    <main style="margin-left: var(--sidebar-width); transition: margin-left 0.25s ease; padding-top: 64px">
      <div class="p-8">
        <!-- Header -->
        <div class="mb-8">
          <h1 class="text-4xl font-extrabold tracking-tight mb-2" style="color: var(--color-on-surface)">Configuración</h1>
          <p class="font-medium" style="color: var(--color-on-surface-variant)">
            Parámetros generales del sistema
          </p>
        </div>

        <!-- Tabs principales -->
        <div class="flex gap-2 mb-6">
          <button
            @click="activeTab = 'negocio'"
            class="px-6 py-2 rounded-full text-sm font-semibold transition-all"
            :style="activeTab === 'negocio'
              ? 'background-color: var(--color-primary); color: white;'
              : 'background-color: var(--color-surface-container-high); color: var(--color-on-surface-variant);'"
          >
            <span class="material-symbols-outlined" style="font-size: 16px; vertical-align: -3px; margin-right: 4px">store</span>
            Datos del Negocio
          </button>
          <button
            @click="activeTab = 'especialidades'"
            class="px-6 py-2 rounded-full text-sm font-semibold transition-all"
            :style="activeTab === 'especialidades'
              ? 'background-color: var(--color-primary); color: white;'
              : 'background-color: var(--color-surface-container-high); color: var(--color-on-surface-variant);'"
          >
            <span class="material-symbols-outlined" style="font-size: 16px; vertical-align: -3px; margin-right: 4px">category</span>
            Especialidades
          </button>
          <button
            @click="activeTab = 'estados'"
            class="px-6 py-2 rounded-full text-sm font-semibold transition-all"
            :style="activeTab === 'estados'
              ? 'background-color: var(--color-primary); color: white;'
              : 'background-color: var(--color-surface-container-high); color: var(--color-on-surface-variant);'"
          >
            <span class="material-symbols-outlined" style="font-size: 16px; vertical-align: -3px; margin-right: 4px">label</span>
            Estados
          </button>
        </div>

        <!-- ══ TAB: NEGOCIO ══════════════════════════════════════════════════ -->
        <div v-if="activeTab === 'negocio'">
          <div
            class="rounded-2xl p-8 max-w-2xl"
            style="background-color: var(--color-surface-container-lowest); box-shadow: 0 1px 3px rgba(196,197,213,0.25);"
          >
            <div v-if="isLoadingNegocio" class="flex justify-center py-12">
              <svg class="animate-spin w-6 h-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" style="color: var(--color-primary)" />
              </svg>
            </div>

            <form v-else @submit.prevent="saveNegocio" class="space-y-5">
              <div
                v-if="negocioError"
                class="flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium"
                style="background-color: var(--color-error-container); color: var(--color-on-error-container);"
              >
                <span class="material-symbols-outlined" style="font-size: 18px">error</span>
                {{ negocioError }}
              </div>

              <div
                v-if="negocioSuccess"
                class="flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium"
                style="background-color: #dcfce7; color: #166534;"
              >
                <span class="material-symbols-outlined" style="font-size: 18px">check_circle</span>
                Configuración guardada correctamente.
              </div>

              <div class="flex flex-col gap-1.5">
                <label class="text-xs font-bold uppercase tracking-wider" style="color: var(--color-outline)">Nombre Fantasía *</label>
                <input v-model="negocioForm.nombreFantasia" type="text" placeholder="Óptica San Martín" :disabled="!canEdit"
                  class="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all disabled:opacity-60" :style="inputStyle()" />
              </div>

              <div class="grid grid-cols-2 gap-4">
                <div class="flex flex-col gap-1.5">
                  <label class="text-xs font-bold uppercase tracking-wider" style="color: var(--color-outline)">Razón Social</label>
                  <input v-model="negocioForm.razonSocial" type="text" :disabled="!canEdit"
                    class="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all disabled:opacity-60" :style="inputStyle()" />
                </div>
                <div class="flex flex-col gap-1.5">
                  <label class="text-xs font-bold uppercase tracking-wider" style="color: var(--color-outline)">CUIT / RUT</label>
                  <input v-model="negocioForm.cuit" type="text" placeholder="20-12345678-9" :disabled="!canEdit"
                    class="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all disabled:opacity-60" :style="inputStyle()" />
                </div>
              </div>

              <div class="flex flex-col gap-1.5">
                <label class="text-xs font-bold uppercase tracking-wider" style="color: var(--color-outline)">Dirección</label>
                <input v-model="negocioForm.direccion" type="text" placeholder="Av. Corrientes 1234, CABA" :disabled="!canEdit"
                  class="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all disabled:opacity-60" :style="inputStyle()" />
              </div>

              <div class="grid grid-cols-2 gap-4">
                <div class="flex flex-col gap-1.5">
                  <label class="text-xs font-bold uppercase tracking-wider" style="color: var(--color-outline)">Teléfono</label>
                  <input v-model="negocioForm.telefono" type="text" placeholder="+54 11 1234-5678" :disabled="!canEdit"
                    class="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all disabled:opacity-60" :style="inputStyle()" />
                </div>
                <div class="flex flex-col gap-1.5">
                  <label class="text-xs font-bold uppercase tracking-wider" style="color: var(--color-outline)">Email de contacto</label>
                  <input v-model="negocioForm.email" type="email" placeholder="info@optica.com" :disabled="!canEdit"
                    class="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all disabled:opacity-60" :style="inputStyle()" />
                </div>
              </div>

              <div class="flex flex-col gap-1.5">
                <label class="text-xs font-bold uppercase tracking-wider" style="color: var(--color-outline)">Sitio Web</label>
                <input v-model="negocioForm.sitioWeb" type="text" placeholder="https://optica.com" :disabled="!canEdit"
                  class="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all disabled:opacity-60" :style="inputStyle()" />
              </div>

              <div v-if="canEdit" class="flex justify-end pt-2">
                <button type="submit" :disabled="isSavingNegocio"
                  class="flex items-center gap-2 px-6 py-3 rounded-full text-sm font-bold transition-all disabled:opacity-60"
                  style="background-color: var(--color-primary); color: white;">
                  <svg v-if="isSavingNegocio" class="animate-spin w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  <span v-else class="material-symbols-outlined" style="font-size: 18px">save</span>
                  {{ isSavingNegocio ? "Guardando..." : "Guardar" }}
                </button>
              </div>
            </form>
          </div>
        </div>

        <!-- ══ TAB: ESPECIALIDADES ══════════════════════════════════════════ -->
        <div v-else-if="activeTab === 'especialidades'">
          <div class="flex justify-between items-center mb-4">
            <p class="text-sm font-medium" style="color: var(--color-on-surface-variant)">
              {{ especialidades.length }} especialidad{{ especialidades.length !== 1 ? "es" : "" }}
            </p>
            <button v-if="canEditEsp" @click="openCreateEspModal"
              class="flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold transition-all"
              style="background-color: var(--color-primary); color: white;">
              <span class="material-symbols-outlined" style="font-size: 18px">add</span>
              Nueva Especialidad
            </button>
          </div>

          <div class="rounded-2xl overflow-hidden"
            style="background-color: var(--color-surface-container-lowest); box-shadow: 0 1px 3px rgba(196,197,213,0.25); outline: 1px solid rgba(196,197,213,0.15);">
            <div v-if="isLoadingEsp" class="flex justify-center py-12">
              <svg class="animate-spin w-6 h-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" style="color: var(--color-primary)" />
              </svg>
            </div>
            <div v-else-if="especialidades.length === 0" class="py-16 text-center">
              <span class="material-symbols-outlined" style="font-size: 40px; color: var(--color-outline-variant)">category</span>
              <p class="mt-3 text-sm font-medium" style="color: var(--color-outline)">No hay especialidades cargadas.</p>
            </div>
            <table v-else class="w-full">
              <thead>
                <tr style="background-color: var(--color-surface-container-low);">
                  <th class="px-6 py-5 text-left text-xs font-bold uppercase tracking-widest" style="color: var(--color-outline)">Nombre</th>
                  <th class="px-6 py-5 text-left text-xs font-bold uppercase tracking-widest" style="color: var(--color-outline)">Descripción</th>
                  <th class="px-6 py-5"></th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="esp in especialidades" :key="esp.id" class="hover:bg-surface-container-low"
                  style="border-top: 1px solid rgba(196,197,213,0.12);">
                  <td class="px-6 py-4">
                    <span class="text-sm font-semibold" style="color: var(--color-on-surface)">{{ esp.nombre }}</span>
                  </td>
                  <td class="px-6 py-4">
                    <span class="text-sm" style="color: var(--color-on-surface-variant)">{{ esp.descripcion || "—" }}</span>
                  </td>
                  <td class="px-6 py-4">
                    <div v-if="canEditEsp" class="flex items-center justify-end gap-2">
                      <button @click="openEditEspModal(esp)" class="p-1.5 rounded-lg transition-colors" title="Editar"
                        style="color: var(--color-outline)"
                        onmouseover="this.style.backgroundColor='rgba(0,40,142,0.08)';this.style.color='var(--color-primary)'"
                        onmouseout="this.style.backgroundColor='transparent';this.style.color='var(--color-outline)'">
                        <span class="material-symbols-outlined" style="font-size: 18px">edit</span>
                      </button>
                      <button @click="openDeleteEspModal(esp)" class="p-1.5 rounded-lg transition-colors" title="Eliminar"
                        style="color: var(--color-outline)"
                        onmouseover="this.style.backgroundColor='rgba(186,26,26,0.08)';this.style.color='var(--color-error)'"
                        onmouseout="this.style.backgroundColor='transparent';this.style.color='var(--color-outline)'">
                        <span class="material-symbols-outlined" style="font-size: 18px">delete</span>
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- ══ TAB: ESTADOS ═════════════════════════════════════════════════ -->
        <div v-else-if="activeTab === 'estados'">
          <!-- Sub-tabs por entidad -->
          <div class="flex gap-2 mb-5">
            <button v-for="entidad in (['Turno', 'Pedido', 'Consulta'] as const)" :key="entidad"
              @click="activeEntidad = entidad"
              class="px-5 py-2 rounded-full text-sm font-semibold transition-all"
              :style="activeEntidad === entidad
                ? 'background-color: var(--color-secondary-container); color: var(--color-secondary);'
                : 'background-color: var(--color-surface-container-high); color: var(--color-on-surface-variant);'"
            >
              {{ entidadLabel[entidad] }}
            </button>
          </div>

          <div class="flex justify-between items-center mb-4">
            <p class="text-sm font-medium" style="color: var(--color-on-surface-variant)">
              {{ estadosFiltrados.length }} estado{{ estadosFiltrados.length !== 1 ? "s" : "" }} — los protegidos no se pueden eliminar
            </p>
            <button v-if="canEdit" @click="openCreateEstadoModal"
              class="flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold transition-all"
              style="background-color: var(--color-primary); color: white;">
              <span class="material-symbols-outlined" style="font-size: 18px">add</span>
              Nuevo Estado
            </button>
          </div>

          <div class="rounded-2xl overflow-hidden"
            style="background-color: var(--color-surface-container-lowest); box-shadow: 0 1px 3px rgba(196,197,213,0.25); outline: 1px solid rgba(196,197,213,0.15);">
            <div v-if="isLoadingEstados" class="flex justify-center py-12">
              <svg class="animate-spin w-6 h-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" style="color: var(--color-primary)" />
              </svg>
            </div>
            <div v-else-if="estadosFiltrados.length === 0" class="py-16 text-center">
              <span class="material-symbols-outlined" style="font-size: 40px; color: var(--color-outline-variant)">label</span>
              <p class="mt-3 text-sm font-medium" style="color: var(--color-outline)">No hay estados configurados.</p>
            </div>
            <table v-else class="w-full">
              <thead>
                <tr style="background-color: var(--color-surface-container-low);">
                  <th class="px-6 py-5 text-left text-xs font-bold uppercase tracking-widest" style="color: var(--color-outline)">Estado</th>
                  <th class="px-6 py-5 text-left text-xs font-bold uppercase tracking-widest" style="color: var(--color-outline)">Orden</th>
                  <th class="px-6 py-5 text-left text-xs font-bold uppercase tracking-widest" style="color: var(--color-outline)">Tipo</th>
                  <th class="px-6 py-5"></th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="estado in estadosFiltrados" :key="estado.id" class="hover:bg-surface-container-low"
                  style="border-top: 1px solid rgba(196,197,213,0.12);">
                  <td class="px-6 py-4">
                    <div class="flex items-center gap-3">
                      <span class="w-3 h-3 rounded-full flex-shrink-0" :style="`background-color: ${estado.color}`"></span>
                      <span class="text-sm font-semibold" style="color: var(--color-on-surface)">{{ estado.nombre }}</span>
                    </div>
                  </td>
                  <td class="px-6 py-4">
                    <span class="text-sm" style="color: var(--color-on-surface-variant)">{{ estado.orden }}</span>
                  </td>
                  <td class="px-6 py-4">
                    <span
                      class="px-2.5 py-1 rounded-full text-xs font-semibold"
                      :style="estado.esProtegido
                        ? 'background-color: rgba(0,40,142,0.08); color: var(--color-primary);'
                        : 'background-color: var(--color-surface-container-high); color: var(--color-on-surface-variant);'"
                    >
                      {{ estado.esProtegido ? "Protegido" : "Personalizado" }}
                    </span>
                  </td>
                  <td class="px-6 py-4">
                    <div v-if="canEdit" class="flex items-center justify-end gap-2">
                      <button @click="openEditEstadoModal(estado)" class="p-1.5 rounded-lg transition-colors" title="Editar"
                        style="color: var(--color-outline)"
                        onmouseover="this.style.backgroundColor='rgba(0,40,142,0.08)';this.style.color='var(--color-primary)'"
                        onmouseout="this.style.backgroundColor='transparent';this.style.color='var(--color-outline)'">
                        <span class="material-symbols-outlined" style="font-size: 18px">edit</span>
                      </button>
                      <button
                        @click="!estado.esProtegido && openDeleteEstadoModal(estado)"
                        class="p-1.5 rounded-lg transition-colors"
                        :title="estado.esProtegido ? 'Estado protegido — no se puede eliminar' : 'Eliminar'"
                        :style="estado.esProtegido
                          ? 'color: var(--color-outline-variant); cursor: not-allowed;'
                          : 'color: var(--color-outline);'"
                        :onmouseover="!estado.esProtegido ? `this.style.backgroundColor='rgba(186,26,26,0.08)';this.style.color='var(--color-error)'` : undefined"
                        :onmouseout="!estado.esProtegido ? `this.style.backgroundColor='transparent';this.style.color='var(--color-outline)'` : undefined"
                      >
                        <span class="material-symbols-outlined" style="font-size: 18px">delete</span>
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>

    <!-- ══ MODALES ESPECIALIDADES ════════════════════════════════════════════ -->

    <BaseModal :show="showCreateEspModal" title="Nueva Especialidad" size="md" @close="showCreateEspModal = false">
      <form @submit.prevent="submitCreateEsp" class="space-y-4">
        <div v-if="createEspError" class="flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium"
          style="background-color: var(--color-error-container); color: var(--color-on-error-container);">
          <span class="material-symbols-outlined" style="font-size: 18px">error</span>
          {{ createEspError }}
        </div>
        <div class="flex flex-col gap-1.5">
          <label class="text-xs font-bold uppercase tracking-wider" style="color: var(--color-outline)">Nombre *</label>
          <input v-model="createEspForm.nombre" type="text" placeholder="Optometría" class="w-full px-4 py-3 rounded-xl text-sm outline-none" :style="inputStyle()" />
        </div>
        <div class="flex flex-col gap-1.5">
          <label class="text-xs font-bold uppercase tracking-wider" style="color: var(--color-outline)">Descripción</label>
          <textarea v-model="createEspForm.descripcion" rows="2" class="w-full px-4 py-3 rounded-xl text-sm outline-none resize-none" :style="inputStyle()" />
        </div>
      </form>
      <template #footer>
        <button type="button" @click="showCreateEspModal = false" class="px-6 py-3 rounded-full text-sm font-bold"
          style="background-color: var(--color-surface-container-high); color: var(--color-on-surface-variant);">Cancelar</button>
        <button @click="submitCreateEsp" :disabled="isCreatingEsp"
          class="flex items-center gap-2 px-6 py-3 rounded-full text-sm font-bold disabled:opacity-60"
          style="background-color: var(--color-primary); color: white;">
          <svg v-if="isCreatingEsp" class="animate-spin w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          {{ isCreatingEsp ? "Guardando..." : "Crear" }}
        </button>
      </template>
    </BaseModal>

    <BaseModal :show="showEditEspModal" title="Editar Especialidad" size="md" @close="showEditEspModal = false">
      <form @submit.prevent="submitEditEsp" class="space-y-4">
        <div v-if="editEspError" class="flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium"
          style="background-color: var(--color-error-container); color: var(--color-on-error-container);">
          <span class="material-symbols-outlined" style="font-size: 18px">error</span>
          {{ editEspError }}
        </div>
        <div class="flex flex-col gap-1.5">
          <label class="text-xs font-bold uppercase tracking-wider" style="color: var(--color-outline)">Nombre *</label>
          <input v-model="editEspForm.nombre" type="text" class="w-full px-4 py-3 rounded-xl text-sm outline-none" :style="inputStyle()" />
        </div>
        <div class="flex flex-col gap-1.5">
          <label class="text-xs font-bold uppercase tracking-wider" style="color: var(--color-outline)">Descripción</label>
          <textarea v-model="editEspForm.descripcion" rows="2" class="w-full px-4 py-3 rounded-xl text-sm outline-none resize-none" :style="inputStyle()" />
        </div>
      </form>
      <template #footer>
        <button type="button" @click="showEditEspModal = false" class="px-6 py-3 rounded-full text-sm font-bold"
          style="background-color: var(--color-surface-container-high); color: var(--color-on-surface-variant);">Cancelar</button>
        <button @click="submitEditEsp" :disabled="isEditingEsp"
          class="flex items-center gap-2 px-6 py-3 rounded-full text-sm font-bold disabled:opacity-60"
          style="background-color: var(--color-primary); color: white;">
          <svg v-if="isEditingEsp" class="animate-spin w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          {{ isEditingEsp ? "Guardando..." : "Guardar" }}
        </button>
      </template>
    </BaseModal>

    <BaseModal :show="showDeleteEspModal" size="sm" @close="showDeleteEspModal = false">
      <div class="text-center">
        <div class="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-5"
          style="background-color: var(--color-error-container)">
          <span class="material-symbols-outlined" style="color: var(--color-error); font-size: 28px">delete</span>
        </div>
        <h3 class="text-lg font-extrabold mb-2" style="color: var(--color-on-surface)">Eliminar Especialidad</h3>
        <p class="text-sm" style="color: var(--color-on-surface-variant)">
          ¿Deseás eliminar <strong style="color: var(--color-on-surface)">{{ especialidadToDelete?.nombre }}</strong>?
          Esta acción no se puede deshacer.
        </p>
        <div v-if="deleteEspError" class="mt-4 flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium"
          style="background-color: var(--color-error-container); color: var(--color-on-error-container);">
          <span class="material-symbols-outlined" style="font-size: 18px">error</span>
          {{ deleteEspError }}
        </div>
      </div>
      <template #footer>
        <button type="button" @click="showDeleteEspModal = false" class="flex-1 py-3 rounded-full text-sm font-bold"
          style="background-color: var(--color-surface-container-high); color: var(--color-on-surface-variant);">Cancelar</button>
        <button @click="confirmDeleteEsp" :disabled="isDeletingEsp"
          class="flex-1 flex items-center justify-center gap-2 py-3 rounded-full text-sm font-bold disabled:opacity-60"
          style="background-color: var(--color-error); color: white;">
          <svg v-if="isDeletingEsp" class="animate-spin w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          {{ isDeletingEsp ? "Eliminando..." : "Eliminar" }}
        </button>
      </template>
    </BaseModal>

    <!-- ══ MODALES ESTADOS ════════════════════════════════════════════════ -->

    <BaseModal :show="showCreateEstadoModal" :title="`Nuevo Estado — ${entidadLabel[activeEntidad]}`" size="md" @close="showCreateEstadoModal = false">
      <form @submit.prevent="submitCreateEstado" class="space-y-4">
        <div v-if="createEstadoError" class="flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium"
          style="background-color: var(--color-error-container); color: var(--color-on-error-container);">
          <span class="material-symbols-outlined" style="font-size: 18px">error</span>
          {{ createEstadoError }}
        </div>
        <div class="flex flex-col gap-1.5">
          <label class="text-xs font-bold uppercase tracking-wider" style="color: var(--color-outline)">Nombre *</label>
          <input v-model="createEstadoForm.nombre" type="text" placeholder="Ej: En revisión" class="w-full px-4 py-3 rounded-xl text-sm outline-none" :style="inputStyle()" />
        </div>
        <div class="flex gap-4">
          <div class="flex flex-col gap-1.5 flex-1">
            <label class="text-xs font-bold uppercase tracking-wider" style="color: var(--color-outline)">Color</label>
            <div class="flex items-center gap-3">
              <input v-model="createEstadoForm.color" type="color" class="w-10 h-10 rounded-lg cursor-pointer border-0 p-0.5"
                style="background-color: var(--color-surface-container-low);" />
              <span class="text-sm font-mono" style="color: var(--color-on-surface-variant)">{{ createEstadoForm.color }}</span>
            </div>
          </div>
          <div class="flex flex-col gap-1.5 w-28">
            <label class="text-xs font-bold uppercase tracking-wider" style="color: var(--color-outline)">Orden</label>
            <input v-model.number="createEstadoForm.orden" type="number" min="1" class="w-full px-4 py-3 rounded-xl text-sm outline-none" :style="inputStyle()" />
          </div>
        </div>
      </form>
      <template #footer>
        <button type="button" @click="showCreateEstadoModal = false" class="px-6 py-3 rounded-full text-sm font-bold"
          style="background-color: var(--color-surface-container-high); color: var(--color-on-surface-variant);">Cancelar</button>
        <button @click="submitCreateEstado" :disabled="isCreatingEstado"
          class="flex items-center gap-2 px-6 py-3 rounded-full text-sm font-bold disabled:opacity-60"
          style="background-color: var(--color-primary); color: white;">
          <svg v-if="isCreatingEstado" class="animate-spin w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          {{ isCreatingEstado ? "Guardando..." : "Crear" }}
        </button>
      </template>
    </BaseModal>

    <BaseModal :show="showEditEstadoModal" title="Editar Estado" size="md" @close="showEditEstadoModal = false">
      <form @submit.prevent="submitEditEstado" class="space-y-4">
        <div v-if="editEstadoError" class="flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium"
          style="background-color: var(--color-error-container); color: var(--color-on-error-container);">
          <span class="material-symbols-outlined" style="font-size: 18px">error</span>
          {{ editEstadoError }}
        </div>
        <div v-if="editingEstado?.esProtegido" class="flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium"
          style="background-color: rgba(0,40,142,0.06); color: var(--color-primary);">
          <span class="material-symbols-outlined" style="font-size: 18px">lock</span>
          Estado protegido: solo podés cambiar el color y el orden.
        </div>
        <div class="flex flex-col gap-1.5">
          <label class="text-xs font-bold uppercase tracking-wider" style="color: var(--color-outline)">Nombre *</label>
          <input v-model="editEstadoForm.nombre" type="text" :disabled="editingEstado?.esProtegido"
            class="w-full px-4 py-3 rounded-xl text-sm outline-none disabled:opacity-60" :style="inputStyle()" />
        </div>
        <div class="flex gap-4">
          <div class="flex flex-col gap-1.5 flex-1">
            <label class="text-xs font-bold uppercase tracking-wider" style="color: var(--color-outline)">Color</label>
            <div class="flex items-center gap-3">
              <input v-model="editEstadoForm.color" type="color" class="w-10 h-10 rounded-lg cursor-pointer border-0 p-0.5"
                style="background-color: var(--color-surface-container-low);" />
              <span class="text-sm font-mono" style="color: var(--color-on-surface-variant)">{{ editEstadoForm.color }}</span>
            </div>
          </div>
          <div class="flex flex-col gap-1.5 w-28">
            <label class="text-xs font-bold uppercase tracking-wider" style="color: var(--color-outline)">Orden</label>
            <input v-model.number="editEstadoForm.orden" type="number" min="1" class="w-full px-4 py-3 rounded-xl text-sm outline-none" :style="inputStyle()" />
          </div>
        </div>
      </form>
      <template #footer>
        <button type="button" @click="showEditEstadoModal = false" class="px-6 py-3 rounded-full text-sm font-bold"
          style="background-color: var(--color-surface-container-high); color: var(--color-on-surface-variant);">Cancelar</button>
        <button @click="submitEditEstado" :disabled="isEditingEstado"
          class="flex items-center gap-2 px-6 py-3 rounded-full text-sm font-bold disabled:opacity-60"
          style="background-color: var(--color-primary); color: white;">
          <svg v-if="isEditingEstado" class="animate-spin w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          {{ isEditingEstado ? "Guardando..." : "Guardar" }}
        </button>
      </template>
    </BaseModal>

    <BaseModal :show="showDeleteEstadoModal" size="sm" @close="showDeleteEstadoModal = false">
      <div class="text-center">
        <div class="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-5"
          style="background-color: var(--color-error-container)">
          <span class="material-symbols-outlined" style="color: var(--color-error); font-size: 28px">delete</span>
        </div>
        <h3 class="text-lg font-extrabold mb-2" style="color: var(--color-on-surface)">Eliminar Estado</h3>
        <p class="text-sm" style="color: var(--color-on-surface-variant)">
          ¿Deseás eliminar el estado <strong style="color: var(--color-on-surface)">{{ estadoToDelete?.nombre }}</strong>?
          Esta acción no se puede deshacer.
        </p>
        <div v-if="deleteEstadoError" class="mt-4 flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium"
          style="background-color: var(--color-error-container); color: var(--color-on-error-container);">
          <span class="material-symbols-outlined" style="font-size: 18px">error</span>
          {{ deleteEstadoError }}
        </div>
      </div>
      <template #footer>
        <button type="button" @click="showDeleteEstadoModal = false" class="flex-1 py-3 rounded-full text-sm font-bold"
          style="background-color: var(--color-surface-container-high); color: var(--color-on-surface-variant);">Cancelar</button>
        <button @click="confirmDeleteEstado" :disabled="isDeletingEstado"
          class="flex-1 flex items-center justify-center gap-2 py-3 rounded-full text-sm font-bold disabled:opacity-60"
          style="background-color: var(--color-error); color: white;">
          <svg v-if="isDeletingEstado" class="animate-spin w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          {{ isDeletingEstado ? "Eliminando..." : "Eliminar" }}
        </button>
      </template>
    </BaseModal>
  </div>
</template>
