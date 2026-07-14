<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from "vue"
import { useRouter } from "vue-router"
import { useAuthStore } from "@/stores/auth"
import { useThemeStore } from "@/stores/theme"
import { useSidebarStore } from "@/stores/sidebar"
import {
  type Notificacion,
  getNotificaciones,
  getContadorNoLeidas,
  marcarLeida,
  marcarTodasLeidas,
} from "@/services/notificacionService"
import { changePassword } from "@/services/authService"
import BaseModal from "@/components/BaseModal.vue"
import BaseButton from "@/components/BaseButton.vue"
import PasswordInput from "@/components/PasswordInput.vue"

const router = useRouter()
const authStore = useAuthStore()
const theme = useThemeStore()
const sidebar = useSidebarStore()

const isDark = computed(() => theme.mode === "dark")

const showDropdown = ref(false)
const dropdownRef = ref<HTMLElement | null>(null)
const showNotifications = ref(false)
const notificationsRef = ref<HTMLElement | null>(null)

const ultimasNotificaciones = ref<Notificacion[]>([])
const contadorNoLeidas = ref(0)

async function cargarContador() {
  if (!authStore.hasPermission("ver_notificaciones")) return
  try {
    contadorNoLeidas.value = await getContadorNoLeidas()
  } catch {
    contadorNoLeidas.value = 0
  }
}

async function cargarUltimasNotificaciones() {
  try {
    const result = await getNotificaciones({ pageSize: 5 })
    ultimasNotificaciones.value = result.items
  } catch {
    ultimasNotificaciones.value = []
  }
}

async function onClickNotificacion(n: Notificacion) {
  if (n.leido) return
  n.leido = true
  contadorNoLeidas.value = Math.max(0, contadorNoLeidas.value - 1)
  try {
    await marcarLeida(n.id)
  } catch {
    n.leido = false
    contadorNoLeidas.value++
  }
}

function fechaRelativa(iso: string) {
  const min = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000)
  if (min < 1) return "recién"
  if (min < 60) return `hace ${min} min`
  const horas = Math.floor(min / 60)
  if (horas < 24) return `hace ${horas} h`
  return `hace ${Math.floor(horas / 24)} d`
}

const user = computed(() => authStore.user)

const displayName = computed(() => {
  if (!user.value) return ""
  return `${user.value.firstName ?? ""} ${user.value.lastName ?? ""}`.trim()
})

const position = computed(() => {
  if (!user.value) return ""
  if (user.value.specialty) return user.value.specialty
  if (user.value.roles?.includes("Administrador")) return "Administrador"
  if (user.value.roles?.length > 0) return user.value.roles[0]
  return "Usuario"
})

// Sucursal del usuario; los usuarios globales (admin) ven "Todas las sucursales".
const sucursalLabel = computed(() => {
  if (!user.value) return ""
  if (user.value.sucursalNombre) return user.value.sucursalNombre
  if (authStore.hasPermission("ver_todas_sucursales")) return "Todas las sucursales"
  return ""
})

const initials = computed(() => {
  if (!user.value) return "?"
  return `${user.value.firstName?.[0] ?? ""}${user.value.lastName?.[0] ?? ""}`.toUpperCase() || "?"
})

function toggleDropdown() {
  showDropdown.value = !showDropdown.value
  if (showDropdown.value) showNotifications.value = false
}

async function toggleNotifications() {
  showNotifications.value = !showNotifications.value
  if (showNotifications.value) {
    showDropdown.value = false
    await cargarUltimasNotificaciones()
    await marcarTodasComoLeidas()
  }
}

async function marcarTodasComoLeidas() {
  if (contadorNoLeidas.value === 0) return
  const previousCount = contadorNoLeidas.value
  const previousEstados = ultimasNotificaciones.value.map((n) => n.leido)

  contadorNoLeidas.value = 0
  ultimasNotificaciones.value = ultimasNotificaciones.value.map((n) => ({ ...n, leido: true }))

  try {
    await marcarTodasLeidas()
  } catch {
    // Si falla, restauramos el estado anterior para no ocultar notificaciones sin confirmar.
    contadorNoLeidas.value = previousCount
    ultimasNotificaciones.value = ultimasNotificaciones.value.map((n, i) => ({
      ...n,
      leido: previousEstados[i] ?? n.leido,
    }))
  }
}

function handleClickOutside(e: MouseEvent) {
  if (dropdownRef.value && !dropdownRef.value.contains(e.target as Node)) showDropdown.value = false
  if (notificationsRef.value && !notificationsRef.value.contains(e.target as Node))
    showNotifications.value = false
}

function logout() {
  authStore.clearSession()
  router.push("/login")
}

// ── Cambiar mi contraseña ────────────────────────────────────────────────
const showChangePasswordModal = ref(false)
const currentPassword = ref("")
const newPassword = ref("")
const confirmPassword = ref("")
const changePasswordError = ref("")
const isChangingPassword = ref(false)

function openChangePasswordModal() {
  showDropdown.value = false
  currentPassword.value = ""
  newPassword.value = ""
  confirmPassword.value = ""
  changePasswordError.value = ""
  showChangePasswordModal.value = true
}

async function submitChangePassword() {
  changePasswordError.value = ""

  if (newPassword.value.length < 6) {
    changePasswordError.value = "La nueva contraseña debe tener al menos 6 caracteres."
    return
  }
  if (newPassword.value !== confirmPassword.value) {
    changePasswordError.value = "Las contraseñas no coinciden."
    return
  }

  isChangingPassword.value = true
  try {
    await changePassword(currentPassword.value, newPassword.value)
    showChangePasswordModal.value = false
  } catch (err: unknown) {
    changePasswordError.value = err instanceof Error ? err.message : "No se pudo cambiar la contraseña."
  } finally {
    isChangingPassword.value = false
  }
}

onMounted(() => {
  document.addEventListener("mousedown", handleClickOutside)
  cargarContador()
})
onUnmounted(() => document.removeEventListener("mousedown", handleClickOutside))
</script>

<template>
  <header
    class="fixed top-0 right-0 z-40 flex justify-between items-center px-4 sm:px-6 lg:px-8 h-16"
    style="
      left: var(--sidebar-width);
      transition:
        left 0.25s ease,
        background-color var(--duration-base) var(--ease-standard);
      background: color-mix(in srgb, var(--color-surface) 85%, transparent);
      backdrop-filter: blur(20px);
      border-bottom: 1px solid var(--color-hairline);
    "
  >
    <!-- Left: hamburguesa (mobile) + título -->
    <div class="flex items-center gap-2">
      <button
        class="hamburger lg:hidden p-2 -ml-1 rounded-full transition-colors"
        aria-label="Abrir menú"
        @click="sidebar.toggleMobile()"
      >
        <span class="material-symbols-outlined" style="color: var(--color-on-surface-variant)">menu</span>
      </button>
      <h2 class="text-base font-semibold" style="color: var(--color-primary)">SIGA Óptica</h2>
      <span
        v-if="sucursalLabel"
        class="hidden sm:inline-flex items-center gap-1.5 ml-2 px-3 py-1 rounded-full text-xs font-bold"
        style="background-color: var(--color-surface-container-high); color: var(--color-on-surface-variant)"
        :title="`Sucursal: ${sucursalLabel}`"
      >
        <span class="material-symbols-outlined" style="font-size: 14px">store</span>
        {{ sucursalLabel }}
      </span>
    </div>

    <!-- Right: acciones + usuario -->
    <div class="flex items-center gap-2">
      <!-- Toggle de tema (claro / oscuro) -->
      <button
        @click="theme.toggle"
        class="theme-toggle p-2 rounded-full transition-colors"
        :title="isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'"
        :aria-label="isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'"
      >
        <span class="material-symbols-outlined" style="color: var(--color-on-surface-variant)">{{
          isDark ? "light_mode" : "dark_mode"
        }}</span>
      </button>

      <!-- Notificaciones -->
      <div
        v-if="authStore.hasPermission('ver_notificaciones')"
        ref="notificationsRef"
        class="relative"
      >
        <button
          @click="toggleNotifications"
          class="icon-btn p-2 rounded-full transition-colors relative"
          :class="{ 'is-active': showNotifications }"
        >
          <span class="material-symbols-outlined" style="color: var(--color-on-surface-variant)"
            >notifications</span
          >
          <span
            v-if="contadorNoLeidas > 0"
            class="absolute top-0.5 right-0.5 flex items-center justify-center rounded-full text-[10px] font-bold text-white"
            style="min-width: 16px; height: 16px; padding: 0 3px; background-color: var(--color-error)"
          >{{ contadorNoLeidas > 9 ? "9+" : contadorNoLeidas }}</span>
        </button>

        <Transition
          enter-active-class="transition-all duration-150 ease-out"
          enter-from-class="opacity-0 translate-y-1"
          enter-to-class="opacity-100 translate-y-0"
          leave-active-class="transition-all duration-100 ease-in"
          leave-from-class="opacity-100 translate-y-0"
          leave-to-class="opacity-0 translate-y-1"
        >
          <div
            v-if="showNotifications"
            class="absolute right-0 mt-2 w-80 rounded-lg overflow-hidden"
            style="
              top: 100%;
              background-color: var(--color-surface-container-lowest);
              box-shadow: var(--shadow-lg);
              outline: 1px solid var(--color-hairline);
            "
          >
            <div class="px-4 py-3" style="border-bottom: 1px solid var(--color-hairline-soft)">
              <p class="text-sm font-bold" style="color: var(--color-on-surface)">Notificaciones</p>
            </div>
            <div v-if="ultimasNotificaciones.length === 0" class="flex flex-col items-center justify-center py-10 gap-2">
              <span
                class="material-symbols-outlined"
                style="font-size: 36px; color: var(--color-outline-variant)"
                >notifications_off</span
              >
              <p class="text-sm" style="color: var(--color-outline)">
                Sin notificaciones por ahora
              </p>
            </div>
            <div v-else class="max-h-80 overflow-y-auto">
              <button
                v-for="n in ultimasNotificaciones"
                :key="n.id"
                @click="onClickNotificacion(n)"
                class="w-full flex items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-container-low"
                style="border-bottom: 1px solid var(--color-hairline-soft)"
              >
                <div class="flex-1 min-w-0">
                  <p class="text-xs" :class="n.leido ? 'font-medium' : 'font-bold'" style="color: var(--color-on-surface)">
                    {{ n.mensaje }}
                  </p>
                  <p class="text-[11px] mt-0.5" style="color: var(--color-outline)">{{ fechaRelativa(n.fechaCreacion) }}</p>
                </div>
                <div v-if="!n.leido" class="w-2 h-2 rounded-full flex-shrink-0 mt-1" style="background-color: var(--color-primary)" />
              </button>
            </div>
            <button
              @click="router.push('/notificaciones'); showNotifications = false"
              class="w-full px-4 py-2.5 text-center text-xs font-bold transition-colors hover:bg-surface-container-low"
              style="color: var(--color-primary)"
            >
              Ver todas
            </button>
          </div>
        </Transition>
      </div>

      <div class="w-px h-8 mx-2" style="background-color: var(--color-hairline-strong)"></div>

      <!-- User dropdown -->
      <div ref="dropdownRef" class="relative">
        <button
          @click="toggleDropdown"
          class="user-btn flex items-center gap-3 px-2 py-1.5 rounded-md transition-all"
          :class="{ 'is-active': showDropdown }"
        >
          <div class="text-right hidden sm:block">
            <p class="text-sm font-bold leading-none" style="color: var(--color-on-surface)">
              {{ displayName }}
            </p>
            <p
              class="text-[10px] font-semibold uppercase tracking-wider mt-0.5"
              style="color: var(--color-outline)"
            >
              {{ position }}
            </p>
          </div>
          <div
            class="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
            style="background-color: var(--color-primary)"
          >
            {{ initials }}
          </div>
          <span
            class="material-symbols-outlined"
            style="font-size: 18px; color: var(--color-outline)"
            >expand_more</span
          >
        </button>

        <!-- Dropdown -->
        <Transition
          enter-active-class="transition-all duration-150 ease-out"
          enter-from-class="opacity-0 translate-y-1"
          enter-to-class="opacity-100 translate-y-0"
          leave-active-class="transition-all duration-100 ease-in"
          leave-from-class="opacity-100 translate-y-0"
          leave-to-class="opacity-0 translate-y-1"
        >
          <div
            v-if="showDropdown"
            class="absolute right-0 mt-2 w-56 rounded-lg overflow-hidden"
            style="
              top: 100%;
              background-color: var(--color-surface-container-lowest);
              box-shadow: var(--shadow-lg);
              outline: 1px solid var(--color-hairline);
            "
          >
            <!-- Info del usuario -->
            <div class="px-4 py-4" style="border-bottom: 1px solid var(--color-hairline-soft)">
              <p class="text-sm font-bold" style="color: var(--color-on-surface)">
                {{ displayName }}
              </p>
              <p class="text-xs mt-0.5" style="color: var(--color-outline)">{{ user?.email }}</p>
              <div class="flex flex-wrap gap-1 mt-2">
                <span
                  v-for="role in user?.roles"
                  :key="role"
                  class="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
                  style="
                    background-color: color-mix(in srgb, var(--color-primary) 10%, transparent);
                    color: var(--color-primary);
                  "
                  >{{ role }}</span
                >
              </div>
            </div>

            <!-- Acciones -->
            <div class="py-1.5">
              <button
                @click="openChangePasswordModal"
                class="account-action-btn w-full flex items-center gap-3 px-4 py-2.5 text-sm font-semibold transition-colors text-left"
                style="color: var(--color-on-surface-variant)"
              >
                <span class="material-symbols-outlined" style="font-size: 18px">password</span>
                Cambiar contraseña
              </button>
              <button
                @click="logout"
                class="logout-btn w-full flex items-center gap-3 px-4 py-2.5 text-sm font-semibold transition-colors text-left"
                style="color: var(--color-error)"
              >
                <span class="material-symbols-outlined" style="font-size: 18px">logout</span>
                Cerrar sesión
              </button>
            </div>
          </div>
        </Transition>
      </div>
    </div>
  </header>

  <!-- Modal: cambiar mi contraseña -->
  <BaseModal :show="showChangePasswordModal" title="Cambiar contraseña" size="sm" @close="showChangePasswordModal = false">
    <template #body>
      <form class="space-y-4" @submit.prevent="submitChangePassword">
        <div class="flex flex-col gap-1.5">
          <label class="text-xs font-bold uppercase tracking-wider" style="color: var(--color-outline)">Contraseña actual</label>
          <PasswordInput v-model="currentPassword" placeholder="Tu contraseña actual" />
        </div>
        <div class="flex flex-col gap-1.5">
          <label class="text-xs font-bold uppercase tracking-wider" style="color: var(--color-outline)">Contraseña nueva</label>
          <PasswordInput v-model="newPassword" placeholder="Mínimo 6 caracteres" />
        </div>
        <div class="flex flex-col gap-1.5">
          <label class="text-xs font-bold uppercase tracking-wider" style="color: var(--color-outline)">Confirmar contraseña nueva</label>
          <PasswordInput v-model="confirmPassword" placeholder="Repetí la contraseña nueva" />
        </div>
        <p v-if="changePasswordError" class="text-xs font-medium" style="color: var(--color-error)">{{ changePasswordError }}</p>
      </form>
    </template>
    <template #footer>
      <BaseButton variant="secondary" size="sm" @click="showChangePasswordModal = false">Cancelar</BaseButton>
      <BaseButton variant="primary" size="sm" :disabled="isChangingPassword" @click="submitChangePassword">
        {{ isChangingPassword ? "Guardando..." : "Guardar" }}
      </BaseButton>
    </template>
  </BaseModal>
</template>

<style scoped>
.theme-toggle:hover,
.icon-btn:hover,
.user-btn:hover,
.hamburger:hover,
.account-action-btn:hover {
  background-color: var(--color-surface-container-low);
}
.icon-btn.is-active,
.user-btn.is-active {
  background-color: var(--color-surface-container-high);
}
.logout-btn:hover {
  background-color: var(--color-error-container);
}
</style>
