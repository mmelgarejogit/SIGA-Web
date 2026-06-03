<script setup lang="ts">
import { ref, onMounted } from "vue"
import { useRouter } from "vue-router"
import AppSidebar from "@/components/AppSidebar.vue"
import AppHeader from "@/components/AppHeader.vue"
import BaseButton from "@/components/BaseButton.vue"
import BaseTable from "@/components/BaseTable.vue"
import FilterChips from "@/components/FilterChips.vue"
import SearchInput from "@/components/SearchInput.vue"
import { type Transferencia, getTransferencias } from "@/services/stockService"
import { getSucursales, type Sucursal } from "@/services/sucursalService"

const router = useRouter()
const transferencias = ref<Transferencia[]>([])
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
  { value: "Solicitada", label: "Solicitada", dot: "#f59e0b" },
  { value: "Aprobada",   label: "Aprobada",   dot: "#16a34a" },
  { value: "Rechazada",  label: "Rechazada",  dot: "#dc2626" },
]

const estadoStyle = (e: string) =>
  e === "Solicitada" ? "bg-amber-100 text-amber-700" :
  e === "Aprobada"   ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"

const formatDate = (d: string) => new Date(d).toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "numeric" })

async function load() {
  isLoading.value = true
  try {
    const result = await getTransferencias({ page: page.value, pageSize: PAGE_SIZE, sucursalId: sucursalFilter.value || undefined, estado: estadoFilter.value[0] || undefined })
    transferencias.value = result.items
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

        <div class="flex items-start justify-between mb-8">
          <div>
            <h1 class="text-4xl font-extrabold tracking-tight mb-2">Transferencias</h1>
            <p class="font-medium" style="color: var(--color-on-surface-variant)">Movimientos de stock entre sucursales</p>
          </div>
          <BaseButton variant="primary" size="lg" @click="router.push('/stock/transferencias/nueva')">
            <span class="material-symbols-outlined" style="font-size:20px">add</span>
            Nueva Transferencia
          </BaseButton>
        </div>

        <div class="flex items-center justify-between gap-4 mb-6 flex-wrap">
          <div class="flex items-center gap-3 flex-wrap">
            <FilterChips :model-value="estadoFilter" :options="estadoOpciones" placeholder="Estado" @update:model-value="estadoFilter = $event; page = 1; load()" />
            <select v-if="sucursales.length" v-model="sucursalFilter" @change="page = 1; load()" class="px-4 py-2 rounded-xl text-sm outline-none" style="border:1px solid var(--color-outline-variant);background-color:var(--color-surface-container-low);color:var(--color-on-surface)">
              <option value="">Todas las sucursales</option>
              <option v-for="s in sucursales" :key="s.id" :value="s.id">{{ s.nombre }}</option>
            </select>
          </div>
          <SearchInput :model-value="search" placeholder="Buscar sucursal…" class="w-72" @update:model-value="search = $event" />
        </div>

        <BaseTable :loading="isLoading" empty-text="No hay transferencias registradas.">
          <template #header>
            <th class="px-6 py-5 text-left text-xs font-bold uppercase tracking-widest" style="color:var(--color-outline)">Origen</th>
            <th class="px-6 py-5 text-left text-xs font-bold uppercase tracking-widest" style="color:var(--color-outline)">Destino</th>
            <th class="px-6 py-5 text-left text-xs font-bold uppercase tracking-widest" style="color:var(--color-outline)">Items</th>
            <th class="px-6 py-5 text-left text-xs font-bold uppercase tracking-widest" style="color:var(--color-outline)">Estado</th>
            <th class="px-6 py-5 text-left text-xs font-bold uppercase tracking-widest" style="color:var(--color-outline)">Fecha</th>
            <th class="px-6 py-5" />
          </template>
          <template #body>
            <tr
              v-for="t in transferencias.filter(x => !search || x.sucursalOrigenNombre.toLowerCase().includes(search.toLowerCase()) || x.sucursalDestinoNombre.toLowerCase().includes(search.toLowerCase()))"
              :key="t.id"
              class="hover:bg-surface-container-low border-b cursor-pointer"
              style="border-color:rgba(196,197,213,0.12)"
              @click="router.push(`/stock/transferencias/${t.id}`)"
            >
              <td class="px-6 py-4 font-semibold text-sm">{{ t.sucursalOrigenNombre }}</td>
              <td class="px-6 py-4 text-sm">
                <div class="flex items-center gap-2">
                  <span class="material-symbols-outlined" style="font-size:16px;color:var(--color-outline)">arrow_forward</span>
                  {{ t.sucursalDestinoNombre }}
                </div>
              </td>
              <td class="px-6 py-4 text-sm">{{ t.lineas.length }} variante{{ t.lineas.length !== 1 ? 's' : '' }}</td>
              <td class="px-6 py-4">
                <span class="px-3 py-1 rounded-full text-xs font-semibold" :class="estadoStyle(t.estado)">{{ t.estado }}</span>
              </td>
              <td class="px-6 py-4 text-sm" style="color:var(--color-on-surface-variant)">{{ formatDate(t.fechaCreacion) }}</td>
              <td class="px-6 py-4">
                <button class="w-9 h-9 rounded-full flex items-center justify-center transition-all hover:scale-105 bg-blue-100" @click.stop="router.push(`/stock/transferencias/${t.id}`)" title="Ver detalle">
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
        <p class="mt-4 text-sm" style="color:var(--color-outline)">{{ totalCount }} transferencia{{ totalCount !== 1 ? 's' : '' }}</p>
      </div>
    </main>
  </div>
</template>
