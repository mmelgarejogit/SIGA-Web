<script setup lang="ts">
import { ref } from 'vue'

const email = ref('')
const password = ref('')
const showPassword = ref(false)
const isLoading = ref(false)
const hasError = ref(false)

async function handleSubmit() {
  if (!email.value || !password.value) return
  hasError.value = false
  isLoading.value = true
  await new Promise((r) => setTimeout(r, 1800))
  isLoading.value = false
  hasError.value = true
}
</script>

<template>
  <main
    class="min-h-screen flex flex-col md:flex-row overflow-hidden"
    style="font-family: 'Manrope', system-ui, sans-serif; background-color: #F7F9FE; color: #181C20;"
  >
    <!-- ── LEFT PANEL ── -->
    <section
      class="hidden md:flex md:w-[55%] relative overflow-hidden items-center justify-center"
      style="background-color: #1E40AF;"
    >
      <!-- Background image (eyeglasses on marble, mix-blend-overlay) -->
      <div class="absolute inset-0 z-0">
        <img
          src="https://lh3.googleusercontent.com/aida-public/AB6AXuCB316X6IevMlGCue86yPBEHEtWRntvBzkXBlUqImB4RKgBaS2T9139462GjkuVAQjtmTJEGZkyd7N81l5Wq09m9vTDSS6YAKqWKquTlepD5qqjabt_hvhR2jjTz_VLg15HM_lX8RrqhWOQO70O3CVHt3q_Ci8DG1qF-ev67n9zA7mRn6v9auHmg9DqK-iBx8ATd1UHET5_ko3LskskKQeG9xt1_Ut46H1aOOHZfu9f2ehzY3DLaWTG1h9V1UgB3HGEb0raHHIeyw"
          alt=""
          class="w-full h-full object-cover"
          style="opacity: 0.6; mix-blend-mode: overlay;"
        />
        <!-- gradient overlay: from-primary (bottom-left) to transparent -->
        <div
          class="absolute inset-0"
          style="background: linear-gradient(to top right, #00288E, transparent); opacity: 0.8;"
        ></div>
      </div>

      <!-- Lens circles decoration -->
      <div
        class="absolute bottom-[-10%] right-[-10%] w-96 h-96 rounded-full pointer-events-none z-0"
        style="border: 1px solid rgba(255,255,255,0.1);"
      ></div>
      <div
        class="absolute bottom-[-5%] right-[-5%] w-64 h-64 rounded-full pointer-events-none z-0"
        style="border: 1px solid rgba(255,255,255,0.18);"
      ></div>

      <!-- Content -->
      <div class="relative z-10 p-12 lg:p-24 max-w-2xl w-full">
        <div class="mb-14">
          <span
            class="inline-block px-4 py-1.5 rounded-full text-[10px] font-bold tracking-[0.2em] uppercase mb-8"
            style="background-color: #B7EAFF; color: #001F28;"
          >Precisión Óptica</span>

          <h1
            class="text-5xl lg:text-7xl font-extrabold text-white leading-tight tracking-tighter"
            style="font-family: 'Plus Jakarta Sans', system-ui, sans-serif;"
          >
            La visión del futuro comienza
            <span style="color: #76DCFF;"> aquí.</span>
          </h1>
        </div>

        <div class="grid grid-cols-2 gap-8">
          <div class="space-y-2">
            <p
              class="text-xs uppercase tracking-widest font-bold"
              style="color: rgba(255,255,255,0.5);"
            >Tecnología</p>
            <p class="text-white text-base font-medium leading-snug">
              Gestión clínica integrada con precisión absoluta.
            </p>
          </div>
          <div class="space-y-2">
            <p
              class="text-xs uppercase tracking-widest font-bold"
              style="color: rgba(255,255,255,0.5);"
            >Confianza</p>
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
        <div class="mb-10 hidden md:block">
          <span
            class="text-3xl font-black tracking-tight"
            style="font-family: 'Plus Jakarta Sans', system-ui, sans-serif; color: #00288E;"
          >SIGA-Óptica</span>
        </div>

        <!-- Headline -->
        <div class="mb-12">
          <h2
            class="text-3xl font-bold mb-3 leading-snug"
            style="font-family: 'Plus Jakarta Sans', system-ui, sans-serif; color: #181C20;"
          >
            Bienvenido de nuevo a SIGA-Óptica
          </h2>
          <p class="font-medium" style="color: #444653;">
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
            style="background-color: #FFDAD6; color: #93000A;"
          >
            <span class="material-symbols-outlined flex-shrink-0" style="width:18px;height:18px;font-size:18px;">error</span>
            Credenciales incorrectas. Intentá de nuevo.
          </div>
        </Transition>

        <form @submit.prevent="handleSubmit" class="space-y-8" novalidate>
          <!-- Email floating label field -->
          <div class="relative group">
            <label
              for="email"
              class="absolute -top-2.5 left-4 px-1 text-xs font-semibold transition-colors z-10"
              :style="`background-color: #F7F9FE; color: ${hasError ? '#93000A' : 'var(--label-color, #757684)'};`"
            >Usuario o Correo electrónico</label>
            <div
              class="flex items-center gap-3 px-4 py-4 rounded-2xl transition-all"
              :style="`
                background-color: #ffffff;
                border: 1px solid ${hasError ? '#BA1A1A' : '#C4C5D5'};
                box-shadow: none;
              `"
            >
              <span
                class="material-symbols-outlined flex-shrink-0"
                style="color: #757684; width:20px;height:20px;font-size:20px;"
              >person</span>
              <input
                id="email"
                v-model="email"
                type="email"
                placeholder="nombre@sigaoptica.com"
                autocomplete="email"
                class="block w-full bg-transparent text-base outline-none placeholder-[#C4C5D5]"
                style="border: none; color: #181C20; font-family: 'Manrope', system-ui, sans-serif;"
                @focus="($event.target as HTMLElement).closest('.relative')?.querySelector('label')?.setAttribute('style', `background-color: #F7F9FE; color: #00288E; z-index:10;`)"
                @blur="($event.target as HTMLElement).closest('.relative')?.querySelector('label')?.setAttribute('style', `background-color: #F7F9FE; color: #757684; z-index:10;`)"
              />
            </div>
          </div>

          <!-- Password floating label field -->
          <div class="space-y-2">
            <div class="relative group">
              <label
                for="password"
                class="absolute -top-2.5 left-4 px-1 text-xs font-semibold transition-colors z-10"
                :style="`background-color: #F7F9FE; color: ${hasError ? '#93000A' : '#757684'};`"
              >Contraseña</label>
              <div
                class="flex items-center gap-3 px-4 py-4 rounded-2xl transition-all"
                :style="`
                  background-color: #ffffff;
                  border: 1px solid ${hasError ? '#BA1A1A' : '#C4C5D5'};
                `"
              >
                <span
                  class="material-symbols-outlined flex-shrink-0"
                  style="color: #757684; width:20px;height:20px;font-size:20px;"
                >lock</span>
                <input
                  id="password"
                  v-model="password"
                  :type="showPassword ? 'text' : 'password'"
                  placeholder="••••••••"
                  autocomplete="current-password"
                  class="block w-full bg-transparent text-base outline-none flex-1 placeholder-[#C4C5D5]"
                  style="border: none; color: #181C20; font-family: 'Manrope', system-ui, sans-serif;"
                />
                <button
                  type="button"
                  @click="showPassword = !showPassword"
                  class="flex-shrink-0 transition-colors"
                  style="color: #C4C5D5;"
                  :aria-label="showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'"
                >
                  <span
                    class="material-symbols-outlined"
                    style="width:20px;height:20px;font-size:20px;"
                  >{{ showPassword ? 'visibility_off' : 'visibility' }}</span>
                </button>
              </div>
            </div>

            <div class="flex justify-end pt-1">
              <button
                type="button"
                class="text-sm font-bold transition-colors"
                style="color: #00288E;"
              >¿Olvidó su contraseña?</button>
            </div>
          </div>

          <!-- Submit -->
          <div class="pt-4">
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
              <span>{{ isLoading ? 'Verificando...' : 'Iniciar Sesión' }}</span>
              <span
                v-if="!isLoading"
                class="material-symbols-outlined"
                style="width:22px;height:22px;font-size:22px;"
              >arrow_forward</span>
            </button>
          </div>
        </form>

        <!-- Divider + alternatives -->
        <div class="mt-12 flex flex-col items-center gap-6">
          <div class="w-full flex items-center gap-4">
            <div class="flex-1 h-px" style="background-color: rgba(196,197,213,0.35);"></div>
            <span
              class="text-xs font-bold uppercase tracking-widest"
              style="color: #C4C5D5;"
            >o iniciar sesión con</span>
            <div class="flex-1 h-px" style="background-color: rgba(196,197,213,0.35);"></div>
          </div>

          <!-- Google button -->
          <button
            type="button"
            class="w-full h-12 rounded-full flex items-center justify-center gap-3 font-semibold transition-colors"
            style="border: 1px solid #C4C5D5; background-color: white; color: #444653;"
          >
            <svg class="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            <span>Entrar con Google</span>
          </button>

          <p class="text-sm font-medium" style="color: #444653;">
            ¿Necesita acceso?
            <button
              type="button"
              class="font-bold ml-1 hover:underline underline-offset-2 transition-colors"
              style="color: #00288E;"
            >Contactar Soporte</button>
          </p>
        </div>
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
