<script setup lang="ts">
import { ref, computed, onMounted } from "vue"
import AppSidebar from "@/components/AppSidebar.vue"
import AppHeader from "@/components/AppHeader.vue"
import { useAuthStore } from "@/stores/auth"
import BaseButton from "@/components/BaseButton.vue"
import BaseModal from "@/components/BaseModal.vue"
import BaseTable from "@/components/BaseTable.vue"
import SearchInput from "@/components/SearchInput.vue"
import {
  type Empleado,
  type CargoEmpleado,
  type ActualizarEmpleadoRequest,
  getEmpleados,
  crearEmpleado,
  actualizarEmpleado,
  desactivarEmpleado,
  getCargos,
} from "@/services/empleadosService"

const auth = useAuthStore()
const canManage = auth.hasPermission("gestionar_empleados")

// ── Estado ──────────────────────────────────────────────────────────────────────

const empleados = ref<Empleado[]>([])
const cargos = ref<CargoEmpleado[]>([])
const isLoading = ref(false)
const loadError = ref("")
const showInactive = ref(false)
const searchQuery = ref("")

// ── Datos derivados ─────────────────────────────────────────────────────────────

const filtered = computed(() => {
  let list = showInactive.value
    ? empleados.value
    : empleados.value.filter((e) => e.isActive)

  const q = searchQuery.value.trim().toLowerCase()
  if (q) {
    list = list.filter(
      (e) =>
        e.firstName.toLowerCase().includes(q) ||
        e.lastName.toLowerCase().includes(q) ||
        e.ci.toLowerCase().includes(q) ||
        e.cargoNombre.toLowerCase().includes(q) ||
        e.email.toLowerCase().includes(q),
    )
  }
  return list
})

const totalActive = computed(() => empleados.value.filter((e) => e.isActive).length)

const columns = [
  { key: "empleado", label: "Empleado" },
  { key: "ci", label: "C.I." },
  { key: "cargo", label: "Cargo" },
  { key: "ingreso", label: "Ingreso" },
  { key: "estado", label: "Estado" },
  { key: "acciones", label: "", align: "right" as const },
]

// ── Carga ───────────────────────────────────────────────────────────────────────

async function loadAll() {
  isLoading.value = true
  loadError.value = ""
  try {
    const [emps, cargsList] = await Promise.all([getEmpleados(), getCargos()])
    empleados.value = emps
    cargos.value = cargsList
  } catch (err: unknown) {
    loadError.value = err instanceof Error ? err.message : "Error al cargar empleados."
  } finally {
    isLoading.value = false
  }
}

onMounted(loadAll)

// ── Helpers ─────────────────────────────────────────────────────────────────────

const AVATAR_PALETTE = [
  { bg: "rgba(0,40,142,0.06)", color: "var(--color-primary)" },
  { bg: "rgba(0,103,128,0.06)", color: "var(--color-secondary)" },
  { bg: "rgba(32,0,177,0.06)", color: "var(--color-tertiary)" },
  { bg: "rgba(117,118,132,0.08)", color: "var(--color-outline)" },
]

function avatarStyle(e: Empleado) {
  return AVATAR_PALETTE[(e.id ?? 0) % AVATAR_PALETTE.length]!
}

function initials(e: Empleado) {
  return `${e.firstName[0] ?? ""}${e.lastName[0] ?? ""}`.toUpperCase()
}

function formatDate(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("es-AR", {
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

function inputStyle(hasError: boolean) {
  return hasError
    ? "border: 1.5px solid var(--color-error); color: var(--color-on-surface); background-color: #FFF8F7;"
    : "border: 1px solid var(--color-outline-variant); color: var(--color-on-surface); background-color: var(--color-surface);"
}

// ── Validación ──────────────────────────────────────────────────────────────────

const ONLY_LETTERS = /^[a-záéíóúüñA-ZÁÉÍÓÚÜÑ\s]+$/
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// ── Modal Crear ─────────────────────────────────────────────────────────────────

type CreateErrors = Partial<Record<"firstName" | "lastName" | "ci" | "email" | "password" | "cargoId" | "fechaIngreso", string>>

const showCreateModal = ref(false)
const createErrors = ref<CreateErrors>({})
const createError = ref("")
const isSavingCreate = ref(false)

const createForm = ref<CrearEmpleadoRequest>({
  firstName: "",
  lastName: "",
  ci: "",
  email: "",
  password: "",
  phoneNumber: "",
  cargoId: 0,
  fechaIngreso: new Date().toISOString().slice(0, 10),
  salarioBase: undefined,
})

function validateCreate(): boolean {
  const e: CreateErrors = {}
  const f = createForm.value

  if (!f.firstName.trim()) e.firstName = "El nombre es obligatorio."
  else if (!ONLY_LETTERS.test(f.firstName.trim())) e.firstName = "Solo se permiten letras y espacios."

  if (!f.lastName.trim()) e.lastName = "El apellido es obligatorio."
  else if (!ONLY_LETTERS.test(f.lastName.trim())) e.lastName = "Solo se permiten letras y espacios."

  if (!f.ci.trim()) e.ci = "El nro. de cédula es obligatorio."

  if (!f.email.trim()) e.email = "El email es obligatorio."
  else if (!EMAIL_RE.test(f.email.trim())) e.email = "El formato del email no es válido."

  if (!f.password.trim()) e.password = "La contraseña es obligatoria."
  else if (f.password.length < 6) e.password = "Mínimo 6 caracteres."

  if (!f.cargoId) e.cargoId = "El cargo es obligatorio."

  if (!f.fechaIngreso) e.fechaIngreso = "La fecha de ingreso es obligatoria."

  createErrors.value = e
  return Object.keys(e).length === 0
}

function openCreateModal() {
  createForm.value = {
    firstName: "",
    lastName: "",
    ci: "",
    email: "",
    password: "",
    phoneNumber: "",
    cargoId: 0,
    fechaIngreso: new Date().toISOString().slice(0, 10),
    salarioBase: undefined,
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
    await crearEmpleado({
      ...createForm.value,
      phoneNumber: createForm.value.phoneNumber || undefined,
    })
    showCreateModal.value = false
    await loadAll()
  } catch (err: unknown) {
    createError.value = err instanceof Error ? err.message : "Error al crear empleado."
  } finally {
    isSavingCreate.value = false
  }
}

// ── Modal Editar ─────────────────────────────────────────────────────────────────

type EditErrors = Partial<Record<"firstName" | "lastName" | "cargoId" | "fechaIngreso", string>>

const showEditModal = ref(false)
const editingId = ref<number | null>(null)
const editErrors = ref<EditErrors>({})
const editError = ref("")
const isSavingEdit = ref(false)

const editForm = ref<ActualizarEmpleadoRequest & { isActive?: boolean }>({
  firstName: "",
  lastName: "",
  phoneNumber: "",
  cargoId: 0,
  fechaIngreso: "",
  fechaEgreso: undefined,
  salarioBase: undefined,
})

function validateEdit(): boolean {
  const e: EditErrors = {}
  const f = editForm.value

  if (!f.firstName.trim()) e.firstName = "El nombre es obligatorio."
  else if (!ONLY_LETTERS.test(f.firstName.trim())) e.firstName = "Solo se permiten letras y espacios."

  if (!f.lastName.trim()) e.lastName = "El apellido es obligatorio."
  else if (!ONLY_LETTERS.test(f.lastName.trim())) e.lastName = "Solo se permiten letras y espacios."

  if (!f.cargoId) e.cargoId = "El cargo es obligatorio."

  if (!f.fechaIngreso) e.fechaIngreso = "La fecha de ingreso es obligatoria."

  editErrors.value = e
  return Object.keys(e).length === 0
}

function openEditModal(emp: Empleado) {
  editingId.value = emp.id
  editForm.value = {
    firstName: emp.firstName,
    lastName: emp.lastName,
    phoneNumber: emp.phoneNumber ?? "",
    cargoId: emp.cargoId,
    fechaIngreso: emp.fechaIngreso,
    fechaEgreso: emp.fechaEgreso ?? undefined,
    salarioBase: emp.salarioBase ?? undefined,
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
    await actualizarEmpleado(editingId.value, {
      firstName: editForm.value.firstName,
      lastName: editForm.value.lastName,
      phoneNumber: editForm.value.phoneNumber || undefined,
      cargoId: editForm.value.cargoId,
      fechaIngreso: editForm.value.fechaIngreso,
      fechaEgreso: editForm.value.fechaEgreso || undefined,
      salarioBase: editForm.value.salarioBase || undefined,
    })
    showEditModal.value = false
    await loadAll()
  } catch (err: unknown) {
    editError.value = err instanceof Error ? err.message : "Error al actualizar empleado."
  } finally {
    isSavingEdit.value = false
  }
}

// ── Modal Desactivar ─────────────────────────────────────────────────────────────

const showDeleteModal = ref(false)
const deletingEmpleado = ref<Empleado | null>(null)
const isDeleting = ref(false)
const deleteError = ref("")

function openDeleteModal(emp: Empleado) {
  deletingEmpleado.value = emp
  deleteError.value = ""
  showDeleteModal.value = true
}

async function confirmDelete() {
  if (isDeleting.value || !deletingEmpleado.value) return
  isDeleting.value = true
  deleteError.value = ""
  try {
    await desactivarEmpleado(deletingEmpleado.value.id)
    showDeleteModal.value = false
    await loadAll()
  } catch (err: unknown) {
    deleteError.value = err instanceof Error ? err.message : "Error al desactivar empleado."
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
        <div class="flex items-start justify-between mb-8">
          <div>
            <h1 class="text-4xl font-extrabold tracking-tight mb-2">Gestión de Empleados</h1>
            <p class="font-medium" style="color: var(--color-on-surface-variant)">
              Administre el personal no médico: vendedores, recepcionistas y cajeros.
            </p>
          </div>

          <BaseButton v-if="canManage" variant="primary" size="lg" @click="openCreateModal">
            <span class="material-symbols-outlined" style="width: 20px; height: 20px; font-size: 20px">person_add</span>
            Añadir Empleado
          </BaseButton>
        </div>

        <!-- Filters + Search -->
        <div class="flex items-center justify-between gap-4 mb-8 flex-wrap">
          <BaseButton :variant="showInactive ? 'primary' : 'secondary'" size="sm" @click="showInactive = !showInactive">
            <span class="material-symbols-outlined" style="font-size: 16px; width: 16px; height: 16px">
              {{ showInactive ? "visibility" : "visibility_off" }}
            </span>
            Mostrar inactivos
          </BaseButton>

          <SearchInput v-model="searchQuery" placeholder="Nombre, C.I., cargo o email..." />
        </div>

        <div v-if="loadError"
          class="flex items-center gap-2.5 rounded-2xl px-4 py-3 text-sm font-medium"
          style="background-color: var(--color-error-container); color: var(--color-on-error-container)">
          <span class="material-symbols-outlined" style="font-size: 18px">error</span>
          {{ loadError }}
        </div>

        <div v-else class="rounded-2xl overflow-hidden"
          style="background-color: var(--color-surface-container-lowest); box-shadow: 0 1px 3px rgba(196, 197, 213, 0.25); outline: 1px solid rgba(196, 197, 213, 0.15)">
          <BaseTable :columns="columns" :items="filtered" :loading="isLoading" emptyText="No hay empleados para mostrar.">

            <template #empleado="{ item: e }">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                  :style="`background-color: ${avatarStyle(e).bg}; color: ${avatarStyle(e).color};`">
                  {{ initials(e) }}
                </div>
                <div>
                  <div class="font-bold text-sm" style="color: var(--color-on-surface)">
                    {{ e.firstName }} {{ e.lastName }}
                  </div>
                  <div class="text-xs" style="color: var(--color-on-surface-variant)">{{ e.email }}</div>
                </div>
              </div>
            </template>

            <template #ci="{ item: e }">
              <span class="text-sm font-medium tracking-wider" style="color: var(--color-on-surface-variant)">{{ e.ci }}</span>
            </template>

            <template #cargo="{ item: e }">
              <span class="inline-block px-2.5 py-1 rounded-full text-xs font-semibold"
                style="background-color: rgba(0, 103, 128, 0.07); color: var(--color-secondary)">
                {{ e.cargoNombre }}
              </span>
            </template>

            <template #ingreso="{ item: e }">
              <span class="text-sm" style="color: var(--color-on-surface-variant)">{{ formatDate(e.fechaIngreso) }}</span>
            </template>

            <template #estado="{ item: e }">
              <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider"
                :style="`background-color: ${statusStyle(e.isActive).bg}; color: ${statusStyle(e.isActive).text};`">
                <span class="w-1.5 h-1.5 rounded-full" :style="`background-color: ${statusStyle(e.isActive).dot};`"></span>
                {{ statusStyle(e.isActive).label }}
              </span>
            </template>

            <template #acciones="{ item: e }">
              <div class="flex justify-end gap-1">
                <button v-if="canManage"
                  class="w-9 h-9 rounded-full flex items-center justify-center transition-all hover:scale-105 active:scale-95"
                  style="background-color: var(--color-surface-container-high)"
                  title="Editar empleado" @click.stop="openEditModal(e)">
                  <span class="material-symbols-outlined" style="font-size: 18px; color: var(--color-on-surface-variant)">edit</span>
                </button>
                <button v-if="canManage && e.isActive"
                  class="w-9 h-9 rounded-full flex items-center justify-center transition-all hover:scale-105 active:scale-95"
                  style="background-color: var(--color-error-container)"
                  title="Desactivar empleado" @click.stop="openDeleteModal(e)">
                  <span class="material-symbols-outlined" style="font-size: 18px; color: var(--color-error)">person_off</span>
                </button>
              </div>
            </template>
          </BaseTable>

          <!-- Footer -->
          <div class="px-6 py-4"
            style="border-top: 1px solid rgba(196, 197, 213, 0.12); background-color: var(--color-surface-container-lowest)">
            <span class="text-sm" style="color: var(--color-on-surface-variant)">
              Mostrando
              <strong style="color: var(--color-on-surface)">{{ filtered.length }}</strong>
              de
              <strong style="color: var(--color-on-surface)">{{ empleados.length }}</strong>
              empleados
            </span>
          </div>
        </div>

        <!-- Bento cards -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mt-10">
          <div class="p-8 rounded-2xl flex flex-col justify-between"
            style="background-color: var(--color-surface-container-low); height: 192px">
            <span class="material-symbols-outlined" style="color: var(--color-primary); font-size: 32px">badge</span>
            <div>
              <div class="text-3xl font-black" style="color: var(--color-on-surface)">{{ totalActive }}</div>
              <div class="text-xs font-bold uppercase tracking-widest mt-1" style="color: var(--color-outline)">
                Empleados Activos
              </div>
            </div>
          </div>

          <div class="p-8 rounded-2xl flex flex-col justify-between"
            style="background-color: var(--color-surface-container-low); height: 192px">
            <span class="material-symbols-outlined" style="color: var(--color-secondary); font-size: 32px">groups</span>
            <div>
              <div class="text-3xl font-black" style="color: var(--color-on-surface)">{{ empleados.length }}</div>
              <div class="text-xs font-bold uppercase tracking-widest mt-1" style="color: var(--color-outline)">
                Total Registros
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>

    <!-- ── MODAL CREAR ──────────────────────────────────────────────────────────── -->
    <BaseModal :show="showCreateModal" title="Nuevo Empleado" size="lg" @close="showCreateModal = false">
      <form @submit.prevent="submitCreate" class="space-y-5">
        <div v-if="createError"
          class="flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium"
          style="background-color: var(--color-error-container); color: var(--color-on-error-container)">
          <span class="material-symbols-outlined" style="font-size: 18px">error</span>
          {{ createError }}
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div class="flex flex-col gap-1.5">
            <label class="text-xs font-bold uppercase tracking-wider" style="color: var(--color-outline)">Nombre *</label>
            <input v-model="createForm.firstName" type="text" placeholder="Juan"
              class="px-4 py-3 rounded-xl text-sm outline-none transition-all" :style="inputStyle(!!createErrors.firstName)" />
            <p v-if="createErrors.firstName" class="text-xs font-medium" style="color: var(--color-error)">{{ createErrors.firstName }}</p>
          </div>
          <div class="flex flex-col gap-1.5">
            <label class="text-xs font-bold uppercase tracking-wider" style="color: var(--color-outline)">Apellido *</label>
            <input v-model="createForm.lastName" type="text" placeholder="Pérez"
              class="px-4 py-3 rounded-xl text-sm outline-none transition-all" :style="inputStyle(!!createErrors.lastName)" />
            <p v-if="createErrors.lastName" class="text-xs font-medium" style="color: var(--color-error)">{{ createErrors.lastName }}</p>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div class="flex flex-col gap-1.5">
            <label class="text-xs font-bold uppercase tracking-wider" style="color: var(--color-outline)">Nro. de Cédula *</label>
            <input v-model="createForm.ci" type="text" placeholder="12345678"
              class="px-4 py-3 rounded-xl text-sm outline-none transition-all" :style="inputStyle(!!createErrors.ci)" />
            <p v-if="createErrors.ci" class="text-xs font-medium" style="color: var(--color-error)">{{ createErrors.ci }}</p>
          </div>
          <div class="flex flex-col gap-1.5">
            <label class="text-xs font-bold uppercase tracking-wider" style="color: var(--color-outline)">Teléfono</label>
            <input v-model="createForm.phoneNumber" type="tel" placeholder="0972123456"
              class="px-4 py-3 rounded-xl text-sm outline-none transition-all" :style="inputStyle(false)" />
          </div>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div class="flex flex-col gap-1.5">
            <label class="text-xs font-bold uppercase tracking-wider" style="color: var(--color-outline)">Email *</label>
            <input v-model="createForm.email" type="email" placeholder="empleado@optica.com"
              class="px-4 py-3 rounded-xl text-sm outline-none transition-all" :style="inputStyle(!!createErrors.email)" />
            <p v-if="createErrors.email" class="text-xs font-medium" style="color: var(--color-error)">{{ createErrors.email }}</p>
          </div>
          <div class="flex flex-col gap-1.5">
            <label class="text-xs font-bold uppercase tracking-wider" style="color: var(--color-outline)">Contraseña *</label>
            <input v-model="createForm.password" type="password" placeholder="Mínimo 6 caracteres"
              class="px-4 py-3 rounded-xl text-sm outline-none transition-all" :style="inputStyle(!!createErrors.password)" />
            <p v-if="createErrors.password" class="text-xs font-medium" style="color: var(--color-error)">{{ createErrors.password }}</p>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div class="flex flex-col gap-1.5">
            <label class="text-xs font-bold uppercase tracking-wider" style="color: var(--color-outline)">Cargo *</label>
            <select v-model="createForm.cargoId" class="px-4 py-3 rounded-xl text-sm outline-none appearance-none transition-all" :style="inputStyle(!!createErrors.cargoId)">
              <option :value="0" disabled>Seleccionar cargo</option>
              <option v-for="c in cargos.filter(c => c.activo)" :key="c.id" :value="c.id">{{ c.nombre }}</option>
            </select>
            <p v-if="createErrors.cargoId" class="text-xs font-medium" style="color: var(--color-error)">{{ createErrors.cargoId }}</p>
          </div>
          <div class="flex flex-col gap-1.5">
            <label class="text-xs font-bold uppercase tracking-wider" style="color: var(--color-outline)">Fecha de Ingreso *</label>
            <input v-model="createForm.fechaIngreso" type="date"
              class="px-4 py-3 rounded-xl text-sm outline-none transition-all" :style="inputStyle(!!createErrors.fechaIngreso)" />
            <p v-if="createErrors.fechaIngreso" class="text-xs font-medium" style="color: var(--color-error)">{{ createErrors.fechaIngreso }}</p>
          </div>
        </div>

        <div class="flex flex-col gap-1.5">
          <label class="text-xs font-bold uppercase tracking-wider" style="color: var(--color-outline)">Salario Base (Gs.)</label>
          <input v-model.number="createForm.salarioBase" type="number" step="1" min="0" placeholder="Opcional"
            class="px-4 py-3 rounded-xl text-sm outline-none transition-all" :style="inputStyle(false)" />
        </div>
      </form>
      <template #footer>
        <BaseButton variant="secondary" @click="showCreateModal = false">Cancelar</BaseButton>
        <BaseButton variant="primary" :disabled="isSavingCreate" @click="submitCreate">
          <svg v-if="isSavingCreate" class="animate-spin w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          {{ isSavingCreate ? "Guardando..." : "Guardar Empleado" }}
        </BaseButton>
      </template>
    </BaseModal>

    <!-- ── MODAL EDITAR ──────────────────────────────────────────────────────────── -->
    <BaseModal :show="showEditModal" title="Editar Empleado" size="lg" @close="showEditModal = false">
      <form @submit.prevent="submitEdit" class="space-y-5">
        <div v-if="editError"
          class="flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium"
          style="background-color: var(--color-error-container); color: var(--color-on-error-container)">
          <span class="material-symbols-outlined" style="font-size: 18px">error</span>
          {{ editError }}
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div class="flex flex-col gap-1.5">
            <label class="text-xs font-bold uppercase tracking-wider" style="color: var(--color-outline)">Nombre *</label>
            <input v-model="editForm.firstName" type="text"
              class="px-4 py-3 rounded-xl text-sm outline-none transition-all" :style="inputStyle(!!editErrors.firstName)" />
            <p v-if="editErrors.firstName" class="text-xs font-medium" style="color: var(--color-error)">{{ editErrors.firstName }}</p>
          </div>
          <div class="flex flex-col gap-1.5">
            <label class="text-xs font-bold uppercase tracking-wider" style="color: var(--color-outline)">Apellido *</label>
            <input v-model="editForm.lastName" type="text"
              class="px-4 py-3 rounded-xl text-sm outline-none transition-all" :style="inputStyle(!!editErrors.lastName)" />
            <p v-if="editErrors.lastName" class="text-xs font-medium" style="color: var(--color-error)">{{ editErrors.lastName }}</p>
          </div>
        </div>

        <div class="flex flex-col gap-1.5">
          <label class="text-xs font-bold uppercase tracking-wider" style="color: var(--color-outline)">Teléfono</label>
          <input v-model="editForm.phoneNumber" type="tel" placeholder="0972123456"
            class="px-4 py-3 rounded-xl text-sm outline-none transition-all" :style="inputStyle(false)" />
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div class="flex flex-col gap-1.5">
            <label class="text-xs font-bold uppercase tracking-wider" style="color: var(--color-outline)">Cargo *</label>
            <select v-model="editForm.cargoId" class="px-4 py-3 rounded-xl text-sm outline-none appearance-none transition-all" :style="inputStyle(!!editErrors.cargoId)">
              <option :value="0" disabled>Seleccionar cargo</option>
              <option v-for="c in cargos" :key="c.id" :value="c.id">{{ c.nombre }}</option>
            </select>
            <p v-if="editErrors.cargoId" class="text-xs font-medium" style="color: var(--color-error)">{{ editErrors.cargoId }}</p>
          </div>
          <div class="flex flex-col gap-1.5">
            <label class="text-xs font-bold uppercase tracking-wider" style="color: var(--color-outline)">Salario Base (Gs.)</label>
            <input v-model.number="editForm.salarioBase" type="number" step="1" min="0" placeholder="Opcional"
              class="px-4 py-3 rounded-xl text-sm outline-none transition-all" :style="inputStyle(false)" />
          </div>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div class="flex flex-col gap-1.5">
            <label class="text-xs font-bold uppercase tracking-wider" style="color: var(--color-outline)">Fecha de Ingreso *</label>
            <input v-model="editForm.fechaIngreso" type="date"
              class="px-4 py-3 rounded-xl text-sm outline-none transition-all" :style="inputStyle(!!editErrors.fechaIngreso)" />
            <p v-if="editErrors.fechaIngreso" class="text-xs font-medium" style="color: var(--color-error)">{{ editErrors.fechaIngreso }}</p>
          </div>
          <div class="flex flex-col gap-1.5">
            <label class="text-xs font-bold uppercase tracking-wider" style="color: var(--color-outline)">Fecha de Egreso</label>
            <input v-model="editForm.fechaEgreso" type="date"
              class="px-4 py-3 rounded-xl text-sm outline-none transition-all" :style="inputStyle(false)" />
          </div>
        </div>
      </form>
      <template #footer>
        <BaseButton variant="secondary" @click="showEditModal = false">Cancelar</BaseButton>
        <BaseButton variant="primary" :disabled="isSavingEdit" @click="submitEdit">
          <svg v-if="isSavingEdit" class="animate-spin w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          {{ isSavingEdit ? "Guardando..." : "Guardar Cambios" }}
        </BaseButton>
      </template>
    </BaseModal>

    <!-- ── MODAL DESACTIVAR ──────────────────────────────────────────────────────── -->
    <BaseModal :show="showDeleteModal" size="sm" @close="showDeleteModal = false">
      <div class="text-center">
        <div class="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-5"
          style="background-color: var(--color-error-container)">
          <span class="material-symbols-outlined" style="color: var(--color-error); font-size: 28px">person_off</span>
        </div>
        <h3 class="text-lg font-extrabold mb-2" style="color: var(--color-on-surface)">Desactivar Empleado</h3>
        <p class="text-sm" style="color: var(--color-on-surface-variant)">
          ¿Desactivar a
          <strong style="color: var(--color-on-surface)">{{ deletingEmpleado?.firstName }} {{ deletingEmpleado?.lastName }}</strong>?
          No podrá iniciar sesión pero sus datos se conservarán.
        </p>
        <div v-if="deleteError"
          class="mt-4 flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium"
          style="background-color: var(--color-error-container); color: var(--color-on-error-container)">
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
          {{ isDeleting ? "Desactivando..." : "Desactivar" }}
        </BaseButton>
      </template>
    </BaseModal>
  </div>
</template>
