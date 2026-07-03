<script setup lang="ts">
import { ref } from "vue"
import { useRouter } from "vue-router"
import { changePassword } from "@/services/authService"
import { useAuthStore } from "@/stores/auth"
import { firstAccessibleRoute } from "@/config/menuConfig"
import BaseButton from "@/components/BaseButton.vue"
import PasswordInput from "@/components/PasswordInput.vue"
import AuthHero from "@/components/AuthHero.vue"

const router = useRouter()
const authStore = useAuthStore()

const currentPassword = ref("")
const newPassword = ref("")
const confirmPassword = ref("")
const isLoading = ref(false)
const hasError = ref(false)
const errorMessage = ref("")

async function handleSubmit() {
  if (isLoading.value) return

  hasError.value = false
  errorMessage.value = ""

  if (newPassword.value.length < 6) {
    errorMessage.value = "La nueva contraseña debe tener al menos 6 caracteres."
    hasError.value = true
    return
  }
  if (newPassword.value !== confirmPassword.value) {
    errorMessage.value = "Las contraseñas no coinciden."
    hasError.value = true
    return
  }

  isLoading.value = true
  try {
    await changePassword(currentPassword.value, newPassword.value)
    authStore.clearMustChangePassword()
    const redirectTo = authStore.hasPermission("ver_dashboard")
      ? "/"
      : firstAccessibleRoute(authStore.user?.permissions ?? [])
    router.push(redirectTo)
  } catch (err: unknown) {
    hasError.value = true
    errorMessage.value = err instanceof Error ? err.message : "No se pudo cambiar la contraseña."
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <main
    class="min-h-screen flex flex-col md:flex-row overflow-hidden"
    style="background-color: var(--color-surface); color: var(--color-on-surface)"
  >
    <AuthHero
      eyebrow="Seguridad de la cuenta"
      title="Un último paso."
      subtitle="Por seguridad, tenés que elegir una contraseña propia antes de continuar."
    />

    <section
      class="flex-1 flex flex-col justify-center px-6 py-12 lg:px-24 relative"
      style="background-color: var(--color-surface)"
    >
      <div class="max-w-md w-full mx-auto">
        <div class="mb-10 hidden md:block">
          <span class="text-3xl font-black tracking-tight" style="color: var(--color-primary)">SIGA-Óptica</span>
        </div>

        <div class="mb-10">
          <h2 class="text-3xl font-bold mb-3 leading-snug" style="color: var(--color-on-surface)">
            Cambiá tu contraseña
          </h2>
          <p class="font-medium" style="color: var(--color-on-surface-variant)">
            Tu cuenta fue creada con una contraseña provisoria. Elegí una nueva antes de seguir.
          </p>
        </div>

        <Transition
          enter-active-class="transition-all duration-300 ease-out"
          enter-from-class="opacity-0 -translate-y-2"
          enter-to-class="opacity-100 translate-y-0"
          leave-active-class="transition-all duration-200 ease-in"
          leave-from-class="opacity-100 translate-y-0"
          leave-to-class="opacity-0 -translate-y-2"
        >
          <div
            v-if="hasError"
            class="flex items-center gap-2.5 rounded-2xl px-4 py-3 mb-8 text-sm font-medium"
            style="background-color: var(--color-error-container); color: var(--color-on-error-container)"
          >
            <span class="material-symbols-outlined flex-shrink-0" style="font-size: 18px">error</span>
            {{ errorMessage }}
          </div>
        </Transition>

        <form @submit.prevent="handleSubmit" class="space-y-5" novalidate>
          <div class="flex flex-col gap-1.5">
            <label class="text-xs font-bold uppercase tracking-wider" style="color: var(--color-outline)">Contraseña provisoria</label>
            <PasswordInput v-model="currentPassword" placeholder="La que te dieron al crear tu cuenta" />
          </div>
          <div class="flex flex-col gap-1.5">
            <label class="text-xs font-bold uppercase tracking-wider" style="color: var(--color-outline)">Contraseña nueva</label>
            <PasswordInput v-model="newPassword" placeholder="Mínimo 6 caracteres" />
          </div>
          <div class="flex flex-col gap-1.5">
            <label class="text-xs font-bold uppercase tracking-wider" style="color: var(--color-outline)">Confirmar contraseña nueva</label>
            <PasswordInput v-model="confirmPassword" placeholder="Repetí la contraseña nueva" />
          </div>

          <div class="pt-4">
            <BaseButton variant="primary" size="lg" type="submit" :disabled="isLoading" class="w-full">
              <svg v-if="isLoading" class="animate-spin w-5 h-5 text-on-primary flex-shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <span>{{ isLoading ? "Guardando..." : "Cambiar contraseña y continuar" }}</span>
            </BaseButton>
          </div>
        </form>
      </div>
    </section>
  </main>
</template>
