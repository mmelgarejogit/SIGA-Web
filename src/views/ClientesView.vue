<script setup lang="ts">
import { ref, computed, watch, onMounted, reactive } from "vue"
import AppSidebar from "@/components/AppSidebar.vue"
import AppHeader from "@/components/AppHeader.vue"
import { useAuthStore } from "@/stores/auth"
import {
  type Cliente,
  type GetClientesParams,
  type TipoFacturacion,
  getClientes,
  updateCliente,
  desactivarCliente,
  activarCliente,
} from "@/services/clienteService"
import BaseButton from "@/components/BaseButton.vue"
import BaseModal from "@/components/BaseModal.vue"
import BaseTable from "@/components/BaseTable.vue"
import FilterChips from "@/components/FilterChips.vue"
import SearchInput from "@/components/SearchInput.vue"
import RowContextMenu, { type ContextMenuItem } from "@/components/RowContextMenu.vue"
import BirthDateInput from "@/components/BirthDateInput.vue"
import SearchableSelect from "@/components/SearchableSelect.vue"
import ClienteQuickCreateModal from "@/components/ClienteQuickCreateModal.vue"

const SEXO_OPTIONS = [
  { value: "Masculino", label: "Masculino" },
  { value: "Femenino", label: "Femenino" },
  { value: "Otro", label: "Otro" },
]

const TIPO_OPTIONS = [
  { value: "Fisica", label: "Persona Física" },
  { value: "Juridica", label: "Persona Jurídica" },
]

const auth = useAuthStore()

// ── Estado principal ──────────────────────────────────────────────────────────

const clientes = ref<Cliente[]>([])
const isLoading = ref(false)
const loadError = ref("")
const totalCount = ref(0)
const totalActive = ref(0)
const totalPages = ref(0)

// ── Filtros, búsqueda y paginación ────────────────────────────────────────────

const PAGE_SIZE = 10
const currentPage = ref(1)
const estadoFilters = ref<string[]>([])
const tipoFilters = ref<string[]>([])
const searchQuery = ref("")
let searchTimer = 0

const columns = [
  { key: "nombre", label: "Cliente" },
  { key: "documento", label: "C.I." },
  { key: "facturacion", label: "Facturación" },
  { key: "estado", label: "Estado" },
  { key: "acciones", label: "" },
]

const statusParam = computed<GetClientesParams["status"] | undefined>(() => {
  const f = estadoFilters.value
  if (f.includes("activo") && !f.includes("inactivo")) return "active"
  if (f.includes("inactivo") && !f.includes("activo")) return "inactive"
  return undefined
})

const tipoParam = computed<GetClientesParams["tipo"] | undefined>(() => {
  const f = tipoFilters.value
  if (f.includes("fisica") && !f.includes("juridica")) return "fisica"
  if (f.includes("juridica") && !f.includes("fisica")) return "juridica"
  return undefined
})

const rangeStart = computed(() =>
  totalCount.value === 0 ? 0 : (currentPage.value - 1) * PAGE_SIZE + 1,
)
const rangeEnd = computed(() => Math.min(currentPage.value * PAGE_SIZE, totalCount.value))

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

async function loadClientes() {
  isLoading.value = true
  loadError.value = ""
  try {
    const result = await getClientes({
      page: currentPage.value,
      pageSize: PAGE_SIZE,
      search: searchQuery.value.trim() || undefined,
      status: statusParam.value,
      tipo: tipoParam.value,
    })
    clientes.value = result.items
    totalCount.value = result.totalCount
    totalActive.value = result.totalActive
    totalPages.value = result.totalPages
  } catch (err: unknown) {
    loadError.value = err instanceof Error ? err.message : "Error al cargar clientes."
  } finally {
    isLoading.value = false
  }
}

watch([estadoFilters, tipoFilters], () => {
  currentPage.value = 1
  loadClientes()
})
watch(currentPage, loadClientes)
watch(searchQuery, () => {
  clearTimeout(searchTimer)
  searchTimer = window.setTimeout(() => {
    currentPage.value = 1
    loadClientes()
  }, 350)
})

// ── Helpers ───────────────────────────────────────────────────────────────────

const AVATAR_PALETTE = [
  { bg: "rgba(0,40,142,0.06)", color: "var(--color-primary)" },
  { bg: "rgba(0,103,128,0.06)", color: "var(--color-secondary)" },
  { bg: "rgba(32,0,177,0.06)", color: "var(--color-tertiary)" },
  { bg: "rgba(117,118,132,0.08)", color: "var(--color-outline)" },
]

function avatarStyle(c: Cliente) {
  return AVATAR_PALETTE[(c.id ?? 0) % AVATAR_PALETTE.length]!
}

function initials(c: Cliente) {
  return `${c.firstName[0] ?? ""}${c.lastName[0] ?? ""}`.toUpperCase()
}

function inputStyle(hasError: boolean) {
  const base = "border-radius: 12px; "
  return hasError
    ? base + "border: 1.5px solid var(--color-error); color: var(--color-on-surface); background-color: #FFF8F7;"
    : base + "border: 1px solid var(--color-outline-variant); color: var(--color-on-surface); background-color: var(--color-surface);"
}

onMounted(loadClientes)

// ── Validación ────────────────────────────────────────────────────────────────

const ONLY_LETTERS = /^[a-záéíóúüñA-ZÁÉÍÓÚÜÑ\s]+$/
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

interface ClienteForm {
  personId?: number
  ci: string
  firstName: string
  lastName: string
  birthDate: string
  sexo: string
  phoneNumber: string
  personEmail: string
  tipoFacturacion: TipoFacturacion
  razonSocial: string
  rucCiFiscal: string
  direccion: string
  email: string
  telefono: string
}

function emptyForm(): ClienteForm {
  return {
    personId: undefined,
    ci: "",
    firstName: "",
    lastName: "",
    birthDate: "",
    sexo: "",
    phoneNumber: "",
    personEmail: "",
    tipoFacturacion: "Fisica",
    razonSocial: "",
    rucCiFiscal: "",
    direccion: "",
    email: "",
    telefono: "",
  }
}

type FormErrors = Partial<Record<keyof ClienteForm | "contact", string>>

function validateFacturacion(f: ClienteForm, e: FormErrors) {
  if (f.tipoFacturacion === "Juridica") {
    if (!f.razonSocial.trim()) e.razonSocial = "La razón social es obligatoria para facturación jurídica."
    if (!f.rucCiFiscal.trim()) e.rucCiFiscal = "El RUC es obligatorio para facturación jurídica."
  }
  if (f.email.trim() && !EMAIL_RE.test(f.email.trim()))
    e.email = "El formato del email de facturación no es válido."
}

function validatePersona(f: ClienteForm, e: FormErrors, requireCi: boolean) {
  if (requireCi && !f.ci.trim()) e.ci = "El nro. de cédula es obligatorio."

  if (!f.firstName.trim()) e.firstName = "El nombre es obligatorio."
  else if (!ONLY_LETTERS.test(f.firstName.trim())) e.firstName = "Solo se permiten letras y espacios."

  if (!f.lastName.trim()) e.lastName = "El apellido es obligatorio."
  else if (!ONLY_LETTERS.test(f.lastName.trim())) e.lastName = "Solo se permiten letras y espacios."

  if (!f.birthDate) e.birthDate = "La fecha de nacimiento es obligatoria."

  const hasPhone = !!f.phoneNumber.trim()
  const hasEmail = !!f.personEmail.trim()
  if (!hasPhone && !hasEmail) e.contact = "Debe ingresar al menos un dato de contacto: email o teléfono."
  else if (hasEmail && !EMAIL_RE.test(f.personEmail.trim())) e.personEmail = "El formato del email no es válido."
}

// ── Modal Crear ───────────────────────────────────────────────────────────────

const showCreateModal = ref(false)

function openCreateModal() {
  showCreateModal.value = true
}

async function onClienteCreado() {
  currentPage.value = 1
  await loadClientes()
}

// ── Modal Editar ──────────────────────────────────────────────────────────────

const showEditModal = ref(false)
const editingId = ref<number | null>(null)
const editForm = reactive<ClienteForm>(emptyForm())
const editErrors = ref<FormErrors>({})
const editError = ref("")
const isSavingEdit = ref(false)

function openEditModal(c: Cliente) {
  editingId.value = c.id
  Object.assign(editForm, {
    personId: c.personId,
    ci: c.ci,
    firstName: c.firstName,
    lastName: c.lastName,
    birthDate: c.birthDate,
    sexo: c.sexo ?? "",
    phoneNumber: c.phoneNumber ?? "",
    personEmail: c.personEmail ?? "",
    tipoFacturacion: c.tipoFacturacion,
    razonSocial: c.razonSocial ?? "",
    rucCiFiscal: c.rucCiFiscal ?? "",
    direccion: c.direccion ?? "",
    email: c.email ?? "",
    telefono: c.telefono ?? "",
  })
  editErrors.value = {}
  editError.value = ""
  showEditModal.value = true
}

function validateEdit(): boolean {
  const e: FormErrors = {}
  validatePersona(editForm, e, false)
  validateFacturacion(editForm, e)
  editErrors.value = e
  return Object.keys(e).length === 0
}

async function submitEdit() {
  if (isSavingEdit.value || editingId.value == null) return
  if (!validateEdit()) return
  editError.value = ""
  isSavingEdit.value = true
  try {
    await updateCliente(editingId.value, {
      firstName: editForm.firstName,
      lastName: editForm.lastName,
      birthDate: editForm.birthDate,
      sexo: editForm.sexo || undefined,
      phoneNumber: editForm.phoneNumber || undefined,
      personEmail: editForm.personEmail || undefined,
      tipoFacturacion: editForm.tipoFacturacion,
      razonSocial: editForm.razonSocial || undefined,
      rucCiFiscal: editForm.rucCiFiscal || undefined,
      direccion: editForm.direccion || undefined,
      email: editForm.email || undefined,
      telefono: editForm.telefono || undefined,
    })
    showEditModal.value = false
    await loadClientes()
  } catch (err: unknown) {
    editError.value = err instanceof Error ? err.message : "Error al guardar cliente."
  } finally {
    isSavingEdit.value = false
  }
}

// ── Menú contextual ───────────────────────────────────────────────────────────

function menuItems(c: Cliente): ContextMenuItem[] {
  const items: ContextMenuItem[] = [
    {
      type: "item",
      label: "Editar",
      icon: "edit",
      action: () => openEditModal(c),
      hidden: !auth.hasPermission("editar_cliente"),
    },
  ]
  if (auth.hasPermission("desactivar_cliente")) {
    items.push({ type: "separator" })
    if (c.isActive) {
      items.push({ type: "item", label: "Desactivar", icon: "person_off", action: () => openEstadoModal(c, false), danger: true })
    } else {
      items.push({ type: "item", label: "Activar", icon: "person_check", action: () => openEstadoModal(c, true) })
    }
  }
  return items
}

// ── Modal Activar / Desactivar ────────────────────────────────────────────────

const showEstadoModal = ref(false)
const estadoTarget = ref<Cliente | null>(null)
const estadoActivar = ref(false)
const isSavingEstado = ref(false)
const estadoError = ref("")

function openEstadoModal(c: Cliente, activar: boolean) {
  estadoTarget.value = c
  estadoActivar.value = activar
  estadoError.value = ""
  showEstadoModal.value = true
}

async function confirmEstado() {
  if (isSavingEstado.value || !estadoTarget.value) return
  isSavingEstado.value = true
  estadoError.value = ""
  try {
    if (estadoActivar.value) await activarCliente(estadoTarget.value.id)
    else await desactivarCliente(estadoTarget.value.id)
    showEstadoModal.value = false
    await loadClientes()
  } catch (err: unknown) {
    estadoError.value = err instanceof Error ? err.message : "Error al cambiar el estado."
  } finally {
    isSavingEstado.value = false
  }
}
</script>

<template>
  <div class="min-h-screen" style="background-color: var(--color-background)">
    <AppSidebar />
    <AppHeader />

    <main style="margin-left: var(--sidebar-width); transition: margin-left 0.25s ease; padding-top: 64px">
      <div class="p-8">
        <!-- Page header -->
        <div class="flex items-start justify-between mb-8">
          <div>
            <h1 class="text-4xl font-extrabold tracking-tight mb-2">Gestión de Clientes</h1>
            <p class="font-medium" style="color: var(--color-on-surface-variant)">
              Administre los clientes y sus datos de facturación.
            </p>
          </div>

          <BaseButton
            v-if="auth.hasPermission('crear_cliente')"
            variant="primary"
            size="lg"
            @click="openCreateModal"
          >
            <span class="material-symbols-outlined" style="width: 20px; height: 20px; font-size: 20px">badge</span>
            Añadir Cliente
          </BaseButton>
        </div>

        <!-- Filters + Search -->
        <div class="flex items-center justify-between gap-4 mb-8 flex-wrap">
          <div class="flex items-center gap-3 flex-wrap">
            <FilterChips
              v-model="estadoFilters"
              :options="[
                { value: 'activo', label: 'Activo', dot: '#16a34a' },
                { value: 'inactivo', label: 'Inactivo', dot: 'var(--color-outline)' },
              ]"
              placeholder="Estado"
            />
            <FilterChips
              v-model="tipoFilters"
              :options="[
                { value: 'fisica', label: 'Persona Física' },
                { value: 'juridica', label: 'Persona Jurídica' },
              ]"
              placeholder="Tipo"
            />
          </div>

          <SearchInput v-model="searchQuery" placeholder="Buscar por nombre, C.I., razón social, RUC..." />
        </div>

        <!-- Load error -->
        <div
          v-if="loadError"
          class="flex items-center gap-2.5 rounded-2xl px-4 py-3 text-sm font-medium"
          style="background-color: var(--color-error-container); color: var(--color-on-error-container)"
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
            :items="clientes"
            :loading="isLoading"
            emptyText="No hay clientes para mostrar."
          >
            <template #nombre="{ item: c }">
              <div class="flex items-center gap-3">
                <div
                  class="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                  :style="`background-color: ${avatarStyle(c).bg}; color: ${avatarStyle(c).color};`"
                >
                  {{ initials(c) }}
                </div>
                <div>
                  <div class="font-bold text-sm" style="color: var(--color-on-surface)">
                    {{ c.firstName }} {{ c.lastName }}
                  </div>
                  <div class="text-xs" style="color: var(--color-on-surface-variant)">
                    {{ c.personEmail ?? c.phoneNumber ?? "—" }}
                  </div>
                </div>
              </div>
            </template>
            <template #documento="{ item: c }">
              <span class="text-sm font-medium tracking-wider" style="color: var(--color-on-surface-variant)">{{ c.ci }}</span>
            </template>
            <template #facturacion="{ item: c }">
              <div class="flex flex-col gap-0.5">
                <span
                  class="inline-flex items-center w-fit px-2 py-0.5 rounded-full text-xs font-bold"
                  :style="c.tipoFacturacion === 'Juridica'
                    ? 'background-color: rgba(0,103,128,0.10); color: var(--color-secondary);'
                    : 'background-color: rgba(0,40,142,0.08); color: var(--color-primary);'"
                >
                  {{ c.tipoFacturacion === "Juridica" ? "Jurídica" : "Física" }}
                </span>
                <span class="text-xs" style="color: var(--color-on-surface-variant)">
                  <template v-if="c.tipoFacturacion === 'Juridica'">
                    {{ c.razonSocial ?? "—" }}<template v-if="c.rucCiFiscal"> · {{ c.rucCiFiscal }}</template>
                  </template>
                  <template v-else>
                    {{ c.rucCiFiscal ?? c.ci }}
                  </template>
                </span>
              </div>
            </template>
            <template #estado="{ item: c }">
              <span
                class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider"
                :class="c.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'"
              >
                <span class="w-1.5 h-1.5 rounded-full" :class="c.isActive ? 'bg-green-600' : 'bg-red-400'"></span>
                {{ c.isActive ? "Activo" : "Inactivo" }}
              </span>
            </template>
            <template #acciones="{ item: c }">
              <div class="flex justify-end">
                <RowContextMenu :items="menuItems(c)" />
              </div>
            </template>
          </BaseTable>

          <!-- Footer: conteo + paginador -->
          <div
            v-if="clientes.length > 0"
            class="px-6 py-4 flex items-center justify-between flex-wrap gap-4"
            style="border-top: 1px solid rgba(196, 197, 213, 0.12); background-color: var(--color-surface-container-lowest)"
          >
            <span class="text-sm" style="color: var(--color-on-surface-variant)">
              Mostrando
              <strong style="color: var(--color-on-surface)">{{ rangeStart }}–{{ rangeEnd }}</strong>
              de
              <strong style="color: var(--color-on-surface)">{{ totalCount }}</strong>
              clientes
            </span>

            <div v-if="totalPages > 1" class="flex items-center gap-1">
              <button
                @click="currentPage--"
                :disabled="currentPage === 1"
                class="w-9 h-9 rounded-full flex items-center justify-center transition-all disabled:opacity-30 hover:bg-surface-container-high"
                style="color: var(--color-on-surface-variant)"
              >
                <span class="material-symbols-outlined" style="font-size: 18px">chevron_left</span>
              </button>

              <template v-for="p in visiblePages" :key="p">
                <span v-if="p === '...'" class="w-9 h-9 flex items-center justify-center text-sm" style="color: var(--color-outline)">…</span>
                <button
                  v-else
                  @click="currentPage = (p as number)"
                  class="w-9 h-9 rounded-full text-sm font-semibold transition-all"
                  :class="currentPage === p ? 'bg-primary text-white' : 'text-on-surface-variant hover:bg-surface-container-high'"
                >
                  {{ p }}
                </button>
              </template>

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
          <div class="p-8 rounded-2xl flex flex-col justify-between" style="background-color: var(--color-surface-container-low); height: 192px">
            <span class="material-symbols-outlined" style="color: var(--color-primary); font-size: 32px; width: 32px; height: 32px">badge</span>
            <div>
              <div class="text-3xl font-black" style="color: var(--color-on-surface)">{{ totalActive }}</div>
              <div class="text-xs font-bold uppercase tracking-widest mt-1" style="color: var(--color-outline)">Clientes Activos</div>
            </div>
          </div>

          <div class="p-8 rounded-2xl flex flex-col justify-between" style="background-color: var(--color-surface-container-low); height: 192px">
            <span class="material-symbols-outlined" style="color: var(--color-secondary); font-size: 32px; width: 32px; height: 32px">receipt_long</span>
            <div>
              <div class="text-3xl font-black" style="color: var(--color-on-surface)">{{ totalCount }}</div>
              <div class="text-xs font-bold uppercase tracking-widest mt-1" style="color: var(--color-outline)">Total Registros</div>
            </div>
          </div>
        </div>
      </div>
    </main>

    <!-- MODAL: CREAR CLIENTE -->
    <ClienteQuickCreateModal
      :show="showCreateModal"
      @close="showCreateModal = false"
      @created="onClienteCreado"
    />

    <!-- MODAL: EDITAR CLIENTE -->
    <BaseModal :show="showEditModal" title="Editar Cliente" size="lg" @close="showEditModal = false">
      <form @submit.prevent="submitEdit" class="space-y-5">
        <div
          v-if="editError"
          class="flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium"
          style="background-color: var(--color-error-container); color: var(--color-on-error-container)"
        >
          <span class="material-symbols-outlined" style="font-size: 18px">error</span>
          {{ editError }}
        </div>

        <div class="flex items-center gap-2">
          <span class="material-symbols-outlined" style="color: var(--color-primary); font-size: 18px">person</span>
          <h3 class="text-xs font-bold uppercase tracking-widest" style="color: var(--color-outline)">Datos personales</h3>
          <span class="text-xs font-medium tracking-wider ml-1" style="color: var(--color-outline)">· C.I. {{ editForm.ci }}</span>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div class="flex flex-col gap-1.5">
            <label class="text-xs font-bold uppercase tracking-wider" style="color: var(--color-outline)">Nombre *</label>
            <input
              v-model="editForm.firstName"
              type="text"
              class="px-4 h-12 text-sm outline-none appearance-none shadow-none transition-all"
              :style="inputStyle(!!editErrors.firstName)"
            />
            <p v-if="editErrors.firstName" class="text-xs font-medium" style="color: var(--color-error)">{{ editErrors.firstName }}</p>
          </div>
          <div class="flex flex-col gap-1.5">
            <label class="text-xs font-bold uppercase tracking-wider" style="color: var(--color-outline)">Apellido *</label>
            <input
              v-model="editForm.lastName"
              type="text"
              class="px-4 h-12 text-sm outline-none appearance-none shadow-none transition-all"
              :style="inputStyle(!!editErrors.lastName)"
            />
            <p v-if="editErrors.lastName" class="text-xs font-medium" style="color: var(--color-error)">{{ editErrors.lastName }}</p>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div class="flex flex-col gap-1.5">
            <label class="text-xs font-bold uppercase tracking-wider" style="color: var(--color-outline)">Fecha de Nacimiento *</label>
            <BirthDateInput v-model="editForm.birthDate" :has-error="!!editErrors.birthDate" />
            <p v-if="editErrors.birthDate" class="text-xs font-medium" style="color: var(--color-error)">{{ editErrors.birthDate }}</p>
          </div>
          <div class="flex flex-col gap-1.5">
            <label class="text-xs font-bold uppercase tracking-wider" style="color: var(--color-outline)">Sexo</label>
            <SearchableSelect
              :model-value="editForm.sexo || null"
              :options="SEXO_OPTIONS"
              :searchable="false"
              null-label="Sin especificar"
              @update:model-value="editForm.sexo = ($event as string) ?? ''"
            />
          </div>
        </div>

        <div v-if="editErrors.contact" class="flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium" style="background-color: #fff0c2; color: #7a5000">
          <span class="material-symbols-outlined" style="font-size: 18px">warning</span>
          {{ editErrors.contact }}
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div class="flex flex-col gap-1.5">
            <label class="text-xs font-bold uppercase tracking-wider" style="color: var(--color-outline)">Teléfono</label>
            <input
              v-model="editForm.phoneNumber"
              type="tel"
              class="px-4 h-12 text-sm outline-none appearance-none shadow-none transition-all"
              :style="inputStyle(!!editErrors.contact)"
            />
          </div>
          <div class="flex flex-col gap-1.5">
            <label class="text-xs font-bold uppercase tracking-wider" style="color: var(--color-outline)">Email</label>
            <input
              v-model="editForm.personEmail"
              type="email"
              class="px-4 h-12 text-sm outline-none appearance-none shadow-none transition-all"
              :style="inputStyle(!!editErrors.personEmail || !!editErrors.contact)"
            />
            <p v-if="editErrors.personEmail" class="text-xs font-medium" style="color: var(--color-error)">{{ editErrors.personEmail }}</p>
          </div>
        </div>

        <div class="flex items-center gap-2 pt-1">
          <span class="material-symbols-outlined" style="color: var(--color-primary); font-size: 18px">receipt_long</span>
          <h3 class="text-xs font-bold uppercase tracking-widest" style="color: var(--color-outline)">Datos de facturación</h3>
        </div>

        <div class="flex flex-col gap-1.5">
          <label class="text-xs font-bold uppercase tracking-wider" style="color: var(--color-outline)">Tipo de Facturación *</label>
          <SearchableSelect
            :model-value="editForm.tipoFacturacion"
            :options="TIPO_OPTIONS"
            :searchable="false"
            @update:model-value="editForm.tipoFacturacion = ($event as TipoFacturacion)"
          />
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div class="flex flex-col gap-1.5">
            <label class="text-xs font-bold uppercase tracking-wider" style="color: var(--color-outline)">
              Razón Social <span v-if="editForm.tipoFacturacion === 'Juridica'">*</span>
            </label>
            <input
              v-model="editForm.razonSocial"
              type="text"
              placeholder="Empresa S.A."
              class="px-4 h-12 text-sm outline-none appearance-none shadow-none transition-all"
              :style="inputStyle(!!editErrors.razonSocial)"
            />
            <p v-if="editErrors.razonSocial" class="text-xs font-medium" style="color: var(--color-error)">{{ editErrors.razonSocial }}</p>
          </div>
          <div class="flex flex-col gap-1.5">
            <label class="text-xs font-bold uppercase tracking-wider" style="color: var(--color-outline)">
              RUC / CI Fiscal <span v-if="editForm.tipoFacturacion === 'Juridica'">*</span>
            </label>
            <input
              v-model="editForm.rucCiFiscal"
              type="text"
              placeholder="80012345-6"
              class="px-4 h-12 text-sm outline-none appearance-none shadow-none transition-all"
              :style="inputStyle(!!editErrors.rucCiFiscal)"
            />
            <p v-if="editErrors.rucCiFiscal" class="text-xs font-medium" style="color: var(--color-error)">{{ editErrors.rucCiFiscal }}</p>
          </div>
        </div>

        <div class="flex flex-col gap-1.5">
          <label class="text-xs font-bold uppercase tracking-wider" style="color: var(--color-outline)">Dirección de Facturación</label>
          <input
            v-model="editForm.direccion"
            type="text"
            placeholder="Av. Mariscal López 1234, Asunción"
            class="px-4 h-12 text-sm outline-none appearance-none shadow-none transition-all"
            :style="inputStyle(false)"
          />
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div class="flex flex-col gap-1.5">
            <label class="text-xs font-bold uppercase tracking-wider" style="color: var(--color-outline)">Email de Facturación</label>
            <input
              v-model="editForm.email"
              type="email"
              placeholder="facturacion@empresa.com"
              class="px-4 h-12 text-sm outline-none appearance-none shadow-none transition-all"
              :style="inputStyle(!!editErrors.email)"
            />
            <p v-if="editErrors.email" class="text-xs font-medium" style="color: var(--color-error)">{{ editErrors.email }}</p>
          </div>
          <div class="flex flex-col gap-1.5">
            <label class="text-xs font-bold uppercase tracking-wider" style="color: var(--color-outline)">Teléfono de Facturación</label>
            <input
              v-model="editForm.telefono"
              type="tel"
              placeholder="0981234567"
              class="px-4 h-12 text-sm outline-none appearance-none shadow-none transition-all"
              :style="inputStyle(false)"
            />
          </div>
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

    <!-- MODAL: ACTIVAR / DESACTIVAR -->
    <BaseModal :show="showEstadoModal" size="sm" @close="showEstadoModal = false">
      <div class="text-center">
        <div
          class="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-5"
          :style="estadoActivar ? 'background-color: #DCFCE7' : 'background-color: var(--color-error-container)'"
        >
          <span class="material-symbols-outlined" style="font-size: 28px" :style="estadoActivar ? 'color: #16a34a' : 'color: var(--color-error)'">
            {{ estadoActivar ? "person_check" : "person_off" }}
          </span>
        </div>
        <h3 class="text-lg font-extrabold mb-1" style="color: var(--color-on-surface)">
          {{ estadoActivar ? "Activar cliente" : "Desactivar cliente" }}
        </h3>
        <p class="text-sm" style="color: var(--color-on-surface-variant)">
          ¿{{ estadoActivar ? "Activar" : "Desactivar" }} a
          <strong style="color: var(--color-on-surface)">{{ estadoTarget?.firstName }} {{ estadoTarget?.lastName }}</strong>?
          <template v-if="!estadoActivar"> El cliente dejará de aparecer en las búsquedas activas, pero sus datos se conservarán.</template>
        </p>

        <div
          v-if="estadoError"
          class="mt-4 flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium"
          style="background-color: var(--color-error-container); color: var(--color-on-error-container)"
        >
          <span class="material-symbols-outlined" style="font-size: 18px">error</span>
          {{ estadoError }}
        </div>
      </div>

      <template #footer>
        <BaseButton variant="secondary" class="flex-1" @click="showEstadoModal = false">Cancelar</BaseButton>
        <BaseButton :variant="estadoActivar ? 'primary' : 'danger'" class="flex-1" :disabled="isSavingEstado" @click="confirmEstado">
          <span v-if="isSavingEstado" class="material-symbols-outlined animate-spin" style="font-size: 18px">progress_activity</span>
          {{ isSavingEstado ? "Procesando..." : estadoActivar ? "Activar" : "Desactivar" }}
        </BaseButton>
      </template>
    </BaseModal>
  </div>
</template>
