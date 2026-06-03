<script setup lang="ts">
import { ref, onMounted } from "vue"
import AppSidebar from "@/components/AppSidebar.vue"
import AppHeader from "@/components/AppHeader.vue"
import BaseTable from "@/components/BaseTable.vue"
import FilterChips from "@/components/FilterChips.vue"
import SearchInput from "@/components/SearchInput.vue"
import { type MovimientoInventario, getMovimientos } from "@/services/stockService"
import { getSucursales, type Sucursal } from "@/services/sucursalService"

const movimientos = ref<MovimientoInventario[]>([])
const sucursales = ref<Sucursal[]>([])
const isLoading = ref(false)
const search = ref("")
const tipoFilter = ref<string[]>([])
const sucursalFilter = ref("")
const page = ref(1)
const totalPages = ref(1)
const totalCount = ref(0)
const PAGE_SIZE = 30

const tipoOpciones = [
  { value: "Ingreso", label: "Ingreso", dot: "#16a34a" },
  { value: "Egreso",  label: "Egreso",  dot: "#dc2626" },
]

const origenLabel: Record<string, string> = {
  Compra: "Compra", Venta: "Venta", DevolucionVenta: "Dev. Venta",
  DevolucionProveedor: "Dev. Proveedor", Transferencia: "Transferencia",
  AjusteManual: "Ajuste", CorreccionConteo: "Corrección conteo",
}

const formatDate = (d: string) => new Date(d).toLocaleString("es-AR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })

async function load() {
  isLoading.value = true
  try {
    const result = await getMovimientos({
      page: page.value,
      pageSize: PAGE_SIZE,
      sucursalId: sucursalFilter.value || undefined,
      tipo: tipoFilter.value[0] || undefined,
    })
    movimientos.value = result.items
    totalCount.value = result.totalCount
    totalPages.value = result.totalPages
  } finally { isLoading.value = false }
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

        <div class="mb-8">
          <h1 class="text-4xl font-extrabold tracking-tight mb-2">Historial de Movimientos</h1>
          <p class="font-medium" style="color: var(--color-on-surface-variant)">Registro de todos los movimientos de inventario</p>
        </div>

        <div class="flex items-center justify-between gap-4 mb-6 flex-wrap">
          <div class="flex items-center gap-3 flex-wrap">
            <FilterChips :model-value="tipoFilter" :options="tipoOpciones" placeholder="Tipo" @update:model-value="tipoFilter = $event; page = 1; load()" />
            <select v-if="sucursales.length" v-model="sucursalFilter" @change="page = 1; load()" class="px-4 py-2 rounded-xl text-sm outline-none" style="border:1px solid var(--color-outline-variant);background-color:var(--color-surface-container-low);color:var(--color-on-surface)">
              <option value="">Todas las sucursales</option>
              <option v-for="s in sucursales" :key="s.id" :value="s.id">{{ s.nombre }}</option>
            </select>
          </div>
          <SearchInput :model-value="search" placeholder="Buscar producto…" class="w-72" @update:model-value="search = $event" />
        </div>

        <BaseTable :loading="isLoading" empty-text="No hay movimientos registrados.">
          <template #header>
            <th class="px-6 py-5 text-left text-xs font-bold uppercase tracking-widest" style="color:var(--color-outline)">Producto / Variante</th>
            <th class="px-6 py-5 text-left text-xs font-bold uppercase tracking-widest" style="color:var(--color-outline)">Sucursal</th>
            <th class="px-6 py-5 text-left text-xs font-bold uppercase tracking-widest" style="color:var(--color-outline)">Tipo</th>
            <th class="px-6 py-5 text-right text-xs font-bold uppercase tracking-widest" style="color:var(--color-outline)">Cant.</th>
            <th class="px-6 py-5 text-left text-xs font-bold uppercase tracking-widest" style="color:var(--color-outline)">Origen</th>
            <th class="px-6 py-5 text-left text-xs font-bold uppercase tracking-widest" style="color:var(--color-outline)">Usuario</th>
            <th class="px-6 py-5 text-left text-xs font-bold uppercase tracking-widest" style="color:var(--color-outline)">Fecha</th>
          </template>
          <template #body>
            <tr
              v-for="m in movimientos.filter(x => !search || x.productoNombre.toLowerCase().includes(search.toLowerCase()))"
              :key="m.id"
              class="hover:bg-surface-container-low border-b"
              style="border-color:rgba(196,197,213,0.12)"
            >
              <td class="px-6 py-4">
                <p class="font-semibold text-sm">{{ m.productoNombre }}</p>
                <p class="text-xs mt-0.5" style="color:var(--color-outline)">
                  {{ [m.varianteSku, m.varianteColor, m.varianteTalle].filter(Boolean).join(' · ') || '—' }}
                </p>
              </td>
              <td class="px-6 py-4 text-sm">{{ m.sucursalNombre }}</td>
              <td class="px-6 py-4">
                <span class="flex items-center gap-1.5">
                  <span class="w-2 h-2 rounded-full" :style="m.tipo === 'Ingreso' ? 'background:#16a34a' : 'background:#dc2626'" />
                  <span class="text-sm font-semibold" :style="m.tipo === 'Ingreso' ? 'color:#16a34a' : 'color:#dc2626'">{{ m.tipo }}</span>
                </span>
              </td>
              <td class="px-6 py-4 text-right font-bold">{{ m.tipo === 'Ingreso' ? '+' : '-' }}{{ m.cantidad }}</td>
              <td class="px-6 py-4 text-sm" style="color:var(--color-on-surface-variant)">{{ origenLabel[m.origenTipo] ?? m.origenTipo }}</td>
              <td class="px-6 py-4 text-sm" style="color:var(--color-on-surface-variant)">{{ m.usuarioNombre }}</td>
              <td class="px-6 py-4 text-sm" style="color:var(--color-on-surface-variant)">{{ formatDate(m.fecha) }}</td>
            </tr>
          </template>
        </BaseTable>

        <div v-if="totalPages > 1" class="flex items-center justify-center gap-2 mt-6">
          <button v-for="p in totalPages" :key="p" @click="page = p; load()"
            class="w-9 h-9 rounded-full text-sm font-semibold transition-all"
            :style="p === page ? 'background-color:var(--color-primary);color:white' : 'background-color:var(--color-surface-container-high);color:var(--color-on-surface)'">
            {{ p }}
          </button>
        </div>
        <p class="mt-4 text-sm" style="color:var(--color-outline)">{{ totalCount }} movimiento{{ totalCount !== 1 ? 's' : '' }}</p>
      </div>
    </main>
  </div>
</template>
