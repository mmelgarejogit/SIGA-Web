<script setup lang="ts">
import { ref, reactive, onMounted } from "vue"
import AppSidebar from "@/components/AppSidebar.vue"
import AppHeader from "@/components/AppHeader.vue"
import BaseButton from "@/components/BaseButton.vue"
import BaseTable from "@/components/BaseTable.vue"
import SearchInput from "@/components/SearchInput.vue"
import { useAuthStore } from "@/stores/auth"
import {
  type Sucursal,
  getSucursales,
  createSucursal,
  updateSucursal,
  deactivateSucursal,
} from "@/services/sucursalService"

const auth = useAuthStore()
const canManage = auth.hasPermission("gestionar_configuracion")

const sucursales = ref<Sucursal[]>([])
const isLoading = ref(false)
const search = ref("")
const showCreateModal = ref(false)
const showEditModal = ref(false)
const showDeleteModal = ref(false)
const selected = ref<Sucursal | null>(null)
const saving = ref(false)
const errorMsg = ref("")

const form = reactive({ nombre: "", codigo: "", direccion: "", telefono: "" })
const editForm = reactive({ nombre: "", codigo: "", direccion: "", telefono: "", isActive: true })

const filtered = () =>
  sucursales.value.filter(s =>
    !search.value ||
    s.nombre.toLowerCase().includes(search.value.toLowerCase()) ||
    s.codigo.toLowerCase().includes(search.value.toLowerCase()),
  )

async function load() {
  isLoading.value = true
  try { sucursales.value = await getSucursales() }
  finally { isLoading.value = false }
}

function openCreate() {
  form.nombre = ""; form.codigo = ""; form.direccion = ""; form.telefono = ""
  errorMsg.value = ""
  showCreateModal.value = true
}

function openEdit(s: Sucursal) {
  selected.value = s
  editForm.nombre = s.nombre; editForm.codigo = s.codigo
  editForm.direccion = s.direccion ?? ""; editForm.telefono = s.telefono ?? ""
  editForm.isActive = s.isActive
  errorMsg.value = ""
  showEditModal.value = true
}

function openDelete(s: Sucursal) {
  selected.value = s
  showDeleteModal.value = true
}

async function handleCreate() {
  if (!form.nombre.trim() || !form.codigo.trim()) { errorMsg.value = "Nombre y código son obligatorios."; return }
  saving.value = true; errorMsg.value = ""
  try {
    await createSucursal({ nombre: form.nombre.trim(), codigo: form.codigo.trim(), direccion: form.direccion.trim() || undefined, telefono: form.telefono.trim() || undefined })
    showCreateModal.value = false
    await load()
  } catch (e: any) { errorMsg.value = e?.response?.data?.message ?? "Error al crear la sucursal." }
  finally { saving.value = false }
}

async function handleEdit() {
  if (!editForm.nombre.trim() || !editForm.codigo.trim()) { errorMsg.value = "Nombre y código son obligatorios."; return }
  saving.value = true; errorMsg.value = ""
  try {
    await updateSucursal(selected.value!.id, { nombre: editForm.nombre.trim(), codigo: editForm.codigo.trim(), direccion: editForm.direccion.trim() || undefined, telefono: editForm.telefono.trim() || undefined, isActive: editForm.isActive })
    showEditModal.value = false
    await load()
  } catch (e: any) { errorMsg.value = e?.response?.data?.message ?? "Error al actualizar." }
  finally { saving.value = false }
}

async function handleDelete() {
  saving.value = true
  try {
    await deactivateSucursal(selected.value!.id)
    showDeleteModal.value = false
    await load()
  } finally { saving.value = false }
}

onMounted(load)
</script>

<template>
  <div class="min-h-screen" style="background-color: var(--color-background)">
    <AppSidebar />
    <AppHeader />
    <main style="margin-left: 280px; padding-top: 64px">
      <div class="p-8">

        <!-- Encabezado -->
        <div class="flex items-start justify-between mb-8">
          <div>
            <h1 class="text-4xl font-extrabold tracking-tight mb-2">Sucursales</h1>
            <p class="font-medium" style="color: var(--color-on-surface-variant)">
              Gestión de sucursales del negocio
            </p>
          </div>
          <BaseButton v-if="canManage" variant="primary" size="lg" @click="openCreate">
            <span class="material-symbols-outlined" style="font-size:20px">add</span>
            Nueva Sucursal
          </BaseButton>
        </div>

        <!-- Filtros -->
        <div class="flex items-center justify-between gap-4 mb-6">
          <div />
          <SearchInput :model-value="search" placeholder="Buscar por nombre o código…" class="w-72" @update:model-value="search = $event" />
        </div>

        <!-- Tabla -->
        <BaseTable :loading="isLoading" :empty-text="'No hay sucursales registradas.'">
          <template #header>
            <th class="px-6 py-5 text-left text-xs font-bold uppercase tracking-widest" style="color:var(--color-outline)">Nombre</th>
            <th class="px-6 py-5 text-left text-xs font-bold uppercase tracking-widest" style="color:var(--color-outline)">Código</th>
            <th class="px-6 py-5 text-left text-xs font-bold uppercase tracking-widest" style="color:var(--color-outline)">Dirección</th>
            <th class="px-6 py-5 text-left text-xs font-bold uppercase tracking-widest" style="color:var(--color-outline)">Teléfono</th>
            <th class="px-6 py-5 text-left text-xs font-bold uppercase tracking-widest" style="color:var(--color-outline)">Estado</th>
            <th class="px-6 py-5" />
          </template>
          <template #body>
            <tr v-for="s in filtered()" :key="s.id" class="hover:bg-surface-container-low border-b" style="border-color:rgba(196,197,213,0.12)">
              <td class="px-6 py-4 font-semibold">{{ s.nombre }}</td>
              <td class="px-6 py-4">
                <span class="px-2 py-1 rounded-lg text-xs font-bold" style="background-color:var(--color-surface-container-high);color:var(--color-primary)">{{ s.codigo }}</span>
              </td>
              <td class="px-6 py-4 text-sm" style="color:var(--color-on-surface-variant)">{{ s.direccion ?? '—' }}</td>
              <td class="px-6 py-4 text-sm" style="color:var(--color-on-surface-variant)">{{ s.telefono ?? '—' }}</td>
              <td class="px-6 py-4">
                <span class="px-3 py-1 rounded-full text-xs font-semibold" :class="s.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'">
                  {{ s.isActive ? 'Activa' : 'Inactiva' }}
                </span>
              </td>
              <td class="px-6 py-4">
                <div v-if="canManage" class="flex items-center gap-2 justify-end">
                  <button class="w-9 h-9 rounded-full flex items-center justify-center transition-all hover:scale-105 active:scale-95" style="background-color:var(--color-surface-container-high)" @click="openEdit(s)" title="Editar">
                    <span class="material-symbols-outlined" style="font-size:18px;color:var(--color-on-surface-variant)">edit</span>
                  </button>
                  <button v-if="s.isActive" class="w-9 h-9 rounded-full flex items-center justify-center transition-all hover:scale-105 active:scale-95" style="background-color:var(--color-error-container)" @click="openDelete(s)" title="Desactivar">
                    <span class="material-symbols-outlined" style="font-size:18px;color:var(--color-error)">block</span>
                  </button>
                </div>
              </td>
            </tr>
          </template>
        </BaseTable>

        <p class="mt-4 text-sm" style="color:var(--color-outline)">{{ filtered().length }} sucursal{{ filtered().length !== 1 ? 'es' : '' }}</p>
      </div>
    </main>
  </div>

  <!-- Modal Crear -->
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="showCreateModal" class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div class="absolute inset-0" style="background-color:rgba(24,28,32,0.5)" @click="showCreateModal = false" />
        <div class="relative w-full max-w-lg rounded-3xl overflow-hidden" style="background-color:var(--color-surface-container-lowest);box-shadow:0 24px 64px rgba(0,40,142,0.18)">
          <div class="flex items-center justify-between px-8 pt-8 pb-6" style="border-bottom:1px solid rgba(196,197,213,0.2)">
            <h3 class="text-xl font-extrabold" style="color:var(--color-primary)">Nueva Sucursal</h3>
            <button class="p-1 rounded-full" style="color:var(--color-outline)" @click="showCreateModal = false">
              <span class="material-symbols-outlined" style="font-size:22px">close</span>
            </button>
          </div>
          <div class="px-8 py-6 space-y-4">
            <div v-if="errorMsg" class="px-4 py-3 rounded-xl text-sm" style="background-color:var(--color-error-container);color:var(--color-error)">{{ errorMsg }}</div>
            <div>
              <label class="block text-xs font-bold uppercase tracking-wider mb-1" style="color:var(--color-outline)">Nombre *</label>
              <input v-model="form.nombre" class="w-full px-4 py-3 rounded-xl text-sm outline-none" style="border:1px solid var(--color-outline-variant);background-color:var(--color-surface-container-low);color:var(--color-on-surface)" />
            </div>
            <div>
              <label class="block text-xs font-bold uppercase tracking-wider mb-1" style="color:var(--color-outline)">Código *</label>
              <input v-model="form.codigo" class="w-full px-4 py-3 rounded-xl text-sm outline-none" placeholder="Ej: SUC-01" style="border:1px solid var(--color-outline-variant);background-color:var(--color-surface-container-low);color:var(--color-on-surface)" />
            </div>
            <div>
              <label class="block text-xs font-bold uppercase tracking-wider mb-1" style="color:var(--color-outline)">Dirección</label>
              <input v-model="form.direccion" class="w-full px-4 py-3 rounded-xl text-sm outline-none" style="border:1px solid var(--color-outline-variant);background-color:var(--color-surface-container-low);color:var(--color-on-surface)" />
            </div>
            <div>
              <label class="block text-xs font-bold uppercase tracking-wider mb-1" style="color:var(--color-outline)">Teléfono</label>
              <input v-model="form.telefono" class="w-full px-4 py-3 rounded-xl text-sm outline-none" style="border:1px solid var(--color-outline-variant);background-color:var(--color-surface-container-low);color:var(--color-on-surface)" />
            </div>
          </div>
          <div class="px-8 py-6 flex justify-end gap-3" style="border-top:1px solid rgba(196,197,213,0.2)">
            <BaseButton variant="secondary" @click="showCreateModal = false">Cancelar</BaseButton>
            <BaseButton variant="primary" :disabled="saving" @click="handleCreate">{{ saving ? 'Guardando…' : 'Crear' }}</BaseButton>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>

  <!-- Modal Editar -->
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="showEditModal" class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div class="absolute inset-0" style="background-color:rgba(24,28,32,0.5)" @click="showEditModal = false" />
        <div class="relative w-full max-w-lg rounded-3xl overflow-hidden" style="background-color:var(--color-surface-container-lowest);box-shadow:0 24px 64px rgba(0,40,142,0.18)">
          <div class="flex items-center justify-between px-8 pt-8 pb-6" style="border-bottom:1px solid rgba(196,197,213,0.2)">
            <h3 class="text-xl font-extrabold" style="color:var(--color-primary)">Editar Sucursal</h3>
            <button class="p-1 rounded-full" style="color:var(--color-outline)" @click="showEditModal = false">
              <span class="material-symbols-outlined" style="font-size:22px">close</span>
            </button>
          </div>
          <div class="px-8 py-6 space-y-4">
            <div v-if="errorMsg" class="px-4 py-3 rounded-xl text-sm" style="background-color:var(--color-error-container);color:var(--color-error)">{{ errorMsg }}</div>
            <div>
              <label class="block text-xs font-bold uppercase tracking-wider mb-1" style="color:var(--color-outline)">Nombre *</label>
              <input v-model="editForm.nombre" class="w-full px-4 py-3 rounded-xl text-sm outline-none" style="border:1px solid var(--color-outline-variant);background-color:var(--color-surface-container-low);color:var(--color-on-surface)" />
            </div>
            <div>
              <label class="block text-xs font-bold uppercase tracking-wider mb-1" style="color:var(--color-outline)">Código *</label>
              <input v-model="editForm.codigo" class="w-full px-4 py-3 rounded-xl text-sm outline-none" style="border:1px solid var(--color-outline-variant);background-color:var(--color-surface-container-low);color:var(--color-on-surface)" />
            </div>
            <div>
              <label class="block text-xs font-bold uppercase tracking-wider mb-1" style="color:var(--color-outline)">Dirección</label>
              <input v-model="editForm.direccion" class="w-full px-4 py-3 rounded-xl text-sm outline-none" style="border:1px solid var(--color-outline-variant);background-color:var(--color-surface-container-low);color:var(--color-on-surface)" />
            </div>
            <div>
              <label class="block text-xs font-bold uppercase tracking-wider mb-1" style="color:var(--color-outline)">Teléfono</label>
              <input v-model="editForm.telefono" class="w-full px-4 py-3 rounded-xl text-sm outline-none" style="border:1px solid var(--color-outline-variant);background-color:var(--color-surface-container-low);color:var(--color-on-surface)" />
            </div>
            <label class="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" v-model="editForm.isActive" class="w-4 h-4 rounded" />
              <span class="text-sm font-medium">Sucursal activa</span>
            </label>
          </div>
          <div class="px-8 py-6 flex justify-end gap-3" style="border-top:1px solid rgba(196,197,213,0.2)">
            <BaseButton variant="secondary" @click="showEditModal = false">Cancelar</BaseButton>
            <BaseButton variant="primary" :disabled="saving" @click="handleEdit">{{ saving ? 'Guardando…' : 'Guardar' }}</BaseButton>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>

  <!-- Modal Eliminar -->
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="showDeleteModal" class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div class="absolute inset-0" style="background-color:rgba(24,28,32,0.5)" @click="showDeleteModal = false" />
        <div class="relative w-full max-w-sm rounded-3xl overflow-hidden" style="background-color:var(--color-surface-container-lowest);box-shadow:0 24px 64px rgba(0,40,142,0.18)">
          <div class="px-8 pt-8 pb-6">
            <h3 class="text-xl font-extrabold mb-2" style="color:var(--color-error)">Desactivar sucursal</h3>
            <p class="text-sm" style="color:var(--color-on-surface-variant)">¿Desactivar <strong>{{ selected?.nombre }}</strong>? Esta acción puede revertirse editando la sucursal.</p>
          </div>
          <div class="px-8 py-6 flex justify-end gap-3" style="border-top:1px solid rgba(196,197,213,0.2)">
            <BaseButton variant="secondary" @click="showDeleteModal = false">Cancelar</BaseButton>
            <BaseButton variant="danger" :disabled="saving" @click="handleDelete">{{ saving ? 'Desactivando…' : 'Desactivar' }}</BaseButton>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
