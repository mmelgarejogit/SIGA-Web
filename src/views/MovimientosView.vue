<script setup lang="ts">
import { ref, computed, onMounted } from "vue"
import AppSidebar from "@/components/AppSidebar.vue"
import AppHeader from "@/components/AppHeader.vue"
import BaseButton from "@/components/BaseButton.vue"
import BaseTable from "@/components/BaseTable.vue"
import FilterChips from "@/components/FilterChips.vue"
import { type MovimientoStock, getMovimientos } from "@/services/inventarioService"

const movimientos = ref<MovimientoStock[]>([])
const isLoading = ref(false)
const loadError = ref("")
const tipoFilter = ref<string[]>([])
const currentPage = ref(1)
const totalPages = ref(1)
const totalCount = ref(0)
const PAGE_SIZE = 10

const rangeStart = computed(() =>
  totalCount.value === 0 ? 0 : (currentPage.value - 1) * PAGE_SIZE + 1,
)
const rangeEnd = computed(() => Math.min(currentPage.value * PAGE_SIZE, totalCount.value))

const visiblePages = computed(() => {
  const total = totalPages.value
  const cur = currentPage.value
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const pages: (number | "...")[] = [1]
  if (cur > 3) pages.push("...")
  for (let p = Math.max(2, cur - 1); p <= Math.min(total - 1, cur + 1); p++) pages.push(p)
  if (cur < total - 2) pages.push("...")
  pages.push(total)
  return pages
})

const tipoOptions = [
  { value: "Entrada", label: "Entradas", dot: "#166534" },
  { value: "Salida",  label: "Salidas",  dot: "#991b1b" },
  { value: "Ajuste",  label: "Ajustes",  dot: "#92400e" },
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
      page: currentPage.value,
      pageSize: PAGE_SIZE,
      tipo: tipoFilter.value[0] || undefined,
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

function onTipoChange(val: string[]) {
  tipoFilter.value = val
  currentPage.value = 1
  load()
}
</script>

<template>
  <div class="min-h-screen" style="background-color: var(--color-background)">
    <AppSidebar />
    <AppHeader />

    <main style="margin-left: var(--sidebar-width); transition: margin-left 0.25s ease; padding-top: 64px">
      <div class="p-8">
        <div class="flex items-start justify-between mb-8">
          <div>
            <h1 class="text-4xl font-extrabold tracking-tight" style="color: var(--color-on-surface)">Movimientos de Stock</h1>
            <p class="mt-1 font-medium" style="color: var(--color-on-surface-variant)">
              {{ totalCount }} movimiento{{ totalCount !== 1 ? "s" : "" }} registrado{{ totalCount !== 1 ? "s" : "" }}
            </p>
          </div>
        </div>

        <div class="flex items-center gap-3 mb-6 flex-wrap">
          <FilterChips
            :model-value="tipoFilter"
            :options="tipoOptions"
            placeholder="Tipo"
            @update:model-value="onTipoChange"
          />
        </div>

        <div
          v-if="loadError"
          class="flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium mb-6"
          style="background-color: var(--color-error-container); color: var(--color-on-error-container)"
        >
          <span class="material-symbols-outlined" style="font-size: 18px">error</span>
          {{ loadError }}
        </div>

        <div class="rounded-2xl overflow-hidden" style="background-color: var(--color-surface-container-lowest); box-shadow: 0 1px 3px rgba(196, 197, 213, 0.25); outline: 1px solid rgba(196, 197, 213, 0.15);">
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

          <!-- Footer: conteo + paginador -->
          <div
            v-if="movimientos.length > 0"
            class="px-6 py-4 flex items-center justify-between flex-wrap gap-4"
            style="border-top: 1px solid rgba(196, 197, 213, 0.12); background-color: var(--color-surface-container-lowest);"
          >
            <span class="text-sm" style="color: var(--color-on-surface-variant)">
              Mostrando
              <strong style="color: var(--color-on-surface)">{{ rangeStart }}–{{ rangeEnd }}</strong>
              de
              <strong style="color: var(--color-on-surface)">{{ totalCount }}</strong>
              movimientos
            </span>
            <div v-if="totalPages > 1" class="flex items-center gap-1">
              <button
                @click="currentPage--; load()"
                :disabled="currentPage === 1"
                class="w-9 h-9 rounded-full flex items-center justify-center transition-all disabled:opacity-30 hover:bg-surface-container-high"
                style="color: var(--color-on-surface-variant)"
              ><span class="material-symbols-outlined" style="font-size: 18px">chevron_left</span></button>
              <template v-for="p in visiblePages" :key="p">
                <span v-if="p === '...'" class="w-9 h-9 flex items-center justify-center text-sm" style="color: var(--color-outline)">…</span>
                <button
                  v-else
                  @click="currentPage = (p as number); load()"
                  class="w-9 h-9 rounded-full text-sm font-semibold transition-all"
                  :class="currentPage === p ? 'bg-primary text-white' : 'text-on-surface-variant hover:bg-surface-container-high'"
                >{{ p }}</button>
              </template>
              <button
                @click="currentPage++; load()"
                :disabled="currentPage === totalPages"
                class="w-9 h-9 rounded-full flex items-center justify-center transition-all disabled:opacity-30 hover:bg-surface-container-high"
                style="color: var(--color-on-surface-variant)"
              ><span class="material-symbols-outlined" style="font-size: 18px">chevron_right</span></button>
            </div>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>
