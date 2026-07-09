<script setup lang="ts">
import { ref } from "vue"
import { useRoute } from "vue-router"
import { resetPassword } from "@/services/authService"
import BaseButton from "@/components/BaseButton.vue"

const route = useRoute()
const token = (route.query.token as string | undefined) ?? ""

const status = ref<"form" | "success" | "invalid">(token ? "form" : "invalid")

const newPassword = ref("")
const confirmPassword = ref("")
const showPassword = ref(false)
const showConfirmPwd = ref(false)
const isLoading = ref(false)
const hasError = ref(false)
const errorMessage = ref("")

function validate(): string | null {
  if (!newPassword.value) return "La nueva contraseña es obligatoria."
  if (newPassword.value.length < 6) return "La contraseña debe tener al menos 6 caracteres."
  if (newPassword.value !== confirmPassword.value) return "Las contraseñas no coinciden."
  return null
}

async function handleSubmit() {
  if (isLoading.value) return
  hasError.value = false
  errorMessage.value = ""

  const error = validate()
  if (error) {
    errorMessage.value = error
    hasError.value = true
    return
  }

  isLoading.value = true
  try {
    await resetPassword(token, newPassword.value)
    status.value = "success"
  } catch (err: unknown) {
    hasError.value = true
    if (err instanceof Error) {
      const e = err as Error & { status?: number }
      if (e.status === 404) {
        status.value = "invalid"
      } else {
        errorMessage.value = !e.status
          ? "No se pudo conectar con el servidor. Verificá tu conexión."
          : e.message || "Ocurrió un error inesperado. Intentá más tarde."
      }
    } else {
      errorMessage.value = "Ocurrió un error inesperado. Intentá más tarde."
    }
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <main class="min-h-screen flex items-center justify-center px-4" style="background-color: var(--color-surface)">
    <div class="w-full max-w-md bg-white rounded-2xl p-12 text-center" style="box-shadow: 0 4px 32px rgba(0, 0, 0, 0.06)">
      <p class="text-2xl font-black tracking-tight mb-10" style="color: var(--color-primary)">SIGA-Óptica</p>

      <!-- ── Formulario ── -->
      <div v-if="status === 'form'" class="text-left">
        <h2 class="text-2xl font-bold mb-2 text-center" style="color: var(--color-on-surface)">Elegí tu nueva contraseña</h2>
        <p class="font-medium mb-8 text-center text-sm" style="color: var(--color-on-surface-variant)">
          Ingresá y confirmá tu nueva contraseña.
        </p>

        <div
          v-if="hasError"
          class="flex items-center gap-2.5 rounded-2xl px-4 py-3 mb-6 text-sm font-medium"
          style="background-color: var(--color-error-container); color: var(--color-on-error-container)"
        >
          <span class="material-symbols-outlined flex-shrink-0" style="width: 18px; height: 18px; font-size: 18px">error</span>
          {{ errorMessage }}
        </div>

        <form @submit.prevent="handleSubmit" class="space-y-5" novalidate>
          <div class="relative group">
            <label
              class="absolute -top-2.5 left-4 px-1 text-xs font-semibold z-10"
              style="background-color: white; color: var(--color-outline)"
              >Nueva contraseña</label
            >
            <div
              class="flex items-center gap-3 px-4 py-4 rounded-2xl"
              style="background-color: var(--color-surface-container-lowest); border: 1px solid var(--color-outline-variant)"
            >
              <span class="material-symbols-outlined flex-shrink-0" style="color: var(--color-outline); font-size: 20px">lock</span>
              <input
                v-model="newPassword"
                :type="showPassword ? 'text' : 'password'"
                placeholder="••••••••"
                autocomplete="new-password"
                class="block w-full bg-transparent text-base outline-none flex-1"
                style="border: none; color: var(--color-on-surface)"
              />
              <button type="button" @click="showPassword = !showPassword" style="color: var(--color-outline-variant)">
                <span class="material-symbols-outlined" style="font-size: 20px">{{
                  showPassword ? "visibility_off" : "visibility"
                }}</span>
              </button>
            </div>
          </div>

          <div class="relative group">
            <label
              class="absolute -top-2.5 left-4 px-1 text-xs font-semibold z-10"
              style="background-color: white; color: var(--color-outline)"
              >Confirmar contraseña</label
            >
            <div
              class="flex items-center gap-3 px-4 py-4 rounded-2xl"
              style="background-color: var(--color-surface-container-lowest); border: 1px solid var(--color-outline-variant)"
            >
              <span class="material-symbols-outlined flex-shrink-0" style="color: var(--color-outline); font-size: 20px">lock</span>
              <input
                v-model="confirmPassword"
                :type="showConfirmPwd ? 'text' : 'password'"
                placeholder="••••••••"
                autocomplete="new-password"
                class="block w-full bg-transparent text-base outline-none flex-1"
                style="border: none; color: var(--color-on-surface)"
              />
              <button type="button" @click="showConfirmPwd = !showConfirmPwd" style="color: var(--color-outline-variant)">
                <span class="material-symbols-outlined" style="font-size: 20px">{{
                  showConfirmPwd ? "visibility_off" : "visibility"
                }}</span>
              </button>
            </div>
          </div>

          <div class="pt-2">
            <BaseButton variant="primary" size="lg" type="submit" :disabled="isLoading" class="w-full">
              {{ isLoading ? "Guardando..." : "Restablecer contraseña" }}
            </BaseButton>
          </div>
        </form>
      </div>

      <!-- ── Éxito ── -->
      <div v-else-if="status === 'success'" class="flex flex-col items-center gap-4">
        <div class="w-16 h-16 rounded-full flex items-center justify-center" style="background-color: var(--color-success-container)">
          <span class="material-symbols-outlined" style="color: var(--color-on-success-container); font-size: 32px">check_circle</span>
        </div>
        <h2 class="text-2xl font-bold" style="color: var(--color-on-surface)">¡Contraseña actualizada!</h2>
        <p class="font-medium" style="color: var(--color-on-surface-variant)">Ya podés iniciar sesión con tu nueva contraseña.</p>
        <RouterLink
          to="/login"
          class="mt-4 inline-flex items-center gap-2 h-12 px-8 rounded-full font-bold transition-all active:scale-[0.98]"
          style="background-color: var(--color-primary); color: var(--color-on-primary); box-shadow: var(--shadow-lg)"
        >
          Iniciar sesión
          <span class="material-symbols-outlined" style="font-size: 20px">arrow_forward</span>
        </RouterLink>
      </div>

      <!-- ── Token inválido/expirado ── -->
      <div v-else class="flex flex-col items-center gap-4">
        <div class="w-16 h-16 rounded-full flex items-center justify-center" style="background-color: var(--color-error-container)">
          <span class="material-symbols-outlined" style="color: var(--color-on-error-container); font-size: 32px">error</span>
        </div>
        <h2 class="text-2xl font-bold" style="color: var(--color-on-surface)">Enlace no válido</h2>
        <p class="font-medium" style="color: var(--color-on-surface-variant)">
          El enlace no es válido o ya expiró. Pedí uno nuevo para restablecer tu contraseña.
        </p>
        <RouterLink
          to="/olvide-contrasena"
          class="mt-4 inline-flex items-center gap-2 h-12 px-8 rounded-full font-bold transition-all"
          style="border: 1.5px solid var(--color-outline-variant); color: var(--color-primary); background: var(--color-surface-container-lowest)"
        >
          Pedir un nuevo enlace
        </RouterLink>
      </div>
    </div>
  </main>
</template>
