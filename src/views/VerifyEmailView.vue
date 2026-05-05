<script setup lang="ts">
import { ref, onMounted } from "vue"
import { useRoute } from "vue-router"
import { verifyEmail } from "@/services/authService"
import BaseButton from "@/components/BaseButton.vue"

const route = useRoute()
const status = ref<"loading" | "success" | "error">("loading")
const errorMsg = ref("")

onMounted(async () => {
  const token = route.query.token as string | undefined

  if (!token) {
    errorMsg.value = "El enlace de verificación no es válido."
    status.value = "error"
    return
  }

  try {
    await verifyEmail(token)
    status.value = "success"
  } catch (err: unknown) {
    if (err instanceof Error) {
      const e = err as Error & { status?: number }
      errorMsg.value =
        e.status === 404
          ? "El enlace no es válido o ya fue utilizado."
          : e.message || "Ocurrió un error. Intentá de nuevo."
    } else {
      errorMsg.value = "Ocurrió un error inesperado."
    }
    status.value = "error"
  }
})
</script>

<template>
  <main
    class="min-h-screen flex items-center justify-center px-4"
    style="background-color: var(--color-surface)"
  >
    <div
      class="w-full max-w-md bg-white rounded-2xl p-12 text-center"
      style="box-shadow: 0 4px 32px rgba(0, 0, 0, 0.06)"
    >
      <!-- Brand -->
      <p class="text-2xl font-black tracking-tight mb-10" style="color: var(--color-primary)">
        SIGA-Óptica
      </p>

      <!-- Loading -->
      <div v-if="status === 'loading'" class="flex flex-col items-center gap-4">
        <svg
          class="animate-spin w-10 h-10"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            class="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="var(--color-primary)"
            stroke-width="4"
          />
          <path
            class="opacity-75"
            fill="var(--color-primary)"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
        <p class="font-medium" style="color: var(--color-on-surface-variant)">
          Verificando tu email...
        </p>
      </div>

      <!-- Success -->
      <div v-else-if="status === 'success'" class="flex flex-col items-center gap-4">
        <div
          class="w-16 h-16 rounded-full flex items-center justify-center"
          style="background-color: #d1fae5"
        >
          <span class="material-symbols-outlined" style="color: #065f46; font-size: 32px"
            >check_circle</span
          >
        </div>
        <h2 class="text-2xl font-bold" style="color: var(--color-on-surface)">
          ¡Email verificado!
        </h2>
        <p class="font-medium" style="color: var(--color-on-surface-variant)">
          Tu cuenta está activa. Ya podés iniciar sesión.
        </p>
        <RouterLink
          to="/login"
          class="mt-4 inline-flex items-center gap-2 h-12 px-8 rounded-full font-bold transition-all active:scale-[0.98]"
          style="
            background-color: var(--color-primary);
            color: white;
            box-shadow: 0 8px 24px rgba(0, 40, 142, 0.2);
          "
        >
          Iniciar sesión
          <span class="material-symbols-outlined" style="font-size: 20px">arrow_forward</span>
        </RouterLink>
      </div>

      <!-- Error -->
      <div v-else class="flex flex-col items-center gap-4">
        <div
          class="w-16 h-16 rounded-full flex items-center justify-center"
          style="background-color: var(--color-error-container)"
        >
          <span
            class="material-symbols-outlined"
            style="color: var(--color-on-error-container); font-size: 32px"
            >error</span
          >
        </div>
        <h2 class="text-2xl font-bold" style="color: var(--color-on-surface)">
          No se pudo verificar
        </h2>
        <p class="font-medium" style="color: var(--color-on-surface-variant)">{{ errorMsg }}</p>
        <RouterLink
          to="/login"
          class="mt-4 inline-flex items-center gap-2 h-12 px-8 rounded-full font-bold transition-all"
          style="
            border: 1.5px solid var(--color-outline-variant);
            color: var(--color-primary);
            background: white;
          "
        >
          Volver al login
        </RouterLink>
      </div>
    </div>
  </main>
</template>
