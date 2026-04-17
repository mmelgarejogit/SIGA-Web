<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import AppSidebar from '@/components/AppSidebar.vue'
import AppHeader from '@/components/AppHeader.vue'
import { useAuthStore } from '@/stores/auth'
import { type AppUser, getAppUsers } from '@/services/userService'

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
} from '@/services/roleService'

const auth = useAuthStore()

// ── Tab activo ────────────────────────────────────────────────────────────────

const activeTab = ref<'usuarios' | 'roles'>('usuarios')

// ── Helpers ───────────────────────────────────────────────────────────────────

const AVATAR_PALETTE = [
  { bg: 'rgba(0,40,142,0.06)', color: '#00288E' },
  { bg: 'rgba(0,103,128,0.06)', color: '#006780' },
  { bg: 'rgba(32,0,177,0.06)', color: '#2000B1' },
  { bg: 'rgba(117,118,132,0.08)', color: '#757684' },
]

const ROLE_COLORS = [
  { bg: 'rgba(0,40,142,0.10)', color: '#00288E', border: 'rgba(0,40,142,0.2)' },
  { bg: 'rgba(0,103,128,0.10)', color: '#006780', border: 'rgba(0,103,128,0.2)' },
  { bg: 'rgba(32,0,177,0.10)', color: '#2000B1', border: 'rgba(32,0,177,0.2)' },
  { bg: 'rgba(186,26,26,0.10)', color: '#BA1A1A', border: 'rgba(186,26,26,0.2)' },
]

const AVATAR_FALLBACK = { bg: 'rgba(0,40,142,0.06)', color: '#00288E' }
const ROLE_FALLBACK   = { bg: 'rgba(0,40,142,0.10)', color: '#00288E', border: 'rgba(0,40,142,0.2)' }

function avatarStyle(userId: number) {
  return AVATAR_PALETTE[userId % AVATAR_PALETTE.length] ?? AVATAR_FALLBACK
}

function initials(firstName: string, lastName: string) {
  return `${firstName[0] ?? ''}${lastName[0] ?? ''}`.toUpperCase()
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })
}

function statusStyle(isActive: boolean) {
  return isActive
    ? { bg: '#dcfce7', dot: '#16a34a', text: '#166534', label: 'Activo' }
    : { bg: '#E0E2E7', dot: '#757684', text: '#444653', label: 'Inactivo' }
}

function userTypeStyle(type: AppUser['type']) {
  if (type === 'Profesional')   return { bg: 'rgba(32,0,177,0.08)',    color: '#2000B1' }
  if (type === 'Paciente')      return { bg: 'rgba(0,103,128,0.08)',   color: '#006780' }
  if (type === 'Administrador') return { bg: 'rgba(0,40,142,0.08)',    color: '#00288E' }
  return                               { bg: 'rgba(0,40,142,0.08)',    color: '#00288E' }
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
const loadUsersError = ref('')

const activeFilter = ref('todos')
const showFilterDropdown = ref(false)

const filters = [
  { id: 'todos',           label: 'Todos',           icon: 'group' },
  { id: 'profesionales',   label: 'Profesionales',   icon: 'medical_services' },
  { id: 'pacientes',       label: 'Pacientes',        icon: 'person' },
  { id: 'administradores', label: 'Administradores', icon: 'shield_person' },
  { id: 'usuarios',        label: 'Usuarios',         icon: 'manage_accounts' },
  { id: 'activos',         label: 'Activos',          icon: 'check_circle' },
  { id: 'inactivos',       label: 'Inactivos',        icon: 'cancel' },
]

const activeFilterLabel = computed(
  () => filters.find((f) => f.id === activeFilter.value)?.label ?? 'Todos',
)

const filteredUsers = computed(() => {
  switch (activeFilter.value) {
    case 'profesionales':   return users.value.filter((u) => u.type === 'Profesional')
    case 'pacientes':       return users.value.filter((u) => u.type === 'Paciente')
    case 'administradores': return users.value.filter((u) => u.type === 'Administrador')
    case 'usuarios':        return users.value.filter((u) => u.type === 'Usuario')
    case 'activos':         return users.value.filter((u) => u.isActive)
    case 'inactivos':       return users.value.filter((u) => !u.isActive)
    default:                return users.value
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
watch(activeFilter, () => { currentPage.value = 1 })

async function loadUsers() {
  isLoadingUsers.value = true
  loadUsersError.value = ''
  try {
    users.value = await getAppUsers()
  } catch (err: unknown) {
    loadUsersError.value = err instanceof Error ? err.message : 'Error al cargar usuarios.'
  } finally {
    isLoadingUsers.value = false
  }
}

// ── Modal: Gestionar Roles de un Usuario ──────────────────────────────────────

const showRolesModal = ref(false)
const managingUser = ref<AppUser | null>(null)
const userCurrentRoles = ref<Role[]>([])
const isLoadingUserRoles = ref(false)
const rolesModalError = ref('')
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
  rolesModalError.value = ''
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
    rolesModalError.value = err instanceof Error ? err.message : 'Error al cargar roles.'
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
  rolesModalError.value = ''
  try {
    await Promise.all(
      selectedRolesToAdd.value.map((id) => assignRoleToUser(managingUser.value!.userId, id))
    )
    const newRoles = allRoles.value.filter((r) => selectedRolesToAdd.value.includes(r.id))
    userCurrentRoles.value.push(...newRoles)
    selectedRolesToAdd.value = []
  } catch (err: unknown) {
    rolesModalError.value = err instanceof Error ? err.message : 'Error al asignar roles.'
  } finally {
    isAssigning.value = false
  }
}

async function handleRemoveRole(roleId: number) {
  if (!managingUser.value || removingRoleId.value !== null) return
  removingRoleId.value = roleId
  rolesModalError.value = ''
  try {
    await removeRoleFromUser(managingUser.value.userId, roleId)
    userCurrentRoles.value = userCurrentRoles.value.filter((r) => r.id !== roleId)
  } catch (err: unknown) {
    rolesModalError.value = err instanceof Error ? err.message : 'Error al quitar rol.'
  } finally {
    removingRoleId.value = null
  }
}

// ── TAB ROLES ─────────────────────────────────────────────────────────────────

const roles = ref<Role[]>([])
const allRoles = ref<Role[]>([])
const isLoadingRoles = ref(false)
const loadRolesError = ref('')

async function loadRoles() {
  isLoadingRoles.value = true
  loadRolesError.value = ''
  try {
    const fetched = await getRoles()
    roles.value = fetched
    allRoles.value = [...fetched]
  } catch (err: unknown) {
    loadRolesError.value = err instanceof Error ? err.message : 'Error al cargar roles.'
  } finally {
    isLoadingRoles.value = false
  }
}

// ── Modal: Crear Rol ──────────────────────────────────────────────────────────

const showCreateRoleModal = ref(false)
const createRoleForm = ref<RoleRequest>({ name: '', permissions: [] })
const createRoleError = ref('')
const isSavingCreateRole = ref(false)

function openCreateRoleModal() {
  createRoleForm.value = { name: '', permissions: [] }
  createRoleError.value = ''
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
  createRoleError.value = ''
  isSavingCreateRole.value = true
  try {
    const created = await createRole(createRoleForm.value)
    roles.value.push(created)
    allRoles.value.push(created)
    showCreateRoleModal.value = false
  } catch (err: unknown) {
    createRoleError.value = err instanceof Error ? err.message : 'Error al crear rol.'
  } finally {
    isSavingCreateRole.value = false
  }
}

// ── Modal: Editar Rol ─────────────────────────────────────────────────────────

const showEditRoleModal = ref(false)
const editingRole = ref<Role | null>(null)
const editRoleForm = ref<RoleRequest>({ name: '', permissions: [] })
const editRoleError = ref('')
const isSavingEditRole = ref(false)

function openEditRoleModal(role: Role) {
  editingRole.value = role
  editRoleForm.value = { name: role.name, permissions: [...role.permissions] }
  editRoleError.value = ''
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
  editRoleError.value = ''
  isSavingEditRole.value = true
  try {
    const updated = await updateRole(editingRole.value.id, editRoleForm.value)
    const idx = roles.value.findIndex((r) => r.id === editingRole.value!.id)
    if (idx !== -1) roles.value[idx] = updated
    const allIdx = allRoles.value.findIndex((r) => r.id === editingRole.value!.id)
    if (allIdx !== -1) allRoles.value[allIdx] = updated
    showEditRoleModal.value = false
  } catch (err: unknown) {
    editRoleError.value = err instanceof Error ? err.message : 'Error al actualizar rol.'
  } finally {
    isSavingEditRole.value = false
  }
}

// ── Modal: Eliminar Rol ───────────────────────────────────────────────────────

const showDeleteRoleModal = ref(false)
const deletingRole = ref<Role | null>(null)
const deleteRoleError = ref('')
const isDeletingRole = ref(false)

function openDeleteRoleModal(role: Role) {
  deletingRole.value = role
  deleteRoleError.value = ''
  showDeleteRoleModal.value = true
}

async function confirmDeleteRole() {
  if (isDeletingRole.value || !deletingRole.value) return
  isDeletingRole.value = true
  deleteRoleError.value = ''
  try {
    await deleteRole(deletingRole.value.id)
    roles.value = roles.value.filter((r) => r.id !== deletingRole.value!.id)
    allRoles.value = allRoles.value.filter((r) => r.id !== deletingRole.value!.id)
    showDeleteRoleModal.value = false
  } catch (err: unknown) {
    deleteRoleError.value = err instanceof Error ? err.message : 'Error al eliminar rol.'
  } finally {
    isDeletingRole.value = false
  }
}

// ── Init ──────────────────────────────────────────────────────────────────────

onMounted(() => {
  loadUsers()
  loadRoles()
})
</script>

<template>
  <div class="min-h-screen" style="background-color: #F7F9FE;">
    <AppSidebar />
    <AppHeader />

    <main style="margin-left: 280px; padding-top: 64px;">
      <div class="px-8 pt-10 pb-12 max-w-7xl mx-auto">

        <!-- Page header -->
        <div class="flex justify-between items-end mb-8">
          <div>
            <h2
              class="text-4xl font-extrabold tracking-tight mb-2"
              style="font-family: 'Plus Jakarta Sans', system-ui, sans-serif; color: #00288E;"
            >Usuarios y Roles</h2>
            <p class="font-medium" style="color: #444653;">
              Administre los usuarios del sistema y configure los roles de acceso.
            </p>
          </div>

          <button
            v-if="activeTab === 'roles' && auth.hasPermission('crear_rol')"
            @click="openCreateRoleModal"
            class="flex items-center gap-2 px-8 py-4 rounded-full font-bold transition-all active:scale-95"
            style="background-color: #00288E; color: white; box-shadow: 0 4px 20px rgba(0,40,142,0.2);"
          >
            <span class="material-symbols-outlined" style="width:20px;height:20px;font-size:20px;">add</span>
            Nuevo Rol
          </button>
        </div>

        <!-- Tabs -->
        <div class="flex items-center gap-2 mb-8">
          <button
            @click="activeTab = 'usuarios'"
            class="flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-semibold transition-all"
            :style="activeTab === 'usuarios'
              ? 'background-color: #1E40AF; color: #A8B8FF;'
              : 'background-color: #E6E8ED; color: #444653;'"
          >
            <span class="material-symbols-outlined" style="font-size:18px; width:18px; height:18px;">manage_accounts</span>
            Usuarios
          </button>
          <button
            @click="activeTab = 'roles'"
            class="flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-semibold transition-all"
            :style="activeTab === 'roles'
              ? 'background-color: #1E40AF; color: #A8B8FF;'
              : 'background-color: #E6E8ED; color: #444653;'"
          >
            <span class="material-symbols-outlined" style="font-size:18px; width:18px; height:18px;">shield_person</span>
            Roles
            <span
              v-if="roles.length"
              class="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black"
              :style="activeTab === 'roles' ? 'background-color: rgba(168,184,255,0.25); color: #A8B8FF;' : 'background-color: rgba(0,40,142,0.1); color: #00288E;'"
            >{{ roles.length }}</span>
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
              :style="showFilterDropdown || activeFilter !== 'todos'
                ? 'background-color: #1E40AF; color: #A8B8FF;'
                : 'background-color: #E6E8ED; color: #444653;'"
            >
              <span class="material-symbols-outlined" style="font-size:18px; width:18px; height:18px;">filter_list</span>
              {{ activeFilterLabel }}
              <span
                class="material-symbols-outlined transition-transform duration-200"
                :style="`font-size:18px; width:18px; height:18px; transform: rotate(${showFilterDropdown ? '180deg' : '0deg'})`"
              >expand_more</span>
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
                style="min-width: 196px; background-color: #ffffff; box-shadow: 0 8px 32px rgba(0,40,142,0.14), 0 1px 4px rgba(0,0,0,0.06); outline: 1px solid rgba(196,197,213,0.2);"
              >
                <button
                  v-for="f in filters"
                  :key="f.id"
                  @click="selectFilter(f.id)"
                  class="w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold transition-colors text-left"
                  :style="activeFilter === f.id
                    ? 'background-color: rgba(0,40,142,0.06); color: #00288E;'
                    : 'color: #444653;'"
                  onmouseover="if(this.dataset.active!=='true') this.style.backgroundColor='#F1F4F9'"
                  onmouseout="if(this.dataset.active!=='true') this.style.backgroundColor=''"
                  :data-active="activeFilter === f.id"
                >
                  <span
                    class="material-symbols-outlined"
                    style="font-size:18px; width:18px; height:18px;"
                  >{{ f.icon }}</span>
                  {{ f.label }}
                  <span
                    v-if="activeFilter === f.id"
                    class="material-symbols-outlined ml-auto"
                    style="font-size:16px; width:16px; height:16px; color: #00288E;"
                  >check</span>
                </button>
              </div>
            </Transition>
          </div>

          <!-- Loading -->
          <div v-if="isLoadingUsers" class="flex justify-center py-24">
            <svg class="animate-spin w-8 h-8" style="color: #00288E;" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
          </div>

          <!-- Error -->
          <div
            v-else-if="loadUsersError"
            class="flex items-center gap-2.5 rounded-2xl px-4 py-3 text-sm font-medium"
            style="background-color: #FFDAD6; color: #93000A;"
          >
            <span class="material-symbols-outlined" style="font-size:18px;">error</span>
            {{ loadUsersError }}
          </div>

          <!-- Tabla de usuarios -->
          <div
            v-else
            class="rounded-2xl overflow-hidden"
            style="background-color: #ffffff; box-shadow: 0 1px 3px rgba(196,197,213,0.25); outline: 1px solid rgba(196,197,213,0.15);"
          >
            <table class="w-full text-left">
              <thead>
                <tr style="background-color: #F1F4F9;">
                  <th class="px-6 py-5 text-xs font-bold uppercase tracking-widest" style="color: #757684;">Usuario</th>
                  <th class="px-6 py-5 text-xs font-bold uppercase tracking-widest hidden sm:table-cell" style="color: #757684;">C.I.</th>
                  <th class="px-6 py-5 text-xs font-bold uppercase tracking-widest hidden md:table-cell" style="color: #757684;">Tipo</th>
                  <th class="px-6 py-5 text-xs font-bold uppercase tracking-widest hidden lg:table-cell" style="color: #757684;">Registro</th>
                  <th class="px-6 py-5 text-xs font-bold uppercase tracking-widest" style="color: #757684;">Estado</th>
                  <th class="px-6 py-5 text-xs font-bold uppercase tracking-widest text-right" style="color: #757684;">Acciones</th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="filteredUsers.length === 0">
                  <td colspan="6" class="px-6 py-16 text-center text-sm font-medium" style="color: #757684;">
                    No hay usuarios para mostrar.
                  </td>
                </tr>

                <tr
                  v-for="u in paginatedUsers"
                  :key="u.userId"
                  class="group transition-colors"
                  style="border-top: 1px solid rgba(196,197,213,0.12);"
                  onmouseover="this.style.backgroundColor='#F1F4F9'"
                  onmouseout="this.style.backgroundColor=''"
                >
                  <!-- Usuario -->
                  <td class="px-6 py-5">
                    <div class="flex items-center gap-3">
                      <div
                        class="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                        :style="`background-color: ${avatarStyle(u.userId).bg}; color: ${avatarStyle(u.userId).color};`"
                      >{{ initials(u.firstName, u.lastName) }}</div>
                      <div>
                        <div class="font-bold text-sm" style="color: #181C20;">{{ u.firstName }} {{ u.lastName }}</div>
                        <div class="text-xs" style="color: #444653;">{{ u.email }}</div>
                      </div>
                    </div>
                  </td>

                  <!-- C.I. -->
                  <td class="px-6 py-5 text-sm font-medium tracking-wider hidden sm:table-cell" style="color: #444653;">
                    {{ u.ci }}
                  </td>

                  <!-- Tipo -->
                  <td class="px-6 py-5 hidden md:table-cell">
                    <span
                      class="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold"
                      :style="`background-color: ${userTypeStyle(u.type).bg}; color: ${userTypeStyle(u.type).color};`"
                    >{{ u.type }}</span>
                  </td>

                  <!-- Registro -->
                  <td class="px-6 py-5 text-sm hidden lg:table-cell" style="color: #444653;">
                    {{ formatDate(u.createdAt) }}
                  </td>

                  <!-- Estado -->
                  <td class="px-6 py-5">
                    <span
                      class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider"
                      :style="`background-color: ${statusStyle(u.isActive).bg}; color: ${statusStyle(u.isActive).text};`"
                    >
                      <span class="w-1.5 h-1.5 rounded-full" :style="`background-color: ${statusStyle(u.isActive).dot};`"></span>
                      {{ statusStyle(u.isActive).label }}
                    </span>
                  </td>

                  <!-- Acciones -->
                  <td class="px-6 py-5">
                    <div class="flex justify-end opacity-40 group-hover:opacity-100 transition-opacity">
                      <button
                        v-if="auth.hasPermission('editar_usuario')"
                        @click="openRolesModal(u)"
                        class="flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold transition-all"
                        style="color: #00288E;"
                        onmouseover="this.style.backgroundColor='#DDE1FF'"
                        onmouseout="this.style.backgroundColor=''"
                      >
                        <span class="material-symbols-outlined" style="width:16px;height:16px;font-size:16px;">shield_person</span>
                        Gestionar Roles
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>

            <!-- Footer con conteo y paginación -->
            <div
              class="px-6 py-4 flex items-center justify-between flex-wrap gap-4"
              style="border-top: 1px solid rgba(196,197,213,0.12); background-color: #ffffff;"
            >
              <!-- Conteo -->
              <span class="text-sm" style="color: #444653;">
                Mostrando
                <strong style="color:#181C20;">{{ paginationStart }}–{{ paginationEnd }}</strong>
                de
                <strong style="color:#181C20;">{{ filteredUsers.length }}</strong>
                usuarios
              </span>

              <!-- Controles de página -->
              <div v-if="totalPages > 1" class="flex items-center gap-1">
                <!-- Anterior -->
                <button
                  @click="currentPage--"
                  :disabled="currentPage === 1"
                  class="w-9 h-9 rounded-full flex items-center justify-center transition-all disabled:opacity-30"
                  style="color: #444653;"
                  onmouseover="if(!this.disabled) this.style.backgroundColor='#E6E8ED'"
                  onmouseout="this.style.backgroundColor=''"
                >
                  <span class="material-symbols-outlined" style="font-size:20px; width:20px; height:20px;">chevron_left</span>
                </button>

                <!-- Elipsis izquierdo -->
                <span
                  v-if="visiblePages[0] && visiblePages[0] > 1"
                  class="w-9 h-9 flex items-center justify-center text-sm"
                  style="color: #757684;"
                >…</span>

                <!-- Números de página -->
                <button
                  v-for="page in visiblePages"
                  :key="page"
                  @click="currentPage = page"
                  class="w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold transition-all"
                  :style="currentPage === page
                    ? 'background-color: #00288E; color: white;'
                    : 'color: #444653;'"
                  :onmouseover="currentPage !== page ? `this.style.backgroundColor='#E6E8ED'` : ''"
                  :onmouseout="currentPage !== page ? `this.style.backgroundColor=''` : ''"
                >{{ page }}</button>

                <!-- Elipsis derecho -->
                <span
                  v-if="(visiblePages.at(-1) ?? 0) < totalPages"
                  class="w-9 h-9 flex items-center justify-center text-sm"
                  style="color: #757684;"
                >…</span>

                <!-- Siguiente -->
                <button
                  @click="currentPage++"
                  :disabled="currentPage === totalPages"
                  class="w-9 h-9 rounded-full flex items-center justify-center transition-all disabled:opacity-30"
                  style="color: #444653;"
                  onmouseover="if(!this.disabled) this.style.backgroundColor='#E6E8ED'"
                  onmouseout="this.style.backgroundColor=''"
                >
                  <span class="material-symbols-outlined" style="font-size:20px; width:20px; height:20px;">chevron_right</span>
                </button>
              </div>
            </div>
          </div>

          <!-- Bento insight cards -->
          <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mt-10">
            <div class="p-8 rounded-2xl flex flex-col justify-between" style="background-color: #F1F4F9; height: 192px;">
              <span class="material-symbols-outlined" style="color: #00288E; font-size:32px; width:32px; height:32px;">person_check</span>
              <div>
                <div class="text-3xl font-black" style="font-family: 'Plus Jakarta Sans', system-ui, sans-serif; color: #181C20;">
                  {{ users.filter(u => u.isActive).length }}
                </div>
                <div class="text-xs font-bold uppercase tracking-widest mt-1" style="color: #757684;">Usuarios Activos</div>
              </div>
            </div>

            <div class="p-8 rounded-2xl flex flex-col justify-between" style="background-color: #F1F4F9; height: 192px;">
              <span class="material-symbols-outlined" style="color: #2000B1; font-size:32px; width:32px; height:32px;">medical_services</span>
              <div>
                <div class="text-3xl font-black" style="font-family: 'Plus Jakarta Sans', system-ui, sans-serif; color: #181C20;">
                  {{ users.filter(u => u.type === 'Profesional').length }}
                </div>
                <div class="text-xs font-bold uppercase tracking-widest mt-1" style="color: #757684;">Profesionales</div>
              </div>
            </div>

            <div
              class="p-8 rounded-2xl flex flex-col justify-between"
              style="background: linear-gradient(135deg, #00288E 0%, #1E40AF 100%); height: 192px; box-shadow: 0 8px 24px rgba(0,40,142,0.25);"
            >
              <span class="material-symbols-outlined" style="color: #DDE1FF; font-size:32px; width:32px; height:32px;">shield_person</span>
              <div>
                <div class="text-sm font-medium mb-1" style="color: rgba(221,225,255,0.75);">Roles configurados</div>
                <div class="text-lg font-bold text-white leading-snug">
                  {{ roles.length }} {{ roles.length === 1 ? 'rol disponible' : 'roles disponibles' }} en el sistema.
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
            <svg class="animate-spin w-8 h-8" style="color: #00288E;" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
          </div>

          <!-- Error -->
          <div
            v-else-if="loadRolesError"
            class="flex items-center gap-2.5 rounded-2xl px-4 py-3 text-sm font-medium"
            style="background-color: #FFDAD6; color: #93000A;"
          >
            <span class="material-symbols-outlined" style="font-size:18px;">error</span>
            {{ loadRolesError }}
          </div>

          <!-- Tabla de roles -->
          <div
            v-else
            class="rounded-2xl overflow-hidden"
            style="background-color: #ffffff; box-shadow: 0 1px 3px rgba(196,197,213,0.25); outline: 1px solid rgba(196,197,213,0.15);"
          >
            <table class="w-full text-left">
              <thead>
                <tr style="background-color: #F1F4F9;">
                  <th class="px-6 py-5 text-xs font-bold uppercase tracking-widest" style="color: #757684;">Nombre del Rol</th>
                  <th class="px-6 py-5 text-xs font-bold uppercase tracking-widest hidden md:table-cell" style="color: #757684;">Acciones asignadas</th>
                  <th class="px-6 py-5 text-xs font-bold uppercase tracking-widest text-right" style="color: #757684;">Opciones</th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="roles.length === 0">
                  <td colspan="3" class="px-6 py-16 text-center text-sm font-medium" style="color: #757684;">
                    No hay roles configurados. Crea el primero.
                  </td>
                </tr>

                <tr
                  v-for="role in roles"
                  :key="role.id"
                  class="group transition-colors"
                  style="border-top: 1px solid rgba(196,197,213,0.12);"
                  onmouseover="this.style.backgroundColor='#F1F4F9'"
                  onmouseout="this.style.backgroundColor=''"
                >
                  <!-- Nombre -->
                  <td class="px-6 py-5">
                    <div class="flex items-center gap-3">
                      <div
                        class="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                        :style="`background-color: ${roleChipStyle(role.id).bg};`"
                      >
                        <span
                          class="material-symbols-outlined"
                          :style="`font-size:18px; width:18px; height:18px; color: ${roleChipStyle(role.id).color};`"
                        >shield_person</span>
                      </div>
                      <span class="font-bold text-sm" style="color: #181C20;">{{ role.name }}</span>
                    </div>
                  </td>

                  <!-- Acciones asignadas -->
                  <td class="px-6 py-5 hidden md:table-cell">
                    <div v-if="role.permissions.length === 0" class="text-sm" style="color: #757684;">
                      Sin acciones asignadas
                    </div>
                    <div v-else class="flex items-center gap-2 flex-wrap">
                      <span
                        class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold"
                        style="background-color: rgba(0,40,142,0.07); color: #00288E;"
                      >
                        <span class="material-symbols-outlined" style="font-size:13px; width:13px; height:13px;">check_circle</span>
                        {{ role.permissions.length }} {{ role.permissions.length === 1 ? 'acción' : 'acciones' }}
                      </span>
                      <!-- Preview de los primeros 3 -->
                      <span
                        v-for="pid in role.permissions.slice(0, 3)"
                        :key="pid"
                        class="px-2.5 py-1 rounded-full text-xs font-medium"
                        style="background-color: #F1F4F9; color: #444653;"
                      >{{ SYSTEM_PERMISSIONS.find(p => p.id === pid)?.label ?? pid }}</span>
                      <span
                        v-if="role.permissions.length > 3"
                        class="text-xs font-medium"
                        style="color: #757684;"
                      >+{{ role.permissions.length - 3 }} más</span>
                    </div>
                  </td>

                  <!-- Opciones -->
                  <td class="px-6 py-5">
                    <div class="flex justify-end gap-1 opacity-40 group-hover:opacity-100 transition-opacity">
                      <button
                        v-if="auth.hasPermission('editar_rol')"
                        @click="openEditRoleModal(role)"
                        class="p-2 rounded-full transition-all"
                        style="color: #444653;"
                        onmouseover="this.style.backgroundColor='#DDE1FF'; this.style.color='#00288E';"
                        onmouseout="this.style.backgroundColor=''; this.style.color='#444653';"
                      >
                        <span class="material-symbols-outlined" style="width:20px;height:20px;font-size:20px;">edit</span>
                      </button>
                      <button
                        v-if="auth.hasPermission('eliminar_rol')"
                        @click="openDeleteRoleModal(role)"
                        class="p-2 rounded-full transition-all"
                        style="color: #444653;"
                        onmouseover="this.style.backgroundColor='#FFDAD6'; this.style.color='#BA1A1A';"
                        onmouseout="this.style.backgroundColor=''; this.style.color='#444653';"
                      >
                        <span class="material-symbols-outlined" style="width:20px;height:20px;font-size:20px;">delete</span>
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>

            <!-- Footer conteo -->
            <div
              class="px-6 py-4 flex items-center"
              style="border-top: 1px solid rgba(196,197,213,0.12); background-color: #ffffff;"
            >
              <span class="text-sm" style="color: #444653;">
                <strong style="color:#181C20;">{{ roles.length }}</strong> {{ roles.length === 1 ? 'rol configurado' : 'roles configurados' }}
              </span>
            </div>
          </div>
        </div>

      </div>
    </main>


    <!-- ══════════════════════════════════════════════════
         MODAL: GESTIONAR ROLES DE USUARIO
    ══════════════════════════════════════════════════ -->
    <Teleport to="body">
      <Transition
        enter-active-class="transition-all duration-200 ease-out"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-active-class="transition-all duration-150 ease-in"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div
          v-if="showRolesModal"
          class="fixed inset-0 z-50 flex items-center justify-center p-4"
          style="background-color: rgba(24,28,32,0.5);"
          @click.self="showRolesModal = false"
        >
          <div
            class="w-full max-w-md rounded-3xl overflow-hidden"
            style="background-color: #ffffff; box-shadow: 0 24px 64px rgba(0,40,142,0.18);"
          >
            <!-- Header -->
            <div class="flex items-center justify-between px-8 pt-8 pb-6" style="border-bottom: 1px solid rgba(196,197,213,0.2);">
              <div>
                <h3 class="text-xl font-extrabold" style="font-family: 'Plus Jakarta Sans', system-ui, sans-serif; color: #00288E;">
                  Gestionar Roles
                </h3>
                <p class="text-xs font-medium mt-0.5" style="color: #757684;" v-if="managingUser">
                  {{ managingUser.firstName }} {{ managingUser.lastName }}
                </p>
              </div>
              <button @click="showRolesModal = false" class="p-1 rounded-full transition-colors" style="color: #757684;">
                <span class="material-symbols-outlined" style="font-size:22px;">close</span>
              </button>
            </div>

            <!-- Body -->
            <div class="px-8 py-6 space-y-6">

              <!-- Card info usuario -->
              <div
                class="flex items-center gap-4 p-4 rounded-2xl"
                style="background-color: #F7F9FE; border: 1px solid rgba(196,197,213,0.2);"
                v-if="managingUser"
              >
                <div
                  class="w-12 h-12 rounded-full flex items-center justify-center text-base font-bold flex-shrink-0"
                  :style="`background-color: ${avatarStyle(managingUser.userId).bg}; color: ${avatarStyle(managingUser.userId).color};`"
                >{{ initials(managingUser.firstName, managingUser.lastName) }}</div>
                <div class="min-w-0">
                  <div class="font-bold text-sm truncate" style="color: #181C20;">
                    {{ managingUser.firstName }} {{ managingUser.lastName }}
                  </div>
                  <div class="text-xs truncate" style="color: #444653;">{{ managingUser.email }}</div>
                  <span
                    class="inline-flex items-center mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider"
                    :style="`background-color: ${userTypeStyle(managingUser.type).bg}; color: ${userTypeStyle(managingUser.type).color};`"
                  >{{ managingUser.type }}</span>
                </div>
              </div>

              <!-- Error -->
              <div
                v-if="rolesModalError"
                class="flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium"
                style="background-color: #FFDAD6; color: #93000A;"
              >
                <span class="material-symbols-outlined" style="font-size:18px;">error</span>
                {{ rolesModalError }}
              </div>

              <!-- Loading roles -->
              <div v-if="isLoadingUserRoles" class="flex justify-center py-6">
                <svg class="animate-spin w-6 h-6" style="color: #00288E;" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
              </div>

              <template v-else>
                <!-- Roles asignados -->
                <div>
                  <p class="text-xs font-bold uppercase tracking-wider mb-3" style="color: #757684;">Roles asignados</p>
                  <div v-if="userCurrentRoles.length === 0" class="flex items-center gap-2 py-4 text-sm" style="color: #757684;">
                    <span class="material-symbols-outlined" style="font-size:18px;">info</span>
                    Este usuario no tiene roles asignados.
                  </div>
                  <div v-else class="flex flex-wrap gap-2">
                    <div
                      v-for="role in userCurrentRoles"
                      :key="role.id"
                      class="flex items-center gap-1.5 pl-3 pr-1 py-1 rounded-full text-sm font-bold"
                      :style="`background-color: ${roleChipStyle(role.id).bg}; color: ${roleChipStyle(role.id).color}; border: 1px solid ${roleChipStyle(role.id).border};`"
                    >
                      <span class="material-symbols-outlined" style="font-size:14px; width:14px; height:14px;">shield</span>
                      {{ role.name }}
                      <button
                        @click="handleRemoveRole(role.id)"
                        :disabled="removingRoleId === role.id"
                        class="w-5 h-5 rounded-full flex items-center justify-center transition-all disabled:opacity-50"
                        style="background-color: rgba(0,0,0,0.08);"
                        onmouseover="this.style.backgroundColor='rgba(186,26,26,0.15)'; this.style.color='#BA1A1A';"
                        onmouseout="this.style.backgroundColor='rgba(0,0,0,0.08)'; this.style.color='';"
                      >
                        <svg v-if="removingRoleId === role.id" class="animate-spin w-3 h-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                        </svg>
                        <span v-else class="material-symbols-outlined" style="font-size:12px; width:12px; height:12px;">close</span>
                      </button>
                    </div>
                  </div>
                </div>

                <!-- Añadir roles -->
                <div v-if="availableRolesToAdd.length > 0">
                  <p class="text-xs font-bold uppercase tracking-wider mb-3" style="color: #757684;">Añadir roles</p>
                  <div class="space-y-2">
                    <button
                      v-for="role in availableRolesToAdd"
                      :key="role.id"
                      @click="toggleRoleSelection(role.id)"
                      class="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-left transition-all"
                      :style="selectedRolesToAdd.includes(role.id)
                        ? 'background-color: rgba(0,40,142,0.08); outline: 1.5px solid rgba(0,40,142,0.3);'
                        : 'background-color: #F7F9FE; outline: 1px solid rgba(196,197,213,0.2);'"
                    >
                      <div
                        class="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                        :style="`background-color: ${roleChipStyle(role.id).bg};`"
                      >
                        <span
                          class="material-symbols-outlined"
                          :style="`font-size:18px; width:18px; height:18px; color: ${roleChipStyle(role.id).color};`"
                        >shield_person</span>
                      </div>
                      <div class="flex-1 min-w-0">
                        <div class="font-bold text-sm" style="color: #181C20;">{{ role.name }}</div>
                        <div class="text-xs mt-0.5" style="color: #757684;">
                          {{ role.permissions.length === 0
                            ? 'Sin acciones asignadas'
                            : `${role.permissions.length} ${role.permissions.length === 1 ? 'acción' : 'acciones'}`
                          }}
                        </div>
                      </div>
                      <div
                        class="w-5 h-5 rounded-lg border-2 flex items-center justify-center flex-shrink-0 transition-all"
                        :style="selectedRolesToAdd.includes(role.id)
                          ? 'border-color: #00288E; background-color: #00288E;'
                          : 'border-color: #C4C5D5;'"
                      >
                        <span
                          v-if="selectedRolesToAdd.includes(role.id)"
                          class="material-symbols-outlined text-white"
                          style="font-size:12px; width:12px; height:12px;"
                        >check</span>
                      </div>
                    </button>
                  </div>

                  <button
                    @click="handleAssignRole"
                    :disabled="selectedRolesToAdd.length === 0 || isAssigning"
                    class="mt-3 w-full flex items-center justify-center gap-2 py-3 rounded-full text-sm font-bold transition-all disabled:opacity-50"
                    style="background-color: #00288E; color: white;"
                  >
                    <svg v-if="isAssigning" class="animate-spin w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                    </svg>
                    <span v-else class="material-symbols-outlined" style="font-size:18px; width:18px; height:18px;">add</span>
                    {{ isAssigning ? 'Asignando...' : `Asignar ${selectedRolesToAdd.length > 1 ? selectedRolesToAdd.length + ' roles' : 'rol'}` }}
                  </button>
                </div>

                <div
                  v-else-if="userCurrentRoles.length > 0 && allRoles.length > 0"
                  class="flex items-center gap-2 text-sm py-2"
                  style="color: #757684;"
                >
                  <span class="material-symbols-outlined" style="font-size:16px;">check_circle</span>
                  Todos los roles disponibles están asignados.
                </div>
              </template>
            </div>

            <!-- Footer -->
            <div class="px-8 py-5 flex justify-end" style="border-top: 1px solid rgba(196,197,213,0.2);">
              <button
                @click="showRolesModal = false"
                class="px-6 py-3 rounded-full text-sm font-bold"
                style="background-color: #E6E8ED; color: #444653;"
              >Cerrar</button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>


    <!-- ══════════════════════════════════════════════════
         MODAL: CREAR ROL
    ══════════════════════════════════════════════════ -->
    <Teleport to="body">
      <Transition
        enter-active-class="transition-all duration-200 ease-out"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-active-class="transition-all duration-150 ease-in"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div
          v-if="showCreateRoleModal"
          class="fixed inset-0 z-50 flex items-center justify-center p-4"
          style="background-color: rgba(24,28,32,0.5);"
          @click.self="showCreateRoleModal = false"
        >
          <div
            class="w-full max-w-3xl rounded-3xl overflow-hidden"
            style="background-color: #ffffff; box-shadow: 0 24px 64px rgba(0,40,142,0.18);"
          >
            <div class="flex items-center justify-between px-8 pt-8 pb-6" style="border-bottom: 1px solid rgba(196,197,213,0.2);">
              <h3 class="text-xl font-extrabold" style="font-family: 'Plus Jakarta Sans', system-ui, sans-serif; color: #00288E;">
                Nuevo Rol
              </h3>
              <button @click="showCreateRoleModal = false" class="p-1 rounded-full" style="color: #757684;">
                <span class="material-symbols-outlined" style="font-size:22px;">close</span>
              </button>
            </div>

            <form @submit.prevent="submitCreateRole" class="px-8 py-6 space-y-6 max-h-[68vh] overflow-y-auto">
              <div
                v-if="createRoleError"
                class="flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium"
                style="background-color: #FFDAD6; color: #93000A;"
              >
                <span class="material-symbols-outlined" style="font-size:18px;">error</span>
                {{ createRoleError }}
              </div>

              <div class="flex flex-col gap-1.5">
                <label class="text-xs font-bold uppercase tracking-wider" style="color: #757684;">Nombre del rol *</label>
                <input
                  v-model="createRoleForm.name"
                  required
                  type="text"
                  placeholder="Ej: Admin, Recepcionista..."
                  class="px-4 py-3 rounded-xl text-sm outline-none transition-all"
                  style="border: 1px solid #C4C5D5; color: #181C20; background-color: #F7F9FE;"
                  autofocus
                />
              </div>

              <!-- Matriz de permisos -->
              <div>
                <div class="flex items-center justify-between mb-4">
                  <p class="text-xs font-bold uppercase tracking-wider" style="color: #757684;">Acciones del rol</p>
                  <span
                    v-if="createRoleForm.permissions.length > 0"
                    class="text-xs font-semibold px-2.5 py-1 rounded-full"
                    style="background-color: rgba(0,40,142,0.08); color: #00288E;"
                  >{{ createRoleForm.permissions.length }} seleccionadas</span>
                </div>

                <div class="overflow-x-auto rounded-xl" style="border: 1px solid rgba(196,197,213,0.2);">
                  <table class="w-full text-sm border-collapse">
                    <thead>
                      <tr style="background-color: #F1F4F9;">
                        <th class="px-4 py-3 text-left" style="min-width:180px;">
                          <span class="text-xs font-bold uppercase tracking-widest" style="color: #757684;">Módulo</span>
                        </th>
                        <th
                          v-for="col in MATRIX_COLUMNS"
                          :key="col.id"
                          class="px-3 py-3 text-center"
                          style="min-width:76px;"
                        >
                          <span class="text-xs font-bold uppercase tracking-widest" style="color: #757684;">{{ col.label }}</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr
                        v-for="row in PERMISSION_MATRIX"
                        :key="row.module"
                        class="transition-colors"
                        style="border-top: 1px solid rgba(196,197,213,0.1);"
                        onmouseover="this.style.backgroundColor='#F7F9FE'"
                        onmouseout="this.style.backgroundColor=''"
                      >
                        <!-- Módulo -->
                        <td class="px-4 py-3">
                          <div class="flex items-center gap-2.5">
                            <div
                              class="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                              style="background-color: rgba(0,40,142,0.06);"
                            >
                              <span
                                class="material-symbols-outlined"
                                style="font-size:16px; width:16px; height:16px; color: #00288E;"
                              >{{ row.icon }}</span>
                            </div>
                            <div>
                              <div class="font-semibold text-xs" style="color: #181C20;">{{ row.module }}</div>
                              <div class="text-[10px] leading-tight mt-0.5" style="color: #757684;">{{ row.description }}</div>
                            </div>
                          </div>
                        </td>
                        <!-- Celdas de permisos -->
                        <td
                          v-for="col in MATRIX_COLUMNS"
                          :key="col.id"
                          class="px-3 py-3 text-center"
                        >
                          <button
                            v-if="row.permissions[col.id]"
                            type="button"
                            @click="toggleCreatePermission(row.permissions[col.id])"
                            class="mx-auto w-7 h-7 rounded-lg flex items-center justify-center transition-all active:scale-90"
                            :style="hasPerm(createRoleForm.permissions, row.permissions[col.id])
                              ? 'background-color: #00288E;'
                              : 'border: 1.5px solid #C4C5D5; background-color: #ffffff;'"
                          >
                            <span
                              v-if="hasPerm(createRoleForm.permissions, row.permissions[col.id])"
                              class="material-symbols-outlined text-white"
                              style="font-size:14px; width:14px; height:14px;"
                            >check</span>
                          </button>
                          <span v-else class="text-xs select-none" style="color: #C4C5D5;">—</span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </form>

            <div class="px-8 py-6 flex justify-end gap-3" style="border-top: 1px solid rgba(196,197,213,0.2);">
              <button
                type="button"
                @click="showCreateRoleModal = false"
                class="px-6 py-3 rounded-full text-sm font-bold"
                style="background-color: #E6E8ED; color: #444653;"
              >Cancelar</button>
              <button
                @click="submitCreateRole"
                :disabled="isSavingCreateRole"
                class="flex items-center gap-2 px-6 py-3 rounded-full text-sm font-bold disabled:opacity-60"
                style="background-color: #00288E; color: white;"
              >
                <svg v-if="isSavingCreateRole" class="animate-spin w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
                {{ isSavingCreateRole ? 'Guardando...' : 'Crear Rol' }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>


    <!-- ══════════════════════════════════════════════════
         MODAL: EDITAR ROL
    ══════════════════════════════════════════════════ -->
    <Teleport to="body">
      <Transition
        enter-active-class="transition-all duration-200 ease-out"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-active-class="transition-all duration-150 ease-in"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div
          v-if="showEditRoleModal"
          class="fixed inset-0 z-50 flex items-center justify-center p-4"
          style="background-color: rgba(24,28,32,0.5);"
          @click.self="showEditRoleModal = false"
        >
          <div
            class="w-full max-w-3xl rounded-3xl overflow-hidden"
            style="background-color: #ffffff; box-shadow: 0 24px 64px rgba(0,40,142,0.18);"
          >
            <div class="flex items-center justify-between px-8 pt-8 pb-6" style="border-bottom: 1px solid rgba(196,197,213,0.2);">
              <h3 class="text-xl font-extrabold" style="font-family: 'Plus Jakarta Sans', system-ui, sans-serif; color: #00288E;">
                Editar Rol
              </h3>
              <button @click="showEditRoleModal = false" class="p-1 rounded-full" style="color: #757684;">
                <span class="material-symbols-outlined" style="font-size:22px;">close</span>
              </button>
            </div>

            <form @submit.prevent="submitEditRole" class="px-8 py-6 space-y-6 max-h-[68vh] overflow-y-auto">
              <div
                v-if="editRoleError"
                class="flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium"
                style="background-color: #FFDAD6; color: #93000A;"
              >
                <span class="material-symbols-outlined" style="font-size:18px;">error</span>
                {{ editRoleError }}
              </div>

              <div class="flex flex-col gap-1.5">
                <label class="text-xs font-bold uppercase tracking-wider" style="color: #757684;">Nombre del rol *</label>
                <input
                  v-model="editRoleForm.name"
                  required
                  type="text"
                  class="px-4 py-3 rounded-xl text-sm outline-none"
                  style="border: 1px solid #C4C5D5; color: #181C20; background-color: #F7F9FE;"
                />
              </div>

              <!-- Matriz de permisos -->
              <div>
                <div class="flex items-center justify-between mb-4">
                  <p class="text-xs font-bold uppercase tracking-wider" style="color: #757684;">Acciones del rol</p>
                  <span
                    v-if="editRoleForm.permissions.length > 0"
                    class="text-xs font-semibold px-2.5 py-1 rounded-full"
                    style="background-color: rgba(0,40,142,0.08); color: #00288E;"
                  >{{ editRoleForm.permissions.length }} seleccionadas</span>
                </div>

                <div class="overflow-x-auto rounded-xl" style="border: 1px solid rgba(196,197,213,0.2);">
                  <table class="w-full text-sm border-collapse">
                    <thead>
                      <tr style="background-color: #F1F4F9;">
                        <th class="px-4 py-3 text-left" style="min-width:180px;">
                          <span class="text-xs font-bold uppercase tracking-widest" style="color: #757684;">Módulo</span>
                        </th>
                        <th
                          v-for="col in MATRIX_COLUMNS"
                          :key="col.id"
                          class="px-3 py-3 text-center"
                          style="min-width:76px;"
                        >
                          <span class="text-xs font-bold uppercase tracking-widest" style="color: #757684;">{{ col.label }}</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr
                        v-for="row in PERMISSION_MATRIX"
                        :key="row.module"
                        class="transition-colors"
                        style="border-top: 1px solid rgba(196,197,213,0.1);"
                        onmouseover="this.style.backgroundColor='#F7F9FE'"
                        onmouseout="this.style.backgroundColor=''"
                      >
                        <!-- Módulo -->
                        <td class="px-4 py-3">
                          <div class="flex items-center gap-2.5">
                            <div
                              class="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                              style="background-color: rgba(0,40,142,0.06);"
                            >
                              <span
                                class="material-symbols-outlined"
                                style="font-size:16px; width:16px; height:16px; color: #00288E;"
                              >{{ row.icon }}</span>
                            </div>
                            <div>
                              <div class="font-semibold text-xs" style="color: #181C20;">{{ row.module }}</div>
                              <div class="text-[10px] leading-tight mt-0.5" style="color: #757684;">{{ row.description }}</div>
                            </div>
                          </div>
                        </td>
                        <!-- Celdas de permisos -->
                        <td
                          v-for="col in MATRIX_COLUMNS"
                          :key="col.id"
                          class="px-3 py-3 text-center"
                        >
                          <button
                            v-if="row.permissions[col.id]"
                            type="button"
                            @click="toggleEditPermission(row.permissions[col.id])"
                            class="mx-auto w-7 h-7 rounded-lg flex items-center justify-center transition-all active:scale-90"
                            :style="hasPerm(editRoleForm.permissions, row.permissions[col.id])
                              ? 'background-color: #00288E;'
                              : 'border: 1.5px solid #C4C5D5; background-color: #ffffff;'"
                          >
                            <span
                              v-if="hasPerm(editRoleForm.permissions, row.permissions[col.id])"
                              class="material-symbols-outlined text-white"
                              style="font-size:14px; width:14px; height:14px;"
                            >check</span>
                          </button>
                          <span v-else class="text-xs select-none" style="color: #C4C5D5;">—</span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </form>

            <div class="px-8 py-6 flex justify-end gap-3" style="border-top: 1px solid rgba(196,197,213,0.2);">
              <button
                type="button"
                @click="showEditRoleModal = false"
                class="px-6 py-3 rounded-full text-sm font-bold"
                style="background-color: #E6E8ED; color: #444653;"
              >Cancelar</button>
              <button
                @click="submitEditRole"
                :disabled="isSavingEditRole"
                class="flex items-center gap-2 px-6 py-3 rounded-full text-sm font-bold disabled:opacity-60"
                style="background-color: #00288E; color: white;"
              >
                <svg v-if="isSavingEditRole" class="animate-spin w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
                {{ isSavingEditRole ? 'Guardando...' : 'Guardar Cambios' }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>


    <!-- ══════════════════════════════════════════════════
         MODAL: ELIMINAR ROL
    ══════════════════════════════════════════════════ -->
    <Teleport to="body">
      <Transition
        enter-active-class="transition-all duration-200 ease-out"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-active-class="transition-all duration-150 ease-in"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div
          v-if="showDeleteRoleModal"
          class="fixed inset-0 z-50 flex items-center justify-center p-4"
          style="background-color: rgba(24,28,32,0.5);"
          @click.self="showDeleteRoleModal = false"
        >
          <div
            class="w-full max-w-sm rounded-3xl overflow-hidden"
            style="background-color: #ffffff; box-shadow: 0 24px 64px rgba(0,0,0,0.10);"
          >
            <div class="px-8 pt-8 pb-7">
              <!-- Título con ícono inline -->
              <div class="flex items-center justify-between mb-2">
                <div class="flex items-center gap-2">
                  <span class="material-symbols-outlined" style="font-size:18px; width:18px; height:18px; color: #BA1A1A;">warning</span>
                  <h3 class="text-base font-extrabold" style="font-family: 'Plus Jakarta Sans', system-ui, sans-serif; color: #181C20;">
                    Eliminar Rol
                  </h3>
                </div>
                <button @click="showDeleteRoleModal = false" class="p-1 rounded-full" style="color: #757684;">
                  <span class="material-symbols-outlined" style="font-size:20px;">close</span>
                </button>
              </div>

              <!-- Descripción -->
              <p class="text-sm mb-5" style="color: #444653;">
                ¿Confirmás que querés eliminar el rol
                <strong style="color:#181C20;">{{ deletingRole?.name }}</strong>?
                Solo es posible si no tiene usuarios asignados.
              </p>

              <!-- Error -->
              <div
                v-if="deleteRoleError"
                class="flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium mb-4"
                style="background-color: #FFDAD6; color: #93000A;"
              >
                <span class="material-symbols-outlined flex-shrink-0" style="font-size:18px;">error</span>
                {{ deleteRoleError }}
              </div>

              <!-- Botones apilados -->
              <div class="flex flex-col gap-2">
                <button
                  @click="confirmDeleteRole"
                  :disabled="isDeletingRole"
                  class="w-full flex items-center justify-center gap-2 py-3 rounded-full text-sm font-bold disabled:opacity-60"
                  style="background-color: #BA1A1A; color: white;"
                >
                  <svg v-if="isDeletingRole" class="animate-spin w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  {{ isDeletingRole ? 'Eliminando...' : 'Eliminar' }}
                </button>
                <button
                  type="button"
                  @click="showDeleteRoleModal = false"
                  class="w-full py-3 rounded-full text-sm font-bold"
                  style="background-color: #E6E8ED; color: #444653;"
                >Cancelar</button>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

  </div>
</template>
