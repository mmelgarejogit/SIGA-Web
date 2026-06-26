<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from "vue"
import { useRouter } from "vue-router"
import { useAuthStore } from "@/stores/auth"
import { useThemeStore } from "@/stores/theme"
import { useSidebarStore } from "@/stores/sidebar"

const router = useRouter()
const authStore = useAuthStore()
const theme = useThemeStore()
const sidebar = useSidebarStore()

const isDark = computed(() => theme.mode === "dark")

const showDropdown = ref(false)
const dropdownRef = ref<HTMLElement | null>(null)
const showNotifications = ref(false)
const notificationsRef = ref<HTMLElement | null>(null)

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

const initials = computed(() => {
  if (!user.value) return "?"
  return `${user.value.firstName?.[0] ?? ""}${user.value.lastName?.[0] ?? ""}`.toUpperCase() || "?"
})

function toggleDropdown() {
  showDropdown.value = !showDropdown.value
  if (showDropdown.value) showNotifications.value = false
}

function toggleNotifications() {
  showNotifications.value = !showNotifications.value
  if (showNotifications.value) showDropdown.value = false
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

onMounted(() => document.addEventListener("mousedown", handleClickOutside))
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
            class="absolute right-0 mt-2 w-72 rounded-lg overflow-hidden"
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
            <div class="flex flex-col items-center justify-center py-10 gap-2">
              <span
                class="material-symbols-outlined"
                style="font-size: 36px; color: var(--color-outline-variant)"
                >notifications_off</span
              >
              <p class="text-sm" style="color: var(--color-outline)">
                Sin notificaciones por ahora
              </p>
            </div>
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
          <div class="text-right">
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
</template>

<style scoped>
.theme-toggle:hover,
.icon-btn:hover,
.user-btn:hover,
.hamburger:hover {
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
