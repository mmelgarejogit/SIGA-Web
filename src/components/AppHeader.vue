<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router    = useRouter()
const authStore = useAuthStore()

const showDropdown = ref(false)
const dropdownRef  = ref<HTMLElement | null>(null)

const user = computed(() => authStore.user)

const displayName = computed(() => {
  if (!user.value) return ''
  return `${user.value.firstName} ${user.value.lastName}`
})

const position = computed(() => {
  if (!user.value) return ''
  if (user.value.specialty) return user.value.specialty
  if (user.value.roles.includes('Admin')) return 'Administrador'
  if (user.value.roles.length > 0) return user.value.roles[0]
  return 'Usuario'
})

const initials = computed(() => {
  if (!user.value) return '?'
  return `${user.value.firstName[0] ?? ''}${user.value.lastName[0] ?? ''}`.toUpperCase()
})

function toggleDropdown() {
  showDropdown.value = !showDropdown.value
}

function handleClickOutside(e: MouseEvent) {
  if (dropdownRef.value && !dropdownRef.value.contains(e.target as Node)) {
    showDropdown.value = false
  }
}

function logout() {
  authStore.clearSession()
  router.push('/login')
}

onMounted(() => document.addEventListener('mousedown', handleClickOutside))
onUnmounted(() => document.removeEventListener('mousedown', handleClickOutside))
</script>

<template>
  <header
    class="fixed top-0 right-0 z-40 flex justify-between items-center px-8 h-16"
    style="left: 280px; background: rgba(247,249,254,0.85); backdrop-filter: blur(20px); border-bottom: 1px solid rgba(196,197,213,0.15);"
  >
    <!-- Left: placeholder para título de sección -->
    <div class="flex items-center">
      <h2 class="text-base font-semibold" style="color: #00288E;">SIGA Óptica</h2>
    </div>

    <!-- Right: acciones + usuario -->
    <div class="flex items-center gap-2">
      <button class="p-2 rounded-full transition-colors relative hover:bg-blue-50">
        <span class="material-symbols-outlined" style="color: #444653;">notifications</span>
        <span class="absolute top-2 right-2 w-2 h-2 rounded-full" style="background-color: #BA1A1A;"></span>
      </button>

      <div class="w-px h-8 mx-2" style="background-color: rgba(196,197,213,0.4);"></div>

      <!-- User dropdown -->
      <div ref="dropdownRef" class="relative">
        <button
          @click="toggleDropdown"
          class="flex items-center gap-3 px-2 py-1.5 rounded-xl transition-all"
          :style="showDropdown ? 'background-color: #E6E8ED;' : ''"
          onmouseover="if(!this.style.backgroundColor || this.style.backgroundColor==='') this.style.backgroundColor='#F1F4F9'"
          onmouseout="this.style.backgroundColor = this.classList.contains('active') ? '#E6E8ED' : ''"
        >
          <div class="text-right">
            <p class="text-sm font-bold leading-none" style="color: #181C20;">{{ displayName }}</p>
            <p class="text-[10px] font-semibold uppercase tracking-wider mt-0.5" style="color: #757684;">
              {{ position }}
            </p>
          </div>
          <div
            class="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
            style="background-color: #00288E;"
          >
            {{ initials }}
          </div>
          <span class="material-symbols-outlined" style="font-size:18px; color:#757684;">expand_more</span>
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
            class="absolute right-0 mt-2 w-56 rounded-2xl overflow-hidden"
            style="top: 100%; background-color: #ffffff; box-shadow: 0 8px 32px rgba(0,40,142,0.12); outline: 1px solid rgba(196,197,213,0.2);"
          >
            <!-- Info del usuario -->
            <div class="px-4 py-4" style="border-bottom: 1px solid rgba(196,197,213,0.15);">
              <p class="text-sm font-bold" style="color: #181C20;">{{ displayName }}</p>
              <p class="text-xs mt-0.5" style="color: #757684;">{{ user?.email }}</p>
              <div class="flex flex-wrap gap-1 mt-2">
                <span
                  v-for="role in user?.roles"
                  :key="role"
                  class="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
                  style="background-color: rgba(0,40,142,0.08); color: #00288E;"
                >{{ role }}</span>
              </div>
            </div>

            <!-- Acciones -->
            <div class="py-1.5">
              <button
                @click="logout"
                class="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-semibold transition-colors text-left"
                style="color: #BA1A1A;"
                onmouseover="this.style.backgroundColor='#FFF0EE'"
                onmouseout="this.style.backgroundColor=''"
              >
                <span class="material-symbols-outlined" style="font-size:18px;">logout</span>
                Cerrar sesión
              </button>
            </div>
          </div>
        </Transition>
      </div>
    </div>
  </header>
</template>
