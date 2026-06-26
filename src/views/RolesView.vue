<script setup lang="ts">
import { ref, onMounted } from "vue"
import { useRouter } from "vue-router"
import AppSidebar from "@/components/AppSidebar.vue"
import AppHeader from "@/components/AppHeader.vue"
import BaseButton from "@/components/BaseButton.vue"
import BaseModal from "@/components/BaseModal.vue"
import BaseTable from "@/components/BaseTable.vue"
import { useAuthStore } from "@/stores/auth"
import { type Role, getRoles, deleteRole, SYSTEM_PERMISSIONS } from "@/services/roleService"

const router = useRouter()
const auth = useAuthStore()

const roles = ref<Role[]>([])
const isLoading = ref(false)
const loadError = ref("")

async function load() {
  isLoading.value = true
  loadError.value = ""
  try {
    roles.value = await getRoles()
  } catch (err: unknown) {
    loadError.value = err instanceof Error ? err.message : "Error al cargar roles."
  } finally {
    isLoading.value = false
  }
}

onMounted(load)

// ── Eliminar ──────────────────────────────────────────────────────────────────

const showDeleteModal = ref(false)
const deletingRole = ref<Role | null>(null)
const deleteError = ref("")
const isDeleting = ref(false)

function openDeleteModal(role: Role) {
  deletingRole.value = role
  deleteError.value = ""
  showDeleteModal.value = true
}

async function confirmDelete() {
  if (isDeleting.value || !deletingRole.value) return
  isDeleting.value = true
  deleteError.value = ""
  try {
    await deleteRole(deletingRole.value.id)
    roles.value = roles.value.filter(r => r.id !== deletingRole.value!.id)
    showDeleteModal.value = false
  } catch (err: unknown) {
    deleteError.value = err instanceof Error ? err.message : "Error al eliminar rol."
  } finally {
    isDeleting.value = false
  }
}

function roleTypeLabel(type: string | null) {
  return type ? "Sistema" : "Personalizado"
}

function roleTypeStyle(type: string | null) {
  return type
    ? { bg: "color-mix(in srgb, var(--color-primary) 10%, transparent)", color: "var(--color-primary)" }
    : { bg: "color-mix(in srgb, var(--color-secondary) 10%, transparent)", color: "var(--color-secondary)" }
}

const columns = [
  { key: "nombre", label: "Nombre del Rol" },
  { key: "tipo", label: "Tipo" },
  { key: "permisos", label: "Permisos asignados" },
  { key: "acciones", label: "", align: "right" as const },
]
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
            <h1 class="text-4xl font-extrabold tracking-tight mb-2">Roles y Permisos</h1>
            <p class="font-medium" style="color: var(--color-on-surface-variant)">
              Configurá los permisos de acceso para cada rol del sistema.
            </p>
          </div>
          <BaseButton
            v-if="auth.hasPermission('crear_rol')"
            variant="primary"
            size="lg"
            @click="router.push('/roles/nuevo')"
          >
            <span class="material-symbols-outlined" style="font-size: 20px; width: 20px; height: 20px">add</span>
            Nuevo Rol
          </BaseButton>
        </div>

        <!-- Error -->
        <div v-if="loadError" class="flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium mb-6"
          style="background-color: var(--color-error-container); color: var(--color-on-error-container)">
          <span class="material-symbols-outlined" style="font-size: 18px">error</span>
          {{ loadError }}
        </div>

        <!-- Tabla -->
        <BaseTable :columns="columns" :items="roles" :loading="isLoading" empty-text="No hay roles configurados.">

          <template #nombre="{ item }">
            <div class="flex items-center gap-3">
              <div class="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                style="background-color: color-mix(in srgb, var(--color-primary) 10%, transparent)">
                <span class="material-symbols-outlined" style="font-size: 18px; color: var(--color-primary)">shield_person</span>
              </div>
              <span class="font-bold text-sm" style="color: var(--color-on-surface)">{{ item.name }}</span>
            </div>
          </template>

          <template #tipo="{ item }">
            <span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold"
              :style="`background-color: ${roleTypeStyle(item.type).bg}; color: ${roleTypeStyle(item.type).color}`">
              {{ roleTypeLabel(item.type) }}
            </span>
          </template>

          <template #permisos="{ item }">
            <div v-if="item.permissions.length === 0" class="text-sm" style="color: var(--color-outline)">
              Sin permisos asignados
            </div>
            <div v-else class="flex items-center gap-2 flex-wrap">
              <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold"
                style="background-color: rgba(0,40,142,0.07); color: var(--color-primary)">
                <span class="material-symbols-outlined" style="font-size: 13px">check_circle</span>
                {{ item.permissions.length }} {{ item.permissions.length === 1 ? "permiso" : "permisos" }}
              </span>
              <span v-for="pid in item.permissions.slice(0, 3)" :key="pid"
                class="px-2.5 py-1 rounded-full text-xs font-medium"
                style="background-color: var(--color-surface-container-low); color: var(--color-on-surface-variant)">
                {{ SYSTEM_PERMISSIONS.find(p => p.id === pid)?.label ?? pid }}
              </span>
              <span v-if="item.permissions.length > 3" class="text-xs font-medium" style="color: var(--color-outline)">
                +{{ item.permissions.length - 3 }} más
              </span>
            </div>
          </template>

          <template #acciones="{ item }">
            <div class="flex items-center justify-end gap-2">
              <button
                v-if="auth.hasPermission('editar_rol')"
                @click="router.push(`/roles/${item.id}/editar`)"
                class="w-9 h-9 rounded-full flex items-center justify-center transition-all hover:scale-105 active:scale-95"
                style="background-color: var(--color-surface-container-high)"
                title="Editar permisos">
                <span class="material-symbols-outlined" style="font-size: 18px; color: var(--color-on-surface-variant)">edit</span>
              </button>
              <button
                v-if="auth.hasPermission('eliminar_rol') && !item.type"
                @click="openDeleteModal(item)"
                class="w-9 h-9 rounded-full flex items-center justify-center transition-all hover:scale-105 active:scale-95"
                style="background-color: var(--color-error-container)"
                title="Eliminar rol">
                <span class="material-symbols-outlined" style="font-size: 18px; color: var(--color-error)">delete</span>
              </button>
            </div>
          </template>
        </BaseTable>

        <!-- Footer conteo -->
        <div class="px-6 py-4 flex items-center"
          style="border-top: 1px solid var(--color-hairline-soft); background-color: var(--color-surface-container-lowest)">
          <span class="text-sm" style="color: var(--color-on-surface-variant)">
            <strong style="color: var(--color-on-surface)">{{ roles.length }}</strong>
            {{ roles.length === 1 ? "rol configurado" : "roles configurados" }}
          </span>
        </div>

      </div>
    </main>

    <!-- Modal eliminar -->
    <BaseModal :show="showDeleteModal" title="Eliminar Rol" size="sm" @close="showDeleteModal = false">
      <p class="text-sm mb-4" style="color: var(--color-on-surface-variant)">
        ¿Confirmás que querés eliminar el rol
        <strong style="color: var(--color-on-surface)">{{ deletingRole?.name }}</strong>?
        Solo es posible si no tiene usuarios asignados.
      </p>
      <div v-if="deleteError" class="flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium"
        style="background-color: var(--color-error-container); color: var(--color-on-error-container)">
        <span class="material-symbols-outlined flex-shrink-0" style="font-size: 18px">error</span>
        {{ deleteError }}
      </div>
      <template #footer>
        <div class="flex justify-between w-full">
          <BaseButton variant="secondary" @click="showDeleteModal = false">Cancelar</BaseButton>
          <BaseButton variant="danger" :disabled="isDeleting" @click="confirmDelete">
            <span v-if="isDeleting" class="material-symbols-outlined animate-spin">progress_activity</span>
            {{ isDeleting ? "Eliminando..." : "Eliminar" }}
          </BaseButton>
        </div>
      </template>
    </BaseModal>
  </div>
</template>
