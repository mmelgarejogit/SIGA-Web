<script setup lang="ts">
import { inputStyle } from "@/composables/useFieldStyles"
import { ref, computed, onMounted, reactive } from "vue"
import AppSidebar from "@/components/AppSidebar.vue"
import AppHeader from "@/components/AppHeader.vue"
import BaseButton from "@/components/BaseButton.vue"
import BaseModal from "@/components/BaseModal.vue"
import BaseTable from "@/components/BaseTable.vue"
import FilterChips from "@/components/FilterChips.vue"
import SearchInput from "@/components/SearchInput.vue"
import SearchableSelect from "@/components/SearchableSelect.vue"
import RowContextMenu, { type ContextMenuItem } from "@/components/RowContextMenu.vue"
import { useAuthStore } from "@/stores/auth"
import {
  type Proveedor,
  type CreateProveedorRequest,
  type CreateProveedorContactoRequest,
  getProveedores,
  createProveedor,
  updateProveedor,
  deactivateProveedor,
} from "@/services/inventarioService"
import { type Ciudad, getCiudades } from "@/services/ubicacionService"

const auth = useAuthStore()
const canManage = auth.hasPermission("gestionar_pedidos")

// ── Estado ─────────────────────────────────────────────────────────────────────

const proveedores = ref<Proveedor[]>([])
const ciudades = ref<Ciudad[]>([])
const isLoading = ref(false)
const loadError = ref("")

const ciudadOptions = computed(() =>
  ciudades.value.map(c => ({ value: c.id, label: `${c.nombre} — ${c.departamentoNombre}` })),
)

// Paginación
const currentPage = ref(1)
const totalCount  = ref(0)
const totalPages  = ref(1)
const PAGE_SIZE   = 10

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

// Filtros
const search      = ref("")
const estadoFilter = ref<string[]>([])

const estadoOptions = [
  { value: "activo",   label: "Activo",   dot: "var(--color-success)" },
  { value: "inactivo", label: "Inactivo", dot: "var(--color-outline)" },
]

const columns = [
  { key: "nombre",    label: "Proveedor" },
  { key: "ruc",       label: "RUC" },
  { key: "ciudad",    label: "Ciudad" },
  { key: "contactos", label: "Contactos" },
  { key: "estado",    label: "Estado" },
  { key: "acciones",  label: "", align: "right" as const },
]

function resolveIsActive(): boolean | undefined {
  if (estadoFilter.value.includes("activo") && !estadoFilter.value.includes("inactivo")) return true
  if (estadoFilter.value.includes("inactivo") && !estadoFilter.value.includes("activo")) return false
  return undefined
}

async function load() {
  isLoading.value = true
  loadError.value = ""
  try {
    const result = await getProveedores({
      page:     currentPage.value,
      pageSize: PAGE_SIZE,
      search:   search.value || undefined,
      isActive: resolveIsActive(),
    })
    proveedores.value = result.items
    totalCount.value  = result.totalCount
    totalPages.value  = result.totalPages
  } catch (err: unknown) {
    loadError.value = err instanceof Error ? err.message : "Error al cargar proveedores."
  } finally {
    isLoading.value = false
  }
}

function onSearch(val: string) {
  search.value = val
  currentPage.value = 1
  load()
}

function onEstadoChange(val: string[]) {
  estadoFilter.value = val
  currentPage.value = 1
  load()
}


onMounted(async () => {
  await load()
  try {
    ciudades.value = await getCiudades(undefined, true)
  } catch {
    // El listado de ciudades es complementario; no bloquea la vista
  }
})

function rowMenuItems(item: Proveedor): ContextMenuItem[] {
  return [
    {
      type: "item",
      label: "Editar",
      icon: "edit",
      action: () => openEdit(item),
    },
    { type: "separator" },
    {
      type: "item",
      label: item.isActive ? "Desactivar" : "Activar",
      icon: item.isActive ? "person_off" : "person",
      danger: item.isActive,
      action: () => openDeactivate(item),
      hidden: !canManage,
    },
  ]
}

// ── Modal Crear / Editar ───────────────────────────────────────────────────────

const showModal = ref(false)
const isSaving = ref(false)
const modalError = ref("")
const editingProveedor = ref<Proveedor | null>(null)

interface ContactoForm {
  nombre: string
  cargo: string
  telefono: string
  email: string
}

const emptyContacto = (): ContactoForm => ({ nombre: "", cargo: "", telefono: "", email: "" })

const emptyForm = (): CreateProveedorRequest => ({
  nombre: "",
  razonSocial: "",
  ruc: "",
  direccion: "",
  ciudadId: null,
  sitioWeb: "",
  facebook: "",
  instagram: "",
  whatsApp: "",
  esLaboratorio: false,
  contactos: [],
})

const form = reactive<CreateProveedorRequest>(emptyForm())
const contactoRows = ref<ContactoForm[]>([])

function addContacto() {
  contactoRows.value.push(emptyContacto())
}

function removeContacto(i: number) {
  if (contactoRows.value.length > 1) contactoRows.value.splice(i, 1)
}

function openCreate() {
  editingProveedor.value = null
  Object.assign(form, emptyForm())
  contactoRows.value = [emptyContacto()]
  modalError.value = ""
  showModal.value = true
}

function openEdit(p: Proveedor) {
  editingProveedor.value = p
  Object.assign(form, {
    nombre:     p.nombre,
    razonSocial: p.razonSocial ?? "",
    ruc:        p.ruc,
    direccion:  p.direccion ?? "",
    ciudadId:   p.ciudadId,
    sitioWeb:   p.sitioWeb ?? "",
    facebook:   p.facebook ?? "",
    instagram:  p.instagram ?? "",
    whatsApp:   p.whatsApp ?? "",
    contactos:  [],
  })
  contactoRows.value = p.contactos.length > 0
    ? p.contactos.map(c => ({
        nombre:   c.nombre,
        cargo:    c.cargo ?? "",
        telefono: c.telefono ?? "",
        email:    c.email ?? "",
      }))
    : [emptyContacto()]
  modalError.value = ""
  showModal.value = true
}

async function submit() {
  modalError.value = ""
  if (!form.nombre?.trim()) { modalError.value = "El nombre es obligatorio."; return }
  if (!form.ruc?.trim()) { modalError.value = "El RUC es obligatorio."; return }
  if (!/^\d{1,8}-\d$/.test(form.ruc.trim())) { modalError.value = "RUC inválido. Formato: 80012345-6"; return }

  const contactosValidos = contactoRows.value.filter(c => c.nombre.trim())
  if (contactosValidos.length === 0) {
    modalError.value = "Debe registrar al menos un contacto con nombre."
    return
  }
  const payload: CreateProveedorRequest = {
    nombre:     form.nombre!.trim(),
    razonSocial: (form.razonSocial as string)?.trim() || undefined,
    ruc:        form.ruc!.trim(),
    direccion:  (form.direccion as string)?.trim() || undefined,
    ciudadId:   form.ciudadId ?? null,
    sitioWeb:   (form.sitioWeb as string)?.trim() || undefined,
    facebook:   (form.facebook as string)?.trim() || undefined,
    instagram:  (form.instagram as string)?.trim() || undefined,
    whatsApp:      (form.whatsApp as string)?.trim() || undefined,
    esLaboratorio: form.esLaboratorio ?? false,
    contactos:     contactosValidos.map(c => ({
      nombre:   c.nombre.trim(),
      cargo:    c.cargo.trim() || undefined,
      telefono: c.telefono.trim() || undefined,
      email:    c.email.trim() || undefined,
    } as CreateProveedorContactoRequest)),
  }

  isSaving.value = true
  try {
    if (editingProveedor.value) {
      await updateProveedor(editingProveedor.value.id, payload)
    } else {
      await createProveedor(payload)
    }
    showModal.value = false
    await load()
  } catch (err: unknown) {
    modalError.value = err instanceof Error ? err.message : "Error al guardar proveedor."
  } finally {
    isSaving.value = false
  }
}

// ── Modal Desactivar ──────────────────────────────────────────────────────────

const showDeactivateModal = ref(false)
const proveedorToDeactivate = ref<Proveedor | null>(null)
const isDeactivating = ref(false)
const deactivateError = ref("")

function openDeactivate(p: Proveedor) {
  proveedorToDeactivate.value = p
  deactivateError.value = ""
  showDeactivateModal.value = true
}

async function confirmDeactivate() {
  if (!proveedorToDeactivate.value) return
  isDeactivating.value = true
  deactivateError.value = ""
  try {
    await deactivateProveedor(proveedorToDeactivate.value.id)
    showDeactivateModal.value = false
    await load()
  } catch (err: unknown) {
    deactivateError.value = err instanceof Error ? err.message : "Error al desactivar."
  } finally {
    isDeactivating.value = false
  }
}
</script>

<template>
  <div class="min-h-screen" style="background-color: var(--color-background)">
    <AppSidebar />
    <AppHeader />

    <main style="margin-left: var(--sidebar-width); transition: margin-left 0.25s ease; padding-top: 64px">
      <div class="p-4 sm:p-6 lg:p-8">

        <!-- Header -->
        <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-8">
          <div>
            <h1 class="text-4xl font-extrabold tracking-tight mb-2">Proveedores</h1>
            <p class="font-medium" style="color: var(--color-on-surface-variant)">
              {{ totalCount }} proveedor{{ totalCount !== 1 ? "es" : "" }}
            </p>
          </div>
          <BaseButton v-if="canManage" variant="primary" size="lg" @click="openCreate">
            <span class="material-symbols-outlined" style="width:20px;height:20px;font-size:20px">add</span>
            Nuevo Proveedor
          </BaseButton>
        </div>

        <!-- Filtros -->
        <div class="flex items-center justify-between gap-4 mb-8 flex-wrap">
          <div class="flex items-center gap-3 flex-wrap">
            <FilterChips
              :model-value="estadoFilter"
              :options="estadoOptions"
              placeholder="Estado"
              @update:model-value="onEstadoChange"
            />
          </div>
          <SearchInput
            :model-value="search"
            placeholder="Buscar por nombre, RUC…"
            class="w-full sm:w-72"
            @update:model-value="onSearch"
          />
        </div>

        <!-- Error -->
        <div v-if="loadError" class="flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium mb-6"
          style="background-color: var(--color-error-container); color: var(--color-on-error-container)">
          <span class="material-symbols-outlined" style="font-size: 18px">error</span>
          {{ loadError }}
        </div>

        <!-- Tabla -->
        <div class="rounded-lg overflow-hidden" style="background-color: var(--color-surface-container-lowest); box-shadow: var(--shadow-sm); outline: 1px solid var(--color-hairline);">
        <BaseTable :columns="columns" :items="proveedores" :loading="isLoading"
          empty-text="No hay proveedores registrados.">

          <template #nombre="{ item }">
            <div>
              <p class="text-sm font-semibold" style="color: var(--color-on-surface)">{{ item.nombre }}</p>
              <p v-if="item.razonSocial" class="text-xs" style="color: var(--color-outline)">{{ item.razonSocial }}</p>
            </div>
          </template>

          <template #ruc="{ item }">
            <span class="text-sm font-mono" style="color: var(--color-on-surface-variant)">{{ item.ruc || "—" }}</span>
          </template>

          <template #ciudad="{ item }">
            <div v-if="item.ciudadNombre">
              <p class="text-sm" style="color: var(--color-on-surface-variant)">{{ item.ciudadNombre }}</p>
              <p v-if="item.departamentoNombre" class="text-xs" style="color: var(--color-outline)">{{ item.departamentoNombre }}</p>
            </div>
            <span v-else class="text-sm" style="color: var(--color-outline)">—</span>
          </template>

          <template #contactos="{ item }">
            <span v-if="item.contactos.length > 0"
              class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold"
              style="background-color: var(--color-surface-container-high); color: var(--color-on-surface-variant)">
              <span class="material-symbols-outlined" style="font-size: 13px">person</span>
              {{ item.contactos.length }}
            </span>
            <span v-else class="text-sm" style="color: var(--color-outline)">—</span>
          </template>

          <template #estado="{ item }">
            <span
              class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold"
              :style="item.isActive
                ? 'background-color: var(--color-success-container); color: var(--color-on-success-container)'
                : 'background-color: var(--color-surface-container-high); color: var(--color-outline)'"
            >{{ item.isActive ? "Activo" : "Inactivo" }}</span>
          </template>

          <template #acciones="{ item }">
            <div class="flex items-center justify-end">
              <RowContextMenu v-if="canManage" :items="rowMenuItems(item)" />
            </div>
          </template>
        </BaseTable>

          <!-- Footer: conteo + paginador -->
          <div
            v-if="proveedores.length > 0"
            class="px-6 py-4 flex items-center justify-between flex-wrap gap-4"
            style="border-top: 1px solid var(--color-hairline-soft); background-color: var(--color-surface-container-lowest);"
          >
            <span class="text-sm" style="color: var(--color-on-surface-variant)">
              Mostrando
              <strong style="color: var(--color-on-surface)">{{ rangeStart }}–{{ rangeEnd }}</strong>
              de
              <strong style="color: var(--color-on-surface)">{{ totalCount }}</strong>
              proveedores
            </span>
            <div v-if="totalPages > 1" class="flex items-center gap-1">
              <button
                @click="currentPage--; load()"
                :disabled="currentPage === 1"
                class="w-9 h-9 rounded-full flex items-center justify-center transition-all disabled:opacity-30 hover:bg-surface-container-high"
                style="color: var(--color-on-surface-variant)"
              ><span class="material-symbols-outlined" style="font-size: 18px">chevron_left</span></button>
              <template v-for="p in visiblePages" :key="p">
                <span v-if="p === '...'" class="w-9 h-9 flex items-center justify-center text-sm" style="color: var(--color-outline)">…</span>
                <button
                  v-else
                  @click="currentPage = (p as number); load()"
                  class="w-9 h-9 rounded-full text-sm font-semibold transition-all"
                  :class="currentPage === p ? 'bg-primary text-on-primary' : 'text-on-surface-variant hover:bg-surface-container-high'"
                >{{ p }}</button>
              </template>
              <button
                @click="currentPage++; load()"
                :disabled="currentPage === totalPages"
                class="w-9 h-9 rounded-full flex items-center justify-center transition-all disabled:opacity-30 hover:bg-surface-container-high"
                style="color: var(--color-on-surface-variant)"
              ><span class="material-symbols-outlined" style="font-size: 18px">chevron_right</span></button>
            </div>
          </div>
        </div>

      </div>
    </main>

    <!-- ── MODAL CREAR / EDITAR ───────────────────────────────────────────────── -->
    <BaseModal
      :show="showModal"
      :title="editingProveedor ? 'Editar Proveedor' : 'Nuevo Proveedor'"
      size="lg"
      @close="showModal = false"
    >
      <div v-if="modalError" class="flex items-center gap-2 rounded-2xl px-4 py-3 mb-4 text-sm font-medium"
        style="background-color: var(--color-error-container); color: var(--color-on-error-container)">
        <span class="material-symbols-outlined flex-shrink-0" style="font-size: 18px">error</span>
        {{ modalError }}
      </div>

      <div class="space-y-4">

        <!-- Nombre -->
        <div>
          <label class="block text-xs font-bold uppercase tracking-wider mb-1.5" style="color: var(--color-outline)">Nombre comercial *</label>
          <input v-model="form.nombre" type="text" class="w-full px-4 h-12 text-sm outline-none appearance-none shadow-none transition-all"
            :style="inputStyle(false)" />
        </div>

        <!-- Datos fiscales -->
        <p class="text-xs font-bold uppercase tracking-wider pt-2" style="color: var(--color-primary)">Datos fiscales</p>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label class="block text-xs font-bold uppercase tracking-wider mb-1.5" style="color: var(--color-outline)">RUC *</label>
            <input v-model="form.ruc" type="text" placeholder="80012345-6" class="w-full px-4 h-12 text-sm outline-none appearance-none shadow-none transition-all font-mono"
              :style="inputStyle(false)" />
          </div>
          <div>
            <label class="block text-xs font-bold uppercase tracking-wider mb-1.5" style="color: var(--color-outline)">Razón social</label>
            <input v-model="form.razonSocial" type="text" class="w-full px-4 h-12 text-sm outline-none appearance-none shadow-none transition-all"
              :style="inputStyle(false)" />
          </div>
        </div>

        <!-- Ubicación -->
        <p class="text-xs font-bold uppercase tracking-wider pt-2" style="color: var(--color-primary)">Ubicación</p>

        <div>
          <label class="block text-xs font-bold uppercase tracking-wider mb-1.5" style="color: var(--color-outline)">Dirección</label>
          <input v-model="form.direccion" type="text" class="w-full px-4 h-12 text-sm outline-none appearance-none shadow-none transition-all"
            :style="inputStyle(false)" />
        </div>
        <div>
          <label class="block text-xs font-bold uppercase tracking-wider mb-1.5" style="color: var(--color-outline)">Ciudad</label>
          <SearchableSelect
            :model-value="form.ciudadId ?? null"
            :options="ciudadOptions"
            null-label="Sin ciudad"
            placeholder="Seleccioná una ciudad"
            @update:model-value="form.ciudadId = $event as number | null"
          />
        </div>

        <!-- Redes sociales -->
        <p class="text-xs font-bold uppercase tracking-wider pt-2" style="color: var(--color-primary)">Redes y contacto digital</p>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label class="block text-xs font-bold uppercase tracking-wider mb-1.5" style="color: var(--color-outline)">Sitio web</label>
            <input v-model="form.sitioWeb" type="url" placeholder="https://..." class="w-full px-4 h-12 text-sm outline-none appearance-none shadow-none transition-all"
              :style="inputStyle(false)" />
          </div>
          <div>
            <label class="block text-xs font-bold uppercase tracking-wider mb-1.5" style="color: var(--color-outline)">WhatsApp</label>
            <input v-model="form.whatsApp" type="text" placeholder="+595 9xx xxxxxx" class="w-full px-4 h-12 text-sm outline-none appearance-none shadow-none transition-all"
              :style="inputStyle(false)" />
          </div>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label class="block text-xs font-bold uppercase tracking-wider mb-1.5" style="color: var(--color-outline)">Facebook</label>
            <input v-model="form.facebook" type="text" placeholder="@usuario o URL" class="w-full px-4 h-12 text-sm outline-none appearance-none shadow-none transition-all"
              :style="inputStyle(false)" />
          </div>
          <div>
            <label class="block text-xs font-bold uppercase tracking-wider mb-1.5" style="color: var(--color-outline)">Instagram</label>
            <input v-model="form.instagram" type="text" placeholder="@usuario" class="w-full px-4 h-12 text-sm outline-none appearance-none shadow-none transition-all"
              :style="inputStyle(false)" />
          </div>
        </div>

        <!-- Es laboratorio -->
        <div>
          <button
            type="button"
            @click="form.esLaboratorio = !form.esLaboratorio"
            class="flex items-center gap-3 w-full px-4 py-3 rounded-xl transition-all"
            :style="form.esLaboratorio
              ? 'background:var(--color-success-container); border: 1.5px solid var(--color-success);'
              : 'background:var(--color-surface-container-low); border: 1px solid var(--color-outline-variant);'"
          >
            <span
              class="material-symbols-outlined"
              :style="`font-size: 22px; color: ${form.esLaboratorio ? 'var(--color-on-success-container)' : 'var(--color-outline)'}`"
            >{{ form.esLaboratorio ? 'check_box' : 'check_box_outline_blank' }}</span>
            <div class="text-left">
              <p class="text-sm font-semibold" :style="`color: ${form.esLaboratorio ? 'var(--color-on-success-container)' : 'var(--color-on-surface)'}`">
                Es laboratorio óptico
              </p>
              <p class="text-xs" style="color: var(--color-on-surface-variant)">
                Aparecerá disponible al asignar laboratorio en trabajos a pedido
              </p>
            </div>
          </button>
        </div>

        <!-- Contactos -->
        <div class="flex items-center justify-between pt-2">
          <p class="text-xs font-bold uppercase tracking-wider" style="color: var(--color-primary)">Contactos</p>
          <button
            type="button"
            @click="addContacto"
            class="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
            style="background-color: color-mix(in srgb, var(--color-primary) 10%, transparent); color: var(--color-primary)"
          >
            <span class="material-symbols-outlined" style="font-size: 15px">add</span>
            Agregar contacto
          </button>
        </div>

        <!-- Tabla de contactos -->
        <div v-if="contactoRows.length > 0"
          class="rounded-lg overflow-hidden"
          style="border: 1px solid var(--color-outline-variant)">
          <!-- Header -->
          <div class="grid grid-cols-[1fr_1fr_1fr_1fr_auto] gap-0"
            style="background-color: var(--color-surface-container-low); border-bottom: 1px solid var(--color-outline-variant)">
            <div class="px-3 py-2 text-xs font-bold uppercase tracking-wider" style="color: var(--color-outline)">Nombre *</div>
            <div class="px-3 py-2 text-xs font-bold uppercase tracking-wider" style="color: var(--color-outline)">Cargo</div>
            <div class="px-3 py-2 text-xs font-bold uppercase tracking-wider" style="color: var(--color-outline)">Teléfono</div>
            <div class="px-3 py-2 text-xs font-bold uppercase tracking-wider" style="color: var(--color-outline)">Email</div>
            <div class="px-3 py-2"></div>
          </div>
          <!-- Filas -->
          <div
            v-for="(c, i) in contactoRows"
            :key="i"
            class="grid grid-cols-[1fr_1fr_1fr_1fr_auto] gap-0 items-center"
            :style="i < contactoRows.length - 1 ? 'border-bottom: 1px solid var(--color-hairline)' : ''"
          >
            <div class="px-2 py-2">
              <input
                v-model="c.nombre"
                type="text"
                placeholder="Nombre"
                class="w-full px-2.5 py-2 appearance-none shadow-none text-sm outline-none"
                :style="inputStyle(false)"
              />
            </div>
            <div class="px-2 py-2">
              <input
                v-model="c.cargo"
                type="text"
                placeholder="Cargo"
                class="w-full px-2.5 py-2 appearance-none shadow-none text-sm outline-none"
                :style="inputStyle(false)"
              />
            </div>
            <div class="px-2 py-2">
              <input
                v-model="c.telefono"
                type="text"
                placeholder="Teléfono"
                class="w-full px-2.5 py-2 appearance-none shadow-none text-sm outline-none"
                :style="inputStyle(false)"
              />
            </div>
            <div class="px-2 py-2">
              <input
                v-model="c.email"
                type="email"
                placeholder="Email"
                class="w-full px-2.5 py-2 appearance-none shadow-none text-sm outline-none"
                :style="inputStyle(false)"
              />
            </div>
            <div class="px-2 py-2 flex justify-center">
              <button
                type="button"
                @click="removeContacto(i)"
                :disabled="contactoRows.length === 1"
                class="w-7 h-7 rounded-full flex items-center justify-center transition-all hover:scale-105 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed"
                style="background-color: var(--color-error-container)"
                title="Quitar contacto"
              >
                <span class="material-symbols-outlined" style="font-size: 15px; color: var(--color-error)">close</span>
              </button>
            </div>
          </div>
        </div>


      </div>

      <template #footer>
        <div class="flex justify-between w-full">
          <BaseButton variant="secondary" @click="showModal = false">Cancelar</BaseButton>
          <BaseButton variant="primary" :disabled="isSaving" @click="submit">
            <span v-if="isSaving" class="material-symbols-outlined animate-spin" style="font-size: 18px">progress_activity</span>
            {{ isSaving ? "Guardando..." : editingProveedor ? "Guardar Cambios" : "Crear Proveedor" }}
          </BaseButton>
        </div>
      </template>
    </BaseModal>

    <!-- ── MODAL DESACTIVAR ───────────────────────────────────────────────────── -->
    <BaseModal :show="showDeactivateModal" size="sm" @close="showDeactivateModal = false">
      <div class="text-center">
        <div class="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4"
          style="background-color: var(--color-error-container)">
          <span class="material-symbols-outlined" style="color: var(--color-error); font-size: 28px">person_off</span>
        </div>
        <h3 class="text-lg font-extrabold mb-2" style="color: var(--color-on-surface)">Desactivar Proveedor</h3>
        <p class="text-sm" style="color: var(--color-on-surface-variant)">
          ¿Desactivar <strong style="color: var(--color-on-surface)">{{ proveedorToDeactivate?.nombre }}</strong>?
          El proveedor quedará inactivo pero sus datos se conservarán.
        </p>
        <p v-if="deactivateError" class="mt-3 text-sm font-medium" style="color: var(--color-error)">{{ deactivateError }}</p>
      </div>
      <template #footer>
        <div class="flex justify-between w-full">
          <BaseButton variant="secondary" @click="showDeactivateModal = false">Cancelar</BaseButton>
          <BaseButton variant="danger" :disabled="isDeactivating" @click="confirmDeactivate">
            <span v-if="isDeactivating" class="material-symbols-outlined animate-spin" style="font-size: 18px">progress_activity</span>
            {{ isDeactivating ? "Desactivando..." : "Desactivar" }}
          </BaseButton>
        </div>
      </template>
    </BaseModal>
  </div>
</template>
