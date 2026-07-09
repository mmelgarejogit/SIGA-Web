<script setup lang="ts">
import { ref, onMounted } from "vue"
import { useRoute } from "vue-router"
import { http } from "@/api/http"

type Estado = "loading" | "ok" | "error"

const route = useRoute()
const estado = ref<Estado>("loading")
const mensaje = ref("")

onMounted(async () => {
  const token = route.query.token as string | undefined
  if (!token) {
    estado.value = "error"
    mensaje.value = "El enlace de confirmación no es válido."
    return
  }

  try {
    await http.post(`/api/turnos/confirmar/${token}`)
    estado.value = "ok"
  } catch (err: unknown) {
    estado.value = "error"
    const axiosErr = err as { response?: { data?: { message?: string } } }
    mensaje.value = axiosErr.response?.data?.message ?? "No se pudo confirmar el turno."
  }
})
</script>

<template>
  <div
    class="min-h-screen flex items-center justify-center p-6"
    style="background-color: var(--color-surface)"
  >
    <div
      class="w-full max-w-md rounded-3xl overflow-hidden"
      style="background:var(--color-surface-container-lowest);box-shadow:var(--shadow-lg)"
    >
      <!-- Header -->
      <div style="background:var(--color-primary);padding:28px 40px">
        <p style="margin:0;color:var(--color-on-primary);font-size:22px;font-weight:900">
          SIGA Óptica
        </p>
      </div>

      <!-- Body -->
      <div class="p-10 flex flex-col items-center text-center">

        <!-- Loading -->
        <template v-if="estado === 'loading'">
          <svg class="animate-spin w-12 h-12 mb-6" fill="none" viewBox="0 0 24 24" style="color:var(--color-primary)">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
          </svg>
          <p style="color:var(--color-on-surface-variant);font-size:15px">Confirmando tu turno…</p>
        </template>

        <!-- Éxito -->
        <template v-else-if="estado === 'ok'">
          <div
            class="w-16 h-16 rounded-full flex items-center justify-center mb-6"
            style="background-color:var(--color-success-container)"
          >
            <span class="material-symbols-outlined" style="font-size:32px;color:var(--color-on-success-container)">check_circle</span>
          </div>
          <h2 class="text-2xl font-extrabold mb-3" style="color:var(--color-on-surface)">
            ¡Turno confirmado!
          </h2>
          <p style="color:var(--color-outline);font-size:15px;line-height:1.6">
            Tu turno en SIGA Óptica ha sido confirmado exitosamente.<br>
            Te esperamos en la fecha y hora acordada.
          </p>
        </template>

        <!-- Error -->
        <template v-else>
          <div
            class="w-16 h-16 rounded-full flex items-center justify-center mb-6"
            style="background-color:var(--color-error-container)"
          >
            <span class="material-symbols-outlined" style="font-size:32px;color:var(--color-on-error-container)">error</span>
          </div>
          <h2 class="text-2xl font-extrabold mb-3" style="color:var(--color-on-surface)">
            No se pudo confirmar
          </h2>
          <p style="color:var(--color-outline);font-size:15px;line-height:1.6">
            {{ mensaje }}
          </p>
        </template>

        <p class="mt-8 text-xs" style="color:var(--color-outline)">
          SIGA Óptica — Sistema de Gestión
        </p>
      </div>
    </div>
  </div>
</template>
