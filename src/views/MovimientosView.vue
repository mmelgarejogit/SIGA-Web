<script setup lang="ts">
import { ref, onMounted } from "vue"
import AppSidebar from "@/components/AppSidebar.vue"
import AppHeader from "@/components/AppHeader.vue"
import BaseButton from "@/components/BaseButton.vue"
import BaseTable from "@/components/BaseTable.vue"
import FilterTabs from "@/components/FilterTabs.vue"
import { type MovimientoStock, getMovimientos } from "@/services/inventarioService"

const movimientos = ref<MovimientoStock[]>([])
const isLoading = ref(false)
const loadError = ref("")
const tipoFilter = ref("")
const page = ref(1)
const totalPages = ref(1)
const totalCount = ref(0)
const PAGE_SIZE = 20

const tipoTabs = [
  { value: "", label: "Todos" },
  { value: "Entrada", label: "Entradas" },
  { value: "Salida", label: "Salidas" },
  { value: "Ajuste", label: "Ajustes" },
]

const columns = [
  { key: "fecha", label: "Fecha" },
  { key: "producto", label: "Producto" },
  { key: "tipo", label: "Tipo" },
  { key: "cantidad", label: "Cantidad" },
  { key: "motivo", label: "Motivo" },
]

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-AR", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  })
}

function tipoStyle(tipo: string) {
  switch (tipo) {
    case "Entrada": return { bg: "#dcfce7", text: "#166534" }
    case "Salida":  return { bg: "#fee2e2", text: "#991b1b" }
    default:        return { bg: "#fef3c7", text: "#92400e" }
  }
}

async function load() {
  isLoading.value = true
  loadError.value = ""
  try {
    const result = await getMovimientos({
      page: page.value,
      pageSize: PAGE_SIZE,
      tipo: tipoFilter.value || undefined,
    })
    movimientos.value = result.items
    totalPages.value = result.totalPages
    totalCount.value = result.totalCount
  } catch (err: unknown) {
    loadError.value = err instanceof Error ? err.message : "Error al cargar movimientos."
  } finally {
    isLoading.value = false
  }
}

onMounted(load)

function onTipoChange(val: string) {
  tipoFilter.value = val
  page.value = 1
  load()
}
</script>

<template>
  <div class="min-h-screen" style="background-color: var(--color-background)">
    <AppSidebar />
    <AppHeader />

    <main style="margin-left: 280px; padding-top: 64px">
      <div class="p-8">
        <div class="mb-8">
          <h1 class="text-4xl font-extrabold tracking-tight mb-2">Movimientos de Stock</h1>
          <p class="text-sm font-medium" style="color: var(--color-outline)">
            {{ totalCount }} movimiento{{ totalCount !== 1 ? "s" : "" }} registrado{{ totalCount !== 1 ? "s" : "" }}
          </p>
        </div>

        <FilterTabs
          :model-value="tipoFilter"
          :tabs="tipoTabs"
          class="mb-6"
          @update:model-value="onTipoChange"
        />

        <div
          v-if="loadError"
          class="flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium mb-6"
          style="background-color: var(--color-error-container); color: var(--color-on-error-container)"
        >
          <span class="material-symbols-outlined" style="font-size: 18px">error</span>
          {{ loadError }}
        </div>

        <BaseTable
          :columns="columns"
          :items="movimientos"
          :loading="isLoading"
          empty-text="No hay movimientos registrados."
        >
          <template #fecha="{ item }">
            <span class="text-sm" style="color: var(--color-on-surface-variant)">
              {{ formatDate(item.createdAt) }}
            </span>
          </template>

          <template #producto="{ item }">
            <span class="text-sm font-semibold" style="color: var(--color-on-surface)">
              {{ item.productoNombre }}
            </span>
          </template>

          <template #tipo="{ item }">
            <span
              class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold"
              :style="`background-color: ${tipoStyle(item.tipo).bg}; color: ${tipoStyle(item.tipo).text}`"
            >{{ item.tipo }}</span>
          </template>

          <template #cantidad="{ item }">
            <span class="text-sm font-bold" style="color: var(--color-on-surface)">
              {{ item.tipo === "Ajuste" ? "→ " : item.tipo === "Entrada" ? "+" : "-" }}{{ item.cantidad }}
            </span>
          </template>

          <template #motivo="{ item }">
            <span class="text-sm" style="color: var(--color-on-surface-variant)">
              {{ item.motivo ?? "—" }}
            </span>
          </template>
        </BaseTable>

        <!-- Paginación -->
        <div v-if="totalPages > 1" class="flex items-center justify-center gap-2 mt-6">
          <BaseButton variant="secondary" size="sm" :disabled="page === 1" @click="page--; load()">
            <span class="material-symbols-outlined" style="font-size: 18px">chevron_left</span>
          </BaseButton>
          <span class="text-sm font-medium" style="color: var(--color-on-surface-variant)">
            {{ page }} / {{ totalPages }}
          </span>
          <BaseButton variant="secondary" size="sm" :disabled="page === totalPages" @click="page++; load()">
            <span class="material-symbols-outlined" style="font-size: 18px">chevron_right</span>
          </BaseButton>
        </div>
      </div>
    </main>
  </div>
</template>
