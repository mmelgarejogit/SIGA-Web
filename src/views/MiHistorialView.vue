<script setup lang="ts">
import { ref, onMounted } from "vue"
import AppSidebar from "@/components/AppSidebar.vue"
import AppHeader from "@/components/AppHeader.vue"
import { type ConsultaClinica, getMisConsultas } from "@/services/clinicaService"

const consultas = ref<ConsultaClinica[]>([])
const isLoading = ref(false)
const loadError = ref("")

function formatFechaHora(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString("es-AR", { day: "numeric", month: "long", year: "numeric" })
}

async function load() {
  isLoading.value = true
  loadError.value = ""
  try {
    consultas.value = await getMisConsultas()
  } catch (err: unknown) {
    loadError.value = err instanceof Error ? err.message : "Error al cargar el historial."
  } finally {
    isLoading.value = false
  }
}

onMounted(load)
</script>

<template>
  <div class="min-h-screen" style="background-color: var(--color-surface)">
    <AppSidebar />
    <AppHeader />

    <main style="margin-left: var(--sidebar-width); transition: margin-left 0.25s ease; padding-top: 64px">
      <div class="p-4 sm:p-6 lg:p-8">
        <!-- Header -->
        <div class="mb-8">
          <h1 class="text-4xl font-extrabold tracking-tight mb-2">Mi Historial Clínico</h1>
          <p class="font-medium" style="color: var(--color-on-surface-variant)">
            El registro de tus consultas y diagnósticos.
          </p>
        </div>

        <!-- Loading -->
        <div v-if="isLoading" class="flex justify-center py-24">
          <svg class="animate-spin w-8 h-8" style="color: var(--color-primary)" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>

        <!-- Error -->
        <div
          v-else-if="loadError"
          class="flex items-center gap-2.5 rounded-2xl px-4 py-3 text-sm font-medium"
          style="background-color: var(--color-error-container); color: var(--color-on-error-container)"
        >
          <span class="material-symbols-outlined" style="font-size: 18px">error</span>
          {{ loadError }}
        </div>

        <!-- Empty -->
        <div
          v-else-if="consultas.length === 0"
          class="flex flex-col items-center justify-center text-center rounded-2xl py-20 px-6"
          style="
            background-color: var(--color-surface-container-lowest);
            box-shadow: var(--shadow-sm);
            outline: 1px solid var(--color-hairline);
          "
        >
          <span class="material-symbols-outlined mb-3" style="font-size: 40px; color: var(--color-outline)">
            clinical_notes
          </span>
          <p class="text-sm font-medium" style="color: var(--color-on-surface-variant)">
            Todavía no tenés consultas registradas.
          </p>
        </div>

        <!-- Lista de consultas -->
        <div v-else class="flex flex-col gap-5">
          <article
            v-for="c in consultas"
            :key="c.id"
            class="rounded-2xl p-6"
            style="
              background-color: var(--color-surface-container-lowest);
              box-shadow: var(--shadow-sm);
              outline: 1px solid var(--color-hairline);
            "
          >
            <!-- Cabecera -->
            <div class="flex flex-wrap items-start justify-between gap-3 mb-4">
              <div class="flex items-center gap-2">
                <span
                  class="material-symbols-outlined inline-flex items-center justify-center flex-shrink-0 leading-none"
                  style="color: var(--color-primary); font-size: 20px; width: 20px; height: 20px"
                >
                  stethoscope
                </span>
                <div class="flex flex-col">
                  <span class="text-sm font-bold" style="color: var(--color-on-surface)">
                    {{ formatFechaHora(c.fechaConsulta) }}
                  </span>
                  <span class="text-xs font-medium" style="color: var(--color-on-surface-variant)">
                    Dr/a. {{ c.professionalFirstName }} {{ c.professionalLastName }}
                  </span>
                </div>
              </div>
              <span
                v-if="c.receta"
                class="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold"
                style="background-color: var(--color-secondary-container); color: var(--color-primary)"
              >
                <span class="material-symbols-outlined" style="font-size: 12px">prescriptions</span>
                Receta emitida
              </span>
            </div>

            <!-- Detalle -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
              <div class="flex flex-col gap-1">
                <span class="text-xs font-bold uppercase tracking-wider" style="color: var(--color-outline)">
                  Motivo
                </span>
                <span class="text-sm" style="color: var(--color-on-surface)">{{ c.motivo || "—" }}</span>
              </div>
              <div class="flex flex-col gap-1">
                <span class="text-xs font-bold uppercase tracking-wider" style="color: var(--color-outline)">
                  Diagnóstico
                </span>
                <span class="text-sm" style="color: var(--color-on-surface)">
                  {{ c.diagnosticoPrincipal || "—" }}
                  <template v-if="c.diagnosticoSecundario"> · {{ c.diagnosticoSecundario }}</template>
                </span>
              </div>
              <div v-if="c.planTratamiento" class="flex flex-col gap-1">
                <span class="text-xs font-bold uppercase tracking-wider" style="color: var(--color-outline)">
                  Plan de tratamiento
                </span>
                <span class="text-sm" style="color: var(--color-on-surface)">{{ c.planTratamiento }}</span>
              </div>
              <div v-if="c.observaciones" class="flex flex-col gap-1">
                <span class="text-xs font-bold uppercase tracking-wider" style="color: var(--color-outline)">
                  Observaciones
                </span>
                <span class="text-sm" style="color: var(--color-on-surface)">{{ c.observaciones }}</span>
              </div>
            </div>
          </article>
        </div>
      </div>
    </main>
  </div>
</template>
