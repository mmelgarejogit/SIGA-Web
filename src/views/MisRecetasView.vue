<script setup lang="ts">
import { ref, computed, onMounted } from "vue"
import AppSidebar from "@/components/AppSidebar.vue"
import AppHeader from "@/components/AppHeader.vue"
import { type ConsultaClinica, getMisConsultas, descargarMiRecetaPdf } from "@/services/clinicaService"

const consultas = ref<ConsultaClinica[]>([])
const isLoading = ref(false)
const loadError = ref("")

const downloadingId = ref<number | null>(null)
const downloadError = ref("")

// Solo las consultas que tienen una receta emitida.
const recetas = computed(() => consultas.value.filter((c) => c.receta))

function fmtDateOnly(dateStr: string): string {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString("es-AR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  })
}

function fmtDioptria(v?: number): string {
  if (v === null || v === undefined) return "—"
  return (v > 0 ? "+" : "") + v.toFixed(2)
}

function fmtEje(v?: number): string {
  return v === null || v === undefined ? "—" : `${v}°`
}

async function load() {
  isLoading.value = true
  loadError.value = ""
  try {
    consultas.value = await getMisConsultas()
  } catch (err: unknown) {
    loadError.value = err instanceof Error ? err.message : "Error al cargar las recetas."
  } finally {
    isLoading.value = false
  }
}

async function download(c: ConsultaClinica) {
  downloadingId.value = c.id
  downloadError.value = ""
  try {
    await descargarMiRecetaPdf(c.id, c.patientLastName)
  } catch (err: unknown) {
    downloadError.value = err instanceof Error ? err.message : "No se pudo descargar el PDF."
  } finally {
    downloadingId.value = null
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
          <h1 class="text-4xl font-extrabold tracking-tight mb-2">Mis Recetas</h1>
          <p class="font-medium" style="color: var(--color-on-surface-variant)">
            Tus prescripciones ópticas. Podés descargar el PDF de cada una.
          </p>
        </div>

        <!-- Error de descarga -->
        <div
          v-if="downloadError"
          class="flex items-center gap-2.5 rounded-2xl px-4 py-3 text-sm font-medium mb-6"
          style="background-color: var(--color-error-container); color: var(--color-on-error-container)"
        >
          <span class="material-symbols-outlined" style="font-size: 18px">error</span>
          {{ downloadError }}
        </div>

        <!-- Loading -->
        <div v-if="isLoading" class="flex justify-center py-24">
          <svg class="animate-spin w-8 h-8" style="color: var(--color-primary)" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>

        <!-- Error de carga -->
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
          v-else-if="recetas.length === 0"
          class="flex flex-col items-center justify-center text-center rounded-2xl py-20 px-6"
          style="
            background-color: var(--color-surface-container-lowest);
            box-shadow: var(--shadow-sm);
            outline: 1px solid var(--color-hairline);
          "
        >
          <span class="material-symbols-outlined mb-3" style="font-size: 40px; color: var(--color-outline)">
            prescriptions
          </span>
          <p class="text-sm font-medium" style="color: var(--color-on-surface-variant)">
            Todavía no tenés recetas emitidas.
          </p>
        </div>

        <!-- Lista de recetas -->
        <div v-else class="flex flex-col gap-5">
          <article
            v-for="c in recetas"
            :key="c.id"
            class="rounded-2xl p-6"
            style="
              background-color: var(--color-surface-container-lowest);
              box-shadow: var(--shadow-sm);
              outline: 1px solid var(--color-hairline);
            "
          >
            <!-- Cabecera -->
            <div class="flex flex-wrap items-start justify-between gap-3 mb-5">
              <div class="flex items-center gap-2">
                <span
                  class="material-symbols-outlined inline-flex items-center justify-center flex-shrink-0 leading-none"
                  style="color: var(--color-primary); font-size: 20px; width: 20px; height: 20px"
                >
                  prescriptions
                </span>
                <div class="flex flex-col">
                  <span class="text-sm font-bold" style="color: var(--color-on-surface)">
                    {{ fmtDateOnly(c.receta!.fechaEmision) }}
                  </span>
                  <span class="text-xs font-medium" style="color: var(--color-on-surface-variant)">
                    Dr/a. {{ c.professionalFirstName }} {{ c.professionalLastName }}
                  </span>
                </div>
              </div>
              <button
                class="inline-flex items-center gap-1.5 px-4 h-10 rounded-full text-sm font-bold transition-all hover:scale-105 active:scale-95 disabled:opacity-60"
                style="background-color: var(--color-surface-container-high); color: var(--color-on-surface-variant)"
                :disabled="downloadingId === c.id"
                title="Descargar PDF"
                @click="download(c)"
              >
                <svg v-if="downloadingId === c.id" class="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <span v-else class="material-symbols-outlined" style="font-size: 18px">download</span>
                PDF
              </button>
            </div>

            <!-- Tabla de prescripción -->
            <div class="overflow-x-auto">
              <table class="w-full min-w-[420px] text-sm">
                <thead>
                  <tr style="color: var(--color-outline)">
                    <th class="text-left font-bold uppercase tracking-wider text-xs py-2 pr-4"></th>
                    <th class="text-center font-bold uppercase tracking-wider text-xs py-2 px-3">Esférico</th>
                    <th class="text-center font-bold uppercase tracking-wider text-xs py-2 px-3">Cilindro</th>
                    <th class="text-center font-bold uppercase tracking-wider text-xs py-2 px-3">Eje</th>
                    <th class="text-center font-bold uppercase tracking-wider text-xs py-2 px-3">Adición</th>
                  </tr>
                </thead>
                <tbody style="color: var(--color-on-surface)">
                  <tr style="border-top: 1px solid var(--color-hairline-soft)">
                    <td class="font-bold py-2.5 pr-4">OD <span style="color: var(--color-outline)">(Derecho)</span></td>
                    <td class="text-center py-2.5 px-3">{{ fmtDioptria(c.receta!.odEsferico) }}</td>
                    <td class="text-center py-2.5 px-3">{{ fmtDioptria(c.receta!.odCilindro) }}</td>
                    <td class="text-center py-2.5 px-3">{{ fmtEje(c.receta!.odEje) }}</td>
                    <td class="text-center py-2.5 px-3">{{ fmtDioptria(c.receta!.odAdicion) }}</td>
                  </tr>
                  <tr style="border-top: 1px solid var(--color-hairline-soft)">
                    <td class="font-bold py-2.5 pr-4">OI <span style="color: var(--color-outline)">(Izquierdo)</span></td>
                    <td class="text-center py-2.5 px-3">{{ fmtDioptria(c.receta!.oiEsferico) }}</td>
                    <td class="text-center py-2.5 px-3">{{ fmtDioptria(c.receta!.oiCilindro) }}</td>
                    <td class="text-center py-2.5 px-3">{{ fmtEje(c.receta!.oiEje) }}</td>
                    <td class="text-center py-2.5 px-3">{{ fmtDioptria(c.receta!.oiAdicion) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- Datos extra -->
            <div class="flex flex-wrap gap-x-8 gap-y-2 mt-4">
              <div v-if="c.receta!.distanciaInterpupilar != null" class="flex items-center gap-1.5 text-sm">
                <span class="text-xs font-bold uppercase tracking-wider" style="color: var(--color-outline)">DIP</span>
                <span style="color: var(--color-on-surface)">{{ c.receta!.distanciaInterpupilar }} mm</span>
              </div>
              <div v-if="c.receta!.avSinCorreccion" class="flex items-center gap-1.5 text-sm">
                <span class="text-xs font-bold uppercase tracking-wider" style="color: var(--color-outline)">AV s/c</span>
                <span style="color: var(--color-on-surface)">{{ c.receta!.avSinCorreccion }}</span>
              </div>
              <div v-if="c.receta!.avConCorreccion" class="flex items-center gap-1.5 text-sm">
                <span class="text-xs font-bold uppercase tracking-wider" style="color: var(--color-outline)">AV c/c</span>
                <span style="color: var(--color-on-surface)">{{ c.receta!.avConCorreccion }}</span>
              </div>
            </div>

            <p v-if="c.receta!.observaciones" class="text-sm mt-4" style="color: var(--color-on-surface-variant)">
              {{ c.receta!.observaciones }}
            </p>
          </article>
        </div>
      </div>
    </main>
  </div>
</template>
