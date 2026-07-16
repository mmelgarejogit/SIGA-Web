<script setup lang="ts">
import { ref, computed, onMounted, watch } from "vue"
import AppSidebar from "@/components/AppSidebar.vue"
import AppHeader from "@/components/AppHeader.vue"
import BaseButton from "@/components/BaseButton.vue"
import {
  type Notificacion,
  getNotificaciones,
  marcarLeida,
  marcarTodasLeidas,
} from "@/services/notificacionService"

const notificaciones = ref<Notificacion[]>([])
const isLoading       = ref(false)
const soloNoLeidas    = ref(false)
const currentPage     = ref(1)
const totalPages      = ref(0)
const totalCount      = ref(0)
const pageSize        = 20

async function load() {
  isLoading.value = true
  try {
    const result = await getNotificaciones({
      soloNoLeidas: soloNoLeidas.value || undefined,
      page: currentPage.value,
      pageSize,
    })
    notificaciones.value = result.items
    totalPages.value     = result.totalPages
    totalCount.value     = result.totalCount
  } catch {
    notificaciones.value = []
  } finally {
    isLoading.value = false
  }
}

onMounted(load)
watch(soloNoLeidas, () => { currentPage.value = 1; load() })
watch(currentPage, load)

async function onMarcarLeida(n: Notificacion) {
  if (n.leido) return
  n.leido = true
  n.fechaLectura = new Date().toISOString()
  try {
    await marcarLeida(n.id)
  } catch {
    await load()
  }
}

async function onMarcarTodas() {
  try {
    await marcarTodasLeidas()
    await load()
  } catch {
    // silencioso: el usuario puede reintentar
  }
}

const hayNoLeidas = computed(() => notificaciones.value.some((n) => !n.leido))

const iconoPorTipo: Record<string, string> = {
  BajoStock:              "inventory_2",
  TransferenciaPendiente: "sync_alt",
  PedidoLabRecibido:      "science",
}

function iconoDe(tipo: string) {
  return iconoPorTipo[tipo] ?? "notifications"
}

function fechaRelativa(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime()
  const min = Math.floor(diffMs / 60_000)
  if (min < 1) return "recién"
  if (min < 60) return `hace ${min} min`
  const horas = Math.floor(min / 60)
  if (horas < 24) return `hace ${horas} h`
  const dias = Math.floor(horas / 24)
  if (dias < 7) return `hace ${dias} d`
  return new Date(iso).toLocaleDateString("es-PY", { day: "2-digit", month: "short", year: "numeric" })
}
</script>

<template>
  <div class="min-h-screen" style="background-color: var(--color-background)">
    <AppSidebar />
    <AppHeader />
    <main style="margin-left: var(--sidebar-width); padding-top: 64px; transition: margin-left 0.25s ease">
      <div class="p-4 sm:p-6 lg:p-8">

        <!-- Encabezado -->
        <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-8">
          <div>
            <h1 class="text-4xl font-extrabold tracking-tight mb-2">Notificaciones</h1>
            <p class="font-medium" style="color: var(--color-on-surface-variant)">
              {{ totalCount }} notificaci{{ totalCount !== 1 ? "ones" : "ón" }}
            </p>
          </div>
          <BaseButton v-if="hayNoLeidas" variant="secondary" size="sm" @click="onMarcarTodas">
            Marcar todas como leídas
          </BaseButton>
        </div>

        <!-- Filtro -->
        <div class="flex items-center gap-3 mb-6">
          <button
            @click="soloNoLeidas = !soloNoLeidas"
            class="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all"
            :style="soloNoLeidas
              ? 'background-color: var(--color-warning-container); color: var(--color-on-warning-container); border: 1px solid var(--color-warning-container);'
              : 'background-color: var(--color-surface); border: 1px solid var(--color-outline-variant); color: var(--color-on-surface);'"
          >
            <span class="material-symbols-outlined" style="font-size: 18px">mark_email_unread</span>
            Solo no leídas
          </button>
        </div>

        <!-- Lista -->
        <div class="rounded-lg overflow-hidden" style="background-color: var(--color-surface-container-lowest); box-shadow: var(--shadow-sm)">
          <div v-if="isLoading" class="py-16 text-center text-sm" style="color: var(--color-outline)">
            Cargando…
          </div>
          <div v-else-if="notificaciones.length === 0" class="flex flex-col items-center justify-center py-16 gap-2">
            <span class="material-symbols-outlined" style="font-size: 36px; color: var(--color-outline-variant)">notifications_off</span>
            <p class="text-sm" style="color: var(--color-outline)">Sin notificaciones por ahora</p>
          </div>
          <div v-else>
            <button
              v-for="n in notificaciones"
              :key="n.id"
              @click="onMarcarLeida(n)"
              class="w-full flex items-start gap-4 px-6 py-4 text-left transition-colors hover:bg-surface-container-low"
              style="border-bottom: 1px solid var(--color-hairline-soft)"
            >
              <div
                class="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                style="background-color: color-mix(in srgb, var(--color-primary) 10%, transparent)"
              >
                <span class="material-symbols-outlined" style="font-size: 20px; color: var(--color-primary)">{{ iconoDe(n.tipo) }}</span>
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-sm" :class="n.leido ? 'font-medium' : 'font-bold'" style="color: var(--color-on-surface)">
                  {{ n.mensaje }}
                </p>
                <p class="text-xs mt-1" style="color: var(--color-outline)">{{ fechaRelativa(n.fechaCreacion) }}</p>
              </div>
              <div v-if="!n.leido" class="w-2.5 h-2.5 rounded-full flex-shrink-0 mt-1.5" style="background-color: var(--color-primary)" />
            </button>
          </div>

          <!-- Paginador -->
          <div v-if="totalPages > 1" class="px-6 py-4 flex items-center justify-end gap-2" style="border-top: 1px solid var(--color-hairline-soft)">
            <button
              @click="currentPage--"
              :disabled="currentPage === 1"
              class="w-9 h-9 rounded-full flex items-center justify-center transition-all disabled:opacity-30 hover:bg-surface-container-high"
              style="color: var(--color-on-surface-variant)"
            >
              <span class="material-symbols-outlined" style="font-size: 18px">chevron_left</span>
            </button>
            <span class="text-sm px-2" style="color: var(--color-on-surface-variant)">{{ currentPage }} / {{ totalPages }}</span>
            <button
              @click="currentPage++"
              :disabled="currentPage === totalPages"
              class="w-9 h-9 rounded-full flex items-center justify-center transition-all disabled:opacity-30 hover:bg-surface-container-high"
              style="color: var(--color-on-surface-variant)"
            >
              <span class="material-symbols-outlined" style="font-size: 18px">chevron_right</span>
            </button>
          </div>
        </div>

      </div>
    </main>
  </div>
</template>
