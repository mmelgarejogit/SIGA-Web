<script setup lang="ts">
import { ref, onMounted, reactive } from "vue"
import AppSidebar from "@/components/AppSidebar.vue"
import AppHeader from "@/components/AppHeader.vue"
import BaseButton from "@/components/BaseButton.vue"
import BaseModal from "@/components/BaseModal.vue"
import BaseTable from "@/components/BaseTable.vue"
import { useAuthStore } from "@/stores/auth"
import {
  type Proveedor,
  type CreateProveedorRequest,
  getProveedores,
  createProveedor,
  updateProveedor,
} from "@/services/inventarioService"

const auth = useAuthStore()
const canManage = auth.hasPermission("gestionar_pedidos")

// ── Estado ─────────────────────────────────────────────────────────────────────

const proveedores = ref<Proveedor[]>([])
const isLoading = ref(false)
const loadError = ref("")

const columns = [
  { key: "nombre", label: "Nombre" },
  { key: "contacto", label: "Contacto" },
  { key: "email", label: "Email" },
  { key: "telefono", label: "Teléfono" },
  { key: "estado", label: "Estado" },
  { key: "acciones", label: "", align: "right" as const },
]

async function load() {
  isLoading.value = true
  loadError.value = ""
  try {
    proveedores.value = await getProveedores()
  } catch (err: unknown) {
    loadError.value = err instanceof Error ? err.message : "Error al cargar proveedores."
  } finally {
    isLoading.value = false
  }
}

onMounted(load)

// ── Modal Crear / Editar ───────────────────────────────────────────────────────

const showModal = ref(false)
const isSaving = ref(false)
const modalError = ref("")
const editingProveedor = ref<Proveedor | null>(null)
const form = reactive<CreateProveedorRequest>({
  nombre: "",
  contacto: undefined,
  email: undefined,
  telefono: undefined,
})

function openCreate() {
  editingProveedor.value = null
  Object.assign(form, { nombre: "", contacto: "", email: "", telefono: "" })
  modalError.value = ""
  showModal.value = true
}

function openEdit(p: Proveedor) {
  editingProveedor.value = p
  Object.assign(form, {
    nombre: p.nombre,
    contacto: p.contacto ?? "",
    email: p.email ?? "",
    telefono: p.telefono ?? "",
  })
  modalError.value = ""
  showModal.value = true
}

async function submit() {
  if (!form.nombre?.trim()) { modalError.value = "El nombre es obligatorio."; return }

  isSaving.value = true
  modalError.value = ""
  const payload: CreateProveedorRequest = {
    nombre: form.nombre.trim(),
    contacto: (form.contacto as string)?.trim() || undefined,
    email: (form.email as string)?.trim() || undefined,
    telefono: (form.telefono as string)?.trim() || undefined,
  }
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
</script>

<template>
  <div class="min-h-screen" style="background-color: var(--color-background)">
    <AppSidebar />
    <AppHeader />

    <main style="margin-left: var(--sidebar-width); transition: margin-left 0.25s ease; padding-top: 64px">
      <div class="p-8">

        <!-- Header -->
        <div class="flex items-start justify-between mb-8">
          <div>
            <h1 class="text-4xl font-extrabold tracking-tight mb-2">Proveedores</h1>
            <p class="text-sm font-medium" style="color: var(--color-outline)">
              {{ proveedores.filter(p => p.isActive).length }} proveedor{{ proveedores.filter(p => p.isActive).length !== 1 ? "es" : "" }} activo{{ proveedores.filter(p => p.isActive).length !== 1 ? "s" : "" }}
            </p>
          </div>
          <BaseButton v-if="canManage" variant="primary" size="default" @click="openCreate">
            <span class="material-symbols-outlined" style="font-size: 18px">add</span>
            Nuevo Proveedor
          </BaseButton>
        </div>

        <!-- Error -->
        <div v-if="loadError" class="flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium mb-6"
          style="background-color: var(--color-error-container); color: var(--color-on-error-container)">
          <span class="material-symbols-outlined" style="font-size: 18px">error</span>
          {{ loadError }}
        </div>

        <!-- Tabla -->
        <BaseTable :columns="columns" :items="proveedores" :loading="isLoading"
          empty-text="No hay proveedores registrados.">

          <template #nombre="{ item }">
            <span class="text-sm font-semibold" style="color: var(--color-on-surface)">{{ item.nombre }}</span>
          </template>

          <template #contacto="{ item }">
            <span class="text-sm" style="color: var(--color-on-surface-variant)">{{ item.contacto ?? "—" }}</span>
          </template>

          <template #email="{ item }">
            <span class="text-sm" style="color: var(--color-on-surface-variant)">{{ item.email ?? "—" }}</span>
          </template>

          <template #telefono="{ item }">
            <span class="text-sm" style="color: var(--color-on-surface-variant)">{{ item.telefono ?? "—" }}</span>
          </template>

          <template #estado="{ item }">
            <span
              class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold"
              :style="item.isActive
                ? 'background-color: #dcfce7; color: #166534'
                : 'background-color: var(--color-surface-container-high); color: var(--color-outline)'"
            >{{ item.isActive ? "Activo" : "Inactivo" }}</span>
          </template>

          <template #acciones="{ item }">
            <div class="flex items-center justify-end">
              <button
                v-if="canManage"
                @click.stop="openEdit(item)"
                class="w-8 h-8 rounded-full flex items-center justify-center hover:opacity-80"
                style="background-color: var(--color-surface-container-low)"
                title="Editar proveedor"
              >
                <span class="material-symbols-outlined" style="font-size: 16px; color: var(--color-on-surface-variant)">edit</span>
              </button>
            </div>
          </template>
        </BaseTable>

      </div>
    </main>

    <!-- ── MODAL CREAR / EDITAR ───────────────────────────────────────────────── -->
    <BaseModal
      :show="showModal"
      :title="editingProveedor ? 'Editar Proveedor' : 'Nuevo Proveedor'"
      size="md"
      @close="showModal = false"
    >
      <div v-if="modalError" class="flex items-center gap-2 rounded-xl px-3 py-2.5 mb-4 text-sm font-medium"
        style="background-color: var(--color-error-container); color: var(--color-on-error-container)">
        <span class="material-symbols-outlined flex-shrink-0" style="font-size: 16px">error</span>
        {{ modalError }}
      </div>

      <div class="space-y-4">
        <div>
          <label class="block text-xs font-bold uppercase tracking-wider mb-1.5" style="color: var(--color-outline)">Nombre *</label>
          <input v-model="form.nombre" type="text" class="w-full px-4 py-3 rounded-xl text-sm outline-none"
            style="border: 1px solid var(--color-outline-variant); color: var(--color-on-surface); background: var(--color-surface)" />
        </div>
        <div>
          <label class="block text-xs font-bold uppercase tracking-wider mb-1.5" style="color: var(--color-outline)">Persona de contacto</label>
          <input v-model="form.contacto" type="text" class="w-full px-4 py-3 rounded-xl text-sm outline-none"
            style="border: 1px solid var(--color-outline-variant); color: var(--color-on-surface); background: var(--color-surface)" />
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-xs font-bold uppercase tracking-wider mb-1.5" style="color: var(--color-outline)">Email</label>
            <input v-model="form.email" type="email" class="w-full px-4 py-3 rounded-xl text-sm outline-none"
              style="border: 1px solid var(--color-outline-variant); color: var(--color-on-surface); background: var(--color-surface)" />
          </div>
          <div>
            <label class="block text-xs font-bold uppercase tracking-wider mb-1.5" style="color: var(--color-outline)">Teléfono</label>
            <input v-model="form.telefono" type="text" class="w-full px-4 py-3 rounded-xl text-sm outline-none"
              style="border: 1px solid var(--color-outline-variant); color: var(--color-on-surface); background: var(--color-surface)" />
          </div>
        </div>
      </div>

      <template #footer>
        <BaseButton class="flex-1" variant="secondary" size="default" @click="showModal = false">Cancelar</BaseButton>
        <BaseButton class="flex-1" variant="primary" size="default" :disabled="isSaving" @click="submit">
          <svg v-if="isSaving" class="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          {{ isSaving ? "Guardando..." : editingProveedor ? "Guardar Cambios" : "Crear Proveedor" }}
        </BaseButton>
      </template>
    </BaseModal>
  </div>
</template>
