<script setup lang="ts">
import { inputStyle, avatarStyle, initials, statusStyle } from "@/composables/useFieldStyles"
import MontoInput from "@/components/MontoInput.vue"
import { ref, computed, onMounted } from "vue"
import SearchableSelect from "@/components/SearchableSelect.vue"
import AppSidebar from "@/components/AppSidebar.vue"
import AppHeader from "@/components/AppHeader.vue"
import { useAuthStore } from "@/stores/auth"
import BaseButton from "@/components/BaseButton.vue"
import BaseModal from "@/components/BaseModal.vue"
import BaseTable from "@/components/BaseTable.vue"
import SearchInput from "@/components/SearchInput.vue"
import PasswordInput from "@/components/PasswordInput.vue"
import { PASSWORD_HINT, validatePassword } from "@/utils/password"
import DateInput from "@/components/DateInput.vue"
import FilterChips from "@/components/FilterChips.vue"
import RowContextMenu, { type ContextMenuItem } from "@/components/RowContextMenu.vue"
import {
  type Empleado,
  type CargoEmpleado,
  type ActualizarEmpleadoRequest,
  type CrearEmpleadoRequest,
  getEmpleados,
  crearEmpleado,
  actualizarEmpleado,
  desactivarEmpleado,
  getCargos,
} from "@/services/empleadosService"
import { type Sucursal, getSucursales } from "@/services/sucursalService"

const auth = useAuthStore()
const canManage = auth.hasPermission("gestionar_empleados")
const sucursales = ref<Sucursal[]>([])

// ── Estado ──────────────────────────────────────────────────────────────────────

const empleados = ref<Empleado[]>([])
const cargos = ref<CargoEmpleado[]>([])
const isLoading = ref(false)
const loadError = ref("")
const activeFilters = ref<string[]>([])
const searchQuery = ref("")

const statusOptions = [
  { value: "activo",   label: "Activo",   dot: "var(--color-success)" },
  { value: "inactivo", label: "Inactivo", dot: "var(--color-outline)" },
]

// ── Datos derivados ─────────────────────────────────────────────────────────────

const filtered = computed(() => {
  let list = empleados.value

  const showActivo   = activeFilters.value.includes("activo")
  const showInactivo = activeFilters.value.includes("inactivo")
  if (showActivo && !showInactivo)   list = list.filter(e => e.isActive)
  else if (showInactivo && !showActivo) list = list.filter(e => !e.isActive)

  const q = searchQuery.value.trim().toLowerCase()
  if (q) {
    list = list.filter(e =>
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
    const [emps, cargsList, sucs] = await Promise.all([getEmpleados(), getCargos(), getSucursales(true)])
    sucursales.value = sucs
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

function formatDate(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}


function menuItems(e: Empleado): ContextMenuItem[] {
  return [
    { type: "item", label: "Editar", icon: "edit", action: () => openEditModal(e), hidden: !canManage },
    { type: "separator" },
    { type: "item", label: "Desactivar", icon: "person_off", action: () => openDeleteModal(e), danger: true, hidden: !canManage || !e.isActive },
  ]
}

const cargoOptions = computed(() =>
  cargos.value.map(c => ({ value: c.id, label: c.nombre }))
)

const cargoOptionsActivos = computed(() =>
  cargos.value.filter(c => c.activo).map(c => ({ value: c.id, label: c.nombre }))
)

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
  sucursalId: undefined,
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

  const passwordError = validatePassword(f.password.trim())
  if (passwordError) e.password = passwordError

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
    sucursalId: undefined,
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
  sucursalId: undefined,
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
    sucursalId: emp.sucursalId,
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
      sucursalId: editForm.value.sucursalId,
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
      <div class="p-4 sm:p-6 lg:p-8">

        <!-- Page header -->
        <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-8">
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
          <FilterChips v-model="activeFilters" :options="statusOptions" placeholder="Estado" />
          <SearchInput v-model="searchQuery" placeholder="Nombre, C.I., cargo o email..." />
        </div>

        <div v-if="loadError"
          class="flex items-center gap-2.5 rounded-2xl px-4 py-3 text-sm font-medium"
          style="background-color: var(--color-error-container); color: var(--color-on-error-container)">
          <span class="material-symbols-outlined" style="font-size: 18px">error</span>
          {{ loadError }}
        </div>

        <div v-else class="rounded-lg overflow-hidden"
          style="background-color: var(--color-surface-container-lowest); box-shadow: var(--shadow-sm); outline: 1px solid var(--color-hairline)">
          <BaseTable :columns="columns" :items="filtered" :loading="isLoading" emptyText="No hay empleados para mostrar.">

            <template #empleado="{ item: e }">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                  :style="`background-color: ${avatarStyle(e.id).bg}; color: ${avatarStyle(e.id).color};`">
                  {{ initials(e.firstName, e.lastName) }}
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
              <div class="flex justify-end">
                <RowContextMenu :items="menuItems(e)" />
              </div>
            </template>
          </BaseTable>

          <!-- Footer -->
          <div class="px-6 py-4"
            style="border-top: 1px solid var(--color-hairline-soft); background-color: var(--color-surface-container-lowest)">
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

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div class="flex flex-col gap-1.5">
            <label class="text-xs font-bold uppercase tracking-wider" style="color: var(--color-outline)">Nombre *</label>
            <input v-model="createForm.firstName" type="text" placeholder="Juan"
              class="px-4 h-12 text-sm outline-none appearance-none shadow-none transition-all" :style="inputStyle(!!createErrors.firstName)" />
            <p v-if="createErrors.firstName" class="text-xs font-medium" style="color: var(--color-error)">{{ createErrors.firstName }}</p>
          </div>
          <div class="flex flex-col gap-1.5">
            <label class="text-xs font-bold uppercase tracking-wider" style="color: var(--color-outline)">Apellido *</label>
            <input v-model="createForm.lastName" type="text" placeholder="Pérez"
              class="px-4 h-12 text-sm outline-none appearance-none shadow-none transition-all" :style="inputStyle(!!createErrors.lastName)" />
            <p v-if="createErrors.lastName" class="text-xs font-medium" style="color: var(--color-error)">{{ createErrors.lastName }}</p>
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div class="flex flex-col gap-1.5">
            <label class="text-xs font-bold uppercase tracking-wider" style="color: var(--color-outline)">Nro. de Cédula *</label>
            <input v-model="createForm.ci" type="text" placeholder="12345678"
              class="px-4 h-12 text-sm outline-none appearance-none shadow-none transition-all" :style="inputStyle(!!createErrors.ci)" />
            <p v-if="createErrors.ci" class="text-xs font-medium" style="color: var(--color-error)">{{ createErrors.ci }}</p>
          </div>
          <div class="flex flex-col gap-1.5">
            <label class="text-xs font-bold uppercase tracking-wider" style="color: var(--color-outline)">Teléfono</label>
            <input v-model="createForm.phoneNumber" type="tel" placeholder="0972123456"
              class="px-4 h-12 text-sm outline-none appearance-none shadow-none transition-all" :style="inputStyle(false)" />
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div class="flex flex-col gap-1.5">
            <label class="text-xs font-bold uppercase tracking-wider" style="color: var(--color-outline)">Email *</label>
            <input v-model="createForm.email" type="email" placeholder="empleado@optica.com"
              class="px-4 h-12 text-sm outline-none appearance-none shadow-none transition-all" :style="inputStyle(!!createErrors.email)" />
            <p v-if="createErrors.email" class="text-xs font-medium" style="color: var(--color-error)">{{ createErrors.email }}</p>
          </div>
          <div class="flex flex-col gap-1.5">
            <label class="text-xs font-bold uppercase tracking-wider" style="color: var(--color-outline)">Contraseña *</label>
            <PasswordInput v-model="createForm.password" :placeholder="PASSWORD_HINT" :error="!!createErrors.password" />
            <p v-if="createErrors.password" class="text-xs font-medium" style="color: var(--color-error)">{{ createErrors.password }}</p>
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div class="flex flex-col gap-1.5">
            <label class="text-xs font-bold uppercase tracking-wider" style="color: var(--color-outline)">Cargo *</label>
            <SearchableSelect
              :model-value="createForm.cargoId || null"
              :options="cargoOptionsActivos"
              null-label="Seleccionar cargo"
              :has-error="!!createErrors.cargoId"
              @update:model-value="createForm.cargoId = ($event as number) ?? 0"
            />
            <p v-if="createErrors.cargoId" class="text-xs font-medium" style="color: var(--color-error)">{{ createErrors.cargoId }}</p>
          </div>
          <div class="flex flex-col gap-1.5">
            <label class="text-xs font-bold uppercase tracking-wider" style="color: var(--color-outline)">Fecha de Ingreso *</label>
            <DateInput v-model="createForm.fechaIngreso" :has-error="!!createErrors.fechaIngreso" />
            <p v-if="createErrors.fechaIngreso" class="text-xs font-medium" style="color: var(--color-error)">{{ createErrors.fechaIngreso }}</p>
          </div>
        </div>

        <div class="flex flex-col gap-1.5">
          <label class="text-xs font-bold uppercase tracking-wider" style="color: var(--color-outline)">Salario Base (Gs.)</label>
          <MontoInput :model-value="createForm.salarioBase ?? null" @update:model-value="createForm.salarioBase = $event ?? undefined" placeholder="Opcional" />
        </div>

        <div class="flex flex-col gap-1.5">
          <label class="text-xs font-bold uppercase tracking-wider" style="color: var(--color-outline)">Sucursal</label>
          <select v-model="createForm.sucursalId"
            class="px-4 h-12 text-sm outline-none appearance-none shadow-none transition-all" :style="inputStyle(false)">
            <option :value="undefined">— Sin asignar —</option>
            <option v-for="s in sucursales" :key="s.id" :value="s.id">{{ s.nombre }}</option>
          </select>
        </div>
      </form>
      <template #footer>
        <div class="flex justify-between w-full">
          <BaseButton variant="secondary" @click="showCreateModal = false">Cancelar</BaseButton>
          <BaseButton variant="primary" :disabled="isSavingCreate" @click="submitCreate">
            <span v-if="isSavingCreate" class="material-symbols-outlined animate-spin">progress_activity</span>
            {{ isSavingCreate ? "Guardando..." : "Guardar Empleado" }}
          </BaseButton>
        </div>
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

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div class="flex flex-col gap-1.5">
            <label class="text-xs font-bold uppercase tracking-wider" style="color: var(--color-outline)">Nombre *</label>
            <input v-model="editForm.firstName" type="text"
              class="px-4 h-12 text-sm outline-none appearance-none shadow-none transition-all" :style="inputStyle(!!editErrors.firstName)" />
            <p v-if="editErrors.firstName" class="text-xs font-medium" style="color: var(--color-error)">{{ editErrors.firstName }}</p>
          </div>
          <div class="flex flex-col gap-1.5">
            <label class="text-xs font-bold uppercase tracking-wider" style="color: var(--color-outline)">Apellido *</label>
            <input v-model="editForm.lastName" type="text"
              class="px-4 h-12 text-sm outline-none appearance-none shadow-none transition-all" :style="inputStyle(!!editErrors.lastName)" />
            <p v-if="editErrors.lastName" class="text-xs font-medium" style="color: var(--color-error)">{{ editErrors.lastName }}</p>
          </div>
        </div>

        <div class="flex flex-col gap-1.5">
          <label class="text-xs font-bold uppercase tracking-wider" style="color: var(--color-outline)">Teléfono</label>
          <input v-model="editForm.phoneNumber" type="tel" placeholder="0972123456"
            class="px-4 h-12 text-sm outline-none appearance-none shadow-none transition-all" :style="inputStyle(false)" />
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div class="flex flex-col gap-1.5">
            <label class="text-xs font-bold uppercase tracking-wider" style="color: var(--color-outline)">Cargo *</label>
            <SearchableSelect
              :model-value="editForm.cargoId || null"
              :options="cargoOptions"
              null-label="Seleccionar cargo"
              :has-error="!!editErrors.cargoId"
              @update:model-value="editForm.cargoId = ($event as number) ?? 0"
            />
            <p v-if="editErrors.cargoId" class="text-xs font-medium" style="color: var(--color-error)">{{ editErrors.cargoId }}</p>
          </div>
          <div class="flex flex-col gap-1.5">
            <label class="text-xs font-bold uppercase tracking-wider" style="color: var(--color-outline)">Salario Base (Gs.)</label>
            <MontoInput :model-value="editForm.salarioBase ?? null" @update:model-value="editForm.salarioBase = $event ?? undefined" placeholder="Opcional" />
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div class="flex flex-col gap-1.5">
            <label class="text-xs font-bold uppercase tracking-wider" style="color: var(--color-outline)">Fecha de Ingreso *</label>
            <DateInput v-model="editForm.fechaIngreso" :has-error="!!editErrors.fechaIngreso" />
            <p v-if="editErrors.fechaIngreso" class="text-xs font-medium" style="color: var(--color-error)">{{ editErrors.fechaIngreso }}</p>
          </div>
          <div class="flex flex-col gap-1.5">
            <label class="text-xs font-bold uppercase tracking-wider" style="color: var(--color-outline)">Fecha de Egreso</label>
            <DateInput :model-value="editForm.fechaEgreso ?? ''" @update:model-value="editForm.fechaEgreso = $event" />
          </div>
        </div>

        <div class="flex flex-col gap-1.5">
          <label class="text-xs font-bold uppercase tracking-wider" style="color: var(--color-outline)">Sucursal</label>
          <select v-model="editForm.sucursalId"
            class="px-4 h-12 text-sm outline-none appearance-none shadow-none transition-all" :style="inputStyle(false)">
            <option :value="undefined">— Sin asignar —</option>
            <option v-for="s in sucursales" :key="s.id" :value="s.id">{{ s.nombre }}</option>
          </select>
        </div>
      </form>
      <template #footer>
        <div class="flex justify-between w-full">
          <BaseButton variant="secondary" @click="showEditModal = false">Cancelar</BaseButton>
          <BaseButton variant="primary" :disabled="isSavingEdit" @click="submitEdit">
            <span v-if="isSavingEdit" class="material-symbols-outlined animate-spin">progress_activity</span>
            {{ isSavingEdit ? "Guardando..." : "Guardar Cambios" }}
          </BaseButton>
        </div>
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
        <div class="flex justify-between w-full">
          <BaseButton variant="secondary" @click="showDeleteModal = false">Cancelar</BaseButton>
          <BaseButton variant="danger" :disabled="isDeleting" @click="confirmDelete">
            <span v-if="isDeleting" class="material-symbols-outlined animate-spin">progress_activity</span>
            {{ isDeleting ? "Desactivando..." : "Desactivar" }}
          </BaseButton>
        </div>
      </template>
    </BaseModal>
  </div>
</template>

<style scoped>
:deep(.ss-trigger) { height: 48px; border-radius: 12px; font-size: 14px; }
</style>
