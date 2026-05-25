<script setup lang="ts">
import { ref, computed, onMounted } from "vue"
import { useRouter } from "vue-router"
import AppSidebar from "@/components/AppSidebar.vue"
import AppHeader from "@/components/AppHeader.vue"
import BaseButton from "@/components/BaseButton.vue"
import FilterChips from "@/components/FilterChips.vue"
import {
  getRecepciones,
  type RecepcionListItem,
  type EstadoPedido,
} from "@/services/comprasService"
import { getProveedores, type Proveedor } from "@/services/inventarioService"

const router = useRouter()

const recepciones = ref<RecepcionListItem[]>([])
const totalCount = ref(0)
const currentPage = ref(1)
const pageSize = 20
const isLoading = ref(false)

const filtroEstado = ref<string[]>([])
const filtroProveedorId = ref<number | undefined>(undefined)
const filtroFechaDesde = ref("")
const filtroFechaHasta = ref("")

const proveedores = ref<Proveedor[]>([])

const estadoOpciones = [
  { value: "Facturada",       label: "Facturada",       dot: "#5b21b6" },
  { value: "RecibidaParcial", label: "Recibida parcial", dot: "#92400e" },
  { value: "RecibidaTotal",   label: "Recibida total",   dot: "#166534" },
]

onMounted(async () => {
  await loadProveedores()
  await load()
})

async function loadProveedores() {
  try {
    const r = await getProveedores({ pageSize: 200 })
    proveedores.value = Array.isArray(r) ? r : (r.items ?? [])
  } catch { /* */ }
}

async function load() {
  isLoading.value = true
  try {
    const r = await getRecepciones({
      proveedorId: filtroProveedorId.value,
      estadoOC: filtroEstado.value[0],
      fechaDesde: filtroFechaDesde.value || undefined,
      fechaHasta: filtroFechaHasta.value || undefined,
      page: currentPage.value,
      pageSize,
    })
    recepciones.value = r.items
    totalCount.value = r.totalCount
  } catch {
    recepciones.value = []
  } finally {
    isLoading.value = false
  }
}

function applyFilters() {
  currentPage.value = 1
  load()
}

function clearFechas() {
  filtroFechaDesde.value = ""
  filtroFechaHasta.value = ""
  applyFilters()
}

function openNueva() {
  router.push("/compras/recepciones/nueva")
}

function formatDate(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("es-PY", {
    day: "2-digit", month: "short", year: "numeric",
  })
}

function estadoOCStyle(estado: EstadoPedido) {
  switch (estado) {
    case "Facturada":       return { bg: "#ede9fe", text: "#5b21b6" }
    case "RecibidaParcial": return { bg: "#fef3c7", text: "#92400e" }
    case "RecibidaTotal":   return { bg: "#dcfce7", text: "#166534" }
    default:                return { bg: "#f3f4f6", text: "#374151" }
  }
}

function estadoOCLabel(estado: EstadoPedido) {
  if (estado === "RecibidaParcial") return "Recibida parcial"
  if (estado === "RecibidaTotal")   return "Recibida total"
  return estado
}

const hayFiltros = computed(() =>
  filtroEstado.value.length > 0 ||
  filtroProveedorId.value !== undefined ||
  filtroFechaDesde.value !== "" ||
  filtroFechaHasta.value !== "",
)
</script>

<template>
  <div class="min-h-screen" style="background-color: var(--color-background)">
    <AppSidebar />
    <AppHeader />

    <main style="margin-left: var(--sidebar-width); transition: margin-left 0.25s ease; padding-top: 64px">
      <div class="p-8">

        <!-- Header -->
        <div class="flex items-start justify-between mb-8">
          <div>
            <h1 class="text-4xl font-extrabold tracking-tight mb-2">Recepciones de Mercadería</h1>
            <p class="font-medium" style="color: var(--color-on-surface-variant)">
              {{ totalCount }} recepc{{ totalCount === 1 ? 'ión' : 'iones' }} registrada{{ totalCount === 1 ? '' : 's' }}
            </p>
          </div>
          <BaseButton variant="primary" size="lg" @click="openNueva">
            <span class="material-symbols-outlined" style="font-size: 20px">add</span>
            Nueva Recepción
          </BaseButton>
        </div>

        <!-- Filtros -->
        <div class="flex items-center justify-between gap-4 mb-6 flex-wrap">
          <div class="flex items-center gap-3 flex-wrap">
            <FilterChips
              :model-value="filtroEstado"
              :options="estadoOpciones"
              placeholder="Estado de OC"
              @update:model-value="v => { filtroEstado = v; applyFilters() }"
            />

            <select
              v-model="filtroProveedorId"
              class="px-3 py-2 rounded-xl text-sm font-medium outline-none transition-all"
              style="border: 1px solid var(--color-outline-variant); background-color: var(--color-surface-container-lowest); color: var(--color-on-surface); min-width: 180px;"
              @change="applyFilters"
            >
              <option :value="undefined">Todos los proveedores</option>
              <option v-for="p in proveedores" :key="p.id" :value="p.id">{{ p.nombre }}</option>
            </select>

            <div class="flex items-center gap-2">
              <input v-model="filtroFechaDesde" type="date"
                class="px-3 py-2 rounded-xl text-sm outline-none"
                style="border: 1px solid var(--color-outline-variant); background-color: var(--color-surface-container-lowest); color: var(--color-on-surface);"
                @change="applyFilters" />
              <span class="text-sm font-medium" style="color: var(--color-on-surface-variant)">—</span>
              <input v-model="filtroFechaHasta" type="date"
                class="px-3 py-2 rounded-xl text-sm outline-none"
                style="border: 1px solid var(--color-outline-variant); background-color: var(--color-surface-container-lowest); color: var(--color-on-surface);"
                @change="applyFilters" />
              <button v-if="filtroFechaDesde || filtroFechaHasta"
                class="w-7 h-7 rounded-full flex items-center justify-center transition-all hover:scale-105"
                style="background-color: var(--color-surface-container-high)"
                title="Limpiar fechas" @click="clearFechas">
                <span class="material-symbols-outlined" style="font-size: 14px; color: var(--color-on-surface-variant)">close</span>
              </button>
            </div>
          </div>
        </div>

        <!-- Tabla -->
        <div class="rounded-2xl overflow-hidden mb-4"
          style="background-color: var(--color-surface-container-lowest); box-shadow: 0 1px 3px rgba(196, 197, 213, 0.25); outline: 1px solid rgba(196, 197, 213, 0.15)">

          <div v-if="isLoading" class="p-12 flex justify-center">
            <span class="material-symbols-outlined animate-spin" style="font-size: 32px; color: var(--color-primary)">progress_activity</span>
          </div>

          <div v-else-if="recepciones.length === 0" class="p-12 text-center">
            <div class="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
              style="background-color: var(--color-surface-container-low)">
              <span class="material-symbols-outlined text-4xl" style="color: var(--color-outline)">inventory_2</span>
            </div>
            <p class="font-bold text-lg mb-1" style="color: var(--color-on-surface)">
              {{ hayFiltros ? 'Sin resultados' : 'Sin recepciones registradas' }}
            </p>
            <p class="text-sm" style="color: var(--color-on-surface-variant)">
              {{ hayFiltros
                ? 'No hay recepciones que coincidan con los filtros aplicados.'
                : 'Las recepciones se registran cuando llega mercadería de una factura con OC.' }}
            </p>
          </div>

          <table v-else class="w-full">
            <thead style="background-color: var(--color-surface-container-low)">
              <tr>
                <th v-for="h in ['# Rec.','Fecha','Proveedor','Factura','OC / Estado','Ítems','Usuario','']"
                  :key="h"
                  class="px-6 py-5 text-left text-xs font-bold uppercase tracking-widest"
                  style="color: var(--color-outline)">{{ h }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="r in recepciones" :key="r.id"
                class="hover:bg-surface-container-low"
                style="border-bottom: 1px solid rgba(196, 197, 213, 0.12)">

                <td class="px-6 py-4">
                  <span class="font-bold text-sm" style="color: var(--color-primary)">#{{ r.id }}</span>
                </td>

                <td class="px-6 py-4 text-sm" style="color: var(--color-on-surface)">
                  {{ formatDate(r.fechaRecepcion) }}
                </td>

                <td class="px-6 py-4">
                  <span class="font-medium text-sm" style="color: var(--color-on-surface)">{{ r.proveedorNombre }}</span>
                </td>

                <td class="px-6 py-4">
                  <span class="font-mono text-xs font-semibold" style="color: var(--color-on-surface-variant)">
                    {{ r.nroFactura ?? "—" }}
                  </span>
                </td>

                <td class="px-6 py-4">
                  <div class="flex items-center gap-2">
                    <button @click="router.push(`/compras/oc/${r.pedidoProveedorId}`)"
                      class="font-mono text-xs font-semibold transition-all hover:opacity-75"
                      style="color: var(--color-primary)">
                      OC #{{ r.pedidoProveedorId }}
                    </button>
                    <span class="px-2 py-0.5 rounded-full text-xs font-bold"
                      :style="`background-color: ${estadoOCStyle(r.estadoOC).bg}; color: ${estadoOCStyle(r.estadoOC).text}`">
                      {{ estadoOCLabel(r.estadoOC) }}
                    </span>
                  </div>
                </td>

                <td class="px-6 py-4">
                  <span class="text-sm" style="color: var(--color-on-surface-variant)">
                    {{ r.cantidadItems }} ítem{{ r.cantidadItems === 1 ? '' : 's' }} · {{ r.cantidadTotal }} und.
                  </span>
                </td>

                <td class="px-6 py-4 text-sm" style="color: var(--color-on-surface-variant)">
                  {{ r.usuarioNombre }}
                </td>

                <td class="px-6 py-4">
                  <button
                    class="w-9 h-9 rounded-full flex items-center justify-center transition-all hover:scale-105 active:scale-95 bg-blue-100"
                    title="Ver OC asociada"
                    @click="router.push(`/compras/oc/${r.pedidoProveedorId}`)"
                  >
                    <span class="material-symbols-outlined text-blue-700" style="font-size: 18px">open_in_new</span>
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <p class="text-sm" style="color: var(--color-on-surface-variant)">
          Mostrando {{ recepciones.length }} de {{ totalCount }} recepciones
        </p>

      </div>
    </main>
  </div>
</template>
