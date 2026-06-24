<script setup lang="ts">
import { ref, computed, onMounted, reactive } from "vue"
import AppSidebar from "@/components/AppSidebar.vue"
import AppHeader from "@/components/AppHeader.vue"
import BaseButton from "@/components/BaseButton.vue"
import BaseModal from "@/components/BaseModal.vue"
import BaseTable from "@/components/BaseTable.vue"
import FilterChips from "@/components/FilterChips.vue"
import RowContextMenu, { type ContextMenuItem } from "@/components/RowContextMenu.vue"
import { useAuthStore } from "@/stores/auth"
import {
  type Timbrado,
  type CreateTimbradoRequest,
  type UpdateTimbradoRequest,
  getTimbrados,
  createTimbrado,
  updateTimbrado,
  deactivateTimbrado,
} from "@/services/timbradoService"

const auth = useAuthStore()
const canManage = auth.hasPermission("gestionar_ventas")

const items = ref<Timbrado[]>([])
const isLoading = ref(false)
const loadError = ref("")
const estadoFilter = ref<string[]>([])

const estadoOptions = [
  { value: "activo",   label: "Activos",   dot: "#166534" },
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

const PAGE_SIZE = 10
const currentPage = ref(1)

const itemsPaginados = computed(() => {
  const start = (currentPage.value - 1) * PAGE_SIZE
  return itemsFiltrados.value.slice(start, start + PAGE_SIZE)
})

const totalCount = computed(() => itemsFiltrados.value.length)
const totalPages = computed(() => Math.max(1, Math.ceil(totalCount.value / PAGE_SIZE)))
const rangeStart = computed(() => totalCount.value === 0 ? 0 : (currentPage.value - 1) * PAGE_SIZE + 1)
const rangeEnd   = computed(() => Math.min(currentPage.value * PAGE_SIZE, totalCount.value))

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
  { key: "numeroTimbrado",      label: "Timbrado" },
  { key: "serie",                label: "Serie" },
  { key: "proximoNumeroPreview", label: "Próximo N°" },
  { key: "vigencia",            label: "Vigencia" },
  { key: "estado",              label: "Estado" },
  { key: "acciones",            label: "", align: "right" as const },
]

async function load() {
  isLoading.value = true
  loadError.value = ""
  try {
    items.value = await getTimbrados()
  } catch (err: unknown) {
    loadError.value = err instanceof Error ? err.message : "Error al cargar timbrados."
  } finally {
    isLoading.value = false
  }
}

onMounted(load)

function menuItems(item: Timbrado): ContextMenuItem[] {
  return [
    ...(canManage ? [{ type: "item" as const, label: "Editar", icon: "edit", action: () => openEdit(item) }] : []),
    ...(canManage && item.isActive ? [
      { type: "separator" as const },
      { type: "item" as const, label: "Desactivar", icon: "delete", action: () => openDeactivate(item), danger: true },
    ] : []),
  ]
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString("es-PY", { day: "2-digit", month: "2-digit", year: "numeric" })
}

function vigenciaLabel(item: Timbrado): string {
  return `${formatDate(item.fechaInicioVigencia)} – ${formatDate(item.fechaFinVigencia)}`
}

// ── Modal Crear ────────────────────────────────────────────────────────────────

const showCreate  = ref(false)
const isSaving    = ref(false)
const createError = ref("")
const createForm  = reactive<CreateTimbradoRequest>({
  numeroTimbrado: "",
  establecimiento: "",
  puntoExpedicion: "",
  numeroDesde: 1,
  numeroHasta: null,
  fechaInicioVigencia: "",
  fechaFinVigencia: "",
})

function openCreate() {
  const today = new Date()
  const finVigencia = new Date(today)
  finVigencia.setFullYear(finVigencia.getFullYear() + 1)
  createForm.numeroTimbrado = ""
  createForm.establecimiento = ""
  createForm.puntoExpedicion = ""
  createForm.numeroDesde = 1
  createForm.numeroHasta = null
  createForm.fechaInicioVigencia = today.toISOString().slice(0, 10)
  createForm.fechaFinVigencia = finVigencia.toISOString().slice(0, 10)
  createError.value = ""
  showCreate.value = true
}

function validateForm(): string {
  if (!createForm.numeroTimbrado.trim()) return "El número de timbrado es obligatorio."
  if (!/^\d{3}$/.test(createForm.establecimiento)) return "El establecimiento debe ser exactamente 3 dígitos numéricos."
  if (!/^\d{3}$/.test(createForm.puntoExpedicion)) return "El punto de expedición debe ser exactamente 3 dígitos numéricos."
  if (!createForm.fechaInicioVigencia || !createForm.fechaFinVigencia) return "Las fechas de vigencia son obligatorias."
  if (createForm.fechaFinVigencia < createForm.fechaInicioVigencia) return "La fecha de fin de vigencia debe ser mayor o igual a la fecha de inicio."
  return ""
}

async function submitCreate() {
  const err = validateForm()
  if (err) { createError.value = err; return }
  isSaving.value = true
  try {
    await createTimbrado({
      numeroTimbrado: createForm.numeroTimbrado.trim(),
      establecimiento: createForm.establecimiento.trim(),
      puntoExpedicion: createForm.puntoExpedicion.trim(),
      numeroDesde: createForm.numeroDesde,
      numeroHasta: createForm.numeroHasta,
      fechaInicioVigencia: createForm.fechaInicioVigencia,
      fechaFinVigencia: createForm.fechaFinVigencia,
    })
    showCreate.value = false
    await load()
  } catch (err: unknown) {
    createError.value = err instanceof Error ? err.message : "Error al crear timbrado."
  } finally {
    isSaving.value = false
  }
}

// ── Modal Editar ───────────────────────────────────────────────────────────────

const showEdit     = ref(false)
const isEditSaving = ref(false)
const editError    = ref("")
const editingItem  = ref<Timbrado | null>(null)
const editForm     = reactive<UpdateTimbradoRequest>({
  numeroTimbrado: "",
  establecimiento: "",
  puntoExpedicion: "",
  numeroDesde: 1,
  numeroHasta: null,
  fechaInicioVigencia: "",
  fechaFinVigencia: "",
  isActive: true,
})

function openEdit(item: Timbrado) {
  editingItem.value = item
  editForm.numeroTimbrado = item.numeroTimbrado
  editForm.establecimiento = item.establecimiento
  editForm.puntoExpedicion = item.puntoExpedicion
  editForm.numeroDesde = item.numeroDesde
  editForm.numeroHasta = item.numeroHasta
  editForm.fechaInicioVigencia = item.fechaInicioVigencia
  editForm.fechaFinVigencia = item.fechaFinVigencia
  editForm.isActive = item.isActive
  editError.value = ""
  showEdit.value = true
}

async function submitEdit() {
  if (!editingItem.value) return
  if (!editForm.numeroTimbrado.trim()) { editError.value = "El número de timbrado es obligatorio."; return }
  if (!/^\d{3}$/.test(editForm.establecimiento)) { editError.value = "El establecimiento debe ser exactamente 3 dígitos numéricos."; return }
  if (!/^\d{3}$/.test(editForm.puntoExpedicion)) { editError.value = "El punto de expedición debe ser exactamente 3 dígitos numéricos."; return }
  if (editForm.fechaFinVigencia < editForm.fechaInicioVigencia) { editError.value = "La fecha de fin de vigencia debe ser mayor o igual a la fecha de inicio."; return }
  isEditSaving.value = true
  try {
    await updateTimbrado(editingItem.value.id, {
      numeroTimbrado: editForm.numeroTimbrado.trim(),
      establecimiento: editForm.establecimiento.trim(),
      puntoExpedicion: editForm.puntoExpedicion.trim(),
      numeroDesde: editForm.numeroDesde,
      numeroHasta: editForm.numeroHasta,
      fechaInicioVigencia: editForm.fechaInicioVigencia,
      fechaFinVigencia: editForm.fechaFinVigencia,
      isActive: editForm.isActive,
    })
    showEdit.value = false
    await load()
  } catch (err: unknown) {
    editError.value = err instanceof Error ? err.message : "Error al actualizar timbrado."
  } finally {
    isEditSaving.value = false
  }
}

// ── Modal Desactivar ───────────────────────────────────────────────────────────

const showDeactivate   = ref(false)
const isDeactivating   = ref(false)
const deactivateError  = ref("")
const deactivatingItem  = ref<Timbrado | null>(null)

function openDeactivate(item: Timbrado) {
  deactivatingItem.value = item
  deactivateError.value  = ""
  showDeactivate.value   = true
}

async function confirmDeactivate() {
  if (!deactivatingItem.value) return
  isDeactivating.value = true
  deactivateError.value = ""
  try {
    await deactivateTimbrado(deactivatingItem.value.id)
    showDeactivate.value = false
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
    <main style="margin-left: var(--sidebar-width); padding-top: 64px">
      <div class="p-8">

        <div class="flex items-start justify-between mb-8">
          <div>
            <h1 class="text-4xl font-extrabold tracking-tight mb-2" style="color: var(--color-on-surface)">Timbrados</h1>
            <p class="font-medium" style="color: var(--color-on-surface-variant)">
              {{ items.filter(i => i.isActive).length }} timbrado{{ items.filter(i => i.isActive).length !== 1 ? "s" : "" }} activo{{ items.filter(i => i.isActive).length !== 1 ? "s" : "" }}
            </p>
          </div>
          <BaseButton v-if="canManage" variant="primary" size="lg" @click="openCreate">
            <span class="material-symbols-outlined" style="font-size: 20px">add</span>
            Nuevo Timbrado
          </BaseButton>
        </div>

        <div class="flex items-center gap-3 mb-6">
          <FilterChips :model-value="estadoFilter" :options="estadoOptions" placeholder="Estado" @update:model-value="estadoFilter = $event" />
        </div>

        <div v-if="loadError" class="flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium mb-6"
          style="background-color: var(--color-error-container); color: var(--color-on-error-container)">
          <span class="material-symbols-outlined" style="font-size: 18px">error</span>
          {{ loadError }}
        </div>

        <div class="rounded-2xl overflow-hidden" style="background-color: var(--color-surface-container-lowest); box-shadow: 0 1px 3px rgba(196,197,213,0.25); outline: 1px solid rgba(196,197,213,0.15)">
          <BaseTable :columns="columns" :items="itemsPaginados" :loading="isLoading" empty-text="No hay timbrados registrados.">
            <template #numeroTimbrado="{ item }">
              <div class="flex items-center gap-3">
                <div class="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style="background-color: var(--color-primary-container)">
                  <span class="material-symbols-outlined" style="font-size: 18px; color: white">verified</span>
                </div>
                <span class="text-sm font-semibold" style="color: var(--color-on-surface)">{{ item.numeroTimbrado }}</span>
              </div>
            </template>
            <template #serie="{ item }">
              <span class="text-sm font-mono font-semibold" style="color: var(--color-on-surface-variant)">
                {{ item.establecimiento }}-{{ item.puntoExpedicion }}
              </span>
            </template>
            <template #proximoNumeroPreview="{ item }">
              <span class="text-sm font-mono font-semibold" style="color: var(--color-primary)">
                {{ item.numeroCompletoPreview }}
              </span>
            </template>
            <template #vigencia="{ item }">
              <span class="text-xs" style="color: var(--color-on-surface-variant)">{{ vigenciaLabel(item) }}</span>
            </template>
            <template #estado="{ item }">
              <span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold"
                :style="item.isActive ? 'background-color:#dcfce7;color:#166534' : 'background-color:var(--color-surface-container-high);color:var(--color-outline)'">
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
            style="border-top: 1px solid rgba(196,197,213,0.12); background-color: var(--color-surface-container-lowest)">
            <span class="text-sm" style="color: var(--color-on-surface-variant)">
              Mostrando <strong style="color: var(--color-on-surface)">{{ rangeStart }}–{{ rangeEnd }}</strong>
              de <strong style="color: var(--color-on-surface)">{{ totalCount }}</strong> timbrados
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
                  :class="currentPage === p ? 'bg-primary text-white' : 'text-on-surface-variant hover:bg-surface-container-high'">
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
    <BaseModal :show="showCreate" title="Nuevo Timbrado" size="lg" @close="showCreate = false">
      <div v-if="createError" class="flex items-center gap-2 rounded-xl px-3 py-2.5 mb-4 text-sm font-medium"
        style="background-color: var(--color-error-container); color: var(--color-on-error-container)">
        <span class="material-symbols-outlined flex-shrink-0" style="font-size: 16px">error</span>
        {{ createError }}
      </div>
      <div class="grid grid-cols-2 gap-4">
        <div class="col-span-2">
          <label class="block text-xs font-bold uppercase tracking-wider mb-1.5" style="color: var(--color-outline)">Número de Timbrado *</label>
          <input v-model="createForm.numeroTimbrado" type="text" placeholder="Ej: 12345678"
            class="w-full px-4 py-3 rounded-xl text-sm outline-none"
            style="border: 1px solid var(--color-outline-variant); color: var(--color-on-surface); background-color: var(--color-surface-container-low)" />
        </div>
        <div>
          <label class="block text-xs font-bold uppercase tracking-wider mb-1.5" style="color: var(--color-outline)">Establecimiento *</label>
          <input v-model="createForm.establecimiento" type="text" placeholder="001" maxlength="3"
            class="w-full px-4 py-3 rounded-xl text-sm outline-none"
            style="border: 1px solid var(--color-outline-variant); color: var(--color-on-surface); background-color: var(--color-surface-container-low)" />
        </div>
        <div>
          <label class="block text-xs font-bold uppercase tracking-wider mb-1.5" style="color: var(--color-outline)">Punto de Expedición *</label>
          <input v-model="createForm.puntoExpedicion" type="text" placeholder="001" maxlength="3"
            class="w-full px-4 py-3 rounded-xl text-sm outline-none"
            style="border: 1px solid var(--color-outline-variant); color: var(--color-on-surface); background-color: var(--color-surface-container-low)" />
        </div>
        <div>
          <label class="block text-xs font-bold uppercase tracking-wider mb-1.5" style="color: var(--color-outline)">N° Desde</label>
          <input v-model.number="createForm.numeroDesde" type="number" min="1"
            class="w-full px-4 py-3 rounded-xl text-sm outline-none"
            style="border: 1px solid var(--color-outline-variant); color: var(--color-on-surface); background-color: var(--color-surface-container-low)" />
        </div>
        <div>
          <label class="block text-xs font-bold uppercase tracking-wider mb-1.5" style="color: var(--color-outline)">N° Hasta</label>
          <input v-model.number="createForm.numeroHasta" type="number" min="1"
            class="w-full px-4 py-3 rounded-xl text-sm outline-none"
            style="border: 1px solid var(--color-outline-variant); color: var(--color-on-surface); background-color: var(--color-surface-container-low)" />
        </div>
        <div>
          <label class="block text-xs font-bold uppercase tracking-wider mb-1.5" style="color: var(--color-outline)">Fecha Inicio Vigencia *</label>
          <input v-model="createForm.fechaInicioVigencia" type="date"
            class="w-full px-4 py-3 rounded-xl text-sm outline-none"
            style="border: 1px solid var(--color-outline-variant); color: var(--color-on-surface); background-color: var(--color-surface-container-low)" />
        </div>
        <div>
          <label class="block text-xs font-bold uppercase tracking-wider mb-1.5" style="color: var(--color-outline)">Fecha Fin Vigencia *</label>
          <input v-model="createForm.fechaFinVigencia" type="date"
            class="w-full px-4 py-3 rounded-xl text-sm outline-none"
            style="border: 1px solid var(--color-outline-variant); color: var(--color-on-surface); background-color: var(--color-surface-container-low)" />
        </div>
      </div>
      <template #footer>
        <BaseButton variant="secondary" @click="showCreate = false">Cancelar</BaseButton>
        <BaseButton variant="primary" :disabled="isSaving" @click="submitCreate">
          {{ isSaving ? "Creando…" : "Crear timbrado" }}
        </BaseButton>
      </template>
    </BaseModal>

    <!-- Modal Editar -->
    <BaseModal :show="showEdit" title="Editar Timbrado" size="lg" @close="showEdit = false">
      <div v-if="editError" class="flex items-center gap-2 rounded-xl px-3 py-2.5 mb-4 text-sm font-medium"
        style="background-color: var(--color-error-container); color: var(--color-on-error-container)">
        <span class="material-symbols-outlined flex-shrink-0" style="font-size: 16px">error</span>
        {{ editError }}
      </div>
      <div class="grid grid-cols-2 gap-4">
        <div class="col-span-2">
          <label class="block text-xs font-bold uppercase tracking-wider mb-1.5" style="color: var(--color-outline)">Número de Timbrado *</label>
          <input v-model="editForm.numeroTimbrado" type="text"
            class="w-full px-4 py-3 rounded-xl text-sm outline-none"
            style="border: 1px solid var(--color-outline-variant); color: var(--color-on-surface); background-color: var(--color-surface-container-low)" />
        </div>
        <div>
          <label class="block text-xs font-bold uppercase tracking-wider mb-1.5" style="color: var(--color-outline)">Establecimiento *</label>
          <input v-model="editForm.establecimiento" type="text" maxlength="3"
            class="w-full px-4 py-3 rounded-xl text-sm outline-none"
            style="border: 1px solid var(--color-outline-variant); color: var(--color-on-surface); background-color: var(--color-surface-container-low)" />
        </div>
        <div>
          <label class="block text-xs font-bold uppercase tracking-wider mb-1.5" style="color: var(--color-outline)">Punto de Expedición *</label>
          <input v-model="editForm.puntoExpedicion" type="text" maxlength="3"
            class="w-full px-4 py-3 rounded-xl text-sm outline-none"
            style="border: 1px solid var(--color-outline-variant); color: var(--color-on-surface); background-color: var(--color-surface-container-low)" />
        </div>
        <div>
          <label class="block text-xs font-bold uppercase tracking-wider mb-1.5" style="color: var(--color-outline)">N° Desde</label>
          <input v-model.number="editForm.numeroDesde" type="number" min="1"
            class="w-full px-4 py-3 rounded-xl text-sm outline-none"
            style="border: 1px solid var(--color-outline-variant); color: var(--color-on-surface); background-color: var(--color-surface-container-low)" />
        </div>
        <div>
          <label class="block text-xs font-bold uppercase tracking-wider mb-1.5" style="color: var(--color-outline)">N° Hasta</label>
          <input v-model.number="editForm.numeroHasta" type="number" min="1"
            class="w-full px-4 py-3 rounded-xl text-sm outline-none"
            style="border: 1px solid var(--color-outline-variant); color: var(--color-on-surface); background-color: var(--color-surface-container-low)" />
        </div>
        <div>
          <label class="block text-xs font-bold uppercase tracking-wider mb-1.5" style="color: var(--color-outline)">Fecha Inicio Vigencia *</label>
          <input v-model="editForm.fechaInicioVigencia" type="date"
            class="w-full px-4 py-3 rounded-xl text-sm outline-none"
            style="border: 1px solid var(--color-outline-variant); color: var(--color-on-surface); background-color: var(--color-surface-container-low)" />
        </div>
        <div>
          <label class="block text-xs font-bold uppercase tracking-wider mb-1.5" style="color: var(--color-outline)">Fecha Fin Vigencia *</label>
          <input v-model="editForm.fechaFinVigencia" type="date"
            class="w-full px-4 py-3 rounded-xl text-sm outline-none"
            style="border: 1px solid var(--color-outline-variant); color: var(--color-on-surface); background-color: var(--color-surface-container-low)" />
        </div>
        <div class="col-span-2 flex items-center gap-3 p-4 rounded-xl" style="background-color: var(--color-surface-container-low)">
          <input v-model="editForm.isActive" type="checkbox" id="editIsActive" class="w-4 h-4 rounded" />
          <label for="editIsActive" class="text-sm font-medium cursor-pointer" style="color: var(--color-on-surface)">Timbrado activo</label>
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
    <BaseModal :show="showDeactivate" title="Desactivar Timbrado" size="sm" @close="showDeactivate = false">
      <div v-if="deactivateError" class="flex items-center gap-2 rounded-xl px-3 py-2.5 mb-4 text-sm font-medium"
        style="background-color: var(--color-error-container); color: var(--color-on-error-container)">
        <span class="material-symbols-outlined flex-shrink-0" style="font-size: 16px">error</span>
        {{ deactivateError }}
      </div>
      <p class="text-sm" style="color: var(--color-on-surface-variant)">
        ¿Desactivar el timbrado
        <span class="font-semibold" style="color: var(--color-on-surface)">{{ deactivatingItem?.numeroTimbrado }}</span>?
      </p>
      <template #footer>
        <BaseButton variant="secondary" @click="showDeactivate = false">Cancelar</BaseButton>
        <BaseButton variant="danger" :disabled="isDeactivating" @click="confirmDeactivate">
          {{ isDeactivating ? "Desactivando…" : "Desactivar" }}
        </BaseButton>
      </template>
    </BaseModal>
  </div>
</template>