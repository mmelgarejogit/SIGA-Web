<script setup lang="ts">
import { ref } from "vue"
import { useRouter } from "vue-router"
import { login } from "@/services/authService"
import { useAuthStore } from "@/stores/auth"
import { menuConfig } from "@/config/menuConfig"
import BaseButton from "@/components/BaseButton.vue"

const router = useRouter()
const authStore = useAuthStore()

function getFirstAccessibleRoute(permissions: string[]): string {
  for (const item of menuConfig) {
    if (item.route && (!item.permission || permissions.includes(item.permission))) {
      return item.route
    }
    if (item.children) {
      for (const child of item.children) {
        if (!child.permission || permissions.includes(child.permission)) {
          return child.route
        }
      }
    }
  }
  return "/"
}

const email = ref("")
const password = ref("")
const showPassword = ref(false)
const isLoading = ref(false)
const hasError = ref(false)
const errorMessage = ref("")

// ── Validación ────────────────────────────────────────────────────────────────

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function validate(): string | null {
  if (!email.value.trim()) return "El correo electrónico es requerido."
  if (!EMAIL_RE.test(email.value.trim())) return "Ingrese un correo electrónico válido."
  if (!password.value) return "La contraseña es requerida."
  return null
}

// ── Submit ────────────────────────────────────────────────────────────────────

async function handleSubmit() {
  // Prevenir envíos simultáneos
  if (isLoading.value) return

  // Limpiar error previo
  hasError.value = false
  errorMessage.value = ""

  // Validación local
  const validationError = validate()
  if (validationError) {
    errorMessage.value = validationError
    hasError.value = true
    return
  }

  isLoading.value = true

  try {
    const response = await login({
      email: email.value.trim(),
      password: password.value,
    })

    // Guardar sesión en el store (y en localStorage)
    authStore.setSession(response.jwtToken, {
      email: response.email,
      firstName: response.firstName,
      lastName: response.lastName,
      specialty: response.specialty,
      professionalId: response.professionalId,
      roles: response.roleClaims,
      permissions: response.permissions ?? [],
    })

    // Navegar al primer destino accesible (dashboard si tiene permiso, sino el primero disponible)
    const redirectTo = authStore.hasPermission("ver_dashboard")
      ? "/"
      : getFirstAccessibleRoute(response.permissions ?? [])
    router.push(redirectTo)
  } catch (err: unknown) {
    hasError.value = true

    if (err instanceof Error) {
      const status = (err as Error & { status?: number }).status

      if (status === 401) {
        // Mensajes de negocio del backend
        errorMessage.value = err.message || "Credenciales incorrectas. Intentá de nuevo."
      } else if (status === 400) {
        errorMessage.value = "Los datos ingresados no son válidos."
      } else if (!status) {
        // Error de red / backend caído
        errorMessage.value = "No se pudo conectar con el servidor. Verificá tu conexión."
      } else {
        errorMessage.value = "Ocurrió un error inesperado. Intentá más tarde."
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
  <main
    class="min-h-screen flex flex-col md:flex-row overflow-hidden"
    style="background-color: var(--color-surface); color: var(--color-on-surface)"
  >
    <!-- ── LEFT PANEL ── -->
    <section
      class="hidden md:flex md:w-[55%] relative overflow-hidden items-center justify-center"
      style="background-color: var(--color-primary-container)"
    >
      <!-- Background image (eyeglasses on marble, mix-blend-overlay) -->
      <div class="absolute inset-0 z-0">
        <img
          src="https://lh3.googleusercontent.com/aida-public/AB6AXuCB316X6IevMlGCue86yPBEHEtWRntvBzkXBlUqImB4RKgBaS2T9139462GjkuVAQjtmTJEGZkyd7N81l5Wq09m9vTDSS6YAKqWKquTlepD5qqjabt_hvhR2jjTz_VLg15HM_lX8RrqhWOQO70O3CVHt3q_Ci8DG1qF-ev67n9zA7mRn6v9auHmg9DqK-iBx8ATd1UHET5_ko3LskskKQeG9xt1_Ut46H1aOOHZfu9f2ehzY3DLaWTG1h9V1UgB3HGEb0raHHIeyw"
          alt=""
          class="w-full h-full object-cover"
          style="opacity: 0.6; mix-blend-mode: overlay"
        />
        <!-- gradient overlay: from-primary (bottom-left) to transparent -->
        <div
          class="absolute inset-0"
          style="
            background: linear-gradient(to top right, var(--color-primary), transparent);
            opacity: 0.8;
          "
        ></div>
      </div>

      <!-- Lens circles decoration -->
      <div
        class="absolute bottom-[-10%] right-[-10%] w-96 h-96 rounded-full pointer-events-none z-0"
        style="border: 1px solid rgba(255, 255, 255, 0.1)"
      ></div>
      <div
        class="absolute bottom-[-5%] right-[-5%] w-64 h-64 rounded-full pointer-events-none z-0"
        style="border: 1px solid rgba(255, 255, 255, 0.18)"
      ></div>

      <!-- Content -->
      <div class="relative z-10 p-12 lg:p-24 max-w-2xl w-full">
        <div class="mb-14">
          <span
            class="inline-block px-4 py-1.5 rounded-full text-[10px] font-bold tracking-[0.2em] uppercase mb-8"
            style="
              background-color: var(--color-secondary-fixed);
              color: var(--color-on-secondary-fixed);
            "
            >Precisión Óptica</span
          >

          <h1 class="text-5xl lg:text-7xl font-extrabold text-white leading-tight tracking-tighter">
            La visión del futuro comienza
            <span style="color: var(--color-secondary-container)"> aquí.</span>
          </h1>
        </div>

        <div class="grid grid-cols-2 gap-8">
          <div class="space-y-2">
            <p
              class="text-xs uppercase tracking-widest font-bold"
              style="color: rgba(255, 255, 255, 0.5)"
            >
              Tecnología
            </p>
            <p class="text-white text-base font-medium leading-snug">
              Gestión clínica integrada con precisión absoluta.
            </p>
          </div>
          <div class="space-y-2">
            <p
              class="text-xs uppercase tracking-widest font-bold"
              style="color: rgba(255, 255, 255, 0.5)"
            >
              Confianza
            </p>
            <p class="text-white text-base font-medium leading-snug">
              Líder en soluciones para el mercado óptico.
            </p>
          </div>
        </div>
      </div>
    </section>

    <!-- ── RIGHT PANEL ── -->
    <section
      class="flex-1 flex flex-col justify-center px-6 py-12 lg:px-24 relative"
      style="background-color: var(--color-surface)"
    >
      <!-- Mobile logo -->
      <div class="absolute top-8 left-8 md:hidden">
        <span class="text-2xl font-black tracking-tight" style="color: var(--color-primary)"
          >SIGA-Óptica</span
        >
      </div>

      <div class="max-w-md w-full mx-auto">
        <!-- Desktop brand -->
        <div class="mb-10 hidden md:block">
          <span class="text-3xl font-black tracking-tight" style="color: var(--color-primary)"
            >SIGA-Óptica</span
          >
        </div>

        <!-- Headline -->
        <div class="mb-12">
          <h2 class="text-3xl font-bold mb-3 leading-snug" style="color: var(--color-on-surface)">
            Bienvenido de nuevo a SIGA-Óptica
          </h2>
          <p class="font-medium" style="color: var(--color-on-surface-variant)">
            Acceda a su cuenta para gestionar sus pacientes y ventas.
          </p>
        </div>

        <!-- Error message -->
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
            style="
              background-color: var(--color-error-container);
              color: var(--color-on-error-container);
            "
          >
            <span
              class="material-symbols-outlined flex-shrink-0"
              style="width: 18px; height: 18px; font-size: 18px"
              >error</span
            >
            {{ errorMessage }}
          </div>
        </Transition>

        <form @submit.prevent="handleSubmit" class="space-y-8" novalidate>
          <!-- Email floating label field -->
          <div class="relative group">
            <label
              for="email"
              class="absolute -top-2.5 left-4 px-1 text-xs font-semibold transition-colors z-10"
              :style="`background-color: var(--color-surface); color: ${hasError ? 'var(--color-on-error-container)' : 'var(--label-color, var(--color-outline))'};`"
              >Usuario o Correo electrónico</label
            >
            <div
              class="flex items-center gap-3 px-4 py-4 rounded-2xl transition-all"
              :style="`
                background-color: var(--color-surface-container-lowest);
                border: 1px solid ${hasError ? 'var(--color-error)' : 'var(--color-outline-variant)'};
                box-shadow: none;
              `"
            >
              <span
                class="material-symbols-outlined flex-shrink-0"
                style="color: var(--color-outline); width: 20px; height: 20px; font-size: 20px"
                >person</span
              >
              <input
                id="email"
                v-model="email"
                type="email"
                placeholder="nombre@sigaoptica.com"
                autocomplete="email"
                class="block w-full bg-transparent text-base outline-none placeholder-[var(--color-outline-variant)]"
                style="border: none; color: var(--color-on-surface)"
                @focus="
                  ($event.target as HTMLElement)
                    .closest('.relative')
                    ?.querySelector('label')
                    ?.setAttribute(
                      'style',
                      `background-color: var(--color-surface); color: var(--color-primary); z-index:10;`,
                    )
                "
                @blur="
                  ($event.target as HTMLElement)
                    .closest('.relative')
                    ?.querySelector('label')
                    ?.setAttribute(
                      'style',
                      `background-color: var(--color-surface); color: var(--color-outline); z-index:10;`,
                    )
                "
              />
            </div>
          </div>

          <!-- Password floating label field -->
          <div class="space-y-2">
            <div class="relative group">
              <label
                for="password"
                class="absolute -top-2.5 left-4 px-1 text-xs font-semibold transition-colors z-10"
                :style="`background-color: var(--color-surface); color: ${hasError ? 'var(--color-on-error-container)' : 'var(--color-outline)'};`"
                >Contraseña</label
              >
              <div
                class="flex items-center gap-3 px-4 py-4 rounded-2xl transition-all"
                :style="`
                  background-color: var(--color-surface-container-lowest);
                  border: 1px solid ${hasError ? 'var(--color-error)' : 'var(--color-outline-variant)'};
                `"
              >
                <span
                  class="material-symbols-outlined flex-shrink-0"
                  style="color: var(--color-outline); width: 20px; height: 20px; font-size: 20px"
                  >lock</span
                >
                <input
                  id="password"
                  v-model="password"
                  :type="showPassword ? 'text' : 'password'"
                  placeholder="••••••••"
                  autocomplete="current-password"
                  class="block w-full bg-transparent text-base outline-none flex-1 placeholder-[var(--color-outline-variant)]"
                  style="border: none; color: var(--color-on-surface)"
                />
                <button
                  type="button"
                  @click="showPassword = !showPassword"
                  class="flex-shrink-0 transition-colors"
                  style="color: var(--color-outline-variant)"
                  :aria-label="showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'"
                >
                  <span
                    class="material-symbols-outlined"
                    style="width: 20px; height: 20px; font-size: 20px"
                    >{{ showPassword ? "visibility_off" : "visibility" }}</span
                  >
                </button>
              </div>
            </div>

            <div class="flex justify-end pt-1">
              <button
                type="button"
                class="text-sm font-bold transition-colors"
                style="color: var(--color-primary)"
              >
                ¿Olvidó su contraseña?
              </button>
            </div>
          </div>

          <!-- Submit -->
          <div class="pt-4">
            <BaseButton
              variant="primary"
              size="lg"
              type="submit"
              :disabled="isLoading"
              class="w-full"
            >
              <svg
                v-if="isLoading"
                class="animate-spin w-5 h-5 text-white flex-shrink-0"
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
              <span>{{ isLoading ? "Verificando..." : "Iniciar Sesión" }}</span>
              <span
                v-if="!isLoading"
                class="material-symbols-outlined"
                style="width: 22px; height: 22px; font-size: 22px"
                >arrow_forward</span
              >
            </BaseButton>
          </div>
        </form>

        <!-- Divider + alternatives -->
        <div class="mt-12 flex flex-col items-center gap-6">
          <div class="w-full flex items-center gap-4">
            <div class="flex-1 h-px" style="background-color: rgba(196, 197, 213, 0.35)"></div>
            <span
              class="text-xs font-bold uppercase tracking-widest"
              style="color: var(--color-outline-variant)"
              >o iniciar sesión con</span
            >
            <div class="flex-1 h-px" style="background-color: rgba(196, 197, 213, 0.35)"></div>
          </div>

          <!-- Google button -->
          <button
            type="button"
            class="w-full h-12 rounded-full flex items-center justify-center gap-3 font-semibold transition-colors"
            style="
              border: 1px solid var(--color-outline-variant);
              background-color: white;
              color: var(--color-on-surface-variant);
            "
          >
            <svg class="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            <span>Entrar con Google</span>
          </button>

          <p class="text-sm font-medium" style="color: var(--color-on-surface-variant)">
            ¿Sos paciente y no tenés cuenta?
            <RouterLink
              to="/registro"
              class="font-bold ml-1 hover:underline underline-offset-2 transition-colors"
              style="color: var(--color-primary)"
              >Registrate aquí</RouterLink
            >
          </p>
        </div>
      </div>

      <!-- Footer -->
      <footer
        class="absolute bottom-8 left-0 right-0 px-12 flex justify-between items-center text-[10px] font-bold uppercase tracking-widest"
        style="color: var(--color-outline-variant)"
      >
        <span>© 2024 SIGA-Óptica</span>
        <div class="flex gap-6">
          <a href="#" class="hover:text-[var(--color-primary)] transition-colors">Privacidad</a>
          <a href="#" class="hover:text-[var(--color-primary)] transition-colors">Términos</a>
        </div>
      </footer>
    </section>
  </main>
</template>
