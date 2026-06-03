<script setup lang="ts">
import { ref, computed, onMounted } from "vue"
import AppSidebar from "@/components/AppSidebar.vue"
import AppHeader from "@/components/AppHeader.vue"
import SearchInput from "@/components/SearchInput.vue"
import FilterChips from "@/components/FilterChips.vue"
import BaseTable from "@/components/BaseTable.vue"
import { type StockPorVariante, getStock } from "@/services/stockService"
import { getSucursales, type Sucursal } from "@/services/sucursalService"

const items = ref<StockPorVariante[]>([])
const sucursales = ref<Sucursal[]>([])
const isLoading = ref(false)
const search = ref("")
const sucursalFilter = ref("")
const bajoStockFilter = ref<string[]>([])

// KPIs
const totalProductos = computed(() => items.value.length)
const bajoStockCount = computed(() => items.value.filter(i => i.bajoStock).length)
const sinStockCount  = computed(() => items.value.filter(i => i.stockActual === 0).length)

const filtered = computed(() => {
  let result = items.value
  if (sucursalFilter.value)
    result = result.filter(i => i.sucursalId === sucursalFilter.value)
  if (bajoStockFilter.value.includes("bajo"))
    result = result.filter(i => i.bajoStock)
  if (bajoStockFilter.value.includes("sin"))
    result = result.filter(i => i.stockActual === 0)
  if (search.value) {
    const q = search.value.toLowerCase()
    result = result.filter(i =>
      i.productoNombre.toLowerCase().includes(q) ||
      (i.sku ?? "").toLowerCase().includes(q) ||
      (i.color ?? "").toLowerCase().includes(q),
    )
  }
  return result
})

const stockBarWidth = (item: StockPorVariante) => {
  if (!item.stockMaximo || item.stockMaximo === 0) return 50
  return Math.min(100, Math.round((item.stockActual / item.stockMaximo) * 100))
}

const stockBarColor = (item: StockPorVariante) => {
  if (item.stockActual === 0) return "#dc2626"
  if (item.bajoStock) return "#f59e0b"
  return "#16a34a"
}

const estadoLabel = (item: StockPorVariante) => {
  if (item.stockActual === 0) return { text: "Sin stock", cls: "bg-red-100 text-red-600" }
  if (item.bajoStock)          return { text: "Bajo stock", cls: "bg-amber-100 text-amber-700" }
  return { text: "Normal", cls: "bg-green-100 text-green-700" }
}

const alertaOpciones = [
  { value: "bajo", label: "Bajo stock",  dot: "#f59e0b" },
  { value: "sin",  label: "Sin stock",   dot: "#dc2626" },
]

async function load() {
  isLoading.value = true
  try {
    items.value = await getStock({ bajoStock: undefined })
  } finally {
    isLoading.value = false }
}

onMounted(async () => {
  sucursales.value = await getSucursales(true)
  await load()
})
</script>

<template>
  <div class="min-h-screen" style="background-color: var(--color-background)">
    <AppSidebar />
    <AppHeader />
    <main style="margin-left: 280px; padding-top: 64px">
      <div class="p-8">

        <!-- Encabezado -->
        <div class="mb-8">
          <h1 class="text-4xl font-extrabold tracking-tight mb-2">Stock por Sucursal</h1>
          <p class="font-medium" style="color: var(--color-on-surface-variant)">
            Niveles actuales de inventario calculados en tiempo real
          </p>
        </div>

        <!-- KPI cards -->
        <div class="grid grid-cols-3 gap-4 mb-8">
          <div class="rounded-2xl p-6 flex items-center gap-4" style="background-color:var(--color-surface-container-lowest);box-shadow:0 2px 12px rgba(0,40,142,0.08)">
            <div class="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style="background-color:#DBEAFE">
              <span class="material-symbols-outlined" style="color:#1E40AF;font-size:22px">layers</span>
            </div>
            <div>
              <p class="text-xs font-bold uppercase tracking-wider mb-0.5" style="color:var(--color-outline)">Variantes con stock</p>
              <p class="text-2xl font-extrabold" style="color:var(--color-on-surface)">{{ totalProductos }}</p>
            </div>
          </div>
          <div class="rounded-2xl p-6 flex items-center gap-4" style="background-color:var(--color-surface-container-lowest);box-shadow:0 2px 12px rgba(0,40,142,0.08)">
            <div class="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style="background-color:#FEF3C7">
              <span class="material-symbols-outlined" style="color:#92400E;font-size:22px">warning</span>
            </div>
            <div>
              <p class="text-xs font-bold uppercase tracking-wider mb-0.5" style="color:var(--color-outline)">Bajo stock</p>
              <p class="text-2xl font-extrabold" style="color:#92400E">{{ bajoStockCount }}</p>
            </div>
          </div>
          <div class="rounded-2xl p-6 flex items-center gap-4" style="background-color:var(--color-surface-container-lowest);box-shadow:0 2px 12px rgba(0,40,142,0.08)">
            <div class="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style="background-color:#FEE2E2">
              <span class="material-symbols-outlined" style="color:#991B1B;font-size:22px">inventory</span>
            </div>
            <div>
              <p class="text-xs font-bold uppercase tracking-wider mb-0.5" style="color:var(--color-outline)">Sin stock</p>
              <p class="text-2xl font-extrabold" style="color:#991B1B">{{ sinStockCount }}</p>
            </div>
          </div>
        </div>

        <!-- Filtros -->
        <div class="flex items-center justify-between gap-4 mb-6 flex-wrap">
          <div class="flex items-center gap-3 flex-wrap">
            <FilterChips :model-value="bajoStockFilter" :options="alertaOpciones" placeholder="Alertas" @update:model-value="bajoStockFilter = $event" />
            <select v-if="sucursales.length > 1" v-model="sucursalFilter" class="px-4 py-2 rounded-xl text-sm outline-none" style="border:1px solid var(--color-outline-variant);background-color:var(--color-surface-container-low);color:var(--color-on-surface)">
              <option value="">Todas las sucursales</option>
              <option v-for="s in sucursales" :key="s.id" :value="s.id">{{ s.nombre }}</option>
            </select>
          </div>
          <SearchInput :model-value="search" placeholder="Buscar producto, SKU, color…" class="w-72" @update:model-value="search = $event" />
        </div>

        <!-- Tabla -->
        <div class="rounded-2xl overflow-hidden" style="background-color:var(--color-surface-container-lowest);box-shadow:0 1px 3px rgba(196,197,213,0.25);outline:1px solid rgba(196,197,213,0.15)">
          <BaseTable :loading="isLoading" empty-text="Sin movimientos registrados aún.">
            <template #header>
              <th class="px-6 py-5 text-left text-xs font-bold uppercase tracking-widest" style="color:var(--color-outline)">Producto / Variante</th>
              <th class="px-6 py-5 text-left text-xs font-bold uppercase tracking-widest" style="color:var(--color-outline)">Sucursal</th>
              <th class="px-6 py-5 text-center text-xs font-bold uppercase tracking-widest" style="color:var(--color-outline)">Stock actual</th>
              <th class="px-6 py-5 text-center text-xs font-bold uppercase tracking-widest" style="color:var(--color-outline)">Mín / Máx</th>
              <th class="px-6 py-5 text-left text-xs font-bold uppercase tracking-widest" style="color:var(--color-outline)">Nivel</th>
              <th class="px-6 py-5 text-left text-xs font-bold uppercase tracking-widest" style="color:var(--color-outline)">Estado</th>
            </template>
            <template #body>
              <tr
                v-for="item in filtered"
                :key="`${item.productoVarianteId}-${item.sucursalId}`"
                class="hover:bg-surface-container-low border-b"
                style="border-color:rgba(196,197,213,0.12)"
              >
                <td class="px-6 py-4">
                  <p class="font-semibold text-sm" style="color:var(--color-on-surface)">{{ item.productoNombre }}</p>
                  <p class="text-xs mt-0.5" style="color:var(--color-outline)">
                    {{ [item.sku, item.color, item.talle].filter(Boolean).join(' · ') || 'Variante única' }}
                  </p>
                </td>
                <td class="px-6 py-4 text-sm" style="color:var(--color-on-surface-variant)">{{ item.sucursalNombre }}</td>
                <td class="px-6 py-4 text-center">
                  <span class="text-xl font-extrabold" :style="`color:${stockBarColor(item)}`">{{ item.stockActual }}</span>
                </td>
                <td class="px-6 py-4 text-center text-sm" style="color:var(--color-outline)">
                  <span v-if="item.stockMinimo != null || item.stockMaximo != null">
                    {{ item.stockMinimo ?? '—' }} / {{ item.stockMaximo ?? '—' }}
                  </span>
                  <span v-else style="color:var(--color-outline)">Sin parámetros</span>
                </td>
                <td class="px-6 py-4" style="min-width:120px">
                  <div v-if="item.stockMaximo" class="flex items-center gap-2">
                    <div class="flex-1 h-2 rounded-full overflow-hidden" style="background-color:var(--color-surface-container-high)">
                      <div class="h-full rounded-full transition-all" :style="`width:${stockBarWidth(item)}%;background-color:${stockBarColor(item)}`" />
                    </div>
                    <span class="text-xs font-semibold w-8 text-right" :style="`color:${stockBarColor(item)}`">{{ stockBarWidth(item) }}%</span>
                  </div>
                  <span v-else class="text-xs" style="color:var(--color-outline)">—</span>
                </td>
                <td class="px-6 py-4">
                  <span class="px-3 py-1 rounded-full text-xs font-semibold" :class="estadoLabel(item).cls">
                    {{ estadoLabel(item).text }}
                  </span>
                </td>
              </tr>
            </template>
          </BaseTable>

          <div class="px-6 py-4 text-sm" style="border-top:1px solid rgba(196,197,213,0.12);color:var(--color-outline)">
            Mostrando {{ filtered.length }} de {{ items.length }} registros
          </div>
        </div>
      </div>
    </main>
  </div>
</template>
