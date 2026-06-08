<script setup lang="ts">
import { ref, computed, onMounted } from "vue"
import AppSidebar from "@/components/AppSidebar.vue"
import AppHeader from "@/components/AppHeader.vue"
import BaseTable from "@/components/BaseTable.vue"
import SearchInput from "@/components/SearchInput.vue"
import { type Venta, getVentas } from "@/services/ventasService"

const ventas = ref<Venta[]>([])
const isLoading = ref(false)
const loadError = ref("")
const search = ref("")

const ventasFiltradas = computed(() => {
  if (!search.value.trim()) return ventas.value
  const q = search.value.toLowerCase()
  return ventas.value.filter(
    (v) =>
      v.clienteNombre.toLowerCase().includes(q) ||
      v.numeroComprobante.toLowerCase().includes(q) ||
      v.factura?.numeroFactura?.toLowerCase().includes(q),
  )
})

const columns = [
  { key: "factura",     label: "Nro. Factura"  },
  { key: "comprobante", label: "Comprobante"   },
  { key: "paciente",    label: "Cliente"       },
  { key: "fecha",       label: "Fecha emisión" },
  { key: "total",       label: "Total"         },
  { key: "iva",         label: "IVA total"     },
]

async function load() {
  isLoading.value = true
  loadError.value = ""
  try {
    // Carga todas las ventas y filtra las que tienen factura
    const result = await getVentas({ pageSize: 500 })
    ventas.value = (result.items ?? []).filter((v) => !!v.factura)
  } catch (err: unknown) {
    loadError.value = err instanceof Error ? err.message : "Error al cargar facturas."
  } finally {
    isLoading.value = false
  }
}

onMounted(load)

const formatPrice = (n: number) =>
  new Intl.NumberFormat("es-PY", { style: "currency", currency: "PYG", maximumFractionDigits: 0 }).format(n)

const formatDate = (s?: string) =>
  s ? new Date(s).toLocaleDateString("es-PY", { day: "2-digit", month: "short", year: "numeric" }) : "—"
</script>

<template>
  <div class="min-h-screen" style="background-color: var(--color-background)">
    <AppSidebar />
    <AppHeader />

    <main style="margin-left: var(--sidebar-width); transition: margin-left 0.25s ease; padding-top: 64px">
      <div class="p-8">

        <div class="flex items-start justify-between mb-8">
          <div>
            <h1 class="text-4xl font-extrabold tracking-tight mb-2">Historial de Facturas</h1>
            <p class="font-medium" style="color: var(--color-on-surface-variant)">
              {{ ventasFiltradas.length }} factura{{ ventasFiltradas.length !== 1 ? "s" : "" }} emitida{{ ventasFiltradas.length !== 1 ? "s" : "" }}
            </p>
          </div>
        </div>

        <div class="flex items-center justify-end mb-6">
          <SearchInput
            :model-value="search"
            placeholder="Buscar por factura, comprobante o cliente..."
            class="w-80"
            @update:model-value="search = $event"
          />
        </div>

        <div v-if="loadError" class="flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium mb-6"
          style="background-color: var(--color-error-container); color: var(--color-on-error-container)">
          <span class="material-symbols-outlined" style="font-size: 18px">error</span>
          {{ loadError }}
        </div>

        <BaseTable :columns="columns" :items="ventasFiltradas" :loading="isLoading"
          empty-text="No hay facturas emitidas.">

          <template #factura="{ item }">
            <span class="text-sm font-mono font-semibold" style="color: var(--color-on-surface)">
              {{ item.factura?.numeroFactura || "—" }}
            </span>
          </template>

          <template #comprobante="{ item }">
            <span class="text-sm font-mono" style="color: var(--color-on-surface-variant)">
              {{ item.numeroComprobante }}
            </span>
          </template>

          <template #paciente="{ item }">
            <span class="text-sm" style="color: var(--color-on-surface)">{{ item.clienteNombre }}</span>
          </template>

          <template #fecha="{ item }">
            <span class="text-sm" style="color: var(--color-on-surface-variant)">
              {{ formatDate(item.factura?.fechaEmision) }}
            </span>
          </template>

          <template #total="{ item }">
            <span class="text-sm font-semibold" style="color: var(--color-primary)">
              {{ formatPrice(item.factura?.total ?? item.total) }}
            </span>
          </template>

          <template #iva="{ item }">
            <span class="text-sm" style="color: var(--color-on-surface-variant)">
              {{ formatPrice((item.factura?.iva5 ?? 0) + (item.factura?.iva10 ?? 0)) }}
            </span>
          </template>

        </BaseTable>

      </div>
    </main>
  </div>
</template>
