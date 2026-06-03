<script setup lang="ts">
import { ref, computed, onMounted } from "vue"
import { useRouter, useRoute } from "vue-router"
import AppSidebar from "@/components/AppSidebar.vue"
import AppHeader from "@/components/AppHeader.vue"
import BaseButton from "@/components/BaseButton.vue"
import {
  type Role,
  type RoleRequest,
  getRoles,
  createRole,
  updateRole,
  PERMISSION_GROUPS,
} from "@/services/roleService"

const router = useRouter()
const route = useRoute()

const roleId = computed(() => {
  const id = route.params.id
  return id ? Number(id) : null
})
const isEdit = computed(() => roleId.value !== null)

const editingRole = ref<Role | null>(null)
const form = ref<RoleRequest>({ name: "", permissions: [] })
const isLoading = ref(false)
const isSaving = ref(false)
const loadError = ref("")
const saveError = ref("")

const isAdminRole = computed(() => editingRole.value?.type === "admin")

onMounted(async () => {
  if (!isEdit.value) return
  isLoading.value = true
  loadError.value = ""
  try {
    const all = await getRoles()
    const found = all.find(r => r.id === roleId.value)
    if (!found) { loadError.value = "Rol no encontrado."; return }
    editingRole.value = found
    form.value = { name: found.name, permissions: [...found.permissions] }
  } catch (err: unknown) {
    loadError.value = err instanceof Error ? err.message : "Error al cargar el rol."
  } finally {
    isLoading.value = false
  }
})

// ── Permisos ──────────────────────────────────────────────────────────────────

function togglePermission(permId: string) {
  if (isAdminRole.value) return
  const idx = form.value.permissions.indexOf(permId)
  if (idx === -1) form.value.permissions.push(permId)
  else form.value.permissions.splice(idx, 1)
}

function groupPermIds(group: typeof PERMISSION_GROUPS[number]) {
  return group.permissions.map(p => p.id)
}

function isGroupAll(permIds: string[]) {
  return permIds.length > 0 && permIds.every(id => form.value.permissions.includes(id))
}

function isGroupPartial(permIds: string[]) {
  return permIds.some(id => form.value.permissions.includes(id)) && !isGroupAll(permIds)
}

function toggleGroup(permIds: string[]) {
  if (isAdminRole.value) return
  if (isGroupAll(permIds)) {
    form.value.permissions = form.value.permissions.filter(id => !permIds.includes(id))
  } else {
    const toAdd = permIds.filter(id => !form.value.permissions.includes(id))
    form.value.permissions.push(...toAdd)
  }
}

// ── Guardar ───────────────────────────────────────────────────────────────────

async function submit() {
  if (isSaving.value || isAdminRole.value) return
  if (!form.value.name.trim()) { saveError.value = "El nombre del rol es obligatorio."; return }
  isSaving.value = true
  saveError.value = ""
  try {
    if (isEdit.value && editingRole.value) {
      await updateRole(editingRole.value.id, form.value)
    } else {
      await createRole(form.value)
    }
    router.push("/roles")
  } catch (err: unknown) {
    saveError.value = err instanceof Error ? err.message : "Error al guardar el rol."
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
        <div class="flex items-center gap-3 mb-8">
          <button @click="router.push('/roles')"
            class="w-10 h-10 rounded-full flex items-center justify-center transition-all hover:scale-105"
            style="background-color: var(--color-surface-container-high)">
            <span class="material-symbols-outlined" style="font-size: 20px; color: var(--color-on-surface-variant)">arrow_back</span>
          </button>
          <div>
            <h1 class="text-4xl font-extrabold tracking-tight mb-1">
              {{ isEdit ? `Editar: ${editingRole?.name ?? ''}` : 'Nuevo Rol' }}
            </h1>
            <p class="font-medium" style="color: var(--color-on-surface-variant)">
              {{ isEdit ? 'Modificá el nombre y los permisos del rol.' : 'Definí un nombre y seleccioná los permisos.' }}
            </p>
          </div>
        </div>

        <!-- Loading -->
        <div v-if="isLoading" class="flex justify-center py-24">
          <span class="material-symbols-outlined animate-spin" style="font-size: 36px; color: var(--color-primary)">progress_activity</span>
        </div>

        <!-- Error de carga -->
        <div v-else-if="loadError" class="flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium"
          style="background-color: var(--color-error-container); color: var(--color-on-error-container)">
          <span class="material-symbols-outlined" style="font-size: 18px">error</span>
          {{ loadError }}
        </div>

        <template v-else>

          <!-- Aviso rol de sistema gestionado -->
          <div v-if="isAdminRole"
            class="flex items-start gap-3 rounded-2xl px-4 py-3 mb-6 text-sm"
            style="background-color: rgba(0,40,142,0.06); border: 1px solid rgba(0,40,142,0.15); color: var(--color-primary)">
            <span class="material-symbols-outlined flex-shrink-0 mt-0.5" style="font-size: 18px">info</span>
            <span>
              El rol <strong>Administrador</strong> es gestionado automáticamente por el sistema.
              Sus permisos se sincronizan en cada reinicio del backend y no pueden modificarse desde aquí.
            </span>
          </div>

          <!-- Error de guardado -->
          <div v-if="saveError" class="flex items-center gap-2 rounded-2xl px-4 py-3 mb-6 text-sm font-medium"
            style="background-color: var(--color-error-container); color: var(--color-on-error-container)">
            <span class="material-symbols-outlined" style="font-size: 18px">error</span>
            {{ saveError }}
          </div>

          <!-- Nombre del rol -->
          <div class="rounded-3xl p-6 mb-8"
            style="background-color: var(--color-surface-container-lowest); border: 1px solid rgba(196,197,213,0.2)">
            <label class="block text-xs font-bold uppercase tracking-wider mb-1.5"
              style="color: var(--color-outline)">Nombre del rol *</label>
            <input
              v-model="form.name"
              type="text"
              :disabled="isAdminRole"
              placeholder="Ej: Recepcionista, Encargado de caja..."
              class="w-full px-4 h-12 text-sm outline-none appearance-none shadow-none"
              style="border-radius: 12px; border: 1px solid var(--color-outline-variant); color: var(--color-on-surface); background-color: var(--color-surface); max-width: 480px"
            />
          </div>

          <!-- Sección permisos -->
          <div class="flex items-center justify-between mb-5">
            <div>
              <h3 class="text-xl font-extrabold" style="color: var(--color-primary)">Permisos</h3>
              <p class="text-sm mt-0.5" style="color: var(--color-on-surface-variant)">
                {{ form.permissions.length }} permiso{{ form.permissions.length !== 1 ? 's' : '' }} seleccionado{{ form.permissions.length !== 1 ? 's' : '' }}
              </p>
            </div>
          </div>

          <!-- Grid de cards -->
          <div class="grid gap-4" style="grid-template-columns: repeat(auto-fill, minmax(300px, 1fr))">
            <div v-for="group in PERMISSION_GROUPS" :key="group.module"
              class="rounded-2xl overflow-hidden"
              style="background-color: var(--color-surface-container-lowest); border: 1px solid rgba(196,197,213,0.2)">

              <!-- Header del módulo (toggle all) -->
              <button
                type="button"
                :disabled="isAdminRole"
                @click="toggleGroup(groupPermIds(group))"
                class="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors"
                :class="isAdminRole ? 'cursor-default' : 'cursor-pointer hover:bg-surface-container-low'"
                style="border-bottom: 1px solid rgba(196,197,213,0.15)">

                <div class="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors"
                  :style="isGroupAll(groupPermIds(group))
                    ? 'background-color: var(--color-primary)'
                    : 'background-color: rgba(0,40,142,0.08)'">
                  <span class="material-symbols-outlined transition-colors"
                    :style="`font-size: 18px; color: ${isGroupAll(groupPermIds(group)) ? 'white' : 'var(--color-primary)'}`">
                    {{ group.icon }}
                  </span>
                </div>

                <div class="flex-1 min-w-0">
                  <p class="font-bold text-sm" style="color: var(--color-on-surface)">{{ group.module }}</p>
                  <p class="text-xs" style="color: var(--color-outline)">{{ group.description }}</p>
                </div>

                <!-- Checkbox estado del grupo -->
                <div v-if="!isAdminRole"
                  class="w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all"
                  :style="isGroupAll(groupPermIds(group))
                    ? 'border-color: var(--color-primary); background-color: var(--color-primary);'
                    : isGroupPartial(groupPermIds(group))
                      ? 'border-color: var(--color-primary); background-color: rgba(0,40,142,0.1);'
                      : 'border-color: var(--color-outline-variant);'">
                  <span v-if="isGroupAll(groupPermIds(group))"
                    class="material-symbols-outlined text-white" style="font-size: 12px">check</span>
                  <span v-else-if="isGroupPartial(groupPermIds(group))"
                    class="block rounded-full" style="width: 10px; height: 2px; background-color: var(--color-primary)"></span>
                </div>
              </button>

              <!-- Checkboxes de permisos -->
              <div class="px-4 py-3 space-y-1">
                <div
                  v-for="perm in group.permissions"
                  :key="perm.id"
                  class="flex items-center gap-3 py-1.5 px-2 rounded-lg transition-colors"
                  :class="isAdminRole ? 'opacity-60' : 'cursor-pointer hover:bg-surface-container-low'"
                  @click="!isAdminRole && togglePermission(perm.id)">

                  <div class="w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all"
                    :style="form.permissions.includes(perm.id)
                      ? 'border-color: var(--color-primary); background-color: var(--color-primary);'
                      : 'border-color: var(--color-outline-variant);'">
                    <span v-if="form.permissions.includes(perm.id)"
                      class="material-symbols-outlined text-white" style="font-size: 12px">check</span>
                  </div>

                  <span class="text-sm select-none" style="color: var(--color-on-surface)">{{ perm.label }}</span>
                </div>
              </div>

            </div>
          </div>

          <!-- Acciones -->
          <div class="flex items-center justify-end gap-3 mt-8">
            <BaseButton variant="secondary" size="default" @click="router.push('/roles')">Cancelar</BaseButton>
            <BaseButton
              v-if="!isAdminRole"
              variant="primary"
              size="lg"
              :disabled="isSaving"
              @click="submit">
              <span v-if="isSaving" class="material-symbols-outlined animate-spin">progress_activity</span>
              {{ isSaving ? "Guardando..." : (isEdit ? "Guardar Cambios" : "Crear Rol") }}
            </BaseButton>
          </div>

        </template>
      </div>
    </main>
  </div>
</template>
