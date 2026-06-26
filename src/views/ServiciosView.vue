<script setup lang="ts">
import { ref, computed, onMounted, reactive } from "vue"
import AppSidebar from "@/components/AppSidebar.vue"
import AppHeader from "@/components/AppHeader.vue"
import BaseButton from "@/components/BaseButton.vue"
import BaseModal from "@/components/BaseModal.vue"
import BaseTable from "@/components/BaseTable.vue"
import FilterChips from "@/components/FilterChips.vue"
import RowContextMenu, { type ContextMenuItem } from "@/components/RowContextMenu.vue"
import SearchableSelect from "@/components/SearchableSelect.vue"
import { useAuthStore } from "@/stores/auth"
import { http } from "@/api/http"
import {
  type Servicio,
  type ServicioTarifa,
  type CreateServicioRequest,
  type UpdateServicioRequest,
  getServicios,
  createServicio,
  updateServicio,
  deactivateServicio,
  addServicioTarifa,
  removeServicioTarifa,
} from "@/services/ventasService"
import { type Especialidad, getEspecialidades } from "@/services/especialidadService"

const auth      = useAuthStore()
const canManage = auth.hasPermission("gestionar_ventas")

const formatPrice = (n: number) =>
  new Intl.NumberFormat("es-PY", { style: "currency", currency: "PYG", maximumFractionDigits: 0 }).format(n)

// ── Estado ─────────────────────────────────────────────────────────────────────

const items     = ref<Servicio[]>([])
const isLoading = ref(false)
const loadError = ref("")
const estadoFilter = ref<string[]>([])

const estadoOptions = [
  { value: "activo",   label: "Activos",   dot: "var(--color-on-success-container)" },
  { value: "inactivo", label: "Inactivos", dot: "var(--color-outline)" },
]

const itemsFiltrados = computed(() => {
  currentPage.value = 1
  if (!estadoFilter.value.length) return items.value
  const activo   = estadoFilter.value.includes("activo")
  const inactivo = estadoFilter.value.includes("inactivo")
  if (activo && inactivo) return items.value
  return items.value.filter(i => activo ? i.isActive : !i.isActive)
})

// ── Paginación ─────────────────────────────────────────────────────────────────

const PAGE_SIZE   = 10
const currentPage = ref(1)

const itemsPaginados = computed(() => {
  const start = (currentPage.value - 1) * PAGE_SIZE
  return itemsFiltrados.value.slice(start, start + PAGE_SIZE)
})

const totalCount  = computed(() => itemsFiltrados.value.length)
const totalPages  = computed(() => Math.max(1, Math.ceil(totalCount.value / PAGE_SIZE)))
const rangeStart  = computed(() => totalCount.value === 0 ? 0 : (currentPage.value - 1) * PAGE_SIZE + 1)
const rangeEnd    = computed(() => Math.min(currentPage.value * PAGE_SIZE, totalCount.value))

const visiblePages = computed(() => {
  const total = totalPages.value
  const cur   = currentPage.value
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const pages: (number | "...")[] = [1]
  if (cur > 3) pages.push("...")
  for (let p = Math.max(2, cur - 1); p <= Math.min(total - 1, cur + 1); p++) pages.push(p)
  if (cur < total - 2) pages.push("...")
  pages.push(total)
  return pages
})

const columns = [
  { key: "nombre",   label: "Servicio" },
  { key: "precio",   label: "Precio" },
  { key: "estado",   label: "Estado" },
  { key: "acciones", label: "", align: "right" as const },
]

async function load() {
  isLoading.value = true
  loadError.value = ""
  try {
    items.value = await getServicios()
  } catch (err: unknown) {
    loadError.value = err instanceof Error ? err.message : "Error al cargar servicios."
  } finally {
    isLoading.value = false
  }
}

onMounted(load)

// ── Context menu ───────────────────────────────────────────────────────────────

function menuItems(item: Servicio): ContextMenuItem[] {
  return [
    ...(canManage ? [
      { type: "item" as const, label: "Editar", icon: "edit", action: () => openEdit(item) },
      { type: "item" as const, label: "Tarifas por profesional", icon: "sell", action: () => openTarifas(item) },
    ] : []),
    ...(canManage && item.isActive ? [
      { type: "separator" as const },
      { type: "item" as const, label: "Desactivar", icon: "delete", action: () => openDeactivate(item), danger: true },
    ] : []),
  ]
}

// ── Modal Crear ────────────────────────────────────────────────────────────────

const showCreate  = ref(false)
const isSaving    = ref(false)
const createError = ref("")
const createForm  = reactive<CreateServicioRequest>({ nombre: "", descripcion: "", precio: 0 })

function openCreate() {
  Object.assign(createForm, { nombre: "", descripcion: "", precio: 0 })
  createError.value = ""
  showCreate.value  = true
}

async function submitCreate() {
  createError.value = ""
  if (!createForm.nombre.trim()) { createError.value = "El nombre es obligatorio."; return }
  if (createForm.precio < 0) { createError.value = "El precio no puede ser negativo."; return }
  isSaving.value = true
  try {
    await createServicio({
      nombre: createForm.nombre.trim(),
      descripcion: createForm.descripcion?.trim() || undefined,
      precio: createForm.precio,
    })
    showCreate.value = false
    await load()
  } catch (err: unknown) {
    createError.value = err instanceof Error ? err.message : "Error al crear servicio."
  } finally {
    isSaving.value = false
  }
}

// ── Modal Editar ───────────────────────────────────────────────────────────────

const showEdit     = ref(false)
const isEditSaving = ref(false)
const editError    = ref("")
const editingItem  = ref<Servicio | null>(null)
const editForm     = reactive<UpdateServicioRequest>({ nombre: "", descripcion: "", precio: 0, isActive: true })

function openEdit(item: Servicio) {
  editingItem.value = item
  Object.assign(editForm, { nombre: item.nombre, descripcion: item.descripcion ?? "", precio: item.precio, isActive: item.isActive })
  editError.value = ""
  showEdit.value  = true
}

async function submitEdit() {
  editError.value = ""
  if (!editForm.nombre.trim()) { editError.value = "El nombre es obligatorio."; return }
  if (editForm.precio < 0) { editError.value = "El precio no puede ser negativo."; return }
  if (!editingItem.value) return
  isEditSaving.value = true
  try {
    await updateServicio(editingItem.value.id, {
      nombre: editForm.nombre.trim(),
      descripcion: editForm.descripcion?.trim() || undefined,
      precio: editForm.precio,
      isActive: editForm.isActive,
    })
    showEdit.value = false
    await load()
  } catch (err: unknown) {
    editError.value = err instanceof Error ? err.message : "Error al actualizar servicio."
  } finally {
    isEditSaving.value = false
  }
}

// ── Modal Desactivar ───────────────────────────────────────────────────────────

const showDeactivate   = ref(false)
const isDeactivating   = ref(false)
const deactivateError  = ref("")
const deactivatingItem = ref<Servicio | null>(null)

function openDeactivate(item: Servicio) {
  deactivatingItem.value = item
  deactivateError.value  = ""
  showDeactivate.value   = true
}

async function confirmDeactivate() {
  if (!deactivatingItem.value) return
  isDeactivating.value  = true
  deactivateError.value = ""
  try {
    await deactivateServicio(deactivatingItem.value.id)
    showDeactivate.value = false
    await load()
  } catch (err: unknown) {
    deactivateError.value = err instanceof Error ? err.message : "Error al desactivar."
  } finally {
    isDeactivating.value = false
  }
}

// ── Profesionales y especialidades (para tarifas) ────────────────────────────────

interface ProfLite { id: number; firstName: string; lastName: string; isActive: boolean }
const profesionales  = ref<ProfLite[]>([])
const especialidades = ref<Especialidad[]>([])

const profesionalOptions  = computed(() => profesionales.value.map(p => ({ value: p.id, label: `${p.firstName} ${p.lastName}` })))
const especialidadOptions = computed(() => especialidades.value.map(e => ({ value: e.id, label: e.nombre })))

async function loadAux() {
  try {
    const { data } = await http.get<{ items: ProfLite[] }>("/api/professionals?pageSize=200")
    profesionales.value = (data.items ?? []).filter(p => p.isActive)
  } catch { /* no crítico */ }
  try {
    especialidades.value = await getEspecialidades()
  } catch { /* no crítico */ }
}

onMounted(loadAux)

// ── Modal Tarifas ────────────────────────────────────────────────────────────────

const showTarifas    = ref(false)
const tarifaServicio = ref<Servicio | null>(null)
const tarifaError    = ref("")
const isAddingTarifa = ref(false)
const removingTarifaId = ref<number | null>(null)

const tarifaScope = ref<"Profesional" | "Especialidad">("Profesional")
const tarifaProfesionalId  = ref<number | null>(null)
const tarifaEspecialidadId = ref<number | null>(null)
const tarifaPrecio = ref<number>(0)

function openTarifas(item: Servicio) {
  tarifaServicio.value = item
  tarifaError.value = ""
  tarifaScope.value = "Profesional"
  tarifaProfesionalId.value = null
  tarifaEspecialidadId.value = null
  tarifaPrecio.value = 0
  showTarifas.value = true
}

function scopeLabel(t: ServicioTarifa) {
  if (t.professionalId) return t.professionalNombre ?? "Profesional"
  if (t.especialidadId) return t.especialidadNombre ?? "Especialidad"
  return "—"
}

async function submitAddTarifa() {
  tarifaError.value = ""
  if (!tarifaServicio.value) return
  const esProf = tarifaScope.value === "Profesional"
  if (esProf && !tarifaProfesionalId.value) { tarifaError.value = "Elegí un profesional."; return }
  if (!esProf && !tarifaEspecialidadId.value) { tarifaError.value = "Elegí una especialidad."; return }
  if (tarifaPrecio.value < 0) { tarifaError.value = "El precio no puede ser negativo."; return }
  isAddingTarifa.value = true
  try {
    const actualizado = await addServicioTarifa(tarifaServicio.value.id, {
      professionalId:  esProf ? tarifaProfesionalId.value! : undefined,
      especialidadId: !esProf ? tarifaEspecialidadId.value! : undefined,
      precio: tarifaPrecio.value,
    })
    tarifaServicio.value = actualizado
    const idx = items.value.findIndex(s => s.id === actualizado.id)
    if (idx !== -1) items.value[idx] = actualizado
    tarifaProfesionalId.value = null
    tarifaEspecialidadId.value = null
    tarifaPrecio.value = 0
  } catch (err: unknown) {
    tarifaError.value = err instanceof Error ? err.message : "Error al agregar la tarifa."
  } finally {
    isAddingTarifa.value = false
  }
}

async function quitarTarifa(t: ServicioTarifa) {
  if (!tarifaServicio.value) return
  removingTarifaId.value = t.id
  tarifaError.value = ""
  try {
    await removeServicioTarifa(t.id)
    tarifaServicio.value.tarifas = tarifaServicio.value.tarifas.filter(x => x.id !== t.id)
    const idx = items.value.findIndex(s => s.id === tarifaServicio.value!.id)
    if (idx !== -1) items.value[idx] = { ...tarifaServicio.value }
  } catch (err: unknown) {
    tarifaError.value = err instanceof Error ? err.message : "Error al quitar la tarifa."
  } finally {
    removingTarifaId.value = null
  }
}
</script>

<template>
  <div class="min-h-screen" style="background-color: var(--color-background)">
    <AppSidebar />
    <AppHeader />
    <main style="margin-left: var(--sidebar-width); padding-top: 64px">
      <div class="p-8">

        <!-- Header -->
        <div class="flex items-start justify-between mb-8">
          <div>
            <h1 class="text-4xl font-extrabold tracking-tight mb-2" style="color: var(--color-on-surface)">Servicios</h1>
            <p class="font-medium" style="color: var(--color-on-surface-variant)">
              {{ items.filter(i => i.isActive).length }} servicio{{ items.filter(i => i.isActive).length !== 1 ? "s" : "" }} activo{{ items.filter(i => i.isActive).length !== 1 ? "s" : "" }}
            </p>
          </div>
          <BaseButton v-if="canManage" variant="primary" size="lg" @click="openCreate">
            <span class="material-symbols-outlined" style="font-size: 20px">add</span>
            Nuevo Servicio
          </BaseButton>
        </div>

        <!-- Filtros -->
        <div class="flex items-center gap-3 mb-6">
          <FilterChips :model-value="estadoFilter" :options="estadoOptions" placeholder="Estado" @update:model-value="estadoFilter = $event" />
        </div>

        <!-- Error -->
        <div v-if="loadError" class="flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium mb-6"
          style="background-color: var(--color-error-container); color: var(--color-on-error-container)">
          <span class="material-symbols-outlined" style="font-size: 18px">error</span>
          {{ loadError }}
        </div>

        <!-- Tabla -->
        <div class="rounded-2xl overflow-hidden" style="background-color: var(--color-surface-container-lowest); box-shadow: var(--shadow-sm); outline: 1px solid var(--color-hairline)">
          <BaseTable :columns="columns" :items="itemsPaginados" :loading="isLoading" empty-text="No hay servicios registrados.">
            <template #nombre="{ item }">
              <div class="flex items-center gap-3">
                <div class="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style="background-color: var(--color-primary-container)">
                  <span class="material-symbols-outlined" style="font-size: 18px; color: white">medical_services</span>
                </div>
                <div class="min-w-0">
                  <span class="text-sm font-semibold block truncate" style="color: var(--color-on-surface)">{{ item.nombre }}</span>
                  <span v-if="item.descripcion" class="text-xs block truncate" style="color: var(--color-outline)">{{ item.descripcion }}</span>
                </div>
              </div>
            </template>
            <template #precio="{ item }">
              <span class="text-sm font-semibold" style="color: var(--color-on-surface)">{{ formatPrice(item.precio) }}</span>
              <span v-if="item.tarifas && item.tarifas.length" class="block text-xs mt-0.5" style="color: var(--color-outline)">
                base · +{{ item.tarifas.length }} tarifa{{ item.tarifas.length !== 1 ? "s" : "" }}
              </span>
            </template>
            <template #estado="{ item }">
              <span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold"
                :style="item.isActive ? 'background-color:var(--color-success-container);color:var(--color-on-success-container)' : 'background-color:var(--color-surface-container-high);color:var(--color-outline)'">
                {{ item.isActive ? "Activo" : "Inactivo" }}
              </span>
            </template>
            <template #acciones="{ item }">
              <div class="flex justify-end">
                <RowContextMenu :items="menuItems(item)" />
              </div>
            </template>
          </BaseTable>

          <div v-if="itemsPaginados.length > 0" class="px-6 py-4 flex items-center justify-between flex-wrap gap-4"
            style="border-top: 1px solid var(--color-hairline-soft); background-color: var(--color-surface-container-lowest)">
            <span class="text-sm" style="color: var(--color-on-surface-variant)">
              Mostrando <strong style="color: var(--color-on-surface)">{{ rangeStart }}–{{ rangeEnd }}</strong>
              de <strong style="color: var(--color-on-surface)">{{ totalCount }}</strong> servicios
            </span>
            <div v-if="totalPages > 1" class="flex items-center gap-1">
              <button @click="currentPage--" :disabled="currentPage === 1"
                class="w-9 h-9 rounded-full flex items-center justify-center transition-all disabled:opacity-30 hover:bg-surface-container-high"
                style="color: var(--color-on-surface-variant)">
                <span class="material-symbols-outlined" style="font-size: 18px">chevron_left</span>
              </button>
              <template v-for="p in visiblePages" :key="p">
                <span v-if="p === '...'" class="w-9 h-9 flex items-center justify-center text-sm" style="color: var(--color-outline)">…</span>
                <button v-else @click="currentPage = (p as number)"
                  class="w-9 h-9 rounded-full text-sm font-semibold transition-all"
                  :class="currentPage === p ? 'bg-primary text-on-primary' : 'text-on-surface-variant hover:bg-surface-container-high'">
                  {{ p }}
                </button>
              </template>
              <button @click="currentPage++" :disabled="currentPage === totalPages"
                class="w-9 h-9 rounded-full flex items-center justify-center transition-all disabled:opacity-30 hover:bg-surface-container-high"
                style="color: var(--color-on-surface-variant)">
                <span class="material-symbols-outlined" style="font-size: 18px">chevron_right</span>
              </button>
            </div>
          </div>
        </div>

      </div>
    </main>

    <!-- Modal Crear -->
    <BaseModal :show="showCreate" title="Nuevo Servicio" size="lg" @close="showCreate = false">
      <div v-if="createError" class="flex items-center gap-2 rounded-xl px-3 py-2.5 mb-4 text-sm font-medium"
        style="background-color: var(--color-error-container); color: var(--color-on-error-container)">
        <span class="material-symbols-outlined flex-shrink-0" style="font-size: 16px">error</span>
        {{ createError }}
      </div>
      <div class="space-y-4">
        <div>
          <label class="block text-xs font-bold uppercase tracking-wider mb-1.5" style="color: var(--color-outline)">Nombre *</label>
          <input v-model="createForm.nombre" type="text" placeholder="Ej: Consulta oftalmológica, Ajuste de armazón…"
            class="w-full px-4 py-3 rounded-xl text-sm outline-none"
            style="border: 1px solid var(--color-outline-variant); color: var(--color-on-surface); background-color: var(--color-surface-container-low)" />
        </div>
        <div>
          <label class="block text-xs font-bold uppercase tracking-wider mb-1.5" style="color: var(--color-outline)">Descripción</label>
          <input v-model="createForm.descripcion" type="text" placeholder="Opcional"
            class="w-full px-4 py-3 rounded-xl text-sm outline-none"
            style="border: 1px solid var(--color-outline-variant); color: var(--color-on-surface); background-color: var(--color-surface-container-low)" />
        </div>
        <div>
          <label class="block text-xs font-bold uppercase tracking-wider mb-1.5" style="color: var(--color-outline)">Precio</label>
          <input v-model.number="createForm.precio" type="number" min="0" placeholder="0"
            class="w-full px-4 py-3 rounded-xl text-sm outline-none"
            style="border: 1px solid var(--color-outline-variant); color: var(--color-on-surface); background-color: var(--color-surface-container-low)" />
          <p class="text-xs mt-1" style="color: var(--color-outline)">Se agrega como línea al cobrar el servicio en una venta directa.</p>
        </div>
      </div>
      <template #footer>
        <BaseButton variant="secondary" @click="showCreate = false">Cancelar</BaseButton>
        <BaseButton variant="primary" :disabled="isSaving" @click="submitCreate">
          {{ isSaving ? "Creando…" : "Crear servicio" }}
        </BaseButton>
      </template>
    </BaseModal>

    <!-- Modal Editar -->
    <BaseModal :show="showEdit" title="Editar Servicio" size="lg" @close="showEdit = false">
      <div v-if="editError" class="flex items-center gap-2 rounded-xl px-3 py-2.5 mb-4 text-sm font-medium"
        style="background-color: var(--color-error-container); color: var(--color-on-error-container)">
        <span class="material-symbols-outlined flex-shrink-0" style="font-size: 16px">error</span>
        {{ editError }}
      </div>
      <div class="space-y-4">
        <div>
          <label class="block text-xs font-bold uppercase tracking-wider mb-1.5" style="color: var(--color-outline)">Nombre *</label>
          <input v-model="editForm.nombre" type="text" class="w-full px-4 py-3 rounded-xl text-sm outline-none"
            style="border: 1px solid var(--color-outline-variant); color: var(--color-on-surface); background-color: var(--color-surface-container-low)" />
        </div>
        <div>
          <label class="block text-xs font-bold uppercase tracking-wider mb-1.5" style="color: var(--color-outline)">Descripción</label>
          <input v-model="editForm.descripcion" type="text" class="w-full px-4 py-3 rounded-xl text-sm outline-none"
            style="border: 1px solid var(--color-outline-variant); color: var(--color-on-surface); background-color: var(--color-surface-container-low)" />
        </div>
        <div>
          <label class="block text-xs font-bold uppercase tracking-wider mb-1.5" style="color: var(--color-outline)">Precio</label>
          <input v-model.number="editForm.precio" type="number" min="0"
            class="w-full px-4 py-3 rounded-xl text-sm outline-none"
            style="border: 1px solid var(--color-outline-variant); color: var(--color-on-surface); background-color: var(--color-surface-container-low)" />
        </div>
        <div class="flex items-center gap-3 p-4 rounded-xl" style="background-color: var(--color-surface-container-low)">
          <input v-model="editForm.isActive" type="checkbox" id="editIsActive" class="w-4 h-4 rounded" />
          <label for="editIsActive" class="text-sm font-medium cursor-pointer" style="color: var(--color-on-surface)">Servicio activo</label>
        </div>
      </div>
      <template #footer>
        <BaseButton variant="secondary" @click="showEdit = false">Cancelar</BaseButton>
        <BaseButton variant="primary" :disabled="isEditSaving" @click="submitEdit">
          {{ isEditSaving ? "Guardando…" : "Guardar cambios" }}
        </BaseButton>
      </template>
    </BaseModal>

    <!-- Modal Desactivar -->
    <BaseModal :show="showDeactivate" title="Desactivar Servicio" size="sm" @close="showDeactivate = false">
      <div v-if="deactivateError" class="flex items-center gap-2 rounded-xl px-3 py-2.5 mb-4 text-sm font-medium"
        style="background-color: var(--color-error-container); color: var(--color-on-error-container)">
        <span class="material-symbols-outlined flex-shrink-0" style="font-size: 16px">error</span>
        {{ deactivateError }}
      </div>
      <p class="text-sm" style="color: var(--color-on-surface-variant)">
        ¿Desactivar el servicio
        <span class="font-semibold" style="color: var(--color-on-surface)">{{ deactivatingItem?.nombre }}</span>?
      </p>
      <template #footer>
        <BaseButton variant="secondary" @click="showDeactivate = false">Cancelar</BaseButton>
        <BaseButton variant="danger" :disabled="isDeactivating" @click="confirmDeactivate">
          {{ isDeactivating ? "Desactivando…" : "Desactivar" }}
        </BaseButton>
      </template>
    </BaseModal>

    <!-- Modal Tarifas -->
    <BaseModal :show="showTarifas" title="Tarifas por profesional / especialidad" size="lg" @close="showTarifas = false">
      <div v-if="tarifaServicio" class="space-y-5">
        <!-- Precio base -->
        <div class="flex items-center justify-between rounded-xl px-4 py-3" style="background-color: var(--color-surface-container-low)">
          <div>
            <p class="text-sm font-bold" style="color: var(--color-on-surface)">{{ tarifaServicio.nombre }}</p>
            <p class="text-xs" style="color: var(--color-outline)">Precio base (cuando no aplica ninguna tarifa)</p>
          </div>
          <span class="text-sm font-bold" style="color: var(--color-primary)">{{ formatPrice(tarifaServicio.precio) }}</span>
        </div>

        <div v-if="tarifaError" class="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium"
          style="background-color: var(--color-error-container); color: var(--color-on-error-container)">
          <span class="material-symbols-outlined flex-shrink-0" style="font-size: 16px">error</span>
          {{ tarifaError }}
        </div>

        <!-- Lista de tarifas -->
        <div>
          <p class="text-xs font-bold uppercase tracking-wider mb-2" style="color: var(--color-outline)">Tarifas configuradas</p>
          <div v-if="tarifaServicio.tarifas.length === 0" class="py-5 text-center rounded-xl" style="border: 1.5px dashed var(--color-outline-variant)">
            <p class="text-sm" style="color: var(--color-outline)">Sin tarifas. Todos pagan el precio base.</p>
          </div>
          <div v-else class="space-y-2">
            <div v-for="t in tarifaServicio.tarifas" :key="t.id" class="flex items-center gap-3 rounded-xl px-4 py-2.5"
              style="background: var(--color-surface-container-low); border: 1px solid var(--color-hairline)">
              <span class="px-2 py-0.5 rounded-full text-xs font-bold"
                :style="t.professionalId ? 'background-color:color-mix(in srgb, var(--color-tertiary) 12%, var(--color-surface-container-lowest));color:var(--color-tertiary)' : 'background-color:var(--color-info-container);color:var(--color-on-info-container)'">
                {{ t.professionalId ? "Profesional" : "Especialidad" }}
              </span>
              <span class="flex-1 min-w-0 text-sm font-semibold truncate" style="color: var(--color-on-surface)">{{ scopeLabel(t) }}</span>
              <span class="text-sm font-bold" style="color: var(--color-primary)">{{ formatPrice(t.precio) }}</span>
              <button @click="quitarTarifa(t)" :disabled="removingTarifaId === t.id"
                class="w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition-all hover:scale-105 disabled:opacity-40"
                style="background-color: var(--color-error-container)" title="Quitar">
                <span class="material-symbols-outlined" style="font-size: 14px; color: var(--color-error)">close</span>
              </button>
            </div>
          </div>
        </div>

        <!-- Agregar tarifa -->
        <div class="rounded-xl p-4" style="background-color: var(--color-surface-container-low)">
          <p class="text-xs font-bold uppercase tracking-wider mb-3" style="color: var(--color-outline)">Agregar tarifa</p>
          <div class="inline-flex p-1 rounded-xl mb-3" style="background-color: var(--color-surface-container-high)">
            <button type="button" @click="tarifaScope = 'Profesional'" class="px-3 py-1 rounded-lg text-xs font-semibold transition-all"
              :style="tarifaScope === 'Profesional' ? 'background: var(--color-primary); color: var(--color-on-primary)' : 'color: var(--color-on-surface-variant)'">Profesional</button>
            <button type="button" @click="tarifaScope = 'Especialidad'" class="px-3 py-1 rounded-lg text-xs font-semibold transition-all"
              :style="tarifaScope === 'Especialidad' ? 'background: var(--color-primary); color: var(--color-on-primary)' : 'color: var(--color-on-surface-variant)'">Especialidad</button>
          </div>

          <div class="grid grid-cols-2 gap-3 items-end">
            <div>
              <label class="block text-xs font-bold uppercase tracking-wider mb-1.5" style="color: var(--color-outline)">
                {{ tarifaScope === "Profesional" ? "Profesional" : "Especialidad" }}
              </label>
              <SearchableSelect v-if="tarifaScope === 'Profesional'"
                :model-value="tarifaProfesionalId" :options="profesionalOptions"
                null-label="Elegí un profesional" @update:model-value="tarifaProfesionalId = $event as number | null" />
              <SearchableSelect v-else
                :model-value="tarifaEspecialidadId" :options="especialidadOptions"
                null-label="Elegí una especialidad" @update:model-value="tarifaEspecialidadId = $event as number | null" />
            </div>
            <div>
              <label class="block text-xs font-bold uppercase tracking-wider mb-1.5" style="color: var(--color-outline)">Precio</label>
              <input v-model.number="tarifaPrecio" type="number" min="0" placeholder="0"
                class="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
                style="border: 1px solid var(--color-outline-variant); color: var(--color-on-surface); background-color: var(--color-surface-container-lowest)" />
            </div>
          </div>
          <div class="mt-3 flex justify-end">
            <BaseButton variant="primary" size="sm" :disabled="isAddingTarifa" @click="submitAddTarifa">
              {{ isAddingTarifa ? "Agregando…" : "Agregar tarifa" }}
            </BaseButton>
          </div>
        </div>
      </div>

      <template #footer>
        <BaseButton variant="secondary" @click="showTarifas = false">Cerrar</BaseButton>
      </template>
    </BaseModal>
  </div>
</template>
