<script setup lang="ts">
import { ref, onMounted } from "vue"
import { useRouter } from "vue-router"
import AppSidebar from "@/components/AppSidebar.vue"
import AppHeader from "@/components/AppHeader.vue"
import BaseButton from "@/components/BaseButton.vue"
import BaseTable from "@/components/BaseTable.vue"
import FilterChips from "@/components/FilterChips.vue"
import SearchInput from "@/components/SearchInput.vue"
import { type AjusteManual, getAjustes } from "@/services/stockService"
import { getSucursales, type Sucursal } from "@/services/sucursalService"
import { useAuthStore } from "@/stores/auth"

const router = useRouter()
const auth = useAuthStore()
const canManage = auth.hasPermission("gestionar_inventario")

const ajustes = ref<AjusteManual[]>([])
const sucursales = ref<Sucursal[]>([])
const isLoading = ref(false)
const search = ref("")
const estadoFilter = ref<string[]>([])
const sucursalFilter = ref("")
const page = ref(1)
const totalPages = ref(1)
const totalCount = ref(0)
const PAGE_SIZE = 20

const estadoOpciones = [
  { value: "Pendiente", label: "Pendiente", dot: "#f59e0b" },
  { value: "Aprobado",  label: "Aprobado",  dot: "#16a34a" },
  { value: "Rechazado", label: "Rechazado", dot: "#dc2626" },
]

const estadoStyle = (e: string) =>
  e === "Pendiente" ? "bg-amber-100 text-amber-700" :
  e === "Aprobado"  ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"

const formatDate = (d: string) => new Date(d).toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "numeric" })

async function load() {
  isLoading.value = true
  try {
    const result = await getAjustes({
      page: page.value,
      pageSize: PAGE_SIZE,
      sucursalId: sucursalFilter.value || undefined,
      estado: estadoFilter.value[0] || undefined,
    })
    ajustes.value = result.items
    totalCount.value = result.totalCount
    totalPages.value = result.totalPages
  } finally { isLoading.value = false }
}

function onEstadoChange(v: string[]) { estadoFilter.value = v; page.value = 1; load() }
function onSearch(v: string) { search.value = v }

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
            <h1 class="text-4xl font-extrabold tracking-tight mb-2">Ajustes Manuales</h1>
            <p class="font-medium" style="color: var(--color-on-surface-variant)">Solicitudes de ajuste de stock por sucursal</p>
          </div>
          <BaseButton variant="primary" size="lg" @click="router.push('/stock/ajustes/nuevo')">
            <span class="material-symbols-outlined" style="font-size:20px">add</span>
            Nuevo Ajuste
          </BaseButton>
        </div>

        <!-- Filtros -->
        <div class="flex items-center justify-between gap-4 mb-6 flex-wrap">
          <div class="flex items-center gap-3 flex-wrap">
            <FilterChips :model-value="estadoFilter" :options="estadoOpciones" placeholder="Estado" @update:model-value="onEstadoChange" />
            <select v-if="sucursales.length" v-model="sucursalFilter" @change="page = 1; load()" class="px-4 py-2 rounded-xl text-sm outline-none" style="border:1px solid var(--color-outline-variant);background-color:var(--color-surface-container-low);color:var(--color-on-surface)">
              <option value="">Todas las sucursales</option>
              <option v-for="s in sucursales" :key="s.id" :value="s.id">{{ s.nombre }}</option>
            </select>
          </div>
          <SearchInput :model-value="search" placeholder="Buscar producto…" class="w-72" @update:model-value="onSearch" />
        </div>

        <BaseTable :loading="isLoading" empty-text="No hay ajustes registrados.">
          <template #header>
            <th class="px-6 py-5 text-left text-xs font-bold uppercase tracking-widest" style="color:var(--color-outline)">Producto / Variante</th>
            <th class="px-6 py-5 text-left text-xs font-bold uppercase tracking-widest" style="color:var(--color-outline)">Sucursal</th>
            <th class="px-6 py-5 text-left text-xs font-bold uppercase tracking-widest" style="color:var(--color-outline)">Tipo</th>
            <th class="px-6 py-5 text-left text-xs font-bold uppercase tracking-widest" style="color:var(--color-outline)">Cant.</th>
            <th class="px-6 py-5 text-left text-xs font-bold uppercase tracking-widest" style="color:var(--color-outline)">Estado</th>
            <th class="px-6 py-5 text-left text-xs font-bold uppercase tracking-widest" style="color:var(--color-outline)">Fecha</th>
            <th class="px-6 py-5" />
          </template>
          <template #body>
            <tr
              v-for="a in ajustes.filter(x => !search || x.productoNombre.toLowerCase().includes(search.toLowerCase()))"
              :key="a.id"
              class="hover:bg-surface-container-low border-b cursor-pointer"
              style="border-color:rgba(196,197,213,0.12)"
              @click="router.push(`/stock/ajustes/${a.id}`)"
            >
              <td class="px-6 py-4">
                <p class="font-semibold text-sm">{{ a.productoNombre }}</p>
                <p class="text-xs mt-0.5" style="color:var(--color-outline)">
                  {{ [a.varianteSku, a.varianteColor, a.varianteTalle].filter(Boolean).join(' · ') || '—' }}
                </p>
              </td>
              <td class="px-6 py-4 text-sm">{{ a.sucursalNombre }}</td>
              <td class="px-6 py-4 text-sm">{{ a.tipoAjusteNombre }}</td>
              <td class="px-6 py-4 font-bold">{{ a.cantidad }}</td>
              <td class="px-6 py-4">
                <span class="px-3 py-1 rounded-full text-xs font-semibold" :class="estadoStyle(a.estado)">{{ a.estado }}</span>
              </td>
              <td class="px-6 py-4 text-sm" style="color:var(--color-on-surface-variant)">{{ formatDate(a.fechaCreacion) }}</td>
              <td class="px-6 py-4">
                <button class="w-9 h-9 rounded-full flex items-center justify-center transition-all hover:scale-105 bg-blue-100" @click.stop="router.push(`/stock/ajustes/${a.id}`)" title="Ver detalle">
                  <span class="material-symbols-outlined text-blue-700" style="font-size:18px">open_in_new</span>
                </button>
              </td>
            </tr>
          </template>
        </BaseTable>

        <!-- Paginación -->
        <div v-if="totalPages > 1" class="flex items-center justify-center gap-2 mt-6">
          <button v-for="p in totalPages" :key="p" @click="page = p; load()"
            class="w-9 h-9 rounded-full text-sm font-semibold transition-all"
            :style="p === page ? 'background-color:var(--color-primary);color:white' : 'background-color:var(--color-surface-container-high);color:var(--color-on-surface)'">
            {{ p }}
          </button>
        </div>
        <p class="mt-4 text-sm" style="color:var(--color-outline)">{{ totalCount }} ajuste{{ totalCount !== 1 ? 's' : '' }}</p>
      </div>
    </main>
  </div>
</template>
