<script setup lang="ts">
import { ref, computed, watch, onMounted } from "vue"
import AppSidebar from "@/components/AppSidebar.vue"
import AppHeader from "@/components/AppHeader.vue"
import BaseButton from "@/components/BaseButton.vue"
import BaseModal from "@/components/BaseModal.vue"
import BaseTable from "@/components/BaseTable.vue"
import { useAuthStore } from "@/stores/auth"
import { type AppUser, getAppUsers, deactivateUser } from "@/services/userService"

// ── Paginación ────────────────────────────────────────────────────────────────

const PAGE_SIZE = 8
import {
  type Role,
  type RoleRequest,
  getRoles,
  createRole,
  updateRole,
  deleteRole,
  getRolesByUser,
  assignRoleToUser,
  removeRoleFromUser,
  SYSTEM_PERMISSIONS,
  PERMISSION_MATRIX,
  MATRIX_COLUMNS,
} from "@/services/roleService"

const auth = useAuthStore()

// ── Tab activo ────────────────────────────────────────────────────────────────

const activeTab = ref<"usuarios" | "roles">("usuarios")

// ── Helpers ───────────────────────────────────────────────────────────────────

const AVATAR_PALETTE = [
  { bg: "rgba(0,40,142,0.06)", color: "var(--color-primary)" },
  { bg: "rgba(0,103,128,0.06)", color: "var(--color-secondary)" },
  { bg: "rgba(32,0,177,0.06)", color: "var(--color-tertiary)" },
  { bg: "rgba(117,118,132,0.08)", color: "var(--color-outline)" },
]

const ROLE_COLORS = [
  { bg: "rgba(0,40,142,0.10)", color: "var(--color-primary)", border: "rgba(0,40,142,0.2)" },
  { bg: "rgba(0,103,128,0.10)", color: "var(--color-secondary)", border: "rgba(0,103,128,0.2)" },
  { bg: "rgba(32,0,177,0.10)", color: "var(--color-tertiary)", border: "rgba(32,0,177,0.2)" },
  { bg: "rgba(186,26,26,0.10)", color: "var(--color-error)", border: "rgba(186,26,26,0.2)" },
]

const AVATAR_FALLBACK = { bg: "rgba(0,40,142,0.06)", color: "var(--color-primary)" }
const ROLE_FALLBACK = {
  bg: "rgba(0,40,142,0.10)",
  color: "var(--color-primary)",
  border: "rgba(0,40,142,0.2)",
}

function avatarStyle(userId: number) {
  return AVATAR_PALETTE[userId % AVATAR_PALETTE.length] ?? AVATAR_FALLBACK
}

function initials(firstName: string, lastName: string) {
  return `${firstName[0] ?? ""}${lastName[0] ?? ""}`.toUpperCase()
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-AR", {
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

function userTypeStyle(type: AppUser["type"]) {
  if (type === "Profesional") return { bg: "rgba(32,0,177,0.08)", color: "var(--color-tertiary)" }
  if (type === "Paciente") return { bg: "rgba(0,103,128,0.08)", color: "var(--color-secondary)" }
  if (type === "Administrador") return { bg: "rgba(0,40,142,0.08)", color: "var(--color-primary)" }
  return { bg: "rgba(0,40,142,0.08)", color: "var(--color-primary)" }
}

function roleChipStyle(roleId: number) {
  return ROLE_COLORS[roleId % ROLE_COLORS.length] ?? ROLE_FALLBACK
}

function hasPerm(permissions: string[], permId: string | undefined): boolean {
  return !!permId && permissions.includes(permId)
}

// ── TAB USUARIOS ──────────────────────────────────────────────────────────────

const users = ref<AppUser[]>([])
const isLoadingUsers = ref(false)
const loadUsersError = ref("")

const activeFilter = ref("todos")
const showFilterDropdown = ref(false)

const filters = [
  { id: "todos", label: "Todos", icon: "group" },
  { id: "profesionales", label: "Profesionales", icon: "medical_services" },
  { id: "pacientes", label: "Pacientes", icon: "person" },
  { id: "administradores", label: "Administradores", icon: "shield_person" },
  { id: "usuarios", label: "Usuarios", icon: "manage_accounts" },
  { id: "activos", label: "Activos", icon: "check_circle" },
  { id: "inactivos", label: "Inactivos", icon: "cancel" },
]

const activeFilterLabel = computed(
  () => filters.find((f) => f.id === activeFilter.value)?.label ?? "Todos",
)

const filteredUsers = computed(() => {
  switch (activeFilter.value) {
    case "profesionales":
      return users.value.filter((u) => u.type === "Profesional")
    case "pacientes":
      return users.value.filter((u) => u.type === "Paciente")
    case "administradores":
      return users.value.filter((u) => u.type === "Administrador")
    case "usuarios":
      return users.value.filter((u) => u.type === "Usuario")
    case "activos":
      return users.value.filter((u) => u.isActive)
    case "inactivos":
      return users.value.filter((u) => !u.isActive)
    default:
      return users.value
  }
})

function selectFilter(id: string) {
  activeFilter.value = id
  showFilterDropdown.value = false
}

// ── Paginación de usuarios ────────────────────────────────────────────────────

const currentPage = ref(1)

const totalPages = computed(() => Math.max(1, Math.ceil(filteredUsers.value.length / PAGE_SIZE)))

const paginatedUsers = computed(() => {
  const start = (currentPage.value - 1) * PAGE_SIZE
  return filteredUsers.value.slice(start, start + PAGE_SIZE)
})

const paginationStart = computed(() => {
  if (filteredUsers.value.length === 0) return 0
  return (currentPage.value - 1) * PAGE_SIZE + 1
})

const paginationEnd = computed(() =>
  Math.min(currentPage.value * PAGE_SIZE, filteredUsers.value.length),
)

const visiblePages = computed(() => {
  const total = totalPages.value
  if (total <= 5) return Array.from({ length: total }, (_, i) => i + 1)
  let start = Math.max(1, currentPage.value - 2)
  const end = Math.min(total, start + 4)
  if (end - start < 4) start = Math.max(1, end - 4)
  return Array.from({ length: end - start + 1 }, (_, i) => start + i)
})

// Resetear a página 1 cuando cambia el filtro
watch(activeFilter, () => {
  currentPage.value = 1
})

async function loadUsers() {
  isLoadingUsers.value = true
  loadUsersError.value = ""
  try {
    users.value = await getAppUsers(true)
  } catch (err: unknown) {
    loadUsersError.value = err instanceof Error ? err.message : "Error al cargar usuarios."
  } finally {
    isLoadingUsers.value = false
  }
}

// ── Modal: Gestionar Roles de un Usuario ──────────────────────────────────────

const isDeactivating = ref(false)
const deactivateError = ref("")

async function handleDeactivate() {
  if (!managingUser.value) return
  isDeactivating.value = true
  deactivateError.value = ""
  try {
    await deactivateUser(managingUser.value.userId)
    const u = users.value.find((u) => u.userId === managingUser.value!.userId)
    if (u) u.isActive = false
    showRolesModal.value = false
  } catch (err: unknown) {
    deactivateError.value = err instanceof Error ? err.message : "Error al desactivar usuario."
  } finally {
    isDeactivating.value = false
  }
}

const showRolesModal = ref(false)
const managingUser = ref<AppUser | null>(null)
const userCurrentRoles = ref<Role[]>([])
const isLoadingUserRoles = ref(false)
const rolesModalError = ref("")
const selectedRolesToAdd = ref<number[]>([])
const isAssigning = ref(false)
const removingRoleId = ref<number | null>(null)

const availableRolesToAdd = computed(() => {
  const currentIds = new Set(userCurrentRoles.value.map((r) => r.id))
  return allRoles.value.filter((r) => !currentIds.has(r.id))
})

async function openRolesModal(user: AppUser) {
  managingUser.value = user
  showRolesModal.value = true
  isLoadingUserRoles.value = true
  rolesModalError.value = ""
  selectedRolesToAdd.value = []
  userCurrentRoles.value = []
  try {
    const [userRoles, fetchedRoles] = await Promise.all([
      getRolesByUser(user.userId),
      allRoles.value.length ? Promise.resolve(allRoles.value) : getRoles(),
    ])
    userCurrentRoles.value = userRoles
    if (!allRoles.value.length) allRoles.value = fetchedRoles
  } catch (err: unknown) {
    rolesModalError.value = err instanceof Error ? err.message : "Error al cargar roles."
  } finally {
    isLoadingUserRoles.value = false
  }
}

function toggleRoleSelection(roleId: number) {
  const idx = selectedRolesToAdd.value.indexOf(roleId)
  if (idx === -1) selectedRolesToAdd.value.push(roleId)
  else selectedRolesToAdd.value.splice(idx, 1)
}

async function handleAssignRole() {
  if (!managingUser.value || selectedRolesToAdd.value.length === 0 || isAssigning.value) return
  isAssigning.value = true
  rolesModalError.value = ""
  try {
    await Promise.all(
      selectedRolesToAdd.value.map((id) => assignRoleToUser(managingUser.value!.userId, id)),
    )
    const newRoles = allRoles.value.filter((r) => selectedRolesToAdd.value.includes(r.id))
    userCurrentRoles.value.push(...newRoles)
    selectedRolesToAdd.value = []
  } catch (err: unknown) {
    rolesModalError.value = err instanceof Error ? err.message : "Error al asignar roles."
  } finally {
    isAssigning.value = false
  }
}

async function handleRemoveRole(roleId: number) {
  if (!managingUser.value || removingRoleId.value !== null) return
  removingRoleId.value = roleId
  rolesModalError.value = ""
  try {
    await removeRoleFromUser(managingUser.value.userId, roleId)
    userCurrentRoles.value = userCurrentRoles.value.filter((r) => r.id !== roleId)
  } catch (err: unknown) {
    rolesModalError.value = err instanceof Error ? err.message : "Error al quitar rol."
  } finally {
    removingRoleId.value = null
  }
}

// ── TAB ROLES ─────────────────────────────────────────────────────────────────

const roles = ref<Role[]>([])
const allRoles = ref<Role[]>([])
const isLoadingRoles = ref(false)
const loadRolesError = ref("")

async function loadRoles() {
  isLoadingRoles.value = true
  loadRolesError.value = ""
  try {
    const fetched = await getRoles()
    roles.value = fetched
    allRoles.value = [...fetched]
  } catch (err: unknown) {
    loadRolesError.value = err instanceof Error ? err.message : "Error al cargar roles."
  } finally {
    isLoadingRoles.value = false
  }
}

// ── Modal: Crear Rol ──────────────────────────────────────────────────────────

const showCreateRoleModal = ref(false)
const createRoleForm = ref<RoleRequest>({ name: "", permissions: [] })
const createRoleError = ref("")
const isSavingCreateRole = ref(false)

function openCreateRoleModal() {
  createRoleForm.value = { name: "", permissions: [] }
  createRoleError.value = ""
  showCreateRoleModal.value = true
}

function toggleCreatePermission(id: string | undefined) {
  if (!id) return
  const idx = createRoleForm.value.permissions.indexOf(id)
  if (idx === -1) createRoleForm.value.permissions.push(id)
  else createRoleForm.value.permissions.splice(idx, 1)
}

async function submitCreateRole() {
  if (isSavingCreateRole.value) return
  createRoleError.value = ""
  isSavingCreateRole.value = true
  try {
    const created = await createRole(createRoleForm.value)
    roles.value.push(created)
    allRoles.value.push(created)
    showCreateRoleModal.value = false
  } catch (err: unknown) {
    createRoleError.value = err instanceof Error ? err.message : "Error al crear rol."
  } finally {
    isSavingCreateRole.value = false
  }
}

// ── Modal: Editar Rol ─────────────────────────────────────────────────────────

const showEditRoleModal = ref(false)
const editingRole = ref<Role | null>(null)
const editRoleForm = ref<RoleRequest>({ name: "", permissions: [] })
const editRoleError = ref("")
const isSavingEditRole = ref(false)

function openEditRoleModal(role: Role) {
  editingRole.value = role
  editRoleForm.value = { name: role.name, permissions: [...role.permissions] }
  editRoleError.value = ""
  showEditRoleModal.value = true
}

function toggleEditPermission(id: string | undefined) {
  if (!id) return
  const idx = editRoleForm.value.permissions.indexOf(id)
  if (idx === -1) editRoleForm.value.permissions.push(id)
  else editRoleForm.value.permissions.splice(idx, 1)
}

async function submitEditRole() {
  if (isSavingEditRole.value || !editingRole.value) return
  editRoleError.value = ""
  isSavingEditRole.value = true
  try {
    const updated = await updateRole(editingRole.value.id, editRoleForm.value)
    const idx = roles.value.findIndex((r) => r.id === editingRole.value!.id)
    if (idx !== -1) roles.value[idx] = updated
    const allIdx = allRoles.value.findIndex((r) => r.id === editingRole.value!.id)
    if (allIdx !== -1) allRoles.value[allIdx] = updated
    showEditRoleModal.value = false
  } catch (err: unknown) {
    editRoleError.value = err instanceof Error ? err.message : "Error al actualizar rol."
  } finally {
    isSavingEditRole.value = false
  }
}

// ── Modal: Eliminar Rol ───────────────────────────────────────────────────────

const showDeleteRoleModal = ref(false)
const deletingRole = ref<Role | null>(null)
const deleteRoleError = ref("")
const isDeletingRole = ref(false)

function openDeleteRoleModal(role: Role) {
  deletingRole.value = role
  deleteRoleError.value = ""
  showDeleteRoleModal.value = true
}

async function confirmDeleteRole() {
  if (isDeletingRole.value || !deletingRole.value) return
  isDeletingRole.value = true
  deleteRoleError.value = ""
  try {
    await deleteRole(deletingRole.value.id)
    roles.value = roles.value.filter((r) => r.id !== deletingRole.value!.id)
    allRoles.value = allRoles.value.filter((r) => r.id !== deletingRole.value!.id)
    showDeleteRoleModal.value = false
  } catch (err: unknown) {
    deleteRoleError.value = err instanceof Error ? err.message : "Error al eliminar rol."
  } finally {
    isDeletingRole.value = false
  }
}

// ── Init ──────────────────────────────────────────────────────────────────────

onMounted(() => {
  loadUsers()
  loadRoles()
})

const userColumns = [
  { key: "usuario", label: "Usuario" },
  { key: "ci", label: "C.I." },
  { key: "tipo", label: "Tipo" },
  { key: "registro", label: "Registro" },
  { key: "estado", label: "Estado" },
  { key: "acciones", label: "Acciones", align: "right" as const },
]

const roleColumns = [
  { key: "nombre", label: "Nombre del Rol" },
  { key: "accionesAsignadas", label: "Acciones asignadas" },
  { key: "opciones", label: "Opciones", align: "right" as const },
]
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
            <h1 class="text-4xl font-extrabold tracking-tight mb-2">Usuarios y Roles</h1>
            <p class="font-medium" style="color: var(--color-on-surface-variant)">
              Administre los usuarios del sistema y configure los roles de acceso.
            </p>
          </div>

          <BaseButton
            v-if="activeTab === 'roles' && auth.hasPermission('crear_rol')"
            variant="primary"
            size="lg"
            @click="openCreateRoleModal"
          >
            <span
              class="material-symbols-outlined"
              style="width: 20px; height: 20px; font-size: 20px"
              >add</span
            >
            Nuevo Rol
          </BaseButton>
        </div>

        <!-- Tabs -->
        <div class="flex items-center gap-2 mb-8">
          <button
            @click="activeTab = 'usuarios'"
            class="flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-semibold transition-all"
            :style="
              activeTab === 'usuarios'
                ? 'background-color: var(--color-primary); color: var(--color-on-primary);'
                : 'background-color: var(--color-surface-container-high); color: var(--color-on-surface-variant);'
            "
          >
            <span
              class="material-symbols-outlined"
              style="font-size: 18px; width: 18px; height: 18px"
              >manage_accounts</span
            >
            Usuarios
          </button>
          <button
            @click="activeTab = 'roles'"
            class="flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-semibold transition-all"
            :style="
              activeTab === 'roles'
                ? 'background-color: var(--color-primary); color: var(--color-on-primary);'
                : 'background-color: var(--color-surface-container-high); color: var(--color-on-surface-variant);'
            "
          >
            <span
              class="material-symbols-outlined"
              style="font-size: 18px; width: 18px; height: 18px"
              >shield_person</span
            >
            Roles
            <span
              v-if="roles.length"
              class="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black"
              :style="
                activeTab === 'roles'
                  ? 'background-color: var(--color-primary-fixed-dim); color: var(--color-on-primary-fixed-variant);'
                  : 'background-color: rgba(0,40,142,0.1); color: var(--color-primary);'
              "
              >{{ roles.length }}</span
            >
          </button>
        </div>

        <!-- ══════════════════════════════════════════════════
             TAB: USUARIOS
        ══════════════════════════════════════════════════ -->
        <div v-if="activeTab === 'usuarios'">
          <!-- Filtro desplegable -->
          <div class="relative mb-8 inline-block">
            <!-- Backdrop invisible para cerrar al hacer clic afuera -->
            <div
              v-if="showFilterDropdown"
              class="fixed inset-0 z-10"
              @click="showFilterDropdown = false"
            />

            <!-- Botón trigger -->
            <button
              @click="showFilterDropdown = !showFilterDropdown"
              class="flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold transition-all"
              :style="
                showFilterDropdown || activeFilter !== 'todos'
                  ? 'background-color: var(--color-primary); color: var(--color-on-primary);'
                  : 'background-color: var(--color-surface-container-high); color: var(--color-on-surface-variant);'
              "
            >
              <span
                class="material-symbols-outlined"
                style="font-size: 18px; width: 18px; height: 18px"
                >filter_list</span
              >
              {{ activeFilterLabel }}
              <span
                class="material-symbols-outlined transition-transform duration-200"
                :style="`font-size:18px; width:18px; height:18px; transform: rotate(${showFilterDropdown ? '180deg' : '0deg'})`"
                >expand_more</span
              >
            </button>

            <!-- Menú desplegable -->
            <Transition
              enter-active-class="transition-all duration-150 ease-out"
              enter-from-class="opacity-0 translate-y-1"
              enter-to-class="opacity-100 translate-y-0"
              leave-active-class="transition-all duration-100 ease-in"
              leave-from-class="opacity-100 translate-y-0"
              leave-to-class="opacity-0 translate-y-1"
            >
              <div
                v-if="showFilterDropdown"
                class="absolute left-0 top-full mt-2 z-20 rounded-2xl overflow-hidden py-1.5"
                style="
                  min-width: 196px;
                  background-color: var(--color-surface-container-lowest);
                  box-shadow:
                    0 8px 32px rgba(0, 40, 142, 0.14),
                    0 1px 4px rgba(0, 0, 0, 0.06);
                  outline: 1px solid rgba(196, 197, 213, 0.2);
                "
              >
                <button
                  v-for="f in filters"
                  :key="f.id"
                  @click="selectFilter(f.id)"
                  class="w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold transition-colors text-left"
                  :style="
                    activeFilter === f.id
                      ? 'background-color: rgba(0,40,142,0.06); color: var(--color-primary);'
                      : 'color: var(--color-on-surface-variant);'
                  "
                  onmouseover="
                    if (this.dataset.active !== 'true')
                      this.style.backgroundColor = 'var(--color-surface-container-low)'
                  "
                  onmouseout="if (this.dataset.active !== 'true') this.style.backgroundColor = ''"
                  :data-active="activeFilter === f.id"
                >
                  <span
                    class="material-symbols-outlined"
                    style="font-size: 18px; width: 18px; height: 18px"
                    >{{ f.icon }}</span
                  >
                  {{ f.label }}
                  <span
                    v-if="activeFilter === f.id"
                    class="material-symbols-outlined ml-auto"
                    style="font-size: 16px; width: 16px; height: 16px; color: var(--color-primary)"
                    >check</span
                  >
                </button>
              </div>
            </Transition>
          </div>

          <!-- Loading -->
          <div v-if="isLoadingUsers" class="flex justify-center py-24">
            <svg
              class="animate-spin w-8 h-8"
              style="color: var(--color-primary)"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                class="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                stroke-width="4"
              />
              <path
                class="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
          </div>

          <!-- Error -->
          <div
            v-else-if="loadUsersError"
            class="flex items-center gap-2.5 rounded-2xl px-4 py-3 text-sm font-medium"
            style="
              background-color: var(--color-error-container);
              color: var(--color-on-error-container);
            "
          >
            <span class="material-symbols-outlined" style="font-size: 18px">error</span>
            {{ loadUsersError }}
          </div>

          <!-- Tabla de usuarios -->
          <template v-else>
            <BaseTable
              :columns="userColumns"
              :items="paginatedUsers"
              :loading="isLoadingUsers"
              empty-text="No hay usuarios para mostrar."
            >
              <template #usuario="{ item }">
                <div class="flex items-center gap-3">
                  <div
                    class="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                    :style="`background-color: ${avatarStyle(item.userId).bg}; color: ${avatarStyle(item.userId).color};`"
                  >
                    {{ initials(item.firstName, item.lastName) }}
                  </div>
                  <div>
                    <div class="font-bold text-sm" style="color: var(--color-on-surface)">
                      {{ item.firstName }} {{ item.lastName }}
                    </div>
                    <div class="text-xs" style="color: var(--color-on-surface-variant)">
                      {{ item.email }}
                    </div>
                  </div>
                </div>
              </template>

              <template #ci="{ item }">
                <span
                  class="text-sm font-medium tracking-wider"
                  style="color: var(--color-on-surface-variant)"
                >
                  {{ item.ci }}
                </span>
              </template>

              <template #tipo="{ item }">
                <span
                  class="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold"
                  :style="`background-color: ${userTypeStyle(item.type).bg}; color: ${userTypeStyle(item.type).color};`"
                  >{{ item.type }}</span
                >
              </template>

              <template #registro="{ item }">
                <span class="text-sm" style="color: var(--color-on-surface-variant)">{{
                  formatDate(item.createdAt)
                }}</span>
              </template>

              <template #estado="{ item }">
                <span
                  class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider"
                  :style="`background-color: ${statusStyle(item.isActive).bg}; color: ${statusStyle(item.isActive).text};`"
                >
                  <span
                    class="w-1.5 h-1.5 rounded-full"
                    :style="`background-color: ${statusStyle(item.isActive).dot};`"
                  ></span>
                  {{ statusStyle(item.isActive).label }}
                </span>
              </template>

              <template #acciones="{ item }">
                <div class="flex justify-end opacity-40 group-hover:opacity-100 transition-opacity">
                  <BaseButton
                    v-if="auth.hasPermission('editar_usuario')"
                    variant="ghost"
                    size="sm"
                    style="color: var(--color-primary)"
                    @click.stop="openRolesModal(item)"
                  >
                    <span
                      class="material-symbols-outlined"
                      style="width: 16px; height: 16px; font-size: 16px"
                      >shield_person</span
                    >
                    Gestionar Roles
                  </BaseButton>
                </div>
              </template>
            </BaseTable>

            <!-- Footer con conteo y paginación -->
            <div
              class="px-6 py-4 flex items-center justify-between flex-wrap gap-4 bg-white"
              style="border-top: 1px solid rgba(196, 197, 213, 0.12)"
            >
              <!-- Conteo -->
              <span class="text-sm" style="color: var(--color-on-surface-variant)">
                Mostrando
                <strong style="color: var(--color-on-surface)"
                  >{{ paginationStart }}–{{ paginationEnd }}</strong
                >
                de
                <strong style="color: var(--color-on-surface)">{{ filteredUsers.length }}</strong>
                usuarios
              </span>

              <!-- Controles de página -->
              <div v-if="totalPages > 1" class="flex items-center gap-1">
                <!-- Anterior -->
                <button
                  @click="currentPage--"
                  :disabled="currentPage === 1"
                  class="w-9 h-9 rounded-full flex items-center justify-center transition-all disabled:opacity-30"
                  style="color: var(--color-on-surface-variant)"
                  onmouseover="
                    if (!this.disabled)
                      this.style.backgroundColor = 'var(--color-surface-container-high)'
                  "
                  onmouseout="this.style.backgroundColor = ''"
                >
                  <span
                    class="material-symbols-outlined"
                    style="font-size: 20px; width: 20px; height: 20px"
                    >chevron_left</span
                  >
                </button>

                <!-- Elipsis izquierdo -->
                <span
                  v-if="visiblePages[0] && visiblePages[0] > 1"
                  class="w-9 h-9 flex items-center justify-center text-sm"
                  style="color: var(--color-outline)"
                  >…</span
                >

                <!-- Números de página -->
                <button
                  v-for="page in visiblePages"
                  :key="page"
                  @click="currentPage = page"
                  class="w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold transition-all"
                  :style="
                    currentPage === page
                      ? 'background-color: var(--color-primary); color: white;'
                      : 'color: var(--color-on-surface-variant);'
                  "
                  :onmouseover="
                    currentPage !== page
                      ? `this.style.backgroundColor='var(--color-surface-container-high)'`
                      : ''
                  "
                  :onmouseout="currentPage !== page ? `this.style.backgroundColor=''` : ''"
                >
                  {{ page }}
                </button>

                <!-- Elipsis derecho -->
                <span
                  v-if="(visiblePages.at(-1) ?? 0) < totalPages"
                  class="w-9 h-9 flex items-center justify-center text-sm"
                  style="color: var(--color-outline)"
                  >…</span
                >

                <!-- Siguiente -->
                <button
                  @click="currentPage++"
                  :disabled="currentPage === totalPages"
                  class="w-9 h-9 rounded-full flex items-center justify-center transition-all disabled:opacity-30"
                  style="color: var(--color-on-surface-variant)"
                  onmouseover="
                    if (!this.disabled)
                      this.style.backgroundColor = 'var(--color-surface-container-high)'
                  "
                  onmouseout="this.style.backgroundColor = ''"
                >
                  <span
                    class="material-symbols-outlined"
                    style="font-size: 20px; width: 20px; height: 20px"
                    >chevron_right</span
                  >
                </button>
              </div>
            </div>
          </template>

          <!-- Bento insight cards -->
          <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mt-10">
            <div
              class="p-8 rounded-2xl flex flex-col justify-between"
              style="background-color: var(--color-surface-container-low); height: 192px"
            >
              <span
                class="material-symbols-outlined"
                style="color: var(--color-primary); font-size: 32px; width: 32px; height: 32px"
                >person_check</span
              >
              <div>
                <div class="text-3xl font-black" style="color: var(--color-on-surface)">
                  {{ users.filter((u) => u.isActive).length }}
                </div>
                <div
                  class="text-xs font-bold uppercase tracking-widest mt-1"
                  style="color: var(--color-outline)"
                >
                  Usuarios Activos
                </div>
              </div>
            </div>

            <div
              class="p-8 rounded-2xl flex flex-col justify-between"
              style="background-color: var(--color-surface-container-low); height: 192px"
            >
              <span
                class="material-symbols-outlined"
                style="color: var(--color-tertiary); font-size: 32px; width: 32px; height: 32px"
                >medical_services</span
              >
              <div>
                <div class="text-3xl font-black" style="color: var(--color-on-surface)">
                  {{ users.filter((u) => u.type === "Profesional").length }}
                </div>
                <div
                  class="text-xs font-bold uppercase tracking-widest mt-1"
                  style="color: var(--color-outline)"
                >
                  Profesionales
                </div>
              </div>
            </div>

            <div
              class="p-8 rounded-2xl flex flex-col justify-between"
              style="
                background: linear-gradient(
                  135deg,
                  var(--color-primary) 0%,
                  var(--color-primary-container) 100%
                );
                height: 192px;
                box-shadow: 0 8px 24px rgba(0, 40, 142, 0.25);
              "
            >
              <span
                class="material-symbols-outlined"
                style="
                  color: var(--color-primary-fixed);
                  font-size: 32px;
                  width: 32px;
                  height: 32px;
                "
                >shield_person</span
              >
              <div>
                <div class="text-sm font-medium mb-1" style="color: rgba(221, 225, 255, 0.75)">
                  Roles configurados
                </div>
                <div class="text-lg font-bold text-white leading-snug">
                  {{ roles.length }}
                  {{ roles.length === 1 ? "rol disponible" : "roles disponibles" }} en el sistema.
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- ══════════════════════════════════════════════════
             TAB: ROLES
        ══════════════════════════════════════════════════ -->
        <div v-if="activeTab === 'roles'">
          <!-- Loading -->
          <div v-if="isLoadingRoles" class="flex justify-center py-24">
            <svg
              class="animate-spin w-8 h-8"
              style="color: var(--color-primary)"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                class="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                stroke-width="4"
              />
              <path
                class="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
          </div>

          <!-- Error -->
          <div
            v-else-if="loadRolesError"
            class="flex items-center gap-2.5 rounded-2xl px-4 py-3 text-sm font-medium"
            style="
              background-color: var(--color-error-container);
              color: var(--color-on-error-container);
            "
          >
            <span class="material-symbols-outlined" style="font-size: 18px">error</span>
            {{ loadRolesError }}
          </div>

          <!-- Tabla de roles -->
          <template v-else>
            <BaseTable
              :columns="roleColumns"
              :items="roles"
              :loading="isLoadingRoles"
              empty-text="No hay roles configurados. Crea el primero."
            >
              <template #nombre="{ item }">
                <div class="flex items-center gap-3">
                  <div
                    class="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                    :style="`background-color: ${roleChipStyle(item.id).bg};`"
                  >
                    <span
                      class="material-symbols-outlined"
                      :style="`font-size:18px; width:18px; height:18px; color: ${roleChipStyle(item.id).color};`"
                      >shield_person</span
                    >
                  </div>
                  <span class="font-bold text-sm" style="color: var(--color-on-surface)">{{
                    item.name
                  }}</span>
                </div>
              </template>

              <template #accionesAsignadas="{ item }">
                <div
                  v-if="item.permissions.length === 0"
                  class="text-sm"
                  style="color: var(--color-outline)"
                >
                  Sin acciones asignadas
                </div>
                <div v-else class="flex items-center gap-2 flex-wrap">
                  <span
                    class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold"
                    style="background-color: rgba(0, 40, 142, 0.07); color: var(--color-primary)"
                  >
                    <span
                      class="material-symbols-outlined"
                      style="font-size: 13px; width: 13px; height: 13px"
                      >check_circle</span
                    >
                    {{ item.permissions.length }}
                    {{ item.permissions.length === 1 ? "acción" : "acciones" }}
                  </span>
                  <span
                    v-for="pid in item.permissions.slice(0, 3)"
                    :key="pid"
                    class="px-2.5 py-1 rounded-full text-xs font-medium"
                    style="
                      background-color: var(--color-surface-container-low);
                      color: var(--color-on-surface-variant);
                    "
                    >{{ SYSTEM_PERMISSIONS.find((p) => p.id === pid)?.label ?? pid }}</span
                  >
                  <span
                    v-if="item.permissions.length > 3"
                    class="text-xs font-medium"
                    style="color: var(--color-outline)"
                    >+{{ item.permissions.length - 3 }} más</span
                  >
                </div>
              </template>

              <template #opciones="{ item }">
                <div
                  class="flex justify-end gap-1 opacity-40 group-hover:opacity-100 transition-opacity"
                >
                  <button
                    v-if="auth.hasPermission('editar_rol')"
                    @click.stop="openEditRoleModal(item)"
                    class="p-2 rounded-full transition-all"
                    style="color: var(--color-on-surface-variant)"
                    onmouseover="
                      this.style.backgroundColor = 'var(--color-primary-fixed)'
                      this.style.color = 'var(--color-primary)'
                    "
                    onmouseout="
                      this.style.backgroundColor = ''
                      this.style.color = 'var(--color-on-surface-variant)'
                    "
                  >
                    <span
                      class="material-symbols-outlined"
                      style="width: 20px; height: 20px; font-size: 20px"
                      >edit</span
                    >
                  </button>
                  <button
                    v-if="auth.hasPermission('eliminar_rol')"
                    @click.stop="openDeleteRoleModal(item)"
                    class="p-2 rounded-full transition-all"
                    style="color: var(--color-on-surface-variant)"
                    onmouseover="
                      this.style.backgroundColor = 'var(--color-error-container)'
                      this.style.color = 'var(--color-error)'
                    "
                    onmouseout="
                      this.style.backgroundColor = ''
                      this.style.color = 'var(--color-on-surface-variant)'
                    "
                  >
                    <span
                      class="material-symbols-outlined"
                      style="width: 20px; height: 20px; font-size: 20px"
                      >delete</span
                    >
                  </button>
                </div>
              </template>
            </BaseTable>

            <!-- Footer conteo -->
            <div
              class="px-6 py-4 flex items-center bg-white"
              style="border-top: 1px solid rgba(196, 197, 213, 0.12)"
            >
              <span class="text-sm" style="color: var(--color-on-surface-variant)">
                <strong style="color: var(--color-on-surface)">{{ roles.length }}</strong>
                {{ roles.length === 1 ? "rol configurado" : "roles configurados" }}
              </span>
            </div>
          </template>
        </div>
      </div>
    </main>

    <!-- ══════════════════════════════════════════════════
         MODAL: GESTIONAR ROLES DE USUARIO
    ══════════════════════════════════════════════════ -->
    <BaseModal
      :show="showRolesModal"
      title="Gestionar Roles"
      size="lg"
      @close="showRolesModal = false"
    >
      <div class="space-y-6">
        <!-- Card info usuario -->
        <div
          class="flex items-center gap-4 p-4 rounded-2xl"
          style="background-color: var(--color-surface); border: 1px solid rgba(196, 197, 213, 0.2)"
          v-if="managingUser"
        >
          <div
            class="w-12 h-12 rounded-full flex items-center justify-center text-base font-bold flex-shrink-0"
            :style="`background-color: ${avatarStyle(managingUser.userId).bg}; color: ${avatarStyle(managingUser.userId).color};`"
          >
            {{ initials(managingUser.firstName, managingUser.lastName) }}
          </div>
          <div class="min-w-0">
            <div class="font-bold text-sm truncate" style="color: var(--color-on-surface)">
              {{ managingUser.firstName }} {{ managingUser.lastName }}
            </div>
            <div class="text-xs truncate" style="color: var(--color-on-surface-variant)">
              {{ managingUser.email }}
            </div>
            <span
              class="inline-flex items-center mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider"
              :style="`background-color: ${userTypeStyle(managingUser.type).bg}; color: ${userTypeStyle(managingUser.type).color};`"
              >{{ managingUser.type }}</span
            >
          </div>
        </div>

        <!-- Error -->
        <div
          v-if="rolesModalError"
          class="flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium"
          style="
            background-color: var(--color-error-container);
            color: var(--color-on-error-container);
          "
        >
          <span class="material-symbols-outlined" style="font-size: 18px">error</span>
          {{ rolesModalError }}
        </div>

        <!-- Loading roles -->
        <div v-if="isLoadingUserRoles" class="flex justify-center py-6">
          <svg
            class="animate-spin w-6 h-6"
            style="color: var(--color-primary)"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              class="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              stroke-width="4"
            />
            <path
              class="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
        </div>

        <template v-else>
          <!-- Roles asignados -->
          <div>
            <p
              class="text-xs font-bold uppercase tracking-wider mb-3"
              style="color: var(--color-outline)"
            >
              Roles asignados
            </p>
            <div
              v-if="userCurrentRoles.length === 0"
              class="flex items-center gap-2 py-4 text-sm"
              style="color: var(--color-outline)"
            >
              <span class="material-symbols-outlined" style="font-size: 18px">info</span>
              Este usuario no tiene roles asignados.
            </div>
            <div v-else class="flex flex-wrap gap-2">
              <div
                v-for="role in userCurrentRoles"
                :key="role.id"
                class="flex items-center gap-1.5 pl-3 pr-1 py-1 rounded-full text-sm font-bold"
                :style="`background-color: ${roleChipStyle(role.id).bg}; color: ${roleChipStyle(role.id).color}; border: 1px solid ${roleChipStyle(role.id).border};`"
              >
                <span
                  class="material-symbols-outlined"
                  style="font-size: 14px; width: 14px; height: 14px"
                  >shield</span
                >
                {{ role.name }}
                <button
                  @click="handleRemoveRole(role.id)"
                  :disabled="removingRoleId === role.id"
                  class="w-5 h-5 rounded-full flex items-center justify-center transition-all disabled:opacity-50"
                  style="background-color: rgba(0, 0, 0, 0.08)"
                  onmouseover="
                    this.style.backgroundColor = 'rgba(186,26,26,0.15)'
                    this.style.color = 'var(--color-error)'
                  "
                  onmouseout="
                    this.style.backgroundColor = 'rgba(0,0,0,0.08)'
                    this.style.color = ''
                  "
                >
                  <svg
                    v-if="removingRoleId === role.id"
                    class="animate-spin w-3 h-3"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      class="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      stroke-width="4"
                    />
                    <path
                      class="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                  <span
                    v-else
                    class="material-symbols-outlined"
                    style="font-size: 12px; width: 12px; height: 12px"
                    >close</span
                  >
                </button>
              </div>
            </div>
          </div>

          <!-- Añadir roles -->
          <div v-if="availableRolesToAdd.length > 0">
            <p
              class="text-xs font-bold uppercase tracking-wider mb-3"
              style="color: var(--color-outline)"
            >
              Añadir roles
            </p>
            <div class="space-y-2">
              <button
                v-for="role in availableRolesToAdd"
                :key="role.id"
                @click="toggleRoleSelection(role.id)"
                class="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-left transition-all"
                :style="
                  selectedRolesToAdd.includes(role.id)
                    ? 'background-color: rgba(0,40,142,0.08); outline: 1.5px solid rgba(0,40,142,0.3);'
                    : 'background-color: var(--color-surface); outline: 1px solid rgba(196,197,213,0.2);'
                "
              >
                <div
                  class="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                  :style="`background-color: ${roleChipStyle(role.id).bg};`"
                >
                  <span
                    class="material-symbols-outlined"
                    :style="`font-size:18px; width:18px; height:18px; color: ${roleChipStyle(role.id).color};`"
                    >shield_person</span
                  >
                </div>
                <div class="flex-1 min-w-0">
                  <div class="font-bold text-sm" style="color: var(--color-on-surface)">
                    {{ role.name }}
                  </div>
                  <div class="text-xs mt-0.5" style="color: var(--color-outline)">
                    {{
                      role.permissions.length === 0
                        ? "Sin acciones asignadas"
                        : `${role.permissions.length} ${role.permissions.length === 1 ? "acción" : "acciones"}`
                    }}
                  </div>
                </div>
                <div
                  class="w-5 h-5 rounded-lg border-2 flex items-center justify-center flex-shrink-0 transition-all"
                  :style="
                    selectedRolesToAdd.includes(role.id)
                      ? 'border-color: var(--color-primary); background-color: var(--color-primary);'
                      : 'border-color: var(--color-outline-variant);'
                  "
                >
                  <span
                    v-if="selectedRolesToAdd.includes(role.id)"
                    class="material-symbols-outlined text-white"
                    style="font-size: 12px; width: 12px; height: 12px"
                    >check</span
                  >
                </div>
              </button>
            </div>

            <BaseButton
              variant="primary"
              size="default"
              class="mt-3 w-full"
              :disabled="selectedRolesToAdd.length === 0 || isAssigning"
              @click="handleAssignRole"
            >
              <svg
                v-if="isAssigning"
                class="animate-spin w-4 h-4"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  class="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  stroke-width="4"
                />
                <path
                  class="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
              <span
                v-else
                class="material-symbols-outlined"
                style="font-size: 18px; width: 18px; height: 18px"
                >add</span
              >
              {{
                isAssigning
                  ? "Asignando..."
                  : `Asignar ${selectedRolesToAdd.length > 1 ? selectedRolesToAdd.length + " roles" : "rol"}`
              }}
            </BaseButton>
          </div>

          <div
            v-else-if="userCurrentRoles.length > 0 && allRoles.length > 0"
            class="flex items-center gap-2 text-sm py-2"
            style="color: var(--color-outline)"
          >
            <span class="material-symbols-outlined" style="font-size: 16px">check_circle</span>
            Todos los roles disponibles están asignados.
          </div>
        </template>
      </div>

      <template #footer>
        <div class="w-full flex items-center justify-between gap-3">
          <div class="flex items-center gap-3">
            <BaseButton
              v-if="managingUser?.isActive && auth.hasPermission('editar_usuario')"
              variant="danger"
              size="sm"
              :disabled="isDeactivating"
              @click="handleDeactivate"
            >
              <svg
                v-if="isDeactivating"
                class="animate-spin w-4 h-4"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  class="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  stroke-width="4"
                />
                <path
                  class="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
              <span v-else class="material-symbols-outlined" style="font-size: 16px"
                >person_off</span
              >
              {{ isDeactivating ? "Desactivando..." : "Desactivar usuario" }}
            </BaseButton>
            <p v-if="deactivateError" class="text-xs font-medium" style="color: var(--color-error)">
              {{ deactivateError }}
            </p>
          </div>
          <BaseButton variant="secondary" size="default" @click="showRolesModal = false">
            Cerrar
          </BaseButton>
        </div>
      </template>
    </BaseModal>

    <!-- ══════════════════════════════════════════════════
         MODAL: CREAR ROL
    ══════════════════════════════════════════════════ -->
    <BaseModal
      :show="showCreateRoleModal"
      title="Nuevo Rol"
      size="xl"
      @close="showCreateRoleModal = false"
    >
      <div class="space-y-6">
        <div
          v-if="createRoleError"
          class="flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium"
          style="
            background-color: var(--color-error-container);
            color: var(--color-on-error-container);
          "
        >
          <span class="material-symbols-outlined" style="font-size: 18px">error</span>
          {{ createRoleError }}
        </div>

        <div class="flex flex-col gap-1.5">
          <label
            class="text-xs font-bold uppercase tracking-wider"
            style="color: var(--color-outline)"
            >Nombre del rol *</label
          >
          <input
            v-model="createRoleForm.name"
            required
            type="text"
            placeholder="Ej: Admin, Recepcionista..."
            class="px-4 py-3 rounded-xl text-sm outline-none transition-all"
            style="
              border: 1px solid var(--color-outline-variant);
              color: var(--color-on-surface);
              background-color: var(--color-surface);
            "
            autofocus
          />
        </div>

        <!-- Matriz de permisos -->
        <div>
          <div class="flex items-center justify-between mb-4">
            <p
              class="text-xs font-bold uppercase tracking-wider"
              style="color: var(--color-outline)"
            >
              Acciones del rol
            </p>
            <span
              v-if="createRoleForm.permissions.length > 0"
              class="text-xs font-semibold px-2.5 py-1 rounded-full"
              style="background-color: rgba(0, 40, 142, 0.08); color: var(--color-primary)"
              >{{ createRoleForm.permissions.length }} seleccionadas</span
            >
          </div>

          <div
            class="overflow-x-auto rounded-xl"
            style="border: 1px solid rgba(196, 197, 213, 0.2)"
          >
            <table class="w-full text-sm border-collapse">
              <thead>
                <tr style="background-color: var(--color-surface-container-low)">
                  <th class="px-4 py-3 text-left" style="min-width: 180px">
                    <span
                      class="text-xs font-bold uppercase tracking-widest"
                      style="color: var(--color-outline)"
                      >Módulo</span
                    >
                  </th>
                  <th
                    v-for="col in MATRIX_COLUMNS"
                    :key="col.id"
                    class="px-3 py-3 text-center"
                    style="min-width: 76px"
                  >
                    <span
                      class="text-xs font-bold uppercase tracking-widest"
                      style="color: var(--color-outline)"
                      >{{ col.label }}</span
                    >
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="row in PERMISSION_MATRIX"
                  :key="row.module"
                  class="transition-colors"
                  style="border-top: 1px solid rgba(196, 197, 213, 0.1)"
                  onmouseover="this.style.backgroundColor = 'var(--color-surface)'"
                  onmouseout="this.style.backgroundColor = ''"
                >
                  <!-- Módulo -->
                  <td class="px-4 py-3">
                    <div class="flex items-center gap-2.5">
                      <div
                        class="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                        style="background-color: rgba(0, 40, 142, 0.06)"
                      >
                        <span
                          class="material-symbols-outlined"
                          style="
                            font-size: 16px;
                            width: 16px;
                            height: 16px;
                            color: var(--color-primary);
                          "
                          >{{ row.icon }}</span
                        >
                      </div>
                      <div>
                        <div class="font-semibold text-xs" style="color: var(--color-on-surface)">
                          {{ row.module }}
                        </div>
                        <div
                          class="text-[10px] leading-tight mt-0.5"
                          style="color: var(--color-outline)"
                        >
                          {{ row.description }}
                        </div>
                      </div>
                    </div>
                  </td>
                  <!-- Celdas de permisos -->
                  <td v-for="col in MATRIX_COLUMNS" :key="col.id" class="px-3 py-3 text-center">
                    <button
                      v-if="row.permissions[col.id]"
                      type="button"
                      @click="toggleCreatePermission(row.permissions[col.id])"
                      class="mx-auto w-7 h-7 rounded-lg flex items-center justify-center transition-all active:scale-90"
                      :style="
                        hasPerm(createRoleForm.permissions, row.permissions[col.id])
                          ? 'background-color: var(--color-primary);'
                          : 'border: 1.5px solid var(--color-outline-variant); background-color: var(--color-surface-container-lowest);'
                      "
                    >
                      <span
                        v-if="hasPerm(createRoleForm.permissions, row.permissions[col.id])"
                        class="material-symbols-outlined text-white"
                        style="font-size: 14px; width: 14px; height: 14px"
                        >check</span
                      >
                    </button>
                    <span
                      v-else
                      class="text-xs select-none"
                      style="color: var(--color-outline-variant)"
                      >—</span
                    >
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <template #footer>
        <BaseButton variant="secondary" size="default" @click="showCreateRoleModal = false">
          Cancelar
        </BaseButton>
        <BaseButton
          variant="primary"
          size="default"
          :disabled="isSavingCreateRole"
          @click="submitCreateRole"
        >
          <svg
            v-if="isSavingCreateRole"
            class="animate-spin w-4 h-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              class="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              stroke-width="4"
            />
            <path
              class="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
          {{ isSavingCreateRole ? "Guardando..." : "Crear Rol" }}
        </BaseButton>
      </template>
    </BaseModal>

    <!-- ══════════════════════════════════════════════════
         MODAL: EDITAR ROL
    ══════════════════════════════════════════════════ -->
    <BaseModal
      :show="showEditRoleModal"
      title="Editar Rol"
      size="xl"
      @close="showEditRoleModal = false"
    >
      <div class="space-y-6">
        <div
          v-if="editRoleError"
          class="flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium"
          style="
            background-color: var(--color-error-container);
            color: var(--color-on-error-container);
          "
        >
          <span class="material-symbols-outlined" style="font-size: 18px">error</span>
          {{ editRoleError }}
        </div>

        <div class="flex flex-col gap-1.5">
          <label
            class="text-xs font-bold uppercase tracking-wider"
            style="color: var(--color-outline)"
            >Nombre del rol *</label
          >
          <input
            v-model="editRoleForm.name"
            required
            type="text"
            class="px-4 py-3 rounded-xl text-sm outline-none"
            style="
              border: 1px solid var(--color-outline-variant);
              color: var(--color-on-surface);
              background-color: var(--color-surface);
            "
          />
        </div>

        <!-- Matriz de permisos -->
        <div>
          <div class="flex items-center justify-between mb-4">
            <p
              class="text-xs font-bold uppercase tracking-wider"
              style="color: var(--color-outline)"
            >
              Acciones del rol
            </p>
            <span
              v-if="editRoleForm.permissions.length > 0"
              class="text-xs font-semibold px-2.5 py-1 rounded-full"
              style="background-color: rgba(0, 40, 142, 0.08); color: var(--color-primary)"
              >{{ editRoleForm.permissions.length }} seleccionadas</span
            >
          </div>

          <div
            class="overflow-x-auto rounded-xl"
            style="border: 1px solid rgba(196, 197, 213, 0.2)"
          >
            <table class="w-full text-sm border-collapse">
              <thead>
                <tr style="background-color: var(--color-surface-container-low)">
                  <th class="px-4 py-3 text-left" style="min-width: 180px">
                    <span
                      class="text-xs font-bold uppercase tracking-widest"
                      style="color: var(--color-outline)"
                      >Módulo</span
                    >
                  </th>
                  <th
                    v-for="col in MATRIX_COLUMNS"
                    :key="col.id"
                    class="px-3 py-3 text-center"
                    style="min-width: 76px"
                  >
                    <span
                      class="text-xs font-bold uppercase tracking-widest"
                      style="color: var(--color-outline)"
                      >{{ col.label }}</span
                    >
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="row in PERMISSION_MATRIX"
                  :key="row.module"
                  class="transition-colors"
                  style="border-top: 1px solid rgba(196, 197, 213, 0.1)"
                  onmouseover="this.style.backgroundColor = 'var(--color-surface)'"
                  onmouseout="this.style.backgroundColor = ''"
                >
                  <!-- Módulo -->
                  <td class="px-4 py-3">
                    <div class="flex items-center gap-2.5">
                      <div
                        class="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                        style="background-color: rgba(0, 40, 142, 0.06)"
                      >
                        <span
                          class="material-symbols-outlined"
                          style="
                            font-size: 16px;
                            width: 16px;
                            height: 16px;
                            color: var(--color-primary);
                          "
                          >{{ row.icon }}</span
                        >
                      </div>
                      <div>
                        <div class="font-semibold text-xs" style="color: var(--color-on-surface)">
                          {{ row.module }}
                        </div>
                        <div
                          class="text-[10px] leading-tight mt-0.5"
                          style="color: var(--color-outline)"
                        >
                          {{ row.description }}
                        </div>
                      </div>
                    </div>
                  </td>
                  <!-- Celdas de permisos -->
                  <td v-for="col in MATRIX_COLUMNS" :key="col.id" class="px-3 py-3 text-center">
                    <button
                      v-if="row.permissions[col.id]"
                      type="button"
                      @click="toggleEditPermission(row.permissions[col.id])"
                      class="mx-auto w-7 h-7 rounded-lg flex items-center justify-center transition-all active:scale-90"
                      :style="
                        hasPerm(editRoleForm.permissions, row.permissions[col.id])
                          ? 'background-color: var(--color-primary);'
                          : 'border: 1.5px solid var(--color-outline-variant); background-color: var(--color-surface-container-lowest);'
                      "
                    >
                      <span
                        v-if="hasPerm(editRoleForm.permissions, row.permissions[col.id])"
                        class="material-symbols-outlined text-white"
                        style="font-size: 14px; width: 14px; height: 14px"
                        >check</span
                      >
                    </button>
                    <span
                      v-else
                      class="text-xs select-none"
                      style="color: var(--color-outline-variant)"
                      >—</span
                    >
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <template #footer>
        <BaseButton variant="secondary" size="default" @click="showEditRoleModal = false">
          Cancelar
        </BaseButton>
        <BaseButton
          variant="primary"
          size="default"
          :disabled="isSavingEditRole"
          @click="submitEditRole"
        >
          <svg
            v-if="isSavingEditRole"
            class="animate-spin w-4 h-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              class="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              stroke-width="4"
            />
            <path
              class="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
          {{ isSavingEditRole ? "Guardando..." : "Guardar Cambios" }}
        </BaseButton>
      </template>
    </BaseModal>

    <!-- ══════════════════════════════════════════════════
         MODAL: ELIMINAR ROL
    ══════════════════════════════════════════════════ -->
    <BaseModal :show="showDeleteRoleModal" size="sm" @close="showDeleteRoleModal = false">
      <div>
        <div class="flex items-center justify-between mb-2">
          <div class="flex items-center gap-2">
            <span
              class="material-symbols-outlined"
              style="font-size: 18px; width: 18px; height: 18px; color: var(--color-error)"
              >warning</span
            >
            <h3 class="text-base font-extrabold" style="color: var(--color-on-surface)">
              Eliminar Rol
            </h3>
          </div>
          <button
            @click="showDeleteRoleModal = false"
            class="p-1 rounded-full"
            style="color: var(--color-outline)"
          >
            <span class="material-symbols-outlined" style="font-size: 20px">close</span>
          </button>
        </div>

        <p class="text-sm mb-5" style="color: var(--color-on-surface-variant)">
          ¿Confirmás que querés eliminar el rol
          <strong style="color: var(--color-on-surface)">{{ deletingRole?.name }}</strong
          >? Solo es posible si no tiene usuarios asignados.
        </p>

        <div
          v-if="deleteRoleError"
          class="flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium mb-4"
          style="
            background-color: var(--color-error-container);
            color: var(--color-on-error-container);
          "
        >
          <span class="material-symbols-outlined flex-shrink-0" style="font-size: 18px">error</span>
          {{ deleteRoleError }}
        </div>
      </div>

      <template #footer>
        <div class="w-full flex flex-col gap-2">
          <BaseButton
            variant="danger"
            size="default"
            :disabled="isDeletingRole"
            @click="confirmDeleteRole"
          >
            <svg
              v-if="isDeletingRole"
              class="animate-spin w-4 h-4"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                class="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                stroke-width="4"
              />
              <path
                class="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            {{ isDeletingRole ? "Eliminando..." : "Eliminar" }}
          </BaseButton>
          <BaseButton variant="secondary" size="default" @click="showDeleteRoleModal = false">
            Cancelar
          </BaseButton>
        </div>
      </template>
    </BaseModal>
  </div>
</template>
