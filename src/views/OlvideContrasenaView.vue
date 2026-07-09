<script setup lang="ts">
import { ref } from "vue"
import VueHcaptcha from "@hcaptcha/vue3-hcaptcha"
import { requestPasswordReset } from "@/services/authService"
import BaseButton from "@/components/BaseButton.vue"
import AuthHero from "@/components/AuthHero.vue"

const email = ref("")
const isLoading = ref(false)
const hasError = ref(false)
const errorMessage = ref("")
const success = ref(false)
const hcaptchaToken = ref("")
const hcaptchaRef = ref<InstanceType<typeof VueHcaptcha> | null>(null)
const siteKey = import.meta.env.VITE_HCAPTCHA_SITE_KEY as string

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function onCaptchaVerify(token: string) {
  hcaptchaToken.value = token
}
function onCaptchaExpire() {
  hcaptchaToken.value = ""
}

function validate(): string | null {
  if (!email.value.trim()) return "El correo electrónico es requerido."
  if (!EMAIL_RE.test(email.value.trim())) return "Ingresá un correo electrónico válido."
  if (!hcaptchaToken.value) return "Por favor completá el captcha de seguridad."
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
    await requestPasswordReset(email.value.trim(), hcaptchaToken.value)
    success.value = true
  } catch (err: unknown) {
    hcaptchaRef.value?.reset()
    hcaptchaToken.value = ""
    hasError.value = true
    if (err instanceof Error) {
      const e = err as Error & { status?: number }
      errorMessage.value = !e.status
        ? "No se pudo conectar con el servidor. Verificá tu conexión."
        : e.message || "Ocurrió un error inesperado. Intentá más tarde."
    } else {
      errorMessage.value = "Ocurrió un error inesperado. Intentá más tarde."
    }
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
      eyebrow="Precisión óptica"
      title="Todo en foco."
      subtitle="La gestión de tu centro óptico, con la nitidez de un instrumento de precisión."
    />

    <section
      class="flex-1 flex flex-col justify-center px-6 py-12 lg:px-24 relative"
      style="background-color: var(--color-surface)"
    >
      <div class="absolute top-8 left-8 md:hidden">
        <span class="text-2xl font-black tracking-tight" style="color: var(--color-primary)">SIGA-Óptica</span>
      </div>

      <div class="max-w-md w-full mx-auto">
        <div class="mb-10 hidden md:block">
          <span class="text-3xl font-black tracking-tight" style="color: var(--color-primary)">SIGA-Óptica</span>
        </div>

        <!-- ── SUCCESS STATE ── -->
        <div v-if="success" class="text-center py-8">
          <div
            class="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6"
            style="background-color: var(--color-success-container)"
          >
            <span class="material-symbols-outlined" style="color: var(--color-on-success-container); font-size: 32px"
              >mark_email_read</span
            >
          </div>
          <h3 class="text-2xl font-bold mb-3" style="color: var(--color-on-surface)">Revisá tu email</h3>
          <p class="font-medium mb-8" style="color: var(--color-on-surface-variant)">
            Si el correo ingresado corresponde a una cuenta, te enviamos un enlace para restablecer tu contraseña.
          </p>
          <RouterLink
            to="/login"
            class="inline-flex items-center gap-2 h-14 px-8 rounded-full font-bold text-lg transition-all"
            style="background-color: var(--color-primary); color: var(--color-on-primary); box-shadow: var(--shadow-lg)"
          >
            Volver al login
          </RouterLink>
        </div>

        <!-- ── FORM ── -->
        <template v-else>
          <div class="mb-12">
            <h2 class="text-3xl font-bold mb-3 leading-snug" style="color: var(--color-on-surface)">
              ¿Olvidaste tu contraseña?
            </h2>
            <p class="font-medium" style="color: var(--color-on-surface-variant)">
              Ingresá tu email y te enviamos un enlace para restablecerla.
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
              <span class="material-symbols-outlined flex-shrink-0" style="width: 18px; height: 18px; font-size: 18px"
                >error</span
              >
              {{ errorMessage }}
            </div>
          </Transition>

          <form @submit.prevent="handleSubmit" class="space-y-8" novalidate>
            <div class="relative group">
              <label
                for="email"
                class="absolute -top-2.5 left-4 px-1 text-xs font-semibold transition-colors z-10"
                :style="`background-color: var(--color-surface); color: ${hasError ? 'var(--color-on-error-container)' : 'var(--color-outline)'};`"
                >Correo electrónico</label
              >
              <div
                class="flex items-center gap-3 px-4 py-4 rounded-2xl transition-all"
                :style="`background-color: var(--color-surface-container-lowest); border: 1px solid ${hasError ? 'var(--color-error)' : 'var(--color-outline-variant)'};`"
              >
                <span
                  class="material-symbols-outlined flex-shrink-0"
                  style="color: var(--color-outline); width: 20px; height: 20px; font-size: 20px"
                  >mail</span
                >
                <input
                  id="email"
                  v-model="email"
                  type="email"
                  placeholder="nombre@sigaoptica.com"
                  autocomplete="email"
                  class="block w-full bg-transparent text-base outline-none placeholder-[var(--color-outline-variant)]"
                  style="border: none; color: var(--color-on-surface)"
                />
              </div>
            </div>

            <div class="flex justify-center">
              <VueHcaptcha
                ref="hcaptchaRef"
                :sitekey="siteKey"
                @verify="onCaptchaVerify"
                @expired="onCaptchaExpire"
                @error="onCaptchaExpire"
              />
            </div>

            <div class="pt-2">
              <BaseButton variant="primary" size="lg" type="submit" :disabled="isLoading" class="w-full">
                <svg
                  v-if="isLoading"
                  class="animate-spin w-5 h-5 text-on-primary flex-shrink-0"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                  <path
                    class="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
                <span>{{ isLoading ? "Enviando..." : "Enviar enlace" }}</span>
              </BaseButton>
            </div>
          </form>

          <p class="mt-10 text-center text-sm font-medium" style="color: var(--color-on-surface-variant)">
            <RouterLink
              to="/login"
              class="font-bold hover:underline underline-offset-2 transition-colors"
              style="color: var(--color-primary)"
              >Volver al login</RouterLink
            >
          </p>
        </template>
      </div>
    </section>
  </main>
</template>
