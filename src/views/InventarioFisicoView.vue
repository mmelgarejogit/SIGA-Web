<script setup lang="ts">
import { ref, onMounted } from "vue"
import { useRouter } from "vue-router"
import AppSidebar from "@/components/AppSidebar.vue"
import AppHeader from "@/components/AppHeader.vue"
import BaseButton from "@/components/BaseButton.vue"
import BaseTable from "@/components/BaseTable.vue"
import FilterChips from "@/components/FilterChips.vue"
import SearchInput from "@/components/SearchInput.vue"
import { type InventarioFisico, getInventariosFisicos } from "@/services/inventarioFisicoService"
import { getSucursales, type Sucursal } from "@/services/sucursalService"
import { useAuthStore } from "@/stores/auth"

const router = useRouter()
const auth = useAuthStore()
const canManage = auth.hasPermission("gestionar_inventario")

const items = ref<InventarioFisico[]>([])
const sucursales = ref<Sucursal[]>([])
const isLoading = ref(false)
const estadoFilter = ref<string[]>([])
const sucursalFilter = ref("")
const search = ref("")
const page = ref(1)
const totalPages = ref(1)
const totalCount = ref(0)
const PAGE_SIZE = 20

const estadoOpciones = [
  { value: "Borrador",  label: "Borrador",  dot: "#94a3b8" },
  { value: "EnConteo", label: "En Conteo", dot: "#f59e0b" },
  { value: "Cerrado",  label: "Cerrado",   dot: "#6366f1" },
  { value: "Aprobado", label: "Aprobado",  dot: "#16a34a" },
  { value: "Cancelado",label: "Cancelado", dot: "#dc2626" },
]

const estadoStyle = (e: string) => ({
  Borrador:  "bg-slate-100 text-slate-600",
  EnConteo:  "bg-amber-100 text-amber-700",
  Cerrado:   "bg-violet-100 text-violet-700",
  Aprobado:  "bg-green-100 text-green-700",
  Cancelado: "bg-red-100 text-red-600",
})[e] ?? "bg-slate-100 text-slate-600"

const formatDate = (d: string) =>
  new Date(d).toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "numeric" })

async function load() {
  isLoading.value = true
  try {
    const result = await getInventariosFisicos({
      page: page.value, pageSize: PAGE_SIZE,
      sucursalId: sucursalFilter.value || undefined,
      estado: estadoFilter.value[0] || undefined,
    })
    items.value = result.items
    totalCount.value = result.totalCount
    totalPages.value = result.totalPages
  } finally { isLoading.value = false }
}

function openDetalle(item: InventarioFisico) {
  if (item.estado === "EnConteo" && !canManage) {
    router.push(`/stock/fisico/${item.id}/conteo`)
  } else {
    router.push(`/stock/fisico/${item.id}`)
  }
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

        <div class="flex items-start justify-between mb-8">
          <div>
            <h1 class="text-4xl font-extrabold tracking-tight mb-2">Inventario Físico</h1>
            <p class="font-medium" style="color: var(--color-on-surface-variant)">
              Sesiones de conteo físico de stock
            </p>
          </div>
          <BaseButton v-if="canManage" variant="primary" size="lg" @click="router.push('/stock/fisico/nuevo')">
            <span class="material-symbols-outlined" style="font-size:20px">add</span>
            Nueva Sesión
          </BaseButton>
        </div>

        <div class="flex items-center justify-between gap-4 mb-6 flex-wrap">
          <div class="flex items-center gap-3 flex-wrap">
            <FilterChips :model-value="estadoFilter" :options="estadoOpciones" placeholder="Estado" @update:model-value="estadoFilter = $event; page = 1; load()" />
            <select v-if="sucursales.length > 1" v-model="sucursalFilter" @change="page = 1; load()" class="px-4 py-2 rounded-xl text-sm outline-none" style="border:1px solid var(--color-outline-variant);background-color:var(--color-surface-container-low);color:var(--color-on-surface)">
              <option value="">Todas las sucursales</option>
              <option v-for="s in sucursales" :key="s.id" :value="s.id">{{ s.nombre }}</option>
            </select>
          </div>
          <SearchInput :model-value="search" placeholder="Buscar sucursal…" class="w-72" @update:model-value="search = $event" />
        </div>

        <BaseTable :loading="isLoading" empty-text="No hay sesiones de inventario.">
          <template #header>
            <th class="px-6 py-5 text-left text-xs font-bold uppercase tracking-widest" style="color:var(--color-outline)">Sucursal</th>
            <th class="px-6 py-5 text-left text-xs font-bold uppercase tracking-widest" style="color:var(--color-outline)">Alcance</th>
            <th class="px-6 py-5 text-left text-xs font-bold uppercase tracking-widest" style="color:var(--color-outline)">Estado</th>
            <th class="px-6 py-5 text-center text-xs font-bold uppercase tracking-widest" style="color:var(--color-outline)">Progreso</th>
            <th class="px-6 py-5 text-left text-xs font-bold uppercase tracking-widest" style="color:var(--color-outline)">Creado</th>
            <th class="px-6 py-5" />
          </template>
          <template #body>
            <tr
              v-for="item in items.filter(i => !search || i.sucursalNombre.toLowerCase().includes(search.toLowerCase()))"
              :key="item.id"
              class="hover:bg-surface-container-low border-b cursor-pointer"
              style="border-color:rgba(196,197,213,0.12)"
              @click="openDetalle(item)"
            >
              <td class="px-6 py-4 font-semibold text-sm">{{ item.sucursalNombre }}</td>
              <td class="px-6 py-4 text-sm" style="color:var(--color-on-surface-variant)">
                {{ item.alcance === "Total" ? "Total" : `Parcial — ${item.filtroCategoriaNombre}` }}
              </td>
              <td class="px-6 py-4">
                <span class="px-3 py-1 rounded-full text-xs font-semibold" :class="estadoStyle(item.estado)">
                  {{ item.estado === "EnConteo" ? "En Conteo" : item.estado }}
                </span>
              </td>
              <td class="px-6 py-4 text-center">
                <span v-if="item.totalLineas > 0" class="text-sm">
                  <span class="font-bold">{{ item.lineasContadas }}</span>
                  <span style="color:var(--color-outline)"> / {{ item.totalLineas }}</span>
                </span>
                <span v-else class="text-xs" style="color:var(--color-outline)">—</span>
              </td>
              <td class="px-6 py-4 text-sm" style="color:var(--color-on-surface-variant)">{{ formatDate(item.createdAt) }}</td>
              <td class="px-6 py-4">
                <button class="w-9 h-9 rounded-full flex items-center justify-center transition-all hover:scale-105 bg-blue-100" @click.stop="openDetalle(item)" title="Ver detalle">
                  <span class="material-symbols-outlined text-blue-700" style="font-size:18px">open_in_new</span>
                </button>
              </td>
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
        <p class="mt-4 text-sm" style="color:var(--color-outline)">{{ totalCount }} sesión{{ totalCount !== 1 ? 'es' : '' }}</p>
      </div>
    </main>
  </div>
</template>
