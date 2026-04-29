<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import VueHcaptcha from '@hcaptcha/vue3-hcaptcha'
import { registerPatient } from '@/services/authService'

const router = useRouter()

const firstName        = ref('')
const lastName         = ref('')
const ci               = ref('')
const birthDate        = ref('')
const phoneNumber      = ref('')
const email            = ref('')
const password         = ref('')
const confirmPassword  = ref('')
const showPassword     = ref(false)
const showConfirmPwd   = ref(false)
const isLoading        = ref(false)
const hasError         = ref(false)
const errorMessage     = ref('')
const success          = ref(false)
const hcaptchaToken    = ref('')
const hcaptchaRef      = ref<InstanceType<typeof VueHcaptcha> | null>(null)
const siteKey          = import.meta.env.VITE_HCAPTCHA_SITE_KEY as string

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const today    = new Date().toISOString().split('T')[0]

function onCaptchaVerify(token: string) { hcaptchaToken.value = token }
function onCaptchaExpire()              { hcaptchaToken.value = '' }

function validate(): string | null {
  if (!firstName.value.trim())        return 'El nombre es obligatorio.'
  if (!lastName.value.trim())         return 'El apellido es obligatorio.'
  if (!ci.value.trim())               return 'El documento (CI) es obligatorio.'
  if (!birthDate.value)               return 'La fecha de nacimiento es obligatoria.'
  if (!email.value.trim())            return 'El email es obligatorio.'
  if (!EMAIL_RE.test(email.value.trim())) return 'Ingresá un email válido.'
  if (!password.value)                return 'La contraseña es obligatoria.'
  if (password.value.length < 8)     return 'La contraseña debe tener al menos 8 caracteres.'
  if (password.value !== confirmPassword.value) return 'Las contraseñas no coinciden.'
  if (!hcaptchaToken.value)           return 'Por favor completá el captcha de seguridad.'
  return null
}

async function handleSubmit() {
  if (isLoading.value) return
  hasError.value    = false
  errorMessage.value = ''

  const error = validate()
  if (error) {
    errorMessage.value = error
    hasError.value     = true
    return
  }

  isLoading.value = true

  try {
    await registerPatient({
      ci:            ci.value.trim(),
      firstName:     firstName.value.trim(),
      lastName:      lastName.value.trim(),
      birthDate:     birthDate.value,
      phoneNumber:   phoneNumber.value.trim() || undefined,
      email:         email.value.trim(),
      password:      password.value,
      hCaptchaToken: hcaptchaToken.value,
    })
    success.value = true
    setTimeout(() => router.push({ name: 'login' }), 2500)
  } catch (err: unknown) {
    hcaptchaRef.value?.reset()
    hcaptchaToken.value = ''
    hasError.value = true
    if (err instanceof Error) {
      const e = err as Error & { status?: number }
      if (e.status === 409)      errorMessage.value = e.message || 'El CI o email ya está registrado.'
      else if (e.status === 400) errorMessage.value = e.message || 'Los datos ingresados no son válidos.'
      else if (!e.status)        errorMessage.value = 'No se pudo conectar con el servidor. Verificá tu conexión.'
      else                       errorMessage.value = 'Ocurrió un error inesperado. Intentá más tarde.'
    } else {
      errorMessage.value = 'Ocurrió un error inesperado. Intentá más tarde.'
    }
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <main
    class="min-h-screen flex flex-col md:flex-row"
    style="font-family: 'Manrope', system-ui, sans-serif; background-color: #F7F9FE; color: #181C20;"
  >
    <!-- ── LEFT PANEL ── -->
    <section
      class="hidden md:flex md:w-[55%] relative overflow-hidden items-center justify-center"
      style="background-color: #1E40AF;"
    >
      <div class="absolute inset-0 z-0">
        <img
          src="https://lh3.googleusercontent.com/aida-public/AB6AXuCB316X6IevMlGCue86yPBEHEtWRntvBzkXBlUqImB4RKgBaS2T9139462GjkuVAQjtmTJEGZkyd7N81l5Wq09m9vTDSS6YAKqWKquTlepD5qqjabt_hvhR2jjTz_VLg15HM_lX8RrqhWOQO70O3CVHt3q_Ci8DG1qF-ev67n9zA7mRn6v9auHmg9DqK-iBx8ATd1UHET5_ko3LskskKQeG9xt1_Ut46H1aOOHZfu9f2ehzY3DLaWTG1h9V1UgB3HGEb0raHHIeyw"
          alt=""
          class="w-full h-full object-cover"
          style="opacity: 0.6; mix-blend-mode: overlay;"
        />
        <div
          class="absolute inset-0"
          style="background: linear-gradient(to top right, #00288E, transparent); opacity: 0.8;"
        ></div>
      </div>

      <div
        class="absolute bottom-[-10%] right-[-10%] w-96 h-96 rounded-full pointer-events-none z-0"
        style="border: 1px solid rgba(255,255,255,0.1);"
      ></div>
      <div
        class="absolute bottom-[-5%] right-[-5%] w-64 h-64 rounded-full pointer-events-none z-0"
        style="border: 1px solid rgba(255,255,255,0.18);"
      ></div>

      <div class="relative z-10 p-12 lg:p-24 max-w-2xl w-full">
        <div class="mb-14">
          <span
            class="inline-block px-4 py-1.5 rounded-full text-[10px] font-bold tracking-[0.2em] uppercase mb-8"
            style="background-color: #B7EAFF; color: #001F28;"
          >Portal de Pacientes</span>

          <h1
            class="text-5xl lg:text-7xl font-extrabold text-white leading-tight tracking-tighter"
            style="font-family: 'Plus Jakarta Sans', system-ui, sans-serif;"
          >
            Tu salud visual, en tus
            <span style="color: #76DCFF;"> manos.</span>
          </h1>
        </div>

        <div class="grid grid-cols-2 gap-8">
          <div class="space-y-2">
            <p class="text-xs uppercase tracking-widest font-bold" style="color: rgba(255,255,255,0.5);">Acceso</p>
            <p class="text-white text-base font-medium leading-snug">
              Gestioná tus turnos desde cualquier lugar.
            </p>
          </div>
          <div class="space-y-2">
            <p class="text-xs uppercase tracking-widest font-bold" style="color: rgba(255,255,255,0.5);">Seguimiento</p>
            <p class="text-white text-base font-medium leading-snug">
              Consultá tu historial de citas y recetas.
            </p>
          </div>
        </div>
      </div>
    </section>

    <!-- ── RIGHT PANEL ── -->
    <section
      class="flex-1 flex flex-col justify-center px-6 py-12 lg:px-24 relative"
      style="background-color: #F7F9FE;"
    >
      <!-- Mobile logo -->
      <div class="absolute top-8 left-8 md:hidden">
        <span
          class="text-2xl font-black tracking-tight"
          style="font-family: 'Plus Jakarta Sans', system-ui, sans-serif; color: #00288E;"
        >SIGA-Óptica</span>
      </div>

      <div class="max-w-md w-full mx-auto">
        <!-- Desktop brand -->
        <div class="mb-8 hidden md:block">
          <span
            class="text-3xl font-black tracking-tight"
            style="font-family: 'Plus Jakarta Sans', system-ui, sans-serif; color: #00288E;"
          >SIGA-Óptica</span>
        </div>

        <!-- ── SUCCESS STATE ── -->
        <div v-if="success" class="text-center py-8">
          <div
            class="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6"
            style="background-color: #D1FAE5;"
          >
            <span class="material-symbols-outlined" style="color: #065F46; font-size: 32px;">check_circle</span>
          </div>
          <h3
            class="text-2xl font-bold mb-3"
            style="font-family: 'Plus Jakarta Sans', system-ui, sans-serif; color: #181C20;"
          >¡Cuenta creada exitosamente!</h3>
          <p class="font-medium mb-8" style="color: #444653;">
            Podés iniciar sesión con tu email y contraseña.<br />
            <span class="text-sm" style="color: #757684;">Redirigiendo al login...</span>
          </p>
          <RouterLink
            to="/login"
            class="inline-flex items-center gap-2 h-14 px-8 rounded-full font-bold text-lg transition-all"
            style="background-color: #00288E; color: white; box-shadow: 0 8px 24px rgba(0,40,142,0.25);"
          >
            Iniciar sesión
            <span class="material-symbols-outlined" style="font-size: 22px;">arrow_forward</span>
          </RouterLink>
        </div>

        <!-- ── FORM ── -->
        <template v-else>
          <div class="mb-8">
            <h2
              class="text-3xl font-bold mb-3 leading-snug"
              style="font-family: 'Plus Jakarta Sans', system-ui, sans-serif; color: #181C20;"
            >Crear cuenta</h2>
            <p class="font-medium" style="color: #444653;">
              Registrate para gestionar tus turnos en SIGA-Óptica.
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
              class="flex items-center gap-2.5 rounded-2xl px-4 py-3 mb-6 text-sm font-medium"
              style="background-color: #FFDAD6; color: #93000A;"
            >
              <span class="material-symbols-outlined flex-shrink-0" style="width:18px;height:18px;font-size:18px;">error</span>
              {{ errorMessage }}
            </div>
          </Transition>

          <form @submit.prevent="handleSubmit" class="space-y-5" novalidate>

            <!-- Nombre / Apellido -->
            <div class="grid grid-cols-2 gap-4">
              <!-- Nombre -->
              <div class="relative">
                <label
                  class="absolute -top-2.5 left-4 px-1 text-xs font-semibold z-10"
                  :style="`background-color: #F7F9FE; color: ${hasError && !firstName ? '#93000A' : '#757684'};`"
                >Nombre</label>
                <div
                  class="flex items-center gap-2 px-3 py-3.5 rounded-2xl"
                  :style="`background-color: #ffffff; border: 1px solid ${hasError && !firstName ? '#BA1A1A' : '#C4C5D5'};`"
                >
                  <span class="material-symbols-outlined flex-shrink-0" style="color: #757684; width:18px;height:18px;font-size:18px;">person</span>
                  <input
                    v-model="firstName"
                    type="text"
                    placeholder="Juan"
                    autocomplete="given-name"
                    class="block w-full bg-transparent text-sm outline-none placeholder-[#C4C5D5]"
                    style="border: none; color: #181C20;"
                    @focus="($event.target as HTMLElement).closest('.relative')?.querySelector('label')?.setAttribute('style', 'background-color: #F7F9FE; color: #00288E; z-index:10;')"
                    @blur="($event.target as HTMLElement).closest('.relative')?.querySelector('label')?.setAttribute('style', 'background-color: #F7F9FE; color: #757684; z-index:10;')"
                  />
                </div>
              </div>

              <!-- Apellido -->
              <div class="relative">
                <label
                  class="absolute -top-2.5 left-4 px-1 text-xs font-semibold z-10"
                  :style="`background-color: #F7F9FE; color: ${hasError && !lastName ? '#93000A' : '#757684'};`"
                >Apellido</label>
                <div
                  class="flex items-center gap-2 px-3 py-3.5 rounded-2xl"
                  :style="`background-color: #ffffff; border: 1px solid ${hasError && !lastName ? '#BA1A1A' : '#C4C5D5'};`"
                >
                  <span class="material-symbols-outlined flex-shrink-0" style="color: #757684; width:18px;height:18px;font-size:18px;">person</span>
                  <input
                    v-model="lastName"
                    type="text"
                    placeholder="Pérez"
                    autocomplete="family-name"
                    class="block w-full bg-transparent text-sm outline-none placeholder-[#C4C5D5]"
                    style="border: none; color: #181C20;"
                    @focus="($event.target as HTMLElement).closest('.relative')?.querySelector('label')?.setAttribute('style', 'background-color: #F7F9FE; color: #00288E; z-index:10;')"
                    @blur="($event.target as HTMLElement).closest('.relative')?.querySelector('label')?.setAttribute('style', 'background-color: #F7F9FE; color: #757684; z-index:10;')"
                  />
                </div>
              </div>
            </div>

            <!-- CI / Fecha nacimiento -->
            <div class="grid grid-cols-2 gap-4">
              <!-- CI -->
              <div class="relative">
                <label
                  class="absolute -top-2.5 left-4 px-1 text-xs font-semibold z-10"
                  :style="`background-color: #F7F9FE; color: ${hasError && !ci ? '#93000A' : '#757684'};`"
                >Cédula (CI)</label>
                <div
                  class="flex items-center gap-2 px-3 py-3.5 rounded-2xl"
                  :style="`background-color: #ffffff; border: 1px solid ${hasError && !ci ? '#BA1A1A' : '#C4C5D5'};`"
                >
                  <span class="material-symbols-outlined flex-shrink-0" style="color: #757684; width:18px;height:18px;font-size:18px;">badge</span>
                  <input
                    v-model="ci"
                    type="text"
                    placeholder="12345678"
                    class="block w-full bg-transparent text-sm outline-none placeholder-[#C4C5D5]"
                    style="border: none; color: #181C20;"
                    @focus="($event.target as HTMLElement).closest('.relative')?.querySelector('label')?.setAttribute('style', 'background-color: #F7F9FE; color: #00288E; z-index:10;')"
                    @blur="($event.target as HTMLElement).closest('.relative')?.querySelector('label')?.setAttribute('style', 'background-color: #F7F9FE; color: #757684; z-index:10;')"
                  />
                </div>
              </div>

              <!-- Fecha nacimiento -->
              <div class="relative">
                <label
                  class="absolute -top-2.5 left-4 px-1 text-xs font-semibold z-10"
                  :style="`background-color: #F7F9FE; color: ${hasError && !birthDate ? '#93000A' : '#757684'};`"
                >Nacimiento</label>
                <div
                  class="flex items-center gap-2 px-3 py-3.5 rounded-2xl"
                  :style="`background-color: #ffffff; border: 1px solid ${hasError && !birthDate ? '#BA1A1A' : '#C4C5D5'};`"
                >
                  <span class="material-symbols-outlined flex-shrink-0" style="color: #757684; width:18px;height:18px;font-size:18px;">calendar_today</span>
                  <input
                    v-model="birthDate"
                    type="date"
                    :max="today"
                    class="block w-full bg-transparent text-sm outline-none"
                    style="border: none; color: #181C20;"
                    @focus="($event.target as HTMLElement).closest('.relative')?.querySelector('label')?.setAttribute('style', 'background-color: #F7F9FE; color: #00288E; z-index:10;')"
                    @blur="($event.target as HTMLElement).closest('.relative')?.querySelector('label')?.setAttribute('style', 'background-color: #F7F9FE; color: #757684; z-index:10;')"
                  />
                </div>
              </div>
            </div>

            <!-- Teléfono -->
            <div class="relative">
              <label
                class="absolute -top-2.5 left-4 px-1 text-xs font-semibold z-10"
                style="background-color: #F7F9FE; color: #757684;"
              >Teléfono <span class="font-normal" style="color: #C4C5D5;">(opcional)</span></label>
              <div
                class="flex items-center gap-3 px-4 py-3.5 rounded-2xl"
                style="background-color: #ffffff; border: 1px solid #C4C5D5;"
              >
                <span class="material-symbols-outlined flex-shrink-0" style="color: #757684; width:20px;height:20px;font-size:20px;">phone</span>
                <input
                  v-model="phoneNumber"
                  type="tel"
                  placeholder="099 123 456"
                  autocomplete="tel"
                  class="block w-full bg-transparent text-base outline-none placeholder-[#C4C5D5]"
                  style="border: none; color: #181C20;"
                  @focus="($event.target as HTMLElement).closest('.relative')?.querySelector('label')?.setAttribute('style', 'background-color: #F7F9FE; color: #00288E; z-index:10;')"
                  @blur="($event.target as HTMLElement).closest('.relative')?.querySelector('label')?.setAttribute('style', 'background-color: #F7F9FE; color: #757684; z-index:10;')"
                />
              </div>
            </div>

            <!-- Email -->
            <div class="relative">
              <label
                class="absolute -top-2.5 left-4 px-1 text-xs font-semibold z-10"
                :style="`background-color: #F7F9FE; color: ${hasError && !email ? '#93000A' : '#757684'};`"
              >Correo electrónico</label>
              <div
                class="flex items-center gap-3 px-4 py-3.5 rounded-2xl"
                :style="`background-color: #ffffff; border: 1px solid ${hasError && !email ? '#BA1A1A' : '#C4C5D5'};`"
              >
                <span class="material-symbols-outlined flex-shrink-0" style="color: #757684; width:20px;height:20px;font-size:20px;">alternate_email</span>
                <input
                  v-model="email"
                  type="email"
                  placeholder="juan@ejemplo.com"
                  autocomplete="email"
                  class="block w-full bg-transparent text-base outline-none placeholder-[#C4C5D5]"
                  style="border: none; color: #181C20;"
                  @focus="($event.target as HTMLElement).closest('.relative')?.querySelector('label')?.setAttribute('style', 'background-color: #F7F9FE; color: #00288E; z-index:10;')"
                  @blur="($event.target as HTMLElement).closest('.relative')?.querySelector('label')?.setAttribute('style', 'background-color: #F7F9FE; color: #757684; z-index:10;')"
                />
              </div>
            </div>

            <!-- Contraseña -->
            <div class="relative">
              <label
                class="absolute -top-2.5 left-4 px-1 text-xs font-semibold z-10"
                :style="`background-color: #F7F9FE; color: ${hasError && !password ? '#93000A' : '#757684'};`"
              >Contraseña</label>
              <div
                class="flex items-center gap-3 px-4 py-3.5 rounded-2xl"
                :style="`background-color: #ffffff; border: 1px solid ${hasError && !password ? '#BA1A1A' : '#C4C5D5'};`"
              >
                <span class="material-symbols-outlined flex-shrink-0" style="color: #757684; width:20px;height:20px;font-size:20px;">lock</span>
                <input
                  v-model="password"
                  :type="showPassword ? 'text' : 'password'"
                  placeholder="Mínimo 8 caracteres"
                  autocomplete="new-password"
                  class="block w-full bg-transparent text-base outline-none flex-1 placeholder-[#C4C5D5]"
                  style="border: none; color: #181C20;"
                />
                <button
                  type="button"
                  @click="showPassword = !showPassword"
                  class="flex-shrink-0 transition-colors"
                  style="color: #C4C5D5;"
                  :aria-label="showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'"
                >
                  <span class="material-symbols-outlined" style="width:20px;height:20px;font-size:20px;">
                    {{ showPassword ? 'visibility_off' : 'visibility' }}
                  </span>
                </button>
              </div>
            </div>

            <!-- Confirmar contraseña -->
            <div class="relative">
              <label
                class="absolute -top-2.5 left-4 px-1 text-xs font-semibold z-10"
                :style="`background-color: #F7F9FE; color: ${hasError && password !== confirmPassword ? '#93000A' : '#757684'};`"
              >Confirmar contraseña</label>
              <div
                class="flex items-center gap-3 px-4 py-3.5 rounded-2xl"
                :style="`background-color: #ffffff; border: 1px solid ${hasError && password !== confirmPassword ? '#BA1A1A' : '#C4C5D5'};`"
              >
                <span class="material-symbols-outlined flex-shrink-0" style="color: #757684; width:20px;height:20px;font-size:20px;">lock</span>
                <input
                  v-model="confirmPassword"
                  :type="showConfirmPwd ? 'text' : 'password'"
                  placeholder="Repetí tu contraseña"
                  autocomplete="new-password"
                  class="block w-full bg-transparent text-base outline-none flex-1 placeholder-[#C4C5D5]"
                  style="border: none; color: #181C20;"
                />
                <button
                  type="button"
                  @click="showConfirmPwd = !showConfirmPwd"
                  class="flex-shrink-0 transition-colors"
                  style="color: #C4C5D5;"
                  :aria-label="showConfirmPwd ? 'Ocultar contraseña' : 'Mostrar contraseña'"
                >
                  <span class="material-symbols-outlined" style="width:20px;height:20px;font-size:20px;">
                    {{ showConfirmPwd ? 'visibility_off' : 'visibility' }}
                  </span>
                </button>
              </div>
            </div>

            <!-- hCaptcha -->
            <div class="flex justify-center pt-1">
              <VueHcaptcha
                ref="hcaptchaRef"
                :sitekey="siteKey"
                @verify="onCaptchaVerify"
                @expired="onCaptchaExpire"
                @error="onCaptchaExpire"
              />
            </div>

            <!-- Submit -->
            <div class="pt-2">
              <button
                type="submit"
                :disabled="isLoading"
                class="w-full h-14 rounded-full font-bold text-lg flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-75 disabled:cursor-not-allowed"
                style="background-color: #00288E; color: white; box-shadow: 0 8px 24px rgba(0,40,142,0.25);"
              >
                <svg
                  v-if="isLoading"
                  class="animate-spin w-5 h-5 text-white flex-shrink-0"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <span>{{ isLoading ? 'Creando cuenta...' : 'Crear cuenta' }}</span>
                <span
                  v-if="!isLoading"
                  class="material-symbols-outlined"
                  style="width:22px;height:22px;font-size:22px;"
                >arrow_forward</span>
              </button>
            </div>
          </form>

          <!-- Link to login -->
          <div class="mt-8 text-center">
            <p class="text-sm font-medium" style="color: #444653;">
              ¿Ya tenés cuenta?
              <RouterLink
                to="/login"
                class="font-bold ml-1 hover:underline underline-offset-2 transition-colors"
                style="color: #00288E;"
              >Iniciá sesión</RouterLink>
            </p>
          </div>
        </template>
      </div>

      <!-- Footer -->
      <footer
        class="absolute bottom-8 left-0 right-0 px-12 flex justify-between items-center text-[10px] font-bold uppercase tracking-widest"
        style="color: #C4C5D5;"
      >
        <span>© 2024 SIGA-Óptica</span>
        <div class="flex gap-6">
          <a href="#" class="hover:text-[#00288E] transition-colors">Privacidad</a>
          <a href="#" class="hover:text-[#00288E] transition-colors">Términos</a>
        </div>
      </footer>
    </section>
  </main>
</template>
