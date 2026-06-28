<script setup lang="ts">
import { ref, onMounted } from "vue"
import { useRouter } from "vue-router"
import AppSidebar from "@/components/AppSidebar.vue"
import AppHeader from "@/components/AppHeader.vue"
import BaseTable from "@/components/BaseTable.vue"
import { type ConteoInventarioDto, getConteos } from "@/services/inventarioService"

const router = useRouter()
const isLoading = ref(false)
const loadError = ref("")
const conteos = ref<ConteoInventarioDto[]>([])

const columns = [
  { key: "fecha",       label: "Fecha" },
  { key: "operador",    label: "Registrado por" },
  { key: "productos",   label: "Productos" },
  { key: "diferencias", label: "Con diferencia" },
  { key: "obs",         label: "Observaciones" },
]

async function load() {
  isLoading.value = true
  loadError.value = ""
  try {
    conteos.value = await getConteos("Pendiente")
  } catch (err: unknown) {
    loadError.value = err instanceof Error ? err.message : "Error al cargar pendientes."
  } finally {
    isLoading.value = false
  }
}

onMounted(load)

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-PY", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  })
}
</script>

<template>
  <div class="min-h-screen" style="background-color: var(--color-background)">
    <AppSidebar />
    <AppHeader />

    <main style="margin-left: var(--sidebar-width); transition: margin-left 0.25s ease; padding-top: 64px">
      <div class="p-4 sm:p-6 lg:p-8">

        <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-8">
          <div>
            <h1 class="text-4xl font-extrabold tracking-tight mb-2">Aprobaciones de Inventario</h1>
            <p class="font-medium" style="color: var(--color-on-surface-variant)">
              {{ conteos.length }} inventario{{ conteos.length !== 1 ? "s" : "" }} pendiente{{ conteos.length !== 1 ? "s" : "" }} de revisión
            </p>
          </div>
        </div>

        <div v-if="loadError" class="flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium mb-6"
          style="background-color: var(--color-error-container); color: var(--color-on-error-container)">
          <span class="material-symbols-outlined" style="font-size: 18px">error</span>
          {{ loadError }}
        </div>

        <BaseTable
          :columns="columns"
          :items="conteos"
          :loading="isLoading"
          empty-text="No hay inventarios pendientes de aprobación."
          @row-click="(item) => router.push(`/stock/conteo/${item.id}/revisar`)"
        >
          <template #fecha="{ item }">
            <span class="text-sm" style="color: var(--color-on-surface)">{{ formatDate(item.fechaConteo) }}</span>
          </template>

          <template #operador="{ item }">
            <span class="text-sm font-medium" style="color: var(--color-on-surface)">{{ item.creadoPorNombre }}</span>
          </template>

          <template #productos="{ item }">
            <span class="text-sm" style="color: var(--color-on-surface-variant)">{{ item.totalLineas }}</span>
          </template>

          <template #diferencias="{ item }">
            <span v-if="item.lineasConDiferencia > 0"
              class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold"
              style="background-color: var(--color-warning-container); color: var(--color-on-warning-container)">
              <span class="material-symbols-outlined" style="font-size: 13px">warning</span>
              {{ item.lineasConDiferencia }}
            </span>
            <span v-else
              class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold"
              style="background-color: var(--color-success-container); color: var(--color-on-success-container)">
              <span class="material-symbols-outlined" style="font-size: 13px">check_circle</span>
              Sin diferencias
            </span>
          </template>

          <template #obs="{ item }">
            <span class="text-sm italic" style="color: var(--color-on-surface-variant)">
              {{ item.observaciones || "—" }}
            </span>
          </template>
        </BaseTable>

      </div>
    </main>
  </div>
</template>
